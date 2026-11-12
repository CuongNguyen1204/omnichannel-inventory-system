import React from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import {
  Store,
  Wifi,
  WifiOff,
  LayoutDashboard,
  LogOut,
  Barcode,
  UserCheck,
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { useOrderSignalR } from '../hooks/useOrderSignalR';

const PosLayout: React.FC = () => {
  const { user, branches, activeBranchId, setActiveBranch, logout } =
    useAuthStore();
  const { isConnected } = useOrderSignalR();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-100 overflow-hidden select-none">
      <header className="h-13 bg-slate-900 text-white px-4 flex items-center justify-between shrink-0 border-b border-slate-800">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center font-black text-sm">
              O
            </div>
            <span className="font-bold tracking-tight text-sm sm:text-base">
              OISM PWA POS
            </span>
          </div>

          <div className="h-4 w-px bg-slate-700 hidden sm:block" />

          <div className="flex items-center gap-1.5 bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700 text-xs">
            <Store size={14} className="text-blue-400" />
            <select
              value={activeBranchId || ''}
              onChange={(e) => setActiveBranch(e.target.value)}
              className="bg-transparent text-white font-medium focus:outline-none cursor-pointer"
            >
              {branches.length === 0 ? (
                <option value="default-branch" className="text-slate-900">
                  Chi nhánh Trung Tâm
                </option>
              ) : (
                branches
                  .filter((b) => b.isActive)
                  .map((b) => (
                    <option key={b.id} value={b.id} className="text-slate-900">
                      {b.name}
                    </option>
                  ))
              )}
            </select>
          </div>

          <div className="hidden xl:flex items-center gap-3 text-[11px] text-slate-400">
            <span className="flex items-center gap-1 bg-slate-800/90 px-2 py-0.5 rounded border border-slate-700">
              <Barcode size={13} className="text-emerald-400" />
              F1: Tìm / Quét mã vạch
            </span>
            <span className="bg-slate-800/90 px-2 py-0.5 rounded border border-slate-700">
              F2: Hóa đơn mới
            </span>
            <span className="bg-slate-800/90 px-2 py-0.5 rounded border border-slate-700">
              F9: Thanh toán nhanh
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div
            className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${
              isConnected
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
            }`}
          >
            {isConnected ? <Wifi size={12} /> : <WifiOff size={12} />}
            <span className="hidden sm:inline">
              {isConnected ? 'Đồng bộ Tồn kho Live' : 'Offline Mode'}
            </span>
          </div>

          <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-300">
            <UserCheck size={14} className="text-blue-400" />
            <span>{user?.fullName}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-blue-400 font-semibold">
              {user?.role}
            </span>
          </div>

          {user && (user.role === 'Owner' || user.role === 'Staff') && (
            <Link
              to="/admin"
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-semibold transition-colors"
            >
              <LayoutDashboard size={14} />
              <span>Quản trị Kho</span>
            </Link>
          )}

          <button
            type="button"
            onClick={handleLogout}
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors"
            title="Đăng xuất ca thu ngân"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
};

export default PosLayout;