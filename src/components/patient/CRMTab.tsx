import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType, moveToTrash } from '../../firebase';
import { CRMDeal, Patient } from '../../types';
import { Plus, Edit2, Trash2, DollarSign, CheckCircle, XCircle, Clock } from 'lucide-react';
import { ConfirmModal } from '../ConfirmModal';
import { motion } from 'motion/react';
import { useSync } from '../../context/SyncContext';

export const CRMTab = ({ patient }: { patient: Patient }) => {
  const [deals, setDeals] = useState<CRMDeal[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState<CRMDeal | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [dealToDelete, setDealToDelete] = useState<string | null>(null);
  const { addSyncTask } = useSync();

  const [formData, setFormData] = useState({
    title: '',
    value: '' as number | '',
    status: 'negotiation' as CRMDeal['status']
  });

  useEffect(() => {
    if (!auth.currentUser || !patient.id) return;

    const dealsQuery = query(
      collection(db, 'crm_deals'),
      where('dentistId', '==', auth.currentUser.uid),
      where('patientId', '==', patient.id)
    );
    
    const unsubscribeDeals = onSnapshot(dealsQuery, (snapshot) => {
      const dealsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as CRMDeal[];
      setDeals(dealsData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    });

    return () => unsubscribeDeals();
  }, [patient.id]);

  const handleOpenModal = (deal?: CRMDeal) => {
    if (deal) {
      setEditingDeal(deal);
      setFormData({
        title: deal.title,
        value: deal.value,
        status: deal.status
      });
    } else {
      setEditingDeal(null);
      setFormData({
        title: '',
        value: 0,
        status: 'negotiation'
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || !patient.id) return;

    const dealData = {
      patientId: patient.id,
      patientName: patient.name,
      title: formData.title,
      value: formData.value,
      status: formData.status,
      dentistId: auth.currentUser.uid,
      updatedAt: new Date().toISOString(),
      createdAt: editingDeal ? editingDeal.createdAt : new Date().toISOString()
    };

    let savePromise;
    if (editingDeal) {
      savePromise = updateDoc(doc(db, 'crm_deals', editingDeal.id), dealData);
    } else {
      savePromise = addDoc(collection(db, 'crm_deals'), dealData);
    }
    
    savePromise.catch(error => {
      console.error('Error saving deal:', error);
      alert('Erro ao salvar orçamento.');
    });

    addSyncTask(savePromise);
    setIsModalOpen(false);
  };

  const handleDeleteClick = (id: string) => {
    setDealToDelete(id);
    setIsConfirmModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!dealToDelete) return;
    try {
      await moveToTrash('crm_deals', dealToDelete);
      setIsConfirmModalOpen(false);
      setDealToDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `crm_deals/${dealToDelete}`);
    }
  };

  const handleStatusChange = async (dealId: string, newStatus: CRMDeal['status']) => {
    try {
      await updateDoc(doc(db, 'crm_deals', dealId), {
        status: newStatus,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Erro ao atualizar status.');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'negotiation': return <Clock size={16} className="text-yellow-500" />;
      case 'approved': return <CheckCircle size={16} className="text-green-500" />;
      case 'rejected': return <XCircle size={16} className="text-red-500" />;
      default: return null;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'negotiation': return 'Em Negociação';
      case 'approved': return 'Aprovado';
      case 'rejected': return 'Recusado';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'negotiation': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'approved': return 'bg-green-50 text-green-700 border-green-200';
      case 'rejected': return 'bg-red-50 text-red-700 border-red-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-text-primary">Orçamentos e Negociações</h2>
        <button
          onClick={() => handleOpenModal()}
          className="bg-indigo-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-indigo-700 transition-colors"
        >
          <Plus size={20} />
          Novo Orçamento
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {deals.length === 0 ? (
          <div className="col-span-full text-center py-12 bg-surface rounded-2xl border border-zinc-200 dark:border-zinc-800">
            <p className="text-text-secondary">Nenhum orçamento registrado para este paciente.</p>
          </div>
        ) : (
          deals.map(deal => (
            <motion.div
              key={deal.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`bg-surface p-5 rounded-2xl border shadow-sm flex flex-col ${getStatusColor(deal.status)}`}
            >
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-semibold text-text-primary line-clamp-2" title={deal.title}>{deal.title}</h3>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => handleOpenModal(deal)} className="p-1.5 text-zinc-400 hover:text-indigo-600 transition-colors rounded-lg hover:bg-white/50 dark:hover:bg-zinc-800">
                    <Edit2 size={16} />
                  </button>
                  <button onClick={() => handleDeleteClick(deal.id)} className="p-1.5 text-zinc-400 hover:text-red-600 transition-colors rounded-lg hover:bg-white/50 dark:hover:bg-zinc-800">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              
              <div className="mt-auto space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-lg text-text-primary flex items-center gap-1">
                    <DollarSign size={18} className="text-emerald-500" />
                    {deal.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                
                <div className="flex items-center justify-between pt-3 border-t border-black/5 dark:border-white/5">
                  <div className="flex items-center gap-1.5 text-sm font-medium">
                    {getStatusIcon(deal.status)}
                    <span>{getStatusLabel(deal.status)}</span>
                  </div>
                  <select
                    value={deal.status}
                    onChange={(e) => handleStatusChange(deal.id, e.target.value as CRMDeal['status'])}
                    className="text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg py-1 pl-2 pr-6 focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="negotiation">Em Negociação</option>
                    <option value="approved">Aprovado</option>
                    <option value="rejected">Recusado</option>
                  </select>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-surface rounded-2xl p-6 w-full max-w-md border border-zinc-200 dark:border-zinc-800 shadow-xl"
          >
            <h2 className="text-xl font-bold text-text-primary mb-6">
              {editingDeal ? 'Editar Orçamento' : 'Novo Orçamento'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Título do Orçamento</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Ex: Tratamento Ortodôntico Completo"
                  className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-indigo-500 text-text-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Valor Total (R$)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: e.target.value === '' ? '' : Number(e.target.value) })}
                    className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-indigo-500 text-text-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as CRMDeal['status'] })}
                    className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-indigo-500 text-text-primary"
                  >
                    <option value="negotiation">Em Negociação</option>
                    <option value="approved">Aprovado</option>
                    <option value="rejected">Recusado</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-8">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-text-secondary hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-medium"
                >
                  Salvar
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      <ConfirmModal
        isOpen={isConfirmModalOpen}
        onCancel={() => setIsConfirmModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Excluir Orçamento"
        message="Tem certeza que deseja excluir este orçamento? Esta ação não pode ser desfeita."
      />
    </div>
  );
};
