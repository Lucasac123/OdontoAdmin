import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType, moveToTrash } from '../firebase';
import { Finance } from '../types';
import { Plus, Trash2, DollarSign, TrendingUp, TrendingDown, PieChart, Edit2, Check, X, BarChart as BarChartIcon, User } from 'lucide-react';
import { AddFinanceForm } from '../components/patient/AddFinanceForm';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Patient } from '../types';
import { ConfirmModal } from '../components/ConfirmModal';
import { motion } from 'motion/react';

interface SplitCategory {
  id: string;
  name: string;
  percentage: number;
}

export const Financial: React.FC = () => {
  const [finances, setFinances] = useState<Finance[]>([]);
  const [patients, setPatients] = useState<Record<string, string>>({});
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

  // Dynamic percentage splits
  const [splits, setSplits] = useState<SplitCategory[]>([
    { id: '1', name: 'Dentista', percentage: 50 },
    { id: '2', name: 'Clínica', percentage: 30 },
    { id: '3', name: 'Laboratório', percentage: 20 }
  ]);
  const [isAddingSplit, setIsAddingSplit] = useState(false);
  const [newSplit, setNewSplit] = useState({ name: '', percentage: 0 });
  const [editingSplitId, setEditingSplitId] = useState<string | null>(null);
  const [editSplitData, setEditSplitData] = useState({ name: '', percentage: 0 });

  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().substring(0, 7));

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

    // Fetch patients for mapping
    const patientsQuery = query(collection(db, 'patients'), where('dentistId', '==', auth.currentUser.uid));
    const unsubscribePatients = onSnapshot(patientsQuery, (snapshot) => {
      const map: Record<string, string> = {};
      snapshot.docs.forEach(doc => {
        map[doc.id] = doc.data().name;
      });
      setPatients(map);
    });

    return () => {
      unsubscribe();
      unsubscribePatients();
    };
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || !newFinance.description || !newFinance.amount) return;

    try {
      await addDoc(collection(db, 'finances'), {
        dentistId: auth.currentUser.uid,
        patientId: newFinance.type === 'income' ? (newFinance.patientId || null) : null,
        description: newFinance.description,
        amount: parseFloat(newFinance.amount),
        type: newFinance.type,
        paymentMethod: newFinance.type === 'income' ? newFinance.paymentMethod : null,
        date: new Date(newFinance.date).toISOString(),
        percentages: newFinance.type === 'income' ? JSON.stringify(splits) : null,
        createdAt: new Date().toISOString()
      });
      setIsAdding(false);
      setNewFinance({ 
        description: '', 
        amount: '', 
        type: 'income', 
        date: new Date().toISOString().split('T')[0],
        patientId: '',
        paymentMethod: 'pix'
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'finances');
    }
  };

  const handleDelete = async (finance: Finance) => {
    setFinanceToDelete(finance);
  };

  const confirmDelete = async () => {
    if (!financeToDelete) return;
    try {
      await moveToTrash('finances', financeToDelete.id, financeToDelete);
      setFinanceToDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `finances/${financeToDelete.id}`);
    }
  };

  const financesInMonth = finances.filter(f => f.date.substring(0, 7) === selectedMonth);

  const totalIncome = financesInMonth.filter(f => f.type === 'income').reduce((acc, curr) => acc + curr.amount, 0);
  const totalExpense = financesInMonth.filter(f => f.type === 'expense').reduce((acc, curr) => acc + curr.amount, 0);
  const balance = totalIncome - totalExpense;

  const filteredFinances = financesInMonth.filter(f => {
    if (filter === 'all') return true;
    return f.type === filter;
  });

  const totalPercentage = splits.reduce((acc, curr) => acc + curr.percentage, 0);

  // Process data for the chart
  const chartData = React.useMemo(() => {
    const months: { [key: string]: { name: string; income: number; expense: number } } = {};
    const last6Months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(`${selectedMonth}-01T12:00:00Z`);
      d.setMonth(d.getMonth() - i);
      return d.toISOString().substring(0, 7); // YYYY-MM
    }).reverse();

    last6Months.forEach(m => {
      const [year, month] = m.split('-');
      const monthName = new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('pt-BR', { month: 'short' });
      months[m] = { name: monthName, income: 0, expense: 0 };
    });

    finances.forEach(f => {
      const monthKey = f.date.substring(0, 7);
      if (months[monthKey]) {
        if (f.type === 'income') months[monthKey].income += f.amount;
        else months[monthKey].expense += f.amount;
      }
    });

    return Object.values(months);
  }, [finances, selectedMonth]);

  const handleAddSplit = () => {
    if (newSplit.name && newSplit.percentage >= 0) {
      setSplits([...splits, { id: Date.now().toString(), ...newSplit }]);
      setIsAddingSplit(false);
      setNewSplit({ name: '', percentage: 0 });
    }
  };

  const handleDeleteSplit = (id: string) => {
    setSplits(splits.filter(s => s.id !== id));
  };

  const startEditSplit = (split: SplitCategory) => {
    setEditingSplitId(split.id);
    setEditSplitData({ name: split.name, percentage: split.percentage });
  };

  const saveEditSplit = () => {
    if (editingSplitId && editSplitData.name && editSplitData.percentage >= 0) {
      setSplits(splits.map(s => s.id === editingSplitId ? { ...s, ...editSplitData } : s));
      setEditingSplitId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold text-text-primary">Financeiro</h1>
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
          <input 
            type="month" 
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            className="bg-surface border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2 text-text-primary focus:ring-2 focus:ring-indigo-500 w-full sm:w-auto"
          />
          <AddFinanceForm
            isAdding={isAdding}
            setIsAdding={setIsAdding}
            newFinance={newFinance}
            setNewFinance={setNewFinance}
            patients={patients}
            splits={splits}
            handleAdd={handleAdd}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-surface p-6 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-text-primary">Receitas</h3>
            <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalIncome)}
          </p>
        </div>

        <div className="bg-surface p-6 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-text-primary">Despesas</h3>
            <div className="w-10 h-10 rounded-full bg-red-50 dark:bg-red-500/10 flex items-center justify-center text-red-600 dark:text-red-400">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-bold text-red-600 dark:text-red-400">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalExpense)}
          </p>
        </div>

        <div className="bg-surface p-6 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-text-primary">Saldo</h3>
            <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <p className={`text-3xl font-bold ${balance >= 0 ? 'text-text-primary' : 'text-red-600 dark:text-red-400'}`}>
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(balance)}
          </p>
        </div>
      </div>

      <div className="bg-surface p-6 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-2 mb-6">
          <BarChartIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <h3 className="text-lg font-medium text-text-primary">Desempenho Mensal</h3>
        </div>
        <div className="h-[300px] w-full outline-none focus:outline-none">
          <ResponsiveContainer width="100%" height="100%" className="outline-none focus:outline-none">
            <BarChart data={chartData} style={{ outline: 'none' }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e5e5" />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#71717a', fontSize: 12 }}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#71717a', fontSize: 12 }}
                tickFormatter={(value) => `R$ ${value}`}
              />
              <Tooltip 
                cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                contentStyle={{ 
                  backgroundColor: '#18181b', 
                  border: 'none', 
                  borderRadius: '12px',
                  color: '#fff',
                  fontSize: '12px'
                }}
                formatter={(value: number) => [new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value), '']}
              />
              <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: '20px', fontSize: '12px' }} />
              <Bar dataKey="income" name="Receitas" fill="#10b981" radius={[4, 4, 0, 0]} barSize={32} activeBar={false} />
              <Bar dataKey="expense" name="Despesas" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={32} activeBar={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-surface rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h3 className="text-lg font-medium text-text-primary">Histórico de Lançamentos</h3>
            <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === 'all' ? 'bg-surface text-text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}
              >
                Todos
              </button>
              <button
                onClick={() => setFilter('income')}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === 'income' ? 'bg-surface text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}
              >
                Receitas
              </button>
              <button
                onClick={() => setFilter('expense')}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === 'expense' ? 'bg-surface text-red-600 dark:text-red-400 shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}
              >
                Despesas
              </button>
            </div>
          </div>
          


          <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {filteredFinances.length === 0 ? (
              <div className="p-8 text-center text-text-secondary">Nenhum lançamento encontrado.</div>
            ) : (
              filteredFinances.map(finance => (
                <div key={finance.id} className="p-4 flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${finance.type === 'income' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600' : 'bg-red-50 dark:bg-red-500/10 text-red-600'}`}>
                      {finance.type === 'income' ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                    </div>
                    <div>
                      <p className="font-medium text-text-primary">{finance.description}</p>
                      <div className="flex items-center gap-3 text-xs text-text-secondary">
                        <span>{new Date(finance.date).toLocaleDateString('pt-BR')}</span>
                        {finance.patientId && patients[finance.patientId] && (
                          <span className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400">
                            <User className="w-3 h-3" />
                            {patients[finance.patientId]}
                          </span>
                        )}
                        {finance.paymentMethod && (
                          <span className="flex items-center gap-1 uppercase font-bold text-[10px] bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
                            {finance.paymentMethod}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`font-semibold ${finance.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                      {finance.type === 'income' ? '+' : '-'} {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(finance.amount)}
                    </span>
                    <button onClick={() => handleDelete(finance)} className="p-2 text-text-secondary hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-surface rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 p-6 h-fit">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <PieChart className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-lg font-medium text-text-primary">Divisão de Receitas</h3>
            </div>
            <button
              onClick={() => setIsAddingSplit(true)}
              className="p-1.5 text-text-secondary hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg transition-colors"
              title="Adicionar categoria"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
          
          <div className="space-y-4">
            {isAddingSplit && (
              <div className="flex items-center gap-2 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-700">
                <input
                  type="text"
                  placeholder="Nome"
                  value={newSplit.name}
                  onChange={e => setNewSplit({...newSplit, name: e.target.value})}
                  className="flex-1 min-w-0 bg-surface border border-zinc-200 dark:border-zinc-700 rounded-lg px-2 py-1 text-sm text-text-primary"
                />
                <input
                  type="number"
                  placeholder="%"
                  value={newSplit.percentage}
                  onChange={e => setNewSplit({...newSplit, percentage: Number(e.target.value)})}
                  className="w-16 bg-surface border border-zinc-200 dark:border-zinc-700 rounded-lg px-2 py-1 text-sm text-text-primary"
                />
                <button onClick={handleAddSplit} className="p-1 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded">
                  <Check className="w-4 h-4" />
                </button>
                <button onClick={() => setIsAddingSplit(false)} className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {splits.map(split => (
              <div key={split.id} className="group">
                {editingSplitId === split.id ? (
                  <div className="flex items-center gap-2 p-2 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-700">
                    <input
                      type="text"
                      value={editSplitData.name}
                      onChange={e => setEditSplitData({...editSplitData, name: e.target.value})}
                      className="flex-1 min-w-0 bg-surface border border-zinc-200 dark:border-zinc-700 rounded-lg px-2 py-1 text-sm text-text-primary"
                    />
                    <input
                      type="number"
                      value={editSplitData.percentage}
                      onChange={e => setEditSplitData({...editSplitData, percentage: Number(e.target.value)})}
                      className="w-16 bg-surface border border-zinc-200 dark:border-zinc-700 rounded-lg px-2 py-1 text-sm text-text-primary"
                    />
                    <button onClick={saveEditSplit} className="p-1 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded">
                      <Check className="w-4 h-4" />
                    </button>
                    <button onClick={() => setEditingSplitId(null)} className="p-1 text-text-secondary hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-text-secondary flex items-center gap-2">
                        {split.name} ({split.percentage}%)
                        <div className="hidden group-hover:flex items-center gap-1">
                          <button onClick={() => startEditSplit(split)} className="p-0.5 text-text-secondary hover:text-indigo-600">
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button onClick={() => handleDeleteSplit(split.id)} className="p-0.5 text-text-secondary hover:text-red-600">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </span>
                      <span className="font-medium text-text-primary">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((totalIncome * split.percentage) / 100)}
                      </span>
                    </div>
                    <input 
                      type="range" 
                      min="0" 
                      max="100" 
                      value={split.percentage} 
                      onChange={(e) => {
                        setSplits(splits.map(s => s.id === split.id ? { ...s, percentage: parseInt(e.target.value) } : s));
                      }} 
                      className="w-full accent-indigo-600" 
                    />
                  </div>
                )}
              </div>
            ))}

            <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800">
              <p className="text-xs text-text-secondary text-center">
                Total: {totalPercentage}% 
                {totalPercentage !== 100 && <span className="text-red-500 ml-1">(Ajuste para 100%)</span>}
              </p>
            </div>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={!!financeToDelete}
        title="Excluir Lançamento"
        message="Tem certeza que deseja excluir este lançamento? Ele será movido para a lixeira."
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        onConfirm={confirmDelete}
        onCancel={() => setFinanceToDelete(null)}
        variant="danger"
      />
    </div>
  );
};
