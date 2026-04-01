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

        const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
        const prompt = `Analise esta fatura/conta. Extraia as seguintes informações em formato JSON:
        {
          "name": "Nome da despesa (ex: Conta de Luz, Aluguel, Internet)",
          "value": "Valor numérico da fatura",
          "periodicity": "monthly" | "yearly" | "weekly" | "one-time" (geralmente contas de consumo são monthly)
        }
        Retorne APENAS o JSON válido, sem formatação markdown ou texto adicional.`;

        const response = await ai.models.generateContent({
          model: 'gemini-2.0-flash',
          contents: [
            {
              role: 'user',
              parts: [
                { text: prompt },
                { inlineData: { data: base64Data, mimeType } }
              ]
            }
          ]
        });

        const text = response.text?.replace(/```json/g, '').replace(/```/g, '').trim();
        if (text) {
          const result = JSON.parse(text);
          
          // Check if similar expense exists
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

  // Calculations
  const calculateMonthlyExpenses = () => {
    return expenses.reduce((acc, exp) => {
      const avgValue = (exp.minValue + exp.maxValue) / 2;
      if (exp.periodicity === 'monthly') return acc + avgValue;
      if (exp.periodicity === 'yearly') return acc + (avgValue / 12);
      if (exp.periodicity === 'weekly') return acc + (avgValue * 4.33);
      return acc; // one-time not counted in fixed monthly
    }, 0);
  };

  const monthlyExpenses = calculateMonthlyExpenses();
  const hoursPerMonth = settings.workHoursPerDay * settings.workDaysPerWeek * 4.33;
  const clinicalHourValue = hoursPerMonth > 0 ? monthlyExpenses / hoursPerMonth : 0;

  const calculateProcedurePrice = (form: typeof procForm) => {
    const materialsCost = form.materials.reduce((acc, mat) => acc + (Number(mat.quantity) * Number(mat.unitCost)), 0);
    const timeCost = (Number(form.durationMinutes) / 60) * clinicalHourValue;
    const baseCost = materialsCost + timeCost;
    
    // Price = Cost / (1 - (Taxes + CardFee + ProfitMargin))
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Precificação</h1>
          <p className="text-text-secondary mt-1">Calcule sua hora clínica e precifique seus procedimentos</p>
        </div>
      </div>

      <div className="flex border-b border-zinc-200 dark:border-zinc-800">
        <button
          onClick={() => setActiveTab('hour')}
          className={`px-6 py-3 font-medium text-sm transition-colors relative ${
            activeTab === 'hour' ? 'text-indigo-600 dark:text-indigo-400' : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Hora Clínica
          </div>
          {activeTab === 'hour' && (
            <motion.div layoutId="pricingTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-400" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('procedures')}
          className={`px-6 py-3 font-medium text-sm transition-colors relative ${
            activeTab === 'procedures' ? 'text-indigo-600 dark:text-indigo-400' : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          <div className="flex items-center gap-2">
            <Calculator className="w-4 h-4" />
            Procedimentos
          </div>
          {activeTab === 'procedures' && (
            <motion.div layoutId="pricingTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-400" />
          )}
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'hour' ? (
          <motion.div key="hour" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-surface p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                <h3 className="text-lg font-medium text-text-primary mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-indigo-500" /> Jornada de Trabalho
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-text-secondary mb-1">Horas por dia</label>
                    <input type="number" value={settings.workHoursPerDay} onChange={(e) => handleSaveSettings('workHoursPerDay', e.target.value === '' ? 0 : Number(e.target.value))} className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2" />
                  </div>
                  <div>
                    <label className="block text-sm text-text-secondary mb-1">Dias por semana</label>
                    <input type="number" value={settings.workDaysPerWeek} onChange={(e) => handleSaveSettings('workDaysPerWeek', e.target.value === '' ? 0 : Number(e.target.value))} className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2" />
                  </div>
                  <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800">
                    <p className="text-sm text-text-secondary">Horas trabalhadas no mês</p>
                    <p className="text-2xl font-bold text-text-primary">{Math.round(hoursPerMonth)}h</p>
                  </div>
                </div>
              </div>

              <div className="md:col-span-2 bg-surface p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col justify-center items-center text-center">
                <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mb-4">
                  <DollarSign className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-medium text-text-secondary mb-2">Valor da Hora Clínica</h3>
                <p className="text-5xl font-bold text-text-primary">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(clinicalHourValue)}
                </p>
                <p className="text-sm text-text-secondary mt-4 max-w-md">
                  Este é o custo fixo do seu consultório por cada hora trabalhada. Use este valor como base para precificar seus procedimentos.
                </p>
              </div>
            </div>

      <div className="bg-surface rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-zinc-200 dark:border-zinc-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <h3 className="text-lg font-medium text-text-primary">Custos Fixos</h3>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <label className="cursor-pointer bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-text-primary px-4 py-2 rounded-xl flex items-center justify-center gap-2 transition-colors text-sm font-medium">
              {isUploading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {isUploading ? 'Analisando...' : 'Ler Fatura (IA)'}
              <input type="file" accept="image/*,.pdf" className="hidden" onChange={handleFileUpload} disabled={isUploading} />
            </label>
            <button 
              onClick={() => { 
                setEditingExpense(null); 
                setExpenseForm({ name: '', minValue: 0, maxValue: 0, periodicity: 'monthly' }); 
                setIsExpenseModalOpen(true); 
              }} 
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl flex items-center justify-center gap-2 transition-colors text-sm font-medium"
            >
              <Plus className="w-4 h-4" /> Adicionar Custo
            </button>
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-900/50 text-text-secondary">
              <tr>
                <th className="px-6 py-3 font-medium">Despesa</th>
                <th className="px-6 py-3 font-medium">Periodicidade</th>
                <th className="px-6 py-3 font-medium">Valor (Mín - Máx)</th>
                <th className="px-6 py-3 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {expenses.map(exp => (
                <tr key={exp.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                  <td className="px-6 py-4 font-medium text-text-primary">{exp.name}</td>
                  <td className="px-6 py-4 text-text-secondary">
                    {exp.periodicity === 'monthly' ? 'Mensal' : exp.periodicity === 'yearly' ? 'Anual' : exp.periodicity === 'weekly' ? 'Semanal' : 'Pontual'}
                  </td>
                  <td className="px-6 py-4 text-text-secondary">
                    {exp.minValue === exp.maxValue 
                      ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(exp.minValue)
                      : `${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(exp.minValue)} - ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(exp.maxValue)}`
                    }
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => { setEditingExpense(exp); setExpenseForm({ name: exp.name, minValue: exp.minValue, maxValue: exp.maxValue, periodicity: exp.periodicity }); setIsExpenseModalOpen(true); }} className="p-2 text-zinc-400 hover:text-indigo-600 transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => setDeleteItem({ type: 'expense', id: exp.id })} className="p-2 text-zinc-400 hover:text-red-500 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {expenses.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-text-secondary">Nenhum custo fixo cadastrado.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden divide-y divide-zinc-200 dark:divide-zinc-800">
          {expenses.map(exp => (
            <div key={exp.id} className="p-4 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-bold text-text-primary">{exp.name}</h4>
                  <p className="text-xs text-text-secondary">
                    {exp.periodicity === 'monthly' ? 'Mensal' : exp.periodicity === 'yearly' ? 'Anual' : exp.periodicity === 'weekly' ? 'Semanal' : 'Pontual'}
                  </p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => { setEditingExpense(exp); setExpenseForm({ name: exp.name, minValue: exp.minValue, maxValue: exp.maxValue, periodicity: exp.periodicity }); setIsExpenseModalOpen(true); }} className="p-2 text-zinc-400 hover:text-indigo-600 transition-colors">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => setDeleteItem({ type: 'expense', id: exp.id })} className="p-2 text-zinc-400 hover:text-red-500 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-text-secondary tracking-wider">Valor</p>
                <p className="text-sm font-medium text-text-primary">
                  {exp.minValue === exp.maxValue 
                    ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(exp.minValue)
                    : `${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(exp.minValue)} - ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(exp.maxValue)}`
                  }
                </p>
              </div>
            </div>
          ))}
          {expenses.length === 0 && (
            <div className="p-8 text-center text-text-secondary">Nenhum custo fixo cadastrado.</div>
          )}
        </div>
      </div>
          </motion.div>
        ) : (
          <motion.div key="procedures" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
            <div className="flex justify-end">
              <button onClick={() => { 
                setEditingProc(null); 
                setProcForm({ name: '', durationMinutes: 60, taxesPercent: 0, cardFeePercent: 0, profitMarginPercent: 0, difficultyPercent: 0, materials: [] }); 
                setIsProcModalOpen(true); 
              }} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-colors text-sm font-medium">
                <Plus className="w-4 h-4" /> Novo Procedimento
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {procedures.map(proc => (
                <div key={proc.id} className="bg-surface p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="font-bold text-lg text-text-primary">{proc.name}</h3>
                    <div className="flex gap-1">
                      <button onClick={() => { setEditingProc(proc); setProcForm(proc as any); setIsProcModalOpen(true); }} className="p-1.5 text-zinc-400 hover:text-indigo-600 transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => setDeleteItem({ type: 'procedure', id: proc.id })} className="p-1.5 text-zinc-400 hover:text-red-500 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm text-text-secondary mb-6 flex-1">
                    <div className="flex justify-between"><span className="flex items-center gap-1"><Clock className="w-3 h-3"/> Duração</span> <span>{proc.durationMinutes} min</span></div>
                    <div className="flex justify-between"><span>Materiais</span> <span>{proc.materials.length} itens</span></div>
                    <div className="flex justify-between"><span>Margem de Lucro</span> <span>{proc.profitMarginPercent}%</span></div>
                  </div>

                  <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800">
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-xs text-text-secondary mb-1">Valor Sugerido</p>
                        <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(proc.finalPrice)}
                        </p>
                      </div>
                      {proc.difficultyPercent > 0 && (
                        <div className="text-right">
                          <p className="text-xs text-text-secondary mb-1">Com Dificuldade (+{proc.difficultyPercent}%)</p>
                          <p className="text-lg font-bold text-amber-600 dark:text-amber-400">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(proc.finalPriceWithDifficulty)}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {procedures.length === 0 && (
                <div className="col-span-full text-center py-12 bg-surface rounded-2xl border border-zinc-200 dark:border-zinc-800">
                  <p className="text-text-secondary">Nenhum procedimento cadastrado.</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Expense Modal */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-2xl p-6 w-full max-w-md border border-zinc-200 dark:border-zinc-800 shadow-xl">
            <h2 className="text-xl font-bold text-text-primary mb-6">{editingExpense ? 'Editar Custo' : 'Novo Custo Fixo'}</h2>
            <form onSubmit={handleSaveExpense} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Nome da Despesa</label>
                <input type="text" required value={expenseForm.name} onChange={e => setExpenseForm({...expenseForm, name: e.target.value})} className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Valor Mínimo</label>
                  <input type="number" step="0.01" required value={expenseForm.minValue} onChange={e => setExpenseForm({...expenseForm, minValue: e.target.value === '' ? '' : Number(e.target.value)})} className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Valor Máximo</label>
                  <input type="number" step="0.01" required value={expenseForm.maxValue} onChange={e => setExpenseForm({...expenseForm, maxValue: e.target.value === '' ? '' : Number(e.target.value)})} className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Periodicidade</label>
                <select value={expenseForm.periodicity} onChange={e => setExpenseForm({...expenseForm, periodicity: e.target.value as any})} className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2">
                  <option value="monthly">Mensal</option>
                  <option value="yearly">Anual</option>
                  <option value="weekly">Semanal</option>
                  <option value="one-time">Pontual</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setIsExpenseModalOpen(false)} className="px-4 py-2 text-text-secondary hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Procedure Modal */}
      {isProcModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-2xl p-6 w-full max-w-2xl border border-zinc-200 dark:border-zinc-800 shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-text-primary mb-6">{editingProc ? 'Editar Procedimento' : 'Novo Procedimento'}</h2>
            <form onSubmit={handleSaveProcedure} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-text-secondary mb-1">Nome do Procedimento</label>
                  <input type="text" required value={procForm.name} onChange={e => setProcForm({...procForm, name: e.target.value})} className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Duração (minutos)</label>
                  <input type="number" required value={procForm.durationMinutes} onChange={e => setProcForm({...procForm, durationMinutes: e.target.value === '' ? '' : Number(e.target.value)})} className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Margem de Lucro (%)</label>
                  <input type="number" required value={procForm.profitMarginPercent} onChange={e => setProcForm({...procForm, profitMarginPercent: e.target.value === '' ? '' : Number(e.target.value)})} className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Impostos (%)</label>
                  <input type="number" required value={procForm.taxesPercent} onChange={e => setProcForm({...procForm, taxesPercent: e.target.value === '' ? '' : Number(e.target.value)})} className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Taxa Cartão (%)</label>
                  <input type="number" required value={procForm.cardFeePercent} onChange={e => setProcForm({...procForm, cardFeePercent: e.target.value === '' ? '' : Number(e.target.value)})} className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-text-secondary mb-1">Taxa de Dificuldade Opcional (%)</label>
                  <input type="number" value={procForm.difficultyPercent} onChange={e => setProcForm({...procForm, difficultyPercent: e.target.value === '' ? '' : Number(e.target.value)})} className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2" />
                </div>
              </div>

              <div className="border-t border-zinc-200 dark:border-zinc-800 pt-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-medium text-text-primary">Materiais Necessários</h3>
                  <button type="button" onClick={() => setProcForm({...procForm, materials: [...procForm.materials, { inventoryItemId: '', name: '', quantity: 1, unitCost: 0 }]})} className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
                    <Plus className="w-4 h-4" /> Adicionar
                  </button>
                </div>
                <div className="space-y-4">
                  {procForm.materials.map((mat, idx) => (
                    <div key={idx} className="p-4 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl border border-zinc-200 dark:border-zinc-700 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-text-secondary uppercase">Material {idx + 1}</span>
                        <button type="button" onClick={() => {
                          const newMats = procForm.materials.filter((_, i) => i !== idx);
                          setProcForm({...procForm, materials: newMats});
                        }} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="sm:col-span-1">
                          <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1">Item</label>
                          <select 
                            value={mat.inventoryItemId} 
                            onChange={(e) => {
                              const item = inventory.find(i => i.id === e.target.value);
                              if (item) {
                                const newMats = [...procForm.materials];
                                newMats[idx] = { 
                                  ...mat, 
                                  inventoryItemId: item.id, 
                                  name: item.name, 
                                  unitCost: item.price || 0 
                                };
                                setProcForm({...procForm, materials: newMats});
                              }
                            }}
                            className="w-full bg-surface border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm"
                          >
                            <option value="">Selecione...</option>
                            {inventory.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1">Quantidade</label>
                          <input type="number" placeholder="Qtd" value={mat.quantity} onChange={e => {
                            const newMats = [...procForm.materials];
                            newMats[idx].quantity = e.target.value === '' ? '' : Number(e.target.value);
                            setProcForm({...procForm, materials: newMats});
                          }} className="w-full bg-surface border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1">Custo Unit.</label>
                          <input type="number" placeholder="Custo" step="0.01" value={mat.unitCost} onChange={e => {
                            const newMats = [...procForm.materials];
                            newMats[idx].unitCost = e.target.value === '' ? '' : Number(e.target.value);
                            setProcForm({...procForm, materials: newMats});
                          }} className="w-full bg-surface border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm" />
                        </div>
                      </div>
                    </div>
                  ))}
                  {procForm.materials.length === 0 && <p className="text-sm text-text-secondary text-center py-4 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700">Nenhum material adicionado.</p>}
                </div>
              </div>

              <div className="bg-indigo-50 dark:bg-indigo-500/10 p-4 rounded-xl border border-indigo-100 dark:border-indigo-500/20">
                <h4 className="font-medium text-indigo-900 dark:text-indigo-300 mb-2">Resumo da Precificação</h4>
                {(() => {
                  const { finalPrice, finalPriceWithDifficulty, materialsCost, timeCost } = calculateProcedurePrice(procForm);
                  return (
                    <div className="space-y-1 text-sm text-indigo-800 dark:text-indigo-400">
                      <div className="flex justify-between"><span>Custo de Materiais:</span> <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(materialsCost)}</span></div>
                      <div className="flex justify-between"><span>Custo de Tempo ({procForm.durationMinutes}m):</span> <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(timeCost)}</span></div>
                      <div className="flex justify-between font-bold mt-2 pt-2 border-t border-indigo-200 dark:border-indigo-500/30">
                        <span>Preço Final Sugerido:</span> 
                        <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(finalPrice)}</span>
                      </div>
                      {Number(procForm.difficultyPercent) > 0 && (
                        <div className="flex justify-between font-bold text-amber-600 dark:text-amber-400">
                          <span>Com Dificuldade (+{procForm.difficultyPercent}%):</span> 
                          <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(finalPriceWithDifficulty)}</span>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setIsProcModalOpen(false)} className="px-4 py-2 text-text-secondary hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700">Salvar Procedimento</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!deleteItem}
        title="Excluir Item"
        message="Tem certeza que deseja excluir este item? Esta ação não pode ser desfeita."
        onConfirm={handleDelete}
        onCancel={() => setDeleteItem(null)}
      />
    </div>
  );
};

export default Pricing;
