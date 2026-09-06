import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { KeyRound, ArrowLeft, Send, CheckCircle } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

export const ForgotPassword: React.FC = () => {
    const [identifier, setIdentifier] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const { success, error } = useToast();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!identifier.trim()) {
            error('Please enter your email or mobile number.');
            return;
        }

        setIsLoading(true);
        // Simulate password recovery instruction submission
        setTimeout(() => {
            setIsLoading(false);
            setSubmitted(true);
            success('Recovery instructions processed.');
        }, 800);
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="w-full h-full flex items-center justify-center p-4"
        >
            <div
                className="w-full max-w-[440px] rounded-[24px] p-8 relative border border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
                style={{
                    background: 'rgba(12, 17, 18, 0.7)',
                    backdropFilter: 'blur(24px)',
                    WebkitBackdropFilter: 'blur(24px)',
                }}
            >
                <Link
                    to="/login"
                    className="inline-flex items-center gap-1.5 text-xs text-white/50 hover:text-[#00ff88] transition-colors mb-6"
                >
                    <ArrowLeft className="w-3.5 h-3.5" /> Back to Login
                </Link>

                <div className="flex justify-center mb-4">
                    <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center border border-white/[0.08]"
                        style={{
                            background: 'rgba(0,255,136,0.06)',
                            boxShadow: '0 0 20px rgba(0,255,136,0.1)',
                        }}
                    >
                        <KeyRound className="w-6 h-6" style={{ color: '#00ff88' }} />
                    </div>
                </div>

                <div className="text-center mb-6">
                    <h2 className="text-xl font-bold text-white mb-1.5">Reset Password</h2>
                    <p className="text-white/50 text-xs leading-relaxed">
                        Enter your registered email or mobile number to receive password recovery assistance.
                    </p>
                </div>

                {submitted ? (
                    <div className="text-center py-4 space-y-4">
                        <div className="w-12 h-12 rounded-full bg-[#00ff88]/10 text-[#00ff88] flex items-center justify-center mx-auto">
                            <CheckCircle className="w-6 h-6" />
                        </div>
                        <h3 className="text-sm font-semibold text-white">Instructions Sent</h3>
                        <p className="text-xs text-white/60 leading-relaxed">
                            If an account exists for <span className="text-[#00ff88]">{identifier}</span>, password reset instructions or verification details have been generated. You may also update your password directly from your Profile Settings once logged in.
                        </p>
                        <Link
                            to="/login"
                            className="inline-block w-full py-2.5 rounded-xl text-xs font-semibold text-black bg-[#00ff88] hover:brightness-110 transition-all text-center mt-2"
                        >
                            Return to Login
                        </Link>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-xs font-medium text-white/80 mb-1.5" htmlFor="recovery-identifier">
                                Registered Email or Mobile Number
                            </label>
                            <input
                                id="recovery-identifier"
                                type="text"
                                value={identifier}
                                onChange={(e) => setIdentifier(e.target.value)}
                                placeholder="e.g. user@example.com or 9876543210"
                                className="w-full border text-white text-sm rounded-xl focus:ring-1 focus:border-[#00ff88] p-3 transition-all outline-none"
                                style={{
                                    background: 'rgba(8, 11, 11, 0.6)',
                                    borderColor: 'rgba(255,255,255,0.08)',
                                    caretColor: '#00ff88',
                                }}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full font-semibold rounded-xl py-2.5 h-[42px] flex items-center justify-center gap-2 transition-all focus:outline-none disabled:opacity-60"
                            style={{ background: '#00ff88', color: '#040707' }}
                        >
                            {isLoading ? (
                                <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <>
                                    <Send className="w-4 h-4" />
                                    <span>Send Reset Instructions</span>
                                </>
                            )}
                        </button>
                    </form>
                )}
            </div>
        </motion.div>
    );
};
