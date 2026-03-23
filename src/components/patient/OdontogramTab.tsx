import React, { useState, useEffect } from 'react';
import { doc, updateDoc, collection, query, where, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, auth } from '../../firebase';
import { Patient, FileRecord } from '../../types';
import { Save, Loader2, Info, ChevronRight, AlertCircle, CheckCircle2, BrainCircuit } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from '@google/genai';

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
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      
      const imageParts = files.slice(0, 3).map(file => ({
        inlineData: {
          mimeType: 'image/jpeg',
          data: file.url.split(',')[1] // Assuming base64 data URL
        }
      }));

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
          parts: [
            ...imageParts,
            { text: `Analise estas imagens odontológicas para o dente número ${toothId}. Sugira possíveis diagnósticos como cáries, restaurações, etc. Seja breve.` }
          ]
        }
      });
      setAiAnalysis(response.text || 'Nenhuma análise disponível.');
    } catch (error) {
      console.error('AI analysis error', error);
      setAiAnalysis('Erro ao analisar imagens.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    if (selectedTooth) {
      analyzeTooth(selectedTooth);
    }
  }, [selectedTooth, files]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'patients', patient.id), {
        odontogram: JSON.stringify(teethState),
        updatedAt: new Date().toISOString()
      });
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `patients/${patient.id}`);
    } finally {
      setIsSaving(false);
    }
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

  const renderArch = (teeth: number[][]) => (
    <svg viewBox="0 0 800 240" className="w-full h-auto max-w-4xl mx-auto">
      {/* Upper Arch */}
      <g transform="translate(40, 20)">
        {teeth[0].map((id, index) => (
          <g key={id} transform={`translate(${index * 45}, 0)`}>
            <ToothIcon
              id={id}
              status={teethState[id]?.status || 'healthy'}
              isSelected={selectedTooth === id}
              onClick={() => handleToothClick(id)}
            />
          </g>
        ))}
        <text x={odontogramMode === 'adult' ? "360" : "225"} y="70" textAnchor="middle" className="fill-zinc-400 text-[10px] uppercase tracking-widest font-medium">Maxila (Superior)</text>
      </g>

      {/* Lower Arch */}
      <g transform="translate(40, 140)">
        {teeth[1].map((id, index) => (
          <g key={id} transform={`translate(${index * 45}, 0)`}>
            <ToothIcon
              id={id}
              status={teethState[id]?.status || 'healthy'}
              isSelected={selectedTooth === id}
              onClick={() => handleToothClick(id)}
            />
          </g>
        ))}
        <text x={odontogramMode === 'adult' ? "360" : "225"} y="70" textAnchor="middle" className="fill-zinc-400 text-[10px] uppercase tracking-widest font-medium">Mandíbula (Inferior)</text>
      </g>
    </svg>
  );

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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold text-text-primary">Odontograma Interativo</h2>
          <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl">
            <button
              onClick={() => setOdontogramMode('adult')}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${odontogramMode === 'adult' ? 'bg-surface text-text-primary shadow-sm' : 'text-text-secondary'}`}
            >
              Adulto
            </button>
            <button
              onClick={() => setOdontogramMode('pediatric')}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${odontogramMode === 'pediatric' ? 'bg-surface text-text-primary shadow-sm' : 'text-text-secondary'}`}
            >
              Infantil
            </button>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <AnimatePresence>
            {showSuccess && (
              <motion.div
                initial={{ opacity: 0, x: 20, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 20, scale: 0.9 }}
                className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-4 py-2 rounded-xl border border-emerald-100 dark:border-emerald-500/20 text-sm font-medium"
              >
                <CheckCircle2 className="w-4 h-4" />
                Alterações salvas com sucesso!
              </motion.div>
            )}
          </AnimatePresence>
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-sm shadow-indigo-200 dark:shadow-none"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Salvar Alterações
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        <div className="xl:col-span-3 bg-surface p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-x-auto">
          <div className="min-w-[800px]">
            {odontogramMode === 'adult' ? renderArch(adultTeeth) : renderArch(pediatricTeeth)}
          </div>
          
          <div className="mt-8 flex flex-wrap justify-center gap-4 border-t border-zinc-100 dark:border-zinc-800 pt-6">
            {Object.entries(statusConfig).map(([key, config]) => (
              <div key={key} className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${config.bg}`} />
                <span className="text-xs text-text-secondary">{config.label}</span>
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
                  <div className="p-4 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl border border-indigo-100 dark:border-indigo-500/20">
                    <div className="flex items-center gap-2 mb-2 text-indigo-700 dark:text-indigo-400">
                      <BrainCircuit className="w-5 h-5" />
                      <h4 className="font-semibold text-sm">Análise por IA</h4>
                    </div>
                    {isAnalyzing ? (
                      <div className="flex items-center gap-2 text-sm text-zinc-500">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Analisando imagens...
                      </div>
                    ) : aiAnalysis ? (
                      <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">{aiAnalysis}</p>
                    ) : files.length > 0 ? (
                      <p className="text-sm text-zinc-500">Clique no dente para analisar.</p>
                    ) : (
                      <p className="text-sm text-zinc-500">Nenhuma imagem disponível para análise.</p>
                    )}
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
