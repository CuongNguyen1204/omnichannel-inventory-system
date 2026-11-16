using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using OISM.Application.Interfaces;
using OISM.Domain.Entities;
using OISM.Infrastructure.Persistence;
using OISM.Presentation.Hubs;

namespace OISM.Presentation.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Owner,Staff")]
public class OrderController : ControllerBase
{
    private readonly OismDbContext _dbContext;
    private readonly ICurrentUserService _currentUserService;
    private readonly IHubContext<OrderHub> _hubContext;

    public OrderController(
        OismDbContext dbContext,
        ICurrentUserService currentUserService,
        IHubContext<OrderHub> hubContext)
    {
        _dbContext = dbContext;
        _currentUserService = currentUserService;
        _hubContext = hubContext;
    }

    // 1. Lấy danh sách đơn hàng đa kênh (FR-ORD-01)
    [HttpGet]
    public async Task<IActionResult> GetOrders(
        [FromQuery] Guid? branchId,
        [FromQuery] string? status)
    {
        var query = _dbContext.Set<Order>()
            .Include(o => o.Items)
            .AsNoTracking()
            .AsQueryable();

        if (branchId.HasValue && branchId.Value != Guid.Empty)
        {
            query = query.Where(o => o.BranchId == branchId.Value);
        }

        if (!string.IsNullOrWhiteSpace(status) &&
            Enum.TryParse<OrderStatus>(status, true, out var parsedStatus))
        {
            query = query.Where(o => o.Status == parsedStatus);
        }

        var orders = await query
            .OrderByDescending(o => o.CreatedAt)
            .Take(200)
            .ToListAsync();

        var variants = await _dbContext.Set<Variant>()
            .AsNoTracking()
            .ToDictionaryAsync(v => v.Id);
        var products = await _dbContext.Set<Product>()
            .AsNoTracking()
            .ToDictionaryAsync(p => p.Id);
        var branches = await _dbContext.Set<Branch>()
            .AsNoTracking()
            .ToDictionaryAsync(b => b.Id);

        var result = orders.Select(o =>
        {
            branches.TryGetValue(o.BranchId, out var branch);
            var channel = InferChannelFromOrderNumber(o.OrderNumber);

            var mappedItems = o.Items.Select(i =>
            {
                variants.TryGetValue(i.VariantId, out var variant);
                Product? product = null;
                if (variant != null)
                {
                    products.TryGetValue(variant.ProductId, out product);
                }

                return new
                {
                    i.Id,
                    i.VariantId,
                    SkuCode = variant?.SKU ?? "SKU",
                    ProductName = product?.Name ?? variant?.SKU ?? "Sản phẩm",
                    i.Quantity,
                    i.UnitPrice,
                    CostPriceSnapshot = i.CogsPrice,
                    LineTotal = i.Quantity * i.UnitPrice
                };
            }).ToList();

            var grandTotal = mappedItems.Sum(i => i.LineTotal);
            var totalCogs = o.Items.Sum(i => i.Quantity * i.CogsPrice);

            return new
            {
                o.Id,
                o.OrderNumber,
                o.TenantId,
                o.BranchId,
                BranchName = branch?.Name ?? "Chi nhánh mặc định",
                Channel = channel,
                Status = o.Status.ToString(),
                GrandTotal = grandTotal,
                TotalCogs = totalCogs,
                GrossProfit = grandTotal - totalCogs,
                o.CreatedAt,
                o.ExpiresAt,
                Items = mappedItems
            };
        });

        return Ok(result);
    }

    // 2. Duyệt đơn hàng: Reserved -> Confirmed (Trừ OnHand, giảm Reserved, ghi Ledger, chốt COGS - FR-ORD-02, FR-RSE-03, FR-COST-02)
    [HttpPost("{id:guid}/confirm")]
    public async Task<IActionResult> ConfirmOrder(Guid id)
    {
        await using var transaction = await _dbContext.Database.BeginTransactionAsync();
        try
        {
            var order = await _dbContext.Set<Order>()
                .Include(o => o.Items)
                .FirstOrDefaultAsync(o => o.Id == id);

            if (order == null)
            {
                return NotFound(new { Message = "Không tìm thấy đơn hàng." });
            }

            if (order.Status != OrderStatus.Reserved && order.Status != OrderStatus.Draft)
            {
                return BadRequest(new
                {
                    Message = $"Không thể duyệt đơn hàng đang ở trạng thái [{order.Status}]. Chỉ duyệt được đơn Draft hoặc Reserved."
                });
            }

            foreach (var item in order.Items)
            {
                var variant = await _dbContext.Set<Variant>()
                    .FirstOrDefaultAsync(v => v.Id == item.VariantId);
                var summary = await _dbContext.Set<InventorySummary>()
                    .FirstOrDefaultAsync(s =>
                        s.BranchId == order.BranchId && s.VariantId == item.VariantId);

                if (summary == null || summary.OnHand < item.Quantity)
                {
                    return BadRequest(new
                    {
                        Message = $"Tồn kho thực tế (OnHand) không đủ để xuất kho cho SKU [{variant?.SKU}]."
                    });
                }

                // Khấu trừ OnHand và giải phóng Reserved (FR-RSE-03)
                summary.OnHand -= item.Quantity;
                if (order.Status == OrderStatus.Reserved)
                {
                    summary.Reserved = Math.Max(0, summary.Reserved - item.Quantity);
                }

                // Chốt giá vốn bình quân tại thời điểm xuất kho (FR-COST-02)
                var wacCost = variant?.WacPrice ?? item.CogsPrice;
                item.CogsPrice = wacCost;

                // Ghi bút toán vào Sổ cái bất biến (FR-INV-01)
                var ledger = new InventoryLedger
                {
                    Id = Guid.NewGuid(),
                    TenantId = order.TenantId,
                    BranchId = order.BranchId,
                    VariantId = item.VariantId,
                    TransactionType = "SALE_CONFIRM",
                    Quantity = -item.Quantity,
                    BalanceAfter = summary.OnHand,
                    UnitCost = wacCost,
                    ReferenceId = order.Id,
                    CreatedAt = DateTimeOffset.UtcNow
                };

                _dbContext.Set<InventoryLedger>().Add(ledger);

                // Phát tín hiệu cập nhật tồn kho khả dụng qua SignalR
                var availableAfter = Math.Max(0, summary.OnHand - summary.Reserved);
                await _hubContext.Clients.All.SendAsync("ReceiveStockUpdated", new
                {
                    variantId = item.VariantId,
                    skuCode = variant?.SKU,
                    available = availableAfter
                });
            }

            order.Status = OrderStatus.Confirmed;
            await _dbContext.SaveChangesAsync();
            await transaction.CommitAsync();

            return Ok(new
            {
                Message = $"Đã duyệt đơn hàng {order.OrderNumber}, trừ kho và chốt giá vốn COGS thành công.",
                OrderId = order.Id,
                Status = order.Status.ToString()
            });
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            return BadRequest(new { Message = ex.Message });
        }
    }

    // 3. Hủy đơn hàng: Giải phóng Reserved về lại quỹ Available (FR-RSE-03)
    [HttpPost("{id:guid}/cancel")]
    public async Task<IActionResult> CancelOrder(Guid id)
    {
        await using var transaction = await _dbContext.Database.BeginTransactionAsync();
        try
        {
            var order = await _dbContext.Set<Order>()
                .Include(o => o.Items)
                .FirstOrDefaultAsync(o => o.Id == id);

            if (order == null)
            {
                return NotFound(new { Message = "Không tìm thấy đơn hàng." });
            }

            if (order.Status == OrderStatus.Completed || order.Status == OrderStatus.Cancelled)
            {
                return BadRequest(new
                {
                    Message = $"Đơn hàng đang ở trạng thái [{order.Status}] không thể hủy."
                });
            }

            // Nếu đơn đang giữ chỗ (Reserved), trả lại số lượng vào Available
            if (order.Status == OrderStatus.Reserved)
            {
                foreach (var item in order.Items)
                {
                    var summary = await _dbContext.Set<InventorySummary>()
                        .FirstOrDefaultAsync(s =>
                            s.BranchId == order.BranchId && s.VariantId == item.VariantId);

                    if (summary != null)
                    {
                        summary.Reserved = Math.Max(0, summary.Reserved - item.Quantity);
                        var availableAfter = Math.Max(0, summary.OnHand - summary.Reserved);

                        await _hubContext.Clients.All.SendAsync("ReceiveStockUpdated", new
                        {
                            variantId = item.VariantId,
                            available = availableAfter
                        });
                    }
                }
            }

            order.Status = OrderStatus.Cancelled;
            await _dbContext.SaveChangesAsync();
            await transaction.CommitAsync();

            return Ok(new
            {
                Message = $"Đã hủy đơn hàng {order.OrderNumber} và hoàn trả tồn kho giữ chỗ về quỹ Available.",
                OrderId = order.Id,
                Status = order.Status.ToString()
            });
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            return BadRequest(new { Message = ex.Message });
        }
    }

    // 4. Hoàn tất đơn hàng: Confirmed -> Completed (FR-ORD-02)
    [HttpPost("{id:guid}/complete")]
    public async Task<IActionResult> CompleteOrder(Guid id)
    {
        var order = await _dbContext.Set<Order>().FirstOrDefaultAsync(o => o.Id == id);
        if (order == null)
        {
            return NotFound(new { Message = "Không tìm thấy đơn hàng." });
        }

        if (order.Status != OrderStatus.Confirmed)
        {
            return BadRequest(new
            {
                Message = "Chỉ có thể hoàn tất đơn hàng đã ở trạng thái Confirmed."
            });
        }

        order.Status = OrderStatus.Completed;
        await _dbContext.SaveChangesAsync();

        return Ok(new
        {
            Message = $"Đơn hàng {order.OrderNumber} đã chuyển sang trạng thái Hoàn thành (Completed).",
            OrderId = order.Id,
            Status = order.Status.ToString()
        });
    }

    private static string InferChannelFromOrderNumber(string orderNumber)
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