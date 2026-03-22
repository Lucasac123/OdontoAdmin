import React from 'react';

export const Logo: React.FC<{ className?: string, iconOnly?: boolean }> = ({ className = "", iconOnly = false }) => {
  const isVertical = className.includes('flex-col');

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="relative group">
        <div className="absolute -inset-1.5 bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
        <div className="relative w-11 h-11 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 flex items-center justify-center text-indigo-600 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/50 to-transparent dark:from-indigo-500/5 dark:to-transparent"></div>
          <svg 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            className="w-6 h-6 relative z-10 drop-shadow-sm"
          >
            <path d="M12 2c-3.5 0-6 2.5-6 6v4c0 3 2 5 5 5s5-2 5-5V8c0-3.5-2.5-6-6-6z" />
            <path d="M8 18c0 2 1 3 4 3s4-1 4-3" />
            <path d="M10 22c0 1 1 1 2 1s2 0 2-1" />
          </svg>
        </div>
      </div>
      {!iconOnly && (
        <div className={`flex flex-col ${isVertical ? 'items-center -space-y-1' : '-space-y-1'}`}>
          <span className={`${isVertical ? 'text-3xl' : 'text-xl'} font-extrabold tracking-tight text-zinc-900 dark:text-white`}>
            Odonto<span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">Admin</span>
          </span>
          <span className={`${isVertical ? 'text-xs' : 'text-[10px]'} font-bold uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500`}>Gestão Clínica</span>
        </div>
      )}
    </div>
  );
};
