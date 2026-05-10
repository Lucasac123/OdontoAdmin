import React from 'react';
import { useTheme } from '../context/ThemeContext';

export const Logo: React.FC<{ className?: string, iconOnly?: boolean }> = ({ className = "", iconOnly = false }) => {
  const isVertical = className.includes('flex-col');
  const { customLogo, accentColor } = useTheme();

  return (
    <div className={`flex items-center ${iconOnly ? '' : 'gap-3'} ${className}`}>
      <div className="relative group">
        <div 
          className="absolute -inset-1.5 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-500"
          style={{ 
            backgroundImage: `linear-gradient(to top right, var(--accent), var(--accent-light), var(--accent-glow))`
          }}
        ></div>
        <div 
          className="relative w-11 h-11 rounded-2xl overflow-hidden shadow-[0_8px_30px_rgba(var(--accent-rgb),0.2)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.5)] flex items-center justify-center transition-all duration-500"
          style={{ 
            backgroundImage: `linear-gradient(145deg, var(--accent) 0%, var(--accent-dark) 100%)`
          }}
        >
          {/* Subtle inner glow for the logo container */}
          <div className="absolute inset-0 bg-white/5 pointer-events-none transition-opacity duration-500" />
          
          <img 
            src={customLogo || "/icon.png"} 
            alt="OdontoAdmin" 
            className={`w-full h-full object-cover transition-all duration-500 ${!customLogo ? 'mix-blend-luminosity opacity-90 brightness-110 grayscale contrast-125' : ''}`}
          />
        </div>
      </div>
      {!iconOnly && (
        <div className={`flex flex-col ${isVertical ? 'items-center -space-y-1' : '-space-y-1'}`}>
          <span className={`${isVertical ? 'text-3xl' : 'text-xl'} font-extrabold tracking-tight text-text-primary`}>
            Odonto<span className="logo-gradient">Admin</span>
          </span>
          <span className={`${isVertical ? 'text-xs' : 'text-[10px]'} font-bold uppercase tracking-[0.2em] text-text-secondary`}>Gestão Clínica</span>
        </div>
      )}
    </div>
  );
};
