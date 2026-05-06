'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiFetch } from '../lib/api';

interface User {
  id: string;
  email: string;
  fullName: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      // Load auth from localStorage
      const storedUser = localStorage.getItem('kairos-user');
      const storedToken = localStorage.getItem('kairos-token');

      if (storedUser && storedToken) {
        const parsedUser = JSON.parse(storedUser) as User;
        setUser(parsedUser);
        setToken(storedToken);
        // Trigger bootstrap for already logged in users
        bootstrapSystem();
      }
    } catch (error) {
      console.error('Failed to restore auth from localStorage:', error);
      // Clear invalid persisted auth state to unblock UI boot
      localStorage.removeItem('kairos-user');
      localStorage.removeItem('kairos-token');
      setUser(null);
      setToken(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!token) return;

    // Refresh token every 1 hour
    const interval = setInterval(async () => {
      try {
        const res = await apiFetch<{ token: string; data?: { token: string } }>('/api/v1/auth/refresh', {
          method: 'POST',
        });
        const newToken = (res as any).data?.token ?? res.token;
        if (newToken) {
          setToken(newToken);
          localStorage.setItem('kairos-token', newToken);
          console.log('Token refreshed automatically');
        }
      } catch (error) {
        console.error('Failed to refresh token:', error);
        // If refresh fails with 401, logout
        if ((error as any).code === 'AUTH_ERROR' || (error as any).status === 401) {
          logout();
        }
      }
    }, 3600000); // 1 hour

    return () => clearInterval(interval);
  }, [token]);

  const bootstrapSystem = async () => {
    try {
      await apiFetch('/api/v1/system/bootstrap', { method: 'POST' });
      console.log('System bootstrap triggered');
    } catch (error) {
      console.error('Failed to trigger system bootstrap:', error);
    }
  };

  const login = (user: User, token: string) => {
    setUser(user);
    setToken(token);
    localStorage.setItem('kairos-user', JSON.stringify(user));
    localStorage.setItem('kairos-token', token);
    
    // Set cookie for middleware
    const expires = new Date();
    expires.setTime(expires.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
    document.cookie = `kairos-token=${token};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
    
    // Trigger bootstrap after login
    bootstrapSystem();
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('kairos-user');
    localStorage.removeItem('kairos-token');
    
    // Clear cookie
    document.cookie = 'kairos-token=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;SameSite=Lax';
  };

  const value = {
    user,
    token,
    isAuthenticated: !!token,
    login,
    logout,
    isLoading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

