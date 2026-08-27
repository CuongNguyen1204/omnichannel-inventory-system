namespace OISM.Application.Interfaces;

public interface IAuthService
{
    Task<Guid> RegisterTenantAsync(string tenantName, string ownerEmail, string password);
    Task<string> LoginAsync(string email, string password);
}