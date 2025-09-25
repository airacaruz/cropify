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
    path: '/',
    element: <Layout />,
    errorElement: <NotFoundPage />,
    children: [
      {
        path: 'dashboard',
        element: (
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'analytics',
        element: (
          <ProtectedRoute>
            <AnalyticsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'userrecords',
        element: (
          <ProtectedRoute requiredRole="admin">
            <UserRecordsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'adminrecords',
        element: (
          <ProtectedRoute requiredRole="admin">
            <AdminRecords />
          </ProtectedRoute>
        ),
      },
      {
        path: 'userlogs',
        element: (
          <ProtectedRoute>
            <UserLogs />
          </ProtectedRoute>
        ),
      },
      {
        path: 'usersessions',
        element: (
          <ProtectedRoute>
            <UserSessions />
          </ProtectedRoute>
        ),
      },
      {
        path: 'userreportlogs',
        element: (
          <ProtectedRoute>
            <UserReportLogs />
          </ProtectedRoute>
        ),
      },
      {
        path: 'sensorlogs',
        element: (
          <ProtectedRoute>
            <SensorLogs />
          </ProtectedRoute>
        ),
      },
      {
        path: 'manageapp',
        element: (
          <ProtectedRoute requiredRole="superadmin">
            <ManageAppPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'manageadmin',
        element: (
          <ProtectedRoute requiredRole="superadmin">
            <ManageAdmin />
          </ProtectedRoute>
        ),
      },
      {
        path: 'adminauditlogs',
        element: (
          <ProtectedRoute requiredRole="superadmin">
            <AdminAuditLogs />
          </ProtectedRoute>
        ),
      },
    ],
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