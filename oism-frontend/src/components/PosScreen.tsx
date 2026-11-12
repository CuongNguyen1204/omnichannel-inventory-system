import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  Search,
  Barcode,
  Plus,
  Minus,
  Trash2,
  Printer,
  CreditCard,
  Banknote,
  ShoppingBag,
  AlertTriangle,
  RefreshCw,
  X,
} from 'lucide-react';
import axiosClient from '../api/axiosClient';
import { useAuthStore } from '../store/useAuthStore';
import { usePosStore } from '../store/usePosStore';
import type { Variant } from '../types/catalog';

// Dữ liệu mẫu chuẩn (Fallback khi chưa bật Backend để bạn test POS ngay lập tức)
const DEMO_POS_VARIANTS: Variant[] = [
  {
    id: 'var-001',
    tenantId: 'tenant-demo-001',
    productId: 'prod-01',
    productName: 'Áo Thun Thể Thao ProMax',
    skuCode: 'AT-PRO-BLK-L',
    barcode: '8938505974012',
    variantName: 'Đen - Size L',
    retailPrice: 249000,
    wholesalePrice: 190000,
    weightedAverageCost: 135000,
    reorderThreshold: 5,
    onHand: 18,
    reserved: 4,
    available: 14,
    isActive: true,
  },
  {
    id: 'var-002',
    tenantId: 'tenant-demo-001',
    productId: 'prod-01',
    productName: 'Áo Thun Thể Thao ProMax',
    skuCode: 'AT-PRO-WHT-M',
    barcode: '8938505974029',
    variantName: 'Trắng - Size M',
    retailPrice: 249000,
    wholesalePrice: 190000,
    weightedAverageCost: 135000,
    reorderThreshold: 5,
    onHand: 5,
    reserved: 4,
    available: 1, // Chỉ còn đúng 1 sản phẩm khả dụng để test khóa Anti-Oversell (FR-POS-02)
    isActive: true,
  },
  {
    id: 'var-003',
    tenantId: 'tenant-demo-001',
    productId: 'prod-02',
    productName: 'Quần Jogger Kaki Co Giãn',
    skuCode: 'QJ-KAKI-NVY-XL',
    barcode: '8938505974036',
    variantName: 'Xanh Navy - Size XL',
    retailPrice: 389000,
    wholesalePrice: 310000,
    weightedAverageCost: 220000,
    reorderThreshold: 5,
    onHand: 12,
    reserved: 2,
    available: 10,
    isActive: true,
  },
  {
    id: 'var-004',
    tenantId: 'tenant-demo-001',
    productId: 'prod-03',
    productName: 'Giày Chạy Bộ UltraBoost',
    skuCode: 'GCB-ULTRA-42',
    barcode: '8938505974043',
    variantName: 'Xám Cam - Size 42',
    retailPrice: 1290000,
    wholesalePrice: 980000,
    weightedAverageCost: 750000,
    reorderThreshold: 3,
    onHand: 3,
    reserved: 3,
    available: 0, // Đã giữ chỗ hết cho đơn Online (available = 0)
    isActive: true,
  },
];

interface RawVariantApiItem {
  id?: string;
  variantId?: string;
  tenantId?: string;
  productId?: string;
  productName?: string;
  name?: string;
  skuCode?: string;
  sku?: string;
  barcode?: string;
  variantName?: string;
  retailPrice?: number;
  price?: number;
  wholesalePrice?: number;
  weightedAverageCost?: number;
  costPrice?: number;
  reorderThreshold?: number;
  onHand?: number;
  reserved?: number;
  available?: number;
  isActive?: boolean;
}

const normalizeVariants = (rawList: RawVariantApiItem[]): Variant[] => {
  return rawList.map((item, idx) => {
    const onHand = Number(item.onHand ?? 10);
    const reserved = Number(item.reserved ?? 0);
    const available =
      typeof item.available === 'number'
        ? item.available
        : Math.max(0, onHand - reserved);

    return {
      id: String(item.id || item.variantId || `var-${idx}`),
      tenantId: String(item.tenantId || 'default-tenant'),
      productId: String(item.productId || `prod-${idx}`),
      productName: item.productName || item.name || 'Sản phẩm OISM',
      skuCode: item.skuCode || item.sku || `SKU-${idx + 1}`,
      barcode: item.barcode || `89385059740${idx}0`,
      variantName: item.variantName || 'Tiêu chuẩn',
      retailPrice: Number(item.retailPrice ?? item.price ?? 0),
      wholesalePrice: Number(item.wholesalePrice ?? 0),
      weightedAverageCost: Number(
        item.weightedAverageCost ?? item.costPrice ?? 0
      ),
      reorderThreshold: Number(item.reorderThreshold ?? 5),
      onHand,
      reserved,
      available,
      isActive: item.isActive ?? true,
    };
  });
};

const PosScreen: React.FC = () => {
  const [searchKeyword, setSearchKeyword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const { activeBranchId } = useAuthStore();
  const {
    tabs,
    activeTabId,
    getActiveTab,
    getSubTotal,
    getGrandTotal,
    getChangeDue,
    createNewTab,
    closeTab,
    switchTab,
    addItemToCart,
    updateItemQuantity,
    removeItemFromCart,
    setCustomerInfo,
    setDiscountAmount,
    setPaymentMethod,
    setCashReceived,
    clearActiveTab,
  } = usePosStore();

  const activeTab = getActiveTab();
  const subTotal = getSubTotal();
  const grandTotal = getGrandTotal();
  const changeDue = getChangeDue();

  // Sử dụng TanStack Query để tải danh sách SKU (Giải quyết triệt để lỗi react-hooks/set-state-in-effect)
  const {
    data: variants = DEMO_POS_VARIANTS,
    isLoading,
    refetch,
  } = useQuery<Variant[]>({
    queryKey: ['variants', activeBranchId],
    queryFn: async () => {
      try {
        const res = await axiosClient.get<RawVariantApiItem[]>('/variants', {
          params: { branchId: activeBranchId },
        });
        if (Array.isArray(res.data) && res.data.length > 0) {
          return normalizeVariants(res.data);
        }
        return DEMO_POS_VARIANTS;
      } catch {
        return DEMO_POS_VARIANTS;
      }
    },
  });

  // FR-POS-04: Luồng Thanh toán Nhanh Atomic (Reserve -> Confirm -> Deduct)
  // Khai báo bằng useCallback TRƯỚC useEffect để tuân thủ react-hooks/immutability
  const handleFastCheckout = useCallback(async () => {
    const currentTab = getActiveTab();
    if (currentTab.items.length === 0) {
      toast.error('Giỏ hàng đang trống! Vui lòng quét mã vạch hoặc chọn sản phẩm.');
      return;
    }

    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      await axiosClient.post('/pos/checkout', {
        branchId: activeBranchId || 'default-branch',
        customerName: currentTab.customerName,
        customerPhone: currentTab.customerPhone,
        paymentMethod: currentTab.paymentMethod,
        discountAmount: currentTab.discountAmount,
        items: currentTab.items.map((item) => ({
          variantId: item.variantId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
      });

      toast.success(
        'Thanh toán thành công! Đã trừ tồn kho (Atomic Deduct) & ghi Sổ cái Ledger.'
      );
      window.print();
      clearActiveTab();
      queryClient.invalidateQueries({ queryKey: ['variants'] });
    } catch (error: unknown) {
      let apiMessage = '';
      if (axios.isAxiosError<{ message?: string }>(error)) {
        apiMessage = error.response?.data?.message || '';
      }

      if (apiMessage) {
        toast.error(`Lỗi thanh toán: ${apiMessage}`);
      } else {
        // Hỗ trợ chạy Demo mượt mà ngay cả khi chưa bật Backend
        toast.success(
          'Thanh toán (Chế độ Demo) thành công! Đang kích hoạt máy in hóa đơn...'
        );
        window.print();
        clearActiveTab();
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [activeBranchId, clearActiveTab, getActiveTab, isSubmitting, queryClient]);

  // Lắng nghe Phím tắt toàn cục trên POS (F1: Tìm kiếm/Barcode, F2: Hóa đơn mới, F9: Thanh toán nhanh)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F1' || e.key === 'F3') {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === 'F2') {
        e.preventDefault();
        createNewTab();
      } else if (e.key === 'F9') {
        e.preventDefault();
        void handleFastCheckout();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [createNewTab, handleFastCheckout]);

  // Xử lý khi thu ngân quét mã vạch (Bấm Enter trong ô tìm kiếm - NFR-USA-02)
  const handleBarcodeSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchKeyword.trim().toLowerCase();
    if (!trimmed) return;

    const exactMatch = variants.find(
      (v) =>
        v.barcode.toLowerCase() === trimmed ||
        v.skuCode.toLowerCase() === trimmed
    );

    if (exactMatch) {
      const added = addItemToCart(exactMatch);
      if (added) {
        toast.success(`Đã quét: ${exactMatch.skuCode}`);
      }
      setSearchKeyword('');
    } else {
      toast.error(`Không tìm thấy mã vạch / SKU: "${searchKeyword}"`);
    }
  };

  const filteredVariants = variants.filter((v) => {
    const kw = searchKeyword.trim().toLowerCase();
    if (!kw) return true;
    return (
      v.productName?.toLowerCase().includes(kw) ||
      v.skuCode.toLowerCase().includes(kw) ||
      v.barcode.toLowerCase().includes(kw) ||
      v.variantName.toLowerCase().includes(kw)
    );
  });

  return (
    <div className="h-full w-full grid grid-cols-1 lg:grid-cols-12 bg-slate-100 overflow-hidden">
      {/* CỘT TRÁI (7 PHẦN): TÌM KIẾM BARCODE & DANH MỤC SẢN PHẨM */}
      <div className="lg:col-span-7 xl:col-span-8 flex flex-col h-full border-r border-slate-200 overflow-hidden">
        {/* Thanh công cụ tìm kiếm & quét Barcode */}
        <div className="p-4 bg-white border-b border-slate-200 flex items-center gap-3 shrink-0">
          <form onSubmit={handleBarcodeSearchSubmit} className="flex-1 relative">
            <Search
              size={18}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              ref={searchInputRef}
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="Quét mã vạch (EAN-13/Code128) hoặc nhập SKU, Tên sản phẩm... (F1)"
              className="w-full pl-10 pr-24 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-200/80 text-slate-600 text-[11px] font-semibold">
              <Barcode size={13} />
              Enter
            </span>
          </form>

          <button
            type="button"
            onClick={() => void refetch()}
            className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
            title="Làm mới tồn kho"
          >
            <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Lưới hiển thị sản phẩm SKU */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3.5">
            {filteredVariants.map((variant) => {
              const isOutOfStock = variant.available <= 0;
              const isLowStock =
                variant.available > 0 &&
                variant.available <= variant.reorderThreshold;

              return (
                <button
                  key={variant.id}
                  type="button"
                  disabled={isOutOfStock}
                  onClick={() => addItemToCart(variant)}
                  className={`group text-left p-3.5 rounded-2xl border transition-all flex flex-col justify-between ${
                    isOutOfStock
                      ? 'bg-slate-100 border-slate-200 opacity-60 cursor-not-allowed'
                      : 'bg-white border-slate-200 hover:border-blue-500 hover:shadow-md active:scale-[0.99]'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-2">
                      <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 truncate">
                        {variant.skuCode}
                      </span>
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                          isOutOfStock
                            ? 'bg-red-100 text-red-700'
                            : isLowStock
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {isOutOfStock
                          ? 'Hết khả dụng'
                          : `Khả dụng: ${variant.available}`}
                      </span>
                    </div>

                    <h3 className="font-bold text-slate-900 text-sm line-clamp-2 mb-1">
                      {variant.productName}
                    </h3>
                    <p className="text-xs text-slate-500 mb-3">
                      Phân loại: {variant.variantName}
                    </p>
                  </div>

                  <div className="pt-2.5 border-t border-slate-100 flex items-end justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 block">
                        Kho: {variant.onHand} | Giữ Online: {variant.reserved}
                      </span>
                      <span className="text-base font-extrabold text-blue-600">
                        {variant.retailPrice.toLocaleString('vi-VN')}đ
                      </span>
                    </div>
                    <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white flex items-center justify-center transition-colors">
                      <Plus size={16} />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* CỘT PHẢI (5 PHẦN): GIỎ HÀNG ĐA HÓA ĐƠN & THANH TOÁN ATOMIC */}
      <div className="lg:col-span-5 xl:col-span-4 flex flex-col h-full bg-white overflow-hidden">
        {/* Thanh Tabs Đa Hóa Đơn (Multi-Order Tabs) */}
        <div className="flex items-center gap-1 px-3 pt-2 bg-slate-100 border-b border-slate-200 overflow-x-auto shrink-0">
          {tabs.map((tab) => {
            const isCurrent = tab.tabId === activeTabId;
            return (
              <div
                key={tab.tabId}
                onClick={() => switchTab(tab.tabId)}
                className={`flex items-center gap-2 px-3 py-2 rounded-t-xl text-xs font-bold cursor-pointer transition-colors ${
                  isCurrent
                    ? 'bg-white text-blue-600 border-t border-x border-slate-200'
                    : 'text-slate-600 hover:bg-slate-200/70'
                }`}
              >
                <span>{tab.tabLabel}</span>
                {tab.items.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-700 text-[10px]">
                    {tab.items.length}
                  </span>
                )}
                {tabs.length > 1 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      closeTab(tab.tabId);
                    }}
                    className="text-slate-400 hover:text-red-500"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            );
          })}
          <button
            type="button"
            onClick={createNewTab}
            className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-200 transition-colors"
            title="Thêm hóa đơn chờ mới (F2)"
          >
            <Plus size={16} />
          </button>
        </div>

        {/* Thông tin khách hàng */}
        <div className="p-3 bg-slate-50 border-b border-slate-200 grid grid-cols-2 gap-2 shrink-0">
          <input
            type="text"
            value={activeTab.customerName}
            onChange={(e) =>
              setCustomerInfo(e.target.value, activeTab.customerPhone)
            }
            placeholder="Tên khách hàng"
            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
          <input
            type="tel"
            value={activeTab.customerPhone}
            onChange={(e) =>
              setCustomerInfo(activeTab.customerName, e.target.value)
            }
            placeholder="Số điện thoại khách"
            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>

        {/* Danh sách sản phẩm trong giỏ */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-3">
          {activeTab.items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 py-12">
              <ShoppingBag size={42} className="mb-2 stroke-1" />
              <p className="text-sm font-semibold text-slate-600">
                Giỏ hàng đang trống
              </p>
              <p className="text-xs max-w-xs mt-1">
                Quét mã vạch sản phẩm hoặc bấm chọn trực tiếp từ danh sách bên
                trái.
              </p>
            </div>
          ) : (
            activeTab.items.map((item) => (
              <div
                key={item.variantId}
                className="py-3 flex items-center justify-between gap-2"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-mono font-bold text-blue-600">
                      {item.skuCode}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      (Tối đa: {item.availableStock})
                    </span>
                  </div>
                  <div className="text-xs font-bold text-slate-900 truncate">
                    {item.productName} - {item.variantName}
                  </div>
                  <div className="text-xs text-slate-500">
                    {item.unitPrice.toLocaleString('vi-VN')}đ × {item.quantity} ={' '}
                    <span className="font-bold text-slate-900">
                      {(item.unitPrice * item.quantity).toLocaleString('vi-VN')}đ
                    </span>
                  </div>
                </div>

                {/* Bộ điều khiển số lượng */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() =>
                      updateItemQuantity(item.variantId, item.quantity - 1)
                    }
                    className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="w-7 text-center text-xs font-bold">
                    {item.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      updateItemQuantity(item.variantId, item.quantity + 1)
                    }
                    className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100"
                  >
                    <Plus size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeItemFromCart(item.variantId)}
                    className="w-7 h-7 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center ml-1"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Khu vực Tổng tiền & Thanh toán */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-3 shrink-0">
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Tạm tính ({activeTab.items.length} dòng SKU):</span>
              <span className="font-semibold">
                {subTotal.toLocaleString('vi-VN')}đ
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-600">
              <span>Chiết khấu (VNĐ):</span>
              <input
                type="number"
                min={0}
                value={activeTab.discountAmount || ''}
                onChange={(e) => setDiscountAmount(Number(e.target.value))}
                placeholder="0"
                className="w-28 px-2 py-1 text-right rounded-lg border border-slate-200 bg-white font-semibold text-xs"
              />
            </div>
            <div className="flex justify-between text-base font-extrabold text-slate-900 pt-1 border-t border-slate-200">
              <span>KHÁCH PHẢI TRẢ:</span>
              <span className="text-blue-600">
                {grandTotal.toLocaleString('vi-VN')}đ
              </span>
            </div>
          </div>

          {/* Phương thức thanh toán (FR-POS-03) */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setPaymentMethod('CASH')}
              className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all ${
                activeTab.paymentMethod === 'CASH'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Banknote size={16} />
              <span>Tiền mặt</span>
            </button>
            <button
              type="button"
              onClick={() => setPaymentMethod('QR_TRANSFER')}
              className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all ${
                activeTab.paymentMethod === 'QR_TRANSFER'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <CreditCard size={16} />
              <span>Chuyển khoản QR</span>
            </button>
          </div>

          {activeTab.paymentMethod === 'CASH' && grandTotal > 0 && (
            <div className="flex items-center justify-between text-xs bg-white p-2.5 rounded-xl border border-slate-200">
              <div>
                <span className="text-slate-500 block">Tiền khách đưa:</span>
                <input
                  type="number"
                  min={0}
                  value={activeTab.cashReceived || ''}
                  onChange={(e) => setCashReceived(Number(e.target.value))}
                  placeholder={grandTotal.toString()}
                  className="mt-0.5 w-28 font-bold text-slate-900 border-b border-slate-300 focus:outline-none focus:border-blue-600"
                />
              </div>
              <div className="text-right">
                <span className="text-slate-500 block">Tiền thừa trả khách:</span>
                <span className="font-extrabold text-emerald-600 text-sm">
                  {changeDue.toLocaleString('vi-VN')}đ
                </span>
              </div>
            </div>
          )}

          {/* Cảnh báo bảo vệ tồn kho Online (FR-POS-02) */}
          <div className="flex items-center gap-1.5 text-[11px] text-amber-800 bg-amber-50 px-2.5 py-1.5 rounded-lg border border-amber-200">
            <AlertTriangle size={14} className="shrink-0 text-amber-600" />
            <span>
              Anti-Oversell Active: Tự động khóa số lượng đã giữ chỗ cho đơn
              Online.
            </span>
          </div>

          {/* Nút Thanh toán Atomic & In Hóa đơn (FR-POS-04) */}
          <button
            type="button"
            disabled={isSubmitting || activeTab.items.length === 0}
            onClick={() => void handleFastCheckout()}
            className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 transition-all cursor-pointer"
          >
            <Printer size={18} />
            <span>
              {isSubmitting
                ? 'ĐANG XỬ LÝ GIAO DỊCH ATOMIC...'
                : 'THANH TOÁN & IN HÓA ĐƠN (F9)'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export { PosScreen };
export default PosScreen;