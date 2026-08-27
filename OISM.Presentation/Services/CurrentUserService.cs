using System.Security.Claims;
using OISM.Application.Interfaces;

namespace OISM.Presentation.Services;

public class CurrentUserService : ICurrentUserService
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public CurrentUserService(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    public Guid TenantId
    {
        get
        {
            var tenantIdString = _httpContextAccessor.HttpContext?.User?.FindFirstValue("TenantId");
            return Guid.TryParse(tenantIdString, out var tenantId) ? tenantId : Guid.Empty;
        }
    }
}