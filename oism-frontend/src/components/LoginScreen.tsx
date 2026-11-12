import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  Store,
  Lock,
  Mail,
  User,
  Phone,
  MapPin,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import axiosClient from '../api/axiosClient';
import { useAuthStore } from '../store/useAuthStore';
import type { Branch, UserProfile, UserRole } from '../types/auth';

interface AuthApiResponse {
  accessToken?: string;
  token?: string;
  refreshToken?: string;
  user?: UserProfile;
  branches?: Branch[];
  message?: string;
}

const extractErrorMessage = (error: unknown, fallback: string): string => {
  if (axios.isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message || fallback;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return fallback;
};

const LoginScreen: React.FC = () => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [loading, setLoading] = useState(false);

  // Login State
  const [emailOrPhone, setEmailOrPhone] = useState('admin@oism.vn');
  const [password, setPassword] = useState('Password@123');

  // Register Tenant State (FR-AUTH-01)
  const [storeName, setStoreName] = useState('');
  const [ownerFullName, setOwnerFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [branchName, setBranchName] = useState('Chi nhánh Trung Tâm');
  const [branchAddress, setBranchAddress] = useState('');

  const { setAuthSession } = useAuthStore();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await axiosClient.post<AuthApiResponse>('/auth/login', {
        emailOrPhone,
        password,
      });

      const data = response.data;
      const token = data.accessToken || data.token;

      if (!token) {
        toast.error('Phản hồi từ máy chủ không chứa JWT Token hợp lệ.');
        return;
      }

      setAuthSession({
        accessToken: token,
        refreshToken: data.refreshToken,
        user: data.user,
        branches: data.branches,
      });

      toast.success('Đăng nhập thành công!');
      const loggedRole = useAuthStore.getState().user?.role;
      navigate(loggedRole === 'Cashier' ? '/pos' : '/admin', { replace: true });
    } catch (error: unknown) {
      toast.error(
        extractErrorMessage(
          error,
          'Không thể kết nối API hoặc sai thông tin đăng nhập. Bạn có thể bấm nút Demo RBAC bên trái để kiểm tra giao diện!'
        )
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await axiosClient.post<AuthApiResponse>(
        '/auth/register-tenant',
        {
          storeName,
          ownerFullName,
          email,
          phone,
          password: regPassword,
          defaultBranchName: branchName,
          defaultBranchAddress: branchAddress,
        }
      );

      toast.success('Khởi tạo Store Tenant thành công!');
      const token = response.data?.accessToken || response.data?.token;
      if (token) {
        setAuthSession({
          accessToken: token,
          refreshToken: response.data.refreshToken,
          user: response.data.user,
          branches: response.data.branches,
        });
        navigate('/admin', { replace: true });
      } else {
        setMode('login');
        setEmailOrPhone(email);
      }
    } catch (error: unknown) {
      toast.error(
        extractErrorMessage(error, 'Lỗi khi đăng ký Store Tenant mới.')
      );
    } finally {
      setLoading(false);
    }
  };

  // Chế độ kiểm thử nhanh phân quyền RBAC (Owner / Staff / Cashier)
  const handleQuickDemoLogin = (role: UserRole) => {
    const fakeHeader = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const fakePayload = btoa(
      JSON.stringify({
        userId: `user-${role.toLowerCase()}`,
        tenantId: 'tenant-demo-001',
        email: `${role.toLowerCase()}@oism.vn`,
        role,
        exp: Math.floor(Date.now() / 1000) + 3600,
      })
    );
    const mockJwt = `${fakeHeader}.${fakePayload}.signature`;

    setAuthSession({
      accessToken: mockJwt,
      user: {
        id: `user-${role.toLowerCase()}`,
        tenantId: 'tenant-demo-001',
        tenantName: 'OISM Flagship Retail',
        email: `${role.toLowerCase()}@oism.vn`,
        fullName:
          role === 'Owner'
            ? 'Nguyễn Cường (Owner)'
            : role === 'Staff'
            ? 'Trần Quản Kho (Staff)'
            : 'Lê Thu Ngân (Cashier)',
        role,
        isActive: true,
      },
      branches: [
        {
          id: 'branch-hcm-01',
          tenantId: 'tenant-demo-001',
          name: 'Chi nhánh Quận 1 - HCM',
          code: 'CN-Q1',
          address: '123 Nguyễn Huệ, Quận 1, TP.HCM',
          phone: '0901234567',
          isActive: true,
          isDefault: true,
        },
        {
          id: 'branch-hn-02',
          tenantId: 'tenant-demo-001',
          name: 'Kho Tổng Cầu Giấy - HN',
          code: 'KHO-HN',
          address: '45 Cầu Giấy, Hà Nội',
          phone: '0909888777',
          isActive: true,
        },
      ],
    });

    toast.success(`Đã kích hoạt phiên làm việc với quyền [${role}]`);
    navigate(role === 'Cashier' ? '/pos' : '/admin', { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-800">
        {/* Left Banner */}
        <div className="lg:col-span-5 bg-linear-to-br from-blue-600 via-blue-700 to-slate-900 text-white p-8 flex flex-col justify-between">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-xs font-semibold backdrop-blur-sm mb-6">
              <Store size={14} />
              <span>Multi-Tenant SaaS Architecture</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight mb-3">
              Hệ thống Quản lý Bán hàng & Tồn kho Đa kênh
            </h1>
            <p className="text-blue-100 text-xs sm:text-sm leading-relaxed">
              Đồng bộ tồn kho thời gian thực Shopee, TikTok Shop, Lazada & PWA
              POS. Sổ cái Append-Only chống bán khống (Anti-Oversell) và tự động
              tính giá vốn bình quân gia quyền (WAC).
            </p>
          </div>

          {/* Quick Role Testing Box */}
          <div className="mt-8 pt-6 border-t border-white/15">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-blue-200 mb-2.5">
              <ShieldCheck size={15} />
              <span>Chế độ Kiểm thử Nhanh Phân quyền (RBAC)</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('Owner')}
                className="px-2.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold transition-colors text-center"
              >
                Owner
                <span className="block text-[10px] text-blue-200 font-normal">
                  Full quyền
                </span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('Staff')}
                className="px-2.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold transition-colors text-center"
              >
                Staff
                <span className="block text-[10px] text-blue-200 font-normal">
                  Kho & Đơn
                </span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('Cashier')}
                className="px-2.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold transition-colors text-center"
              >
                Cashier
                <span className="block text-[10px] text-blue-200 font-normal">
                  Chỉ vào POS
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Form */}
        <div className="lg:col-span-7 p-6 sm:p-10">
          {/* Mode Tabs */}
          <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
            <button
              type="button"
              onClick={() => setMode('login')}
              className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-lg transition-all ${
                mode === 'login'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Đăng nhập Hệ thống (FR-AUTH-02)
            </button>
            <button
              type="button"
              onClick={() => setMode('register')}
              className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-lg transition-all ${
                mode === 'register'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Đăng ký Store Tenant (FR-AUTH-01)
            </button>
          </div>

          {mode === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1.5">
                  Email hoặc Số điện thoại
                </label>
                <div className="relative">
                  <Mail
                    size={18}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="text"
                    required
                    value={emailOrPhone}
                    onChange={(e) => setEmailOrPhone(e.target.value)}
                    placeholder="admin@oism.vn hoặc 0901234567"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1.5">
                  Mật khẩu
                </label>
                <div className="relative">
                  <Lock
                    size={18}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors shadow-lg shadow-blue-600/25"
              >
                <span>{loading ? 'Đang xác thực...' : 'Đăng nhập vào OISM'}</span>
                <ArrowRight size={17} />
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegisterTenant} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    Tên Cửa hàng / Doanh nghiệp (Tenant)
                  </label>
                  <div className="relative">
                    <Store
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      type="text"
                      required
                      value={storeName}
                      onChange={(e) => setStoreName(e.target.value)}
                      placeholder="VD: Thời trang Coolmate"
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    Họ tên Chủ cửa hàng (Owner)
                  </label>
                  <div className="relative">
                    <User
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      type="text"
                      required
                      value={ownerFullName}
                      onChange={(e) => setOwnerFullName(e.target.value)}
                      placeholder="Nguyễn Văn A"
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    Email Quản trị
                  </label>
                  <div className="relative">
                    <Mail
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="owner@company.vn"
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    Số điện thoại
                  </label>
                  <div className="relative">
                    <Phone
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="0901234567"
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    Tên Chi nhánh Mặc định
                  </label>
                  <input
                    type="text"
                    required
                    value={branchName}
                    onChange={(e) => setBranchName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    Địa chỉ Chi nhánh
                  </label>
                  <div className="relative">
                    <MapPin
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      type="text"
                      required
                      value={branchAddress}
                      onChange={(e) => setBranchAddress(e.target.value)}
                      placeholder="Quận 1, TP.HCM"
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Mật khẩu khởi tạo
                </label>
                <input
                  type="password"
                  required
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="Tối thiểu 8 ký tự"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm transition-colors"
              >
                {loading
                  ? 'Đang khởi tạo không gian Tenant...'
                  : 'Tạo Store Tenant & Khởi chạy'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export { LoginScreen };
export default LoginScreen;