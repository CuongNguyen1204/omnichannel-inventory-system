using System.Data;
using Microsoft.EntityFrameworkCore;
using OISM.Domain.Entities;
using OISM.Infrastructure.Persistence;

namespace OISM.Infrastructure.Services;

public class OrderEngineService
{
    private readonly OismDbContext _dbContext;

    public OrderEngineService(OismDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    // STATE 1: DRAFT -> RESERVED (Giữ kho)
    public async Task<Order> ReserveOrderAsync(Guid branchId, List<OrderItem> items)
    {
        // Phải dùng transaction để lock
        using var transaction = await _dbContext.Database.BeginTransactionAsync(IsolationLevel.ReadCommitted);
        try
        {
            var order = new Order
            {
                Id = Guid.NewGuid(),
                BranchId = branchId,
                OrderNumber = $"ORD-{DateTimeOffset.UtcNow.ToUnixTimeSeconds()}",
                Status = OrderStatus.Reserved,
                ExpiresAt = DateTimeOffset.UtcNow.AddMinutes(15), // Giữ kho 15 phút
                Items = items
            };

            foreach (var item in items)
            {
                // PESSIMISTIC LOCK: Lock dòng SKU của chi nhánh này
                // Các request khác mua cùng SKU sẽ bị Block tại dòng code này chờ đến lượt
                var summary = await _dbContext.InventorySummaries
                    .FromSqlInterpolated($"SELECT * FROM \"InventorySummaries\" WHERE \"BranchId\" = {branchId} AND \"VariantId\" = {item.VariantId} FOR UPDATE")
                    .SingleOrDefaultAsync();

                if (summary == null)
                    throw new Exception($"SKU {item.VariantId} chưa được khởi tạo kho.");

                var available = summary.OnHand - summary.Reserved;
                if (available < item.Quantity)
                {
                    throw new InvalidOperationException($"Sản phẩm {item.VariantId} không đủ tồn kho. Có thể bán: {available}");
                }

                // Tăng số lượng đang giữ (Reserved)
                summary.Reserved += item.Quantity;
                item.OrderId = order.Id;
            }

            _dbContext.Orders.Add(order);
            await _dbContext.SaveChangesAsync();
            await transaction.CommitAsync();

            return order;
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    // STATE 2: RESERVED -> CONFIRMED (Chốt đơn & Chụp COGS)
    public async Task ConfirmOrderAsync(Guid orderId)
    {
        using var transaction = await _dbContext.Database.BeginTransactionAsync(IsolationLevel.ReadCommitted);
        try
        {
            var order = await _dbContext.Orders
                .Include(o => o.Items)
                .SingleOrDefaultAsync(o => o.Id == orderId);

            if (order == null || order.Status != OrderStatus.Reserved)
                throw new InvalidOperationException("Đơn hàng không hợp lệ hoặc đã hết hạn giữ kho.");

            order.Status = OrderStatus.Confirmed;

            foreach (var item in order.Items)
            {
                var variant = await _dbContext.Set<Variant>().FindAsync(item.VariantId);
                
                // FR-COST-02: Chụp lại giá vốn WAC tại thời điểm Confirmed
                item.CogsPrice = variant!.WacPrice; 

                // Lấy summary và trừ thẳng vào OnHand, đồng thời nhả Reserved ra
                var summary = await _dbContext.InventorySummaries
                    .FromSqlInterpolated($"SELECT * FROM \"InventorySummaries\" WHERE \"BranchId\" = {order.BranchId} AND \"VariantId\" = {item.VariantId} FOR UPDATE")
                    .SingleOrDefaultAsync();

                summary!.OnHand -= item.Quantity;
                summary.Reserved -= item.Quantity;

                // Lưu vào Sổ cái Append-Only (Tương tự logic StockOut ở M2)
                var ledger = new InventoryLedger
                {
                    Id = Guid.NewGuid(),
                    BranchId = order.BranchId,
                    VariantId = item.VariantId,
                    Quantity = -item.Quantity,
                    BalanceAfter = summary.OnHand, // BalanceAfter nay chính là OnHand
                    UnitCost = item.CogsPrice,
                    TransactionType = "Sales",
                    ReferenceId = order.Id
                };
                _dbContext.InventoryLedgers.Add(ledger);
            }

            await _dbContext.SaveChangesAsync();
            await transaction.CommitAsync();
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    // BACKGROUND JOB: Hủy đơn quá hạn và nhả kho
    public async Task CancelExpiredReservationAsync(Guid orderId)
    {
        using var transaction = await _dbContext.Database.BeginTransactionAsync(IsolationLevel.ReadCommitted);
        try
        {
            var order = await _dbContext.Orders.Include(o => o.Items).SingleOrDefaultAsync(o => o.Id == orderId);
            if (order == null || order.Status != OrderStatus.Reserved) return;

            order.Status = OrderStatus.Cancelled;

            foreach (var item in order.Items)
            {
                var summary = await _dbContext.InventorySummaries
                    .FromSqlInterpolated($"SELECT * FROM \"InventorySummaries\" WHERE \"BranchId\" = {order.BranchId} AND \"VariantId\" = {item.VariantId} FOR UPDATE")
                    .SingleOrDefaultAsync();

                // Trả lại kho (giảm Reserved)
                summary!.Reserved -= item.Quantity;
            }

            await _dbContext.SaveChangesAsync();
            await transaction.CommitAsync();
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }
}