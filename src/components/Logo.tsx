import React from 'react';

export const Logo: React.FC<{ className?: string, iconOnly?: boolean }> = ({ className = "", iconOnly = false }) => {
  const isVertical = className.includes('flex-col');

  return (
    <div className={`flex items-center ${iconOnly ? '' : 'gap-3'} ${className}`}>
      <div className="relative group">
        <div className="absolute -inset-1.5 bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
        <div className="relative w-11 h-11 rounded-2xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.12)] dark:shadow-none">
          <img 
            src="/icon.png" 
            alt="OdontoAdmin" 
            className="w-full h-full object-cover"
          />
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
