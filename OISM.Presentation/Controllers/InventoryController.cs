using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OISM.Application.Interfaces;
using OISM.Infrastructure.Services;
using OISM.Application.DTOs;

namespace OISM.Presentation.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Owner,Staff")]
public class InventoryController : ControllerBase
{
    private readonly IInventoryService _inventoryService;
    private readonly PurchaseReceiptService _receiptService;
    private readonly StockTransferService _transferService; // Thêm dòng này

    // Cập nhật Constructor
    public InventoryController(
        IInventoryService inventoryService, 
        PurchaseReceiptService receiptService,
        StockTransferService transferService) 
    {
        _inventoryService = inventoryService;
        _receiptService = receiptService;
        _transferService = transferService;
    }

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
            // Đổi từ _inventoryService.TransferStockAsync thành _transferService.TransferAsync
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

// Các định nghĩa DTOs nằm ngay tại đây để Controller có thể nhận diện
public record TransferRequest(Guid FromBranchId, Guid ToBranchId, Guid VariantId, int Quantity, Guid? ReferenceId);
public record StockRequest(Guid BranchId, Guid VariantId, int Quantity, Guid? ReferenceId);
public record PurchaseReceiptRequest(Guid BranchId, Guid VariantId, int Quantity, decimal UnitPrice, Guid ReferenceId);