import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc } from 'firebase/firestore';
import { db, auth, moveToTrash, handleFirestoreError, OperationType } from '../firebase';
import { LabJob, Patient } from '../types';
import { Plus, Edit2, Trash2, CheckCircle, Clock, Truck, FileText, Search, Loader2 } from 'lucide-react';
import { ConfirmModal } from '../components/ConfirmModal';
import { motion } from 'motion/react';

const Laboratory = () => {
  const [jobs, setJobs] = useState<LabJob[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<LabJob | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [jobToDelete, setJobToDelete] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    patientId: '',
    patientName: '',
    prosthesisType: '',
    labName: '',
    sendDate: new Date().toISOString().split('T')[0],
    expectedDate: '',
    status: 'Enviado' as LabJob['status'],
    cost: '' as number | '',
    notes: ''
  });

  useEffect(() => {
    if (!auth.currentUser) return;

    // Fetch Patients for dropdown
    const patientsQuery = query(
      collection(db, 'patients'),
      where('dentistId', '==', auth.currentUser.uid)
    );
    const unsubscribePatients = onSnapshot(patientsQuery, (snapshot) => {
      const patientsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Patient[];
      setPatients(patientsData.sort((a, b) => a.name.localeCompare(b.name)));
    });

    // Fetch Lab Jobs
    const jobsQuery = query(
      collection(db, 'lab_jobs'),
      where('dentistId', '==', auth.currentUser.uid)
    );
    const unsubscribeJobs = onSnapshot(jobsQuery, (snapshot) => {
      const jobsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as LabJob[];
      setJobs(jobsData.sort((a, b) => new Date(b.sendDate).getTime() - new Date(a.sendDate).getTime()));
    });

    return () => {
      unsubscribePatients();
      unsubscribeJobs();
    };
  }, []);

  const handleOpenModal = (job?: LabJob) => {
    if (job) {
      setEditingJob(job);
      setFormData({
        patientId: job.patientId,
        patientName: job.patientName,
        prosthesisType: job.prosthesisType,
        labName: job.labName,
        sendDate: job.sendDate.split('T')[0],
        expectedDate: job.expectedDate.split('T')[0],
        status: job.status,
        cost: job.cost,
        notes: job.notes || ''
      });
    } else {
      setEditingJob(null);
      setFormData({
        patientId: '',
        patientName: '',
        prosthesisType: '',
        labName: '',
        sendDate: new Date().toISOString().split('T')[0],
        expectedDate: '',
        status: 'Enviado',
        cost: 0,
        notes: ''
      });
    }
    setIsModalOpen(true);
  };

  const handlePatientChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const patientId = e.target.value;
    const patient = patients.find(p => p.id === patientId);
    setFormData({
      ...formData,
      patientId,
      patientName: patient ? patient.name : ''
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || isSaving) return;

    setIsSaving(true);
    try {
      const jobData = {
        ...formData,
        sendDate: new Date(formData.sendDate).toISOString(),
        expectedDate: new Date(formData.expectedDate).toISOString(),
        dentistId: auth.currentUser.uid,
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
      alert('Erro ao salvar trabalho de laboratório.');
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
    const job = jobs.find(j => j.id === jobToDelete);
    if (!job) return;

    setIsDeleting(true);
    try {
      await moveToTrash('lab_jobs', jobToDelete, job);
      setIsConfirmModalOpen(false);
      setJobToDelete(null);
      setDeleteError(null);
    } catch (error) {
      const errMessage = error instanceof Error ? error.message : 'Erro ao excluir. Verifique suas permissões.';
      setDeleteError(errMessage);
      console.error(error);
    } finally {
      setIsDeleting(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Enviado': return <Truck size={16} className="text-blue-500" />;
      case 'Em Confecção': return <Clock size={16} className="text-yellow-500" />;
      case 'Recebido': return <FileText size={16} className="text-purple-500" />;
      case 'Instalado': return <CheckCircle size={16} className="text-green-500" />;
      default: return null;
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'Enviado': return 'bg-blue-100 text-blue-800';
      case 'Em Confecção': return 'bg-yellow-100 text-yellow-800';
      case 'Recebido': return 'bg-purple-100 text-purple-800';
      case 'Instalado': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredJobs = jobs.filter(job => 
    job.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.labName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.prosthesisType.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-text-primary tracking-tight">Gestão de Laboratório</h1>
          <p className="text-text-secondary mt-1">Acompanhe o status dos trabalhos enviados aos laboratórios.</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="w-full sm:w-auto bg-indigo-600 text-white px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 dark:shadow-none active:scale-[0.98] font-bold"
        >
          <Plus size={20} />
          Novo Trabalho
        </button>
      </div>

      <div className="bg-surface rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/30">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-zinc-400" />
            <input
              type="text"
              placeholder="Buscar por paciente, laboratório ou trabalho..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-text-primary focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
            />
          </div>
        </div>

        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-zinc-50/50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800">
              <tr>
                <th className="text-left py-4 px-6 text-[10px] font-bold text-text-secondary uppercase tracking-widest">Paciente</th>
                <th className="text-left py-4 px-6 text-[10px] font-bold text-text-secondary uppercase tracking-widest">Trabalho / Prótese</th>
                <th className="text-left py-4 px-6 text-[10px] font-bold text-text-secondary uppercase tracking-widest">Laboratório</th>
                <th className="text-left py-4 px-6 text-[10px] font-bold text-text-secondary uppercase tracking-widest">Envio</th>
                <th className="text-left py-4 px-6 text-[10px] font-bold text-text-secondary uppercase tracking-widest">Previsão</th>
                <th className="text-left py-4 px-6 text-[10px] font-bold text-text-secondary uppercase tracking-widest">Status</th>
                <th className="text-right py-4 px-6 text-[10px] font-bold text-text-secondary uppercase tracking-widest">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {filteredJobs.map((job) => (
                <tr key={job.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/50 transition-colors">
                  <td className="py-4 px-6">
                    <span className="text-sm font-bold text-text-primary">{job.patientName}</span>
                  </td>
                  <td className="py-4 px-6">
                    <span className="text-sm text-text-secondary font-medium">{job.prosthesisType}</span>
                  </td>
                  <td className="py-4 px-6">
                    <span className="text-sm text-text-secondary">{job.labName}</span>
                  </td>
                  <td className="py-4 px-6">
                    <span className="text-sm text-text-secondary font-mono">
                      {new Date(job.sendDate).toLocaleDateString('pt-BR')}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <span className="text-sm text-text-secondary font-mono">
                      {new Date(job.expectedDate).toLocaleDateString('pt-BR')}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${getStatusBadgeClass(job.status)}`}>
                      {getStatusIcon(job.status)}
                      {job.status}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => handleOpenModal(job)}
                        className="p-2 text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg transition-all"
                        title="Editar"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(job.id)}
                        className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-all"
                        title="Excluir"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredJobs.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-text-secondary italic text-sm">
                    Nenhum trabalho de laboratório encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="lg:hidden divide-y divide-zinc-100 dark:divide-zinc-800">
          {filteredJobs.length === 0 ? (
            <div className="py-16 text-center text-text-secondary italic text-sm">Nenhum trabalho de laboratório encontrado.</div>
          ) : (
            filteredJobs.map((job) => (
              <div key={job.id} className="p-5 space-y-4">
                <div className="flex justify-between items-start gap-4">
                  <div className="min-w-0">
                    <h4 className="font-bold text-text-primary truncate">{job.patientName}</h4>
                    <p className="text-xs text-text-secondary font-medium truncate">{job.prosthesisType}</p>
                  </div>
                  <span className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${getStatusBadgeClass(job.status)}`}>
                    {getStatusIcon(job.status)}
                    {job.status}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-[11px] text-text-secondary">
                  <div>
                    <span className="block font-black uppercase text-[9px] opacity-40 mb-0.5 tracking-widest">Laboratório</span>
                    <span className="font-medium text-text-primary">{job.labName}</span>
                  </div>
                  <div>
                    <span className="block font-black uppercase text-[9px] opacity-40 mb-0.5 tracking-widest">Previsão</span>
                    <span className="font-medium text-text-primary">{new Date(job.expectedDate).toLocaleDateString('pt-BR')}</span>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => handleOpenModal(job)}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 py-2 px-4 text-indigo-600 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl text-xs font-bold transition-all active:scale-95"
                  >
                    <Edit2 size={14} /> Editar
                  </button>
                  <button
                    onClick={() => handleDeleteClick(job.id)}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 py-2 px-4 text-red-600 bg-red-50 dark:bg-red-500/10 rounded-xl text-xs font-bold transition-all active:scale-95"
                  >
                    <Trash2 size={14} /> Excluir
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-surface rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl border border-zinc-200 dark:border-zinc-800"
          >
            <h2 className="text-xl font-bold text-text-primary mb-6">
              {editingJob ? 'Editar Trabalho' : 'Novo Trabalho de Laboratório'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-text-secondary uppercase mb-1">Paciente</label>
                  <select
                    required
                    disabled={isSaving}
                    value={formData.patientId}
                    onChange={handlePatientChange}
                    className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2 text-text-primary focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                  >
                    <option value="">Selecione um paciente</option>
                    {patients.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-text-secondary uppercase mb-1">Laboratório</label>
                  <input
                    type="text"
                    required
                    disabled={isSaving}
                    value={formData.labName}
                    onChange={(e) => setFormData({ ...formData, labName: e.target.value })}
                    placeholder="Nome do Laboratório"
                    className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2 text-text-primary focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-text-secondary uppercase mb-1">Tipo de Prótese / Trabalho</label>
                <input
                  type="text"
                  required
                  disabled={isSaving}
                  value={formData.prosthesisType}
                  onChange={(e) => setFormData({ ...formData, prosthesisType: e.target.value })}
                  placeholder="Ex: Coroa Porcelana Dente 14"
                  className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2 text-text-primary focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-text-secondary uppercase mb-1">Data de Envio</label>
                  <input
                    type="date"
                    required
                    disabled={isSaving}
                    value={formData.sendDate}
                    onChange={(e) => setFormData({ ...formData, sendDate: e.target.value })}
                    className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2 text-text-primary focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-text-secondary uppercase mb-1">Previsão de Retorno</label>
                  <input
                    type="date"
                    required
                    disabled={isSaving}
                    value={formData.expectedDate}
                    onChange={(e) => setFormData({ ...formData, expectedDate: e.target.value })}
                    className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2 text-text-primary focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-text-secondary uppercase mb-1">Status</label>
                  <select
                    disabled={isSaving}
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as LabJob['status'] })}
                    className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2 text-text-primary focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                  >
                    <option value="Enviado">Enviado</option>
                    <option value="Em Confecção">Em Confecção</option>
                    <option value="Recebido">Recebido</option>
                    <option value="Instalado">Instalado</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-text-secondary uppercase mb-1">Custo (R$)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    disabled={isSaving}
                    value={formData.cost}
                    onChange={(e) => setFormData({ ...formData, cost: e.target.value === '' ? '' : Number(e.target.value) })}
                    className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2 text-text-primary focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-text-secondary uppercase mb-1">Observações</label>
                <textarea
                  disabled={isSaving}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2 text-text-primary focus:ring-2 focus:ring-indigo-500 resize-none disabled:opacity-50"
                  placeholder="Cor, detalhes específicos, etc."
                />
              </div>

              <div className="flex justify-end gap-3 mt-8">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-2 text-text-secondary hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors font-medium disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-8 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-bold shadow-lg shadow-indigo-500/20 disabled:opacity-70 flex items-center gap-2"
                >
                  {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
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
        isLoading={isDeleting}
        title="Excluir Trabalho"
        message="Tem certeza que deseja mover este trabalho para a lixeira?"
        confirmLabel="Excluir"
        variant="danger"
        errorMessage={deleteError}
      />
    </div>
  );
};

export default Laboratory;
