using Microsoft.EntityFrameworkCore;
using OISM.Application.Interfaces;
using OISM.Domain.Entities;

namespace OISM.Infrastructure.Persistence;

public class OismDbContext : DbContext
{
    private readonly Guid _currentTenantId;

    public OismDbContext(DbContextOptions<OismDbContext> options, ICurrentUserService currentUserService) 
        : base(options)
    {
        _currentTenantId = currentUserService.TenantId;
    }

    public DbSet<Tenant> Tenants { get; set; }
    public DbSet<Branch> Branches { get; set; }
    public DbSet<Category> Categories { get; set; }
    public DbSet<Product> Products { get; set; }
    public DbSet<InventoryLedger> InventoryLedgers { get; set; }

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);
        
        // NFR-TENANT-01: Global Query Filter cho Data Isolation
        builder.Entity<Branch>().HasQueryFilter(e => e.TenantId == _currentTenantId);
        builder.Entity<Category>().HasQueryFilter(e => e.TenantId == _currentTenantId);
        builder.Entity<Product>().HasQueryFilter(e => e.TenantId == _currentTenantId);
        builder.Entity<InventoryLedger>().HasQueryFilter(e => e.TenantId == _currentTenantId);

        // Tạo Index cho SKU để tra cứu nhanh và tránh trùng lặp trong cùng 1 Tenant
        builder.Entity<Product>()
            .HasIndex(p => new { p.TenantId, p.Sku })
            .IsUnique();
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        foreach (var entry in ChangeTracker.Entries<InventoryLedger>())
        {
            if (entry.State == EntityState.Modified || entry.State == EntityState.Deleted)
                throw new InvalidOperationException("NFR: InventoryLedger is Append-Only. Bạn không thể sửa hoặc xóa lịch sử tồn kho.");
        }
        
        foreach (var entry in ChangeTracker.Entries<ITenantEntity>().Where(e => e.State == EntityState.Added))
        {
            if (entry.Entity.TenantId == Guid.Empty)
            {
                entry.Entity.TenantId = _currentTenantId;
            }
        }

        return base.SaveChangesAsync(cancellationToken);
    }
}