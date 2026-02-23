import { Suspense, lazy, useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import ScrollRestoration from "./components/ScrollRestoration";
import LogoLoader from "./components/LogoLoader";

const AdminLogin = lazy(() => import("./pages/AdminLogin"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const RequestsPage = lazy(() => import("./pages/RequestsPage"));
const AdminRevenuePage = lazy(() => import("./pages/AdminRevenuePage"));
const AdminContactsPage = lazy(() => import("./pages/AdminContactsPage"));
const NotFound = lazy(() => import("./pages/NotFound"));

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

const AppAdmin = () => {
  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <ScrollRestoration />
            <Routes>
              <Route path="/" element={<Navigate to="/admin/login" replace />} />
              <Route path="/admin/login" element={<PageWrapper><AdminLogin /></PageWrapper>} />
              <Route path="/admin" element={<PageWrapper><AdminDashboard /></PageWrapper>} />
              <Route path="/admin/requests" element={<PageWrapper><RequestsPage /></PageWrapper>} />
              <Route path="/admin/revenue" element={<PageWrapper><AdminRevenuePage /></PageWrapper>} />
              <Route path="/admin/contacts" element={<PageWrapper><AdminContactsPage /></PageWrapper>} />
              <Route path="*" element={<PageWrapper><NotFound /></PageWrapper>} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
};

export default AppAdmin;
