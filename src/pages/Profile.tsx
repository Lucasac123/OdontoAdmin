import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { updateProfile, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { motion, AnimatePresence } from 'motion/react';
import { User, Mail, Phone, Calendar, Award, Save, Loader2, Camera, Lock, ShieldCheck, Zap, LogOut, ExternalLink } from 'lucide-react';
import { storage } from '../firebase';

export const Profile: React.FC = () => {
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    birthDate: '',
    cro: ''
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: ''
  });

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
            cro: data.cro || ''
          });
        } else {
          setFormData(prev => ({
            ...prev,
            name: user.displayName || '',
            email: user.email || ''
          }));
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
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
    setSaving(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        name: formData.name,
        phone: formData.phone,
        birthDate: formData.birthDate,
        cro: formData.cro
      });
      alert('Perfil atualizado com sucesso!');
    } catch (error) {
      console.error("Error updating profile:", error);
      alert('Erro ao atualizar perfil.');
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
    setPasswordSaving(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, passwordData.currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, passwordData.newPassword);
      alert('Senha atualizada com sucesso!');
      setPasswordData({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
    } catch (error) {
      console.error("Error updating password:", error);
      alert('Erro ao atualizar senha.');
    } finally {
      setPasswordSaving(false);
    }
  };

  const isGoogleUser = user?.providerData.some(p => p.providerId === 'google.com');

  return (
    <div className="space-y-8 flex flex-col h-full bg-zinc-50/20 p-2 md:p-6 rounded-[48px]">
      {/* Header Premium */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-12 shrink-0 px-4">
        <div>
          <h1 className="text-6xl font-black text-text-primary tracking-tighter uppercase leading-none">Perfil</h1>
          <p className="text-text-secondary mt-4 font-medium uppercase tracking-[0.3em] text-[10px] flex items-center gap-2">
            <User size={14} className="text-indigo-500 fill-indigo-500/20" /> GESTÃO DE IDENTIDADE E CONFIGURAÇÕES
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 lg:px-4 pb-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-7xl mx-auto items-start">
          
          {/* Avatar & Identidade */}
          <div className="lg:col-span-4 space-y-6">
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="bg-surface rounded-[40px] border border-zinc-200/50 dark:border-zinc-800 p-10 text-center relative overflow-hidden shadow-sm">
               <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-bl-[80px] -mr-8 -mt-8" />
               
               <div className="relative z-10">
                  <div className="relative inline-block">
                    <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-[48px] bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center border-8 border-white dark:border-zinc-950 shadow-2xl overflow-hidden transition-transform hover:scale-105 duration-500 mx-auto">
                       {user?.photoURL ? (
                         <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
                       ) : (
                         <User className="w-16 h-16 text-indigo-400" />
                       )}
                    </div>
                    <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl border-4 border-white dark:border-zinc-950">
                       <Award size={24} />
                    </div>
                  </div>

                  <div className="mt-8">
                     <h2 className="text-2xl font-black text-text-primary tracking-tight uppercase">{formData.name || 'PROFISSIONAL'}</h2>
                     <span className="inline-flex px-4 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-widest mt-3">
                        {formData.cro ? `CRO: ${formData.cro}` : 'CIRURGIÃO DENTISTA'}
                     </span>
                  </div>

                  <div className="mt-10 pt-10 border-t border-zinc-100 dark:border-zinc-800 space-y-6">
                     <div className="flex items-center gap-4 text-left">
                        <div className="w-12 h-12 rounded-2xl bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center text-zinc-400 shrink-0"><Mail size={18} /></div>
                        <div className="min-w-0">
                           <p className="text-[9px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-1">E-mail Principal</p>
                           <p className="text-xs font-bold text-text-primary truncate">{formData.email}</p>
                        </div>
                     </div>
                     <div className="flex items-center gap-4 text-left">
                        <div className="w-12 h-12 rounded-2xl bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center text-zinc-400 shrink-0"><Phone size={18} /></div>
                        <div className="min-w-0">
                           <p className="text-[9px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-1">Contato Ativo</p>
                           <p className="text-xs font-bold text-text-primary">{formData.phone || 'NÃO CONFIGURADO'}</p>
                        </div>
                     </div>
                  </div>
               </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="bg-indigo-600 rounded-[40px] p-10 text-white shadow-2xl shadow-indigo-500/20 relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-bl-[80px] -mr-8 -mt-8" />
               <div className="relative z-10 flex flex-col items-start">
                  <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center mb-6"><ShieldCheck size={20} /></div>
                  <h3 className="text-lg font-black uppercase tracking-widest mb-2">Conta Verificada</h3>
                  <p className="text-indigo-100 text-[10px] font-medium leading-relaxed uppercase tracking-widest">VOCÊ TEM ACESSO TOTAL AO <span className="font-black">MODO PREMIUM</span> DO ODONTOADMIN.</p>
               </div>
            </motion.div>
          </div>

          {/* Formulários de Edição */}
          <div className="lg:col-span-8 flex flex-col gap-8">
             {/* Info Form */}
             <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-surface rounded-[48px] border border-zinc-200/50 dark:border-zinc-800 p-8 sm:p-12 shadow-sm overflow-hidden relative">
                <div className="absolute top-0 right-0 w-40 h-40 bg-zinc-500/5 rounded-bl-[100px] pointer-events-none" />
                <h3 className="text-2xl font-black text-text-primary uppercase tracking-tight mb-10 pb-6 border-b border-zinc-100 dark:border-zinc-800">DADOS PROFISSIONAIS</h3>
                
                <form onSubmit={handleSubmit} className="space-y-8">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-2">
                         <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Nome Completo</label>
                         <input type="text" name="name" value={formData.name} onChange={handleChange} className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-900 rounded-[28px] px-8 py-5 text-sm font-black uppercase tracking-widest outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500/50 transition-all shadow-inner" />
                      </div>
                      <div className="space-y-2 opacity-50">
                         <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">E-mail Cadastrado</label>
                         <input type="email" value={formData.email} disabled className="w-full bg-zinc-100 dark:bg-zinc-900 border-none rounded-[28px] px-8 py-5 text-sm font-black uppercase outline-none cursor-not-allowed" />
                      </div>
                      <div className="space-y-2">
                         <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Telefone WhatsApp</label>
                         <input type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="(00) 00000-0000" className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-900 rounded-[28px] px-8 py-5 text-sm font-black outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all shadow-inner" />
                      </div>
                      <div className="space-y-2">
                         <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Registro CRO</label>
                         <input type="text" name="cro" value={formData.cro} onChange={handleChange} placeholder="EX: 123456-SP" className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-900 rounded-[28px] px-8 py-5 text-sm font-black uppercase tracking-widest font-mono outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all shadow-inner" />
                      </div>
                   </div>
                   <button type="submit" disabled={saving} className="w-full md:w-auto px-12 py-5 bg-indigo-600 text-white rounded-[28px] text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 shadow-2xl shadow-indigo-500/20 disabled:opacity-50 active:scale-95 transition-all flex items-center justify-center gap-3">
                      {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                      {saving ? 'PROCESSANDO...' : 'ATUALIZAR PERFIL'}
                   </button>
                </form>
             </motion.div>

             {/* Change Password */}
             {!isGoogleUser && (
               <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-zinc-900 dark:bg-zinc-900 rounded-[48px] p-8 sm:p-12 shadow-2xl relative overflow-hidden">
                  <h3 className="text-2xl font-black text-white uppercase tracking-tight mb-10 pb-6 border-b border-white/10 flex items-center gap-4">
                     <Lock className="text-zinc-500" /> SEGURANÇA E ACESSO
                  </h3>
                  <form onSubmit={handlePasswordChange} className="space-y-6">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                           <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest ml-1">Senha Atual de Confirmação</label>
                           <input type="password" value={passwordData.currentPassword} onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))} className="w-full bg-white/5 border border-white/5 rounded-2xl px-6 py-4 text-white text-sm outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-mono" required />
                        </div>
                        <div className="space-y-2">
                           <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest ml-1">Definir Nova Senha</label>
                           <input type="password" value={passwordData.newPassword} onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))} className="w-full bg-white/5 border border-white/5 rounded-2xl px-6 py-4 text-white text-sm outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-mono" required />
                        </div>
                     </div>
                     <button type="submit" disabled={passwordSaving} className="w-full md:w-auto px-10 py-4 bg-white text-zinc-900 rounded-[24px] text-[10px] font-black uppercase tracking-widest hover:bg-zinc-200 transition-all disabled:opacity-50">
                        {passwordSaving ? 'ATUALIZANDO...' : 'TROCAR SENHA ACESSO'}
                     </button>
                  </form>
               </motion.div>
             )}

             {isGoogleUser && (
                <div className="p-10 rounded-[48px] bg-zinc-100 dark:bg-zinc-900/50 border border-zinc-200/50 border-dashed text-center">
                   <div className="w-16 h-16 rounded-3xl bg-white dark:bg-zinc-800 flex items-center justify-center mx-auto mb-6 shadow-sm"><Zap className="text-zinc-300" /></div>
                   <p className="text-[10px] font-black uppercase text-text-secondary tracking-widest">CONTA VINCULADA AO GOOGLE AUTH</p>
                   <p className="text-[9px] font-medium text-text-secondary mt-2 opacity-50 uppercase tracking-widest">Gerencie suas credenciais de segurança diretamente no Google Account.</p>
                </div>
             )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
