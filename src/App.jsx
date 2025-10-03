import { lazy, Suspense } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import './App.css';
import Layout from './components/Layout';
import ProtectedRoute from "./components/ProtectedRoute";

// Eager load critical components (landing, login, register)
import LandingPage from './pages/Landing/LandingPage';
import LoginPage from './pages/LoginPage';
import NotFoundPage from './pages/NotFoundPage';
import RegisterPage from './pages/RegisterPage';

// Lazy load dashboard and heavy components
const Test = lazy(() => import('./Test'));
const DashboardPage = lazy(() => import('./pages/Dashboard/DashboardPage'));
const AnalyticsPage = lazy(() => import('./pages/Dashboard/AnalyticsPage'));
const UserRecordsPage = lazy(() => import('./pages/Dashboard/UserRecords'));
const AdminRecords = lazy(() => import('./pages/Dashboard/AdminRecords'));
const ManageAppPage = lazy(() => import('./pages/Dashboard/ManageAppPage'));
const ManageAdmin = lazy(() => import('./pages/Dashboard/ManageAdmin'));
const AdminAuditLogs = lazy(() => import('./pages/Dashboard/AdminAuditLogs'));
const SensorLogs = lazy(() => import('./pages/Dashboard/logs/SensorLogs'));
const UserLogs = lazy(() => import('./pages/Dashboard/logs/UserLogs'));
const UserReportLogs = lazy(() => import('./pages/Dashboard/logs/UserReportLogs'));
const UserSessions = lazy(() => import('./pages/Dashboard/logs/UserSessions'));
const LoginLinkPage = lazy(() => import('./pages/js/LoginLinkPage'));

// Loading component
const LoadingSpinner = () => (
  <div style={{ 
    display: 'flex', 
    justifyContent: 'center', 
    alignItems: 'center', 
    height: '50vh',
    fontSize: '18px' 
  }}>
    Loading...
  </div>
);

const routes = [
  {
    path: '/',
    element: <LandingPage />, // Landing page
  },
  {
    path: '/login',
    element: <LoginPage />, // Login page
  },
  {
    path: '/register',
    element: <RegisterPage />,
  },
  {
    path: '/test',
    element: (
      <Suspense fallback={<LoadingSpinner />}>
        <Test />
      </Suspense>
    ),
  },
  {
    path: '/verify-link',
    element: (
      <Suspense fallback={<LoadingSpinner />}>
        <LoginLinkPage />
      </Suspense>
    ),
  },
  {
    path: '/dashboard',
    element: (
      <ProtectedRoute>
        <Layout>
          <Suspense fallback={<LoadingSpinner />}>
            <DashboardPage />
          </Suspense>
        </Layout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/analytics',
    element: (
      <ProtectedRoute>
        <Layout>
          <Suspense fallback={<LoadingSpinner />}>
            <AnalyticsPage />
          </Suspense>
        </Layout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/userrecords',
    element: (
      <ProtectedRoute requiredRole="admin">
        <Layout>
          <Suspense fallback={<LoadingSpinner />}>
            <UserRecordsPage />
          </Suspense>
        </Layout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/adminrecords',
    element: (
      <ProtectedRoute requiredRole="admin">
        <Layout>
          <Suspense fallback={<LoadingSpinner />}>
            <AdminRecords />
          </Suspense>
        </Layout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/userlogs',
    element: (
      <ProtectedRoute>
        <Layout>
          <Suspense fallback={<LoadingSpinner />}>
            <UserLogs />
          </Suspense>
        </Layout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/usersessions',
    element: (
      <ProtectedRoute>
        <Layout>
          <Suspense fallback={<LoadingSpinner />}>
            <UserSessions />
          </Suspense>
        </Layout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/userreportlogs',
    element: (
      <ProtectedRoute>
        <Layout>
          <Suspense fallback={<LoadingSpinner />}>
            <UserReportLogs />
          </Suspense>
        </Layout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/sensorlogs',
    element: (
      <ProtectedRoute>
        <Layout>
          <Suspense fallback={<LoadingSpinner />}>
            <SensorLogs />
          </Suspense>
        </Layout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/manageapp',
    element: (
      <ProtectedRoute requiredRole="superadmin">
        <Layout>
          <Suspense fallback={<LoadingSpinner />}>
            <ManageAppPage />
          </Suspense>
        </Layout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/manageadmin',
    element: (
      <ProtectedRoute requiredRole="superadmin">
        <Layout>
          <Suspense fallback={<LoadingSpinner />}>
            <ManageAdmin />
          </Suspense>
        </Layout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/adminauditlogs',
    element: (
      <ProtectedRoute requiredRole="superadmin">
        <Layout>
          <Suspense fallback={<LoadingSpinner />}>
            <AdminAuditLogs />
          </Suspense>
        </Layout>
      </ProtectedRoute>
    ),
  },
  // Add a catch-all route for 404s
  {
    path: '*',
    element: <NotFoundPage />,
  },
];

const router = createBrowserRouter(routes);

function App() {
  return <RouterProvider router={router} />;
}

export default App;