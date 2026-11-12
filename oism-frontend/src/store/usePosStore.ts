import { create } from 'zustand';
import toast from 'react-hot-toast';
import type { Variant } from '../types/catalog';
import type { PaymentMethod } from '../types/order';

export interface PosCartItem {
  variantId: string;
  skuCode: string;
  barcode: string;
  productName: string;
  variantName: string;
  unitPrice: number;
  quantity: number;
  availableStock: number;
  imageUrl?: string;
}

export interface PosOrderTab {
  tabId: string;
  tabLabel: string;
  items: PosCartItem[];
  customerName: string;
  customerPhone: string;
  discountAmount: number;
  paymentMethod: PaymentMethod;
  cashReceived: number;
  note: string;
}

interface PosState {
  tabs: PosOrderTab[];
  activeTabId: string;

  getActiveTab: () => PosOrderTab;
  getSubTotal: () => number;
  getGrandTotal: () => number;
  getChangeDue: () => number;

  createNewTab: () => void;
  closeTab: (tabId: string) => void;
  switchTab: (tabId: string) => void;
  addItemToCart: (variant: Variant) => boolean;
  updateItemQuantity: (variantId: string, newQty: number) => void;
  removeItemFromCart: (variantId: string) => void;
  setCustomerInfo: (name: string, phone: string) => void;
  setDiscountAmount: (amount: number) => void;
  setPaymentMethod: (method: PaymentMethod) => void;
  setCashReceived: (amount: number) => void;
  setNote: (note: string) => void;
  clearActiveTab: () => void;
  syncAvailableStockFromRealtime: (
    variantId: string,
    newAvailable: number
  ) => void;
}

const createDefaultTab = (index: number): PosOrderTab => ({
  tabId: `tab-${Date.now()}-${index}`,
  tabLabel: `Hóa đơn ${index}`,
  items: [],
  customerName: 'Khách lẻ',
  customerPhone: '',
  discountAmount: 0,
  paymentMethod: 'CASH',
  cashReceived: 0,
  note: '',
});

const initialTab = createDefaultTab(1);

export const usePosStore = create<PosState>((set, get) => ({
  tabs: [initialTab],
  activeTabId: initialTab.tabId,

  getActiveTab: () => {
    const { tabs, activeTabId } = get();
    return tabs.find((t) => t.tabId === activeTabId) || tabs[0];
  },

  getSubTotal: () => {
    const activeTab = get().getActiveTab();
    return activeTab.items.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0
    );
  },

  getGrandTotal: () => {
    const subTotal = get().getSubTotal();
    const discount = get().getActiveTab().discountAmount || 0;
    return Math.max(0, subTotal - discount);
  },

  getChangeDue: () => {
    const activeTab = get().getActiveTab();
    const grandTotal = get().getGrandTotal();
    if (activeTab.paymentMethod !== 'CASH') return 0;
    return Math.max(0, activeTab.cashReceived - grandTotal);
  },

  createNewTab: () => {
    const { tabs } = get();
    if (tabs.length >= 5) {
      toast.error('Chỉ được giữ tối đa 5 hóa đơn chờ cùng lúc.');
      return;
    }
    const newTab = createDefaultTab(tabs.length + 1);
    set({
      tabs: [...tabs, newTab],
      activeTabId: newTab.tabId,
    });
  },

  closeTab: (tabId: string) => {
    const { tabs, activeTabId } = get();
    if (tabs.length === 1) {
      get().clearActiveTab();
      return;
    }
    const filtered = tabs.filter((t) => t.tabId !== tabId);
    const nextActiveId =
      activeTabId === tabId
        ? filtered[filtered.length - 1].tabId
        : activeTabId;
    set({
      tabs: filtered,
      activeTabId: nextActiveId,
    });
  },

  switchTab: (tabId: string) => {
    set({ activeTabId: tabId });
  },

  addItemToCart: (variant: Variant) => {
    if (variant.available <= 0) {
      toast.error(
        `SKU [${variant.skuCode}] đã hết tồn khả dụng! (Tồn kho: ${variant.onHand}, Đang giữ cho đơn Online: ${variant.reserved})`,
        { duration: 4000 }
      );
      return false;
    }

    const activeTab = get().getActiveTab();
    const existingItem = activeTab.items.find(
      (i) => i.variantId === variant.id
    );
    const nextQty = existingItem ? existingItem.quantity + 1 : 1;

    if (nextQty > variant.available) {
      toast.error(
        `Không thể thêm vượt số lượng khả dụng (${variant.available}) của [${variant.skuCode}] để bảo vệ hàng đã giữ chỗ cho đơn Online!`,
        { duration: 4000 }
      );
      return false;
    }

    const updatedItems = existingItem
      ? activeTab.items.map((item) =>
          item.variantId === variant.id
            ? {
                ...item,
                quantity: nextQty,
                availableStock: variant.available,
              }
            : item
        )
      : [
          ...activeTab.items,
          {
            variantId: variant.id,
            skuCode: variant.skuCode,
            barcode: variant.barcode,
            productName: variant.productName || variant.variantName,
            variantName: variant.variantName,
            unitPrice: variant.retailPrice,
            quantity: 1,
            availableStock: variant.available,
            imageUrl: variant.imageUrl,
          },
        ];

    set({
      tabs: get().tabs.map((tab) =>
        tab.tabId === activeTab.tabId ? { ...tab, items: updatedItems } : tab
      ),
    });
    return true;
  },

  updateItemQuantity: (variantId: string, newQty: number) => {
    const activeTab = get().getActiveTab();
    const targetItem = activeTab.items.find((i) => i.variantId === variantId);
    if (!targetItem) return;

    if (newQty <= 0) {
      get().removeItemFromCart(variantId);
      return;
    }

    if (newQty > targetItem.availableStock) {
      toast.error(
        `Số lượng tối đa có thể bán của [${targetItem.skuCode}] là ${targetItem.availableStock}!`
      );
      return;
    }

    set({
      tabs: get().tabs.map((tab) =>
        tab.tabId === activeTab.tabId
          ? {
              ...tab,
              items: tab.items.map((item) =>
                item.variantId === variantId
                  ? { ...item, quantity: newQty }
                  : item
              ),
            }
          : tab
      ),
    });
  },

  removeItemFromCart: (variantId: string) => {
    const activeTab = get().getActiveTab();
    set({
      tabs: get().tabs.map((tab) =>
        tab.tabId === activeTab.tabId
          ? {
              ...tab,
              items: tab.items.filter((i) => i.variantId !== variantId),
            }
          : tab
      ),
    });
  },

  setCustomerInfo: (customerName: string, customerPhone: string) => {
    const activeTab = get().getActiveTab();
    set({
      tabs: get().tabs.map((tab) =>
        tab.tabId === activeTab.tabId
          ? { ...tab, customerName, customerPhone }
          : tab
      ),
    });
  },

  setDiscountAmount: (discountAmount: number) => {
    const activeTab = get().getActiveTab();
    set({
      tabs: get().tabs.map((tab) =>
        tab.tabId === activeTab.tabId
          ? { ...tab, discountAmount: Math.max(0, discountAmount) }
          : tab
      ),
    });
  },

  setPaymentMethod: (paymentMethod: PaymentMethod) => {
    const activeTab = get().getActiveTab();
    set({
      tabs: get().tabs.map((tab) =>
        tab.tabId === activeTab.tabId ? { ...tab, paymentMethod } : tab
      ),
    });
  },

  setCashReceived: (cashReceived: number) => {
    const activeTab = get().getActiveTab();
    set({
      tabs: get().tabs.map((tab) =>
        tab.tabId === activeTab.tabId
          ? { ...tab, cashReceived: Math.max(0, cashReceived) }
          : tab
      ),
    });
  },

  setNote: (note: string) => {
    const activeTab = get().getActiveTab();
    set({
      tabs: get().tabs.map((tab) =>
        tab.tabId === activeTab.tabId ? { ...tab, note } : tab
      ),
    });
  },

  clearActiveTab: () => {
    const activeTab = get().getActiveTab();
    set({
      tabs: get().tabs.map((tab) =>
        tab.tabId === activeTab.tabId
          ? {
              ...tab,
              items: [],
              customerName: 'Khách lẻ',
              customerPhone: '',
              discountAmount: 0,
              cashReceived: 0,
              note: '',
            }
          : tab
      ),
    });
  },

  syncAvailableStockFromRealtime: (
    variantId: string,
    newAvailable: number
  ) => {
    set({
      tabs: get().tabs.map((tab) => ({
        ...tab,
        items: tab.items.map((item) =>
          item.variantId === variantId
            ? { ...item, availableStock: newAvailable }
            : item
        ),
      })),
    });
  },
}));