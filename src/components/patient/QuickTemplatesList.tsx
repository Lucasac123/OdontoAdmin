import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType, moveToTrash } from '../../firebase';
import { DocumentTemplate } from '../../types';
import { DOCUMENT_TEMPLATES } from '../../data/clinicalData';
import { Save, FileText, Trash2, Loader2, Plus, Search } from 'lucide-react';
import { ConfirmModal } from '../ConfirmModal';
import { useSync } from '../../context/SyncContext';

interface QuickTemplatesListProps {
  currentType: 'prescription' | 'certificate' | 'attendance' | 'referral' | 'postop' | 'tcle' | 'image-release' | 'laudo' | 'exame';
  currentText: string;
  onSelectTemplate: (text: string) => void;
}

export const QuickTemplatesList: React.FC<QuickTemplatesListProps> = ({ currentType, currentText, onSelectTemplate }) => {
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [saveTitle, setSaveTitle] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<string | null>(null);
  const { addSyncTask } = useSync();

  useEffect(() => {
    if (!auth.currentUser) return;

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
  }, [currentType]);

  const handleSaveCurrent = async () => {
    if (!auth.currentUser || !saveTitle.trim() || !currentText.trim() || isSaving) return;

    setIsSaving(true);
    try {
      const savePromise = addDoc(collection(db, 'documentTemplates'), {
        dentistId: auth.currentUser.uid,
        title: saveTitle,
        type: currentType,
        content: currentText,
        createdAt: new Date().toISOString()
      });
      addSyncTask(savePromise);
      await savePromise;
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

  const handleConfirmDelete = async () => {
    if (!templateToDelete) return;
    
    try {
      const deletePromise = moveToTrash('documentTemplates', templateToDelete);
      addSyncTask(deletePromise);
      await deletePromise;
      setIsConfirmModalOpen(false);
      setTemplateToDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `documentTemplates/${templateToDelete}`);
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
      if (currentType === 'tcle') return key === 'termoConsentimento' || key === 'termoCirurgia' || key === 'termoOrtodontia';
      if (currentType === 'image-release') return key === 'registroImagens';
      return false;
    })
    .map(([key, value]) => ({ id: key, title: value.title, content: value.content }));

  const filteredTemplates = templates.filter(t => t.title.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="bg-surface rounded-3xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm flex flex-col h-[500px]">
      <h3 className="text-lg font-bold text-text-primary mb-4 flex items-center gap-2">
        <FileText className="w-5 h-5 text-indigo-600" />
        Modelos Rápidos
      </h3>

      <div className="flex gap-2 mb-4 shrink-0">
        <input 
          type="text" 
          placeholder="Nome do novo modelo..." 
          className="flex-1 px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm focus:ring-2 focus:ring-indigo-500 text-text-primary"
          value={saveTitle}
          onChange={(e) => setSaveTitle(e.target.value)}
        />
        <button 
          onClick={handleSaveCurrent}
          disabled={!saveTitle.trim() || isSaving}
          className="px-3 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center min-w-[40px]"
          title="Salvar texto atual"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        </button>
      </div>

      <div className="relative mb-4 shrink-0">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
        <input 
          type="text" 
          placeholder="Buscar modelos..." 
          className="w-full pl-9 pr-4 py-2 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm focus:ring-2 focus:ring-indigo-500 text-text-primary"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
        {standardTemplates.length > 0 && (
          <div>
            <h4 className="text-[10px] font-black text-text-secondary uppercase tracking-widest mb-2 px-1">Padrões do Sistema</h4>
            <div className="space-y-2">
              {standardTemplates.map((template) => (
                <button
                  key={`std-${template.id}`}
                  onClick={() => onSelectTemplate(template.content)}
                  className="w-full flex items-center text-left p-3 bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-800/30 rounded-xl hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors group"
                >
                  <FileText className="w-4 h-4 text-indigo-500 mr-3 shrink-0" />
                  <span className="text-sm font-medium text-text-primary truncate">{template.title}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <h4 className="text-[10px] font-black text-text-secondary uppercase tracking-widest mb-2 px-1">Meus Modelos</h4>
          {filteredTemplates.length === 0 ? (
            <p className="text-xs text-text-secondary text-center py-4 bg-zinc-50 dark:bg-zinc-800/20 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800">
              Nenhum modelo salvo.
            </p>
          ) : (
            <div className="space-y-2">
              {filteredTemplates.map((template) => (
                <div key={`saved-${template.id}`} className="flex items-center justify-between p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors group">
                  <button 
                    onClick={() => onSelectTemplate(template.content)}
                    className="flex items-center flex-1 min-w-0 text-left"
                  >
                    <FileText className="w-4 h-4 text-zinc-400 group-hover:text-indigo-500 mr-3 shrink-0 transition-colors" />
                    <span className="text-sm font-medium text-text-primary truncate">{template.title}</span>
                  </button>
                  <button 
                    onClick={() => handleDelete(template.id)} 
                    className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg opacity-0 group-hover:opacity-100 transition-all shrink-0 ml-2"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <ConfirmModal
        isOpen={isConfirmModalOpen}
        onCancel={() => setIsConfirmModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Excluir Modelo"
        message="Tem certeza que deseja excluir este modelo de documento? Ele será movido para a lixeira."
      />
    </div>
  );
};
