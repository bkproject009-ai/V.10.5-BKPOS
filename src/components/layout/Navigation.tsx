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
  User,
  Users,
  Menu
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import NavigationCashier from './NavigationCashier';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const Navigation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  // Check if user is cashier
  const isCashier = user?.user_metadata?.role === 'cashier';
  
  // Render cashier navigation if user is cashier
  if (isCashier) {
    return <NavigationCashier />;
  }

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

  // Check if user is admin
  const isAdmin = user?.user_metadata?.role === 'admin';

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
    },
    // Only show user management for admin
    ...(isAdmin ? [{
      path: '/user-management',
      label: 'Manajemen User',
      icon: Users
    }] : [])
  ];

  const NavigationItems = () => (
    <>
      {navItems.map((item) => {
        const Icon = item.icon;
        return (
          <Link key={item.path} to={item.path}>
            <Button
              variant={location.pathname === item.path ? 'default' : 'ghost'}
              className="flex items-center space-x-2 w-full justify-start"
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Button>
          </Link>
        );
      })}
      <Button
        variant="ghost"
        onClick={handleLogout}
        className="flex items-center space-x-2 text-red-500 hover:text-red-700 hover:bg-red-100 w-full justify-start"
      >
        <LogOut className="h-5 w-5" />
        <span>Logout</span>
      </Button>
    </>
  );

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

          {isMobile ? (
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Menu</SheetTitle>
                  <SheetDescription>
                    Navigasi BK POS
                  </SheetDescription>
                </SheetHeader>
                <div className="mt-4 space-y-2">
                  <NavigationItems />
                </div>
              </SheetContent>
            </Sheet>
          ) : (
            <div className="hidden lg:flex items-center space-x-4">
              <NavigationItems />
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navigation;