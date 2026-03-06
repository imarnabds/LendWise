import React, { useState } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Sidebar } from '../components/Sidebar';
import { Header } from '../components/Header';
import { useAuth } from '../context/AuthContext';
import styles from './DashboardLayout.module.css';

export const DashboardLayout: React.FC = () => {
    const { isAuthenticated, role, user, logout } = useAuth();
    const location = useLocation();
    const [isSidebarHovered, setIsSidebarHovered] = useState(false);

    if (!isAuthenticated || !user || !role) {
        return <Navigate to="/login" replace state={{ from: location }} />;
    }

    const { t } = useTranslation();

    const getPageTitle = (path: string) => {
        const pathParts = path.split('/').filter(Boolean);
        const lastPart = pathParts[pathParts.length - 1] || 'dashboard';

        const titleMap: Record<string, string> = {
            'dashboard': t('common.dashboard', 'Dashboard'),
            'settings': t('common.settings', 'Settings'),
            'add-borrower': t('sidebar.addBorrower', 'Add Borrower'),
            'active-loans': t('sidebar.activeLoans', 'Active Loans'),
            'pending-payments': t('sidebar.pendingPayments', 'Pending Payments'),
            'history': t('sidebar.history', 'Payment History'),
            'payment-history': t('sidebar.history', 'Payment History'),
            'reports': t('sidebar.reports', 'Reports & Analytics'),
            'notifications': t('sidebar.notifications', 'Notifications'),
            'my-loans': t('sidebar.myLoans', 'My Loans'),
            'upcoming-dues': t('sidebar.upcomingDues', 'Upcoming Dues'),
        };

        return titleMap[lastPart] || (lastPart.charAt(0).toUpperCase() + lastPart.slice(1).replace('-', ' '));
    };

    const pageTitle = getPageTitle(location.pathname);

    return (
        <div className={styles.layoutContainer}>
            <div
                className={styles.sidebarWrapper}
                onMouseEnter={() => setIsSidebarHovered(true)}
                onMouseLeave={() => setIsSidebarHovered(false)}
            >
                <Sidebar role={role} onLogout={logout} />
            </div>

            <div className={`${styles.mainContent} ${isSidebarHovered ? styles.contentExpanded : ''}`}>
                <Header title={pageTitle} userName={user.name} />

                <main className={`page-fade-in ${styles.pageArea}`}>
                    <Outlet />
                </main>
            </div>
        </div>
    );
};
