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
    <div className="print-only avoid-break" style={{ marginBottom: '32px', position: 'relative' }}>

      {/* Internal watermark-like detail */}
      <div style={{
        position: 'absolute',
        top: '0',
        right: '0',
        width: '120px',
        height: '120px',
        background: '#f8fafc',
        borderRadius: '100%',
        zIndex: -1,
        opacity: 0.5
      }} />

      {/* Via badge (top-right) */}
      {via && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
          <span style={{
            fontSize: '8px', fontWeight: '900', textTransform: 'uppercase',
            letterSpacing: '0.2em', color: '#18181b',
            border: '1.5px solid #18181b', borderRadius: '4px',
            padding: '4px 12px', background: '#fafafa'
          }}>{via}</span>
        </div>
      )}

      {/* Clinic header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '20px', borderBottom: '2.5px solid #18181b' }}>
        {/* Logo + clinic name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
          <div style={{ background: '#18181b', padding: '10px', borderRadius: '12px' }}>
            <Logo />
          </div>
          <div style={{ width: '1.5px', height: '54px', background: '#e4e4e7' }} />
          <div>
            <p style={{ fontFamily: '"Crimson Pro", serif', fontSize: '24px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '-0.01em', color: '#18181b', margin: 0, lineHeight: 1 }}>OdontoAdmin</p>
            <p style={{ fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.18em', color: '#71717a', margin: '6px 0 0' }}>Excelência em Gestão Odontológica</p>
          </div>
        </div>

        {/* Clinic contact info */}
        <div style={{ textAlign: 'right', fontSize: '10px', color: '#18181b', lineHeight: '1.6', fontWeight: '600' }}>
          <p style={{ fontWeight: '900', fontSize: '11px', margin: '0 0 3px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Clínica Odontológica Central</p>
          <p style={{ margin: 0, color: '#52525b' }}>Rua das Flores, 1000 · Edifício Medical, Sala 502</p>
          <p style={{ margin: 0, color: '#52525b' }}>São Paulo · SP · CEP 04500-000</p>
          <p style={{ margin: 0, color: '#52525b' }}>Tel / WhatsApp: (11) 98765-4321</p>
        </div>
      </div>

      {/* Document title */}
      <div style={{ textAlign: 'center', padding: '24px 0 20px' }}>
        <h1 style={{
          fontFamily: '"Crimson Pro", serif',
          fontSize: '32px', fontWeight: '900',
          textTransform: 'uppercase', letterSpacing: '0.06em',
          color: '#18181b', margin: 0, lineHeight: 1
        }}>{title}</h1>
        {subtitle && (
          <div style={{ display: 'inline-block', borderTop: '1px solid #d4d4d8', marginTop: '8px', paddingTop: '8px' }}>
            <p style={{ fontFamily: '"Crimson Pro", serif', fontStyle: 'italic', fontSize: '14px', color: '#52525b', margin: 0 }}>{subtitle}</p>
          </div>
        )}
      </div>

      {/* Patient identification bar */}
      {patientName && (
        <div style={{
          display: 'grid', gridTemplateColumns: '2fr 1fr 1fr',
          background: '#ffffff', border: '1.5px solid #18181b', borderRadius: '4px',
          padding: '12px 20px', marginTop: '6px', gap: '20px'
        }}>
          <div>
            <p style={{ fontSize: '8px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#a1a1aa', margin: '0 0 3px' }}>Paciente</p>
            <p style={{ fontFamily: '"Crimson Pro", serif', fontSize: '18px', fontWeight: '800', color: '#18181b', textTransform: 'uppercase', margin: 0 }}>{patientName}</p>
          </div>
          <div>
            <p style={{ fontSize: '8px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#a1a1aa', margin: '0 0 3px' }}>Identificação</p>
            <p style={{ fontSize: '12px', fontWeight: '700', color: '#18181b', margin: 0 }}>
              {patientCpf ? `CPF: ${patientCpf}` : 'CPF: ————'}
            </p>
            <p style={{ fontSize: '11px', color: '#52525b', margin: '2px 0 0', fontWeight: '500' }}>
              {patientDob ? `Nasc: ${patientDob}` : 'Nasc: ————'}
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '8px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#a1a1aa', margin: '0 0 3px' }}>Emissão</p>
            <p style={{ fontSize: '13px', fontWeight: '800', color: '#18181b', margin: 0 }}>{new Date().toLocaleDateString('pt-BR')}</p>
            <p style={{ fontSize: '10px', color: '#52525b', margin: '2px 0 0', fontWeight: '500' }}>{new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
          </div>
        </div>
      )}
    </div>
  );
};
