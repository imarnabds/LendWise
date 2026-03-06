import React from 'react';
import styles from './Card.module.css';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    title?: string;
    subtitle?: string;
    actions?: React.ReactNode;
    noPadding?: boolean;
}

export const Card: React.FC<CardProps> = ({
    children,
    title,
    subtitle,
    actions,
    noPadding = false,
    className = '',
    ...props
}) => {
    return (
        <div className={`${styles.card} ${className}`} {...props}>
            {(title || subtitle || actions) && (
                <div className={styles.header}>
                    <div className={styles.headerTitles}>
                        {title && <h3 className={styles.title}>{title}</h3>}
                        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
                    </div>
                    {actions && <div className={styles.actions}>{actions}</div>}
                </div>
            )}
            <div className={`${styles.content} ${noPadding ? styles.noPadding : ''}`}>
                {children}
            </div>
        </div>
    );
};
