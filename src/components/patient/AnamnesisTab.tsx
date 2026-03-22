import React, { useState, useEffect } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { Patient } from '../../types';
import { Save, Loader2 } from 'lucide-react';

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
    notes: ''
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (patient.anamnesis) {
      try {
        setFormData(JSON.parse(patient.anamnesis));
      } catch (e) {
        console.error("Failed to parse anamnesis", e);
      }
    }
  }, [patient.anamnesis]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'patients', patient.id), {
        anamnesis: JSON.stringify(formData),
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `patients/${patient.id}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-text-primary">Ficha de Anamnese</h2>
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Salvar Anamnese
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Motivo da Consulta (Queixa Principal)</label>
            <textarea name="mainComplaint" value={formData.mainComplaint} onChange={handleChange} className="w-full bg-surface border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-text-primary focus:ring-2 focus:ring-indigo-500 resize-none h-24" />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Histórico Médico</label>
            <textarea name="medicalHistory" value={formData.medicalHistory} onChange={handleChange} className="w-full bg-surface border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-text-primary focus:ring-2 focus:ring-indigo-500 resize-none h-24" />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Alergias a Medicamentos</label>
            <textarea name="allergies" value={formData.allergies} onChange={handleChange} className="w-full bg-surface border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-text-primary focus:ring-2 focus:ring-indigo-500 resize-none h-20" />
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-surface p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800">
            <h3 className="text-sm font-medium text-text-primary mb-4">Condições Sistêmicas</h3>
            <div className="grid grid-cols-2 gap-4">
              {[
                { name: 'diabetes', label: 'Diabetes' },
                { name: 'hypertension', label: 'Hipertensão' },
                { name: 'cardiacIssues', label: 'Problemas Cardíacos' },
                { name: 'bleedingDisorders', label: 'Distúrbios Hemorrágicos' },
                { name: 'pregnancy', label: 'Gravidez' },
              ].map(condition => (
                <label key={condition.name} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name={condition.name}
                    checked={formData[condition.name as keyof typeof formData] as boolean}
                    onChange={handleChange}
                    className="w-5 h-5 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-900"
                  />
                  <span className="text-sm text-text-secondary">{condition.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Medicamentos em Uso</label>
            <textarea name="medications" value={formData.medications} onChange={handleChange} className="w-full bg-surface border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-text-primary focus:ring-2 focus:ring-indigo-500 resize-none h-20" />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Observações Adicionais</label>
            <textarea name="notes" value={formData.notes} onChange={handleChange} className="w-full bg-surface border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-text-primary focus:ring-2 focus:ring-indigo-500 resize-none h-20" />
          </div>
        </div>
      </div>
    </div>
  );
};
