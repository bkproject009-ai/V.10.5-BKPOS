import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/contexts/AuthContext";
import { 
  createBrowserRouter, 
  RouterProvider, 
  Route, 
  createRoutesFromElements,
  Outlet
} from "react-router-dom";
import "@/styles/receipt.css";
import { POSProvider } from "@/contexts/POSContext";
import Navigation from "@/components/layout/Navigation";
import Dashboard from "@/pages/Dashboard";
import Products from "@/pages/Products";
import POS from "@/pages/POS";
import Reports from "@/pages/Reports";
import Settings from "@/pages/Settings";
import Profile from "@/pages/Profile";
import NotFound from "./pages/NotFound";
import KasirFront from "@/pages/KasirFront";
import Login from "@/pages/Login";
import SignUp from "@/pages/SignUp";
import EmailConfirmation from "@/pages/EmailConfirmation";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ErrorBoundary } from "@/components/ui/error-boundary";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <POSProvider>
          <Toaster />
          <Sonner />
          <RouterProvider 
            router={createBrowserRouter(
              createRoutesFromElements(
                <Route errorElement={<ErrorBoundary />}>
                  <Route path="/login" element={<Login />} />
                  <Route path="/signup" element={<SignUp />} />
                  <Route path="/email-confirmation" element={<EmailConfirmation />} />
                  
                  {/* Cashier-only POS front page, no navigation */}
                  <Route 
                    path="/kasir" 
                    element={
                      <ProtectedRoute>
                        <KasirFront />
                      </ProtectedRoute>
                    } 
                  />

                  {/* Main app with navigation */}
                  <Route
                    path="/"
                    element={
                      <ProtectedRoute>
                        <div className="min-h-screen bg-background">
                          <Navigation />
                          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                            <Outlet />
                          </main>
                        </div>
                      </ProtectedRoute>
                    }
                  >
                    <Route index element={<Dashboard />} />
                    <Route path="products" element={<Products />} />
                    <Route path="pos" element={<POS />} />
                    <Route path="reports" element={<Reports />} />
                    <Route path="settings" element={<Settings />} />
                    <Route path="profile" element={<Profile />} />
                    <Route path="*" element={<NotFound />} />
                  </Route>
                </Route>
              )
            )} 
          />
      </POSProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
