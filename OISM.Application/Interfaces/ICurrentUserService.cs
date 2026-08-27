namespace OISM.Application.Interfaces;

public interface ICurrentUserService
{
    Guid TenantId { get; }
}