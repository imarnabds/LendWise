import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import styles from './Modal.module.css';
import { Button } from './Button';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    footer?: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({
    isOpen,
    onClose,
    title,
    children,
    footer
}) => {
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div
                className={styles.modal}
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
            >
                <div className={styles.header}>
                    <h2 className={styles.title}>{title}</h2>
                    <Button variant="ghost" size="sm" onClick={onClose} className={styles.closeBtn}>
                        <X size={20} />
                    </Button>
                </div>
                <div className={styles.content}>
                    {children}
                </div>
                {footer && <div className={styles.footer}>{footer}</div>}
            </div>
        </div>
    );
};
