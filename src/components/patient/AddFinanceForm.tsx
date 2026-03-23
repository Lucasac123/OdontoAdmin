import React from 'react';
import { Finance } from '../../types';
import { Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AddFinanceFormProps {
  isAdding: boolean;
  setIsAdding: (isAdding: boolean) => void;
  newFinance: any;
  setNewFinance: (finance: any) => void;
  patients: Record<string, string>;
  splits: any[];
  handleAdd: (e: React.FormEvent) => Promise<void>;
}

export const AddFinanceForm: React.FC<AddFinanceFormProps> = ({
  isAdding,
  setIsAdding,
  newFinance,
  setNewFinance,
  patients,
  splits,
  handleAdd,
}) => {
  return (
    <div className="relative w-full sm:w-auto">
      <button
        onClick={() => setIsAdding(!isAdding)}
        className="flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-700 transition-colors w-full sm:w-auto whitespace-nowrap"
      >
        <Plus className="w-5 h-5" />
        Novo Lançamento
      </button>

      <AnimatePresence>
        {isAdding && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              onClick={() => setIsAdding(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ type: "spring", bounce: 0, duration: 0.3 }}
              className="absolute right-0 top-full mt-2 w-[calc(100vw-2rem)] sm:w-[500px] z-50 bg-surface shadow-2xl rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden origin-top-right"
            >
              <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
                <h3 className="font-medium text-text-primary">Novo Lançamento</h3>
              </div>
              <form onSubmit={handleAdd} className="p-6 space-y-4 text-left">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-text-secondary mb-1">Descrição</label>
                    <input type="text" required value={newFinance.description} onChange={e => setNewFinance({ ...newFinance, description: e.target.value })} className="w-full bg-surface border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2 text-text-primary focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">Valor (R$)</label>
                    <input type="number" step="0.01" required value={newFinance.amount} onChange={e => setNewFinance({ ...newFinance, amount: e.target.value })} className="w-full bg-surface border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2 text-text-primary focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">Tipo</label>
                    <select value={newFinance.type} onChange={e => setNewFinance({ ...newFinance, type: e.target.value as any })} className="w-full bg-surface border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2 text-text-primary focus:ring-2 focus:ring-indigo-500">
                      <option value="income">Receita</option>
                      <option value="expense">Despesa</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">Data</label>
                    <input type="date" required value={newFinance.date} onChange={e => setNewFinance({ ...newFinance, date: e.target.value })} className="w-full bg-surface border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2 text-text-primary focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  {newFinance.type === 'income' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1">Forma de Pagamento</label>
                        <select
                          value={newFinance.paymentMethod}
                          onChange={e => setNewFinance({ ...newFinance, paymentMethod: e.target.value as any })}
                          className="w-full bg-surface border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2 text-text-primary focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="money">Dinheiro</option>
                          <option value="card">Cartão</option>
                          <option value="pix">PIX</option>
                          <option value="transfer">Transferência</option>
                          <option value="other">Outro</option>
                        </select>
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-text-secondary mb-1">Paciente (Opcional)</label>
                        <select
                          value={newFinance.patientId}
                          onChange={e => setNewFinance({ ...newFinance, patientId: e.target.value })}
                          className="w-full bg-surface border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2 text-text-primary focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="">Nenhum</option>
                          {Object.entries(patients).map(([id, name]) => (
                            <option key={id} value={id}>{name}</option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                  <button type="button" onClick={() => setIsAdding(false)} className="px-4 py-2 rounded-xl text-text-secondary hover:bg-zinc-100 dark:hover:bg-zinc-800">Cancelar</button>
                  <button type="submit" className="px-4 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700">Salvar</button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
