import { useEffect, useState, useCallback } from 'react';
import * as signalR from '@microsoft/signalr';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/useAuthStore';
import { usePosStore } from '../store/usePosStore';

export interface RealtimeNotification {
  id: string;
  title: string;
  message: string;
  channel?: string;
  createdAt: string;
  isRead: boolean;
}

export interface OrderNotificationPayload {
  orderId?: string;
  orderNumber?: string;
  channel?: string;
  message?: string;
}

export interface StockUpdatedPayload {
  variantId: string;
  skuCode?: string;
  available: number;
}

export interface LowStockAlertPayload {
  skuCode: string;
  available: number;
  threshold: number;
}

interface WebkitWindow extends Window {
  webkitAudioContext?: typeof AudioContext;
}

// Hàm phát âm báo "Ting-Ting" bằng Web Audio API tích hợp sẵn trên trình duyệt
const playNotificationSound = () => {
  try {
    const customWindow = window as unknown as WebkitWindow;
    const AudioCtx = window.AudioContext || customWindow.webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(1174.66, ctx.currentTime + 0.12);

    gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.45);
  } catch {
    // Bỏ qua nếu trình duyệt chặn autoplay âm thanh khi chưa tương tác
  }
};

export const useOrderSignalR = () => {
  const { accessToken, isAuthenticated, user } = useAuthStore();
  const syncAvailableStock = usePosStore(
    (s) => s.syncAvailableStockFromRealtime
  );
  const queryClient = useQueryClient();

  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState<RealtimeNotification[]>(
    []
  );

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !accessToken) return;

    const hubUrl =
      import.meta.env.VITE_HUB_BASE_URL || 'http://localhost:5000/orderHub';

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, {
        accessTokenFactory: () => accessToken,
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000])
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    // 1. Lắng nghe sự kiện có đơn hàng mới từ Shopee / TikTok / Lazada / POS
    connection.on(
      'ReceiveOrderNotification',
      (payload: OrderNotificationPayload) => {
        playNotificationSound();

        const orderCode = payload?.orderNumber || payload?.orderId || 'Mới';
        const channel = payload?.channel || 'Omnichannel';
        const msg =
          payload?.message ||
          `Đơn hàng #${orderCode} từ kênh ${channel} vừa được tiếp nhận & giữ chỗ tồn kho!`;

        toast.success(msg, {
          duration: 5000,
          position: 'top-right',
        });

        setNotifications((prev) => [
          {
            id: `${Date.now()}-${Math.random()}`, title: `Đơn hàng mới (${channel})`,
            message: msg,
            channel,
            createdAt: new Date().toLocaleTimeString('vi-VN'),
            isRead: false,
          },
          ...prev.slice(0, 19),
        ]);

        queryClient.invalidateQueries({ queryKey: ['orders'] });
        queryClient.invalidateQueries({ queryKey: ['variants'] });
        queryClient.invalidateQueries({ queryKey: ['inventory'] });
        queryClient.invalidateQueries({ queryKey: ['reports'] });
      }
    );

    // 2. Lắng nghe sự kiện thay đổi số lượng tồn kho khả dụng
    connection.on('ReceiveStockUpdated', (payload: StockUpdatedPayload) => {
      if (payload?.variantId && typeof payload.available === 'number') {
        syncAvailableStock(payload.variantId, payload.available);
      }
      queryClient.invalidateQueries({ queryKey: ['variants'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    });

    // 3. Lắng nghe sự kiện cảnh báo sắp hết hàng (FR-REP-03)
    connection.on('ReceiveLowStockAlert', (payload: LowStockAlertPayload) => {
      playNotificationSound();
      const alertMsg = `Cảnh báo tồn kho: SKU [${payload.skuCode}] chỉ còn ${payload.available} sản phẩm khả dụng (Ngưỡng: ${payload.threshold})!`;
      toast.error(alertMsg, { duration: 6000 });

      setNotifications((prev) => [
        {
          id: `${Date.now()}-${Math.random()}`,
          title: 'Cảnh báo sắp hết hàng',
          message: alertMsg,
          channel: 'Inventory',
          createdAt: new Date().toLocaleTimeString('vi-VN'),
          isRead: false,
        },
        ...prev.slice(0, 19),
      ]);
    });

    connection
      .start()
      .then(() => {
        setIsConnected(true);
        if (user?.tenantId) {
          connection.invoke('JoinTenantGroup', user.tenantId).catch(() => {});
        }
      })
      .catch(() => {
        setIsConnected(false);
      });

    connection.onreconnected(() => setIsConnected(true));
    connection.onclose(() => setIsConnected(false));

    return () => {
      connection.stop();
    };
  }, [
    isAuthenticated,
    accessToken,
    user?.tenantId,
    queryClient,
    syncAvailableStock,
  ]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return {
    isConnected,
    notifications,
    unreadCount,
    markAllAsRead,
  };
};