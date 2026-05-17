import React from 'react';
import { Patient, DocumentTemplate } from '../../types';
import { PrintHeader } from '../print/PrintHeader';
import { PrintFooter } from '../print/PrintFooter';

interface PatientPrintViewProps {
  patient: Patient;
  selectedSections: string[];
  selectedTemplates: DocumentTemplate[];
  evolutions: any[];
  payments: any[];
  customDocument?: {
    title: string;
    content: string;
    type: string;
  };
  showDentistSignature?: boolean;
  showPatientSignature?: boolean;
}

export const PatientPrintView: React.FC<PatientPrintViewProps> = ({
  patient,
  selectedSections,
  selectedTemplates,
  evolutions,
  payments,
  customDocument,
  showDentistSignature,
  showPatientSignature,
}) => {
  if (selectedSections.length === 0 && selectedTemplates.length === 0 && !customDocument) return null;

  const patientDob = patient.dob
    ? new Date(patient.dob).toLocaleDateString('pt-BR')
    : undefined;

  /* ── 1. Dados Pessoais ──────────────────────────────────────────────────── */
  const renderPersonal = () => (
    <div className="flex flex-col h-full print:break-after-page mb-10">
      <PrintHeader
        title="Ficha de Identificação"
        patientName={patient.name}
        patientCpf={patient.cpf}
        patientDob={patientDob}
      />

      <div className="flex-grow space-y-8">
        <section>
          <h3 className="text-[11px] font-black tracking-widest text-slate-800 uppercase border-b-[1.5px] border-slate-800 pb-1.5 mb-4 flex items-center gap-2">
            <span className="w-4 h-4 bg-slate-800 text-white rounded-full flex items-center justify-center text-[9px] print:bg-slate-800 print:text-white">1</span>
            Dados Pessoais
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-y-3 gap-x-6 text-xs px-2">
            <div className="col-span-2 md:col-span-3">
              <span className="text-[9px] uppercase tracking-widest text-slate-500 block mb-0.5">Nome Completo</span> 
              <span className="text-sm font-bold text-slate-900">{patient.name}</span>
            </div>
            <div><span className="text-[9px] uppercase tracking-widest text-slate-500 block mb-0.5">Data de Nascimento</span> {patientDob || '___/___/______'}</div>
            <div><span className="text-[9px] uppercase tracking-widest text-slate-500 block mb-0.5">CPF</span> {patient.cpf || '_________________'}</div>
            <div><span className="text-[9px] uppercase tracking-widest text-slate-500 block mb-0.5">RG / Órgão</span> {patient.rg || '_______'} {patient.issuingBody ? `/ ${patient.issuingBody}` : ''}</div>
            <div><span className="text-[9px] uppercase tracking-widest text-slate-500 block mb-0.5">Profissão</span> {patient.profession || 'Não informada'}</div>
            <div><span className="text-[9px] uppercase tracking-widest text-slate-500 block mb-0.5">Estado Civil</span> {patient.maritalStatus || 'Não informado'}</div>
            <div><span className="text-[9px] uppercase tracking-widest text-slate-500 block mb-0.5">Plano de Saúde</span> {(patient as any).healthInsurance || 'Não informado'}</div>
          </div>
        </section>

        <section>
          <h3 className="text-[11px] font-black tracking-widest text-slate-800 uppercase border-b-[1.5px] border-slate-800 pb-1.5 mb-4 flex items-center gap-2">
            <span className="w-4 h-4 bg-slate-800 text-white rounded-full flex items-center justify-center text-[9px] print:bg-slate-800 print:text-white">2</span>
            Contato e Endereço
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-y-3 gap-x-6 text-xs px-2">
            <div className="col-span-2 md:col-span-3"><span className="text-[9px] uppercase tracking-widest text-slate-500 block mb-0.5">Endereço Residencial</span> {patient.address || 'Não informado'}</div>
            <div><span className="text-[9px] uppercase tracking-widest text-slate-500 block mb-0.5">Cidade / Estado</span> {patient.city || '_______'} / {patient.state || '__'}</div>
            <div><span className="text-[9px] uppercase tracking-widest text-slate-500 block mb-0.5">CEP</span> {patient.zipCode || '__________'}</div>
            <div><span className="text-[9px] uppercase tracking-widest text-slate-500 block mb-0.5">Telefone</span> {patient.phone || 'Não informado'}</div>
            <div className="col-span-2"><span className="text-[9px] uppercase tracking-widest text-slate-500 block mb-0.5">E-mail</span> {patient.email || 'Não informado'}</div>
          </div>
        </section>
      </div>

      <PrintFooter showDentistSignature={showDentistSignature} showPatientSignature={showPatientSignature} signatureType="patient" patientName={patient.name} />
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
      <div className="flex flex-col h-full print:break-after-page mb-10">
        <PrintHeader
          title="Ficha de Anamnese"
          subtitle="Histórico de Saúde do Paciente"
          patientName={patient.name}
          patientCpf={patient.cpf}
          patientDob={patientDob}
        />

        <div className="flex-grow space-y-8">
          <section>
            <h3 className="text-[11px] font-black tracking-widest text-slate-800 uppercase border-b-[1.5px] border-slate-800 pb-1.5 mb-4 flex items-center gap-2">
              <span className="w-4 h-4 bg-slate-800 text-white rounded-full flex items-center justify-center text-[9px] print:bg-slate-800 print:text-white">1</span>
              Queixas e Histórico Clínico
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-6 text-xs px-2">
              <div className="border-b border-slate-200 pb-2"><span className="text-[9px] uppercase tracking-widest text-slate-500 block mb-0.5">Queixa Principal</span> {fd.mainComplaint || 'Não informado'}</div>
              <div className="border-b border-slate-200 pb-2"><span className="text-[9px] uppercase tracking-widest text-slate-500 block mb-0.5">Histórico Médico</span> {fd.medicalHistory || 'Não informado'}</div>
              <div className="border-b border-slate-200 pb-2"><span className="text-[9px] uppercase tracking-widest text-slate-500 block mb-0.5">Alergias</span> {fd.allergies || 'Não informado'}</div>
              <div className="border-b border-slate-200 pb-2"><span className="text-[9px] uppercase tracking-widest text-slate-500 block mb-0.5">Medicamentos em Uso</span> {fd.medications || 'Não informado'}</div>
            </div>
          </section>

          <section>
            <h3 className="text-[11px] font-black tracking-widest text-slate-800 uppercase border-b-[1.5px] border-slate-800 pb-1.5 mb-4 flex items-center gap-2">
              <span className="w-4 h-4 bg-slate-800 text-white rounded-full flex items-center justify-center text-[9px] print:bg-slate-800 print:text-white">2</span>
              Questionário de Saúde
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-3 mt-3 text-xs px-2">
              {conditions.map(([key, label]) => {
                const checked = Boolean(fd[key]);
                return (
                  <div key={key} className="flex justify-between items-center border-b border-dashed border-slate-200 py-1.5">
                    <span className="font-medium text-slate-700">{label}</span>
                    <div className="flex gap-2 items-center">
                      <span className={`w-3.5 h-3.5 flex items-center justify-center border border-slate-800 rounded-sm text-[9px] font-bold ${checked ? 'bg-slate-800 text-white print:bg-slate-800 print:text-white' : 'bg-white text-transparent print:bg-white print:text-transparent'}`}>✓</span>
                      <span className="text-[9px] font-bold text-slate-500">S</span>
                      <span className={`w-3.5 h-3.5 flex items-center justify-center border border-slate-800 rounded-sm text-[9px] font-bold ${!checked ? 'bg-slate-800 text-white print:bg-slate-800 print:text-white' : 'bg-white text-transparent print:bg-white print:text-transparent'}`}>✓</span>
                      <span className="text-[9px] font-bold text-slate-500">N</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="bg-slate-50 p-5 border border-slate-200 rounded-lg mt-8 print:break-inside-avoid print:bg-slate-50/50">
            <p className="text-[9px] font-black uppercase text-slate-800 tracking-widest mb-2 text-center">Declaração de Veracidade</p>
            <p className="text-xs text-slate-600 leading-relaxed text-justify px-4">
              Declaro que as informações prestadas nesta ficha de anamnese são a expressão da verdade, não tendo omitido qualquer dado relativo ao meu estado de saúde. Comprometo-me a informar qualquer alteração relevante ao profissional responsável pelo meu tratamento.
            </p>
          </section>
        </div>

        <PrintFooter showDentistSignature={showDentistSignature} showPatientSignature={showPatientSignature} signatureType="both" patientName={patient.name} />
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
          <text x="20" y="30" textAnchor="middle" fontSize="10" fontFamily="sans-serif" fontWeight="bold" fill={status === 'extracted' ? 'white' : '#18181b'}>{id}</text>
        </g>
      );
    };

    const adultTeeth = [
      [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28],
      [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38]
    ];

    return (
      <div className="flex flex-col h-full print:break-after-page mb-10">
        <PrintHeader title="Odontograma Clínico" patientName={patient.name} patientCpf={patient.cpf} patientDob={patientDob} />
        
        <div className="flex-grow space-y-8">
          <section>
            <h3 className="text-[11px] font-black tracking-widest text-slate-800 uppercase border-b-[1.5px] border-slate-800 pb-1.5 mb-4 flex items-center gap-2">
              <span className="w-4 h-4 bg-slate-800 text-white rounded-full flex items-center justify-center text-[9px] print:bg-slate-800 print:text-white">1</span>
              Representação Gráfica
            </h3>
            <div className="bg-slate-50 p-6 rounded-lg border border-slate-200 print:bg-slate-50/50 print:border-slate-300 text-center">
              <svg viewBox="0 0 800 240" className="w-full h-auto max-w-2xl mx-auto drop-shadow-sm">
                <g transform="translate(40, 20)">
                  {adultTeeth[0].map((id, index) => (
                    <g key={id} transform={`translate(${index * 44}, 0)`}>
                      <ToothIcon id={id} status={teethState[id]?.status || 'healthy'} />
                    </g>
                  ))}
                  <text x="350" y="70" textAnchor="middle" fontSize="9" fill="#18181b" fontFamily="sans-serif" fontWeight="900" opacity="0.6" letterSpacing="0.2em">ARCADA SUPERIOR</text>
                </g>
                <g transform="translate(40, 140)">
                  {adultTeeth[1].map((id, index) => (
                    <g key={id} transform={`translate(${index * 44}, 0)`}>
                      <ToothIcon id={id} status={teethState[id]?.status || 'healthy'} />
                    </g>
                  ))}
                  <text x="350" y="70" textAnchor="middle" fontSize="9" fill="#18181b" fontFamily="sans-serif" fontWeight="900" opacity="0.6" letterSpacing="0.2em">ARCADA INFERIOR</text>
                </g>
              </svg>
            </div>
          </section>

          <section>
            <h3 className="text-[11px] font-black tracking-widest text-slate-800 uppercase border-b-[1.5px] border-slate-800 pb-1.5 mb-4 flex items-center gap-2">
              <span className="w-4 h-4 bg-slate-800 text-white rounded-full flex items-center justify-center text-[9px] print:bg-slate-800 print:text-white">2</span>
              Detalhamento Clínico
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 mt-3 text-xs px-2">
              {Object.entries(teethState).filter(([_, t]: any) => t.notes || t.status !== 'healthy').length === 0 ? (
                <p className="col-span-2 text-center italic text-slate-400 py-4">Nenhuma alteração registrada em dentes isolados.</p>
              ) : (
                Object.entries(teethState).filter(([_, t]: any) => t.notes || t.status !== 'healthy').map(([toothId, t]: any, idx) => (
                  <div key={`${toothId}-${idx}`} className="border-b border-slate-200 pb-3 print:break-inside-avoid">
                    <div className="flex items-center gap-3 mb-1.5">
                      <span className="font-bold text-slate-800">Dente {toothId}</span>
                      <span className="text-[8px] px-2 py-0.5 border border-slate-800 text-slate-800 rounded font-bold uppercase tracking-widest bg-slate-50">{t.status}</span>
                    </div>
                    {t.notes && <p className="text-xs text-slate-600 leading-relaxed">"{t.notes}"</p>}
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        <PrintFooter showDentistSignature={showDentistSignature} showPatientSignature={showPatientSignature} signatureType="dentist" />
      </div>
    );
  };

  /* ── 4. Evolução Clínica ────────────────────────────────────────────────── */
  const renderEvolution = () => (
    <div className="flex flex-col h-full print:break-after-page mb-10">
      <PrintHeader title="Evolução Clínica" patientName={patient.name} patientCpf={patient.cpf} patientDob={patientDob} />
      
      <div className="flex-grow">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b-[1.5px] border-slate-800 text-[9px] uppercase tracking-widest text-slate-500">
              <th className="py-3 px-2 font-bold w-24">Data</th>
              <th className="py-3 px-2 font-bold">Procedimento</th>
              <th className="py-3 px-2 font-bold w-1/2">Notas Clínicas</th>
              <th className="py-3 px-2 font-bold w-24 text-right">Status</th>
            </tr>
          </thead>
          <tbody>
            {evolutions.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-6 text-center italic text-slate-400">Nenhum registro de evolução encontrado.</td>
              </tr>
            ) : (
              evolutions.map((evo, idx) => (
                <tr key={`${evo.id || 'evo'}-${idx}`} className="border-b border-slate-200 print:break-inside-avoid">
                  <td className="py-4 px-2 align-top font-mono text-[10px] text-slate-500">
                    {new Date(evo.createdAt).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="py-4 px-2 align-top font-bold text-slate-800">
                    {evo.procedure || 'Consulta'}
                  </td>
                  <td className="py-4 px-2 align-top text-slate-600 text-justify leading-relaxed">
                    {evo.content}
                  </td>
                  <td className="py-4 px-2 align-top text-right">
                    <span className={`inline-block px-2 py-0.5 rounded-[3px] text-[8px] font-bold uppercase tracking-widest border ${evo.status?.toLowerCase() === 'realizado' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 print:bg-emerald-50/50' : 'bg-slate-50 text-slate-600 border-slate-200 print:bg-slate-50/50'}`}>
                      {evo.status || 'Registrado'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <PrintFooter showDentistSignature={showDentistSignature} showPatientSignature={showPatientSignature} signatureType="dentist" />
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
      <div className="flex flex-col h-full print:break-after-page mb-10">
        <PrintHeader title={planTitle || 'Plano de Tratamento'} patientName={patient.name} patientCpf={patient.cpf} patientDob={patientDob} />
        
        <div className="flex-grow">
          <table className="w-full text-left text-xs border-collapse mb-8">
            <thead>
              <tr className="border-b-[1.5px] border-slate-800 text-[9px] uppercase tracking-widest text-slate-500">
                <th className="py-3 px-2 font-bold w-1/2">Procedimento</th>
                <th className="py-3 px-2 font-bold text-center">Dente/Região</th>
                <th className="py-3 px-2 font-bold text-center">Qtd</th>
                <th className="py-3 px-2 font-bold text-right">Valor (R$)</th>
              </tr>
            </thead>
            <tbody>
              {procs.length === 0 ? (
                <tr><td colSpan={4} className="p-6 text-center italic text-slate-400">Nenhum procedimento proposto.</td></tr>
              ) : (
                procs.map((p, index) => (
                  <tr key={`${p.id || 'proc'}-${index}`} className="border-b border-slate-200 print:break-inside-avoid">
                    <td className="py-3 px-2 font-semibold text-slate-800">{p.name}</td>
                    <td className="py-3 px-2 text-center text-slate-500 font-mono text-[10px]">{p.tooth || '—'}</td>
                    <td className="py-3 px-2 text-center text-slate-600">{p.quantity || 1}</td>
                    <td className="py-3 px-2 text-right whitespace-nowrap font-mono font-medium text-slate-700">{fmt(p.totalPrice || p.cost)}</td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr className="border-t-[1.5px] border-slate-800">
                <td colSpan={3} className="pt-4 pb-2 px-2 text-right uppercase text-[9px] tracking-widest text-slate-500 font-bold">Valor Total Estimado</td>
                <td className="pt-4 pb-2 px-2 text-right text-sm font-bold text-slate-900">{fmt(total)}</td>
              </tr>
            </tfoot>
          </table>

          <div className="text-[9px] leading-relaxed text-slate-500 border border-slate-200 p-4 rounded-lg bg-slate-50 print:bg-slate-50/50">
            <p><span className="font-bold text-slate-700 uppercase tracking-widest mr-2">Atenção</span> Os valores acima são uma estimativa baseada na avaliação clínica inicial e em radiografias prévias. O plano de tratamento pode sofrer alterações durante a execução dos procedimentos, caso novas necessidades sejam identificadas. Este orçamento é válido por 30 dias.</p>
          </div>
        </div>

        <PrintFooter showDentistSignature={showDentistSignature} showPatientSignature={showPatientSignature} signatureType="both" patientName={patient.name} />
      </div>
    );
  };

  /* ── 6. Histórico Financeiro ────────────────────────────────────────────── */
  const renderPayments = () => {
    const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
    const total = payments.filter(p => p.paymentStatus !== 'pendente').reduce((s, p) => s + p.amount, 0);

    return (
      <div className="flex flex-col h-full print:break-after-page mb-10">
        <PrintHeader title="Extrato Financeiro" patientName={patient.name} patientCpf={patient.cpf} patientDob={patientDob} />
        
        <div className="flex-grow">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b-[1.5px] border-slate-800 text-[9px] uppercase tracking-widest text-slate-500">
                <th className="py-3 px-2 font-bold w-28">Data</th>
                <th className="py-3 px-2 font-bold">Descrição do Lançamento</th>
                <th className="py-3 px-2 font-bold text-center">Status</th>
                <th className="py-3 px-2 font-bold text-right">Valor</th>
              </tr>
            </thead>
            <tbody>
              {payments.length === 0 ? (
                <tr><td colSpan={4} className="p-6 text-center italic text-slate-400">Nenhum lançamento encontrado.</td></tr>
              ) : (
                payments.map((p, i) => (
                  <tr key={`${p.id || 'pay'}-${i}`} className="border-b border-slate-200">
                    <td className="py-4 px-2 text-[10px] font-mono text-slate-500">{new Date(p.date).toLocaleDateString('pt-BR')}</td>
                    <td className="py-4 px-2 font-semibold text-slate-800">{p.description}</td>
                    <td className="py-4 px-2 text-center">
                      <span className={`px-2 py-0.5 border rounded-[3px] text-[8px] font-bold uppercase tracking-widest ${
                        p.paymentStatus === 'pendente' 
                          ? 'bg-amber-50 text-amber-700 border-amber-200 print:bg-amber-50/50' 
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200 print:bg-emerald-50/50'
                      }`}>
                        {p.paymentStatus || 'RECEBIDO'}
                      </span>
                    </td>
                    <td className="py-4 px-2 text-right font-mono font-medium text-slate-700">{fmt(p.amount)}</td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr className="border-t-[1.5px] border-slate-800">
                <td colSpan={3} className="pt-4 pb-2 px-2 text-right uppercase text-[9px] tracking-widest text-slate-500 font-bold">Total Acumulado Pago</td>
                <td className="pt-4 pb-2 px-2 text-right text-sm font-bold text-slate-900">{fmt(total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <PrintFooter signatureType="patient" patientName={patient.name} />
      </div>
    );
  };

  /* ── Atestado Odontológico ─────────────────────────────────────────────── */
  const renderAtestado = () => (
    <div className="flex flex-col h-full print:break-after-page mb-10">
      <PrintHeader
        title="Atestado Odontológico"
        patientName={patient.name}
        patientCpf={patient.cpf}
        patientDob={patientDob}
      />
      <div className="flex-grow text-sm leading-loose text-slate-800 text-justify space-y-6 pt-8 px-4">
        <p className="indent-8">
          Atesto para os devidos fins que o(a) paciente <strong className="font-semibold">{patient.name}</strong>, portador(a) do CPF nº <strong className="font-semibold">{patient.cpf || '_________________'}</strong>, esteve sob meus cuidados profissionais no dia {new Date().toLocaleDateString('pt-BR')}, das ___:___ às ___:___ horas, necessitando de <strong className="font-semibold">_______</strong> dias de repouso por motivo de tratamento odontológico.
        </p>
        <div className="mt-12 flex justify-end">
          <p className="font-bold border border-slate-300 px-4 py-2 rounded bg-slate-50 text-slate-700 w-48 text-center print:bg-slate-50/50">
            CID: _______
          </p>
        </div>
      </div>
      <PrintFooter showDentistSignature={showDentistSignature} showPatientSignature={showPatientSignature} signatureType="dentist" />
    </div>
  );

  /* ── Recomendações Pós-Operatórias ─────────────────────────────────────── */
  const renderRecomendacoes = () => (
    <div className="flex flex-col h-full print:break-after-page mb-10">
      <PrintHeader
        title="Recomendações Pós-Operatórias"
        patientName={patient.name}
        patientCpf={patient.cpf}
        patientDob={patientDob}
      />
      <div className="flex-grow text-[13px] text-slate-800 leading-loose text-justify mt-8 px-4">
        <ul className="space-y-6">
          <li className="print:break-inside-avoid flex gap-3">
            <span className="font-bold text-slate-400">01.</span>
            <div><strong className="text-slate-900">Alimentação:</strong> Líquida e pastosa, fria ou gelada nas primeiras 24 horas. Evitar alimentos quentes, duros ou condimentados.</div>
          </li>
          <li className="print:break-inside-avoid flex gap-3">
            <span className="font-bold text-slate-400">02.</span>
            <div><strong className="text-slate-900">Repouso:</strong> Evitar esforço físico, sol e calor por 48 horas. Dormir com a cabeça mais elevada que o resto do corpo.</div>
          </li>
          <li className="print:break-inside-avoid flex gap-3">
            <span className="font-bold text-slate-400">03.</span>
            <div><strong className="text-slate-900">Higiene:</strong> Não bochechar vigorosamente nas primeiras 24 horas para não remover o coágulo. Escovar os dentes normalmente, mas com muito cuidado na área operada.</div>
          </li>
          <li className="print:break-inside-avoid flex gap-3">
            <span className="font-bold text-slate-400">04.</span>
            <div><strong className="text-slate-900">Sangramento:</strong> É normal um leve sangramento (saliva rosada) nas primeiras horas. Em caso de hemorragia, dobre uma gaze limpa e morda em cima do local por 30 minutos.</div>
          </li>
          <li className="print:break-inside-avoid flex gap-3">
            <span className="font-bold text-slate-400">05.</span>
            <div><strong className="text-slate-900">Inchaço:</strong> Aplicar bolsa de gelo no rosto (lado operado) nas primeiras 24 horas (20 minutos aplica, 20 minutos descansa) para minimizar o edema.</div>
          </li>
          <li className="print:break-inside-avoid flex gap-3">
            <span className="font-bold text-slate-400">06.</span>
            <div><strong className="text-slate-900">Medicação:</strong> Tomar rigorosamente os medicamentos prescritos no receituário nos horários indicados.</div>
          </li>
        </ul>
        <div className="mt-10 border border-slate-300 p-5 rounded-lg bg-slate-50 print:bg-slate-50/50 print:border-slate-400 flex items-start gap-4">
          <span className="text-xl">⚠️</span>
          <p className="font-semibold text-slate-800 text-sm m-0 leading-relaxed">
            Em caso de dor intensa, sangramento abundante ou dúvidas, entre em contato com a clínica imediatamente.
          </p>
        </div>
      </div>
      <PrintFooter showDentistSignature={showDentistSignature} showPatientSignature={showPatientSignature} signatureType="dentist" />
    </div>
  );

  /* ── 7. Document Templates ─────────────────────────────────────────────── */
  const renderTemplate = (template: DocumentTemplate, idx: number) => {
    let content = template.content
      .replace(/\[Nome do Paciente\]/g, patient.name)
      .replace(/\[CPF\]/g, patient.cpf || '_______')
      .replace(/\[Data\]/g, new Date().toLocaleDateString('pt-BR'));

    const title = template.title || 'Documento';
    const sigType = (template.type === 'tcle' || template.type === 'image-release') ? 'both' : 'dentist';

    return (
    <div key={`${template.id || 'tpl'}-${idx}`} className="flex flex-col h-full print:break-after-page mb-10">
        <PrintHeader title={title} patientName={patient.name} patientCpf={patient.cpf} patientDob={patientDob} />
        <div className="flex-grow text-sm text-slate-800 leading-loose text-justify space-y-6 whitespace-pre-wrap px-4">
          {content}
        </div>
        <PrintFooter showDentistSignature={showDentistSignature} showPatientSignature={showPatientSignature} signatureType={sigType} patientName={patient.name} />
      </div>
    );
  };

  /* ── 8. Custom Document ────────────────────────────────────────────────── */
  const renderCustomDocument = () => {
    if (!customDocument) return null;
    const title = customDocument.title || 'Documento Odontológico';
    const sigType = customDocument.type === 'tcle' ? 'both' : 'dentist';

    return (
      <div className="flex flex-col h-full print:break-after-page mb-10">
        <PrintHeader title={title} patientName={patient.name} patientCpf={patient.cpf} patientDob={patientDob} />
        <div className="flex-grow text-sm text-slate-800 leading-loose text-justify space-y-6 whitespace-pre-wrap px-4">
          {customDocument.content}
        </div>
        <PrintFooter showDentistSignature={showDentistSignature} showPatientSignature={showPatientSignature} signatureType={sigType} patientName={patient.name} />
      </div>
    );
  };

  return (
    <div className="unified-print-only w-full max-w-4xl mx-auto bg-white p-6 print:p-0">
      {selectedSections.includes('personal')   && <div key="personal-section">{renderPersonal()}</div>}
      {selectedSections.includes('anamnesis')  && <div key="anamnesis-section">{renderAnamnesis()}</div>}
      {selectedSections.includes('odontogram') && <div key="odontogram-section">{renderOdontogram()}</div>}
      {selectedSections.includes('evolution')  && <div key="evolution-section">{renderEvolution()}</div>}
      {selectedSections.includes('treatment')  && <div key="treatment-section">{renderTreatmentPlan()}</div>}
      {selectedSections.includes('payments')   && <div key="payments-section">{renderPayments()}</div>}
      {selectedSections.includes('atestado')   && <div key="atestado-section">{renderAtestado()}</div>}
      {selectedSections.includes('recomendacoes') && <div key="recomendacoes-section">{renderRecomendacoes()}</div>}
      {selectedTemplates.map((template, idx) => renderTemplate(template, idx))}
      {customDocument && <div key="custom-doc-section">{renderCustomDocument()}</div>}
    </div>
  );
};
