using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OISM.Domain.Entities;
using OISM.Infrastructure.Persistence;

namespace OISM.Presentation.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Owner,Staff")]
public class CategoryController : ControllerBase
{
    private readonly OismDbContext _dbContext;

    public CategoryController(OismDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    [HttpGet]
    public async Task<IActionResult> GetCategories()
    {
        var categories = await _dbContext.Categories.ToListAsync();
        return Ok(categories);
    }

    [HttpPost]
    [Authorize(Roles = "Owner")]
    public async Task<IActionResult> CreateCategory([FromBody] CreateCategoryRequest request)
    {
        var category = new Category 
        { 
            Id = Guid.NewGuid(), 
            Name = request.Name, 
            Description = request.Description 
        };
        
        _dbContext.Categories.Add(category);
        await _dbContext.SaveChangesAsync(); // TenantId tự động được gắn nhờ SaveChangesAsync override
        
        return Ok(category);
    }
}

public record CreateCategoryRequest(string Name, string? Description);