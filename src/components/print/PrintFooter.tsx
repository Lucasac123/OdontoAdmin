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

  return (
    <div className="print-only print-footer avoid-break" style={{ marginTop: '30px', paddingTop: '20px', borderTop: '2px solid #18181b' }}>

      {/* Local e Data */}
      {showDate && (
        <p className="font-serif text-sm text-zinc-600 mb-6" style={{ fontSize: '11px' }}>
          ________________________________, {formattedDate}.
        </p>
      )}

      {/* Signature Grid */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: '40px' }}>
        
        {/* Left: Signature lines */}
        <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '30px 60px' }}>

          {/* Patient signature */}
          {(signatureType === 'patient' || signatureType === 'both') && (
            <div style={{ textAlign: 'center', minWidth: '220px' }}>
              <div style={{ height: '60px', borderBottom: '1.5px solid #18181b', marginBottom: '6px' }} />
              <p style={{ fontWeight: '700', fontSize: '10px', color: '#18181b', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>{patientName}</p>
              <p style={{ fontSize: '8px', color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: '600', margin: '2px 0 0' }}>Assinatura do Paciente / Responsável Legal</p>
            </div>
          )}

          {/* Dentist signature */}
          {(signatureType === 'dentist' || signatureType === 'both') && (
            <div style={{ textAlign: 'center', minWidth: '220px' }}>
              <div style={{ height: '60px', borderBottom: '1.5px solid #18181b', marginBottom: '6px' }} />
              <p style={{ fontWeight: '700', fontSize: '10px', color: '#18181b', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>{dentistName}</p>
              <p style={{ fontSize: '8px', color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: '600', margin: '2px 0 0' }}>{cro} · Cirurgião-Dentista</p>
            </div>
          )}
        </div>
      </div>

      {/* Footer bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', paddingTop: '6px', borderTop: '1px solid #e4e4e7' }}>
        <span style={{ fontSize: '7px', color: '#a1a1aa', fontWeight: '500' }}>Documento oficial – OdontoAdmin · Sistema de Gestão Clínica</span>
        <span style={{ fontSize: '7px', color: '#a1a1aa', fontWeight: '500' }}>{formattedDate}</span>
      </div>
    </div>
  );
};
