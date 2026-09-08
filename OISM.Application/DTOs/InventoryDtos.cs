namespace OISM.Application.DTOs;

public record PurchaseReceiptRequest(
    Guid BranchId, 
    Guid VariantId, 
    int Quantity, 
    decimal UnitPrice, 
    Guid ReferenceId
);

public record StockTransferRequest(
    Guid FromBranchId, 
    Guid ToBranchId, 
    Guid VariantId, 
    int Quantity, 
    Guid ReferenceId
);

public record CreateVariantRequest(
    Guid ProductId, 
    string SKU, 
    string? Barcode // Nếu null, hệ thống sẽ tự động generate EAN-13
);