import React, { useState, useEffect, useRef } from 'react';
import { Search, X, User, Calendar, DollarSign } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';

interface GlobalSearchProps {
  variant?: 'sidebar' | 'header';
  isCollapsed?: boolean;
  isOpen?: boolean;
  setIsOpen?: (isOpen: boolean) => void;
}

export const GlobalSearch: React.FC<GlobalSearchProps> = ({ variant = 'sidebar', isCollapsed = false, isOpen: externalIsOpen, setIsOpen: externalSetIsOpen }) => {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;
  const setIsOpen = externalSetIsOpen || setInternalIsOpen;
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [cachedData, setCachedData] = useState<{patients: any[], appointments: any[], finances: any[]}>({patients: [], appointments: [], finances: []});
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();

  // Keyboard shortcut (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('search-open');
      if (inputRef.current) {
        setTimeout(() => inputRef.current?.focus(), 100);
      }
      
      // Fetch data once when search opens
      const fetchAllData = async () => {
        if (!user) return;
        setLoading(true);
        try {
          const uid = user.uid;
          
          // Fetch all data in parallel
          const [pSnapshot, aSnapshot, fSnapshot] = await Promise.all([
            getDocs(query(collection(db, 'patients'), where('dentistId', '==', uid))),
            getDocs(query(collection(db, 'appointments'), where('dentistId', '==', uid))),
            getDocs(query(collection(db, 'finances'), where('dentistId', '==', uid)))
          ]);
          
          setCachedData({
            patients: pSnapshot.docs.map(d => ({ id: d.id, type: 'patient', ...d.data() } as any)),
            appointments: aSnapshot.docs.map(d => ({ id: d.id, type: 'appointment', ...d.data() } as any)),
            finances: fSnapshot.docs.map(d => ({ id: d.id, type: 'finance', ...d.data() } as any))
          });
        } catch (error) {
          console.error("Error fetching search data:", error);
        } finally {
          setLoading(false);
        }
      };
      
      fetchAllData();
    } else {
      document.body.classList.remove('search-open');
      setSearchTerm('');
      setResults([]);
      setCachedData({patients: [], appointments: [], finances: []});
    }
  }, [isOpen, user]);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setResults([]);
      return;
    }

    const term = searchTerm.toLowerCase();
    
    const matchedPatients = cachedData.patients.filter(p => p.name?.toLowerCase().includes(term));
    const matchedAppointments = cachedData.appointments.filter(a => a.patientName?.toLowerCase().includes(term) || a.notes?.toLowerCase().includes(term));
    const matchedFinances = cachedData.finances.filter(f => f.description?.toLowerCase().includes(term) || f.category?.toLowerCase().includes(term));

    setResults([...matchedPatients, ...matchedAppointments, ...matchedFinances]);
  }, [searchTerm, cachedData]);

  const handleSelect = (item: any) => {
    setIsOpen(false);
    if (item.type === 'patient') {
      navigate(`/patients/${item.id}`);
    } else if (item.type === 'appointment') {
      navigate('/agenda');
    } else if (item.type === 'finance') {
      navigate('/financial');
    }
  };

  return (
    <>
      {variant === 'sidebar' ? (
        <button
          onClick={() => setIsOpen(true)}
          className={`flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800/50 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 rounded-xl transition-all duration-300 ${isCollapsed ? 'w-10 h-10 justify-center p-0 mx-auto' : 'px-3 py-2 w-full'}`}
          title={isCollapsed ? "Buscar (Ctrl+K)" : undefined}
          aria-label="Buscar (Ctrl+K)"
        >
          <Search className="w-4 h-4 shrink-0" />
          {!isCollapsed && <span className="text-sm flex-1 text-left">Buscar...</span>}
        </button>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-3 py-2 bg-zinc-100 dark:bg-zinc-800/50 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:bg-zinc-800 rounded-xl transition-all border border-zinc-200 dark:border-white/5"
          aria-label="Buscar"
        >
          <Search className="w-4 h-4 md:w-5 md:h-5" />
          <span className="hidden sm:inline text-base font-medium">Buscar...</span>
        </button>
      )}

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[110]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              className="search-modal fixed top-20 left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-xl bg-surface border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl z-[120] overflow-hidden flex flex-col max-h-[80vh]"
            >
              <div className="flex items-center px-4 border-b border-zinc-200 dark:border-zinc-800">
                <Search className="w-5 h-5 text-zinc-400" />
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Buscar pacientes, consultas, finanças..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="flex-1 bg-transparent border-none focus:ring-0 px-4 py-4 text-text-primary placeholder:text-zinc-400 outline-none"
                />
                <button 
                  onClick={() => setIsOpen(false)} 
                  className="p-2 text-zinc-400 hover:text-text-primary rounded-lg"
                  aria-label="Fechar busca"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="overflow-y-auto flex-1 p-2">
                {loading ? (
                  <div className="p-8 text-center text-zinc-500">Buscando...</div>
                ) : results.length > 0 ? (
                  <div className="space-y-1">
                    {results.map(item => (
                      <button
                        key={`${item.type}-${item.id}`}
                        onClick={() => handleSelect(item)}
                        className="w-full flex items-center gap-4 p-3 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 rounded-xl transition-colors text-left"
                      >
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                          item.type === 'patient' ? 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400' :
                          item.type === 'appointment' ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400' :
                          'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400'
                        }`}>
                          {item.type === 'patient' && <User className="w-5 h-5" />}
                          {item.type === 'appointment' && <Calendar className="w-5 h-5" />}
                          {item.type === 'finance' && <DollarSign className="w-5 h-5" />}
                        </div>
                        <div className="flex-1 overflow-hidden">
                          <p className="font-medium text-text-primary truncate">
                            {item.type === 'patient' ? item.name :
                             item.type === 'appointment' ? `Consulta: ${item.patientName}` :
                             item.description}
                          </p>
                          <p className="text-sm text-text-secondary truncate">
                            {item.type === 'patient' ? `Paciente • ${item.status}` :
                             item.type === 'appointment' ? `Agenda • ${new Date(item.date).toLocaleDateString()}` :
                             `Financeiro • ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.amount)}`}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : searchTerm.trim() ? (
                  <div className="p-8 text-center text-zinc-500">Nenhum resultado encontrado.</div>
                ) : (
                  <div className="p-8 text-center text-zinc-500 text-sm">
                    <p>Digite para começar a buscar...</p>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};
