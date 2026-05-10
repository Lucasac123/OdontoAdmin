import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, orderBy, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, auth, storage, handleFirestoreError, OperationType, moveToTrash } from '../../firebase';
import { Patient, Finance } from '../../types';
import { Plus, Trash2, DollarSign, Calendar, CreditCard, Wallet, QrCode, ArrowRightLeft, Loader2, AlertCircle, Upload, FileText, Image as ImageIcon, X, Edit2, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ConfirmModal } from '../ConfirmModal';
import { useSync } from '../../context/SyncContext';

const paymentMethodConfig = {
  money: { label: 'Dinheiro', icon: Wallet, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
  card: { label: 'Cartão', icon: CreditCard, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-500/10' },
  pix: { label: 'PIX', icon: QrCode, color: 'text-teal-600', bg: 'bg-teal-50 dark:bg-teal-500/10' },
  transfer: { label: 'Transferência', icon: ArrowRightLeft, color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-500/10' },
  other: { label: 'Outro', icon: DollarSign, color: 'text-zinc-600', bg: 'bg-zinc-50 dark:bg-zinc-500/10' }
};

export const PaymentsTab: React.FC<{ patient: Patient }> = ({ patient }) => {
  const [payments, setPayments] = useState<Finance[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Finance | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    amount: '',
    date: new Date().toISOString().split('T')[0],
    description: 'Pagamento de tratamento',
    paymentMethod: 'pix' as Finance['paymentMethod']
  });
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [paymentToDelete, setPaymentToDelete] = useState<string | null>(null);
  const { addSyncTask } = useSync();

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, 'finances'),
      where('dentistId', '==', auth.currentUser.uid),
      where('patientId', '==', patient.id),
      where('type', '==', 'income')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Finance));
      // Sort client-side to avoid index requirement
      const sortedData = data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setPayments(sortedData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'finances');
    });

    return () => unsubscribe();
  }, [patient.id]);

  const handleEdit = (payment: Finance) => {
    setEditingPayment(payment);
    setFormData({
      amount: payment.amount.toString(),
      date: payment.date,
      description: payment.description,
      paymentMethod: payment.paymentMethod || 'pix'
    });
    setReceiptFile(null);
    setIsAdding(true);
  };

  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) return;

    setIsSaving(true);
    
    let receiptUrl = editingPayment?.receiptUrl || '';
    if (receiptFile) {
      try {
        const fileRef = ref(storage, `receipts/${auth.currentUser.uid}/${patient.id}/${Date.now()}_${receiptFile.name}`);
        await uploadBytes(fileRef, receiptFile);
        receiptUrl = await getDownloadURL(fileRef);
      } catch (error) {
        console.error("Error uploading receipt:", error);
      }
    }

    const paymentData = {
      dentistId: auth.currentUser.uid,
      patientId: patient.id,
      amount,
      date: formData.date,
      description: formData.description,
      type: 'income',
      paymentMethod: formData.paymentMethod,
      paymentStatus: 'pago',
      ...(receiptUrl ? { receiptUrl } : {})
    };

    let savePromise;
    if (editingPayment) {
      savePromise = updateDoc(doc(db, 'finances', editingPayment.id), {
        ...paymentData,
        updatedAt: new Date().toISOString()
      }).catch(error => {
        handleFirestoreError(error, OperationType.UPDATE, `finances/${editingPayment.id}`);
      });
    } else {
      savePromise = addDoc(collection(db, 'finances'), {
        ...paymentData,
        createdAt: new Date().toISOString()
      }).catch(error => {
        handleFirestoreError(error, OperationType.CREATE, 'finances');
      });
    }

    addSyncTask(savePromise);
    setIsSaving(false);
    setIsAdding(false);
    setEditingPayment(null);
    setReceiptFile(null);
    setFormData({
      amount: '',
      date: new Date().toISOString().split('T')[0],
      description: 'Pagamento de tratamento',
      paymentMethod: 'pix'
    });
  };

  const handleMarkAsPaid = (paymentId: string) => {
    const savePromise = updateDoc(doc(db, 'finances', paymentId), {
      paymentStatus: 'pago',
      date: new Date().toISOString().split('T')[0], // Update to current date when paid
      updatedAt: serverTimestamp()
    }).catch(error => {
      handleFirestoreError(error, OperationType.UPDATE, `finances/${paymentId}`);
    });
    addSyncTask(savePromise);
  };

  const handleDelete = async (id: string) => {
    setPaymentToDelete(id);
  };

  const confirmDelete = () => {
    if (!paymentToDelete) return;
    
    const deletePromise = moveToTrash('finances', paymentToDelete).catch(error => {
      console.error("Erro ao excluir pagamento:", error);
      handleFirestoreError(error, OperationType.DELETE, `finances/${paymentToDelete}`);
    });
    
    addSyncTask(deletePromise);
    setPaymentToDelete(null);
  };

  const totalPaid = payments.filter(p => p.paymentStatus !== 'pendente').reduce((acc, p) => acc + p.amount, 0);
  const totalPending = payments.filter(p => p.paymentStatus === 'pendente').reduce((acc, p) => acc + p.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-text-primary">Histórico Financeiro</h2>
          <div className="flex flex-wrap gap-4 mt-1">
            <p className="text-sm text-text-secondary">
              Total Pago: <span className="font-bold text-emerald-600">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalPaid)}</span>
            </p>
            {totalPending > 0 && (
              <p className="text-sm text-text-secondary">
                Total Pendente: <span className="font-bold text-amber-600">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalPending)}</span>
              </p>
            )}
          </div>
        </div>
        <button
          onClick={() => {
            setEditingPayment(null);
            setReceiptFile(null);
            setFormData({
              amount: '',
              date: new Date().toISOString().split('T')[0],
              description: 'Pagamento de tratamento',
              paymentMethod: 'pix'
            });
            setIsAdding(true);
          }}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-700 transition-colors shadow-sm font-bold"
        >
          <Plus className="w-5 h-5" />
          Registrar Pagamento
        </button>
      </div>

      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-surface p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm"
          >
            <form onSubmit={handleSavePayment} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase mb-2">Valor (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  disabled={isSaving}
                  value={formData.amount}
                  onChange={e => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                  className="w-full bg-surface border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-text-primary focus:ring-2 focus:ring-indigo-500 outline-none disabled:opacity-50"
                  placeholder="0,00"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase mb-2">Data</label>
                <input
                  type="date"
                  required
                  disabled={isSaving}
                  value={formData.date}
                  onChange={e => setFormData(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full bg-surface border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-text-primary focus:ring-2 focus:ring-indigo-500 outline-none disabled:opacity-50"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase mb-2">Forma de Pagamento</label>
                <select
                  value={formData.paymentMethod}
                  disabled={isSaving}
                  onChange={e => setFormData(prev => ({ ...prev, paymentMethod: e.target.value as any }))}
                  className="w-full bg-surface border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-text-primary focus:ring-2 focus:ring-indigo-500 outline-none disabled:opacity-50"
                >
                  {Object.entries(paymentMethodConfig).map(([key, config]) => (
                    <option key={key} value={key}>{config.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 bg-indigo-600 text-white px-4 py-2.5 rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2 font-bold"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  {isSaving ? 'Salvando...' : (editingPayment ? 'Salvar' : 'Adicionar')}
                </button>
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => {
                    setIsAdding(false);
                    setEditingPayment(null);
                    setReceiptFile(null);
                  }}
                  className="px-4 py-2.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors disabled:opacity-50 font-bold"
                >
                  Cancelar
                </button>
              </div>
              <div className="md:col-span-2 lg:col-span-2">
                <label className="block text-xs font-semibold text-text-secondary uppercase mb-2">Descrição</label>
                <input
                  type="text"
                  disabled={isSaving}
                  value={formData.description}
                  onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full bg-surface border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-text-primary focus:ring-2 focus:ring-indigo-500 outline-none disabled:opacity-50"
                  placeholder="Ex: Pagamento de tratamento"
                />
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-surface rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface border-b border-zinc-200 dark:border-zinc-800">
                <th className="px-6 py-4 text-xs font-bold text-text-secondary uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-text-secondary uppercase tracking-wider">Data</th>
                <th className="px-6 py-4 text-xs font-bold text-text-secondary uppercase tracking-wider">Descrição</th>
                <th className="px-6 py-4 text-xs font-bold text-text-secondary uppercase tracking-wider">Método</th>
                <th className="px-6 py-4 text-xs font-bold text-text-secondary uppercase tracking-wider">Valor</th>
                <th className="px-6 py-4 text-xs font-bold text-text-secondary uppercase tracking-wider text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-text-secondary italic">
                    Nenhum registro financeiro.
                  </td>
                </tr>
              ) : (
                payments.map((payment) => {
                  const method = paymentMethodConfig[payment.paymentMethod || 'other'];
                  const isPending = payment.paymentStatus === 'pendente';
                  
                  return (
                    <motion.tr 
                      key={payment.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className={`hover:bg-zinc-50 dark:hover:bg-zinc-900/30 transition-colors ${isPending ? 'bg-zinc-50/30 dark:bg-zinc-900/10' : ''}`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                          isPending ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {isPending ? 'Pendente' : 'Pago'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2 text-sm text-text-primary font-medium">
                          <Calendar className="w-4 h-4 text-text-secondary" />
                          {new Date(payment.date).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <p className={`text-sm font-bold ${isPending ? 'text-text-secondary italic' : 'text-text-primary'}`}>{payment.description}</p>
                          {payment.receiptUrl && (
                            <a href={payment.receiptUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:underline">
                              <FileText className="w-3 h-3" /> Ver comprovante
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {!isPending && (
                          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${method.bg} ${method.color}`}>
                            <method.icon className="w-3.5 h-3.5" />
                            {method.label}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`text-sm font-black ${isPending ? 'text-amber-600' : 'text-emerald-600'}`}>
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(payment.amount)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          {isPending && (
                            <button
                              onClick={() => handleMarkAsPaid(payment.id)}
                              className="flex items-center gap-1.5 bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700 transition-all text-xs font-bold shadow-sm"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Baixar
                            </button>
                          )}
                          {!isPending && (
                            <button
                              onClick={() => handleEdit(payment)}
                              className="p-2 text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(payment.id)}
                            className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      <ConfirmModal
        isOpen={!!paymentToDelete}
        title="Excluir Registro"
        message="Deseja excluir este registro financeiro? Ele será movido para a lixeira."
        onConfirm={confirmDelete}
        onCancel={() => setPaymentToDelete(null)}
        variant="danger"
      />
    </div>
  );
};
