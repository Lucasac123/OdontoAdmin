import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Patient } from '../types';
import { MessageSquare, Users, Calendar, Gift, Search, Filter, Send, Sparkles, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const Marketing = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'birthdays' | 'preventive' | 'inactive'>('all');
  const [selectedPatients, setSelectedPatients] = useState<string[]>([]);
  const [messageTemplate, setMessageTemplate] = useState('');

  const templates = {
    birthdays: "Olá {nome}! 🎉 A equipe da OdontoAdmin deseja um Feliz Aniversário! Que seu dia seja cheio de sorrisos. Como presente, você tem 15% de desconto em uma limpeza este mês. Agende seu horário!",
    preventive: "Olá {nome}, tudo bem? Notamos que já faz um tempo desde sua última visita. A prevenção é o melhor caminho para um sorriso saudável! Vamos agendar sua avaliação de rotina?",
    inactive: "Oi {nome}! Sentimos sua falta aqui na clínica. Temos novidades e tratamentos especiais esperando por você. Que tal marcar uma visita para conversarmos?",
    all: "",
    custom: ""
  };

  useEffect(() => {
    const fetchPatients = async () => {
      if (!auth.currentUser) return;
      try {
        const q = query(collection(db, 'patients'), where('dentistId', '==', auth.currentUser.uid));
        const snapshot = await getDocs(q);
        const patientsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Patient));
        setPatients(patientsData);
      } catch (error) {
        console.error("Error fetching patients:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPatients();
  }, []);

  const getFilteredPatients = () => {
    let filtered = patients;
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      filtered = filtered.filter(p => p.name.toLowerCase().includes(lowerSearch));
    }
    const today = new Date();
    const currentMonth = today.getMonth() + 1;

    switch (selectedFilter) {
      case 'birthdays':
        filtered = filtered.filter(p => {
          if (!p.dob) return false;
          const [, month] = p.dob.split('-').map(Number);
          return month === currentMonth;
        });
        break;
      case 'preventive':
        filtered = filtered.filter(p => {
          if (!p.updatedAt && !p.createdAt) return false;
          const lastVisit = new Date(p.updatedAt || p.createdAt);
          const sixMonthsAgo = new Date();
          sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
          return lastVisit < sixMonthsAgo && p.status === 'Ativo';
        });
        break;
      case 'inactive':
        filtered = filtered.filter(p => p.status === 'Inativo');
        break;
    }
    return filtered;
  };

  const handleFilterChange = (filter: typeof selectedFilter) => {
    setSelectedFilter(filter);
    setMessageTemplate(templates[filter]);
    setSelectedPatients([]); 
  };

  const togglePatientSelection = (id: string) => {
    setSelectedPatients(prev => 
      prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    const filteredIds = getFilteredPatients().map(p => p.id);
    if (selectedPatients.length === filteredIds.length) setSelectedPatients([]);
    else setSelectedPatients(filteredIds);
  };

  const handleSendMessages = () => {
    if (selectedPatients.length === 0 || !messageTemplate.trim()) return;

    if (selectedPatients.length === 1) {
      const patient = patients.find(p => p.id === selectedPatients[0]);
      if (patient && patient.phone) {
        const phone = patient.phone.replace(/\D/g, '');
        const message = messageTemplate.replace('{nome}', patient.name.split(' ')[0]);
        window.open(`https://wa.me/55${phone}?text=${encodeURIComponent(message)}`, '_blank');
      } else alert("Paciente sem telefone válido.");
    } else {
      alert(`Simulação: Campanha enviada para ${selectedPatients.length} pacientes.`);
      setSelectedPatients([]);
    }
  };

  const filteredPatients = getFilteredPatients();

  return (
    <div className="space-y-8 flex flex-col h-full bg-zinc-50/20 p-2 md:p-6 rounded-[48px]">
      {/* Header Premium */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-12 shrink-0 px-4">
        <div>
          <h1 className="text-6xl font-black text-text-primary tracking-tighter uppercase leading-none">Marketing</h1>
          <p className="text-text-secondary mt-4 font-medium uppercase tracking-[0.3em] text-[10px] flex items-center gap-2">
            <Sparkles size={14} className="text-red-500 fill-red-500/20" /> RELACIONAMENTO E FIDELIZAÇÃO DE PACIENTES
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1 min-h-0 overflow-hidden px-2 lg:px-4 pb-10">
        {/* Sidebar: Filters & List */}
        <div className="lg:col-span-4 flex flex-col space-y-6 min-h-0 overflow-hidden">
          <div className="bg-surface p-6 rounded-[32px] border border-zinc-200/50 dark:border-zinc-800 shadow-sm shrink-0">
             <div className="relative group mb-6">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary group-focus-within:text-red-500 transition-all" size={18} />
                <input
                  type="text"
                  placeholder="BUSCAR PACIENTE..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl text-[10px] font-black uppercase tracking-widest focus:ring-4 focus:ring-red-500/5 outline-none transition-all shadow-inner"
                />
             </div>

             <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'all', label: 'Todos', icon: <Users size={14} />, color: 'red' },
                  { id: 'birthdays', label: 'Aniver.', icon: <Gift size={14} />, color: 'pink' },
                  { id: 'preventive', label: 'Prev.', icon: <Calendar size={14} />, color: 'amber' },
                  { id: 'inactive', label: 'Inativos', icon: <Filter size={14} />, color: 'red' }
                ].map(f => (
                  <button
                    key={f.id}
                    onClick={() => handleFilterChange(f.id as any)}
                    className={`flex items-center gap-2 px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border ${selectedFilter === f.id ? 'bg-red-600 text-white border-red-500 shadow-lg shadow-red-500/20' : 'bg-white dark:bg-surface text-text-secondary border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50'}`}
                  >
                    {f.icon} {f.label}
                  </button>
                ))}
             </div>
          </div>

          <div className="bg-surface rounded-[40px] border border-zinc-200/50 dark:border-zinc-800 shadow-sm flex-1 min-h-0 flex flex-col overflow-hidden">
             <div className="p-6 border-b border-zinc-100 dark:border-zinc-900 flex justify-between items-center shrink-0">
                <span className="text-[10px] font-black text-text-secondary uppercase tracking-[0.2em]">{filteredPatients.length} PACIENTES</span>
                <button onClick={selectAll} className="text-[9px] font-black text-red-600 uppercase tracking-widest hover:bg-red-50 dark:hover:bg-red-500/10 px-3 py-1 rounded-lg transition-all">
                  {selectedPatients.length === filteredPatients.length ? 'Desmarcar' : 'Selecionar Tudo'}
                </button>
             </div>
             <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-thin scrollbar-thumb-red-500/10">
                {filteredPatients.map(p => (
                  <label key={p.id} className={`flex items-center gap-4 p-4 rounded-3xl cursor-pointer transition-all border ${selectedPatients.includes(p.id) ? 'bg-red-50/50 border-red-100 dark:bg-red-500/5 dark:border-red-500/10' : 'bg-transparent border-transparent hover:bg-zinc-50'}`}>
                    <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${selectedPatients.includes(p.id) ? 'bg-red-600 border-red-600 text-white' : 'border-zinc-200 dark:border-zinc-800'}`}>
                       {selectedPatients.includes(p.id) && <CheckCircle2 size={12} />}
                    </div>
                    <input type="checkbox" checked={selectedPatients.includes(p.id)} onChange={() => togglePatientSelection(p.id)} className="hidden" />
                    <div className="min-w-0">
                       <p className="text-xs font-black text-text-primary uppercase truncate tracking-tight">{p.name}</p>
                       <p className="text-[9px] text-text-secondary font-black truncate">{p.phone || 'SEM TELEFONE'}</p>
                    </div>
                  </label>
                ))}
             </div>
          </div>
        </div>

        {/* Composer: Right Side */}
        <div className="lg:col-span-8 flex flex-col">
           <div className="bg-surface rounded-[48px] border border-zinc-200/50 dark:border-zinc-800 shadow-sm p-10 flex flex-col h-full relative overflow-hidden">
              <div className="absolute top-0 right-0 w-80 h-80 bg-red-500/5 rounded-bl-[160px] pointer-events-none" />
              
              <div className="flex items-center gap-4 mb-10 shrink-0">
                 <div className="w-14 h-14 rounded-3xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center text-red-600 shadow-inner">
                    <MessageSquare size={24} />
                 </div>
                 <div>
                    <h2 className="text-2xl font-black text-text-primary tracking-tight uppercase">Compositor de Campanha</h2>
                    <p className="text-[10px] font-black text-text-secondary uppercase tracking-widest mt-1">CRIE MENSAGENS PERSONALIZADAS VIA WHATSAPP</p>
                 </div>
              </div>

              <div className="flex-1 min-h-0 space-y-8 flex flex-col">
                 <div className="relative group flex-1 min-h-0">
                    <div className="absolute inset-0 bg-red-500/5 blur-3xl opacity-0 group-focus-within:opacity-100 transition-all duration-700 pointer-events-none" />
                    <textarea
                      value={messageTemplate}
                      onChange={(e) => setMessageTemplate(e.target.value)}
                      className="w-full h-full p-8 bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-100 dark:border-zinc-800 rounded-[32px] focus:ring-4 focus:ring-red-500/5 outline-none transition-all text-sm md:text-base font-medium text-text-primary leading-relaxed resize-none shadow-inner"
                      placeholder="ESCREVA SUA MENSAGEM AQUI..."
                    />
                    <div className="absolute bottom-6 right-8 p-3 bg-white dark:bg-surface rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm">
                       <span className="text-[9px] font-black text-text-secondary uppercase tracking-widest">
                          Variável Nome: <code className="text-red-600">{"{nome}"}</code>
                       </span>
                    </div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6 shrink-0">
                    <div className="p-6 rounded-[32px] bg-red-50/50 dark:bg-red-500/5 border border-red-100/50 dark:border-red-500/10">
                       <h4 className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                          <Zap size={14} /> Dica Estratégica
                       </h4>
                       <p className="text-[11px] text-red-700/70 font-medium leading-relaxed uppercase">Mantenha a mensagem curta e direta. Sempre inclua um convite claro para agendamento.</p>
                    </div>
                    <div className="p-6 rounded-[32px] bg-indigo-50/50 dark:bg-indigo-500/5 border border-indigo-100/50 dark:border-indigo-500/10 flex flex-col justify-center">
                       <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Alcance Estimado</span>
                          <span className="text-3xl font-black text-indigo-700">{selectedPatients.length}</span>
                       </div>
                       <div className="mt-4 h-1.5 w-full bg-indigo-100/50 rounded-full overflow-hidden">
                          <motion.div initial={{ width: 0 }} animate={{ width: `${(selectedPatients.length / Math.max(patients.length, 1)) * 100}%` }} transition={{ duration: 1 }} className="h-full bg-indigo-500" />
                       </div>
                    </div>
                 </div>

                 <div className="pt-8 border-t border-zinc-100 dark:border-zinc-900 shrink-0 flex flex-col md:flex-row items-center justify-between gap-6">
                    <p className="text-[9px] font-bold text-text-secondary uppercase tracking-widest italic opacity-40 max-w-sm">
                       * O envio em massa simula a campanha, enquanto o individual abre o WhatsApp Web direto para o paciente.
                    </p>
                    <button
                      onClick={handleSendMessages}
                      disabled={selectedPatients.length === 0 || !messageTemplate.trim()}
                      className="w-full md:w-auto flex items-center justify-center gap-3 bg-red-600 text-white px-10 py-5 rounded-[28px] font-black text-xs uppercase tracking-widest hover:bg-red-700 disabled:opacity-30 transition-all shadow-2xl shadow-red-500/30 active:scale-95"
                    >
                      <Send size={18} />
                      {selectedPatients.length === 1 ? 'Enviar WhatsApp' : 'Disparar Campanha'}
                    </button>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default Marketing;
