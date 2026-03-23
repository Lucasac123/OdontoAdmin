import React, { useState } from 'react';
import { Patient } from '../../types';
import { Printer, Calculator, Pill, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const PrescriptionTab = ({ patient }: { patient: Patient }) => {
  const [prescriptionText, setPrescriptionText] = useState(`Para: ${patient.name}\nData: ${new Date().toLocaleDateString('pt-BR')}\n\nUso Interno:\n1. Amoxicilina 500mg\nTomar 1 cápsula de 8 em 8 horas por 7 dias.\n\nUso Externo:\n1. Periogard\nBochechar 15ml por 1 minuto a cada 12 horas.\n\n\n\n___________________________________\nAssinatura e Carimbo`);
  const [prescriptionStatus, setPrescriptionStatus] = useState<'não impresso' | 'não assinado' | 'assinado'>('não impresso');
  
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
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Receituário - ${patient.name}</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 40px; line-height: 1.6; }
              .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 40px; }
              .content { white-space: pre-wrap; font-size: 16px; }
              .footer { text-align: center; margin-top: 100px; font-size: 14px; color: #666; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>RECEITUÁRIO ODONTOLÓGICO</h1>
              <p>Dr(a). Dentista - CRO 12345</p>
            </div>
            <div class="content">${prescriptionText}</div>
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
        const doseDiaAmox = weight * 50;
        const dosePorTomadaAmox = doseDiaAmox / 3;
        const mlPorTomadaAmox = (dosePorTomadaAmox * 5) / 250;
        result = {
          name: 'Amoxicilina Suspensão 250mg/5ml',
          dose: `${mlPorTomadaAmox.toFixed(1)} ml`,
          posology: 'de 8 em 8 horas'
        };
        break;
      case 'dipirona':
        const gotasDipirona = Math.min(Math.floor(weight), 40);
        result = {
          name: 'Dipirona Gotas 500mg/ml',
          dose: `${gotasDipirona} gotas`,
          posology: 'de 6 em 6 horas em caso de dor ou febre'
        };
        break;
      case 'ibuprofeno':
        const gotasIbuprofeno = Math.min(Math.floor(weight), 40);
        result = {
          name: 'Ibuprofeno Gotas 50mg/ml',
          dose: `${gotasIbuprofeno} gotas`,
          posology: 'de 6 em 6 horas em caso de dor ou inflamação'
        };
        break;
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
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
            <Pill className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            Receituário Interativo
          </h2>
          <div className="flex items-center gap-4">
            <select
              value={prescriptionStatus}
              onChange={(e) => setPrescriptionStatus(e.target.value as any)}
              className="bg-surface border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2 text-text-primary focus:ring-2 focus:ring-indigo-500"
            >
              <option value="não impresso">Não impresso</option>
              <option value="não assinado">Não assinado</option>
              <option value="assinado">Assinado</option>
            </select>
            <button 
              onClick={handlePrint}
              className="flex items-center gap-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-4 py-2 rounded-xl hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors"
            >
              <Printer className="w-4 h-4" />
              Imprimir
            </button>
          </div>
        </div>

        <div className="bg-surface rounded-3xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm">
          <textarea
            value={prescriptionText}
            onChange={(e) => setPrescriptionText(e.target.value)}
            className="w-full h-[500px] bg-surface border border-zinc-200 dark:border-zinc-700 rounded-xl p-6 text-text-primary focus:ring-2 focus:ring-indigo-500 resize-none font-mono text-sm leading-relaxed"
          />
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
                <option value="dipirona">Dipirona Gotas 500mg/ml</option>
                <option value="ibuprofeno">Ibuprofeno Gotas 50mg/ml</option>
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
    </div>
  );
};
