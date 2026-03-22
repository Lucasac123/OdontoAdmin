import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, orderBy } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../../firebase';
import { Patient, Finance } from '../../types';
import { Plus, Trash2, DollarSign, Calendar, CreditCard, Wallet, QrCode, ArrowRightLeft, Loader2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

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
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    amount: '',
    date: new Date().toISOString().split('T')[0],
    description: 'Pagamento de tratamento',
    paymentMethod: 'pix' as Finance['paymentMethod']
  });

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

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) return;

    setIsSaving(true);
    try {
      await addDoc(collection(db, 'finances'), {
        dentistId: auth.currentUser.uid,
        patientId: patient.id,
        amount,
        date: formData.date,
        description: formData.description,
        type: 'income',
        paymentMethod: formData.paymentMethod,
        createdAt: new Date().toISOString()
      });
      setIsAdding(false);
      setFormData({
        amount: '',
        date: new Date().toISOString().split('T')[0],
        description: 'Pagamento de tratamento',
        paymentMethod: 'pix'
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'finances');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Excluir este registro de pagamento?')) {
      try {
        await deleteDoc(doc(db, 'finances', id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `finances/${id}`);
      }
    }
  };

  const totalPaid = payments.reduce((acc, p) => acc + p.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Histórico de Pagamentos</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Total recebido deste paciente: <span className="font-bold text-emerald-600">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalPaid)}</span></p>
        </div>
        <button
          onClick={() => setIsAdding(true)}
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
            className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm"
          >
            <form onSubmit={handleAddPayment} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
              <div>
                <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase mb-2">Valor (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.amount}
                  onChange={e => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="0,00"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase mb-2">Data</label>
                <input
                  type="date"
                  required
                  value={formData.date}
                  onChange={e => setFormData(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase mb-2">Forma de Pagamento</label>
                <select
                  value={formData.paymentMethod}
                  onChange={e => setFormData(prev => ({ ...prev, paymentMethod: e.target.value as any }))}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
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
                  Adicionar
                </button>
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-4 py-2.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                >
                  Cancelar
                </button>
              </div>
              <div className="md:col-span-2 lg:col-span-4">
                <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase mb-2">Descrição</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="Ex: Pagamento da primeira parcela do implante"
                />
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800">
                <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Data</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Descrição</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Método</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Valor</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-zinc-500 dark:text-zinc-400">
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
                      className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2 text-sm text-zinc-900 dark:text-white">
                          <Calendar className="w-4 h-4 text-zinc-400" />
                          {new Date(payment.date).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-zinc-900 dark:text-white font-medium">{payment.description}</p>
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
                        <button
                          onClick={() => handleDelete(payment.id)}
                          className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all"
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="p-4 bg-zinc-50 dark:bg-zinc-800/30 rounded-2xl border border-zinc-200 dark:border-zinc-800 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-zinc-400 shrink-0 mt-0.5" />
        <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
          Os pagamentos registrados aqui também aparecem no seu fluxo de caixa geral em "Financeiro". 
          Utilize esta aba para acompanhar especificamente o acerto financeiro deste paciente.
        </p>
      </div>
    </div>
  );
};
