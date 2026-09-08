using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OISM.Domain.Entities;
using OISM.Infrastructure.Persistence;

namespace OISM.Presentation.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Owner,Staff")]
public class ProductController : ControllerBase
{
    private readonly OismDbContext _dbContext;

    public ProductController(OismDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    [HttpGet]
    public async Task<IActionResult> GetProducts()
    {
        var products = await _dbContext.Products.Include(p => p.Category).ToListAsync();
        return Ok(products);
    }

    [HttpPost]
    [Authorize(Roles = "Owner")]
    public async Task<IActionResult> CreateProduct([FromBody] CreateProductRequest request)
    {
        // Kiểm tra Category có tồn tại và thuộc về Tenant hiện tại không (Query Filter lo việc này)
        var categoryExists = await _dbContext.Categories.AnyAsync(c => c.Id == request.CategoryId);
        if (!categoryExists) return BadRequest("Danh mục không tồn tại.");

        var product = new Product 
        { 
            Id = Guid.NewGuid(), 
            CategoryId = request.CategoryId, 
            Sku = request.Sku, 
            Name = request.Name, 
            Price = request.Price 
        };
        
        _dbContext.Products.Add(product);
        await _dbContext.SaveChangesAsync();
        
        return Ok(product);
    }
}

public record CreateProductRequest(Guid CategoryId, string Sku, string Name, decimal Price);