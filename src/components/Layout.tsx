import React from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Logo } from './Logo';
import { GlobalSearch } from './GlobalSearch';
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
  ShieldCheck,
  Zap,
  ArrowLeftRight
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
  toggleCalculator
}: any) => {
  const [showSettings, setShowSettings] = React.useState(false);

  return (
    <div className={`flex flex-col h-full bg-surface border-r border-zinc-200/50 dark:border-white/5 transition-all duration-500 ease-in-out relative ${isCollapsed ? 'w-24' : 'w-72'}`}>
      {/* Brand Section */}
      <div className={`p-8 pb-6 flex items-center justify-between gap-4 ${isCollapsed ? 'flex-col px-4 items-center' : ''}`}>
        <div className={`transition-all duration-500 ${isCollapsed ? 'scale-90' : 'flex-1'}`}>
          <Logo iconOnly={isCollapsed} />
        </div>
        
        {/* Mobile Close Button */}
        <button 
          onClick={() => setIsMobileMenuOpen(false)}
          className="md:hidden p-3 text-text-secondary hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-2xl transition-all"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* AI Assistant Highlight */}
      <div className="px-6 mb-4">
        <NavLink
          to="/ai-assistant"
          onClick={() => setIsMobileMenuOpen(false)}
          className={({ isActive }) =>
            `flex items-center gap-4 rounded-2xl transition-all duration-300 relative group overflow-hidden ${
              isActive 
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' 
                : 'text-text-secondary hover:text-indigo-600 dark:hover:text-white hover:bg-indigo-50 dark:hover:bg-white/5'
            } ${isCollapsed ? 'w-12 h-12 justify-center px-0 mx-auto' : 'px-5 py-4 w-full'}`
          }
          title="IA Assistente"
        >
          <BrainCircuit className={`w-5 h-5 transition-transform duration-300 group-hover:scale-110 ${isCollapsed ? 'shrink-0' : ''}`} />
          {!isCollapsed && <span className="font-black text-xs uppercase tracking-widest">IA Assistente</span>}
          <AnimatePresence>
            {isCollapsed === false && (
               <motion.div 
                 initial={{ opacity: 0, x: -10 }} 
                 animate={{ opacity: 1, x: 0 }} 
                 className="absolute right-4 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-white animate-pulse" 
               />
            )}
          </AnimatePresence>
        </NavLink>
      </div>

      {/* Main Nav */}
      <nav className="flex-1 px-6 space-y-2 mt-4 overflow-y-auto no-scrollbar pb-6">
        {navItems.map((item: any) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={() => setIsMobileMenuOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-4 rounded-2xl transition-all duration-300 group ${
                isActive 
                  ? 'bg-zinc-100 dark:bg-white/10 text-text-primary shadow-sm ring-1 ring-black/5' 
                  : 'text-text-secondary hover:text-text-primary hover:bg-zinc-50 dark:hover:bg-white/5'
              } ${isCollapsed ? 'w-12 h-12 justify-center px-0 mx-auto' : 'px-5 py-3.5 w-full'}`
            }
            title={isCollapsed ? item.label : undefined}
          >
            <item.icon className={`w-5 h-5 opacity-70 group-hover:opacity-100 transition-all duration-300 ${isCollapsed ? 'shrink-0' : ''}`} />
            {!isCollapsed && <span className="text-[11px] font-black uppercase tracking-widest">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Footer Section */}
      <div className="p-6 border-t border-zinc-200/50 dark:border-white/5 space-y-6">
        {/* Quick Actions */}
        <div className={`flex items-center gap-3 ${isCollapsed ? 'flex-col items-center' : 'justify-between px-2'}`}>
          <div className={`bg-zinc-100 dark:bg-zinc-900/80 p-1 rounded-2xl flex transition-all ${isCollapsed ? 'flex-col w-12' : 'flex-1'}`}>
            <button 
              onClick={() => setTheme('light')}
              className={`flex-1 flex items-center justify-center p-2 rounded-xl transition-all ${theme === 'light' ? 'bg-white dark:bg-zinc-800 text-indigo-600 shadow-md ring-1 ring-black/5' : 'text-zinc-400 hover:text-text-primary'}`}
              title="Claro"
            >
              <Sun className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setTheme('dark')}
              className={`flex-1 flex items-center justify-center p-2 rounded-xl transition-all ${theme === 'dark' ? 'bg-white dark:bg-zinc-800 text-indigo-400 shadow-md ring-1 ring-black/5' : 'text-zinc-400 hover:text-text-primary'}`}
              title="Escuro"
            >
              <Moon className="w-4 h-4" />
            </button>
          </div>
          
          <button 
            onClick={toggleCalculator}
            className="w-10 h-10 flex items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-900 text-zinc-500 hover:text-indigo-600 transition-all border border-transparent hover:border-indigo-500/20 shadow-sm"
            title="Calculadora"
          >
            <Calculator className="w-4.5 h-4.5" />
          </button>
          <NavLink 
            to="/trash"
            className="w-10 h-10 flex items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-900 text-zinc-500 hover:text-red-500 transition-all border border-transparent hover:border-red-500/20 shadow-sm"
            title="Lixeira"
          >
            <Trash2 className="w-4.5 h-4.5" />
          </NavLink>
        </div>

        {/* User Profile */}
        <div className="relative group">
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className={`flex items-center gap-4 rounded-2xl hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-all duration-500 p-2 border border-transparent hover:border-zinc-200/50 ${isCollapsed ? 'w-12 h-12 justify-center mx-auto' : 'w-full'}`}
          >
            {user?.photoURL ? (
              <img src={user.photoURL} alt="" className="w-8 h-8 rounded-full shadow-sm ring-2 ring-white/10 shrink-0" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-indigo-500 text-white flex items-center justify-center text-xs font-black uppercase shrink-0">{user?.email?.charAt(0)}</div>
            )}
            {!isCollapsed && (
              <div className="flex-1 min-w-0 text-left">
                <p className="text-[10px] font-black text-text-primary truncate uppercase tracking-tight">{user?.displayName || user?.email?.split('@')[0]}</p>
                <p className="text-[9px] text-text-secondary font-bold truncate uppercase opacity-50">Admin</p>
              </div>
            )}
          </button>

          <AnimatePresence>
            {showSettings && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className={`absolute bottom-full left-0 right-0 mb-4 bg-surface border border-zinc-200 dark:border-zinc-800 rounded-[28px] shadow-2xl overflow-hidden z-50 p-2 ${isCollapsed ? 'w-56 left-full ml-4 bottom-0' : ''}`}
              >
                <div className="p-2 space-y-1">
                   <button onClick={() => { navigate('/profile'); setShowSettings(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-text-secondary hover:bg-zinc-50 dark:hover:bg-white/5 transition-all">
                      <User size={14} /> Perfil Profissional
                   </button>
                   <button onClick={() => { setShowSettings(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-text-secondary hover:bg-zinc-50 dark:hover:bg-white/5 transition-all">
                      <Settings size={14} /> Configurações
                   </button>
                   <div className="h-px bg-zinc-100 dark:bg-white/5 my-1" />
                   <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all">
                      <LogOut size={14} /> Encerrar Sessão
                   </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Collapse Handle Premium */}
      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="hidden md:flex absolute -right-4 top-20 w-8 h-8 bg-surface border border-zinc-200/50 dark:border-white/5 rounded-full items-center justify-center text-text-secondary hover:text-indigo-600 shadow-xl z-20 hover:scale-110 active:scale-90 transition-all duration-300"
        aria-label={isCollapsed ? 'Expandir' : 'Recolher'}
      >
        {isCollapsed ? <ChevronRight size={14} strokeWidth={3} /> : <ChevronLeft size={14} strokeWidth={3} />}
      </button>
    </div>
  );
};

export const Layout = () => {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const [isCalculatorOpen, setIsCalculatorOpen] = React.useState(false);
  const [deferredPrompt, setDeferredPrompt] = React.useState<any>(null);

  React.useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    });
  }, []);

  const handleInstallPWA = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setDeferredPrompt(null);
  };

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Início', color: 'bg-emerald-500' },
    { to: '/agenda', icon: Calendar, label: 'Agenda', color: 'bg-emerald-500' },
    { to: '/patients', icon: Users, label: 'Pacientes', color: 'bg-indigo-500' },
    { to: '/financial', icon: DollarSign, label: 'Financeiro', color: 'bg-blue-500' },
    { to: '/pricing', icon: Calculator, label: 'Precificação', color: 'bg-pink-500' },
    { to: '/inventory', icon: Package, label: 'Estoque', color: 'bg-amber-500' },
    { to: '/laboratory', icon: Microscope, label: 'Laboratório', color: 'bg-cyan-500' },
    { to: '/dentists', icon: Briefcase, label: 'Dentistas', color: 'bg-orange-500' },
    { to: '/marketing', icon: Megaphone, label: 'Marketing', color: 'bg-red-500' },
  ];

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out:', error);
    }
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden font-sans selection:bg-indigo-500/30">
      {/* Search Overlay (Universal) */}
      <div className="fixed top-6 right-6 z-50 hidden md:block">
         <GlobalSearch />
      </div>

      {/* Mobile Backdrop */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-40 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar Desktop */}
      <aside className={`hidden md:block h-full transition-all duration-500 ${isCollapsed ? 'w-24' : 'w-72'}`}>
        <SidebarContent 
          user={user}
          theme={theme}
          setTheme={setTheme}
          handleLogout={handleLogout}
          navItems={navItems}
          navigate={navigate}
          deferredPrompt={deferredPrompt}
          handleInstallPWA={handleInstallPWA}
          isCollapsed={isCollapsed}
          setIsCollapsed={setIsCollapsed}
          toggleCalculator={() => setIsCalculatorOpen(!isCalculatorOpen)}
        />
      </aside>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.aside
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 left-0 w-[85%] max-w-sm h-full z-50 md:hidden shadow-2xl"
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
              isCollapsed={false}
              toggleCalculator={() => { setIsCalculatorOpen(!isCalculatorOpen); setIsMobileMenuOpen(false); }}
            />
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Viewport */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Top Header Mobile */}
        <header className="md:hidden flex items-center justify-between p-4 bg-surface border-b border-zinc-200/50 dark:border-white/5 shrink-0 z-30">
          <div className="flex items-center gap-3">
             <button
               onClick={() => setIsMobileMenuOpen(true)}
               className="p-3 bg-zinc-50 dark:bg-zinc-900 rounded-2xl text-text-secondary active:scale-95 transition-all shadow-sm"
               aria-label="Abrir menu"
             >
               <Menu size={20} />
             </button>
             <Logo iconOnly />
          </div>
          <GlobalSearch mobile />
        </header>

        {/* Dynamic Content Scrollable */}
        <div className="flex-1 overflow-y-auto no-scrollbar relative p-4 md:p-8 lg:p-12">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="h-full"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      <CalculatorPopup 
        isOpen={isCalculatorOpen} 
        onClose={() => setIsCalculatorOpen(false)} 
      />
    </div>
  );
};
