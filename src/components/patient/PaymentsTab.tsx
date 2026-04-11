import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, orderBy, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, auth, storage, handleFirestoreError, OperationType, moveToTrash } from '../../firebase';
import { Patient, Finance } from '../../types';
import { Plus, Trash2, DollarSign, Calendar, CreditCard, Wallet, QrCode, ArrowRightLeft, Loader2, AlertCircle, Upload, FileText, Image as ImageIcon, X, Edit2 } from 'lucide-react';
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
      where('type', '==', 'income'),
      orderBy('date', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Finance));
      setPayments(data);
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
        // Continue saving even if upload fails
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

  const totalPaid = payments.reduce((acc, p) => acc + p.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-text-primary">Histórico de Pagamentos</h2>
          <p className="text-sm text-text-secondary">Total recebido deste paciente: <span className="font-bold text-emerald-600">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalPaid)}</span></p>
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
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-700 transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5" />
          Novo Pagamento
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
                  className="flex-1 bg-indigo-600 text-white px-4 py-2.5 rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
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
                    setFormData({
                      amount: '',
                      date: new Date().toISOString().split('T')[0],
                      description: 'Pagamento de tratamento',
                      paymentMethod: 'pix'
                    });
                  }}
                  className="px-4 py-2.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors disabled:opacity-50"
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
                  placeholder="Ex: Pagamento da primeira parcela do implante"
                />
              </div>
              <div className="md:col-span-2 lg:col-span-2">
                <label className="block text-xs font-semibold text-text-secondary uppercase mb-2">Comprovante (Opcional)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    id="receipt-upload"
                    className="hidden"
                    accept="image/*,.pdf"
                    disabled={isSaving}
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setReceiptFile(e.target.files[0]);
                      }
                    }}
                  />
                  <label
                    htmlFor="receipt-upload"
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-dashed cursor-pointer transition-colors ${
                      receiptFile 
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' 
                        : 'border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 text-text-secondary'
                    } ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <Upload className="w-4 h-4" />
                    <span className="text-sm font-medium truncate">
                      {receiptFile ? receiptFile.name : 'Anexar foto ou PDF'}
                    </span>
                  </label>
                  {receiptFile && !isSaving && (
                    <button
                      type="button"
                      onClick={() => setReceiptFile(null)}
                      className="p-2.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-colors"
                      title="Remover anexo"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>
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
                <th className="px-6 py-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Data</th>
                <th className="px-6 py-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Descrição</th>
                <th className="px-6 py-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Método</th>
                <th className="px-6 py-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Valor</th>
                <th className="px-6 py-4 text-xs font-semibold text-text-secondary uppercase tracking-wider text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-text-secondary">
                    <div className="flex flex-col items-center gap-2">
                      <DollarSign className="w-8 h-8 opacity-20" />
                      <p>Nenhum pagamento registrado para este paciente.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                payments.map((payment) => {
                  const method = paymentMethodConfig[payment.paymentMethod || 'other'];
                  return (
                    <motion.tr 
                      key={payment.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="hover:bg-surface transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2 text-sm text-text-primary">
                          <Calendar className="w-4 h-4 text-text-secondary" />
                          {new Date(payment.date).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <p className="text-sm text-text-primary font-medium">{payment.description}</p>
                          {payment.receiptUrl && (
                            <a 
                              href={payment.receiptUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
                            >
                              <FileText className="w-3 h-3" />
                              Ver comprovante
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${method.bg} ${method.color}`}>
                          <method.icon className="w-3.5 h-3.5" />
                          {method.label}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-bold text-emerald-600">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(payment.amount)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEdit(payment)}
                            className="p-2 text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-xl transition-all disabled:opacity-50"
                            title="Editar"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(payment.id)}
                            className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all disabled:opacity-50"
                            title="Excluir"
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

      <div className="p-4 bg-surface rounded-2xl border border-zinc-200 dark:border-zinc-800 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-text-secondary shrink-0 mt-0.5" />
        <p className="text-xs text-text-secondary leading-relaxed">
          Os pagamentos registrados aqui também aparecem no seu fluxo de caixa geral em "Financeiro". 
          Utilize esta aba para acompanhar especificamente o acerto financeiro deste paciente.
        </p>
      </div>

      <ConfirmModal
        isOpen={!!paymentToDelete}
        title="Excluir Pagamento"
        message="Tem certeza que deseja excluir este registro de pagamento? Ele será movido para a lixeira."
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        onConfirm={confirmDelete}
        onCancel={() => setPaymentToDelete(null)}
        variant="danger"
      />
    </div>
  );
};
