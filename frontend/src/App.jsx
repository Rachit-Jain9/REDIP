import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from './store/authStore';
import Layout from './components/layout/Layout';
import ToastContainer from './components/common/Toast';
import LoadingSpinner from './components/common/LoadingSpinner';
import ErrorBoundary from './components/common/ErrorBoundary';

const LoginPage = lazy(() => import('./pages/LoginPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const DealsPage = lazy(() => import('./pages/DealsPage'));
const DealDetailPage = lazy(() => import('./pages/DealDetailPage'));
const PropertiesPage = lazy(() => import('./pages/PropertiesPage'));
const PropertyDetailPage = lazy(() => import('./pages/PropertyDetailPage'));
const MapPage = lazy(() => import('./pages/MapPage'));
const FinancialsPage = lazy(() => import('./pages/FinancialsPage'));
const CompsPage = lazy(() => import('./pages/CompsPage'));
const DocumentsPage = lazy(() => import('./pages/DocumentsPage'));
const ActivitiesPage = lazy(() => import('./pages/ActivitiesPage'));
const DealComparePage = lazy(() => import('./pages/DealComparePage'));
const ReportsPage = lazy(() => import('./pages/ReportsPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const IntelligencePage = lazy(() => import('./pages/IntelligencePage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-96">
      <LoadingSpinner size="lg" />
    </div>
  );
}

function withSuspense(element) {
  return (
    <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>{element}</Suspense>
    </ErrorBoundary>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastContainer />
      <Routes>
        <Route path="/login" element={withSuspense(<LoginPage />)} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <ErrorBoundary>
                <Layout />
              </ErrorBoundary>
            </ProtectedRoute>
          }
        >
          <Route index element={withSuspense(<DashboardPage />)} />
          <Route path="deals" element={withSuspense(<DealsPage />)} />
          <Route path="deals/:id" element={withSuspense(<DealDetailPage />)} />
          <Route path="properties" element={withSuspense(<PropertiesPage />)} />
          <Route path="properties/:id" element={withSuspense(<PropertyDetailPage />)} />
          <Route path="map" element={withSuspense(<MapPage />)} />
          <Route path="financials/:dealId" element={withSuspense(<FinancialsPage />)} />
          <Route path="comps" element={withSuspense(<CompsPage />)} />
          <Route path="documents" element={withSuspense(<DocumentsPage />)} />
          <Route path="activities" element={withSuspense(<ActivitiesPage />)} />
          <Route path="compare" element={withSuspense(<DealComparePage />)} />
          <Route path="reports" element={withSuspense(<ReportsPage />)} />
          <Route path="settings" element={withSuspense(<SettingsPage />)} />
          <Route path="intelligence" element={withSuspense(<IntelligencePage />)} />
        </Route>
        <Route path="*" element={withSuspense(<NotFoundPage />)} />
      </Routes>
    </BrowserRouter>
  );
}
