using System;
using System.Collections.Generic;

namespace OISM.Domain.Entities;

public enum OrderStatus
{
    Draft,
    Reserved,
    Confirmed,
    Completed,
    Cancelled
}

public class Order : ITenantEntity
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public Guid BranchId { get; set; }
    public string OrderNumber { get; set; } = null!;
    public OrderStatus Status { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? ExpiresAt { get; set; } 
    
    public ICollection<OrderItem> Items { get; set; } = new List<OrderItem>();
}

public class OrderItem : ITenantEntity
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public Guid OrderId { get; set; }
    public Guid VariantId { get; set; }
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; } 
    public decimal CogsPrice { get; set; } 
    
    public Order Order { get; set; } = null!;
}

public class InventorySummary : ITenantEntity
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public Guid BranchId { get; set; }
    public Guid VariantId { get; set; }
    public int OnHand { get; set; } 
    public int Reserved { get; set; } 
}