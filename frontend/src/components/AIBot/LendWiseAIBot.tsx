import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Minus, X, Paperclip, Send, Loader2 } from 'lucide-react';
import { apiSendChatMessage } from '../../api';

interface Message {
    id: string;
    sender: 'user' | 'bot';
    text: string;
    timestamp: string;
}

const INITIAL_BOT_MESSAGE: Message = {
    id: 'welcome-1',
    sender: 'bot',
    text: "👋 Hi, I'm LendWise AI.\n\nI can help you check loan balances, active EMIs, overdue payments, and guide you through the platform.",
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
};

const SUGGESTED_QUESTIONS = [
    "What is my total balance?",
    "Show active loans",
    "Do I have any overdue EMIs?",
    "How to make a payment?",
    "Calculate my EMI"
];

const RobotFaceSVG = () => (
    <svg width="100%" height="100%" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="100" height="100" fill="#030806"/>
        <circle cx="50" cy="50" r="45" fill="url(#glow-gradient)" />
        <g style={{ filter: 'drop-shadow(0px 0px 8px rgba(0, 255, 156, 0.6))' }}>
            <rect x="48.5" y="24" width="3" height="12" fill="#00FF9C" />
            <circle cx="50" cy="22" r="4" fill="#00FF9C" />
            <rect x="24" y="46" width="8" height="18" rx="4" fill="#00FF9C" />
            <rect x="68" y="46" width="8" height="18" rx="4" fill="#00FF9C" />
            <path d="M 30 54 C 30 38, 38 34, 50 34 C 62 34, 70 38, 70 54 C 70 66, 62 70, 50 70 C 38 70, 30 66, 30 54 Z" stroke="#00FF9C" strokeWidth="4.5" fill="#030806" />
            <path d="M 42 36 Q 50 38.5 58 36" stroke="#00FF9C" strokeWidth="2.5" strokeLinecap="round" fill="none" />
            <circle cx="41.5" cy="51" r="5" fill="#00FF9C" />
            <circle cx="58.5" cy="51" r="5" fill="#00FF9C" />
            <circle cx="43" cy="49.5" r="1.5" fill="#FFFFFF" />
            <circle cx="60" cy="49.5" r="1.5" fill="#FFFFFF" />
            <path d="M 46.5 59.5 Q 50 62.5 53.5 59.5" stroke="#00FF9C" strokeWidth="3" strokeLinecap="round" fill="none" />
        </g>
        <defs>
            <radialGradient id="glow-gradient" cx="50" cy="50" r="45" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="rgba(0, 255, 156, 0.2)" />
                <stop offset="100%" stopColor="rgba(0, 255, 156, 0)" />
            </radialGradient>
        </defs>
    </svg>
);

export const LendWiseAIBot: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [showGreeting, setShowGreeting] = useState(false);
    const [hasInteracted, setHasInteracted] = useState(false);
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState<Message[]>([INITIAL_BOT_MESSAGE]);
    const [loading, setLoading] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (isOpen) {
            scrollToBottom();
        }
    }, [messages, loading, isOpen]);

    // Clear history on auth expiration / logout
    useEffect(() => {
        const handleAuthExpired = () => {
            setMessages([INITIAL_BOT_MESSAGE]);
        };
        window.addEventListener('lendwise-auth-expired', handleAuthExpired);
        return () => window.removeEventListener('lendwise-auth-expired', handleAuthExpired);
    }, []);

    // Auto Greeting Logic
    useEffect(() => {
        if (hasInteracted) return;

        const greetingTimer = setTimeout(() => {
            if (!hasInteracted && !isOpen) {
                setShowGreeting(true);
                setTimeout(() => {
                    setShowGreeting(false);
                }, 6000);
            }
        }, 8000);

        return () => clearTimeout(greetingTimer);
    }, [hasInteracted, isOpen]);

    const handleBotClick = () => {
        setIsOpen(true);
        setHasInteracted(true);
        setShowGreeting(false);
    };

    const handleClose = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsOpen(false);
    };

    const handleSendMessage = async (textToSend?: string) => {
        const query = (textToSend || message).trim();
        if (!query || loading) return;

        const userMsg: Message = {
            id: `user-${Date.now()}`,
            sender: 'user',
            text: query,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        setMessages(prev => [...prev, userMsg]);
        if (!textToSend) setMessage('');
        setLoading(true);

        try {
            const res = await apiSendChatMessage(query);
            const botMsg: Message = {
                id: `bot-${Date.now()}`,
                sender: 'bot',
                text: res.reply || res.message || "I'm here to help with your loans and financial queries.",
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };
            setMessages(prev => [...prev, botMsg]);
        } catch (err: any) {
            const rawText = err?.message || '';
            const botErrText = (rawText && !rawText.includes('Unexpected token') && !rawText.includes('<!DOCTYPE'))
                ? rawText
                : "Sorry, I couldn't process your request right now. Please try again later.";
            const errorMsg: Message = {
                id: `bot-err-${Date.now()}`,
                sender: 'bot',
                text: botErrText,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setLoading(false);
        }

    };

    return (
        <div className="fixed z-[9999] bottom-7 right-7 md:bottom-7 md:right-7 flex flex-col items-end pointer-events-none">

            {/* --- Chat Panel --- */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 30, transition: { duration: 0.25 } }}
                        transition={{ duration: 0.35, ease: "easeOut" }}
                        className="pointer-events-auto flex flex-col overflow-hidden mb-6
                                   w-[100vw] h-[75vh] fixed bottom-0 right-0 rounded-t-[26px] md:rounded-[26px] md:relative md:w-[360px] md:h-[480px]"
                        style={{
                            background: 'rgba(12, 15, 15, 0.94)',
                            backdropFilter: 'blur(22px)',
                            WebkitBackdropFilter: 'blur(22px)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            boxShadow: '0 30px 80px rgba(0, 0, 0, 0.55)',
                        }}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
                            <div className="flex items-center gap-3">
                                <div className="relative w-10 h-10 rounded-full overflow-hidden border border-[#00FF9C]/30 bg-black">
                                    <RobotFaceSVG />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-white font-semibold text-[15px]">LendWise AI</span>
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-2 h-2 rounded-full bg-[#00FF9C] shadow-[0_0_8px_rgba(0,255,156,0.6)] animate-dot-pulse"></div>
                                        <span className="text-[#00FF9C] text-[12px] font-medium tracking-wide">Online</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={handleClose} className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                                    <Minus size={18} />
                                </button>
                                <button onClick={handleClose} className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                                    <X size={18} />
                                </button>
                            </div>
                        </div>

                        {/* Chat Body */}
                        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4 custom-scrollbar">
                            {messages.map((msg) => (
                                <div key={msg.id} className={`flex flex-col gap-1 max-w-[85%] ${msg.sender === 'user' ? 'ml-auto items-end' : 'items-start'}`}>
                                    <div className={`px-4 py-3 text-[14px] leading-relaxed shadow-sm whitespace-pre-wrap ${
                                        msg.sender === 'user'
                                            ? 'bg-[#00FF9C]/20 border border-[#00FF9C]/30 text-white rounded-2xl rounded-tr-sm'
                                            : 'bg-white/5 border border-white/10 text-gray-200 rounded-2xl rounded-tl-sm'
                                    }`}>
                                        {msg.text}
                                    </div>
                                    <span className="text-[10px] text-gray-500 px-1">{msg.timestamp}</span>
                                </div>
                            ))}

                            {loading && (
                                <div className="flex flex-col gap-1 max-w-[85%] items-start">
                                    <div className="bg-white/5 border border-white/10 text-gray-400 rounded-2xl rounded-tl-sm px-4 py-3 text-[14px] flex items-center gap-2">
                                        <Loader2 size={16} className="animate-spin text-[#00FF9C]" />
                                        <span>LendWise AI is thinking...</span>
                                    </div>
                                </div>
                            )}

                            {/* Suggestions */}
                            {!loading && (
                                <div className="flex flex-col gap-2 pt-2 mt-auto">
                                    <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wider pl-1">Suggested Questions</span>
                                    <div className="flex flex-wrap gap-2">
                                        {SUGGESTED_QUESTIONS.map((q, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => handleSendMessage(q)}
                                                className="px-3 py-1.5 rounded-full bg-[#00FF9C]/[0.04] border border-[#00FF9C]/15 text-[12px] text-gray-300 hover:text-white hover:bg-[#00FF9C]/10 hover:border-[#00FF9C]/30 transition-all duration-200 text-left"
                                            >
                                                {q}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <div ref={chatEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className="p-4 border-t border-white/[0.06] bg-black/20">
                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    handleSendMessage();
                                }}
                                className="relative flex items-center bg-white/[0.03] border border-white/10 rounded-[20px] focus-within:border-[#00FF9C]/30 focus-within:bg-white/[0.05] transition-all duration-300 p-1"
                            >
                                <button type="button" className="p-2 text-gray-500 hover:text-[#00FF9C] transition-colors shrink-0">
                                    <Paperclip size={18} />
                                </button>
                                <input
                                    type="text"
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    placeholder="Ask me anything..."
                                    className="flex-1 bg-transparent text-white text-[14px] placeholder:text-gray-600 focus:outline-none px-2"
                                    disabled={loading}
                                />
                                <button
                                    type="submit"
                                    disabled={!message.trim() || loading}
                                    className={`p-2 rounded-full flex items-center justify-center shrink-0 transition-all ${
                                        message.trim() && !loading
                                            ? 'bg-[#00FF9C] text-black shadow-[0_0_15px_rgba(0,255,156,0.3)] cursor-pointer'
                                            : 'text-gray-600 bg-transparent cursor-not-allowed'
                                    }`}
                                >
                                    <Send size={16} className={message.trim() ? "translate-x-0.5 -translate-y-0.5" : ""} />
                                </button>
                            </form>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* --- Floating Avatar Button --- */}
            <div className="relative pointer-events-auto flex justify-end">
                {/* Auto Greeting Bubble */}
                <AnimatePresence>
                    {showGreeting && !isOpen && (
                        <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="absolute bottom-[100%] right-0 mb-4 w-48 bg-white text-black p-3 rounded-2xl rounded-br-sm shadow-xl z-10"
                        >
                            <p className="text-[13px] font-medium leading-tight">
                                👋 Need help with loans?<br/>
                                <span className="text-gray-600 mt-1 block">Ask LendWise AI.</span>
                            </p>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Notification Pulse Dot */}
                {!isOpen && (
                    <div className="absolute top-0 right-0 w-3.5 h-3.5 rounded-full bg-[#00FF9C] shadow-[0_0_10px_rgba(0,255,156,0.8)] border-2 border-black z-20 animate-dot-pulse pointer-events-none"></div>
                )}

                {/* The Bot Button */}
                <button
                    onClick={handleBotClick}
                    className="group relative w-[68px] h-[68px] md:w-[80px] md:h-[80px] rounded-full bg-transparent border-2 border-[#00FF9C]/30 flex items-center justify-center overflow-visible cursor-pointer animate-bot-float hover:scale-[1.08] hover:rotate-[3deg] transition-transform duration-300"
                    style={{
                        boxShadow: '0 0 30px rgba(0,230,118,0.35)',
                        animation: 'bot-float 4s ease-in-out infinite, bot-breathe 3s ease-in-out infinite'
                    }}
                >
                    <div className="w-full h-full rounded-full overflow-hidden bg-black animate-bot-blink">
                        <RobotFaceSVG />
                    </div>
                </button>
            </div>

        </div>
    );
};
