import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Check } from 'lucide-react';

interface QuickAccessSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableLinks: any[];
  selectedLinks: string[];
  onSave: (links: string[]) => void;
}

export const QuickAccessSettingsModal: React.FC<QuickAccessSettingsModalProps> = ({
  isOpen,
  onClose,
  availableLinks,
  selectedLinks,
  onSave
}) => {
  const [tempSelected, setTempSelected] = useState<string[]>(selectedLinks);

  useEffect(() => {
    if (isOpen) {
      setTempSelected(selectedLinks);
    }
  }, [isOpen, selectedLinks]);

  const toggleLink = (id: string) => {
    if (tempSelected.includes(id)) {
      setTempSelected(tempSelected.filter(l => l !== id));
    } else {
      if (tempSelected.length < 4) {
        setTempSelected([...tempSelected, id]);
      }
    }
  };

  const handleSave = () => {
    onSave(tempSelected);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60]"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-surface border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl z-[70] overflow-hidden flex flex-col max-h-[90vh]"
          >
            <div className="flex items-center justify-between p-6 border-b border-zinc-200 dark:border-zinc-800">
              <h2 className="text-xl font-bold text-text-primary">Personalizar Acesso Rápido</h2>
              <button onClick={onClose} className="p-2 text-text-secondary hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto">
              <p className="text-sm text-text-secondary mb-4">Selecione até 4 atalhos para exibir no dashboard ({tempSelected.length}/4):</p>
              <div className="space-y-2">
                {availableLinks.map(link => {
                  const isSelected = tempSelected.includes(link.id);
                  const isDisabled = !isSelected && tempSelected.length >= 4;
                  return (
                    <button
                      key={link.id}
                      onClick={() => toggleLink(link.id)}
                      disabled={isDisabled}
                      className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${
                        isSelected 
                          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10' 
                          : isDisabled
                            ? 'border-zinc-200 dark:border-zinc-800 opacity-50 cursor-not-allowed'
                            : 'border-zinc-200 dark:border-zinc-800 hover:border-indigo-300 dark:hover:border-indigo-700 bg-surface'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isSelected ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400' : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'}`}>
                          <link.icon className="w-5 h-5" />
                        </div>
                        <span className={`font-medium ${isSelected ? 'text-indigo-700 dark:text-indigo-300' : 'text-text-primary'}`}>{link.label}</span>
                      </div>
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-indigo-500 bg-indigo-500 text-white' : 'border-zinc-300 dark:border-zinc-600'}`}>
                        {isSelected && <Check className="w-4 h-4" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="p-6 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 flex justify-end gap-3">
              <button
                onClick={onClose}
                className="px-6 py-2.5 text-sm font-bold text-text-secondary hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                className="px-6 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-sm"
              >
                Salvar
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
