import { Suspense, lazy, useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import ScrollRestoration from "./components/ScrollRestoration";
import LogoLoader from "./components/LogoLoader";

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

const queryClient = new QueryClient();

// Page wrapper to handle loading state on route changes
const PageWrapper = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const [showChildren, setShowChildren] = useState(false);

  useEffect(() => {
    setShowChildren(false);
    const timer = setTimeout(() => setShowChildren(true), 10);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  return (
    <>
      {!showChildren && <LogoLoader />}
      <Suspense fallback={<LogoLoader />}>
        {showChildren && children}
      </Suspense>
    </>
  );
};

const App = () => (
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
            <Route path="*" element={<PageWrapper><NotFound /></PageWrapper>} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
