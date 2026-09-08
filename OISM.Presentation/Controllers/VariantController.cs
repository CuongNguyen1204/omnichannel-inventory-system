using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OISM.Domain.Entities;
using OISM.Infrastructure.Persistence;

namespace OISM.Presentation.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Owner,Staff")]
public class VariantController : ControllerBase
{
    private readonly OismDbContext _dbContext;

    public VariantController(OismDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    [HttpPost]
    [Authorize(Roles = "Owner")]
    public async Task<IActionResult> CreateVariant([FromBody] CreateVariantRequest request)
    {
        var productExists = await _dbContext.Products.AnyAsync(p => p.Id == request.ProductId);
        if (!productExists) return BadRequest("Sản phẩm gốc không tồn tại.");

        // Nếu Barcode rỗng, tự động sinh EAN-13 dựa trên chuỗi ngẫu nhiên (hoặc logic nghiệp vụ)
        string finalBarcode = string.IsNullOrWhiteSpace(request.Barcode) 
            ? GenerateEAN13("893", new Random().Next(100000000, 999999999).ToString()) 
            : request.Barcode;

        var variant = new Variant 
        { 
            Id = Guid.NewGuid(), 
            ProductId = request.ProductId, 
            SKU = request.SKU, 
            Barcode = finalBarcode,
            WacPrice = 0 // Khởi tạo giá WAC = 0
        };
        
        _dbContext.Set<Variant>().Add(variant);
        await _dbContext.SaveChangesAsync();
        
        return Ok(variant);
    }

    // Helper method tự sinh Barcode
    private static string GenerateEAN13(string prefix, string productCode)
    {
        string baseCode = $"{prefix}{productCode}";
        int sum = 0;
        for (int i = 0; i < 12; i++)
        {
            int digit = int.Parse(baseCode[i].ToString());
            sum += (i % 2 == 0) ? digit : digit * 3;
        }
        int checksum = (10 - (sum % 10)) % 10;
        return $"{baseCode}{checksum}";
    }
}

public record CreateVariantRequest(Guid ProductId, string SKU, string? Barcode);