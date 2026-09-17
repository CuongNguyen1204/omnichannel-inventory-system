using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OISM.Infrastructure.Services;
using OISM.Domain.Entities;
using System.Data;
using OISM.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace OISM.Presentation.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Owner,Staff")]
public class PosController : ControllerBase
{
    private readonly OrderEngineService _orderEngine;
    private readonly OismDbContext _dbContext;

    public PosController(OrderEngineService orderEngine, OismDbContext dbContext)
    {
        _orderEngine = orderEngine;
        _dbContext = dbContext;
    }

    // FR-POS: Gom Reserve -> Confirm -> Deduct vào 1 transaction duy nhất
    [HttpPost("fast-checkout")]
    public async Task<IActionResult> FastCheckout([FromBody] FastCheckoutRequest request)
    {
        using var transaction = await _dbContext.Database.BeginTransactionAsync(IsolationLevel.Serializable);
        try
        {
            // 1. Reserve
            var order = await _orderEngine.ReserveOrderAsync(request.BranchId, request.Items);
            
            // 2. Confirm & Deduct kho ngay lập tức
            await _orderEngine.ConfirmOrderAsync(order.Id);
            
            await transaction.CommitAsync();
            return Ok(new { OrderId = order.Id, Message = "Thanh toán và trừ kho thành công!" });
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            return BadRequest(new { Error = ex.Message });
        }
    }
}
public record FastCheckoutRequest(Guid BranchId, List<OrderItem> Items);