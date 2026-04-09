import React, { useState } from 'react';
import { X, Search, Pill } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CATEGORIZED_MEDICATIONS } from '../data/clinicalData';

interface MedicationPosologyTableProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MedicationPosologyTable: React.FC<MedicationPosologyTableProps> = ({ isOpen, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredCategories = CATEGORIZED_MEDICATIONS.map(category => ({
    ...category,
    medications: category.medications.filter(med => 
      med.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      med.posology.toLowerCase().includes(searchTerm.toLowerCase()) ||
      med.observation.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (med as any).indication?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (med as any).choiceOrder?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })).filter(category => category.medications.length > 0);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-surface w-full max-w-5xl rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <Pill className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-text-primary">Guia de Posologia Odontológica</h2>
                <p className="text-xs text-text-secondary">Referência rápida para prescrições de uso adulto e clínico</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 text-text-secondary hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
            <div className="relative">
              <Search className="w-5 h-5 text-text-secondary absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar medicamento, posologia ou indicação..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl pl-10 pr-4 py-2 text-text-primary focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-8">
              {filteredCategories.map((category, catIndex) => (
                <div key={catIndex}>
                  <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider mb-4 flex items-center gap-2">
                    <span className="w-1 h-4 bg-blue-500 rounded-full"></span>
                    {category.category}
                  </h3>
                  <div className="grid grid-cols-1 gap-4">
                    {category.medications.map((med, medIndex) => (
                      <div key={medIndex} className="bg-white dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl overflow-hidden">
                        <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 flex items-center justify-between">
                          <h4 className="font-bold text-text-primary">{med.name}</h4>
                          {(med as any).choiceOrder && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30">
                              {(med as any).choiceOrder}
                            </span>
                          )}
                        </div>
                        <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="md:col-span-2 space-y-4">
                            {(med as any).indication && (
                              <div>
                                <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase mb-1">Indicação</p>
                                <p className="text-sm text-text-primary leading-relaxed">{(med as any).indication}</p>
                              </div>
                            )}
                            <div>
                              <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase mb-1">Posologia Padrão</p>
                              <p className="text-sm text-text-primary leading-relaxed">{med.posology}</p>
                            </div>
                          </div>
                          <div className="space-y-3">
                            {med.observation !== "-" && (
                              <div>
                                <p className="text-[10px] font-bold text-zinc-500 uppercase mb-0.5">Observações</p>
                                <p className="text-xs text-text-secondary">{med.observation}</p>
                              </div>
                            )}
                            {med.contraindication !== "-" && (
                              <div>
                                <p className="text-[10px] font-bold text-red-500 uppercase mb-0.5">Contraindicações</p>
                                <p className="text-xs text-red-600 dark:text-red-400">{med.contraindication}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {filteredCategories.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-text-secondary">Nenhum medicamento encontrado para "{searchTerm}".</p>
                </div>
              )}
            </div>
          </div>

          <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border-t border-amber-100 dark:border-amber-800/30 flex items-start gap-3">
            <div className="p-1 bg-amber-100 dark:bg-amber-800 rounded text-amber-700 dark:text-amber-200">
              <X className="w-3 h-3" />
            </div>
            <p className="text-[10px] text-amber-800 dark:text-amber-200 leading-tight">
              <strong>AVISO:</strong> Esta tabela é apenas para fins informativos e de apoio clínico. A prescrição é de inteira responsabilidade do profissional, que deve avaliar individualmente cada paciente, considerando histórico médico, alergias e interações medicamentosas.
            </p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
