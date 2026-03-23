import React from 'react';
import { motion } from 'motion/react';
import { Stethoscope } from 'lucide-react';

export const LoadingScreen = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{
          duration: 0.5,
          repeat: Infinity,
          repeatType: "reverse",
          ease: "easeInOut"
        }}
        className="relative"
      >
        <div className="absolute inset-0 bg-indigo-500/20 blur-3xl rounded-full" />
        <Stethoscope className="w-16 h-16 text-indigo-600 dark:text-indigo-400 relative z-10" />
      </motion.div>
      
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
