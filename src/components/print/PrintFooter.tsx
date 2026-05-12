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

  return (
    <div className="print-only mt-16 pt-8 border-t border-slate-200 avoid-break w-full shrink-0">
      <p className="text-right text-xs text-slate-600 mb-12">
        {date || defaultDate}.
      </p>

      <div className={`flex items-end gap-8 ${shouldShowPatient && shouldShowDentist ? 'justify-between' : 'justify-center'}`}>
        
        {/* Assinatura do Paciente */}
        {shouldShowPatient && (
          <div className={`text-center ${shouldShowDentist ? 'flex-1' : 'w-1/2'}`}>
            <div className="border-t border-slate-800 w-full mb-2"></div>
            <p className="font-bold text-sm text-slate-800 uppercase">{pName}</p>
            <p className="text-xs text-slate-500">Paciente ou Responsável Legal</p>
            {pCpf && <p className="text-[10px] text-slate-400 mt-1">CPF: {pCpf}</p>}
          </div>
        )}

        {/* Assinatura do Dentista */}
        {shouldShowDentist && (
          <div className={`text-center ${shouldShowPatient ? 'flex-1' : 'w-1/2'}`}>
            <div className="border-t border-slate-800 w-full mb-2"></div>
            <p className="font-bold text-sm text-slate-800 uppercase">{dName}</p>
            <p className="text-xs text-slate-500">{dentistLabelOverride || dentist?.specialty || 'Cirurgião-Dentista'}</p>
            <p className="text-[10px] text-slate-400 mt-1">CRO {dCro}</p>
          </div>
        )}
      </div>
      
      <div className="mt-8 text-center flex justify-between items-center text-[9px] text-slate-400 font-mono tracking-widest uppercase border-t border-slate-100 pt-2">
        <span>Gerado por OdontoAdmin Gestão Clínica © {new Date().getFullYear()}</span>
        <span>Página 1 de 1</span>
      </div>
    </div>
  );
};
