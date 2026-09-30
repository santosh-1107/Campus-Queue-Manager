import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import StudentJoin from './pages/StudentJoin';
import LiveQueueBoard from './pages/LiveQueueBoard';
import StaffPanel from './pages/StaffPanel';
import AdminDashboard from './pages/AdminDashboard';
import { useAuth } from './context/AuthContext';

function Protected({ children, roles }) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    const searchParams = new URLSearchParams(location.search);
    const matchPath = location.pathname.match(/^\/join\/([^/]+)/);
    const serviceFromPath = matchPath ? matchPath[1] : null;
    const service = searchParams.get('service') || serviceFromPath;

    if (service) {
      try {
        sessionStorage.setItem('pending_join_service', service);
      } catch (err) {
        // ignore sessionStorage errors
      }
      return <Navigate to={`/login?service=${encodeURIComponent(service)}`} replace />;
    }
    return <Navigate to="/login" replace />;
  }

  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/join" element={<StudentJoin />} />
        <Route path="/join/:serviceId" element={<StudentJoin />} />
        <Route path="/board/:serviceId" element={<LiveQueueBoard />} />
        <Route
          path="/staff"
          element={
            <Protected roles={['staff', 'admin']}>
              <StaffPanel />
            </Protected>
          }
        />
        <Route
          path="/admin"
          element={
            <Protected roles={['admin', 'staff']}>
              <AdminDashboard />
            </Protected>
          }
        />
      </Routes>
    </div>
  );
}
