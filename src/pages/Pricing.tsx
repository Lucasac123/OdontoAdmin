import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc, setDoc } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType, moveToTrash } from '../firebase';
import { FixedExpense, ProcedureTemplate, ClinicSettings, InventoryItem } from '../types';
import { Calculator, Clock, DollarSign, Plus, Trash2, Edit2, FileText, Upload, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ConfirmModal } from '../components/ConfirmModal';
import { GoogleGenAI } from '@google/genai';

export const Pricing: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'hour' | 'procedures'>('hour');
  
  // Clinical Hour State
  const [settings, setSettings] = useState<ClinicSettings>({ dentistId: '', workHoursPerDay: 8, workDaysPerWeek: 5, updatedAt: '' });
  const [expenses, setExpenses] = useState<FixedExpense[]>([]);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<FixedExpense | null>(null);
  const [expenseForm, setExpenseForm] = useState({ name: '', minValue: '' as number | '', maxValue: '' as number | '', periodicity: 'monthly' as any });
  const [isUploading, setIsUploading] = useState(false);

  // Procedures State
  const [procedures, setProcedures] = useState<ProcedureTemplate[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [isProcModalOpen, setIsProcModalOpen] = useState(false);
  const [editingProc, setEditingProc] = useState<ProcedureTemplate | null>(null);
  const [procForm, setProcForm] = useState({
    name: '',
    durationMinutes: '' as number | '',
    taxesPercent: '' as number | '',
    cardFeePercent: '' as number | '',
    profitMarginPercent: '' as number | '',
    difficultyPercent: '' as number | '',
    materials: [] as { inventoryItemId: string; name: string; quantity: number | ''; unitCost: number | '' }[]
  });

  const [deleteItem, setDeleteItem] = useState<{ type: 'expense' | 'procedure', id: string } | null>(null);

  useEffect(() => {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;

    const unsubSettings = onSnapshot(doc(db, 'clinic_settings', uid), (docSnap) => {
      if (docSnap.exists()) {
        setSettings({ id: docSnap.id, ...docSnap.data() } as ClinicSettings);
      } else {
        setSettings({ dentistId: uid, workHoursPerDay: 8, workDaysPerWeek: 5, updatedAt: new Date().toISOString() });
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'clinic_settings');
    });

    const qExpenses = query(collection(db, 'fixed_expenses'), where('dentistId', '==', uid));
    const unsubExpenses = onSnapshot(qExpenses, (snapshot) => {
      setExpenses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FixedExpense)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'fixed_expenses');
    });

    const qProcedures = query(collection(db, 'procedure_templates'), where('dentistId', '==', uid));
    const unsubProcedures = onSnapshot(qProcedures, (snapshot) => {
      setProcedures(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProcedureTemplate)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'procedure_templates');
    });

    const qInventory = query(collection(db, 'inventory'), where('dentistId', '==', uid));
    const unsubInventory = onSnapshot(qInventory, (snapshot) => {
      setInventory(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InventoryItem)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'inventory');
    });

    return () => {
      unsubSettings();
      unsubExpenses();
      unsubProcedures();
      unsubInventory();
    };
  }, []);

  const handleSaveSettings = async (field: keyof ClinicSettings, value: number) => {
    if (!auth.currentUser) return;
    try {
      const newSettings = { ...settings, [field]: value, updatedAt: new Date().toISOString() };
      await setDoc(doc(db, 'clinic_settings', auth.currentUser.uid), newSettings, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'clinic_settings');
    }
  };

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    try {
      const data = {
        ...expenseForm,
        dentistId: auth.currentUser.uid,
        updatedAt: new Date().toISOString()
      };
      if (editingExpense) {
        await updateDoc(doc(db, 'fixed_expenses', editingExpense.id), data);
      } else {
        await addDoc(collection(db, 'fixed_expenses'), { ...data, createdAt: new Date().toISOString() });
      }
      setIsExpenseModalOpen(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'fixed_expenses');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !auth.currentUser) return;

    setIsUploading(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64Data = (reader.result as string).split(',')[1];
        const mimeType = file.type;

        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
        const prompt = `Analise esta fatura/conta. Extraia as seguintes informações em formato JSON:
        {
          "name": "Nome da despesa (ex: Conta de Luz, Aluguel, Internet)",
          "value": "Valor numérico da fatura",
          "periodicity": "monthly" | "yearly" | "weekly" | "one-time" (geralmente contas de consumo são monthly)
        }
        Retorne APENAS o JSON válido, sem formatação markdown ou texto adicional.`;

        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: {
            parts: [
              { inlineData: { data: base64Data, mimeType } },
              { text: prompt }
            ]
          }
        });

        const text = response.text?.replace(/```json/g, '').replace(/```/g, '').trim();
        if (text) {
          const result = JSON.parse(text);
          
          const existing = expenses.find(exp => exp.name.toLowerCase().includes(result.name.toLowerCase()));
          if (existing) {
            const min = Math.min(existing.minValue, result.value);
            const max = Math.max(existing.maxValue, result.value);
            await updateDoc(doc(db, 'fixed_expenses', existing.id), {
              minValue: min,
              maxValue: max,
              updatedAt: new Date().toISOString()
            });
            alert(`Fatura adicionada à despesa existente "${existing.name}". Novo intervalo: R$ ${min} - R$ ${max}`);
          } else {
            setExpenseForm({
              name: result.name,
              minValue: result.value,
              maxValue: result.value,
              periodicity: result.periodicity
            });
            setEditingExpense(null);
            setIsExpenseModalOpen(true);
          }
        }
      };
    } catch (error) {
      console.error('Error analyzing invoice:', error);
      alert('Erro ao analisar a fatura. Verifique a imagem e tente novamente.');
    } finally {
      setIsUploading(false);
      if (e.target) e.target.value = '';
    }
  };

  const calculateMonthlyExpenses = () => {
    return expenses.reduce((acc, exp) => {
      const avgValue = (exp.minValue + exp.maxValue) / 2;
      if (exp.periodicity === 'monthly') return acc + avgValue;
      if (exp.periodicity === 'yearly') return acc + (avgValue / 12);
      if (exp.periodicity === 'weekly') return acc + (avgValue * 4.33);
      return acc;
    }, 0);
  };

  const monthlyExpenses = calculateMonthlyExpenses();
  const hoursPerMonth = settings.workHoursPerDay * settings.workDaysPerWeek * 4.33;
  const clinicalHourValue = hoursPerMonth > 0 ? monthlyExpenses / hoursPerMonth : 0;

  const calculateProcedurePrice = (form: typeof procForm) => {
    const materialsCost = form.materials.reduce((acc, mat) => acc + (Number(mat.quantity) * Number(mat.unitCost)), 0);
    const timeCost = (Number(form.durationMinutes) / 60) * clinicalHourValue;
    const baseCost = materialsCost + timeCost;
    
    const totalPercent = (Number(form.taxesPercent) + Number(form.cardFeePercent) + Number(form.profitMarginPercent)) / 100;
    const finalPrice = totalPercent < 1 ? baseCost / (1 - totalPercent) : baseCost;
    
    const finalPriceWithDifficulty = finalPrice * (1 + (Number(form.difficultyPercent) / 100));
    
    return { finalPrice, finalPriceWithDifficulty, materialsCost, timeCost };
  };

  const handleSaveProcedure = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    try {
      const { finalPrice, finalPriceWithDifficulty } = calculateProcedurePrice(procForm);
      const data = {
        ...procForm,
        finalPrice,
        finalPriceWithDifficulty,
        dentistId: auth.currentUser.uid,
        updatedAt: new Date().toISOString()
      };
      
      if (editingProc) {
        await updateDoc(doc(db, 'procedure_templates', editingProc.id), data);
      } else {
        await addDoc(collection(db, 'procedure_templates'), { ...data, createdAt: new Date().toISOString() });
      }
      setIsProcModalOpen(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'procedure_templates');
    }
  };

  const handleDelete = async () => {
    if (!deleteItem) return;
    try {
      const collectionName = deleteItem.type === 'expense' ? 'fixed_expenses' : 'procedure_templates';
      const itemData = deleteItem.type === 'expense' 
        ? expenses.find(e => e.id === deleteItem.id)
        : procedures.find(p => p.id === deleteItem.id);
      
      if (itemData) {
        await moveToTrash(collectionName, deleteItem.id, itemData);
      }
      setDeleteItem(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, deleteItem.type);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div>
          <h1 className="text-5xl font-black text-text-primary tracking-tight">Precificação</h1>
          <p className="text-text-secondary mt-2 font-medium">CALCULE SUA HORA CLÍNICA E PRECIFIQUE SEUS PROCEDIMENTOS</p>
        </div>
      </div>

      <div className="inline-flex p-1.5 bg-zinc-100 dark:bg-zinc-800/50 rounded-2xl border border-zinc-200/50 dark:border-zinc-800 mb-8 overflow-hidden">
        <button
          onClick={() => setActiveTab('hour')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
            activeTab === 'hour' 
              ? 'bg-white dark:bg-zinc-700 text-pink-600 dark:text-pink-400 shadow-sm' 
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          <Clock className="w-4 h-4" />
          Hora Clínica
        </button>
        <button
          onClick={() => setActiveTab('procedures')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
            activeTab === 'procedures' 
              ? 'bg-white dark:bg-zinc-700 text-pink-600 dark:text-pink-400 shadow-sm' 
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          <Calculator className="w-4 h-4" />
          Procedimentos
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'hour' ? (
          <motion.div key="hour" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="bg-surface p-8 rounded-[32px] border border-zinc-200/50 dark:border-zinc-800 shadow-sm">
                <h3 className="text-xl font-black text-text-primary mb-6 flex items-center gap-3 tracking-tight">
                  <Clock className="w-6 h-6 text-pink-500" /> Jornada
                </h3>
                <div className="space-y-6">
                  <div>
                    <label className="block text-[10px] font-black text-text-secondary uppercase tracking-widest mb-2">Horas por dia</label>
                    <input type="number" value={settings.workHoursPerDay} onChange={(e) => handleSaveSettings('workHoursPerDay', e.target.value === '' ? 0 : Number(e.target.value))} className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-5 py-3 text-sm focus:ring-2 focus:ring-pink-500/20 outline-none transition-all" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-text-secondary uppercase tracking-widest mb-2">Dias por semana</label>
                    <input type="number" value={settings.workDaysPerWeek} onChange={(e) => handleSaveSettings('workDaysPerWeek', e.target.value === '' ? 0 : Number(e.target.value))} className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-5 py-3 text-sm focus:ring-2 focus:ring-pink-500/20 outline-none transition-all" />
                  </div>
                  <div className="pt-6 border-t border-zinc-100 dark:border-zinc-800">
                    <p className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Trabalhadas no mês</p>
                    <p className="text-4xl font-black text-text-primary mt-1 tracking-tight">{Math.round(hoursPerMonth)}h</p>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-2 bg-surface p-12 rounded-[32px] border border-zinc-200/50 dark:border-zinc-800 shadow-sm flex flex-col justify-center items-center text-center relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-48 h-48 bg-pink-500/5 rounded-bl-full -mr-20 -mt-20 group-hover:bg-pink-500/10 transition-all duration-500" />
                <div className="w-20 h-20 bg-pink-50 dark:bg-pink-500/10 text-pink-600 dark:text-pink-400 rounded-[28px] flex items-center justify-center mb-6 shadow-sm group-hover:scale-110 transition-transform duration-300">
                  <DollarSign className="w-10 h-10" />
                </div>
                <h3 className="text-xs font-black text-text-secondary mb-3 uppercase tracking-[0.2em]">Valor da Hora Clínica</h3>
                <p className="text-6xl sm:text-7xl font-black text-text-primary tracking-tighter">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(clinicalHourValue)}
                </p>
                <div className="mt-8 px-6 py-2 bg-zinc-50 dark:bg-zinc-800/50 rounded-full border border-zinc-100 dark:border-zinc-700 text-xs font-medium text-text-secondary italic">
                  Custo fixo base para precificação de procedimentos
                </div>
              </div>
            </div>

            <div className="bg-surface rounded-[32px] border border-zinc-200/50 dark:border-zinc-800 shadow-sm overflow-hidden">
              <div className="p-8 border-b border-zinc-100 dark:border-zinc-800 flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-zinc-50/30 dark:bg-zinc-800/20">
                <div>
                  <h3 className="text-xl font-black text-text-primary tracking-tight">Custos Fixos</h3>
                  <p className="text-xs text-text-secondary mt-1 font-medium italic">GESTÃO DE DESPESAS OPERACIONAIS</p>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <label className="cursor-pointer bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-text-primary px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all text-xs font-black uppercase tracking-widest border border-zinc-200 dark:border-zinc-700">
                    {isUploading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    {isUploading ? 'Lendo...' : 'Analisar Fatura'}
                    <input type="file" accept="image/*,.pdf" className="hidden" onChange={handleFileUpload} disabled={isUploading} />
                  </label>
                  <button 
                    onClick={() => { 
                      setEditingExpense(null); 
                      setExpenseForm({ name: '', minValue: 0, maxValue: 0, periodicity: 'monthly' }); 
                      setIsExpenseModalOpen(true); 
                    }} 
                    className="bg-pink-600 hover:bg-pink-700 text-white px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all text-xs font-black uppercase tracking-widest shadow-lg shadow-pink-500/20 active:scale-95"
                  >
                    <Plus className="w-4 h-4" /> Adicionar Custo
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-zinc-50 dark:bg-zinc-900/50 text-text-secondary">
                    <tr>
                      <th className="px-8 py-5 font-black uppercase tracking-widest text-[10px]">Despesa</th>
                      <th className="px-8 py-5 font-black uppercase tracking-widest text-[10px]">Periodicidade</th>
                      <th className="px-8 py-5 font-black uppercase tracking-widest text-[10px]">Valor Médio</th>
                      <th className="px-8 py-5 font-black uppercase tracking-widest text-[10px] text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {expenses.map(exp => (
                      <tr key={exp.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors group">
                        <td className="px-8 py-5 font-bold text-text-primary group-hover:text-pink-600 transition-colors">{exp.name}</td>
                        <td className="px-8 py-5 text-text-secondary">
                          <span className="px-2.5 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-[10px] font-black uppercase tracking-widest">
                            {exp.periodicity === 'monthly' ? 'Mensal' : exp.periodicity === 'yearly' ? 'Anual' : exp.periodicity === 'weekly' ? 'Semanal' : 'Pontual'}
                          </span>
                        </td>
                        <td className="px-8 py-5 font-bold text-text-primary">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((exp.minValue + exp.maxValue) / 2)}
                        </td>
                        <td className="px-8 py-5 text-right">
                          <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                            <button onClick={() => { setEditingExpense(exp); setExpenseForm({ name: exp.name, minValue: exp.minValue, maxValue: exp.maxValue, periodicity: exp.periodicity }); setIsExpenseModalOpen(true); }} className="p-2 text-zinc-400 hover:text-pink-600 hover:bg-pink-50 dark:hover:bg-pink-500/10 rounded-lg">
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => setDeleteItem({ type: 'expense', id: exp.id })} className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {expenses.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-8 py-12 text-center text-text-secondary font-medium italic">Nenhum custo fixo cadastrado.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div key="procedures" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-black text-text-primary tracking-tight">Templates</h3>
                <p className="text-xs text-text-secondary font-medium mt-1 uppercase tracking-widest">Base de cálculos por procedimento</p>
              </div>
              <button 
                onClick={() => { 
                  setEditingProc(null); 
                  setProcForm({ name: '', durationMinutes: 60, taxesPercent: 0, cardFeePercent: 0, profitMarginPercent: 0, difficultyPercent: 0, materials: [] }); 
                  setIsProcModalOpen(true); 
                }} 
                className="bg-pink-600 hover:bg-pink-700 text-white px-6 py-3 rounded-2xl flex items-center gap-2 transition-all font-black text-xs uppercase tracking-widest shadow-lg shadow-pink-500/20 active:scale-95"
              >
                <Plus className="w-4 h-4" /> Novo Procedimento
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {procedures.map(proc => (
                <div key={proc.id} className="bg-surface p-8 rounded-[32px] border border-zinc-200/50 dark:border-zinc-800 shadow-sm flex flex-col group hover:border-pink-500/50 transition-all duration-300">
                  <div className="flex justify-between items-start mb-6">
                    <h3 className="font-black text-lg text-text-primary tracking-tight group-hover:text-pink-600 transition-colors">{proc.name}</h3>
                    <div className="flex gap-2">
                      <button onClick={() => { setEditingProc(proc); setProcForm(proc as any); setIsProcModalOpen(true); }} className="p-2 text-zinc-400 hover:text-pink-600 hover:bg-pink-50 dark:hover:bg-pink-500/10 rounded-xl transition-all">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => setDeleteItem({ type: 'procedure', id: proc.id })} className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-3 text-sm text-text-secondary mb-8 flex-1">
                    <div className="flex justify-between items-center bg-zinc-50 dark:bg-zinc-800/50 p-2.5 rounded-xl border border-zinc-100 dark:border-zinc-700">
                      <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"><Clock className="w-3.5 h-3.5 text-pink-500"/> Duração</span> 
                      <span className="font-bold text-text-primary">{proc.durationMinutes} min</span>
                    </div>
                    <div className="flex justify-between items-center p-1 px-2.5">
                      <span className="text-[10px] font-black uppercase tracking-widest">Materiais</span> 
                      <span className="font-bold text-text-primary">{proc.materials.length} itens</span>
                    </div>
                    <div className="flex justify-between items-center p-1 px-2.5">
                      <span className="text-[10px] font-black uppercase tracking-widest">Margem de Lucro</span> 
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">{proc.profitMarginPercent}%</span>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-zinc-100 dark:border-zinc-800">
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-[10px] font-black text-text-secondary mb-1 uppercase tracking-widest">Sugestão de Preço</p>
                        <p className="text-3xl font-black text-pink-600 dark:text-pink-400 tracking-tight">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(proc.finalPrice)}
                        </p>
                      </div>
                      {proc.difficultyPercent > 0 && (
                        <div className="text-right">
                          <span className="px-2 py-1 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[8px] font-black uppercase tracking-widest rounded-lg border border-amber-100 dark:border-amber-500/20">+{proc.difficultyPercent}% Dif.</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {procedures.length === 0 && (
                <div className="col-span-full text-center py-20 bg-zinc-50 dark:bg-zinc-800/20 rounded-[32px] border border-dashed border-zinc-300 dark:border-zinc-700">
                  <p className="text-text-secondary font-medium italic">Nenhum procedimento cadastrado.</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmModal
        isOpen={!!deleteItem}
        title="Excluir Item"
        message="Tem certeza que deseja excluir este item? Esta ação moverá o item para a lixeira."
        onConfirm={handleDelete}
        onCancel={() => setDeleteItem(null)}
      />

      {/* Expense Modal (Refined) */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-surface rounded-[32px] p-8 w-full max-w-md border border-zinc-200 dark:border-zinc-800 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-pink-500/5 rounded-bl-full -mr-12 -mt-12" />
            <h2 className="text-2xl font-black text-text-primary mb-8 tracking-tight capitalize">{editingExpense ? 'Editar Custo' : 'Novo Custo Fixo'}</h2>
            <form onSubmit={handleSaveExpense} className="space-y-6">
              <div>
                <label className="block text-[10px] font-black text-text-secondary uppercase tracking-widest mb-2">Nome da Despesa</label>
                <input type="text" required value={expenseForm.name} onChange={e => setExpenseForm({...expenseForm, name: e.target.value})} className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-5 py-3 text-sm focus:ring-2 focus:ring-pink-500/20 outline-none transition-all" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-text-secondary uppercase tracking-widest mb-2">Valor Mínimo</label>
                  <input type="number" step="0.01" required value={expenseForm.minValue} onChange={e => setExpenseForm({...expenseForm, minValue: e.target.value === '' ? '' : Number(e.target.value)})} className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-5 py-3 text-sm focus:ring-2 focus:ring-pink-500/20 outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-text-secondary uppercase tracking-widest mb-2">Valor Máximo</label>
                  <input type="number" step="0.01" required value={expenseForm.maxValue} onChange={e => setExpenseForm({...expenseForm, maxValue: e.target.value === '' ? '' : Number(e.target.value)})} className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-5 py-3 text-sm focus:ring-2 focus:ring-pink-500/20 outline-none transition-all" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-text-secondary uppercase tracking-widest mb-2">Periodicidade</label>
                <select value={expenseForm.periodicity} onChange={e => setExpenseForm({...expenseForm, periodicity: e.target.value as any})} className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-5 py-3 text-sm focus:ring-2 focus:ring-pink-500/20 outline-none transition-all">
                  <option value="monthly">Mensal</option>
                  <option value="yearly">Anual</option>
                  <option value="weekly">Semanal</option>
                  <option value="one-time">Pontual</option>
                </select>
              </div>
              <div className="flex gap-3 mt-8">
                <button type="button" onClick={() => setIsExpenseModalOpen(false)} className="flex-1 px-6 py-3 text-xs font-black uppercase tracking-widest text-text-secondary hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-2xl transition-all">Cancelar</button>
                <button type="submit" className="flex-1 px-6 py-3 bg-pink-600 text-white text-xs font-black uppercase tracking-widest rounded-2xl hover:bg-pink-700 shadow-lg shadow-pink-500/20 transition-all">Salvar</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default Pricing;
