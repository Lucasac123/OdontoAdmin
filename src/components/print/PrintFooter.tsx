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
    <div className="w-full mt-8 pt-6 border-t border-slate-200 print:mt-6 print:pt-4 print:page-break-inside-avoid" style={{ pageBreakInside: 'avoid', marginTop: '2rem' }} data-print-footer data-print-protect>
      <p className="text-right text-xs text-slate-600 mb-8 print:mb-6">
        {date || defaultDate}.
      </p>

      <div className={`flex items-end gap-8 ${shouldShowPatient && shouldShowDentist ? 'justify-between' : 'justify-center'} print:gap-6`}>
        
        {/* Assinatura do Paciente */}
        {shouldShowPatient && (
          <div className={`text-center ${shouldShowDentist ? 'flex-1' : 'w-1/2'} print:page-break-inside-avoid`} style={{ pageBreakInside: 'avoid' }} data-print-protect>
            <div className="border-t border-slate-800 w-full mb-2 print:mb-1"></div>
            <p className="font-bold text-sm text-slate-800 uppercase print:text-base">{pName}</p>
            <p className="text-xs text-slate-500 print:text-sm">Paciente ou Responsável Legal</p>
            {pCpf && <p className="text-[10px] text-slate-400 mt-1 print:text-xs">CPF: {pCpf}</p>}
          </div>
        )}

        {/* Assinatura do Dentista */}
        {shouldShowDentist && (
          <div className={`text-center ${shouldShowPatient ? 'flex-1' : 'w-1/2'} print:page-break-inside-avoid`} style={{ pageBreakInside: 'avoid' }} data-print-protect>
            <div className="border-t border-slate-800 w-full mb-2 print:mb-1"></div>
            <p className="font-bold text-sm text-slate-800 uppercase print:text-base">{dName}</p>
            <p className="text-xs text-slate-500 print:text-sm">{dentistLabelOverride || dentist?.specialty || 'Cirurgião-Dentista'}</p>
            <p className="text-[10px] text-slate-400 mt-1 print:text-xs">CRO {dCro}</p>
          </div>
        )}
      </div>
      
      <div className="mt-6 text-center flex justify-between items-center text-[9px] text-slate-400 font-mono tracking-widest uppercase border-t border-slate-100 pt-2 print:mt-4 print:pt-1 print:text-[8px]">
        <span>Gerado por OdontoAdmin Gestão Clínica © {new Date().getFullYear()}</span>
        <span>Página 1 de 1</span>
      </div>
    </div>
  );
};
