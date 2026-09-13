import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider, useAuth } from './context/AuthContext';
import { UserAuthProvider, useUserAuth } from './context/UserAuthContext';
import { LanguageProvider } from './context/LanguageContext';
import Login from './pages/Login';
import UserLogin from './pages/user/UserLogin';
import UserRegister from './pages/user/UserRegister';
import UserLayout from './components/user/UserLayout';
import UserSplashScreen from './components/user/UserSplashScreen';
import UserDashboard from './pages/user/UserDashboard';
import UserAppointments from './pages/user/UserAppointments';
import UserAppointmentHistory from './pages/user/UserAppointmentHistory';
import UserHealthRecords from './pages/user/UserHealthRecords';
import UserHealthServices from './pages/user/UserHealthServices';
import UserVaccinations from './pages/user/UserVaccinations';
import UserAnnouncements from './pages/user/UserAnnouncements';
import UserNotifications from './pages/user/UserNotifications';
import UserProfile from './pages/user/UserProfile';
import UserEmergencyContact from './pages/user/UserEmergencyContact';
import { routes } from './routes';

// ── Guard: admin login page → skip if already authenticated as admin
function AdminLoginGate() {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Navigate to="/admin/dashboard" replace /> : <Login />;
}

// ── Guard: user login page → skip if already authenticated as user
function UserLoginGate() {
  const { isAuthenticated } = useUserAuth();
  return isAuthenticated ? <Navigate to="/user" replace /> : <UserLogin />;
}

// ── User route wrapper: home is public, features require login
function UserRouteWrapper() {
  return <UserLayout />;
}

// ── Protected feature wrapper: requires login
function ProtectedFeature({ children }) {
  const { isAuthenticated } = useUserAuth();
  const location = useLocation();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  
  return children;
}

function App() {
  const [showSplash, setShowSplash] = useState(true);

  // Check if splash has been shown in this session
  useEffect(() => {
    const splashShown = sessionStorage.getItem('splashShown');
    if (splashShown) {
      setShowSplash(false);
    }
  }, []);

  const handleSplashFinish = () => {
    sessionStorage.setItem('splashShown', 'true');
    setShowSplash(false);
  };

  if (showSplash) {
    return <UserSplashScreen onFinish={handleSplashFinish} />;
  }

  return (
    <AuthProvider>
      <UserAuthProvider>
        <LanguageProvider>
          <Router>
            <Routes>
              {/* ── Public: User auth (optional) ── */}
              <Route path="/login" element={<UserLoginGate />} />
              <Route path="/register" element={<UserRegister />} />

              {/* ── User pages: home public, features require login ── */}
              <Route path="/user" element={<UserRouteWrapper />}>
                <Route index element={<UserDashboard />} />
                <Route path="appointments" element={<ProtectedFeature><UserAppointments /></ProtectedFeature>} />
                <Route path="appointment-history" element={<ProtectedFeature><UserAppointmentHistory /></ProtectedFeature>} />
                <Route path="health-records" element={<ProtectedFeature><UserHealthRecords /></ProtectedFeature>} />
                <Route path="health-services" element={<ProtectedFeature><UserHealthServices /></ProtectedFeature>} />
                <Route path="vaccinations" element={<ProtectedFeature><UserVaccinations /></ProtectedFeature>} />
                <Route path="announcements" element={<UserAnnouncements />} />
                <Route path="notifications" element={<ProtectedFeature><UserNotifications /></ProtectedFeature>} />
                <Route path="emergency-contact" element={<ProtectedFeature><UserEmergencyContact /></ProtectedFeature>} />
                <Route path="profile" element={<ProtectedFeature><UserProfile /></ProtectedFeature>} />
              </Route>

              {/* ── Public: Admin auth ── */}
              <Route path="/admin/login" element={<AdminLoginGate />} />
              <Route path="/" element={<Navigate to="/user" replace />} />

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

              {/* ── Catch-all: go to public user home ── */}
              <Route path="*" element={<Navigate to="/user" replace />} />
            </Routes>
          </Router>
        </LanguageProvider>
      </UserAuthProvider>
    </AuthProvider>
  );
}

export default App;
