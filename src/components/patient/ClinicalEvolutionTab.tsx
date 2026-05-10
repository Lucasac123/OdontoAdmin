import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, updateDoc, doc } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType, moveToTrash } from '../../firebase';
import { Patient } from '../../types';
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
  
  const [newNote, setNewNote] = useState({
    content: '',
    procedure: '',
    tooth: ''
  });

  useEffect(() => {
    if (!auth.currentUser) return;

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

    return () => unsubscribe();
  }, [patient.id]);

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.content.trim() || !auth.currentUser) return;

    const savePromise = addDoc(collection(db, 'clinical_evolutions'), {
      patientId: patient.id,
      dentistId: auth.currentUser.uid,
      content: newNote.content,
      procedure: newNote.procedure,
      tooth: newNote.tooth,
      status: 'realizado', // Notes are usually realized things
      createdAt: serverTimestamp(),
      authorName: auth.currentUser.displayName || 'Dentista'
    }).catch(error => {
      handleFirestoreError(error, OperationType.CREATE, 'clinical_evolutions');
    });

    addSyncTask(savePromise);
    setNewNote({ content: '', procedure: '', tooth: '' });
  };

  const handleMarkAsRealized = (noteId: string) => {
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
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Evolução Clínica - ${patient.name}</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 40px; line-height: 1.6; }
              .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 40px; }
              .evolution-item { margin-bottom: 30px; padding-bottom: 20px; border-bottom: 1px solid #eee; }
              .status-badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: bold; text-transform: uppercase; margin-bottom: 5px; }
              .status-realizado { background: #dcfce7; color: #166534; }
              .status-pendente { background: #fee2e2; color: #991b1b; }
              .evolution-date { font-weight: bold; color: #555; margin-bottom: 10px; }
              .evolution-content { white-space: pre-wrap; }
              .footer { text-align: center; margin-top: 100px; font-size: 14px; color: #666; }
              .signature-line { margin-top: 50px; text-align: center; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>EVOLUÇÃO CLÍNICA</h1>
              <p>Paciente: ${patient.name}</p>
              <p>Data de Emissão: ${new Date().toLocaleDateString('pt-BR')}</p>
            </div>
            <div class="evolutions">
              ${notes.map(note => `
                <div class="evolution-item">
                  <div class="status-badge ${note.status === 'realizado' ? 'status-realizado' : 'status-pendente'}">
                    ${note.status === 'realizado' ? 'Realizado' : 'Não Realizado'}
                  </div>
                  <div class="evolution-date">${formatDate(note.createdAt)} - Dr(a). ${note.authorName}</div>
                  ${note.procedure ? `<p><strong>Procedimento:</strong> ${note.procedure}</p>` : ''}
                  ${note.tooth ? `<p><strong>Dente/Região:</strong> ${note.tooth}</p>` : ''}
                  <div class="evolution-content">${note.content}</div>
                </div>
              `).join('')}
            </div>
            <div class="signature-line">
              <p>_________________________________________________</p>
              <p>Assinatura do(a) Cirurgião(ã)-Dentista</p>
            </div>
            <script>window.print(); window.close();</script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
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
                type="text"
                disabled={isSaving}
                value={newNote.procedure}
                onChange={(e) => setNewNote({ ...newNote, procedure: e.target.value })}
                placeholder="Ex: Restauração Resina, Profilaxia..."
                className="w-full bg-surface border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2 text-text-primary focus:ring-2 focus:ring-indigo-500 outline-none disabled:opacity-50"
              />
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
    </div>
  );
};
