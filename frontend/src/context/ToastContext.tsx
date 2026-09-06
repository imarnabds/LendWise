import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, XCircle, AlertCircle, X } from 'lucide-react';
import styles from './Toast.module.css';

type ToastType = 'success' | 'error' | 'info';

interface ToastMessage {
    id: string;
    type: ToastType;
    message: string;
}

interface ToastContextType {
    toast: (msgOrType: string, messageOrType?: string) => void;
    addToast: (msgOrType: string, messageOrType?: string) => void;
    success: (message: string) => void;
    error: (message: string) => void;
    info: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) throw new Error('useToast must be used within ToastProvider');
    return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<ToastMessage[]>([]);

    const addToast = useCallback((msgOrType: string, messageOrType?: string) => {
        let type: ToastType = 'info';
        let message = msgOrType;
        if (msgOrType === 'success' || msgOrType === 'error' || msgOrType === 'info') {
            type = msgOrType as ToastType;
            message = messageOrType || '';
        } else if (messageOrType === 'success' || messageOrType === 'error' || messageOrType === 'info') {
            type = messageOrType as ToastType;
        }

        const id = Math.random().toString(36).substr(2, 9);
        setToasts((prev) => [...prev, { id, type, message }]);

        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 4000);
    }, []);

    const toastObj = {
        toast: addToast,
        addToast,
        success: (msg: string) => addToast(msg, 'success'),
        error: (msg: string) => addToast(msg, 'error'),
        info: (msg: string) => addToast(msg, 'info'),
    };

    const removeToast = (id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    };

    return (
        <ToastContext.Provider value={toastObj}>
            {children}
            <div className={styles.toastContainer}>
                {toasts.map((t) => (
                    <div key={t.id} className={`${styles.toast} ${styles[t.type]}`}>
                        <div className={styles.icon}>
                            {t.type === 'success' && <CheckCircle size={20} />}
                            {t.type === 'error' && <XCircle size={20} />}
                            {t.type === 'info' && <AlertCircle size={20} />}
                        </div>
                        <p className={styles.message}>{t.message}</p>
                        <button onClick={() => removeToast(t.id)} className={styles.closeBtn}>
                            <X size={16} />
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
};
