import { Navigate } from 'react-router-dom';
import { useAuth, type StaffRole } from '@/lib/auth';

interface ProtectedRouteProps {
  allowedRoles: StaffRole[];
  children: React.ReactNode;
}

export default function ProtectedRoute({ allowedRoles, children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#1A1C1E]">
        <div className="text-sm text-amber-200/70">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/staff-login" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    const dashboard = user.role === 'Admin' ? '/admin' : user.role === 'Manager' ? '/manager' : '/staff';
    return <Navigate to={dashboard} replace />;
  }

  return <>{children}</>;
}
