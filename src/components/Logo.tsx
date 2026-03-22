import React from 'react';

export const Logo: React.FC<{ className?: string, iconOnly?: boolean }> = ({ className = "", iconOnly = false }) => {
  const isVertical = className.includes('flex-col');

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="relative group">
        <div className="absolute -inset-1.5 bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
        <div className="relative w-11 h-11 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 flex items-center justify-center shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/50 to-transparent dark:from-indigo-500/5 dark:to-transparent"></div>
          <svg 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="1.5" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            className="w-8 h-8 relative z-10 drop-shadow-sm text-indigo-600 dark:text-indigo-400"
          >
            <path d="M9 4c-1.5 0-3 1-3 3.5s1 5 1 7.5c0 2 1 4 2 4s2-1.5 2-3.5c0-1.5 0-3 1-3s1 1.5 1 3c0 2 1 3.5 2 3.5s2-2 2-4c0-2.5 1-5 1-7.5s-1.5-3.5-3-3.5c-1 0-2 .5-3 1.5-1-1-2-1.5-3-1.5z" />
          </svg>
        </div>
      </div>
      {!iconOnly && (
        <div className={`flex flex-col ${isVertical ? 'items-center -space-y-1' : '-space-y-1'}`}>
          <span className={`${isVertical ? 'text-3xl' : 'text-xl'} font-extrabold tracking-tight text-text-primary`}>
            Odonto<span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">Admin</span>
          </span>
          <span className={`${isVertical ? 'text-xs' : 'text-[10px]'} font-bold uppercase tracking-[0.2em] text-text-secondary`}>Gestão Clínica</span>
        </div>
      )}
    </div>
  );
};
