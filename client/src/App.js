import React, { useContext } from "react";
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from "react-router-dom";
import { AuthProvider, AuthContext } from "./context/AuthContext";
import { ThemeProvider, useTheme } from "./context/ThemeContext";
import ParticleBackground from "./components/ParticleBackground";
import NotificationBell from "./components/NotificationBell";
import Home from "./pages/Home";
import SubmitIssue from "./pages/SubmitIssue";
import IssuesList from "./pages/IssuesList";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Profile from "./pages/Profile";
import AdminDashboard from "./pages/AdminDashboard";
import WorkerDashboard from "./pages/WorkerDashboard";


const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const { themeName, switchTheme, themes } = useTheme();

  return (
    <nav className="navbar">
      <h2 style={{ margin: 0 }}>Civic Issues Portal</h2>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <Link to="/">Home</Link>
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
                🚨 Quick Issue
              </button>
            </Link>

            {/* Notification Bell - Proper Alignment */}
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <NotificationBell />
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
                <span style={{ color: 'var(--text)' }}>{user.username}</span>
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

function AppContent() {
  const { user } = useContext(AuthContext);
  return (
    <>
      {/* Themed Background */}
      <div className="bg-layered" />

      {/* Particle Background */}
      <ParticleBackground />

      <div style={{ position: 'relative', zIndex: 10 }}>
        <Navbar />
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/issues" element={<IssuesList />} />
            <Route
              path="/submit"
              element={
                <PrivateRoute>
                  <SubmitIssue />
                </PrivateRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <PrivateRoute>
                  <Profile />
                </PrivateRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <PrivateRoute>
                  {user && user.role === 'admin' ? <AdminDashboard /> : <Navigate to="/" />}
                </PrivateRoute>
              }
            />
            <Route
              path="/worker"
              element={
                <PrivateRoute>
                  {user && user.role === 'worker' ? <WorkerDashboard /> : <Navigate to="/" />}
                </PrivateRoute>
              }
            />
          </Routes>
        </main>
      </div>
    </>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <AppContent />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
