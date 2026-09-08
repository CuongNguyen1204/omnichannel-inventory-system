using OISM.Domain.Entities;

namespace OISM.Application.Interfaces;

public interface IInventoryRepository
{
    Task<int> GetLatestBalanceAsync(Guid branchId, Guid variantId);
    Task AppendLedgerAsync(InventoryLedger ledger);
}