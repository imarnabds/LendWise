import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Users, IndianRupee, Clock } from 'lucide-react';

const stats = [
  { icon: Shield, title: '100% Secure', subtitle: 'Your data is protected' },
  { icon: Users, title: '10K+ Users', subtitle: 'Trust us for their growth' },
  { icon: IndianRupee, title: '₹500Cr+', subtitle: 'Loans facilitated' },
  { icon: Clock, title: '24/7 Support', subtitle: "We're here for you" },
];

export const StatsBar: React.FC = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.5 }}
      className="w-full flex flex-row justify-between items-center py-5"
    >
      {stats.map((stat, index) => (
        <motion.div
          key={index}
          whileHover={{ scale: 1.05 }}
          className="flex items-center gap-3 cursor-default"
        >
          <div
            className="flex items-center justify-center w-10 h-10 rounded-full border border-[#00ff88]/15"
            style={{ background: 'rgba(0,255,136,0.05)' }}
          >
            <stat.icon className="w-4 h-4" style={{ color: '#00ff88' }} />
          </div>
          <div>
            <h5 className="text-white font-semibold text-sm leading-tight">{stat.title}</h5>
            <p className="text-white/25 text-xs mt-0.5">{stat.subtitle}</p>
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
};
