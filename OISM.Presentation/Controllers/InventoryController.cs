using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OISM.Application.Interfaces;

namespace OISM.Presentation.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Owner,Staff")]
public class InventoryController : ControllerBase
{
    private readonly IInventoryService _inventoryService;

    public InventoryController(IInventoryService inventoryService)
    {
        _inventoryService = inventoryService;
    }

    [HttpGet("stock/{branchId}/{productId}")]
    public async Task<IActionResult> GetStock(Guid branchId, Guid productId)
    {
        var stock = await _inventoryService.GetCurrentStockAsync(branchId, productId);
        return Ok(new { BranchId = branchId, ProductId = productId, CurrentStock = stock });
    }

    [HttpPost("transfer")]
    public async Task<IActionResult> Transfer([FromBody] TransferRequest request)
    {
        try
        {
            await _inventoryService.TransferStockAsync(
                request.FromBranchId, request.ToBranchId, request.ProductId, request.Quantity, request.ReferenceId);
            return Ok(new { Message = "Chuyển kho thành công" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { Error = ex.Message }); // Bắt lỗi âm kho
        }
    }

    [HttpPost("in")]
    public async Task<IActionResult> StockIn([FromBody] StockRequest request)
    {
        await _inventoryService.StockInAsync(
            request.BranchId, request.ProductId, request.Quantity, request.ReferenceId);
        return Ok(new { Message = "Nhập kho thành công" });
    }

    [HttpPost("out")]
    public async Task<IActionResult> StockOut([FromBody] StockRequest request)
    {
        try
        {
            await _inventoryService.StockOutAsync(
                request.BranchId, request.ProductId, request.Quantity, request.ReferenceId);
            return Ok(new { Message = "Xuất kho thành công" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { Error = ex.Message }); // Trả về lỗi nếu tồn kho không đủ
        }
}

}

public record TransferRequest(Guid FromBranchId, Guid ToBranchId, Guid ProductId, int Quantity, Guid? ReferenceId);
public record StockRequest(Guid BranchId, Guid ProductId, int Quantity, Guid? ReferenceId);