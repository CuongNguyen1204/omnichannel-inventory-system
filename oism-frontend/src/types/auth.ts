export type UserRole = 'Owner' | 'Staff' | 'Cashier';

export interface JwtPayload {
  sub?: string;
  userId: string;
  tenantId: string;
  email: string;
  fullName?: string;
  role: UserRole;
  exp: number;
}

export interface Branch {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  address: string;
  phone: string;
  isActive: boolean;
  isDefault?: boolean;
  createdAt?: string;
}

export interface UserProfile {
  id: string;
  tenantId: string;
  tenantName?: string;
  email: string;
  phone?: string;
  fullName: string;
  role: UserRole;
  assignedBranchId?: string;
  isActive: boolean;
}

export interface LoginRequest {
  emailOrPhone: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  user: UserProfile;
  branches: Branch[];
}

export interface RegisterTenantRequest {
  storeName: string;
  ownerFullName: string;
  email: string;
  phone: string;
  password: string;
  defaultBranchName: string;
  defaultBranchAddress: string;
}