import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Patient } from '../types';
import { MessageSquare, Users, Calendar, Gift, Search, Filter, Send } from 'lucide-react';
import { motion } from 'motion/react';

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
          return lastVisit < sixMonthsAgo && p.status === 'Controlado';
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
    setMessageTemplate(templates[filter === 'all' ? 'custom' : filter]);
    setSelectedPatients([]); // Clear selection on filter change
  };

  const togglePatientSelection = (id: string) => {
    setSelectedPatients(prev => 
      prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    const filteredIds = getFilteredPatients().map(p => p.id);
    if (selectedPatients.length === filteredIds.length) {
      setSelectedPatients([]);
    } else {
      setSelectedPatients(filteredIds);
    }
  };

  const handleSendMessages = () => {
    if (selectedPatients.length === 0) {
      alert("Selecione pelo menos um paciente.");
      return;
    }
    if (!messageTemplate.trim()) {
      alert("A mensagem não pode estar vazia.");
      return;
    }

    // In a real application, this would integrate with a WhatsApp API (like Twilio, Z-API, Evolution API, etc.)
    // or an email service (SendGrid, Mailgun).
    // For this prototype, we'll simulate the sending process or open WhatsApp Web for a single user.

    if (selectedPatients.length === 1) {
      const patient = patients.find(p => p.id === selectedPatients[0]);
      if (patient && patient.phone) {
        const phone = patient.phone.replace(/\D/g, '');
        const message = messageTemplate.replace('{nome}', patient.name.split(' ')[0]);
        window.open(`https://wa.me/55${phone}?text=${encodeURIComponent(message)}`, '_blank');
      } else {
        alert("O paciente selecionado não possui um número de telefone válido.");
      }
    } else {
      // Simulate bulk sending
      alert(`Simulação: Mensagem enviada para ${selectedPatients.length} pacientes com sucesso!\n\n(Nota: O envio em massa real requer integração com uma API oficial do WhatsApp ou serviço de SMS/Email).`);
      setSelectedPatients([]);
    }
  };

  const filteredPatients = getFilteredPatients();

  return (
    <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-text-primary tracking-tight">Marketing e Relacionamento</h1>
            <p className="text-sm text-text-secondary mt-1">Comunique-se com seus pacientes e crie campanhas personalizadas.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Filters and Patient List */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-surface p-5 rounded-2xl shadow-sm border border-border-subtle">
              <div className="relative mb-5">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary w-4.5 h-4.5" />
                <input
                  type="text"
                  placeholder="Buscar paciente por nome..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-11 pr-4 py-2.5 bg-bg border border-border-subtle rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none text-sm text-text-primary"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleFilterChange('all')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${selectedFilter === 'all' ? 'bg-indigo-600 text-white shadow-md' : 'bg-surface text-text-secondary hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-border-subtle'}`}
                >
                  <Users size={14} /> Todos
                </button>
                <button
                  onClick={() => handleFilterChange('birthdays')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${selectedFilter === 'birthdays' ? 'bg-pink-600 text-white shadow-md' : 'bg-surface text-text-secondary hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-border-subtle'}`}
                >
                  <Gift size={14} /> Aniversariantes
                </button>
                <button
                  onClick={() => handleFilterChange('preventive')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${selectedFilter === 'preventive' ? 'bg-amber-600 text-white shadow-md' : 'bg-surface text-text-secondary hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-border-subtle'}`}
                >
                  <Calendar size={14} /> Preventivo
                </button>
                <button
                  onClick={() => handleFilterChange('inactive')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${selectedFilter === 'inactive' ? 'bg-red-600 text-white shadow-md' : 'bg-surface text-text-secondary hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-border-subtle'}`}
                >
                  <Filter size={14} /> Inativos
                </button>
              </div>
            </div>

            <div className="bg-surface rounded-2xl shadow-sm border border-border-subtle overflow-hidden flex flex-col max-h-[600px]">
              <div className="p-4 border-b border-border-subtle flex justify-between items-center bg-bg">
                <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">
                  {filteredPatients.length} Pacientes
                </span>
                <button 
                  onClick={selectAll}
                  className="text-xs text-indigo-600 hover:text-indigo-700 font-bold uppercase tracking-tight"
                >
                  {selectedPatients.length === filteredPatients.length && filteredPatients.length > 0 ? 'Desmarcar' : 'Selecionar Tudo'}
                </button>
              </div>
              
              <div className="overflow-y-auto p-2 divide-y divide-border-subtle">
                {loading ? (
                  <div className="text-center py-12 text-text-secondary text-sm italic">Carregando pacientes...</div>
                ) : filteredPatients.length === 0 ? (
                  <div className="text-center py-12 text-text-secondary text-sm italic">Nenhum paciente encontrado.</div>
                ) : (
                  <div className="space-y-1">
                    {filteredPatients.map(patient => (
                      <label 
                        key={patient.id} 
                        className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${selectedPatients.includes(patient.id) ? 'bg-accent/10 border border-accent shadow-sm' : 'hover:bg-bg border border-transparent'}`}
                      >
                        <div className="relative flex items-center justify-center">
                          <input 
                            type="checkbox" 
                            checked={selectedPatients.includes(patient.id)}
                            onChange={() => togglePatientSelection(patient.id)}
                            className="w-5 h-5 text-accent rounded-lg border-border-subtle focus:ring-accent/10 transition-all cursor-pointer bg-bg"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-text-primary truncate">{patient.name}</p>
                          <p className="text-xs text-text-secondary truncate font-medium">{patient.phone || 'Sem telefone'}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Message Composer */}
          <div className="lg:col-span-8">
            <div className="bg-surface rounded-2xl shadow-sm border border-border-subtle p-6 md:p-8 flex flex-col h-full">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-text-primary">Compositor de Mensagens</h2>
                  <p className="text-xs text-text-secondary">Crie e envie mensagens personalizadas via WhatsApp.</p>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2.5">
                    Conteúdo da Mensagem
                  </label>
                  <div className="relative group">
                    <textarea
                      value={messageTemplate}
                      onChange={(e) => setMessageTemplate(e.target.value)}
                      className="w-full h-72 p-5 bg-bg border border-border-subtle rounded-2xl focus:ring-4 focus:ring-accent/5 focus:border-accent transition-all outline-none text-text-primary leading-relaxed resize-none text-sm md:text-base"
                      placeholder="Escreva sua mensagem aqui..."
                    />
                    <div className="absolute bottom-4 right-4 flex items-center gap-2">
                      <span className="text-[10px] font-bold text-text-secondary uppercase bg-surface px-2 py-1 rounded-md border border-border-subtle">
                        Variável: <code className="text-accent">{'{nome}'}</code>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-5">
                    <h4 className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <Gift size={14} /> Dicas de Marketing
                    </h4>
                    <ul className="text-xs text-blue-700 dark:text-blue-300/80 space-y-2.5">
                      <li className="flex items-start gap-2">
                        <span className="w-1 h-1 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                        Mantenha a mensagem curta e direta ao ponto.
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-1 h-1 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                        Sempre ofereça um "Call to Action" claro.
                      </li>
                    </ul>
                  </div>
                  <div className="bg-accent/10 border border-accent/20 rounded-2xl p-5">
                    <h4 className="text-xs font-bold text-accent uppercase tracking-wider mb-3 flex items-center gap-2">
                      <Users size={14} /> Público Alvo
                    </h4>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-text-secondary font-medium">Pacientes Selecionados:</span>
                      <span className="text-lg font-black text-accent">{selectedPatients.length}</span>
                    </div>
                    <div className="mt-2 h-1.5 bg-accent/10 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-accent transition-all duration-500" 
                        style={{ width: `${Math.min((selectedPatients.length / Math.max(filteredPatients.length, 1)) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-border-subtle flex flex-col sm:flex-row items-center justify-between gap-4">
                  <p className="text-xs text-text-secondary font-medium italic">
                    * O envio em massa abrirá o WhatsApp para cada paciente individualmente ou simulará o envio.
                  </p>
                  <button
                    onClick={handleSendMessages}
                    disabled={selectedPatients.length === 0 || !messageTemplate.trim()}
                    className="w-full sm:w-auto flex items-center justify-center gap-2.5 bg-accent text-white px-8 py-3.5 rounded-2xl font-bold hover:bg-accent-hover transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg active:scale-[0.98]"
                  >
                    <Send className="w-4.5 h-4.5" />
                    {selectedPatients.length > 1 ? 'Enviar em Massa' : 'Enviar WhatsApp'}
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
