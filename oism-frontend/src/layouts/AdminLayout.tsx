import React, { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Layers,
  History,
  ArrowLeftRight,
  ClipboardCheck,
  Truck,
  Webhook,
  BarChart3,
  Building2,
  Bell,
  Store,
  LogOut,
  Menu,
  MonitorSmartphone,
  Wifi,
  WifiOff,
  ChevronRight,
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { useOrderSignalR } from '../hooks/useOrderSignalR';
import type { UserRole } from '../types/auth';

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  roles: UserRole[];
  badge?: string;
}

const AdminLayout: React.FC = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

  const { user, branches, activeBranchId, setActiveBranch, logout } =
    useAuthStore();
  const { isConnected, notifications, unreadCount, markAllAsRead } =
    useOrderSignalR();

  const navItems: NavItem[] = [
    {
      label: 'Tổng quan & Lợi nhuận',
      path: '/admin',
      icon: <LayoutDashboard size={19} />,
      roles: ['Owner', 'Staff'],
    },
    {
      label: 'Trung tâm Đơn hàng',
      path: '/admin/orders',
      icon: <ShoppingCart size={19} />,
      roles: ['Owner', 'Staff'],
      badge: 'Omni',
    },
    {
      label: 'Sản phẩm & Mã vạch SKU',
      path: '/admin/products',
      icon: <Package size={19} />,
      roles: ['Owner', 'Staff'],
    },
    {
      label: 'Danh mục & Thương hiệu',
      path: '/admin/categories',
      icon: <Layers size={19} />,
      roles: ['Owner', 'Staff'],
    },
    {
      label: 'Tồn kho & Giá vốn (WAC)',
      path: '/admin/inventory',
      icon: <Store size={19} />,
      roles: ['Owner', 'Staff'],
    },
    {
      label: 'Sổ cái Tồn kho (Ledger)',
      path: '/admin/ledger',
      icon: <History size={19} />,
      roles: ['Owner', 'Staff'],
    },
    {
      label: 'Nhập hàng Nhà cung cấp',
      path: '/admin/purchase-receipts',
      icon: <Truck size={19} />,
      roles: ['Owner', 'Staff'],
    },
    {
      label: 'Chuyển kho Liên chi nhánh',
      path: '/admin/transfers',
      icon: <ArrowLeftRight size={19} />,
      roles: ['Owner', 'Staff'],
    },
    {
      label: 'Kiểm kê & Cân bằng kho',
      path: '/admin/stocktake',
      icon: <ClipboardCheck size={19} />,
      roles: ['Owner', 'Staff'],
    },
    {
      label: 'Giả lập Webhook & FlashSale',
      path: '/admin/webhook-simulator',
      icon: <Webhook size={19} />,
      roles: ['Owner', 'Staff'],
      badge: 'Test',
    },
    {
      label: 'Báo cáo & Dự báo AI',
      path: '/admin/reports',
      icon: <BarChart3 size={19} />,
      roles: ['Owner'],
    },
    {
      label: 'Chi nhánh & Phân quyền',
      path: '/admin/branches',
      icon: <Building2 size={19} />,
      roles: ['Owner'],
    },
  ];

  const visibleNavItems = navItems.filter(
    (item) => user && item.roles.includes(user.role)
  );

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden">
      <aside
        className={`${
          sidebarCollapsed ? 'w-20' : 'w-68'
        } bg-slate-900 text-slate-200 flex flex-col transition-all duration-200 border-r border-slate-800 shrink-0`}
      >
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center font-black text-white shrink-0 shadow-md shadow-blue-600/30">
              O
            </div>
            {!sidebarCollapsed && (
              <div className="leading-tight">
                <div className="font-bold text-white tracking-tight text-base">
                  OISM Enterprise
                </div>
                <div className="text-[11px] text-slate-400 truncate max-w-40">
                  Tenant:{' '}
                  {user?.tenantName ||
                    user?.tenantId?.slice(0, 8) ||
                    'Multi-Tenant'}
                </div>
              </div>
            )}
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-3 px-2.5 space-y-1">
          {visibleNavItems.map((item) => {
            const isActive =
              item.path === '/admin'
                ? location.pathname === '/admin'
                : location.pathname.startsWith(item.path);

            return (
              <Link
                key={item.path}
                to={item.path}
                title={sidebarCollapsed ? item.label : undefined}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                    : 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-100'
                }`}
              >
                <div className="flex items-center gap-3 truncate">
                  <span className="shrink-0">{item.icon}</span>
                  {!sidebarCollapsed && (
                    <span className="truncate">{item.label}</span>
                  )}
                </div>
                {!sidebarCollapsed && item.badge && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-md font-semibold ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-800 text-blue-400'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-slate-800 bg-slate-950/40">
          {!sidebarCollapsed && (
            <div className="mb-2.5 px-2 flex items-center justify-between">
              <div className="truncate">
                <div className="text-xs font-semibold text-white truncate">
                  {user?.fullName}
                </div>
                <div className="text-[11px] text-slate-400">{user?.email}</div>
              </div>
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md bg-blue-500/20 text-blue-400 border border-blue-500/30">
                {user?.role}
              </span>
            </div>
          )}
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
          >
            <LogOut size={16} />
            {!sidebarCollapsed && <span>Đăng xuất hệ thống</span>}
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between shrink-0 z-20">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors"
              title="Thu gọn / Mở rộng menu"
            >
              <Menu size={20} />
            </button>

            <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
              <Store size={16} className="text-blue-600 shrink-0" />
              <span className="text-xs text-slate-500 font-medium hidden sm:inline">
                Chi nhánh:
              </span>
              <select
                value={activeBranchId || ''}
                onChange={(e) => setActiveBranch(e.target.value)}
                className="bg-transparent text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none cursor-pointer"
              >
                {branches.length === 0 ? (
                  <option value="default-branch">
                    Kho Trung Tâm (Mặc định)
                  </option>
                ) : (
                  branches
                    .filter((b) => b.isActive)
                    .map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name} ({branch.code})
                      </option>
                    ))
                )}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div
              className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                isConnected
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}
              title="Trạng thái kết nối Real-time SignalR Hub"
            >
              {isConnected ? <Wifi size={14} /> : <WifiOff size={14} />}
              <span>{isConnected ? 'SignalR Live' : 'Realtime Offline'}</span>
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowNotifDropdown(!showNotifDropdown);
                  if (!showNotifDropdown) markAllAsRead();
                }}
                className="relative p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>

              {showNotifDropdown && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50">
                  <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-800">
                      Thông báo Real-time (SignalR)
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowNotifDropdown(false)}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Đóng
                    </button>
                  </div>
                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                    {notifications.length === 0 ? (
                      <div className="py-8 text-center text-xs text-slate-400">
                        Chưa có thông báo đơn hàng hoặc cảnh báo tồn kho mới.
                      </div>
                    ) : (
                      notifications.map((item) => (
                        <div
                          key={item.id}
                          className="px-4 py-3 hover:bg-slate-50"
                        >
                          <div className="flex items-center justify-between text-xs font-semibold text-slate-900 mb-0.5">
                            <span>{item.title}</span>
                            <span className="text-[11px] text-slate-400">
                              {item.createdAt}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 leading-relaxed">
                            {item.message}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <Link
              to="/pos"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs sm:text-sm font-semibold hover:bg-slate-800 transition-all shadow-sm"
            >
              <MonitorSmartphone size={17} />
              <span>Mở Máy Bán Hàng POS</span>
              <ChevronRight size={15} className="opacity-70" />
            </Link>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;