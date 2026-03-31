import React, { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion } from 'motion/react';
import { Logo } from '../components/Logo';
import { useNavigate } from 'react-router-dom';
import { Loader2, Mail, Eye, EyeOff } from 'lucide-react';

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

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-surface rounded-3xl shadow-xl p-8 text-center"
      >
        <div className="flex justify-center mb-8">
          <Logo className="flex-col !gap-4" />
        </div>
        <p className="text-text-secondary mb-8">
          Gestão inteligente para o seu consultório odontológico.
        </p>

        <form onSubmit={(e) => {
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
        }} className="flex flex-col gap-4 mb-6">
          {isSignUp && (
            <>
              <input
                type="text"
                placeholder="Nome completo"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent focus:ring-2 focus:ring-indigo-500 outline-none"
                required
              />
              <input
                type="date"
                placeholder="Data de nascimento"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent focus:ring-2 focus:ring-indigo-500 outline-none"
                required
              />
              <input
                type="tel"
                placeholder="Celular"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent focus:ring-2 focus:ring-indigo-500 outline-none"
                required
              />
              <input
                type="text"
                placeholder="CRO (Opcional)"
                value={cro}
                onChange={(e) => setCro(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </>
          )}
          <input
            type="email"
            placeholder="E-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent focus:ring-2 focus:ring-indigo-500 outline-none"
            required
          />
          <div className="flex flex-col gap-1 w-full">
            <div className="relative w-full">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent focus:ring-2 focus:ring-indigo-500 outline-none pr-12"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {isSignUp && (
              <div className="relative w-full mt-3">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirme a senha"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent focus:ring-2 focus:ring-indigo-500 outline-none pr-12"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                >
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            )}
            {!isSignUp && (
              <div className="flex items-center justify-between mt-1 px-1">
                <label className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500 bg-transparent"
                  />
                  Lembrar de mim
                </label>
                <button
                  type="button"
                  onClick={() => {
                    if (!email) {
                      alert('Por favor, preencha o campo de e-mail primeiro para recuperar a senha.');
                      return;
                    }
                    resetPassword(email);
                  }}
                  className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  Esqueci minha senha
                </button>
              </div>
            )}
          </div>
          <button
            type="submit"
            disabled={isSigningIn}
            className="w-full flex items-center justify-center gap-3 bg-indigo-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {isSigningIn ? <Loader2 className="w-5 h-5 animate-spin" /> : (isSignUp ? 'Criar Conta' : 'Entrar com E-mail')}
          </button>
          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            {isSignUp ? 'Já tem uma conta? Entre aqui' : 'Não tem conta? Crie uma'}
          </button>
        </form>

        <div className="relative flex items-center py-2 mb-6">
          <div className="flex-grow border-t border-zinc-200 dark:border-zinc-700"></div>
          <span className="flex-shrink-0 mx-4 text-zinc-400 text-sm">ou continue com</span>
          <div className="flex-grow border-t border-zinc-200 dark:border-zinc-700"></div>
        </div>
        
        <div className="flex flex-col gap-3">
          <button
            onClick={signIn}
            disabled={isSigningIn}
            className="w-full flex items-center justify-center gap-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-6 py-3 rounded-xl font-medium hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors disabled:opacity-50"
          >
            {isSigningIn ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" referrerPolicy="no-referrer" />
                Google
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
