import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import {
    Shield, Eye, LayoutDashboard, CheckCircle2,
    ArrowRight, Lock, TrendingUp, CreditCard, ChevronRight,
    UserCheck, Users, Send, RefreshCw, BadgeCheck, Landmark, Handshake, Wifi,
    Layers, Headphones, Linkedin, Facebook, Instagram, ShieldCheck
} from 'lucide-react';

import logoImg from '../assets/logo_w.png';
import { Modal } from '../components/Modal';

// Animations
const fadeInUpTo = {
    hidden: { opacity: 0, y: 24 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const } }
};

const staggerContainer = {
    hidden: { opacity: 1 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.15 }
    }
};

// ── Truthful Capability Cards for Platform Overview ──
const COLOR_MAP: Record<string, { icon: string; border: string; bg: string; glow: string; text: string }> = {
    neon:    { icon: 'text-[#00FF9C]', border: 'border-[#00FF9C]/20', bg: 'bg-[#00FF9C]/5',  glow: 'hover:shadow-[0_0_30px_rgba(0,255,156,0.12)]', text: 'text-[#00FF9C]' },
    blue:    { icon: 'text-blue-400',  border: 'border-blue-400/20',  bg: 'bg-blue-400/5',   glow: 'hover:shadow-[0_0_30px_rgba(96,165,250,0.12)]', text: 'text-blue-400' },
    violet:  { icon: 'text-violet-400', border: 'border-violet-400/20', bg: 'bg-violet-400/5', glow: 'hover:shadow-[0_0_30px_rgba(167,139,250,0.12)]', text: 'text-violet-400' },
    emerald: { icon: 'text-emerald-400', border: 'border-emerald-400/20', bg: 'bg-emerald-400/5', glow: 'hover:shadow-[0_0_30px_rgba(52,211,153,0.12)]', text: 'text-emerald-400' },
};

const CapabilityCard: React.FC<{
    icon: React.ReactNode;
    title: string;
    description: string;
    tag: string;
    color: string;
    delay: number;
}> = ({ icon, title, description, tag, color, delay }) => {
    const c = COLOR_MAP[color] || COLOR_MAP.neon;

    return (
        <motion.div
            variants={fadeInUpTo}
            transition={{ delay }}
            whileHover={{ y: -6, scale: 1.02 }}
            className={`relative bg-[#111715]/80 backdrop-blur-md border border-white/5 hover:border-white/10 ${c.glow} rounded-2xl p-6 lg:p-8 flex flex-col items-center text-center transition-all duration-500 group`}
        >
            <div className={`w-14 h-14 rounded-xl ${c.bg} ${c.icon} border ${c.border} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300`}>
                {icon}
            </div>
            <div className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-2">{tag}</div>
            <h3 className={`text-xl font-bold ${c.text} tracking-tight mb-3`}>{title}</h3>
            <p className="text-sm text-gray-400 font-normal leading-relaxed">{description}</p>
        </motion.div>
    );
};

export const Landing: React.FC = () => {
    const navigate = useNavigate();
    const { user, setRoleSelection } = useAuth();

    const [activeModal, setActiveModal] = useState<'about' | 'privacy' | 'support' | 'guide' | null>(null);

    const handleRoleSelect = (role: 'lender' | 'borrower') => {
        setRoleSelection(role);
        navigate(`/signup?role=${role.toUpperCase()}`);
    };

    return (
        <div className="bg-darkbg min-h-screen text-white font-sans overflow-x-hidden selection:bg-neon selection:text-black relative">

            {/* Ambient Side Lighting */}
            <div className="fixed top-0 -left-64 w-[500px] h-screen bg-neon/[0.15] blur-[150px] pointer-events-none z-0" />
            <div className="fixed top-0 -right-64 w-[500px] h-screen bg-neon/[0.15] blur-[150px] pointer-events-none z-0" />

            {/* -- NAVBAR -- */}
            <nav className="flex justify-between items-center py-6 px-8 max-w-7xl mx-auto backdrop-blur-md sticky top-0 z-50">
                <div className="flex items-center gap-2.5 cursor-default -ml-2">
                    <img src={logoImg} alt="LendWise Logo" className="h-12 w-auto object-contain drop-shadow-[0_0_10px_rgba(0,255,156,0.3)]" />
                    <span className="text-2xl font-extrabold tracking-tight text-white mb-0.5">
                        Lend<span className="text-[#00FF9C]">Wise</span>
                    </span>
                </div>
                <div className="hidden lg:flex gap-8 text-sm text-gray-300 font-medium items-center">
                    <a href="#how-it-works" className="hover:text-white transition-colors duration-200 cursor-pointer">How It Works</a>
                    <a href="#solutions" className="hover:text-white transition-colors duration-200 cursor-pointer">Solutions</a>
                    <a href="#features" className="hover:text-white transition-colors duration-200 cursor-pointer">Features</a>
                    <a href="#security" className="hover:text-white transition-colors duration-200 cursor-pointer">Security</a>
                </div>
                <div className="flex items-center gap-4 text-sm font-medium">
                    {user ? (
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="bg-[#00FF9C] text-black hover:bg-[#00e68d] px-5 py-2.5 rounded-lg transition-all duration-300 font-semibold border border-[#00FF9C] flex items-center gap-2"
                        >
                            Go to Dashboard <ArrowRight size={16} />
                        </button>
                    ) : (
                        <>
                            <button onClick={() => navigate('/login')} className="bg-transparent border border-[#00FF9C] text-[#00FF9C] hover:bg-[#00FF9C]/10 px-5 py-2 rounded-lg transition-all duration-300">
                                Log In
                            </button>
                            <button onClick={() => navigate('/signup')} className="bg-[#00FF9C] text-black hover:bg-[#00e68d] px-5 py-2 rounded-lg transition-all duration-300 font-semibold border border-[#00FF9C]">
                                Sign Up
                            </button>
                        </>
                    )}
                </div>
            </nav>

            {/* -- HERO -- */}
            <section className="relative pt-24 pb-32 px-4 max-w-7xl mx-auto flex flex-col items-center text-center">

                {/* FLOATING CAPABILITY BADGES (DESKTOP ONLY) */}
                <motion.div
                    initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 1, delay: 0.2 }}
                    className="absolute top-[25%] left-4 lg:left-8 xl:left-16 hidden lg:flex z-10"
                >
                    <div className="animate-float">
                        <motion.div
                            whileHover={{ scale: 1.05 }}
                            className="flex flex-col items-start p-5 glassmorphism rounded-2xl shadow-lg border border-white/10 group cursor-default transition-all duration-300 hover:border-neon/30 hover:glow-neon hover:bg-white/5 pointer-events-auto"
                        >
                            <div className="text-xl font-bold text-white mb-1 tracking-tight">Authoritative Scoping</div>
                            <div className="text-xs text-gray-400 font-medium">MongoDB Single Source of Truth</div>
                        </motion.div>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 1, delay: 0.4 }}
                    className="absolute top-[40%] right-4 lg:right-8 xl:right-16 hidden lg:flex z-10"
                >
                    <div className="animate-float-delayed">
                        <motion.div
                            whileHover={{ scale: 1.05 }}
                            className="flex flex-col items-start p-5 glassmorphism rounded-2xl shadow-lg border border-white/10 group cursor-default transition-all duration-300 hover:border-neon/30 hover:glow-neon hover:bg-white/5 pointer-events-auto"
                        >
                            <div className="text-xl font-bold text-neon mb-1 tracking-tight">Socket.IO Sync</div>
                            <div className="text-xs text-gray-400 font-medium">Real-Time Event Reconciliation</div>
                        </motion.div>
                    </div>
                </motion.div>

                <motion.div
                    initial="hidden"
                    animate="visible"
                    variants={staggerContainer}
                    className="flex flex-col items-center relative z-10"
                >
                    {/* Spotlight Glow behind text */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-neon/10 blur-[120px] rounded-full pointer-events-none" />

                    <motion.div variants={fadeInUpTo} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-gray-300 mb-8 tracking-wide">
                        <span className="w-2 h-2 rounded-full bg-neon animate-pulse" />
                        Production-Ready Peer Lending Platform
                    </motion.div>

                    <motion.h1 variants={fadeInUpTo} className="text-5xl md:text-7xl font-semibold tracking-tight text-white mb-6 leading-tight max-w-4xl">
                        Smart Lending. <br/> Smarter <span className="text-neon">Future.</span>
                    </motion.h1>

                    <motion.p variants={fadeInUpTo} className="text-lg text-gray-400 max-w-2xl mb-10 leading-relaxed">
                        Experience a professional, secure, and transparent platform for two-sided financial relationships. Empowering financial clarity through verified peer connections.
                    </motion.p>

                    <motion.div variants={fadeInUpTo} className="flex flex-col sm:flex-row gap-4 mb-12">
                        <button onClick={() => handleRoleSelect('borrower')} className="bg-neon text-darkbg px-6 py-3 rounded-md font-semibold text-sm hover:scale-[1.03] hover:shadow-[0_0_20px_rgba(0,255,156,0.5)] transition-all duration-300 flex items-center justify-center gap-2">
                            Get Started as Borrower <ArrowRight size={16} />
                        </button>
                        <button onClick={() => handleRoleSelect('lender')} className="bg-white/5 text-white px-6 py-3 rounded-md font-semibold text-sm border border-white/10 hover:bg-white/10 hover:scale-[1.03] transition-all duration-300">
                            Start Lending
                        </button>
                    </motion.div>

                    <motion.div variants={fadeInUpTo} className="flex gap-8 text-sm text-gray-500 font-medium flex-wrap justify-center">
                        <span className="flex items-center gap-2"><Lock size={14} className="text-neon"/> Protected Role-Based Access</span>
                        <span className="flex items-center gap-2"><CheckCircle2 size={14} className="text-neon"/> Real-Time Socket Events</span>
                    </motion.div>

                </motion.div>

                {/* Dashboard Showcase Mockup */}
                <motion.div
                    initial={{ opacity: 0, y: 100 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1, delay: 0.4, type: "spring", stiffness: 50 }}
                    className="relative w-full max-w-5xl mt-24"
                >
                    <motion.div
                        animate={{ y: [-10, 10, -10] }}
                        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                        className="glassmorphism p-4 rounded-xl shadow-[0_20px_40px_rgba(0,0,0,0.4)] relative border border-white/5"
                    >
                        {/* Mock UI */}
                        <div className="w-full bg-surface rounded-lg h-[400px] border border-white/5 flex flex-col p-6 shadow-inner">
                            <div className="flex justify-between items-center border-b border-white/10 pb-4 mb-6">
                                <div className="space-y-1 text-left">
                                    <div className="text-xs text-gray-500 font-semibold tracking-wider uppercase">Platform Architecture</div>
                                    <div className="text-2xl font-bold text-white">LendWise Financial Dashboard</div>
                                </div>
                                <div className="text-neon text-xs font-medium flex items-center gap-1.5 bg-neon/10 px-3 py-1 rounded-full border border-neon/20">
                                    <span className="w-2 h-2 rounded-full bg-neon animate-pulse" /> Live Sync
                                </div>
                            </div>
                            <div className="flex gap-4 h-full items-end pb-2">
                                {[40, 70, 45, 90, 65, 80, 100].map((h, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ height: 0 }}
                                        whileInView={{ height: `${h}%` }}
                                        viewport={{ once: true }}
                                        transition={{ duration: 0.8, delay: i * 0.1, ease: 'easeOut' }}
                                        className={`flex-1 rounded-t-sm ${i === 6 ? 'bg-neon shadow-[0_0_15px_rgba(0,255,156,0.3)]' : 'bg-white/10'}`}
                                    />
                                ))}
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            </section>

            {/* -- LIFECYCLE SECTION -- */}
            <section id="how-it-works" className="py-24 px-4 max-w-7xl mx-auto scroll-mt-24">
                <div className="mb-20 text-center">
                    <h2 className="text-3xl lg:text-4xl font-semibold mb-4 text-white">Transparent Lifecycle</h2>
                    <p className="text-gray-400">A clear, automated 5-step process from loan setup to final settlement.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-12 md:gap-4 relative">
                    <div className="hidden md:block absolute top-[40px] left-[10%] right-[10%] h-[1px] bg-white/10 z-0" />

                    {[
                        { icon: UserCheck, title: "Register", desc: "Create your Lender or Borrower account securely." },
                        { icon: Users, title: "Relationship", desc: "Establish verified two-sided financial identity." },
                        { icon: Send, title: "Disbursement", desc: "Principal amount and schedule are recorded in MongoDB." },
                        { icon: RefreshCw, title: "Repayment", desc: "Borrower submits payments with real-time socket events." },
                        { icon: BadgeCheck, title: "Settlement", desc: "Authoritative balance reconciles to zero and closes." },
                    ].map((item, idx) => {
                        const Icon = item.icon;
                        return (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: "-50px" }}
                            transition={{ delay: idx * 0.1, duration: 0.6 }}
                            className="flex flex-col items-center text-center relative z-10 group"
                        >
                            <div className="w-20 h-20 rounded-full glassmorphism flex items-center justify-center text-neon font-bold text-xl mb-6 group-hover:scale-110 group-hover:border-neon/30 group-hover:shadow-[0_0_15px_rgba(0,255,156,0.2)] transition-all duration-300 bg-[#0B0F0E]">
                                <Icon size={28} />
                            </div>
                            <h4 className="text-lg font-semibold text-white mb-2">{item.title}</h4>
                            <p className="text-sm text-gray-500 leading-relaxed px-2">{item.desc}</p>
                        </motion.div>
                        );
                    })}
                </div>
            </section>

            {/* -- SOLUTIONS CARDS -- */}
            <section id="solutions" className="py-24 px-4 bg-[#0F1312] scroll-mt-24">
                <div className="max-w-6xl mx-auto">
                    <div className="mb-16 text-center">
                        <h2 className="text-3xl font-semibold mb-4 text-white">Tailored Solutions</h2>
                        <p className="text-gray-400">Choose the path that aligns with your financial role.</p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                        <motion.div
                            initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }}
                            variants={fadeInUpTo}
                            whileHover={{ y: -5, scale: 1.01 }}
                            className="glassmorphism p-10 rounded-2xl flex flex-col items-start shadow-lg group"
                        >
                            <div className="w-12 h-12 rounded-full border border-white/10 bg-white/5 flex items-center justify-center text-neon mb-6 group-hover:border-neon/30 group-hover:bg-neon/5 transition-colors">
                                <CreditCard size={24} />
                            </div>
                            <h3 className="text-2xl font-semibold mb-6 text-white">For Borrowers</h3>
                            <ul className="space-y-4 mb-10 w-full text-gray-300">
                                <li className="flex items-center gap-3"><CheckCircle2 size={18} className="text-neon"/> Dedicated My Loans & Dues dashboards</li>
                                <li className="flex items-center gap-3"><CheckCircle2 size={18} className="text-neon"/> Clear repayment schedules without hidden fees</li>
                                <li className="flex items-center gap-3"><CheckCircle2 size={18} className="text-neon"/> Instant payment receipts & PDF reports</li>
                            </ul>
                            <button onClick={() => handleRoleSelect('borrower')} className="mt-auto flex items-center gap-2 text-sm font-bold text-black hover:bg-black hover:text-[#00FF9C] transition-colors group-hover:glow-neon glow-neon px-4 py-2 rounded-md bg-white w-full justify-between">
                                Get Started as Borrower <ChevronRight size={16} />
                            </button>
                        </motion.div>

                        <motion.div
                            initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }}
                            variants={fadeInUpTo} transition={{ delay: 0.15 }}
                            whileHover={{ y: -5, scale: 1.01 }}
                            className="glassmorphism p-10 rounded-2xl flex flex-col items-start shadow-lg group"
                        >
                            <div className="w-12 h-12 rounded-full border border-white/10 bg-white/5 flex items-center justify-center text-neon mb-6 group-hover:border-neon/30 group-hover:bg-neon/5 transition-colors">
                                <TrendingUp size={24} />
                            </div>
                            <h3 className="text-2xl font-semibold mb-6 text-white">For Lenders</h3>
                            <ul className="space-y-4 mb-10 w-full text-gray-300">
                                <li className="flex items-center gap-3"><CheckCircle2 size={18} className="text-neon"/> Authoritative portfolio tracking</li>
                                <li className="flex items-center gap-3"><CheckCircle2 size={18} className="text-neon"/> IDOR-protected borrower management</li>
                                <li className="flex items-center gap-3"><CheckCircle2 size={18} className="text-neon"/> Downloadable XLSX Excel spreadsheets</li>
                            </ul>
                            <button onClick={() => handleRoleSelect('lender')} className="mt-auto flex items-center gap-2 text-sm font-bold text-black hover:bg-black hover:text-[#00FF9C] transition-colors group-hover:glow-neon px-4 py-2 rounded-md bg-white w-full justify-between">
                                Start Lending <ChevronRight size={16} />
                            </button>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* -- HIGHLIGHTS & SECURITY SECTION -- */}
            <section id="features" className="py-32 w-full relative overflow-hidden scroll-mt-24">
                <div className="absolute top-[10%] left-[-15%] w-[40vw] h-[40vw] max-w-[800px] max-h-[800px] bg-neon/10 rounded-full blur-[150px] pointer-events-none" />
                <div className="absolute bottom-[5%] right-[-15%] w-[40vw] h-[40vw] max-w-[700px] max-h-[700px] bg-[#00FF9C]/5 rounded-full blur-[120px] pointer-events-none" />

                <div className="flex flex-col items-center gap-24 px-6 max-w-7xl mx-auto relative z-10">
                    <motion.div
                        initial="hidden" whileInView="visible" viewport={{ once: true }} variants={staggerContainer}
                        className="flex flex-col items-center w-full"
                    >
                        <motion.div variants={fadeInUpTo} className="text-center w-full max-w-2xl mb-16">
                            <h2 className="text-4xl lg:text-5xl font-bold mb-6 leading-tight text-white tracking-tight">Built for Performance <br/> & <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon to-[#00a86b]">Security</span></h2>
                            <p className="text-gray-400 text-lg mx-auto">Everything you need to manage peer-to-peer debt with full confidence.</p>
                        </motion.div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 w-full text-left">
                            <motion.div variants={fadeInUpTo} className="group bg-[#111715]/80 backdrop-blur-md border border-white/40 hover:border-neon/50 p-8 rounded-3xl overflow-hidden transition-all duration-500 hover:shadow-[0_0_40px_rgba(0,255,156,0.15)] hover:-translate-y-2 relative">
                                <div className="mb-8 inline-flex p-4 rounded-2xl bg-white/5 text-neon border border-white/10 group-hover:border-neon/40 group-hover:bg-neon/10 transition-all duration-300 shadow-lg"><Shield size={28}/></div>
                                <h4 className="text-xl font-bold text-white mb-3 relative z-10">JWT Role Isolation</h4>
                                <p className="text-gray-400 text-sm leading-relaxed relative z-10">Every API call strictly verifies token identity (`req.user.id`), preventing unauthorized cross-tenant data access.</p>
                            </motion.div>

                            <motion.div variants={fadeInUpTo} className="group bg-[#111715]/80 backdrop-blur-md border border-white/40 hover:border-neon/50 p-8 rounded-3xl overflow-hidden transition-all duration-500 hover:shadow-[0_0_40px_rgba(0,255,156,0.15)] hover:-translate-y-2 relative">
                                <div className="mb-8 inline-flex p-4 rounded-2xl bg-white/5 text-neon border border-white/10 group-hover:border-neon/40 group-hover:bg-neon/10 transition-all duration-300 shadow-lg"><Eye size={28}/></div>
                                <h4 className="text-xl font-bold text-white mb-3 relative z-10">Unmatched Transparency</h4>
                                <p className="text-gray-400 text-sm leading-relaxed relative z-10">No hidden fees or surprise charges. Every single term, rate, and repayment balance is distinctively clear from day one.</p>
                            </motion.div>

                            <motion.div variants={fadeInUpTo} className="group bg-[#111715]/80 backdrop-blur-md border border-white/40 hover:border-neon/50 p-8 rounded-3xl overflow-hidden transition-all duration-500 hover:shadow-[0_0_40px_rgba(0,255,156,0.15)] hover:-translate-y-2 relative">
                                <div className="mb-8 inline-flex p-4 rounded-2xl bg-white/5 text-neon border border-white/10 group-hover:border-neon/40 group-hover:bg-neon/10 transition-all duration-300 shadow-lg"><LayoutDashboard size={28}/></div>
                                <h4 className="text-xl font-bold text-white mb-3 relative z-10">Intuitive Dashboards</h4>
                                <p className="text-gray-400 text-sm leading-relaxed relative z-10">Manage your entire investment portfolio or upcoming loan dues through a beautifully simple dark fintech interface.</p>
                            </motion.div>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* -- TRUTHFUL CAPABILITY CARDS SECTION -- */}
            <section id="security" className="py-24 px-4 relative overflow-hidden scroll-mt-24">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-neon/5 blur-[150px] rounded-full pointer-events-none" />

                <motion.div
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-80px" }}
                    variants={staggerContainer}
                    className="max-w-6xl mx-auto relative z-10"
                >
                    <motion.div variants={fadeInUpTo} className="text-center mb-16">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-neon/5 border border-neon/15 text-xs font-semibold text-neon mb-6 tracking-wide">
                            <span className="w-1.5 h-1.5 rounded-full bg-neon animate-pulse inline-block" />
                            Platform Architecture & Capabilities
                        </div>
                        <h2 className="text-3xl lg:text-4xl font-semibold mb-4 text-white tracking-tight">Verified Engineering Foundations</h2>
                        <p className="text-gray-400 max-w-lg mx-auto">Core technology features powering the LendWise financial relationship app.</p>
                    </motion.div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
                        <CapabilityCard
                            icon={<Handshake size={26} />}
                            title="Two-Sided Lending"
                            description="Dedicated dashboards for Lenders and Borrowers sharing one authoritative loan record."
                            tag="Identity Scoped"
                            color="neon"
                            delay={0}
                        />
                        <CapabilityCard
                            icon={<Wifi size={26} />}
                            title="Socket Sync"
                            description="Payment creation events automatically trigger REST refetch and state updates."
                            tag="Near Real-Time"
                            color="blue"
                            delay={0.1}
                        />
                        <CapabilityCard
                            icon={<Landmark size={26} />}
                            title="MongoDB Authority"
                            description="All interest, EMI, and remaining balance logic is enforced strictly server-side."
                            tag="Financial Core"
                            color="violet"
                            delay={0.2}
                        />
                        <CapabilityCard
                            icon={<Layers size={26} />}
                            title="Export Engine"
                            description="Generate downloadable binary PDF reports and Excel spreadsheets on demand."
                            tag="PDF & XLSX"
                            color="emerald"
                            delay={0.3}
                        />
                    </div>
                </motion.div>
            </section>

            {/* -- FOOTER -- */}
            <footer className="py-16 px-4 md:px-8">
                <div className="max-w-7xl mx-auto bg-[#0B0F0E] rounded-3xl border border-white/5 p-8 md:p-12 relative overflow-hidden">

                    {/* Top Row: Logo & Mission */}
                    <div className="flex flex-col mb-16 relative z-10">
                        <div className="flex items-center gap-2.5 mb-6">
                            <img src={logoImg} alt="LendWise Logo" className="h-12 w-auto object-contain drop-shadow-[0_0_10px_rgba(0,255,156,0.3)]" />
                            <span className="text-3xl font-extrabold tracking-tight text-white mb-0.5">
                                Lend<span className="text-[#00FF9C]">Wise</span>
                            </span>
                        </div>
                        <p className="text-gray-400 text-[15px] max-w-sm leading-relaxed mb-8">
                            Revolutionizing peer-to-peer financial relationships. Clear, transparent, and built for everyone.
                        </p>

                        <div className="flex gap-4">
                            <button onClick={() => setActiveModal('about')} className="w-11 h-11 rounded-full border border-white/10 flex items-center justify-center text-gray-400 hover:text-neon hover:border-neon/50 transition-colors">
                                <Linkedin size={18} />
                            </button>
                            <button onClick={() => setActiveModal('about')} className="w-11 h-11 rounded-full border border-white/10 flex items-center justify-center text-gray-400 hover:text-neon hover:border-neon/50 transition-colors">
                                <Facebook size={18} />
                            </button>
                            <button onClick={() => setActiveModal('about')} className="w-11 h-11 rounded-full border border-white/10 flex items-center justify-center text-gray-400 hover:text-neon hover:border-neon/50 transition-colors">
                                <Instagram size={18} />
                            </button>
                        </div>
                    </div>

                    {/* Columns */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative z-10 mb-16 mt-8">
                        {/* Platform Navigation */}
                        <div>
                            <div className="flex flex-col mb-6">
                                <div className="flex items-center gap-3 mb-4">
                                    <Layers size={22} className="text-neon" />
                                    <h5 className="text-white font-semibold text-[17px]">Platform</h5>
                                </div>
                                <div className="h-px bg-neon w-12 opacity-80"></div>
                            </div>
                            <ul className="space-y-4 list-none text-left">
                                <li><a href="#solutions" className="flex items-center gap-3 text-[15px] text-gray-400 hover:text-white transition-colors group"><ChevronRight size={14} className="text-neon group-hover:translate-x-1 transition-transform" />Solutions</a></li>
                                <li><button onClick={() => setActiveModal('guide')} className="flex items-center gap-3 text-[15px] text-gray-400 hover:text-white transition-colors group"><ChevronRight size={14} className="text-neon group-hover:translate-x-1 transition-transform" />User Guide</button></li>
                                <li><a href="#features" className="flex items-center gap-3 text-[15px] text-gray-400 hover:text-white transition-colors group"><ChevronRight size={14} className="text-neon group-hover:translate-x-1 transition-transform" />Features</a></li>
                            </ul>
                        </div>

                        {/* Company Info */}
                        <div>
                            <div className="flex flex-col mb-6">
                                <div className="flex items-center gap-3 mb-4">
                                    <Users size={22} className="text-neon" />
                                    <h5 className="text-white font-semibold text-[17px]">Company</h5>
                                </div>
                                <div className="h-px bg-neon w-12 opacity-80"></div>
                            </div>
                            <ul className="space-y-4 list-none text-left">
                                <li><button onClick={() => setActiveModal('about')} className="flex items-center gap-3 text-[15px] text-gray-400 hover:text-white transition-colors group"><ChevronRight size={14} className="text-neon group-hover:translate-x-1 transition-transform" />About LendWise</button></li>
                                <li><button onClick={() => setActiveModal('privacy')} className="flex items-center gap-3 text-[15px] text-gray-400 hover:text-white transition-colors group"><ChevronRight size={14} className="text-neon group-hover:translate-x-1 transition-transform" />Legal & Privacy</button></li>
                            </ul>
                        </div>

                        {/* Support Info */}
                        <div>
                            <div className="flex flex-col mb-6">
                                <div className="flex items-center gap-3 mb-4">
                                    <Headphones size={22} className="text-neon" />
                                    <h5 className="text-white font-semibold text-[17px]">Contact & Help</h5>
                                </div>
                                <div className="h-px bg-neon w-12 opacity-80"></div>
                            </div>
                            <ul className="space-y-4 list-none text-left">
                                <li><button onClick={() => setActiveModal('support')} className="flex items-center gap-3 text-[15px] text-gray-400 hover:text-white transition-colors group"><ChevronRight size={14} className="text-neon group-hover:translate-x-1 transition-transform" />Support & FAQ</button></li>
                            </ul>
                        </div>
                    </div>

                    <div className="border-t border-white/[0.08] w-full mb-8"></div>

                    {/* Bottom Info */}
                    <div className="flex justify-between items-center w-full gap-4 text-[13px] sm:text-[14px] text-gray-400 relative z-10 flex-wrap sm:flex-nowrap">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-[#00FF9C]/10 flex items-center justify-center border border-[#00FF9C]/20 shrink-0">
                                <ShieldCheck size={16} className="text-neon" />
                            </div>
                            <span className="text-white font-medium whitespace-nowrap">Your trust. Our priority.</span>
                        </div>
                        <div className="text-gray-500 whitespace-nowrap hidden md:block">© 2026 LendWise. All rights reserved.</div>
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-[#00FF9C]/10 flex items-center justify-center border border-[#00FF9C]/20 shrink-0">
                                <Lock size={16} className="text-neon" />
                            </div>
                            <span className="whitespace-nowrap">Secure <span className="text-[#00FF9C]">•</span> Reliable <span className="text-[#00FF9C]">•</span> Transparent</span>
                        </div>
                    </div>
                </div>
            </footer>

            {/* -- INFORMATIVE DIALOG MODALS -- */}
            <Modal
                isOpen={activeModal === 'about'}
                onClose={() => setActiveModal(null)}
                title="About LendWise"
            >
                <div className="space-y-4 text-left text-gray-300 text-sm leading-relaxed">
                    <p>
                        <strong>LendWise</strong> is a two-sided peer-to-peer financial relationship platform built for complete clarity, accountability, and security.
                    </p>
                    <p>
                        Instead of manual bookkeeping or spreadsheets, LendWise provides direct, synchronized visibility for both Lenders and Borrowers around authoritatively managed loans and payments.
                    </p>
                    <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                        <h4 className="font-semibold text-white mb-2">Core Architectural Principles</h4>
                        <ul className="list-disc pl-5 space-y-1 text-xs text-gray-400">
                            <li>Server-authoritative financial calculation in MongoDB.</li>
                            <li>Strict role isolation (`LENDER` vs `BORROWER`).</li>
                            <li>Real-time event reconciliation via Socket.IO.</li>
                            <li>Instant downloadable PDF & XLSX reports.</li>
                        </ul>
                    </div>
                </div>
            </Modal>

            <Modal
                isOpen={activeModal === 'privacy'}
                onClose={() => setActiveModal(null)}
                title="Legal & Privacy Policy"
            >
                <div className="space-y-4 text-left text-gray-300 text-sm leading-relaxed">
                    <p>
                        At <strong>LendWise</strong>, privacy and data security are built into the core design.
                    </p>
                    <h4 className="font-semibold text-white text-base">Security & Authorization</h4>
                    <p>
                        All user sessions are authenticated using JSON Web Tokens (JWT). Financial endpoints enforce strict owner validation (`req.user.id`), preventing cross-tenant data leakage (IDOR protection).
                    </p>
                    <h4 className="font-semibold text-white text-base">Data Retention</h4>
                    <p>
                        Financial transaction histories are stored immutably in MongoDB. Users can manage profile preferences such as email notifications in Settings at any time.
                    </p>
                </div>
            </Modal>

            <Modal
                isOpen={activeModal === 'support'}
                onClose={() => setActiveModal(null)}
                title="Support & Assistance"
            >
                <div className="space-y-4 text-left text-gray-300 text-sm leading-relaxed">
                    <p>
                        Need help with your LendWise account or portfolio? Our LendWise AI Assistant is available 24/7 inside your dashboard!
                    </p>
                    <div className="p-4 bg-neon/5 rounded-lg border border-neon/20">
                        <h4 className="font-semibold text-neon mb-2">AI Assistant Features</h4>
                        <ul className="list-disc pl-5 space-y-1 text-xs text-gray-300">
                            <li>Check portfolio balances and active loan count.</li>
                            <li>Inquire about EMI due dates and repayment history.</li>
                            <li>Get instant platform feature guidance.</li>
                        </ul>
                    </div>
                </div>
            </Modal>

            <Modal
                isOpen={activeModal === 'guide'}
                onClose={() => setActiveModal(null)}
                title="LendWise Platform Guide"
            >
                <div className="space-y-4 text-left text-gray-300 text-sm leading-relaxed">
                    <h4 className="font-semibold text-white">For Lenders</h4>
                    <p className="text-xs">
                        1. Register as a Lender.<br/>
                        2. Add Borrower relationship and create loans with principal and interest rate.<br/>
                        3. Record payments or observe payments reconciled in real-time.<br/>
                        4. Download PDF or XLSX reports from Reports & Analytics.
                    </p>
                    <h4 className="font-semibold text-white pt-2">For Borrowers</h4>
                    <p className="text-xs">
                        1. Register as a Borrower.<br/>
                        2. Access "My Loans" to view total borrowed, paid, and remaining balance.<br/>
                        3. Access "Upcoming Dues" to track due dates categorized by Overdue, Due Soon, and Upcoming.<br/>
                        4. Generate financial reports and toggle email notification preferences in Settings.
                    </p>
                </div>
            </Modal>
        </div>
    );
};

export default Landing;
