import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Heart, Star, Zap } from 'lucide-react';

interface Bubble {
  id: string;
  text: string;
  category: string;
  value: string;
  x: number;
  y: number;
  size: number;
  color: string;
  weight: number;
  round: number;
}

interface BubbleSurveyProps {
  onComplete: (preferences: PreferenceData) => void;
  onSkip?: () => void;
}

interface PreferenceData {
  [category: string]: {
    [value: string]: {
      weight: number;
      round_survived: number;
      selection_order: number;
    }
  }
}

const SURVEY_DATA = {
  // Round 1: Cuisine Types
  cuisine_types: [
    { value: 'italian', text: '🍝 Italian', color: '#ff6b6b' },
    { value: 'mexican', text: '🌮 Mexican', color: '#4ecdc4' },
    { value: 'chinese', text: '🥢 Chinese', color: '#45b7d1' },
    { value: 'japanese', text: '🍣 Japanese', color: '#96ceb4' },
    { value: 'indian', text: '🍛 Indian', color: '#feca57' },
    { value: 'thai', text: '🍜 Thai', color: '#ff9ff3' },
    { value: 'american', text: '🍔 American', color: '#54a0ff' },
    { value: 'french', text: '🥐 French', color: '#5f27cd' },
    { value: 'mediterranean', text: '🫒 Mediterranean', color: '#00d2d3' },
    { value: 'korean', text: '🍲 Korean', color: '#ff6348' },
    { value: 'vietnamese', text: '🍲 Vietnamese', color: '#2ed573' },
    { value: 'middle_eastern', text: '🧆 Middle Eastern', color: '#ffa502' }
  ],

  // Round 2: Dining Atmosphere
  atmosphere: [
    { value: 'romantic', text: '💕 Romantic', color: '#ff6b9d' },
    { value: 'casual', text: '😊 Casual', color: '#4ecdc4' },
    { value: 'upscale', text: '✨ Upscale', color: '#45b7d1' },
    { value: 'family_friendly', text: '👨‍👩‍👧‍👦 Family', color: '#96ceb4' },
    { value: 'lively', text: '🎉 Lively', color: '#feca57' },
    { value: 'quiet', text: '🤫 Quiet', color: '#ff9ff3' },
    { value: 'outdoor', text: '🌳 Outdoor', color: '#2ed573' },
    { value: 'cozy', text: '🔥 Cozy', color: '#ff6348' }
  ],

  // Round 3: Price Preferences
  price_comfort: [
    { value: 'budget_friendly', text: '💰 Budget Friendly', color: '#2ed573' },
    { value: 'moderate', text: '💳 Moderate', color: '#feca57' },
    { value: 'upscale_worth_it', text: '💎 Upscale Worth It', color: '#5f27cd' },
    { value: 'price_no_object', text: '🤑 Price No Object', color: '#ff6348' },
    { value: 'happy_hour', text: '🍻 Happy Hour Lover', color: '#54a0ff' },
    { value: 'deal_seeker', text: '🏷️ Deal Seeker', color: '#ff9ff3' }
  ],

  // Round 4: Service Style
  service_style: [
    { value: 'fast_casual', text: '⚡ Fast Casual', color: '#feca57' },
    { value: 'full_service', text: '🍽️ Full Service', color: '#5f27cd' },
    { value: 'takeout', text: '📦 Takeout', color: '#4ecdc4' },
    { value: 'buffet', text: '🍱 Buffet', color: '#ff6b6b' },
    { value: 'food_truck', text: '🚚 Food Truck', color: '#54a0ff' },
    { value: 'fine_dining', text: '🥂 Fine Dining', color: '#2ed573' }
  ],

  // Round 5: Special Dietary Needs
  dietary_preferences: [
    { value: 'vegetarian_friendly', text: '🥗 Vegetarian', color: '#2ed573' },
    { value: 'vegan_options', text: '🌱 Vegan', color: '#26de81' },
    { value: 'gluten_free', text: '🌾 Gluten Free', color: '#feca57' },
    { value: 'keto_friendly', text: '🥑 Keto', color: '#ff6b6b' },
    { value: 'healthy_options', text: '💪 Healthy', color: '#4ecdc4' },
    { value: 'comfort_food', text: '🍕 Comfort Food', color: '#ff9ff3' },
    { value: 'no_restrictions', text: '🍖 No Restrictions', color: '#54a0ff' }
  ],

  // Round 6: Food Adventure Level
  adventure_level: [
    { value: 'stick_to_favorites', text: '❤️ Stick to Favorites', color: '#ff6b6b' },
    { value: 'mild_adventurer', text: '🌟 Mild Explorer', color: '#feca57' },
    { value: 'food_explorer', text: '🗺️ Food Explorer', color: '#4ecdc4' },
    { value: 'extreme_foodie', text: '🚀 Extreme Foodie', color: '#5f27cd' },
    { value: 'try_anything_once', text: '🎯 Try Anything', color: '#2ed573' }
  ]
};

export const BubbleSurvey: React.FC<BubbleSurveyProps> = ({ onComplete, onSkip }) => {
  const [currentRound, setCurrentRound] = useState(0);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [selectedBubbles, setSelectedBubbles] = useState<Set<string>>(new Set());
  const [preferences, setPreferences] = useState<PreferenceData>({});
  const [gamePhase, setGamePhase] = useState<'intro' | 'playing' | 'transition' | 'complete'>('intro');
  const [selectionCount, setSelectionCount] = useState(0);
  const [roundTimer, setRoundTimer] = useState(15);
  const [score, setScore] = useState(0);

  const categories = Object.keys(SURVEY_DATA);
  const currentCategory = categories[currentRound];
  const maxSelections = Math.max(3, Math.floor(SURVEY_DATA[currentCategory as keyof typeof SURVEY_DATA].length * 0.6));

  const generateBubbles = useCallback((categoryData: any[], round: number) => {
    const containerWidth = window.innerWidth * 0.8;
    const containerHeight = window.innerHeight * 0.6;

    return categoryData.map((item, index) => ({
      id: `${item.value}-${round}`,
      text: item.text,
      category: currentCategory,
      value: item.value,
      x: Math.random() * (containerWidth - 120) + 60,
      y: Math.random() * (containerHeight - 120) + 60,
      size: Math.random() * 40 + 80, // 80-120px
      color: item.color,
      weight: 0,
      round: round
    }));
  }, [currentCategory]);

  useEffect(() => {
    if (gamePhase === 'playing') {
      const categoryData = SURVEY_DATA[currentCategory as keyof typeof SURVEY_DATA];
      const newBubbles = generateBubbles(categoryData, currentRound + 1);
      setBubbles(newBubbles);
      setSelectedBubbles(new Set());
      setSelectionCount(0);
      setRoundTimer(15);
    }
  }, [currentRound, gamePhase, generateBubbles, currentCategory]);

  // Round timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (gamePhase === 'playing' && roundTimer > 0) {
      interval = setInterval(() => {
        setRoundTimer(prev => {
          if (prev <= 1) {
            handleRoundComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [gamePhase, roundTimer]);

  const handleBubbleClick = (bubble: Bubble) => {
    if (selectedBubbles.has(bubble.id) || selectedBubbles.size >= maxSelections) return;

    setSelectedBubbles(prev => new Set([...Array.from(prev), bubble.id]));
    setSelectionCount(prev => prev + 1);

    // Calculate weight based on selection order (earlier = higher weight)
    const weight = maxSelections - selectionCount + 1;

    setPreferences(prev => ({
      ...prev,
      [currentCategory]: {
        ...prev[currentCategory],
        [bubble.value]: {
          weight: weight,
          round_survived: currentRound + 1,
          selection_order: selectionCount + 1
        }
      }
    }));

    setScore(prev => prev + weight * 10);

    // Auto-advance if max selections reached
    if (selectedBubbles.size + 1 >= maxSelections) {
      setTimeout(handleRoundComplete, 500);
    }
  };

  const handleRoundComplete = () => {
    if (currentRound < categories.length - 1) {
      setGamePhase('transition');
      setTimeout(() => {
        setCurrentRound(prev => prev + 1);
        setGamePhase('playing');
      }, 1500);
    } else {
      setGamePhase('complete');
      setTimeout(() => {
        onComplete(preferences);
      }, 2000);
    }
  };

  const startSurvey = () => {
    setGamePhase('playing');
  };

  if (gamePhase === 'intro') {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-2xl p-8 max-w-md mx-4 text-center"
        >
          <div className="mb-6">
            <Sparkles className="w-16 h-16 text-purple-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              🫧 Taste Bubbles Game!
            </h2>
            <p className="text-gray-600">
              Pop bubbles that match your taste preferences!
              The survivors will help us find your perfect restaurants.
            </p>
          </div>

          <div className="bg-purple-50 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-purple-800 mb-2">How to Play:</h3>
            <ul className="text-sm text-purple-700 space-y-1 text-left">
              <li>• Pop bubbles you like (max {maxSelections} per round)</li>
              <li>• Earlier choices get higher priority</li>
              <li>• Survivors advance to build your taste profile</li>
              <li>• 6 rounds, 15 seconds each</li>
            </ul>
          </div>

          <div className="flex gap-3">
            <button
              onClick={startSurvey}
              className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-lg font-semibold hover:from-purple-600 hover:to-pink-600 transition-all"
            >
              🎮 Start Game
            </button>
            {onSkip && (
              <button
                onClick={onSkip}
                className="px-4 py-3 text-gray-500 hover:text-gray-700 transition-colors"
              >
                Skip
              </button>
            )}
          </div>
        </motion.div>
      </div>
    );
  }

  if (gamePhase === 'transition') {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1.1 }}
          exit={{ scale: 0.8 }}
          className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl p-8 text-center text-white"
        >
          <Zap className="w-16 h-16 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">
            Round {currentRound + 1} Complete!
          </h2>
          <p className="text-lg">
            {selectedBubbles.size} taste preferences captured
          </p>
          <motion.div
            className="text-3xl font-bold mt-2"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 0.5 }}
          >
            +{selectionCount * 50} points
          </motion.div>
        </motion.div>
      </div>
    );
  }

  if (gamePhase === 'complete') {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-gradient-to-br from-green-400 to-blue-500 rounded-2xl p-8 text-center text-white max-w-md mx-4"
        >
          <Star className="w-16 h-16 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">
            🎉 Taste Profile Complete!
          </h2>
          <p className="text-lg mb-4">
            We've learned your preferences across {Object.keys(preferences).length} categories
          </p>
          <div className="bg-white bg-opacity-20 rounded-lg p-4 mb-4">
            <div className="text-2xl font-bold">Final Score: {score}</div>
            <div className="text-sm">Taste Insights Unlocked!</div>
          </div>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="text-4xl mb-4"
          >
            🫧
          </motion.div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500 z-50">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-4 bg-black bg-opacity-20 text-white">
        <div className="flex justify-between items-center max-w-4xl mx-auto">
          <div>
            <h2 className="text-xl font-bold">
              Round {currentRound + 1}/6: {currentCategory.replace('_', ' ').toUpperCase()}
            </h2>
            <p className="text-sm opacity-80">
              Select your favorites ({selectedBubbles.size}/{maxSelections})
            </p>
          </div>

          <div className="text-right">
            <div className="text-2xl font-bold">{score} pts</div>
            <div className="flex items-center gap-2">
              <div className={`text-lg font-mono ${roundTimer <= 5 ? 'text-red-200' : ''}`}>
                {roundTimer}s
              </div>
              <motion.div
                animate={roundTimer <= 5 ? { scale: [1, 1.2, 1] } : {}}
                transition={{ duration: 0.5, repeat: Infinity }}
              >
                ⏰
              </motion.div>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-2 bg-black bg-opacity-30 rounded-full h-2">
          <motion.div
            className="bg-yellow-400 h-2 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${((currentRound + 1) / categories.length) * 100}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>

      {/* Bubble Game Area */}
      <div className="pt-24 pb-8 px-4 h-full overflow-hidden">
        <div className="relative max-w-6xl mx-auto h-full">
          <AnimatePresence>
            {bubbles.map((bubble) => (
              <motion.button
                key={bubble.id}
                className={`absolute rounded-full flex items-center justify-center text-white font-semibold shadow-lg transform transition-all duration-200 ${
                  selectedBubbles.has(bubble.id)
                    ? 'ring-4 ring-yellow-400 scale-110'
                    : 'hover:scale-105 hover:shadow-xl'
                } ${
                  selectedBubbles.size >= maxSelections && !selectedBubbles.has(bubble.id)
                    ? 'opacity-50 cursor-not-allowed'
                    : 'cursor-pointer'
                }`}
                style={{
                  left: bubble.x,
                  top: bubble.y,
                  width: bubble.size,
                  height: bubble.size,
                  backgroundColor: bubble.color,
                  fontSize: bubble.size < 90 ? '0.8rem' : '0.9rem'
                }}
                onClick={() => handleBubbleClick(bubble)}
                initial={{ scale: 0, rotate: -180 }}
                animate={{
                  scale: selectedBubbles.has(bubble.id) ? 1.1 : 1,
                  rotate: 0,
                  y: selectedBubbles.has(bubble.id) ? -10 : 0
                }}
                exit={{
                  scale: 0,
                  rotate: 180,
                  opacity: 0
                }}
                transition={{
                  type: "spring",
                  stiffness: 260,
                  damping: 20,
                  delay: Math.random() * 0.5
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <div className="text-center p-2">
                  {bubble.text}
                  {selectedBubbles.has(bubble.id) && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-2 -right-2 bg-yellow-400 text-yellow-800 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold"
                    >
                      {maxSelections - Array.from(selectedBubbles).indexOf(bubble.id)}
                    </motion.div>
                  )}
                </div>
              </motion.button>
            ))}
          </AnimatePresence>

          {/* Floating particles for atmosphere */}
          <div className="absolute inset-0 pointer-events-none">
            {[...Array(10)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 bg-white opacity-20 rounded-full"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`
                }}
                animate={{
                  y: [0, -20, 0],
                  opacity: [0.2, 0.5, 0.2]
                }}
                transition={{
                  duration: 3 + Math.random() * 2,
                  repeat: Infinity,
                  delay: Math.random() * 2
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Skip Round Button */}
      <div className="absolute bottom-4 right-4">
        <motion.button
          onClick={handleRoundComplete}
          className="bg-black bg-opacity-30 text-white px-4 py-2 rounded-lg hover:bg-opacity-50 transition-all"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Skip Round →
        </motion.button>
      </div>
    </div>
  );
};