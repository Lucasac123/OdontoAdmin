import React, { useState, useEffect } from 'react';
import { db, auth } from '../../firebase';
import { doc, onSnapshot } from 'firebase/firestore';

interface ClinicInfo {
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  epao?: string;
  type?: 'consultorio' | 'clinica';
  responsibleTechnician?: string;
}

interface PrintHeaderProps {
  clinic?: ClinicInfo;
  title?: string;
  subtitle?: string;
  patientName?: string;
  patientCpf?: string;
  patientDob?: string;
  via?: string;
}

export const PrintHeader: React.FC<PrintHeaderProps> = ({ 
  clinic: propClinic, 
  title, 
  subtitle,
  patientName,
  patientCpf,
  patientDob,
  via
}) => {
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    if (!auth.currentUser) return;
    const userRef = doc(db, 'users', auth.currentUser.uid);
    const unsub = onSnapshot(userRef, (snapshot) => {
      if (snapshot.exists()) {
        setProfile(snapshot.data());
      }
    });
    return () => unsub();
  }, []);

  const clinic = {
    name: propClinic?.name || profile?.clinicName || (profile?.type === 'clinica' ? 'Clínica Odontológica' : 'Consultório Odontológico'),
    address: propClinic?.address || profile?.address || 'Endereço da Clínica, S/N',
    phone: propClinic?.phone || profile?.phone || '(00) 0000-0000',
    email: propClinic?.email || profile?.email || 'contato@clinica.com',
    epao: propClinic?.epao || profile?.epao,
    type: profile?.type || propClinic?.type || 'consultorio',
    responsibleTechnician: profile?.responsibleTechnician
  };

  return (
    <div className="print-only avoid-break w-full mb-8">
      {/* Clinic Identity (Letterhead) */}
      <div className="flex justify-between items-end border-b-[1.5px] border-slate-800 pb-3 mb-6">
        <div>
          <h1 className="text-2xl font-serif font-bold text-slate-900 tracking-tight">{clinic.name}</h1>
          <p className="text-[9px] uppercase tracking-[0.2em] text-slate-500 mt-1">
            {clinic.type === 'clinica' ? 'Clínica Odontológica' : 'Consultório Odontológico'}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-slate-600">{clinic.address}</p>
          <div className="flex justify-end gap-3 mt-0.5">
            <p className="text-[10px] text-slate-600">{clinic.phone}</p>
            <p className="text-[10px] text-slate-600">{clinic.email}</p>
          </div>
          {clinic.type === 'clinica' && (
            <div className="text-[9px] font-mono text-slate-500 mt-1 uppercase leading-tight text-right">
              {clinic.epao && <p>EPAO nº {clinic.epao}</p>}
              {clinic.responsibleTechnician && <p>RT: {clinic.responsibleTechnician}</p>}
            </div>
          )}
        </div>
      </div>
      
      {/* Document Title Section */}
      {(title || subtitle) && (
        <div className="text-center mb-6">
          {title && (
            <h2 className="text-lg font-bold uppercase tracking-wider text-slate-900">
              {title}
            </h2>
          )}
          {subtitle && (
            <div className="inline-flex items-center gap-2 mt-1">
              <span className="h-px w-6 bg-slate-300"></span>
              <p className="text-[10px] uppercase tracking-widest text-slate-500">{subtitle}</p>
              <span className="h-px w-6 bg-slate-300"></span>
            </div>
          )}
          {via && (
            <div className="mt-2">
              <span className="inline-block px-2 py-0.5 text-[9px] font-black uppercase text-slate-900 border border-slate-900 rounded tracking-widest">
                {via}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Patient Identification Card */}
      {patientName && (
        <div className="bg-slate-50 border border-slate-200 rounded p-3 mb-8 print:bg-slate-50/50 flex flex-wrap items-center gap-x-8 gap-y-3">
          <div className="flex flex-col">
            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Paciente</span>
            <span className="text-sm font-semibold text-slate-800">{patientName}</span>
          </div>
          {patientCpf && (
            <div className="flex flex-col">
              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">CPF</span>
              <span className="text-sm text-slate-700">{patientCpf}</span>
            </div>
          )}
          {patientDob && (
            <div className="flex flex-col">
              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Data de Nascimento</span>
              <span className="text-sm text-slate-700">{patientDob}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
