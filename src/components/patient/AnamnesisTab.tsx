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
      <div className="print-only max-w-4xl mx-auto font-sans w-full" style={{ padding: '0 40px' }}>
        <div className="avoid-break page-break-after mb-20">
          <PrintHeader title="Ficha de Anamnese Odontológica" patientName={patient.name} />
          
          <div className="mb-12">
            <h3 className="font-serif font-black text-xs uppercase tracking-[0.2em] text-zinc-400 mb-8 border-b-2 border-zinc-900 pb-2">I. Histórico Clínico e Queixas</h3>
            <div className="space-y-8">
              {[
                { label: 'Motivo da Consulta (Queixa Principal)', value: formData.mainComplaint, placeholder: 'Nenhuma queixa relatada.' },
                { label: 'Histórico Médico Pregresso', value: formData.medicalHistory, placeholder: 'Nada digno de nota.' },
                { label: 'Alergias a Medicamentos / Substâncias', value: formData.allergies, placeholder: 'Nenhuma alergia relatada.' },
                { label: 'Medicamentos em Uso Contínuo', value: formData.medications, placeholder: 'Nenhum medicamento em uso.' },
              ].map((item, idx) => (
                <div key={idx} className="avoid-break">
                  <p className="text-[10px] font-black text-zinc-900 uppercase tracking-widest mb-2 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full"></span>
                    {item.label}
                  </p>
                  <p className="font-serif text-lg text-zinc-800 leading-relaxed pl-4 border-l-2 border-zinc-100 py-1">
                    {item.value || item.placeholder}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-12 avoid-break">
            <h3 className="font-serif font-black text-xs uppercase tracking-[0.2em] text-zinc-400 mb-8 border-b-2 border-zinc-900 pb-2">II. Condições Sistêmicas e Hábitos</h3>
            <div className="grid grid-cols-2 gap-y-4 gap-x-12 p-6 border border-zinc-100 rounded-2xl">
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
                <div key={condition.name} className="flex items-center justify-between border-b border-zinc-100 pb-2">
                  <span className="text-sm font-medium text-zinc-700">{condition.label}</span>
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center font-black text-xs ${formData[condition.name as keyof typeof formData] ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-zinc-300'}`}>
                    {formData[condition.name as keyof typeof formData] ? '✓' : ''}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-12 avoid-break">
            <h3 className="font-serif font-black text-xs uppercase tracking-[0.2em] text-zinc-400 mb-4 border-b border-zinc-100 pb-2">III. Observações Adicionais</h3>
            <p className="font-serif text-lg text-zinc-800 leading-relaxed italic">
              {formData.notes || 'Sem observações adicionais.'}
            </p>
          </div>

          <div className="mb-12 text-sm text-justify p-6 border-l-4 border-indigo-600 bg-indigo-50/30 rounded-r-2xl avoid-break">
            <p className="font-serif leading-relaxed text-zinc-700">
              <strong>Termo de Responsabilidade:</strong> Declaro, sob as penas da lei, que as informações prestadas nesta Ficha Clínica de Anamnese são a mais estrita expressão da verdade, não tendo omitido ou ocultado qualquer informação sobre minha saúde física ou mental. Comprometo-me a informar ao cirurgião-dentista qualquer alteração no meu estado de saúde.
            </p>
          </div>
          <PrintFooter signatureType="both" patientName={patient.name} />
        </div>
      </div>
    </>
  );
};
