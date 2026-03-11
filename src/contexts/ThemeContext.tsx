import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

interface AppearancePreferences {
  theme: 'light' | 'dark';
  primary_color: string;
  secondary_color: string;
  font_size: 'small' | 'medium' | 'large';
  layout_density: 'compact' | 'normal' | 'comfortable';
  animations_enabled: boolean;
  custom_logo_url: string | null;
}

interface ThemeContextType {
  preferences: AppearancePreferences;
  updatePreferences: (prefs: Partial<AppearancePreferences>) => void;
  savePreferences: () => Promise<void>;
  loadPreferences: () => Promise<void>;
  resetToDefault: () => void;
}

const defaultPreferences: AppearancePreferences = {
  theme: 'light',
  primary_color: '#0066CC',
  secondary_color: '#FF6B35',
  font_size: 'medium',
  layout_density: 'normal',
  animations_enabled: true,
  custom_logo_url: null
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const applyThemeToDOM = (prefs: AppearancePreferences) => {
  const root = document.documentElement;

  root.style.setProperty('--primary-color', prefs.primary_color);
  root.style.setProperty('--secondary-color', prefs.secondary_color);

  root.classList.remove('theme-light', 'theme-dark');
  root.classList.add(`theme-${prefs.theme}`);

  root.classList.remove('font-small', 'font-medium', 'font-large');
  root.classList.add(`font-${prefs.font_size}`);

  root.classList.remove('density-compact', 'density-normal', 'density-comfortable');
  root.classList.add(`density-${prefs.layout_density}`);

  if (prefs.animations_enabled) {
    root.classList.remove('animations-disabled');
  } else {
    root.classList.add('animations-disabled');
  }
};

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<AppearancePreferences>(() => {
    try {
      const cached = localStorage.getItem('theme-preferences');
      if (cached) {
        const parsed = JSON.parse(cached);
        applyThemeToDOM(parsed);
        return parsed;
      }
    } catch (error) {
      console.error('Error loading cached preferences:', error);
    }
    applyThemeToDOM(defaultPreferences);
    return defaultPreferences;
  });

  useEffect(() => {
    let mounted = true;

    const initPreferences = async () => {
      if (user && mounted) {
        await loadPreferences();
      } else if (mounted) {
        setPreferences(defaultPreferences);
        applyThemeToDOM(defaultPreferences);
      }
    };

    initPreferences();

    return () => {
      mounted = false;
    };
  }, [user]);

  useEffect(() => {
    applyThemeToDOM(preferences);
    try {
      localStorage.setItem('theme-preferences', JSON.stringify(preferences));
    } catch (error) {
      console.error('Error caching preferences:', error);
    }
  }, [preferences]);

  const loadPreferences = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('appearance_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        const loadedPrefs: AppearancePreferences = {
          theme: data.theme,
          primary_color: data.primary_color,
          secondary_color: data.secondary_color,
          font_size: data.font_size,
          layout_density: data.layout_density,
          animations_enabled: data.animations_enabled,
          custom_logo_url: data.custom_logo_url
        };
        setPreferences(loadedPrefs);
      }
    } catch (error) {
      console.error('Erro ao carregar preferências:', error);
    }
  };

  const updatePreferences = (prefs: Partial<AppearancePreferences>) => {
    setPreferences(prev => ({ ...prev, ...prefs }));
  };

  const savePreferences = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('appearance_preferences')
        .upsert({
          user_id: user.id,
          ...preferences
        });

      if (error) throw error;
    } catch (error) {
      console.error('Erro ao salvar preferências:', error);
      throw error;
    }
  };

  const resetToDefault = () => {
    setPreferences(defaultPreferences);
  };

  return (
    <ThemeContext.Provider value={{
      preferences,
      updatePreferences,
      savePreferences,
      loadPreferences,
      resetToDefault
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
