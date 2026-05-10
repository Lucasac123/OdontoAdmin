import React from 'react';

interface PrintFooterProps {
  dentistName?: string;
  cro?: string;
  date?: Date;
  signatureType?: 'dentist' | 'patient' | 'both';
  patientName?: string;
  showDate?: boolean;
}

export const PrintFooter: React.FC<PrintFooterProps> = ({ 
  dentistName = "Dr(a). Responsável", 
  cro = "CRO XXXXX", 
  date = new Date(),
  signatureType = 'dentist',
  patientName = "Paciente",
  showDate = true
}) => {
  const formattedDate = date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });

  const govBrUrl = "https://assinador.iti.br/";
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(govBrUrl)}`;

  return (
    <div className="print-only print-footer avoid-break" style={{ marginTop: '40px', paddingTop: '32px', borderTop: '2px solid #e4e4e7' }}>

      {/* Local e Data */}
      {showDate && (
        <p className="font-serif text-sm text-zinc-600 mb-10" style={{ fontSize: '12px' }}>
          {/* Location placeholder – filled by dentist */}
          ________________________________, {formattedDate}.
        </p>
      )}

      {/* Signature Grid */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '32px' }}>
        
        {/* Left: Signature lines */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: signatureType === 'both' ? '40px' : '0' }}>

          {/* Patient signature */}
          {signatureType === 'both' && (
            <div style={{ textAlign: 'center' }}>
              {/* blank space for manual signature */}
              <div style={{ height: '72px', borderBottom: '2px solid #18181b', marginBottom: '6px' }} />
              <p style={{ fontWeight: '700', fontSize: '11px', color: '#18181b', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>{patientName}</p>
              <p style={{ fontSize: '9px', color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: '600', margin: '2px 0 0' }}>Assinatura do Paciente / Responsável Legal</p>
            </div>
          )}

          {/* Dentist signature */}
          {(signatureType === 'dentist' || signatureType === 'both') && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ height: '72px', borderBottom: '2px solid #18181b', marginBottom: '6px' }} />
              <p style={{ fontWeight: '700', fontSize: '11px', color: '#18181b', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>{dentistName}</p>
              <p style={{ fontSize: '9px', color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: '600', margin: '2px 0 0' }}>{cro} · Cirurgião-Dentista</p>
            </div>
          )}

          {/* Patient-only */}
          {signatureType === 'patient' && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ height: '72px', borderBottom: '2px solid #18181b', marginBottom: '6px' }} />
              <p style={{ fontWeight: '700', fontSize: '11px', color: '#18181b', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>{patientName}</p>
              <p style={{ fontSize: '9px', color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: '600', margin: '2px 0 0' }}>Assinatura do Paciente / Responsável Legal</p>
            </div>
          )}
        </div>

        {/* Right: QR Code digital signature */}
        <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', padding: '10px', border: '1px solid #e4e4e7', borderRadius: '10px', background: '#fafafa' }}>
          <img 
            src={qrCodeUrl} 
            alt="QR Assinatura Digital gov.br" 
            style={{ width: '72px', height: '72px' }}
          />
          <p style={{ fontSize: '7px', fontWeight: '800', color: '#18181b', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0, textAlign: 'center' }}>Assine Digitalmente</p>
          <p style={{ fontSize: '7px', color: '#71717a', fontWeight: '600', margin: 0 }}>Portal gov.br · ICP-Brasil</p>
        </div>
      </div>

      {/* Footer bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', paddingTop: '8px', borderTop: '1px solid #f4f4f5' }}>
        <span style={{ fontSize: '8px', color: '#a1a1aa', fontWeight: '500' }}>Documento oficial – OdontoAdmin · Sistema de Gestão Clínica</span>
        <span style={{ fontSize: '8px', color: '#a1a1aa', fontWeight: '500' }}>{formattedDate}</span>
      </div>
    </div>
  );
};
