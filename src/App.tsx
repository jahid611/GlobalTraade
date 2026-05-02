"use client";

import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { Toaster as HotToaster } from "react-hot-toast";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider } from "@/components/AuthProvider";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminRoute } from "@/components/AdminRoute";
import { GlobalNotifications } from "@/components/GlobalNotifications";
import { ErrorBoundary } from "@/components/ErrorBoundary";

// Stripe
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

import React, { Suspense } from 'react';

// Pages en Lazy Loading
const Index = React.lazy(() => import("./pages/Index"));
const AppMap = React.lazy(() => import("./pages/AppMap"));
const Marketplace = React.lazy(() => import("./pages/Marketplace"));
const Dashboard = React.lazy(() => import("./pages/Dashboard"));
const Profile = React.lazy(() => import("./pages/Profile"));
const Settings = React.lazy(() => import("./pages/Settings"));
const Login = React.lazy(() => import("./pages/Login"));
const Messages = React.lazy(() => import("./pages/Messages"));
const Faq = React.lazy(() => import("./pages/Faq"));
const Contact = React.lazy(() => import("./pages/Contact"));
const Terms = React.lazy(() => import("./pages/Terms"));
const Privacy = React.lazy(() => import("./pages/Privacy"));
const Legal = React.lazy(() => import("./pages/Legal"));
const AdminDashboard = React.lazy(() => import("./pages/AdminDashboard"));
const Payment = React.lazy(() => import("./pages/Payment"));
const Projects = React.lazy(() => import("./pages/Projects"));
const NotFound = React.lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const stripePromise = loadStripe('pk_test_your_key_here');

// Skeleton moderne au lieu du rond qui tourne
const PageLoaderSkeleton = () => (
  <div className="min-h-screen bg-transparent flex flex-col pt-[20vh] px-[6vw] max-w-6xl mx-auto w-full gap-8 pointer-events-none">
    <div className="h-14 w-[300px] bg-white/5 rounded-full animate-pulse" />
    <div className="h-6 w-[200px] bg-white/5 rounded-full animate-pulse mb-8" />
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
      <div className="h-[320px] bg-white/5 rounded-[2rem] animate-pulse" />
      <div className="h-[320px] bg-white/5 rounded-[2rem] animate-pulse" />
      <div className="h-[320px] bg-white/5 rounded-[2rem] animate-pulse hidden md:block" />
    </div>
  </div>
);

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
        <AuthProvider>
          <TooltipProvider>
            <Elements stripe={stripePromise}>
              <BrowserRouter>
                <GlobalNotifications />
                <HotToaster position="top-right" />
                <SonnerToaster position="bottom-right" />
                <Suspense fallback={<PageLoaderSkeleton />}>
                  <Routes>
                    <Route path="/" element={<Index />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/app" element={<AppMap />} />
                    <Route path="/marketplace" element={<Marketplace />} />
                    <Route path="/faq" element={<Faq />} />
                    <Route path="/contact" element={<Contact />} />
                    <Route path="/terms" element={<Terms />} />
                    <Route path="/privacy" element={<Privacy />} />
                    <Route path="/legal" element={<Legal />} />
                    <Route path="/payment" element={<Payment />} />
                    <Route path="/projects" element={<Projects />} />
                    
                    {/* Routes Protégées */}
                    <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                    <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
                    <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                    <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                    <Route path="/profile/:id" element={<Profile />} />
                    
                    {/* Routes Admin */}
                    <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
                    
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </BrowserRouter>
            </Elements>
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;