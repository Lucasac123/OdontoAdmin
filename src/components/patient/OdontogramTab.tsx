import React, { useState, useEffect } from 'react';
import { doc, updateDoc, collection, query, where, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, auth } from '../../firebase';
import { Patient, FileRecord } from '../../types';
import { Save, Loader2, Info, ChevronRight, AlertCircle, CheckCircle2, BrainCircuit, Activity, XCircle, CheckCircle, Copy, Sparkles, Wand2, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from '@google/genai';
import { webLlmService } from '../../services/webLlm';
import { useSync } from '../../context/SyncContext';
import Markdown from 'react-markdown';

type ToothStatus = 'healthy' | 'caries' | 'restored' | 'extracted' | 'missing' | 'implant' | 'endo';

interface ToothState {
  id: number;
  status: ToothStatus;
  notes: string;
}

const statusConfig: Record<ToothStatus, { label: string; color: string; bg: string; border: string }> = {
  healthy: { label: 'Saudável', color: 'text-zinc-500 dark:text-zinc-400', bg: 'bg-white dark:bg-zinc-800', border: 'border-zinc-200 dark:border-zinc-700' },
  caries: { label: 'Cárie', color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-500', border: 'border-rose-600' },
  restored: { label: 'Restaurado', color: 'text-cyan-600 dark:text-cyan-400', bg: 'bg-cyan-500', border: 'border-cyan-600' },
  extracted: { label: 'Extraído', color: 'text-zinc-900 dark:text-zinc-100', bg: 'bg-zinc-900 dark:bg-black', border: 'border-zinc-950' },
  missing: { label: 'Ausente', color: 'text-zinc-400', bg: 'bg-zinc-300 dark:bg-zinc-600', border: 'border-zinc-400' },
  implant: { label: 'Implante', color: 'text-teal-600 dark:text-teal-400', bg: 'bg-teal-500', border: 'border-teal-600' },
  endo: { label: 'Endodontia', color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-500', border: 'border-violet-600' }
};

const ToothIcon = ({ id, status, isSelected, onClick }: { id: number; status: ToothStatus; isSelected: boolean; onClick: () => void }) => {
  const config = statusConfig[status];
  
  return (
    <motion.g
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="cursor-pointer"
    >
      {/* Tooth Shape - Simplified Schematic */}
      <path
        d="M5,10 C5,5 10,2 20,2 C30,2 35,5 35,10 L35,35 C35,42 30,48 20,48 C10,48 5,42 5,35 Z"
        className={`transition-all duration-300 ${
          status === 'missing' ? 'fill-zinc-100 dark:fill-zinc-800 stroke-zinc-300 dark:stroke-zinc-600 stroke-dasharray-4' : 
          status === 'healthy' ? 'fill-white dark:fill-zinc-800 stroke-zinc-300 dark:stroke-zinc-600' : 
          `fill-current ${statusConfig[status].color.replace('text-', 'text-')} stroke-current opacity-90`
        } ${isSelected ? 'stroke-amber-500 dark:stroke-amber-400 stroke-[4px] filter drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]' : 'stroke-[1.5px]'}`}
        style={{ color: status !== 'healthy' && status !== 'missing' ? undefined : '' }}
      />
      
      {/* Status Indicators for specific conditions */}
      {status === 'caries' && <circle cx="20" cy="15" r="4" className="fill-red-800/50" />}
      {status === 'endo' && <line x1="20" y1="10" x2="20" y2="40" className="stroke-purple-900/50 stroke-2" />}
      {status === 'implant' && <path d="M15,40 L25,40 M20,35 L20,45" className="stroke-emerald-900/50 stroke-2" />}
      
      <text
        x="20"
        y="30"
        textAnchor="middle"
        className={`text-[10px] font-bold select-none pointer-events-none ${
          status === 'extracted' || status === 'caries' || status === 'restored' || status === 'implant' || status === 'endo'
            ? 'fill-white'
            : 'fill-zinc-500 dark:fill-zinc-400'
        }`}
      >
        {id}
      </text>
    </motion.g>
  );
};

export const OdontogramTab = ({ patient }: { patient: Patient }) => {
  const [odontogramMode, setOdontogramMode] = useState<'adult' | 'pediatric'>('adult');
  const [teethState, setTeethState] = useState<Record<number, ToothState>>({});
  const [selectedTooth, setSelectedTooth] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isHybridMode, setIsHybridMode] = useState(false);
  const { addSyncTask } = useSync();

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 640 && isHybridMode) {
        setIsHybridMode(false);
      }
    };
    // Run once on mount
    handleResize();
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isHybridMode]);

  useEffect(() => {
    if (patient.odontogram) {
      try {
        setTeethState(JSON.parse(patient.odontogram));
      } catch (e) {
        console.error("Failed to parse odontogram", e);
      }
    }
  }, [patient.odontogram]);

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, 'files'),
      where('patientId', '==', patient.id),
      where('dentistId', '==', auth.currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FileRecord));
      setFiles(data.filter(f => f.type === 'intraoral' || f.type === 'xray'));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'files'));

    return () => unsubscribe();
  }, [patient.id]);

  const analyzeTooth = async (toothId: number) => {
    if (files.length === 0) return;
    setIsAnalyzing(true);
    setAiAnalysis(null);
    
    try {
      if (isHybridMode) {
        if (!webLlmService.isReady()) {
          setAiAnalysis('O modelo Gemma-4-E2B-it local não está inicializado. Vá para a aba de IA para baixá-lo.');
          setIsAnalyzing(false);
          return;
        }
        const text = await webLlmService.generateResponse(
          `Analise o dente ${toothId} com base no histórico do paciente.`,
          `Você é o Gemma-4-E2B-it, um assistente odontológico rodando localmente. Como não tem acesso à visão nesta versão local, forneça uma análise genérica e conservadora sobre o dente ${toothId}.`
        );
        setAiAnalysis(`*(Análise Local via Gemma-4-E2B-it)*\n\n${text}`);
        setIsAnalyzing(false);
        return;
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        setAiAnalysis('Chave de API do Gemini não configurada. Verifique as configurações do sistema.');
        setIsAnalyzing(false);
        return;
      }
      const ai = new GoogleGenAI({ apiKey });
      
      const imageParts = files.slice(0, 3).map(file => ({
        inlineData: {
          mimeType: 'image/jpeg',
          data: file.url.split(',')[1] // Assuming base64 data URL
        }
      }));

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [
          {
            role: 'user',
            parts: [
              ...imageParts,
              { text: `Analise estas imagens odontológicas para o dente número ${toothId}. Sugira possíveis diagnósticos como cáries, restaurações, etc. Seja breve.` }
            ]
          }
        ]
      });
      // Use the .text property directly
      const text = response.text;
      setAiAnalysis(text || 'Nenhuma análise disponível.');
    } catch (error) {
      console.error('AI analysis error', error);
      setAiAnalysis('Erro ao analisar imagens.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Analysis is now triggered manually by the user
  useEffect(() => {
    if (selectedTooth) {
      setAiAnalysis(null);
    }
  }, [selectedTooth]);

  const handleSave = () => {
    const savePromise = updateDoc(doc(db, 'patients', patient.id), {
      odontogram: JSON.stringify(teethState),
      updatedAt: new Date().toISOString()
    }).then(() => {
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    }).catch(error => {
      handleFirestoreError(error, OperationType.UPDATE, `patients/${patient.id}`);
    });
    
    addSyncTask(savePromise);
  };

  const handleToothClick = (id: number) => {
    setSelectedTooth(id);
    if (!teethState[id]) {
      setTeethState(prev => ({ ...prev, [id]: { id, status: 'healthy', notes: '' } }));
    }
  };

  const updateToothStatus = (status: ToothStatus) => {
    if (selectedTooth) {
      setTeethState(prev => ({
        ...prev,
        [selectedTooth]: { ...prev[selectedTooth], status }
      }));
    }
  };

  const updateToothNotes = (notes: string) => {
    if (selectedTooth) {
      setTeethState(prev => ({
        ...prev,
        [selectedTooth]: { ...prev[selectedTooth], notes }
      }));
    }
  };

  const copyAnalysisToNotes = () => {
    if (aiAnalysis && selectedTooth) {
      const currentNotes = teethState[selectedTooth]?.notes || '';
      const newNotes = currentNotes 
        ? `${currentNotes}\n\n---\nSugestão IA:\n${aiAnalysis}`
        : `Sugestão IA:\n${aiAnalysis}`;
      updateToothNotes(newNotes);
    }
  };

  const renderArch = (teeth: number[][]) => {
    const isAdult = teeth[0].length > 10;
    const spacing = isAdult ? 46 : 60;
    const archWidth = (teeth[0].length - 1) * spacing;
    const offset = (800 - archWidth) / 2 - 20; // -20 because ToothIcon starts at x=5

    return (
      <svg viewBox="0 0 800 240" className="w-full h-auto max-w-4xl mx-auto drop-shadow-sm">
        {/* Upper Arch */}
        <g transform={`translate(${offset}, 20)`}>
          {teeth[0].map((id, index) => (
            <g key={id} transform={`translate(${index * spacing}, 0)`}>
              <ToothIcon
                id={id}
                status={teethState[id]?.status || 'healthy'}
                isSelected={selectedTooth === id}
                onClick={() => handleToothClick(id)}
              />
            </g>
          ))}
          <text x={archWidth / 2 + 20} y="75" textAnchor="middle" className="fill-zinc-400 text-[10px] uppercase tracking-widest font-bold opacity-60">Arcada Superior</text>
        </g>

        {/* Lower Arch */}
        <g transform={`translate(${offset}, 140)`}>
          {teeth[1].map((id, index) => (
            <g key={id} transform={`translate(${index * spacing}, 0)`}>
              <ToothIcon
                id={id}
                status={teethState[id]?.status || 'healthy'}
                isSelected={selectedTooth === id}
                onClick={() => handleToothClick(id)}
              />
            </g>
          ))}
          <text x={archWidth / 2 + 20} y="75" textAnchor="middle" className="fill-zinc-400 text-[10px] uppercase tracking-widest font-bold opacity-60">Arcada Inferior</text>
        </g>
        
        {/* Center Line */}
        <line x1="400" y1="10" x2="400" y2="230" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" className="text-zinc-200 dark:text-zinc-800" />
      </svg>
    );
  };

  const adultTeeth = [
    [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28],
    [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38]
  ];

  const pediatricTeeth = [
    [55, 54, 53, 52, 51, 61, 62, 63, 64, 65],
    [85, 84, 83, 82, 81, 71, 72, 73, 74, 75]
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-surface p-4 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center">
            <Activity className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-text-primary">Odontograma Interativo</h2>
            <p className="text-xs text-text-secondary">Selecione os dentes para registrar condições.</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl flex-1 sm:flex-none">
            <button
              onClick={() => setOdontogramMode('adult')}
              className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${odontogramMode === 'adult' ? 'bg-white dark:bg-zinc-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}
            >
              ADULTO
            </button>
            <button
              onClick={() => setOdontogramMode('pediatric')}
              className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${odontogramMode === 'pediatric' ? 'bg-white dark:bg-zinc-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}
            >
              INFANTIL
            </button>
          </div>
          
          <button 
            onClick={handleSave}
            className="flex items-center justify-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-sm shadow-indigo-200 dark:shadow-none text-sm font-bold"
          >
            <Save className="w-4 h-4" />
            <span className="hidden sm:inline">Salvar</span>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-4 py-3 rounded-2xl border border-emerald-100 dark:border-emerald-500/20 text-sm font-medium"
          >
            <CheckCircle2 className="w-4 h-4" />
            Alterações salvas com sucesso no prontuário!
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        <div className="xl:col-span-3 bg-surface p-6 sm:p-10 rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-x-auto hide-scrollbar">
          <div className="min-w-[700px] lg:min-w-0">
            {odontogramMode === 'adult' ? renderArch(adultTeeth) : renderArch(pediatricTeeth)}
          </div>
          
          <div className="mt-10 flex flex-wrap justify-center gap-x-8 gap-y-4 border-t border-zinc-100 dark:border-zinc-800 pt-8">
            {Object.entries(statusConfig).map(([key, config]) => (
              <div key={key} className="flex items-center gap-2.5 group cursor-default">
                <div className={`w-4 h-4 rounded-full ${config.bg} border border-zinc-200 dark:border-zinc-700 shadow-sm group-hover:scale-110 transition-transform`} />
                <span className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">{config.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="xl:col-span-1">
          <AnimatePresence mode="wait">
            {selectedTooth ? (
              <motion.div
                key={selectedTooth}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm h-full flex flex-col"
              >
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-2xl font-bold text-text-primary">Dente {selectedTooth}</h3>
                    <p className="text-sm text-text-secondary">
                      {selectedTooth <= 28 && selectedTooth >= 11 ? 'Arcada Superior' : 'Arcada Inferior'}
                    </p>
                  </div>
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${statusConfig[teethState[selectedTooth]?.status || 'healthy'].bg}`}>
                    <span className="text-white font-bold">{selectedTooth}</span>
                  </div>
                </div>

                <div className="space-y-6 flex-1">
                  <div>
                    <label className="block text-sm font-semibold text-text-primary mb-3">Status Clínico</label>
                    <select
                      value={teethState[selectedTooth]?.status || 'healthy'}
                      onChange={(e) => updateToothStatus(e.target.value as ToothStatus)}
                      className="w-full bg-surface border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-text-primary focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    >
                      {(Object.keys(statusConfig) as ToothStatus[]).map(status => (
                        <option key={status} value={status}>
                          {statusConfig[status].label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-text-primary mb-2">Observações do Dente</label>
                    <textarea
                      value={teethState[selectedTooth]?.notes || ''}
                      onChange={(e) => updateToothNotes(e.target.value)}
                      placeholder="Descreva o estado, tratamentos realizados ou planejados para este dente..."
                      className="w-full bg-surface border border-zinc-200 dark:border-zinc-700 rounded-2xl p-4 text-sm text-text-primary focus:ring-2 focus:ring-indigo-500 resize-none h-40 transition-all"
                    />
                  </div>
                  
                  {/* AI Analysis Section */}
                  <div className="flex flex-col gap-3 mt-2">
                    <div className="flex items-center justify-between px-2 py-1">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-100 dark:shadow-none">
                          <Sparkles className="w-4.5 h-4.5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-text-primary tracking-tight">Análise Inteligente</h4>
                          <p className="text-[10px] text-text-secondary font-medium uppercase tracking-wider">Powered by {isHybridMode ? 'Gemma-4-E2B-it (Local)' : 'Gemini'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setIsHybridMode(!isHybridMode)}
                          className={`hidden sm:inline-flex relative h-5 w-9 items-center rounded-full transition-colors ${isHybridMode ? 'bg-indigo-600' : 'bg-zinc-300 dark:bg-zinc-700'}`}
                          title="Alternar Modo Híbrido (Gemma-4-E2B-it)"
                        >
                          <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${isHybridMode ? 'translate-x-5' : 'translate-x-1'}`} />
                        </button>
                        {aiAnalysis && !isAnalyzing && (
                          <button
                            onClick={copyAnalysisToNotes}
                            className="flex items-center gap-2 px-3.5 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all active:scale-95 shadow-sm"
                          >
                            <Wand2 className="w-3.5 h-3.5" />
                            <span>Aplicar</span>
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-zinc-50 to-white dark:from-zinc-900/50 dark:to-zinc-900/30 rounded-3xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-inner">
                      <div className="p-5">
                        {isAnalyzing ? (
                          <div className="flex flex-col items-center justify-center py-8 text-center space-y-4">
                            <div className="relative">
                              <div className="absolute inset-0 bg-indigo-500/20 blur-xl rounded-full animate-pulse" />
                              <Loader2 className="w-10 h-10 animate-spin text-indigo-600 dark:text-indigo-400 relative z-10" />
                              <Sparkles className="w-4 h-4 text-indigo-400 absolute -top-1 -right-1 animate-bounce" />
                            </div>
                            <div className="space-y-1">
                              <p className="text-xs font-black text-text-primary uppercase tracking-[0.2em]">Processando</p>
                              <p className="text-[10px] text-text-secondary font-medium">Analisando padrões clínicos...</p>
                            </div>
                          </div>
                        ) : aiAnalysis ? (
                          <div className="prose dark:prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-p:text-zinc-600 dark:prose-p:text-zinc-400 prose-strong:text-indigo-600 dark:prose-strong:text-indigo-400 prose-headings:text-text-primary prose-headings:font-bold">
                            <Markdown>{aiAnalysis}</Markdown>
                          </div>
                        ) : files.length > 0 ? (
                          <div className="flex flex-col items-center justify-center py-8 text-center space-y-5">
                            <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                              <BrainCircuit className="w-8 h-8" />
                            </div>
                            <div className="space-y-4">
                              <div className="space-y-1">
                                <p className="text-sm font-bold text-text-primary">Pronto para Analisar</p>
                                <p className="text-[10px] text-text-secondary font-medium uppercase tracking-wider">Imagens detectadas no prontuário</p>
                              </div>
                              <button
                                onClick={() => selectedTooth && analyzeTooth(selectedTooth)}
                                className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100 dark:shadow-none active:scale-95"
                              >
                                <Sparkles className="w-4 h-4" />
                                Iniciar Análise
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center py-8 text-center space-y-3 opacity-60">
                            <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400">
                              <ImageIcon className="w-6 h-6" />
                            </div>
                            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Sem imagens para análise</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 pt-6 border-t border-zinc-100 dark:border-zinc-800">
                  <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-500/5 rounded-2xl border border-amber-100 dark:border-amber-500/10">
                    <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-800 dark:text-amber-400 leading-relaxed">
                      Lembre-se de salvar as alterações para atualizar o prontuário permanente do paciente.
                    </p>
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="bg-surface rounded-3xl border-2 border-dashed border-zinc-200 dark:border-zinc-800 p-12 h-full flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-surface rounded-2xl shadow-sm flex items-center justify-center mb-4">
                  <Info className="w-8 h-8 text-zinc-400" />
                </div>
                <h4 className="text-lg font-semibold text-text-primary mb-2">Selecione um Dente</h4>
                <p className="text-sm text-text-secondary max-w-[200px]">
                  Clique em qualquer dente no odontograma para visualizar detalhes ou editar o status.
                </p>
                <div className="mt-8 flex items-center gap-2 text-xs font-medium text-indigo-600 dark:text-indigo-400">
                  <span>Aguardando seleção</span>
                  <motion.div
                    animate={{ x: [0, 5, 0] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </motion.div>
                </div>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
