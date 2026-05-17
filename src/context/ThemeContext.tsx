import React, { createContext, useContext, useEffect, useState } from 'react';
import { db } from '../firebase';
import { doc, getDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { useAuth } from './AuthContext';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: 'light' | 'dark';
  accentColor: string;
  setAccentColor: (color: string) => void;
  colorHistory: string[];
  customLogo: string | null;
  setCustomLogo: (logo: string | null) => void;
  resetToDefaults: () => void;
}

const DEFAULT_ACCENT = '#af571b';
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved === 'light' || saved === 'dark') return saved as Theme;
    }
    return 'light';
  });

  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');
  const [accentColor, setAccentColorState] = useState<string>(() => {
    return localStorage.getItem('accentColor') || DEFAULT_ACCENT;
  });
  const [colorHistory, setColorHistory] = useState<string[]>(() => {
    const saved = localStorage.getItem('colorHistory');
    return saved ? JSON.parse(saved) : [];
  });
  const [customLogo, setCustomLogoState] = useState<string | null>(() => {
    return localStorage.getItem('customLogo');
  });

  // Sync settings with Firestore when user logs in
  useEffect(() => {
    if (!user) return;

    const userRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.accentColor) {
          setAccentColorState(data.accentColor);
          localStorage.setItem('accentColor', data.accentColor);
        }
        if (data.colorHistory) {
          setColorHistory(data.colorHistory);
          localStorage.setItem('colorHistory', JSON.stringify(data.colorHistory));
        }
        if (data.customLogo) {
          setCustomLogoState(data.customLogo);
          localStorage.setItem('customLogo', data.customLogo);
        }
      }
    }, (error) => {
      // Be quiet about offline/unavailable errors for theme settings
      if (!error.message.includes('offline') && !error.message.includes('unavailable')) {
        console.error("Error fetching theme settings:", error);
      }
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    const root = window.document.documentElement;
    
    // Theme classes
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    setResolvedTheme(theme);
    localStorage.setItem('theme', theme);

    // Color variables
    root.style.setProperty('--accent', accentColor);
    
    // Hex to RGB for translucent colors
    const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      } : null;
    };

    // Helper to blend color with white for pastel effect
    const getPastel = (hex: string, mix: number) => {
      const rgb = hexToRgb(hex);
      if (!rgb) return hex;
      const r = Math.round(rgb.r * (1 - mix) + 255 * mix);
      const g = Math.round(rgb.g * (1 - mix) + 255 * mix);
      const b = Math.round(rgb.b * (1 - mix) + 255 * mix);
      return "#" + (0x1000000 + (r << 16) + (g << 8) + b).toString(16).slice(1);
    };

    // Variations for gradients and shadows
    const adjustColor = (hex: string, percent: number) => {
      const num = parseInt(hex.replace("#", ""), 16),
        amt = Math.round(2.55 * percent),
        R = (num >> 16) + amt,
        G = (num >> 8 & 0x00FF) + amt,
        B = (num & 0x0000FF) + amt;
      return "#" + (0x1000000 + (R < 255 ? R < 0 ? 0 : R : 255) * 0x10000 + (G < 255 ? G < 0 ? 0 : G : 255) * 0x100 + (B < 255 ? B < 0 ? 0 : B : 255)).toString(16).slice(1);
    };

    const rgb = hexToRgb(accentColor);
    if (rgb) {
      root.style.setProperty('--accent-rgb', `${rgb.r}, ${rgb.g}, ${rgb.b}`);
    }

    // Generate full spectral scale with pastel light tones
    root.style.setProperty('--accent-50', getPastel(accentColor, 0.95));   // Ultra soft pastel
    root.style.setProperty('--accent-100', getPastel(accentColor, 0.85));  // Soft pastel
    root.style.setProperty('--accent-200', getPastel(accentColor, 0.70));  // Light pastel
    root.style.setProperty('--accent-300', getPastel(accentColor, 0.50));  // Muted pastel
    root.style.setProperty('--accent-400', getPastel(accentColor, 0.25));  // Muted base
    root.style.setProperty('--accent-500', accentColor);                   // Base
    
    if (theme === 'dark') {
      root.style.setProperty('--accent-600', adjustColor(accentColor, -8));  // Softer hover in dark
      root.style.setProperty('--accent-700', adjustColor(accentColor, -15)); // Deep
      root.style.setProperty('--accent-800', adjustColor(accentColor, -25)); // Dark
      root.style.setProperty('--accent-900', adjustColor(accentColor, -35)); // Ultra dark
    } else {
      root.style.setProperty('--accent-600', adjustColor(accentColor, -12)); // Hover
      root.style.setProperty('--accent-700', adjustColor(accentColor, -25)); // Deep
      root.style.setProperty('--accent-800', adjustColor(accentColor, -40)); // Dark
      root.style.setProperty('--accent-900', adjustColor(accentColor, -55)); // Ultra dark
    }

    // Compatibility variables
    root.style.setProperty('--accent-hover', theme === 'dark' ? adjustColor(accentColor, -8) : adjustColor(accentColor, -12));
    root.style.setProperty('--accent-light', getPastel(accentColor, 0.60));
    root.style.setProperty('--accent-dark', adjustColor(accentColor, -30));
    root.style.setProperty('--accent-soft', theme === 'dark' ? `rgba(${rgb?.r}, ${rgb?.g}, ${rgb?.b}, 0.15)` : `rgba(${rgb?.r}, ${rgb?.g}, ${rgb?.b}, 0.08)`);
    root.style.setProperty('--accent-glow', `rgba(${rgb?.r}, ${rgb?.g}, ${rgb?.b}, 0.04)`);
    
    localStorage.setItem('accentColor', accentColor);
  }, [theme, accentColor]);

  useEffect(() => {
    // Dynamically update manifest and favicon when customLogo changes
    if (typeof document !== 'undefined') {
      const iconUrl = customLogo || '/icon.png';
      
      const iconLink = document.querySelector("link[rel='icon']") as HTMLLinkElement;
      if (iconLink) iconLink.href = iconUrl;
      
      const appleLink = document.querySelector("link[rel='apple-touch-icon']") as HTMLLinkElement;
      if (appleLink) appleLink.href = iconUrl;

      const manifestUrl = 'data:application/manifest+json;charset=utf-8,' + encodeURIComponent(JSON.stringify({
        "name": "OdontoAdmin",
        "short_name": "OdontoAdmin",
        "start_url": "/",
        "display": "standalone",
        "background_color": "#f5f5f1",
        "theme_color": "#f5f5f1",
        "icons": [
          {
            "src": iconUrl,
            "sizes": "192x192 512x512",
            "type": "image/png"
          }
        ]
      }));
      
      let manifestLink = document.getElementById('dynamic-manifest') as HTMLLinkElement;
      if (manifestLink) {
        manifestLink.href = manifestUrl;
      } else {
        manifestLink = document.createElement('link');
        manifestLink.rel = 'manifest';
        manifestLink.id = 'dynamic-manifest';
        manifestLink.href = manifestUrl;
        document.head.appendChild(manifestLink);
      }
    }
  }, [customLogo]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  const setAccentColor = async (color: string) => {
    const normalizedColor = color.toLowerCase();
    setAccentColorState(normalizedColor);
    
    // Update history
    setColorHistory(prev => {
      const filtered = prev.filter(c => c !== normalizedColor);
      const next = [normalizedColor, ...filtered].slice(0, 6);
      localStorage.setItem('colorHistory', JSON.stringify(next));
      return next;
    });

    if (user) {
      try {
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, { 
          accentColor: normalizedColor,
          colorHistory: [normalizedColor, ...colorHistory.filter(c => c !== normalizedColor)].slice(0, 6)
        });
      } catch (e) {
        console.error("Error saving accent color:", e);
      }
    }
  };

  const setCustomLogo = async (logo: string | null) => {
    setCustomLogoState(logo);
    if (logo) {
      localStorage.setItem('customLogo', logo);
    } else {
      localStorage.removeItem('customLogo');
    }

    if (user) {
      try {
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, { customLogo: logo });
      } catch (e) {
        console.error("Error saving custom logo:", e);
      }
    }
  };

  const resetToDefaults = async () => {
    setAccentColorState(DEFAULT_ACCENT);
    setCustomLogoState(null);
    localStorage.setItem('accentColor', DEFAULT_ACCENT);
    localStorage.removeItem('customLogo');

    if (user) {
      try {
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, { 
          accentColor: DEFAULT_ACCENT,
          customLogo: null 
        });
      } catch (e) {
        console.error("Error resetting defaults:", e);
      }
    }
  };

  return (
    <ThemeContext.Provider value={{ 
      theme, 
      setTheme, 
      resolvedTheme, 
      accentColor, 
      setAccentColor, 
      colorHistory,
      customLogo,
      setCustomLogo,
      resetToDefaults
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
