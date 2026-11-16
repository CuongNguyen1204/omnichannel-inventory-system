using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OISM.Application.Interfaces;
using OISM.Domain.Entities;
using OISM.Infrastructure.Persistence;

namespace OISM.Presentation.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class BrandController : ControllerBase
{
    private readonly OismDbContext _dbContext;
    private readonly ICurrentUserService _currentUserService;

    public BrandController(OismDbContext dbContext, ICurrentUserService currentUserService)
    {
        _dbContext = dbContext;
        _currentUserService = currentUserService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var brands = await _dbContext.Set<Brand>()
            .AsNoTracking()
            .OrderBy(b => b.Name)
            .ToListAsync();
        return Ok(brands);
    }

    [HttpPost]
    [Authorize(Roles = "Owner,Staff")]
    public async Task<IActionResult> Create([FromBody] UpsertBrandRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return BadRequest(new { Message = "Tên thương hiệu không được để trống." });
        }

        var brand = new Brand
        {
            Id = Guid.NewGuid(),
            TenantId = _currentUserService.TenantId,
            Name = request.Name.Trim()
        };

        _dbContext.Set<Brand>().Add(brand);
        await _dbContext.SaveChangesAsync();

        return Ok(brand);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Owner,Staff")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpsertBrandRequest request)
    {
        var brand = await _dbContext.Set<Brand>().FirstOrDefaultAsync(b => b.Id == id);
        if (brand == null)
        {
            return NotFound(new { Message = "Không tìm thấy thương hiệu." });
        }

        brand.Name = request.Name.Trim();
        await _dbContext.SaveChangesAsync();

        return Ok(brand);
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Owner")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var brand = await _dbContext.Set<Brand>().FirstOrDefaultAsync(b => b.Id == id);
        if (brand == null)
        {
            return NotFound(new { Message = "Không tìm thấy thương hiệu." });
        }

        _dbContext.Set<Brand>().Remove(brand);
        await _dbContext.SaveChangesAsync();

        return Ok(new { Message = "Đã xóa thương hiệu thành công." });
    }
}

public record UpsertBrandRequest(string Name);