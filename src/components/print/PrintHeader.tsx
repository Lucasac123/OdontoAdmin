import React from 'react';
import { Logo } from '../Logo';

interface PrintHeaderProps {
  title: string;
  subtitle?: string;
  patientName?: string;
  patientCpf?: string;
  patientDob?: string;
  via?: string;   // e.g. "1ª Via – Farmácia"
}

export const PrintHeader: React.FC<PrintHeaderProps> = ({ title, subtitle, patientName, patientCpf, patientDob, via }) => {
  return (
    <div className="print-only avoid-break" style={{ marginBottom: '24px', position: 'relative' }}>

      {/* Via badge (top-right) */}
      {via && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
          <span style={{
            fontSize: '7px', fontWeight: '900', textTransform: 'uppercase',
            letterSpacing: '0.2em', color: '#18181b',
            border: '1px solid #18181b', borderRadius: '4px',
            padding: '2px 8px', background: '#fafafa'
          }}>{via}</span>
        </div>
      )}

      {/* Clinic header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '16px', borderBottom: '1.5px solid #18181b' }}>
        <div></div>

        {/* Clinic contact info */}
        <div style={{ textAlign: 'right', fontSize: '9px', color: '#18181b', lineHeight: '1.4', fontWeight: '600' }}>
          <p style={{ margin: 0, color: '#52525b' }}>Endereço do consultório vai aqui</p>
          <p style={{ margin: 0, color: '#52525b' }}>Cidade · SP · CEP 00000-000</p>
        </div>
      </div>

      {/* Document title */}
      <div style={{ textAlign: 'center', padding: '16px 0 16px' }}>
        <h1 style={{
          fontFamily: 'sans-serif',
          fontSize: '24px', fontWeight: '800',
          textTransform: 'uppercase', letterSpacing: '0.04em',
          color: '#18181b', margin: 0, lineHeight: 1
        }}>{title}</h1>
        {subtitle && (
          <div style={{ display: 'inline-block', borderTop: '0.5px solid #d4d4d8', marginTop: '6px', paddingTop: '6px' }}>
            <p style={{ fontFamily: 'sans-serif', fontSize: '12px', color: '#52525b', margin: 0 }}>{subtitle}</p>
          </div>
        )}
      </div>

      {/* Patient identification bar */}
      {patientName && (
        <div style={{
          display: 'grid', gridTemplateColumns: '2fr 1fr 1fr',
          background: '#ffffff', border: '1px solid #18181b', borderRadius: '3px',
          padding: '8px 16px', marginTop: '4px', gap: '16px'
        }}>
          <div>
            <p style={{ fontSize: '7px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#a1a1aa', margin: '0 0 2px' }}>Paciente</p>
            <p style={{ fontFamily: 'sans-serif', fontSize: '14px', fontWeight: '700', color: '#18181b', textTransform: 'uppercase', margin: 0 }}>{patientName}</p>
          </div>
          <div>
            <p style={{ fontSize: '7px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#a1a1aa', margin: '0 0 2px' }}>Identificação</p>
            <p style={{ fontSize: '10px', fontWeight: '700', color: '#18181b', margin: 0 }}>
              {patientCpf ? `CPF: ${patientCpf}` : 'CPF: ————'}
            </p>
            <p style={{ fontSize: '9px', color: '#52525b', margin: '1px 0 0', fontWeight: '500' }}>
              {patientDob ? `Nasc: ${patientDob}` : 'Nasc: ————'}
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '7px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#a1a1aa', margin: '0 0 2px' }}>Emissão</p>
            <p style={{ fontSize: '11px', fontWeight: '700', color: '#18181b', margin: 0 }}>{new Date().toLocaleDateString('pt-BR')}</p>
            <p style={{ fontSize: '9px', color: '#52525b', margin: '1px 0 0', fontWeight: '500' }}>{new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
          </div>
        </div>
      )}
    </div>
  );
};
