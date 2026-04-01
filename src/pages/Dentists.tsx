import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType, moveToTrash } from '../firebase';
import { Dentist } from '../types';
import { Plus, Trash2, Edit2, Search, UserCircle, XCircle } from 'lucide-react';
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
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'dentists');
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
    <div className="space-y-6 flex flex-col h-full">
      <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-12 shrink-0">
        <div>
          <h1 className="text-5xl font-black text-text-primary tracking-tight uppercase">Dentistas</h1>
          <p className="text-text-secondary mt-2 font-medium uppercase tracking-widest text-xs">GERENCIE OS PROFISSIONAIS DA EQUIPE</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <div className="relative w-full sm:w-80 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-text-secondary group-focus-within:text-orange-500 transition-all" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="BUSCAR PROFISSIONAL..."
              className="w-full bg-surface border border-zinc-200/50 dark:border-zinc-800 rounded-2xl pl-12 pr-4 py-3 text-xs font-black uppercase tracking-widest text-text-primary focus:outline-none focus:ring-2 focus:ring-orange-500/10 focus:border-orange-500/50 transition-all shadow-sm"
            />
          </div>
          <button
            onClick={() => {
              setFormData({ name: '', cro: '', specialty: '', phone: '', email: '' });
              setEditingId(null);
              setIsAdding(true);
            }}
            className="w-full sm:w-auto bg-orange-600 text-white px-8 py-3 rounded-2xl flex items-center justify-center gap-2 hover:bg-orange-700 active:scale-95 transition-all shadow-lg shadow-orange-500/20 font-black text-xs uppercase tracking-widest shrink-0"
          >
            <Plus size={20} />
            Novo Dentista
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 pb-10">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredDentists.map((dentist, index) => (
              <motion.div
                key={dentist.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className="group bg-surface p-8 rounded-[32px] border border-zinc-200/50 dark:border-zinc-800 hover:border-orange-500/50 hover:shadow-2xl hover:shadow-orange-500/5 transition-all relative overflow-hidden flex flex-col"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/5 rounded-bl-full -mr-8 -mt-8 transition-all group-hover:bg-orange-500/10" />
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-14 h-14 rounded-2xl bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center text-orange-600 dark:text-orange-400 shrink-0 border border-orange-100 dark:border-orange-500/20 shadow-sm transition-transform group-hover:scale-105">
                      <UserCircle className="w-8 h-8" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-xl font-black text-text-primary group-hover:text-orange-600 transition-colors uppercase tracking-tight truncate">{dentist.name}</h3>
                      <p className="text-[10px] font-black uppercase tracking-widest text-orange-600 dark:text-orange-400 truncate mt-0.5">{dentist.specialty || 'Clínico Geral'}</p>
                    </div>
                  </div>
                  <div className="flex gap-1 ml-4">
                    <button 
                      onClick={() => handleEdit(dentist)}
                      className="p-2.5 text-zinc-400 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-500/10 rounded-xl transition-all border border-transparent hover:border-orange-100"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button 
                      onClick={() => setDentistToDelete(dentist)}
                      className="p-2.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all border border-transparent hover:border-red-100"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 py-6 border-y border-zinc-100 dark:border-zinc-800/50">
                   <div className="space-y-1">
                    <span className="text-[9px] font-black text-text-secondary uppercase tracking-widest block">Nº Registro CRO</span>
                    <span className="text-xs font-black text-text-primary tracking-widest font-mono uppercase">{dentist.cro || 'NÃO INF.'}</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[9px] font-black text-text-secondary uppercase tracking-widest block">Membro Desde</span>
                    <span className="text-xs font-black text-text-primary uppercase">{dentist.createdAt ? new Date(dentist.createdAt).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }) : '-'}</span>
                  </div>
                </div>

                <div className="pt-6 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 text-[10px] uppercase font-black">Tel</div>
                    <span className="text-xs font-black text-text-primary tracking-tight uppercase group-hover:text-orange-600 transition-colors">{dentist.phone || 'NÃO CADASTRADO'}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 text-[10px] uppercase font-black">@</div>
                    <span className="text-xs font-black text-text-secondary truncate group-hover:text-text-primary transition-colors">{dentist.email || 'NÃO CADASTRADO'}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {filteredDentists.length === 0 && (
          <div className="py-20 text-center bg-surface border border-dashed border-zinc-200 dark:border-zinc-800 rounded-[32px]">
            <div className="bg-zinc-50 dark:bg-zinc-800/50 w-20 h-20 rounded-[28px] flex items-center justify-center mx-auto mb-6">
              <Search size={32} className="text-zinc-200" />
            </div>
            <h3 className="text-xl font-black text-text-primary uppercase tracking-tight">Nenhum dentista encontrado</h3>
            <p className="text-text-secondary max-w-xs mx-auto mt-2 text-xs font-medium uppercase tracking-widest">
              Tente ajustar sua busca ou adicione um novo profissional.
            </p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-surface rounded-[32px] shadow-2xl border border-zinc-200/50 dark:border-zinc-800 w-full max-w-lg overflow-hidden relative"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-bl-full -mr-12 -mt-12" />
              <div className="p-8 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                <h2 className="text-2xl font-black text-text-primary tracking-tight uppercase">
                  {editingId ? 'Editar Dentista' : 'Novo Dentista'}
                </h2>
                <button onClick={() => setIsAdding(false)} className="p-2.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl text-text-secondary border border-zinc-200/50 transition-all">
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Nome Completo *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="EX: DR. LUCAS ARRAIS"
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-5 py-3 text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500/50 outline-none transition-all uppercase font-black"
                  />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Nº CRO</label>
                    <input
                      type="text"
                      value={formData.cro}
                      onChange={e => setFormData({ ...formData, cro: e.target.value })}
                      placeholder="EX: 123456-SP"
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-5 py-3 text-sm focus:ring-2 focus:ring-orange-500/20 outline-none uppercase font-black tracking-widest font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Especialidade</label>
                    <input
                      type="text"
                      value={formData.specialty}
                      onChange={e => setFormData({ ...formData, specialty: e.target.value })}
                      placeholder="EX: IMPLANTODONTIA"
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-5 py-3 text-sm focus:ring-2 focus:ring-orange-500/20 outline-none uppercase font-black"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Whatsapp / Tel</label>
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={e => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="(11) 99999-9999"
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-5 py-3 text-sm focus:ring-2 focus:ring-orange-500/20 outline-none font-black"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">E-mail Profissional</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                      placeholder="CONTATO@EXEMPLO.COM"
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-5 py-3 text-sm focus:ring-2 focus:ring-orange-500/20 outline-none font-black"
                    />
                  </div>
                </div>

                <div className="flex gap-4 pt-8 border-t border-zinc-100 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setIsAdding(false)}
                    className="flex-1 px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-text-secondary hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all text-center"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 px-4 py-3 rounded-2xl bg-orange-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-orange-700 shadow-lg shadow-orange-500/20 transition-all text-center disabled:opacity-50"
                  >
                    {isSaving ? 'SALVANDO...' : editingId ? 'SALVAR ALTERAÇÕES' : 'CADASTRAR DENTISTA'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmModal
        isOpen={!!dentistToDelete}
        isLoading={isDeleting}
        onCancel={() => setDentistToDelete(null)}
        onConfirm={handleDelete}
        title="Excluir Dentista"
        message={`Tem certeza que deseja excluir o dentista ${dentistToDelete?.name}? Esta ação pode ser desfeita na Lixeira.`}
        confirmLabel="Excluir"
        variant="danger"
      />
    </div>
  );
};

export default Dentists;
