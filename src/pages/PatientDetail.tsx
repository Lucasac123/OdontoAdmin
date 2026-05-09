import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, onSnapshot, collection, query, where } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { Patient, Dentist } from '../types';
import { ArrowLeft, User, FileText, FileImage, ClipboardList, Pill, DollarSign, Activity, UserCircle } from 'lucide-react';
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
import { PatientPrintModal } from '../components/patient/PatientPrintModal';
import { FileSignature, Briefcase, Microscope, Printer } from 'lucide-react';

export const PatientDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [dentist, setDentist] = useState<Dentist | null>(null);
  const [activeTab, setActiveTab] = useState('personal');
  const [direction, setDirection] = useState(0);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

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

  if (!patient) return <div className="p-8 text-center text-zinc-500">Carregando...</div>;

  const tabs = [
    { id: 'personal', label: 'Dados Pessoais', icon: User, component: PersonalInfoTab },
    { id: 'anamnesis', label: 'Anamnese', icon: FileText, component: AnamnesisTab },
    { id: 'evolution', label: 'Evolução Clínica', icon: Activity, component: ClinicalEvolutionTab },
    { id: 'odontogram', label: 'Odontograma', icon: ClipboardList, component: OdontogramTab },
    { id: 'prescription', label: 'Receituário', icon: Pill, component: PrescriptionTab },
    { id: 'consent', label: 'Termos (TCLE)', icon: FileSignature, component: ConsentFormsTab },
    { id: 'files', label: 'Arquivos', icon: FileImage, component: FilesTab },
    { id: 'treatment', label: 'Plano de Tratamento', icon: ClipboardList, component: TreatmentPlanTab },
    { id: 'lab', label: 'Laboratório', icon: Microscope, component: LabJobsTab },
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
          <h1 className="text-2xl md:text-3xl font-bold text-text-primary tracking-tight">{patient.name}</h1>
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 mt-1">
            <p className="text-sm text-text-secondary">
              Cadastrado em {new Date(patient.createdAt).toLocaleDateString()}
            </p>
            <div className="hidden sm:block w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
            <div className="flex items-center gap-1.5 text-sm text-text-secondary">
              <UserCircle className="w-4 h-4" />
              <span>{dentist ? dentist.name : 'Sem filiação a dentista específico'}</span>
            </div>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setIsPrintModalOpen(true)}
            className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-4 py-2 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors font-medium text-sm shadow-sm"
          >
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">Imprimir Prontuário</span>
          </button>
        </div>
      </div>

      <div className="bg-surface rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        <div className="border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex overflow-x-auto hide-scrollbar scroll-smooth md:justify-center">
            {tabs.map((tab) => (
              <motion.button
                key={tab.id}
                whileHover={{ backgroundColor: 'rgba(0,0,0,0.02)' }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleTabChange(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 md:px-6 md:py-4 text-sm font-medium whitespace-nowrap transition-colors relative flex-shrink-0 ${
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
        </div>
        
        <div className="p-4 md:p-6 min-h-[400px]">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={activeTab}
              custom={direction}
              variants={{
                enter: (direction: number) => ({
                  x: direction > 0 ? 10 : -10,
                  opacity: 0,
                }),
                center: {
                  x: 0,
                  opacity: 1,
                },
                exit: (direction: number) => ({
                  x: direction > 0 ? -10 : 10,
                  opacity: 0,
                })
              }}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                x: { type: "tween", ease: "easeInOut", duration: 0.15 },
                opacity: { duration: 0.15 }
              }}
            >
              <ActiveComponent patient={patient} />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <PatientPrintModal 
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        patient={patient}
        preSelectedTab={activeTab}
      />
    </motion.div>
  );
};

export default PatientDetail;
