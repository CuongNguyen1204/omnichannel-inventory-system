using System.Data;
using Microsoft.EntityFrameworkCore;
using OISM.Application.Interfaces;
using OISM.Domain.Entities;
using OISM.Infrastructure.Persistence;

namespace OISM.Infrastructure.Services;

public class InventoryService : IInventoryService
{
    private readonly OismDbContext _dbContext;
    private readonly IInventoryRepository _inventoryRepo;

    // Tiêm thêm IInventoryRepository vào Constructor
    public InventoryService(OismDbContext dbContext, IInventoryRepository inventoryRepo)
    {
        _dbContext = dbContext;
        _inventoryRepo = inventoryRepo;
    }

    public async Task<int> GetCurrentStockAsync(Guid branchId, Guid variantId)
    {
        // Tối ưu hiệu suất: Lấy số dư từ bản ghi cuối cùng thay vì SUM toàn bộ bảng
        return await _inventoryRepo.GetLatestBalanceAsync(branchId, variantId);
    }

    public async Task StockInAsync(Guid branchId, Guid variantId, int quantity, Guid? referenceId = null)
    {
        if (quantity <= 0) throw new ArgumentException("Số lượng nhập phải lớn hơn 0");

        using var transaction = await _dbContext.Database.BeginTransactionAsync(IsolationLevel.Serializable);
        try
        {
            var variant = await _dbContext.Set<Variant>().FindAsync(variantId);
            if (variant == null) throw new KeyNotFoundException("SKU không tồn tại");

            int currentBalance = await GetCurrentStockAsync(branchId, variantId);

            var ledger = new InventoryLedger
            {
                Id = Guid.NewGuid(),
                BranchId = branchId,
                VariantId = variantId,
                Quantity = quantity,
                BalanceAfter = currentBalance + quantity,
                UnitCost = variant.WacPrice, // Ghi nhận giá trị tại thời điểm nhập
                TransactionType = "StockIn",
                ReferenceId = referenceId
            };

            await _inventoryRepo.AppendLedgerAsync(ledger);
            await _dbContext.SaveChangesAsync();
            await transaction.CommitAsync();
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    public async Task StockOutAsync(Guid branchId, Guid variantId, int quantity, Guid? referenceId = null)
    {
        if (quantity <= 0) throw new ArgumentException("Số lượng xuất phải lớn hơn 0");

        using var transaction = await _dbContext.Database.BeginTransactionAsync(IsolationLevel.Serializable);
        try
        {
            var variant = await _dbContext.Set<Variant>().FindAsync(variantId);
            if (variant == null) throw new KeyNotFoundException("SKU không tồn tại");

            var currentBalance = await GetCurrentStockAsync(branchId, variantId);
            if (currentBalance < quantity)
            {
                throw new InvalidOperationException($"Tồn kho không đủ. Hiện tại: {currentBalance}, Yêu cầu: {quantity}");
            }

            var ledger = new InventoryLedger
            {
                Id = Guid.NewGuid(),
                BranchId = branchId,
                VariantId = variantId,
                Quantity = -quantity,
                BalanceAfter = currentBalance - quantity,
                UnitCost = variant.WacPrice, // Xuất theo giá vốn bình quân gia quyền (WAC)
                TransactionType = "StockOut",
                ReferenceId = referenceId
            };

            await _inventoryRepo.AppendLedgerAsync(ledger);
            await _dbContext.SaveChangesAsync();
            await transaction.CommitAsync();
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    public async Task TransferStockAsync(Guid fromBranchId, Guid toBranchId, Guid variantId, int quantity, Guid? referenceId = null)
    {
        if (quantity <= 0) throw new ArgumentException("Số lượng chuyển phải lớn hơn 0");
        if (fromBranchId == toBranchId) throw new ArgumentException("Chi nhánh nguồn và đích không được trùng nhau");

        using var transaction = await _dbContext.Database.BeginTransactionAsync(IsolationLevel.Serializable);
        try
        {
            var variant = await _dbContext.Set<Variant>().FindAsync(variantId);
            if (variant == null) throw new KeyNotFoundException("SKU không tồn tại");

            int sourceBalance = await GetCurrentStockAsync(fromBranchId, variantId);
            int destBalance = await GetCurrentStockAsync(toBranchId, variantId);

            if (sourceBalance < quantity)
            {
                throw new InvalidOperationException($"Chi nhánh nguồn không đủ tồn kho. Hiện tại: {sourceBalance}, Yêu cầu: {quantity}");
            }

            // Ghi nhận Xuất kho ở chi nhánh nguồn
            var stockOutLedger = new InventoryLedger
            {
                Id = Guid.NewGuid(),
                BranchId = fromBranchId,
                VariantId = variantId,
                Quantity = -quantity,
                BalanceAfter = sourceBalance - quantity,
                UnitCost = variant.WacPrice,
                TransactionType = "TransferOut",
                ReferenceId = referenceId
            };
            await _inventoryRepo.AppendLedgerAsync(stockOutLedger);

            // Ghi nhận Nhập kho ở chi nhánh đích
            var stockInLedger = new InventoryLedger
            {
                Id = Guid.NewGuid(),
                BranchId = toBranchId,
                VariantId = variantId,
                Quantity = quantity,
                BalanceAfter = destBalance + quantity,
                UnitCost = variant.WacPrice,
                TransactionType = "TransferIn",
                ReferenceId = referenceId
            };
            await _inventoryRepo.AppendLedgerAsync(stockInLedger);

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