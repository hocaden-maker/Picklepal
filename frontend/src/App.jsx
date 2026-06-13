import { BrowserRouter, Routes, Route, Navigate, NavLink, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import FindPlayers from './pages/FindPlayers';
import MapScreen from './pages/MapScreen';
import Profile from './pages/Profile';
import UserProfile from './pages/UserProfile';
import CreatePost from './pages/CreatePost';
import { MessagesList, ChatView } from './pages/Messages';
import Settings from './pages/Settings';

function TabBar() {
  const { pathname } = useLocation();
  const hide = ['/login', '/register', '/create', '/settings'].some(p => pathname.startsWith(p))
    || pathname.startsWith('/messages/');
  if (hide) return null;

  return (
    <nav className="bottom-tabs">
      <NavLink to="/home" className={({ isActive }) => `tab-btn${isActive ? ' active' : ''}`}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
        Home
      </NavLink>

      <NavLink to="/players" className={({ isActive }) => `tab-btn${isActive ? ' active' : ''}`}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
        Players
      </NavLink>

      <NavLink to="/create" className="tab-fab">
        +
      </NavLink>

      <NavLink to="/map" className={({ isActive }) => `tab-btn${isActive ? ' active' : ''}`}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
          <line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/>
        </svg>
        Map
      </NavLink>

      <NavLink to="/profile" className={({ isActive }) => `tab-btn${isActive ? ' active' : ''}`}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
        </svg>
        Profile
      </NavLink>
    </nav>
  );
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-center" style={{ flex: 1 }}><div className="spinner" style={{ width: 32, height: 32 }} /></div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function AppRoutes() {
  return (
    <div className="app-shell">
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
        <Route path="/players" element={<ProtectedRoute><FindPlayers /></ProtectedRoute>} />
        <Route path="/map" element={<ProtectedRoute><MapScreen /></ProtectedRoute>} />
        <Route path="/create" element={<ProtectedRoute><CreatePost /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/u/:username" element={<ProtectedRoute><UserProfile /></ProtectedRoute>} />
        <Route path="/messages" element={<ProtectedRoute><MessagesList /></ProtectedRoute>} />
        <Route path="/messages/:userId" element={<ProtectedRoute><ChatView /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
      <TabBar />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
