import React, { useState } from 'react';
import { X, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PediatricTableProps {
  isOpen: boolean;
  onClose: () => void;
}

const PEDIATRIC_DATA = [
  {
    drug: 'Amoxicilina (Suspensão 250mg/5ml)',
    indication: 'Infecções bacterianas comuns',
    dose: '50mg/kg/dia',
    posology: 'Dividido em 3 tomadas (8/8h) por 7 dias',
    maxDose: '500mg por dose'
  },
  {
    drug: 'Amoxicilina + Clavulanato (Susp. 250mg+62,5mg/5ml)',
    indication: 'Infecções resistentes',
    dose: '50mg/kg/dia (baseado na Amoxicilina)',
    posology: 'Dividido em 3 tomadas (8/8h) por 7 dias',
    maxDose: '500mg por dose'
  },
  {
    drug: 'Azitromicina (Suspensão 200mg/5ml)',
    indication: 'Alergia à penicilina',
    dose: '10mg/kg/dia',
    posology: 'Dose única diária (24/24h) por 3 a 5 dias',
    maxDose: '500mg por dia'
  },
  {
    drug: 'Cefalexina (Suspensão 250mg/5ml)',
    indication: 'Infecções ósseas/tecidos moles',
    dose: '25 a 50mg/kg/dia',
    posology: 'Dividido em 4 tomadas (6/6h) por 7 dias',
    maxDose: '500mg por dose'
  },
  {
    drug: 'Clindamicina (Suspensão 75mg/5ml)',
    indication: 'Infecções severas / Alergia à penicilina',
    dose: '10 a 25mg/kg/dia',
    posology: 'Dividido em 3 a 4 tomadas (8/8h ou 6/6h) por 7 dias',
    maxDose: '300mg por dose'
  },
  {
    drug: 'Eritromicina (Suspensão 250mg/5ml)',
    indication: 'Alergia à penicilina',
    dose: '30 a 50mg/kg/dia',
    posology: 'Dividido em 4 tomadas (6/6h) por 7 dias',
    maxDose: '500mg por dose'
  },
  {
    drug: 'Dipirona (Gotas 500mg/ml)',
    indication: 'Analgesia e antitérmico',
    dose: '1 gota por kg de peso',
    posology: 'De 6/6h em caso de dor ou febre',
    maxDose: '40 gotas por dose'
  },
  {
    drug: 'Ibuprofeno (Gotas 50mg/ml)',
    indication: 'Anti-inflamatório, analgésico e antitérmico',
    dose: '1 a 2 gotas por kg de peso',
    posology: 'De 6/6h ou 8/8h em caso de dor ou inflamação',
    maxDose: '40 gotas por dose'
  },
  {
    drug: 'Ibuprofeno (Suspensão 100mg/5ml)',
    indication: 'Anti-inflamatório, analgésico e antitérmico',
    dose: '0,5ml por kg de peso',
    posology: 'De 6/6h ou 8/8h em caso de dor ou inflamação',
    maxDose: '10ml por dose'
  },
  {
    drug: 'Paracetamol (Gotas 200mg/ml)',
    indication: 'Analgesia e antitérmico',
    dose: '1 gota por kg de peso',
    posology: 'De 6/6h em caso de dor ou febre',
    maxDose: '35 gotas por dose'
  },
  {
    drug: 'Nimesulida (Gotas 50mg/ml)',
    indication: 'Anti-inflamatório (Apenas > 12 anos)',
    dose: '1 gota por kg de peso',
    posology: 'De 12/12h por no máximo 5 dias',
    maxDose: '20 gotas por dose'
  },
  {
    drug: 'Diclofenaco Resinato (Gotas 15mg/ml)',
    indication: 'Anti-inflamatório e analgésico (> 1 ano)',
    dose: '1 gota por kg de peso',
    posology: 'De 8/8h ou 12/12h',
    maxDose: '30 gotas por dia'
  },
  {
    drug: 'Dexametasona (Elixir 0,1mg/ml)',
    indication: 'Anti-inflamatório esteroidal (Edema severo)',
    dose: '0,1 a 0,2mg/kg/dia',
    posology: 'Dividido em 2 a 3 tomadas por no máximo 3 dias',
    maxDose: '4mg por dia'
  },
  {
    drug: 'Cetoconazol (Suspensão 20mg/ml)',
    indication: 'Infecções fúngicas',
    dose: '3 a 6mg/kg/dia',
    posology: 'Dose única diária',
    maxDose: '200mg por dia'
  },
  {
    drug: 'Nistatina (Suspensão 100.000 UI/ml)',
    indication: 'Candidíase oral',
    dose: '1 a 2ml (Bochecho/Deglutição)',
    posology: '4 vezes ao dia por 7 a 14 dias',
    maxDose: '6ml por dia'
  },
  {
    drug: 'Miconazol (Gel oral 20mg/g)',
    indication: 'Candidíase oral',
    dose: '1/4 de colher de chá (lactentes) ou 1/2 (crianças)',
    posology: '4 vezes ao dia, aplicar sobre as lesões',
    maxDose: 'Não aplicável'
  }
];

export const PediatricTable: React.FC<PediatricTableProps> = ({ isOpen, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredData = PEDIATRIC_DATA.filter(item => 
    item.drug.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.indication.toLowerCase().includes(searchTerm.toLowerCase())
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
            <h2 className="text-xl font-bold text-text-primary">Tabela de Dosagem Odontopediatria</h2>
            <button onClick={onClose} className="p-2 text-text-secondary hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
            <div className="relative">
              <Search className="w-5 h-5 text-text-secondary absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar medicamento ou indicação..."
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
                  <h3 className="text-lg font-bold text-indigo-600 dark:text-indigo-400 mb-1">{item.drug}</h3>
                  <p className="text-sm text-text-secondary mb-3">{item.indication}</p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-zinc-50 dark:bg-zinc-900/50 p-3 rounded-lg border border-zinc-200 dark:border-zinc-700">
                      <p className="text-xs font-bold text-text-secondary uppercase mb-1">Dose Base</p>
                      <p className="text-sm font-medium text-text-primary">{item.dose}</p>
                    </div>
                    <div className="bg-zinc-50 dark:bg-zinc-900/50 p-3 rounded-lg border border-zinc-200 dark:border-zinc-700">
                      <p className="text-xs font-bold text-text-secondary uppercase mb-1">Posologia</p>
                      <p className="text-sm font-medium text-text-primary">{item.posology}</p>
                    </div>
                    <div className="bg-red-50 dark:bg-red-500/10 p-3 rounded-lg border border-red-100 dark:border-red-500/20">
                      <p className="text-xs font-bold text-red-800 dark:text-red-300 uppercase mb-1">Dose Máxima</p>
                      <p className="text-sm font-medium text-red-900 dark:text-red-100">{item.maxDose}</p>
                    </div>
                  </div>
                </div>
              ))}
              {filteredData.length === 0 && (
                <p className="text-center text-text-secondary py-8">Nenhum medicamento encontrado.</p>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
