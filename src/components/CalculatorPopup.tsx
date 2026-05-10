import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calculator as CalculatorIcon, X, Minus, Equal, Delete } from 'lucide-react';

interface CalculatorPopupProps {
  isOpen: boolean;
  onClose: () => void;
  isMinimized: boolean;
  onMinimize: () => void;
  triggerRef: React.RefObject<HTMLButtonElement>;
}

export const CalculatorPopup: React.FC<CalculatorPopupProps> = ({ 
  isOpen, 
  onClose, 
  isMinimized, 
  onMinimize,
  triggerRef 
}) => {
  const [display, setDisplay] = useState('0');
  const [equation, setEquation] = useState('');
  const [size, setSize] = useState({ width: 256, height: 320 });
  const [showResizeHint, setShowResizeHint] = useState(true);
  const [position, setPosition] = useState({ x: window.innerWidth / 2 - 128, y: window.innerHeight / 2 - 160 });

  // Ensure position is within bounds when opening or maximizing
  useEffect(() => {
    if (isOpen && !isMinimized) {
      const isMobile = window.innerWidth < 640;
      if (isMobile) {
        // Center on mobile when maximized
        setPosition({ 
          x: (window.innerWidth - size.width) / 2, 
          y: (window.innerHeight - size.height) / 2 
        });
      } else {
        // Ensure it's not off-screen on desktop
        setPosition(prev => {
          const maxX = window.innerWidth - size.width;
          const maxY = window.innerHeight - size.height;
          
          // If it's the default or initial pos, center it nicely
          if (prev.x === 0 && prev.y === 0) {
            return { x: maxX / 2, y: maxY / 2 };
          }

          return {
            x: Math.max(0, Math.min(prev.x, maxX)),
            y: Math.max(0, Math.min(prev.y, maxY))
          };
        });
      }
    }
  }, [isOpen, isMinimized, size.width, size.height]);


  useEffect(() => {
    const timer = setTimeout(() => setShowResizeHint(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  const getTriggerPosition = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      return {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      };
    }
    return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  };

  const triggerPos = getTriggerPosition();

  const handleNumber = (num: string) => {
    setDisplay(prev => prev === '0' ? num : prev + num);
  };

  const handleOperator = (op: string) => {
    setEquation(display + ' ' + op + ' ');
    setDisplay('0');
  };

  const calculate = () => {
    try {
      const sanitized = (equation + display).replace(/[^-()\d/*+.]/g, '');
      const result = new Function('return ' + sanitized)();
      setDisplay(String(result));
      setEquation('');
    } catch (e) {
      setDisplay('Erro');
    }
  };

  const backspace = () => {
    setDisplay(prev => prev.length > 1 ? prev.slice(0, -1) : '0');
  };

  const clear = () => {

    setDisplay('0');
    setEquation('');
  };

  const handleResize = (e: React.PointerEvent) => {
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = size.width;
    const startHeight = size.height;

    const onPointerMove = (moveEvent: PointerEvent) => {
      const newWidth = Math.max(256, startWidth + (moveEvent.clientX - startX));
      const newHeight = Math.max(320, startHeight + (moveEvent.clientY - startY));
      setSize({ width: newWidth, height: newHeight });
    };

    const onPointerUp = () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen || isMinimized) return;
      if (/[0-9]/.test(e.key)) handleNumber(e.key);
      if (['+', '-', '*', '/'].includes(e.key)) handleOperator(e.key === '/' ? '÷' : e.key);
      if (e.key === 'Enter') calculate();
      if (e.key === 'Escape') onClose();
      if (e.key === 'Backspace') setDisplay(prev => prev.length > 1 ? prev.slice(0, -1) : '0');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isMinimized, display, equation]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {!isMinimized && (
        <motion.div
          drag
          dragMomentum={false}
          dragConstraints={{ left: 0, right: window.innerWidth - size.width, top: 0, bottom: window.innerHeight - size.height }}
          onDragEnd={(_, info) => {
            setPosition(prev => ({
              x: prev.x + info.offset.x,
              y: prev.y + info.offset.y
            }));
          }}
          initial={{ 
            opacity: 0, 
            scale: 0.3, 
            x: triggerPos.x, 
            y: triggerPos.y,
            left: 0,
            top: 0,
            translateX: '-50%',
            translateY: '-50%',
            filter: 'blur(10px)'
          }}
          animate={{ 
            opacity: 1, 
            scale: 1, 
            x: position.x, 
            y: position.y,
            translateX: 0,
            translateY: 0,
            filter: 'blur(0px)'
          }}
          exit={{ 
            opacity: 0, 
            scale: 0.3, 
            x: triggerPos.x, 
            y: triggerPos.y,
            translateX: '-50%',
            translateY: '-50%',
            filter: 'blur(10px)'
          }}
          transition={{ 
            type: 'spring', 
            damping: 30, 
            stiffness: 350,
            mass: 0.8,
            opacity: { duration: 0.2 }
          }}
          className="fixed z-[100] bg-zinc-900/90 dark:bg-zinc-950/90 backdrop-blur-xl rounded-2xl shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)] border border-white/10 dark:border-zinc-700/50 overflow-hidden flex flex-col no-transition"
          style={{ width: size.width, height: size.height }}
        >
          {/* Header / Drag Handle */}
          <div className="bg-white/5 dark:bg-black/20 p-3 flex items-center justify-between cursor-move border-b border-white/5 dark:border-zinc-800">
            <div className="flex items-center gap-2.5 text-zinc-100">
              <div className="w-6 h-6 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                <CalculatorIcon className="w-3.5 h-3.5 text-indigo-400" />
              </div>
              <span className="text-xs font-bold uppercase tracking-widest opacity-80 select-none">Calculadora</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onMinimize();
                }} 
                className="p-1.5 hover:bg-white/10 dark:hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-all active:scale-90"
                title="Minimizar para o menu"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <button 
                onClick={onClose} 
                className="p-1.5 hover:bg-red-500 rounded-lg text-zinc-400 hover:text-white transition-all active:scale-90"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Calculator Body */}
          <div className="p-4 flex flex-col gap-4 flex-grow overflow-hidden">
            <div className="bg-zinc-950 p-3 rounded-lg text-right flex flex-col justify-end h-20 border border-zinc-800">
              <div className="text-zinc-500 text-xs h-4">{equation}</div>
              <div className="text-white text-2xl font-mono truncate">{display}</div>
            </div>

            <div className="grid grid-cols-4 gap-2 flex-grow">
              <button onClick={clear} className="bg-red-500/20 text-red-500 hover:bg-red-500/30 rounded-lg font-medium transition-colors flex-grow">C</button>
              <button onClick={backspace} className="bg-amber-500/20 text-amber-500 hover:bg-amber-500/30 rounded-lg flex items-center justify-center transition-colors">
                <Delete className="w-4 h-4" />
              </button>
              <button onClick={() => handleOperator('/')} className="bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 rounded-lg font-medium transition-colors flex-grow">÷</button>
              <button onClick={() => handleOperator('*')} className="bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 rounded-lg font-medium transition-colors flex-grow">×</button>

              <button onClick={() => handleNumber('7')} className="bg-zinc-800 text-white hover:bg-zinc-700 rounded-lg font-medium transition-colors flex-grow">7</button>
              <button onClick={() => handleNumber('8')} className="bg-zinc-800 text-white hover:bg-zinc-700 rounded-lg font-medium transition-colors flex-grow">8</button>
              <button onClick={() => handleNumber('9')} className="bg-zinc-800 text-white hover:bg-zinc-700 rounded-lg font-medium transition-colors flex-grow">9</button>
              <button onClick={() => handleOperator('-')} className="bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 rounded-lg font-medium transition-colors flex-grow">-</button>

              <button onClick={() => handleNumber('4')} className="bg-zinc-800 text-white hover:bg-zinc-700 rounded-lg font-medium transition-colors flex-grow">4</button>
              <button onClick={() => handleNumber('5')} className="bg-zinc-800 text-white hover:bg-zinc-700 rounded-lg font-medium transition-colors flex-grow">5</button>
              <button onClick={() => handleNumber('6')} className="bg-zinc-800 text-white hover:bg-zinc-700 rounded-lg font-medium transition-colors flex-grow">6</button>
              <button onClick={() => handleOperator('+')} className="bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 rounded-lg font-medium transition-colors flex-grow">+</button>

              <button onClick={() => handleNumber('1')} className="bg-zinc-800 text-white hover:bg-zinc-700 rounded-lg font-medium transition-colors flex-grow">1</button>
              <button onClick={() => handleNumber('2')} className="bg-zinc-800 text-white hover:bg-zinc-700 rounded-lg font-medium transition-colors flex-grow">2</button>
              <button onClick={() => handleNumber('3')} className="bg-zinc-800 text-white hover:bg-zinc-700 rounded-lg font-medium transition-colors flex-grow">3</button>
              <button onClick={calculate} className="row-span-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg font-medium transition-colors flex items-center justify-center flex-grow">
                <Equal className="w-5 h-5" />
              </button>

              <button onClick={() => handleNumber('0')} className="col-span-2 bg-zinc-800 text-white hover:bg-zinc-700 rounded-lg font-medium transition-colors flex-grow">0</button>
              <button onClick={() => handleNumber('.')} className="bg-zinc-800 text-white hover:bg-zinc-700 rounded-lg font-medium transition-colors flex-grow">.</button>
            </div>
          </div>
          
          {/* Resize Handle */}
          <div
            className="absolute bottom-0 right-0 w-6 h-6 cursor-nwse-resize flex items-center justify-center"
            onPointerDown={handleResize}
          >
              <div className="w-2 h-2 border-r-2 border-b-2 border-zinc-500 rounded-br-sm" />
              {showResizeHint && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute bottom-8 right-0 bg-indigo-600 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg shadow-lg whitespace-nowrap z-50"
                >
                  Arraste para redimensionar
                  <div className="absolute -bottom-1 right-2 w-2 h-2 bg-indigo-600 rotate-45" />
                </motion.div>
              )}
            </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
