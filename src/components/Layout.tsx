import React from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Logo } from './Logo';
import { GlobalSearch } from './GlobalSearch';
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  DollarSign, 
  BrainCircuit, 
  LogOut, 
  Sun, 
  Moon,
  Menu,
  X,
  Download,
  Trash2,
  Settings
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const SidebarContent = ({ 
  user, 
  theme, 
  setTheme, 
  handleLogout, 
  setIsMobileMenuOpen,
  navItems,
  navigate,
  deferredPrompt,
  handleInstallPWA
}: any) => {
  const [showSettings, setShowSettings] = React.useState(false);

  return (
  <div className="flex flex-col h-full bg-surface border-r border-zinc-200 dark:border-white/5 w-64">
    <div className="p-6 pb-2">
      <Logo />
    </div>
    
    <div className="px-4 mb-2">
      <GlobalSearch variant="sidebar" />
    </div>

    <nav className="flex-1 px-4 space-y-2 mt-2">
      {navItems.map((item: any) => (
        <NavLink
          key={item.to}
          to={item.to}
          onClick={() => setIsMobileMenuOpen(false)}
          className={({ isActive }) =>
            `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
              isActive 
                ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-white border-l-2 border-indigo-500 shadow-sm dark:shadow-none' 
                : 'text-text-secondary hover:text-indigo-600 dark:hover:text-white hover:bg-indigo-50/50 dark:hover:bg-white/5'
            }`
          }
        >
          <item.icon className="w-5 h-5" />
          {item.label}
        </NavLink>
      ))}
    </nav>

    <div className="p-4 border-t border-zinc-200 dark:border-white/5">
      <div className="flex flex-col gap-4 px-2">
        <div className="flex bg-zinc-100 dark:bg-black/20 p-1 rounded-xl relative">
          <motion.div 
            className="absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white dark:bg-zinc-800 rounded-lg shadow-sm"
            initial={false}
            animate={{
              x: theme === 'light' ? '0%' : '100%'
            }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          />
          <button 
            onClick={() => setTheme('light')}
            className={`flex-1 flex items-center justify-center p-2 rounded-lg transition-colors relative z-10 ${theme === 'light' ? 'text-indigo-600 dark:text-white' : 'text-text-secondary hover:text-indigo-600 dark:hover:text-white'}`}
            title="Modo Claro"
          >
            <Sun className="w-4 h-4" />
          </button>
          <button 
            onClick={() => setTheme('dark')}
            className={`flex-1 flex items-center justify-center p-2 rounded-lg transition-colors relative z-10 ${theme === 'dark' ? 'text-indigo-600 dark:text-white' : 'text-text-secondary hover:text-indigo-600 dark:hover:text-white'}`}
            title="Modo Escuro"
          >
            <Moon className="w-4 h-4" />
          </button>
        </div>

        <div className="relative flex items-center gap-2">
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className="flex-1 flex items-center gap-3 p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            {user?.photoURL && (
              <img 
                src={user.photoURL} 
                alt={user.displayName || 'User'} 
                className="w-8 h-8 rounded-full border border-zinc-200 dark:border-white/10"
                referrerPolicy="no-referrer"
              />
            )}
            <span className="text-sm font-medium text-text-primary truncate flex-1 text-left">
              {user?.displayName || user?.email}
            </span>
          </button>
          
          {deferredPrompt && (
            <button
              onClick={handleInstallPWA}
              className="p-2 rounded-xl bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-600/20 transition-all border border-indigo-500/20"
              title="Instalar App"
            >
              <Download className="w-5 h-5" />
            </button>
          )}
          
          <AnimatePresence>
            {showSettings && (
              <motion.div 
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute bottom-full left-0 right-0 mb-2 bg-surface border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-lg overflow-hidden z-50 p-1"
              >
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors text-sm font-medium"
                >
                  <LogOut className="w-4 h-4" />
                  Sair da conta
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  </div>
  );
};

export const Layout: React.FC = () => {
  const { user, logOut, firestoreError } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [deferredPrompt, setDeferredPrompt] = React.useState<any>(null);

  React.useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallPWA = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/patients', icon: Users, label: 'Pacientes' },
    { to: '/agenda', icon: Calendar, label: 'Agenda' },
    { to: '/financial', icon: DollarSign, label: 'Financeiro' },
    { to: '/ai-assistant', icon: BrainCircuit, label: 'IA Assistente' },
    { to: '/trash', icon: Trash2, label: 'Lixeira' },
  ];

  const handleLogout = async () => {
    await logOut();
    navigate('/');
  };

  return (
    <div className="flex h-screen bg-bg overflow-hidden font-sans">
      {/* Desktop Sidebar */}
      <div className="hidden md:block h-full">
        <SidebarContent 
          user={user}
          theme={theme}
          setTheme={setTheme}
          handleLogout={handleLogout}
          setIsMobileMenuOpen={setIsMobileMenuOpen}
          navItems={navItems}
          navigate={navigate}
          deferredPrompt={deferredPrompt}
          handleInstallPWA={handleInstallPWA}
        />
      </div>

      {/* Mobile Header & Menu */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-surface border-b border-zinc-200 dark:border-white/5 z-50 flex items-center justify-between px-4">
        <Logo />
        <div className="flex items-center gap-2">
          <GlobalSearch variant="header" />
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-text-secondary">
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/20 dark:bg-black/50 backdrop-blur-sm z-40 md:hidden"
            />
            <motion.div 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
              className="fixed inset-y-0 left-0 z-50 md:hidden pt-16 w-64"
            >
              <SidebarContent 
                user={user}
                theme={theme}
                setTheme={setTheme}
                handleLogout={handleLogout}
                setIsMobileMenuOpen={setIsMobileMenuOpen}
                navItems={navItems}
                navigate={navigate}
                deferredPrompt={deferredPrompt}
                handleInstallPWA={handleInstallPWA}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pt-16 md:pt-0 relative bg-bg">
        {firestoreError && (
          <div className="bg-red-500 text-white px-4 py-2 text-sm text-center font-medium">
            {firestoreError}
          </div>
        )}
        <div className="p-4 md:p-8 max-w-7xl mx-auto min-h-full">
          <AnimatePresence mode="popLayout">
            <motion.div 
              key={location.pathname}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15, ease: 'easeInOut' }}
              className="h-full"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};
