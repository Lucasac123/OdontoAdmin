import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, updateDoc, doc } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType, moveToTrash } from '../../firebase';
import { Patient, ProcedureTemplate, InventoryItem } from '../../types';
import { Activity, Plus, Loader2, Trash2, Calendar, Clock, User, Printer, CheckCircle2, Circle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ConfirmModal } from '../ConfirmModal';
import { useSync } from '../../context/SyncContext';

interface EvolutionNote {
  id: string;
  patientId: string;
  dentistId: string;
  content: string;
  procedure?: string;
  tooth?: string;
  status?: 'realizado' | 'não_realizado';
  procedureId?: string; // Link to treatment plan procedure
  templateId?: string; // Link to procedure template
  executionDate?: string;
  createdAt: any;
  authorName: string;
}

export const ClinicalEvolutionTab = ({ patient }: { patient: Patient }) => {
  const [notes, setNotes] = useState<EvolutionNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<string | null>(null);
  const { addSyncTask } = useSync();
  
  const [templates, setTemplates] = useState<ProcedureTemplate[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  
  const [newNote, setNewNote] = useState({
    content: '',
    procedure: '',
    tooth: '',
    templateId: ''
  });

  useEffect(() => {
    if (!auth.currentUser) return;

    // Notes subscription
    const q = query(
      collection(db, 'clinical_evolutions'),
      where('patientId', '==', patient.id),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as EvolutionNote[];
      setNotes(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'clinical_evolutions');
      setLoading(false);
    });

    // Templates subscription
    const qTemplates = query(
      collection(db, 'procedure_templates'),
      where('dentistId', '==', auth.currentUser.uid)
    );
    const unsubTemplates = onSnapshot(qTemplates, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ProcedureTemplate[];
      setTemplates(data.sort((a, b) => a.name.localeCompare(b.name)));
    }, (error) => {
      console.error("Failed to load templates", error);
    });

    // Inventory subscription
    const qInventory = query(
      collection(db, 'inventory'),
      where('dentistId', '==', auth.currentUser.uid)
    );
    const unsubInventory = onSnapshot(qInventory, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as InventoryItem[];
      setInventory(data);
    }, (error) => {
      console.error("Failed to load inventory", error);
    });

    return () => {
      unsubscribe();
      unsubTemplates();
      unsubInventory();
    };
  }, [patient.id]);

  const deductStockForTemplate = async (templateId: string) => {
    if (!templateId) return;
    const template = templates.find(t => t.id === templateId);
    if (!template || !template.materials || template.materials.length === 0) return;

    let deductedItems: string[] = [];
    let lowStockAlerts: string[] = [];

    for (const material of template.materials) {
      if (!material.inventoryItemId) continue;
      
      const inventoryItem = inventory.find(i => i.id === material.inventoryItemId);
      if (inventoryItem) {
        // Skip subtraction if marked as reusable (e.g. instruments, dental drills)
        if (inventoryItem.isReusable === true) {
          continue;
        }

        const requiredQty = Number(material.quantity) || 1;
        const newQty = Math.max(0, inventoryItem.quantity - requiredQty);

        try {
          await updateDoc(doc(db, 'inventory', inventoryItem.id), {
            quantity: newQty,
            updatedAt: new Date().toISOString()
          });
          deductedItems.push(`• ${inventoryItem.name}: -${requiredQty} ${inventoryItem.unit || 'un'}`);
          
          if (newQty <= inventoryItem.minQuantity) {
            lowStockAlerts.push(`• ${inventoryItem.name} (${newQty} restando)`);
          }
        } catch (err) {
          console.error(`Erro ao subtrair estoque de ${inventoryItem.name}:`, err);
        }
      }
    }

    if (deductedItems.length > 0) {
      let msg = `Consumos de estoque registrados automaticamente:\n${deductedItems.join('\n')}`;
      if (lowStockAlerts.length > 0) {
        msg += `\n\n⚠️ ESTOQUE BAIXO DETECTADO:\n${lowStockAlerts.join('\n')}`;
      }
      alert(msg);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.content.trim() || !auth.currentUser) return;

    // Deduct stock if a procedure template was used
    if (newNote.templateId) {
      await deductStockForTemplate(newNote.templateId);
    }

    const savePromise = addDoc(collection(db, 'clinical_evolutions'), {
      patientId: patient.id,
      dentistId: auth.currentUser.uid,
      content: newNote.content,
      procedure: newNote.procedure,
      tooth: newNote.tooth,
      status: 'realizado', // Notes are usually realized things
      templateId: newNote.templateId || '',
      createdAt: serverTimestamp(),
      authorName: auth.currentUser.displayName || 'Dentista'
    }).catch(error => {
      handleFirestoreError(error, OperationType.CREATE, 'clinical_evolutions');
    });

    addSyncTask(savePromise);
    setNewNote({ content: '', procedure: '', tooth: '', templateId: '' });
  };

  const handleMarkAsRealized = async (noteId: string) => {
    const note = notes.find(n => n.id === noteId);
    if (note && note.templateId) {
      await deductStockForTemplate(note.templateId);
    }

    const savePromise = updateDoc(doc(db, 'clinical_evolutions', noteId), {
      status: 'realizado',
      executionDate: new Date().toISOString(),
      updatedAt: serverTimestamp()
    }).catch(error => {
      handleFirestoreError(error, OperationType.UPDATE, `clinical_evolutions/${noteId}`);
    });
    addSyncTask(savePromise);
  };

  const handleDelete = (id: string) => {
    setNoteToDelete(id);
    setIsConfirmModalOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!noteToDelete) return;
    
    const deletePromise = moveToTrash('clinical_evolutions', noteToDelete).catch(error => {
      console.error("Erro ao excluir evolução:", error);
      handleFirestoreError(error, OperationType.DELETE, `clinical_evolutions/${noteToDelete}`);
    });
    
    addSyncTask(deletePromise);
    setIsConfirmModalOpen(false);
    setNoteToDelete(null);
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Agora mesmo';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
          <Activity className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          Evolução Clínica
        </h2>
        <button 
          onClick={handlePrint}
          className="flex items-center gap-2 bg-white dark:bg-zinc-800 text-text-primary border border-zinc-200 dark:border-zinc-700 px-4 py-2 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors shadow-sm"
        >
          <Printer className="w-4 h-4" />
          Exportar PDF
        </button>
      </div>

      <div className="bg-surface rounded-3xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm">
        <form onSubmit={handleAddNote} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Procedimento Realizado (Opcional)</label>
              <input
                list="procedure-templates-list"
                type="text"
                disabled={isSaving}
                value={newNote.procedure}
                onChange={(e) => {
                  const val = e.target.value;
                  const foundTemplate = templates.find(t => t.name === val);
                  setNewNote({ 
                    ...newNote, 
                    procedure: val,
                    templateId: foundTemplate ? foundTemplate.id : ''
                  });
                }}
                placeholder="Busque ou digite um procedimento..."
                className="w-full bg-surface border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2 text-text-primary focus:ring-2 focus:ring-indigo-500 outline-none disabled:opacity-50"
              />
              <datalist id="procedure-templates-list">
                {templates.map(t => (
                  <option key={t.id} value={t.name} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Dente/Região (Opcional)</label>
              <input
                type="text"
                disabled={isSaving}
                value={newNote.tooth}
                onChange={(e) => setNewNote({ ...newNote, tooth: e.target.value })}
                placeholder="Ex: 46, Maxila..."
                className="w-full bg-surface border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2 text-text-primary focus:ring-2 focus:ring-indigo-500 outline-none disabled:opacity-50"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Descrição da Evolução *</label>
            <textarea
              required
              disabled={isSaving}
              value={newNote.content}
              onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
              placeholder="Descreva o que foi feito na consulta de hoje..."
              className="w-full bg-surface border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-text-primary focus:ring-2 focus:ring-indigo-500 outline-none resize-none h-32 disabled:opacity-50"
            />
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSaving || !newNote.content.trim()}
              className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-sm shadow-indigo-200 dark:shadow-none font-bold"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {isSaving ? 'Salvando...' : 'Adicionar Evolução'}
            </button>
          </div>
        </form>
      </div>

      <div className="space-y-6">
        <h3 className="text-lg font-bold text-text-primary">Evolução do Paciente</h3>
        
        {loading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          </div>
        ) : notes.length === 0 ? (
          <div className="text-center p-12 bg-surface rounded-3xl border border-zinc-200 dark:border-zinc-800">
            <Activity className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mx-auto mb-4" />
            <p className="text-text-secondary">Nenhuma evolução registrada.</p>
          </div>
        ) : (
          <div className="relative border-l-2 border-zinc-200 dark:border-zinc-800 ml-4 space-y-8 pb-4">
            <AnimatePresence>
              {notes.map((note) => (
                <motion.div
                  key={note.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="relative pl-8"
                >
                  <div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-4 border-white dark:border-zinc-950 ${
                    note.status === 'realizado' ? 'bg-indigo-600' : 'bg-zinc-300 dark:bg-zinc-700'
                  }`} />
                  
                  <div className={`bg-surface rounded-2xl border p-5 shadow-sm hover:shadow-md transition-all ${
                    note.status === 'realizado' ? 'border-zinc-200 dark:border-zinc-800' : 'border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-900/50'
                  }`}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                      <div className="flex flex-wrap items-center gap-4 text-sm text-text-secondary">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-4 h-4" />
                          <span>{formatDate(note.createdAt)}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <User className="w-4 h-4" />
                          <span>{note.authorName}</span>
                        </div>
                        {note.status === 'não_realizado' && (
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 text-[10px] font-black uppercase tracking-widest rounded-lg">
                            Planejado
                          </span>
                        )}
                        {note.status === 'realizado' && note.executionDate && (
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 text-[10px] font-black uppercase tracking-widest rounded-lg">
                            Realizado em {new Date(note.executionDate).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {note.status === 'não_realizado' && (
                          <button
                            onClick={() => handleMarkAsRealized(note.id)}
                            className="flex items-center gap-1.5 bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700 transition-all text-xs font-bold shadow-sm"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Marcar Realizado
                          </button>
                        )}
                        {auth.currentUser?.uid === note.dentistId && (
                          <button
                            onClick={() => handleDelete(note.id)}
                            className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {(note.procedure || note.tooth) && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {note.procedure && (
                          <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 text-xs font-medium rounded-lg border border-indigo-100 dark:border-indigo-500/20">
                            {note.procedure}
                          </span>
                        )}
                        {note.tooth && (
                          <span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs font-medium rounded-lg border border-emerald-100 dark:border-emerald-500/20">
                            Dente/Região: {note.tooth}
                          </span>
                        )}
                      </div>
                    )}

                    <p className={`text-text-primary whitespace-pre-wrap text-sm leading-relaxed ${note.status === 'não_realizado' ? 'italic text-text-secondary' : ''}`}>
                      {note.content}
                    </p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
      <ConfirmModal
        isOpen={isConfirmModalOpen}
        onCancel={() => setIsConfirmModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Excluir Evolução"
        message="Tem certeza que deseja excluir este registro?"
      />

      {/* ─── PRINT VIEW ─── */}
      <div className="print-only" style={{ maxWidth: '800px', margin: '0 auto', fontSize: '10px' }}>
        <div style={{ padding: '20px' }}>
           <h1 className='text-center text-xl font-bold border-b border-black pb-4 mb-6'>EVOLUÇÃO CLÍNICA</h1>
           <p><strong>Paciente:</strong> {patient.name}</p>
           <p><strong>Data de Emissão:</strong> {new Date().toLocaleDateString('pt-BR')}</p>
           
           <div style={{ marginTop: '20px' }}>
             {notes.map(note => (
               <div key={note.id} style={{ marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
                 <p style={{ fontWeight: 'bold' }}>{formatDate(note.createdAt)} - Dr(a). {note.authorName}</p>
                 <p>{note.procedure ? <strong>Procedimento: {note.procedure}</strong> : ''}</p>
                 <p>{note.tooth ? <strong>Dente/Região: {note.tooth}</strong> : ''}</p>
                 <p style={{ whiteSpace: 'pre-wrap' }}>{note.content}</p>
                 <p style={{ fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase' }}>Status: {note.status === 'realizado' ? 'Realizado' : 'Não Realizado'}</p>
               </div>
             ))}
           </div>
        </div>
      </div>
    </div>
  );
};
