import React, { useState, useEffect } from 'react';
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
}

export const PatientPrintModal: React.FC<PatientPrintModalProps> = ({ 
  isOpen, 
  onClose, 
  patient,
  preSelectedTab
}) => {
  const [selectedSections, setSelectedSections] = useState<string[]>([]);
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [selectedTemplates, setSelectedTemplates] = useState<string[]>([]);
  const [isPrinting, setIsPrinting] = useState(false);
  const [evolutions, setEvolutions] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);

  useEffect(() => {
    if (preSelectedTab && isOpen) {
      if (!selectedSections.includes(preSelectedTab)) {
        setSelectedSections([preSelectedTab]);
      }
    }
  }, [preSelectedTab, isOpen]);

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
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setEvolutions(data);
    });

    // Fetch payments
    const qPayments = query(
      collection(db, 'finances'),
      where('patientId', '==', patient.id),
      where('type', '==', 'income')
    );

    const unsubPayments = onSnapshot(qPayments, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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
    document.body.classList.add('is-unified-printing');
    
    // Give React a moment to render the print view in the DOM before opening the print dialog
    setTimeout(() => {
      window.print();
      document.body.classList.remove('is-unified-printing');
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
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 no-print"
        >
          <motion.div 
            initial={{ scale: 0.95 }} 
            animate={{ scale: 1 }} 
            exit={{ scale: 0.95 }}
            className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl"
          >
            <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
              <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
                <Printer className="w-5 h-5 text-indigo-600" />
                Impressão de Prontuário
              </h2>
              <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 flex-1 overflow-y-auto">
              <p className="text-sm text-text-secondary mb-6">
                Selecione os elementos da ficha do paciente que deseja incluir na impressão unificada. Cada elemento será impresso em uma página separada de forma otimizada.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Fixed Sections */}
                <div>
                  <h3 className="font-bold text-text-primary mb-4 flex items-center gap-2 border-b border-gray-200 dark:border-gray-800 pb-2">
                    Elementos Padrão
                  </h3>
                  <div className="space-y-3">
                    {baseSections.map(section => (
                      <button
                        key={section.id}
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
                <div>
                  <h3 className="font-bold text-text-primary mb-4 flex items-center gap-2 border-b border-gray-200 dark:border-gray-800 pb-2">
                    Termos e Receituários Salvos
                  </h3>
                  {templates.length === 0 ? (
                    <p className="text-sm text-text-secondary italic p-2">Nenhum modelo salvo encontrado.</p>
                  ) : (
                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                      {templates.map(template => (
                        <button
                          key={template.id}
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
              </div>
            </div>

            <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 flex justify-between items-center">
              <span className="text-sm text-text-secondary">
                {selectedSections.length + selectedTemplates.length} itens selecionados
              </span>
              <div className="flex gap-3">
                <button 
                  onClick={onClose}
                  className="px-4 py-2 text-text-secondary hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handlePrint}
                  disabled={selectedSections.length === 0 && selectedTemplates.length === 0 || isPrinting}
                  className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2 rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors font-medium shadow-md"
                >
                  <Printer className="w-4 h-4" />
                  {isPrinting ? 'Preparando...' : 'Gerar Impressão'}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Render the actual print view hidden unless printing is active and selected */}
      {/* We always render it so it's in the DOM when window.print() is called, but CSS hides it when not printing */}
      <PatientPrintView 
        patient={patient}
        selectedSections={selectedSections}
        selectedTemplates={templates.filter(t => selectedTemplates.includes(t.id))}
        evolutions={evolutions}
        payments={payments}
      />
    </AnimatePresence>
  );
};
