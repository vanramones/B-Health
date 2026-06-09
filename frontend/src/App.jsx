import React, { useState, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider, useAuth } from './context/AuthContext';
import { UserAuthProvider, useUserAuth } from './context/UserAuthContext';
import Login from './pages/Login';
import SplashScreen from './components/SplashScreen';
import { routes } from './routes';

// User pages
import UserLayout from './components/user/UserLayout';
import UserDashboard from './pages/user/UserDashboard';
import UserAppointments from './pages/user/UserAppointments';
import UserHealthRecords from './pages/user/UserHealthRecords';
import UserVaccinations from './pages/user/UserVaccinations';
import UserProfile from './pages/user/UserProfile';
import UserAnnouncements from './pages/user/UserAnnouncements';
import UserEmergencyContact from './pages/user/UserEmergencyContact';
import UserHealthServices from './pages/user/UserHealthServices';
import UserAppointmentHistory from './pages/user/UserAppointmentHistory';
import UserLogin from './pages/user/UserLogin';
import UserRegister from './pages/user/UserRegister';
import UserNotifications from './pages/user/UserNotifications';

// ── Guard: admin login page → skip if already authenticated as admin
function AdminLoginGate() {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Navigate to="/admin/dashboard" replace /> : <Login />;
}

// ── Guard: user login/register → skip if already authenticated as user
function UserLoginGate({ children }) {
  const { isAuthenticated } = useUserAuth();
  return isAuthenticated ? <Navigate to="/user" replace /> : children;
}

// ── Guard: user protected pages
function ProtectedUserRoute({ children }) {
  const { isAuthenticated } = useUserAuth();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

// ── Smart catch-all: /admin/* → /admin/login, everything else → /login
function SmartCatchAll() {
  const { pathname } = useLocation();
  return <Navigate to={pathname.startsWith('/admin') ? '/admin/login' : '/login'} replace />;
}

const isAdminPath = window.location.pathname.startsWith('/admin');

function App() {
  const [splash, setSplash] = useState(!isAdminPath);
  const handleSplashDone = useCallback(() => setSplash(false), []);

  return (
    <>
      {splash && <SplashScreen onFinish={handleSplashDone} />}
      <UserAuthProvider>
        <AuthProvider>
          <Router>
            <Routes>

              {/* ── Public: User auth ── */}
              <Route path="/login"    element={<UserLoginGate><UserLogin /></UserLoginGate>} />
              <Route path="/register" element={<UserLoginGate><UserRegister /></UserLoginGate>} />

              {/* ── Public: Admin auth ── */}
              <Route path="/admin/login" element={<AdminLoginGate />} />

              {/* ── Protected: Admin pages ── */}
              {routes.map((route) => (
                <Route
                  key={route.path}
                  path={route.path}
                  element={
                    <ProtectedRoute>
                      <Layout title={route.title}>
                        <route.component />
                      </Layout>
                    </ProtectedRoute>
                  }
                />
              ))}

              {/* ── Protected: User pages ── */}
              <Route path="/user" element={<ProtectedUserRoute><UserLayout /></ProtectedUserRoute>}>
                <Route index element={<UserDashboard />} />
                <Route path="appointments"       element={<UserAppointments />} />
                <Route path="appointment-history" element={<UserAppointmentHistory />} />
                <Route path="health-records"     element={<UserHealthRecords />} />
                <Route path="health-services"    element={<UserHealthServices />} />
                <Route path="vaccinations"       element={<UserVaccinations />} />
                <Route path="emergency-contact"  element={<UserEmergencyContact />} />
                <Route path="announcements"      element={<UserAnnouncements />} />
                <Route path="profile"            element={<UserProfile />} />
                <Route path="notifications"       element={<UserNotifications />} />
              </Route>

              {/* ── Catch-all ── */}
              <Route path="*" element={<SmartCatchAll />} />

            </Routes>
          </Router>
        </AuthProvider>
      </UserAuthProvider>
    </>
  );
}

export default App;
