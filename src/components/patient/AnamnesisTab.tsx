import React, { useState, useEffect } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { Patient } from '../../types';
import { Save, Loader2, Printer } from 'lucide-react';
import { useSync } from '../../context/SyncContext';
import { PrintHeader } from '../print/PrintHeader';
import { PrintFooter } from '../print/PrintFooter';

export const AnamnesisTab = ({ patient }: { patient: Patient }) => {
  const [formData, setFormData] = useState({
    mainComplaint: '',
    medicalHistory: '',
    allergies: '',
    medications: '',
    bloodPressure: '',
    diabetes: false,
    hypertension: false,
    cardiacIssues: false,
    bleedingDisorders: false,
    pregnancy: false,
    asthma: false,
    hepatitis: false,
    hiv: false,
    rheumaticFever: false,
    smoker: false,
    alcohol: false,
    anesthesiaReaction: false,
    notes: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const { addSyncTask } = useSync();

  useEffect(() => {
    if (patient.anamnesis) {
      try {
        setFormData(JSON.parse(patient.anamnesis));
      } catch (e) {
        console.error("Failed to parse anamnesis", e);
      }
    }
  }, [patient.anamnesis]);

  const handleSave = () => {
    const savePromise = updateDoc(doc(db, 'patients', patient.id), {
      anamnesis: JSON.stringify(formData),
      updatedAt: new Date().toISOString()
    }).catch(error => {
      handleFirestoreError(error, OperationType.UPDATE, `patients/${patient.id}`);
    });
    
    addSyncTask(savePromise);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <div className="no-print space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-xl font-bold text-text-primary">Ficha de Anamnese</h2>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <button 
              onClick={handlePrint}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-white dark:bg-zinc-800 text-text-primary border border-zinc-200 dark:border-zinc-700 px-4 py-2 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors text-sm"
            >
              <Printer className="w-4 h-4" />
              Exportar PDF
            </button>
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors text-sm"
            >
              <Save className="w-4 h-4" />
              <span className="truncate">Salvar Anamnese</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Motivo da Consulta (Queixa Principal)</label>
              <textarea name="mainComplaint" disabled={isSaving} value={formData.mainComplaint} onChange={handleChange} className="w-full bg-surface border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-text-primary focus:ring-2 focus:ring-indigo-500 resize-none h-24 disabled:opacity-50" />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Histórico Médico</label>
              <textarea name="medicalHistory" disabled={isSaving} value={formData.medicalHistory} onChange={handleChange} className="w-full bg-surface border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-text-primary focus:ring-2 focus:ring-indigo-500 resize-none h-24 disabled:opacity-50" />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Alergias a Medicamentos</label>
              <textarea name="allergies" disabled={isSaving} value={formData.allergies} onChange={handleChange} className="w-full bg-surface border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-text-primary focus:ring-2 focus:ring-indigo-500 resize-none h-20 disabled:opacity-50" />
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-surface p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800">
              <h3 className="text-sm font-medium text-text-primary mb-4">Condições Sistêmicas e Hábitos</h3>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { name: 'diabetes', label: 'Diabetes' },
                  { name: 'hypertension', label: 'Hipertensão' },
                  { name: 'cardiacIssues', label: 'Problemas Cardíacos' },
                  { name: 'bleedingDisorders', label: 'Hemorragia' },
                  { name: 'pregnancy', label: 'Gravidez' },
                  { name: 'asthma', label: 'Asma/Bronquite' },
                  { name: 'hepatitis', label: 'Hepatite' },
                  { name: 'hiv', label: 'HIV/AIDS' },
                  { name: 'rheumaticFever', label: 'Febre Reumática' },
                  { name: 'anesthesiaReaction', label: 'Reação à Anestesia' },
                  { name: 'smoker', label: 'Fumante' },
                  { name: 'alcohol', label: 'Consome Álcool' },
                ].map(condition => (
                  <label key={condition.name} className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      name={condition.name}
                      disabled={isSaving}
                      checked={formData[condition.name as keyof typeof formData] as boolean}
                      onChange={handleChange}
                      className="w-5 h-5 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-900 disabled:opacity-50"
                    />
                    <span className="text-sm text-text-secondary">{condition.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Medicamentos em Uso</label>
              <textarea name="medications" disabled={isSaving} value={formData.medications} onChange={handleChange} className="w-full bg-surface border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-text-primary focus:ring-2 focus:ring-indigo-500 resize-none h-20 disabled:opacity-50" />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Observações Adicionais</label>
              <textarea name="notes" disabled={isSaving} value={formData.notes} onChange={handleChange} className="w-full bg-surface border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-text-primary focus:ring-2 focus:ring-indigo-500 resize-none h-20 disabled:opacity-50" />
            </div>
          </div>
        </div>
      </div>

      {/* --- Print View --- */}
      <div className="print-only max-w-4xl mx-auto font-sans text-sm">
        <PrintHeader title="FICHA CLÍNICA DE ANAMNESE" patientName={patient.name} />
        
        <div className="mt-8 border-2 border-zinc-900 rounded-lg overflow-hidden">
          {/* Dados do Paciente */}
          <div className="bg-zinc-100 font-bold text-zinc-900 p-2 uppercase border-b-2 border-zinc-900 text-xs tracking-wider">
            I. Identificação do Paciente
          </div>
          <div className="p-3 grid grid-cols-3 gap-4 text-sm">
            <div className="col-span-2"><span className="font-bold text-zinc-700">Nome:</span> {patient.name}</div>
            <div><span className="font-bold text-zinc-700">Data Nasc.:</span> {patient.dob ? new Date(patient.dob).toLocaleDateString('pt-BR') : '___/___/_____'}</div>
            <div><span className="font-bold text-zinc-700">CPF:</span> {patient.cpf || '_________________'}</div>
            <div><span className="font-bold text-zinc-700">RG:</span> {patient.rg || '_________________'}</div>
            <div><span className="font-bold text-zinc-700">Telefone:</span> {patient.phone || '_________________'}</div>
          </div>
          
          {/* Informações Clínicas */}
          <div className="bg-zinc-100 font-bold text-zinc-900 p-2 uppercase border-y-2 border-zinc-900 text-xs tracking-wider">
            II. Informações Clínicas
          </div>
          <div className="p-3 space-y-4">
            <div>
              <span className="font-bold text-zinc-700 block mb-1">Motivo da Consulta (Queixa Principal):</span>
              <div className="border-b border-zinc-300 pb-1">{formData.mainComplaint || 'Sem queixa principal relatada.'}</div>
            </div>
            <div>
              <span className="font-bold text-zinc-700 block mb-1">Histórico Médico Atual e Pregresso:</span>
              <div className="border-b border-zinc-300 pb-1">{formData.medicalHistory || 'Nada digno de nota.'}</div>
            </div>
            <div>
              <span className="font-bold text-zinc-700 block mb-1">Alergias (Medicamentos/Outros):</span>
              <div className="border-b border-zinc-300 pb-1">{formData.allergies || 'Nega.'}</div>
            </div>
            <div>
              <span className="font-bold text-zinc-700 block mb-1">Medicamentos em Uso Contínuo:</span>
              <div className="border-b border-zinc-300 pb-1">{formData.medications || 'Nenhum.'}</div>
            </div>
          </div>

          {/* Questionário de Saúde */}
          <div className="bg-zinc-100 font-bold text-zinc-900 p-2 uppercase border-y-2 border-zinc-900 text-xs tracking-wider">
            III. Questionário de Saúde
          </div>
          <div className="p-3 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            {[
              { name: 'diabetes', label: 'Diabetes' },
              { name: 'hypertension', label: 'Hipertensão Arterial' },
              { name: 'cardiacIssues', label: 'Cardiopatias (Problemas Cardíacos)' },
              { name: 'bleedingDisorders', label: 'Hemorragias / Alterações Sanguíneas' },
              { name: 'pregnancy', label: 'Gestante' },
              { name: 'asthma', label: 'Asma / Bronquite' },
              { name: 'hepatitis', label: 'Hepatite' },
              { name: 'hiv', label: 'HIV / AIDS' },
              { name: 'rheumaticFever', label: 'Febre Reumática' },
              { name: 'anesthesiaReaction', label: 'Reação adversa à Anestesia' },
              { name: 'smoker', label: 'Fumante' },
              { name: 'alcohol', label: 'Consome Álcool' },
            ].map(condition => (
              <div key={condition.name} className="flex items-center justify-between border-b border-zinc-200 pb-1">
                <span>{condition.label}</span>
                <div className="flex gap-2">
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 border border-black inline-block text-center text-[10px] leading-3 font-bold">
                      {formData[condition.name as keyof typeof formData] ? 'X' : ''}
                    </span> Sim
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 border border-black inline-block text-center text-[10px] leading-3 font-bold">
                      {!formData[condition.name as keyof typeof formData] ? 'X' : ''}
                    </span> Não
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Observações */}
          <div className="bg-zinc-100 font-bold text-zinc-900 p-2 uppercase border-y-2 border-zinc-900 text-xs tracking-wider">
            IV. Observações Adicionais
          </div>
          <div className="p-3 min-h-[60px]">
            {formData.notes || 'Sem observações adicionais.'}
          </div>

          {/* Termo de Responsabilidade */}
          <div className="bg-zinc-100 font-bold text-zinc-900 p-2 uppercase border-y-2 border-zinc-900 text-xs tracking-wider">
            V. Termo de Responsabilidade
          </div>
          <div className="p-4 text-justify text-xs leading-relaxed text-zinc-800">
            Declaro, sob as penas da lei, que as informações prestadas nesta Ficha Clínica de Anamnese são a mais estrita expressão da verdade, não tendo omitido ou ocultado qualquer informação sobre minha saúde física ou mental, medicações de uso contínuo ou qualquer outra circunstância que possa interferir no diagnóstico e tratamento odontológico proposto.
            <br/><br/>
            Comprometo-me a informar ao cirurgião-dentista responsável qualquer alteração no meu estado de saúde ou uso de novos medicamentos ao longo do tratamento. Estou ciente de que a omissão de fatos poderá acarretar sérias complicações médicas.
          </div>
        </div>

        <PrintFooter signatureType="both" patientName={patient.name} />
      </div>
    </>
  );
};
