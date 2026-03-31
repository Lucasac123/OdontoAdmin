import React, { useState } from 'react';
import { X, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CidTableProps {
  isOpen: boolean;
  onClose: () => void;
}

const CID_DATA = [
  { code: 'K00', description: 'Anodontia, dentes supranumerários e anomalias de tamanho e forma' },
  { code: 'K01', description: 'Dentes inclusos e impactados' },
  { code: 'K02', description: 'Cárie dentária' },
  { code: 'K03', description: 'Outras doenças dos tecidos duros dos dentes (Atrito, Abrasão, Erosão)' },
  { code: 'K04', description: 'Doenças da polpa e dos tecidos periapicais (Pulpite, Necrose, Abscesso)' },
  { code: 'K05', description: 'Gengivite e doenças periodontais' },
  { code: 'K06', description: 'Outros transtornos da gengiva e do rebordo alveolar sem dentes' },
  { code: 'K07', description: 'Anomalias dentofaciais (incluindo a maloclusão)' },
  { code: 'K08', description: 'Outros transtornos dos dentes e das estruturas de suporte (Perda de dentes)' },
  { code: 'K09', description: 'Cistos da região bucal não classificados em outra parte' },
  { code: 'K10', description: 'Outras doenças dos maxilares' },
  { code: 'K11', description: 'Doenças das glândulas salivares' },
  { code: 'K12', description: 'Estomatite e lesões correlatas (Aftas)' },
  { code: 'K13', description: 'Outras doenças dos lábios e da mucosa oral' },
  { code: 'K14', description: 'Doenças da língua' },
  { code: 'B37.0', description: 'Estomatite por Candida (Candidíase oral)' },
  { code: 'B00.2', description: 'Gengivoestomatite e faringoamigdalite pelo vírus do herpes' },
  { code: 'S02.5', description: 'Fratura de dente' },
  { code: 'S03.2', description: 'Luxação de dente' },
  { code: 'R68.8', description: 'Outros sintomas e sinais gerais especificados (Dor de dente SOE)' }
];

export const CidTable: React.FC<CidTableProps> = ({ isOpen, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredData = CID_DATA.filter(item => 
    item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-surface w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
            <h2 className="text-xl font-bold text-text-primary">Tabela CID-10 (Odontologia)</h2>
            <button onClick={onClose} className="p-2 text-text-secondary hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
            <div className="relative">
              <Search className="w-5 h-5 text-text-secondary absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por código ou descrição..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl pl-10 pr-4 py-2 text-text-primary focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-2">
              {filteredData.map((item, index) => (
                <div key={index} className="flex items-start gap-4 p-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 rounded-lg transition-colors border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700">
                  <div className="bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-mono font-bold px-3 py-1 rounded-md text-sm shrink-0">
                    {item.code}
                  </div>
                  <p className="text-sm text-text-primary mt-1">{item.description}</p>
                </div>
              ))}
              {filteredData.length === 0 && (
                <p className="text-center text-text-secondary py-8">Nenhum CID encontrado.</p>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
