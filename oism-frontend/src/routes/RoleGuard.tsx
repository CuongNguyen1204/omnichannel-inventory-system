import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import type { UserRole } from '../types/auth';

interface RoleGuardProps {
  allowedRoles: UserRole[];
  children?: React.ReactNode;
}

const RoleGuard: React.FC<RoleGuardProps> = ({ allowedRoles, children }) => {
  const { user, isAuthenticated } = useAuthStore();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role === 'Cashier' && !allowedRoles.includes('Cashier')) {
    return <Navigate to="/pos" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mb-4 shadow-sm">
          <ShieldAlert size={36} />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">
          Truy cập bị từ chối (RBAC Restricted)
        </h2>
        <p className="text-slate-600 max-w-md mb-6">
          Tài khoản của bạn đang có vai trò{' '}
          <span className="font-semibold text-slate-900">{user.role}</span>.
          Chức năng này chỉ dành cho vai trò:{' '}
          <span className="font-semibold text-blue-600">
            {allowedRoles.join(', ')}
          </span>
          .
        </p>
        <a
          href={user.role === 'Cashier' ? '/pos' : '/admin'}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 transition-colors"
        >
          <ArrowLeft size={18} />
          Quay lại trang làm việc
        </a>
      </div>
    );
  }

  return children ? <>{children}</> : <Outlet />;
};

export default RoleGuard;