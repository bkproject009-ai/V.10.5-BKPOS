import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Navigation from '@/components/layout/Navigation';

export default function AppLayout() {
  const { user, loading } = useAuth();
  const location = useLocation();

  // While checking authentication status, show nothing
  if (loading) {
    return null;
  }

  // If not logged in, redirect to login page
  if (!user && !location.pathname.includes('/login') && !location.pathname.includes('/signup')) {
    return <Navigate to="/login" replace />;
  }

  // Don't show navigation on login and signup pages
  if (location.pathname.includes('/login') || location.pathname.includes('/signup')) {
    return <Outlet />;
  }

  return (
    <div>
      <Navigation />
      <main className="container mx-auto px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}