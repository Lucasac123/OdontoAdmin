import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType, moveToTrash } from '../firebase';
import { Appointment, Finance, Patient, QuickNote, CRMDeal } from '../types';
import { Users, Calendar, DollarSign, TrendingUp, Clock, BrainCircuit, Trash2, Plus, Briefcase, CheckCircle, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { ConfirmModal } from '../components/ConfirmModal';
import { QuickAccessSettingsModal } from '../components/QuickAccessSettingsModal';
import { motion, AnimatePresence } from 'motion/react';
import { Settings, Package, Microscope, Calculator, Megaphone } from 'lucide-react';

const AVAILABLE_LINKS = [
  { id: 'patients', label: 'Pacientes', icon: Users, path: '/patients', color: 'indigo' },
  { id: 'agenda', label: 'Agenda', icon: Calendar, path: '/agenda', color: 'emerald' },
  { id: 'financial', label: 'Financeiro', icon: DollarSign, path: '/financial', color: 'blue' },
  { id: 'ai', label: 'IA Assistente', icon: BrainCircuit, path: '/ai-assistant', color: 'purple' },
  { id: 'dentists', label: 'Dentistas', icon: Briefcase, path: '/dentists', color: 'orange' },
  { id: 'pricing', label: 'Precificação', icon: Calculator, path: '/pricing', color: 'pink' },
  { id: 'marketing', label: 'Marketing', icon: Megaphone, path: '/marketing', color: 'red' },
  { id: 'inventory', label: 'Estoque', icon: Package, path: '/inventory', color: 'amber' },
  { id: 'laboratory', label: 'Laboratório', icon: Microscope, path: '/laboratory', color: 'cyan' },
];

export const Dashboard: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [finances, setFinances] = useState<Finance[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [quickNotes, setQuickNotes] = useState<QuickNote[]>([]);
  const [deals, setDeals] = useState<CRMDeal[]>([]);
  const [newNote, setNewNote] = useState('');
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<QuickNote | null>(null);
  const [isDeletingNote, setIsDeletingNote] = useState(false);
  const [isQuickAccessModalOpen, setIsQuickAccessModalOpen] = useState(false);
  const [selectedQuickAccess, setSelectedQuickAccess] = useState<string[]>(() => {
    const saved = localStorage.getItem('quickAccessLinks');
    return saved ? JSON.parse(saved) : ['patients', 'agenda', 'financial', 'ai'];
  });
  const navigate = useNavigate();

  const handleSaveQuickAccess = (links: string[]) => {
    setSelectedQuickAccess(links);
    localStorage.setItem('quickAccessLinks', JSON.stringify(links));
    setIsQuickAccessModalOpen(false);
  };

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

    const qDeals = query(
      collection(db, 'crm_deals'),
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

    const unsubDeals = onSnapshot(qDeals, (snapshot) => {
      setDeals(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CRMDeal)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'crm_deals'));

    return () => {
      unsubAppointments();
      unsubFinances();
      unsubPatients();
      unsubQuickNotes();
      unsubDeals();
    };
  }, []);

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || !newNote.trim() || isAddingNote) return;
    setIsAddingNote(true);
    try {
      await addDoc(collection(db, 'quickNotes'), {
        dentistId: auth.currentUser.uid,
        content: newNote,
        createdAt: new Date().toISOString()
      });
      setNewNote('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'quickNotes');
    } finally {
      setIsAddingNote(false);
    }
  };

  const handleDeleteNote = async (note: QuickNote) => {
    setNoteToDelete(note);
  };

  const confirmDeleteNote = async () => {
    if (!noteToDelete || isDeletingNote) return;
    setIsDeletingNote(true);
    try {
      await moveToTrash('quickNotes', noteToDelete.id, noteToDelete);
      setNoteToDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `quickNotes/${noteToDelete.id}`);
    } finally {
      setIsDeletingNote(false);
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

  const preventiveReturns = patients.filter(p => {
    if (!p.updatedAt && !p.createdAt) return false;
    const lastVisit = new Date(p.updatedAt || p.createdAt);
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    return lastVisit < sixMonthsAgo && p.status === 'Ativo';
  }).sort((a, b) => {
    const dateA = new Date(a.updatedAt || a.createdAt).getTime();
    const dateB = new Date(b.updatedAt || b.createdAt).getTime();
    return dateA - dateB;
  }).slice(0, 5); // Show top 5 oldest

  const patientStatusData = [
    { name: 'Ativo', value: patients.filter(p => p.status === 'Ativo').length },
    { name: 'Inativo', value: patients.filter(p => p.status === 'Inativo').length },
    { name: 'Em Tratamento', value: patients.filter(p => p.status === 'Em Tratamento').length },
  ].filter(d => d.value > 0);

  const COLORS = ['#10b981', '#ef4444', '#f59e0b'];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-4xl font-bold text-text-primary tracking-tight">Dashboard</h1>
          <p className="text-text-secondary mt-1 font-medium">Bem-vindo de volta! Aqui está o resumo da sua clínica.</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-surface border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm">
          <Calendar className="w-4 h-4 text-indigo-500" />
          <span className="text-sm font-semibold text-text-primary uppercase tracking-wide">
            {new Date().toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div 
          whileHover={{ y: -4 }}
          className="bg-surface p-6 rounded-3xl shadow-sm border border-zinc-200 dark:border-zinc-800 relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-bl-full -mr-8 -mt-8 transition-all group-hover:bg-indigo-500/10" />
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Calendar className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-1 rounded-lg uppercase tracking-wider">Hoje</span>
          </div>
          <p className="text-sm font-medium text-text-secondary">Consultas</p>
          <p className="text-3xl font-bold text-text-primary mt-1">{appointments.length}</p>
        </motion.div>

        <motion.div 
          whileHover={{ y: -4 }}
          className="bg-surface p-6 rounded-3xl shadow-sm border border-zinc-200 dark:border-zinc-800 relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-bl-full -mr-8 -mt-8 transition-all group-hover:bg-emerald-500/10" />
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 rounded-lg uppercase tracking-wider">Mês</span>
          </div>
          <p className="text-sm font-medium text-text-secondary">Receita</p>
          <p className="text-3xl font-bold text-text-primary mt-1">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(totalIncome)}
          </p>
        </motion.div>

        <motion.div 
          whileHover={{ y: -4 }}
          className="bg-surface p-6 rounded-3xl shadow-sm border border-zinc-200 dark:border-zinc-800 relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-bl-full -mr-8 -mt-8 transition-all group-hover:bg-blue-500/10" />
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <DollarSign className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-2 py-1 rounded-lg uppercase tracking-wider">Saldo</span>
          </div>
          <p className="text-sm font-medium text-text-secondary">Resultado</p>
          <p className="text-3xl font-bold text-text-primary mt-1">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(balance)}
          </p>
        </motion.div>

        <motion.div 
          whileHover={{ y: -4 }}
          className="bg-surface p-6 rounded-3xl shadow-sm border border-zinc-200 dark:border-zinc-800 relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-bl-full -mr-8 -mt-8 transition-all group-hover:bg-purple-500/10" />
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center text-purple-600 dark:text-purple-400">
              <Users className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-500/10 px-2 py-1 rounded-lg uppercase tracking-wider">Total</span>
          </div>
          <p className="text-sm font-medium text-text-secondary">Pacientes</p>
          <p className="text-3xl font-bold text-text-primary mt-1">{patients.length}</p>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-surface rounded-3xl shadow-sm border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-800/20">
            <div>
              <h2 className="text-lg font-bold text-text-primary">Próximas Consultas</h2>
              <p className="text-xs text-text-secondary">Sua agenda para o dia de hoje</p>
            </div>
            <button 
              onClick={() => navigate('/agenda')} 
              className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 px-3 py-1.5 rounded-xl transition-colors uppercase tracking-wider"
            >
              Ver Agenda Completa
            </button>
          </div>
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {appointments.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-16 h-16 bg-zinc-50 dark:bg-zinc-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Calendar className="w-8 h-8 text-zinc-300" />
                </div>
                <p className="text-text-secondary font-medium">Nenhuma consulta agendada para hoje.</p>
              </div>
            ) : (
              <AnimatePresence initial={false}>
                {appointments.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map(app => (
                  <motion.div 
                    key={app.id} 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="p-5 flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-all group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 flex flex-col items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:scale-105 transition-transform">
                        <span className="text-sm font-bold">{new Date(app.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div>
                        <p className="font-bold text-text-primary group-hover:text-indigo-600 transition-colors">{app.patientName || 'Paciente não identificado'}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <p className="text-xs text-text-secondary flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {app.duration || 30} min
                          </p>
                          <span className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                          <p className="text-xs text-text-secondary">Procedimento Clínico</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                        app.status === 'completed' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' :
                        app.status === 'cancelled' ? 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400' :
                        'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'
                      }`}>
                        {app.status === 'completed' ? 'Concluída' : app.status === 'cancelled' ? 'Cancelada' : 'Agendada'}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-surface rounded-3xl shadow-sm border border-zinc-200 dark:border-zinc-800 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-text-primary">Acesso Rápido</h2>
              <button 
                onClick={() => setIsQuickAccessModalOpen(true)}
                className="p-2 text-text-secondary hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"
                title="Personalizar Acesso Rápido"
                aria-label="Personalizar Acesso Rápido"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {selectedQuickAccess.map(linkId => {
                const link = AVAILABLE_LINKS.find(l => l.id === linkId);
                if (!link) return null;
                const Icon = link.icon;
                return (
                  <button key={link.id} onClick={() => navigate(link.path)} className={`flex flex-col items-center justify-center gap-3 p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 hover:bg-${link.color}-50 dark:hover:bg-${link.color}-500/10 hover:border-${link.color}-200 dark:hover:border-${link.color}-500/30 transition-all border border-zinc-200 dark:border-zinc-700 group`}>
                    <div className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-900 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                      <Icon className={`w-5 h-5 text-${link.color}-600 dark:text-${link.color}-400`} />
                    </div>
                    <span className="text-xs font-bold text-text-primary">{link.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-surface rounded-3xl shadow-sm border border-zinc-200 dark:border-zinc-800 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-text-primary">Aniversariantes</h2>
              <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg uppercase tracking-wider">7 Dias</span>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {upcomingBirthdays.length === 0 ? (
                <p className="text-xs text-text-secondary text-center py-4 italic">Nenhum aniversário próximo.</p>
              ) : (
                upcomingBirthdays.map(patient => {
                  const [year, month, day] = patient.dob!.split('-').map(Number);
                  return (
                    <div key={patient.id} className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl flex items-center justify-between gap-2 border border-zinc-100 dark:border-zinc-700 hover:border-indigo-300 transition-colors cursor-pointer" onClick={() => navigate(`/patients/${patient.id}`)}>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 text-xs font-bold">
                          {patient.name.charAt(0)}
                        </div>
                        <p className="text-xs font-bold text-text-primary line-clamp-1">{patient.name}</p>
                      </div>
                      <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400">{day}/{month}</p>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-3 bg-surface rounded-3xl shadow-sm border border-zinc-200 dark:border-zinc-800 p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
                <Briefcase className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                Controle de Orçamentos
              </h2>
              <p className="text-sm text-text-secondary mt-1">Acompanhe o funil de vendas e negociações</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Em Negociação */}
            <div className="bg-zinc-50/50 dark:bg-zinc-800/20 rounded-3xl p-6 border border-zinc-100 dark:border-zinc-800">
               <div className="flex items-center justify-between mb-4">
                 <h3 className="font-bold text-yellow-800 dark:text-yellow-500 flex items-center gap-2 uppercase text-[10px] tracking-widest">
                   <Clock className="w-4 h-4"/> Em Negociação
                 </h3>
                 <span className="bg-yellow-100 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-500 px-2 py-0.5 rounded-lg text-[10px] font-bold">
                   {deals.filter(d => d.status === 'negotiation').length}
                 </span>
               </div>
               <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1 hide-scrollbar">
                 {deals.filter(d => d.status === 'negotiation').sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()).map(deal => (
                    <motion.div 
                      whileHover={{ scale: 1.02 }}
                      key={deal.id} 
                      onClick={() => navigate(`/patients/${deal.patientId}`)} 
                      className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm cursor-pointer hover:border-indigo-500/50 transition-all group"
                    >
                      <p className="font-bold text-sm text-text-primary group-hover:text-indigo-600 transition-colors">{deal.patientName}</p>
                      <p className="text-xs text-text-secondary mt-1 line-clamp-1">{deal.title}</p>
                      <div className="flex justify-between items-center mt-3 pt-3 border-t border-zinc-50 dark:border-zinc-800">
                        <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(deal.value)}
                        </span>
                        <span className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400">{new Date(deal.updatedAt || deal.createdAt).toLocaleDateString('pt-BR')}</span>
                      </div>
                    </motion.div>
                 ))}
                 {deals.filter(d => d.status === 'negotiation').length === 0 && (
                   <div className="text-center py-8">
                     <p className="text-xs text-text-secondary italic">Nenhum orçamento.</p>
                   </div>
                 )}
               </div>
            </div>
            {/* Aprovados */}
            <div className="bg-zinc-50/50 dark:bg-zinc-800/20 rounded-3xl p-6 border border-zinc-100 dark:border-zinc-800">
               <div className="flex items-center justify-between mb-4">
                 <h3 className="font-bold text-emerald-800 dark:text-emerald-500 flex items-center gap-2 uppercase text-[10px] tracking-widest">
                   <CheckCircle className="w-4 h-4"/> Aprovados
                 </h3>
                 <span className="bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-500 px-2 py-0.5 rounded-lg text-[10px] font-bold">
                   {deals.filter(d => d.status === 'approved').length}
                 </span>
               </div>
               <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1 hide-scrollbar">
                 {deals.filter(d => d.status === 'approved').sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()).map(deal => (
                    <motion.div 
                      whileHover={{ scale: 1.02 }}
                      key={deal.id} 
                      onClick={() => navigate(`/patients/${deal.patientId}`)} 
                      className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm cursor-pointer hover:border-indigo-500/50 transition-all group"
                    >
                      <p className="font-bold text-sm text-text-primary group-hover:text-indigo-600 transition-colors">{deal.patientName}</p>
                      <p className="text-xs text-text-secondary mt-1 line-clamp-1">{deal.title}</p>
                      <div className="flex justify-between items-center mt-3 pt-3 border-t border-zinc-50 dark:border-zinc-800">
                        <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(deal.value)}
                        </span>
                        <span className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400">{new Date(deal.updatedAt || deal.createdAt).toLocaleDateString('pt-BR')}</span>
                      </div>
                    </motion.div>
                 ))}
                 {deals.filter(d => d.status === 'approved').length === 0 && (
                   <div className="text-center py-8">
                     <p className="text-xs text-text-secondary italic">Nenhum orçamento.</p>
                   </div>
                 )}
               </div>
            </div>
            {/* Recusados */}
            <div className="bg-zinc-50/50 dark:bg-zinc-800/20 rounded-3xl p-6 border border-zinc-100 dark:border-zinc-800">
               <div className="flex items-center justify-between mb-4">
                 <h3 className="font-bold text-red-800 dark:text-red-500 flex items-center gap-2 uppercase text-[10px] tracking-widest">
                   <XCircle className="w-4 h-4"/> Recusados
                 </h3>
                 <span className="bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-500 px-2 py-0.5 rounded-lg text-[10px] font-bold">
                   {deals.filter(d => d.status === 'rejected').length}
                 </span>
               </div>
               <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1 hide-scrollbar">
                 {deals.filter(d => d.status === 'rejected').sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()).map(deal => (
                    <motion.div 
                      whileHover={{ scale: 1.02 }}
                      key={deal.id} 
                      onClick={() => navigate(`/patients/${deal.patientId}`)} 
                      className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm cursor-pointer hover:border-indigo-500/50 transition-all group"
                    >
                      <p className="font-bold text-sm text-text-primary group-hover:text-indigo-600 transition-colors">{deal.patientName}</p>
                      <p className="text-xs text-text-secondary mt-1 line-clamp-1">{deal.title}</p>
                      <div className="flex justify-between items-center mt-3 pt-3 border-t border-zinc-50 dark:border-zinc-800">
                        <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(deal.value)}
                        </span>
                        <span className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400">{new Date(deal.updatedAt || deal.createdAt).toLocaleDateString('pt-BR')}</span>
                      </div>
                    </motion.div>
                 ))}
                 {deals.filter(d => d.status === 'rejected').length === 0 && (
                   <div className="text-center py-8">
                     <p className="text-xs text-text-secondary italic">Nenhum orçamento.</p>
                   </div>
                 )}
               </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-surface rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 p-6">
          <h2 className="text-lg font-bold text-text-primary mb-4">Aniversariantes (Próximos 7 dias)</h2>
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

        <div className="bg-surface rounded-3xl shadow-sm border border-zinc-200 dark:border-zinc-800 p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-text-primary">Notas Rápidas</h2>
              <p className="text-xs text-text-secondary mt-1">Lembretes e anotações importantes</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center">
              <Plus className="w-5 h-5 text-indigo-600" />
            </div>
          </div>
          <form onSubmit={handleAddNote} className="mb-6">
            <textarea
              disabled={isAddingNote}
              value={newNote}
              onChange={e => setNewNote(e.target.value)}
              placeholder="Escreva um lembrete..."
              className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-4 py-3 text-sm text-text-primary focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none h-24 shadow-inner disabled:opacity-50"
            />
            <button 
              type="submit" 
              disabled={isAddingNote}
              className="mt-3 w-full flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-2xl hover:bg-indigo-700 active:scale-[0.98] transition-all font-medium shadow-lg shadow-indigo-500/20 disabled:opacity-50"
            >
              {isAddingNote ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Adicionando...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" /> Adicionar Nota
                </>
              )}
            </button>
          </form>
          <div className="space-y-3 max-h-64 overflow-y-auto pr-1 hide-scrollbar">
            <AnimatePresence initial={false}>
              {quickNotes.map(note => (
                <motion.div 
                  key={note.id} 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl flex items-start justify-between gap-3 border border-zinc-100 dark:border-zinc-700 group"
                >
                  <p className="text-sm text-text-secondary leading-relaxed">{note.content}</p>
                  <button 
                    onClick={() => handleDeleteNote(note)} 
                    className="text-zinc-400 hover:text-red-500 p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                    aria-label="Excluir nota"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
            {quickNotes.length === 0 && (
              <p className="text-xs text-text-secondary text-center py-8 italic">Nenhuma nota cadastrada.</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-surface rounded-3xl shadow-sm border border-zinc-200 dark:border-zinc-800 p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-lg font-bold text-text-primary">Distribuição de Pacientes</h2>
              <p className="text-xs text-text-secondary mt-1">Visão geral do status da sua base</p>
            </div>
          </div>
          <div className="h-64 w-full min-h-[256px] min-w-[256px]">
            {patientStatusData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <PieChart role="img" aria-label="Gráfico de distribuição de pacientes por status">
                  <Pie 
                    data={patientStatusData} 
                    dataKey="value" 
                    nameKey="name" 
                    cx="50%" 
                    cy="50%" 
                    innerRadius={60}
                    outerRadius={80} 
                    paddingAngle={5}
                    stroke="none"
                  >
                    {patientStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      borderRadius: '16px', 
                      border: 'none', 
                      boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' 
                    }} 
                  />
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-sm text-text-secondary">
                Nenhum dado disponível
              </div>
            )}
          </div>
        </div>

        <div className="bg-surface rounded-3xl shadow-sm border border-zinc-200 dark:border-zinc-800 p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-lg font-bold text-text-primary">Retornos Preventivos</h2>
              <p className="text-xs text-text-secondary mt-1">Pacientes sem visita há mais de 6 meses</p>
            </div>
            <span className="bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs font-bold px-3 py-1.5 rounded-xl uppercase tracking-wider">
              {preventiveReturns.length} Pendentes
            </span>
          </div>
          <div className="space-y-3 max-h-64 overflow-y-auto pr-1 hide-scrollbar">
            {preventiveReturns.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle className="w-12 h-12 text-emerald-500/20 mx-auto mb-3" />
                <p className="text-sm text-text-secondary font-medium">Tudo em dia! Nenhum retorno pendente.</p>
              </div>
            ) : (
              preventiveReturns.map(patient => {
                const lastVisit = new Date(patient.updatedAt || patient.createdAt);
                const monthsSince = Math.floor((new Date().getTime() - lastVisit.getTime()) / (1000 * 60 * 60 * 24 * 30));
                
                return (
                  <motion.div 
                    whileHover={{ x: 4 }}
                    key={patient.id} 
                    className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl flex items-center justify-between gap-3 border border-zinc-100 dark:border-zinc-700 hover:border-indigo-500/50 transition-all cursor-pointer group" 
                    onClick={() => navigate(`/patients/${patient.id}`)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-900 flex items-center justify-center text-zinc-400 group-hover:text-indigo-500 transition-colors shadow-sm">
                        <Users className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-text-primary group-hover:text-indigo-600 transition-colors">{patient.name}</p>
                        <p className="text-[10px] text-text-secondary flex items-center gap-1 mt-0.5 uppercase font-semibold tracking-wider">
                          <Calendar className="w-3 h-3" /> Última visita: {lastVisit.toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-2 py-1 rounded-lg uppercase tracking-wider">
                        {monthsSince} Meses
                      </span>
                    </div>
                  </motion.div>
                );
              })
            )}
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
        isLoading={isDeletingNote}
      />

      <QuickAccessSettingsModal
        isOpen={isQuickAccessModalOpen}
        onClose={() => setIsQuickAccessModalOpen(false)}
        availableLinks={AVAILABLE_LINKS}
        selectedLinks={selectedQuickAccess}
        onSave={handleSaveQuickAccess}
      />
    </div>
  );
};

export default Dashboard;
