export interface RevenueProfitSummary {
  netRevenue: number;
  totalCogs: number;
  grossProfit: number;
  grossMarginPercent: number;
  totalOrders: number;
  dailyBreakdown: {
    date: string;
    revenue: number;
    cogs: number;
    grossProfit: number;
  }[];
  channelBreakdown: {
    channel: string;
    revenue: number;
    orderCount: number;
  }[];
}

export interface StockReorderRecommendation {
  variantId: string;
  skuCode: string;
  productName: string;
  onHand: number;
  reserved: number;
  available: number;
  reorderThreshold: number;
  avgDailySales30d: number;
  estimatedDaysRemaining: number;
  recommendedReorderQty: number;
  urgencyLevel: 'CRITICAL' | 'WARNING' | 'SAFE';
}