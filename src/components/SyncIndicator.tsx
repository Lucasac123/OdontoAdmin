import React, { useState, useEffect, useRef } from 'react';
import { useSync } from '../context/SyncContext';
import { CloudUpload, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const SyncIndicator: React.FC<{ variant?: 'header' | 'floating' }> = ({ variant = 'floating' }) => {
  const { isSyncing } = useSync();
  const [showSaved, setShowSaved] = useState(false);
  const prevSyncing = useRef(isSyncing);

  useEffect(() => {
    if (prevSyncing.current && !isSyncing) {
      setShowSaved(true);
      const timer = setTimeout(() => setShowSaved(false), 2000);
      return () => clearTimeout(timer);
    }
    prevSyncing.current = isSyncing;
  }, [isSyncing]);

  const isVisible = isSyncing || showSaved;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: variant === 'floating' ? -20 : 0, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: variant === 'floating' ? -20 : 0, scale: 0.9 }}
          className={`${
            variant === 'floating' 
              ? 'hidden md:flex fixed top-4 right-4 z-50' 
              : 'flex items-center'
          } flex items-center justify-center gap-2 ${
            showSaved ? 'bg-emerald-600' : 'bg-indigo-600'
          } text-white p-2 rounded-full shadow-lg transition-colors`}
          title={showSaved ? "Salvo!" : "Salvando..."}
        >
          {showSaved ? (
            <Check className="w-4 h-4" />
          ) : (
            <CloudUpload className="w-4 h-4 animate-bounce" />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
