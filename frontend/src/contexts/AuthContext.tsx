import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { getAuthSession, logoutUser } from '../utils/authAPI';
import type { AuthSession } from '../types/AuthSession';

interface AuthContextValue {
  authSession: AuthSession;
  isAuthenticated: boolean;
  isLoading: boolean;
  refreshAuthState: () => Promise<void>;
  logout: () => Promise<void>;
}

const anon: AuthSession = { isAuthenticated: false, userName: null, email: null, roles: [] };
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authSession, setAuthSession] = useState<AuthSession>(anon);
  const [isLoading, setIsLoading] = useState(true);

  const refreshAuthState = useCallback(async () => {
    try   { setAuthSession(await getAuthSession()); }
    catch { setAuthSession(anon); }
    finally { setIsLoading(false); }
  }, []);

  const logout = useCallback(async () => {
    await logoutUser();
    setAuthSession(anon);
    setIsLoading(false);
  }, []);

  useEffect(() => { void refreshAuthState(); }, [refreshAuthState]);

  return (
    <AuthContext.Provider value={{
      authSession, isAuthenticated: authSession.isAuthenticated, isLoading, refreshAuthState, logout
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
