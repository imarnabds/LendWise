import React, { forwardRef } from 'react';
import styles from './Input.module.css';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    helperText?: string;
    fullWidth?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ label, error, helperText, fullWidth = false, className = '', ...props }, ref) => {

        const wrapperClass = [
            styles.wrapper,
            fullWidth ? styles['full-width'] : '',
            className
        ].filter(Boolean).join(' ');

        const inputClass = [
            styles.input,
            error ? styles['input-error'] : ''
        ].filter(Boolean).join(' ');

        return (
            <div className={wrapperClass}>
                {label && <label className={styles.label}>{label}</label>}
                <input ref={ref} className={inputClass} {...props} />
                {error && <span className={styles.errorText}>{error}</span>}
                {helperText && !error && <span className={styles.helperText}>{helperText}</span>}
            </div>
        );
    }
);

Input.displayName = 'Input';
