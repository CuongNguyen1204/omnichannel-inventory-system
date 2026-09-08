using System.Data;
using Microsoft.EntityFrameworkCore;
using OISM.Application.Interfaces;
using OISM.Domain.Entities;
using OISM.Infrastructure.Persistence;

namespace OISM.Infrastructure.Services;

public class StockTransferService
{
    private readonly OismDbContext _dbContext;
    private readonly IInventoryRepository _inventoryRepo;

    public StockTransferService(OismDbContext dbContext, IInventoryRepository inventoryRepo)
    {
        _dbContext = dbContext;
        _inventoryRepo = inventoryRepo;
    }

    public async Task TransferAsync(Guid fromBranchId, Guid toBranchId, Guid variantId, int quantity, Guid? referenceId = null)
    {
        if (quantity <= 0) throw new ArgumentException("Số lượng chuyển phải lớn hơn 0");
        if (fromBranchId == toBranchId) throw new ArgumentException("Chi nhánh nguồn và đích không được trùng nhau");

        // ACID Transaction: Cô lập Serializable để chống Race Condition khi chuyển kho
        using var transaction = await _dbContext.Database.BeginTransactionAsync(IsolationLevel.Serializable);
        try
        {
            var variant = await _dbContext.Set<Variant>().FindAsync(variantId);
            if (variant == null) throw new KeyNotFoundException("SKU không tồn tại");

            // Lấy tồn kho hiện tại của cả 2 chi nhánh
            int sourceBalance = await _inventoryRepo.GetLatestBalanceAsync(fromBranchId, variantId);
            int destBalance = await _inventoryRepo.GetLatestBalanceAsync(toBranchId, variantId);

            if (sourceBalance < quantity)
                throw new InvalidOperationException($"Tồn kho chi nhánh nguồn không đủ. Hiện có: {sourceBalance}");

            // Ghi nhận Xuất kho (TransferOut) ở chi nhánh nguồn
            var stockOutLedger = new InventoryLedger
            {
                Id = Guid.NewGuid(),
                BranchId = fromBranchId,
                VariantId = variantId,
                TransactionType = "TransferOut",
                Quantity = -quantity,
                BalanceAfter = sourceBalance - quantity,
                UnitCost = variant.WacPrice, 
                ReferenceId = referenceId
            };
            await _inventoryRepo.AppendLedgerAsync(stockOutLedger);

            // Ghi nhận Nhập kho (TransferIn) ở chi nhánh đích
            var stockInLedger = new InventoryLedger
            {
                Id = Guid.NewGuid(),
                BranchId = toBranchId,
                VariantId = variantId,
                TransactionType = "TransferIn",
                Quantity = quantity,
                BalanceAfter = destBalance + quantity,
                UnitCost = variant.WacPrice, 
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