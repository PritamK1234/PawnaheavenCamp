import { Suspense, lazy, useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import ScrollRestoration from "./components/ScrollRestoration";
import LogoLoader from "./components/LogoLoader";
import axios from "axios";

// Lazy load pages for transition effect
const Index = lazy(() => import("./pages/Index"));
const PropertyDetails = lazy(() => import("./pages/PropertyDetails"));
const VideoGallery = lazy(() => import("./pages/VideoGallery"));
const AdminLogin = lazy(() => import("./pages/AdminLogin"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const DemoPayment = lazy(() => import("./pages/DemoPayment"));
const TicketPage = lazy(() => import("./pages/TicketPage"));
const InformationPage = lazy(() => import("./pages/InformationPage"));
const ReferralPage = lazy(() => import("./pages/ReferralPage"));
const GenerateCodePage = lazy(() => import("./pages/GenerateCodePage"));
const CheckEarningPage = lazy(() => import("./pages/CheckEarningPage"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Owner Dashboard Pages
const OwnerEntry = lazy(() => import("./pages/owner/Entry"));
const OwnerRegister = lazy(() => import("./pages/owner/register/Register"));
const OwnerRegisterOTP = lazy(() => import("./pages/owner/register/OTP"));
const OwnerLogin = lazy(() => import("./pages/owner/login/Login"));
const DashboardRedirect = lazy(() => import("./pages/owner/dashboard/DashboardRedirect"));
const OwnerLayout = lazy(() => import("./components/owner/layout/OwnerLayout"));
const OwnerMain = lazy(() => import("./pages/owner/dashboard/Campings_Cottages-owners-dashboard/Main"));
const OwnerProfile = lazy(() => import("./pages/owner/dashboard/Campings_Cottages-owners-dashboard/Profile"));
const OwnerUnits = lazy(() => import("./pages/owner/dashboard/Campings_Cottages-owners-dashboard/Units"));
const OwnerInfo = lazy(() => import("./pages/owner/dashboard/Campings_Cottages-owners-dashboard/Info"));

const VillaOwnerMain = lazy(() => import("./pages/owner/dashboard/Villas-owners-dashboard/Main"));
const VillaOwnerProfile = lazy(() => import("./pages/owner/dashboard/Villas-owners-dashboard/Profile"));
const VillaOwnerInfo = lazy(() => import("./pages/owner/dashboard/Villas-owners-dashboard/Info"));

const queryClient = new QueryClient();

// Page wrapper to handle loading state on route changes
const PageWrapper = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const [showChildren, setShowChildren] = useState(false);

  useEffect(() => {
    // Referral Auto-Apply Logic
    const params = new URLSearchParams(location.search);
    const refCode = params.get("ref");
    if (refCode) {
      localStorage.setItem("applied_referral_code", refCode.toUpperCase());
    }

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

const App = () => {
  const ownerDataString = localStorage.getItem('ownerData');
  const ownerData = ownerDataString ? JSON.parse(ownerDataString) : null;

  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <ScrollRestoration />
            <Routes>
              <Route path="/" element={<PageWrapper><Index /></PageWrapper>} />
              <Route path="/property/:propertyId" element={<PageWrapper><PropertyDetails /></PageWrapper>} />
              <Route path="/videos" element={<PageWrapper><VideoGallery /></PageWrapper>} />
              <Route path="/admin/login" element={<PageWrapper><AdminLogin /></PageWrapper>} />
              <Route path="/admin" element={<PageWrapper><AdminDashboard /></PageWrapper>} />
              <Route path="/payment/demo" element={<PageWrapper><DemoPayment /></PageWrapper>} />
              <Route path="/ticket/:ticketId" element={<PageWrapper><TicketPage /></PageWrapper>} />
              <Route path="/info/:type" element={<PageWrapper><InformationPage /></PageWrapper>} />
              <Route path="/referral" element={<PageWrapper><ReferralPage /></PageWrapper>} />
              <Route path="/referral/generate" element={<PageWrapper><GenerateCodePage /></PageWrapper>} />
              <Route path="/referral/check" element={<PageWrapper><CheckEarningPage /></PageWrapper>} />
              
              {/* Owner Routes */}
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
                <Route path="/owner/units" element={<PageWrapper><OwnerUnits /></PageWrapper>} />
              </Route>

              <Route path="*" element={<PageWrapper><NotFound /></PageWrapper>} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
};

export default App;
