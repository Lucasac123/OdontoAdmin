import React from 'react';
import { Patient, DocumentTemplate } from '../../types';
import { PrintHeader } from '../print/PrintHeader';
import { PrintFooter } from '../print/PrintFooter';
import { TWO_COPY_MEDICATIONS } from '../../data/clinicalData';

interface PatientPrintViewProps {
  patient: Patient;
  selectedSections: string[];
  selectedTemplates: DocumentTemplate[];
  evolutions: any[];
}

export const PatientPrintView: React.FC<PatientPrintViewProps> = ({
  patient,
  selectedSections,
  selectedTemplates,
  evolutions
}) => {
  if (selectedSections.length === 0 && selectedTemplates.length === 0) return null;

  // Render Helpers for each section
  const renderPersonal = () => (
    <div className="avoid-break page-break-after mb-20">
      <PrintHeader title="Ficha Cadastral do Paciente" patientName={patient.name} />
      <div className="mb-12">
        <h3 className="font-serif font-black text-xs uppercase tracking-[0.2em] text-zinc-400 mb-6 border-b border-zinc-100 pb-2">Informações de Identificação</h3>
        <div className="grid grid-cols-2 gap-y-6 gap-x-12 text-sm text-zinc-900">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-zinc-400 uppercase">Nome Completo</p>
            <p className="font-serif text-base font-bold">{patient.name}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-zinc-400 uppercase">Data de Nascimento</p>
            <p className="font-serif text-base font-bold">{patient.dob ? new Date(patient.dob).toLocaleDateString('pt-BR') : 'Não informada'}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-zinc-400 uppercase">CPF</p>
            <p className="font-serif text-base font-bold">{patient.cpf || 'Não informado'}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-zinc-400 uppercase">RG / Órgão Emissor</p>
            <p className="font-serif text-base font-bold">{patient.rg || 'Não informado'} {patient.issuingBody ? `/ ${patient.issuingBody}` : ''}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-zinc-400 uppercase">Profissão</p>
            <p className="font-serif text-base font-bold">{patient.profession || 'Não informada'}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-zinc-400 uppercase">Estado Civil</p>
            <p className="font-serif text-base font-bold">{patient.maritalStatus || 'Não informado'}</p>
          </div>
        </div>
      </div>

      <div className="mb-12">
        <h3 className="font-serif font-black text-xs uppercase tracking-[0.2em] text-zinc-400 mb-6 border-b border-zinc-100 pb-2">Contato e Localização</h3>
        <div className="grid grid-cols-2 gap-y-6 gap-x-12 text-sm text-zinc-900">
          <div className="space-y-1 col-span-2">
            <p className="text-[10px] font-bold text-zinc-400 uppercase">Endereço Residencial</p>
            <p className="font-serif text-base font-bold">{patient.address || 'Não informado'}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-zinc-400 uppercase">Cidade / UF</p>
            <p className="font-serif text-base font-bold">{patient.city || 'Não informada'} {patient.state ? `/ ${patient.state}` : ''}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-zinc-400 uppercase">CEP</p>
            <p className="font-serif text-base font-bold">{patient.zipCode || 'Não informado'}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-zinc-400 uppercase">Telefone / Celular</p>
            <p className="font-serif text-base font-bold text-indigo-700">{patient.phone || 'Não informado'}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-zinc-400 uppercase">E-mail</p>
            <p className="font-serif text-base font-bold">{patient.email || 'Não informado'}</p>
          </div>
        </div>
      </div>
      <PrintFooter signatureType="patient" patientName={patient.name} />
    </div>
  );

  const renderAnamnesis = () => {
    let formData: any = {};
    if (patient.anamnesis) {
      try {
        formData = JSON.parse(patient.anamnesis);
      } catch (e) {}
    }

    return (
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
          <div className="grid grid-cols-2 gap-y-4 gap-x-12 bg-zinc-50/50 p-6 rounded-2xl border border-zinc-100">
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
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center font-black text-xs ${formData[condition.name] ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-zinc-300'}`}>
                  {formData[condition.name] ? '✓' : ''}
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
    );
  };

  const renderEvolution = () => {
    const formatDate = (timestamp: any) => {
      if (!timestamp) return 'Data não informada';
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit', month: 'long', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      }).format(date);
    };

    return (
      <div className="avoid-break page-break-after mb-20">
        <PrintHeader title="Evolução Clínica do Paciente" patientName={patient.name} />
        {evolutions.length === 0 ? (
          <div className="text-center italic text-zinc-400 py-12 border-2 border-dashed border-zinc-100 rounded-3xl">
            Nenhuma evolução registrada para este prontuário.
          </div>
        ) : (
          <div className="space-y-12">
            {evolutions.map((note, idx) => (
              <div key={note.id} className="avoid-break relative pl-8 border-l-2 border-zinc-200">
                <div className="absolute left-[-9px] top-0 w-4 h-4 rounded-full bg-white border-2 border-indigo-600"></div>
                <div className="mb-2 flex items-center justify-between">
                  <p className="font-serif text-lg font-bold text-zinc-900">{note.procedure || 'Procedimento Clínico'}</p>
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{formatDate(note.createdAt)}</p>
                </div>
                <div className="flex items-center gap-4 text-xs font-bold text-indigo-600 uppercase tracking-wider mb-3">
                  <span>Dentista: {note.authorName}</span>
                  {note.tooth && <span>• Dente/Região: {note.tooth}</span>}
                </div>
                <p className="font-serif text-base text-zinc-700 leading-relaxed whitespace-pre-wrap text-justify">
                  {note.content}
                </p>
              </div>
            ))}
          </div>
        )}
        <PrintFooter signatureType="dentist" />
      </div>
    );
  };

  const renderTreatmentPlan = () => {
    let procedures: any[] = [];
    if (patient.odontogram) {
      try {
        const parsed = JSON.parse(patient.odontogram);
        if (parsed.treatmentPlan) procedures = parsed.treatmentPlan;
      } catch (e) {}
    }

    const totalCost = procedures.reduce((acc, curr) => acc + curr.cost, 0);

    return (
      <div className="avoid-break page-break-after mb-20">
        <PrintHeader title="Plano de Tratamento e Orçamento" patientName={patient.name} />
        
        <div className="mb-12 grid grid-cols-3 gap-8 p-6 border-2 border-zinc-900 rounded-3xl">
          <div className="space-y-1">
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Status do Plano</p>
            <p className="font-serif text-lg font-bold uppercase">{patient.treatmentStatus || 'Em Planejamento'}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Data de Emissão</p>
            <p className="font-serif text-lg font-bold">{new Date().toLocaleDateString('pt-BR')}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Previsão de Conclusão</p>
            <p className="font-serif text-lg font-bold">{patient.treatmentEndDate ? new Date(patient.treatmentEndDate).toLocaleDateString('pt-BR') : 'A definir'}</p>
          </div>
        </div>

        <table className="w-full text-left border-collapse mb-12">
          <thead>
            <tr className="border-b-4 border-zinc-900">
              <th className="py-4 font-serif text-sm uppercase tracking-widest text-zinc-400">Procedimento / Descrição</th>
              <th className="py-4 font-serif text-sm uppercase tracking-widest text-zinc-400 text-center">Região</th>
              <th className="py-4 font-serif text-sm uppercase tracking-widest text-zinc-400 text-right">Valor</th>
            </tr>
          </thead>
          <tbody className="divide-y-2 divide-zinc-100">
            {procedures.map(p => (
              <tr key={p.id}>
                <td className="py-5 pr-4">
                  <p className="font-serif text-lg font-bold text-zinc-900">{p.name}</p>
                  <p className="text-xs text-zinc-500 uppercase font-medium">Odontologia Especializada</p>
                </td>
                <td className="py-5 text-center font-serif text-lg font-bold">{p.tooth || 'Geral'}</td>
                <td className="py-5 text-right font-serif text-lg font-bold">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.cost)}</td>
              </tr>
            ))}
            {procedures.length === 0 && (
              <tr>
                <td colSpan={3} className="py-12 text-center italic text-zinc-400 font-serif">Nenhum procedimento incluído neste orçamento.</td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="border-t-4 border-zinc-900 font-serif">
              <td colSpan={2} className="py-8 text-right text-sm uppercase font-black tracking-widest text-zinc-400">Investimento Total Estimado</td>
              <td className="py-8 text-right text-3xl font-black text-zinc-900">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalCost)}</td>
            </tr>
          </tfoot>
        </table>
        
        <div className="mb-12 p-8 bg-zinc-50 border border-zinc-200 rounded-3xl avoid-break">
          <h4 className="font-serif font-bold text-lg mb-4 uppercase tracking-tight">Condições de Pagamento e Observações</h4>
          <p className="text-sm text-zinc-600 leading-relaxed mb-4">
            Este orçamento é válido por 30 dias a partir da data de emissão. O início do tratamento está condicionado à aprovação deste plano e assinatura do termo de consentimento livre e esclarecido.
          </p>
        </div>

        <PrintFooter signatureType="both" patientName={patient.name} />
      </div>
    );
  };

  const renderTemplate = (template: DocumentTemplate) => {
    // Replace placeholders with patient data if possible
    let content = template.content;
    const cpfText = patient.cpf || '_________________';
    const rgText = patient.rg || '_________________';
    
    content = content.replace(/\[Nome do Paciente\]/g, patient.name)
                     .replace(/\[CPF\]/g, cpfText)
                     .replace(/\[RG\]/g, rgText)
                     .replace(/\[Data\]/g, new Date().toLocaleDateString('pt-BR'));

    let title = "Documento Odontológico";
    if (template.type === 'prescription') title = "Receituário";
    if (template.type === 'certificate') title = "Atestado Odontológico";
    if (template.type === 'tcle') title = "Termo de Consentimento Livre e Esclarecido";
    if (template.type === 'image-release') title = "Termo de Autorização de Uso de Imagem";
    if (template.type === 'laudo') title = "Laudo Odontológico";
    if (template.type === 'postop') title = "Recomendações Pós-Operatórias";
    if (template.type === 'referral') title = "Carta de Encaminhamento";

    const needsTwoCopies = template.type === 'prescription' && TWO_COPY_MEDICATIONS.some(med => 
      content.toLowerCase().includes(med.toLowerCase())
    );

    const renderContent = (via?: string) => (
      <div className="relative min-h-[50vh] flex flex-col mb-16 avoid-break">
        {via && (
          <div className="absolute -top-6 right-0 text-[10px] font-black uppercase tracking-widest text-zinc-400 border border-zinc-200 px-3 py-1 rounded-full">
            {via}
          </div>
        )}
        <PrintHeader title={title} patientName={patient.name} />
        <div className="flex-1 mb-16 whitespace-pre-wrap font-serif text-xl leading-relaxed text-zinc-900 text-justify px-4">
          {content}
        </div>
        <PrintFooter signatureType={template.type === 'tcle' || template.type === 'image-release' ? 'both' : 'dentist'} patientName={patient.name} />
      </div>
    );

    return (
      <div key={template.id} className="page-break-after">
        {needsTwoCopies ? (
          <>
            {renderContent("1ª Via - Farmácia")}
            <div className="border-t-4 border-dashed border-zinc-200 pt-20">
              {renderContent("2ª Via - Paciente")}
            </div>
          </>
        ) : (
          renderContent()
        )}
      </div>
    );
  };


  return (
    <div className="unified-print-only max-w-4xl mx-auto font-sans w-full" style={{ padding: '0 40px' }}>
      
      {selectedSections.includes('personal') && renderPersonal()}
      {selectedSections.includes('anamnesis') && renderAnamnesis()}
      {selectedSections.includes('evolution') && renderEvolution()}
      {selectedSections.includes('treatment') && renderTreatmentPlan()}
      
      {selectedTemplates.map(renderTemplate)}
    </div>
  );
};
