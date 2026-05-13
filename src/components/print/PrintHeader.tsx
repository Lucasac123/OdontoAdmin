import React from 'react';

interface ClinicInfo {
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  epao?: string;
}

interface PrintHeaderProps {
  clinic?: ClinicInfo;
  title?: string;
  subtitle?: string;
  patientName?: string;
  patientCpf?: string;
  patientDob?: string;
  via?: string;
}

export const PrintHeader: React.FC<PrintHeaderProps> = ({ 
  clinic = {
    name: 'Clínica Odontológica',
    address: 'Endereço da Clínica, S/N',
    phone: '(00) 0000-0000',
    email: 'contato@clinica.com'
  }, 
  title, 
  subtitle,
  patientName,
  patientCpf,
  patientDob,
  via
}) => {
  return (
    <div className="w-full mb-6 print:mb-4 print:page-break-inside-avoid" style={{ pageBreakInside: 'avoid' }} data-print-header data-print-protect>
      <div className="border-b-2 border-slate-800 pb-4 mb-6 flex justify-between items-start print:pb-3 print:mb-4">
        <div className="flex flex-col">
          <h1 className="text-xl font-bold text-slate-800 uppercase tracking-wider">{clinic.name}</h1>
          <p className="text-xs text-slate-600 mt-1">{clinic.address}</p>
          <div className="flex gap-4 mt-1">
            <p className="text-xs text-slate-600">{clinic.phone}</p>
            <p className="text-xs text-slate-600">{clinic.email}</p>
          </div>
        </div>
        <div className="text-right flex flex-col items-end gap-2">
          {clinic.epao && (
            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded font-medium border border-slate-200">
              {clinic.epao}
            </span>
          )}
          {via && (
            <span className="text-xs font-black uppercase text-slate-900 border border-slate-900 rounded px-2 py-1 bg-slate-50 tracking-widest">
              {via}
            </span>
          )}
        </div>
      </div>
      
      {/* Optional Title Section - some components might pass title directly */}
      {(title || subtitle) && (
        <div style={{ textAlign: 'center', padding: '12px 0', pageBreakInside: 'avoid' }} className="print:page-break-inside-avoid">
          {title && (
            <h1 className="font-sans text-lg md:text-xl font-bold uppercase tracking-wide text-slate-900 m-0 leading-tight print:text-lg">
              {title}
            </h1>
          )}
          {subtitle && (
            <div className="inline-block border-t border-slate-300 mt-2">
              <p className="font-sans text-xs text-slate-500 m-0 pt-1 tracking-widest uppercase">{subtitle}</p>
            </div>
          )}
        </div>
      )}

      {/* Patient Info Bar */}
      {patientName && (
        <div className="bg-slate-50 p-3 rounded-md mb-4 border border-slate-200 print:border-slate-300 print:bg-white print:p-2 flex flex-wrap gap-x-6 gap-y-2 print:page-break-inside-avoid print:mb-2" style={{ pageBreakInside: 'avoid' }}>
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-500 font-semibold uppercase">Paciente</span>
            <span className="text-sm font-bold text-slate-800 print:text-base">{patientName}</span>
          </div>
          {patientCpf && (
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-500 font-semibold uppercase">CPF</span>
              <span className="text-sm text-slate-700 print:text-base">{patientCpf}</span>
            </div>
          )}
          {patientDob && (
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-500 font-semibold uppercase">Data de Nasc.</span>
              <span className="text-sm text-slate-700 print:text-base">{patientDob}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
