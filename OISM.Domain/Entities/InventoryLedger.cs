using System;

namespace OISM.Domain.Entities;

public class InventoryLedger : ITenantEntity
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public Guid BranchId { get; set; }
    public Guid VariantId { get; set; }
    
    public string TransactionType { get; set; } = null!; 
    public int Quantity { get; set; } 
    public int BalanceAfter { get; set; } 
    public decimal UnitCost { get; set; } 
    public Guid? ReferenceId { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}