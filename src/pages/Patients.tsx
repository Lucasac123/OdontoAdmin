import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType, moveToTrash } from '../firebase';
import { Patient, Dentist } from '../types';
import { Plus, Search, Trash2, Edit, ChevronRight, UserCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ConfirmModal } from '../components/ConfirmModal';
import { motion, AnimatePresence } from 'motion/react';

export const Patients: React.FC = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [dentists, setDentists] = useState<Dentist[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [newPatient, setNewPatient] = useState({
    name: '',
    source: '',
    status: 'Ativo' as const,
    responsibleDentistId: ''
  });
  const [error, setError] = useState<string | null>(null);
  const [patientToDelete, setPatientToDelete] = useState<Patient | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, 'patients'),
      where('dentistId', '==', auth.currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const patientsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Patient[];
      
      // Sort by name locally since we don't have a composite index yet
      patientsData.sort((a, b) => a.name.localeCompare(b.name));
      setPatients(patientsData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'patients');
    });

    const qDentists = query(
      collection(db, 'dentists'),
      where('dentistId', '==', auth.currentUser.uid)
    );
    const unsubscribeDentists = onSnapshot(qDentists, (snapshot) => {
      const dentistsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Dentist[];
      setDentists(dentistsData);
    });

    return () => {
      unsubscribe();
      unsubscribeDentists();
    };
  }, []);

  const handleAddPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    setIsSaving(true);
    setError(null);

    if (!auth.currentUser) {
      setIsSaving(false);
      return;
    }

    const trimmedName = newPatient.name.trim();

    if (!trimmedName) {
      setError('O nome do paciente é obrigatório.');
      setIsSaving(false);
      return;
    }

    try {
      await addDoc(collection(db, 'patients'), {
        dentistId: auth.currentUser.uid,
        name: trimmedName,
        source: newPatient.source.trim() || null,
        status: newPatient.status,
        responsibleDentistId: newPatient.responsibleDentistId || null,
        createdAt: new Date().toISOString()
      });
      setNewPatient({ name: '', source: '', status: 'Ativo', responsibleDentistId: '' });
      setIsAdding(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'patients');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, patient: Patient) => {
    e.stopPropagation();
    setPatientToDelete(patient);
  };

  const confirmDelete = async () => {
    if (!patientToDelete || isDeleting) return;
    setIsDeleting(true);
    try {
      await moveToTrash('patients', patientToDelete.id, patientToDelete);
      setPatientToDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `patients/${patientToDelete.id}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredPatients = patients.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-12">
        <div>
          <h1 className="text-5xl font-black text-text-primary tracking-tight">Pacientes</h1>
          <p className="text-text-secondary mt-2 font-medium">GERENCIE O CADASTRO E HISTÓRICO DE SEUS PACIENTES</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <div className="relative w-full sm:w-80 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-text-secondary group-focus-within:text-indigo-500 transition-all" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="BUSCAR POR NOME..."
              className="w-full bg-surface border border-zinc-200/50 dark:border-zinc-800 rounded-2xl pl-12 pr-4 py-3 text-xs font-black uppercase tracking-widest text-text-primary focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500/50 transition-all shadow-sm"
            />
          </div>
          <button
            onClick={() => setIsAdding(true)}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-2xl hover:bg-indigo-700 active:scale-[0.98] transition-all shadow-lg shadow-indigo-500/20 font-black text-xs uppercase tracking-widest shrink-0"
          >
            <Plus className="w-5 h-5" />
            Novo Paciente
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isAdding && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-surface p-8 rounded-[32px] shadow-2xl shadow-zinc-200/50 dark:shadow-none border border-zinc-200/50 dark:border-zinc-800 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-bl-full -mr-12 -mt-12" />
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-black text-text-primary tracking-tight">Cadastrar Novo Paciente</h2>
              <button 
                onClick={() => {
                  setIsAdding(false);
                  setNewPatient({ name: '', source: '', status: 'Ativo', responsibleDentistId: '' });
                  setError(null);
                }}
                className="text-text-secondary hover:text-text-primary transition-colors"
              >
                Cancelar
              </button>
            </div>

            <form onSubmit={handleAddPatient} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider ml-1">Nome Completo</label>
                <input
                  type="text"
                  disabled={isSaving}
                  value={newPatient.name}
                  onChange={(e) => {
                    setNewPatient({...newPatient, name: e.target.value});
                    if (error) setError(null);
                  }}
                  placeholder="Ex: João Silva"
                  className={`w-full bg-zinc-50 dark:bg-zinc-900 border ${error ? 'border-red-500' : 'border-zinc-200 dark:border-zinc-800'} rounded-2xl px-4 py-2.5 text-text-primary focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all disabled:opacity-50`}
                  autoFocus
                />
                {error && <p className="text-[10px] text-red-500 ml-1">{error}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider ml-1">Procedência</label>
                <input
                  type="text"
                  disabled={isSaving}
                  value={newPatient.source}
                  onChange={(e) => setNewPatient({...newPatient, source: e.target.value})}
                  placeholder="Ex: Indicação, Instagram"
                  className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-4 py-2.5 text-text-primary focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all disabled:opacity-50"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider ml-1">Status Inicial</label>
                <select
                  disabled={isSaving}
                  value={newPatient.status}
                  onChange={(e) => setNewPatient({...newPatient, status: e.target.value as any})}
                  className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-4 py-2.5 text-text-primary focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all appearance-none cursor-pointer disabled:opacity-50"
                >
                  <option value="Ativo">Ativo</option>
                  <option value="Inativo">Inativo</option>
                  <option value="Em Tratamento">Em Tratamento</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider ml-1">Dentista Responsável</label>
                <select
                  disabled={isSaving}
                  value={newPatient.responsibleDentistId}
                  onChange={(e) => setNewPatient({...newPatient, responsibleDentistId: e.target.value})}
                  className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-4 py-2.5 text-text-primary focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all appearance-none cursor-pointer disabled:opacity-50"
                >
                  <option value="">Sem filiação específica</option>
                  {dentists.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2 lg:col-span-4 flex justify-end gap-3 mt-6 pt-6 border-t border-zinc-100 dark:border-zinc-800">
                <button 
                  type="button" 
                  disabled={isSaving}
                  onClick={() => {
                    setIsAdding(false);
                    setNewPatient({ name: '', source: '', status: 'Ativo', responsibleDentistId: '' });
                    setError(null);
                  }} 
                  className="px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest text-text-secondary hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all disabled:opacity-50"
                >
                  Descartar
                </button>
                <button 
                  type="submit" 
                  disabled={isSaving}
                  className="bg-indigo-600 text-white px-10 py-3 rounded-2xl hover:bg-indigo-700 active:scale-[0.98] transition-all shadow-lg shadow-indigo-500/20 font-black text-xs uppercase tracking-widest disabled:opacity-50 flex items-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      CADASTRANDO...
                    </>
                  ) : (
                    'Cadastrar Paciente'
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredPatients.length === 0 ? (
          <div className="col-span-full bg-surface rounded-3xl p-12 text-center border border-zinc-200 dark:border-zinc-800">
            <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-zinc-400" />
            </div>
            <h3 className="text-lg font-semibold text-text-primary">Nenhum paciente encontrado</h3>
            <p className="text-text-secondary mt-1">Tente ajustar sua busca ou cadastrar um novo paciente.</p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {filteredPatients.map((patient, index) => (
              <motion.div 
                key={patient.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3, delay: index * 0.03 }}
                onClick={() => navigate(`/patients/${patient.id}`)}
                className="group bg-surface p-8 rounded-[32px] border border-zinc-200/50 dark:border-zinc-800 hover:border-indigo-500/50 hover:shadow-2xl hover:shadow-indigo-500/5 transition-all cursor-pointer relative overflow-hidden flex flex-col"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-bl-full -mr-8 -mt-8 transition-all group-hover:bg-indigo-500/10" />
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-black text-2xl border border-indigo-100 dark:border-indigo-500/20 transition-all group-hover:scale-105">
                      {patient.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-black text-xl text-text-primary group-hover:text-indigo-600 transition-colors line-clamp-1 uppercase tracking-tight">{patient.name}</h3>
                      <span className={`inline-flex items-center px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest mt-1.5 border ${
                        patient.status === 'Inativo' 
                          ? 'bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700'
                          : patient.status === 'Em Tratamento'
                          ? 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20'
                      }`}>
                        {patient.status || 'Ativo'}
                      </span>
                    </div>
                  </div>
                  <button 
                    onClick={(e) => handleDelete(e, patient)}
                    className="p-2.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all border border-transparent hover:border-red-100 opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4 pt-6 border-t border-zinc-100 dark:border-zinc-800/50 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Procedência</span>
                    <span className="font-black text-[10px] text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-3 py-1 rounded-lg border border-indigo-100 dark:border-indigo-500/20 uppercase tracking-widest">
                      {patient.source || 'NÃO INFORMADA'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Responsável</span>
                    <div className="flex items-center gap-1.5 font-bold text-text-primary text-xs">
                      <UserCircle className="w-4 h-4 text-zinc-400" />
                      <span className="line-clamp-1 uppercase">
                        {patient.responsibleDentistId 
                          ? dentists.find(d => d.id === patient.responsibleDentistId)?.name || 'DENTISTA'
                          : 'SEM FILIAÇÃO'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[10px] font-black text-text-secondary pt-6 uppercase tracking-widest opacity-60">
                  <span>Criado em</span>
                  <span>{new Date(patient.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                </div>

                <div className="absolute right-4 bottom-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all">
                  <ChevronRight className="w-5 h-5 text-indigo-500" />
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      <ConfirmModal
        isOpen={!!patientToDelete}
        title="Excluir Paciente"
        message={`Tem certeza que deseja apagar o paciente ${patientToDelete?.name}? Todos os dados relacionados serão movidos para a lixeira.`}
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        onConfirm={confirmDelete}
        onCancel={() => setPatientToDelete(null)}
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
};

export default Patients;
