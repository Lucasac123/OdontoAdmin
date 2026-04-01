import React, { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { Logo } from '../components/Logo';
import { useNavigate } from 'react-router-dom';
import { Loader2, Mail, Eye, EyeOff, User, Phone, Calendar, Award, LogIn, Sparkles, ShieldCheck, Zap } from 'lucide-react';

export const Login: React.FC = () => {
  const { signIn, signInWithEmail, signUpWithEmail, resetPassword, user, isSigningIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [name, setName] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [birthDate, setBirthDate] = React.useState('');
  const [cro, setCro] = React.useState('');
  const [rememberMe, setRememberMe] = React.useState(true);
  const [isSignUp, setIsSignUp] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSignUp) {
      if (password !== confirmPassword) {
        alert('As senhas não coincidem!');
        return;
      }
      signUpWithEmail(email, password, name, phone, birthDate, cro);
    } else {
      signInWithEmail(email, password, rememberMe);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-6 relative overflow-hidden selection:bg-indigo-500/30">
      {/* Abstract Background Ornaments */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/10 blur-[120px] rounded-full animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/5 blur-[120px] rounded-full animate-pulse delay-700" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full opacity-10 dark:opacity-20 pointer-events-none">
         <div className="w-full h-full bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#1f2937_1px,transparent_1px)] [background-size:32px_32px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="max-w-2xl w-full bg-surface rounded-[48px] shadow-2xl border border-zinc-200/50 dark:border-zinc-800/50 p-10 md:p-16 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-bl-[120px] pointer-events-none" />
        
        <div className="relative z-10 flex flex-col items-center">
          <div className="mb-12 transition-transform hover:scale-105 duration-500">
            <Logo className="flex-col !gap-6 scale-125" />
          </div>

          <div className="text-center mb-12">
             <h2 className="text-3xl font-black text-text-primary uppercase tracking-tighter mb-2">Acesso Restrito</h2>
             <p className="text-[10px] font-black uppercase tracking-[0.3em] text-text-secondary flex items-center justify-center gap-2">
                <ShieldCheck size={14} className="text-indigo-500" /> Sistema de Gestão Odontológica Clinic-Ready
             </p>
          </div>

          <form onSubmit={handleSubmit} className="w-full space-y-6">
            <AnimatePresence mode="wait">
              {isSignUp && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="grid grid-cols-1 md:grid-cols-2 gap-4"
                >
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-text-secondary uppercase tracking-widest ml-1">Nome Completo</label>
                    <div className="relative group">
                       <User size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-indigo-500 transition-colors" />
                       <input type="text" value={name} onChange={e => setName(e.target.value)} required className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl pl-12 pr-4 py-4 text-xs font-black uppercase tracking-widest focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all shadow-inner" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-text-secondary uppercase tracking-widest ml-1">CRO Registro</label>
                    <div className="relative group">
                       <Award size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-indigo-500 transition-colors" />
                       <input type="text" value={cro} onChange={e => setCro(e.target.value)} placeholder="OPCIONAL" className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl pl-12 pr-4 py-4 text-xs font-black uppercase tracking-widest focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all shadow-inner" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-text-secondary uppercase tracking-widest ml-1">WhatsApp</label>
                    <div className="relative group">
                       <Phone size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-indigo-500 transition-colors" />
                       <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} required className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl pl-12 pr-4 py-4 text-xs font-black outline-none transition-all shadow-inner" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-text-secondary uppercase tracking-widest ml-1">Nascimento</label>
                    <div className="relative group">
                       <Calendar size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-indigo-500 transition-colors" />
                       <input type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)} required className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl pl-12 pr-4 py-4 text-xs font-black outline-none transition-all shadow-inner" />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-2">
              <label className="text-[9px] font-black text-text-secondary uppercase tracking-widest ml-1">E-mail Profissional</label>
              <div className="relative group">
                 <Mail size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-indigo-500 transition-colors" />
                 <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl pl-12 pr-4 py-4 text-xs font-black uppercase tracking-widest outline-none transition-all shadow-inner" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[9px] font-black text-text-secondary uppercase tracking-widest ml-1">Senha de Acesso</label>
              <div className="relative group">
                 <Lock size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-indigo-500 transition-colors" />
                 <input type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} required className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl pl-12 pr-14 py-4 text-xs font-black outline-none shadow-inner" />
                 <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-zinc-400 hover:text-indigo-500 transition-colors">
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                 </button>
              </div>
            </div>

            {isSignUp && (
              <div className="space-y-2">
                <label className="text-[9px] font-black text-text-secondary uppercase tracking-widest ml-1">Confirmar Senha</label>
                <div className="relative group">
                   <Lock size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-indigo-500 transition-colors" />
                   <input type={showConfirmPassword ? "text" : "password"} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl pl-12 pr-14 py-4 text-xs font-black outline-none shadow-inner" />
                   <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-zinc-400 hover:text-indigo-500 transition-colors">
                      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                   </button>
                </div>
              </div>
            )}

            {!isSignUp && (
              <div className="flex items-center justify-between px-2">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${rememberMe ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-zinc-200 group-hover:border-indigo-500'}`}>
                     {rememberMe && <CheckCircle2 size={12} className="stroke-[4px]" />}
                  </div>
                  <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} className="hidden" />
                  <span className="text-[10px] font-black uppercase text-text-secondary tracking-widest group-hover:text-text-primary transition-colors">Lembrar acesso</span>
                </label>
                <button type="button" onClick={() => email ? resetPassword(email) : alert('Preencha o e-mail')} className="text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-700 hover:underline">Esqueci a senha</button>
              </div>
            )}

            <div className="pt-6">
               <button
                 type="submit"
                 disabled={isSigningIn}
                 className="w-full bg-indigo-600 text-white py-5 rounded-[28px] font-black uppercase tracking-[0.2em] text-xs hover:bg-indigo-700 shadow-2xl shadow-indigo-500/30 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3"
               >
                 {isSigningIn ? <Loader2 size={18} className="animate-spin" /> : <Zap size={18} />}
                 {isSigningIn ? 'AUTENTICANDO...' : (isSignUp ? 'FINALIZAR CADASTRO' : 'INICIAR SESSÃO')}
               </button>
            </div>
          </form>

          <div className="mt-8 flex flex-col items-center gap-6 w-full">
             <div className="relative w-full flex items-center justify-center">
                <div className="absolute inset-0 flex items-center px-4"><div className="w-full border-t border-zinc-100 dark:border-zinc-800" /></div>
                <span className="relative bg-surface px-4 text-[9px] font-black text-text-secondary uppercase tracking-[0.4em]">Ou Conectar Via</span>
             </div>
             
             <div className="flex gap-4 w-full">
                <button
                  type="button"
                  onClick={signIn}
                  disabled={isSigningIn}
                  className="flex-1 flex items-center justify-center gap-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 py-4 rounded-3xl hover:bg-zinc-50 dark:hover:bg-zinc-800/80 transition-all shadow-sm active:scale-95"
                >
                  <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Google Identity</span>
                </button>
             </div>

             <button
               type="button"
               onClick={() => setIsSignUp(!isSignUp)}
               className="mt-6 text-[10px] font-black uppercase tracking-widest text-text-secondary hover:text-indigo-600 transition-all border-b border-transparent hover:border-indigo-600 pb-1"
             >
               {isSignUp ? 'Já possui conta? Acessar agora' : 'Não possui cadastro? Criar ID Clínica'}
             </button>
          </div>
        </div>
      </motion.div>

      {/* Footer Branding */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-30 select-none">
         <p className="text-[9px] font-black uppercase tracking-[0.5em] text-text-secondary">OdontoAdmin Ecosystem</p>
         <div className="w-1 h-1 rounded-full bg-indigo-500" />
      </div>
    </div>
  );
};

const CheckCircle2 = ({ size, className }: any) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

export default Login;
