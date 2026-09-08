using Microsoft.EntityFrameworkCore;
using OISM.Application.Interfaces;
using OISM.Domain.Entities;
using OISM.Infrastructure.Persistence;

namespace OISM.Infrastructure.Repositories;

public class InventoryRepository : IInventoryRepository
{
    private readonly OismDbContext _dbContext;

    public InventoryRepository(OismDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<int> GetLatestBalanceAsync(Guid branchId, Guid variantId)
    {
        // Lấy bản ghi giao dịch gần nhất để trích xuất tồn kho hiện tại (BalanceAfter)
        var latestEntry = await _dbContext.InventoryLedgers
            .Where(x => x.BranchId == branchId && x.VariantId == variantId)
            .OrderByDescending(x => x.CreatedAt)
            .FirstOrDefaultAsync();

        return latestEntry?.BalanceAfter ?? 0;
    }

    public async Task AppendLedgerAsync(InventoryLedger ledger)
    {
        await _dbContext.InventoryLedgers.AddAsync(ledger);
    }
}