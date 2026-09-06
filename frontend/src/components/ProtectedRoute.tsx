import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const ProtectedRoute: React.FC = () => {
    const { isAuthenticated, isLoaded } = useAuth();

    if (!isLoaded) {
        return (
            <div className="w-screen h-screen flex items-center justify-center bg-[#080b0b] text-[#00ff88]">
                <div className="w-8 h-8 border-2 border-[#00ff88] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return <Outlet />;
};

interface RoleRouteProps {
    allowedRoles: Array<'lender' | 'borrower'>;
}

export const RoleRoute: React.FC<RoleRouteProps> = ({ allowedRoles }) => {
    const { user, isAuthenticated, isLoaded } = useAuth();

    if (!isLoaded) {
        return (
            <div className="w-screen h-screen flex items-center justify-center bg-[#080b0b] text-[#00ff88]">
                <div className="w-8 h-8 border-2 border-[#00ff88] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!isAuthenticated || !user) {
        return <Navigate to="/login" replace />;
    }

    const userRole = user.role?.toLowerCase() as 'lender' | 'borrower' | null;

    if (!userRole || !allowedRoles.includes(userRole)) {
        if (userRole === 'lender') {
            return <Navigate to="/lender/dashboard" replace />;
        }
        if (userRole === 'borrower') {
            return <Navigate to="/borrower/dashboard" replace />;
        }
        return <Navigate to="/login" replace />;
    }

    return <Outlet />;
};

export const DashboardRedirect: React.FC = () => {
    const { user, isAuthenticated, isLoaded } = useAuth();

    if (!isLoaded) {
        return (
            <div className="w-screen h-screen flex items-center justify-center bg-[#080b0b] text-[#00ff88]">
                <div className="w-8 h-8 border-2 border-[#00ff88] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!isAuthenticated || !user) {
        return <Navigate to="/login" replace />;
    }

    const userRole = user.role?.toLowerCase();

    if (userRole === 'lender') {
        return <Navigate to="/lender/dashboard" replace />;
    }

    if (userRole === 'borrower') {
        return <Navigate to="/borrower/dashboard" replace />;
    }

    return <Navigate to="/login" replace />;
};
