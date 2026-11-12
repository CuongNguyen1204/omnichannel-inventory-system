export type LedgerDirection = 'IN' | 'OUT';

export type LedgerTransactionType =
  | 'IMPORT'          // Nhập hàng nhà cung cấp
  | 'SALE_POS'        // Bán hàng tại quầy POS
  | 'SALE_ONLINE'     // Xuất bán đơn hàng Online
  | 'RETURN'          // Khách trả hàng
  | 'TRANSFER_OUT'    // Xuất chuyển kho
  | 'TRANSFER_IN'     // Nhập chuyển kho
  | 'STOCKTAKE_ADJ';  // Điều chỉnh kiểm kê

export interface InventoryLedgerEntry {
  id: string;
  tenantId: string;
  branchId: string;
  branchName?: string;
  variantId: string;
  skuCode: string;
  productName: string;
  direction: LedgerDirection;
  transactionType: LedgerTransactionType;
  quantity: number;
  unitCostSnapshot: number;
  balanceAfter: number;
  referenceId: string;
  note?: string;
  createdAt: string;
  createdByUserId?: string;
}

export interface PurchaseReceiptItemInput {
  variantId: string;
  skuCode: string;
  productName: string;
  currentOnHand: number;
  currentCost: number;
  importQuantity: number;
  importPrice: number;
}

export interface CreatePurchaseReceiptRequest {
  branchId: string;
  supplierName: string;
  referenceCode?: string;
  note?: string;
  items: {
    variantId: string;
    importQuantity: number;
    importPrice: number;
  }[];
}

export type StockTransferStatus = 'InTransit' | 'Completed' | 'Cancelled';

export interface StockTransfer {
  id: string;
  transferCode: string;
  fromBranchId: string;
  fromBranchName: string;
  toBranchId: string;
  toBranchName: string;
  status: StockTransferStatus;
  createdAt: string;
  completedAt?: string;
  items: {
    variantId: string;
    skuCode: string;
    productName: string;
    quantity: number;
  }[];
}

export interface StocktakeSessionItem {
  variantId: string;
  skuCode: string;
  barcode: string;
  productName: string;
  softwareBalance: number;
  physicalCount: number;
  discrepancy: number;
}