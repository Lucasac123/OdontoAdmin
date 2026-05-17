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
    <div className="print-only avoid-break w-full mb-8">
      {/* Clinic Identity (Letterhead) */}
      <div className="flex justify-between items-end border-b-[1.5px] border-slate-800 pb-3 mb-6">
        <div>
          <h1 className="text-2xl font-serif font-bold text-slate-900 tracking-tight">{clinic.name}</h1>
          <p className="text-[9px] uppercase tracking-[0.2em] text-slate-500 mt-1">Odontologia Integrada</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-slate-600">{clinic.address}</p>
          <div className="flex justify-end gap-3 mt-0.5">
            <p className="text-[10px] text-slate-600">{clinic.phone}</p>
            <p className="text-[10px] text-slate-600">{clinic.email}</p>
          </div>
          {clinic.epao && (
            <p className="text-[9px] font-mono text-slate-500 mt-1 uppercase">EPAO {clinic.epao}</p>
          )}
        </div>
      </div>
      
      {/* Document Title Section */}
      {(title || subtitle) && (
        <div className="text-center mb-6">
          {title && (
            <h2 className="text-lg font-bold uppercase tracking-wider text-slate-900">
              {title}
            </h2>
          )}
          {subtitle && (
            <div className="inline-flex items-center gap-2 mt-1">
              <span className="h-px w-6 bg-slate-300"></span>
              <p className="text-[10px] uppercase tracking-widest text-slate-500">{subtitle}</p>
              <span className="h-px w-6 bg-slate-300"></span>
            </div>
          )}
          {via && (
            <div className="mt-2">
              <span className="inline-block px-2 py-0.5 text-[9px] font-black uppercase text-slate-900 border border-slate-900 rounded tracking-widest">
                {via}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Patient Identification Card */}
      {patientName && (
        <div className="bg-slate-50 border border-slate-200 rounded p-3 mb-8 print:bg-slate-50/50 flex flex-wrap items-center gap-x-8 gap-y-3">
          <div className="flex flex-col">
            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Paciente</span>
            <span className="text-sm font-semibold text-slate-800">{patientName}</span>
          </div>
          {patientCpf && (
            <div className="flex flex-col">
              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">CPF</span>
              <span className="text-sm text-slate-700">{patientCpf}</span>
            </div>
          )}
          {patientDob && (
            <div className="flex flex-col">
              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Data de Nascimento</span>
              <span className="text-sm text-slate-700">{patientDob}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
