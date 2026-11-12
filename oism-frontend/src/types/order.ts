export type SalesChannel = 'POS' | 'Shopee' | 'TikTokShop' | 'Lazada' | 'Manual';

export type OrderStatus =
  | 'Draft'
  | 'Reserved'
  | 'Confirmed'
  | 'Completed'
  | 'Cancelled';

export type PaymentMethod = 'CASH' | 'QR_TRANSFER' | 'COD' | 'E_WALLET';

export interface OrderItem {
  id?: string;
  variantId: string;
  skuCode: string;
  productName: string;
  variantName?: string;
  quantity: number;
  unitPrice: number;
  costPriceSnapshot: number;
  discountAmount: number;
  lineTotal: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  externalOrderId?: string;
  tenantId: string;
  branchId: string;
  branchName?: string;
  channel: SalesChannel;
  status: OrderStatus;
  customerName?: string;
  customerPhone?: string;
  shippingAddress?: string;
  paymentMethod: PaymentMethod;
  subTotal: number;
  discountTotal: number;
  grandTotal: number;
  totalCogs: number;
  grossProfit: number;
  items: OrderItem[];
  createdAt: string;
  confirmedAt?: string;
}

export interface PosCheckoutRequest {
  branchId: string;
  customerName?: string;
  customerPhone?: string;
  paymentMethod: PaymentMethod;
  discountAmount: number;
  cashReceived?: number;
  note?: string;
  items: {
    variantId: string;
    quantity: number;
    unitPrice: number;
  }[];
}