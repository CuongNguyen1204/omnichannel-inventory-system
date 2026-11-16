using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OISM.Application.Interfaces;
using OISM.Domain.Entities;
using OISM.Infrastructure.Persistence;
using OISM.Infrastructure.Services;

namespace OISM.Presentation.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Owner,Staff")]
public class InventoryController : ControllerBase
{
    private readonly IInventoryService _inventoryService;
    private readonly PurchaseReceiptService _receiptService;
    private readonly StockTransferService _transferService;
    private readonly OismDbContext _dbContext;
    private readonly ICurrentUserService _currentUserService;

    public InventoryController(
        IInventoryService inventoryService,
        PurchaseReceiptService receiptService,
        StockTransferService transferService,
        OismDbContext dbContext,
        ICurrentUserService currentUserService)
    {
        _inventoryService = inventoryService;
        _receiptService = receiptService;
        _transferService = transferService;
        _dbContext = dbContext;
        _currentUserService = currentUserService;
    }

    // 1. Lấy bảng tổng hợp Tồn kho & Giá vốn WAC theo Chi nhánh (FR-RSE-01 & FR-COST-01)
    [HttpGet("summary")]
    public async Task<IActionResult> GetInventorySummary([FromQuery] Guid? branchId)
    {
        var variants = await _dbContext.Set<Variant>().AsNoTracking().ToListAsync();
        var products = await _dbContext.Set<Product>().AsNoTracking().ToDictionaryAsync(p => p.Id);

        var summaryQuery = _dbContext.Set<InventorySummary>().AsNoTracking().AsQueryable();
        if (branchId.HasValue && branchId.Value != Guid.Empty)
        {
            summaryQuery = summaryQuery.Where(s => s.BranchId == branchId.Value);
        }

        var summaries = await summaryQuery.ToListAsync();

        var result = variants.Select(v =>
        {
            products.TryGetValue(v.ProductId, out var product);
            var variantSummaries = summaries.Where(s => s.VariantId == v.Id).ToList();
            var onHand = variantSummaries.Sum(s => s.OnHand);
            var reserved = variantSummaries.Sum(s => s.Reserved);
            var available = Math.Max(0, onHand - reserved);

            return new
            {
                VariantId = v.Id,
                ProductId = v.ProductId,
                ProductName = product?.Name ?? v.SKU,
                SkuCode = v.SKU,
                Barcode = v.Barcode,
                RetailPrice = product?.Price ?? 0m,
                WeightedAverageCost = v.WacPrice,
                OnHand = onHand,
                Reserved = reserved,
                Available = available,
                InventoryValue = onHand * v.WacPrice,
                IsLowStock = available <= 5
            };
        }).ToList();

        return Ok(result);
    }

    // 2. Tra cứu Sổ cái Tồn kho Append-Only (FR-INV-01 & NFR-SEC-03)
    [HttpGet("ledger")]
    public async Task<IActionResult> GetInventoryLedger(
        [FromQuery] Guid? branchId,
        [FromQuery] Guid? variantId,
        [FromQuery] string? transactionType,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        var query = _dbContext.Set<InventoryLedger>().AsNoTracking().AsQueryable();

        if (branchId.HasValue && branchId.Value != Guid.Empty)
        {
            query = query.Where(l => l.BranchId == branchId.Value);
        }

        if (variantId.HasValue && variantId.Value != Guid.Empty)
        {
            query = query.Where(l => l.VariantId == variantId.Value);
        }

        if (!string.IsNullOrWhiteSpace(transactionType))
        {
            query = query.Where(l => l.TransactionType == transactionType);
        }

        var totalCount = await query.CountAsync();
        var entries = await query
            .OrderByDescending(l => l.CreatedAt)
            .Skip((Math.Max(1, page) - 1) * pageSize)
            .Take(pageSize)
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

        var items = entries.Select(e =>
        {
            variants.TryGetValue(e.VariantId, out var variant);
            Product? product = null;
            if (variant != null)
            {
                products.TryGetValue(variant.ProductId, out product);
            }
            branches.TryGetValue(e.BranchId, out var branch);

            return new
            {
                e.Id,
                e.TenantId,
                e.BranchId,
                BranchName = branch?.Name ?? "Chi nhánh",
                e.VariantId,
                SkuCode = variant?.SKU ?? "N/A",
                ProductName = product?.Name ?? variant?.SKU ?? "Sản phẩm",
                Direction = e.Quantity >= 0 ? "IN" : "OUT",
                e.TransactionType,
                e.Quantity,
                UnitCostSnapshot = e.UnitCost,
                e.BalanceAfter,
                e.ReferenceId,
                e.CreatedAt
            };
        });

        return Ok(new
        {
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize,
            Items = items
        });
    }

    // 3. Kiểm kê kho & tự động sinh bút toán điều chỉnh (FR-INV-04)
    [HttpPost("stocktake")]
    public async Task<IActionResult> ProcessStocktake([FromBody] StocktakeRequest request)
    {
        if (request.PhysicalCount < 0)
        {
            return BadRequest(new { Error = "Số lượng kiểm đếm thực tế không được âm." });
        }

        await using var transaction = await _dbContext.Database.BeginTransactionAsync();
        try
        {
            var variant = await _dbContext.Set<Variant>()
                .FirstOrDefaultAsync(v => v.Id == request.VariantId);
            if (variant == null)
            {
                return NotFound(new { Error = "Không tìm thấy biến thể SKU." });
            }

            var summary = await _dbContext.Set<InventorySummary>()
                .FirstOrDefaultAsync(s =>
                    s.BranchId == request.BranchId && s.VariantId == request.VariantId);

            if (summary == null)
            {
                summary = new InventorySummary
                {
                    Id = Guid.NewGuid(),
                    TenantId = _currentUserService.TenantId,
                    BranchId = request.BranchId,
                    VariantId = request.VariantId,
                    OnHand = 0,
                    Reserved = 0
                };
                _dbContext.Set<InventorySummary>().Add(summary);
            }

            var softwareBalance = summary.OnHand;
            var discrepancy = request.PhysicalCount - softwareBalance;

            if (discrepancy == 0)
            {
                return Ok(new
                {
                    Message = "Số lượng thực tế khớp 100% với phần mềm. Không cần sinh bút toán điều chỉnh.",
                    SoftwareBalance = softwareBalance,
                    PhysicalCount = request.PhysicalCount,
                    Discrepancy = 0
                });
            }

            summary.OnHand = request.PhysicalCount;

            var ledgerEntry = new InventoryLedger
            {
                Id = Guid.NewGuid(),
                TenantId = _currentUserService.TenantId,
                BranchId = request.BranchId,
                VariantId = request.VariantId,
                TransactionType = discrepancy > 0 ? "STOCKTAKE_IN" : "STOCKTAKE_OUT",
                Quantity = discrepancy,
                BalanceAfter = request.PhysicalCount,
                UnitCost = variant.WacPrice,
                ReferenceId = request.SessionId ?? Guid.NewGuid(),
                CreatedAt = DateTimeOffset.UtcNow
            };

            _dbContext.Set<InventoryLedger>().Add(ledgerEntry);
            await _dbContext.SaveChangesAsync();
            await transaction.CommitAsync();

            return Ok(new
            {
                Message = "Đã cân bằng kho và ghi bút toán điều chỉnh vào Sổ cái (Append-Only Ledger).",
                SoftwareBalance = softwareBalance,
                PhysicalCount = request.PhysicalCount,
                Discrepancy = discrepancy,
                LedgerEntryId = ledgerEntry.Id
            });
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            return BadRequest(new { Error = ex.Message });
        }
    }

    // --- GIỮ NGUYÊN 4 ENDPOINT HIỆN CÓ CỦA BẠN ---
    [HttpGet("stock/{branchId}/{variantId}")]
    public async Task<IActionResult> GetStock(Guid branchId, Guid variantId)
    {
        var stock = await _inventoryService.GetCurrentStockAsync(branchId, variantId);
        return Ok(new { BranchId = branchId, VariantId = variantId, CurrentStock = stock });
    }

    [HttpPost("transfer")]
    public async Task<IActionResult> Transfer([FromBody] TransferRequest request)
    {
        try
        {
            await _transferService.TransferAsync(
                request.FromBranchId, request.ToBranchId, request.VariantId, request.Quantity, request.ReferenceId);
            return Ok(new { Message = "Chuyển kho thành công" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { Error = ex.Message });
        }
    }

    [HttpPost("receipt")]
    public async Task<IActionResult> PurchaseReceipt([FromBody] PurchaseReceiptRequest request)
    {
        await _receiptService.ProcessReceiptAsync(
            request.BranchId, request.VariantId, request.Quantity, request.UnitPrice, request.ReferenceId);
        return Ok(new { Message = "Nhập mua hàng thành công, đã cập nhật WAC" });
    }

    [HttpPost("out")]
    public async Task<IActionResult> StockOut([FromBody] StockRequest request)
    {
        try
        {
            await _inventoryService.StockOutAsync(
                request.BranchId, request.VariantId, request.Quantity, request.ReferenceId);
            return Ok(new { Message = "Xuất kho thành công" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { Error = ex.Message });
        }
    }
}

public record TransferRequest(Guid FromBranchId, Guid ToBranchId, Guid VariantId, int Quantity, Guid? ReferenceId);
public record StockRequest(Guid BranchId, Guid VariantId, int Quantity, Guid? ReferenceId);
public record PurchaseReceiptRequest(Guid BranchId, Guid VariantId, int Quantity, decimal UnitPrice, Guid ReferenceId);
public record StocktakeRequest(Guid BranchId, Guid VariantId, int PhysicalCount, Guid? SessionId);