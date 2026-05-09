import React from 'react';
import { Outlet, NavLink, useNavigate, useLocation, useOutlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useStorage } from '../context/StorageContext';
import { Logo } from './Logo';
import { GlobalSearch } from './GlobalSearch';
import { ErrorBoundary } from './ErrorBoundary';
import { SyncIndicator } from './SyncIndicator';
import { 
  LayoutDashboard, 
  User,
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
  Settings,
  Package,
  Microscope,
  Briefcase,
  Megaphone,
  Calculator,
  ChevronLeft,
  ChevronRight,
  Database,
  Cloud,
  HardDrive
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import { CalculatorPopup } from './CalculatorPopup';

const SidebarContent = ({ 
  user, 
  theme, 
  setTheme, 
  handleLogout, 
  setIsMobileMenuOpen,
  navItems,
  navigate,
  deferredPrompt,
  handleInstallPWA,
  isCollapsed,
  setIsCollapsed,
  toggleCalculator,
  isSearchOpen,
  setIsSearchOpen
}: any) => {
  const [showSettings, setShowSettings] = React.useState(false);
  const { storageLocation, setStorageLocation } = useStorage();

  return (
  <div className={`flex flex-col h-full bg-surface border-r border-border-subtle transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${isCollapsed ? 'w-20' : 'w-full md:w-64'}`}>
    <div className={`p-4 md:p-6 pb-4 flex items-center justify-between gap-2 ${isCollapsed ? 'flex-col px-2 items-center' : ''}`}>
      <div className={`${isCollapsed ? '' : 'flex-1 min-w-0'}`}>
        {!isCollapsed ? (
          <Logo />
        ) : (
          <Logo iconOnly />
        )}
      </div>
      
      {/* Mobile Close Button */}
      <button 
        onClick={() => setIsMobileMenuOpen(false)}
        className="md:hidden p-2 text-text-secondary hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl shrink-0"
        aria-label="Fechar menu"
      >
        <X className="w-6 h-6" />
      </button>
    </div>
    
    {/* Sidebar Search - Integrated */}
    <div className={`px-4 mb-4 hidden md:block`}>
       <GlobalSearch variant="sidebar" isCollapsed={isCollapsed} isOpen={isSearchOpen} setIsOpen={setIsSearchOpen} />
    </div>
    
    <div className="px-4 mb-2">
      <NavLink
        to="/ai-assistant"
        onClick={() => setIsMobileMenuOpen(false)}
        className={({ isActive }) =>
          `flex items-center rounded-2xl transition-[background-color,border-color,color] duration-200 ${
            isActive 
              ? 'bg-indigo-600 text-white shadow-premium border-l-4 border-indigo-400' 
              : 'text-text-secondary hover:text-indigo-600 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/5'
          } ${isCollapsed ? 'w-12 h-12 justify-center mx-auto' : 'px-4 py-3.5 w-full gap-3'}`
        }
        title="IA Assistente"
      >
        <div className="w-5 h-5 flex items-center justify-center shrink-0">
          <BrainCircuit className="w-5 h-5" />
        </div>
        {!isCollapsed && <span className="font-medium whitespace-nowrap">IA Assistente</span>}
      </NavLink>
    </div>

    <nav className="flex-1 px-4 space-y-2 mt-2 overflow-y-auto hide-scrollbar pb-4">
      {navItems.map((item: any) => (
        <NavLink
          key={item.to}
          to={item.to}
          onClick={() => setIsMobileMenuOpen(false)}
          className={({ isActive }) =>
            `flex items-center rounded-2xl transition-[background-color,border-color,color] duration-200 ${
              isActive 
                ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold border-l-4 border-indigo-500 shadow-premium dark:shadow-none' 
                : 'text-text-secondary hover:text-indigo-600 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/5'
            } ${isCollapsed ? 'w-12 h-12 justify-center mx-auto' : 'px-4 py-3.5 w-full gap-3'}`
          }
          title={isCollapsed ? item.label : undefined}
        >
          <div className="w-5 h-5 flex items-center justify-center shrink-0">
            <item.icon className="w-5 h-5" />
          </div>
          {!isCollapsed && <span className="whitespace-nowrap">{item.label}</span>}
        </NavLink>
      ))}
    </nav>

    <div className="p-4 border-t border-border-subtle">
      <div className={`flex items-center gap-2 ${isCollapsed ? 'flex-col' : 'flex-row px-2'}`}>
        {/* Theme Toggle (Segmented Control) */}
        <div className={`bg-zinc-100 dark:bg-black/20 p-1 rounded-xl relative flex ${isCollapsed ? 'flex-col w-10' : 'flex-1 flex-row'}`}>
          {!isCollapsed && (
            <motion.div 
              className="absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white dark:bg-zinc-800 rounded-lg shadow-sm"
              initial={false}
              animate={{
                x: theme === 'light' ? '0%' : '100%'
              }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            />
          )}
          <button 
            onClick={() => setTheme('light')}
            className={`flex-1 flex items-center justify-center p-1.5 rounded-lg transition-colors relative z-10 ${theme === 'light' ? 'text-indigo-600 dark:text-white bg-white dark:bg-zinc-800 shadow-sm md:bg-transparent md:shadow-none' : 'text-text-secondary hover:text-indigo-600 dark:hover:text-white'}`}
            title="Modo Claro"
            aria-label="Ativar modo claro"
          >
            <Sun className="w-3.5 h-3.5" />
          </button>
          <button 
            onClick={() => setTheme('dark')}
            className={`flex-1 flex items-center justify-center p-1.5 rounded-lg transition-colors relative z-10 ${theme === 'dark' ? 'text-indigo-600 dark:text-white bg-white dark:bg-zinc-800 shadow-sm md:bg-transparent md:shadow-none' : 'text-text-secondary hover:text-indigo-600 dark:hover:text-white'}`}
            title="Modo Escuro"
            aria-label="Ativar modo escuro"
          >
            <Moon className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Individual Round Buttons */}
        <button 
          onClick={toggleCalculator}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-zinc-200 dark:bg-zinc-900 text-text-secondary hover:text-indigo-600 dark:hover:text-white transition-all border border-zinc-200 dark:border-white/5 shrink-0"
          title="Calculadora"
          aria-label="Abrir calculadora"
        >
          <Calculator className="w-4 h-4" />
        </button>
        <NavLink 
          to="/trash"
          onClick={() => setIsMobileMenuOpen(false)}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-zinc-200 dark:bg-zinc-900 text-text-secondary hover:text-indigo-600 dark:hover:text-white transition-all border border-zinc-200 dark:border-white/5 shrink-0"
          title="Lixeira"
        >
          <Trash2 className="w-4 h-4" />
        </NavLink>
      </div>

          <div className="relative flex items-center">
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className={`flex items-center gap-3 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all duration-300 ${isCollapsed ? 'w-10 h-10 justify-center mx-auto' : 'flex-1 p-2'}`}
            aria-label="Configurações do usuário"
            aria-expanded={showSettings}
          >
            {user?.photoURL && (
              <img 
                src={user.photoURL} 
                alt="" 
                className="w-8 h-8 rounded-full border border-zinc-200 dark:border-white/10 shrink-0 object-cover"
                referrerPolicy="no-referrer"
              />
            )}
            {!isCollapsed && (
              <span className="text-sm font-medium text-text-primary truncate flex-1 text-left">
                {user?.displayName || user?.email}
              </span>
            )}
          </button>
          
          {deferredPrompt && (
            <button
              onClick={handleInstallPWA}
              className={`p-3 rounded-xl bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-600/20 transition-all border border-indigo-500/20 flex items-center justify-center ${isCollapsed ? 'w-10 h-10' : 'w-10 h-10 ml-auto'}`}
              title="Instalar App"
              aria-label="Instalar aplicativo"
            >
              <Download className="w-5 h-5 shrink-0" />
            </button>
          )}
          
          <AnimatePresence>
            {showSettings && (
              <motion.div 
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className={`absolute bottom-full left-0 right-0 mb-2 bg-surface border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-lg overflow-hidden z-50 p-1 ${isCollapsed ? 'w-48 left-full ml-2 bottom-0' : ''}`}
              >
                <NavLink
                  to="/profile"
                  onClick={() => setShowSettings(false)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-text-secondary hover:text-indigo-600 dark:hover:text-white hover:bg-indigo-50 dark:hover:bg-white/5 transition-colors text-sm font-medium mb-1"
                >
                  <User className="w-4 h-4" />
                  Perfil
                </NavLink>
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
  );
};

export const Layout: React.FC = () => {
  const { user, logOut, firestoreError } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const outlet = useOutlet();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const [isCalculatorOpen, setIsCalculatorOpen] = React.useState(false);
  const [isSearchOpen, setIsSearchOpen] = React.useState(false);
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
    { to: '/dentists', icon: Briefcase, label: 'Dentistas' },
    { to: '/patients', icon: Users, label: 'Pacientes' },
    { to: '/agenda', icon: Calendar, label: 'Agenda' },
    { to: '/financial', icon: DollarSign, label: 'Financeiro' },
    { to: '/pricing', icon: Calculator, label: 'Precificação' },
    { to: '/marketing', icon: Megaphone, label: 'Marketing' },
    { to: '/inventory', icon: Package, label: 'Estoque' },
    { to: '/laboratory', icon: Microscope, label: 'Laboratório' },
  ];

  const handleLogout = async () => {
    await logOut();
    navigate('/');
  };

  return (
    <div className="flex h-[100dvh] bg-bg overflow-hidden font-sans">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex h-full shrink-0 relative no-print">
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
          isCollapsed={isCollapsed}
          setIsCollapsed={setIsCollapsed}
          toggleCalculator={() => setIsCalculatorOpen(!isCalculatorOpen)}
          isSearchOpen={isSearchOpen}
          setIsSearchOpen={setIsSearchOpen}
        />
        
        {/* Floating Collapse Button - Increased touch area */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          disabled={isSearchOpen}
          className={`absolute right-0 translate-x-1/2 top-12 z-50 w-8 h-16 rounded-[24px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center justify-center text-zinc-900 dark:text-zinc-100 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all hover:scale-105 active:scale-95 group ${isSearchOpen ? 'opacity-50 cursor-not-allowed' : ''}`}
          title={isCollapsed ? "Expandir" : "Recolher"}
          aria-label={isCollapsed ? "Expandir barra lateral" : "Recolher barra lateral"}
        >
          {isCollapsed ? (
            <ChevronRight className="w-5 h-5 transition-transform group-hover:translate-x-0.5" strokeWidth={3} />
          ) : (
            <ChevronLeft className="w-5 h-5 transition-transform group-hover:-translate-x-0.5" strokeWidth={3} />
          )}
        </button>
      </div>

      <div className="flex-1 flex flex-col min-w-0 h-full relative">
        {/* Mobile Header only */}
        <header className="md:hidden h-20 bg-surface border-b border-border-subtle z-40 flex items-center justify-between px-4 shrink-0">
          <Logo />
          <div className="flex items-center gap-2">
            <SyncIndicator variant="header" />
            <GlobalSearch variant="header" isOpen={isSearchOpen} setIsOpen={setIsSearchOpen} />
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
              className="p-2 text-text-secondary hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"
              aria-label={isMobileMenuOpen ? "Fechar menu" : "Abrir menu"}
              aria-expanded={isMobileMenuOpen}
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </header>

        <AnimatePresence>
          {isMobileMenuOpen && (
            <>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsMobileMenuOpen(false)}
                className="fixed inset-0 bg-black/20 dark:bg-black/50 backdrop-blur-sm z-[60] md:hidden"
              />
              <motion.div 
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
                className="fixed top-0 bottom-0 left-0 z-[70] md:hidden w-72"
              >
                <div className="h-full">
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
                    toggleCalculator={() => setIsCalculatorOpen(!isCalculatorOpen)}
                    isSearchOpen={isSearchOpen}
                    setIsSearchOpen={setIsSearchOpen}
                  />
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Main Content */}
        <CalculatorPopup isOpen={isCalculatorOpen} onClose={() => setIsCalculatorOpen(false)} />
        <main className="flex-1 overflow-y-auto relative bg-bg scroll-smooth">
          <SyncIndicator variant="floating" />
          {firestoreError && (
            <div className="sticky top-0 z-30 bg-red-500 text-white px-4 py-2 text-sm text-center font-medium shadow-md">
              {firestoreError}
            </div>
          )}
          <div className="pt-6 p-4 md:pt-10 md:p-8 w-full min-h-full flex flex-col">
            <AnimatePresence mode="wait">
              <motion.div 
                key={location.pathname}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="flex-1 flex flex-col"
              >
                {outlet}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
};
