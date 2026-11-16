using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OISM.Domain.Entities;
using OISM.Infrastructure.Persistence;

namespace OISM.Presentation.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Owner,Staff")]
public class ReportController : ControllerBase
{
    private readonly OismDbContext _dbContext;

    public ReportController(OismDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    // 1. Báo cáo Doanh thu, Giá vốn (COGS) & Lợi nhuận gộp (FR-REP-01)
    [HttpGet("revenue-profit")]
    public async Task<IActionResult> GetRevenueAndProfit(
        [FromQuery] Guid? branchId,
        [FromQuery] DateTimeOffset? fromDate,
        [FromQuery] DateTimeOffset? toDate)
    {
        var query = _dbContext.Set<Order>()
            .Include(o => o.Items)
            .AsNoTracking()
            .Where(o => o.Status == OrderStatus.Confirmed || o.Status == OrderStatus.Completed);

        if (branchId.HasValue && branchId.Value != Guid.Empty)
        {
            query = query.Where(o => o.BranchId == branchId.Value);
        }

        if (fromDate.HasValue)
        {
            query = query.Where(o => o.CreatedAt >= fromDate.Value);
        }

        if (toDate.HasValue)
        {
            query = query.Where(o => o.CreatedAt <= toDate.Value);
        }

        var orders = await query.ToListAsync();

        var netRevenue = orders.SelectMany(o => o.Items).Sum(i => i.Quantity * i.UnitPrice);
        var totalCogs = orders.SelectMany(o => o.Items).Sum(i => i.Quantity * i.CogsPrice);
        var grossProfit = netRevenue - totalCogs;
        var grossMarginPercent = netRevenue > 0
            ? Math.Round((grossProfit / netRevenue) * 100m, 2)
            : 0m;

        var dailyBreakdown = orders
            .GroupBy(o => o.CreatedAt.ToOffset(TimeSpan.FromHours(7)).Date)
            .OrderBy(g => g.Key)
            .Select(g =>
            {
                var dayRev = g.SelectMany(o => o.Items).Sum(i => i.Quantity * i.UnitPrice);
                var dayCogs = g.SelectMany(o => o.Items).Sum(i => i.Quantity * i.CogsPrice);
                return new
                {
                    Date = g.Key.ToString("dd/MM/yyyy"),
                    Revenue = dayRev,
                    Cogs = dayCogs,
                    GrossProfit = dayRev - dayCogs
                };
            })
            .ToList();

        var channelBreakdown = orders
            .GroupBy(o => InferChannel(o.OrderNumber))
            .Select(g => new
            {
                Channel = g.Key,
                OrderCount = g.Count(),
                Revenue = g.SelectMany(o => o.Items).Sum(i => i.Quantity * i.UnitPrice)
            })
            .ToList();

        return Ok(new
        {
            NetRevenue = netRevenue,
            TotalCogs = totalCogs,
            GrossProfit = grossProfit,
            GrossMarginPercent = grossMarginPercent,
            TotalOrders = orders.Count,
            DailyBreakdown = dailyBreakdown,
            ChannelBreakdown = channelBreakdown
        });
    }

    // 2. Báo cáo Giá trị Tồn kho & Vận tốc Bán hàng Best-sellers / Slow-moving (FR-REP-02)
    [HttpGet("inventory-velocity")]
    public async Task<IActionResult> GetInventoryVelocity([FromQuery] Guid? branchId)
    {
        var variants = await _dbContext.Set<Variant>().AsNoTracking().ToListAsync();
        var products = await _dbContext.Set<Product>().AsNoTracking().ToDictionaryAsync(p => p.Id);

        var summaryQuery = _dbContext.Set<InventorySummary>().AsNoTracking().AsQueryable();
        if (branchId.HasValue && branchId.Value != Guid.Empty)
        {
            summaryQuery = summaryQuery.Where(s => s.BranchId == branchId.Value);
        }
        var summaries = await summaryQuery.ToListAsync();

        var since30Days = DateTimeOffset.UtcNow.AddDays(-30);
        var soldItems = await _dbContext.Set<OrderItem>()
            .Include(i => i.Order)
            .AsNoTracking()
            .Where(i =>
                (i.Order.Status == OrderStatus.Confirmed || i.Order.Status == OrderStatus.Completed) &&
                i.Order.CreatedAt >= since30Days)
            .ToListAsync();

        var itemsReport = variants.Select(v =>
        {
            products.TryGetValue(v.ProductId, out var product);
            var onHand = summaries.Where(s => s.VariantId == v.Id).Sum(s => s.OnHand);
            var reserved = summaries.Where(s => s.VariantId == v.Id).Sum(s => s.Reserved);
            var soldQty30d = soldItems.Where(i => i.VariantId == v.Id).Sum(i => i.Quantity);

            return new
            {
                VariantId = v.Id,
                SkuCode = v.SKU,
                ProductName = product?.Name ?? v.SKU,
                OnHand = onHand,
                Reserved = reserved,
                Available = Math.Max(0, onHand - reserved),
                UnitCost = v.WacPrice,
                StockValuation = onHand * v.WacPrice,
                SoldQuantity30d = soldQty30d,
                MovementCategory = soldQty30d >= 10
                    ? "BEST_SELLER"
                    : soldQty30d == 0
                    ? "SLOW_MOVING"
                    : "NORMAL"
            };
        }).ToList();

        return Ok(new
        {
            TotalInventoryValuation = itemsReport.Sum(i => i.StockValuation),
            TotalUnitsOnHand = itemsReport.Sum(i => i.OnHand),
            BestSellers = itemsReport.OrderByDescending(i => i.SoldQuantity30d).Take(10),
            SlowMovingItems = itemsReport.OrderBy(i => i.SoldQuantity30d).Take(10),
            AllItems = itemsReport
        });
    }

    // 3. Cảnh báo Tồn kho thấp (FR-REP-03) & Dự báo Nhập hàng AI (Task Package 5)
    [HttpGet("ai-reorder-forecast")]
    public async Task<IActionResult> GetAiReorderForecast(
        [FromQuery] Guid? branchId,
        [FromQuery] int reorderThreshold = 5,
        [FromQuery] int targetCoverDays = 14)
    {
        var variants = await _dbContext.Set<Variant>().AsNoTracking().ToListAsync();
        var products = await _dbContext.Set<Product>().AsNoTracking().ToDictionaryAsync(p => p.Id);

        var summaryQuery = _dbContext.Set<InventorySummary>().AsNoTracking().AsQueryable();
        if (branchId.HasValue && branchId.Value != Guid.Empty)
        {
            summaryQuery = summaryQuery.Where(s => s.BranchId == branchId.Value);
        }
        var summaries = await summaryQuery.ToListAsync();

        var since30Days = DateTimeOffset.UtcNow.AddDays(-30);
        var recentOrderItems = await _dbContext.Set<OrderItem>()
            .Include(i => i.Order)
            .AsNoTracking()
            .Where(i =>
                (i.Order.Status == OrderStatus.Confirmed || i.Order.Status == OrderStatus.Completed) &&
                i.Order.CreatedAt >= since30Days)
            .ToListAsync();

        var recommendations = variants.Select(v =>
        {
            products.TryGetValue(v.ProductId, out var product);
            var onHand = summaries.Where(s => s.VariantId == v.Id).Sum(s => s.OnHand);
            var reserved = summaries.Where(s => s.VariantId == v.Id).Sum(s => s.Reserved);
            var available = Math.Max(0, onHand - reserved);

            var soldLast30d = recentOrderItems
                .Where(i => i.VariantId == v.Id)
                .Sum(i => i.Quantity);

            // Nếu chưa có lịch sử bán 30 ngày, ước lượng vận tốc cơ sở = 0.5 sp/ngày
            var avgDailySales = soldLast30d > 0
                ? Math.Round(soldLast30d / 30.0, 2)
                : 0.5;

            var estimatedDaysRemaining = avgDailySales > 0
                ? (int)Math.Floor(available / avgDailySales)
                : 999;

            var neededForTargetDays = (int)Math.Ceiling(avgDailySales * targetCoverDays);
            var recommendedReorderQty = Math.Max(0, neededForTargetDays - available + reorderThreshold);

            var urgencyLevel = available <= reorderThreshold || estimatedDaysRemaining <= 3
                ? "CRITICAL"
                : estimatedDaysRemaining <= 7
                ? "WARNING"
                : "SAFE";

            return new
            {
                VariantId = v.Id,
                SkuCode = v.SKU,
                ProductName = product?.Name ?? v.SKU,
                OnHand = onHand,
                Reserved = reserved,
                Available = available,
                ReorderThreshold = reorderThreshold,
                AvgDailySales30d = avgDailySales,
                EstimatedDaysRemaining = estimatedDaysRemaining,
                RecommendedReorderQty = recommendedReorderQty,
                EstimatedImportCost = recommendedReorderQty * v.WacPrice,
                UrgencyLevel = urgencyLevel
            };
        })
        .OrderBy(r => r.Available)
        .ThenBy(r => r.EstimatedDaysRemaining)
        .ToList();

        return Ok(recommendations);
    }

    private static string InferChannel(string orderNumber)
    {
        if (string.IsNullOrWhiteSpace(orderNumber)) return "Manual";
        var upper = orderNumber.ToUpperInvariant();
        if (upper.Contains("POS")) return "POS";
        if (upper.Contains("SP") || upper.Contains("SHOPEE")) return "Shopee";
        if (upper.Contains("TT") || upper.Contains("TIKTOK")) return "TikTokShop";
        if (upper.Contains("LZ") || upper.Contains("LAZADA")) return "Lazada";
        return "Shopee";
    }
}