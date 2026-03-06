import React from 'react';
import { NavLink } from 'react-router-dom';
import {
    LayoutDashboard,
    Users,
    Wallet,
    Clock,
    History,
    BarChart3,
    Bell,
    Settings,
    LogOut,
    Archive
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import styles from './Sidebar.module.css';

interface SidebarProps {
    role: 'lender' | 'borrower';
    onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ role, onLogout }) => {
    const { t } = useTranslation();

    const lenderLinks = [
        { to: '/lender/dashboard', icon: <LayoutDashboard size={20} />, label: t('common.dashboard', 'Dashboard') },
        { to: '/lender/add-borrower', icon: <Users size={20} />, label: t('sidebar.addBorrower', 'Add Borrower') },
        { to: '/lender/active-loans', icon: <Wallet size={20} />, label: t('sidebar.activeLoans', 'Active Loans') },
        { to: '/lender/pending-payments', icon: <Clock size={20} />, label: t('sidebar.pendingPayments', 'Pending Payments') },
        { to: '/lender/history', icon: <History size={20} />, label: t('sidebar.history', 'Payment History') },
        { to: '/lender/reports', icon: <BarChart3 size={20} />, label: t('sidebar.reports', 'Reports & Analytics') },
        { to: '/lender/borrower-history', icon: <Archive size={20} />, label: "Borrower's History" },
        { to: '/lender/notifications', icon: <Bell size={20} />, label: t('sidebar.notifications', 'Notifications') },
        { to: '/settings', icon: <Settings size={20} />, label: t('common.settings', 'Settings') },
    ];

    const borrowerLinks = [
        { to: '/borrower/dashboard', icon: <LayoutDashboard size={20} />, label: t('common.dashboard', 'Dashboard') },
        { to: '/borrower/my-loans', icon: <Wallet size={20} />, label: t('sidebar.myLoans', 'My Loans') },
        { to: '/borrower/payment-history', icon: <History size={20} />, label: t('sidebar.history', 'Payment History') },
        { to: '/borrower/upcoming-dues', icon: <Clock size={20} />, label: t('sidebar.upcomingDues', 'Upcoming Dues') },
        { to: '/borrower/notifications', icon: <Bell size={20} />, label: t('sidebar.notifications', 'Notifications') },
        { to: '/settings', icon: <Settings size={20} />, label: t('common.settings', 'Settings') },
    ];

    const links = role === 'lender' ? lenderLinks : borrowerLinks;

    return (
        <div className={styles.sidebar}>
            <div className={styles.logoContainer}>
                <div className={styles.logoIcon}>M</div>
                <h1 className={styles.logoText}>MicroLend</h1>
            </div>

            <nav className={styles.nav}>
                {links.map((link) => (
                    <NavLink
                        key={link.to}
                        to={link.to}
                        className={({ isActive }) =>
                            `${styles.navLink} ${isActive ? styles.active : ''}`
                        }
                    >
                        {link.icon}
                        <span className={styles.navLabel}>{link.label}</span>
                    </NavLink>
                ))}
            </nav>

            <div className={styles.footer}>
                <button className={styles.logoutBtn} onClick={onLogout}>
                    <LogOut size={20} />
                    <span>{t('common.logout', 'Logout')}</span>
                </button>
            </div>
        </div>
    );
};
