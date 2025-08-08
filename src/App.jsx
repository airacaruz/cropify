import './App.css';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import NotFoundPage from './pages/NotFoundPage';
import DashboardPage from './pages/Dashboard/DashboardPage';
import AnalyticsPage from './pages/Dashboard/AnalyticsPage';
import RegisterPage from './pages/RegisterPage';
import Test from './Test';
import ProtectedRoute from "./components/ProtectedRoute";
import UserRecordsPage from './pages/Dashboard/UserRecords';
import UserLogs from './pages/Dashboard/logs/UserLogs';
import UserSessions from './pages/Dashboard/logs/UserSessions';
import AdminRecords from './pages/Dashboard/AdminRecords';
import UserReportLogs from './pages/Dashboard/logs/UserReportLogs';
import SensorLogs from './pages/Dashboard/logs/SensorLogs';
import LoginLinkPage from './pages/js/LoginLinkPage';
import ManageAppPage from './pages/Dashboard/ManageAppPage';
const routes = [
  {
    path: '/',
    element: <LoginPage />, // 👈 this is now 100% exclusive to '/'
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
          <ProtectedRoute>
            <UserRecordsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'adminrecords',
        element: (
          <ProtectedRoute>
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
          <ProtectedRoute>
            <ManageAppPage />
          </ProtectedRoute>
        ),
      },
          
    ],
  },
];


const router = createBrowserRouter(routes);

function App() {
  return <RouterProvider router={router} />;
}

export default App;
