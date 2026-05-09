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
    <div className="avoid-break page-break-after">
      <PrintHeader title="Ficha Cadastral do Paciente" patientName={patient.name} />
      <div className="grid grid-cols-2 gap-y-4 gap-x-8 text-sm text-zinc-800 p-4 border border-zinc-200 rounded-lg">
        <p><strong>Nome Completo:</strong> {patient.name}</p>
        <p><strong>Data de Nascimento:</strong> {patient.dob ? new Date(patient.dob).toLocaleDateString('pt-BR') : 'Não informada'}</p>
        <p><strong>CPF:</strong> {patient.cpf || 'Não informado'}</p>
        <p><strong>RG:</strong> {patient.rg || 'Não informado'} {patient.issuingBody ? `- ${patient.issuingBody}` : ''}</p>
        <p><strong>Profissão:</strong> {patient.profession || 'Não informada'}</p>
        <p><strong>Estado Civil:</strong> {patient.maritalStatus || 'Não informado'}</p>
        <p><strong>E-mail:</strong> {patient.email || 'Não informado'}</p>
        <p><strong>Telefone/Celular:</strong> {patient.phone || 'Não informado'}</p>
        <div className="col-span-2 border-t border-zinc-200 my-2 pt-2"></div>
        <p className="col-span-2"><strong>Endereço:</strong> {patient.address || 'Não informado'}</p>
        <p><strong>Cidade/UF:</strong> {patient.city || 'Não informada'} {patient.state ? `/ ${patient.state}` : ''}</p>
        <p><strong>CEP:</strong> {patient.zipCode || 'Não informado'}</p>
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
      <div className="avoid-break page-break-after">
        <PrintHeader title="Ficha de Anamnese Odontológica" patientName={patient.name} />
        <div className="mb-8 grid grid-cols-2 gap-4 bg-zinc-50 p-4 rounded-lg border border-zinc-200 text-sm">
          <p><strong>CPF:</strong> {patient.cpf || 'Não informado'}</p>
          <p><strong>Data de Nascimento:</strong> {patient.dob ? new Date(patient.dob).toLocaleDateString('pt-BR') : 'Não informada'}</p>
          <p><strong>Data da Impressão:</strong> {new Date().toLocaleDateString('pt-BR')}</p>
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
                  {formData[condition.name] ? 'X' : ' '}
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
        <PrintFooter signatureType="both" patientName={patient.name} />
      </div>
    );
  };

  const renderEvolution = () => {
    const formatDate = (timestamp: any) => {
      if (!timestamp) return 'Agora mesmo';
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit', month: 'long', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      }).format(date);
    };

    return (
      <div className="avoid-break page-break-after">
        <PrintHeader title="Evolução Clínica" patientName={patient.name} />
        {evolutions.length === 0 ? (
          <p className="text-center italic text-gray-500 py-8">Nenhuma evolução registrada.</p>
        ) : (
          <div className="space-y-6 text-sm">
            {evolutions.map(note => (
              <div key={note.id} className="border-b border-gray-200 pb-4 avoid-break">
                <p className="font-bold text-gray-700 mb-2">{formatDate(note.createdAt)} - Dr(a). {note.authorName}</p>
                {note.procedure && <p><strong>Procedimento:</strong> {note.procedure}</p>}
                {note.tooth && <p><strong>Dente/Região:</strong> {note.tooth}</p>}
                <p className="whitespace-pre-wrap mt-2">{note.content}</p>
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
      <div className="avoid-break page-break-after">
        <PrintHeader title="Plano de Tratamento e Orçamento" patientName={patient.name} />
        <div className="mb-8 grid grid-cols-2 gap-4 text-sm text-zinc-600">
          <div><strong>Status:</strong> {patient.treatmentStatus || 'Planejado'}</div>
          <div><strong>Emissão:</strong> {new Date().toLocaleDateString('pt-BR')}</div>
          {patient.treatmentStartDate && <div><strong>Início:</strong> {new Date(patient.treatmentStartDate).toLocaleDateString('pt-BR')}</div>}
          {patient.treatmentEndDate && <div><strong>Fim Previsto:</strong> {new Date(patient.treatmentEndDate).toLocaleDateString('pt-BR')}</div>}
        </div>
        <table className="w-full text-left border-collapse mb-8 text-sm">
          <thead>
            <tr className="border-b-2 border-zinc-200">
              <th className="py-2">Procedimento</th>
              <th className="py-2 text-center">Dente/Região</th>
              <th className="py-2 text-center">Qtd</th>
              <th className="py-2 text-right">V. Unitário</th>
              <th className="py-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {procedures.map(p => (
              <tr key={p.id}>
                <td className="py-3 pr-2">{p.name}</td>
                <td className="py-3 text-center">{p.tooth || '-'}</td>
                <td className="py-3 text-center">{p.quantity || 1}</td>
                <td className="py-3 text-right">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.unitPrice || p.cost)}</td>
                <td className="py-3 text-right">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.cost)}</td>
              </tr>
            ))}
            {procedures.length === 0 && (
              <tr>
                <td colSpan={5} className="py-4 text-center italic text-gray-500">Nenhum procedimento no plano.</td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-zinc-200 font-bold">
              <td colSpan={4} className="py-4 text-right">Total Estimado:</td>
              <td className="py-4 text-right text-base">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalCost)}</td>
            </tr>
          </tfoot>
        </table>
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
      <div className="relative min-h-[45vh] flex flex-col mb-16">
        {via && (
          <div className="absolute -top-6 right-0 text-[10px] font-black uppercase tracking-widest text-zinc-400 border border-zinc-200 px-2 py-0.5 rounded">
            {via}
          </div>
        )}
        <PrintHeader title={title} patientName={patient.name} />
        <div className="flex-1 mb-12 whitespace-pre-wrap text-base leading-relaxed text-zinc-800 text-justify">
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
            <div className="border-t-2 border-dashed border-zinc-200 pt-16">
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
    <div className="unified-print-only max-w-4xl mx-auto font-sans w-full" style={{ padding: '0 20px' }}>
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          .page-break-after { page-break-after: always; break-after: page; }
          .avoid-break { page-break-inside: avoid; break-inside: avoid; }
          /* Ensure the last element doesn't have a blank page after it */
          .page-break-after:last-child { page-break-after: auto; break-after: auto; }
        }
      `}} />
      
      {selectedSections.includes('personal') && renderPersonal()}
      {selectedSections.includes('anamnesis') && renderAnamnesis()}
      {selectedSections.includes('evolution') && renderEvolution()}
      {selectedSections.includes('treatment') && renderTreatmentPlan()}
      
      {selectedTemplates.map(renderTemplate)}
    </div>
  );
};
