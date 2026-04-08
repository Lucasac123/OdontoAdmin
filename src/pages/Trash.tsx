import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { TrashItem } from '../types';
import { Trash2, RotateCcw, Loader2, User, FileText, Calendar, RefreshCw, DollarSign, Package, Microscope, UserCircle, Activity, StickyNote, Clock } from 'lucide-react';
import { ConfirmModal } from '../components/ConfirmModal';
import { motion, AnimatePresence } from 'motion/react';

export const Trash = () => {
  const [trashItems, setTrashItems] = useState<TrashItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [processingItems, setProcessingItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!auth.currentUser) return;
    const q = query(collection(db, 'trash'), where('dentistId', '==', auth.currentUser.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const now = new Date();
      const fifteenDaysAgo = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000);
      const items = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as TrashItem))
        .filter(item => new Date(item.deletedAt) >= fifteenDaysAgo);
      setTrashItems(items);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'trash');
    });
    return () => unsubscribe();
  }, []);

  const handleRestore = async (item: TrashItem) => {
    if (processingItems.has(item.id)) return;
    setProcessingItems(prev => new Set(prev).add(item.id));
    try {
      await setDoc(doc(db, item.originalCollection, item.originalId), {
        ...item.data,
        restoredAt: serverTimestamp()
      });
      await deleteDoc(doc(db, 'trash', item.id));
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `trash/${item.id}`);
    } finally {
      setProcessingItems(prev => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }
  };

  const handlePermanentDelete = async (id: string) => {
    setItemToDelete(id);
  };

  const confirmPermanentDelete = async () => {
    if (!itemToDelete || processingItems.has(itemToDelete)) return;
    
    const idToDelete = itemToDelete;
    setProcessingItems(prev => new Set(prev).add(idToDelete));
    
    try {
      await deleteDoc(doc(db, 'trash', idToDelete));
      setItemToDelete(null); // Only close on success
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `trash/${idToDelete}`);
      setItemToDelete(null); // Also close on error to not get stuck
    } finally {
      setProcessingItems(prev => {
        const next = new Set(prev);
        next.delete(idToDelete);
        return next;
      });
    }
  };

  const getCollectionIcon = (collection: string) => {
    switch (collection) {
      case 'patients': return <User className="w-5 h-5 sm:w-6 sm:h-6" />;
      case 'appointments': return <Calendar className="w-5 h-5 sm:w-6 sm:h-6" />;
      case 'financial': return <DollarSign className="w-5 h-5 sm:w-6 sm:h-6" />;
      case 'inventory': return <Package className="w-5 h-5 sm:w-6 sm:h-6" />;
      case 'laboratory':
      case 'lab_jobs': return <Microscope className="w-5 h-5 sm:w-6 sm:h-6" />;
      case 'dentists': return <UserCircle className="w-5 h-5 sm:w-6 sm:h-6" />;
      case 'clinical_evolutions': return <Activity className="w-5 h-5 sm:w-6 sm:h-6" />;
      case 'quick_notes': return <StickyNote className="w-5 h-5 sm:w-6 sm:h-6" />;
      default: return <FileText className="w-5 h-5 sm:w-6 sm:h-6" />;
    }
  };

  const getCollectionLabel = (collection: string) => {
    switch (collection) {
      case 'patients': return 'Paciente';
      case 'appointments': return 'Agendamento';
      case 'financial': return 'Financeiro';
      case 'inventory': return 'Estoque';
      case 'laboratory':
      case 'lab_jobs': return 'Laboratório';
      case 'dentists': return 'Dentista';
      case 'clinical_evolutions': return 'Evolução';
      case 'quick_notes': return 'Nota';
      case 'document_templates': return 'Template';
      default: return 'Documento';
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0 gap-6 sm:gap-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-400">
            <Trash2 className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-text-primary tracking-tight">Lixeira</h1>
            <p className="text-sm text-text-secondary mt-1">Gerencie itens excluídos recentemente</p>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto pr-2 -mr-2">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          </div>
        ) : trashItems.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-surface rounded-[24px] sm:rounded-[32px] border-2 border-dashed border-zinc-200 dark:border-zinc-800 p-8 sm:p-16 text-center"
          >
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-[24px] sm:rounded-[32px] bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center mx-auto mb-6 text-zinc-300 dark:text-zinc-700">
              <Trash2 className="w-8 h-8 sm:w-10 sm:h-10" />
            </div>
            <h3 className="text-lg sm:text-xl font-black text-text-primary mb-2">Sua lixeira está vazia</h3>
            <p className="text-sm text-text-secondary max-w-xs mx-auto">Itens excluídos aparecerão aqui por 15 dias antes de serem removidos permanentemente.</p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:gap-4">
            <AnimatePresence mode="popLayout">
              {trashItems.map((item) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="group bg-surface rounded-xl sm:rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 sm:p-5 hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 flex items-center justify-center text-zinc-400 group-hover:text-indigo-500 transition-colors shrink-0">
                      {getCollectionIcon(item.originalCollection)}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-text-primary truncate text-sm sm:text-base">
                        {item.displayName || item.data?.name || item.data?.title || item.data?.patientName || item.data?.description || 'Item sem nome'}
                      </h3>
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-1">
                        <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                          {getCollectionLabel(item.originalCollection)}
                        </span>
                        <span className="text-[10px] sm:text-xs text-text-secondary flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Excluído em {new Date(item.deletedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0">
                    <button
                      onClick={() => handleRestore(item)}
                      disabled={processingItems.has(item.id)}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg sm:rounded-xl transition-colors disabled:opacity-50 text-xs font-bold"
                    >
                      {processingItems.has(item.id) ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                      <span className="sm:hidden">Restaurar</span>
                    </button>
                    <button
                      onClick={() => handlePermanentDelete(item.id)}
                      disabled={processingItems.has(item.id)}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 text-destructive hover:bg-destructive/10 rounded-lg sm:rounded-xl transition-colors disabled:opacity-50 text-xs font-bold"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span className="sm:hidden">Excluir</span>
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={!!itemToDelete}
        title="Excluir Permanentemente"
        message="Tem certeza que deseja excluir este item permanentemente? Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        onConfirm={confirmPermanentDelete}
        onCancel={() => setItemToDelete(null)}
        variant="danger"
        isLoading={!!itemToDelete && processingItems.has(itemToDelete)}
      />
    </div>
  );
};

export default Trash;
