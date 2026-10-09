import React, { useContext } from "react";
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from "react-router-dom";
import { AuthProvider, AuthContext } from "./context/AuthContext";
import { ThemeProvider, useTheme } from "./context/ThemeContext";
import ParticleBackground from "./components/ParticleBackground";
import NotificationCenter from "./components/NotificationCenter";
import Home from "./pages/Home";
import SubmitIssue from "./pages/SubmitIssue";
import IssuesList from "./pages/IssuesList";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Profile from "./pages/Profile";
import AdminDashboard from "./pages/AdminDashboard";
import WorkerDashboard from "./pages/WorkerDashboard";
import MyTasks from "./pages/worker/MyTasks";
import TaskDetails from "./pages/worker/TaskDetails";
import TaskExecutionWizard from "./pages/worker/TaskExecutionWizard";
import TaskHistory from "./pages/worker/TaskHistory";
import WorkerProfile from "./pages/worker/WorkerProfile";
import WorkerNotifications from "./pages/worker/WorkerNotifications";
import WorkerHelp from "./pages/worker/WorkerHelp";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import CivicMap from "./pages/CivicMap";
import Notifications from "./pages/Notifications";
import Settings from "./pages/Settings";
import HelpSupport from "./pages/HelpSupport";
import IssueDetails from "./pages/IssueDetails";

import CitizenLayout from "./layouts/CitizenLayout";
import WorkerLayout from "./layouts/WorkerLayout";
import AdminLayout from "./layouts/AdminLayout";
import { DataModeProvider } from "./context/DataModeContext";
import { RealTimeProvider } from "./context/RealTimeContext";
import { DemoDataBanner, DataModeToggle } from "./components/common/DataModeControls";
const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const { themeName, switchTheme, themes } = useTheme();

  return (
    <nav className="navbar">
      <h2 style={{ margin: 0 }}>CivicConnect</h2>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <Link to="/">Home</Link>
        <Link to="/submit">Report Issue</Link>
        <Link to="/issues">View Issues</Link>
        {user ? (
          <>
            {user.role === 'admin' && (
              <Link to="/admin" style={{ color: '#ff9800' }}>Admin Dashboard</Link>
            )}
            <Link to="/submit" state={{ isEmergency: true }}>
              <button style={{
                padding: '0.5rem 1rem',
                background: 'linear-gradient(135deg, #f44336, #d32f2f)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.875rem',
                boxShadow: '0 4px 12px rgba(244, 67, 54, 0.3)',
                animation: 'pulse-red 2s infinite'
              }}>
                🚨 Emergency Report
              </button>
            </Link>

            {/* Notification Center */}
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <NotificationCenter />
            </div>

            {/* Theme Switcher */}
            <div className="theme-switcher" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.875rem', whiteSpace: 'nowrap' }}>Theme</label>
              <select value={themeName} onChange={(e) => switchTheme(e.target.value)}>
                {Object.keys(themes).map((theme) => (
                  <option key={theme} value={theme}>
                    {theme}
                  </option>
                ))}
              </select>
            </div>

            {/* Profile Dropdown */}
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <Link to="/profile" style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 1rem',
                background: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '8px'
              }}>
                <span style={{ color: 'var(--text)' }}>👤 Profile</span>
              </Link>
            </div>

            {/* Logout Button */}
            <button onClick={logout} style={{
              padding: '0.5rem 1rem',
              background: 'rgba(244, 67, 54, 0.1)',
              color: '#f44336',
              border: '1px solid rgba(244, 67, 54, 0.3)',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.875rem'
            }}>
              Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/login">Login</Link>
            <Link to="/register">Register</Link>
          </>
        )}
      </div>
    </nav>
  );
};

const PrivateRoute = ({ children }) => {
  const { user, loading } = useContext(AuthContext);
  if (loading) return <div>Loading...</div>;
  return user ? children : <Navigate to="/login" />;
};

const RoleProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useContext(AuthContext);
  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  if (!allowedRoles.includes(user.role)) return <Navigate to="/" />;
  return children;
};

function AppContent() {
  return (
    <>
      <DemoDataBanner />
      <Routes>
        {/* Public / Citizen Routes */}
        <Route path="/" element={<CitizenLayout><Home /></CitizenLayout>} />
        <Route path="/login" element={<CitizenLayout><Login /></CitizenLayout>} />
        <Route path="/register" element={<CitizenLayout><Register /></CitizenLayout>} />
        <Route path="/signup" element={<Navigate to="/register" replace />} />
        <Route path="/forgot-password" element={<CitizenLayout><ForgotPassword /></CitizenLayout>} />
        <Route path="/reset-password/:token" element={<CitizenLayout><ResetPassword /></CitizenLayout>} />
        <Route
          path="/submit"
          element={
            <PrivateRoute>
              <CitizenLayout><SubmitIssue /></CitizenLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/report"
          element={
            <PrivateRoute>
              <CitizenLayout><SubmitIssue /></CitizenLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/issues"
          element={
            <CitizenLayout><IssuesList /></CitizenLayout>
          }
        />
        <Route
          path="/issues/:id"
          element={
            <CitizenLayout><IssueDetails /></CitizenLayout>
          }
        />
        <Route
          path="/map"
          element={
            <CitizenLayout><CivicMap /></CitizenLayout>
          }
        />
        <Route
          path="/notifications"
          element={
            <PrivateRoute>
              <CitizenLayout><Notifications /></CitizenLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <PrivateRoute>
              <CitizenLayout><Settings /></CitizenLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/help"
          element={
            <CitizenLayout><HelpSupport /></CitizenLayout>
          }
        />
        <Route
          path="/profile"
          element={
            <PrivateRoute>
              <CitizenLayout><Profile /></CitizenLayout>
            </PrivateRoute>
          }
        />

        {/* Admin Routes */}
        <Route
          path="/admin/*"
          element={
            <RoleProtectedRoute allowedRoles={['admin']}>
              <AdminLayout>
                <Routes>
                  <Route path="/" element={<AdminDashboard />} />
                  <Route path="/civic" element={<AdminDashboard initialCenter="civic" />} />
                  <Route path="/citizens" element={<AdminDashboard initialCenter="citizens" />} />
                  <Route path="/report" element={<AdminDashboard initialCenter="report" />} />
                  <Route path="/workers" element={<AdminDashboard initialCenter="workers" />} />
                  <Route path="/intelligence" element={<AdminDashboard initialCenter="intelligence" />} />

                  <Route path="/live-map" element={<AdminDashboard initialCenter="liveMap" />} />
                  <Route path="/live_map" element={<AdminDashboard initialCenter="liveMap" />} />
                  <Route path="/live" element={<AdminDashboard initialCenter="live" />} />
                  <Route path="/reports" element={<AdminDashboard initialCenter="reports" />} />
                  <Route path="/notifications" element={<AdminDashboard initialCenter="notifications" />} />
                  <Route path="/settings" element={<AdminDashboard initialCenter="settings" />} />
                  <Route path="/audit" element={<AdminDashboard initialCenter="settings" />} />
                </Routes>
              </AdminLayout>
            </RoleProtectedRoute>
          }
        />

        {/* Worker Routes */}
        <Route
          path="/worker/*"
          element={
            <RoleProtectedRoute allowedRoles={['worker']}>
              <WorkerLayout>
                <Routes>
                  <Route path="/" element={<WorkerDashboard />} />
                  <Route path="/tasks" element={<MyTasks />} />
                  <Route path="/tasks/:id" element={<TaskDetails />} />
                  <Route path="/tasks/:id/execute" element={<TaskExecutionWizard />} />
                  <Route path="/history" element={<TaskHistory />} />
                  <Route path="/profile" element={<WorkerProfile />} />
                  <Route path="/notifications" element={<WorkerNotifications />} />
                  <Route path="/help" element={<WorkerHelp />} />
                </Routes>
              </WorkerLayout>
            </RoleProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <ThemeProvider>
      <DataModeProvider>
        <AuthProvider>
          <RealTimeProvider>
            <Router>
              <AppContent />
            </Router>
          </RealTimeProvider>
        </AuthProvider>
      </DataModeProvider>
    </ThemeProvider>
  );
}

export default App;
