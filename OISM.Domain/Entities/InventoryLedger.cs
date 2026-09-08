namespace OISM.Domain.Entities;

public class Brand : ITenantEntity
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public string Name { get; set; } = null!;
}

public class Variant : ITenantEntity
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public Guid ProductId { get; set; }
    public string SKU { get; set; } = null!;
    public string Barcode { get; set; } = null!;
    public decimal WacPrice { get; set; } // Giá vốn bình quân gia quyền hiện tại
}

public class InventoryLedger : ITenantEntity
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public Guid BranchId { get; set; }
    public Guid VariantId { get; set; } // Đổi ProductId thành VariantId (SKU)
    
    public string TransactionType { get; set; } = null!; // PurchaseReceipt, StockTransfer, Sales
    public int Quantity { get; set; } 
    public int BalanceAfter { get; set; } // Tồn kho sau giao dịch
    public decimal UnitCost { get; set; } // Giá nhập hoặc Giá WAC lúc xuất
    public Guid? ReferenceId { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}