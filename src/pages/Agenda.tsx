import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType, moveToTrash } from '../firebase';
import { Appointment, Patient } from '../types';
import { Calendar as CalendarIcon, Clock, Plus, Trash2, CheckCircle, XCircle, ExternalLink, Settings, Bell, Send, AlertCircle, Loader2 } from 'lucide-react';
import { format, startOfWeek, addDays, isSameDay, parseISO, isAfter, subHours } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import { NotificationSettings } from '../types';
import { ConfirmModal } from '../components/ConfirmModal';

export const Agenda: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isAdding, setIsAdding] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [notifSettings, setNotifSettings] = useState<NotificationSettings | null>(null);
  const [appointmentToDelete, setAppointmentToDelete] = useState<Appointment | null>(null);
  
  const [newAppt, setNewAppt] = useState({
    patientId: '',
    time: '09:00',
    duration: 30,
    notes: ''
  });

  useEffect(() => {
    if (!auth.currentUser) return;

    // Fetch patients for dropdown
    const qPatients = query(collection(db, 'patients'), where('dentistId', '==', auth.currentUser.uid));
    const unsubPatients = onSnapshot(qPatients, (snapshot) => {
      setPatients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Patient)));
    });

    // Fetch appointments
    const qAppts = query(collection(db, 'appointments'), where('dentistId', '==', auth.currentUser.uid));
    const unsubAppts = onSnapshot(qAppts, (snapshot) => {
      setAppointments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'appointments'));

    // Fetch notification settings
    const qSettings = query(collection(db, 'notificationSettings'), where('dentistId', '==', auth.currentUser.uid));
    const unsubSettings = onSnapshot(qSettings, (snapshot) => {
      if (!snapshot.empty) {
        setNotifSettings({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as any);
      } else {
        // Default settings
        setNotifSettings({
          dentistId: auth.currentUser!.uid,
          enabled: true,
          type: 'sms',
          hoursBefore: 24,
          messageTemplate: 'Olá {paciente}, confirmamos sua consulta para {data} às {hora}.',
          updatedAt: new Date().toISOString()
        });
      }
    });

    return () => {
      unsubPatients();
      unsubAppts();
      unsubSettings();
    };
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || !notifSettings) return;

    try {
      const { id, ...data } = notifSettings as any;
      if (id) {
        await updateDoc(doc(db, 'notificationSettings', id), {
          ...data,
          updatedAt: new Date().toISOString()
        });
      } else {
        await addDoc(collection(db, 'notificationSettings'), {
          ...data,
          updatedAt: new Date().toISOString()
        });
      }
      setIsSettingsOpen(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'notificationSettings');
    }
  };

  const handleSendReminders = async () => {
    if (!auth.currentUser || !notifSettings || !notifSettings.enabled) return;
    setIsSending(true);

    try {
      const upcoming = dayAppointments.filter(app => app.status === 'scheduled');
      
      for (const app of upcoming) {
        const patient = patients.find(p => p.id === app.patientId);
        if (!patient) continue;

        const date = parseISO(app.date);
        const message = notifSettings.messageTemplate
          .replace('{paciente}', patient.name)
          .replace('{data}', format(date, 'dd/MM/yyyy'))
          .replace('{hora}', format(date, 'HH:mm'));

        // Simulation of API calls
        if (notifSettings.type === 'sms' || notifSettings.type === 'both' || notifSettings.type === 'all') {
          console.log(`[SMS] Enviando para ${patient.phone}: ${message}`);
        }
        if (notifSettings.type === 'email' || notifSettings.type === 'both' || notifSettings.type === 'all') {
          console.log(`[EMAIL] Enviando para ${patient.email}: ${message}`);
        }
        if (notifSettings.type === 'whatsapp' || notifSettings.type === 'all') {
          console.log(`[WHATSAPP] Enviando para ${patient.phone}: ${message}`);
          // For a real integration without API, we could use:
          // window.open(`https://wa.me/${patient.phone?.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`);
        }
        
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      alert(`${upcoming.length} lembretes enviados com sucesso!`);
    } catch (error) {
      console.error(error);
      alert('Erro ao enviar lembretes.');
    } finally {
      setIsSending(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || !newAppt.patientId) return;

    const patient = patients.find(p => p.id === newAppt.patientId);
    
    // Combine selectedDate and time
    const [hours, minutes] = newAppt.time.split(':');
    const apptDate = new Date(selectedDate);
    apptDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);

    try {
      await addDoc(collection(db, 'appointments'), {
        dentistId: auth.currentUser.uid,
        patientId: newAppt.patientId,
        patientName: patient?.name || 'Desconhecido',
        date: apptDate.toISOString(),
        duration: newAppt.duration,
        notes: newAppt.notes,
        status: 'scheduled',
        createdAt: new Date().toISOString()
      });
      setIsAdding(false);
      setNewAppt({ patientId: '', time: '09:00', duration: 30, notes: '' });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'appointments');
    }
  };

  const handleStatusChange = async (id: string, status: 'scheduled' | 'completed' | 'cancelled') => {
    try {
      await updateDoc(doc(db, 'appointments', id), { status });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `appointments/${id}`);
    }
  };

  const handleDelete = async (appointment: Appointment) => {
    setAppointmentToDelete(appointment);
  };

  const confirmDelete = async () => {
    if (!appointmentToDelete) return;
    try {
      await moveToTrash('appointments', appointmentToDelete.id, appointmentToDelete);
      setAppointmentToDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `appointments/${appointmentToDelete.id}`);
    }
  };

  const generateGoogleCalendarLink = (app: Appointment) => {
    const startDate = parseISO(app.date);
    const endDate = new Date(startDate.getTime() + app.duration * 60000);
    
    const formatGoogleDate = (date: Date) => {
      return date.toISOString().replace(/-|:|\.\d\d\d/g, '');
    };

    const text = encodeURIComponent(`Consulta Odontológica: ${app.patientName}`);
    const dates = `${formatGoogleDate(startDate)}/${formatGoogleDate(endDate)}`;
    const details = encodeURIComponent(`Paciente: ${app.patientName}\nObservações: ${app.notes || 'Nenhuma'}`);
    
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${dates}&details=${details}`;
  };

  // Generate week days
  const startDate = startOfWeek(selectedDate, { weekStartsOn: 0 });
  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(startDate, i));

  const dayAppointments = appointments
    .filter(a => isSameDay(parseISO(a.date), selectedDate))
    .sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Agenda</h1>
          <p className="text-sm text-text-secondary">Gerencie seus atendimentos e sincronize com o Google Agenda.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center gap-2 bg-surface text-text-primary border border-zinc-200 dark:border-zinc-800 px-4 py-2 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
          >
            <Settings className="w-5 h-5" />
            Lembretes
          </button>
          <button
            onClick={() => setIsAdding(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Novo Agendamento
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0">
        <div className="w-full lg:w-1/3 flex flex-col gap-6 shrink-0">
          <div className="bg-surface rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-medium text-text-primary capitalize">
                {format(selectedDate, 'MMMM yyyy', { locale: ptBR })}
              </h3>
              <div className="flex gap-2">
                <button onClick={() => setSelectedDate(addDays(selectedDate, -7))} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-text-primary">&lt;</button>
                <button onClick={() => setSelectedDate(addDays(selectedDate, 7))} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-text-primary">&gt;</button>
              </div>
            </div>
            
            <div className="grid grid-cols-7 gap-2 text-center mb-2">
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
                <div key={d} className="text-xs font-medium text-text-secondary">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-2">
              {weekDays.map((day, i) => {
                const isSelected = isSameDay(day, selectedDate);
                const hasAppts = appointments.some(a => isSameDay(parseISO(a.date), day));
                return (
                  <button
                    key={i}
                    onClick={() => setSelectedDate(day)}
                    className={`aspect-square flex flex-col items-center justify-center rounded-xl text-sm relative transition-colors ${
                      isSelected 
                        ? 'bg-indigo-600 text-white font-bold shadow-md' 
                        : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-text-primary'
                    }`}
                  >
                    {format(day, 'd')}
                    {hasAppts && !isSelected && (
                      <div className="absolute bottom-1 w-1 h-1 rounded-full bg-indigo-500" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <AnimatePresence>
            {isAdding && (
              <motion.form 
                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                animate={{ opacity: 1, height: 'auto', marginBottom: 24 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                transition={{ duration: 0.2 }}
                onSubmit={handleAdd} 
                className="bg-surface rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 p-6 space-y-4 overflow-hidden"
              >
                <h3 className="text-lg font-medium text-text-primary">Agendar para {format(selectedDate, 'dd/MM/yyyy')}</h3>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Paciente</label>
                  <select required value={newAppt.patientId} onChange={e => setNewAppt({...newAppt, patientId: e.target.value})} className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2 text-text-primary focus:ring-2 focus:ring-indigo-500">
                    <option value="">Selecione um paciente...</option>
                    {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">Horário</label>
                    <input type="time" required value={newAppt.time} onChange={e => setNewAppt({...newAppt, time: e.target.value})} className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2 text-text-primary focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">Duração (min)</label>
                    <input type="number" step="15" required value={newAppt.duration} onChange={e => setNewAppt({...newAppt, duration: parseInt(e.target.value)})} className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2 text-text-primary focus:ring-2 focus:ring-indigo-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Observações</label>
                  <textarea value={newAppt.notes} onChange={e => setNewAppt({...newAppt, notes: e.target.value})} className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2 text-text-primary focus:ring-2 focus:ring-indigo-500 resize-none h-20" />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setIsAdding(false)} className="px-4 py-2 rounded-xl text-text-secondary hover:bg-zinc-100 dark:hover:bg-zinc-800">Cancelar</button>
                  <button type="submit" className="px-4 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700">Salvar</button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </div>

        <div className="flex-1 bg-surface rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col">
          <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 shrink-0 flex items-center justify-between">
            <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
              <CalendarIcon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              Consultas do dia {format(selectedDate, 'dd/MM/yyyy')}
            </h2>
            {dayAppointments.length > 0 && notifSettings?.enabled && (
              <button
                onClick={handleSendReminders}
                disabled={isSending}
                className="flex items-center gap-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
              >
                {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Enviar Lembretes
              </button>
            )}
          </div>
          
          <div className="flex-1 overflow-y-auto p-6">
            {dayAppointments.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-text-secondary">
                <CalendarIcon className="w-12 h-12 opacity-50 mb-4" />
                <p>Nenhuma consulta agendada para este dia.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <AnimatePresence initial={false}>
                  {dayAppointments.map(app => (
                    <motion.div 
                      key={app.id} 
                      initial={{ opacity: 0, height: 0, scale: 0.95 }}
                      animate={{ opacity: 1, height: 'auto', scale: 1 }}
                      exit={{ opacity: 0, height: 0, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className={`p-4 rounded-2xl border ${
                        app.status === 'completed' ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800/30' :
                        app.status === 'cancelled' ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800/30' :
                        'bg-surface border-zinc-200 dark:border-zinc-700'
                      } flex flex-col sm:flex-row gap-4 sm:items-center justify-between transition-colors overflow-hidden`}
                    >
                      
                      <div className="flex items-start gap-4">
                        <div className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center shrink-0 ${
                          app.status === 'completed' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' :
                          app.status === 'cancelled' ? 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400' :
                          'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400'
                        }`}>
                          <span className="text-sm font-bold">{format(parseISO(app.date), 'HH:mm')}</span>
                        </div>
                        
                        <div>
                          <h4 className="font-bold text-lg text-text-primary">{app.patientName}</h4>
                          <div className="flex items-center gap-3 text-sm text-text-secondary mt-1">
                            <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {app.duration} min</span>
                            {app.notes && <span className="truncate max-w-[200px]">- {app.notes}</span>}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        {app.status === 'scheduled' && (
                          <>
                            <a 
                              href={generateGoogleCalendarLink(app)} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="p-2 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg flex items-center gap-2 text-sm font-medium"
                              title="Adicionar ao Google Agenda"
                            >
                              <ExternalLink className="w-4 h-4" />
                              Google Agenda
                            </a>
                            <button onClick={() => handleStatusChange(app.id, 'completed')} className="p-2 text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 rounded-lg" title="Marcar como concluída">
                              <CheckCircle className="w-5 h-5" />
                            </button>
                            <button onClick={() => handleStatusChange(app.id, 'cancelled')} className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg" title="Cancelar consulta">
                              <XCircle className="w-5 h-5" />
                            </button>
                          </>
                        )}
                        <button onClick={() => handleDelete(app)} className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg">
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </div>
      <AnimatePresence>
        {isSettingsOpen && notifSettings && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-surface rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 w-full max-w-lg overflow-hidden"
            >
              <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                  <h3 className="text-xl font-bold text-text-primary">Configurar Lembretes</h3>
                </div>
                <button onClick={() => setIsSettingsOpen(false)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors">
                  <XCircle className="w-6 h-6 text-text-secondary" />
                </button>
              </div>

              <form onSubmit={handleSaveSettings} className="p-6 space-y-6">
                <div className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-200 dark:border-zinc-700">
                  <div>
                    <h4 className="font-bold text-text-primary">Ativar Lembretes</h4>
                    <p className="text-xs text-text-secondary">Enviar notificações automáticas para pacientes.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setNotifSettings({ ...notifSettings, enabled: !notifSettings.enabled })}
                    className={`w-12 h-6 rounded-full transition-colors relative ${notifSettings.enabled ? 'bg-indigo-600' : 'bg-zinc-300 dark:bg-zinc-700'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${notifSettings.enabled ? 'left-7' : 'left-1'}`} />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">Canal</label>
                    <select
                      value={notifSettings.type}
                      onChange={e => setNotifSettings({ ...notifSettings, type: e.target.value as any })}
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2 text-text-primary focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="sms">SMS</option>
                      <option value="email">E-mail</option>
                      <option value="whatsapp">WhatsApp</option>
                      <option value="both">Ambos (SMS e E-mail)</option>
                      <option value="all">Todos (SMS, E-mail e WhatsApp)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">Antecedência (horas)</label>
                    <input
                      type="number"
                      value={notifSettings.hoursBefore}
                      onChange={e => setNotifSettings({ ...notifSettings, hoursBefore: parseInt(e.target.value) })}
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2 text-text-primary focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Modelo da Mensagem</label>
                  <textarea
                    value={notifSettings.messageTemplate}
                    onChange={e => setNotifSettings({ ...notifSettings, messageTemplate: e.target.value })}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2 text-text-primary focus:ring-2 focus:ring-indigo-500 resize-none h-32"
                  />
                  <div className="mt-2 flex flex-wrap gap-2">
                    {['{paciente}', '{data}', '{hora}'].map(tag => (
                      <span key={tag} className="text-[10px] font-mono bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-md text-text-secondary">{tag}</span>
                    ))}
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-indigo-50 dark:bg-indigo-500/5 rounded-2xl border border-indigo-100 dark:border-indigo-500/10">
                  <AlertCircle className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-indigo-800 dark:text-indigo-400 leading-relaxed">
                    Os lembretes serão enviados manualmente através do botão na agenda diária. Em breve teremos envio automático 24h por dia.
                  </p>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button type="button" onClick={() => setIsSettingsOpen(false)} className="px-6 py-2 rounded-xl text-text-secondary hover:bg-zinc-100 dark:hover:bg-zinc-800">Cancelar</button>
                  <button type="submit" className="px-6 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm shadow-indigo-200 dark:shadow-none font-medium">Salvar Configurações</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmModal
        isOpen={!!appointmentToDelete}
        title="Excluir Agendamento"
        message={`Tem certeza que deseja excluir o agendamento de ${appointmentToDelete?.patientName}? Ele será movido para a lixeira.`}
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        onConfirm={confirmDelete}
        onCancel={() => setAppointmentToDelete(null)}
        variant="danger"
      />
    </div>
  );
};
