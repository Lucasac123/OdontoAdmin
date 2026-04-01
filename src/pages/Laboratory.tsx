import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc } from 'firebase/firestore';
import { db, auth, moveToTrash, handleFirestoreError, OperationType } from '../firebase';
import { LabJob, Patient } from '../types';
import { Plus, Edit2, Trash2, CheckCircle, Clock, Truck, FileText, Search, Loader2, XCircle } from 'lucide-react';
import { ConfirmModal } from '../components/ConfirmModal';
import { motion, AnimatePresence } from 'motion/react';

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

  const [formData, setFormData] = useState({
    patientId: '',
    patientName: '',
    prosthesisType: '',
    labName: '',
    sendDate: new Date().toISOString().split('T')[0],
    expectedDate: '',
    status: 'Enviado' as LabJob['status'],
    cost: 0,
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
        expectedDate: (job.expectedDate || '').split('T')[0],
        status: job.status,
        cost: job.cost || 0,
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
        expectedDate: formData.expectedDate ? new Date(formData.expectedDate).toISOString() : null,
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
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `lab_jobs/${jobToDelete}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Enviado': return <Truck size={14} />;
      case 'Em Confecção': return <Clock size={14} />;
      case 'Recebido': return <FileText size={14} />;
      case 'Instalado': return <CheckCircle size={14} />;
      default: return null;
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'Enviado': return 'bg-cyan-50 text-cyan-700 border-cyan-100 dark:bg-cyan-500/10 dark:text-cyan-400 dark:border-cyan-500/20';
      case 'Em Confecção': return 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20';
      case 'Recebido': return 'bg-purple-50 text-purple-700 border-purple-100 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20';
      case 'Instalado': return 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20';
      default: return 'bg-zinc-50 text-zinc-600 border-zinc-100';
    }
  };

  const filteredJobs = jobs.filter(job => 
    job.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.labName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.prosthesisType.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 flex flex-col h-full">
      <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-12 shrink-0">
        <div>
          <h1 className="text-5xl font-black text-text-primary tracking-tight uppercase">Laboratório</h1>
          <p className="text-text-secondary mt-2 font-medium uppercase tracking-widest text-xs">ACOMPANHE O STATUS DOS TRABALHOS DE PRÓTESE</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <div className="relative w-full sm:w-80 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-text-secondary group-focus-within:text-cyan-500 transition-all" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="BUSCAR TRABALHO..."
              className="w-full bg-surface border border-zinc-200/50 dark:border-zinc-800 rounded-2xl pl-12 pr-4 py-3 text-xs font-black uppercase tracking-widest text-text-primary focus:outline-none focus:ring-2 focus:ring-cyan-500/10 focus:border-cyan-500/50 transition-all shadow-sm"
            />
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="w-full sm:w-auto bg-cyan-600 text-white px-8 py-3 rounded-2xl flex items-center justify-center gap-2 hover:bg-cyan-700 active:scale-95 transition-all shadow-lg shadow-cyan-500/20 font-black text-xs uppercase tracking-widest shrink-0"
          >
            <Plus size={20} />
            Novo Trabalho
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 pb-10">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredJobs.map((job, index) => (
              <motion.div
                key={job.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className="group bg-surface p-8 rounded-[32px] border border-zinc-200/50 dark:border-zinc-800 hover:border-cyan-500/50 hover:shadow-2xl hover:shadow-cyan-500/5 transition-all relative overflow-hidden flex flex-col"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-bl-full -mr-8 -mt-8 transition-all group-hover:bg-cyan-500/10" />
                <div className="flex justify-between items-start mb-6">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl font-black text-text-primary group-hover:text-cyan-600 transition-colors uppercase tracking-tight truncate">{job.patientName}</h3>
                    <div className="flex items-center gap-2 mt-2">
                       <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest border ${getStatusBadgeClass(job.status)}`}>
                        {getStatusIcon(job.status)}
                        {job.status}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1 ml-4">
                    <button 
                      onClick={() => handleOpenModal(job)}
                      className="p-2.5 text-zinc-400 hover:text-cyan-600 hover:bg-cyan-50 dark:hover:bg-cyan-500/10 rounded-xl transition-all border border-transparent hover:border-cyan-100"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button 
                      onClick={() => handleDeleteClick(job.id)}
                      className="p-2.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all border border-transparent hover:border-red-100"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                <div className="space-y-4 py-6 border-y border-zinc-100 dark:border-zinc-800/50">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Trabalho</span>
                    <span className="text-xs font-black text-text-primary uppercase truncate max-w-[150px]">{job.prosthesisType}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Laboratório</span>
                    <span className="text-xs font-black text-text-primary uppercase">{job.labName}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                      <span className="text-[9px] font-black text-text-secondary uppercase tracking-widest block mb-1">Data Envio</span>
                      <span className="text-xs font-black text-text-primary">{new Date(job.sendDate).toLocaleDateString('pt-BR')}</span>
                    </div>
                    <div className="bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                      <span className="text-[9px] font-black text-text-secondary uppercase tracking-widest block mb-1">Previsão</span>
                      <span className="text-xs font-black text-cyan-600 dark:text-cyan-400">{job.expectedDate ? new Date(job.expectedDate).toLocaleDateString('pt-BR') : '-'}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-6 flex items-center justify-between">
                  <span className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Investimento</span>
                  <span className="text-lg font-black text-text-primary tracking-tight">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(job.cost || 0)}
                  </span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {filteredJobs.length === 0 && (
          <div className="py-20 text-center bg-surface border border-dashed border-zinc-200 dark:border-zinc-800 rounded-[32px]">
            <div className="bg-zinc-50 dark:bg-zinc-800/50 w-20 h-20 rounded-[28px] flex items-center justify-center mx-auto mb-6">
              <Search size={32} className="text-zinc-200" />
            </div>
            <h3 className="text-xl font-black text-text-primary uppercase tracking-tight">Nenhum trabalho encontrado</h3>
            <p className="text-text-secondary max-w-xs mx-auto mt-2 text-xs font-medium uppercase tracking-widest">
              Tente ajustar sua busca ou adicione um novo trabalho.
            </p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-surface rounded-[32px] shadow-2xl border border-zinc-200/50 dark:border-zinc-800 w-full max-w-2xl overflow-hidden relative"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-bl-full -mr-12 -mt-12" />
              <div className="p-8 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                <h2 className="text-2xl font-black text-text-primary tracking-tight uppercase">
                  {editingJob ? 'Editar Trabalho' : 'Novo Trabalho'}
                </h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl text-text-secondary border border-zinc-200/50 transition-all">
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Paciente</label>
                    <select
                      required
                      value={formData.patientId}
                      onChange={handlePatientChange}
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-5 py-3 text-sm focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500/50 outline-none transition-all uppercase font-black"
                    >
                      <option value="">Selecione um paciente</option>
                      {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Laboratório</label>
                    <input
                      type="text"
                      required
                      value={formData.labName}
                      onChange={(e) => setFormData({ ...formData, labName: e.target.value })}
                      placeholder="EX: LAB ORTHO"
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-5 py-3 text-sm focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500/50 outline-none transition-all uppercase font-black"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Tipo de Prótese / Trabalho</label>
                  <input
                    type="text"
                    required
                    value={formData.prosthesisType}
                    onChange={(e) => setFormData({ ...formData, prosthesisType: e.target.value })}
                    placeholder="EX: COROA ZIRCÔNIA DENTE 21"
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-5 py-3 text-sm focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500/50 outline-none transition-all uppercase font-black"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Data de Envio</label>
                    <input
                      type="date"
                      required
                      value={formData.sendDate}
                      onChange={(e) => setFormData({ ...formData, sendDate: e.target.value })}
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-5 py-3 text-sm focus:ring-2 focus:ring-cyan-500/20 font-black"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Previsão de Retorno</label>
                    <input
                      type="date"
                      value={formData.expectedDate}
                      onChange={(e) => setFormData({ ...formData, expectedDate: e.target.value })}
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-5 py-3 text-sm focus:ring-2 focus:ring-cyan-500/20 font-black"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as LabJob['status'] })}
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-5 py-3 text-sm focus:ring-2 focus:ring-cyan-500/20 outline-none font-black uppercase"
                    >
                      <option value="Enviado">Enviado</option>
                      <option value="Em Confecção">Em Confecção</option>
                      <option value="Recebido">Recebido</option>
                      <option value="Instalado">Instalado</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Custo (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.cost}
                      onChange={(e) => setFormData({ ...formData, cost: Number(e.target.value) })}
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-5 py-3 text-sm focus:ring-2 focus:ring-cyan-500/20 font-black"
                    />
                  </div>
                </div>

                <div className="flex gap-4 pt-8 border-t border-zinc-100 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-text-secondary hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all text-center"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 px-4 py-3 rounded-2xl bg-cyan-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-cyan-700 shadow-lg shadow-cyan-500/20 transition-all text-center disabled:opacity-50"
                  >
                    {isSaving ? 'SALVANDO...' : 'SALVAR TRABALHO'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmModal
        isOpen={isConfirmModalOpen}
        onCancel={() => setIsConfirmModalOpen(false)}
        onConfirm={handleConfirmDelete}
        isLoading={isDeleting}
        title="Excluir Trabalho"
        message="Tem certeza que deseja excluir este trabalho de laboratório? Esta ação não pode ser desfeita."
      />
    </div>
  );
};

export default Laboratory;
