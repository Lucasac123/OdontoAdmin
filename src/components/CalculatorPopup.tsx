import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calculator as CalculatorIcon, X, Minus, Equal } from 'lucide-react';

interface CalculatorPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CalculatorPopup: React.FC<CalculatorPopupProps> = ({ isOpen, onClose }) => {
  const [display, setDisplay] = useState('0');
  const [equation, setEquation] = useState('');
  const [isMinimized, setIsMinimized] = useState(false);
  const [size, setSize] = useState({ width: 256, height: 320 });
  const [showResizeHint, setShowResizeHint] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowResizeHint(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  const handleNumber = (num: string) => {
    setDisplay(prev => prev === '0' ? num : prev + num);
  };

  const handleOperator = (op: string) => {
    setEquation(display + ' ' + op + ' ');
    setDisplay('0');
  };

  const calculate = () => {
    try {
      // eslint-disable-next-line no-eval
      const result = eval(equation + display);
      setDisplay(String(result));
      setEquation('');
    } catch (e) {
      setDisplay('Erro');
    }
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
      const newHeight = Math.max(isMinimized ? 40 : 320, startHeight + (moveEvent.clientY - startY));
      setSize({ width: newWidth, height: isMinimized ? (isMinimized ? 40 : 320) : newHeight });
    };

    const onPointerUp = () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  if (!isOpen) return null;

  return (
    <motion.div
      drag
      dragMomentum={false}
      dragListener={!isMinimized}
      dragConstraints={{ left: 0, right: window.innerWidth - size.width, top: 0, bottom: window.innerHeight - size.height }}
      initial={{ opacity: 0, scale: 0.9, x: window.innerWidth / 2 - 128, y: window.innerHeight / 2 - 160 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="fixed z-[100] bg-zinc-900 rounded-xl shadow-2xl border border-zinc-700 overflow-hidden flex flex-col"
      style={{ width: size.width, height: isMinimized ? 'auto' : size.height }}
    >
      {/* Header / Drag Handle */}
      <div className="bg-zinc-800 p-2 flex items-center justify-between cursor-move border-b border-zinc-700">
        <div className="flex items-center gap-2 text-zinc-300">
          <CalculatorIcon className="w-4 h-4" />
          <span className="text-xs font-medium select-none">Calculadora</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setIsMinimized(!isMinimized)} className="p-1 hover:bg-zinc-700 rounded text-zinc-400 hover:text-white transition-colors">
            <Minus className="w-3 h-3" />
          </button>
          <button onClick={onClose} className="p-1 hover:bg-red-500 rounded text-zinc-400 hover:text-white transition-colors">
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Calculator Body */}
      <AnimatePresence>
        {!isMinimized && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="p-4 flex flex-col gap-4 flex-grow"
          >
            <div className="bg-zinc-950 p-3 rounded-lg text-right flex flex-col justify-end h-20 border border-zinc-800">
              <div className="text-zinc-500 text-xs h-4">{equation}</div>
              <div className="text-white text-2xl font-mono truncate">{display}</div>
            </div>

            <div className="grid grid-cols-4 gap-2 flex-grow">
              <button onClick={clear} className="col-span-2 bg-red-500/20 text-red-500 hover:bg-red-500/30 rounded-lg font-medium transition-colors flex-grow">C</button>
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
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Resize Handle */}
      {!isMinimized && (
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
      )}
    </motion.div>
  );
};
