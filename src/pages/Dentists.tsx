import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType, moveToTrash } from '../firebase';
import { Dentist } from '../types';
import { Plus, Trash2, Edit2, Search, UserCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ConfirmModal } from '../components/ConfirmModal';

export const Dentists: React.FC = () => {
  const [dentists, setDentists] = useState<Dentist[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [dentistToDelete, setDentistToDelete] = useState<Dentist | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    cro: '',
    specialty: '',
    phone: '',
    email: ''
  });

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(collection(db, 'dentists'), where('dentistId', '==', auth.currentUser.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const dentistsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Dentist[];
      
      setDentists(dentistsData.sort((a, b) => a.name.localeCompare(b.name)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'dentists'));

    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || isSaving) return;
    setIsSaving(true);

    try {
      if (editingId) {
        await updateDoc(doc(db, 'dentists', editingId), {
          ...formData
        });
        setEditingId(null);
      } else {
        await addDoc(collection(db, 'dentists'), {
          ...formData,
          dentistId: auth.currentUser.uid,
          createdAt: new Date().toISOString()
        });
      }
      setIsAdding(false);
      setFormData({ name: '', cro: '', specialty: '', phone: '', email: '' });
    } catch (error) {
      handleFirestoreError(error, editingId ? OperationType.UPDATE : OperationType.CREATE, 'dentists');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (dentist: Dentist) => {
    setFormData({
      name: dentist.name,
      cro: dentist.cro || '',
      specialty: dentist.specialty || '',
      phone: dentist.phone || '',
      email: dentist.email || ''
    });
    setEditingId(dentist.id);
    setIsAdding(true);
  };

  const handleDelete = async () => {
    if (!dentistToDelete || !auth.currentUser || isDeleting) return;
    setIsDeleting(true);

    try {
      await moveToTrash('dentists', dentistToDelete.id, dentistToDelete);
      setDentistToDelete(null);
      setDeleteError(null);
    } catch (error) {
      const errMessage = error instanceof Error ? error.message : 'Erro ao excluir profissional. Verifique suas permissões.';
      setDeleteError(errMessage);
      console.error(error);
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredDentists = dentists.filter(d => 
    d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.specialty?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.cro?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 max-w-7xl mx-auto">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-text-primary tracking-tight">Dentistas</h1>
          <p className="text-text-secondary mt-1">Gerencie os profissionais da clínica.</p>
        </div>
        <button
          onClick={() => {
            setFormData({ name: '', cro: '', specialty: '', phone: '', email: '' });
            setEditingId(null);
            setIsAdding(!isAdding);
          }}
          className="w-full sm:w-auto flex items-center justify-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 dark:shadow-none active:scale-[0.98] font-bold"
        >
          <Plus className="w-5 h-5" />
          Novo Dentista
        </button>
      </div>

      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-surface p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm max-w-7xl mx-auto"
          >
            <h2 className="text-lg font-bold text-text-primary mb-6">
              {editingId ? 'Editar Dentista' : 'Novo Dentista'}
            </h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              <div>
                <label className="block text-xs font-bold text-text-secondary uppercase tracking-widest mb-1.5">Nome *</label>
                <input
                  type="text"
                  required
                  disabled={isSaving}
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-text-primary focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all disabled:opacity-50"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-text-secondary uppercase tracking-widest mb-1.5">CRO</label>
                <input
                  type="text"
                  disabled={isSaving}
                  value={formData.cro}
                  onChange={e => setFormData({ ...formData, cro: e.target.value })}
                  className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-text-primary focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all disabled:opacity-50"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-text-secondary uppercase tracking-widest mb-1.5">Especialidade</label>
                <input
                  type="text"
                  disabled={isSaving}
                  value={formData.specialty}
                  onChange={e => setFormData({ ...formData, specialty: e.target.value })}
                  className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-text-primary focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all disabled:opacity-50"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-text-secondary uppercase tracking-widest mb-1.5">Telefone</label>
                <input
                  type="text"
                  disabled={isSaving}
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-text-primary focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all disabled:opacity-50"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-text-secondary uppercase tracking-widest mb-1.5">E-mail</label>
                <input
                  type="email"
                  disabled={isSaving}
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-text-primary focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all disabled:opacity-50"
                />
              </div>
              <div className="flex items-end gap-3 lg:col-span-3 pt-2">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 sm:flex-none bg-indigo-600 text-white px-8 py-2.5 rounded-xl hover:bg-indigo-700 transition-all font-bold shadow-lg shadow-indigo-600/20 dark:shadow-none active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      {editingId ? 'Salvando...' : 'Cadastrando...'}
                    </>
                  ) : (
                    editingId ? 'Salvar Alterações' : 'Cadastrar'
                  )}
                </button>
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => {
                    setIsAdding(false);
                    setEditingId(null);
                  }}
                  className="flex-1 sm:flex-none px-8 py-2.5 rounded-xl text-text-secondary hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all font-bold disabled:opacity-50"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-surface rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden max-w-7xl mx-auto">
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/30">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-zinc-400" />
            <input
              type="text"
              placeholder="Buscar por nome, CRO ou especialidade..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-text-primary focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto hidden md:block">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50/50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800">
                <th className="p-4 text-[10px] font-bold text-text-secondary uppercase tracking-widest">Nome</th>
                <th className="p-4 text-[10px] font-bold text-text-secondary uppercase tracking-widest">CRO</th>
                <th className="p-4 text-[10px] font-bold text-text-secondary uppercase tracking-widest">Especialidade</th>
                <th className="p-4 text-[10px] font-bold text-text-secondary uppercase tracking-widest">Contato</th>
                <th className="p-4 text-[10px] font-bold text-text-secondary uppercase tracking-widest text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {filteredDentists.map(dentist => (
                <tr key={dentist.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/50 transition-colors">
                  <td className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                        <UserCircle className="w-7 h-7" />
                      </div>
                      <span className="font-bold text-text-primary text-base">{dentist.name}</span>
                    </div>
                  </td>
                  <td className="p-6 text-text-secondary font-mono text-sm">{dentist.cro || '-'}</td>
                  <td className="p-6">
                    {dentist.specialty ? (
                      <span className="inline-flex items-center px-3 py-1.5 rounded-full text-[11px] font-black uppercase tracking-tighter bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                        {dentist.specialty}
                      </span>
                    ) : '-'}
                  </td>
                  <td className="p-6">
                    <div className="flex flex-col text-sm space-y-1">
                      {dentist.phone && <span className="text-text-primary font-medium">{dentist.phone}</span>}
                      {dentist.email && <span className="text-text-secondary truncate">{dentist.email}</span>}
                      {!dentist.phone && !dentist.email && '-'}
                    </div>
                  </td>
                  <td className="p-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleEdit(dentist)}
                        className="p-3 text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-xl transition-all"
                        title="Editar"
                      >
                        <Edit2 className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => setDentistToDelete(dentist)}
                        className="p-3 text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all"
                        title="Excluir"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredDentists.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-16 text-center text-text-secondary italic text-sm">
                    Nenhum dentista encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden divide-y divide-zinc-100 dark:divide-zinc-800">
          {filteredDentists.map(dentist => (
            <div key={dentist.id} className="p-5 space-y-4">
              <div className="flex justify-between items-start gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                    <UserCircle className="w-6 h-6" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-text-primary truncate">{dentist.name}</h3>
                    <p className="text-[10px] font-black uppercase tracking-tighter text-indigo-600 truncate">{dentist.specialty || 'Sem especialidade'}</p>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={() => handleEdit(dentist)}
                    className="p-2 text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg transition-all"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDentistToDelete(dentist)}
                    className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-[11px]">
                <div>
                  <p className="text-text-secondary text-[9px] uppercase font-black tracking-widest opacity-40 mb-0.5">CRO</p>
                  <p className="text-text-primary font-bold font-mono">{dentist.cro || '-'}</p>
                </div>
                <div>
                  <p className="text-text-secondary text-[9px] uppercase font-black tracking-widest opacity-40 mb-0.5">Contato</p>
                  <div className="text-text-primary font-bold truncate">
                    {dentist.phone || dentist.email || '-'}
                  </div>
                </div>
              </div>
            </div>
          ))}
          {filteredDentists.length === 0 && (
            <div className="p-16 text-center text-text-secondary italic text-sm">
              Nenhum dentista encontrado.
            </div>
          )}
        </div>
      </div>

      <ConfirmModal
        isOpen={!!dentistToDelete}
        isLoading={isDeleting}
        onCancel={() => setDentistToDelete(null)}
        onConfirm={handleDelete}
        title="Excluir Dentista"
        message={`Tem certeza que deseja excluir o dentista ${dentistToDelete?.name}? Esta ação pode ser desfeita na Lixeira.`}
        confirmLabel="Excluir"
        variant="danger"
        errorMessage={deleteError}
      />
    </div>
  );
};

export default Dentists;
