using Microsoft.AspNetCore.SignalR;

namespace OISM.Presentation.Hubs;

// Hub này sẽ làm cầu nối đẩy dữ liệu realtime xuống ReactJS
public class OrderHub : Hub
{
    // Có thể thêm các hàm xử lý Connection/Disconnection nếu cần track user online
}