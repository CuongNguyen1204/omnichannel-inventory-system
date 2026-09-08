namespace OISM.Domain.Entities;

public class InventoryLedger : ITenantEntity
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public Guid BranchId { get; set; }
    public Guid ProductId { get; set; }
    
    public int QuantityChanged { get; set; } // Dương: Nhập, Âm: Xuất
    public string TransactionType { get; set; } = null!; // "StockIn", "StockOut", "Transfer"
    public Guid? ReferenceId { get; set; } // Lưu ID hóa đơn, phiếu chuyển... để truy vết
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    // Navigation properties
    public Branch Branch { get; set; } = null!;
    public Product Product { get; set; } = null!;
}