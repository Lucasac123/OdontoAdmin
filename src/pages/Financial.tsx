import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, updateDoc, getDocs } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType, moveToTrash } from '../firebase';
import { Finance } from '../types';
import { Plus, Trash2, DollarSign, TrendingUp, TrendingDown, PieChart, Edit2, Check, X, BarChart as BarChartIcon, User, Camera, Loader2, FileText, AlertTriangle, Building, Search, Calendar, ChevronDown, Filter, Zap, Wallet, TrendingUp as Up, TrendingDown as Down } from 'lucide-react';
import { AddFinanceForm } from '../components/patient/AddFinanceForm';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Patient } from '../types';
import { ConfirmModal } from '../components/ConfirmModal';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI, Type } from '@google/genai';

interface SplitCategory {
  id: string;
  name: string;
  percentage: number;
}

export const Financial: React.FC = () => {
  const [finances, setFinances] = useState<Finance[]>([]);
  const [patients, setPatients] = useState<Record<string, { name: string, cpf?: string }>>({});
  const [isAdding, setIsAdding] = useState(false);
  const [newFinance, setNewFinance] = useState({
    description: '',
    amount: '',
    type: 'income' as 'income' | 'expense',
    date: new Date().toISOString().split('T')[0],
    patientId: '',
    paymentMethod: 'pix' as Finance['paymentMethod']
  });
  const [financeToDelete, setFinanceToDelete] = useState<Finance | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSavingFinance, setIsSavingFinance] = useState(false);

  // Dynamic percentage splits
  const [splits, setSplits] = useState<SplitCategory[]>([
    { id: '1', name: 'Dentista', percentage: 50 },
    { id: '2', name: 'Clínica', percentage: 30 },
    { id: '3', name: 'Laboratório', percentage: 20 }
  ]);
  const [isAddingSplit, setIsAddingSplit] = useState(false);
  const [newSplit, setNewSplit] = useState({ name: '', percentage: '' as number | '' });
  const [editingSplitId, setEditingSplitId] = useState<string | null>(null);
  const [editSplitData, setEditSplitData] = useState({ name: '', percentage: '' as number | '' });

  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().substring(0, 7));

  const [isScanning, setIsScanning] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [inventoryValue, setInventoryValue] = useState(0);
  const [inventoryAssetsValue, setInventoryAssetsValue] = useState(0);
  const [assetsValue, setAssetsValue] = useState(0);
  const [isEditingAssets, setIsEditingAssets] = useState(false);
  const [tempAssetsValue, setTempAssetsValue] = useState('');

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, 'finances'),
      where('dentistId', '==', auth.currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Finance));
      data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setFinances(data);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'finances'));

    const patientsQuery = query(collection(db, 'patients'), where('dentistId', '==', auth.currentUser.uid));
    const unsubscribePatients = onSnapshot(patientsQuery, (snapshot) => {
      const map: Record<string, { name: string, cpf?: string }> = {};
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        map[doc.id] = { name: data.name, cpf: data.cpf };
      });
      setPatients(map);
    });

    const invQuery = query(collection(db, 'inventory'), where('dentistId', '==', auth.currentUser.uid));
    const unsubscribeInv = onSnapshot(invQuery, (snapshot) => {
      let consumo = 0;
      let patrimonio = 0;
      snapshot.docs.forEach(doc => {
        const item = doc.data();
        if (item.quantity && item.price) {
          const cat = (item.category || '').normalize('NFC').trim();
          const isPatrimonio = cat === 'Patrimônio' || cat.toLowerCase().includes('patrim') || cat === 'Patrimonio';
          if (isPatrimonio) patrimonio += item.quantity * item.price;
          else consumo += item.quantity * item.price;
        }
      });
      setInventoryValue(consumo);
      setInventoryAssetsValue(patrimonio);
    });

    const settingsQuery = query(collection(db, 'clinicSettings'), where('dentistId', '==', auth.currentUser.uid));
    const unsubscribeSettings = onSnapshot(settingsQuery, (snapshot) => {
      if (!snapshot.empty) setAssetsValue(snapshot.docs[0].data().assetsValue || 0);
    });

    return () => {
      unsubscribe();
      unsubscribePatients();
      unsubscribeInv();
      unsubscribeSettings();
    };
  }, []);

  const handleSaveAssets = async () => {
    if (!auth.currentUser) return;
    const val = parseFloat(tempAssetsValue);
    if (isNaN(val)) return;
    try {
      const settingsQuery = query(collection(db, 'clinicSettings'), where('dentistId', '==', auth.currentUser.uid));
      const snapshot = await getDocs(settingsQuery);
      if (snapshot.empty) await addDoc(collection(db, 'clinicSettings'), { dentistId: auth.currentUser.uid, assetsValue: val });
      else await updateDoc(doc(db, 'clinicSettings', snapshot.docs[0].id), { assetsValue: val });
      setIsEditingAssets(false);
    } catch (e) { alert("Erro ao salvar patrimônio."); }
  };

  const handleAddFinance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || isSavingFinance) return;
    setIsSavingFinance(true);
    try {
      await addDoc(collection(db, 'finances'), {
        ...newFinance,
        amount: parseFloat(newFinance.amount),
        dentistId: auth.currentUser.uid,
        createdAt: new Date().toISOString()
      });
      setIsAdding(false);
      setNewFinance({ description: '', amount: '', type: 'income', date: new Date().toISOString().split('T')[0], patientId: '', paymentMethod: 'pix' });
    } catch (error) { handleFirestoreError(error, OperationType.CREATE, 'finances'); }
    finally { setIsSavingFinance(false); }
  };

  const handleDeleteFinance = async () => {
    if (!financeToDelete) return;
    setIsDeleting(true);
    try {
      await moveToTrash('finances', financeToDelete.id, financeToDelete);
      setFinanceToDelete(null);
    } catch (error) { handleFirestoreError(error, OperationType.DELETE, 'finances'); }
    finally { setIsDeleting(false); }
  };

  const filteredFinances = finances.filter(f => {
    const matchesFilter = filter === 'all' || f.type === filter;
    const matchesMonth = f.date.substring(0, 7) === selectedMonth;
    return matchesFilter && matchesMonth;
  });

  const totals = filteredFinances.reduce((acc, f) => {
    if (f.type === 'income') acc.income += f.amount;
    else acc.expense += f.amount;
    return acc;
  }, { income: 0, expense: 0 });

  const chartData = Array.from({ length: 31 }, (_, i) => {
    const day = (i + 1).toString().padStart(2, '0');
    const dayFinances = filteredFinances.filter(f => f.date.substring(8, 10) === day);
    return {
      name: day,
      income: dayFinances.filter(f => f.type === 'income').reduce((sum, f) => sum + f.amount, 0),
      expense: dayFinances.filter(f => f.type === 'expense').reduce((sum, f) => sum + f.amount, 0)
    };
  }).filter(d => d.income > 0 || d.expense > 0);

  return (
    <div className="space-y-8 flex flex-col h-full bg-zinc-50/30 dark:bg-zinc-950/20 p-2 md:p-4 rounded-[48px]">
      {/* Header Premium */}
      <div className="flex flex-col lg:flex-row justify-between items-end gap-8 mb-12 shrink-0 px-4">
        <div>
          <h1 className="text-6xl font-black text-text-primary tracking-tighter uppercase leading-none">Financeiro</h1>
          <p className="text-text-secondary mt-4 font-medium uppercase tracking-[0.3em] text-xs flex items-center gap-2">
            <Zap size={14} className="text-indigo-500 fill-indigo-500/20" /> GESTÃO DE FLUXO DE CAIXA E PATRIMÔNIO
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="flex-1 lg:flex-none bg-surface border border-zinc-200/50 dark:border-zinc-800 rounded-3xl px-6 py-4 text-xs font-black uppercase tracking-widest text-text-primary outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all shadow-sm"
          />
          <button
            onClick={() => setIsAdding(true)}
            className="flex-1 lg:flex-none bg-indigo-600 text-white px-8 py-4 rounded-3xl flex items-center justify-center gap-3 hover:bg-indigo-700 active:scale-95 transition-all shadow-xl shadow-indigo-500/20 font-black text-xs uppercase tracking-widest"
          >
            <Plus size={20} /> Lançamento
          </button>
        </div>
      </div>

      {/* Stats Grid Premium */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 shrink-0 px-2 lg:px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-surface p-8 rounded-[40px] border border-zinc-200/50 dark:border-zinc-800 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-bl-[80px] -mr-8 -mt-8" />
          <div className="flex items-center gap-3 mb-6 text-emerald-500">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center"><Up size={20} /></div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">Receitas</span>
          </div>
          <p className="text-3xl font-black text-text-primary tracking-tighter">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totals.income)}</p>
          <div className="mt-4 flex items-center gap-1.5 animate-pulse text-emerald-600 dark:text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-current" />
            <span className="text-[9px] font-black uppercase tracking-widest">Fluxo Ativo</span>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-surface p-8 rounded-[40px] border border-zinc-200/50 dark:border-zinc-800 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-bl-[80px] -mr-8 -mt-8" />
          <div className="flex items-center gap-3 mb-6 text-red-500">
            <div className="w-10 h-10 rounded-2xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center"><Down size={20} /></div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">Despesas</span>
          </div>
          <p className="text-3xl font-black text-text-primary tracking-tighter">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totals.expense)}</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-surface p-8 rounded-[40px] border border-zinc-200/50 dark:border-zinc-800 shadow-sm relative overflow-hidden group border-b-4 border-b-indigo-500/20">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-bl-[80px] -mr-8 -mt-8" />
          <div className="flex items-center gap-3 mb-6 text-indigo-500">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center"><Wallet size={20} /></div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">Saldo</span>
          </div>
          <p className={`text-3xl font-black tracking-tighter ${totals.income - totals.expense >= 0 ? 'text-text-primary' : 'text-red-500'}`}>
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totals.income - totals.expense)}
          </p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-indigo-600 p-8 rounded-[40px] shadow-2xl shadow-indigo-500/20 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-bl-[100px] -mr-10 -mt-10" />
          <div className="flex items-center gap-3 mb-6 text-white/60">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center"><Building size={20} className="text-white" /></div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Valuation Clínica</span>
          </div>
          <p className="text-3xl font-black text-white tracking-tighter">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(assetsValue + inventoryValue + inventoryAssetsValue)}
          </p>
          <button onClick={() => { setTempAssetsValue(assetsValue.toString()); setIsEditingAssets(true); }} className="mt-4 text-[9px] font-black text-white/40 uppercase tracking-widest hover:text-white transition-colors flex items-center gap-2">
            <Edit2 size={10} /> AJUSTAR PATRIMÔNIO IMOBILIÁRIO
          </button>
        </motion.div>
      </div>

      {/* Main Charts & Table Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1 min-h-0 px-2 lg:px-4 pb-12">
        {/* Activity List */}
        <div className="lg:col-span-8 flex flex-col space-y-6 min-h-0 overflow-hidden">
          <div className="bg-surface rounded-[40px] border border-zinc-200/50 dark:border-zinc-800 shadow-sm flex flex-col flex-1 min-h-[400px]">
            <div className="p-8 border-b border-zinc-100 dark:border-zinc-900 flex justify-between items-center shrink-0">
               <h3 className="text-xl font-black text-text-primary tracking-tight uppercase flex items-center gap-3">
                 <History className="text-indigo-500" size={20} /> Extrato Detalhado
               </h3>
               <div className="flex gap-2 p-1.5 bg-zinc-50 dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                  {['all', 'income', 'expense'].map((t) => (
                    <button
                      key={t}
                      onClick={() => setFilter(t as any)}
                      className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filter === t ? 'bg-white dark:bg-surface text-indigo-600 shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}
                    >
                      {t === 'all' ? 'Ver Tudo' : t === 'income' ? 'Entradas' : 'Saídas'}
                    </button>
                  ))}
               </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 md:p-8 scrollbar-thin scrollbar-thumb-indigo-500/10">
               <div className="space-y-4">
                  {filteredFinances.map((finance, idx) => (
                    <motion.div key={finance.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.02 }} className="group flex items-center justify-between p-6 rounded-3xl bg-zinc-50/50 dark:bg-zinc-900/40 border border-transparent hover:border-indigo-500/10 hover:bg-white dark:hover:bg-zinc-900 transition-all">
                       <div className="flex items-center gap-5 min-w-0">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-inner ${finance.type === 'income' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600' : 'bg-red-50 dark:bg-red-500/10 text-red-600'}`}>
                             {finance.type === 'income' ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                          </div>
                          <div className="min-w-0">
                             <p className="text-sm font-black text-text-primary uppercase truncate tracking-tight">{finance.description}</p>
                             <div className="flex items-center gap-3 mt-1.5">
                                <span className="text-[10px] font-black text-text-secondary uppercase tracking-widest">{new Date(finance.date).toLocaleDateString('pt-BR')}</span>
                                <span className="w-1 h-1 rounded-full bg-zinc-300" />
                                <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">{finance.paymentMethod || 'PIX'}</span>
                                {finance.patientId && (
                                  <>
                                    <span className="w-1 h-1 rounded-full bg-zinc-300" />
                                    <span className="text-[10px] font-black text-text-secondary truncate max-w-[150px] uppercase">{patients[finance.patientId]?.name}</span>
                                  </>
                                )}
                             </div>
                          </div>
                       </div>
                       <div className="text-right flex items-center gap-6">
                          <p className={`text-lg font-black tracking-tight ${finance.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                             {finance.type === 'income' ? '+' : '-'} {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(finance.amount)}
                          </p>
                          <button onClick={() => setFinanceToDelete(finance)} className="p-2.5 text-zinc-300 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"><Trash2 size={18} /></button>
                       </div>
                    </motion.div>
                  ))}
                  {filteredFinances.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 opacity-30">
                       <FileText size={48} className="mb-4" />
                       <p className="text-xs font-black uppercase tracking-widest text-center">Nenhum lançamento no período selecionado.</p>
                    </div>
                  )}
               </div>
            </div>
          </div>
        </div>

        {/* Sidebar Charts & Splitting */}
        <div className="lg:col-span-4 flex flex-col space-y-8 min-h-0">
           {/* Chart Card */}
           <div className="bg-surface rounded-[40px] border border-zinc-200/50 dark:border-zinc-800 shadow-sm p-8 flex flex-col h-[350px]">
              <h4 className="text-[10px] font-black text-text-secondary uppercase tracking-[0.2em] mb-8 px-2 flex items-center gap-2">
                 <BarChartIcon size={14} className="text-indigo-500" /> Desempenho Diário
              </h4>
              <div className="flex-1 w-full min-h-0">
                 <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                       <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                       <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 900 }} />
                       <YAxis hide />
                       <Tooltip cursor={{ fill: 'rgba(79, 70, 229, 0.05)' }} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                       <Bar dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} />
                       <Bar dataKey="expense" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    </BarChart>
                 </ResponsiveContainer>
              </div>
           </div>

           {/* Percentage Splitting Premium */}
           <div className="bg-surface rounded-[40px] border border-zinc-200/50 dark:border-zinc-800 shadow-sm p-8 flex-1 min-h-0 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-bl-[80px] -mr-8 -mt-8" />
              <div className="flex justify-between items-center mb-8 px-2">
                 <h4 className="text-[10px] font-black text-text-secondary uppercase tracking-[0.2em] flex items-center gap-2">
                    <PieChart size={14} className="text-indigo-500" /> Comissionamento
                 </h4>
                 <button onClick={() => setIsAddingSplit(true)} className="p-2 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-all"><Plus size={16} /></button>
              </div>

              <div className="space-y-4">
                 {splits.map(s => (
                   <div key={s.id} className="group p-5 rounded-3xl bg-zinc-50/50 dark:bg-zinc-900/40 border border-transparent hover:border-indigo-500/10 transition-all">
                      <div className="flex justify-between items-center mb-3">
                         <span className="text-[11px] font-black text-text-primary uppercase tracking-tight">{s.name}</span>
                         <div className="flex items-center gap-2">
                            <span className="text-sm font-black text-indigo-600">{s.percentage}%</span>
                            <div className="flex opacity-0 group-hover:opacity-100 transition-all scale-90">
                               <button onClick={() => { setEditingSplitId(s.id); setEditSplitData({ name: s.name, percentage: s.percentage }); }} className="p-1.5 text-zinc-400 hover:text-indigo-600"><Edit2 size={12} /></button>
                               <button onClick={() => setSplits(prev => prev.filter(x => x.id !== s.id))} className="p-1.5 text-zinc-400 hover:text-red-500"><X size={12} /></button>
                            </div>
                         </div>
                      </div>
                      <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                         <motion.div initial={{ width: 0 }} animate={{ width: `${s.percentage}%` }} transition={{ duration: 1, ease: 'easeOut' }} className="h-full bg-indigo-500 rounded-full shadow-lg shadow-indigo-500/20" />
                      </div>
                      <p className="mt-3 text-[10px] font-bold text-text-secondary uppercase tracking-widest text-right">
                         Saldo: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((totals.income - totals.expense) * (s.percentage / 100))}
                      </p>
                   </div>
                 ))}
                 
                 <AnimatePresence>
                   {isAddingSplit && (
                     <motion.form initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} onSubmit={(e) => { e.preventDefault(); if (newSplit.name && newSplit.percentage) { setSplits([...splits, { id: Math.random().toString(), name: newSplit.name, percentage: Number(newSplit.percentage) }]); setIsAddingSplit(false); setNewSplit({ name: '', percentage: '' }); } }} className="p-6 rounded-3xl bg-indigo-50/50 dark:bg-indigo-500/5 border border-indigo-100 dark:border-indigo-500/20 space-y-4">
                        <input type="text" value={newSplit.name} onChange={e => setNewSplit({ ...newSplit, name: e.target.value })} placeholder="NOME DO RECEPTOR..." className="w-full bg-white dark:bg-surface border-none rounded-xl px-4 py-3 text-[10px] font-black uppercase tracking-widest outline-none shadow-sm" required />
                        <div className="flex gap-3">
                           <input type="number" value={newSplit.percentage} onChange={e => setNewSplit({ ...newSplit, percentage: e.target.value === '' ? '' : Number(e.target.value) })} placeholder="%" className="w-20 bg-white dark:bg-surface border-none rounded-xl px-4 py-3 text-[10px] font-black outline-none shadow-sm" required />
                           <button type="submit" className="flex-1 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all">OK</button>
                           <button type="button" onClick={() => setIsAddingSplit(false)} className="p-3 text-text-secondary hover:text-red-500"><X size={16} /></button>
                        </div>
                     </motion.form>
                   )}
                 </AnimatePresence>
              </div>
           </div>
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="bg-surface rounded-[40px] shadow-2xl border border-zinc-200/50 dark:border-zinc-800 w-full max-w-lg overflow-hidden relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-bl-full -mr-12 -mt-12" />
              <div className="p-8 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                <h2 className="text-2xl font-black text-text-primary tracking-tight uppercase">Novo Lançamento</h2>
                <button onClick={() => setIsAdding(false)} className="p-3 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-2xl text-text-secondary border border-zinc-200/50 transition-all"><X size={20} /></button>
              </div>
              <form onSubmit={handleAddFinance} className="p-8 space-y-6">
                <div className="flex gap-4 p-1.5 bg-zinc-50 dark:bg-zinc-950 rounded-[28px] border border-zinc-200/50">
                  <button type="button" onClick={() => setNewFinance({ ...newFinance, type: 'income' })} className={`flex-1 py-4 rounded-3xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 ${newFinance.type === 'income' ? 'bg-emerald-500 text-white shadow-xl shadow-emerald-500/20' : 'text-text-secondary hover:text-emerald-500'}`}><TrendingUp size={14} /> Receita</button>
                  <button type="button" onClick={() => setNewFinance({ ...newFinance, type: 'expense' })} className={`flex-1 py-4 rounded-3xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 ${newFinance.type === 'expense' ? 'bg-red-500 text-white shadow-xl shadow-red-500/20' : 'text-text-secondary hover:text-red-500'}`}><TrendingDown size={14} /> Despesa</button>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Descrição</label>
                  <input type="text" required value={newFinance.description} onChange={e => setNewFinance({ ...newFinance, description: e.target.value })} placeholder="Ex: Pagamento Tratamento Canal" className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-[28px] px-8 py-4 text-sm font-black uppercase tracking-widest focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all" />
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Valor (R$)</label>
                    <input type="number" step="0.01" required value={newFinance.amount} onChange={e => setNewFinance({ ...newFinance, amount: e.target.value })} placeholder="0,00" className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-[28px] px-8 py-4 text-sm font-black focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Data</label>
                    <input type="date" required value={newFinance.date} onChange={e => setNewFinance({ ...newFinance, date: e.target.value })} className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-[28px] px-8 py-4 text-sm font-black outline-none transition-all" />
                  </div>
                </div>
                <div className="flex gap-4 pt-8">
                   <button type="submit" disabled={isSavingFinance} className="flex-[2] py-5 bg-indigo-600 text-white rounded-[28px] text-[10px] font-black uppercase tracking-[0.2em] hover:bg-indigo-700 shadow-2xl shadow-indigo-500/20 disabled:opacity-50 transition-all">{isSavingFinance ? 'PROCESSANDO...' : 'CONFIRMAR LANÇAMENTO'}</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {isEditingAssets && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-surface rounded-[40px] p-10 w-full max-w-md shadow-2xl border border-zinc-200/50 dark:border-zinc-800">
               <h3 className="text-2xl font-black text-text-primary tracking-tight uppercase mb-8">Valor Imobiliário</h3>
               <p className="text-xs text-text-secondary uppercase font-medium tracking-widest mb-8 leading-relaxed">Insira o valor estimado do imóvel da clínica para o cálculo do Valuation total.</p>
               <input type="number" value={tempAssetsValue} onChange={e => setTempAssetsValue(e.target.value)} className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl px-8 py-5 text-lg font-black outline-none mb-8" placeholder="R$ 0,00" />
               <div className="flex gap-4">
                  <button onClick={() => setIsEditingAssets(false)} className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest text-text-secondary hover:bg-zinc-100 rounded-2xl transition-all">Cancelar</button>
                  <button onClick={handleSaveAssets} className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-500/20">Salvar Valor</button>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmModal isOpen={!!financeToDelete} onCancel={() => setFinanceToDelete(null)} onConfirm={handleDeleteFinance} isLoading={isDeleting} title="Excluir Lançamento" message="Tem certeza que deseja excluir este registro financeiro? Ele será movido para a lixeira." variant="danger" />
    </div>
  );
};

export default Financial;
