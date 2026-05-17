import React, { useState, useEffect } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { Patient } from '../../types';
import { Save, Printer } from 'lucide-react';
import { useSync } from '../../context/SyncContext';
import { PrintHeader } from '../print/PrintHeader';
import { PrintFooter } from '../print/PrintFooter';

export const AnamnesisTab = ({ patient }: { patient: Patient }) => {
  const [formData, setFormData] = useState({
    mainComplaint: '', medicalHistory: '', allergies: '', medications: '',
    bloodPressure: '', diabetes: false, hypertension: false, cardiacIssues: false,
    bleedingDisorders: false, pregnancy: false, asthma: false, hepatitis: false,
    hiv: false, rheumaticFever: false, smoker: false, alcohol: false,
    anesthesiaReaction: false, notes: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const { addSyncTask } = useSync();

  useEffect(() => {
    if (patient.anamnesis) {
      try { setFormData(JSON.parse(patient.anamnesis)); }
      catch (e) { console.error('Failed to parse anamnesis', e); }
    }
  }, [patient.anamnesis]);

  const handleSave = () => {
    const savePromise = updateDoc(doc(db, 'patients', patient.id), {
      anamnesis: JSON.stringify(formData),
      updatedAt: new Date().toISOString()
    }).catch(error => handleFirestoreError(error, OperationType.UPDATE, `patients/${patient.id}`));
    addSyncTask(savePromise);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const conditions = [
    ['diabetes',          'Diabetes Mellitus'],
    ['hypertension',      'Hipertensão Arterial'],
    ['cardiacIssues',     'Cardiopatias'],
    ['bleedingDisorders', 'Distúrbios Hemorrágicos'],
    ['pregnancy',         'Gestante'],
    ['asthma',            'Asma / Bronquite'],
    ['hepatitis',         'Hepatite'],
    ['hiv',               'HIV / AIDS'],
    ['rheumaticFever',    'Febre Reumática'],
    ['anesthesiaReaction','Reação a Anestésico'],
    ['smoker',            'Tabagista'],
    ['alcohol',           'Consome Álcool'],
  ];

  return (
    <>
      {/* ─── SCREEN UI ─── */}
      <div className="no-print space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-xl font-bold text-text-primary">Ficha de Anamnese</h2>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <button onClick={() => window.print()} className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-white dark:bg-zinc-800 text-text-primary border border-zinc-200 dark:border-zinc-700 px-4 py-2 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors text-sm">
              <Printer className="w-4 h-4" /> Exportar PDF
            </button>
            <button onClick={handleSave} disabled={isSaving} className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors text-sm">
              <Save className="w-4 h-4" /><span className="truncate">Salvar Anamnese</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            {[
              { name: 'mainComplaint', label: 'Motivo da Consulta (Queixa Principal)' },
              { name: 'medicalHistory', label: 'Histórico Médico' },
              { name: 'allergies', label: 'Alergias a Medicamentos' },
            ].map(f => (
              <div key={f.name}>
                <label className="block text-sm font-medium text-text-secondary mb-1">{f.label}</label>
                <textarea name={f.name} disabled={isSaving} value={formData[f.name as keyof typeof formData] as string} onChange={handleChange} className="w-full bg-surface border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-text-primary focus:ring-2 focus:ring-indigo-500 resize-none h-24 disabled:opacity-50" />
              </div>
            ))}
          </div>

          <div className="space-y-6">
            <div className="bg-surface p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800">
              <h3 className="text-sm font-medium text-text-primary mb-4">Condições Sistêmicas e Hábitos</h3>
              <div className="grid grid-cols-2 gap-4">
                {conditions.map(([name, label]) => (
                  <label key={name} className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" name={name} disabled={isSaving}
                      checked={formData[name as keyof typeof formData] as boolean}
                      onChange={handleChange}
                      className="w-5 h-5 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-900 disabled:opacity-50"
                    />
                    <span className="text-sm text-text-secondary">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            {[
              { name: 'medications', label: 'Medicamentos em Uso' },
              { name: 'notes', label: 'Observações Adicionais' },
            ].map(f => (
              <div key={f.name}>
                <label className="block text-sm font-medium text-text-secondary mb-1">{f.label}</label>
                <textarea name={f.name} disabled={isSaving} value={formData[f.name as keyof typeof formData] as string} onChange={handleChange} className="w-full bg-surface border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-text-primary focus:ring-2 focus:ring-indigo-500 resize-none h-20 disabled:opacity-50" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── PRINT VIEW (CFO-standard) ─── */}
      <div className="print-only" style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ 
          pageBreakAfter: 'always', 
          breakAfter: 'page', 
          minHeight: '29.7cm',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative'
        }}>
          <PrintHeader
            title="Ficha de Anamnese Odontológica"
            subtitle="Histórico de Saúde – Preenchimento Obrigatório"
            patientName={patient.name}
            patientCpf={patient.cpf}
            patientDob={patient.dob ? new Date(patient.dob).toLocaleDateString('pt-BR') : undefined}
          />

          <div style={{ flex: 1, padding: '20px 0' }}>
            {/* I – Clinical history */}
            <div style={{ marginBottom: '32px' }}>
              <p style={{ fontSize: '9px', fontWeight: '900', textTransform: 'uppercase' as const, letterSpacing: '0.18em', color: '#71717a', borderBottom: '2px solid #18181b', paddingBottom: '6px', marginBottom: '16px' }}>
                I. Queixas e Histórico Clínico
              </p>
              {[
                { label: 'Motivo da Consulta / Queixa Principal', value: formData.mainComplaint },
                { label: 'Histórico Médico Pregresso', value: formData.medicalHistory },
                { label: 'Alergias a Medicamentos ou Substâncias', value: formData.allergies },
                { label: 'Medicamentos em Uso Contínuo', value: formData.medications },
              ].map((item, i) => (
                <div key={i} style={{ marginBottom: '18px', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                  <span style={{ fontSize: '8px', fontWeight: '800', textTransform: 'uppercase' as const, letterSpacing: '0.15em', color: '#a1a1aa', display: 'block', marginBottom: '3px' }}>{item.label}</span>
                  <div style={{ borderBottom: '1px dashed #d4d4d8', minHeight: '32px', paddingBottom: '4px' }}>
                    <span style={{ fontFamily: '"Crimson Pro", serif', fontSize: '15px', color: '#18181b' }}>
                      {item.value || <em style={{ color: '#a1a1aa' }}>Não informado.</em>}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* II – Systemic conditions */}
            <div style={{ marginBottom: '32px', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
              <p style={{ fontSize: '9px', fontWeight: '900', textTransform: 'uppercase' as const, letterSpacing: '0.18em', color: '#71717a', borderBottom: '2px solid #18181b', paddingBottom: '6px', marginBottom: '16px' }}>
                II. Condições Sistêmicas e Hábitos
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 40px' }}>
                {conditions.map(([key, label]) => {
                  const checked = Boolean(formData[key as keyof typeof formData]);
                  return (
                    <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px dashed #e4e4e7', padding: '6px 0' }}>
                      <span style={{ fontSize: '12px', fontWeight: '500', color: '#3f3f46' }}>{label}</span>
                      <div style={{ display: 'flex', gap: '10px', flexShrink: 0 }}>
                        {[{ v: true, t: 'SIM' }, { v: false, t: 'NÃO' }].map(({ v, t }) => (
                          <span key={t} style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '10px', fontWeight: '700' }}>
                            <span style={{ width: '13px', height: '13px', border: '1.5px solid #18181b', borderRadius: '2px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: checked === v ? (v ? '#4f46e5' : '#18181b') : 'white', color: checked === v ? 'white' : 'transparent', fontSize: '9px' }}>✓</span>
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* III – Notes */}
            <div style={{ marginBottom: '24px', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
              <p style={{ fontSize: '9px', fontWeight: '900', textTransform: 'uppercase' as const, letterSpacing: '0.18em', color: '#71717a', borderBottom: '1px solid #e4e4e7', paddingBottom: '4px', marginBottom: '10px' }}>
                III. Observações Adicionais
              </p>
              <div style={{ border: '1px solid #e4e4e7', borderRadius: '8px', padding: '12px 16px', minHeight: '60px' }}>
                <span style={{ fontFamily: '"Crimson Pro", serif', fontSize: '14px', color: '#18181b', fontStyle: formData.notes ? 'normal' : 'italic' }}>
                  {formData.notes || 'Sem observações adicionais.'}
                </span>
              </div>
            </div>

            {/* IV – Declaration */}
            <div style={{ pageBreakInside: 'avoid', breakInside: 'avoid', marginBottom: '32px', padding: '18px 22px', borderLeft: '4px solid #4f46e5', background: '#f8f8ff', borderRadius: '0 8px 8px 0' }}>
              <p style={{ fontSize: '9px', fontWeight: '900', textTransform: 'uppercase' as const, letterSpacing: '0.1em', color: '#4f46e5', margin: '0 0 8px' }}>IV. Declaração de Veracidade</p>
              <p style={{ fontFamily: '"Crimson Pro", serif', fontSize: '13px', color: '#3f3f46', lineHeight: '1.8', margin: 0, textAlign: 'justify' }}>
                Declaro, sob as penas da lei, que as informações prestadas nesta ficha são a mais estrita expressão da verdade, não tendo omitido qualquer dado relativo ao meu estado de saúde, medicamentos em uso ou alergias. Comprometo-me a informar ao cirurgião-dentista qualquer alteração relevante durante o tratamento.
              </p>
            </div>
          </div>

          <PrintFooter signatureType="both" patientName={patient.name} />
        </div>
      </div>
    </>
  );
};
