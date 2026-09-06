import React from 'react';
import { HeroSection } from '../components/HeroSection';
import { LoginForm } from '../components/LoginForm';
import { ThemeToggle } from '../components/ThemeToggle';
import { StatsBar } from '../components/StatsBar';

export const Login: React.FC = () => {
  return (
    <div className="w-screen h-screen bg-[#040707] flex items-center justify-center overflow-hidden font-sans relative">
      {/* ── MAIN CONTAINER ── */}
      <div
        className="w-[92vw] max-w-[1550px] h-[90vh] flex flex-col relative overflow-hidden rounded-[32px] border border-white/[0.04] shadow-2xl"
        style={{
          backgroundColor: '#0A0E0F',
        }}
      >
        {/* Background Image Layer */}
        <div
          className="absolute inset-0 pointer-events-none opacity-90"
          style={{
            backgroundImage: "url('/login-page.png')",
            backgroundSize: '105%',
            backgroundPosition: 'left -150px',
            backgroundRepeat: 'no-repeat',
            mixBlendMode: 'screen',
          }}
        />
        <ThemeToggle />

        {/* Subtle dot grid on left half */}
        <div
          className="absolute inset-y-0 left-0 w-[45%] opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)',
            backgroundSize: '24px 24px'
          }}
        />

        {/* ── TWO-COLUMN BODY ── */}
        <div className="flex-1 flex flex-row min-h-0">
          {/* LEFT COLUMN */}
          <div className="w-[45%] h-full relative p-10 pr-0 flex flex-col justify-between z-10">
            {/* Subtle glow behind text */}
            <div className="absolute top-20 left-10 w-64 h-64 bg-[#00ff88]/5 blur-[100px] rounded-full pointer-events-none" />
            <HeroSection />
          </div>

          {/* RIGHT COLUMN */}
          <div className="w-[55%] h-full flex items-center justify-center px-10 py-8 relative z-10">
            <LoginForm />
          </div>
        </div>

        {/* ── BOTTOM STATS STRIP ── */}
        <div className="w-full border-t border-white/[0.04] px-12 shrink-0 bg-[#060809] relative z-20">
          <StatsBar />
        </div>
      </div>
    </div>
  );
};
