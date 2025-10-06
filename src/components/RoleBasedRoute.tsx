import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface RoleBasedRouteProps {
  children: React.ReactNode;
}

const allowedRoutesByRole = {
  admin: ['*'], // Admin can access all routes
  manager: ['*'], // Manager can access all routes
  cashier: ['/pos', '/products', '/profile', '/settings'] // Cashier has limited access
};

export function RoleBasedRoute({ children }: RoleBasedRouteProps) {
  const { user } = useAuth();
  const location = useLocation();
  
  // Get user role from user metadata
  const userRole = user?.user_metadata?.role || 'cashier';
  
  // Get allowed routes for user role
  const userAllowedRoutes = allowedRoutesByRole[userRole as keyof typeof allowedRoutesByRole] || [];
  
  // Get current path without query parameters
  const currentPath = location.pathname.toLowerCase();
  
  // Check if the current path is allowed for the user's role
  const isAllowedRoute = userAllowedRoutes.some(route => {
    if (route === '*') {
      return true; // Admin and manager can access all routes
    }
    // For cashier, check if the current path exactly matches or is a sub-path
    return currentPath === route.toLowerCase() || 
           (currentPath !== '/' && currentPath.startsWith(route.toLowerCase() + '/'));
  });

  // If user is not allowed to access this route, redirect to POS
  if (!isAllowedRoute) {
    console.log(`Access denied: ${userRole} trying to access ${currentPath}`);
    return <Navigate to="/pos" replace state={{ from: location }} />;
  }

  return <>{children}</>;
}
