import React from 'react';
import { Finance } from '../../types';
import { Plus, TrendingUp, TrendingDown } from 'lucide-react';
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
    <div className="w-full sm:w-auto">
      <button
        onClick={() => setIsAdding(true)}
        className="flex items-center justify-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-2xl hover:bg-indigo-700 transition-all font-bold shadow-lg shadow-indigo-500/20 active:scale-95 w-full sm:w-auto whitespace-nowrap"
      >
        <Plus className="w-5 h-5" />
        Novo Lançamento
      </button>

      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-zinc-950/40 backdrop-blur-sm"
              onClick={() => setIsAdding(false)}
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative w-full max-w-lg bg-surface shadow-2xl rounded-[32px] border border-zinc-200 dark:border-zinc-800 overflow-hidden"
            >
              <div className="p-8 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-text-primary tracking-tight">Novo Lançamento</h3>
                  <p className="text-xs text-text-secondary mt-1">Registre uma nova movimentação financeira</p>
                </div>
                <button 
                  onClick={() => setIsAdding(false)}
                  className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors text-text-secondary"
                >
                  <Plus className="w-6 h-6 rotate-45" />
                </button>
              </div>

              <form onSubmit={handleAdd} className="p-8 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-black text-text-secondary uppercase tracking-[0.2em] mb-2 ml-1">Tipo de Lançamento</label>
                    <div className="flex bg-zinc-100 dark:bg-zinc-900 p-1.5 rounded-2xl border border-zinc-200 dark:border-zinc-800">
                      <button
                        type="button"
                        onClick={() => setNewFinance({ ...newFinance, type: 'income' })}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${newFinance.type === 'income' ? 'bg-surface text-emerald-600 shadow-md' : 'text-text-secondary hover:text-text-primary'}`}
                      >
                        <TrendingUp className="w-4 h-4" />
                        Receita
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewFinance({ ...newFinance, type: 'expense' })}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${newFinance.type === 'expense' ? 'bg-surface text-red-600 shadow-md' : 'text-text-secondary hover:text-text-primary'}`}
                      >
                        <TrendingDown className="w-4 h-4" />
                        Despesa
                      </button>
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-black text-text-secondary uppercase tracking-[0.2em] mb-2 ml-1">Descrição</label>
                    <input 
                      type="text" 
                      required 
                      placeholder="Ex: Pagamento de Fornecedor"
                      value={newFinance.description} 
                      onChange={e => setNewFinance({ ...newFinance, description: e.target.value })} 
                      className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-5 py-4 text-text-primary focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-text-secondary/30" 
                    />
                  </div>
                  
                  <div>
                    <label className="block text-[10px] font-black text-text-secondary uppercase tracking-[0.2em] mb-2 ml-1">Valor</label>
                    <div className="relative group">
                      <span className="absolute left-5 top-1/2 -translate-y-1/2 text-text-secondary font-black text-sm group-focus-within:text-indigo-500 transition-colors">R$</span>
                      <input 
                        type="number" 
                        step="0.01" 
                        required 
                        placeholder="0,00"
                        value={newFinance.amount} 
                        onChange={e => setNewFinance({ ...newFinance, amount: e.target.value })} 
                        className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl pl-12 pr-5 py-4 text-text-primary focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-black text-lg" 
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-text-secondary uppercase tracking-[0.2em] mb-2 ml-1">Data</label>
                    <input 
                      type="date" 
                      required 
                      value={newFinance.date} 
                      onChange={e => setNewFinance({ ...newFinance, date: e.target.value })} 
                      className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-5 py-4 text-text-primary focus:ring-2 focus:ring-indigo-500 outline-none transition-all cursor-pointer" 
                    />
                  </div>

                  {newFinance.type === 'income' && (
                    <>
                      <div>
                        <label className="block text-[10px] font-black text-text-secondary uppercase tracking-[0.2em] mb-2 ml-1">Forma de Pagamento</label>
                        <div className="relative">
                          <select
                            value={newFinance.paymentMethod}
                            onChange={e => setNewFinance({ ...newFinance, paymentMethod: e.target.value as any })}
                            className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-5 py-4 text-text-primary focus:ring-2 focus:ring-indigo-500 outline-none transition-all appearance-none cursor-pointer font-bold"
                          >
                            <option value="pix">PIX</option>
                            <option value="money">Dinheiro</option>
                            <option value="card">Cartão</option>
                            <option value="transfer">Transferência</option>
                            <option value="other">Outro</option>
                          </select>
                          <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-text-secondary">
                            <Plus className="w-4 h-4 rotate-45" />
                          </div>
                        </div>
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-black text-text-secondary uppercase tracking-[0.2em] mb-2 ml-1">Paciente (Opcional)</label>
                        <div className="relative">
                          <select
                            value={newFinance.patientId}
                            onChange={e => setNewFinance({ ...newFinance, patientId: e.target.value })}
                            className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-5 py-4 text-text-primary focus:ring-2 focus:ring-indigo-500 outline-none transition-all appearance-none cursor-pointer font-bold"
                          >
                            <option value="">Nenhum</option>
                            {Object.entries(patients).map(([id, name]) => (
                              <option key={id} value={id}>{name}</option>
                            ))}
                          </select>
                          <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-text-secondary">
                            <Plus className="w-4 h-4 rotate-45" />
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <div className="flex gap-4 pt-6">
                  <button 
                    type="button" 
                    onClick={() => setIsAdding(false)} 
                    className="flex-1 px-8 py-4 rounded-2xl text-text-secondary font-black uppercase tracking-widest text-[10px] hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    className="flex-[2] px-8 py-4 rounded-2xl bg-indigo-600 text-white font-black uppercase tracking-widest text-[10px] hover:bg-indigo-700 shadow-xl shadow-indigo-500/20 active:scale-95 transition-all"
                  >
                    Salvar Lançamento
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
