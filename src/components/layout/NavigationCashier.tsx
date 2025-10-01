import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  Package, 
  ShoppingCart, 
  Settings,
  LogOut,
  User,
  Menu
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTrigger,
} from "@/components/ui/sheet";

const NavigationCashier = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();

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
        description: "Gagal keluar dari sistem",
      });
    }
  };

  const navItems = [
    {
      path: '/pos',
      label: 'POS',
      icon: ShoppingCart
    },
    {
      path: '/products',
      label: 'Products',
      icon: Package
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

  const NavigationItems = () => (
    <div className="space-y-2">
      {navItems.map((item) => {
        const Icon = item.icon;
        return (
          <Link key={item.path} to={item.path}>
            <Button
              variant={location.pathname === item.path ? 'default' : 'ghost'}
              className="flex items-center space-x-2 w-full justify-start bg-opacity-90 hover:bg-opacity-100"
              style={{
                backgroundColor: location.pathname === item.path ? '#4F46E5' : 'transparent',
                color: location.pathname === item.path ? 'white' : '#4B5563'
              }}
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
        className="flex items-center space-x-2 w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
      >
        <LogOut className="h-5 w-5" />
        <span>Logout</span>
      </Button>
    </div>
  );

  if (isMobile) {
    return (
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="h-6 w-6" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64">
          <SheetHeader className="mb-4">
            <h3 className="text-lg font-semibold text-center">Menu Kasir</h3>
          </SheetHeader>
          <NavigationItems />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <div className="hidden md:flex md:flex-col md:w-64 md:fixed md:inset-y-0 md:border-r md:border-gray-200 md:pt-5 md:pb-4 bg-white">
      <div className="flex items-center justify-center mb-8">
        <h1 className="text-2xl font-bold text-indigo-600">Kasir BK</h1>
      </div>
      <div className="flex-1 px-4">
        <NavigationItems />
      </div>
    </div>
  );
};

export default NavigationCashier;