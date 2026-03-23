import React, { useState } from 'react';
import { collection, addDoc, updateDoc, doc } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../../firebase';
import { Patient } from '../../types';
import { FileText, Upload, CheckCircle, Printer, Loader2, Smartphone, Mail, X, MessageSquareText, ChevronDown } from 'lucide-react';
import { sendVerificationCode, VerificationMethod } from '../../services/verificationService';

export const ConsentTab = ({ patient }: { patient: Patient }) => {
  const [isAgreed, setIsAgreed] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [tcleStatus, setTcleStatus] = useState(patient.tcleStatus || 'nao_impresso');
  
  // Verification states
  const [verificationStep, setVerificationStep] = useState<'idle' | 'choosing' | 'verifying' | 'confirmed'>('idle');
  const [verificationMethod, setVerificationMethod] = useState<VerificationMethod | null>(null);
  const [inputCode, setInputCode] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [isSending, setIsSending] = useState(false);

  const updateTcleStatus = async (newStatus: 'nao_impresso' | 'nao_assinado' | 'assinado') => {
    setTcleStatus(newStatus);
    try {
      await updateDoc(doc(db, 'patients', patient.id), {
        tcleStatus: newStatus
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `patients/${patient.id}`);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const startVerification = () => {
    setVerificationStep('choosing');
  };

  const handleSendCode = async (method: VerificationMethod) => {
    setIsSending(true);
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedCode(code);
    setVerificationMethod(method);
    
    const recipient = method === 'email' ? patient.email : patient.phone;
    
    const result = await sendVerificationCode(method, recipient || '', code);
    
    setIsSending(false);
    if (result.success) {
      setVerificationStep('verifying');
    } else {
      alert(`Erro ao enviar código: ${result.error || 'Tente novamente.'}`);
    }
  };

  const verifyCode = () => {
    if (inputCode === generatedCode) {
      setIsAgreed(true);
      setVerificationStep('confirmed');
      alert('Consentimento registrado digitalmente com sucesso!');
    } else {
      alert('Código incorreto. Tente novamente.');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !auth.currentUser) return;

    setIsUploading(true);

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        let base64 = reader.result as string;
        
        // Basic compression for images
        if (file.type.startsWith('image/')) {
          const img = new Image();
          img.src = base64;
          await new Promise(resolve => {
            img.onload = () => {
              const canvas = document.createElement('canvas');
              const MAX_WIDTH = 800;
              const scaleSize = MAX_WIDTH / img.width;
              canvas.width = MAX_WIDTH;
              canvas.height = img.height * scaleSize;
              const ctx = canvas.getContext('2d');
              ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
              base64 = canvas.toDataURL('image/jpeg', 0.7);
              resolve(null);
            };
          });
        }
        
        await addDoc(collection(db, 'files'), {
          dentistId: auth.currentUser!.uid,
          patientId: patient.id,
          name: file.name,
          url: base64,
          type: 'consent',
          uploadedAt: new Date().toISOString(),
        });
        
        setIsUploading(false);
        alert('Termo assinado enviado com sucesso!');
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error(error);
      handleFirestoreError(error, OperationType.CREATE, 'files');
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-surface p-8 rounded-3xl border border-zinc-200 dark:border-zinc-700 shadow-sm">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-text-primary mb-4">Termo de Consentimento Livre e Esclarecido (TCLE)</h2>
          <div className="relative inline-block">
            <select
              value={tcleStatus}
              onChange={(e) => updateTcleStatus(e.target.value as any)}
              className="appearance-none bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-full px-6 py-2.5 pr-10 text-sm font-semibold text-text-primary focus:ring-2 focus:ring-indigo-500 cursor-pointer hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
            >
              <option value="nao_impresso">Não impresso</option>
              <option value="nao_assinado">Não assinado</option>
              <option value="assinado">Assinado</option>
            </select>
            <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-zinc-500 pointer-events-none" />
          </div>
        </div>
        
        <p className="text-text-secondary mb-8 text-lg">
          Por favor, leia o termo abaixo. Você pode concordar digitalmente ou imprimir para assinar presencialmente.
        </p>
        
        <div className="bg-zinc-50 dark:bg-zinc-950 p-8 rounded-2xl border border-zinc-200 dark:border-zinc-800 mb-8 h-80 overflow-y-auto text-base text-text-primary shadow-inner">
          <h3 className="font-bold text-lg mb-4">Modelo de TCLE</h3>
          <p className="leading-relaxed">Eu, {patient.name}, declaro estar ciente dos procedimentos odontológicos a serem realizados...</p>
        </div>

        {verificationStep === 'idle' && (
          <div className="flex flex-wrap gap-4">
            <button 
              onClick={startVerification}
              disabled={isAgreed}
              className="flex items-center gap-3 bg-indigo-600 text-white px-8 py-4 rounded-2xl hover:bg-indigo-700 disabled:opacity-50 transition-all font-semibold shadow-lg shadow-indigo-500/20"
            >
              <CheckCircle className="w-5 h-5" />
              {isAgreed ? 'Consentimento Registrado' : 'Concordar Digitalmente'}
            </button>
            <button 
              onClick={handlePrint}
              className="flex items-center gap-3 bg-zinc-100 dark:bg-zinc-800 text-text-primary px-8 py-4 rounded-2xl hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all font-semibold"
            >
              <Printer className="w-5 h-5" />
              Imprimir para Assinar
            </button>
            <label className="flex items-center gap-3 bg-emerald-600 text-white px-8 py-4 rounded-2xl hover:bg-emerald-700 cursor-pointer transition-all font-semibold shadow-lg shadow-emerald-500/20">
              {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
              {isUploading ? 'Enviando...' : 'Upload Termo Assinado'}
              <input 
                type="file" 
                onChange={handleFileUpload}
                className="hidden"
                accept="image/*,.pdf"
              />
            </label>
          </div>
        )}

        {verificationStep === 'choosing' && (
          <div className="p-6 bg-zinc-100 dark:bg-zinc-800 rounded-2xl space-y-6">
            <div className="flex justify-between items-center">
              <p className="font-bold text-lg">Escolha o método de verificação:</p>
              <button onClick={() => setVerificationStep('idle')} className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {patient.email && (
                <button onClick={() => handleSendCode('email')} disabled={isSending} className="flex flex-col items-center gap-3 p-4 bg-white dark:bg-zinc-700 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-600 transition-all border border-zinc-200 dark:border-zinc-600">
                  <Mail className="w-8 h-8 text-indigo-600" />
                  <span className="font-medium">Email</span>
                  <span className="text-xs text-zinc-500 truncate w-full text-center">{patient.email}</span>
                </button>
              )}
              {patient.phone && (
                <>
                  <button onClick={() => handleSendCode('sms')} disabled={isSending} className="flex flex-col items-center gap-3 p-4 bg-white dark:bg-zinc-700 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-600 transition-all border border-zinc-200 dark:border-zinc-600">
                    <Smartphone className="w-8 h-8 text-indigo-600" />
                    <span className="font-medium">SMS</span>
                    <span className="text-xs text-zinc-500">{patient.phone}</span>
                  </button>
                  <button onClick={() => handleSendCode('whatsapp')} disabled={isSending} className="flex flex-col items-center gap-3 p-4 bg-white dark:bg-zinc-700 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-600 transition-all border border-zinc-200 dark:border-zinc-600">
                    <MessageSquareText className="w-8 h-8 text-emerald-600" />
                    <span className="font-medium">WhatsApp</span>
                    <span className="text-xs text-zinc-500">{patient.phone}</span>
                  </button>
                </>
              )}
            </div>
            {isSending && (
              <div className="flex items-center justify-center gap-2 text-indigo-600">
                <Loader2 className="w-5 h-5 animate-spin" />
                Enviando código...
              </div>
            )}
          </div>
        )}

        {verificationStep === 'verifying' && (
          <div className="p-6 bg-zinc-100 dark:bg-zinc-800 rounded-2xl space-y-4">
            <p className="font-medium">
              Digite o código enviado via {verificationMethod === 'email' ? 'Email' : verificationMethod === 'sms' ? 'SMS' : 'WhatsApp'} 
              para {verificationMethod === 'email' ? patient.email : patient.phone}:
            </p>
            <input 
              type="text" 
              value={inputCode} 
              onChange={(e) => setInputCode(e.target.value)}
              className="w-full p-4 rounded-xl border border-zinc-300 dark:border-zinc-600 text-center text-2xl tracking-widest"
              placeholder="000000"
              maxLength={6}
            />
            <div className="flex gap-4">
              <button onClick={verifyCode} className="flex-1 bg-indigo-600 text-white px-6 py-3 rounded-xl hover:bg-indigo-700 font-bold">Verificar</button>
              <button onClick={() => setVerificationStep('choosing')} className="px-6 py-3 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl">Voltar</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
