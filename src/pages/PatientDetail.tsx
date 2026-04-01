import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Patient, Dentist } from '../types';
import { ArrowLeft, User, FileText, FileImage, ClipboardList, Pill, DollarSign, Activity, UserCircle, FileSignature, Briefcase, Microscope, Zap, Calendar, History } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import { AnamnesisTab } from '../components/patient/AnamnesisTab';
import { OdontogramTab } from '../components/patient/OdontogramTab';
import { PrescriptionTab } from '../components/patient/PrescriptionTab';
import { FilesTab } from '../components/patient/FilesTab';
import { TreatmentPlanTab } from '../components/patient/TreatmentPlanTab';
import { PersonalInfoTab } from '../components/patient/PersonalInfoTab';
import { PaymentsTab } from '../components/patient/PaymentsTab';
import { ClinicalEvolutionTab } from '../components/patient/ClinicalEvolutionTab';
import { ConsentFormsTab } from '../components/patient/ConsentFormsTab';
import { LabJobsTab } from '../components/patient/LabJobsTab';

export const PatientDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [dentist, setDentist] = useState<Dentist | null>(null);
  const [activeTab, setActiveTab] = useState('personal');
  const [direction, setDirection] = useState(0);

  useEffect(() => {
    if (!id) return;
    const unsubscribe = onSnapshot(doc(db, 'patients', id), (docSnap) => {
      if (docSnap.exists()) {
        const patientData = { id: docSnap.id, ...docSnap.data() } as Patient;
        setPatient(patientData);
      } else {
        navigate('/patients');
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `patients/${id}`);
    });
    return () => unsubscribe();
  }, [id, navigate]);

  useEffect(() => {
    if (!patient?.responsibleDentistId) {
      setDentist(null);
      return;
    }
    const unsubscribe = onSnapshot(doc(db, 'dentists', patient.responsibleDentistId), (dentistSnap) => {
      if (dentistSnap.exists()) {
        setDentist({ id: dentistSnap.id, ...dentistSnap.data() } as Dentist);
      } else {
        setDentist(null);
      }
    }, (error) => {
      console.error("Error fetching responsible dentist:", error);
    });
    return () => unsubscribe();
  }, [patient?.responsibleDentistId]);

  if (!patient) return (
    <div className="h-full flex flex-col items-center justify-center gap-4">
      <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-600 rounded-full animate-spin" />
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-text-secondary">Sincronizando prontuário...</p>
    </div>
  );

  const tabs = [
    { id: 'personal', label: 'Dados', icon: User, component: PersonalInfoTab },
    { id: 'anamnesis', label: 'Anamnese', icon: FileText, component: AnamnesisTab },
    { id: 'evolution', label: 'Evolução', icon: Activity, component: ClinicalEvolutionTab },
    { id: 'odontogram', label: 'Odontograma', icon: ClipboardList, component: OdontogramTab },
    { id: 'prescription', label: 'Receituário', icon: Pill, component: PrescriptionTab },
    { id: 'consent', label: 'TCLE', icon: FileSignature, component: ConsentFormsTab },
    { id: 'files', label: 'Imagens', icon: FileImage, component: FilesTab },
    { id: 'treatment', label: 'Plano', icon: ClipboardList, component: TreatmentPlanTab },
    { id: 'lab', label: 'Laboratório', icon: Microscope, component: LabJobsTab },
    { id: 'payments', label: 'Financeiro', icon: DollarSign, component: PaymentsTab },
  ];

  const handleTabChange = (tabId: string) => {
    const currentIndex = tabs.findIndex(t => t.id === activeTab);
    const nextIndex = tabs.findIndex(t => t.id === tabId);
    setDirection(nextIndex > currentIndex ? 1 : -1);
    setActiveTab(tabId);
  };

  const ActiveComponent = tabs.find(t => t.id === activeTab)?.component || PersonalInfoTab;

  return (
    <div className="space-y-8 flex flex-col h-full">
      {/* Header Premium */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-10 shrink-0">
        <div className="flex items-center gap-6 group">
          <button 
            onClick={() => navigate('/patients')}
            className="w-14 h-14 rounded-2xl bg-surface border border-zinc-200/50 dark:border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-indigo-600 hover:shadow-xl transition-all shadow-sm active:scale-90"
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-5xl font-black text-text-primary tracking-tighter uppercase leading-none">{patient.name}</h1>
            <div className="flex flex-wrap items-center gap-4 mt-4">
              <div className="flex items-center gap-2 text-text-secondary">
                 <Calendar size={14} className="text-indigo-500" />
                 <span className="text-[10px] font-black uppercase tracking-widest">Desde {new Date(patient.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="w-1.5 h-1.5 rounded-full bg-zinc-200" />
              <div className="flex items-center gap-2 text-text-secondary">
                 <UserCircle size={14} className="text-indigo-500" />
                 <span className="text-[10px] font-black uppercase tracking-widest">{dentist ? dentist.name : 'SEM DENTISTA VINCULADO'}</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Quick Status Badge */}
        <div className="bg-emerald-500/10 text-emerald-600 px-6 py-3 rounded-2xl border border-emerald-500/20 hidden lg:flex items-center gap-3">
           <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />
           <span className="text-[10px] font-black uppercase tracking-[0.2em]">Paciente Ativo</span>
        </div>
      </div>

      {/* Tabs Navigation Capsule */}
      <div className="flex items-center gap-2 bg-zinc-50 dark:bg-zinc-900/50 p-2 rounded-[28px] border border-zinc-100 dark:border-zinc-800/50 no-scrollbar overflow-x-auto shrink-0 mb-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
              activeTab === tab.id 
                ? 'bg-white dark:bg-surface text-indigo-600 shadow-md ring-1 ring-black/5' 
                : 'text-text-secondary hover:text-indigo-600 hover:bg-white/50'
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Viewport Container */}
      <div className="flex-1 bg-surface rounded-[48px] border border-zinc-200/50 dark:border-zinc-800 shadow-sm overflow-hidden relative flex flex-col">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-bl-[120px] pointer-events-none" />
        
        <div className="flex-1 overflow-y-auto no-scrollbar relative p-8 md:p-12">
          <AnimatePresence mode="popLayout" custom={direction}>
            <motion.div
              key={activeTab}
              custom={direction}
              initial={{ opacity: 0, x: direction * 20, scale: 0.98 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -direction * 20, scale: 0.98 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="h-full"
            >
              <ActiveComponent patient={patient} />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default PatientDetail;
