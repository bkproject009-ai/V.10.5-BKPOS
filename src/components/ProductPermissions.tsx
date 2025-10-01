import { useAuth } from '@/contexts/AuthContext';
import { ReactNode } from 'react';

interface ProductPermissionsProps {
  children: ReactNode;
  allowEdit?: boolean;
}

const ProductPermissions = ({ children, allowEdit = false }: ProductPermissionsProps) => {
  const { user } = useAuth();
  const userRole = user?.user_metadata?.role || 'cashier';

  // Cashiers can only edit products if allowEdit is true
  // Admin and managers always have full access
  const hasPermission = userRole === 'cashier' ? allowEdit : true;

  if (!hasPermission) {
    return null;
  }

  return <>{children}</>;
};

export default ProductPermissions;