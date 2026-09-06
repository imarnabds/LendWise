import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  delay?: number;
}

export const FeatureCard: React.FC<FeatureCardProps> = ({ icon: Icon, title, subtitle, delay = 0 }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ y: -5 }}
      className="flex items-start gap-3 w-full cursor-default"
    >
      <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-lg bg-primary-green/10 text-primary-green border border-primary-green/20">
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex flex-col">
        <h4 className="text-white font-semibold text-sm mb-0.5 whitespace-nowrap">{title}</h4>
        <p className="text-muted text-xs leading-relaxed max-w-[180px]">{subtitle}</p>
      </div>
    </motion.div>

  );
};
