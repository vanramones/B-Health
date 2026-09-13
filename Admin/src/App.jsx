import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import { routes } from './routes';

// ── Guard: admin login page → skip if already authenticated as admin
function AdminLoginGate() {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Navigate to="/admin/dashboard" replace /> : <Login />;
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* ── Public: Admin login ── */}
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

          {/* ── Catch-all: go to admin login ── */}
          <Route path="*" element={<Navigate to="/admin/login" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
