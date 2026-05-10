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
    <div className="print-only print-footer avoid-break" style={{ marginTop: '40px', paddingTop: '10px' }}>

      {/* Local e Data */}
      {showDate && (
        <div style={{ textAlign: 'right', marginBottom: '40px' }}>
          <p style={{ fontFamily: '"Crimson Pro", serif', fontSize: '13px', color: '#18181b', fontWeight: '500' }}>
            São Paulo, {formattedDate}.
          </p>
        </div>
      )}

      {/* Signature Grid */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start', gap: '60px' }}>
        
        {/* Left: Signature lines */}
        <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '40px 80px' }}>

          {/* Patient signature */}
          {(signatureType === 'patient' || signatureType === 'both') && (
            <div style={{ textAlign: 'center', flex: '1', minWidth: '240px', maxWidth: '320px' }}>
              <div style={{ 
                height: '80px', 
                borderBottom: '1.5px solid #18181b', 
                marginBottom: '10px',
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'center',
                paddingBottom: '4px'
              }}>
                <span style={{ fontSize: '8px', color: '#d4d4d8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Assinatura</span>
              </div>
              <p style={{ fontWeight: '900', fontSize: '11px', color: '#18181b', textTransform: 'uppercase', letterSpacing: '0.04em', margin: 0 }}>{patientName}</p>
              <p style={{ fontSize: '8px', color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: '800', margin: '4px 0 0' }}>Paciente / Responsável Legal</p>
            </div>
          )}

          {/* Dentist signature */}
          {(signatureType === 'dentist' || signatureType === 'both') && (
            <div style={{ textAlign: 'center', flex: '1', minWidth: '240px', maxWidth: '320px' }}>
              <div style={{ 
                height: '80px', 
                borderBottom: '1.5px solid #18181b', 
                marginBottom: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1.5px dashed #d4d4d8',
                borderRadius: '8px',
                borderBottomStyle: 'solid',
                borderBottomColor: '#18181b'
              }}>
                <div style={{ 
                  width: '60px', 
                  height: '60px', 
                  border: '1px solid #e4e4e7', 
                  borderRadius: '50%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  fontSize: '7px',
                  color: '#a1a1aa',
                  fontWeight: '800',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em'
                }}>Carimbo</div>
              </div>
              <p style={{ fontWeight: '900', fontSize: '11px', color: '#18181b', textTransform: 'uppercase', letterSpacing: '0.04em', margin: 0 }}>{dentistName}</p>
              <p style={{ fontSize: '8px', color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: '800', margin: '4px 0 0' }}>{cro} · Cirurgião-Dentista</p>
            </div>
          )}
        </div>
      </div>

      {/* Footer bar */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginTop: '60px', 
        paddingTop: '8px', 
        borderTop: '0.5px solid #d4d4d8' 
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#18181b' }} />
          <span style={{ fontSize: '7px', color: '#a1a1aa', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.1em' }}>OdontoAdmin Gestão Clínica 2026</span>
        </div>
        <span style={{ fontSize: '7px', color: '#a1a1aa', fontWeight: '600' }}>Página 1 de 1</span>
      </div>
    </div>
  );
};
