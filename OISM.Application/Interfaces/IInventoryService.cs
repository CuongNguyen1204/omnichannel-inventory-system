namespace OISM.Application.Interfaces;

public interface IInventoryService
{
    // Lấy tồn kho hiện tại (Tính SUM các Record trong Sổ cái)
    Task<int> GetCurrentStockAsync(Guid branchId, Guid productId);

    // Giao dịch Nhập / Xuất đơn lẻ
    Task StockInAsync(Guid branchId, Guid productId, int quantity, Guid? referenceId = null);
    Task StockOutAsync(Guid branchId, Guid productId, int quantity, Guid? referenceId = null);

    // Giao dịch Chuyển kho (Cần bọc trong ACID Transaction)
    Task TransferStockAsync(Guid fromBranchId, Guid toBranchId, Guid productId, int quantity, Guid? referenceId = null);
}