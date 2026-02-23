import { Suspense, lazy, useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import ScrollRestoration from "./components/ScrollRestoration";
import LogoLoader from "./components/LogoLoader";

const OwnerEntry = lazy(() => import("./pages/owner/Entry"));
const OwnerRegister = lazy(() => import("./pages/owner/register/Register"));
const OwnerRegisterOTP = lazy(() => import("./pages/owner/register/OTP"));
const OwnerLogin = lazy(() => import("./pages/owner/login/Login"));
const DashboardRedirect = lazy(() => import("./pages/owner/dashboard/DashboardRedirect"));
const OwnerLayout = lazy(() => import("./components/owner/layout/OwnerLayout"));
const OwnerMain = lazy(() => import("./pages/owner/dashboard/Campings_Cottages-owners-dashboard/Main"));
const OwnerProfile = lazy(() => import("./pages/owner/dashboard/Campings_Cottages-owners-dashboard/Profile"));
const OwnerUnits = lazy(() => import("./pages/owner/dashboard/Campings_Cottages-owners-dashboard/Units"));
const OwnerBookings = lazy(() => import("./pages/owner/dashboard/bookings/Bookings"));
const NotFound = lazy(() => import("./pages/NotFound"));

const VillaOwnerMain = lazy(() => import("./pages/owner/dashboard/Villas-owners-dashboard/Main"));
const VillaOwnerProfile = lazy(() => import("./pages/owner/dashboard/Villas-owners-dashboard/Profile"));
const VillaOwnerUnits = lazy(() => import("./pages/owner/dashboard/Villas-owners-dashboard/Units"));

const queryClient = new QueryClient();

const PageWrapper = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const [showChildren, setShowChildren] = useState(false);

  useEffect(() => {
    setShowChildren(false);
    const timer = setTimeout(() => setShowChildren(true), 10);
    return () => clearTimeout(timer);
  }, [location.pathname, location.search]);

  return (
    <>
      {!showChildren && <LogoLoader />}
      <Suspense fallback={<LogoLoader />}>
        {showChildren && children}
      </Suspense>
    </>
  );
};

const AppOwner = () => {
  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <ScrollRestoration />
            <Routes>
              <Route path="/" element={<PageWrapper><OwnerEntry /></PageWrapper>} />
              <Route path="/owner" element={<PageWrapper><OwnerEntry /></PageWrapper>} />
              <Route path="/owner/register" element={<PageWrapper><OwnerRegister /></PageWrapper>} />
              <Route path="/owner/register/otp" element={<PageWrapper><OwnerRegisterOTP /></PageWrapper>} />
              <Route path="/owner/login" element={<PageWrapper><OwnerLogin /></PageWrapper>} />
              <Route path="/owner/dashboard" element={<PageWrapper><DashboardRedirect /></PageWrapper>} />

              <Route element={<OwnerLayout />}>
                <Route path="/owner/dashboard/villa" element={<PageWrapper><VillaOwnerMain /></PageWrapper>} />
                <Route path="/owner/dashboard/camping" element={<PageWrapper><OwnerMain /></PageWrapper>} />
                <Route path="/owner/profile/villa" element={<PageWrapper><VillaOwnerProfile /></PageWrapper>} />
                <Route path="/owner/profile/camping" element={<PageWrapper><OwnerProfile /></PageWrapper>} />
                <Route path="/owner/bookings" element={<PageWrapper><OwnerBookings /></PageWrapper>} />
                <Route path="/owner/units" element={<PageWrapper><OwnerUnits /></PageWrapper>} />
                <Route path="/owner/units/villa" element={<PageWrapper><VillaOwnerUnits /></PageWrapper>} />
              </Route>

              <Route path="*" element={<PageWrapper><NotFound /></PageWrapper>} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
};

export default AppOwner;
