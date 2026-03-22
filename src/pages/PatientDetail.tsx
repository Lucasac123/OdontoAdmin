import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Patient } from '../types';
import { ArrowLeft, User, FileText, FileImage, ClipboardList, Pill, DollarSign } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import { AnamnesisTab } from '../components/patient/AnamnesisTab';
import { OdontogramTab } from '../components/patient/OdontogramTab';
import { PrescriptionTab } from '../components/patient/PrescriptionTab';
import { FilesTab } from '../components/patient/FilesTab';
import { TreatmentPlanTab } from '../components/patient/TreatmentPlanTab';
import { PersonalInfoTab } from '../components/patient/PersonalInfoTab';
import { PaymentsTab } from '../components/patient/PaymentsTab';

export const PatientDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [activeTab, setActiveTab] = useState('personal');
  const [direction, setDirection] = useState(0);

  useEffect(() => {
    if (!id) return;

    const unsubscribe = onSnapshot(doc(db, 'patients', id), (docSnap) => {
      if (docSnap.exists()) {
        setPatient({ id: docSnap.id, ...docSnap.data() } as Patient);
      } else {
        navigate('/patients');
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `patients/${id}`);
    });

    return () => unsubscribe();
  }, [id, navigate]);

  if (!patient) return <div className="p-8 text-center text-zinc-500">Carregando...</div>;

  const tabs = [
    { id: 'personal', label: 'Dados Pessoais', icon: User, component: PersonalInfoTab },
    { id: 'anamnesis', label: 'Anamnese', icon: FileText, component: AnamnesisTab },
    { id: 'odontogram', label: 'Odontograma', icon: ClipboardList, component: OdontogramTab },
    { id: 'prescription', label: 'Receituário', icon: Pill, component: PrescriptionTab },
    { id: 'files', label: 'Arquivos', icon: FileImage, component: FilesTab },
    { id: 'treatment', label: 'Plano de Tratamento', icon: ClipboardList, component: TreatmentPlanTab },
    { id: 'payments', label: 'Pagamentos', icon: DollarSign, component: PaymentsTab },
  ];

  const handleTabChange = (tabId: string) => {
    const currentIndex = tabs.findIndex(t => t.id === activeTab);
    const nextIndex = tabs.findIndex(t => t.id === tabId);
    setDirection(nextIndex > currentIndex ? 1 : -1);
    setActiveTab(tabId);
  };

  const ActiveComponent = tabs.find(t => t.id === activeTab)?.component || AnamnesisTab;

  return (
    <motion.div 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex items-center gap-4">
        <button 
          onClick={() => navigate('/patients')}
          className="p-2 rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-text-primary">{patient.name}</h1>
          <p className="text-sm text-text-secondary">
            Cadastrado em {new Date(patient.createdAt).toLocaleDateString()}
          </p>
        </div>
      </div>

      <div className="bg-surface rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        <div className="flex overflow-x-auto border-b border-zinc-200 dark:border-zinc-800 hide-scrollbar">
          {tabs.map((tab) => (
            <motion.button
              key={tab.id}
              whileHover={{ backgroundColor: 'rgba(0,0,0,0.02)' }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleTabChange(tab.id)}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-medium whitespace-nowrap transition-colors relative ${
                activeTab === tab.id 
                  ? 'text-indigo-600 dark:text-indigo-400' 
                  : 'text-text-secondary hover:text-text-primary hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {activeTab === tab.id && (
                <motion.div 
                  layoutId="activeTab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-400"
                />
              )}
            </motion.button>
          ))}
        </div>
        
        <div className="p-6 min-h-[400px] overflow-hidden">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={activeTab}
              custom={direction}
              variants={{
                enter: (direction: number) => ({
                  x: direction > 0 ? 20 : -20,
                  opacity: 0,
                  scale: 0.98
                }),
                center: {
                  x: 0,
                  opacity: 1,
                  scale: 1
                },
                exit: (direction: number) => ({
                  x: direction > 0 ? -20 : 20,
                  opacity: 0,
                  scale: 0.98
                })
              }}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                x: { type: "spring", stiffness: 300, damping: 30 },
                opacity: { duration: 0.2 },
                scale: { duration: 0.2 }
              }}
            >
              <ActiveComponent patient={patient} />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};
