/**
 * Auth Context — React Native version
 * Uses SecureStore instead of localStorage for JWT persistence.
 */
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { setToken, removeToken, apiGetMe } from '../api/client';
import * as SecureStore from 'expo-secure-store';

type Role = 'lender' | 'borrower' | null;

export interface User {
  id: string;
  name: string;
  role: Role;
  email?: string;
  phone: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  role: Role;
  isLoaded: boolean;
  login: (userData: User, token: string) => Promise<void>;
  logout: () => Promise<void>;
  setRoleSelection: (role: Role) => void;
  selectedSignupRole: Role;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [selectedSignupRole, setSelectedSignupRole] = useState<Role>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const token = await SecureStore.getItemAsync('lendwise_jwt');
        if (token) {
          const data = await apiGetMe();
          setUser({
            id: data.user._id || data.user.id,
            name: data.user.name,
            role: data.user.role,
            email: data.user.email,
            phone: data.user.phone,
          });
        }
      } catch {
        await removeToken();
      } finally {
        setIsLoaded(true);
      }
    })();
  }, []);

  const login = async (userData: User, token: string) => {
    setUser(userData);
    await setToken(token);
  };

  const logout = async () => {
    setUser(null);
    await removeToken();
  };

  const setRoleSelection = (role: Role) => setSelectedSignupRole(role);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        role: user?.role || null,
        isLoaded,
        login,
        logout,
        selectedSignupRole,
        setRoleSelection,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
