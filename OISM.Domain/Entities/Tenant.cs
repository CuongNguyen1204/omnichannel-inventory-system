namespace OISM.Domain.Entities;

public class Tenant
{
    public Guid Id { get; set; }
    public string Name { get; set; } = null!;
    public string SchemaName { get; set; } = null!; 
}