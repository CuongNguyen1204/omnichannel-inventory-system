using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OISM.Infrastructure.Persistence;
using OISM.Domain.Entities;

namespace OISM.Presentation.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Owner,Staff")] // Yêu cầu JWT có Role tương ứng
public class BranchController : ControllerBase
{
    private readonly OismDbContext _dbContext;

    public BranchController(OismDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    [HttpGet]
    public async Task<IActionResult> GetBranches()
    {
        // Global Query Filter NFR-TENANT-01 sẽ tự động áp dụng TenantId ở đây
        var branches = await _dbContext.Branches.ToListAsync();
        return Ok(branches);
    }

    [HttpPost]
    [Authorize(Roles = "Owner")] // Chỉ Owner mới được tạo chi nhánh
    public async Task<IActionResult> CreateBranch([FromBody] string name)
    {
        var branch = new Branch { Id = Guid.NewGuid(), Name = name };
        _dbContext.Branches.Add(branch); // TenantId tự động inject từ SaveChangesAsync
        await _dbContext.SaveChangesAsync();
        return Ok(branch);
    }
}