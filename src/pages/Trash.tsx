import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { TrashItem } from '../types';
import { Trash2, RotateCcw, Loader2 } from 'lucide-react';
import { ConfirmModal } from '../components/ConfirmModal';
import { motion, AnimatePresence } from 'motion/react';

export const Trash = () => {
  const [trashItems, setTrashItems] = useState<TrashItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

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
    try {
      await addDoc(collection(db, item.originalCollection), {
        ...item.data,
        restoredAt: serverTimestamp()
      });
      await deleteDoc(doc(db, 'trash', item.id));
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `trash/${item.id}`);
    }
  };

  const handlePermanentDelete = async (id: string) => {
    setItemToDelete(id);
  };

  const confirmPermanentDelete = async () => {
    if (!itemToDelete) return;
    try {
      await deleteDoc(doc(db, 'trash', itemToDelete));
      setItemToDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `trash/${itemToDelete}`);
    }
  };

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-zinc-500" /></div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-text-primary mb-6">Lixeira</h1>
      <div className="grid gap-4">
        <AnimatePresence initial={false}>
          {trashItems.map(item => (
            <motion.div 
              key={item.id} 
              initial={{ opacity: 0, height: 0, scale: 0.9 }}
              animate={{ opacity: 1, height: 'auto', scale: 1 }}
              exit={{ opacity: 0, height: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
              className="p-4 bg-surface rounded-lg border border-zinc-200 dark:border-zinc-700 flex items-center justify-between"
            >
              <div>
                <p className="font-medium text-text-primary">{item.originalCollection}</p>
                <p className="text-sm text-text-secondary">Apagado em: {new Date(item.deletedAt).toLocaleString()}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleRestore(item)} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg">
                  <RotateCcw className="w-5 h-5" />
                </button>
                <button onClick={() => handlePermanentDelete(item.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
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
      />
    </div>
  );
};
