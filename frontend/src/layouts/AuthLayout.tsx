import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import styles from './AuthLayout.module.css';

export const AuthLayout: React.FC = () => {
    const { isAuthenticated, role } = useAuth();

    if (isAuthenticated && role) {
        return <Navigate to={`/${role}/dashboard`} replace />;
    }

    return (
        <div className={styles.container}>
            <div className={`${styles.authContainer} page-fade-in`}>
                <Outlet />
            </div>
        </div>
    );
};
