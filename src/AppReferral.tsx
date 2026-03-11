import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import PageSkeleton from "./components/PageSkeleton";

const ReferralLogin = lazy(() => import("./pages/referral/ReferralLogin"));
const ReferralDashboard = lazy(() => import("./pages/referral/ReferralDashboard"));
const GenerateCodePage = lazy(() => import("./pages/GenerateCodePage"));

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

const PageWrapper = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<PageSkeleton />}>
    {children}
  </Suspense>
);

const RootRedirect = () => {
  const token = localStorage.getItem("referral_token");
  return <Navigate to={token ? "/dashboard" : "/login"} replace />;
};

const AppReferral = () => {
  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <Routes>
              <Route path="/" element={<RootRedirect />} />
              <Route path="/login" element={<PageWrapper><ReferralLogin /></PageWrapper>} />
              <Route path="/dashboard" element={<PageWrapper><ReferralDashboard /></PageWrapper>} />
              <Route path="/generate" element={<PageWrapper><GenerateCodePage /></PageWrapper>} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
};

export default AppReferral;
