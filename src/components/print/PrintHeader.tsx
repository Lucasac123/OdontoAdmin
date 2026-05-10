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
    <div className="print-only avoid-break" style={{ marginBottom: '32px' }}>

      {/* Via badge (top-right) */}
      {via && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '6px' }}>
          <span style={{
            fontSize: '9px', fontWeight: '800', textTransform: 'uppercase',
            letterSpacing: '0.15em', color: '#71717a',
            border: '1px solid #d4d4d8', borderRadius: '9999px',
            padding: '3px 10px'
          }}>{via}</span>
        </div>
      )}

      {/* Clinic header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: '16px', borderBottom: '3px solid #18181b' }}>
        {/* Logo + clinic name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <Logo />
          <div style={{ width: '1px', height: '44px', background: '#d4d4d8' }} />
          <div>
            <p style={{ fontFamily: '"Crimson Pro", serif', fontSize: '18px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '-0.02em', color: '#18181b', margin: 0, lineHeight: 1 }}>OdontoAdmin</p>
            <p style={{ fontSize: '9px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.15em', color: '#71717a', margin: '3px 0 0' }}>Clínica Odontológica · Sistema de Gestão</p>
          </div>
        </div>

        {/* Clinic contact info */}
        <div style={{ textAlign: 'right', fontSize: '10px', color: '#52525b', lineHeight: '1.6', fontWeight: '500' }}>
          <p style={{ fontWeight: '700', color: '#18181b', fontSize: '11px', margin: '0 0 2px' }}>Clínica Odontológica</p>
          <p style={{ margin: 0 }}>Rua Exemplo, 123 – Centro</p>
          <p style={{ margin: 0 }}>São Paulo, SP – CEP 01000-000</p>
          <p style={{ margin: 0 }}>Tel: (11) 99999-9999</p>
        </div>
      </div>

      {/* Document title */}
      <div style={{ textAlign: 'center', padding: '20px 0 16px' }}>
        <h1 style={{
          fontFamily: '"Crimson Pro", serif',
          fontSize: '26px', fontWeight: '900',
          textTransform: 'uppercase', letterSpacing: '0.04em',
          color: '#18181b', margin: 0, lineHeight: 1.1
        }}>{title}</h1>
        {subtitle && (
          <p style={{ fontFamily: '"Crimson Pro", serif', fontStyle: 'italic', fontSize: '13px', color: '#71717a', margin: '6px 0 0' }}>{subtitle}</p>
        )}
      </div>

      {/* Patient identification bar */}
      {patientName && (
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
          background: '#fafafa', border: '1px solid #e4e4e7', borderRadius: '10px',
          padding: '10px 16px', marginTop: '4px'
        }}>
          <div>
            <p style={{ fontSize: '8px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.15em', color: '#a1a1aa', margin: '0 0 2px' }}>Paciente</p>
            <p style={{ fontFamily: '"Crimson Pro", serif', fontSize: '16px', fontWeight: '700', color: '#18181b', textTransform: 'uppercase', margin: 0 }}>{patientName}</p>
            {(patientCpf || patientDob) && (
              <p style={{ fontSize: '10px', color: '#71717a', margin: '2px 0 0', fontWeight: '500' }}>
                {patientCpf && <>CPF: {patientCpf}</>}
                {patientCpf && patientDob && <span style={{ margin: '0 8px', color: '#d4d4d8' }}>|</span>}
                {patientDob && <>Data de Nasc.: {patientDob}</>}
              </p>
            )}
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '8px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.15em', color: '#a1a1aa', margin: '0 0 2px' }}>Data de Emissão</p>
            <p style={{ fontSize: '12px', fontWeight: '700', color: '#18181b', margin: 0 }}>{new Date().toLocaleDateString('pt-BR')}</p>
          </div>
        </div>
      )}
    </div>
  );
};
