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

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Shared style helpers (inline styles for guaranteed print fidelity)         */
/* ─────────────────────────────────────────────────────────────────────────── */
const PAGE: React.CSSProperties = {
  pageBreakAfter: 'always',
  breakAfter: 'page',
  pageBreakInside: 'avoid',
  breakInside: 'avoid',
  padding: '0',
  marginBottom: '40px',
};

const SECTION_TITLE: React.CSSProperties = {
  fontFamily: '"Crimson Pro", serif',
  fontSize: '10px',
  fontWeight: '900',
  textTransform: 'uppercase',
  letterSpacing: '0.18em',
  color: '#71717a',
  borderBottom: '2px solid #18181b',
  paddingBottom: '6px',
  marginBottom: '20px',
};

const FIELD_LABEL: React.CSSProperties = {
  fontSize: '8px',
  fontWeight: '700',
  textTransform: 'uppercase',
  letterSpacing: '0.15em',
  color: '#a1a1aa',
  display: 'block',
  marginBottom: '2px',
};

const FIELD_VALUE: React.CSSProperties = {
  fontFamily: '"Crimson Pro", serif',
  fontSize: '15px',
  fontWeight: '600',
  color: '#18181b',
  lineHeight: 1.4,
};

const DOTTED_LINE: React.CSSProperties = {
  borderBottom: '1px dashed #d4d4d8',
  minHeight: '28px',
  paddingBottom: '4px',
  marginBottom: '4px',
};

const CHECKBOX: React.CSSProperties = {
  width: '14px',
  height: '14px',
  border: '1.5px solid #18181b',
  borderRadius: '2px',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '10px',
  fontWeight: '900',
  flexShrink: 0,
};

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Component                                                                   */
/* ─────────────────────────────────────────────────────────────────────────── */
export const PatientPrintView: React.FC<PatientPrintViewProps> = ({
  patient,
  selectedSections,
  selectedTemplates,
  evolutions,
}) => {
  if (selectedSections.length === 0 && selectedTemplates.length === 0) return null;

  const patientDob = patient.dob
    ? new Date(patient.dob).toLocaleDateString('pt-BR')
    : undefined;

  /* ── 1. Dados Pessoais ──────────────────────────────────────────────────── */
  const renderPersonal = () => (
    <div style={PAGE}>
      <PrintHeader
        title="Ficha de Identificação do Paciente"
        patientName={patient.name}
        patientCpf={patient.cpf}
        patientDob={patientDob}
      />

      {/* Section I – Identification */}
      <div style={{ marginBottom: '28px' }}>
        <p style={SECTION_TITLE}>I. Dados Pessoais</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px 40px' }}>
          {[
            { label: 'Nome Completo', value: patient.name, span: true },
            { label: 'Data de Nascimento', value: patientDob || '___/___/______' },
            { label: 'CPF', value: patient.cpf || '_________________' },
            { label: 'RG / Órgão Emissor', value: `${patient.rg || '_________________'} ${patient.issuingBody ? `/ ${patient.issuingBody}` : ''}` },
            { label: 'Profissão', value: patient.profession || 'Não informada' },
            { label: 'Estado Civil', value: patient.maritalStatus || 'Não informado' },
            { label: 'Naturalidade / Nacionalidade', value: patient.nationality || 'Não informada' },
            { label: 'Plano de Saúde', value: patient.healthInsurance || 'Não informado' },
          ].map((f, i) => (
            <div key={i} style={f.span ? { gridColumn: '1 / -1' } : {}}>
              <span style={FIELD_LABEL}>{f.label}</span>
              <div style={DOTTED_LINE}>
                <span style={FIELD_VALUE}>{f.value}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section II – Contact */}
      <div style={{ marginBottom: '28px' }}>
        <p style={SECTION_TITLE}>II. Contato e Endereço</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px 40px' }}>
          {[
            { label: 'Endereço Residencial', value: patient.address || 'Não informado', span: true },
            { label: 'Cidade / Estado', value: `${patient.city || '________________'} / ${patient.state || '__'}` },
            { label: 'CEP', value: patient.zipCode || '__________' },
            { label: 'Telefone / Celular', value: patient.phone || 'Não informado' },
            { label: 'E-mail', value: patient.email || 'Não informado' },
            { label: 'Responsável / Nome do Cônjuge', value: (patient as any).spouseName || 'Não informado' },
          ].map((f, i) => (
            <div key={i} style={f.span ? { gridColumn: '1 / -1' } : {}}>
              <span style={FIELD_LABEL}>{f.label}</span>
              <div style={DOTTED_LINE}>
                <span style={FIELD_VALUE}>{f.value}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <PrintFooter signatureType="patient" patientName={patient.name} />
    </div>
  );

  /* ── 2. Anamnese ────────────────────────────────────────────────────────── */
  const renderAnamnesis = () => {
    let fd: any = {};
    if (patient.anamnesis) {
      try { fd = JSON.parse(patient.anamnesis); } catch (_) {}
    }

    const conditions = [
      ['diabetes', 'Diabetes Mellitus'],
      ['hypertension', 'Hipertensão Arterial'],
      ['cardiacIssues', 'Cardiopatias / Problemas Cardíacos'],
      ['bleedingDisorders', 'Distúrbios Hemorrágicos / Coagulopatia'],
      ['pregnancy', 'Gravidez / Gestante'],
      ['asthma', 'Asma / Bronquite / DPOC'],
      ['hepatitis', 'Hepatite (A, B, C ou outra)'],
      ['hiv', 'HIV / AIDS'],
      ['rheumaticFever', 'Febre Reumática'],
      ['anesthesiaReaction', 'Reação adversa a Anestésico'],
      ['smoker', 'Tabagista / Fumante'],
      ['alcohol', 'Etilismo / Consumo de Álcool'],
    ];

    return (
      <div style={PAGE}>
        <PrintHeader
          title="Ficha de Anamnese Odontológica"
          subtitle="Histórico de Saúde do Paciente — Preenchimento Obrigatório"
          patientName={patient.name}
          patientCpf={patient.cpf}
          patientDob={patientDob}
        />

        {/* I – Clinical history */}
        <div style={{ marginBottom: '24px' }}>
          <p style={SECTION_TITLE}>I. Queixas e Histórico Clínico</p>
          {[
            { label: 'Motivo da Consulta / Queixa Principal', value: fd.mainComplaint },
            { label: 'Histórico Médico Pregresso (doenças anteriores, cirurgias, internações)', value: fd.medicalHistory },
            { label: 'Alergias a Medicamentos ou outras Substâncias', value: fd.allergies },
            { label: 'Medicamentos em Uso Contínuo (nome, dose e frequência)', value: fd.medications },
          ].map((item, i) => (
            <div key={i} style={{ marginBottom: '16px', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
              <span style={FIELD_LABEL}>{item.label}</span>
              <div style={{ borderBottom: '1px solid #d4d4d8', minHeight: '36px', paddingBottom: '4px' }}>
                <span style={{ ...FIELD_VALUE, fontSize: '14px' }}>
                  {item.value || <span style={{ color: '#a1a1aa', fontStyle: 'italic' }}>Não informado.</span>}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* II – Systemic conditions */}
        <div style={{ marginBottom: '24px', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
          <p style={SECTION_TITLE}>II. Questionário de Saúde — Condições Sistêmicas</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 48px' }}>
            {conditions.map(([key, label]) => {
              const checked = Boolean(fd[key]);
              return (
                <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px dashed #e4e4e7', padding: '6px 0' }}>
                  <span style={{ fontSize: '12px', fontWeight: '500', color: '#3f3f46' }}>{label}</span>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexShrink: 0 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', fontWeight: '700', color: '#18181b' }}>
                      <span style={{ ...CHECKBOX, background: checked ? '#4f46e5' : 'white', color: checked ? 'white' : 'transparent' }}>✓</span>
                      SIM
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', fontWeight: '700', color: '#18181b' }}>
                      <span style={{ ...CHECKBOX, background: !checked ? '#18181b' : 'white', color: !checked ? 'white' : 'transparent' }}>✓</span>
                      NÃO
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* III – Additional notes */}
        <div style={{ marginBottom: '24px', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
          <p style={SECTION_TITLE}>III. Observações Adicionais</p>
          <div style={{ border: '1px solid #e4e4e7', borderRadius: '8px', padding: '12px 16px', minHeight: '60px' }}>
            <span style={{ ...FIELD_VALUE, fontSize: '14px' }}>
              {fd.notes || <span style={{ color: '#a1a1aa', fontStyle: 'italic' }}>Sem observações adicionais.</span>}
            </span>
          </div>
        </div>

        {/* IV – Responsibility term */}
        <div style={{ pageBreakInside: 'avoid', breakInside: 'avoid', marginBottom: '24px', padding: '14px 18px', borderLeft: '4px solid #4f46e5', background: '#f5f5ff', borderRadius: '0 8px 8px 0' }}>
          <p style={{ fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#4f46e5', margin: '0 0 6px' }}>
            IV. Declaração de Veracidade das Informações
          </p>
          <p style={{ fontFamily: '"Crimson Pro", serif', fontSize: '13px', color: '#3f3f46', lineHeight: '1.7', margin: 0, textAlign: 'justify' }}>
            Declaro, sob as penas da lei, que as informações prestadas nesta ficha de anamnese são a mais estrita expressão da verdade, não tendo omitido qualquer dado relativo ao meu estado de saúde, medicamentos em uso, alergias ou condições preexistentes. Comprometo-me a informar ao cirurgião-dentista qualquer alteração relevante em minha saúde durante o tratamento, ciente de que omissões podem acarretar complicações médicas graves.
          </p>
        </div>

        <PrintFooter signatureType="both" patientName={patient.name} />
      </div>
    );
  };

  /* ── 3. Evolução Clínica ────────────────────────────────────────────────── */
  const renderEvolution = () => {
    const fmt = (ts: any) => {
      if (!ts) return 'Data não informada';
      const d = ts.toDate ? ts.toDate() : new Date(ts);
      return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(d);
    };

    return (
      <div style={PAGE}>
        <PrintHeader
          title="Evolução Clínica do Paciente"
          subtitle="Registro de Atendimentos e Procedimentos Realizados"
          patientName={patient.name}
          patientCpf={patient.cpf}
          patientDob={patientDob}
        />

        {evolutions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', border: '2px dashed #e4e4e7', borderRadius: '12px', color: '#a1a1aa', fontFamily: '"Crimson Pro", serif', fontSize: '16px', fontStyle: 'italic' }}>
            Nenhuma evolução clínica registrada para este prontuário.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            {evolutions.map((note, idx) => (
              <div key={note.id} style={{ pageBreakInside: 'avoid', breakInside: 'avoid', borderBottom: idx < evolutions.length - 1 ? '1px solid #e4e4e7' : 'none', paddingBottom: '20px', marginBottom: '20px' }}>
                {/* Entry header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div>
                    <p style={{ fontFamily: '"Crimson Pro", serif', fontSize: '17px', fontWeight: '700', color: '#18181b', margin: '0 0 2px' }}>
                      {note.procedure || 'Procedimento Clínico'}
                    </p>
                    <p style={{ fontSize: '9px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.12em', color: note.status === 'realizado' ? '#16a34a' : '#ea580c', margin: 0 }}>
                      Dentista: {note.authorName}
                      {note.tooth && ` · Dente/Região: ${note.tooth}`}
                      {` · Status: ${note.status === 'realizado' ? 'REALIZADO' : 'NÃO REALIZADO'}`}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '16px' }}>
                    <p style={{ fontSize: '9px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#a1a1aa', margin: 0 }}>{fmt(note.createdAt)}</p>
                  </div>
                </div>

                {/* Content */}
                <p style={{ fontFamily: '"Crimson Pro", serif', fontSize: '14px', color: '#3f3f46', lineHeight: '1.75', margin: 0, textAlign: 'justify', paddingLeft: '12px', borderLeft: '3px solid #e4e4e7' }}>
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

  /* ── 4. Plano de Tratamento e Orçamento ─────────────────────────────────── */
  const renderTreatmentPlan = () => {
    let procs: any[] = [];
    let planTitle = 'Plano de Tratamento';
    if (patient.treatmentProposals) {
      try {
        const proposals = JSON.parse(patient.treatmentProposals);
        const selected = proposals.find((p: any) => p.status === 'selected') || proposals[0];
        if (selected) {
          procs = selected.procedures;
          planTitle = selected.title;
        }
      } catch (_) {}
    }
    const total = procs.reduce((s, p) => s + (p.totalPrice || p.cost || 0), 0);
    const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

    return (
      <div style={PAGE}>
        <PrintHeader
          title={planTitle}
          subtitle="Proposta Clínica — Sujeita à Aprovação do Paciente"
          patientName={patient.name}
          patientCpf={patient.cpf}
          patientDob={patientDob}
        />

        {/* Plan meta */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '24px', padding: '14px 18px', border: '2px solid #18181b', borderRadius: '10px' }}>
          {[
            { label: 'Status do Plano', value: patient.treatmentStatus || 'Em Planejamento' },
            { label: 'Previsão de Início', value: patient.treatmentStartDate ? new Date(patient.treatmentStartDate).toLocaleDateString('pt-BR') : 'A definir' },
            { label: 'Previsão de Conclusão', value: patient.treatmentEndDate ? new Date(patient.treatmentEndDate).toLocaleDateString('pt-BR') : 'A definir' },
          ].map((f, i) => (
            <div key={i}>
              <p style={{ ...FIELD_LABEL, marginBottom: '4px' }}>{f.label}</p>
              <p style={{ fontFamily: '"Crimson Pro", serif', fontSize: '15px', fontWeight: '700', color: '#18181b', margin: 0 }}>{f.value}</p>
            </div>
          ))}
        </div>

        {/* Procedures table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '12px' }}>
          <thead>
            <tr style={{ borderBottom: '3px solid #18181b' }}>
              {['Procedimento / Descrição', 'Dente / Região', 'Qtd', 'Valor Unit.', 'Total'].map(h => (
                <th key={h} style={{ fontFamily: '"Crimson Pro", serif', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#71717a', padding: '8px 6px', textAlign: h === 'Procedimento / Descrição' ? 'left' : 'center' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {procs.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '32px', fontFamily: '"Crimson Pro", serif', fontStyle: 'italic', color: '#a1a1aa' }}>
                  Nenhum procedimento incluído neste orçamento.
                </td>
              </tr>
            )}
            {procs.map((p, i) => (
              <tr key={p.id} style={{ borderBottom: '1px solid #f4f4f5', pageBreakInside: 'avoid', breakInside: 'avoid', background: i % 2 === 0 ? 'transparent' : '#fafafa' }}>
                <td style={{ padding: '10px 6px', fontFamily: '"Crimson Pro", serif', fontSize: '15px', fontWeight: '600', color: '#18181b' }}>{p.name}</td>
                <td style={{ padding: '10px 6px', textAlign: 'center', fontFamily: '"Crimson Pro", serif', fontSize: '14px', color: '#52525b' }}>{p.tooth || '—'}</td>
                <td style={{ padding: '10px 6px', textAlign: 'center', fontFamily: '"Crimson Pro", serif', fontSize: '14px', color: '#52525b' }}>{p.quantity || 1}</td>
                <td style={{ padding: '10px 6px', textAlign: 'center', fontFamily: '"Crimson Pro", serif', fontSize: '14px', color: '#52525b' }}>{fmt(p.unitPrice || p.cost)}</td>
                <td style={{ padding: '10px 6px', textAlign: 'center', fontFamily: '"Crimson Pro", serif', fontSize: '15px', fontWeight: '700', color: '#18181b' }}>{fmt(p.totalPrice || p.cost)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ borderTop: '3px solid #18181b' }}>
              <td colSpan={4} style={{ padding: '14px 6px', textAlign: 'right', fontFamily: '"Crimson Pro", serif', fontSize: '12px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#71717a' }}>
                Investimento Total Estimado
              </td>
              <td style={{ padding: '14px 6px', textAlign: 'center', fontFamily: '"Crimson Pro", serif', fontSize: '22px', fontWeight: '900', color: '#4f46e5' }}>
                {fmt(total)}
              </td>
            </tr>
          </tfoot>
        </table>

        {/* Validity note */}
        <div style={{ pageBreakInside: 'avoid', breakInside: 'avoid', marginBottom: '24px', padding: '12px 16px', border: '1px solid #e4e4e7', borderRadius: '8px', background: '#fafafa' }}>
          <p style={{ fontFamily: '"Crimson Pro", serif', fontSize: '12px', color: '#71717a', lineHeight: '1.6', margin: 0, fontStyle: 'italic' }}>
            * Este orçamento tem validade de 30 dias a partir da data de emissão. O início do tratamento está condicionado à aprovação deste plano e à assinatura do Termo de Consentimento Livre e Esclarecido (TCLE). Valores podem ser revisados em caso de procedimentos adicionais identificados durante o tratamento.
          </p>
        </div>

        <PrintFooter signatureType="both" patientName={patient.name} />
      </div>
    );
  };

  /* ── 5. Document template (receituário, TCLE, etc.) ─────────────────────── */
  const renderTemplate = (template: DocumentTemplate) => {
    let content = template.content;
    content = content
      .replace(/\[Nome do Paciente\]/g, patient.name)
      .replace(/\[CPF\]/g, patient.cpf || '_________________')
      .replace(/\[RG\]/g, patient.rg || '_________________')
      .replace(/\[Data\]/g, new Date().toLocaleDateString('pt-BR'));

    const titleMap: Record<string, string> = {
      prescription: 'Receituário Médico-Odontológico',
      certificate: 'Atestado Odontológico',
      tcle: 'Termo de Consentimento Livre e Esclarecido',
      'image-release': 'Autorização de Uso de Imagem',
      laudo: 'Laudo Odontológico',
      postop: 'Recomendações Pós-Operatórias',
      referral: 'Carta de Encaminhamento Médico',
      attendance: 'Declaração de Comparecimento',
      exame: 'Solicitação de Exames',
    };
    const title = titleMap[template.type] || 'Documento Odontológico';

    const needsTwoCopies = template.type === 'prescription' &&
      TWO_COPY_MEDICATIONS.some(m => content.toLowerCase().includes(m.toLowerCase()));

    const sigType = (template.type === 'tcle' || template.type === 'image-release') ? 'both' : 'dentist';

    const renderCopy = (via?: string) => (
      <div style={{ ...PAGE, position: 'relative' }}>
        <PrintHeader
          title={title}
          patientName={patient.name}
          patientCpf={patient.cpf}
          patientDob={patientDob}
          via={via}
        />

        {/* Main content */}
        <div style={{
          fontFamily: '"Crimson Pro", serif',
          fontSize: '17px',
          lineHeight: '1.9',
          color: '#18181b',
          whiteSpace: 'pre-wrap',
          textAlign: 'justify',
          marginBottom: '32px',
          padding: '0 4px',
        }}>
          {content}
        </div>

        <PrintFooter signatureType={sigType} patientName={patient.name} />
      </div>
    );

    if (needsTwoCopies) {
      return (
        <React.Fragment key={template.id}>
          {renderCopy('1ª Via – Farmácia')}
          {renderCopy('2ª Via – Paciente')}
        </React.Fragment>
      );
    }

    return <React.Fragment key={template.id}>{renderCopy()}</React.Fragment>;
  };

  /* ── Render ─────────────────────────────────────────────────────────────── */
  return (
    <div className="unified-print-only" style={{ maxWidth: '800px', margin: '0 auto', fontFamily: 'system-ui, sans-serif' }}>
      {selectedSections.includes('personal')   && renderPersonal()}
      {selectedSections.includes('anamnesis')  && renderAnamnesis()}
      {selectedSections.includes('evolution')  && renderEvolution()}
      {selectedSections.includes('treatment')  && renderTreatmentPlan()}
      {selectedTemplates.map(renderTemplate)}
    </div>
  );
};
