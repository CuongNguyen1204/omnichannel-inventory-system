export interface Category {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  parentCategoryId?: string | null;
  parentCategoryName?: string;
  children?: Category[];
}

export interface Brand {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  logoUrl?: string;
}

export interface Variant {
  id: string;
  tenantId: string;
  productId: string;
  productName?: string;
  skuCode: string;
  barcode: string;
  variantName: string;
  color?: string;
  size?: string;
  retailPrice: number;
  wholesalePrice: number;
  weightedAverageCost: number;
  reorderThreshold: number;
  onHand: number;
  reserved: number;
  available: number;
  imageUrl?: string;
  isActive: boolean;
}

export interface Product {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  categoryId: string;
  categoryName?: string;
  brandId?: string | null;
  brandName?: string;
  hasVariants: boolean;
  isActive: boolean;
  variants: Variant[];
  createdAt: string;
}