import React from 'react';
import { ShieldCheck } from 'lucide-react';

interface PrintFooterProps {
  dentistName?: string;
  cro?: string;
  date?: Date;
}

export const PrintFooter: React.FC<PrintFooterProps> = ({ dentistName = "Dr(a). Responsável", cro = "CRO XXXXX", date = new Date() }) => {
  const formattedDate = date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });

  return (
    <div className="print-only print-footer mt-16 pt-8 border-t border-zinc-200">
      <div className="flex flex-col items-center justify-center mb-8">
        <div className="w-64 border-b border-zinc-400 mb-2"></div>
        <p className="font-bold text-zinc-900">{dentistName}</p>
        <p className="text-zinc-600 text-sm">{cro}</p>
        <p className="text-zinc-500 text-sm mt-2">{formattedDate}</p>
      </div>

      <div className="mt-12 bg-zinc-50 border border-zinc-200 rounded-lg p-4 flex gap-4 items-start avoid-break">
        <div className="bg-green-100 text-green-700 p-2 rounded-lg shrink-0">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <div>
          <h4 className="font-bold text-sm text-zinc-900 mb-1">Assinatura Digital - ICP-Brasil (gov.br)</h4>
          <p className="text-xs text-zinc-600 mb-2">
            Este documento pode ser assinado digitalmente com validade jurídica em todo o território nacional, de forma gratuita, através do portal gov.br.
          </p>
          <p className="text-xs font-semibold text-zinc-800">
            Acesse: <span className="text-indigo-600 font-normal">assinador.iti.br</span> ou escaneie o documento pelo app gov.br.
          </p>
        </div>
      </div>
    </div>
  );
};
