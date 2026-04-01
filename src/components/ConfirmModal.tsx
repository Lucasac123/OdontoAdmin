import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
  errorMessage?: string | null;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  onConfirm,
  onCancel,
  variant = 'danger',
  isLoading = false,
  errorMessage = null
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={isLoading ? undefined : onCancel}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", bounce: 0, duration: 0.4 }}
            className="bg-surface w-full max-w-md rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden relative z-10"
          >
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${
                  variant === 'danger' ? 'bg-red-100 dark:bg-red-500/10 text-red-600' :
                  variant === 'warning' ? 'bg-amber-100 dark:bg-amber-500/10 text-amber-600' :
                  'bg-blue-100 dark:bg-blue-500/10 text-blue-600'
                }`}>
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-text-primary mb-2">{title}</h3>
                  <p className="text-text-secondary leading-relaxed">{message}</p>
                </div>
                {!isLoading && (
                  <button 
                    onClick={onCancel}
                    className="text-text-secondary hover:text-text-primary transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
              {errorMessage && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-4 p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl flex items-center gap-2 text-red-600 dark:text-red-400 text-xs font-semibold"
                >
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <p>{errorMessage}</p>
                </motion.div>
              )}
            </div>
            
            <div className="p-4 bg-zinc-50 dark:bg-zinc-900/50 flex flex-col sm:flex-row gap-3 justify-end">
              <button
                onClick={onCancel}
                disabled={isLoading}
                className="px-6 py-2.5 rounded-xl font-medium text-text-secondary hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
              >
                {cancelLabel}
              </button>
              <button
                onClick={onConfirm}
                disabled={isLoading}
                className={`px-6 py-2.5 rounded-xl font-medium text-white transition-colors flex items-center justify-center gap-2 ${
                  variant === 'danger' ? 'bg-red-600 hover:bg-red-700' :
                  variant === 'warning' ? 'bg-amber-600 hover:bg-amber-700' :
                  'bg-indigo-600 hover:bg-indigo-700'
                } disabled:opacity-70`}
              >
                {isLoading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
