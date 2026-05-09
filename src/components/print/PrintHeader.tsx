import React from 'react';
import { Logo } from '../Logo';

interface PrintHeaderProps {
  title: string;
  subtitle?: string;
  patientName?: string;
}

export const PrintHeader: React.FC<PrintHeaderProps> = ({ title, subtitle, patientName }) => {
  return (
    <div className="print-only mb-8 border-b-2 border-zinc-200 pb-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <Logo />
        </div>
        <div className="text-right text-sm text-zinc-600">
          <p className="font-semibold text-zinc-900">Clínica Odontológica</p>
          <p>Rua Exemplo, 123 - Centro</p>
          <p>Telefone: (11) 99999-9999</p>
        </div>
      </div>
      <div className="text-center mt-6">
        <h1 className="text-2xl font-bold uppercase tracking-wider text-zinc-900">{title}</h1>
        {subtitle && <p className="text-zinc-600 mt-1">{subtitle}</p>}
      </div>
      {patientName && (
        <div className="mt-6 text-sm">
          <p><span className="font-semibold">Paciente:</span> {patientName}</p>
        </div>
      )}
    </div>
  );
};
