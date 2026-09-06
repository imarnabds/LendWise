import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getToken, setToken, removeToken, apiGetMe } from '../api';
import { connectSocket, disconnectSocket } from '../services/socket';

export type Role = 'lender' | 'borrower' | null;

const normalizeRole = (roleStr?: string | null): Role => {
    if (!roleStr) return null;
    const r = roleStr.toLowerCase();
    if (r === 'lender') return 'lender';
    if (r === 'borrower') return 'borrower';
    return null;
};

export interface User {
    id: string;
    name: string;
    role: Role;
    email?: string;
    phone: string;
    address?: string;
    emailNotifications?: boolean;
}

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    role: Role;
    isLoaded: boolean;
    login: (userData: User, token: string, rememberMe?: boolean) => void;
    logout: () => void;
    setRoleSelection: (role: Role) => void;
    selectedSignupRole: Role;
    updateUser: (updated: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [selectedSignupRole, setSelectedSignupRole] = useState<Role>(null);
    const [isLoaded, setIsLoaded] = useState(false);

    const logout = useCallback(() => {
        setUser(null);
        removeToken();
        disconnectSocket();
        localStorage.removeItem('mockUser');
        sessionStorage.removeItem('mockUser');
    }, []);

    const updateUser = useCallback((updated: Partial<User>) => {
        setUser((prev) => (prev ? { ...prev, ...updated } : null));
    }, []);

    useEffect(() => {
        // Try to restore session from stored JWT token
        const token = getToken();
        if (token) {
            connectSocket(token);
            apiGetMe()
                .then((data) => {
                    if (data?.user) {
                        setUser({
                            id: data.user._id || data.user.id,
                            name: data.user.name,
                            role: normalizeRole(data.user.role),
                            email: data.user.email,
                            phone: data.user.phone,
                            address: data.user.address || '',
                            emailNotifications: data.user.emailNotifications !== false
                        });
                    } else {
                        logout();
                    }
                })
                .catch(() => {
                    logout();
                })
                .finally(() => setIsLoaded(true));
        } else {
            setIsLoaded(true);
        }
    }, [logout]);

    useEffect(() => {
        const handleAuthExpired = () => {
            logout();
        };

        window.addEventListener('lendwise-auth-expired', handleAuthExpired);
        return () => {
            window.removeEventListener('lendwise-auth-expired', handleAuthExpired);
        };
    }, [logout]);

    const login = (userData: User, token: string, rememberMe: boolean = true) => {
        const normalized = {
            ...userData,
            role: normalizeRole(userData.role)
        };
        setUser(normalized);
        setToken(token, rememberMe);
        connectSocket(token);
    };

    const setRoleSelection = (role: Role) => {
        setSelectedSignupRole(role);
    };

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
                updateUser
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};
