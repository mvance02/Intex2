import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CookieConsentProvider } from './contexts/CookieConsentContext';
import { ToastProvider } from './contexts/ToastContext';
import ErrorBoundary from './components/shared/ErrorBoundary';
import PublicLayout from './components/shared/PublicLayout';
import AdminLayout from './components/shared/AdminLayout';
import CookieConsentBanner from './components/shared/CookieConsentBanner';
import LoadingSpinner from './components/shared/LoadingSpinner';

// Public pages — eagerly loaded (small, above the fold)
import LandingPage from './pages/public/LandingPage';
import ImpactDashboard from './pages/public/ImpactDashboard';
import LoginPage from './pages/public/LoginPage';
import RegisterPage from './pages/public/RegisterPage';
import LogoutPage from './pages/public/LogoutPage';
import PrivacyPage from './pages/public/PrivacyPage';
import ReferralPage from './pages/public/ReferralPage';
import NotFound from './pages/NotFound';

// Admin pages — lazy loaded (code split, only fetched after login)
const AdminDashboard     = lazy(() => import('./pages/admin/AdminDashboard'));
const DonorManagement    = lazy(() => import('./pages/admin/DonorManagement'));
const CaseloadInventory  = lazy(() => import('./pages/admin/CaseloadInventory'));
const ResidentDetail     = lazy(() => import('./pages/admin/ResidentDetail'));
const ProcessRecordings  = lazy(() => import('./pages/admin/ProcessRecordings'));
const HomeVisitations    = lazy(() => import('./pages/admin/HomeVisitations'));
const ReportsAnalytics   = lazy(() => import('./pages/admin/ReportsAnalytics'));
const ManageMFAPage      = lazy(() => import('./pages/admin/ManageMFAPage'));
const SocialMediaPage    = lazy(() => import('./pages/public/SocialMediaPage'));
const UserManagement     = lazy(() => import('./pages/admin/UserManagement'));

// Donor pages — lazy loaded
const DonorLayout    = lazy(() => import('./components/shared/DonorLayout'));
const DonorDashboard = lazy(() => import('./pages/donor/DonorDashboard'));
const DonorDonations = lazy(() => import('./pages/donor/DonorDonations'));
const DonatePage     = lazy(() => import('./pages/public/DonatePage'));

function PageFallback() {
  return (
    <div className="flex items-center justify-center h-64">
      <LoadingSpinner size="lg" label="Loading page…" />
    </div>
  );
}

function ProtectedRoute({ children, requiredRoles }: { children: React.ReactNode; requiredRoles?: string[] }) {
  const { isAuthenticated, isLoading, authSession } = useAuth();
  if (isLoading) return <PageFallback />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (requiredRoles && requiredRoles.length > 0) {
    const hasRole = authSession.roles.some(r => requiredRoles.includes(r));
    if (!hasRole) return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AuthProvider>
          <CookieConsentProvider>
            <BrowserRouter>
              <Routes>
                {/* Public */}
                <Route element={<PublicLayout />}>
                  <Route path="/"             element={<LandingPage />} />
                  <Route path="/impact"       element={<ImpactDashboard />} />
                  <Route path="/login"        element={<LoginPage />} />
                  <Route path="/register"     element={<RegisterPage />} />
                  <Route path="/logout"       element={<LogoutPage />} />
                  <Route path="/privacy"      element={<PrivacyPage />} />
                  <Route path="/referral"     element={<ReferralPage />} />
                </Route>

                {/* Donor — protected + lazy */}
                <Route
                  element={
                    <ProtectedRoute>
                      <Suspense fallback={<PageFallback />}>
                        <DonorLayout />
                      </Suspense>
                    </ProtectedRoute>
                  }
                >
                  <Route
                    path="/donor"
                    element={
                      <Suspense fallback={<PageFallback />}>
                        <DonorDashboard />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/donor/donations"
                    element={
                      <Suspense fallback={<PageFallback />}>
                        <DonorDonations />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/donor/donate"
                    element={
                      <Suspense fallback={<PageFallback />}>
                        <DonatePage />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/donor/manage-mfa"
                    element={
                      <Suspense fallback={<PageFallback />}>
                        <ManageMFAPage />
                      </Suspense>
                    }
                  />
                </Route>

                {/* Admin — protected + lazy */}
                <Route
                  element={
                    <ProtectedRoute requiredRoles={['Admin']}>
                      <AdminLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route
                    path="/admin"
                    element={
                      <Suspense fallback={<PageFallback />}>
                        <AdminDashboard />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/admin/donors"
                    element={
                      <Suspense fallback={<PageFallback />}>
                        <DonorManagement />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/admin/residents"
                    element={
                      <Suspense fallback={<PageFallback />}>
                        <CaseloadInventory />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/admin/residents/:id"
                    element={
                      <Suspense fallback={<PageFallback />}>
                        <ResidentDetail />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/admin/process-recordings"
                    element={
                      <Suspense fallback={<PageFallback />}>
                        <ProcessRecordings />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/admin/visits"
                    element={
                      <Suspense fallback={<PageFallback />}>
                        <HomeVisitations />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/admin/reports"
                    element={
                      <Suspense fallback={<PageFallback />}>
                        <ReportsAnalytics />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/admin/manage-mfa"
                    element={
                      <Suspense fallback={<PageFallback />}>
                        <ManageMFAPage />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/admin/social-media"
                    element={
                      <Suspense fallback={<PageFallback />}>
                        <SocialMediaPage />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/admin/users"
                    element={
                      <Suspense fallback={<PageFallback />}>
                        <UserManagement />
                      </Suspense>
                    }
                  />
                </Route>

                <Route path="*" element={<NotFound />} />
              </Routes>

              <CookieConsentBanner />
            </BrowserRouter>
          </CookieConsentProvider>
        </AuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}
