import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType, moveToTrash } from '../../firebase';
import { LabJob, Patient } from '../../types';
import { Plus, Edit2, Trash2, CheckCircle, Clock, Truck, FileText, Loader2 } from 'lucide-react';
import { ConfirmModal } from '../ConfirmModal';
import { motion } from 'motion/react';

export const LabJobsTab = ({ patient }: { patient: Patient }) => {
  const [jobs, setJobs] = useState<LabJob[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingJob, setEditingJob] = useState<LabJob | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [jobToDelete, setJobToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [formData, setFormData] = useState({
    labName: '',
    prosthesisType: '',
    sendDate: new Date().toISOString().split('T')[0],
    expectedDate: '',
    status: 'Enviado' as LabJob['status'],
    cost: '' as number | ''
  });

  useEffect(() => {
    if (!auth.currentUser || !patient.id) return;

    const jobsQuery = query(
      collection(db, 'lab_jobs'),
      where('dentistId', '==', auth.currentUser.uid),
      where('patientId', '==', patient.id)
    );
    
    const unsubscribe = onSnapshot(jobsQuery, (snapshot) => {
      const jobsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as LabJob[];
      setJobs(jobsData.sort((a, b) => new Date(b.sendDate).getTime() - new Date(a.sendDate).getTime()));
    });

    return () => unsubscribe();
  }, [patient.id]);

  const handleOpenModal = (job?: LabJob) => {
    if (job) {
      setEditingJob(job);
      setFormData({
        labName: job.labName,
        prosthesisType: job.prosthesisType,
        sendDate: job.sendDate,
        expectedDate: job.expectedDate,
        status: job.status,
        cost: job.cost
      });
    } else {
      setEditingJob(null);
      setFormData({
        labName: '',
        prosthesisType: '',
        sendDate: new Date().toISOString().split('T')[0],
        expectedDate: '',
        status: 'Enviado',
        cost: 0
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || !patient.id || isSaving) return;

    setIsSaving(true);
    try {
      const jobData = {
        patientId: patient.id,
        patientName: patient.name,
        labName: formData.labName,
        prosthesisType: formData.prosthesisType,
        sendDate: formData.sendDate,
        expectedDate: formData.expectedDate,
        status: formData.status,
        cost: formData.cost,
        dentistId: auth.currentUser.uid,
        updatedAt: new Date().toISOString(),
        createdAt: editingJob ? editingJob.createdAt : new Date().toISOString()
      };

      if (editingJob) {
        await updateDoc(doc(db, 'lab_jobs', editingJob.id), jobData);
      } else {
        await addDoc(collection(db, 'lab_jobs'), jobData);
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error saving lab job:', error);
      alert('Erro ao salvar trabalho laboratoriais.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteClick = (id: string) => {
    setJobToDelete(id);
    setIsConfirmModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!jobToDelete || isDeleting) return;
    setIsDeleting(true);
    try {
      await moveToTrash('lab_jobs', jobToDelete);
      setIsConfirmModalOpen(false);
      setJobToDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `lab_jobs/${jobToDelete}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleStatusChange = async (jobId: string, newStatus: LabJob['status']) => {
    try {
      await updateDoc(doc(db, 'lab_jobs', jobId), {
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
      case 'Enviado': return <Truck size={16} className="text-blue-500" />;
      case 'Em Confecção': return <Clock size={16} className="text-yellow-500" />;
      case 'Recebido': return <CheckCircle size={16} className="text-emerald-500" />;
      case 'Instalado': return <CheckCircle size={16} className="text-indigo-500" />;
      default: return null;
    }
  };

  const getStatusLabel = (status: string) => {
    return status;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Enviado': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Em Confecção': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'Recebido': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Instalado': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-text-primary">Trabalhos Laboratoriais</h2>
        <button
          onClick={() => handleOpenModal()}
          className="bg-indigo-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-indigo-700 transition-colors"
        >
          <Plus size={20} />
          Novo Pedido
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {jobs.length === 0 ? (
          <div className="col-span-full text-center py-12 bg-surface rounded-2xl border border-zinc-200 dark:border-zinc-800">
            <p className="text-text-secondary">Nenhum trabalho laboratorial registrado para este paciente.</p>
          </div>
        ) : (
          jobs.map(job => (
            <motion.div
              key={job.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`bg-surface p-5 rounded-2xl border shadow-sm flex flex-col ${getStatusColor(job.status)}`}
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-semibold text-text-primary line-clamp-2">{job.prosthesisType}</h3>
                  <p className="text-sm text-text-secondary mt-1 flex items-center gap-1">
                    <FileText size={14} /> {job.labName}
                  </p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => handleOpenModal(job)} className="p-1.5 text-zinc-400 hover:text-indigo-600 transition-colors rounded-lg hover:bg-white/50 dark:hover:bg-zinc-800">
                    <Edit2 size={16} />
                  </button>
                  <button onClick={() => handleDeleteClick(job.id)} className="p-1.5 text-zinc-400 hover:text-red-600 transition-colors rounded-lg hover:bg-white/50 dark:hover:bg-zinc-800">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              
              <div className="mt-auto space-y-4">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="bg-white/50 dark:bg-black/10 p-2 rounded-lg">
                    <span className="block text-xs text-text-secondary mb-0.5">Envio</span>
                    <span className="font-medium">{new Date(job.sendDate).toLocaleDateString('pt-BR')}</span>
                  </div>
                  <div className="bg-white/50 dark:bg-black/10 p-2 rounded-lg">
                    <span className="block text-xs text-text-secondary mb-0.5">Retorno</span>
                    <span className="font-medium">{new Date(job.expectedDate).toLocaleDateString('pt-BR')}</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between pt-3 border-t border-black/5 dark:border-white/5">
                  <div className="flex items-center gap-1.5 text-sm font-medium">
                    {getStatusIcon(job.status)}
                    <span>{getStatusLabel(job.status)}</span>
                  </div>
                  <select
                    value={job.status}
                    onChange={(e) => handleStatusChange(job.id, e.target.value as LabJob['status'])}
                    className="text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg py-1 pl-2 pr-6 focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Enviado">Enviado</option>
                    <option value="Em Confecção">Em Produção</option>
                    <option value="Recebido">Recebido</option>
                    <option value="Instalado">Instalado</option>
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
              {editingJob ? 'Editar Trabalho' : 'Novo Trabalho Laboratorial'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Laboratório</label>
                <input
                  type="text"
                  required
                  disabled={isSaving}
                  value={formData.labName}
                  onChange={(e) => setFormData({ ...formData, labName: e.target.value })}
                  placeholder="Nome do laboratório"
                  className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-indigo-500 text-text-primary disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Descrição do Trabalho</label>
                <input
                  type="text"
                  required
                  disabled={isSaving}
                  value={formData.prosthesisType}
                  onChange={(e) => setFormData({ ...formData, prosthesisType: e.target.value })}
                  placeholder="Ex: Coroa E-max Dente 21"
                  className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-indigo-500 text-text-primary disabled:opacity-50"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Data de Envio</label>
                  <input
                    type="date"
                    required
                    disabled={isSaving}
                    value={formData.sendDate}
                    onChange={(e) => setFormData({ ...formData, sendDate: e.target.value })}
                    className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-indigo-500 text-text-primary disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Previsão de Retorno</label>
                  <input
                    type="date"
                    required
                    disabled={isSaving}
                    value={formData.expectedDate}
                    onChange={(e) => setFormData({ ...formData, expectedDate: e.target.value })}
                    className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-indigo-500 text-text-primary disabled:opacity-50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Custo (R$)</label>
                  <input
                    type="number"
                    required
                    disabled={isSaving}
                    min="0"
                    step="0.01"
                    value={formData.cost}
                    onChange={(e) => setFormData({ ...formData, cost: e.target.value === '' ? '' : Number(e.target.value) })}
                    className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-indigo-500 text-text-primary disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Status</label>
                  <select
                    value={formData.status}
                    disabled={isSaving}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as LabJob['status'] })}
                    className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-indigo-500 text-text-primary disabled:opacity-50"
                  >
                    <option value="Enviado">Enviado</option>
                    <option value="Em Confecção">Em Produção</option>
                    <option value="Recebido">Recebido</option>
                    <option value="Instalado">Instalado</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-8">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-text-secondary hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors font-medium disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-medium disabled:opacity-50 flex items-center gap-2"
                >
                  {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isSaving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      <ConfirmModal
        isOpen={isConfirmModalOpen}
        isLoading={isDeleting}
        onCancel={() => setIsConfirmModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Excluir Trabalho"
        message="Tem certeza que deseja excluir este trabalho laboratorial? Esta ação não pode ser desfeita."
      />
    </div>
  );
};
