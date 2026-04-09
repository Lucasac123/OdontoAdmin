import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Stethoscope, Syringe } from 'lucide-react';

const ToothIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M12 5.5c-1.5-3-5.5-3-7.5-1-2 2-2 5.5-.5 8 1 1.5 2 3 2 5.5v2c0 1 1 2 2 2s2-1 2-2v-2c0-1 1-1 2-1s2 0 2 1v2c0 1 1 2 2 2s2-1 2-2v-2c0-2.5 1-4 2-5.5 1.5-2.5 1.5-6-.5-8-2-2-6-2-7.5 1z" />
  </svg>
);

const ICONS = [Stethoscope, ToothIcon, Syringe];

export const LoadingScreen = () => {
  const [iconIndex, setIconIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIconIndex((prev) => (prev + 1) % ICONS.length);
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  const CurrentIcon = ICONS[iconIndex];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950">
      <div className="relative flex items-center justify-center w-24 h-24">
        {/* Pulsing Background */}
        <motion.div
          animate={{ scale: [0.8, 1.1, 0.8], opacity: [0.3, 0.6, 0.3] }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute inset-0 bg-indigo-500/30 blur-2xl rounded-full"
        />
        
        {/* Alternating Icons */}
        <AnimatePresence mode="wait">
          <motion.div
            key={iconIndex}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ duration: 0.3 }}
            className="absolute z-10 flex items-center justify-center"
          >
            <CurrentIcon className="w-16 h-16 text-indigo-600 dark:text-indigo-400 drop-shadow-sm" />
          </motion.div>
        </AnimatePresence>
      </div>
      
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mt-8 flex flex-col items-center"
      >
        <h1 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">OdontoAdmin</h1>
        <div className="flex items-center gap-1">
          <motion.div
            animate={{ scale: [1, 1.5, 1] }}
            transition={{ duration: 1, repeat: Infinity, delay: 0 }}
            className="w-1.5 h-1.5 bg-indigo-600 rounded-full"
          />
          <motion.div
            animate={{ scale: [1, 1.5, 1] }}
            transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
            className="w-1.5 h-1.5 bg-indigo-600 rounded-full"
          />
          <motion.div
            animate={{ scale: [1, 1.5, 1] }}
            transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
            className="w-1.5 h-1.5 bg-indigo-600 rounded-full"
          />
        </div>
      </motion.div>
    </div>
  );
};
