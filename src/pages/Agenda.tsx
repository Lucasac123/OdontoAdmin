import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType, moveToTrash } from '../firebase';
import { Appointment, Patient, Dentist } from '../types';
import { Calendar as CalendarIcon, Clock, Plus, Trash2, CheckCircle, XCircle, ExternalLink, Settings, Bell, Send, AlertCircle, Loader2 } from 'lucide-react';
import { format, startOfWeek, addDays, isSameDay, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import { NotificationSettings } from '../types';
import { ConfirmModal } from '../components/ConfirmModal';

export const Agenda: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [dentists, setDentists] = useState<Dentist[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isAdding, setIsAdding] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [notifSettings, setNotifSettings] = useState<NotificationSettings | null>(null);
  const [appointmentToDelete, setAppointmentToDelete] = useState<Appointment | null>(null);
  
  const [newAppt, setNewAppt] = useState({
    patientId: '',
    responsibleDentistId: '',
    time: '09:00',
    duration: 30 as number | '',
    notes: ''
  });

  useEffect(() => {
    if (!auth.currentUser) return;

    // Fetch patients for dropdown
    const qPatients = query(collection(db, 'patients'), where('dentistId', '==', auth.currentUser.uid));
    const unsubPatients = onSnapshot(qPatients, (snapshot) => {
      setPatients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Patient)));
    });

    // Fetch dentists
    const qDentists = query(collection(db, 'dentists'), where('dentistId', '==', auth.currentUser.uid));
    const unsubDentists = onSnapshot(qDentists, (snapshot) => {
      setDentists(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Dentist)));
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
      unsubDentists();
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

        if (notifSettings.type === 'sms' || notifSettings.type === 'both' || notifSettings.type === 'all') {
          console.log(`[SMS] Enviando para ${patient.phone}: ${message}`);
        }
        if (notifSettings.type === 'email' || notifSettings.type === 'both' || notifSettings.type === 'all') {
          console.log(`[EMAIL] Enviando para ${patient.email}: ${message}`);
        }
        if (notifSettings.type === 'whatsapp' || notifSettings.type === 'all') {
          console.log(`[WHATSAPP] Enviando para ${patient.phone}: ${message}`);
        }
        
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
    if (!auth.currentUser || !newAppt.patientId || !newAppt.responsibleDentistId) return;

    const patient = patients.find(p => p.id === newAppt.patientId);
    
    const [hours, minutes] = newAppt.time.split(':');
    const apptDate = new Date(selectedDate);
    apptDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);

    const hasConflict = appointments.some(app =>
      app.status !== 'cancelled' &&
      app.responsibleDentistId === newAppt.responsibleDentistId &&
      isSameDay(parseISO(app.date), apptDate) &&
      format(parseISO(app.date), 'HH:mm') === newAppt.time
    );

    if (hasConflict) {
      alert('Já existe um agendamento para este dentista neste horário.');
      return;
    }

    try {
      await addDoc(collection(db, 'appointments'), {
        dentistId: auth.currentUser.uid,
        responsibleDentistId: newAppt.responsibleDentistId,
        patientId: newAppt.patientId,
        patientName: patient?.name || 'Desconhecido',
        date: apptDate.toISOString(),
        duration: newAppt.duration,
        notes: newAppt.notes,
        status: 'scheduled',
        createdAt: new Date().toISOString()
      });
      setIsAdding(false);
      setNewAppt({ patientId: '', responsibleDentistId: '', time: '09:00', duration: 30, notes: '' });
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

  const startDateWeek = startOfWeek(selectedDate, { weekStartsOn: 0 });
  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(startDateWeek, i));

  const dayAppointments = appointments
    .filter(a => isSameDay(parseISO(a.date), selectedDate))
    .sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 shrink-0">
        <div>
          <h1 className="text-5xl font-black text-text-primary tracking-tight">Agenda</h1>
          <p className="text-text-secondary mt-2 font-medium">GERENCIE SEUS ATENDIMENTOS E SINCRONIZE COM O GOOGLE AGENDA</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center justify-center gap-2 bg-surface text-text-primary border border-zinc-200/50 dark:border-zinc-800 px-6 py-3 rounded-2xl hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all text-xs font-black uppercase tracking-widest shadow-sm"
          >
            <Settings className="w-4 h-4 text-emerald-500" />
            Lembretes
          </button>
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center justify-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-2xl hover:bg-emerald-700 transition-all text-xs font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 active:scale-95"
          >
            <Plus className="w-5 h-5" />
            Novo Agendamento
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-8 min-h-0">
        <div className="w-full lg:w-1/3 flex flex-col gap-6 shrink-0">
          <div className="bg-surface rounded-[32px] shadow-sm border border-zinc-200/50 dark:border-zinc-800 p-8">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-black text-text-primary tracking-tight capitalize">
                {format(selectedDate, 'MMMM yyyy', { locale: ptBR })}
              </h3>
              <div className="flex gap-2">
                <button onClick={() => setSelectedDate(addDays(selectedDate, -7))} className="p-2.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl text-text-primary border border-zinc-200/50 transition-all shadow-sm">&lt;</button>
                <button onClick={() => setSelectedDate(addDays(selectedDate, 7))} className="p-2.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl text-text-primary border border-zinc-200/50 transition-all shadow-sm">&gt;</button>
              </div>
            </div>
            
            <div className="grid grid-cols-7 gap-2 text-center mb-4">
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
                <div key={d} className="text-[10px] font-black text-text-secondary uppercase tracking-widest">{d}</div>
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
                    className={`aspect-square flex flex-col items-center justify-center rounded-2xl text-sm relative transition-all duration-300 ${
                      isSelected 
                        ? 'bg-emerald-600 text-white font-black shadow-lg shadow-emerald-500/20 scale-110 z-10' 
                        : 'hover:bg-emerald-50 dark:hover:bg-emerald-500/10 text-text-primary'
                    }`}
                  >
                    {format(day, 'd')}
                    {hasAppts && !isSelected && (
                      <div className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-sm" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <AnimatePresence>
            {isAdding && (
              <motion.form 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onSubmit={handleAdd} 
                className="bg-surface rounded-[32px] shadow-sm border border-zinc-200/50 dark:border-zinc-800 p-8 space-y-6 overflow-hidden relative"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-bl-full -mr-8 -mt-8" />
                <h3 className="text-xl font-black text-text-primary tracking-tight">Novo Agendamento</h3>
                <p className="text-[10px] font-black text-text-secondary uppercase tracking-widest -mt-4">{format(selectedDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}</p>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-text-secondary uppercase tracking-widest mb-2">Paciente</label>
                    <select required value={newAppt.patientId} onChange={e => setNewAppt({...newAppt, patientId: e.target.value})} className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-5 py-3 text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all">
                      <option value="">Selecione um paciente...</option>
                      {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-text-secondary uppercase tracking-widest mb-2">Dentista</label>
                    <select required value={newAppt.responsibleDentistId} onChange={e => setNewAppt({...newAppt, responsibleDentistId: e.target.value})} className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-5 py-3 text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all">
                      <option value="">Selecione um dentista...</option>
                      {dentists.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-text-secondary uppercase tracking-widest mb-2">Horário</label>
                      <input type="time" required value={newAppt.time} onChange={e => setNewAppt({...newAppt, time: e.target.value})} className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-5 py-3 text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-text-secondary uppercase tracking-widest mb-2">Duração (min)</label>
                      <input type="number" step="15" required value={newAppt.duration} onChange={e => setNewAppt({...newAppt, duration: e.target.value === '' ? '' : parseInt(e.target.value)})} className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-5 py-3 text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all" />
                    </div>
                  </div>
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setIsAdding(false)} className="flex-1 px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-text-secondary hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all text-center">Cancelar</button>
                  <button type="submit" className="flex-1 px-4 py-3 rounded-2xl bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 shadow-lg shadow-emerald-500/20 transition-all text-center">Salvar</button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </div>

        <div className="flex-1 bg-surface rounded-[32px] shadow-sm border border-zinc-200/50 dark:border-zinc-800 overflow-hidden flex flex-col">
          <div className="p-8 border-b border-zinc-100 dark:border-zinc-800 shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-6 bg-zinc-50/30 dark:bg-zinc-800/20">
            <h2 className="text-2xl font-black text-text-primary flex items-center gap-3 tracking-tight">
              <CalendarIcon className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
              Consultas do dia {format(selectedDate, 'dd/MM/yyyy')}
            </h2>
            {dayAppointments.length > 0 && notifSettings?.enabled && (
              <button
                onClick={handleSendReminders}
                disabled={isSending}
                className="flex items-center gap-2 text-xs font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-5 py-2.5 rounded-xl transition-all disabled:opacity-50 uppercase tracking-widest border border-emerald-100 dark:border-emerald-500/20 shadow-sm"
              >
                {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Enviar Lembretes
              </button>
            )}
          </div>
          
          <div className="flex-1 overflow-y-auto p-8">
            {dayAppointments.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-text-secondary py-20">
                <div className="w-20 h-20 bg-zinc-50 dark:bg-zinc-800/50 rounded-[28px] flex items-center justify-center mb-6">
                  <CalendarIcon className="w-10 h-10 opacity-20" />
                </div>
                <p className="font-medium italic opacity-60">Nenhuma consulta agendada para este dia.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <AnimatePresence initial={false}>
                  {dayAppointments.map(app => (
                    <motion.div 
                      key={app.id} 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className={`p-6 rounded-[28px] border transition-all duration-300 group hover:shadow-md ${
                        app.status === 'completed' ? 'bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-800/30' :
                        app.status === 'cancelled' ? 'bg-red-50/50 dark:bg-red-900/10 border-red-100 dark:border-red-800/30' :
                        'bg-surface border-zinc-100 dark:border-zinc-800 hover:border-emerald-500/30'
                      } flex flex-col sm:flex-row gap-6 sm:items-center justify-between overflow-hidden`}
                    >
                      <div className="flex items-center gap-6">
                        <div className={`w-16 h-16 rounded-2xl flex flex-col items-center justify-center shrink-0 border transition-all duration-300 shadow-sm ${
                          app.status === 'completed' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 border-emerald-200' :
                          app.status === 'cancelled' ? 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400 border-red-200' :
                          'bg-zinc-50 text-text-primary dark:bg-zinc-800 dark:text-text-primary border-zinc-200 group-hover:bg-emerald-600 group-hover:text-white group-hover:border-emerald-600'
                        }`}>
                          <span className="text-base font-black tracking-tight">{format(parseISO(app.date), 'HH:mm')}</span>
                        </div>
                        
                        <div>
                          <h4 className="font-black text-xl text-text-primary tracking-tight transition-colors group-hover:text-emerald-600 uppercase">{app.patientName}</h4>
                          <div className="flex items-center gap-4 text-[10px] font-black text-text-secondary mt-2 uppercase tracking-widest">
                            <span className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800 px-3 py-1.5 rounded-xl border border-zinc-200/50"><Clock className="w-3.5 h-3.5 text-emerald-500" /> {app.duration} min</span>
                            {app.notes && <span className="truncate max-w-[200px] italic border-l border-zinc-200 pl-4 ml-1">{app.notes}</span>}
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
                              className="p-3 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-xl transition-all border border-transparent hover:border-blue-100"
                              title="Google Agenda"
                            >
                              <ExternalLink className="w-5 h-5" />
                            </a>
                            <button onClick={() => handleStatusChange(app.id, 'completed')} className="p-3 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-xl transition-all border border-transparent hover:border-emerald-100" title="Marcar como concluída">
                              <CheckCircle className="w-5 h-5" />
                            </button>
                            <button onClick={() => handleStatusChange(app.id, 'cancelled')} className="p-3 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition-all border border-transparent hover:border-red-100" title="Cancelar">
                              <XCircle className="w-5 h-5" />
                            </button>
                          </>
                        )}
                        <button onClick={() => handleDelete(app)} className="p-3 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all">
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
      
      {/* Settings Modal */}
      <AnimatePresence>
        {isSettingsOpen && notifSettings && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-surface rounded-[32px] shadow-2xl border border-zinc-200/50 dark:border-zinc-800 w-full max-w-lg overflow-hidden relative"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-bl-full -mr-12 -mt-12" />
              <div className="p-8 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Bell className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
                  <h3 className="text-2xl font-black text-text-primary tracking-tight">Lembretes</h3>
                </div>
                <button onClick={() => setIsSettingsOpen(false)} className="p-2.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-all text-text-secondary border border-zinc-200/50 shadow-sm">
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSaveSettings} className="p-8 space-y-6">
                <div className="flex items-center justify-between p-6 bg-zinc-50 dark:bg-zinc-800/50 rounded-[24px] border border-zinc-200/50 dark:border-zinc-700">
                  <div>
                    <h4 className="text-sm font-black text-text-primary uppercase tracking-tight">Ativar Notificações</h4>
                    <p className="text-[10px] text-text-secondary uppercase tracking-widest mt-1">Sincronização com pacientes</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setNotifSettings({ ...notifSettings, enabled: !notifSettings.enabled })}
                    className={`w-14 h-7 rounded-full transition-all relative ${notifSettings.enabled ? 'bg-emerald-600 shadow-lg shadow-emerald-500/30' : 'bg-zinc-300 dark:bg-zinc-700'}`}
                  >
                    <div className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-all shadow-md ${notifSettings.enabled ? 'left-8' : 'left-1'}`} />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-text-secondary uppercase tracking-widest mb-2">Canal</label>
                    <select
                      value={notifSettings.type}
                      onChange={e => setNotifSettings({ ...notifSettings, type: e.target.value as any })}
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-5 py-3 text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none"
                    >
                      <option value="sms">SMS</option>
                      <option value="email">E-mail</option>
                      <option value="whatsapp">WhatsApp</option>
                      <option value="both">Ambos (SMS/E-mail)</option>
                      <option value="all">Todos os Canais</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-text-secondary uppercase tracking-widest mb-2">Antecedência (h)</label>
                    <input
                      type="number"
                      value={notifSettings.hoursBefore}
                      onChange={e => setNotifSettings({ ...notifSettings, hoursBefore: e.target.value === '' ? '' : parseInt(e.target.value) })}
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-5 py-3 text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-text-secondary uppercase tracking-widest mb-2">Modelo da Mensagem</label>
                  <textarea
                    value={notifSettings.messageTemplate}
                    onChange={e => setNotifSettings({ ...notifSettings, messageTemplate: e.target.value })}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-5 py-3 text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none resize-none h-32"
                  />
                  <div className="mt-3 flex flex-wrap gap-2">
                    {['{paciente}', '{data}', '{hora}'].map(tag => (
                      <span key={tag} className="text-[9px] font-black bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-md text-text-secondary border border-zinc-200/50 uppercase">{tag}</span>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t border-zinc-100 dark:border-zinc-800">
                  <button type="button" onClick={() => setIsSettingsOpen(false)} className="px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-text-secondary hover:bg-zinc-100 transition-all">Cancelar</button>
                  <button type="submit" className="px-8 py-3 rounded-2xl bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 shadow-lg shadow-emerald-500/20 transition-all">Salvar</button>
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

export default Agenda;
