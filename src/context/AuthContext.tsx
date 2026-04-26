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
    // Load auth from localStorage
    const storedUser = localStorage.getItem('kairos-user');
    const storedToken = localStorage.getItem('kairos-token');

    if (storedUser && storedToken) {
      setUser(JSON.parse(storedUser));
      setToken(storedToken);
      // Trigger bootstrap for already logged in users
      bootstrapSystem();
    }
    setIsLoading(false);
  }, []);

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
    // Trigger bootstrap after login
    bootstrapSystem();
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('kairos-user');
    localStorage.removeItem('kairos-token');
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
