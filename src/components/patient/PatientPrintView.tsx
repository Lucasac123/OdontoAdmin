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
  payments: any[];
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
  marginBottom: '20px',
};

const SECTION_TITLE: React.CSSProperties = {
  fontFamily: '"Crimson Pro", serif',
  fontSize: '9px',
  fontWeight: '900',
  textTransform: 'uppercase',
  letterSpacing: '0.15em',
  color: '#71717a',
  borderBottom: '1.5px solid #18181b',
  paddingBottom: '4px',
  marginBottom: '12px',
};

const FIELD_LABEL: React.CSSProperties = {
  fontSize: '7px',
  fontWeight: '700',
  textTransform: 'uppercase',
  letterSpacing: '0.12em',
  color: '#a1a1aa',
  display: 'block',
  marginBottom: '1px',
};

const FIELD_VALUE: React.CSSProperties = {
  fontFamily: '"Crimson Pro", serif',
  fontSize: '13px',
  fontWeight: '600',
  color: '#18181b',
  lineHeight: 1.2,
};

const DOTTED_LINE: React.CSSProperties = {
  borderBottom: '1px dashed #d4d4d8',
  minHeight: '22px',
  paddingBottom: '2px',
  marginBottom: '2px',
};

const CHECKBOX: React.CSSProperties = {
  width: '12px',
  height: '12px',
  border: '1px solid #18181b',
  borderRadius: '2px',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '8px',
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
  payments,
}) => {
  if (selectedSections.length === 0 && selectedTemplates.length === 0) return null;

  const patientDob = patient.dob
    ? new Date(patient.dob).toLocaleDateString('pt-BR')
    : undefined;

  /* ── 1. Dados Pessoais ──────────────────────────────────────────────────── */
  const renderPersonal = () => (
    <div style={PAGE}>
      <PrintHeader
        title="Ficha de Identificação"
        patientName={patient.name}
        patientCpf={patient.cpf}
        patientDob={patientDob}
      />

      <div style={{ marginBottom: '15px' }}>
        <p style={SECTION_TITLE}>I. Dados Pessoais</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: '10px 20px' }}>
          {[
            { label: 'Nome Completo', value: patient.name, span: 3 },
            { label: 'Data de Nascimento', value: patientDob || '___/___/______' },
            { label: 'CPF', value: patient.cpf || '_________________' },
            { label: 'RG / Órgão Emissor', value: `${patient.rg || '_______'} ${patient.issuingBody ? `/ ${patient.issuingBody}` : ''}` },
            { label: 'Profissão', value: patient.profession || 'Não informada' },
            { label: 'Estado Civil', value: patient.maritalStatus || 'Não informado' },
            { label: 'Plano de Saúde', value: patient.healthInsurance || 'Não informado' },
          ].map((f, i) => (
            <div key={i} style={f.span ? { gridColumn: `span ${f.span}` } : {}}>
              <span style={FIELD_LABEL}>{f.label}</span>
              <div style={DOTTED_LINE}>
                <span style={FIELD_VALUE}>{f.value}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: '15px' }}>
        <p style={SECTION_TITLE}>II. Contato e Endereço</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: '10px 20px' }}>
          {[
            { label: 'Endereço Residencial', value: patient.address || 'Não informado', span: 3 },
            { label: 'Cidade / Estado', value: `${patient.city || '_______'} / ${patient.state || '__'}` },
            { label: 'CEP', value: patient.zipCode || '__________' },
            { label: 'Telefone', value: patient.phone || 'Não informado' },
            { label: 'E-mail', value: patient.email || 'Não informado', span: 2 },
          ].map((f, i) => (
            <div key={i} style={f.span ? { gridColumn: `span ${f.span}` } : {}}>
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
      ['diabetes', 'Diabetes Mellitus'], ['hypertension', 'Hipertensão Arterial'],
      ['cardiacIssues', 'Cardiopatias'], ['bleedingDisorders', 'Distúrbios Hemorrágicos'],
      ['pregnancy', 'Gravidez / Gestante'], ['asthma', 'Asma / Bronquite'],
      ['hepatitis', 'Hepatite'], ['hiv', 'HIV / AIDS'],
      ['rheumaticFever', 'Febre Reumática'], ['anesthesiaReaction', 'Reação Anestésico'],
      ['smoker', 'Tabagista'], ['alcohol', 'Etilismo'],
    ];

    return (
      <div style={PAGE}>
        <PrintHeader
          title="Ficha de Anamnese"
          subtitle="Histórico de Saúde do Paciente"
          patientName={patient.name}
          patientCpf={patient.cpf}
          patientDob={patientDob}
        />

        <div style={{ marginBottom: '12px' }}>
          <p style={SECTION_TITLE}>I. Queixas e Histórico Clínico</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 20px' }}>
            {[
              { label: 'Queixa Principal', value: fd.mainComplaint },
              { label: 'Histórico Médico', value: fd.medicalHistory },
              { label: 'Alergias', value: fd.allergies },
              { label: 'Medicamentos em Uso', value: fd.medications },
            ].map((item, i) => (
              <div key={i} style={{ marginBottom: '4px' }}>
                <span style={FIELD_LABEL}>{item.label}</span>
                <div style={{ borderBottom: '1px solid #d4d4d8', minHeight: '24px', paddingBottom: '2px' }}>
                  <span style={{ ...FIELD_VALUE, fontSize: '11px' }}>
                    {item.value || 'N/A'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: '12px' }}>
          <p style={SECTION_TITLE}>II. Questionário de Saúde</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px 20px' }}>
            {conditions.map(([key, label]) => {
              const checked = Boolean(fd[key]);
              return (
                <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px dashed #e4e4e7', padding: '2px 0' }}>
                  <span style={{ fontSize: '9px', fontWeight: '500', color: '#3f3f46' }}>{label}</span>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <span style={{ ...CHECKBOX, background: checked ? '#18181b' : 'white', color: checked ? 'white' : 'transparent' }}>✓</span>
                    <span style={{ fontSize: '8px', fontWeight: '700' }}>S</span>
                    <span style={{ ...CHECKBOX, background: !checked ? '#18181b' : 'white', color: !checked ? 'white' : 'transparent' }}>✓</span>
                    <span style={{ fontSize: '8px', fontWeight: '700' }}>N</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ pageBreakInside: 'avoid', breakInside: 'avoid', marginBottom: '15px', padding: '10px', borderLeft: '3px solid #18181b', background: '#fafafa' }}>
          <p style={{ fontSize: '8px', fontWeight: '800', textTransform: 'uppercase', color: '#18181b', margin: '0 0 4px' }}>Declaração de Veracidade</p>
          <p style={{ fontFamily: '"Crimson Pro", serif', fontSize: '10px', color: '#3f3f46', lineHeight: '1.4', margin: 0, textAlign: 'justify' }}>
            Declaro que as informações prestadas nesta ficha de anamnese são a expressão da verdade, não tendo omitido qualquer dado relativo ao meu estado de saúde. Comprometo-me a informar qualquer alteração relevante.
          </p>
        </div>

        <PrintFooter signatureType="both" patientName={patient.name} />
      </div>
    );
  };

  /* ── 3. Odontograma ─────────────────────────────────────────────────────── */
  const renderOdontogram = () => {
    let teethState: any = {};
    if (patient.odontogram) {
      try { teethState = JSON.parse(patient.odontogram); } catch (_) {}
    }

    const ToothIcon = ({ id, status }: { id: number; status: string }) => {
      const colors: Record<string, string> = {
        healthy: '#ffffff', caries: '#e11d48', restored: '#0891b2', extracted: '#18181b', missing: '#d4d4d8', implant: '#0d9488', endo: '#7c3aed'
      };
      const color = colors[status] || '#ffffff';
      return (
        <g>
          <path
            d="M5,10 C5,5 10,2 20,2 C30,2 35,5 35,10 L35,35 C35,42 30,48 20,48 C10,48 5,42 5,35 Z"
            fill={color}
            stroke="#18181b"
            strokeWidth="1"
            fillOpacity={status === 'healthy' ? 0.1 : 0.8}
          />
          <text x="20" y="30" textAnchor="middle" fontSize="10" fontWeight="bold" fill={status === 'extracted' ? 'white' : '#18181b'}>{id}</text>
        </g>
      );
    };

    const adultTeeth = [
      [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28],
      [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38]
    ];

    return (
      <div style={PAGE}>
        <PrintHeader title="Odontograma Clínico" patientName={patient.name} patientCpf={patient.cpf} patientDob={patientDob} />
        
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <svg viewBox="0 0 800 240" style={{ width: '100%', height: 'auto', maxWidth: '600px' }}>
            <g transform="translate(40, 20)">
              {adultTeeth[0].map((id, index) => (
                <g key={id} transform={`translate(${index * 44}, 0)`}>
                  <ToothIcon id={id} status={teethState[id]?.status || 'healthy'} />
                </g>
              ))}
              <text x="350" y="70" textAnchor="middle" fontSize="8" fill="#71717a" fontWeight="900" opacity="0.5">ARCADA SUPERIOR</text>
            </g>
            <g transform="translate(40, 140)">
              {adultTeeth[1].map((id, index) => (
                <g key={id} transform={`translate(${index * 44}, 0)`}>
                  <ToothIcon id={id} status={teethState[id]?.status || 'healthy'} />
                </g>
              ))}
              <text x="350" y="70" textAnchor="middle" fontSize="8" fill="#71717a" fontWeight="900" opacity="0.5">ARCADA INFERIOR</text>
            </g>
          </svg>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 40px' }}>
          {Object.values(teethState).filter((t: any) => t.notes || t.status !== 'healthy').map((t: any) => (
            <div key={t.id} style={{ borderBottom: '1px solid #f4f4f5', padding: '4px 0' }}>
              <span style={{ ...FIELD_LABEL, display: 'inline', marginRight: '8px' }}>DENTE {t.id}:</span>
              <span style={{ ...FIELD_VALUE, fontSize: '11px' }}>{t.status.toUpperCase()}</span>
              {t.notes && <p style={{ fontSize: '10px', color: '#52525b', margin: '2px 0 0', fontStyle: 'italic' }}>{t.notes}</p>}
            </div>
          ))}
        </div>

        <PrintFooter signatureType="dentist" />
      </div>
    );
  };

  /* ── 4. Evolução Clínica ────────────────────────────────────────────────── */
  const renderEvolution = () => (
    <div style={PAGE}>
      <PrintHeader title="Evolução Clínica" patientName={patient.name} patientCpf={patient.cpf} patientDob={patientDob} />
      {evolutions.length === 0 ? (
        <p style={{ textAlign: 'center', fontStyle: 'italic', color: '#a1a1aa' }}>Sem evoluções registradas.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {evolutions.map((note, idx) => (
            <div key={note.id} style={{ pageBreakInside: 'avoid', borderBottom: '1px solid #e4e4e7', paddingBottom: '8px', marginBottom: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                <div>
                  <span style={{ fontSize: '12px', fontWeight: '700' }}>{note.procedure || 'Consulta'}</span>
                  <span style={{ fontSize: '8px', color: note.status === 'realizado' ? '#16a34a' : '#ea580c', fontWeight: '900', marginLeft: '10px' }}>
                    {note.status?.toUpperCase() || 'N/A'}
                  </span>
                </div>
                <span style={{ fontSize: '8px', color: '#a1a1aa' }}>{new Date(note.createdAt).toLocaleDateString()}</span>
              </div>
              <p style={{ fontSize: '11px', color: '#3f3f46', lineHeight: '1.4' }}>{note.content}</p>
            </div>
          ))}
        </div>
      )}
      <PrintFooter signatureType="dentist" />
    </div>
  );

  /* ── 5. Plano de Tratamento ─────────────────────────────────────────────── */
  const renderTreatmentPlan = () => {
    let procs: any[] = [];
    let planTitle = 'Plano de Tratamento';
    if (patient.treatmentProposals) {
      try {
        const proposals = JSON.parse(patient.treatmentProposals);
        const selected = proposals.find((p: any) => p.status === 'selected') || proposals[0];
        if (selected) { procs = selected.procedures; planTitle = selected.title; }
      } catch (_) {}
    }
    const total = procs.reduce((s, p) => s + (p.totalPrice || p.cost || 0), 0);
    const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

    return (
      <div style={PAGE}>
        <PrintHeader title={planTitle} patientName={patient.name} patientCpf={patient.cpf} patientDob={patientDob} />
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '10px' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #18181b' }}>
              {['Procedimento', 'Dente', 'Qtd', 'Total'].map(h => (
                <th key={h} style={{ fontSize: '9px', fontWeight: '900', color: '#71717a', padding: '6px', textAlign: h === 'Procedimento' ? 'left' : 'center' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {procs.map((p, i) => (
              <tr key={p.id} style={{ borderBottom: '1px solid #f4f4f5', background: i % 2 === 0 ? 'transparent' : '#fafafa' }}>
                <td style={{ padding: '6px', fontSize: '11px', fontWeight: '600' }}>{p.name}</td>
                <td style={{ padding: '6px', textAlign: 'center', fontSize: '11px' }}>{p.tooth || '—'}</td>
                <td style={{ padding: '6px', textAlign: 'center', fontSize: '11px' }}>{p.quantity || 1}</td>
                <td style={{ padding: '6px', textAlign: 'center', fontSize: '11px', fontWeight: '700' }}>{fmt(p.totalPrice || p.cost)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ borderTop: '2px solid #18181b' }}>
              <td colSpan={3} style={{ padding: '8px', textAlign: 'right', fontSize: '9px', fontWeight: '900' }}>TOTAL ESTIMADO</td>
              <td style={{ padding: '8px', textAlign: 'center', fontSize: '16px', fontWeight: '900', color: '#18181b' }}>{fmt(total)}</td>
            </tr>
          </tfoot>
        </table>
        <PrintFooter signatureType="both" patientName={patient.name} />
      </div>
    );
  };

  /* ── 6. Histórico Financeiro ────────────────────────────────────────────── */
  const renderPayments = () => {
    const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
    const total = payments.filter(p => p.paymentStatus !== 'pendente').reduce((s, p) => s + p.amount, 0);

    return (
      <div style={PAGE}>
        <PrintHeader title="Extrato Financeiro" patientName={patient.name} patientCpf={patient.cpf} patientDob={patientDob} />
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '10px' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #18181b' }}>
              {['Data', 'Descrição', 'Status', 'Valor'].map(h => (
                <th key={h} style={{ fontSize: '9px', fontWeight: '900', color: '#71717a', padding: '6px', textAlign: 'left' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {payments.map((p, i) => (
              <tr key={p.id} style={{ borderBottom: '1px solid #f4f4f5', background: i % 2 === 0 ? 'transparent' : '#fafafa' }}>
                <td style={{ padding: '6px', fontSize: '11px' }}>{new Date(p.date).toLocaleDateString()}</td>
                <td style={{ padding: '6px', fontSize: '11px' }}>{p.description}</td>
                <td style={{ padding: '6px', fontSize: '9px', fontWeight: '900', color: p.paymentStatus === 'pendente' ? '#ea580c' : '#16a34a' }}>{p.paymentStatus?.toUpperCase() || 'PAGO'}</td>
                <td style={{ padding: '6px', fontSize: '11px', fontWeight: '700' }}>{fmt(p.amount)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ borderTop: '2px solid #18181b' }}>
              <td colSpan={3} style={{ padding: '8px', textAlign: 'right', fontSize: '9px', fontWeight: '900' }}>TOTAL PAGO</td>
              <td style={{ padding: '8px', fontSize: '14px', fontWeight: '900' }}>{fmt(total)}</td>
            </tr>
          </tfoot>
        </table>
        <PrintFooter signatureType="patient" patientName={patient.name} />
      </div>
    );
  };

  /* ── 7. Document Templates ─────────────────────────────────────────────── */
  const renderTemplate = (template: DocumentTemplate) => {
    let content = template.content
      .replace(/\[Nome do Paciente\]/g, patient.name)
      .replace(/\[CPF\]/g, patient.cpf || '_______')
      .replace(/\[Data\]/g, new Date().toLocaleDateString('pt-BR'));

    const title = template.title || 'Documento';
    const sigType = (template.type === 'tcle' || template.type === 'image-release') ? 'both' : 'dentist';

    return (
      <div key={template.id} style={PAGE}>
        <PrintHeader title={title} patientName={patient.name} patientCpf={patient.cpf} patientDob={patientDob} />
        <div style={{ fontFamily: '"Crimson Pro", serif', fontSize: '14px', lineHeight: '1.6', color: '#18181b', whiteSpace: 'pre-wrap', textAlign: 'justify', marginBottom: '20px' }}>
          {content}
        </div>
        <PrintFooter signatureType={sigType} patientName={patient.name} />
      </div>
    );
  };

  return (
    <div className="unified-print-only" style={{ maxWidth: '800px', margin: '0 auto' }}>
      {selectedSections.includes('personal')   && renderPersonal()}
      {selectedSections.includes('anamnesis')  && renderAnamnesis()}
      {selectedSections.includes('odontogram') && renderOdontogram()}
      {selectedSections.includes('evolution')  && renderEvolution()}
      {selectedSections.includes('treatment')  && renderTreatmentPlan()}
      {selectedSections.includes('payments')   && renderPayments()}
      {selectedTemplates.map(renderTemplate)}
    </div>
  );
};
