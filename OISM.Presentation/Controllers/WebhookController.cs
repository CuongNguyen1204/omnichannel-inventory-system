using Hangfire;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using OISM.Domain.Entities;
using OISM.Infrastructure.Services;
using OISM.Presentation.Hubs;

namespace OISM.Presentation.Controllers;

[ApiController]
[Route("api/webhooks/orders")]
public class WebhookController : ControllerBase
{
    private readonly OrderEngineService _orderEngine;
    private readonly IBackgroundJobClient _backgroundJobClient;
    private readonly IHubContext<OrderHub> _hubContext;

    public WebhookController(
        OrderEngineService orderEngine, 
        IBackgroundJobClient backgroundJobClient,
        IHubContext<OrderHub> hubContext)
    {
        _orderEngine = orderEngine;
        _backgroundJobClient = backgroundJobClient;
        _hubContext = hubContext;
    }

    // FR-SIM: Bắt sự kiện đơn hàng mới từ Shopee/TikTok
    [HttpPost("shopee")]
    public async Task<IActionResult> ReceiveShopeeOrder([FromBody] IncomingOrderPayload payload)
    {
        try
        {
            var items = payload.Items.Select(i => new OrderItem 
            { 
                Id = Guid.NewGuid(), VariantId = i.VariantId, Quantity = i.Quantity, UnitPrice = i.Price 
            }).ToList();

            // 1. Giữ kho (Reserved)
            var order = await _orderEngine.ReserveOrderAsync(payload.BranchId, items);

            // 2. Schedule Hangfire Job hủy đơn sau 15 phút nếu không được thanh toán/Confirmed
            _backgroundJobClient.Schedule(() => 
                _orderEngine.CancelExpiredReservationAsync(order.Id), TimeSpan.FromMinutes(15));

            // 3. Gửi thông báo realtime qua SignalR
            await _hubContext.Clients.All.SendAsync("ReceiveNewOrder", new 
            { 
                OrderId = order.Id, 
                Message = "Ting ting! Có đơn hàng mới từ Shopee/TikTok!",
                Time = DateTimeOffset.UtcNow
            });

            return Ok(new { OrderId = order.Id, Status = order.Status.ToString() });
        }
        catch (InvalidOperationException ex)
        {
            // Bắt lỗi khi hết hàng, trả về status để thông báo cho channel
            return BadRequest(new { Error = ex.Message });
        }
    }
    
    [HttpPost("{orderId}/confirm")]
    public async Task<IActionResult> ConfirmOrder(Guid orderId)
    {
        await _orderEngine.ConfirmOrderAsync(orderId);
        return Ok("Đơn hàng đã được chốt và trừ tồn kho thực tế.");
    }
}

public record IncomingOrderPayload(Guid BranchId, List<IncomingItem> Items);
public record IncomingItem(Guid VariantId, int Quantity, decimal Price);