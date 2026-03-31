import React, { useState, useEffect } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { Patient } from '../../types';
import { Save, Loader2, Printer } from 'lucide-react';

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

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Por favor, permita popups para imprimir a anamnese.');
      return;
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Anamnese - ${patient.name}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 40px; }
          .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #eee; padding-bottom: 20px; }
          .clinic-name { font-size: 24px; font-weight: bold; color: #1a365d; margin: 0; }
          .doc-title { font-size: 18px; font-weight: bold; margin: 10px 0; text-transform: uppercase; }
          .patient-info { margin-bottom: 30px; background: #f8fafc; padding: 15px; border-radius: 8px; }
          .patient-info p { margin: 5px 0; }
          .section { margin-bottom: 25px; }
          .section-title { font-weight: bold; font-size: 16px; border-bottom: 1px solid #ddd; padding-bottom: 5px; margin-bottom: 15px; color: #2d3748; }
          .field { margin-bottom: 15px; }
          .field-label { font-weight: bold; font-size: 14px; color: #4a5568; }
          .field-value { margin-top: 5px; padding: 10px; background: #fff; border: 1px solid #e2e8f0; border-radius: 4px; min-height: 20px; }
          .checkbox-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
          .checkbox-item { display: flex; align-items: center; gap: 8px; }
          .checkbox-box { width: 14px; height: 14px; border: 1px solid #333; display: inline-block; text-align: center; line-height: 14px; font-size: 12px; }
          .signatures { margin-top: 80px; display: flex; justify-content: space-between; }
          .signature-line { width: 45%; border-top: 1px solid #333; text-align: center; padding-top: 10px; font-size: 14px; }
          .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #718096; border-top: 1px solid #eee; padding-top: 20px; }
          @media print {
            body { padding: 0; }
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 class="clinic-name">OdontoAdmin</h1>
          <h2 class="doc-title">Ficha de Anamnese Odontológica</h2>
        </div>

        <div class="patient-info">
          <p><strong>Paciente:</strong> ${patient.name}</p>
          <p><strong>CPF:</strong> ${patient.cpf || 'Não informado'}</p>
          <p><strong>Data de Nascimento:</strong> ${patient.dob ? new Date(patient.dob).toLocaleDateString('pt-BR') : 'Não informada'}</p>
          <p><strong>Data da Anamnese:</strong> ${new Date().toLocaleDateString('pt-BR')}</p>
        </div>

        <div class="section">
          <div class="section-title">Informações Clínicas</div>
          
          <div class="field">
            <div class="field-label">Motivo da Consulta (Queixa Principal)</div>
            <div class="field-value">${formData.mainComplaint || 'Nenhuma queixa relatada.'}</div>
          </div>

          <div class="field">
            <div class="field-label">Histórico Médico</div>
            <div class="field-value">${formData.medicalHistory || 'Nada digno de nota.'}</div>
          </div>

          <div class="field">
            <div class="field-label">Alergias a Medicamentos</div>
            <div class="field-value">${formData.allergies || 'Nenhuma alergia relatada.'}</div>
          </div>
          
          <div class="field">
            <div class="field-label">Medicamentos em Uso</div>
            <div class="field-value">${formData.medications || 'Nenhum medicamento em uso.'}</div>
          </div>
        </div>

          <div class="section">
            <div class="section-title">Condições Sistêmicas e Hábitos</div>
            <div class="checkbox-grid">
              <div class="checkbox-item"><span class="checkbox-box">${formData.diabetes ? 'X' : '&nbsp;'}</span> Diabetes</div>
              <div class="checkbox-item"><span class="checkbox-box">${formData.hypertension ? 'X' : '&nbsp;'}</span> Hipertensão</div>
              <div class="checkbox-item"><span class="checkbox-box">${formData.cardiacIssues ? 'X' : '&nbsp;'}</span> Problemas Cardíacos</div>
              <div class="checkbox-item"><span class="checkbox-box">${formData.bleedingDisorders ? 'X' : '&nbsp;'}</span> Distúrbios Hemorrágicos</div>
              <div class="checkbox-item"><span class="checkbox-box">${formData.pregnancy ? 'X' : '&nbsp;'}</span> Gravidez</div>
              <div class="checkbox-item"><span class="checkbox-box">${formData.asthma ? 'X' : '&nbsp;'}</span> Asma/Bronquite</div>
              <div class="checkbox-item"><span class="checkbox-box">${formData.hepatitis ? 'X' : '&nbsp;'}</span> Hepatite</div>
              <div class="checkbox-item"><span class="checkbox-box">${formData.hiv ? 'X' : '&nbsp;'}</span> HIV/AIDS</div>
              <div class="checkbox-item"><span class="checkbox-box">${formData.rheumaticFever ? 'X' : '&nbsp;'}</span> Febre Reumática</div>
              <div class="checkbox-item"><span class="checkbox-box">${formData.anesthesiaReaction ? 'X' : '&nbsp;'}</span> Reação à Anestesia</div>
              <div class="checkbox-item"><span class="checkbox-box">${formData.smoker ? 'X' : '&nbsp;'}</span> Fumante</div>
              <div class="checkbox-item"><span class="checkbox-box">${formData.alcohol ? 'X' : '&nbsp;'}</span> Consome Álcool</div>
            </div>
          </div>

        <div class="section">
          <div class="section-title">Observações Adicionais</div>
          <div class="field-value">${formData.notes || 'Sem observações adicionais.'}</div>
        </div>

        <p style="margin-top: 40px; font-size: 14px; text-align: justify;">
          Declaro que as informações acima são verdadeiras e assumo a responsabilidade por elas. Comprometo-me a informar o cirurgião-dentista sobre qualquer alteração no meu estado de saúde ou medicamentos em uso.
        </p>

        <div class="signatures">
          <div class="signature-line">
            <strong>${patient.name}</strong><br>
            Paciente ou Responsável Legal<br>
            <span style="font-size: 11px; color: #666;">(Assinatura Física ou Digital Gov.br)</span>
          </div>
          <div class="signature-line">
            <strong>Cirurgião-Dentista</strong><br>
            Responsável Técnico<br>
            <span style="font-size: 11px; color: #666;">(Assinatura Física ou Digital ICP-Brasil)</span>
          </div>
        </div>

        <div class="footer">
          Documento gerado em ${new Date().toLocaleString('pt-BR')} pelo sistema OdontoAdmin.
        </div>
        
        <script>
          window.onload = () => {
            window.print();
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6">
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
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Salvar Anamnese
          </button>
        </div>
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
