import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { session, loading, user } = useAuth();
  const location = useLocation();
  const userRole = user?.user_metadata?.role || 'cashier';

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!session) {
    return <Navigate to="/login" />;
  }

  // If no roles specified, allow access
  if (!allowedRoles) {
    return <>{children}</>;
  }

  // Check if user has permission
  if (!allowedRoles.includes(userRole)) {
    // Redirect cashier to POS page if trying to access restricted pages
    if (userRole === 'cashier' && location.pathname !== '/pos') {
      return <Navigate to="/pos" />;
    }
    // Redirect others to dashboard
    return <Navigate to="/" />;
  }

  return <>{children}</>;
}