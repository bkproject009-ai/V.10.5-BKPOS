import { createBrowserRouter, Navigate } from 'react-router-dom';
import { RoleBasedRoute } from './components/RoleBasedRoute';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import POS from './pages/POS';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import NotFound from './pages/NotFound';
import EmailConfirmation from './pages/EmailConfirmation';
import StockManagement from './pages/StockManagement';
import Reports from './pages/Reports';
import UserManagement from './pages/UserManagement';

import AppLayout from './components/layout/AppLayout';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    errorElement: <NotFound />,
    children: [
      {
        index: true,
        element: <Navigate to="/pos" replace />
      },
      {
        path: 'login',
        element: <Login />
      },
      {
        path: 'signup',
        element: <SignUp />
      },
      {
        path: 'email-confirmation',
        element: <EmailConfirmation />
      },
      // Protected routes with role-based access
      {
        path: 'dashboard',
        element: (
          <RoleBasedRoute>
            <Dashboard />
          </RoleBasedRoute>
        )
      },
      {
        path: 'pos',
        element: (
          <RoleBasedRoute>
            <POS />
          </RoleBasedRoute>
        )
      },
      {
        path: 'products',
        element: (
          <RoleBasedRoute>
            <Products />
          </RoleBasedRoute>
        )
      },
      {
        path: 'profile',
        element: (
          <RoleBasedRoute>
            <Profile />
          </RoleBasedRoute>
        )
      },
      {
        path: 'settings',
        element: (
          <RoleBasedRoute>
            <Settings />
          </RoleBasedRoute>
        )
      },
      {
        path: 'stock',
        element: (
          <RoleBasedRoute>
            <StockManagement />
          </RoleBasedRoute>
        )
      },
      {
        path: 'reports',
        element: (
          <RoleBasedRoute>
            <Reports />
          </RoleBasedRoute>
        )
      },
      {
        path: 'user-management',
        element: (
          <RoleBasedRoute>
            <UserManagement />
          </RoleBasedRoute>
        )
      }
    ]
  }
]);
