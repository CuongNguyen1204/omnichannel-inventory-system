using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using Microsoft.EntityFrameworkCore;
using OISM.Application.Interfaces;
using OISM.Infrastructure.Persistence;
using OISM.Domain.Entities;

namespace OISM.Infrastructure.Services;

public class AuthService : IAuthService
{
    private readonly OismDbContext _dbContext;
    private readonly IConfiguration _configuration;

    public AuthService(OismDbContext dbContext, IConfiguration configuration)
    {
        _dbContext = dbContext;
        _configuration = configuration;
    }

    public async Task<Guid> RegisterTenantAsync(string tenantName, string ownerEmail, string password)
    {
        // 1. Tạo Tenant
        var tenant = new Tenant { Id = Guid.NewGuid(), Name = tenantName, SchemaName = tenantName.ToLower().Replace(" ", "") };
        _dbContext.Tenants.Add(tenant);
        
        // 2. Tạo User (Owner) - Giả định bạn có entity User, ở đây demo ngắn gọn
        // TODO: Hash password và lưu User mapping với TenantId
        
        await _dbContext.SaveChangesAsync();
        return tenant.Id;
    }

    public async Task<string> LoginAsync(string email, string password)
    {
        // TODO: Verify email & password thực tế với database
        var mockTenantId = Guid.NewGuid(); // Giả lập TenantId lấy từ DB sau khi query user
        var mockUserId = Guid.NewGuid();
        var role = "Owner"; 

        var jwtSettings = _configuration.GetSection("JwtSettings");
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSettings["Secret"]!));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, mockUserId.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, email),
            new Claim("TenantId", mockTenantId.ToString()),
            new Claim(ClaimTypes.Role, role)
        };

        var token = new JwtSecurityToken(
            issuer: jwtSettings["Issuer"],
            audience: jwtSettings["Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddHours(2),
            signingCredentials: creds
        );

        var tokenString = new JwtSecurityTokenHandler().WriteToken(token);
        return await Task.FromResult(tokenString); // Bọc vào Task để triệt tiêu cảnh báo CS1998
    }
}