using Microsoft.EntityFrameworkCore;
using OISM.Domain.Entities;
using System;
using System.Threading.Tasks;

namespace OISM.Infrastructure.Persistence;

public static class DataSeeder
{
    public static async Task SeedAsync(OismDbContext context)
    {
        // Tự động chạy Migration nếu Database chưa được cập nhật
        await context.Database.MigrateAsync();

        // Nếu bảng Branch đã có dữ liệu, bỏ qua không seed nữa để tránh trùng lặp
        if (await context.Branches.AnyAsync()) return;

        // 1. Tạo Tenant và Branch
        var tenantId = Guid.NewGuid();
        // ID này khớp chính xác với ID được gán trong file PosScreen.tsx ở Frontend
        var branchId = Guid.Parse("00000000-0000-0000-0000-000000000000"); 

        var branch = new Branch { Id = branchId, TenantId = tenantId, Name = "Chi nhánh Trung tâm (OISM)" };
        context.Branches.Add(branch);

        // 2. Tạo Danh mục (Category)
        var catAo = new Category { Id = Guid.NewGuid(), TenantId = tenantId, Name = "Áo", Description = "Thời trang áo các loại" };
        var catQuan = new Category { Id = Guid.NewGuid(), TenantId = tenantId, Name = "Quần", Description = "Thời trang quần" };
        var catPhuKien = new Category { Id = Guid.NewGuid(), TenantId = tenantId, Name = "Phụ kiện", Description = "Mũ, vớ, thắt lưng" };
        context.Categories.AddRange(catAo, catQuan, catPhuKien);

        // 3. Tạo Sản phẩm (Product) & Biến thể (Variant)
        var p1 = new Product { Id = Guid.NewGuid(), TenantId = tenantId, CategoryId = catAo.Id, Name = "Áo thun Basic Nam (Đen)", Sku = "TSHIRT-BLK", Price = 150000 };
        var p2 = new Product { Id = Guid.NewGuid(), TenantId = tenantId, CategoryId = catQuan.Id, Name = "Quần Jean Slimfit (Xanh)", Sku = "JEAN-BLU", Price = 350000 };
        var p3 = new Product { Id = Guid.NewGuid(), TenantId = tenantId, CategoryId = catPhuKien.Id, Name = "Mũ lưỡi trai NY Đen", Sku = "CAP-NY-BLK", Price = 120000 };
        context.Products.AddRange(p1, p2, p3);

        var v1 = new Variant { Id = Guid.NewGuid(), TenantId = tenantId, ProductId = p1.Id, SKU = "TSHIRT-BLK-M", Barcode = "8930000000001", WacPrice = 80000 };
        var v2 = new Variant { Id = Guid.NewGuid(), TenantId = tenantId, ProductId = p2.Id, SKU = "JEAN-BLU-32", Barcode = "8930000000002", WacPrice = 200000 };
        var v3 = new Variant { Id = Guid.NewGuid(), TenantId = tenantId, ProductId = p3.Id, SKU = "CAP-NY-BLK-F", Barcode = "8930000000003", WacPrice = 50000 };
        context.Set<Variant>().AddRange(v1, v2, v3);

        // 4. Tạo Tồn kho khả dụng (InventorySummary)
        var inv1 = new InventorySummary { Id = Guid.NewGuid(), TenantId = tenantId, BranchId = branchId, VariantId = v1.Id, OnHand = 50, Reserved = 0 };
        var inv2 = new InventorySummary { Id = Guid.NewGuid(), TenantId = tenantId, BranchId = branchId, VariantId = v2.Id, OnHand = 15, Reserved = 0 };
        var inv3 = new InventorySummary { Id = Guid.NewGuid(), TenantId = tenantId, BranchId = branchId, VariantId = v3.Id, OnHand = 0, Reserved = 0 }; // Cố tình cho 1 món hết hàng để test UI
        context.Set<InventorySummary>().AddRange(inv1, inv2, inv3);

        // Lưu toàn bộ xuống DB
        await context.SaveChangesAsync();
    }
}