import React, { useState, useEffect } from 'react';
import { doc, updateDoc, collection, query, where, onSnapshot } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../../firebase';
import { Patient, Dentist } from '../../types';
import { Save, Loader2, User, Mail, Briefcase, CreditCard, MapPin, Phone, Calendar, Users, Stethoscope, MessageCircle, UserCircle } from 'lucide-react';
import { useSync } from '../../context/SyncContext';

export const PersonalInfoTab: React.FC<{ patient: Patient }> = ({ patient }) => {
  const [isSaving, setIsSaving] = useState(false);
  const { addSyncTask } = useSync();
  const [dentists, setDentists] = useState<Dentist[]>([]);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [cpfError, setCpfError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: patient.name || '',
    email: patient.email || '',
    phone: patient.phone || '',
    dob: patient.dob || '',
    profession: patient.profession || '',
    maritalStatus: patient.maritalStatus || '',
    cpf: patient.cpf || '',
    rg: patient.rg || '',
    issuingBody: patient.issuingBody || '',
    legalRepresentative: patient.legalRepresentative || '',
    address: patient.address || '',
    city: patient.city || '',
    state: patient.state || '',
    zipCode: patient.zipCode || '',
    source: patient.source || '',
    status: patient.status || 'Ativo',
    responsibleDentistId: patient.responsibleDentistId || '',
    sex: patient.sex || '',
    nationality: patient.nationality || '',
    placeOfBirth: patient.placeOfBirth || '',
    legalRepDetails: patient.legalRepDetails || JSON.stringify({ name: '', relation: '', cpf: '', rg: '', issuingBody: '', maritalStatus: '' }),
    spouseDetails: patient.spouseDetails || JSON.stringify({ name: '', cpf: '', rg: '', issuingBody: '' }),
    referenceDoctor: patient.referenceDoctor || JSON.stringify({ name: '', phone: '' }),
    previousDentist: patient.previousDentist || JSON.stringify({ name: '', date: '' }),
    appointmentPreference: patient.appointmentPreference || JSON.stringify({ date: '', period: '' }),
  });

  const [legalRep, setLegalRep] = useState(JSON.parse(patient.legalRepDetails || '{"name":"","relation":"","cpf":"","rg":"","issuingBody":"","maritalStatus":""}'));
  const [spouse, setSpouse] = useState(JSON.parse(patient.spouseDetails || '{"name":"","cpf":"","rg":"","issuingBody":""}'));
  const [refDoctor, setRefDoctor] = useState(JSON.parse(patient.referenceDoctor || '{"name":"","phone":""}'));
  const [prevDentist, setPrevDentist] = useState(JSON.parse(patient.previousDentist || '{"name":"","date":""}'));
  const [apptPref, setApptPref] = useState(JSON.parse(patient.appointmentPreference || '{"date":"","period":""}'));

  useEffect(() => {
    if (!auth.currentUser) return;

    const qDentists = query(
      collection(db, 'dentists'),
      where('dentistId', '==', auth.currentUser.uid)
    );
    const unsubscribeDentists = onSnapshot(qDentists, (snapshot) => {
      const dentistsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Dentist[];
      setDentists(dentistsData);
    });

    return () => unsubscribeDentists();
  }, []);

  const formatCPF = (value: string) => {
    const digits = value.replace(/\D/g, '');
    return digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    let finalValue = value;
    if (name === 'cpf') {
      finalValue = formatCPF(value);
    }

    setFormData(prev => ({ ...prev, [name]: finalValue }));
    
    if (name === 'email' && emailError) {
      setEmailError(null);
    }
    if (name === 'cpf' && cpfError) {
      setCpfError(null);
    }
  };

  const validateEmail = (email: string) => {
    if (!email) return true; // Email is optional
    const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return re.test(email);
  };

  const validateCPF = (cpf: string) => {
    if (!cpf) return true; // Optional field
    
    const digits = cpf.replace(/\D/g, '');
    
    if (digits.length !== 11) return false;
    
    // Check for known invalid CPFs
    if (/^(\d)\1{10}$/.test(digits)) return false;
    
    // Validation logic
    let sum = 0;
    let remainder;
    
    for (let i = 1; i <= 9; i++) sum = sum + parseInt(digits.substring(i - 1, i)) * (11 - i);
    remainder = (sum * 10) % 11;
    if ((remainder === 10) || (remainder === 11)) remainder = 0;
    if (remainder !== parseInt(digits.substring(9, 10))) return false;
    
    sum = 0;
    for (let i = 1; i <= 10; i++) sum = sum + parseInt(digits.substring(i - 1, i)) * (12 - i);
    remainder = (sum * 10) % 11;
    if ((remainder === 10) || (remainder === 11)) remainder = 0;
    if (remainder !== parseInt(digits.substring(10, 11))) return false;
    
    return true;
  };

  const handleSave = async () => {
    let hasError = false;

    if (!validateEmail(formData.email)) {
      setEmailError('Por favor, insira um e-mail válido.');
      hasError = true;
    }

    if (!validateCPF(formData.cpf)) {
      setCpfError('Por favor, insira um CPF válido no formato 000.000.000-00.');
      hasError = true;
    }

    if (hasError) return;

    const savePromise = updateDoc(doc(db, 'patients', patient.id), {
      ...formData,
      legalRepDetails: JSON.stringify(legalRep),
      spouseDetails: JSON.stringify(spouse),
      referenceDoctor: JSON.stringify(refDoctor),
      previousDentist: JSON.stringify(prevDentist),
      appointmentPreference: JSON.stringify(apptPref),
      updatedAt: new Date().toISOString()
    }).catch(error => {
      handleFirestoreError(error, OperationType.UPDATE, `patients/${patient.id}`);
    });

    addSyncTask(savePromise);
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-text-primary">Dados Pessoais</h2>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-sm shadow-indigo-200 dark:shadow-none"
        >
          <Save className="w-4 h-4" />
          <span className="truncate">Salvar Alterações</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Basic Info */}
        <div className="md:col-span-2 lg:col-span-3 space-y-4">
          <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider flex items-center gap-2">
            <User className="w-4 h-4" /> Informações Básicas
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-3">
              <label className="block text-sm font-medium text-text-secondary mb-1">Nome Completo</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full bg-surface border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 text-text-primary focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Data de Nascimento</label>
              <input
                type="date"
                name="dob"
                value={formData.dob}
                onChange={handleChange}
                className="w-full bg-surface border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 text-text-primary focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Estado Civil</label>
              <select
                name="maritalStatus"
                value={formData.maritalStatus}
                onChange={handleChange}
                className="w-full bg-surface border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 text-text-primary focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="">Selecione...</option>
                <option value="Solteiro(a)">Solteiro(a)</option>
                <option value="Casado(a)">Casado(a)</option>
                <option value="Divorciado(a)">Divorciado(a)</option>
                <option value="Viúvo(a)">Viúvo(a)</option>
                <option value="União Estável">União Estável</option>
              </select>
            </div>
            <div className="hidden md:block"></div>
            
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Sexo</label>
              <select
                name="sex"
                value={formData.sex}
                onChange={handleChange}
                className="w-full bg-surface border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 text-text-primary focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="">Selecione...</option>
                <option value="Masculino">Masculino</option>
                <option value="Feminino">Feminino</option>
                <option value="Outro">Outro</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Naturalidade</label>
              <input
                type="text"
                name="placeOfBirth"
                value={formData.placeOfBirth}
                onChange={handleChange}
                className="w-full bg-surface border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 text-text-primary focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Nacionalidade</label>
              <input
                type="text"
                name="nationality"
                value={formData.nationality}
                onChange={handleChange}
                className="w-full bg-surface border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 text-text-primary focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Procedência</label>
              <input
                type="text"
                name="source"
                value={formData.source}
                onChange={handleChange}
                placeholder="Ex: Indicação, Publicidade"
                className="w-full bg-surface border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 text-text-primary focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Status do Paciente</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full bg-surface border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 text-text-primary focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="Ativo">Ativo</option>
                <option value="Inativo">Inativo</option>
                <option value="Em Tratamento">Em Tratamento</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Dentista Responsável</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <UserCircle className="h-5 w-5 text-zinc-400" />
                </div>
                <select
                  name="responsibleDentistId"
                  value={formData.responsibleDentistId}
                  onChange={handleChange}
                  className="w-full bg-surface border border-zinc-200 dark:border-zinc-800 rounded-xl pl-10 pr-4 py-2 text-text-primary focus:ring-2 focus:ring-indigo-500 outline-none appearance-none"
                >
                  <option value="">Sem filiação a dentista específico</option>
                  {dentists.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Contact & Profession */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider flex items-center gap-2">
            <Mail className="w-4 h-4" /> Contato e Profissão
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">E-mail</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={`w-full bg-surface border ${emailError ? 'border-red-500 focus:ring-red-500' : 'border-zinc-200 dark:border-zinc-800 focus:ring-indigo-500'} rounded-xl px-4 py-2 text-text-primary focus:ring-2 outline-none transition-all`}
              />
              {emailError && <p className="mt-1 text-xs text-red-500">{emailError}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Telefone</label>
              <div className="flex gap-2">
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="(00) 00000-0000"
                  className="flex-1 bg-surface border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 text-text-primary focus:ring-2 focus:ring-indigo-500 outline-none"
                />
                {formData.phone && (
                  <a
                    href={`https://wa.me/55${formData.phone.replace(/\D/g, '')}?text=Olá%20${encodeURIComponent(formData.name.split(' ')[0])},%20tudo%20bem?`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center px-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl transition-colors"
                    title="Enviar mensagem no WhatsApp"
                  >
                    <MessageCircle className="w-5 h-5" />
                  </a>
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Profissão</label>
              <input
                type="text"
                name="profession"
                value={formData.profession}
                onChange={handleChange}
                className="w-full bg-surface border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 text-text-primary focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Documents */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider flex items-center gap-2">
            <CreditCard className="w-4 h-4" /> Documentação
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">CPF</label>
              <input
                type="text"
                name="cpf"
                value={formData.cpf}
                onChange={handleChange}
                placeholder="000.000.000-00"
                maxLength={14}
                className={`w-full bg-surface border ${cpfError ? 'border-red-500 focus:ring-red-500' : 'border-zinc-200 dark:border-zinc-800 focus:ring-indigo-500'} rounded-xl px-4 py-2 text-text-primary focus:ring-2 outline-none transition-all`}
              />
              {cpfError && <p className="mt-1 text-xs text-red-500">{cpfError}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">RG</label>
                <input
                  type="text"
                  name="rg"
                  value={formData.rg}
                  onChange={handleChange}
                  className="w-full bg-surface border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 text-text-primary focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Órgão Exp.</label>
                <input
                  type="text"
                  name="issuingBody"
                  value={formData.issuingBody}
                  onChange={handleChange}
                  placeholder="SSP/UF"
                  className="w-full bg-surface border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 text-text-primary focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Responsável Legal (se houver)</label>
              <input
                type="text"
                name="legalRepresentative"
                value={formData.legalRepresentative}
                onChange={handleChange}
                className="w-full bg-surface border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 text-text-primary focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Address */}
        <div className="md:col-span-2 lg:col-span-3 space-y-4">
          <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider flex items-center gap-2">
            <MapPin className="w-4 h-4" /> Endereço
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-text-secondary mb-1">Rua, Número e Complemento</label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
                className="w-full bg-surface border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 text-text-primary focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Cidade</label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
                className="w-full bg-surface border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 text-text-primary focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Estado</label>
                <input
                  type="text"
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  maxLength={2}
                  placeholder="UF"
                  className="w-full bg-surface border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 text-text-primary focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">CEP</label>
                <input
                  type="text"
                  name="zipCode"
                  value={formData.zipCode}
                  onChange={handleChange}
                  placeholder="00000-000"
                  className="w-full bg-surface border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 text-text-primary focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Additional Details Sections */}
        <div className="md:col-span-2 lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-zinc-100 dark:border-zinc-800">
          {/* Legal Representative */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider flex items-center gap-2">
              <Users className="w-4 h-4" /> Responsável Legal
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-text-secondary mb-1">Nome do Responsável</label>
                <input
                  type="text"
                  value={legalRep.name}
                  onChange={(e) => setLegalRep({ ...legalRep, name: e.target.value })}
                  className="w-full bg-surface border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 text-text-primary focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Parentesco</label>
                <input
                  type="text"
                  value={legalRep.relation}
                  onChange={(e) => setLegalRep({ ...legalRep, relation: e.target.value })}
                  className="w-full bg-surface border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 text-text-primary focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">CPF</label>
                <input
                  type="text"
                  value={legalRep.cpf}
                  onChange={(e) => setLegalRep({ ...legalRep, cpf: formatCPF(e.target.value) })}
                  className="w-full bg-surface border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 text-text-primary focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">RG</label>
                <input
                  type="text"
                  value={legalRep.rg}
                  onChange={(e) => setLegalRep({ ...legalRep, rg: e.target.value })}
                  className="w-full bg-surface border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 text-text-primary focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Órgão Exp.</label>
                <input
                  type="text"
                  value={legalRep.issuingBody}
                  onChange={(e) => setLegalRep({ ...legalRep, issuingBody: e.target.value })}
                  className="w-full bg-surface border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 text-text-primary focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Estado Civil</label>
                <select
                  value={legalRep.maritalStatus}
                  onChange={(e) => setLegalRep({ ...legalRep, maritalStatus: e.target.value })}
                  className="w-full bg-surface border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 text-text-primary focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="">Selecione...</option>
                  <option value="Solteiro(a)">Solteiro(a)</option>
                  <option value="Casado(a)">Casado(a)</option>
                  <option value="Divorciado(a)">Divorciado(a)</option>
                  <option value="Viúvo(a)">Viúvo(a)</option>
                  <option value="União Estável">União Estável</option>
                </select>
              </div>
            </div>
          </div>

          {/* Spouse Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider flex items-center gap-2">
              <Users className="w-4 h-4" /> Dados do Cônjuge
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-text-secondary mb-1">Nome do Cônjuge</label>
                <input
                  type="text"
                  value={spouse.name}
                  onChange={(e) => setSpouse({ ...spouse, name: e.target.value })}
                  className="w-full bg-surface border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 text-text-primary focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">CPF</label>
                <input
                  type="text"
                  value={spouse.cpf}
                  onChange={(e) => setSpouse({ ...spouse, cpf: formatCPF(e.target.value) })}
                  className="w-full bg-surface border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 text-text-primary focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">RG</label>
                <input
                  type="text"
                  value={spouse.rg}
                  onChange={(e) => setSpouse({ ...spouse, rg: e.target.value })}
                  className="w-full bg-surface border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 text-text-primary focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Órgão Exp.</label>
                <input
                  type="text"
                  value={spouse.issuingBody}
                  onChange={(e) => setSpouse({ ...spouse, issuingBody: e.target.value })}
                  className="w-full bg-surface border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 text-text-primary focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Reference Doctor & Previous Dentist */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider flex items-center gap-2">
              <Stethoscope className="w-4 h-4" /> Referências
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-text-secondary mb-1">Médico de Referência</label>
                <input
                  type="text"
                  value={refDoctor.name}
                  onChange={(e) => setRefDoctor({ ...refDoctor, name: e.target.value })}
                  placeholder="Nome do médico"
                  className="w-full bg-surface border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 text-text-primary focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Telefone do Médico</label>
                <input
                  type="tel"
                  value={refDoctor.phone}
                  onChange={(e) => setRefDoctor({ ...refDoctor, phone: e.target.value })}
                  className="w-full bg-surface border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 text-text-primary focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div className="col-span-2 pt-2">
                <label className="block text-sm font-medium text-text-secondary mb-1">Dentista Anterior</label>
                <input
                  type="text"
                  value={prevDentist.name}
                  onChange={(e) => setPrevDentist({ ...prevDentist, name: e.target.value })}
                  placeholder="Nome do dentista anterior"
                  className="w-full bg-surface border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 text-text-primary focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Appointment Preference */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider flex items-center gap-2">
              <Calendar className="w-4 h-4" /> Preferência de Agendamento
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Dia da Semana</label>
                <select
                  value={apptPref.date}
                  onChange={(e) => setApptPref({ ...apptPref, date: e.target.value })}
                  className="w-full bg-surface border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 text-text-primary focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="">Selecione...</option>
                  <option value="Segunda">Segunda-feira</option>
                  <option value="Terça">Terça-feira</option>
                  <option value="Quarta">Quarta-feira</option>
                  <option value="Quinta">Quinta-feira</option>
                  <option value="Sexta">Sexta-feira</option>
                  <option value="Sábado">Sábado</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Período</label>
                <select
                  value={apptPref.period}
                  onChange={(e) => setApptPref({ ...apptPref, period: e.target.value })}
                  className="w-full bg-surface border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 text-text-primary focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="">Selecione...</option>
                  <option value="Manhã">Manhã</option>
                  <option value="Tarde">Tarde</option>
                  <option value="Noite">Noite</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
