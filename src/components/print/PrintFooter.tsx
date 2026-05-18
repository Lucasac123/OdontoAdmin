import React from 'react';

interface PatientInfo {
  name: string;
  cpf?: string;
  rg?: string;
  dob?: string;
}

interface DentistInfo {
  name: string;
  cro?: string;
  specialty?: string;
}

interface PrintFooterProps {
  patient?: PatientInfo;
  dentist?: DentistInfo;
  date?: string;
  showPatientSignature?: boolean;
  showDentistSignature?: boolean;
  dentistLabelOverride?: string;
  // Legacy props
  dentistName?: string;
  cro?: string;
  signatureType?: 'dentist' | 'patient' | 'both';
  patientName?: string;
  showDate?: boolean;
}

export const PrintFooter: React.FC<PrintFooterProps> = ({ 
  patient, 
  dentist, 
  date, 
  showPatientSignature, 
  showDentistSignature,
  dentistLabelOverride,
  // Fallbacks
  dentistName = "Dr(a). Responsável",
  cro = "CRO XXXXX",
  signatureType = 'dentist',
  patientName = "Paciente",
}) => {
  const defaultDate = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });

  const shouldShowPatient = showPatientSignature ?? (signatureType === 'patient' || signatureType === 'both');
  const shouldShowDentist = showDentistSignature ?? (signatureType === 'dentist' || signatureType === 'both');

  const pName = patient?.name || patientName;
  const pCpf = patient?.cpf;
  const dName = dentist?.name || dentistName;
  const dCro = dentist?.cro || cro;
  const isDefaultCro = !dCro || dCro.toUpperCase() === 'CRO XXXXX' || dCro.toUpperCase() === 'CRO-XXXXX';

  return (
    <div className="print-only mt-12 pt-6 border-t-[1.5px] border-slate-800 avoid-break w-full shrink-0">
      <p className="text-right text-[10px] uppercase tracking-widest text-slate-500 mb-10">
        {date || defaultDate}
      </p>

      <div className={`flex items-end gap-12 ${shouldShowPatient && shouldShowDentist ? 'justify-between' : 'justify-center'}`}>
        
        {/* Assinatura do Paciente */}
        {shouldShowPatient && (
          <div className={`text-center ${shouldShowDentist ? 'flex-1 max-w-[240px]' : 'w-64'}`}>
            <div className="border-t border-slate-400 w-full mb-3"></div>
            <p className="font-bold text-xs text-slate-800 uppercase tracking-wide">{pName}</p>
            <p className="text-[9px] uppercase tracking-widest text-slate-500 mt-0.5">Paciente ou Responsável Legal</p>
            {pCpf && <p className="text-[9px] text-slate-400 mt-1 font-mono">CPF {pCpf}</p>}
          </div>
        )}

        {/* Assinatura do Dentista */}
        {shouldShowDentist && (
          <div className={`text-center ${shouldShowPatient ? 'flex-1 max-w-[240px]' : 'w-64'}`}>
            <div className="border-t border-slate-400 w-full mb-3"></div>
            <p className="font-bold text-xs text-slate-800 uppercase tracking-wide">{dName}</p>
            <p className="text-[9px] uppercase tracking-widest text-slate-500 mt-0.5">{dentistLabelOverride || dentist?.specialty || 'Cirurgião-Dentista'}</p>
          </div>
        )}
      </div>
      
      <div className="mt-12 text-center flex justify-between items-center text-[8px] text-slate-400 font-mono tracking-[0.2em] uppercase">
        <span>Gerado por OdontoAdmin © {new Date().getFullYear()}</span>
        <span>Página 1 de 1</span>
      </div>
    </div>
  );
};
