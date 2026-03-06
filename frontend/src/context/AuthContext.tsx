import React, { createContext, useContext, useState, useEffect } from 'react';
import { setToken, removeToken, apiGetMe } from '../api';

type Role = 'lender' | 'borrower' | null;

interface User {
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
    login: (userData: User, token: string) => void;
    logout: () => void;
    setRoleSelection: (role: Role) => void;
    selectedSignupRole: Role;
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

    useEffect(() => {
        // Try to restore session from JWT token
        const token = localStorage.getItem('token');
        if (token) {
            apiGetMe()
                .then((data) => {
                    setUser({
                        id: data.user._id || data.user.id,
                        name: data.user.name,
                        role: data.user.role,
                        email: data.user.email,
                        phone: data.user.phone
                    });
                })
                .catch(() => {
                    // Token is invalid/expired — clear it
                    removeToken();
                    localStorage.removeItem('mockUser');
                })
                .finally(() => setIsLoaded(true));
        } else {
            // Fallback: check for old mock user
            const storedUser = localStorage.getItem('mockUser');
            if (storedUser) {
                setUser(JSON.parse(storedUser));
            }
            setIsLoaded(true);
        }
    }, []);

    const login = (userData: User, token: string) => {
        setUser(userData);
        setToken(token);
        localStorage.setItem('mockUser', JSON.stringify(userData));
    };

    const logout = () => {
        setUser(null);
        removeToken();
        localStorage.removeItem('mockUser');
    };

    const setRoleSelection = (role: Role) => {
        setSelectedSignupRole(role);
    };

    if (!isLoaded) return null;

    return (
        <AuthContext.Provider
            value={{
                user,
                isAuthenticated: !!user,
                role: user?.role || null,
                login,
                logout,
                selectedSignupRole,
                setRoleSelection
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};
