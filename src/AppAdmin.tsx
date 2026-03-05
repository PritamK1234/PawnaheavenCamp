import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import ScrollRestoration from "./components/ScrollRestoration";
import PageSkeleton from "./components/PageSkeleton";
import { adminPaths } from "./lib/adminPaths";

const AdminLogin = lazy(() => import("./pages/AdminLogin"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const RequestsPage = lazy(() => import("./pages/RequestsPage"));
const AdminRevenuePage = lazy(() => import("./pages/AdminRevenuePage"));
const AdminContactsPage = lazy(() => import("./pages/AdminContactsPage"));
const NotFound = lazy(() => import("./pages/NotFound"));

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

const AppAdmin = () => {
  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter
            future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
          >
            <ScrollRestoration />
            <Routes>
              <Route path="/" element={<Navigate to={adminPaths.login} replace />} />
              <Route
                path={adminPaths.login}
                element={
                  <PageWrapper>
                    <AdminLogin />
                  </PageWrapper>
                }
              />
              <Route
                path={adminPaths.dashboard}
                element={
                  <PageWrapper>
                    <AdminDashboard />
                  </PageWrapper>
                }
              />
              <Route
                path={adminPaths.requests}
                element={
                  <PageWrapper>
                    <RequestsPage />
                  </PageWrapper>
                }
              />
              <Route
                path={adminPaths.revenue}
                element={
                  <PageWrapper>
                    <AdminRevenuePage />
                  </PageWrapper>
                }
              />
              <Route
                path={adminPaths.contacts}
                element={
                  <PageWrapper>
                    <AdminContactsPage />
                  </PageWrapper>
                }
              />
              <Route
                path="*"
                element={
                  <PageWrapper>
                    <NotFound />
                  </PageWrapper>
                }
              />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
};

export default AppAdmin;
