import React, { useState } from 'react';
import { Patient } from '../../types';
import { Printer, Calculator, Pill, AlertCircle, FileText, Clock, Stethoscope, Info, BookOpen, Save, Upload, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../../firebase';
import { SystemicAnestheticTable } from './SystemicAnestheticTable';
import { PediatricTable } from './PediatricTable';
import { CidTable } from './CidTable';
import { MedicationPosologyTable } from '../MedicationPosologyTable';
import { PrescriptionTemplatesModal } from './PrescriptionTemplatesModal';

export const PrescriptionTab = ({ patient }: { patient: Patient }) => {
  const [documentType, setDocumentType] = useState<'prescription' | 'certificate' | 'attendance' | 'referral' | 'postop' | 'laudo' | 'exame'>('prescription');
  const [prescriptionText, setPrescriptionText] = useState(`Para: ${patient.name}\nData: ${new Date().toLocaleDateString('pt-BR')}\n\nUso Interno:\n1. Amoxicilina 500mg\nTomar 1 cápsula de 8 em 8 horas por 7 dias.\n\nUso Externo:\n1. Periogard\nBochechar 15ml por 1 minuto a cada 12 horas.\n\n\n\n___________________________________\nAssinatura e Carimbo`);
  const [certificateText, setCertificateText] = useState(`ATESTADO ODONTOLÓGICO\n\nAtesto para os devidos fins que o(a) paciente ${patient.name}, portador(a) do CPF _________________, esteve sob meus cuidados profissionais no dia ${new Date().toLocaleDateString('pt-BR')}, das ____ às ____ horas, necessitando de ____ dias de repouso por motivo de tratamento odontológico.\n\nCID-10: K04 (Exemplo)\n\n\n\n___________________________________\nAssinatura e Carimbo`);
  const [attendanceText, setAttendanceText] = useState(`DECLARAÇÃO DE COMPARECIMENTO\n\nDeclaro para os devidos fins que o(a) paciente ${patient.name}, portador(a) do CPF _________________, compareceu a esta clínica odontológica no dia ${new Date().toLocaleDateString('pt-BR')}, das ____ às ____ horas, para realização de consulta/tratamento odontológico.\n\n\n\n___________________________________\nAssinatura e Carimbo`);
  const [referralText, setReferralText] = useState(`CARTA DE ENCAMINHAMENTO / AVALIAÇÃO MÉDICA\n\nAo colega Médico(a),\n\nO(a) paciente ${patient.name}, encontra-se em tratamento odontológico em nossa clínica. Planejamos realizar procedimentos de [descrever procedimentos, ex: cirurgia oral menor, raspagem periodontal], que envolverão o uso de anestesia local [especificar anestésico, ex: Lidocaína 2% com Epinefrina 1:100.000].\n\nSolicito, por gentileza, avaliação e parecer cardiológico/médico quanto ao risco cirúrgico e liberação para o procedimento proposto, bem como orientações sobre a necessidade de suspensão ou alteração de medicamentos de uso contínuo.\n\nAtenciosamente,\n\n\n\n___________________________________\nAssinatura e Carimbo`);
  const [postopText, setPostopText] = useState(`RECOMENDAÇÕES PÓS-OPERATÓRIAS\n\nPaciente: ${patient.name}\nData: ${new Date().toLocaleDateString('pt-BR')}\n\n1. Alimentação: Líquida e pastosa, fria ou gelada nas primeiras 24 horas. Evitar alimentos quentes, duros ou condimentados.\n2. Repouso: Evitar esforço físico, sol e calor por 48 horas. Dormir com a cabeça mais elevada.\n3. Higiene: Não bochechar vigorosamente nas primeiras 24 horas. Escovar os dentes normalmente, com cuidado na área operada.\n4. Sangramento: É normal um leve sangramento (saliva rosada) nas primeiras horas. Em caso de hemorragia, morder uma gaze estéril no local por 30 minutos.\n5. Inchaço: Aplicar bolsa de gelo no rosto (lado operado) nas primeiras 24 horas (20 min aplica, 20 min descansa).\n6. Medicação: Tomar rigorosamente os medicamentos prescritos nos horários indicados.\n\nEm caso de dor intensa, febre ou sangramento excessivo, entre em contato imediatamente.\n\n\n\n___________________________________\nAssinatura e Carimbo`);
  const [laudoText, setLaudoText] = useState(`LAUDO ODONTOLÓGICO\n\nPaciente: ${patient.name}\nData: ${new Date().toLocaleDateString('pt-BR')}\n\nAo exame clínico e radiográfico, observou-se: [Descrição dos achados]\n\nDiagnóstico: [Diagnóstico]\n\nConduta/Tratamento: [Conduta]\n\n\n\n___________________________________\nAssinatura e Carimbo`);
  const [exameText, setExameText] = useState(`SOLICITAÇÃO DE EXAMES\n\nPaciente: ${patient.name}\nData: ${new Date().toLocaleDateString('pt-BR')}\n\nSolicito a realização dos seguintes exames:\n( ) Radiografia Periapical de [Dentes]\n( ) Radiografia Panorâmica\n( ) Tomografia Computadorizada de [Região]\n( ) Exames laboratoriais: [Exames]\n\nFinalidade: [Finalidade]\n\n\n\n___________________________________\nAssinatura e Carimbo`);
  
  const [prescriptionStatus, setPrescriptionStatus] = useState<'não impresso' | 'não assinado' | 'assinado'>('não impresso');
  
  // Modals state
  const [showCidTable, setShowCidTable] = useState(false);
  const [showPediatricTable, setShowPediatricTable] = useState(false);
  const [showSystemicTable, setShowSystemicTable] = useState(false);
  const [showPosologyTable, setShowPosologyTable] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  
  const [childWeight, setChildWeight] = useState('');
  const [selectedDrug, setSelectedDrug] = useState('amoxicilina');
  const [calculatedDose, setCalculatedDose] = useState<{name: string, dose: string, posology: string} | null>(null);

  const [anestheticWeight, setAnestheticWeight] = useState('');
  const [selectedAnesthetic, setSelectedAnesthetic] = useState('lidocaina_2_epi');
  const [maxTubetes, setMaxTubetes] = useState<number | null>(null);

  const ANESTHETICS = {
    lidocaina_2_epi: { name: 'Lidocaína 2% c/ Epi (1:100.000)', maxDose: 4.4, mgPerTubete: 36 },
    mepivacaina_2_epi: { name: 'Mepivacaína 2% c/ Epi (1:100.000)', maxDose: 4.4, mgPerTubete: 36 },
    mepivacaina_3_sv: { name: 'Mepivacaína 3% s/ Vaso', maxDose: 4.4, mgPerTubete: 54 },
    prilocaina_3_feli: { name: 'Prilocaína 3% c/ Felipressina', maxDose: 6.0, mgPerTubete: 54 },
    articaina_4_epi: { name: 'Articaína 4% c/ Epi (1:100.000)', maxDose: 7.0, mgPerTubete: 72 },
    bupivacaina_05_epi: { name: 'Bupivacaína 0.5% c/ Epi (1:200.000)', maxDose: 1.3, mgPerTubete: 9 },
  };

  const calculateAnesthetic = () => {
    const weight = parseFloat(anestheticWeight);
    if (isNaN(weight) || weight <= 0) {
      setMaxTubetes(null);
      return;
    }

    const anesthetic = ANESTHETICS[selectedAnesthetic as keyof typeof ANESTHETICS];
    const totalMaxMg = weight * anesthetic.maxDose;
    const tubetes = totalMaxMg / anesthetic.mgPerTubete;
    setMaxTubetes(tubetes);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    let contentToPrint = '';
    let title = '';

    switch (documentType) {
      case 'prescription':
        contentToPrint = prescriptionText;
        title = 'RECEITUÁRIO ODONTOLÓGICO';
        break;
      case 'certificate':
        contentToPrint = certificateText;
        title = 'ATESTADO ODONTOLÓGICO';
        break;
      case 'attendance':
        contentToPrint = attendanceText;
        title = 'DECLARAÇÃO DE COMPARECIMENTO';
        break;
      case 'referral':
        contentToPrint = referralText;
        title = 'CARTA DE ENCAMINHAMENTO';
        break;
      case 'postop':
        contentToPrint = postopText;
        title = 'RECOMENDAÇÕES PÓS-OPERATÓRIAS';
        break;
    }

    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>${title} - ${patient.name}</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 40px; line-height: 1.6; }
              .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 40px; }
              .content { white-space: pre-wrap; font-size: 16px; }
              .footer { text-align: center; margin-top: 100px; font-size: 14px; color: #666; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>${title}</h1>
              <p>Dr(a). Dentista - CRO 12345</p>
            </div>
            <div class="content">${contentToPrint}</div>
            <div class="footer">Gerado por OdontoAdmin</div>
            <script>window.print(); window.close();</script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  const calculatePosology = () => {
    const weight = parseFloat(childWeight);
    if (isNaN(weight) || weight <= 0) {
      setCalculatedDose(null);
      return;
    }

    let result = { name: '', dose: '', posology: '' };
    switch (selectedDrug) {
      case 'amoxicilina':
      case 'amoxicilina_clavulanato': {
        const doseDiaAmox = weight * 50;
        const dosePorTomadaAmox = Math.min(doseDiaAmox / 3, 500); // Max 500mg per dose
        const mlPorTomadaAmox = (dosePorTomadaAmox * 5) / 250;
        result = {
          name: selectedDrug === 'amoxicilina' ? 'Amoxicilina Suspensão 250mg/5ml' : 'Amoxicilina + Clavulanato Suspensão 250mg+62,5mg/5ml',
          dose: `${mlPorTomadaAmox.toFixed(1)} ml`,
          posology: 'de 8 em 8 horas por 7 dias'
        };
        break;
      }
      case 'azitromicina': {
        const doseDiaAzitro = Math.min(weight * 10, 500); // Max 500mg per day
        const mlPorTomadaAzitro = (doseDiaAzitro * 5) / 200;
        result = {
          name: 'Azitromicina Suspensão 200mg/5ml',
          dose: `${mlPorTomadaAzitro.toFixed(1)} ml`,
          posology: 'Dose única diária (24/24h) por 3 a 5 dias'
        };
        break;
      }
      case 'cefalexina': {
        const doseDiaCefa = weight * 50;
        const dosePorTomadaCefa = Math.min(doseDiaCefa / 4, 500); // Max 500mg per dose
        const mlPorTomadaCefa = (dosePorTomadaCefa * 5) / 250;
        result = {
          name: 'Cefalexina Suspensão 250mg/5ml',
          dose: `${mlPorTomadaCefa.toFixed(1)} ml`,
          posology: 'de 6 em 6 horas por 7 dias'
        };
        break;
      }
      case 'clindamicina': {
        const doseDiaClinda = weight * 25;
        const dosePorTomadaClinda = Math.min(doseDiaClinda / 3, 300); // Max 300mg per dose
        const mlPorTomadaClinda = (dosePorTomadaClinda * 5) / 75;
        result = {
          name: 'Clindamicina Suspensão 75mg/5ml',
          dose: `${mlPorTomadaClinda.toFixed(1)} ml`,
          posology: 'de 8 em 8 horas por 7 dias'
        };
        break;
      }
      case 'dipirona': {
        const gotasDipirona = Math.min(Math.floor(weight), 40);
        result = {
          name: 'Dipirona Gotas 500mg/ml',
          dose: `${gotasDipirona} gotas`,
          posology: 'de 6 em 6 horas em caso de dor ou febre'
        };
        break;
      }
      case 'ibuprofeno': {
        const gotasIbuprofeno = Math.min(Math.floor(weight), 40);
        result = {
          name: 'Ibuprofeno Gotas 50mg/ml',
          dose: `${gotasIbuprofeno} gotas`,
          posology: 'de 6 em 6 horas em caso de dor ou inflamação'
        };
        break;
      }
      case 'paracetamol': {
        const gotasParacetamol = Math.min(Math.floor(weight), 35);
        result = {
          name: 'Paracetamol Gotas 200mg/ml',
          dose: `${gotasParacetamol} gotas`,
          posology: 'de 6 em 6 horas em caso de dor ou febre'
        };
        break;
      }
      case 'nimesulida': {
        const gotasNimesulida = Math.min(Math.floor(weight), 20);
        result = {
          name: 'Nimesulida Gotas 50mg/ml',
          dose: `${gotasNimesulida} gotas`,
          posology: 'de 12 em 12 horas por no máximo 5 dias (Apenas > 12 anos)'
        };
        break;
      }
      default:
        setCalculatedDose(null);
        return;
    }
    setCalculatedDose(result);
  };

  const addDoseToPrescription = () => {
    if (calculatedDose) {
      const template = `\n\nMedicamento: ${calculatedDose.name}\nDose: ${calculatedDose.dose}\nPosologia: ${calculatedDose.posology}\n\n___________________________________`;
      setPrescriptionText(prev => prev.replace('\n\n\n\n___________________________________', `${template}\n\n\n\n___________________________________`));
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-wrap bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl w-full">
            <button
              onClick={() => setDocumentType('prescription')}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                documentType === 'prescription' 
                  ? 'bg-white dark:bg-zinc-700 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <Pill className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Receituário</span>
              <span className="sm:hidden">Rec.</span>
            </button>
            <button
              onClick={() => setDocumentType('certificate')}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                documentType === 'certificate' 
                  ? 'bg-white dark:bg-zinc-700 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Atestado</span>
              <span className="sm:hidden">Atest.</span>
            </button>
            <button
              onClick={() => setDocumentType('attendance')}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                documentType === 'attendance' 
                  ? 'bg-white dark:bg-zinc-700 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Comparecimento</span>
              <span className="sm:hidden">Comp.</span>
            </button>
            <button
              onClick={() => setDocumentType('referral')}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                documentType === 'referral' 
                  ? 'bg-white dark:bg-zinc-700 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <Stethoscope className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Carta Médico</span>
              <span className="sm:hidden">Carta</span>
            </button>
            <button
              onClick={() => setDocumentType('postop')}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                documentType === 'postop' 
                  ? 'bg-white dark:bg-zinc-700 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <Info className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Pós-Op</span>
              <span className="sm:hidden">Pós</span>
            </button>
            <button
              onClick={() => setDocumentType('laudo')}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                documentType === 'laudo' 
                  ? 'bg-white dark:bg-zinc-700 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Laudo</span>
              <span className="sm:hidden">Laudo</span>
            </button>
            <button
              onClick={() => setDocumentType('exame')}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                documentType === 'exame' 
                  ? 'bg-white dark:bg-zinc-700 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Exames</span>
              <span className="sm:hidden">Exame</span>
            </button>
          </div>
          <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto">
            <button 
              onClick={() => setShowTemplates(true)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-4 py-2 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors text-sm font-medium"
            >
              <BookOpen className="w-4 h-4" />
              Modelos
            </button>
            <button 
              onClick={handlePrint}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-4 py-2 rounded-xl hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors text-sm font-medium"
            >
              <Printer className="w-4 h-4" />
              Imprimir
            </button>
          </div>
        </div>

        <div className="bg-surface rounded-3xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm">
          <textarea
            value={
              documentType === 'prescription' ? prescriptionText :
              documentType === 'certificate' ? certificateText :
              documentType === 'attendance' ? attendanceText :
              documentType === 'referral' ? referralText :
              documentType === 'postop' ? postopText :
              documentType === 'laudo' ? laudoText :
              exameText
            }
            onChange={(e) => {
              if (documentType === 'prescription') setPrescriptionText(e.target.value);
              else if (documentType === 'certificate') setCertificateText(e.target.value);
              else if (documentType === 'attendance') setAttendanceText(e.target.value);
              else if (documentType === 'referral') setReferralText(e.target.value);
              else if (documentType === 'postop') setPostopText(e.target.value);
              else if (documentType === 'laudo') setLaudoText(e.target.value);
              else setExameText(e.target.value);
            }}
            className="w-full h-[500px] bg-surface border border-zinc-200 dark:border-zinc-700 rounded-xl p-6 text-text-primary focus:ring-2 focus:ring-indigo-500 resize-none font-mono text-sm leading-relaxed"
          />
        </div>

        {/* Quick Reference Tables */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button 
            onClick={() => setShowSystemicTable(true)}
            className="flex items-center justify-between p-4 bg-surface border border-zinc-200 dark:border-zinc-700 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-500/10 flex items-center justify-center text-red-600 dark:text-red-400">
                <AlertCircle className="w-4 h-4" />
              </div>
              <span className="font-medium text-text-primary text-sm">Anestésicos p/ Sistêmicos</span>
            </div>
          </button>
          
          <button 
            onClick={() => setShowPediatricTable(true)}
            className="flex items-center justify-between p-4 bg-surface border border-zinc-200 dark:border-zinc-700 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <Calculator className="w-4 h-4" />
              </div>
              <span className="font-medium text-text-primary text-sm">Tabela Odontopediatria</span>
            </div>
          </button>

          <button 
            onClick={() => setShowCidTable(true)}
            className="flex items-center justify-between p-4 bg-surface border border-zinc-200 dark:border-zinc-700 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <BookOpen className="w-4 h-4" />
              </div>
              <span className="font-medium text-text-primary text-sm">Tabela CID-10</span>
            </div>
          </button>

          <button 
            onClick={() => setShowPosologyTable(true)}
            className="flex items-center justify-between p-4 bg-surface border border-zinc-200 dark:border-zinc-700 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <Pill className="w-4 h-4" />
              </div>
              <span className="font-medium text-text-primary text-sm">Tabela de Posologia</span>
            </div>
          </button>
        </div>
      </div>

      <div className="space-y-6">
        <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-3xl border border-indigo-100 dark:border-indigo-800/30 p-6">
          <h3 className="text-lg font-bold text-indigo-900 dark:text-indigo-100 flex items-center gap-2 mb-6">
            <Calculator className="w-5 h-5" />
            Calculadora Pediátrica
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-indigo-900 dark:text-indigo-200 mb-1">Peso da Criança (kg)</label>
              <input 
                type="number" 
                step="0.1"
                value={childWeight}
                onChange={(e) => setChildWeight(e.target.value)}
                placeholder="Ex: 15.5"
                className="w-full bg-surface border border-indigo-200 dark:border-indigo-700 rounded-xl px-4 py-2 text-text-primary focus:ring-2 focus:ring-indigo-500" 
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-indigo-900 dark:text-indigo-200 mb-1">Medicamento</label>
              <select 
                value={selectedDrug}
                onChange={(e) => setSelectedDrug(e.target.value)}
                className="w-full bg-surface border border-indigo-200 dark:border-indigo-700 rounded-xl px-4 py-2 text-text-primary focus:ring-2 focus:ring-indigo-500"
              >
                <option value="amoxicilina">Amoxicilina Susp. 250mg/5ml</option>
                <option value="amoxicilina_clavulanato">Amoxicilina + Clavulanato Susp. 250mg+62,5mg/5ml</option>
                <option value="azitromicina">Azitromicina Susp. 200mg/5ml</option>
                <option value="cefalexina">Cefalexina Susp. 250mg/5ml</option>
                <option value="clindamicina">Clindamicina Susp. 75mg/5ml</option>
                <option value="dipirona">Dipirona Gotas 500mg/ml</option>
                <option value="ibuprofeno">Ibuprofeno Gotas 50mg/ml</option>
                <option value="paracetamol">Paracetamol Gotas 200mg/ml</option>
                <option value="nimesulida">Nimesulida Gotas 50mg/ml</option>
              </select>
            </div>

            <button 
              onClick={calculatePosology}
              className="w-full bg-indigo-600 text-white py-2 rounded-xl font-medium hover:bg-indigo-700 transition-colors"
            >
              Calcular Dose
            </button>

            <AnimatePresence>
              {calculatedDose && (
                <motion.div 
                  initial={{ opacity: 0, height: 0, y: -10 }}
                  animate={{ opacity: 1, height: 'auto', y: 0 }}
                  exit={{ opacity: 0, height: 0, y: -10 }}
                  className="mt-6 p-4 bg-surface rounded-xl border border-indigo-200 dark:border-indigo-700 shadow-sm overflow-hidden"
                >
                  <h4 className="text-sm font-bold text-indigo-900 dark:text-indigo-200 mb-2">Resultado:</h4>
                  <div className="text-sm text-text-secondary mb-4">
                    <p><strong>Medicamento:</strong> {calculatedDose.name}</p>
                    <p><strong>Dose:</strong> {calculatedDose.dose}</p>
                    <p><strong>Posologia:</strong> {calculatedDose.posology}</p>
                  </div>
                  <button 
                    onClick={addDoseToPrescription}
                    className="w-full text-sm bg-indigo-100 dark:bg-indigo-800 text-indigo-700 dark:text-indigo-200 py-2 rounded-lg font-medium hover:bg-indigo-200 dark:hover:bg-indigo-700 transition-colors"
                  >
                    Adicionar ao Receituário
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-3xl border border-emerald-100 dark:border-emerald-800/30 p-6">
          <h3 className="text-lg font-bold text-emerald-900 dark:text-emerald-100 flex items-center gap-2 mb-6">
            <Calculator className="w-5 h-5" />
            Cálculo Anestésico
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-emerald-900 dark:text-emerald-200 mb-1">Peso do Paciente (kg)</label>
              <input 
                type="number" 
                step="0.1"
                value={anestheticWeight}
                onChange={(e) => setAnestheticWeight(e.target.value)}
                placeholder="Ex: 70"
                className="w-full bg-surface border border-emerald-200 dark:border-emerald-700 rounded-xl px-4 py-2 text-text-primary focus:ring-2 focus:ring-emerald-500" 
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-emerald-900 dark:text-emerald-200 mb-1">Anestésico</label>
              <select 
                value={selectedAnesthetic}
                onChange={(e) => setSelectedAnesthetic(e.target.value)}
                className="w-full bg-surface border border-emerald-200 dark:border-emerald-700 rounded-xl px-4 py-2 text-text-primary focus:ring-2 focus:ring-emerald-500"
              >
                {Object.entries(ANESTHETICS).map(([key, value]) => (
                  <option key={key} value={key}>{value.name}</option>
                ))}
              </select>
            </div>

            <button 
              onClick={calculateAnesthetic}
              className="w-full bg-emerald-600 text-white py-2 rounded-xl font-medium hover:bg-emerald-700 transition-colors"
            >
              Calcular Limite
            </button>

            <AnimatePresence>
              {maxTubetes !== null && (
                <motion.div 
                  initial={{ opacity: 0, height: 0, y: -10 }}
                  animate={{ opacity: 1, height: 'auto', y: 0 }}
                  exit={{ opacity: 0, height: 0, y: -10 }}
                  className="mt-6 p-4 bg-surface rounded-xl border border-emerald-200 dark:border-emerald-700 shadow-sm overflow-hidden"
                >
                  <h4 className="text-sm font-bold text-emerald-900 dark:text-emerald-200 mb-2">Limite Máximo:</h4>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-emerald-600">{maxTubetes.toFixed(1)}</span>
                    <span className="text-sm text-text-secondary">tubetes</span>
                  </div>
                  <p className="text-[10px] text-text-secondary mt-2 leading-tight">
                    Baseado na dose máxima de {ANESTHETICS[selectedAnesthetic as keyof typeof ANESTHETICS].maxDose} mg/kg.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-3xl border border-amber-100 dark:border-amber-800/30 p-6 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800 dark:text-amber-200 leading-relaxed">
            A calculadora é uma ferramenta de auxílio. A prescrição final é de inteira responsabilidade do cirurgião-dentista, devendo avaliar as condições sistêmicas de cada paciente.
          </p>
        </div>
      </div>

      <SystemicAnestheticTable isOpen={showSystemicTable} onClose={() => setShowSystemicTable(false)} />
      <PediatricTable isOpen={showPediatricTable} onClose={() => setShowPediatricTable(false)} />
      <CidTable isOpen={showCidTable} onClose={() => setShowCidTable(false)} />
      <MedicationPosologyTable isOpen={showPosologyTable} onClose={() => setShowPosologyTable(false)} />
      <PrescriptionTemplatesModal 
        isOpen={showTemplates} 
        onClose={() => setShowTemplates(false)} 
        currentType={documentType}
        currentText={
          documentType === 'prescription' ? prescriptionText :
          documentType === 'certificate' ? certificateText :
          documentType === 'attendance' ? attendanceText :
          documentType === 'referral' ? referralText :
          documentType === 'postop' ? postopText :
          documentType === 'laudo' ? laudoText :
          exameText
        }
        onSelectTemplate={(text) => {
          if (documentType === 'prescription') setPrescriptionText(text);
          else if (documentType === 'certificate') setCertificateText(text);
          else if (documentType === 'attendance') setAttendanceText(text);
          else if (documentType === 'referral') setReferralText(text);
          else if (documentType === 'postop') setPostopText(text);
          else if (documentType === 'laudo') setLaudoText(text);
          else setExameText(text);
        }}
      />
    </div>
  );
};
