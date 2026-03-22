import React, { useState, useEffect } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { Patient } from '../../types';
import { Save, Loader2, Plus, Trash2, Printer, DollarSign } from 'lucide-react';

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
  const [isSaving, setIsSaving] = useState(false);
  const [newProcedure, setNewProcedure] = useState({ name: '', tooth: '', quantity: '1', unitPrice: '' });
  
  const [treatmentStatus, setTreatmentStatus] = useState<'Planejado' | 'Em Andamento' | 'Concluído'>(patient.treatmentStatus || 'Planejado');
  const [startDate, setStartDate] = useState(patient.treatmentStartDate || '');
  const [endDate, setEndDate] = useState(patient.treatmentEndDate || '');

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

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const currentOdontogram = patient.odontogram ? JSON.parse(patient.odontogram) : {};
      currentOdontogram.treatmentPlan = procedures;
      
      await updateDoc(doc(db, 'patients', patient.id), {
        odontogram: JSON.stringify(currentOdontogram),
        treatmentStatus,
        treatmentStartDate: startDate,
        treatmentEndDate: endDate,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `patients/${patient.id}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddProcedure = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProcedure.name || !newProcedure.unitPrice || !newProcedure.quantity) return;

    const qty = parseFloat(newProcedure.quantity);
    const unitP = parseFloat(newProcedure.unitPrice);
    const total = qty * unitP;

    setProcedures(prev => [...prev, {
      id: Date.now().toString(),
      name: newProcedure.name,
      tooth: newProcedure.tooth,
      quantity: qty,
      unitPrice: unitP,
      cost: total
    }]);

    setNewProcedure({ name: '', tooth: '', quantity: '1', unitPrice: '' });
  };

  const handleDeleteProcedure = (id: string) => {
    setProcedures(prev => prev.filter(p => p.id !== id));
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-surface rounded-3xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-text-primary mb-4">Informações do Plano</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1 uppercase tracking-wider">Status do Tratamento</label>
                <select 
                  value={treatmentStatus}
                  onChange={(e) => setTreatmentStatus(e.target.value as any)}
                  className="w-full bg-surface border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2 text-sm text-text-primary focus:ring-2 focus:ring-indigo-500 outline-none"
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
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-surface border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2 text-sm text-text-primary focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1 uppercase tracking-wider">Fim Previsto</label>
                <input 
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-surface border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2 text-sm text-text-primary focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
            </div>
          </div>

          <div className="bg-surface rounded-3xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
          <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 bg-surface">
            <form onSubmit={handleAddProcedure} className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-4">
                <label className="block text-sm font-medium text-text-secondary mb-1">Procedimento</label>
                <input 
                  type="text" 
                  required 
                  value={newProcedure.name} 
                  onChange={e => setNewProcedure({...newProcedure, name: e.target.value})} 
                  placeholder="Ex: Restauração Resina MOD"
                  className="w-full bg-surface border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2 text-text-primary focus:ring-2 focus:ring-indigo-500" 
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-text-secondary mb-1">Dente ou Região</label>
                <input 
                  type="text" 
                  value={newProcedure.tooth} 
                  onChange={e => setNewProcedure({...newProcedure, tooth: e.target.value})} 
                  placeholder="Ex: 46, Maxila..."
                  className="w-full bg-surface border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2 text-text-primary focus:ring-2 focus:ring-indigo-500" 
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-text-secondary mb-1">Qtd</label>
                <input 
                  type="number" 
                  min="1"
                  required 
                  value={newProcedure.quantity} 
                  onChange={e => setNewProcedure({...newProcedure, quantity: e.target.value})} 
                  className="w-full bg-surface border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2 text-text-primary focus:ring-2 focus:ring-indigo-500" 
                />
              </div>
              <div className="md:col-span-3">
                <label className="block text-sm font-medium text-text-secondary mb-1">V. Unitário (R$)</label>
                <input 
                  type="number" 
                  step="0.01" 
                  required 
                  value={newProcedure.unitPrice} 
                  onChange={e => setNewProcedure({...newProcedure, unitPrice: e.target.value})} 
                  placeholder="0.00"
                  className="w-full bg-surface border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2 text-text-primary focus:ring-2 focus:ring-indigo-500" 
                />
              </div>
              <div className="md:col-span-1 flex items-end">
                <button type="submit" className="w-full bg-indigo-600 text-white h-[42px] rounded-xl flex items-center justify-center hover:bg-indigo-700 transition-colors">
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
              procedures.map(proc => (
                <div key={proc.id} className="p-4 flex items-center justify-between hover:bg-surface transition-colors">
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
                      onClick={() => handleDeleteProcedure(proc.id)}
                      className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

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
  );
};
