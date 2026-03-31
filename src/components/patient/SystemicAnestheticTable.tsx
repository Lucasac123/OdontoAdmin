import React, { useState } from 'react';
import { X, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SystemicAnestheticTableProps {
  isOpen: boolean;
  onClose: () => void;
}

const SYSTEMIC_DATA = [
  {
    condition: 'Hipertensão Arterial (Controlada)',
    recommendation: 'Lidocaína 2% com Epinefrina 1:100.000 (Máx. 2 tubetes). Evitar noradrenalina e levonordefrina.',
    contraindication: 'Fios retratores com epinefrina. Anestésicos com alta concentração de vasoconstritor.'
  },
  {
    condition: 'Hipertensão Arterial (Não Controlada)',
    recommendation: 'Atendimento de urgência apenas. Mepivacaína 3% sem vasoconstritor ou Prilocaína 3% com Felipressina.',
    contraindication: 'Qualquer vasoconstritor adrenérgico (Epinefrina, Noradrenalina).'
  },
  {
    condition: 'Diabetes (Controlada)',
    recommendation: 'Lidocaína 2% com Epinefrina 1:100.000 (seguro).',
    contraindication: 'Evitar altas doses de epinefrina, pois pode causar hiperglicemia.'
  },
  {
    condition: 'Diabetes (Não Controlada)',
    recommendation: 'Mepivacaína 3% sem vasoconstritor ou Prilocaína 3% com Felipressina.',
    contraindication: 'Epinefrina e outros vasoconstritores adrenérgicos.'
  },
  {
    condition: 'Cardiopatia Isquêmica (Angina/Infarto > 6 meses)',
    recommendation: 'Lidocaína 2% com Epinefrina 1:100.000 (Máx. 2 tubetes).',
    contraindication: 'Fios retratores com epinefrina.'
  },
  {
    condition: 'Cardiopatia Isquêmica (Infarto < 6 meses)',
    recommendation: 'Contraindicado atendimento eletivo. Apenas urgência hospitalar.',
    contraindication: 'Todos os vasoconstritores em ambiente ambulatorial.'
  },
  {
    condition: 'Hipertireoidismo (Controlado)',
    recommendation: 'Lidocaína 2% com Epinefrina 1:100.000 (uso cauteloso).',
    contraindication: 'Altas doses de epinefrina.'
  },
  {
    condition: 'Hipertireoidismo (Não Controlado)',
    recommendation: 'Mepivacaína 3% sem vasoconstritor ou Prilocaína 3% com Felipressina.',
    contraindication: 'Epinefrina (risco de crise tireotóxica).'
  },
  {
    condition: 'Asma',
    recommendation: 'Prilocaína 3% com Felipressina ou Mepivacaína 3% sem vasoconstritor.',
    contraindication: 'Anestésicos com sulfitos (presentes em soluções com vasoconstritores adrenérgicos) podem causar alergia.'
  },
  {
    condition: 'Gestantes',
    recommendation: 'Lidocaína 2% com Epinefrina 1:100.000 (Anestésico de escolha).',
    contraindication: 'Prilocaína (risco de metemoglobinemia) e Bupivacaína (cardiotoxicidade).'
  },
  {
    condition: 'Insuficiência Renal/Hepática',
    recommendation: 'Reduzir a dose máxima. Articaína pode ser uma boa opção (metabolismo misto).',
    contraindication: 'Doses altas de qualquer anestésico (risco de toxicidade por acúmulo).'
  }
];

export const SystemicAnestheticTable: React.FC<SystemicAnestheticTableProps> = ({ isOpen, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredData = SYSTEMIC_DATA.filter(item => 
    item.condition.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.recommendation.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.contraindication.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-surface w-full max-w-4xl rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
            <h2 className="text-xl font-bold text-text-primary">Anestésicos para Pacientes Sistêmicos</h2>
            <button onClick={onClose} className="p-2 text-text-secondary hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
            <div className="relative">
              <Search className="w-5 h-5 text-text-secondary absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar condição, medicamento..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl pl-10 pr-4 py-2 text-text-primary focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-4">
              {filteredData.map((item, index) => (
                <div key={index} className="bg-white dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl p-4">
                  <h3 className="text-lg font-bold text-indigo-600 dark:text-indigo-400 mb-2">{item.condition}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-emerald-50 dark:bg-emerald-500/10 p-3 rounded-lg border border-emerald-100 dark:border-emerald-500/20">
                      <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase mb-1">Recomendação / Limitação</p>
                      <p className="text-sm text-emerald-900 dark:text-emerald-100">{item.recommendation}</p>
                    </div>
                    <div className="bg-red-50 dark:bg-red-500/10 p-3 rounded-lg border border-red-100 dark:border-red-500/20">
                      <p className="text-xs font-bold text-red-800 dark:text-red-300 uppercase mb-1">Contraindicação</p>
                      <p className="text-sm text-red-900 dark:text-red-100">{item.contraindication}</p>
                    </div>
                  </div>
                </div>
              ))}
              {filteredData.length === 0 && (
                <p className="text-center text-text-secondary py-8">Nenhuma condição encontrada.</p>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
