import React from 'react';
import { Bell, User } from 'lucide-react';
import styles from './Header.module.css';

interface HeaderProps {
    title: string;
    userName?: string;
}

export const Header: React.FC<HeaderProps> = ({ title, userName = 'User' }) => {
    return (
        <header className={styles.header}>
            <h2 className={styles.title}>{title}</h2>

            <div className={styles.actions}>
                <button className={styles.iconBtn}>
                    <Bell size={20} />
                    <span className={styles.badge}></span>
                </button>

                <div className={styles.profile}>
                    <div className={styles.avatar}>
                        <User size={18} />
                    </div>
                    <span className={styles.userName}>{userName}</span>
                </div>
            </div>
        </header>
    );
};
