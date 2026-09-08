namespace OISM.Domain.Entities;

public class Product : ITenantEntity
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public Guid CategoryId { get; set; }
    
    public string Sku { get; set; } = null!;
    public string Name { get; set; } = null!;
    public decimal Price { get; set; }

    // Navigation properties
    public Category Category { get; set; } = null!;
}