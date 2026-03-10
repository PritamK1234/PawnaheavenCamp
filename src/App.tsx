import { Suspense, lazy, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import ScrollRestoration from "./components/ScrollRestoration";
import PageSkeleton from "./components/PageSkeleton";
import { adminPaths } from "./lib/adminPaths";
import axios from "axios";

// Lazy load pages for code splitting
const Index = lazy(() => import("./pages/Index"));
const PropertyDetails = lazy(() => import("./pages/PropertyDetails"));
const VideoGallery = lazy(() => import("./pages/VideoGallery"));
const DemoPayment = lazy(() => import("./pages/DemoPayment"));
const TicketPage = lazy(() => import("./pages/TicketPage"));
const InformationPage = lazy(() => import("./pages/InformationPage"));
const ReferralPage = lazy(() => import("./pages/ReferralPage"));
const GenerateCodePage = lazy(() => import("./pages/GenerateCodePage"));
const CheckEarningPage = lazy(() => import("./pages/CheckEarningPage"));
const AdminLogin = lazy(() => import("./pages/AdminLogin"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AdminRevenuePage = lazy(() => import("./pages/AdminRevenuePage"));
const AdminContactsPage = lazy(() => import("./pages/AdminContactsPage"));
const PaymentProcessing = lazy(() => import("./pages/PaymentProcessing"));
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
const OwnerBookings = lazy(() => import("./pages/owner/dashboard/bookings/Bookings"));
const OwnerInfo = lazy(() => import("./pages/owner/dashboard/Campings_Cottages-owners-dashboard/Info"));

const VillaOwnerMain = lazy(() => import("./pages/owner/dashboard/Villas-owners-dashboard/Main"));
const VillaOwnerProfile = lazy(() => import("./pages/owner/dashboard/Villas-owners-dashboard/Profile"));
const VillaOwnerInfo = lazy(() => import("./pages/owner/dashboard/Villas-owners-dashboard/Info"));
const VillaOwnerUnits = lazy(() => import("./pages/owner/dashboard/Villas-owners-dashboard/Units"));
const OwnerB2B = lazy(() => import("./pages/owner/dashboard/OwnerB2B"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      gcTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const PageWrapper = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const refCode = params.get("ref");
    if (refCode) {
      localStorage.setItem("applied_referral_code", refCode.toUpperCase());
      axios.get(`/api/referrals/validate/${refCode}`).then(res => {
        const isOwnerType = res.data.referral_type === 'owner' || res.data.referral_type === 'owners_b2b';
        if (res.data.valid && isOwnerType && res.data.linked_property_slug) {
          localStorage.setItem("owner_referral_lock", res.data.linked_property_slug);
          if (!location.pathname.startsWith('/property/')) {
            window.location.replace(`/property/${res.data.linked_property_slug}?ref=${refCode.toUpperCase()}`);
          }
        }
      }).catch(() => {});
    }
  }, [location.pathname, location.search]);

  return (
    <Suspense fallback={<PageSkeleton />}>
      {children}
    </Suspense>
  );
};

const App = () => {
  const ownerDataString = localStorage.getItem('ownerData');
  const ownerData = ownerDataString ? JSON.parse(ownerDataString) : null;

  useEffect(() => {
    const prefetch = () => {
      import('./pages/PropertyDetails');
    };
    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(prefetch);
    } else {
      setTimeout(prefetch, 1500);
    }
  }, []);

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
              <Route path="/payment/demo" element={<PageWrapper><DemoPayment /></PageWrapper>} />
              <Route path="/ticket" element={<PageWrapper><TicketPage /></PageWrapper>} />
              <Route path="/ticket/:ticketId" element={<PageWrapper><TicketPage /></PageWrapper>} />
              <Route path="/info/:type" element={<PageWrapper><InformationPage /></PageWrapper>} />
              <Route path="/referral" element={<PageWrapper><ReferralPage /></PageWrapper>} />
              <Route path="/referral/generate" element={<PageWrapper><GenerateCodePage /></PageWrapper>} />
              <Route path="/referral/check" element={<PageWrapper><CheckEarningPage /></PageWrapper>} />
              <Route path="/payment-processing" element={<PageWrapper><PaymentProcessing /></PageWrapper>} />

              {/* Admin Routes */}
              <Route path={adminPaths.login} element={<PageWrapper><AdminLogin /></PageWrapper>} />
              <Route path={adminPaths.dashboard} element={<PageWrapper><AdminDashboard /></PageWrapper>} />
              <Route path={adminPaths.revenue} element={<PageWrapper><AdminRevenuePage /></PageWrapper>} />
              <Route path={adminPaths.contacts} element={<PageWrapper><AdminContactsPage /></PageWrapper>} />
              
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
                <Route path="/owner/bookings" element={<PageWrapper><OwnerBookings /></PageWrapper>} />
                <Route path="/owner/units" element={<PageWrapper><OwnerUnits /></PageWrapper>} />
                <Route path="/owner/units/villa" element={<PageWrapper><VillaOwnerUnits /></PageWrapper>} />
                <Route path="/owner/b2b" element={<PageWrapper><OwnerB2B /></PageWrapper>} />
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
