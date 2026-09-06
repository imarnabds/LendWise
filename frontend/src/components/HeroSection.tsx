import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Users } from 'lucide-react';
import { FeatureCard } from './FeatureCard';

export const HeroSection: React.FC = () => {
  return (
    <div className="w-full h-full flex flex-col relative z-10 overflow-visible">
      {/* ── LOGO ── */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
        className="flex items-center gap-3 flex-shrink-0"
      >
        <img
          src="/lendwise-logo.png"
          alt="LendWise Logo"
          className="w-10 h-10 rounded-xl object-contain"
        />
        <div>
          <h1 className="text-xl font-bold text-white leading-none">LendWise</h1>
          <span className="text-[#9BA4A7] text-[10px] leading-none mt-0.5 block">Smart Lending. Smarter Future.</span>
        </div>
      </motion.div>

      {/* ── HEADING ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.15 }}
        className="mt-6 flex-shrink-0"
      >
        <h2 className="text-[2.8rem] font-bold text-white leading-[1.1] tracking-tight">
          Lend Smarter.<br />
          Grow <span style={{ color: '#00ff88' }}>Together.</span>
        </h2>
      </motion.div>

      {/* ── DESCRIPTION ── */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="text-[#9BA4A7] text-sm max-w-[340px] mt-3 leading-relaxed flex-shrink-0"
      >
        LendWise is your trusted platform for seamless
        lending and borrowing. Secure, transparent
        and built for your financial growth.
      </motion.p>

      {/* Spacer for background illustration to show through */}
      <div className="flex-1 w-full min-h-[140px] mt-2 mb-2" />

      {/* ── FEATURE CARDS ROW ── */}
      <div className="flex flex-row justify-between items-start gap-6 w-full flex-shrink-0 pb-1 overflow-visible">
        <div className="flex-1 max-w-[200px]">
          <FeatureCard icon={Shield} title="Secure & Safe" subtitle="Bank-level security to protect your data" delay={0.5} />
        </div>
        <div className="ml-auto flex-shrink-0 translate-x-12 md:translate-x-16">
          <FeatureCard icon={Users} title="Lend & Empower" subtitle="Help others grow and earn together" delay={0.7} />
        </div>
      </div>




    </div>
  );
};
