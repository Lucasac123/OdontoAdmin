import React from 'react';
import { Logo } from '../Logo';

interface PrintHeaderProps {
  title: string;
  subtitle?: string;
  patientName?: string;
}

export const PrintHeader: React.FC<PrintHeaderProps> = ({ title, subtitle, patientName }) => {
  return (
    <div className="print-only mb-10 border-b-4 border-zinc-900 pb-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Logo />
          <div className="h-12 w-[1px] bg-zinc-300"></div>
          <div className="text-zinc-900">
            <p className="font-serif text-lg font-black tracking-tighter uppercase leading-none">OdontoAdmin</p>
            <p className="text-[10px] uppercase font-bold tracking-widest text-zinc-500">Clinical Management System</p>
          </div>
        </div>
        <div className="text-right text-[11px] text-zinc-600 font-medium leading-tight">
          <p className="font-bold text-zinc-900 uppercase mb-0.5">Clínica Odontológica</p>
          <p>Rua Exemplo, 123 - Centro</p>
          <p>São Paulo, SP - CEP 01000-000</p>
          <p>Telefone: (11) 99999-9999</p>
        </div>
      </div>
      <div className="text-center mt-10">
        <h1 className="text-3xl font-serif font-black uppercase tracking-tight text-zinc-900 mb-1">{title}</h1>
        {subtitle && <p className="text-zinc-500 italic font-serif text-sm">{subtitle}</p>}
      </div>
      {patientName && (
        <div className="mt-8 pt-4 border-t border-zinc-100 flex justify-between items-end">
          <div className="text-sm">
            <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest block mb-0.5">Paciente / Identificação</span>
            <span className="font-serif text-lg font-bold text-zinc-900 uppercase tracking-tight">{patientName}</span>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest block mb-0.5">Data de Emissão</span>
            <span className="text-sm font-medium text-zinc-700">{new Date().toLocaleDateString('pt-BR')}</span>
          </div>
        </div>
      )}
    </div>
  );
};
