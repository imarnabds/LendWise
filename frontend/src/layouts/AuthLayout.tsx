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
            <div className={styles.leftPanel}>
                <div className={styles.brand}>
                    <div className={styles.logoMark}>M</div>
                    <h1 className={styles.brandTitle}>MicroLend</h1>
                </div>

                <div className={styles.heroContent}>
                    <h2>Empowering Your Financial Growth</h2>
                    <p>
                        Experience a seamless, secure, and smart lending management platform designed for modern financial needs.
                    </p>
                </div>

                <div className={styles.overlay}></div>
            </div>

            <div className={styles.rightPanel}>
                <div className={`${styles.authContainer} page-fade-in`}>
                    <Outlet />
                </div>
            </div>
        </div>
    );
};
