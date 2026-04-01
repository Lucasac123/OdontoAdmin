import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, updateDoc, getDocs } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType, moveToTrash } from '../firebase';
import { Finance } from '../types';
import { Plus, Trash2, DollarSign, TrendingUp, TrendingDown, PieChart, Edit2, Check, X, BarChart as BarChartIcon, User, Camera, Loader2, FileText, AlertTriangle, Building } from 'lucide-react';
import { AddFinanceForm } from '../components/patient/AddFinanceForm';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Patient } from '../types';
import { ConfirmModal } from '../components/ConfirmModal';
import { motion } from 'motion/react';
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

  const handleScanInvoice = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Data = (reader.result as string).split(',')[1];
        
        const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: {
            parts: [
              {
                inlineData: {
                  data: base64Data,
                  mimeType: file.type
                }
              },
              {
                text: "Analise esta nota fiscal ou recibo. Extraia a descrição do item ou serviço, o valor total numérico, o tipo (income para receita/venda, expense para despesa/compra) e a data no formato YYYY-MM-DD. Retorne apenas o JSON."
              }
            ]
          },
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                description: { type: Type.STRING, description: "Descrição curta do que foi pago ou recebido" },
                amount: { type: Type.NUMBER, description: "Valor total da nota" },
                type: { type: Type.STRING, description: "income ou expense" },
                date: { type: Type.STRING, description: "Data no formato YYYY-MM-DD" }
              },
              required: ["description", "amount", "type", "date"]
            }
          }
        });

        if (response.text) {
          const data = JSON.parse(response.text);
          setNewFinance(prev => ({
            ...prev,
            description: data.description || '',
            amount: data.amount ? data.amount.toString() : '',
            type: (data.type === 'income' || data.type === 'expense') ? data.type : 'expense',
            date: data.date || new Date().toISOString().split('T')[0]
          }));
          setIsAdding(true);
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Erro ao analisar nota fiscal:", error);
      alert("Não foi possível analisar a nota fiscal. Tente novamente.");
    } finally {
      setIsScanning(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

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

    // Fetch patients for mapping
    const patientsQuery = query(collection(db, 'patients'), where('dentistId', '==', auth.currentUser.uid));
    const unsubscribePatients = onSnapshot(patientsQuery, (snapshot) => {
      const map: Record<string, { name: string, cpf?: string }> = {};
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        map[doc.id] = { name: data.name, cpf: data.cpf };
      });
      setPatients(map);
    });

    // Fetch inventory value
    const invQuery = query(collection(db, 'inventory'), where('dentistId', '==', auth.currentUser.uid));
    const unsubscribeInv = onSnapshot(invQuery, (snapshot) => {
      let consumo = 0;
      let patrimonio = 0;
      snapshot.docs.forEach(doc => {
        const item = doc.data();
        if (item.quantity && item.price) {
          // Robust comparison: normalize unicode and check case-insensitively
          // to handle any encoding differences in stored data
          const cat = (item.category || '').normalize('NFC').trim();
          const isPatrimonio = cat === 'Patrimônio' || 
                               cat.toLowerCase().includes('patrim') ||
                               cat === 'Patrimonio'; // without accent fallback
          if (isPatrimonio) {
            patrimonio += item.quantity * item.price;
          } else {
            consumo += item.quantity * item.price;
          }
        }
      });
      setInventoryValue(consumo);
      setInventoryAssetsValue(patrimonio);
    });

    // Fetch assets value
    const settingsQuery = query(collection(db, 'clinicSettings'), where('dentistId', '==', auth.currentUser.uid));
    const unsubscribeSettings = onSnapshot(settingsQuery, (snapshot) => {
      if (!snapshot.empty) {
        const data = snapshot.docs[0].data();
        setAssetsValue(data.assetsValue || 0);
      }
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
      
      if (snapshot.empty) {
        await addDoc(collection(db, 'clinicSettings'), {
          dentistId: auth.currentUser.uid,
          assetsValue: val,
          workHoursPerDay: 8,
          workDaysPerWeek: 5,
          updatedAt: new Date().toISOString()
        });
      } else {
        await updateDoc(doc(db, 'clinicSettings', snapshot.docs[0].id), {
          assetsValue: val,
          updatedAt: new Date().toISOString()
        });
      }
      setIsEditingAssets(false);
    } catch (error) {
      console.error("Error saving assets:", error);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || !newFinance.description || !newFinance.amount || isSavingFinance) return;

    setIsSavingFinance(true);
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
    } finally {
      setIsSavingFinance(false);
    }
  };

  const handleDelete = async (finance: Finance) => {
    setFinanceToDelete(finance);
  };

  const confirmDelete = async () => {
    if (!financeToDelete || isDeleting) return;
    setIsDeleting(true);
    try {
      await moveToTrash('finances', financeToDelete.id, financeToDelete);
      setFinanceToDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `finances/${financeToDelete.id}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handlePrintTaxReceipt = (finance: Finance) => {
    const patientName = finance.patientId && patients[finance.patientId] ? patients[finance.patientId].name : 'Paciente não identificado';
    const patientCpf = finance.patientId && patients[finance.patientId] && patients[finance.patientId].cpf ? patients[finance.patientId].cpf : '___________________';
    const amount = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(finance.amount);
    const date = new Date(finance.date).toLocaleDateString('pt-BR');
    const dentistName = auth.currentUser?.displayName || 'Cirurgião-Dentista';
    
    const receiptContent = `
      <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; border: 1px solid #ccc;">
        <h1 style="text-align: center; color: #333; margin-bottom: 30px; text-transform: uppercase;">Recibo para Fins de Imposto de Renda</h1>
        
        <div style="margin-bottom: 40px;">
          <p style="font-size: 18px; line-height: 1.8; text-align: justify;">
            Recebi de <strong>${patientName}</strong>, inscrito(a) no CPF sob o nº <strong>${patientCpf}</strong>, 
            a importância de <strong>${amount}</strong>, 
            referente a prestação de serviços odontológicos (${finance.description}).
          </p>
        </div>

        <div style="margin-bottom: 60px;">
          <p style="font-size: 16px;">Para maior clareza, firmo o presente recibo.</p>
        </div>

        <div style="text-align: right;">
          <p style="font-size: 16px; margin-bottom: 60px;">Data: ${date}</p>
          <div style="border-top: 1px solid #000; width: 350px; margin-left: auto; padding-top: 10px; text-align: center;">
            <p style="margin: 0; font-weight: bold;">${dentistName}</p>
            <p style="margin: 5px 0 0 0; font-size: 14px;">CPF/CNPJ: ______________</p>
            <p style="margin: 5px 0 0 0; font-size: 14px;">CRO: ______________</p>
          </div>
        </div>
      </div>
    `;

    const iframe = document.createElement('iframe');
    console.log('Creating iframe for printing...');
    iframe.style.position = 'absolute';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (doc) {
      console.log('Iframe document found, writing content...');
      doc.open();
      doc.write(`
        <html>
          <head>
            <title>Recibo IR - ${patientName}</title>
            <style>
              body { font-family: sans-serif; padding: 40px; }
            </style>
          </head>
          <body>
            ${receiptContent}
          </body>
        </html>
      `);
      doc.close();
      
      // Wait for content to load before printing
      setTimeout(() => {
        console.log('Attempting to print iframe...');
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        
        // Cleanup
        setTimeout(() => {
          console.log('Cleaning up iframe...');
          document.body.removeChild(iframe);
        }, 2000); // Increased cleanup timeout
      }, 1000); // Increased print timeout
    } else {
      console.error('Could not access iframe document');
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
    if (newSplit.name && newSplit.percentage !== '' && newSplit.percentage >= 0) {
      setSplits([...splits, { 
        id: Date.now().toString(), 
        name: newSplit.name, 
        percentage: Number(newSplit.percentage) 
      }]);
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
    if (editingSplitId && editSplitData.name && editSplitData.percentage !== '' && editSplitData.percentage >= 0) {
      setSplits(splits.map(s => s.id === editingSplitId ? { 
        ...s, 
        name: editSplitData.name, 
        percentage: Number(editSplitData.percentage) 
      } : s));
      setEditingSplitId(null);
    }
  };

  const totalAllTimeIncome = finances.filter(f => f.type === 'income').reduce((acc, curr) => acc + curr.amount, 0);
  const companyValuation = totalAllTimeIncome + inventoryValue + assetsValue + inventoryAssetsValue;

  return (
    <div className="space-y-8">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
          <h1 className="text-4xl font-bold text-text-primary tracking-tight mb-2">Financeiro</h1>
          <p className="text-text-secondary text-sm sm:text-base font-medium">Gestão inteligente e transparente do seu consultório</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto flex-shrink-0">
          <div className="relative w-full sm:w-auto">
            <input 
              type="month" 
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="bg-surface border border-zinc-200 dark:border-zinc-800 rounded-2xl px-5 py-3 text-xs font-black uppercase tracking-widest text-text-primary focus:ring-2 focus:ring-indigo-500 w-full sm:w-auto appearance-none cursor-pointer shadow-sm transition-all hover:border-zinc-300 dark:hover:border-zinc-700"
            />
          </div>
          
          <div className="flex gap-3 w-full sm:w-auto">
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              ref={fileInputRef}
              onChange={handleScanInvoice}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isScanning}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-zinc-100 dark:bg-zinc-800 text-text-primary px-6 py-3 rounded-2xl hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all text-[10px] font-black uppercase tracking-[0.2em] disabled:opacity-50 active:scale-95 border border-zinc-200 dark:border-zinc-800"
              title="Escanear Nota Fiscal com IA"
            >
              {isScanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
              <span>Escanear</span>
            </button>

            <AddFinanceForm
              isAdding={isAdding}
              setIsAdding={setIsAdding}
              newFinance={newFinance}
              setNewFinance={setNewFinance}
              patients={Object.fromEntries(Object.entries(patients).map(([id, p]: [string, any]) => [id, p.name]))}
              splits={splits}
              handleAdd={handleAdd}
              isLoading={isSavingFinance}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          whileHover={{ y: -6 }}
          className="premium-card p-8 relative overflow-hidden group border-emerald-500/10"
        >
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <TrendingUp size={120} className="text-emerald-500" />
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500/20" />
          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <TrendingUp className="w-6 h-6" />
              </div>
              <h3 className="text-xs font-black text-text-secondary uppercase tracking-[0.2em]">Receitas</h3>
            </div>
            <p className="text-2xl sm:text-3xl lg:text-4xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalIncome)}
            </p>
            <div className="flex items-center gap-2 mt-4">
              <span className="text-[10px] font-black px-2.5 py-1 bg-emerald-500/10 text-emerald-600 rounded-lg border border-emerald-500/20">+12.5%</span>
              <p className="text-[10px] text-text-secondary font-black uppercase tracking-widest">vs. mês anterior</p>
            </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          whileHover={{ y: -6 }}
          className="premium-card p-8 relative overflow-hidden group border-red-500/10"
        >
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <TrendingDown size={120} className="text-red-500" />
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-red-500/20" />
          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-600 dark:text-red-400">
                <TrendingDown className="w-6 h-6" />
              </div>
              <h3 className="text-xs font-black text-text-secondary uppercase tracking-[0.2em]">Despesas</h3>
            </div>
            <p className="text-2xl sm:text-3xl lg:text-4xl font-black text-red-600 dark:text-red-400 tracking-tight">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalExpense)}
            </p>
            <div className="flex items-center gap-2 mt-4">
              <span className="text-[10px] font-black px-2.5 py-1 bg-red-500/10 text-red-600 rounded-lg border border-red-500/20">-4.2%</span>
              <p className="text-[10px] text-text-secondary font-black uppercase tracking-widest">vs. mês anterior</p>
            </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          whileHover={{ y: -6 }}
          className="premium-card p-8 relative overflow-hidden group border-indigo-500/10"
        >
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <DollarSign size={120} className="text-indigo-500" />
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-500/20" />
          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <DollarSign className="w-6 h-6" />
              </div>
              <h3 className="text-xs font-black text-text-secondary uppercase tracking-[0.2em]">Saldo</h3>
            </div>
            <p className={`text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight ${balance >= 0 ? 'text-text-primary' : 'text-red-600 dark:text-red-400'}`}>
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(balance)}
            </p>
            <div className="flex items-center gap-2 mt-4">
              <div className={`w-2.5 h-2.5 rounded-full animate-pulse ${balance >= 0 ? 'bg-emerald-500' : 'bg-red-500'}`} />
              <p className="text-[10px] text-text-secondary font-black uppercase tracking-widest">Status da conta</p>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 premium-card p-8 !translate-y-0 hover:!shadow-premium">
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <BarChartIcon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-black text-text-primary tracking-tight">Fluxo de Caixa</h3>
                <p className="text-xs text-text-secondary font-bold uppercase tracking-widest">Análise dos últimos 6 meses</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="text-[10px] font-bold uppercase text-text-secondary tracking-wider">Receitas</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span className="text-[10px] font-bold uppercase text-text-secondary tracking-wider">Despesas</span>
              </div>
            </div>
          </div>
          <div className="h-[400px] w-full min-h-[400px] min-w-[400px]">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="rgba(0,0,0,0.05)" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#71717a', fontSize: 10, fontWeight: 700 }}
                    dy={15}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#71717a', fontSize: 10, fontWeight: 700 }}
                    tickFormatter={(value) => `R$ ${value >= 1000 ? (value/1000).toFixed(0) + 'k' : value}`}
                  />
                  <Tooltip 
                    cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                    contentStyle={{ 
                      backgroundColor: 'var(--bg-surface)', 
                      border: '1px solid var(--border-zinc-200)', 
                      borderRadius: '20px',
                      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
                      color: 'var(--text-primary)',
                      fontSize: '12px',
                      padding: '16px'
                    }}
                    itemStyle={{ padding: '4px 0' }}
                    formatter={(value: number) => [new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value), '']}
                  />
                  <Bar dataKey="income" name="Receitas" fill="#10b981" radius={[8, 8, 0, 0]} barSize={32} activeBar={{ fill: '#059669' }} />
                  <Bar dataKey="expense" name="Despesas" fill="#ef4444" radius={[8, 8, 0, 0]} barSize={32} activeBar={{ fill: '#dc2626' }} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-sm text-text-secondary">
                Nenhum dado disponível para o gráfico
              </div>
            )}
          </div>
        </div>

        <div className="premium-card p-8 !translate-y-0 hover:!shadow-premium flex flex-col h-full border-indigo-500/10">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Building className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-black text-text-primary tracking-tight">Valuation</h3>
              <p className="text-xs text-text-secondary font-bold uppercase tracking-widest">Valor da Clínica</p>
            </div>
          </div>
          
          <div className="flex-1 flex flex-col justify-center">
            <p className="text-4xl font-black text-indigo-600 dark:text-indigo-400 tracking-tight mb-8 text-center">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(companyValuation)}
            </p>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center p-4 bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                <span className="text-xs font-bold text-text-secondary uppercase tracking-widest">Rendimentos (Total)</span>
                <span className="font-black text-text-primary">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalAllTimeIncome)}</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                <span className="text-xs font-bold text-text-secondary uppercase tracking-widest">Estoque de Consumo</span>
                <span className="font-black text-text-primary">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(inventoryValue)}</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl border border-zinc-100 dark:border-zinc-800 group relative">
                <span className="text-xs font-bold text-text-secondary uppercase tracking-widest" title="Soma dos ativos cadastrados no almoxarifado com os valores informados manualmente">Patrimônio Físico</span>
                {isEditingAssets ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={tempAssetsValue}
                      onChange={e => setTempAssetsValue(e.target.value)}
                      className="w-24 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-2 py-1 text-sm text-right outline-none focus:ring-2 focus:ring-indigo-500"
                      autoFocus
                      onKeyDown={e => e.key === 'Enter' && handleSaveAssets()}
                    />
                    <button onClick={handleSaveAssets} className="p-1 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-md">
                      <Check className="w-4 h-4" />
                    </button>
                    <button onClick={() => setIsEditingAssets(false)} className="p-1 text-text-secondary hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-md">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="font-black text-text-primary">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(assetsValue + inventoryAssetsValue)}</span>
                    <button 
                      onClick={() => { setTempAssetsValue(assetsValue.toString()); setIsEditingAssets(true); }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 text-text-secondary hover:text-indigo-600 transition-all cursor-pointer bg-white dark:bg-zinc-800 rounded shadow-md border border-zinc-200 dark:border-zinc-700 z-10"
                      title="Forçar valor manual do Patrimônio (seus móveis e propriedades)"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 premium-card !translate-y-0 hover:!shadow-premium overflow-hidden flex flex-col">
          <div className="p-8 border-b border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-6 bg-zinc-50/30 dark:bg-zinc-900/10">
            <div>
              <h3 className="text-xl font-black text-text-primary tracking-tight">Histórico</h3>
              <p className="text-xs text-text-secondary font-bold uppercase tracking-widest">Movimentações detalhadas</p>
            </div>
            <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1.5 rounded-2xl w-full sm:w-auto">
              <button
                onClick={() => setFilter('all')}
                className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] transition-all ${filter === 'all' ? 'bg-surface text-text-primary shadow-md' : 'text-text-secondary hover:text-text-primary'}`}
              >
                Todos
              </button>
              <button
                onClick={() => setFilter('income')}
                className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] transition-all ${filter === 'income' ? 'bg-surface text-emerald-600 dark:text-emerald-400 shadow-md' : 'text-text-secondary hover:text-text-primary'}`}
              >
                Receitas
              </button>
              <button
                onClick={() => setFilter('expense')}
                className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] transition-all ${filter === 'expense' ? 'bg-surface text-red-600 dark:text-red-400 shadow-md' : 'text-text-secondary hover:text-text-primary'}`}
              >
                Despesas
              </button>
            </div>
          </div>
          
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="bg-zinc-50/50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800">
                <tr>
                  <th className="text-left py-4 px-6 text-[10px] font-black text-text-secondary uppercase tracking-[0.2em]">Descrição</th>
                  <th className="text-left py-4 px-6 text-[10px] font-black text-text-secondary uppercase tracking-[0.2em]">Data</th>
                  <th className="text-left py-4 px-6 text-[10px] font-black text-text-secondary uppercase tracking-[0.2em]">Paciente</th>
                  <th className="text-left py-4 px-6 text-[10px] font-black text-text-secondary uppercase tracking-[0.2em]">Método</th>
                  <th className="text-right py-4 px-6 text-[10px] font-black text-text-secondary uppercase tracking-[0.2em]">Valor</th>
                  <th className="text-right py-4 px-6 text-[10px] font-black text-text-secondary uppercase tracking-[0.2em]">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {filteredFinances.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-20 text-center">
                      <div className="bg-zinc-50 dark:bg-zinc-900 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <DollarSign className="text-text-secondary opacity-20 w-8 h-8" />
                      </div>
                      <p className="text-text-secondary text-sm font-bold uppercase tracking-widest">Nenhum lançamento encontrado</p>
                    </td>
                  </tr>
                ) : (
                  filteredFinances.map(finance => (
                    <tr key={finance.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors group">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${finance.type === 'income' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-600'}`}>
                            {finance.type === 'income' ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                          </div>
                          <span className="font-bold text-text-primary text-sm whitespace-nowrap overflow-hidden text-ellipsis max-w-[200px]">{finance.description}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-xs text-text-secondary font-medium">
                        {new Date(finance.date).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="py-4 px-6 text-sm">
                        {finance.patientId && patients[finance.patientId] ? (
                          <span className="flex items-center gap-2 text-text-primary font-medium text-xs">
                            <User className="w-4 h-4 text-text-secondary" />
                            {patients[finance.patientId].name}
                          </span>
                        ) : <span className="text-text-secondary opacity-50">-</span>}
                      </td>
                      <td className="py-4 px-6">
                        {finance.paymentMethod ? (
                          <span className="text-[10px] font-bold uppercase bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1 rounded-md text-text-secondary tracking-wider">
                            {finance.paymentMethod}
                          </span>
                        ) : <span className="text-text-secondary opacity-50">-</span>}
                      </td>
                      <td className={`py-4 px-6 text-right font-black text-sm ${finance.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                        {finance.type === 'income' ? '+' : '-'} {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(finance.amount)}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex justify-end gap-2 transition-opacity">
                          {finance.type === 'income' && (
                            <button onClick={() => handlePrintTaxReceipt(finance)} className="p-2 text-text-secondary hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg transition-colors" title="Emitir Recibo">
                              <FileText className="w-4 h-4" />
                            </button>
                          )}
                          <button onClick={() => handleDelete(finance)} className="p-2 text-text-secondary hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors" title="Excluir">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="sm:hidden divide-y divide-zinc-100 dark:divide-zinc-800">
            {filteredFinances.length === 0 ? (
              <div className="p-12 text-center text-text-secondary text-sm">Nenhum lançamento encontrado.</div>
            ) : (
              filteredFinances.map(finance => (
                <div key={finance.id} className="p-6 bg-zinc-50/50 dark:bg-zinc-800/10 hover:bg-zinc-100 dark:hover:bg-zinc-800/30 transition-all border-b border-border-subtle last:border-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${finance.type === 'income' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
                        {finance.type === 'income' ? <TrendingUp className="w-6 h-6" /> : <TrendingDown className="w-6 h-6" />}
                      </div>
                      <div className="min-w-0">
                        <p className="font-black text-text-primary leading-tight truncate">{finance.description}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-[10px] text-text-secondary uppercase font-black tracking-widest">{new Date(finance.date).toLocaleDateString('pt-BR')}</p>
                          {finance.paymentMethod && (
                            <>
                              <span className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                              <span className="text-[10px] font-black uppercase text-accent tracking-wider">{finance.paymentMethod}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-lg font-black tracking-tight ${finance.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                        {finance.type === 'income' ? '+' : '-'} {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(finance.amount)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-2">
                      {finance.patientId && patients[finance.patientId] && (
                        <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-3 py-1 rounded-full">
                          <User className="w-3 h-3" />
                          {patients[finance.patientId].name}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {finance.type === 'income' && (
                        <button onClick={() => handlePrintTaxReceipt(finance)} className="p-2.5 text-text-secondary bg-zinc-100 dark:bg-zinc-800 rounded-xl active:scale-95 transition-transform" title="Emitir Recibo">
                          <FileText className="w-4 h-4" />
                        </button>
                      )}
                      <button onClick={() => handleDelete(finance)} className="p-2.5 text-red-500 bg-red-50 dark:bg-red-500/10 rounded-xl active:scale-95 transition-transform" title="Excluir">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-surface rounded-[32px] shadow-sm border border-zinc-200 dark:border-zinc-800 p-10 h-fit">
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <PieChart className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-black text-text-primary tracking-tight">Revenue Split</h3>
                <p className="text-xs text-text-secondary font-bold uppercase tracking-widest">Distribuição automática</p>
              </div>
            </div>
            <button
              onClick={() => setIsAddingSplit(true)}
              className="w-10 h-10 flex items-center justify-center text-text-secondary hover:text-indigo-600 hover:bg-indigo-500/10 rounded-2xl transition-all active:scale-90 border border-zinc-200 dark:border-zinc-800"
              title="Adicionar categoria"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
          
          <div className="space-y-8">
            {isAddingSplit && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-6 bg-zinc-50 dark:bg-zinc-900/50 rounded-[24px] border border-zinc-200 dark:border-zinc-800 space-y-4 shadow-inner"
              >
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Nome da Categoria</label>
                  <input
                    type="text"
                    placeholder="Ex: Marketing"
                    value={newSplit.name}
                    onChange={e => setNewSplit({...newSplit, name: e.target.value})}
                    className="w-full bg-surface border border-zinc-200 dark:border-zinc-800 rounded-2xl px-4 py-3 text-sm text-text-primary outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Porcentagem</label>
                  <div className="flex items-center gap-3">
                    <div className="relative flex-1">
                      <input
                        type="number"
                        placeholder="0"
                        value={newSplit.percentage}
                        onChange={e => setNewSplit({...newSplit, percentage: e.target.value === '' ? '' : Number(e.target.value)})}
                        className="w-full bg-surface border border-zinc-200 dark:border-zinc-800 rounded-2xl px-4 py-3 text-sm text-text-primary outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-text-secondary text-xs font-black">%</span>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={handleAddSplit} className="w-11 h-11 flex items-center justify-center bg-emerald-500 text-white rounded-2xl hover:bg-emerald-600 transition-colors shadow-lg shadow--/ dark:shadow-none">
                        <Check className="w-5 h-5" />
                      </button>
                      <button onClick={() => setIsAddingSplit(false)} className="w-11 h-11 flex items-center justify-center bg-zinc-200 dark:bg-zinc-800 text-text-secondary rounded-2xl hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors">
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {splits.map(split => (
              <div key={split.id} className="group">
                {editingSplitId === split.id ? (
                  <div className="p-5 bg-zinc-50 dark:bg-zinc-900/50 rounded-[24px] border border-zinc-200 dark:border-zinc-800 space-y-4 shadow-inner">
                    <input
                      type="text"
                      value={editSplitData.name}
                      onChange={e => setEditSplitData({...editSplitData, name: e.target.value})}
                      className="w-full bg-surface border border-zinc-200 dark:border-zinc-800 rounded-2xl px-4 py-2.5 text-sm text-text-primary outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    />
                    <div className="flex items-center gap-3">
                      <div className="relative flex-1">
                        <input
                          type="number"
                          value={editSplitData.percentage}
                          onChange={e => setEditSplitData({...editSplitData, percentage: e.target.value === '' ? '' : Number(e.target.value)})}
                          className="w-full bg-surface border border-zinc-200 dark:border-zinc-800 rounded-2xl px-4 py-2.5 text-sm text-text-primary outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-text-secondary text-xs font-black">%</span>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={saveEditSplit} className="w-10 h-10 flex items-center justify-center bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors">
                          <Check className="w-4 h-4" />
                        </button>
                        <button onClick={() => setEditingSplitId(null)} className="w-10 h-10 flex items-center justify-center bg-zinc-200 dark:bg-zinc-800 text-text-secondary rounded-xl hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex justify-between items-end">
                      <div className="space-y-1">
                        <span className="text-xs font-black text-text-secondary uppercase tracking-widest flex items-center gap-2">
                          {split.name}
                          <div className="hidden group-hover:flex items-center gap-1.5 ml-2">
                            <button onClick={() => startEditSplit(split)} className="p-1 text-text-secondary hover:text-indigo-600 transition-colors">
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleDeleteSplit(split.id)} className="p-1 text-text-secondary hover:text-red-600 transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </span>
                        <p className="text-lg font-black text-text-primary tracking-tight">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((totalIncome * split.percentage) / 100)}
                        </p>
                      </div>
                      <span className="text-sm font-black text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-xl">{split.percentage}%</span>
                    </div>
                    <div className="relative h-3 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden shadow-inner">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${split.percentage}%` }}
                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-indigo-600 to-indigo-400 rounded-full shadow-[0_0_10px_rgba(79,70,229,0.4)]"
                      />
                      <input 
                        type="range" 
                        min="0" 
                        max="100" 
                        value={split.percentage} 
                        onChange={(e) => {
                          setSplits(splits.map(s => s.id === split.id ? { ...s, percentage: parseInt(e.target.value) } : s));
                        }} 
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}

            <div className="pt-8 border-t border-zinc-100 dark:border-zinc-800">
              <div className={`flex items-center justify-center gap-3 px-6 py-4 rounded-[24px] text-[10px] font-black uppercase tracking-[0.2em] transition-all ${totalPercentage === 100 ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' : 'bg-red-500/10 text-red-600 border border-red-500/20 animate-pulse'}`}>
                {totalPercentage === 100 ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <AlertTriangle className="w-5 h-5" />
                )}
                Total: {totalPercentage}% 
                {totalPercentage !== 100 && <span className="ml-1 opacity-70">(Ajuste para 100%)</span>}
              </div>
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
        isLoading={isDeleting}
      />
    </div>
  );
};

export default Financial;
