import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Printer, FileText, CheckSquare, Square } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, query, where, getDocs, onSnapshot, orderBy } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { Patient, DocumentTemplate } from '../../types';
import { PatientPrintView } from './PatientPrintView';

interface PatientPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: Patient;
  preSelectedTab?: string;
  customDocument?: {
    title: string;
    content: string;
    type: string;
  };
}

export const PatientPrintModal: React.FC<PatientPrintModalProps> = ({ 
  isOpen, 
  onClose, 
  patient,
  preSelectedTab,
  customDocument
}) => {
  const [selectedSections, setSelectedSections] = useState<string[]>([]);
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [selectedTemplates, setSelectedTemplates] = useState<string[]>([]);
  const [includeCustomDocument, setIncludeCustomDocument] = useState<boolean>(false);
  const [showDentistSignature, setShowDentistSignature] = useState(true);
  const [showPatientSignature, setShowPatientSignature] = useState(true);
  const [isPrinting, setIsPrinting] = useState(false);
  const [evolutions, setEvolutions] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen) {
      if (preSelectedTab && !selectedSections.includes(preSelectedTab)) {
        setSelectedSections([preSelectedTab]);
      }
      if (customDocument) {
        setIncludeCustomDocument(true);
      }
    }
  }, [preSelectedTab, customDocument, isOpen]);

  useEffect(() => {
    if (!auth.currentUser || !isOpen) return;

    // Fetch document templates
    const qTemplates = query(
      collection(db, 'documentTemplates'),
      where('dentistId', '==', auth.currentUser.uid)
    );
    
    const unsubTemplates = onSnapshot(qTemplates, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DocumentTemplate));
      data.sort((a, b) => a.title.localeCompare(b.title));
      setTemplates(data);
    });

    // Fetch evolutions for this patient (needed for print view if selected)
    const qEvolutions = query(
      collection(db, 'clinical_evolutions'),
      where('patientId', '==', patient.id),
      orderBy('createdAt', 'desc')
    );

    const unsubEvolutions = onSnapshot(qEvolutions, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      setEvolutions(data);
    });

    // Fetch payments
    const qPayments = query(
      collection(db, 'finances'),
      where('patientId', '==', patient.id),
      where('type', '==', 'income')
    );

    const unsubPayments = onSnapshot(qPayments, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setPayments(data);
    });

    return () => {
      unsubTemplates();
      unsubEvolutions();
      unsubPayments();
    };
  }, [isOpen, patient.id]);

  const handleToggleSection = (sectionId: string) => {
    setSelectedSections(prev => 
      prev.includes(sectionId) 
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const handleToggleTemplate = (templateId: string) => {
    setSelectedTemplates(prev => 
      prev.includes(templateId) 
        ? prev.filter(id => id !== templateId)
        : [...prev, templateId]
    );
  };

  const handlePrint = () => {
    setIsPrinting(true);
    
    // Force light mode for print to avoid any "tarja preta" or dark background bleeding
    const wasDarkMode = document.documentElement.classList.contains('dark');
    if (wasDarkMode) {
      document.documentElement.classList.remove('dark');
    }
    
    document.body.classList.add('is-unified-printing');

    // Dynamically inject A4 orientation stylesheet to force browser settings
    const selectedTemplateObjects = templates.filter(t => selectedTemplates.includes(t.id));

    const hasLandscape = selectedSections.includes('recomendacoes') || 
                         selectedTemplateObjects.some(t => t.type === 'prescription' || t.type === 'postop') ||
                         (includeCustomDocument && customDocument && 
                           (customDocument.type === 'prescription' || 
                            customDocument.type === 'postop' || 
                            customDocument.type === 'recomendacoes'));

    const hasPortrait = selectedSections.some(s => s !== 'recomendacoes') || 
                        selectedTemplateObjects.some(t => t.type !== 'prescription' && t.type !== 'postop') || 
                        (includeCustomDocument && customDocument && 
                          customDocument.type !== 'prescription' && 
                          customDocument.type !== 'postop' && 
                          customDocument.type !== 'recomendacoes');

    const styleEl = document.createElement('style');
    styleEl.id = 'dynamic-print-page-style';
    
    if (hasLandscape && !hasPortrait) {
      styleEl.innerHTML = `
        @page {
          size: A4 landscape !important;
          margin: 10mm 10mm 10mm 10mm !important;
        }
      `;
      document.head.appendChild(styleEl);
    } else if (hasPortrait && !hasLandscape) {
      styleEl.innerHTML = `
        @page {
          size: A4 portrait !important;
          margin: 15mm 15mm 15mm 15mm !important;
        }
      `;
      document.head.appendChild(styleEl);
    }
    
    // Give React a moment to render the print view in the DOM before opening the print dialog
    setTimeout(() => {
      window.print();
      
      // Cleanup after print dialog closes
      document.body.classList.remove('is-unified-printing');
      const dynamicStyle = document.getElementById('dynamic-print-page-style');
      if (dynamicStyle) {
        dynamicStyle.remove();
      }
      if (wasDarkMode) {
        document.documentElement.classList.add('dark');
      }
      setIsPrinting(false);
      onClose();
    }, 500);
  };

  const baseSections = [
    { id: 'personal', label: 'Dados Pessoais' },
    { id: 'anamnesis', label: 'Anamnese' },
    { id: 'odontogram', label: 'Odontograma' },
    { id: 'evolution', label: 'Evolução Clínica' },
    { id: 'treatment', label: 'Plano de Tratamento' },
    { id: 'payments', label: 'Histórico Financeiro' },
    { id: 'atestado', label: 'Atestado Odontológico' },
    { id: 'recomendacoes', label: 'Recomendações Pós-Op' },
  ];

  return (
    <>
      <AnimatePresence>
        {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-2 sm:p-6 no-print backdrop-blur-sm"
        >
          <motion.div 
            initial={{ scale: 0.95, y: 20 }} 
            animate={{ scale: 1, y: 0 }} 
            exit={{ scale: 0.95, y: 20 }}
            className="bg-zinc-100 dark:bg-zinc-900 rounded-2xl w-full max-w-7xl h-[95vh] flex flex-col overflow-hidden shadow-2xl ring-1 ring-white/10"
          >
            {/* Header */}
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-white dark:bg-zinc-900 shrink-0">
              <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Printer className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                Impressão de Prontuário
              </h2>
              <div className="flex items-center gap-4">
                <button 
                  onClick={handlePrint}
                  disabled={(selectedSections.length === 0 && selectedTemplates.length === 0 && !includeCustomDocument) || isPrinting}
                  className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2 rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors font-medium shadow-md"
                >
                  <Printer className="w-4 h-4" />
                  {isPrinting ? 'Preparando...' : 'Gerar PDF / Imprimir'}
                </button>
                <button onClick={onClose} className="p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
              {/* Sidebar Settings */}
              <div className="w-full md:w-80 lg:w-96 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 overflow-y-auto shrink-0 p-5">
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
                  Selecione os elementos que deseja incluir. O preview ao lado mostra como o documento ficará impresso.
                </p>

                <div className="space-y-8">
                  {/* Fixed Sections */}
                <div>
                  <h3 className="font-bold text-text-primary mb-4 flex items-center gap-2 border-b border-gray-200 dark:border-gray-800 pb-2">
                    Elementos Padrão
                  </h3>
                  <div className="space-y-3">
                    {baseSections.map(section => (
                      <button
                        key={`section-${section.id}`}
                        onClick={() => handleToggleSection(section.id)}
                        className="flex items-center gap-3 w-full text-left p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
                      >
                        {selectedSections.includes(section.id) ? (
                          <CheckSquare className="w-5 h-5 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
                        ) : (
                          <Square className="w-5 h-5 text-gray-400 flex-shrink-0" />
                        )}
                        <span className="text-sm font-medium text-text-primary">{section.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Templates */}
                <div className="space-y-6">
                  <div>
                    <h3 className="font-bold text-text-primary mb-4 flex items-center gap-2 border-b border-gray-200 dark:border-gray-800 pb-2">
                      Documentos
                    </h3>
                    
                    <div className="space-y-3 mb-4">
                      {customDocument && (
                        <button
                          onClick={() => setIncludeCustomDocument(!includeCustomDocument)}
                          className="flex items-start gap-3 w-full text-left p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors border-2 border-indigo-100 dark:border-indigo-900/30 bg-indigo-50/50 dark:bg-indigo-900/10"
                        >
                          <div className="mt-0.5">
                            {includeCustomDocument ? (
                              <CheckSquare className="w-5 h-5 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
                            ) : (
                              <Square className="w-5 h-5 text-gray-400 flex-shrink-0" />
                            )}
                          </div>
                          <div>
                            <span className="text-sm font-bold text-indigo-900 dark:text-indigo-100 block leading-tight">{customDocument.title}</span>
                            <span className="text-xs text-indigo-600 dark:text-indigo-400 uppercase mt-1 block">Documento Atual</span>
                          </div>
                        </button>
                      )}
                    </div>

                    <h4 className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-3">Modelos Salvos</h4>
                    {templates.length === 0 ? (
                      <p className="text-sm text-text-secondary italic p-2">Nenhum modelo salvo encontrado.</p>
                    ) : (
                      <div className="space-y-3 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                        {templates.map(template => (
                          <button
                            key={`template-${template.id}`}
                            onClick={() => handleToggleTemplate(template.id)}
                            className="flex items-start gap-3 w-full text-left p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
                          >
                            <div className="mt-0.5">
                              {selectedTemplates.includes(template.id) ? (
                                <CheckSquare className="w-5 h-5 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
                              ) : (
                                <Square className="w-5 h-5 text-gray-400 flex-shrink-0" />
                              )}
                            </div>
                            <div>
                              <span className="text-sm font-medium text-text-primary block leading-tight">{template.title}</span>
                              <span className="text-xs text-text-secondary uppercase mt-1 block">{template.type}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <h3 className="font-bold text-text-primary mb-4 flex items-center gap-2 border-b border-gray-200 dark:border-gray-800 pb-2">
                      Assinaturas no Rodapé
                    </h3>
                    <div className="space-y-3">
                      <button
                        onClick={() => setShowDentistSignature(!showDentistSignature)}
                        className="flex items-center gap-3 w-full text-left p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
                      >
                        {showDentistSignature ? (
                          <CheckSquare className="w-5 h-5 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
                        ) : (
                          <Square className="w-5 h-5 text-gray-400 flex-shrink-0" />
                        )}
                        <span className="text-sm font-medium text-text-primary">Espaço p/ Assinatura do Dentista</span>
                      </button>
                      <button
                        onClick={() => setShowPatientSignature(!showPatientSignature)}
                        className="flex items-center gap-3 w-full text-left p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
                      >
                        {showPatientSignature ? (
                          <CheckSquare className="w-5 h-5 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
                        ) : (
                          <Square className="w-5 h-5 text-gray-400 flex-shrink-0" />
                        )}
                        <span className="text-sm font-medium text-text-primary">Espaço p/ Assinatura do Paciente</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

              {/* Preview Area */}
              <div className="flex-1 bg-zinc-200 dark:bg-zinc-800 overflow-y-auto p-4 sm:p-8 flex justify-center print-preview-container">
                {/* We render PatientPrintView inside the preview container so the user can see it */}
                {/* To ensure light mode colors, we force text-black and light mode backgrounds inside PatientPrintView */}
                {(selectedSections.length > 0 || selectedTemplates.length > 0 || includeCustomDocument) ? (
                  <div className="w-full flex flex-col items-center pointer-events-none">
                    <PatientPrintView 
                      patient={patient}
                      selectedSections={selectedSections}
                      selectedTemplates={templates.filter(t => selectedTemplates.includes(t.id))}
                      evolutions={evolutions}
                      payments={payments}
                      customDocument={includeCustomDocument ? customDocument : undefined}
                      showDentistSignature={showDentistSignature}
                      showPatientSignature={showPatientSignature}
                    />
                  </div>
                ) : (
                  <div className="bg-white w-[210mm] h-[297mm] flex flex-col items-center justify-center text-zinc-400 p-20 text-center shadow-xl border border-zinc-200">
                    <FileText className="w-16 h-16 mb-4 opacity-20" />
                    <p className="text-lg font-medium">Nenhum item selecionado</p>
                    <p className="text-sm">Selecione ao menos um elemento na aba lateral para visualizar a impressão.</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

      {isOpen && createPortal(
        <div className="unified-print-only">
          <PatientPrintView 
            patient={patient}
            selectedSections={selectedSections}
            selectedTemplates={templates.filter(t => selectedTemplates.includes(t.id))}
            evolutions={evolutions}
            payments={payments}
            customDocument={includeCustomDocument ? customDocument : undefined}
            showDentistSignature={showDentistSignature}
            showPatientSignature={showPatientSignature}
          />
        </div>,
        document.body
      )}
    </>
  );
};
