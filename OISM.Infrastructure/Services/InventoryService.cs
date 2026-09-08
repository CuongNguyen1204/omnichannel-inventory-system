using System.Data;
using Microsoft.EntityFrameworkCore;
using OISM.Application.Interfaces;
using OISM.Domain.Entities;
using OISM.Infrastructure.Persistence;

namespace OISM.Infrastructure.Services;

public class InventoryService : IInventoryService
{
    private readonly OismDbContext _dbContext;

    public InventoryService(OismDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<int> GetCurrentStockAsync(Guid branchId, Guid productId)
    {
        // NFR-TENANT-01: TenantId đã tự động được filter bởi DbContext
        return await _dbContext.InventoryLedgers
            .Where(i => i.BranchId == branchId && i.ProductId == productId)
            .SumAsync(i => i.QuantityChanged);
    }

    public async Task StockInAsync(Guid branchId, Guid productId, int quantity, Guid? referenceId = null)
    {
        if (quantity <= 0) throw new ArgumentException("Số lượng nhập phải lớn hơn 0");

        var ledger = new InventoryLedger
        {
            Id = Guid.NewGuid(),
            BranchId = branchId,
            ProductId = productId,
            QuantityChanged = quantity,
            TransactionType = "StockIn",
            ReferenceId = referenceId
        };

        _dbContext.InventoryLedgers.Add(ledger);
        await _dbContext.SaveChangesAsync();
    }

    public async Task StockOutAsync(Guid branchId, Guid productId, int quantity, Guid? referenceId = null)
    {
        if (quantity <= 0) throw new ArgumentException("Số lượng xuất phải lớn hơn 0");

        // Sử dụng Serializable để lock các thao tác đọc/ghi đồng thời trên các record của Product này
        using var transaction = await _dbContext.Database.BeginTransactionAsync(IsolationLevel.Serializable);
        try
        {
            var currentStock = await GetCurrentStockAsync(branchId, productId);
            if (currentStock < quantity)
            {
                throw new InvalidOperationException($"Tồn kho không đủ. Hiện tại: {currentStock}, Yêu cầu: {quantity}");
            }

            var ledger = new InventoryLedger
            {
                Id = Guid.NewGuid(),
                BranchId = branchId,
                ProductId = productId,
                QuantityChanged = -quantity,
                TransactionType = "StockOut",
                ReferenceId = referenceId
            };

            _dbContext.InventoryLedgers.Add(ledger);
            await _dbContext.SaveChangesAsync();
            await transaction.CommitAsync();
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    public async Task TransferStockAsync(Guid fromBranchId, Guid toBranchId, Guid productId, int quantity, Guid? referenceId = null)
    {
        if (quantity <= 0) throw new ArgumentException("Số lượng chuyển phải lớn hơn 0");
        if (fromBranchId == toBranchId) throw new ArgumentException("Chi nhánh nguồn và đích không được trùng nhau");

        // ACID Transaction: Đảm bảo nguyên tử tính (Atomicity)
        using var transaction = await _dbContext.Database.BeginTransactionAsync(IsolationLevel.Serializable);
        try
        {
            // 1. Kiểm tra tồn kho tại chi nhánh nguồn
            var currentStock = await GetCurrentStockAsync(fromBranchId, productId);
            if (currentStock < quantity)
            {
                throw new InvalidOperationException($"Chi nhánh nguồn không đủ tồn kho. Hiện tại: {currentStock}, Yêu cầu: {quantity}");
            }

            // 2. Ghi nhận Xuất kho ở chi nhánh nguồn
            var stockOutLedger = new InventoryLedger
            {
                Id = Guid.NewGuid(),
                BranchId = fromBranchId,
                ProductId = productId,
                QuantityChanged = -quantity,
                TransactionType = "TransferOut",
                ReferenceId = referenceId
            };
            _dbContext.InventoryLedgers.Add(stockOutLedger);

            // 3. Ghi nhận Nhập kho ở chi nhánh đích
            var stockInLedger = new InventoryLedger
            {
                Id = Guid.NewGuid(),
                BranchId = toBranchId,
                ProductId = productId,
                QuantityChanged = quantity,
                TransactionType = "TransferIn",
                ReferenceId = referenceId
            };
            _dbContext.InventoryLedgers.Add(stockInLedger);

            // 4. Lưu cả 2 bản ghi và Commit
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