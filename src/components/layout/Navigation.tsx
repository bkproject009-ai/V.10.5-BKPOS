import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  BarChart3,
  Settings,
  Store,
  LogOut,
  User
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';

const Navigation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      await signOut();
      toast({
        description: "Berhasil keluar dari sistem",
      });
      navigate('/login');
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Gagal keluar dari sistem",
      });
    }
  };

  const navItems = [
    {
      path: '/',
      label: 'Dashboard',
      icon: LayoutDashboard
    },
    {
      path: '/products',
      label: 'Products',
      icon: Package
    },
    {
      path: '/pos',
      label: 'POS',
      icon: ShoppingCart
    },
    {
      path: '/reports',
      label: 'Reports',
      icon: BarChart3
    },
    {
      path: '/settings',
      label: 'Settings',
      icon: Settings
    },
    {
      path: '/profile',
      label: 'Profile',
      icon: User
    }
  ];

  return (
    <nav className="bg-card border-b border-border shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <div className="bg-gradient-to-br from-primary to-primary/80 p-2 rounded-lg">
                <Store className="h-6 w-6 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold">BK POS</span>
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            {/* Navigation Items */}
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.path} to={item.path}>
                  <Button
                    variant={location.pathname === item.path ? 'default' : 'ghost'}
                    className="flex items-center space-x-2"
                  >
                    <Icon className="h-5 w-5" />
                    <span>{item.label}</span>
                  </Button>
                </Link>
              );
            })}

            {/* Logout Button */}
            <Button
              variant="ghost"
              onClick={handleLogout}
              className="flex items-center space-x-2 text-red-500 hover:text-red-700 hover:bg-red-100"
            >
              <LogOut className="h-5 w-5" />
              <span>Logout</span>
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;