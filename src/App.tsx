import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SettingsProvider, useSettings } from "@/contexts/SettingsContext";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Register from "./pages/Register";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Overview from "./pages/dashboard/Overview";
import Styles from "./pages/admin/Styles";
import Stylists from "./pages/admin/Stylists";
import AdminBookings from "./pages/admin/Bookings";
import Customers from "./pages/admin/Customers";
import Categories from "./pages/admin/Categories";
import Settings from "./pages/admin/Settings";
import AdminReports from "./pages/admin/AdminReports";
import Birthdays from "./pages/admin/Birthdays";
import Notifications from "./pages/admin/Notifications";
import Faqs from "./pages/admin/Faqs";
import Booking from "./pages/customer/Booking";
import MyBookings from "./pages/customer/MyBookings";
import Profile from "./pages/shared/Profile";
import StylistSchedule from "./pages/stylist/StylistSchedule";

const queryClient = new QueryClient();

// Component to protect routes based on features
const FeatureGuard = ({ feature, children }: { feature: 'customerModuleEnabled', children: JSX.Element }) => {
  const { settings, loading } = useSettings();
  
  if (loading) return <div>Loading...</div>; // Or a spinner
  
  // If settings loaded and feature is disabled, redirect or show 404
  if (settings && settings[feature] === false) {
    return <Navigate to="/admin" replace />;
  }
  
  return children;
};

const AppContent = () => {
  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/thesalonregister" element={<Register />} />
      <Route path="/thesalonadmin" element={<Login />} />
      <Route path="/booking" element={<Booking />} />
      
      <Route path="/dashboard" element={<Dashboard />}>
        <Route index element={<Overview />} />
        <Route path="book" element={<Booking />} />
        <Route path="bookings" element={<MyBookings />} />
        <Route path="profile" element={<Profile />} />
      </Route>
      
      <Route path="/admin" element={<Dashboard />}>
        <Route index element={<Overview />} />
        <Route path="styles" element={<Styles />} />
        <Route path="stylists" element={<Stylists />} />
        <Route path="customers" element={
          <FeatureGuard feature="customerModuleEnabled">
            <Customers />
          </FeatureGuard>
        } />
        <Route path="birthdays" element={<Birthdays />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="faqs" element={<Faqs />} />
        <Route path="categories" element={<Categories />} />
        <Route path="bookings" element={<AdminBookings />} />
        <Route path="reports" element={<AdminReports />} />
        <Route path="profile" element={<Profile />} />
        <Route path="settings" element={<Settings />} />
      </Route>
      
      <Route path="/stylist" element={<Dashboard />}>
        <Route index element={<Overview />} />
        <Route path="schedule" element={<StylistSchedule />} />
        <Route path="appointments" element={<AdminBookings />} />
        <Route path="profile" element={<Profile />} />
      </Route>

      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner position="top-right" />
      <SettingsProvider>
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </SettingsProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
