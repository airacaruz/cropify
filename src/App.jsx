import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import './App.css';
import Test from './Test';
import Layout from './components/Layout';
import ProtectedRoute from "./components/ProtectedRoute";
import AdminAuditLogs from './pages/Dashboard/AdminAuditLogs';
import AdminRecords from './pages/Dashboard/AdminRecords';
import AnalyticsPage from './pages/Dashboard/AnalyticsPage';
import DashboardPage from './pages/Dashboard/DashboardPage';
import ManageAdmin from './pages/Dashboard/ManageAdmin';
import ManageAppPage from './pages/Dashboard/ManageAppPage';
import UserRecordsPage from './pages/Dashboard/UserRecords';
import SensorLogs from './pages/Dashboard/logs/SensorLogs';
import UserLogs from './pages/Dashboard/logs/UserLogs';
import UserReportLogs from './pages/Dashboard/logs/UserReportLogs';
import UserSessions from './pages/Dashboard/logs/UserSessions';
import LoginPage from './pages/LoginPage';
import NotFoundPage from './pages/NotFoundPage';
import RegisterPage from './pages/RegisterPage';
import LoginLinkPage from './pages/js/LoginLinkPage';

const routes = [
  {
    path: '/',
    element: <LoginPage />, // Main login page
  },
  {
    path: '/register',
    element: <RegisterPage />,
  },
  {
    path: '/test',
    element: <Test />,
  },
  {
    path: '/verify-link',
    element: <LoginLinkPage />,
  },
  {
    path: '/dashboard',
    element: (
      <ProtectedRoute>
        <Layout>
          <DashboardPage />
        </Layout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/analytics',
    element: (
      <ProtectedRoute>
        <Layout>
          <AnalyticsPage />
        </Layout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/userrecords',
    element: (
      <ProtectedRoute requiredRole="admin">
        <Layout>
          <UserRecordsPage />
        </Layout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/adminrecords',
    element: (
      <ProtectedRoute requiredRole="admin">
        <Layout>
          <AdminRecords />
        </Layout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/userlogs',
    element: (
      <ProtectedRoute>
        <Layout>
          <UserLogs />
        </Layout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/usersessions',
    element: (
      <ProtectedRoute>
        <Layout>
          <UserSessions />
        </Layout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/userreportlogs',
    element: (
      <ProtectedRoute>
        <Layout>
          <UserReportLogs />
        </Layout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/sensorlogs',
    element: (
      <ProtectedRoute>
        <Layout>
          <SensorLogs />
        </Layout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/manageapp',
    element: (
      <ProtectedRoute requiredRole="superadmin">
        <Layout>
          <ManageAppPage />
        </Layout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/manageadmin',
    element: (
      <ProtectedRoute requiredRole="superadmin">
        <Layout>
          <ManageAdmin />
        </Layout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/adminauditlogs',
    element: (
      <ProtectedRoute requiredRole="superadmin">
        <Layout>
          <AdminAuditLogs />
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