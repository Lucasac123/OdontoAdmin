import React, { useState, useEffect } from 'react';
import { doc, updateDoc, collection, onSnapshot, query, where } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../../firebase';
import { Patient, ProcedureTemplate } from '../../types';
import { Save, Loader2, Plus, Trash2, Printer, DollarSign } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CRMTab } from './CRMTab';
import { useSync } from '../../context/SyncContext';

interface Procedure {
  id: string;
  name: string;
  tooth: string;
  quantity: number;
  unitPrice: number;
  cost: number; // Total price
}

export const TreatmentPlanTab = ({ patient }: { patient: Patient }) => {
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [templates, setTemplates] = useState<ProcedureTemplate[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [newProcedure, setNewProcedure] = useState({ name: '', tooth: '', quantity: '1', unitPrice: '' });
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  
  const [treatmentStatus, setTreatmentStatus] = useState<'Planejado' | 'Em Andamento' | 'Concluído'>(patient.treatmentStatus || 'Planejado');
  const [startDate, setStartDate] = useState(patient.treatmentStartDate || '');
  const [endDate, setEndDate] = useState(patient.treatmentEndDate || '');
  const [hasChanges, setHasChanges] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const { addSyncTask } = useSync();

  useEffect(() => {
    if (patient.odontogram) {
      try {
        const parsed = JSON.parse(patient.odontogram);
        if (parsed.treatmentPlan) {
          setProcedures(parsed.treatmentPlan);
        }
      } catch (e) {
        console.error("Failed to parse treatment plan", e);
      }
    }
  }, [patient.odontogram]);

  useEffect(() => {
    if (!auth.currentUser) return;
    const q = query(
      collection(db, 'procedure_templates'),
      where('dentistId', '==', auth.currentUser.uid)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedTemplates = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ProcedureTemplate[];
      setTemplates(loadedTemplates);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'procedure_templates');
    });
    return () => unsubscribe();
  }, []);

  const handleSave = () => {
    const currentOdontogram = patient.odontogram ? JSON.parse(patient.odontogram) : {};
    currentOdontogram.treatmentPlan = procedures;
    
    const savePromise = updateDoc(doc(db, 'patients', patient.id), {
      odontogram: JSON.stringify(currentOdontogram),
      treatmentStatus,
      treatmentStartDate: startDate,
      treatmentEndDate: endDate,
      updatedAt: new Date().toISOString()
    }).catch(error => {
      handleFirestoreError(error, OperationType.UPDATE, `patients/${patient.id}`);
    });
    
    addSyncTask(savePromise);
    setHasChanges(false);
  };

  const handleAddProcedure = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProcedure.name || !newProcedure.unitPrice || !newProcedure.quantity) return;

    const qty = parseFloat(newProcedure.quantity);
    const unitP = parseFloat(newProcedure.unitPrice);
    const total = qty * unitP;

    setProcedures(prev => {
      const updated = [...prev, {
        id: Date.now().toString(),
        name: newProcedure.name,
        tooth: newProcedure.tooth,
        quantity: qty,
        unitPrice: unitP,
        cost: total
      }];
      setHasChanges(true);
      return updated;
    });

    setNewProcedure({ name: '', tooth: '', quantity: '1', unitPrice: '' });
    setSelectedTemplateId('');
  };

  const handleTemplateSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const templateId = e.target.value;
    setSelectedTemplateId(templateId);
    
    if (templateId) {
      const template = templates.find(t => t.id === templateId);
      if (template) {
        setNewProcedure(prev => ({
          ...prev,
          name: template.name,
          unitPrice: template.finalPriceWithDifficulty.toString()
        }));
      }
    } else {
      setNewProcedure(prev => ({
        ...prev,
        name: '',
        unitPrice: ''
      }));
    }
  };

  const deleteProcedure = (id: string) => {
    setProcedures(prev => {
      const updated = prev.filter(p => p.id !== id);
      setHasChanges(true);
      return updated;
    });
    setDeleteConfirmId(null);
  };

  const totalCost = procedures.reduce((acc, curr) => acc + curr.cost, 0);

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Plano de Tratamento - ${patient.name}</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 40px; line-height: 1.6; }
              .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 40px; }
              table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
              th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
              th { background-color: #f5f5f5; }
              .total { text-align: right; font-size: 18px; font-weight: bold; margin-top: 20px; }
              .footer { text-align: center; margin-top: 100px; font-size: 14px; color: #666; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>PLANO DE TRATAMENTO E ORÇAMENTO</h1>
              <p>Paciente: ${patient.name}</p>
              <p>Status: ${treatmentStatus}</p>
              ${startDate ? `<p>Data de Início: ${new Date(startDate).toLocaleDateString('pt-BR')}</p>` : ''}
              ${endDate ? `<p>Previsão de Fim: ${new Date(endDate).toLocaleDateString('pt-BR')}</p>` : ''}
              <p>Data de Emissão: ${new Date().toLocaleDateString('pt-BR')}</p>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Procedimento</th>
                  <th>Dente/Região</th>
                  <th>Qtd</th>
                  <th>V. Unitário</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                ${procedures.map(p => `
                  <tr>
                    <td>${p.name}</td>
                    <td>${p.tooth || '-'}</td>
                    <td>${p.quantity || 1}</td>
                    <td>${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.unitPrice || p.cost)}</td>
                    <td>${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.cost)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            <div class="total">
              Total: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalCost)}
            </div>
            <div class="footer">
              <p>___________________________________</p>
              <p>Assinatura do Paciente</p>
            </div>
            <script>window.print(); window.close();</script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  return (
    <div className="space-y-6">
      <AnimatePresence>
        {hasChanges && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 p-4 rounded-2xl flex items-center justify-between mb-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400">
                  <Save className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <p className="text-sm font-bold text-amber-900 dark:text-amber-300">Alterações Não Salvas</p>
                  <p className="text-xs text-amber-700 dark:text-amber-400/80">Lembre-se de salvar antes de sair desta aba.</p>
                </div>
              </div>
              <button 
                onClick={handleSave}
                disabled={isSaving}
                className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg dark:shadow-none flex items-center gap-2 transition-all active:scale-95"
              >
                <Save className="w-4 h-4" />
                <span className="truncate">Salvar Agora</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
              <DollarSign className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              Plano de Tratamento
            </h2>
            <div className="flex items-center gap-3">
              <button 
                onClick={handlePrint}
                disabled={procedures.length === 0}
                className="flex items-center gap-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-4 py-2 rounded-xl hover:bg-zinc-800 dark:hover:bg-zinc-100 disabled:opacity-50 transition-colors"
              >
                <Printer className="w-4 h-4" />
                Imprimir
              </button>
              <button 
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Salvar
              </button>
            </div>
          </div>

          <div className="bg-surface rounded-3xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-text-primary mb-4">Informações do Plano</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1 uppercase tracking-wider">Status do Tratamento</label>
                <select 
                  value={treatmentStatus}
                  disabled={isSaving}
                  onChange={(e) => { setTreatmentStatus(e.target.value as any); setHasChanges(true); }}
                  className="w-full bg-surface border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2 text-sm text-text-primary focus:ring-2 focus:ring-indigo-500 outline-none disabled:opacity-50"
                >
                  <option value="Planejado">Planejado</option>
                  <option value="Em Andamento">Em Andamento</option>
                  <option value="Concluído">Concluído</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1 uppercase tracking-wider">Data de Início</label>
                <input 
                  type="date"
                  value={startDate}
                  disabled={isSaving}
                  onChange={(e) => { setStartDate(e.target.value); setHasChanges(true); }}
                  className="w-full bg-surface border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2 text-sm text-text-primary focus:ring-2 focus:ring-indigo-500 outline-none disabled:opacity-50"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1 uppercase tracking-wider">Fim Previsto</label>
                <input 
                  type="date"
                  value={endDate}
                  disabled={isSaving}
                  onChange={(e) => { setEndDate(e.target.value); setHasChanges(true); }}
                  className="w-full bg-surface border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2 text-sm text-text-primary focus:ring-2 focus:ring-indigo-500 outline-none disabled:opacity-50"
                />
              </div>
            </div>
          </div>

          <div className="bg-surface rounded-3xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
            <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 bg-surface">
              <div className="mb-4">
                <label className="block text-sm font-medium text-text-secondary mb-1">Preencher com Template (Opcional)</label>
                <select
                  value={selectedTemplateId}
                  disabled={isSaving}
                  onChange={handleTemplateSelect}
                  className="w-full bg-surface border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2 text-text-primary focus:ring-2 focus:ring-indigo-500 outline-none disabled:opacity-50"
                >
                  <option value="">-- Selecione um procedimento pré-definido --</option>
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>{t.name} - {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(t.finalPriceWithDifficulty)}</option>
                  ))}
                </select>
              </div>
              <form onSubmit={handleAddProcedure} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                <div className="md:col-span-4">
                  <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase tracking-wider">Procedimento</label>
                  <input 
                    type="text" 
                    required 
                    disabled={isSaving}
                    value={newProcedure.name} 
                    onChange={e => setNewProcedure({...newProcedure, name: e.target.value})} 
                    placeholder="Ex: Restauração Resina MOD"
                    className="w-full bg-surface border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-text-primary focus:ring-2 focus:ring-indigo-500 outline-none transition-all disabled:opacity-50" 
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase tracking-wider">Dente/Região</label>
                  <input 
                    type="text" 
                    disabled={isSaving}
                    value={newProcedure.tooth} 
                    onChange={e => setNewProcedure({...newProcedure, tooth: e.target.value})} 
                    placeholder="Ex: 46, Maxila..."
                    className="w-full bg-surface border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-text-primary focus:ring-2 focus:ring-indigo-500 outline-none transition-all disabled:opacity-50" 
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase tracking-wider">Qtd</label>
                  <input 
                    type="number" 
                    min="1"
                    required 
                    disabled={isSaving}
                    value={newProcedure.quantity} 
                    onChange={e => setNewProcedure({...newProcedure, quantity: e.target.value})} 
                    className="w-full bg-surface border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-text-primary focus:ring-2 focus:ring-indigo-500 outline-none transition-all disabled:opacity-50" 
                  />
                </div>
                <div className="md:col-span-3">
                  <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase tracking-wider">V. Unitário (R$)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    required 
                    disabled={isSaving}
                    value={newProcedure.unitPrice} 
                    onChange={e => setNewProcedure({...newProcedure, unitPrice: e.target.value})} 
                    placeholder="0.00"
                    className="w-full bg-surface border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-text-primary focus:ring-2 focus:ring-indigo-500 outline-none transition-all disabled:opacity-50" 
                  />
                </div>
                <div className="md:col-span-1">
                  <button type="submit" disabled={isSaving} className="w-full bg-indigo-600 text-white h-[42px] rounded-xl flex items-center justify-center hover:bg-indigo-700 transition-all shadow-sm shadow-indigo-200 dark:shadow-none disabled:opacity-50">
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </form>
            </div>

            <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {procedures.length === 0 ? (
                <div className="p-8 text-center text-text-secondary">
                  Nenhum procedimento adicionado ao plano.
                </div>
              ) : (
                <AnimatePresence initial={false}>
                  {procedures.map(proc => (
                    <motion.div 
                      key={proc.id} 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="p-4 flex items-center justify-between hover:bg-surface transition-colors overflow-hidden"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-text-primary">{proc.name}</p>
                        <div className="flex gap-4 text-sm text-text-secondary">
                          {proc.tooth && <span>Dente/Região: {proc.tooth}</span>}
                          <span>Qtd: {proc.quantity || 1}</span>
                          <span>Unit: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(proc.unitPrice || proc.cost)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-semibold text-text-primary">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(proc.cost)}
                        </span>
                        <button 
                          onClick={() => setDeleteConfirmId(proc.id)}
                          disabled={isSaving}
                          className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>
          </div>
        </div>

        <div className="lg:w-80">
          <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-3xl border border-emerald-100 dark:border-emerald-800/30 p-6 h-fit">
            <h3 className="text-lg font-bold text-emerald-900 dark:text-emerald-100 mb-6">Resumo do Orçamento</h3>
            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-emerald-800 dark:text-emerald-200">Total de Procedimentos:</span>
                <span className="font-medium text-emerald-900 dark:text-emerald-100">{procedures.length}</span>
              </div>
              <div className="pt-4 border-t border-emerald-200 dark:border-emerald-800/50">
                <div className="flex justify-between items-center">
                  <span className="text-emerald-900 dark:text-emerald-100 font-bold">Valor Total:</span>
                  <span className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalCost)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-12 pt-8 border-t border-zinc-200 dark:border-zinc-800">
        <CRMTab patient={patient} />
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirmId && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-surface rounded-2xl p-6 w-full max-w-sm border border-zinc-200 dark:border-zinc-800 shadow-2xl"
            >
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-500/20 flex items-center justify-center text-red-600 dark:text-red-400 mb-4 mx-auto">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-text-primary text-center mb-2">Excluir Procedimento?</h3>
              <p className="text-sm text-text-secondary text-center mb-6">Esta alteração será permanente após você salvar o plano.</p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setDeleteConfirmId(null)}
                  className="flex-1 px-4 py-2 text-text-secondary hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => deleteProcedure(deleteConfirmId)}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium shadow-lg dark:shadow-none transition-all"
                >
                  Excluir
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
