import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useStorage } from '../context/StorageContext';
import { useTheme } from '../context/ThemeContext';
import { db, OperationType, handleFirestoreError } from '../firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { updateProfile, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { motion } from 'motion/react';
import { User, Mail, Phone, Calendar, Award, Save, Loader2, Camera, Lock, HardDrive, Download, Upload, Palette, Image as ImageIcon, RotateCcw } from 'lucide-react';
import { storage } from '../firebase';
import { getDriveAccessToken } from '../services/googleDriveService';
import { backupToDrive, restoreFromDrive } from '../services/backupService';

export const Profile: React.FC = () => {
  const { user } = useAuth();
  const { storageLocation, setStorageLocation } = useStorage();
  const { accentColor, setAccentColor, colorHistory, customLogo, setCustomLogo, resetToDefaults } = useTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [isAuthenticatingDrive, setIsAuthenticatingDrive] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [colorInput, setColorInput] = useState(accentColor);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    birthDate: '',
    cro: '',
    type: 'consultorio',
    address: '',
    epao: '',
    responsibleTechnician: ''
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: ''
  });

  useEffect(() => {
    setColorInput(accentColor);
  }, [accentColor]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    try {
      setLogoUploading(true);
      
      const compressedBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
          const img = new Image();
          img.src = event.target?.result as string;
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 512;
            const MAX_HEIGHT = 512;
            let width = img.width;
            let height = img.height;

            if (width > height) {
              if (width > MAX_WIDTH) {
                height *= MAX_WIDTH / width;
                width = MAX_WIDTH;
              }
            } else {
              if (height > MAX_HEIGHT) {
                width *= MAX_HEIGHT / height;
                height = MAX_HEIGHT;
              }
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/png', 0.9));
          };
          img.onerror = (error) => reject(error);
        };
        reader.onerror = (error) => reject(error);
      });

      let logoURL = compressedBase64;
      try {
        const storageRef = ref(storage, `app_logos/${user.uid}.png`);
        const response = await fetch(compressedBase64);
        const blob = await response.blob();
        await uploadBytes(storageRef, blob);
        logoURL = await getDownloadURL(storageRef);
      } catch (storageError) {
        console.warn("Storage upload failed, falling back to base64", storageError);
      }

      await setCustomLogo(logoURL);
      alert('Logo atualizada com sucesso!');
    } catch (error) {
      console.error("Error uploading logo:", error);
      alert('Erro ao atualizar logo do aplicativo.');
    } finally {
      setLogoUploading(false);
    }
  };

  const handleColorSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (/^#[0-9A-F]{6}$/i.test(colorInput)) {
      setAccentColor(colorInput);
    } else {
      alert('Por favor, insira um código hexadecimal válido (ex: #af571b)');
    }
  };

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      try {
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const data = userSnap.data();
          setFormData({
            name: data.name || user.displayName || '',
            email: data.email || user.email || '',
            phone: data.phone || '',
            birthDate: data.birthDate || '',
            cro: data.cro || '',
            type: data.type || 'consultorio',
            address: data.address || '',
            epao: data.epao || '',
            responsibleTechnician: data.responsibleTechnician || ''
          });
        } else {
          setFormData(prev => ({
            ...prev,
            name: user.displayName || '',
            email: user.email || ''
          }));
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      setSaving(true);
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        name: formData.name,
        phone: formData.phone,
        birthDate: formData.birthDate,
        cro: formData.cro,
        type: formData.type,
        address: formData.address,
        epao: formData.epao,
        responsibleTechnician: formData.responsibleTechnician
      });
      alert('Perfil atualizado com sucesso!');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !user.email) return;

    if (passwordData.newPassword !== passwordData.confirmNewPassword) {
      alert('As senhas não coincidem.');
      return;
    }

    try {
      setPasswordSaving(true);
      const credential = EmailAuthProvider.credential(user.email, passwordData.currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, passwordData.newPassword);
      alert('Senha atualizada com sucesso!');
      setPasswordData({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
    } catch (error) {
      console.error("Error updating password:", error);
      alert('Erro ao atualizar senha. Verifique sua senha atual e tente novamente.');
    } finally {
      setPasswordSaving(false);
    }
  };

  const isGoogleUser = user?.providerData.some(p => p.providerId === 'google.com');

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    try {
      setSaving(true);
      
      const compressedBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
          const img = new Image();
          img.src = event.target?.result as string;
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 256;
            const MAX_HEIGHT = 256;
            let width = img.width;
            let height = img.height;

            if (width > height) {
              if (width > MAX_WIDTH) {
                height *= MAX_WIDTH / width;
                width = MAX_WIDTH;
              }
            } else {
              if (height > MAX_HEIGHT) {
                width *= MAX_HEIGHT / height;
                height = MAX_HEIGHT;
              }
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.8));
          };
          img.onerror = (error) => reject(error);
        };
        reader.onerror = (error) => reject(error);
      });

      let photoURL = compressedBase64;
      try {
        const storageRef = ref(storage, `profile_pictures/${user.uid}.jpg`);
        const response = await fetch(compressedBase64);
        const blob = await response.blob();
        await uploadBytes(storageRef, blob);
        photoURL = await getDownloadURL(storageRef);
      } catch (storageError) {
        console.warn("Storage upload failed, falling back to base64 in Firestore", storageError);
      }

      await updateProfile(user, { photoURL });
      
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, { photoURL });
      
      window.location.reload();
    } catch (error) {
      console.error("Error uploading image:", error);
      alert('Erro ao atualizar foto de perfil. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const handleStorageChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value as 'firebase' | 'drive';
    
    if (value === 'drive') {
      setIsAuthenticatingDrive(true);
      try {
        const token = await getDriveAccessToken();
        if (token) {
          setStorageLocation('drive');
          alert('Autenticado com sucesso no Google Drive!');
        } else {
          alert('Falha ao autenticar com o Google Drive. O armazenamento retornou para o Firebase.');
          setStorageLocation('firebase');
        }
      } catch (error) {
        console.error('Drive auth error:', error);
        alert('Erro ao conectar com o Google Drive.');
        setStorageLocation('firebase');
      } finally {
        setIsAuthenticatingDrive(false);
      }
    } else {
      setStorageLocation('firebase');
    }
  };

  const handleBackup = async () => {
    if (!user) return;
    setIsBackingUp(true);
    try {
      const success = await backupToDrive(user.uid);
      if (success) {
        alert('Backup realizado com sucesso no Google Drive!');
      } else {
        alert('Erro ao realizar backup. Tente novamente.');
      }
    } catch (error) {
      console.error('Backup error:', error);
      alert('Erro ao realizar backup.');
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleRestore = async () => {
    if (!user) return;
    if (!window.confirm('Tem certeza que deseja restaurar os dados do Google Drive? Isso irá sobrescrever os dados atuais no Firebase.')) {
      return;
    }
    setIsRestoring(true);
    try {
      const success = await restoreFromDrive(user.uid);
      if (success) {
        alert('Dados restaurados com sucesso do Google Drive!');
        window.location.reload();
      } else {
        alert('Nenhum backup encontrado ou erro ao restaurar.');
      }
    } catch (error) {
      console.error('Restore error:', error);
      alert('Erro ao restaurar dados.');
    } finally {
      setIsRestoring(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto pb-20 sm:pb-6">
      <div className="flex flex-col lg:flex-row gap-6 sm:gap-8">
        {/* Left Column: Avatar & Summary */}
        <div className="w-full lg:w-1/3 space-y-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-surface rounded-[24px] sm:rounded-[32px] shadow-sm border border-zinc-200 dark:border-zinc-800 p-6 sm:p-8 text-center relative overflow-hidden"
          >
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-3xl -mr-16 -mt-16 pointer-events-none" />
            
            <div className="relative z-10">
              <div className="relative inline-block group">
                <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-[32px] sm:rounded-[40px] bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center border-4 border-white dark:border-zinc-800 shadow-xl overflow-hidden transition-transform group-hover:scale-105 duration-500">
                  {user?.photoURL ? (
                    <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <User className="w-10 h-10 sm:w-12 sm:h-12 text-indigo-600 dark:text-indigo-400" />
                  )}
                  <label className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer backdrop-blur-sm">
                    <Camera className="w-5 h-5 sm:w-6 sm:h-6 text-white mb-1" />
                    <span className="text-[9px] sm:text-[10px] font-black text-white uppercase tracking-widest">Alterar</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={saving} />
                  </label>
                </div>
                <div className="absolute -bottom-1 -right-1 sm:-bottom-2 sm:-right-2 w-8 h-8 sm:w-10 sm:h-10 bg-indigo-600 rounded-xl sm:rounded-2xl flex items-center justify-center text-white shadow-lg border-4 border-white dark:border-zinc-800">
                  <Award className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
              </div>

              <div className="mt-6">
                <h1 className="hidden md:block text-xl sm:text-2xl font-black text-text-primary tracking-tight truncate px-2">{formData.name || 'Seu Nome'}</h1>
                <p className="text-xs sm:text-sm font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mt-1">
                  {formData.cro ? `CRO: ${formData.cro}` : 'Cirurgião Dentista'}
                </p>
              </div>

              <div className="mt-6 sm:mt-8 pt-6 sm:pt-8 border-t border-zinc-100 dark:border-zinc-800 space-y-3 sm:space-y-4">
                <div className="flex items-center gap-3 text-left">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 shrink-0">
                    <Mail className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] sm:text-[10px] font-black text-zinc-400 uppercase tracking-widest">E-mail</p>
                    <p className="text-xs sm:text-sm font-medium text-text-primary truncate">{formData.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-left">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 shrink-0">
                    <Phone className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] sm:text-[10px] font-black text-zinc-400 uppercase tracking-widest">Telefone</p>
                    <p className="text-xs sm:text-sm font-medium text-text-primary truncate">{formData.phone || 'Não informado'}</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-indigo-600 rounded-[24px] sm:rounded-[32px] p-6 sm:p-8 text-white shadow-lg dark:shadow-none relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-3xl -mr-16 -mt-16" />
            <div className="relative z-10">
              <h3 className="text-base sm:text-lg font-black uppercase tracking-widest mb-2">Status da Conta</h3>
              <p className="text-indigo-100 text-xs sm:text-sm font-medium leading-relaxed">Sua conta está ativa e verificada. Você tem acesso total a todos os recursos do sistema.</p>
            </div>
          </motion.div>
        </div>

        {/* Right Column: Forms */}
        <div className="flex-1 space-y-6 sm:space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-surface rounded-[24px] sm:rounded-[32px] shadow-sm border border-zinc-200 dark:border-zinc-800 overflow-hidden"
          >
            <div className="p-6 sm:p-8 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
              <h2 className="text-lg sm:text-xl font-black text-text-primary tracking-tight">Informações Pessoais</h2>
              <User className="w-5 h-5 text-indigo-600" />
            </div>

            <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
                <div className="space-y-2">
                  <label className="text-[9px] sm:text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Nome Completo</label>
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-indigo-500 transition-colors" />
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      className="w-full pl-11 sm:pl-12 pr-4 py-3 sm:py-3.5 rounded-xl sm:rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/30 dark:bg-zinc-800/30 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm font-medium"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] sm:text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">E-mail (Apenas leitura)</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      className="w-full pl-11 sm:pl-12 pr-4 py-3 sm:py-3.5 rounded-xl sm:rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800/50 text-zinc-500 outline-none cursor-not-allowed text-sm font-medium"
                      disabled
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] sm:text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Celular</label>
                  <div className="relative group">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-indigo-500 transition-colors" />
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className="w-full pl-11 sm:pl-12 pr-4 py-3 sm:py-3.5 rounded-xl sm:rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/30 dark:bg-zinc-800/30 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm font-medium"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] sm:text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Data de Nascimento</label>
                  <div className="relative group">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-indigo-500 transition-colors" />
                    <input
                      type="date"
                      name="birthDate"
                      value={formData.birthDate}
                      onChange={handleChange}
                      className="w-full pl-11 sm:pl-12 pr-4 py-3 sm:py-3.5 rounded-xl sm:rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/30 dark:bg-zinc-800/30 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm font-medium"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] sm:text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Registro CRO</label>
                  <div className="relative group">
                    <Award className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-indigo-500 transition-colors" />
                    <input
                      type="text"
                      name="cro"
                      value={formData.cro}
                      onChange={handleChange}
                      className="w-full pl-11 sm:pl-12 pr-4 py-3 sm:py-3.5 rounded-xl sm:rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/30 dark:bg-zinc-800/30 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm font-medium"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] sm:text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Tipo de Ambiente</label>
                  <select
                    name="type"
                    value={formData.type}
                    onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as 'clinica' | 'consultorio' }))}
                    className="w-full pl-4 pr-4 py-3 sm:py-3.5 rounded-xl sm:rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/30 dark:bg-zinc-800/30 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm font-medium"
                  >
                    <option value="consultorio">Consultório Odontológico</option>
                    <option value="clinica">Clínica Odontológica</option>
                  </select>
                </div>

                <div className="space-y-2">
                    <label className="text-[9px] sm:text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Endereço</label>
                    <input
                      type="text"
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      className="w-full pl-4 pr-4 py-3 sm:py-3.5 rounded-xl sm:rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/30 dark:bg-zinc-800/30 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm font-medium"
                    />
                </div>

                {formData.type === 'clinica' && (
                  <>
                  <div className="space-y-2">
                      <label className="text-[9px] sm:text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Número EPAO</label>
                      <input
                        type="text"
                        name="epao"
                        value={formData.epao}
                        onChange={handleChange}
                        className="w-full pl-4 pr-4 py-3 sm:py-3.5 rounded-xl sm:rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/30 dark:bg-zinc-800/30 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm font-medium"
                      />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] sm:text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Responsável Técnico</label>
                    <input
                      type="text"
                      name="responsibleTechnician"
                      value={formData.responsibleTechnician}
                      onChange={handleChange}
                      className="w-full pl-4 pr-4 py-3 sm:py-3.5 rounded-xl sm:rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/30 dark:bg-zinc-800/30 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm font-medium"
                    />
                  </div>
                  </>
                )}
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full sm:w-auto px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl sm:rounded-2xl font-black uppercase tracking-[0.2em] text-xs transition-all flex items-center justify-center gap-3 disabled:opacity-50 shadow-lg dark:shadow-none active:scale-95"
                >
                  {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  {saving ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-surface rounded-[24px] sm:rounded-[32px] shadow-sm border border-zinc-200 dark:border-zinc-800 overflow-hidden"
          >
            <div className="p-6 sm:p-8 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
              <h2 className="text-lg sm:text-xl font-black text-text-primary tracking-tight">Segurança</h2>
              <Lock className="w-5 h-5 text-indigo-600" />
            </div>

            <form onSubmit={handlePasswordChange} className="p-6 sm:p-8 space-y-6">
              {isGoogleUser ? (
                <div className="p-6 rounded-xl sm:rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800">
                  <p className="text-sm font-medium text-text-secondary">Sua conta está vinculada ao Google. A senha não pode ser alterada por aqui.</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
                    <div className="space-y-2">
                      <label className="text-[9px] sm:text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Senha Atual</label>
                      <input
                        type="password"
                        value={passwordData.currentPassword}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                        className="w-full px-4 py-3 sm:py-3.5 rounded-xl sm:rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/30 dark:bg-zinc-800/30 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm font-medium"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] sm:text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Nova Senha</label>
                      <input
                        type="password"
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                        className="w-full px-4 py-3 sm:py-3.5 rounded-xl sm:rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/30 dark:bg-zinc-800/30 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm font-medium"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] sm:text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Confirmar Nova Senha</label>
                      <input
                        type="password"
                        value={passwordData.confirmNewPassword}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, confirmNewPassword: e.target.value }))}
                        className="w-full px-4 py-3 sm:py-3.5 rounded-xl sm:rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/30 dark:bg-zinc-800/30 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm font-medium"
                        required
                      />
                    </div>
                  </div>
                  <div className="flex justify-end pt-4">
                    <button
                      type="submit"
                      disabled={passwordSaving}
                      className="w-full sm:w-auto px-8 py-4 bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 rounded-xl sm:rounded-2xl font-black uppercase tracking-[0.2em] text-xs transition-all flex items-center justify-center gap-3 disabled:opacity-50 active:scale-95"
                    >
                      {passwordSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Lock className="w-5 h-5" />}
                      {passwordSaving ? 'Atualizando...' : 'Atualizar Senha'}
                    </button>
                  </div>
                </>
              )}
            </form>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="bg-surface rounded-[24px] sm:rounded-[32px] shadow-sm border border-zinc-200 dark:border-zinc-800 overflow-hidden"
          >
            <div className="p-6 sm:p-8 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
              <h2 className="text-lg sm:text-xl font-black text-text-primary tracking-tight">Identidade Visual</h2>
              <Palette className="w-5 h-5" style={{ color: accentColor }} />
            </div>

            <div className="p-6 sm:p-8 space-y-8">
              {/* Color Configuration */}
              <div className="space-y-4">
                <label className="text-[9px] sm:text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Cor Base do Aplicativo</label>
                <form onSubmit={handleColorSubmit} className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1 flex gap-3">
                    <div className="relative group shrink-0">
                      <div 
                        className="w-12 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm transition-transform group-hover:scale-105" 
                        style={{ backgroundColor: accentColor, height: '46px' }}
                      />
                      <input 
                        type="color" 
                        value={colorInput} 
                        onChange={(e) => setColorInput(e.target.value)}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                    </div>
                    <input
                      type="text"
                      value={colorInput}
                      onChange={(e) => setColorInput(e.target.value)}
                      placeholder="#000000"
                      className="flex-1 px-4 py-3 rounded-xl sm:rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/30 dark:bg-zinc-800/30 outline-none transition-all text-sm font-mono font-medium lowercase"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="px-6 py-3 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl sm:rounded-2xl font-bold text-xs uppercase tracking-widest hover:opacity-90 active:scale-95 transition-all"
                    >
                      Aplicar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAccentColor('#af571b');
                        setColorInput('#af571b');
                      }}
                      className="p-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-xl sm:rounded-2xl transition-all"
                      title="Redefinir Cor"
                    >
                      <RotateCcw className="w-5 h-5" />
                    </button>
                  </div>
                </form>

                {colorHistory.length > 0 && (
                  <div className="pt-2">
                    <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-3 ml-1">Cores Recentes</p>
                    <div className="flex flex-wrap gap-2">
                      {colorHistory.map((color, i) => (
                        <button
                          key={`${color}-${i}`}
                          onClick={() => setAccentColor(color)}
                          className="w-8 h-8 rounded-lg border border-zinc-200 dark:border-zinc-700 shadow-sm transition-all hover:scale-110 active:scale-90"
                          style={{ backgroundColor: color }}
                          title={color}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Logo Configuration */}
              <div className="pt-6 border-t border-zinc-100 dark:border-zinc-800 space-y-4">
                <label className="text-[9px] sm:text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Logotipo Personalizado</label>
                <div className="flex flex-col sm:flex-row items-center gap-6 p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700">
                  <div 
                    className="w-20 h-20 rounded-2xl border border-zinc-200 dark:border-zinc-700 flex items-center justify-center overflow-hidden shadow-sm transition-all duration-500"
                    style={{ 
                      background: customLogo ? 'white' : `linear-gradient(145deg, var(--accent) 0%, var(--accent-dark) 100%)`
                    }}
                  >
                    <img 
                      src={customLogo || "/icon.png"} 
                      alt="Logo" 
                      className={`w-full h-full object-cover transition-all duration-500 ${!customLogo ? 'mix-blend-luminosity opacity-90 brightness-110 grayscale contrast-125' : ''}`} 
                    />
                  </div>
                  <div className="flex-1 space-y-3 text-center sm:text-left">
                    <p className="text-xs font-medium text-text-secondary leading-relaxed">
                      Substitua o dente padrão por sua própria logomarca. Recomendamos arquivos PNG transparentes de 512x512px.
                    </p>
                    <div className="flex flex-wrap justify-center sm:justify-start gap-3">
                      <label className="flex items-center gap-2 px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl font-bold text-[10px] uppercase tracking-widest cursor-pointer hover:opacity-90 active:scale-95 transition-all">
                        {logoUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImageIcon className="w-3.5 h-3.5" />}
                        {logoUploading ? 'Enviando...' : 'Fazer Upload'}
                        <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={logoUploading} />
                      </label>
                      <button
                        type="button"
                        onClick={() => setCustomLogo(null)}
                        className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-zinc-800 text-zinc-500 border border-zinc-200 dark:border-zinc-700 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:text-zinc-900 dark:hover:text-zinc-100 active:scale-95 transition-all"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Restaurar Original
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-surface rounded-[24px] sm:rounded-[32px] shadow-sm border border-zinc-200 dark:border-zinc-800 overflow-hidden"
          >
            <div className="p-6 sm:p-8 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
              <h2 className="text-lg sm:text-xl font-black text-text-primary tracking-tight">Armazenamento de Dados</h2>
              <HardDrive className="w-5 h-5 text-indigo-600" />
            </div>

            <div className="p-6 sm:p-8 space-y-6">
              <div className="space-y-4">
                <label className="text-[9px] sm:text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Local de Armazenamento</label>
                <div className="relative">
                  <select
                    value={storageLocation}
                    onChange={handleStorageChange}
                    disabled={isAuthenticatingDrive}
                    className="w-full px-4 py-3 sm:py-3.5 rounded-xl sm:rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/30 dark:bg-zinc-800/30 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm font-medium appearance-none cursor-pointer disabled:opacity-50"
                  >
                    <option value="firebase">Firebase (Nuvem Padrão)</option>
                    <option value="drive">Google Drive (Pasta Pessoal)</option>
                  </select>
                  <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                    {isAuthenticatingDrive ? (
                      <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
                    ) : (
                      <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                    )}
                  </div>
                </div>
                {storageLocation === 'drive' && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="p-4 rounded-xl sm:rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/30 space-y-4"
                  >
                    <p className="text-xs sm:text-sm font-medium text-indigo-700 dark:text-indigo-300 leading-relaxed">
                      Autenticado com sucesso! Seus dados do Assistente IA (histórico de chat) estão sendo salvos em uma pasta "DentalApp_Data" no seu Google Drive.
                    </p>
                    
                    <div className="pt-4 border-t border-indigo-200 dark:border-indigo-800/50">
                      <h3 className="text-sm font-bold text-indigo-900 dark:text-indigo-100 mb-3">Backup e Restauração</h3>
                      <p className="text-xs text-indigo-700 dark:text-indigo-300 mb-4">
                        Você pode fazer o backup de todos os dados do seu consultório para o Google Drive ou restaurá-los a partir de um backup existente.
                      </p>
                      
                      <div className="flex flex-col sm:flex-row gap-3">
                        <button
                          onClick={handleBackup}
                          disabled={isBackingUp || isRestoring}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
                        >
                          {isBackingUp ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                          Fazer Backup
                        </button>
                        <button
                          onClick={handleRestore}
                          disabled={isBackingUp || isRestoring}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-white dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/50 text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
                        >
                          {isRestoring ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                          Restaurar Dados
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};
