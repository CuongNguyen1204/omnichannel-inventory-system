using System;

namespace OISM.Domain.Entities;

public class Variant : ITenantEntity
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public Guid ProductId { get; set; }
    public string SKU { get; set; } = null!;
    public string Barcode { get; set; } = null!;
    public decimal WacPrice { get; set; } 
}