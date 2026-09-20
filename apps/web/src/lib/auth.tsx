import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { fetchMe, login as apiLogin, logout as apiLogout } from './api';

type AuthContextValue = {
  email: string | null;
  shopName: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [email, setEmail] = useState<string | null>(null);
  const [shopName, setShopName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const me = await fetchMe();
      setEmail(me?.email ?? null);
      setShopName(me?.shopName ?? null);
    } catch {
      setEmail(null);
      setShopName(null);
    }
  }, []);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  const login = async (loginEmail: string, password: string) => {
    await apiLogin(loginEmail, password);
    await refresh();
  };

  const logout = async () => {
    await apiLogout();
    setEmail(null);
    setShopName(null);
  };

  return (
    <AuthContext.Provider value={{ email, shopName, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
