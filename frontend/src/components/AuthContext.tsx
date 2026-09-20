'use client';
import { createContext, useContext, useState, type ReactNode } from 'react';
import { pinLogin, type AuthState } from '@/lib/api';

interface AuthContextValue {
  auth: AuthState | null;
  login: (operatorCode: string, pin: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// Public identifier for this kiosk's site. Not a secret — it just selects
// which tenant's operators can log in here. Set in frontend/.env.local.
const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID ?? '';

export function AuthProvider({ children }: { children: ReactNode }) {
  // Token lives only in memory: it vanishes on reload / lock, and a stored
  // XSS payload can't steal it from localStorage.
  const [auth, setAuth] = useState<AuthState | null>(null);

  const login = async (operatorCode: string, pin: string) => {
    if (!TENANT_ID) throw new Error('This terminal is not configured (NEXT_PUBLIC_TENANT_ID).');
    setAuth(await pinLogin(TENANT_ID, operatorCode.trim().toUpperCase(), pin));
  };

  const logout = () => setAuth(null);

  return <AuthContext.Provider value={{ auth, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
