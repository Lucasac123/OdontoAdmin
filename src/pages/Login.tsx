import React, { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion } from 'motion/react';
import { Logo } from '../components/Logo';
import { useNavigate } from 'react-router-dom';

export const Login: React.FC = () => {
  const { signIn, user } = useAuth();
  const navigate = useNavigate();

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
        
        <button
          onClick={signIn}
          className="w-full flex items-center justify-center gap-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-6 py-4 rounded-xl font-medium hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
          Entrar com Google
        </button>
      </motion.div>
    </div>
  );
};
