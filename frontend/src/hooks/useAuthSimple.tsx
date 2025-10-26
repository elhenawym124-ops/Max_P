import React, { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { getApiUrl } from '../config/environment';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  companyId: string;
  company: {
    id: string;
    name: string;
    plan: string;
  };
}

interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  companyName: string;
  phone?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials | User, token?: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user;

  useEffect(() => {
    const checkAuth = async () => {
      console.log('🔍 [AuthProvider] Starting auth check...');
      try {
        const token = localStorage.getItem('accessToken');
        console.log('🔍 [AuthProvider] Token exists:', !!token);
        console.log('🔍 [AuthProvider] Token preview:', token ? token.substring(0, 20) + '...' : 'null');

        if (token) {
          // Call real API to get current user
          console.log('🔍 [AuthProvider] Making /auth/me request...');
          const response = await fetch(`${getApiUrl()}/auth/me`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          console.log('🔍 [AuthProvider] Response status:', response.status);

          if (response.ok) {
            const data = await response.json();
            console.log('🔍 [AuthProvider] Response data:', data);

            if (data.success) {
              console.log('✅ [AuthProvider] Setting user:', data.data);
              setUser(data.data);
            } else {
              throw new Error(data.message);
            }
          } else {
            throw new Error('فشل في التحقق من المصادقة');
          }
        } else {
          console.log('🔐 [AuthProvider] No token found');
        }
      } catch (error) {
        console.error('❌ [AuthProvider] Auth check failed:', error);
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
      } finally {
        console.log('🔍 [AuthProvider] Setting loading to false');
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (credentials: LoginCredentials | User, token?: string) => {
    console.log('🔍 [AuthProvider] Starting login...');
    try {
      // If user and token are provided directly (for Super Admin)
      if (token && typeof credentials === 'object' && 'id' in credentials) {
        console.log('🔍 [AuthProvider] Direct login with token');
        localStorage.setItem('accessToken', token);
        setUser(credentials as User);
        return;
      }

      // Normal login flow
      const loginCredentials = credentials as LoginCredentials;
      console.log('🔍 [AuthProvider] Normal login for:', loginCredentials.email);

      const response = await fetch(`${getApiUrl()}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: loginCredentials.email,
          password: loginCredentials.password
        })
      });

      console.log('🔍 [AuthProvider] Login response status:', response.status);
      const data = await response.json();
      console.log('🔍 [AuthProvider] Login response data:', data);

      if (response.ok && data.success) {
        // Store tokens
        console.log('✅ [AuthProvider] Login successful, storing token');
        localStorage.setItem('accessToken', data.data.token);

        // Set user data
        console.log('✅ [AuthProvider] Setting user data:', data.data.user);
        setUser(data.data.user);
      } else {
        throw new Error(data.message || 'فشل في تسجيل الدخول');
      }
    } catch (error) {
      console.error('❌ [AuthProvider] Login error:', error);
      throw error;
    }
  };

  const register = async (data: RegisterData) => {
    try {
      const response = await fetch(`${getApiUrl()}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'فشل في إنشاء الحساب');
      }

      // Store token and user data
      localStorage.setItem('accessToken', result.data.token);
      setUser(result.data.user);

      return result;
    } catch (error: any) {
      console.error('Registration error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (token) {
        // Call logout API
        await fetch(`${getApiUrl()}/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Always clear local storage and user state
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      setUser(null);
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    login,
    register,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
