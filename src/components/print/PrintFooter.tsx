import React from 'react';
import { ShieldCheck } from 'lucide-react';

interface PrintFooterProps {
  dentistName?: string;
  cro?: string;
  date?: Date;
  signatureType?: 'dentist' | 'patient' | 'both';
  patientName?: string;
}

export const PrintFooter: React.FC<PrintFooterProps> = ({ 
  dentistName = "Dr(a). Responsável", 
  cro = "CRO XXXXX", 
  date = new Date(),
  signatureType = 'dentist',
  patientName = "Paciente"
}) => {
  const formattedDate = date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });

  const govBrUrl = "https://assinador.iti.br/";
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(govBrUrl)}`;

  return (
    <div className="print-only print-footer mt-16 pt-8 border-t border-zinc-200">
      {/* Signature Section */}
      <div className="flex justify-between items-end gap-8 mb-12">
        <div className="flex-1 flex flex-col gap-12">
          {signatureType === 'both' && (
            <div className="text-center">
              <div className="border-b border-zinc-400 w-full mb-2"></div>
              <p className="font-bold text-zinc-900 text-sm">{patientName}</p>
              <p className="text-zinc-600 text-[10px] uppercase tracking-wider font-medium">Assinatura do Paciente / Responsável</p>
            </div>
          )}
          
          <div className="text-center">
            <div className="border-b border-zinc-400 w-full mb-2"></div>
            <p className="font-bold text-zinc-900 text-sm">{dentistName}</p>
            <p className="text-zinc-600 text-[10px] uppercase tracking-wider font-medium">{cro} - Cirurgião-Dentista</p>
          </div>
        </div>

        {/* QR Code Section */}
        <div className="shrink-0 flex flex-col items-center gap-2 p-3 bg-zinc-50 border border-zinc-200 rounded-xl">
          <img 
            src={qrCodeUrl} 
            alt="QR Code Assinatura Digital" 
            className="w-24 h-24"
          />
          <div className="text-center">
            <p className="text-[9px] font-black text-zinc-900 uppercase tracking-tighter leading-none">Assine Digitalmente</p>
            <p className="text-[8px] text-zinc-500 font-medium">Portal gov.br</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between text-[10px] text-zinc-400 font-medium">
        <span>Documento oficial gerado via OdontoAdmin</span>
        <span>{formattedDate}</span>
      </div>

      <div className="mt-6 bg-zinc-50 border border-zinc-200 rounded-lg p-4 flex gap-4 items-start avoid-break">
        <div className="bg-green-100 text-green-700 p-2 rounded-lg shrink-0">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div>
          <h4 className="font-bold text-xs text-zinc-900 mb-0.5 uppercase tracking-wide">Validade Jurídica (ICP-Brasil)</h4>
          <p className="text-[10px] text-zinc-600 leading-relaxed">
            Este documento possui validade jurídica em todo o território nacional quando assinado digitalmente pelo portal <strong>gov.br</strong>. Aponte a câmera do seu celular para o QR Code acima para acessar o assinador oficial gratuito.
          </p>
        </div>
      </div>
    </div>
  );
};
