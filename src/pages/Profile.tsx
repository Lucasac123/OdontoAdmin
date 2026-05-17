import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useStorage } from '../context/StorageContext';
import { useTheme } from '../context/ThemeContext';
import { db, OperationType, handleFirestoreError, storage } from '../firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { updateProfile, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { motion, AnimatePresence } from 'motion/react';
import { ImageCropperModal } from '../components/ImageCropperModal';
import { 
  User, Mail, Phone, Calendar, Award, Save, Loader2, Camera, Lock, 
  HardDrive, Download, Upload, Palette, Image as ImageIcon, RotateCcw, 
  CheckCircle, MapPin, Building, Eye, EyeOff, ShieldCheck, Check, 
  Database, Sparkles, CloudLightning 
} from 'lucide-react';
import { getDriveAccessToken } from '../services/googleDriveService';
import { backupToDrive, restoreFromDrive } from '../services/backupService';

// Premium color presets specifically designed for clinical and dental aesthetics
const COLOR_PRESETS = [
  { id: 'bronze', label: 'Ouro Clínico', value: '#af571b', desc: 'Bronze clássico e acolhedor' },
  { id: 'teal', label: 'Verde Turquesa', value: '#0d9488', desc: 'Moderno e tranquilizante' },
  { id: 'blue', label: 'Azul Odonto', value: '#2563eb', desc: 'Profissional e tecnológico' },
  { id: 'emerald', label: 'Menta Fresca', value: '#059669', desc: 'Suave, orgânico e natural' },
  { id: 'violet', label: 'Roxo Ametista', value: '#7c3aed', desc: 'Sofisticado e contemporâneo' },
  { id: 'slate', label: 'Mineral Neutro', value: '#4b5563', desc: 'Minimalista e ultra limpo' },
];

export const Profile: React.FC = () => {
  const { user } = useAuth();
  const { storageLocation, setStorageLocation } = useStorage();
  const { accentColor, setAccentColor, colorHistory, customLogo, setCustomLogo } = useTheme();
  
  // Tab Management State
  const [activeTab, setActiveTab] = useState<'profile' | 'appearance' | 'security' | 'storage'>('profile');
  
  // Loading & Saving States
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [isAuthenticatingDrive, setIsAuthenticatingDrive] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  
  // Custom Color States
  const [colorInput, setColorInput] = useState(accentColor);
  
  // Password Visibility States
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Image Crop Modal States
  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const [cropperImageSrc, setCropperImageSrc] = useState<string | null>(null);

  // Form Fields State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    birthDate: '',
    cro: '',
    type: 'consultorio',
    address: '',
    epao: '',
    responsibleTechnician: '',
    clinicName: ''
  });
  
  // Password Fields State
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: ''
  });

  useEffect(() => {
    setColorInput(accentColor);
  }, [accentColor]);

  // Logo Customization Handlers
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      setCropperImageSrc(event.target?.result as string);
      setIsCropperOpen(true);
    };
    e.target.value = ''; // Reset input
  };

  const handleCropComplete = async (croppedBase64: string) => {
    if (!user) return;
    
    try {
      setLogoUploading(true);

      let logoURL = croppedBase64;
      try {
        const storageRef = ref(storage, `app_logos/${user.uid}.png`);
        const response = await fetch(croppedBase64);
        const blob = await response.blob();
        await uploadBytes(storageRef, blob);
        logoURL = await getDownloadURL(storageRef);
      } catch (storageError) {
        console.warn("Storage upload failed, falling back to base64", storageError);
      }

      await setCustomLogo(logoURL);
      alert('Logo do aplicativo atualizada com sucesso!');
    } catch (error) {
      console.error("Error uploading logo:", error);
      alert('Erro ao atualizar logo do aplicativo.');
    } finally {
      setLogoUploading(false);
    }
  };

  // Color Customization Handlers
  const handleColorSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (/^#[0-9A-F]{6}$/i.test(colorInput)) {
      setAccentColor(colorInput);
    } else {
      alert('Por favor, insira um código hexadecimal válido (ex: #af571b)');
    }
  };

  // Fetching Profile Data
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
            responsibleTechnician: data.responsibleTechnician || '',
            clinicName: data.clinicName || ''
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Submit Profile Changes
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
        responsibleTechnician: formData.responsibleTechnician,
        clinicName: formData.clinicName
      });
      alert('Perfil atualizado com sucesso!');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    } finally {
      setSaving(false);
    }
  };

  // Password Modification Handler
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

  // Profile Avatar Upload Handler
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

  // Data Storage Location Handler
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
      } catch (error: any) {
        console.error('Drive auth error:', error);
        alert(`Erro ao conectar com o Google Drive: ${error?.message || error}`);
        setStorageLocation('firebase');
      } finally {
        setIsAuthenticatingDrive(false);
      }
    } else {
      setStorageLocation('firebase');
    }
  };

  // Google Drive Manual Backup Handler
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

  // Google Drive Manual Restore Handler
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
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600 dark:text-indigo-400" />
      </div>
    );
  }

  // Sidebar Settings Tab Options
  const TABS = [
    { id: 'profile', label: 'Clínica & Perfil', icon: User, desc: 'Dados do consultório' },
    { id: 'appearance', label: 'Identidade Visual', icon: Palette, desc: 'Cores e logomarca' },
    { id: 'security', label: 'Segurança', icon: Lock, desc: 'Senha e credenciais' },
    { id: 'storage', label: 'Armazenamento', icon: HardDrive, desc: 'Backups e nuvem' },
  ] as const;

  return (
    <div className="max-w-6xl mx-auto pb-24 lg:pb-8 px-4 sm:px-6">
      <div className="flex flex-col lg:flex-row gap-8 items-start">
        
        {/* ================= LEFT SIDEBAR (Profile Summary & Tab Nav) ================= */}
        <div className="w-full lg:w-[320px] shrink-0 space-y-6">
          
          {/* Profile Summary Card */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-surface rounded-3xl shadow-premium border border-zinc-200 dark:border-zinc-800 p-6 text-center relative overflow-hidden glass"
          >
            {/* Elegant glass background decoration */}
            <div className="absolute top-0 right-0 w-36 h-36 bg-indigo-500/5 dark:bg-indigo-400/5 blur-3xl -mr-12 -mt-12 pointer-events-none" />
            
            <div className="relative z-10">
              {/* Avatar Container with Hover Glow */}
              <div className="relative inline-block group">
                <div 
                  className="w-28 h-28 sm:w-32 sm:h-32 rounded-[36px] bg-zinc-50 dark:bg-zinc-900/50 flex items-center justify-center border-4 border-white dark:border-zinc-800 shadow-xl overflow-hidden transition-all duration-500 group-hover:scale-105"
                  style={{ borderColor: accentColor }}
                >
                  {user?.photoURL ? (
                    <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <User className="w-12 h-12 text-zinc-400" />
                  )}
                  
                  <label className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 cursor-pointer backdrop-blur-xs">
                    <Camera className="w-6 h-6 text-white mb-1 animate-pulse" />
                    <span className="text-[9px] font-black text-white uppercase tracking-widest">Alterar</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={saving} />
                  </label>
                </div>
                
                {/* Accent Badge */}
                <div 
                  className="absolute -bottom-1 -right-1 w-9 h-9 rounded-2xl flex items-center justify-center text-white shadow-lg border-4 border-white dark:border-zinc-800 transition-transform duration-500 group-hover:rotate-12"
                  style={{ backgroundColor: accentColor }}
                >
                  <Award className="w-4 h-4" />
                </div>
              </div>

              {/* Title & Registration Details */}
              <div className="mt-5">
                <h1 className="text-xl font-black text-text-primary tracking-tight truncate px-2">
                  {formData.name || 'Dentista'}
                </h1>
                <p 
                  className="text-xs font-bold uppercase tracking-wider mt-1.5 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-900/20 inline-block"
                  style={{ color: accentColor }}
                >
                  {formData.cro ? `CRO: ${formData.cro}` : 'Cirurgião Dentista'}
                </p>
              </div>

              {/* Quick Profile Meta Rows */}
              <div className="mt-6 pt-5 border-t border-zinc-100 dark:border-zinc-800/80 space-y-4">
                <div className="flex items-center gap-3.5 text-left">
                  <div className="w-9 h-9 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 flex items-center justify-center text-zinc-400 shrink-0 border border-zinc-100 dark:border-zinc-800">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">E-mail</p>
                    <p className="text-xs sm:text-sm font-semibold text-text-primary truncate">{formData.email}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3.5 text-left">
                  <div className="w-9 h-9 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 flex items-center justify-center text-zinc-400 shrink-0 border border-zinc-100 dark:border-zinc-800">
                    <Phone className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Telefone</p>
                    <p className="text-xs sm:text-sm font-semibold text-text-primary truncate">{formData.phone || 'Não informado'}</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Navigation Tabs - Desktop (Vertical) */}
          <div className="hidden lg:block bg-surface rounded-3xl p-3 border border-zinc-200 dark:border-zinc-800 shadow-premium glass">
            <nav className="space-y-1 relative z-0">
              {TABS.map((tab) => {
                const IconComponent = tab.icon;
                const isSelected = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className="w-full relative flex items-center gap-4 px-4 py-3 rounded-2xl text-left transition-all duration-300 group cursor-pointer"
                  >
                    {/* Active tab sliding highlight pill */}
                    {isSelected && (
                      <motion.div
                        layoutId="activeTabPill"
                        className="absolute inset-0 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl -z-10"
                        transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                        style={{ borderLeft: `3px solid ${accentColor}` }}
                      />
                    )}
                    
                    <div 
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border transition-all duration-300 ${
                        isSelected 
                        ? 'bg-surface border-zinc-100 dark:border-zinc-850 shadow-sm' 
                        : 'bg-zinc-50/50 dark:bg-zinc-900/30 border-transparent text-zinc-400 group-hover:text-text-primary'
                      }`}
                      style={isSelected ? { color: accentColor } : {}}
                    >
                      <IconComponent className="w-4.5 h-4.5" />
                    </div>
                    
                    <div className="min-w-0 flex-1">
                      <p className={`text-xs font-black tracking-tight ${isSelected ? 'text-text-primary' : 'text-text-secondary group-hover:text-text-primary'}`}>
                        {tab.label}
                      </p>
                      <p className="text-[9px] font-medium text-zinc-400 dark:text-zinc-500 truncate leading-none mt-0.5">
                        {tab.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Navigation Tabs - Mobile/Tablet (Horizontal Scroll) */}
          <div className="block lg:hidden w-full overflow-x-auto hide-scrollbar -mx-4 px-4 pb-2 sticky top-[60px] z-20 bg-zinc-50 dark:bg-zinc-900/10 backdrop-blur-md">
            <div className="flex gap-2.5 min-w-max p-1 bg-surface dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm">
              {TABS.map((tab) => {
                const IconComponent = tab.icon;
                const isSelected = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className="relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-left transition-all duration-300 cursor-pointer"
                  >
                    {/* Active tab sliding highlight pill for mobile */}
                    {isSelected && (
                      <motion.div
                        layoutId="activeTabPillMobile"
                        className="absolute inset-0 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl -z-10"
                        transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                        style={{ borderBottom: `2px solid ${accentColor}` }}
                      />
                    )}
                    
                    <IconComponent 
                      className="w-4 h-4" 
                      style={isSelected ? { color: accentColor } : { color: 'var(--text-secondary)' }}
                    />
                    <span className={`text-xs font-black tracking-tight ${isSelected ? 'text-text-primary' : 'text-text-secondary'}`}>
                      {tab.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Account Status Card - Integrated in Sidebar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-3xl p-5 text-white shadow-premium relative overflow-hidden"
            style={{ background: `linear-gradient(135deg, ${accentColor} 0%, #1e1b4b 100%)` }}
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-2xl -mr-12 -mt-12 pointer-events-none" />
            <div className="relative z-10 flex gap-4">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0 border border-white/20">
                <CheckCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-xs font-black uppercase tracking-widest text-white/95">Status da Conta</h3>
                <p className="text-white/80 text-[10px] font-semibold leading-relaxed mt-1">
                  Sua conta está ativa e protegida. Acesso total a recursos em nuvem, agendamentos e IA.
                </p>
              </div>
            </div>
          </motion.div>

        </div>

        {/* ================= RIGHT CONFIGURATION PANELS ================= */}
        <div className="flex-1 w-full min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="w-full"
            >
              
              {/* ----------------- TAB: PROFILE & CLINIC ----------------- */}
              {activeTab === 'profile' && (
                <div className="bg-surface rounded-[32px] border border-zinc-200 dark:border-zinc-800 shadow-premium overflow-hidden glass">
                  <div className="p-6 sm:p-8 border-b border-zinc-150 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-black text-text-primary tracking-tight">Informações Cadastrais</h2>
                      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">Configuração do seu perfil e ambiente clínico</p>
                    </div>
                    <div 
                      className="w-10 h-10 rounded-xl flex items-center justify-center border shadow-sm transition-transform shrink-0"
                      style={{ color: accentColor, borderColor: `${accentColor}22`, backgroundColor: `${accentColor}11` }}
                    >
                      <User className="w-5 h-5" />
                    </div>
                  </div>

                  <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-8">
                    
                    {/* Subsection: Pessoal */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-2">
                        <User className="w-4 h-4 text-zinc-400" />
                        <h3 className="text-xs font-black uppercase tracking-wider text-zinc-450 dark:text-zinc-400">Dados Pessoais</h3>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div className="space-y-2">
                          <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest ml-1">Nome Completo</label>
                          <div className="relative group">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-[var(--accent)] transition-colors" style={{ '--accent': accentColor } as React.CSSProperties} />
                            <input
                              type="text"
                              name="name"
                              value={formData.name}
                              onChange={handleChange}
                              className="w-full pl-11 pr-4 py-3 sm:py-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/20 dark:bg-zinc-800/10 focus:ring-2 outline-none transition-all text-sm font-semibold text-text-primary focus:border-transparent"
                              style={{ '--tw-ring-color': accentColor } as React.CSSProperties}
                              required
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest ml-1">Celular</label>
                          <div className="relative group">
                            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-[var(--accent)] transition-colors" style={{ '--accent': accentColor } as React.CSSProperties} />
                            <input
                              type="tel"
                              name="phone"
                              value={formData.phone}
                              onChange={handleChange}
                              placeholder="(00) 00000-0000"
                              className="w-full pl-11 pr-4 py-3 sm:py-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/20 dark:bg-zinc-800/10 focus:ring-2 outline-none transition-all text-sm font-semibold text-text-primary focus:border-transparent"
                              style={{ '--tw-ring-color': accentColor } as React.CSSProperties}
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest ml-1">Data de Nascimento</label>
                          <div className="relative group">
                            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-[var(--accent)] transition-colors" style={{ '--accent': accentColor } as React.CSSProperties} />
                            <input
                              type="date"
                              name="birthDate"
                              value={formData.birthDate}
                              onChange={handleChange}
                              className="w-full pl-11 pr-4 py-3 sm:py-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/20 dark:bg-zinc-800/10 focus:ring-2 outline-none transition-all text-sm font-semibold text-text-primary focus:border-transparent"
                              style={{ '--tw-ring-color': accentColor } as React.CSSProperties}
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest ml-1">E-mail (Não editável)</label>
                          <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-450 dark:text-zinc-500" />
                            <input
                              type="email"
                              value={formData.email}
                              className="w-full pl-11 pr-4 py-3 sm:py-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900/50 text-zinc-450 dark:text-zinc-500 outline-none cursor-not-allowed text-sm font-semibold"
                              disabled
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Subsection: Clínica / Atendimento */}
                    <div className="space-y-4 pt-4 border-t border-zinc-100 dark:border-zinc-800/80">
                      <div className="flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-2">
                        <Building className="w-4 h-4 text-zinc-400" />
                        <h3 className="text-xs font-black uppercase tracking-wider text-zinc-450 dark:text-zinc-400">Dados do Consultório / Clínica</h3>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div className="space-y-2">
                          <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest ml-1">Nome Fantasia do Consultório</label>
                          <div className="relative group">
                            <Building className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-[var(--accent)] transition-colors" style={{ '--accent': accentColor } as React.CSSProperties} />
                            <input
                              type="text"
                              name="clinicName"
                              value={formData.clinicName}
                              onChange={handleChange}
                              className="w-full pl-11 pr-4 py-3 sm:py-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/20 dark:bg-zinc-800/10 focus:ring-2 outline-none transition-all text-sm font-semibold text-text-primary focus:border-transparent"
                              style={{ '--tw-ring-color': accentColor } as React.CSSProperties}
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest ml-1">Tipo de Ambiente</label>
                          <div className="relative group">
                            <select
                              name="type"
                              value={formData.type}
                              onChange={handleChange}
                              className="w-full pl-4 pr-10 py-3 sm:py-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/20 dark:bg-zinc-800/10 focus:ring-2 outline-none transition-all text-sm font-semibold text-text-primary focus:border-transparent appearance-none cursor-pointer"
                              style={{ '--tw-ring-color': accentColor } as React.CSSProperties}
                            >
                              <option value="consultorio">Consultório Odontológico</option>
                              <option value="clinica">Clínica Odontológica</option>
                            </select>
                            <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-zinc-400">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest ml-1">Registro Profissional CRO</label>
                          <div className="relative group">
                            <Award className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-[var(--accent)] transition-colors" style={{ '--accent': accentColor } as React.CSSProperties} />
                            <input
                              type="text"
                              name="cro"
                              value={formData.cro}
                              onChange={handleChange}
                              placeholder="UF-12345"
                              className="w-full pl-11 pr-4 py-3 sm:py-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/20 dark:bg-zinc-800/10 focus:ring-2 outline-none transition-all text-sm font-semibold text-text-primary focus:border-transparent"
                              style={{ '--tw-ring-color': accentColor } as React.CSSProperties}
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest ml-1">Endereço Físico</label>
                          <div className="relative group">
                            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-[var(--accent)] transition-colors" style={{ '--accent': accentColor } as React.CSSProperties} />
                            <input
                              type="text"
                              name="address"
                              value={formData.address}
                              onChange={handleChange}
                              placeholder="Av. Paulista, 1000 - Cj. 41"
                              className="w-full pl-11 pr-4 py-3 sm:py-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/20 dark:bg-zinc-800/10 focus:ring-2 outline-none transition-all text-sm font-semibold text-text-primary focus:border-transparent"
                              style={{ '--tw-ring-color': accentColor } as React.CSSProperties}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Clinical-Only EPAO Fields with Smooth Slide Animate */}
                      <AnimatePresence>
                        {formData.type === 'clinica' && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3 }}
                            className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-3 overflow-hidden"
                          >
                            <div className="space-y-2">
                              <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest ml-1">Número EPAO (Clínicas)</label>
                              <div className="relative group">
                                <Award className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-[var(--accent)] transition-colors" style={{ '--accent': accentColor } as React.CSSProperties} />
                                <input
                                  type="text"
                                  name="epao"
                                  value={formData.epao}
                                  onChange={handleChange}
                                  placeholder="EPAO-1234"
                                  className="w-full pl-11 pr-4 py-3 sm:py-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/20 dark:bg-zinc-800/10 focus:ring-2 outline-none transition-all text-sm font-semibold text-text-primary focus:border-transparent"
                                  style={{ '--tw-ring-color': accentColor } as React.CSSProperties}
                                />
                              </div>
                            </div>
                            
                            <div className="space-y-2">
                              <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest ml-1">Responsável Técnico</label>
                              <div className="relative group">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-[var(--accent)] transition-colors" style={{ '--accent': accentColor } as React.CSSProperties} />
                                <input
                                  type="text"
                                  name="responsibleTechnician"
                                  value={formData.responsibleTechnician}
                                  onChange={handleChange}
                                  placeholder="Nome do Responsável Técnico"
                                  className="w-full pl-11 pr-4 py-3 sm:py-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/20 dark:bg-zinc-800/10 focus:ring-2 outline-none transition-all text-sm font-semibold text-text-primary focus:border-transparent"
                                  style={{ '--tw-ring-color': accentColor } as React.CSSProperties}
                                />
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Submit Actions Button */}
                    <div className="pt-6 border-t border-zinc-150 dark:border-zinc-800/80 flex justify-end">
                      <button
                        type="submit"
                        disabled={saving}
                        className="w-full sm:w-auto px-8 py-3.5 rounded-2xl font-black uppercase tracking-wider text-xs transition-all flex items-center justify-center gap-3 disabled:opacity-50 active:scale-[0.98] shadow-md hover:brightness-105 cursor-pointer text-white"
                        style={{ backgroundColor: accentColor }}
                      >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        {saving ? 'Gravando...' : 'Salvar Alterações'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* ----------------- TAB: VISUAL APPEARANCE ----------------- */}
              {activeTab === 'appearance' && (
                <div className="space-y-6">
                  
                  {/* Theme Color Configuration Card */}
                  <div className="bg-surface rounded-[32px] border border-zinc-200 dark:border-zinc-800 shadow-premium overflow-hidden glass">
                    <div className="p-6 sm:p-8 border-b border-zinc-150 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 flex items-center justify-between">
                      <div>
                        <h2 className="text-xl font-black text-text-primary tracking-tight">Cores & Paleta Visual</h2>
                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">Selecione o tom que melhor representa sua clínica</p>
                      </div>
                      <div 
                        className="w-10 h-10 rounded-xl flex items-center justify-center border shadow-sm transition-transform shrink-0"
                        style={{ color: accentColor, borderColor: `${accentColor}22`, backgroundColor: `${accentColor}11` }}
                      >
                        <Palette className="w-5 h-5" />
                      </div>
                    </div>

                    <div className="p-6 sm:p-8 space-y-8">
                      {/* Presets Grid */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-zinc-400" />
                          <h3 className="text-xs font-black uppercase tracking-wider text-zinc-450 dark:text-zinc-400">Presets Premium</h3>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                          {COLOR_PRESETS.map((preset) => {
                            const isPresetActive = accentColor.toLowerCase() === preset.value.toLowerCase();
                            return (
                              <button
                                key={preset.id}
                                onClick={() => {
                                  setAccentColor(preset.value);
                                  setColorInput(preset.value);
                                }}
                                className={`p-4 rounded-2xl border text-left flex items-start gap-3 transition-all duration-300 group relative overflow-hidden cursor-pointer ${
                                  isPresetActive 
                                  ? 'border-indigo-200 dark:border-indigo-800 shadow-md' 
                                  : 'border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/20 dark:bg-zinc-900/10 hover:border-zinc-350 dark:hover:border-zinc-700 hover:shadow-sm'
                                }`}
                                style={isPresetActive ? { backgroundColor: `${preset.value}05` } : {}}
                              >
                                <div 
                                  className="w-9 h-9 rounded-xl flex items-center justify-center shadow-sm shrink-0 transition-transform duration-300 group-hover:scale-105 text-white"
                                  style={{ backgroundColor: preset.value }}
                                >
                                  {isPresetActive && <Check className="w-4.5 h-4.5 stroke-[3]" />}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-black text-text-primary tracking-tight leading-tight">{preset.label}</p>
                                  <p className="text-[9px] font-medium text-zinc-400 dark:text-zinc-500 mt-1 leading-snug">{preset.desc}</p>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Custom Hex Selector Form */}
                      <div className="pt-6 border-t border-zinc-100 dark:border-zinc-800/80 space-y-4">
                        <div className="flex items-center gap-2">
                          <Palette className="w-4 h-4 text-zinc-400" />
                          <h3 className="text-xs font-black uppercase tracking-wider text-zinc-450 dark:text-zinc-400">Cor Personalizada (Hexadecimal)</h3>
                        </div>
                        
                        <form onSubmit={handleColorSubmit} className="flex flex-col sm:flex-row gap-4">
                          <div className="flex-1 flex gap-3">
                            <div className="relative group shrink-0">
                              <div 
                                className="w-12 h-12 rounded-xl border border-zinc-250 dark:border-zinc-700 shadow-sm transition-transform group-hover:scale-105 cursor-pointer" 
                                style={{ backgroundColor: accentColor }}
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
                              className="flex-1 px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/30 dark:bg-zinc-800/20 outline-none transition-all text-sm font-mono font-bold lowercase focus:ring-2 focus:border-transparent"
                              style={{ '--tw-ring-color': accentColor } as React.CSSProperties}
                            />
                          </div>
                          
                          <div className="flex gap-2.5">
                            <button
                              type="submit"
                              className="px-6 py-3 rounded-xl font-black text-xs uppercase tracking-wider hover:brightness-105 active:scale-95 transition-all text-white cursor-pointer"
                              style={{ backgroundColor: accentColor }}
                            >
                              Aplicar
                            </button>
                            
                            <button
                              type="button"
                              onClick={() => {
                                setAccentColor('#af571b');
                                setColorInput('#af571b');
                              }}
                              className="p-3 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:text-text-primary rounded-xl hover:shadow-sm active:scale-95 transition-all cursor-pointer"
                              title="Redefinir Cor Padrão"
                            >
                              <RotateCcw className="w-5 h-5" />
                            </button>
                          </div>
                        </form>

                        {/* Recent colors history */}
                        {colorHistory.length > 0 && (
                          <div className="pt-3">
                            <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-3 ml-0.5">Utilizadas Recentemente</p>
                            <div className="flex flex-wrap gap-2.5">
                              {colorHistory.map((color, i) => (
                                <button
                                  key={`${color}-${i}`}
                                  type="button"
                                  onClick={() => {
                                    setAccentColor(color);
                                    setColorInput(color);
                                  }}
                                  className="w-8 h-8 rounded-lg border border-zinc-200 dark:border-zinc-750 shadow-sm transition-all hover:scale-110 active:scale-90 cursor-pointer"
                                  style={{ backgroundColor: color }}
                                  title={color}
                                />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Logo Customized Banner Card */}
                  <div className="bg-surface rounded-[32px] border border-zinc-200 dark:border-zinc-800 shadow-premium overflow-hidden glass">
                    <div className="p-6 sm:p-8 border-b border-zinc-150 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 flex items-center justify-between">
                      <div>
                        <h2 className="text-xl font-black text-text-primary tracking-tight">Logomarca do Aplicativo</h2>
                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">Insira seu logotipo e personalize o cabeçalho</p>
                      </div>
                      <div 
                        className="w-10 h-10 rounded-xl flex items-center justify-center border shadow-sm transition-transform shrink-0"
                        style={{ color: accentColor, borderColor: `${accentColor}22`, backgroundColor: `${accentColor}11` }}
                      >
                        <ImageIcon className="w-5 h-5" />
                      </div>
                    </div>

                    <div className="p-6 sm:p-8">
                      <div className="flex flex-col md:flex-row items-center gap-6 p-5 rounded-2xl bg-zinc-50/30 dark:bg-zinc-900/20 border border-zinc-200 dark:border-zinc-800">
                        {/* Mockup Card Design showing Tooth / Custom Logo */}
                        <div 
                          className="w-24 h-24 rounded-2xl border border-zinc-200 dark:border-zinc-750 flex items-center justify-center overflow-hidden shadow-md shrink-0 bg-white"
                        >
                          <img 
                            src={customLogo || "/icon.png"} 
                            alt="Logo" 
                            className="w-full h-full object-contain p-2" 
                          />
                        </div>
                        
                        <div className="flex-1 space-y-4 text-center md:text-left">
                          <div className="space-y-1">
                            <h4 className="text-sm font-black text-text-primary">Marca Integrada no Cabeçalho</h4>
                            <p className="text-xs font-semibold text-text-secondary leading-relaxed">
                              Substitua a logomarca do OdontoAdmin pelo seu próprio logotipo corporativo. Ele será exibido na barra de navegação principal. Formato recomendado: **PNG transparente de 512x512px**.
                            </p>
                          </div>
                          
                          <div className="flex flex-wrap justify-center md:justify-start gap-3">
                            <label className="flex items-center gap-2 px-5 py-2.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl font-black text-[10px] uppercase tracking-widest cursor-pointer hover:opacity-90 active:scale-95 shadow-sm transition-all shrink-0">
                              {logoUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                              {logoUploading ? 'Enviando...' : 'Fazer Upload'}
                              <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={logoUploading} />
                            </label>
                            
                            <button
                              type="button"
                              onClick={() => setCustomLogo(null)}
                              className="flex items-center gap-2 px-5 py-2.5 bg-surface dark:bg-zinc-900/50 text-zinc-500 hover:text-text-primary border border-zinc-200 dark:border-zinc-700 rounded-xl font-black text-[10px] uppercase tracking-widest hover:shadow-sm active:scale-95 transition-all cursor-pointer shrink-0"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              Restaurar Padrão
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              )}

              {/* ----------------- TAB: PASSWORD SECURITY ----------------- */}
              {activeTab === 'security' && (
                <div className="bg-surface rounded-[32px] border border-zinc-200 dark:border-zinc-800 shadow-premium overflow-hidden glass">
                  <div className="p-6 sm:p-8 border-b border-zinc-150 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-black text-text-primary tracking-tight">Segurança da Conta</h2>
                      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">Controle de credenciais de acesso</p>
                    </div>
                    <div 
                      className="w-10 h-10 rounded-xl flex items-center justify-center border shadow-sm transition-transform shrink-0"
                      style={{ color: accentColor, borderColor: `${accentColor}22`, backgroundColor: `${accentColor}11` }}
                    >
                      <Lock className="w-5 h-5" />
                    </div>
                  </div>

                  <div className="p-6 sm:p-8">
                    {isGoogleUser ? (
                      /* SSO Auth Modern Badge Panel */
                      <div className="p-6 sm:p-8 rounded-2xl bg-zinc-50/30 dark:bg-zinc-900/20 border border-zinc-200 dark:border-zinc-800 text-center max-w-xl mx-auto space-y-5">
                        <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mx-auto shadow-sm">
                          <ShieldCheck className="w-7 h-7" />
                        </div>
                        <div className="space-y-2">
                          <h3 className="text-base font-black text-text-primary">Autenticação SSO via Google</h3>
                          <p className="text-xs font-semibold text-text-secondary leading-relaxed">
                            Sua conta está vinculada e protegida com as credenciais do Google Login. 
                          </p>
                          <p className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500 leading-relaxed max-w-md mx-auto">
                            Por utilizar este provedor de login integrado de alta segurança, sua senha é gerenciada diretamente pela Google. Não há necessidade de alteração de senha local no OdontoAdmin.
                          </p>
                        </div>
                        
                        <div className="pt-2">
                          <a 
                            href="https://myaccount.google.com/security" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-6 py-2.5 bg-zinc-900 dark:bg-zinc-100 hover:opacity-90 active:scale-95 text-white dark:text-zinc-900 text-[10px] font-black uppercase tracking-wider rounded-xl shadow-sm transition-all"
                          >
                            <ShieldCheck className="w-4 h-4" />
                            Segurança da Conta Google
                          </a>
                        </div>
                      </div>
                    ) : (
                      /* Standard Password Configuration Form */
                      <form onSubmit={handlePasswordChange} className="space-y-6 max-w-xl mx-auto">
                        <div className="space-y-4">
                          
                          <div className="space-y-2">
                            <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest ml-1">Senha Atual</label>
                            <div className="relative group">
                              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-[var(--accent)] transition-colors" style={{ '--accent': accentColor } as React.CSSProperties} />
                              <input
                                type={showCurrentPassword ? 'text' : 'password'}
                                value={passwordData.currentPassword}
                                onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                                className="w-full pl-11 pr-12 py-3 sm:py-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/20 dark:bg-zinc-800/10 focus:ring-2 outline-none transition-all text-sm font-semibold text-text-primary focus:border-transparent"
                                style={{ '--tw-ring-color': accentColor } as React.CSSProperties}
                                required
                              />
                              <button
                                type="button"
                                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-text-primary focus:outline-none cursor-pointer"
                              >
                                {showCurrentPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                              </button>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest ml-1">Nova Senha</label>
                            <div className="relative group">
                              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-[var(--accent)] transition-colors" style={{ '--accent': accentColor } as React.CSSProperties} />
                              <input
                                type={showNewPassword ? 'text' : 'password'}
                                value={passwordData.newPassword}
                                onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                                className="w-full pl-11 pr-12 py-3 sm:py-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/20 dark:bg-zinc-800/10 focus:ring-2 outline-none transition-all text-sm font-semibold text-text-primary focus:border-transparent"
                                style={{ '--tw-ring-color': accentColor } as React.CSSProperties}
                                required
                              />
                              <button
                                type="button"
                                onClick={() => setShowNewPassword(!showNewPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-text-primary focus:outline-none cursor-pointer"
                              >
                                {showNewPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                              </button>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest ml-1">Confirmar Nova Senha</label>
                            <div className="relative group">
                              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-[var(--accent)] transition-colors" style={{ '--accent': accentColor } as React.CSSProperties} />
                              <input
                                type={showConfirmPassword ? 'text' : 'password'}
                                value={passwordData.confirmNewPassword}
                                onChange={(e) => setPasswordData(prev => ({ ...prev, confirmNewPassword: e.target.value }))}
                                className="w-full pl-11 pr-12 py-3 sm:py-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/20 dark:bg-zinc-800/10 focus:ring-2 outline-none transition-all text-sm font-semibold text-text-primary focus:border-transparent"
                                style={{ '--tw-ring-color': accentColor } as React.CSSProperties}
                                required
                              />
                              <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-text-primary focus:outline-none cursor-pointer"
                              >
                                {showConfirmPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="pt-4 flex justify-end">
                          <button
                            type="submit"
                            disabled={passwordSaving}
                            className="w-full sm:w-auto px-8 py-3.5 rounded-2xl font-black uppercase tracking-wider text-xs transition-all flex items-center justify-center gap-3 disabled:opacity-50 active:scale-[0.98] shadow-md hover:brightness-105 cursor-pointer text-white"
                            style={{ backgroundColor: accentColor }}
                          >
                            {passwordSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                            {passwordSaving ? 'Salvando...' : 'Salvar Nova Senha'}
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                </div>
              )}

              {/* ----------------- TAB: DATA STORAGE & BACKUP ----------------- */}
              {activeTab === 'storage' && (
                <div className="bg-surface rounded-[32px] border border-zinc-200 dark:border-zinc-800 shadow-premium overflow-hidden glass">
                  <div className="p-6 sm:p-8 border-b border-zinc-150 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-black text-text-primary tracking-tight">Armazenamento & Nuvem</h2>
                      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">Configuração de sincronização e backups secundários</p>
                    </div>
                    <div 
                      className="w-10 h-10 rounded-xl flex items-center justify-center border shadow-sm transition-transform shrink-0"
                      style={{ color: accentColor, borderColor: `${accentColor}22`, backgroundColor: `${accentColor}11` }}
                    >
                      <HardDrive className="w-5 h-5" />
                    </div>
                  </div>

                  <div className="p-6 sm:p-8 space-y-8">
                    
                    {/* Database Cloud Panel Indicators */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      
                      {/* Firebase Indicator Card */}
                      <div className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/30 dark:bg-zinc-900/20 space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-150 dark:border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400">
                              <Database className="w-5 h-5" />
                            </div>
                            <div>
                              <h4 className="text-xs font-black text-text-primary">Banco de Dados principal</h4>
                              <p className="text-[9px] font-bold text-zinc-450 dark:text-zinc-500 uppercase tracking-widest leading-none mt-1">Firebase Cloud</p>
                            </div>
                          </div>
                          
                          <span className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-full text-[9px] font-black uppercase tracking-wider border border-emerald-100 dark:border-emerald-850 animate-pulse">
                            <CheckCircle className="w-3 h-3" />
                            Ativo
                          </span>
                        </div>
                        <p className="text-[11px] font-semibold text-text-secondary leading-relaxed">
                          Seu prontuário, ficha de pacientes, agenda e movimentações financeiras estão armazenados na rede segura e replicados globalmente.
                        </p>
                      </div>

                      {/* Google Drive Connection Card */}
                      <div className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/30 dark:bg-zinc-900/20 space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-150 dark:border-indigo-500/20 flex items-center justify-center text-indigo-650 dark:text-indigo-400">
                              <CloudLightning className="w-5 h-5" />
                            </div>
                            <div>
                              <h4 className="text-xs font-black text-text-primary">Nuvem de Segurança</h4>
                              <p className="text-[9px] font-bold text-zinc-450 dark:text-zinc-500 uppercase tracking-widest leading-none mt-1">Google Drive</p>
                            </div>
                          </div>
                          
                          {storageLocation === 'drive' ? (
                            <span className="flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-full text-[9px] font-black uppercase tracking-wider border border-indigo-100 dark:border-indigo-850">
                              <CheckCircle className="w-3 h-3" />
                              Conectado
                            </span>
                          ) : (
                            <span className="flex items-center gap-1.5 px-2.5 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-450 dark:text-zinc-500 rounded-full text-[9px] font-black uppercase tracking-wider border border-zinc-200 dark:border-zinc-750">
                              Offline
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] font-semibold text-text-secondary leading-relaxed">
                          Habilite backups secundários em seu próprio Google Drive pessoal para garantir a integridade absoluta dos seus relatórios de clínica.
                        </p>
                      </div>
                    </div>

                    {/* Environment Toggle Select */}
                    <div className="pt-6 border-t border-zinc-100 dark:border-zinc-800/80 space-y-4">
                      <div className="space-y-2 max-w-md">
                        <label className="text-[9px] font-black text-zinc-450 dark:text-zinc-400 uppercase tracking-widest ml-1">Ambiente Ativo de Armazenamento</label>
                        <div className="relative">
                          <select
                            value={storageLocation}
                            onChange={handleStorageChange}
                            disabled={isAuthenticatingDrive}
                            className="w-full pl-4 pr-10 py-3 sm:py-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/25 dark:bg-zinc-800/10 focus:ring-2 outline-none transition-all text-sm font-semibold text-text-primary focus:border-transparent appearance-none cursor-pointer disabled:opacity-50"
                            style={{ '--tw-ring-color': accentColor } as React.CSSProperties}
                          >
                            <option value="firebase">Firebase (Cloud Padrão do Sistema)</option>
                            <option value="drive">Google Drive Personal (Sua Conta Google)</option>
                          </select>
                          <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-zinc-400">
                            {isAuthenticatingDrive ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Google Drive Action Backups Grid with AnimatePresence */}
                      <AnimatePresence>
                        {storageLocation === 'drive' && (
                          <motion.div 
                            initial={{ opacity: 0, scale: 0.98, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.98, y: 10 }}
                            className="p-5 rounded-2xl bg-indigo-50/20 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-800/30 space-y-4 mt-4"
                          >
                            <div className="flex gap-2">
                              <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: accentColor }} />
                              <p className="text-xs font-semibold text-text-primary leading-relaxed">
                                Você está conectado à pasta remota **DentalApp_Data** em sua conta do Google Drive. Utilize os botões abaixo para sincronizar seus dados manualmente:
                              </p>
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
                              <button
                                onClick={handleBackup}
                                disabled={isBackingUp || isRestoring}
                                className="flex items-center justify-center gap-2 px-5 py-3 bg-zinc-950 dark:bg-zinc-100 hover:opacity-90 active:scale-95 text-white dark:text-zinc-900 text-xs font-black uppercase tracking-wider rounded-xl transition-all disabled:opacity-50 cursor-pointer shadow-sm"
                              >
                                {isBackingUp ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                                Gerar Backup no Drive
                              </button>
                              
                              <button
                                onClick={handleRestore}
                                disabled={isBackingUp || isRestoring}
                                className="flex items-center justify-center gap-2 px-5 py-3 bg-white dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/40 text-xs font-black uppercase tracking-wider rounded-xl transition-all disabled:opacity-50 active:scale-95 cursor-pointer shadow-xs"
                              >
                                {isRestoring ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                                Restaurar do Drive
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {storageLocation === 'firebase' && (
                        <div className="p-4 rounded-2xl bg-emerald-50/20 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-850/55 mt-4">
                          <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 leading-relaxed flex items-center gap-2.5">
                            <CheckCircle className="w-4 h-4 shrink-0 stroke-[2.5]" />
                            Seus dados clínicos estão altamente protegidos, replicados em múltiplos servidores na nuvem e sincronizados em tempo real. Sinta-se seguro.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </div>

      </div>
      
      {cropperImageSrc && (
        <ImageCropperModal
          isOpen={isCropperOpen}
          onClose={() => {
            setIsCropperOpen(false);
            setCropperImageSrc(null);
          }}
          imageSrc={cropperImageSrc}
          onCropComplete={handleCropComplete}
          accentColor={accentColor}
        />
      )}
    </div>
  );
};
