import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType, moveToTrash } from '../firebase';
import { Appointment, Finance, Patient, QuickNote } from '../types';
import { Users, Calendar, DollarSign, TrendingUp, Clock, BrainCircuit, Trash2, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { ConfirmModal } from '../components/ConfirmModal';
import { motion, AnimatePresence } from 'motion/react';

export const Dashboard: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [finances, setFinances] = useState<Finance[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [quickNotes, setQuickNotes] = useState<QuickNote[]>([]);
  const [newNote, setNewNote] = useState('');
  const [noteToDelete, setNoteToDelete] = useState<QuickNote | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!auth.currentUser) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const qAppointments = query(
      collection(db, 'appointments'),
      where('dentistId', '==', auth.currentUser.uid),
      where('date', '>=', today.toISOString()),
      where('date', '<', tomorrow.toISOString())
    );

    const qFinances = query(
      collection(db, 'finances'),
      where('dentistId', '==', auth.currentUser.uid)
    );

    const qPatients = query(
      collection(db, 'patients'),
      where('dentistId', '==', auth.currentUser.uid)
    );

    const qQuickNotes = query(
      collection(db, 'quickNotes'),
      where('dentistId', '==', auth.currentUser.uid)
    );

    const unsubAppointments = onSnapshot(qAppointments, (snapshot) => {
      setAppointments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'appointments'));

    const unsubFinances = onSnapshot(qFinances, (snapshot) => {
      setFinances(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Finance)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'finances'));

    const unsubPatients = onSnapshot(qPatients, (snapshot) => {
      setPatients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Patient)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'patients'));

    const unsubQuickNotes = onSnapshot(qQuickNotes, (snapshot) => {
      setQuickNotes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as QuickNote)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'quickNotes'));

    return () => {
      unsubAppointments();
      unsubFinances();
      unsubPatients();
      unsubQuickNotes();
    };
  }, []);

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || !newNote.trim()) return;
    try {
      await addDoc(collection(db, 'quickNotes'), {
        dentistId: auth.currentUser.uid,
        content: newNote,
        createdAt: new Date().toISOString()
      });
      setNewNote('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'quickNotes');
    }
  };

  const handleDeleteNote = async (note: QuickNote) => {
    setNoteToDelete(note);
  };

  const confirmDeleteNote = async () => {
    if (!noteToDelete) return;
    try {
      await moveToTrash('quickNotes', noteToDelete.id, noteToDelete);
      setNoteToDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `quickNotes/${noteToDelete.id}`);
    }
  };

  const currentMonth = new Date().toISOString().substring(0, 7);
  const financesInMonth = finances.filter(f => f.date.substring(0, 7) === currentMonth);

  const totalIncome = financesInMonth.filter(f => f.type === 'income').reduce((acc, curr) => acc + curr.amount, 0);
  const totalExpense = financesInMonth.filter(f => f.type === 'expense').reduce((acc, curr) => acc + curr.amount, 0);
  const balance = totalIncome - totalExpense;

  const today = new Date();
  const next7Days = new Date();
  next7Days.setDate(today.getDate() + 7);

  const upcomingBirthdays = patients.filter(p => {
    if (!p.dob) return false;
    const [year, month, day] = p.dob.split('-').map(Number);
    const birthdayThisYear = new Date(today.getFullYear(), month - 1, day);
    const birthday = birthdayThisYear < today ?
                     new Date(today.getFullYear() + 1, month - 1, day) :
                     birthdayThisYear;
    return birthday >= today && birthday <= next7Days;
  }).sort((a, b) => {
    const [yearA, monthA, dayA] = a.dob!.split('-').map(Number);
    const [yearB, monthB, dayB] = b.dob!.split('-').map(Number);
    const bdayA = new Date(today.getFullYear(), monthA - 1, dayA) < today ? new Date(today.getFullYear() + 1, monthA - 1, dayA) : new Date(today.getFullYear(), monthA - 1, dayA);
    const bdayB = new Date(today.getFullYear(), monthB - 1, dayB) < today ? new Date(today.getFullYear() + 1, monthB - 1, dayB) : new Date(today.getFullYear(), monthB - 1, dayB);
    return bdayA.getTime() - bdayB.getTime();
  });

  const patientStatusData = [
    { name: 'Ativo', value: patients.filter(p => p.status === 'Ativo').length },
    { name: 'Inativo', value: patients.filter(p => p.status === 'Inativo').length },
    { name: 'Em Tratamento', value: patients.filter(p => p.status === 'Em Tratamento').length },
  ].filter(d => d.value > 0);

  const COLORS = ['#10b981', '#ef4444', '#f59e0b'];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">Dashboard</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-surface p-6 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-text-primary">Consultas Hoje</h3>
            <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-bold text-text-primary">{appointments.length}</p>
        </div>

        <div className="bg-surface p-6 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-text-primary">Receita Mensal</h3>
            <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-bold text-text-primary">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalIncome)}
          </p>
        </div>

        <div className="bg-surface p-6 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-text-primary">Saldo Mensal</h3>
            <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-bold text-text-primary">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(balance)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-surface rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
            <h3 className="text-lg font-medium text-text-primary">Próximas Consultas</h3>
            <button onClick={() => navigate('/agenda')} className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline">Ver todas</button>
          </div>
          <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {appointments.length === 0 ? (
              <div className="p-6 text-center text-text-secondary">Nenhuma consulta para hoje.</div>
            ) : (
              <AnimatePresence initial={false}>
                {appointments.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map(app => (
                  <motion.div 
                    key={app.id} 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="p-4 flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors overflow-hidden"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex flex-col items-center justify-center text-indigo-600 dark:text-indigo-400">
                        <span className="text-xs font-semibold">{new Date(app.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div>
                        <p className="font-medium text-text-primary">{app.patientName || 'Paciente não identificado'}</p>
                        <p className="text-sm text-text-secondary flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {app.duration || 30} min
                        </p>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      app.status === 'completed' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' :
                      app.status === 'cancelled' ? 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400' :
                      'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'
                    }`}>
                      {app.status === 'completed' ? 'Concluída' : app.status === 'cancelled' ? 'Cancelada' : 'Agendada'}
                    </span>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </div>

        <div className="bg-surface rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 p-6">
          <h3 className="text-lg font-medium text-text-primary mb-4">Ações Rápidas</h3>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => navigate('/patients')} className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors border border-zinc-200 dark:border-zinc-700">
              <Users className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              <span className="text-xs font-medium text-text-primary">Pacientes</span>
            </button>
            <button onClick={() => navigate('/agenda')} className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors border border-zinc-200 dark:border-zinc-700">
              <Calendar className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              <span className="text-xs font-medium text-text-primary">Agenda</span>
            </button>
            <button onClick={() => navigate('/financial')} className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors border border-zinc-200 dark:border-zinc-700">
              <DollarSign className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              <span className="text-xs font-medium text-text-primary">Financeiro</span>
            </button>
            <button onClick={() => navigate('/ai-assistant')} className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors border border-zinc-200 dark:border-zinc-700">
              <BrainCircuit className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              <span className="text-xs font-medium text-text-primary">IA</span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-surface rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 p-6">
          <h3 className="text-lg font-medium text-text-primary mb-4">Aniversariantes (Próximos 7 dias)</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {upcomingBirthdays.length === 0 ? (
              <p className="text-sm text-text-secondary">Nenhum aniversário nos próximos 7 dias.</p>
            ) : (
              upcomingBirthdays.map(patient => {
                const [year, month, day] = patient.dob!.split('-').map(Number);
                return (
                  <div key={patient.id} className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg flex items-center justify-between gap-2 border border-zinc-200 dark:border-zinc-700">
                    <p className="text-sm font-medium text-text-primary">{patient.name}</p>
                    <p className="text-sm text-text-secondary">{day}/{month}</p>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="bg-surface rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 p-6">
          <h3 className="text-lg font-medium text-text-primary mb-4">Notas Rápidas</h3>
          <form onSubmit={handleAddNote} className="mb-4">
            <textarea
              value={newNote}
              onChange={e => setNewNote(e.target.value)}
              placeholder="Escreva um lembrete..."
              className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2 text-text-primary focus:ring-2 focus:ring-indigo-500 resize-none h-24"
            />
            <button type="submit" className="mt-2 w-full flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-700 transition-colors">
              <Plus className="w-4 h-4" /> Adicionar Nota
            </button>
          </form>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            <AnimatePresence initial={false}>
              {quickNotes.map(note => (
                <motion.div 
                  key={note.id} 
                  initial={{ opacity: 0, height: 0, scale: 0.9 }}
                  animate={{ opacity: 1, height: 'auto', scale: 1 }}
                  exit={{ opacity: 0, height: 0, scale: 0.9 }}
                  transition={{ duration: 0.2 }}
                  className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg flex items-start justify-between gap-2 border border-zinc-200 dark:border-zinc-700"
                >
                  <p className="text-sm text-text-secondary">{note.content}</p>
                  <button onClick={() => handleDeleteNote(note)} className="text-zinc-400 hover:text-red-500">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-surface rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 p-6">
          <h3 className="text-lg font-medium text-text-primary mb-4">Composição de Pacientes</h3>
          <div className="h-64 outline-none focus:outline-none">
            <ResponsiveContainer width="100%" height="100%" className="outline-none focus:outline-none">
              <PieChart style={{ outline: 'none' }}>
                <Pie data={patientStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                  {patientStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={!!noteToDelete}
        title="Excluir Nota"
        message="Tem certeza que deseja apagar esta nota? Ela será movida para a lixeira."
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        onConfirm={confirmDeleteNote}
        onCancel={() => setNoteToDelete(null)}
        variant="danger"
      />
    </div>
  );
};
