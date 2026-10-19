import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider, useAuth } from './context/AuthContext';
import { UserAuthProvider, useUserAuth } from './context/UserAuthContext';
import { LanguageProvider } from './context/LanguageContext';
import Login from './pages/Login';
import { routes } from './routes';

// ── User pages ──
import UserLayout from './components/user/UserLayout';
import UserLogin from './pages/user/UserLogin';
import UserRegister from './pages/user/UserRegister';
import UserDashboard from './pages/user/UserDashboard';
import UserAppointments from './pages/user/UserAppointments';
import UserHealthRecords from './pages/user/UserHealthRecords';
import UserVaccinations from './pages/user/UserVaccinations';
import UserAnnouncements from './pages/user/UserAnnouncements';
import UserNotifications from './pages/user/UserNotifications';
import UserProfile from './pages/user/UserProfile';
import UserHealthServices from './pages/user/UserHealthServices';
import UserEmergencyContact from './pages/user/UserEmergencyContact';
import UserAppointmentHistory from './pages/user/UserAppointmentHistory';

// ── Guard: admin login page → skip if already authenticated ──
function AdminLoginGate() {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Navigate to="/admin/dashboard" replace /> : <Login />;
}

// ── Guard: user login → skip if already logged in ──
function UserLoginGate() {
  const { currentUser } = useUserAuth();
  return currentUser ? <Navigate to="/user/dashboard" replace /> : <UserLogin />;
}

// ── Protected user route ──
function UserRoute({ children }) {
  const { currentUser } = useUserAuth();
  return currentUser ? children : <Navigate to="/user/login" replace />;
}

const isMobile = Capacitor.isNativePlatform();

function App() {
  if (isMobile) {
    // ── Mobile app: user routes only ──
    return (
      <LanguageProvider>
      <UserAuthProvider>
        <Router>
          <Routes>
            <Route path="/user/login"    element={<UserLoginGate />} />
            <Route path="/user/register" element={<UserRegister />} />
            <Route
              path="/user"
              element={<UserRoute><UserLayout /></UserRoute>}
            >
              <Route index                    element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard"         element={<UserDashboard />} />
              <Route path="appointments"      element={<UserAppointments />} />
              <Route path="health-records"    element={<UserHealthRecords />} />
              <Route path="vaccinations"      element={<UserVaccinations />} />
              <Route path="announcements"     element={<UserAnnouncements />} />
              <Route path="notifications"     element={<UserNotifications />} />
              <Route path="profile"           element={<UserProfile />} />
              <Route path="health-services"   element={<UserHealthServices />} />
              <Route path="emergency-contact" element={<UserEmergencyContact />} />
              <Route path="appointment-history" element={<UserAppointmentHistory />} />
            </Route>
            <Route path="*" element={<Navigate to="/user/login" replace />} />
          </Routes>
        </Router>
      </UserAuthProvider>
      </LanguageProvider>
    );
  }

  // ── Web browser: admin routes only ──
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/admin/login" element={<AdminLoginGate />} />
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
          <Route path="*" element={<Navigate to="/admin/login" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
