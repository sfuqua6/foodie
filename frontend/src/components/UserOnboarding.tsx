import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../hooks/useAuth';
import { usersAPI } from '../services/api';
import { themes, ThemeId, ThemeMode } from '../styles/themes';
import {
  Palette, Sun, Moon, Star, Heart, MapPin, Check, X, ChevronLeft, ChevronRight,
  ArrowRight, ArrowLeft, Sparkles, ChefHat
} from 'lucide-react';
import toast from 'react-hot-toast';

interface BubbleOption {
  id: string;
  label: string;
  emoji: string;
  color: string;
  description?: string;
}

interface SurveyRound {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  options: BubbleOption[];
  minSelections: number;
  maxSelections: number;
  optional?: boolean;
}

const UserOnboarding: React.FC = () => {
  const { isFirstVisit, completeOnboarding, setTheme, setMode, currentTheme, currentMode } = useTheme();
  const { user, updateUser } = useAuth();

  const [step, setStep] = useState<'theme' | 'mode' | 'preview' | 'survey' | 'complete'>('theme');
  const [selectedTheme, setSelectedTheme] = useState<ThemeId>(currentTheme);
  const [selectedMode, setSelectedMode] = useState<ThemeMode>(currentMode);
  const [currentSurveyRound, setCurrentSurveyRound] = useState(0);
  const [surveySelections, setSurveySelections] = useState<Record<number, string[]>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const bubbleRefs = useRef<(HTMLButtonElement | null)[]>([]);


  const surveyRounds: SurveyRound[] = [
    {
      title: "What flavors make you smile?",
      subtitle: "Pick 3 that get your taste buds excited",
      icon: <Sparkles className="w-6 h-6" />,
      minSelections: 3,
      maxSelections: 3,
      options: [
        { id: 'sweet', label: 'Sweet', emoji: '🍯', color: 'bg-pink-100 hover:bg-pink-200 border-pink-300' },
        { id: 'spicy', label: 'Spicy', emoji: '🌶️', color: 'bg-red-100 hover:bg-red-200 border-red-300' },
        { id: 'savory', label: 'Savory', emoji: '🧄', color: 'bg-yellow-100 hover:bg-yellow-200 border-yellow-300' },
        { id: 'umami', label: 'Umami', emoji: '🍄', color: 'bg-brown-100 hover:bg-brown-200 border-brown-300' },
        { id: 'tangy', label: 'Tangy', emoji: '🍋', color: 'bg-lime-100 hover:bg-lime-200 border-lime-300' },
        { id: 'creamy', label: 'Creamy', emoji: '🥛', color: 'bg-blue-100 hover:bg-blue-200 border-blue-300' },
        { id: 'crunchy', label: 'Crunchy', emoji: '🥜', color: 'bg-orange-100 hover:bg-orange-200 border-orange-300' },
        { id: 'smoky', label: 'Smoky', emoji: '🔥', color: 'bg-gray-100 hover:bg-gray-200 border-gray-300' },
      ]
    },
    {
      title: "What's your dining vibe?",
      subtitle: "Choose up to 4 that match your mood",
      icon: <Heart className="w-6 h-6" />,
      minSelections: 1,
      maxSelections: 4,
      options: [
        { id: 'casual', label: 'Casual & Cozy', emoji: '🏠', color: 'bg-green-100 hover:bg-green-200 border-green-300' },
        { id: 'trendy', label: 'Trendy & Hip', emoji: '✨', color: 'bg-purple-100 hover:bg-purple-200 border-purple-300' },
        { id: 'romantic', label: 'Romantic', emoji: '💕', color: 'bg-pink-100 hover:bg-pink-200 border-pink-300' },
        { id: 'family', label: 'Family-Friendly', emoji: '👨‍👩‍👧‍👦', color: 'bg-blue-100 hover:bg-blue-200 border-blue-300' },
        { id: 'quiet', label: 'Quiet & Peaceful', emoji: '🕊️', color: 'bg-indigo-100 hover:bg-indigo-200 border-indigo-300' },
        { id: 'lively', label: 'Lively & Social', emoji: '🎉', color: 'bg-red-100 hover:bg-red-200 border-red-300' },
        { id: 'upscale', label: 'Upscale & Elegant', emoji: '🍾', color: 'bg-yellow-100 hover:bg-yellow-200 border-yellow-300' },
        { id: 'outdoor', label: 'Outdoor Seating', emoji: '🌳', color: 'bg-green-100 hover:bg-green-200 border-green-300' },
      ]
    },
    {
      title: "What cuisines call to you?",
      subtitle: "Pick your favorites - no judgment here!",
      icon: <ChefHat className="w-6 h-6" />,
      minSelections: 2,
      maxSelections: 6,
      options: [
        { id: 'american', label: 'American', emoji: '🍔', color: 'bg-red-100 hover:bg-red-200 border-red-300' },
        { id: 'italian', label: 'Italian', emoji: '🍝', color: 'bg-green-100 hover:bg-green-200 border-green-300' },
        { id: 'chinese', label: 'Chinese', emoji: '🥟', color: 'bg-red-100 hover:bg-red-200 border-red-300' },
        { id: 'mexican', label: 'Mexican', emoji: '🌮', color: 'bg-yellow-100 hover:bg-yellow-200 border-yellow-300' },
        { id: 'indian', label: 'Indian', emoji: '🍛', color: 'bg-orange-100 hover:bg-orange-200 border-orange-300' },
        { id: 'thai', label: 'Thai', emoji: '🍜', color: 'bg-green-100 hover:bg-green-200 border-green-300' },
        { id: 'japanese', label: 'Japanese', emoji: '🍣', color: 'bg-blue-100 hover:bg-blue-200 border-blue-300' },
        { id: 'mediterranean', label: 'Mediterranean', emoji: '🫒', color: 'bg-teal-100 hover:bg-teal-200 border-teal-300' },
      ]
    }
  ];

  if (!isFirstVisit) {
    return null;
  }

  const getThemeIcon = (themeId: string) => {
    const iconMap: Record<string, React.ReactElement> = {
      warm: <Heart className="w-6 h-6" />,
      fresh: <Star className="w-6 h-6" />,
      premium: <Sparkles className="w-6 h-6" />,
      bold: <ChefHat className="w-6 h-6" />,
      classic: <MapPin className="w-6 h-6" />
    };
    return iconMap[themeId] || <Palette className="w-6 h-6" />;
  };

  const handleThemeSelect = (themeId: string) => {
    setSelectedTheme(themeId as ThemeId);
    setStep('mode');
  };

  const handleModeSelect = (mode: string) => {
    setSelectedMode(mode as ThemeMode);
    setStep('preview');
  };

  const handleThemeConfirm = () => {
    setTheme(selectedTheme);
    setMode(selectedMode);
    setStep('survey');
  };

  const toggleSurveySelection = (optionId: string) => {
    setSurveySelections(prev => {
      const roundSelections = prev[currentSurveyRound] || [];
      const currentRoundData = surveyRounds[currentSurveyRound];

      if (roundSelections.includes(optionId)) {
        return {
          ...prev,
          [currentSurveyRound]: roundSelections.filter(id => id !== optionId)
        };
      } else if (roundSelections.length < currentRoundData.maxSelections) {
        return {
          ...prev,
          [currentSurveyRound]: [...roundSelections, optionId]
        };
      }
      return prev;
    });
  };

  const handleSurveyNext = () => {
    if (currentSurveyRound < surveyRounds.length - 1) {
      setCurrentSurveyRound(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handleSurveyPrev = () => {
    if (currentSurveyRound > 0) {
      setCurrentSurveyRound(prev => prev - 1);
    }
  };

  const handleComplete = async () => {
    setIsSubmitting(true);
    try {
      const flatPreferences = Object.values(surveySelections).flat();
      // Store preferences in localStorage for now
      localStorage.setItem('user_detailed_preferences', JSON.stringify({
        preferred_flavors: flatPreferences.slice(0, 10),
        dietary_restrictions: [],
        preferred_price_range: '$-$$'
      }));

      await updateUser({});
      completeOnboarding();
      toast.success('Welcome! Your preferences have been saved.');
    } catch (error) {
      console.error('Failed to save preferences:', error);
      toast.error('Failed to save preferences. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentRoundData = surveyRounds[currentSurveyRound];
  const currentSelections = surveySelections[currentSurveyRound] || [];
  const canProceed = currentSelections.length >= currentRoundData?.minSelections;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">

        {/* Theme Selection */}
        {step === 'theme' && (
          <div className="p-8 text-center">
            <div className="mb-8">
              <Palette className="w-16 h-16 mx-auto mb-4 text-primary-600" />
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Choose Your Vibe</h2>
              <p className="text-gray-600">Pick the color theme that speaks to you</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(themes).map(([themeId, theme]) => (
                <button
                  key={themeId}
                  onClick={() => handleThemeSelect(themeId)}
                  className="group p-6 border-2 border-gray-200 rounded-xl hover:border-primary-400 transition-all duration-200"
                  style={{
                    background: `linear-gradient(135deg, ${theme.light.primary[50]} 0%, ${theme.light.secondary[50]} 100%)`
                  }}
                >
                  <div className="flex items-center justify-center mb-4"
                       style={{ color: theme.light.primary[600] }}>
                    {getThemeIcon(themeId)}
                  </div>
                  <h3 className="font-semibold text-gray-900 capitalize mb-2">{themeId}</h3>
                  <div className="flex justify-center space-x-1">
                    {[theme.light.primary[500], theme.light.secondary[500], theme.light.accent[500]].map((color, idx) => (
                      <div key={idx} className="w-4 h-4 rounded-full" style={{ backgroundColor: color }} />
                    ))}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Mode Selection */}
        {step === 'mode' && (
          <div className="p-8 text-center">
            <div className="mb-8">
              <Sun className="w-16 h-16 mx-auto mb-4 text-primary-600" />
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Light or Dark?</h2>
              <p className="text-gray-600">Choose your preferred display mode</p>
            </div>

            <div className="grid grid-cols-2 gap-6">
              {(['light', 'dark'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => handleModeSelect(mode)}
                  className={`p-6 border-2 rounded-xl transition-all duration-200 ${
                    selectedMode === mode ? 'border-primary-400 bg-primary-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-center mb-4">
                    {mode === 'light' ? <Sun className="w-12 h-12 text-yellow-500" /> : <Moon className="w-12 h-12 text-indigo-500" />}
                  </div>
                  <h3 className="font-semibold text-gray-900 capitalize mb-2">{mode} Mode</h3>
                  <p className="text-sm text-gray-600">
                    {mode === 'light' ? 'Bright and clean interface' : 'Easy on the eyes'}
                  </p>
                </button>
              ))}
            </div>

            <button
              onClick={() => setStep('theme')}
              className="mt-6 px-4 py-2 text-gray-600 hover:text-gray-800 flex items-center mx-auto"
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> Back
            </button>
          </div>
        )}

        {/* Preview */}
        {step === 'preview' && (
          <div className="p-8 text-center">
            <div className="mb-8">
              <Check className="w-16 h-16 mx-auto mb-4 text-green-600" />
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Looking Good!</h2>
              <p className="text-gray-600">Here's a preview of your selected theme</p>
            </div>

            <div className="mb-8 p-6 rounded-xl" style={{
              backgroundColor: themes[selectedTheme as ThemeId][selectedMode as ThemeMode].background,
              color: themes[selectedTheme as ThemeId][selectedMode as ThemeMode].text.primary
            }}>
              <h3 className="text-xl font-semibold mb-2">Rate My Rest</h3>
              <p className="mb-4">Your personalized restaurant discovery experience</p>
              <div className="flex justify-center space-x-2">
                {[themes[selectedTheme as ThemeId][selectedMode as ThemeMode].primary[500],
                  themes[selectedTheme as ThemeId][selectedMode as ThemeMode].secondary[500],
                  themes[selectedTheme as ThemeId][selectedMode as ThemeMode].accent[500]].map((color, idx) => (
                  <div key={idx} className="w-6 h-6 rounded-full" style={{ backgroundColor: color }} />
                ))}
              </div>
            </div>

            <div className="flex justify-center space-x-4">
              <button
                onClick={() => setStep('mode')}
                className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center"
              >
                <ChevronLeft className="w-4 h-4 mr-1" /> Back
              </button>
              <button
                onClick={handleThemeConfirm}
                className="px-8 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center"
              >
                Continue <ChevronRight className="w-4 h-4 ml-1" />
              </button>
            </div>
          </div>
        )}

        {/* Survey */}
        {step === 'survey' && currentRoundData && (
          <div className="p-8">
            <div className="mb-8">
              <div className="flex items-center justify-center mb-4 text-primary-600">
                {currentRoundData.icon}
              </div>
              <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">
                {currentRoundData.title}
              </h2>
              <p className="text-gray-600 text-center">{currentRoundData.subtitle}</p>

              <div className="flex justify-center mt-4">
                <div className="flex space-x-2">
                  {surveyRounds.map((_, idx) => (
                    <div key={idx} className={`w-3 h-3 rounded-full ${
                      idx === currentSurveyRound ? 'bg-primary-600' :
                      idx < currentSurveyRound ? 'bg-green-500' : 'bg-gray-300'
                    }`} />
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
              {currentRoundData.options.map((option, index) => (
                <button
                  key={option.id}
                  ref={el => bubbleRefs.current[index] = el}
                  onClick={() => toggleSurveySelection(option.id)}
                  className={`p-4 rounded-xl border-2 transition-all duration-300 transform hover:scale-105 ${
                    option.color
                  } ${
                    currentSelections.includes(option.id)
                      ? 'ring-4 ring-primary-300 border-primary-400 scale-105'
                      : 'border-gray-300'
                  }`}
                >
                  <div className="text-3xl mb-2">{option.emoji}</div>
                  <div className="text-sm font-medium text-gray-800">{option.label}</div>
                  {currentSelections.includes(option.id) && (
                    <div className="absolute top-2 right-2">
                      <Check className="w-5 h-5 text-primary-600" />
                    </div>
                  )}
                </button>
              ))}
            </div>

            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-500">
                Selected: {currentSelections.length} / {currentRoundData.maxSelections}
                {!canProceed && ` (min: ${currentRoundData.minSelections})`}
              </div>

              <div className="flex space-x-3">
                {currentSurveyRound > 0 && (
                  <button
                    onClick={handleSurveyPrev}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center"
                  >
                    <ArrowLeft className="w-4 h-4 mr-1" /> Back
                  </button>
                )}

                <button
                  onClick={handleSurveyNext}
                  disabled={!canProceed || isSubmitting}
                  className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {isSubmitting ? (
                    'Saving...'
                  ) : currentSurveyRound === surveyRounds.length - 1 ? (
                    <>Complete <Check className="w-4 h-4 ml-1" /></>
                  ) : (
                    <>Next <ArrowRight className="w-4 h-4 ml-1" /></>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserOnboarding;