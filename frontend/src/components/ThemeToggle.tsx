import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import { motion } from 'framer-motion';

export const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={toggleTheme}
      className="absolute top-6 right-6 flex items-center gap-2 bg-transparent border border-borders text-white px-3 py-1.5 rounded-full hover:border-primary-green hover:bg-primary-green/5 transition-all z-50"
    >
      {theme === 'dark' ? (
        <>
          <Moon className="w-3.5 h-3.5 text-muted" />
          <span className="text-xs text-muted font-medium">Dark Mode</span>
        </>
      ) : (
        <>
          <Sun className="w-4 h-4 text-amber-400" />
          <span className="text-sm font-medium">Light Mode</span>
        </>
      )}
    </motion.button>
  );
};
