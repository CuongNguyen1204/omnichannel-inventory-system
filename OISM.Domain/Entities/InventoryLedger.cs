namespace OISM.Domain.Entities;

public class InventoryLedger : ITenantEntity
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public Guid ProductId { get; set; }
    public int QuantityChanged { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}