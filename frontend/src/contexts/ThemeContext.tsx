import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ThemeId, ThemeMode, themes, generateCSSVariables } from '../styles/themes';

interface ThemeContextType {
  currentTheme: ThemeId;
  currentMode: ThemeMode;
  setTheme: (themeId: ThemeId) => void;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
  isFirstVisit: boolean;
  completeOnboarding: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: ReactNode;
}

const THEME_STORAGE_KEY = 'rate-my-rest-theme';
const MODE_STORAGE_KEY = 'rate-my-rest-theme-mode';
const ONBOARDING_STORAGE_KEY = 'rate-my-rest-onboarding-complete';

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  // Check if user has completed onboarding (first visit)
  const [isFirstVisit, setIsFirstVisit] = useState(() => {
    return !localStorage.getItem(ONBOARDING_STORAGE_KEY);
  });

  // Initialize theme from localStorage or default to 'warm'
  const [currentTheme, setCurrentTheme] = useState<ThemeId>(() => {
    const saved = localStorage.getItem(THEME_STORAGE_KEY) as ThemeId;
    return saved && themes[saved] ? saved : 'warm';
  });

  // Initialize mode from localStorage or system preference
  const [currentMode, setCurrentMode] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem(MODE_STORAGE_KEY) as ThemeMode;
    if (saved === 'light' || saved === 'dark') {
      return saved;
    }

    // Default to system preference
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    return 'light';
  });

  // Apply CSS variables when theme or mode changes
  useEffect(() => {
    const cssVariables = generateCSSVariables(currentTheme, currentMode);

    // Create or update the style element
    let styleElement = document.getElementById('theme-variables');
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = 'theme-variables';
      document.head.appendChild(styleElement);
    }

    styleElement.textContent = `:root { ${cssVariables} }`;

    // Update document class for mode-specific styles
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(currentMode);

    // Update theme data attribute
    document.documentElement.setAttribute('data-theme', currentTheme);
  }, [currentTheme, currentMode]);

  // Listen for system theme changes
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = (e: MediaQueryListEvent) => {
      // Only auto-switch if user hasn't manually set a preference
      const hasManualPreference = localStorage.getItem(MODE_STORAGE_KEY);
      if (!hasManualPreference) {
        setCurrentMode(e.matches ? 'dark' : 'light');
      }
    };

    mediaQuery.addEventListener('change', handleSystemThemeChange);
    return () => mediaQuery.removeEventListener('change', handleSystemThemeChange);
  }, []);

  const setTheme = (themeId: ThemeId) => {
    setCurrentTheme(themeId);
    localStorage.setItem(THEME_STORAGE_KEY, themeId);
  };

  const setMode = (mode: ThemeMode) => {
    setCurrentMode(mode);
    localStorage.setItem(MODE_STORAGE_KEY, mode);
  };

  const toggleMode = () => {
    const newMode = currentMode === 'light' ? 'dark' : 'light';
    setMode(newMode);
  };

  const completeOnboarding = () => {
    setIsFirstVisit(false);
    localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
  };

  const value: ThemeContextType = {
    currentTheme,
    currentMode,
    setTheme,
    setMode,
    toggleMode,
    isFirstVisit,
    completeOnboarding,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};