import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { User, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { loginSchema, LoginFormValues } from '../utils/validators';
import { apiLogin } from '../api';
import { useAuth } from '../context/AuthContext';
import { SocialLogin } from './SocialLogin';
import { useToast } from '../context/ToastContext';

export const LoginForm: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { login } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormValues) => {
    try {
      const res = await apiLogin({
        mobileOrEmail: data.mobileOrEmail,
        password: data.password,
      });

      const userRole = res.user.role?.toLowerCase();
      login(
        {
          id: res.user.id || res.user._id,
          name: res.user.name,
          role: userRole === 'lender' ? 'lender' : 'borrower',
          email: res.user.email,
          phone: res.user.phone,
        },
        res.token,
        !!data.rememberMe
      );

      addToast('success', res.message || 'Logged in successfully!');

      if (userRole === 'lender') {
        navigate('/lender/dashboard');
      } else {
        navigate('/borrower/dashboard');
      }
    } catch (error: any) {
      addToast('error', error.message || 'Login failed. Please check your credentials.');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6, delay: 0.2 }}
      className="w-full h-full flex items-center justify-center"
    >
      {/* ── GLASSMORPHISM LOGIN CARD ── */}
      <div
        className="w-full max-w-[460px] rounded-[28px] px-8 py-6 relative border border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
        style={{
          background: 'rgba(12, 17, 18, 0.6)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
        }}
      >
        {/* Subtle green glow behind card */}
        <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full pointer-events-none" style={{ background: 'rgba(0,255,136,0.04)', filter: 'blur(60px)' }} />

        {/* Lock icon */}
        <div className="flex justify-center mb-3 relative z-10">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center border border-white/[0.08]"
            style={{
              background: 'rgba(0,255,136,0.06)',
              boxShadow: '0 0 20px rgba(0,255,136,0.1)',
            }}
          >
            <Lock className="w-5 h-5" style={{ color: '#00ff88', filter: 'drop-shadow(0 0 6px rgba(0,255,136,0.5))' }} />
          </div>
        </div>

        {/* Header */}
        <div className="text-center mb-4 relative z-10">
          <h2 className="text-lg font-bold text-white mb-1">Welcome Back!</h2>
          <p className="text-white/40 text-xs">Log in to your account to continue</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5 relative z-10">
          {/* Email or Mobile Number */}
          <div>
            <label className="block text-xs font-medium text-white/80 mb-1.5" htmlFor="mobileOrEmail">
              Email or Mobile Number
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-white/30 group-focus-within:text-[#00ff88] transition-colors">
                <User className="w-4 h-4" />
              </div>
              <input
                id="mobileOrEmail"
                type="text"
                inputMode="email"
                placeholder="Enter email or 10-digit mobile number"
                {...register('mobileOrEmail')}
                className="w-full border text-white text-sm rounded-xl focus:ring-1 focus:border-[#00ff88] block pl-11 p-3 transition-all outline-none"
                style={{
                  background: 'rgba(8, 11, 11, 0.6)',
                  borderColor: 'rgba(255,255,255,0.08)',
                  caretColor: '#00ff88',
                }}
                onFocus={(e) => { e.target.style.borderColor = '#00ff88'; e.target.style.boxShadow = '0 0 0 1px rgba(0,255,136,0.3)'; }}
                onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; e.target.style.boxShadow = 'none'; }}
              />
            </div>
            {errors.mobileOrEmail && <p className="mt-1.5 text-xs text-red-500">{errors.mobileOrEmail.message}</p>}
          </div>

          {/* Password */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-xs font-medium text-white/80" htmlFor="password">
                Password
              </label>
              <Link to="/forgot-password" className="text-xs font-medium hover:brightness-125 transition-all" style={{ color: '#00ff88' }}>
                Forgot Password?
              </Link>
            </div>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-white/30 group-focus-within:text-[#00ff88] transition-colors">
                <Lock className="w-4 h-4" />
              </div>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                {...register('password')}
                className="w-full border text-white text-sm rounded-xl focus:ring-1 block pl-11 pr-11 p-3 transition-all outline-none"
                style={{
                  background: 'rgba(8, 11, 11, 0.6)',
                  borderColor: 'rgba(255,255,255,0.08)',
                  caretColor: '#00ff88',
                }}
                onFocus={(e) => { e.target.style.borderColor = '#00ff88'; e.target.style.boxShadow = '0 0 0 1px rgba(0,255,136,0.3)'; }}
                onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; e.target.style.boxShadow = 'none'; }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-white/30 hover:text-white transition-colors focus:outline-none"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && <p className="mt-1.5 text-xs text-red-500">{errors.password.message}</p>}
          </div>

          {/* Remember me */}
          <div className="flex items-center justify-between">
            <label className="flex items-center cursor-pointer group">
              <input
                type="checkbox"
                {...register('rememberMe')}
                className="w-4 h-4 rounded cursor-pointer accent-[#00ff88]"
                style={{ background: 'rgba(8,11,11,0.6)', borderColor: 'rgba(255,255,255,0.08)' }}
              />
              <span className="ml-2 text-sm text-white/80 group-hover:text-[#00ff88] transition-colors">
                Remember me
              </span>
            </label>
            <span className="text-xs text-white/25">Keep me signed in</span>
          </div>

          {/* Sign In button */}
          <motion.button
            whileHover={{ scale: 1.01, boxShadow: '0 0 20px rgba(0,255,136,0.3)' }}
            whileTap={{ scale: 0.99 }}
            type="submit"
            disabled={isSubmitting}
            className="w-full font-semibold rounded-xl py-2.5 h-[42px] flex items-center justify-center relative transition-all focus:outline-none disabled:opacity-70 disabled:cursor-not-allowed"
            style={{ background: '#00ff88', color: '#040707' }}
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-[#040707] border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight className="w-4 h-4 absolute right-5" />
              </>
            )}
          </motion.button>
        </form>

        {/* Social login */}
        <SocialLogin />

        {/* Register link */}
        <div className="mt-4 text-center relative z-10">
          <span className="text-white/40 text-sm">Don't have an account? </span>
          <Link
            to="/signup"
            className="text-sm font-semibold hover:brightness-125 transition-all inline-flex items-center gap-1 group"
            style={{ color: '#00ff88' }}
          >
            Join LendWise
            <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </motion.div>
  );
};
