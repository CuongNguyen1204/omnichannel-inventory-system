using System;

namespace OISM.Domain.Entities;

public class Brand : ITenantEntity
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public string Name { get; set; } = null!;
}