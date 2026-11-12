import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { CheckCircle2, ArrowRight } from 'lucide-react';

import ProtectedRoute from './routes/ProtectedRoute';
import RoleGuard from './routes/RoleGuard';
import AdminLayout from './layouts/AdminLayout';
import PosLayout from './layouts/PosLayout';

import LoginScreen from './components/LoginScreen';
import PosScreen from './components/PosScreen';
import { useAuthStore } from './store/useAuthStore';

const ModuleReadyPlaceholder: React.FC<{
  title: string;
  code: string;
  description: string;
}> = ({ title, code, description }) => {
  const { user, activeBranchId } = useAuthStore();
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold mb-4">
        <CheckCircle2 size={15} />
        <span>SRS Module: {code}</span>
      </div>
      <h1 className="text-2xl font-bold text-slate-900 mb-2">{title}</h1>
      <p className="text-slate-600 text-sm max-w-2xl mb-6">{description}</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs">
        <div>
          <span className="text-slate-400 block">Tenant ID hiện tại:</span>
          <span className="font-mono font-semibold text-slate-800">
            {user?.tenantId || 'Đã xác thực'}
          </span>
        </div>
        <div>
          <span className="text-slate-400 block">Chi nhánh đang chọn:</span>
          <span className="font-mono font-semibold text-blue-600">
            {activeBranchId || 'default-branch'}
          </span>
        </div>
        <div>
          <span className="text-slate-400 block">Vai trò RBAC:</span>
          <span className="font-semibold text-emerald-700">{user?.role}</span>
        </div>
      </div>
      <div className="mt-6 flex items-center gap-3">
        <Link
          to="/pos"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors"
        >
          <span>Chuyển sang Màn hình Bán hàng POS</span>
          <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          className: 'text-sm font-medium rounded-xl shadow-lg',
          duration: 3500,
        }}
      />

      <Routes>
        <Route path="/login" element={<LoginScreen />} />

        <Route element={<ProtectedRoute />}>
          <Route
            element={<RoleGuard allowedRoles={['Owner', 'Staff', 'Cashier']} />}
          >
            <Route element={<PosLayout />}>
              <Route path="/pos" element={<PosScreen />} />
            </Route>
          </Route>

          <Route element={<RoleGuard allowedRoles={['Owner', 'Staff']} />}>
            <Route path="/admin" element={<AdminLayout />}>
              <Route
                index
                element={
                  <ModuleReadyPlaceholder
                    title="Tổng quan Hệ thống & Báo cáo Nhanh"
                    code="FR-REP-01 / FR-REP-03"
                    description="Màn hình tổng hợp Doanh thu thuần, Giá vốn bình quân (COGS), Lợi nhuận gộp và Cảnh báo tồn kho theo thời gian thực."
                  />
                }
              />
              <Route
                path="orders"
                element={
                  <ModuleReadyPlaceholder
                    title="Trung tâm Xử lý Đơn hàng Đa kênh (Centralized Order Hub)"
                    code="FR-ORD-01 -> FR-ORD-03"
                    description="Chuẩn hóa đơn hàng từ POS, Shopee, TikTok Shop, Lazada theo State Machine: Draft -> Reserved -> Confirmed -> Completed / Cancelled."
                  />
                }
              />
              <Route
                path="products"
                element={
                  <ModuleReadyPlaceholder
                    title="Quản lý Sản phẩm, Biến thể SKU, Mã vạch & Bảng giá"
                    code="FR-PROD-02 -> FR-PROD-04"
                    description="Quản lý sản phẩm nhiều biến thể (Màu sắc, Kích cỡ), tự động sinh mã vạch EAN-13/Code128 và thiết lập giá bán lẻ/bán sỉ tách biệt giá vốn."
                  />
                }
              />
              <Route
                path="categories"
                element={
                  <ModuleReadyPlaceholder
                    title="Quản lý Cây Danh mục & Thương hiệu"
                    code="FR-PROD-01"
                    description="Quản lý danh mục sản phẩm phân cấp đa tầng và danh mục thương hiệu theo từng Store Tenant."
                  />
                }
              />
              <Route
                path="inventory"
                element={
                  <ModuleReadyPlaceholder
                    title="Tồn kho Đa chi nhánh & Giá vốn Bình quân Gia quyền (WAC)"
                    code="FR-RSE-01 & FR-COST-01"
                    description="Theo dõi thời gian thực: Tồn thực tế (On Hand), Đang giữ chỗ (Reserved), Khả dụng (Available = On Hand - Reserved) và Giá vốn bình quân."
                  />
                }
              />
              <Route
                path="ledger"
                element={
                  <ModuleReadyPlaceholder
                    title="Sổ cái Tồn kho Bất biến (Append-Only Inventory Ledger)"
                    code="FR-INV-01 & NFR-SEC-03"
                    description="Lịch sử biến động kho IN/OUT chỉ đọc (Read-only), cấm tuyệt đối UPDATE/DELETE trực tiếp nhằm đảm bảo kiểm toán 100%."
                  />
                }
              />
              <Route
                path="purchase-receipts"
                element={
                  <ModuleReadyPlaceholder
                    title="Nhập hàng Nhà cung cấp & Tự động Tính lại Giá vốn (COGS)"
                    code="FR-INV-02 & FR-COST-01"
                    description="Tạo phiếu nhập kho, tăng tồn thực tế (on_hand) và tự động cập nhật đơn giá vốn bình quân gia quyền cho từng SKU."
                  />
                }
              />
              <Route
                path="transfers"
                element={
                  <ModuleReadyPlaceholder
                    title="Chuyển kho Liên chi nhánh 2 Bước (Outbound -> Inbound)"
                    code="FR-INV-03"
                    description="Quy trình điều chuyển hàng hóa giữa Chi nhánh A và Chi nhánh B qua 2 bước: Xuất kho đi (In-Transit) và Xác nhận nhập kho đến."
                  />
                }
              />
              <Route
                path="stocktake"
                element={
                  <ModuleReadyPlaceholder
                    title="Kiểm kê Thực tế & Tự động Sinh Bút toán Cân bằng Kho"
                    code="FR-INV-04"
                    description="Đối chiếu số lượng kiểm đếm thực tế với số dư phần mềm và tự động ghi bút toán điều chỉnh (Adjustment Ledger Entry)."
                  />
                }
              />
              <Route
                path="webhook-simulator"
                element={
                  <ModuleReadyPlaceholder
                    title="Công cụ Giả lập E-commerce Webhook & Stress Test Flash Sale"
                    code="FR-SIM-01 & NFR-PERF-02"
                    description="Bắn đơn giả lập Shopee/TikTok/Lazada và kiểm thử đồng thời 50 luồng đặt mua 1 SKU duy nhất để chứng minh cơ chế khóa chống bán khống (Anti-Oversell)."
                  />
                }
              />

              <Route element={<RoleGuard allowedRoles={['Owner']} />}>
                <Route
                  path="reports"
                  element={
                    <ModuleReadyPlaceholder
                      title="Báo cáo Lợi nhuận Gộp, Vòng quay Kho & Dự báo Nhập hàng AI"
                      code="FR-REP-01 -> FR-REP-03"
                      description="Phân tích chuyên sâu Doanh thu - COGS - Lợi nhuận gộp và thuật toán AI gợi ý số lượng đặt hàng lại."
                    />
                  }
                />
                <Route
                  path="branches"
                  element={
                    <ModuleReadyPlaceholder
                      title="Quản lý Chi nhánh & Phân quyền Nhân sự (RBAC)"
                      code="FR-AUTH-03 & FR-AUTH-04"
                      description="Tạo mới chi nhánh/kho hàng, bật/tắt trạng thái hoạt động và cấp phát tài khoản Owner, Staff, Cashier."
                    />
                  }
                />
              </Route>
            </Route>
          </Route>
        </Route>

        <Route path="/" element={<Navigate to="/admin" replace />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;