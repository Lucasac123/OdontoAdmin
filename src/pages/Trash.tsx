import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { TrashItem } from '../types';
import { Trash2, RotateCcw, Loader2, User, FileText, Calendar, RefreshCw, DollarSign, Package, Microscope, UserCircle, Activity, StickyNote, Clock, Zap, History, ShieldAlert } from 'lucide-react';
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
      setTrashItems(items.sort((a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime()));
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
      setItemToDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `trash/${idToDelete}`);
      setItemToDelete(null);
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
      case 'patients': return <User className="w-5 h-5" />;
      case 'appointments': return <Calendar className="w-5 h-5" />;
      case 'financial': return <DollarSign className="w-5 h-5" />;
      case 'inventory': return <Package className="w-5 h-5" />;
      case 'laboratory':
      case 'lab_jobs': return <Microscope className="w-5 h-5" />;
      case 'dentists': return <UserCircle className="w-5 h-5" />;
      case 'clinical_evolutions': return <Activity className="w-5 h-5" />;
      case 'quick_notes': return <StickyNote className="w-5 h-5" />;
      default: return <FileText className="w-5 h-5" />;
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
      default: return 'Geral';
    }
  };

  return (
    <div className="space-y-8 flex flex-col h-full bg-zinc-50/20 p-2 md:p-6 rounded-[48px]">
      {/* Header Premium */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-12 shrink-0 px-4">
        <div>
          <h1 className="text-6xl font-black text-text-primary tracking-tighter uppercase leading-none">Lixeira</h1>
          <p className="text-text-secondary mt-4 font-medium uppercase tracking-[0.3em] text-[10px] flex items-center gap-2">
            <History size={14} className="text-zinc-500 fill-zinc-500/20" /> RECUPERAÇÃO DE DADOS E ITENS EXCLUÍDOS
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 lg:px-4 pb-10">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="w-12 h-12 animate-spin text-zinc-300" />
            <p className="text-[10px] font-black uppercase tracking-widest text-text-secondary">Acessando registros temporários...</p>
          </div>
        ) : trashItems.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-surface rounded-[48px] border-2 border-dashed border-zinc-200 dark:border-zinc-800 p-16 sm:p-24 text-center max-w-4xl mx-auto"
          >
            <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-[40px] bg-zinc-50 dark:bg-zinc-900/50 flex items-center justify-center mx-auto mb-8 text-zinc-200 dark:text-zinc-800">
               <Trash2 className="w-12 h-12" />
            </div>
            <h3 className="text-2xl font-black text-text-primary uppercase tracking-tight mb-4">Sua lixeira está vazia</h3>
            <p className="text-xs font-medium text-text-secondary uppercase tracking-[0.2em] max-w-sm mx-auto leading-loose">Items excluídos permanecem aqui por 15 dias antes de serem permanentemente removidos do ecossistema.</p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 max-w-7xl mx-auto">
            <AnimatePresence mode="popLayout">
              {trashItems.map((item, idx) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: idx * 0.05 }}
                  className="group bg-surface rounded-[32px] border border-zinc-200/50 dark:border-zinc-800 p-8 hover:shadow-2xl hover:shadow-zinc-500/5 transition-all flex flex-col relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-zinc-500/5 rounded-bl-full -mr-8 -mt-8" />
                  
                  <div className="flex items-start justify-between mb-8">
                     <div className="w-14 h-14 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 flex items-center justify-center text-zinc-400 group-hover:text-indigo-600 group-hover:bg-indigo-50 transition-all shadow-inner">
                        {getCollectionIcon(item.originalCollection)}
                     </div>
                     <div className="flex flex-col items-end">
                        <span className="text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 mb-2">
                           {getCollectionLabel(item.originalCollection)}
                        </span>
                        <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-text-secondary opacity-40">
                           <Clock className="w-3 h-3" /> {new Date(item.deletedAt).toLocaleDateString()}
                        </div>
                     </div>
                  </div>

                  <div className="flex-1 min-w-0 mb-8">
                     <h3 className="text-lg font-black text-text-primary uppercase tracking-tight truncate group-hover:text-indigo-600 transition-colors">
                        {item.displayName || item.data?.name || item.data?.title || item.data?.patientName || item.data?.description || 'Item sem nome'}
                     </h3>
                     <p className="text-[10px] font-medium text-text-secondary uppercase tracking-[0.15em] mt-2 line-clamp-2 leading-relaxed h-10">
                        {item.data?.treatment || item.data?.observation || item.data?.obs || 'Sem detalhes adicionais.'}
                     </p>
                  </div>

                  <div className="flex gap-3 pt-6 border-t border-zinc-100 dark:border-zinc-800">
                     <button
                       onClick={() => handleRestore(item)}
                       disabled={processingItems.has(item.id)}
                       className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white rounded-2xl transition-all disabled:opacity-50 text-[10px] font-black uppercase tracking-widest"
                     >
                       {processingItems.has(item.id) ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                       Restaurar
                     </button>
                     <button
                       onClick={() => handlePermanentDelete(item.id)}
                       disabled={processingItems.has(item.id)}
                       className="px-5 py-3.5 text-zinc-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all disabled:opacity-50"
                       title="Excluir Permanentemente"
                     >
                       <Trash2 className="w-5 h-5" />
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
        message="Tem certeza que deseja excluir este item permanentemente? Esta ação não pode ser desfeita e o item será removido definitivamente do banco de dados."
        confirmLabel="Excluir Definitivamente"
        cancelLabel="Vou Pensar Melhor"
        onConfirm={confirmPermanentDelete}
        onCancel={() => setItemToDelete(null)}
        variant="danger"
        isLoading={!!itemToDelete && processingItems.has(itemToDelete)}
      />
    </div>
  );
};

export default Trash;
