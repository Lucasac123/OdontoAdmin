import React, { useState, useEffect } from 'react';
import { X, Search, Plus, Save, Trash2, Edit2, FileText, Upload, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType, moveToTrash } from '../../firebase';
import { DocumentTemplate } from '../../types';
import { GoogleGenAI } from '@google/genai';
import { DOCUMENT_TEMPLATES } from '../../data/clinicalData';
import { ConfirmModal } from '../ConfirmModal';

interface PrescriptionTemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentType: 'prescription' | 'certificate' | 'attendance' | 'referral' | 'postop' | 'tcle' | 'image-release' | 'laudo' | 'exame';
  currentText: string;
  onSelectTemplate: (text: string) => void;
}

export const PrescriptionTemplatesModal: React.FC<PrescriptionTemplatesModalProps> = ({ 
  isOpen, 
  onClose, 
  currentType, 
  currentText,
  onSelectTemplate 
}) => {
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveTitle, setSaveTitle] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!auth.currentUser || !isOpen) return;

    const q = query(
      collection(db, 'documentTemplates'),
      where('dentistId', '==', auth.currentUser.uid),
      where('type', '==', currentType)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DocumentTemplate));
      data.sort((a, b) => a.title.localeCompare(b.title));
      setTemplates(data);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'documentTemplates'));

    return () => unsubscribe();
  }, [isOpen, currentType]);

  const handleSaveCurrent = async () => {
    if (!auth.currentUser || !saveTitle.trim() || !currentText.trim() || isSaving) return;

    setIsSaving(true);
    try {
      await addDoc(collection(db, 'documentTemplates'), {
        dentistId: auth.currentUser.uid,
        title: saveTitle,
        type: currentType,
        content: currentText,
        createdAt: new Date().toISOString()
      });
      setSaveTitle('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'documentTemplates');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (id: string) => {
    setTemplateToDelete(id);
    setIsConfirmModalOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!templateToDelete) return;
    
    const deletePromise = moveToTrash('documentTemplates', templateToDelete).catch(error => {
      console.error("Erro ao excluir modelo:", error);
      handleFirestoreError(error, OperationType.DELETE, `documentTemplates/${templateToDelete}`);
    });
    
    addSyncTask(deletePromise);
    setIsConfirmModalOpen(false);
    setTemplateToDelete(null);
  };

  const handleScanTemplate = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Data = (reader.result as string).split(',')[1];
        
        const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: [
            {
              role: 'user',
              parts: [
                {
                  inlineData: {
                    data: base64Data,
                    mimeType: file.type
                  }
                },
                {
                  text: "Extraia o texto deste documento odontológico (receita, atestado, etc). Formate o texto de forma limpa, mantendo a estrutura de parágrafos e listas. Não inclua cabeçalhos com dados específicos de pacientes se puder evitar, ou substitua por espaços em branco para preenchimento. Retorne apenas o texto extraído."
                }
              ]
            }
          ]
        });

        if (response.text) {
          onSelectTemplate(response.text);
          onClose();
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Erro ao analisar documento:", error);
    } finally {
      setIsScanning(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const standardTemplates = Object.entries(DOCUMENT_TEMPLATES)
    .filter(([key]) => {
      if (currentType === 'prescription') return key === 'receita';
      if (currentType === 'certificate') return key === 'atestado';
      if (currentType === 'attendance') return key === 'atestadoComparecimento';
      if (currentType === 'laudo') return key === 'laudo';
      if (currentType === 'exame') return key === 'exame';
      if (currentType === 'referral') return key === 'encaminhamentoCardio' || key === 'encaminhamentoMedico' || key === 'encaminhamentoOdontologico' || key === 'encaminhamentoProtetico';
      if (currentType === 'postop') return key === 'posOperatorio';
      if (currentType === 'tcle') return key === 'termoConsentimento';
      if (currentType === 'image-release') return key === 'registroImagens';
      return false;
    })
    .map(([key, value]) => ({ id: key, title: value.title, content: value.content }));

  const filteredTemplates = templates.filter(t => t.title.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        >
          <motion.div 
            initial={{ scale: 0.95 }} 
            animate={{ scale: 1 }} 
            exit={{ scale: 0.95 }}
            className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden shadow-2xl"
          >
            <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
              <h2 className="text-lg font-bold text-text-primary">Modelos de Documentos</h2>
              <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 flex-1 overflow-y-auto">
              <div className="space-y-4 mb-6">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input 
                      type="text" 
                      placeholder="Buscar modelos..." 
                      className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 text-sm"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isScanning}
                    className="p-2 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors disabled:opacity-50"
                    title="Escanear modelo de documento"
                  >
                    {isScanning ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                  </button>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*,.pdf" 
                    onChange={handleScanTemplate} 
                  />
                </div>

                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
                  <h4 className="text-sm font-bold text-text-primary mb-3 flex items-center gap-2">
                    <Save className="w-4 h-4 text-indigo-600" />
                    Salvar texto atual como modelo
                  </h4>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="Título do modelo..." 
                      className="flex-1 px-3 py-2 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 text-sm"
                      value={saveTitle}
                      onChange={(e) => setSaveTitle(e.target.value)}
                    />
                    <button 
                      onClick={handleSaveCurrent}
                      disabled={!saveTitle.trim() || isSaving}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                      Salvar
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {standardTemplates.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-xs font-bold text-text-secondary uppercase mb-2">Modelos Padrão</h4>
                    {standardTemplates.map((template) => (
                      <div key={template.id} className="flex items-center p-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/30 rounded-xl cursor-pointer hover:border-indigo-300 transition-colors" onClick={() => { onSelectTemplate(template.content); onClose(); }}>
                        <FileText className="w-5 h-5 text-indigo-600 mr-3" />
                        <h3 className="text-sm font-bold text-text-primary">{template.title}</h3>
                      </div>
                    ))}
                  </div>
                )}
                <h4 className="text-xs font-bold text-text-secondary uppercase mb-2">Modelos Salvos</h4>
                {filteredTemplates.map((template) => (
                  <div key={template.id} className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-indigo-300 transition-colors">
                    <div className="flex items-center cursor-pointer flex-1" onClick={() => { onSelectTemplate(template.content); onClose(); }}>
                      <FileText className="w-5 h-5 text-gray-400 mr-3" />
                      <h3 className="text-sm font-bold text-text-primary">{template.title}</h3>
                    </div>
                    <button onClick={() => handleDelete(template.id)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
      <ConfirmModal
        isOpen={isConfirmModalOpen}
        onCancel={() => setIsConfirmModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Excluir Modelo"
        message="Tem certeza que deseja excluir este modelo de documento? Ele será movido para a lixeira."
      />
    </AnimatePresence>
  );
};
