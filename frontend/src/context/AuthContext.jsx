import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('pp_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(u => { if (u) setUser(u); else { setToken(null); localStorage.removeItem('pp_token'); } })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const login = ({ token: t, user: u }) => {
    setToken(t); setUser(u);
    localStorage.setItem('pp_token', t);
  };

  const logout = () => {
    setToken(null); setUser(null);
    localStorage.removeItem('pp_token');
  };

  const updateUser = (u) => setUser(prev => ({ ...prev, ...u }));

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
