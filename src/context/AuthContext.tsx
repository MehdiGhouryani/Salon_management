import React, { createContext, useContext, useState, useEffect } from 'react';
import { ClientAuthSession } from '../types/admin';

export interface ServerAuthProfile {
  authenticated: boolean;
  isLoading: boolean;
  user: {
    id: string;
    phone: string;
    fullName: string;
    email: string | null;
    platformRole: string;
    status: string;
  } | null;
  salonMemberships: Array<{
    salonId: string;
    role: string;
    status: string;
    permissions: string[];
  }>;
}

export interface AuthContextType {
  serverAuth: ServerAuthProfile;
  checkServerSession: () => Promise<void>;
  serverLogout: () => Promise<void>;
  clientSession: ClientAuthSession;
  setClientSession: (session: ClientAuthSession) => void;
  logoutClientSession: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [clientSession, setClientSession] = useState<ClientAuthSession>({
    isLoggedIn: false,
    phone: '',
    name: '',
  });

  const [serverAuth, setServerAuth] = useState<ServerAuthProfile>({
    authenticated: false,
    isLoading: true,
    user: null,
    salonMemberships: [],
  });

  const checkServerSession = async () => {
    try {
      const res = await fetch('/api/auth/me', {
        headers: { 'X-NobatAra-Client': 'web' },
      });
      if (res.ok) {
        const data = await res.json();
        // Phase 11 fix: /api/auth/me returns 200 with authenticated:false for
        // anonymous visitors — trust the FLAG, not the HTTP status. The old
        // code marked every visitor as authenticated:true (user:null), which
        // broke production persona gating and fired authenticated API calls
        // that always 401'd.
        setServerAuth({
          authenticated: data.authenticated === true && Boolean(data.user),
          isLoading: false,
          user: data.authenticated === true ? data.user : null,
          salonMemberships: data.authenticated === true ? data.salonMemberships || [] : [],
        });
      } else {
        setServerAuth({
          authenticated: false,
          isLoading: false,
          user: null,
          salonMemberships: [],
        });
      }
    } catch {
      setServerAuth({
        authenticated: false,
        isLoading: false,
        user: null,
        salonMemberships: [],
      });
    }
  };

  const serverLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'X-NobatAra-Client': 'web' },
      });
    } catch {
      // Ignore network errors
    } finally {
      setServerAuth({
        authenticated: false,
        isLoading: false,
        user: null,
        salonMemberships: [],
      });
    }
  };

  const logoutClientSession = () => {
    setClientSession({ isLoggedIn: false, phone: '', name: '' });
  };

  useEffect(() => {
    checkServerSession();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        serverAuth,
        checkServerSession,
        serverLogout,
        clientSession,
        setClientSession,
        logoutClientSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
