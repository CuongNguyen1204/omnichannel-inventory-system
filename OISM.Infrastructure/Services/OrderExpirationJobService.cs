using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using OISM.Domain.Entities;
using OISM.Infrastructure.Persistence;

namespace OISM.Infrastructure.Services;

public class OrderExpirationJobService
{
    private readonly OismDbContext _dbContext;
    private readonly ILogger<OrderExpirationJobService> _logger;

    public OrderExpirationJobService(
        OismDbContext dbContext,
        ILogger<OrderExpirationJobService> logger)
    {
        _dbContext = dbContext;
        _logger = logger;
    }

    // FR-SIM-03: Tự động hủy các đơn hàng Reserved đã hết hạn và trả hàng về Available
    public async Task CancelExpiredReservedOrdersAsync()
    {
        var now = DateTimeOffset.UtcNow;

        var expiredOrders = await _dbContext.Set<Order>()
            .IgnoreQueryFilters()
            .Include(o => o.Items)
            .Where(o => o.Status == OrderStatus.Reserved && o.ExpiresAt != null && o.ExpiresAt <= now)
            .ToListAsync();

        if (expiredOrders.Count == 0)
        {
            return;
        }

        foreach (var order in expiredOrders)
        {
            foreach (var item in order.Items)
            {
                var summary = await _dbContext.Set<InventorySummary>()
                    .IgnoreQueryFilters()
                    .FirstOrDefaultAsync(s =>
                        s.TenantId == order.TenantId &&
                        s.BranchId == order.BranchId &&
                        s.VariantId == item.VariantId);

                if (summary != null)
                {
                    summary.Reserved = Math.Max(0, summary.Reserved - item.Quantity);
                }
            }

            order.Status = OrderStatus.Cancelled;
            _logger.LogInformation(
                "[Hangfire FR-SIM-03] Đã tự động hủy đơn quá hạn {OrderNumber} và giải phóng tồn kho giữ chỗ.",
                order.OrderNumber);
        }

        await _dbContext.SaveChangesAsync();
    }
}