import React, { useState } from 'react';
import { X, Palette, Sun, Moon, Monitor, Sparkles, Star, Heart, MapPin, ChefHat } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { getAllThemes, ThemeId, ThemeMode } from '../styles/themes';
import Modal from './shared/Modal';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { currentTheme, currentMode, setTheme, setMode } = useTheme();
  const [activeSection, setActiveSection] = useState<'appearance' | 'account'>('appearance');
  const themes = getAllThemes();

  // Icon mapping for themes
  const getThemeIcon = (themeId: ThemeId): React.ReactElement => {
    const iconMap: Record<string, React.ReactElement> = {
      warm: <ChefHat className="w-6 h-6" />,
      fresh: <Sparkles className="w-6 h-6" />,
      premium: <Star className="w-6 h-6" />,
      bold: <Heart className="w-6 h-6" />,
      classic: <MapPin className="w-6 h-6" />
    };
    return iconMap[themeId] || <Palette className="w-6 h-6" />;
  };

  // Generate preview style for theme cards
  const getPreviewStyle = (themeId: ThemeId, mode: ThemeMode) => {
    const theme = themes.find(t => t.id === themeId);
    if (!theme) return {};

    const colors = theme[mode];
    return {
      backgroundColor: colors.background,
      border: `2px solid ${colors.primary[200]}`,
      color: colors.text.primary,
      '--preview-primary': colors.primary[500],
      '--preview-secondary': colors.secondary[500],
      '--preview-accent': colors.accent[500],
    } as React.CSSProperties;
  };

  const ThemeCard: React.FC<{
    theme: any;
    isSelected: boolean;
    onClick: () => void;
    mode: ThemeMode;
  }> = ({ theme, isSelected, onClick, mode }) => {
    const style = getPreviewStyle(theme.id as ThemeId, mode);

    return (
      <button
        onClick={onClick}
        className={`relative p-4 rounded-xl border-2 transition-all duration-200 text-left w-full ${
          isSelected
            ? 'border-primary-500 ring-2 ring-primary-200'
            : 'border-gray-200 hover:border-primary-300'
        }`}
        style={style}
      >
        <div className="flex items-center space-x-3 mb-3">
          <div className="flex-shrink-0">
            {getThemeIcon(theme.id as ThemeId)}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold truncate">{theme.name}</h3>
            <p className="text-sm opacity-75 truncate">{theme.vibe}</p>
          </div>
        </div>

        {/* Color preview */}
        <div className="flex space-x-1 mb-3">
          <div
            className="w-4 h-4 rounded-full"
            style={{ backgroundColor: 'var(--preview-primary)' }}
          />
          <div
            className="w-4 h-4 rounded-full"
            style={{ backgroundColor: 'var(--preview-secondary)' }}
          />
          <div
            className="w-4 h-4 rounded-full"
            style={{ backgroundColor: 'var(--preview-accent)' }}
          />
        </div>

        {isSelected && (
          <div className="absolute top-2 right-2 w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center">
            <div className="w-3 h-3 bg-white rounded-full" />
          </div>
        )}
      </button>
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Settings" size="lg">
      <div className="flex">
        {/* Sidebar */}
        <div className="w-48 border-r border-gray-200 pr-6">
          <nav className="space-y-1">
            <button
              onClick={() => setActiveSection('appearance')}
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg ${
                activeSection === 'appearance'
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Palette className="w-4 h-4 mr-3" />
              Appearance
            </button>
            <button
              onClick={() => setActiveSection('account')}
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg ${
                activeSection === 'account'
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <div className="w-4 h-4 mr-3 rounded-full bg-gray-400" />
              Account
            </button>
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 pl-6">
          {activeSection === 'appearance' && (
            <div className="space-y-6">
              {/* Theme Mode Selection */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Color Mode</h3>
                <div className="flex space-x-4">
                  <button
                    onClick={() => setMode('light')}
                    className={`flex items-center space-x-3 px-4 py-3 rounded-lg border-2 transition-colors ${
                      currentMode === 'light'
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Sun className="w-5 h-5" />
                    <span className="font-medium">Light</span>
                  </button>
                  <button
                    onClick={() => setMode('dark')}
                    className={`flex items-center space-x-3 px-4 py-3 rounded-lg border-2 transition-colors ${
                      currentMode === 'dark'
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Moon className="w-5 h-5" />
                    <span className="font-medium">Dark</span>
                  </button>
                  <button
                    onClick={() => {
                      // Auto mode - follow system preference
                      localStorage.removeItem('rate-my-rest-theme-mode');
                      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                      setMode(systemPrefersDark ? 'dark' : 'light');
                    }}
                    className="flex items-center space-x-3 px-4 py-3 rounded-lg border-2 border-gray-200 hover:border-gray-300"
                  >
                    <Monitor className="w-5 h-5" />
                    <span className="font-medium">Auto</span>
                  </button>
                </div>
              </div>

              {/* Theme Selection */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Theme</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {themes.map((theme) => (
                    <ThemeCard
                      key={theme.id}
                      theme={theme}
                      isSelected={currentTheme === theme.id}
                      onClick={() => setTheme(theme.id as ThemeId)}
                      mode={currentMode}
                    />
                  ))}
                </div>
              </div>

              {/* Current Selection Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-2">Current Selection</h4>
                <div className="text-sm text-gray-600">
                  <p>
                    <strong>Theme:</strong> {themes.find(t => t.id === currentTheme)?.name}
                  </p>
                  <p>
                    <strong>Mode:</strong> {currentMode === 'light' ? 'Light' : 'Dark'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'account' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Settings</h3>
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <p className="text-gray-600">Account settings coming soon!</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-6 pt-6 border-t border-gray-200 flex justify-end">
        <button
          onClick={onClose}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          Done
        </button>
      </div>
    </Modal>
  );
};

export default SettingsModal;