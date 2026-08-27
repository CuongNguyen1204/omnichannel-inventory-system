using Microsoft.EntityFrameworkCore;
using OISM.Application.Interfaces;
using OISM.Domain.Entities;

namespace OISM.Infrastructure.Persistence;

public class OismDbContext : DbContext
{
    private readonly Guid _currentTenantId;

    // Bắt buộc phải có Constructor này cho EF Core
    public OismDbContext(DbContextOptions<OismDbContext> options, ICurrentUserService currentUserService) 
        : base(options)
    {
        _currentTenantId = currentUserService.TenantId;
    }

    public DbSet<Tenant> Tenants { get; set; }
    public DbSet<Branch> Branches { get; set; }
    public DbSet<InventoryLedger> InventoryLedgers { get; set; }

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);
        
        // NFR-TENANT-01: Global Query Filter
        builder.Entity<Branch>().HasQueryFilter(e => e.TenantId == _currentTenantId);
        builder.Entity<InventoryLedger>().HasQueryFilter(e => e.TenantId == _currentTenantId);
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        foreach (var entry in ChangeTracker.Entries<InventoryLedger>())
        {
            if (entry.State == EntityState.Modified || entry.State == EntityState.Deleted)
                throw new InvalidOperationException("NFR: InventoryLedger is Append-Only.");
        }
        
        foreach (var entry in ChangeTracker.Entries<ITenantEntity>().Where(e => e.State == EntityState.Added))
        {
            // Tự động gán TenantId nếu chưa có
            if (entry.Entity.TenantId == Guid.Empty)
            {
                entry.Entity.TenantId = _currentTenantId;
            }
        }

        return base.SaveChangesAsync(cancellationToken);
    }
}