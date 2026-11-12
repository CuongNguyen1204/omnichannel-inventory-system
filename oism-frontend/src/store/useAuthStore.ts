import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Branch, JwtPayload, UserProfile, UserRole } from '../types/auth';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: UserProfile | null;
  branches: Branch[];
  activeBranchId: string | null;
  isAuthenticated: boolean;

  setAuthSession: (payload: {
    accessToken: string;
    refreshToken?: string;
    user?: UserProfile;
    branches?: Branch[];
  }) => void;
  setActiveBranch: (branchId: string) => void;
  setBranches: (branches: Branch[]) => void;
  hasRole: (allowedRoles: UserRole[]) => boolean;
  logout: () => void;
}

export function decodeJwtToken(token: string): JwtPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      window
        .atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );

    const raw = JSON.parse(jsonPayload) as Record<string, unknown>;

    const roleClaim =
      raw.role ||
      raw.Role ||
      raw['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] ||
      'Cashier';

    const userIdClaim =
      raw.userId ||
      raw.UserId ||
      raw.sub ||
      raw['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] ||
      '';

    const tenantIdClaim = raw.tenantId || raw.TenantId || '';
    const emailClaim =
      raw.email ||
      raw.Email ||
      raw['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'] ||
      '';

    return {
      userId: String(userIdClaim),
      tenantId: String(tenantIdClaim),
      email: String(emailClaim),
      fullName: String(raw.fullName || raw.unique_name || emailClaim),
      role: roleClaim as UserRole,
      exp: Number(raw.exp || 0),
    };
  } catch {
    return null;
  }
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      branches: [],
      activeBranchId: null,
      isAuthenticated: false,

      setAuthSession: ({ accessToken, refreshToken, user, branches }) => {
        const decoded = decodeJwtToken(accessToken);

        const resolvedUser: UserProfile = user || {
          id: decoded?.userId || '',
          tenantId: decoded?.tenantId || '',
          email: decoded?.email || '',
          fullName: decoded?.fullName || 'Người dùng OISM',
          role: decoded?.role || 'Cashier',
          isActive: true,
        };

        const branchList =
          branches && branches.length > 0 ? branches : get().branches;
        const defaultBranch =
          branchList.find((b) => b.isDefault && b.isActive) ||
          branchList.find((b) => b.isActive) ||
          branchList[0];

        set({
          accessToken,
          refreshToken: refreshToken ?? get().refreshToken,
          user: resolvedUser,
          branches: branchList,
          activeBranchId:
            resolvedUser.assignedBranchId ||
            get().activeBranchId ||
            defaultBranch?.id ||
            null,
          isAuthenticated: true,
        });
      },

      setActiveBranch: (branchId: string) => {
        set({ activeBranchId: branchId });
      },

      setBranches: (branches: Branch[]) => {
        const currentActive = get().activeBranchId;
        const stillExists = branches.some(
          (b) => b.id === currentActive && b.isActive
        );
        const fallbackBranch =
          branches.find((b) => b.isDefault && b.isActive) ||
          branches.find((b) => b.isActive);

        set({
          branches,
          activeBranchId: stillExists
            ? currentActive
            : fallbackBranch?.id || null,
        });
      },

      hasRole: (allowedRoles: UserRole[]) => {
        const currentUser = get().user;
        if (!currentUser) return false;
        return allowedRoles.includes(currentUser.role);
      },

      logout: () => {
        set({
          accessToken: null,
          refreshToken: null,
          user: null,
          branches: [],
          activeBranchId: null,
          isAuthenticated: false,
        });
        localStorage.removeItem('oism-auth-storage');
      },
    }),
    {
      name: 'oism-auth-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);