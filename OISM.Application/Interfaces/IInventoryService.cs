namespace OISM.Application.Interfaces;

public interface IInventoryService
{
    Task<int> GetCurrentStockAsync(Guid branchId, Guid variantId);

    Task StockInAsync(Guid branchId, Guid variantId, int quantity, Guid? referenceId = null);
    
    Task StockOutAsync(Guid branchId, Guid variantId, int quantity, Guid? referenceId = null);

    Task TransferStockAsync(Guid fromBranchId, Guid toBranchId, Guid variantId, int quantity, Guid? referenceId = null);
}