public interface IInventoryRepository
{
    Task<int> GetLatestBalanceAsync(Guid branchId, Guid variantId);
    Task AppendLedgerAsync(InventoryLedger ledger);
}

// OISM.Infrastructure/Services/PurchaseReceiptService.cs
public class PurchaseReceiptService
{
    private readonly OismDbContext _dbContext;
    private readonly IInventoryRepository _inventoryRepo;

    public PurchaseReceiptService(OismDbContext dbContext, IInventoryRepository inventoryRepo)
    {
        _dbContext = dbContext;
        _inventoryRepo = inventoryRepo;
    }

    public async Task ProcessReceiptAsync(Guid branchId, Guid variantId, int qtyIn, decimal priceIn, Guid receiptId)
    {
        using var transaction = await _dbContext.Database.BeginTransactionAsync(IsolationLevel.Serializable);
        try
        {
            var variant = await _dbContext.Set<Variant>().FindAsync(variantId);
            int currentBalance = await _inventoryRepo.GetLatestBalanceAsync(branchId, variantId);

            // Tính toán BalanceAfter và WAC mới
            int newBalance = currentBalance + qtyIn;
            decimal newWac = ((currentBalance * variant.WacPrice) + (qtyIn * priceIn)) / newBalance;

            // 1. Cập nhật WAC cho Variant
            variant.WacPrice = Math.Round(newWac, 2);

            // 2. Append-only Ledger
            var ledger = new InventoryLedger
            {
                Id = Guid.NewGuid(),
                BranchId = branchId,
                VariantId = variantId,
                TransactionType = "PurchaseReceipt",
                Quantity = qtyIn,
                BalanceAfter = newBalance,
                UnitCost = priceIn,
                ReferenceId = receiptId
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
}