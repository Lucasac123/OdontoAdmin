import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Search, Image as ImageIcon, Calendar, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useStorage } from '../context/StorageContext';
import { getDataService } from '../services/storageService';
import Markdown from 'react-markdown';

interface AIHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AIHistoryModal: React.FC<AIHistoryModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const { storageLocation } = useStorage();
  const [activeTab, setActiveTab] = useState<'searches' | 'analyses'>('searches');
  
  const [searches, setSearches] = useState<any[]>([]);
  const [analyses, setAnalyses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isOpen || !user) return;
    
    const loadHistory = async () => {
      setIsLoading(true);
      try {
        const service = getDataService(storageLocation);
        const [searchData, analyzeData] = await Promise.all([
          service.getData('ai_searches', user.uid),
          service.getData('ai_analyses', user.uid)
        ]);
        
        setSearches(searchData?.searches || []);
        setAnalyses(analyzeData?.analyses || []);
      } catch (error) {
        console.error("Erro ao carregar histórico da IA:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadHistory();
  }, [isOpen, user, storageLocation]);

  const clearHistory = async () => {
    if (!user || !window.confirm('Tem certeza que deseja apagar o histórico desta aba?')) return;
    
    try {
      const service = getDataService(storageLocation);
      if (activeTab === 'searches') {
        await service.saveData('ai_searches', user.uid, { searches: [] });
        setSearches([]);
      } else {
        await service.saveData('ai_analyses', user.uid, { analyses: [] });
        setAnalyses([]);
      }
    } catch (error) {
      console.error("Erro ao limpar histórico:", error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }} 
        className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }} 
        animate={{ opacity: 1, scale: 1, y: 0 }} 
        exit={{ opacity: 0, scale: 0.95, y: 20 }} 
        className="relative w-full max-w-4xl bg-surface rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] border border-zinc-200 dark:border-zinc-800"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-text-primary">Histórico da IA</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-text-secondary" />
          </button>
        </div>

        <div className="flex px-6 border-b border-zinc-100 dark:border-zinc-800 shrink-0 bg-zinc-50 dark:bg-zinc-900/50">
          <button
            onClick={() => setActiveTab('searches')}
            className={`flex items-center gap-2 px-6 py-3 font-medium text-sm transition-colors relative ${
              activeTab === 'searches' ? 'text-indigo-600 dark:text-indigo-400' : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <Search className="w-4 h-4" />
            Pesquisas
            {activeTab === 'searches' && (
              <motion.div layoutId="ai-hist-indicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-400" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('analyses')}
            className={`flex items-center gap-2 px-6 py-3 font-medium text-sm transition-colors relative ${
              activeTab === 'analyses' ? 'text-indigo-600 dark:text-indigo-400' : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            Análises de Imagem
            {activeTab === 'analyses' && (
              <motion.div layoutId="ai-hist-indicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-400" />
            )}
          </button>

          <div className="ml-auto flex items-center">
            <button
              onClick={clearHistory}
              disabled={isLoading || (activeTab === 'searches' && searches.length === 0) || (activeTab === 'analyses' && analyses.length === 0)}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Limpar Histórico
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-zinc-50 dark:bg-zinc-900/20">
          {isLoading ? (
            <div className="flex justify-center items-center h-full">
              <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
            </div>
          ) : activeTab === 'searches' ? (
            searches.length === 0 ? (
              <p className="text-center text-text-secondary py-12">Nenhuma pesquisa encontrada no histórico.</p>
            ) : (
              <div className="space-y-4">
                {searches.map((s, idx) => (
                  <div key={idx} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-text-primary text-base break-words">"{s.query}"</h4>
                      <span className="text-[10px] text-text-secondary flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-full shrink-0 ml-2">
                        <Calendar className="w-3 h-3" />
                        {new Date(s.date).toLocaleDateString()} {new Date(s.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </span>
                    </div>
                    <div className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-headings:mb-2 prose-p:mb-2 prose-ul:mb-2 text-text-secondary line-clamp-6 hover:line-clamp-none transition-all">
                      <Markdown>{s.result}</Markdown>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            analyses.length === 0 ? (
              <p className="text-center text-text-secondary py-12">Nenhuma análise encontrada no histórico.</p>
            ) : (
              <div className="space-y-4">
                {analyses.map((a, idx) => (
                  <div key={idx} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row gap-5">
                    {a.thumbnail ? (
                      <div className="w-full md:w-48 h-32 md:h-auto rounded-xl overflow-hidden shrink-0 border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
                        <img src={a.thumbnail} alt="Thumbnail" className="w-full h-full object-contain" />
                      </div>
                    ) : (
                      <div className="w-full md:w-48 h-32 md:h-auto rounded-xl overflow-hidden shrink-0 border border-dashed border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/50 flex flex-col items-center justify-center text-zinc-400">
                        <ImageIcon className="w-8 h-8 mb-2 opacity-50" />
                        <span className="text-[10px] font-medium uppercase tracking-wider">{a.type || 'Documento'}</span>
                      </div>
                    )}
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium px-2.5 py-1 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-full">
                          {a.preset || 'Geral'}
                        </span>
                        <span className="text-[10px] text-text-secondary flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(a.date).toLocaleDateString()}
                        </span>
                      </div>
                      <h4 className="font-medium text-text-primary text-sm mb-3">"{a.prompt}"</h4>
                      <div className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed text-text-secondary line-clamp-4 hover:line-clamp-none transition-all">
                        <Markdown>{a.result}</Markdown>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </motion.div>
    </div>
  );
};
