import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType, moveToTrash } from '../firebase';
import { Patient } from '../types';
import { Plus, Search, Trash2, Edit, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ConfirmModal } from '../components/ConfirmModal';

export const Patients: React.FC = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [newPatient, setNewPatient] = useState({
    name: '',
    source: '',
    status: 'Ativo' as const
  });
  const [error, setError] = useState<string | null>(null);
  const [patientToDelete, setPatientToDelete] = useState<Patient | null>(null);
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

    return () => unsubscribe();
  }, []);

  const handleAddPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!auth.currentUser) return;

    const trimmedName = newPatient.name.trim();

    if (!trimmedName) {
      setError('O nome do paciente é obrigatório.');
      return;
    }

    try {
      await addDoc(collection(db, 'patients'), {
        dentistId: auth.currentUser.uid,
        name: trimmedName,
        source: newPatient.source.trim() || null,
        status: newPatient.status,
        createdAt: new Date().toISOString()
      });
      setNewPatient({ name: '', source: '', status: 'Ativo' });
      setIsAdding(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'patients');
    }
  };

  const handleDelete = async (e: React.MouseEvent, patient: Patient) => {
    e.stopPropagation();
    setPatientToDelete(patient);
  };

  const confirmDelete = async () => {
    if (!patientToDelete) return;
    try {
      await moveToTrash('patients', patientToDelete.id, patientToDelete);
      setPatientToDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `patients/${patientToDelete.id}`);
    }
  };

  const filteredPatients = patients.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full md:w-auto">
          <h1 className="text-3xl font-bold text-text-primary">Pacientes</h1>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar paciente por nome..."
              className="w-full bg-surface border border-zinc-200 dark:border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            />
          </div>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-700 transition-colors shrink-0"
        >
          <Plus className="w-5 h-5" />
          Novo Paciente
        </button>
      </div>

      {isAdding && (
        <div className="space-y-2">
          <form onSubmit={handleAddPatient} className="bg-surface p-4 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={newPatient.name}
              onChange={(e) => {
                setNewPatient({...newPatient, name: e.target.value});
                if (error) setError(null);
              }}
              placeholder="Nome do paciente"
              className={`flex-1 bg-zinc-50 dark:bg-zinc-950 border ${error ? 'border-red-500' : 'border-zinc-200 dark:border-zinc-800'} rounded-xl px-4 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-indigo-500`}
              autoFocus
            />
            <input
              type="text"
              value={newPatient.source}
              onChange={(e) => setNewPatient({...newPatient, source: e.target.value})}
              placeholder="Procedência (Ex: Indicação)"
              className="flex-1 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <select
              value={newPatient.status}
              onChange={(e) => setNewPatient({...newPatient, status: e.target.value as any})}
              className="flex-1 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="Ativo">Ativo</option>
              <option value="Inativo">Inativo</option>
              <option value="Em Tratamento">Em Tratamento</option>
            </select>
            <div className="flex gap-2">
              <button type="submit" className="flex-1 sm:flex-none bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-700 transition-colors">
                Salvar
              </button>
              <button 
                type="button" 
                onClick={() => {
                  setIsAdding(false);
                  setNewPatient({ name: '', source: '' });
                  setError(null);
                }} 
                className="flex-1 sm:flex-none bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 px-4 py-2 rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
          {error && (
            <p className="text-sm text-red-500 ml-4">{error}</p>
          )}
        </div>
      )}

      <div className="bg-surface rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        {filteredPatients.length === 0 ? (
          <div className="p-8 text-center text-text-secondary">
            Nenhum paciente encontrado.
          </div>
        ) : (
          <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {filteredPatients.map(patient => (
              <div 
                key={patient.id}
                onClick={() => navigate(`/patients/${patient.id}`)}
                className="flex items-center justify-between p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-medium text-text-primary">{patient.name}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      patient.status === 'Inativo' 
                        ? 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                        : patient.status === 'Em Tratamento'
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400'
                        : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                    }`}>
                      {patient.status || 'Ativo'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-text-secondary">
                    <span>Cadastrado em {new Date(patient.createdAt).toLocaleDateString()}</span>
                    {patient.source && (
                      <>
                        <span className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                        <span className="text-indigo-600 dark:text-indigo-400 font-medium">{patient.source}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={(e) => handleDelete(e, patient)}
                    className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                  <ChevronRight className="w-5 h-5 text-zinc-400" />
                </div>
              </div>
            ))}
          </div>
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
      />
    </div>
  );
};
