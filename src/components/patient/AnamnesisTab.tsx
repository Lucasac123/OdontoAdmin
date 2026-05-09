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
      <div className="print-only max-w-4xl mx-auto">
        <PrintHeader title="Ficha de Anamnese Odontológica" patientName={patient.name} />
        
        <div className="mb-8 grid grid-cols-2 gap-4 bg-zinc-50 p-4 rounded-lg border border-zinc-200 text-sm">
          <p><strong>CPF:</strong> {patient.cpf || 'Não informado'}</p>
          <p><strong>Data de Nascimento:</strong> {patient.dob ? new Date(patient.dob).toLocaleDateString('pt-BR') : 'Não informada'}</p>
          <p><strong>Data da Anamnese:</strong> {new Date().toLocaleDateString('pt-BR')}</p>
        </div>

        <div className="mb-8 avoid-break">
          <h3 className="font-bold text-lg border-b-2 border-zinc-200 pb-2 mb-4 text-zinc-800">Informações Clínicas</h3>
          
          <div className="space-y-4">
            <div>
              <p className="font-semibold text-sm text-zinc-700">Motivo da Consulta (Queixa Principal)</p>
              <p className="bg-white p-3 rounded border border-zinc-200 mt-1 min-h-[3rem]">{formData.mainComplaint || 'Nenhuma queixa relatada.'}</p>
            </div>
            <div>
              <p className="font-semibold text-sm text-zinc-700">Histórico Médico</p>
              <p className="bg-white p-3 rounded border border-zinc-200 mt-1 min-h-[3rem]">{formData.medicalHistory || 'Nada digno de nota.'}</p>
            </div>
            <div>
              <p className="font-semibold text-sm text-zinc-700">Alergias a Medicamentos</p>
              <p className="bg-white p-3 rounded border border-zinc-200 mt-1 min-h-[3rem]">{formData.allergies || 'Nenhuma alergia relatada.'}</p>
            </div>
            <div>
              <p className="font-semibold text-sm text-zinc-700">Medicamentos em Uso</p>
              <p className="bg-white p-3 rounded border border-zinc-200 mt-1 min-h-[3rem]">{formData.medications || 'Nenhum medicamento em uso.'}</p>
            </div>
          </div>
        </div>

        <div className="mb-8 avoid-break">
          <h3 className="font-bold text-lg border-b-2 border-zinc-200 pb-2 mb-4 text-zinc-800">Condições Sistêmicas e Hábitos</h3>
          <div className="grid grid-cols-2 gap-3">
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
              <div key={condition.name} className="flex items-center gap-2">
                <div className="w-4 h-4 border border-zinc-800 flex items-center justify-center font-bold text-xs">
                  {formData[condition.name as keyof typeof formData] ? 'X' : ' '}
                </div>
                <span className="text-sm">{condition.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mb-8 avoid-break">
          <p className="font-semibold text-sm text-zinc-700">Observações Adicionais</p>
          <p className="bg-white p-3 rounded border border-zinc-200 mt-1 min-h-[3rem]">{formData.notes || 'Sem observações adicionais.'}</p>
        </div>

        <div className="mb-8 text-sm text-justify avoid-break">
          <p>Declaro que as informações acima são verdadeiras e assumo a responsabilidade por elas. Comprometo-me a informar o cirurgião-dentista sobre qualquer alteração no meu estado de saúde ou medicamentos em uso.</p>
        </div>

        <div className="mt-16 flex justify-between avoid-break">
          <div className="w-[45%] border-t border-black text-center pt-2">
            <strong>{patient.name}</strong><br />
            Paciente ou Responsável Legal
          </div>
          <div className="w-[45%] border-t border-black text-center pt-2">
            <strong>Cirurgião-Dentista</strong><br />
            Responsável Técnico
          </div>
        </div>

        <PrintFooter />
      </div>
    </>
  );
};
