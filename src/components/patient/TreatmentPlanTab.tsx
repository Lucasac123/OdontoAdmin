import React, { useState, useEffect } from 'react';
import { doc, updateDoc, collection, onSnapshot, query, where, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../../firebase';
import { Patient, ProcedureTemplate, TreatmentProposal, TreatmentProcedure } from '../../types';
import { 
  Save, Loader2, Plus, Trash2, Printer, DollarSign, 
  CheckCircle2, AlertCircle, ChevronRight, Layout, List,
  Copy, FileText, Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useSync } from '../../context/SyncContext';
import { PrintHeader } from '../print/PrintHeader';
import { PrintFooter } from '../print/PrintFooter';

export const TreatmentPlanTab = ({ patient }: { patient: Patient }) => {
  const [proposals, setProposals] = useState<TreatmentProposal[]>([]);
  const [templates, setTemplates] = useState<ProcedureTemplate[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isAddingProposal, setIsAddingProposal] = useState(false);
  const [selectedProposalId, setSelectedProposalId] = useState<string | null>(null);
  const [newProposalTitle, setNewProposalTitle] = useState('');
  
  const [newProcedure, setNewProcedure] = useState({ name: '', tooth: '', quantity: '1', unitPrice: '' });
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  
  const { addSyncTask } = useSync();

  useEffect(() => {
    if (patient.treatmentProposals) {
      try {
        const parsed = JSON.parse(patient.treatmentProposals);
        setProposals(parsed);
      } catch (e) {
        console.error("Failed to parse treatment proposals", e);
      }
    }
  }, [patient.treatmentProposals]);

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

  const saveProposals = (updatedProposals: TreatmentProposal[]) => {
    const savePromise = updateDoc(doc(db, 'patients', patient.id), {
      treatmentProposals: JSON.stringify(updatedProposals),
      updatedAt: new Date().toISOString()
    }).catch(error => {
      handleFirestoreError(error, OperationType.UPDATE, `patients/${patient.id}`);
    });
    
    addSyncTask(savePromise);
    setProposals(updatedProposals);
  };

  const handleAddProposal = () => {
    if (!newProposalTitle.trim()) return;
    const newProposal: TreatmentProposal = {
      id: Date.now().toString(),
      title: newProposalTitle,
      procedures: [],
      totalValue: 0,
      status: 'proposed',
      createdAt: new Date().toISOString()
    };
    const updated = [...proposals, newProposal];
    saveProposals(updated);
    setNewProposalTitle('');
    setIsAddingProposal(false);
    setSelectedProposalId(newProposal.id);
  };

  const handleDeleteProposal = (id: string) => {
    const updated = proposals.filter(p => p.id !== id);
    saveProposals(updated);
    if (selectedProposalId === id) setSelectedProposalId(null);
  };

  const handleAddProcedure = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProposalId || !newProcedure.name || !newProcedure.unitPrice) return;

    const qty = parseFloat(newProcedure.quantity) || 1;
    const unitP = parseFloat(newProcedure.unitPrice);
    const total = qty * unitP;

    const updatedProposals = proposals.map(p => {
      if (p.id === selectedProposalId) {
        const procedures = [...p.procedures, {
          id: Date.now().toString(),
          name: newProcedure.name,
          tooth: newProcedure.tooth,
          quantity: qty,
          unitPrice: unitP,
          totalPrice: total,
          status: 'não_realizado' as const,
          paymentStatus: 'pendente' as const
        }];
        return {
          ...p,
          procedures,
          totalValue: procedures.reduce((acc, curr) => acc + curr.totalPrice, 0)
        };
      }
      return p;
    });

    saveProposals(updatedProposals);
    setNewProcedure({ name: '', tooth: '', quantity: '1', unitPrice: '' });
    setSelectedTemplateId('');
  };

  const handleRemoveProcedure = (proposalId: string, procedureId: string) => {
    const updatedProposals = proposals.map(p => {
      if (p.id === proposalId) {
        const procedures = p.procedures.filter(proc => proc.id !== procedureId);
        return {
          ...p,
          procedures,
          totalValue: procedures.reduce((acc, curr) => acc + curr.totalPrice, 0)
        };
      }
      return p;
    });
    saveProposals(updatedProposals);
  };

  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId);
    if (!templateId) return;
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setNewProcedure(prev => ({
        ...prev,
        name: template.name,
        unitPrice: template.finalPrice.toString()
      }));
    }
  };

  const handleApproveProposal = async (proposalId: string) => {
    const proposal = proposals.find(p => p.id === proposalId);
    if (!proposal || !auth.currentUser) return;

    // 1. Mark as selected in proposals
    const updatedProposals = proposals.map(p => ({
      ...p,
      status: p.id === proposalId ? 'selected' : 'rejected' as any
    }));
    saveProposals(updatedProposals);

    // 2. Add to Evolution and Payments
    for (const proc of proposal.procedures) {
      // Add to Evolution
      const evolutionPromise = addDoc(collection(db, 'clinical_evolutions'), {
        patientId: patient.id,
        dentistId: auth.currentUser.uid,
        content: `Procedimento planejado: ${proc.name}`,
        procedure: proc.name,
        tooth: proc.tooth || '',
        status: 'não_realizado',
        procedureId: proc.id, // Link to the procedure in the proposal
        proposalId: proposal.id,
        createdAt: serverTimestamp(),
        authorName: auth.currentUser.displayName || 'Dentista'
      });
      addSyncTask(evolutionPromise);

      // Add to Finances (Pending Payment)
      const financePromise = addDoc(collection(db, 'finances'), {
        dentistId: auth.currentUser.uid,
        patientId: patient.id,
        amount: proc.totalPrice,
        date: new Date().toISOString().split('T')[0],
        description: `Procedimento: ${proc.name}${proc.tooth ? ` (Dente ${proc.tooth})` : ''}`,
        type: 'income',
        paymentStatus: 'pendente',
        procedureId: proc.id,
        proposalId: proposal.id,
        createdAt: new Date().toISOString()
      });
      addSyncTask(financePromise);
    }
    
    alert('Plano de tratamento aprovado! Os procedimentos foram adicionados à Evolução Clínica e ao Histórico de Pagamentos.');
  };

  const currentProposal = proposals.find(p => p.id === selectedProposalId);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-text-primary flex items-center gap-2">
            <Layout className="w-7 h-7 text-indigo-600" />
            Planos de Tratamento
          </h2>
          <p className="text-sm text-text-secondary mt-1">Crie propostas personalizadas para apresentar ao paciente.</p>
        </div>
        <button
          onClick={() => setIsAddingProposal(true)}
          className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-2xl hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100 dark:shadow-none font-bold"
        >
          <Plus className="w-5 h-5" />
          Nova Proposta
        </button>
      </div>

      {/* Proposals List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {proposals.map(p => (
          <motion.div
            key={p.id}
            whileHover={{ y: -4 }}
            className={`premium-card p-6 cursor-pointer border-2 transition-all ${
              selectedProposalId === p.id ? 'border-indigo-500 shadow-indigo-100 dark:shadow-none' : 
              p.status === 'selected' ? 'border-emerald-500 shadow-emerald-100 dark:shadow-none' : 'border-transparent'
            }`}
            onClick={() => setSelectedProposalId(p.id)}
          >
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800">
                <FileText className={`w-6 h-6 ${p.status === 'selected' ? 'text-emerald-500' : 'text-indigo-500'}`} />
              </div>
              <div className="flex gap-2">
                {p.status === 'selected' && (
                  <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase tracking-widest rounded-lg flex items-center gap-1">
                    <Check className="w-3 h-3" /> Escolhido
                  </span>
                )}
                <button 
                  onClick={(e) => { e.stopPropagation(); handleDeleteProposal(p.id); }}
                  className="p-2 text-zinc-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            <h3 className="font-black text-lg text-text-primary tracking-tight line-clamp-1">{p.title}</h3>
            <p className="text-xs text-text-secondary font-medium mt-1 uppercase tracking-wider">{p.procedures.length} procedimentos</p>
            
            <div className="mt-6 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Total Estimado</p>
                <p className="text-xl font-black text-indigo-600 dark:text-indigo-400">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.totalValue)}
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-zinc-300" />
            </div>
          </motion.div>
        ))}
      </div>

      {isAddingProposal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-surface rounded-3xl p-8 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-black text-text-primary mb-2">Novo Plano de Tratamento</h3>
            <p className="text-sm text-text-secondary mb-6">Dê um nome para esta proposta (ex: Plano A, Opção Conservadora).</p>
            <input
              type="text"
              autoFocus
              value={newProposalTitle}
              onChange={e => setNewProposalTitle(e.target.value)}
              placeholder="Título da proposta..."
              className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-4 py-3 text-text-primary focus:ring-2 focus:ring-indigo-500 outline-none mb-6"
            />
            <div className="flex gap-3">
              <button onClick={() => setIsAddingProposal(false)} className="flex-1 py-3 text-text-secondary font-bold hover:bg-zinc-100 rounded-2xl transition-all">Cancelar</button>
              <button onClick={handleAddProposal} className="flex-1 bg-indigo-600 text-white font-bold py-3 rounded-2xl hover:bg-indigo-700 transition-all">Criar Plano</button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Proposal Editor */}
      {currentProposal && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="bg-surface rounded-3xl border border-zinc-200 dark:border-zinc-800 p-8 shadow-sm">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
              <div>
                <h3 className="text-xl font-black text-text-primary tracking-tight">Editando: {currentProposal.title}</h3>
                <p className="text-sm text-text-secondary">Adicione os procedimentos para compor esta proposta.</p>
              </div>
              {currentProposal.status !== 'selected' && (
                <button
                  onClick={() => handleApproveProposal(currentProposal.id)}
                  className="bg-emerald-600 text-white px-6 py-3 rounded-2xl hover:bg-emerald-700 transition-all shadow-md shadow-emerald-100 dark:shadow-none font-bold flex items-center gap-2"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  Aprovar este Plano
                </button>
              )}
            </div>

            {/* Add Procedure Form */}
            <form onSubmit={handleAddProcedure} className="grid grid-cols-1 md:grid-cols-5 gap-4 bg-zinc-50 dark:bg-zinc-900/50 p-6 rounded-3xl border border-zinc-100 dark:border-zinc-800 mb-8">
              <div className="md:col-span-2">
                <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1 mb-1.5 block">Procedimento</label>
                <div className="space-y-2">
                  <select
                    value={selectedTemplateId}
                    onChange={(e) => handleSelectTemplate(e.target.value)}
                    className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 text-sm text-text-primary outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">-- Usar Tabela de Preços --</option>
                    {templates.map(t => (
                      <option key={t.id} value={t.id}>{t.name} ({new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(t.finalPrice)})</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    required
                    value={newProcedure.name}
                    onChange={(e) => setNewProcedure({ ...newProcedure, name: e.target.value })}
                    placeholder="Nome do procedimento manual..."
                    className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 text-sm text-text-primary outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1 mb-1.5 block">Dente/Região</label>
                <input
                  type="text"
                  value={newProcedure.tooth}
                  onChange={(e) => setNewProcedure({ ...newProcedure, tooth: e.target.value })}
                  placeholder="Ex: 11"
                  className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 text-sm text-text-primary outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1 mb-1.5 block">Valor Unitário</label>
                <input
                  type="number"
                  required
                  value={newProcedure.unitPrice}
                  onChange={(e) => setNewProcedure({ ...newProcedure, unitPrice: e.target.value })}
                  placeholder="0,00"
                  className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 text-sm text-text-primary outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full bg-indigo-600 text-white p-2.5 rounded-xl hover:bg-indigo-700 transition-all shadow-sm flex items-center justify-center"
                >
                  <Plus className="w-6 h-6" />
                </button>
              </div>
            </form>

            {/* Procedures Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-100 dark:border-zinc-800">
                    <th className="py-4 px-2 text-[10px] font-black text-text-secondary uppercase tracking-widest">Dente</th>
                    <th className="py-4 px-2 text-[10px] font-black text-text-secondary uppercase tracking-widest">Procedimento</th>
                    <th className="py-4 px-2 text-[10px] font-black text-text-secondary uppercase tracking-widest">Qtd</th>
                    <th className="py-4 px-2 text-[10px] font-black text-text-secondary uppercase tracking-widest">Valor Unit.</th>
                    <th className="py-4 px-2 text-[10px] font-black text-text-secondary uppercase tracking-widest">Total</th>
                    <th className="py-4 px-2 text-[10px] font-black text-text-secondary uppercase tracking-widest text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50 dark:divide-zinc-900">
                  {currentProposal.procedures.map(proc => (
                    <tr key={proc.id} className="group hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
                      <td className="py-4 px-2 text-sm font-bold text-indigo-600 dark:text-indigo-400">{proc.tooth || '-'}</td>
                      <td className="py-4 px-2 text-sm text-text-primary font-medium">{proc.name}</td>
                      <td className="py-4 px-2 text-sm text-text-secondary">{proc.quantity}</td>
                      <td className="py-4 px-2 text-sm text-text-secondary">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(proc.unitPrice)}</td>
                      <td className="py-4 px-2 text-sm font-black text-text-primary">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(proc.totalPrice)}</td>
                      <td className="py-4 px-2 text-right">
                        <button onClick={() => handleRemoveProcedure(currentProposal.id, proc.id)} className="p-2 text-zinc-300 hover:text-red-500 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {currentProposal.procedures.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-text-secondary text-sm italic">Nenhum procedimento adicionado a esta proposta.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-8 flex justify-end items-center gap-8">
              <div className="text-right">
                <p className="text-xs font-black text-text-secondary uppercase tracking-widest">Investimento Total</p>
                <p className="text-4xl font-black text-indigo-600 dark:text-indigo-400">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(currentProposal.totalValue)}
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};
