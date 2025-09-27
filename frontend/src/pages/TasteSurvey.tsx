import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BubbleSurvey } from '../components/BubbleSurvey';
import { useAuth } from '../hooks/useAuth';
import { submitBubblePreferences, getBubblePreferences } from '../services/api';
import { Brain, Sparkles, Star, TrendingUp, Users, Zap } from 'lucide-react';
import toast from 'react-hot-toast';

interface PreferenceData {
  [category: string]: {
    [value: string]: {
      weight: number;
      round_survived: number;
      selection_order: number;
    }
  }
}

interface TasteSurveyProps {
  onComplete?: () => void;
}

export const TasteSurvey: React.FC<TasteSurveyProps> = ({ onComplete }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [surveyStage, setSurveyStage] = useState<'intro' | 'survey' | 'results' | 'complete'>('intro');
  const [results, setResults] = useState<any>(null);
  const [existingPreferences, setExistingPreferences] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkExistingPreferences();
  }, [user]);

  const checkExistingPreferences = async () => {
    if (!user) return;

    try {
      const preferences = await getBubblePreferences();
      setExistingPreferences(preferences);
      setSurveyStage('complete');
    } catch (error) {
      // No existing preferences, which is fine
      setSurveyStage('intro');
    }
  };

  const handleSurveyComplete = async (preferences: PreferenceData) => {
    if (!user) return;

    setLoading(true);
    try {
      const result = await submitBubblePreferences({
        cuisine_preferences: preferences.cuisine_types || {},
        atmosphere_preferences: preferences.atmosphere || {},
        price_preferences: preferences.price_comfort || {},
        service_preferences: preferences.service_style || {},
        dietary_preferences: preferences.dietary_preferences || {},
        adventure_preferences: preferences.adventure_level || {},
        total_rounds_completed: Object.keys(preferences).length,
        final_score: calculateFinalScore(preferences)
      });

      setResults(result);
      setSurveyStage('results');

      toast.success('🎉 Taste profile created! Your recommendations are getting smarter.');
    } catch (error) {
      console.error('Error submitting preferences:', error);
      toast.error('Failed to save preferences. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const calculateFinalScore = (preferences: PreferenceData): number => {
    let totalScore = 0;
    Object.values(preferences).forEach(category => {
      Object.values(category).forEach(item => {
        totalScore += item.weight * 10;
      });
    });
    return totalScore;
  };

  const handleSkipSurvey = () => {
    navigate('/explore');
  };

  const handleRetakeSurvey = () => {
    setExistingPreferences(null);
    setSurveyStage('survey');
  };

  const handleViewRecommendations = () => {
    if (onComplete) {
      onComplete();
    } else {
      navigate('/recommendations');
    }
  };

  if (surveyStage === 'intro') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-400 via-pink-500 to-red-500 flex items-center justify-center p-4">
        <div className="max-w-2xl mx-auto bg-white rounded-3xl shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-8 text-white text-center">
            <Brain className="w-16 h-16 mx-auto mb-4" />
            <h1 className="text-3xl font-bold mb-2">🧠 Build Your Taste Profile</h1>
            <p className="text-xl opacity-90">
              Let our AI learn your preferences through a fun bubble game!
            </p>
          </div>

          <div className="p-8">
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <div className="flex items-start space-x-3">
                <Sparkles className="w-8 h-8 text-purple-500 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-gray-800">Personalized Recommendations</h3>
                  <p className="text-gray-600 text-sm">Get restaurant suggestions tailored to your exact taste preferences.</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <Users className="w-8 h-8 text-blue-500 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-gray-800">Find Your Taste Twin</h3>
                  <p className="text-gray-600 text-sm">Connect with users who have similar food preferences.</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <TrendingUp className="w-8 h-8 text-green-500 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-gray-800">Smart Learning</h3>
                  <p className="text-gray-600 text-sm">The more you rate, the smarter your recommendations become.</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <Zap className="w-8 h-8 text-yellow-500 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-gray-800">Dynamic Ratings</h3>
                  <p className="text-gray-600 text-sm">See ratings weighted by people with tastes similar to yours.</p>
                </div>
              </div>
            </div>

            <div className="bg-purple-50 rounded-xl p-6 mb-6">
              <h3 className="font-semibold text-purple-800 mb-3">🎮 How the Taste Game Works:</h3>
              <ul className="space-y-2 text-purple-700">
                <li className="flex items-center space-x-2">
                  <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                  <span>6 rounds of preference bubbles (cuisines, atmosphere, price, service, dietary, adventure)</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                  <span>Pop bubbles you like - earlier choices get higher priority</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                  <span>Creates a hierarchical preference profile for smarter recommendations</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                  <span>Takes ~3 minutes, but makes your entire experience better!</span>
                </li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => setSurveyStage('survey')}
                className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-8 py-4 rounded-xl font-bold text-lg hover:from-purple-600 hover:to-pink-600 transition-all transform hover:scale-105 shadow-lg"
              >
                🚀 Start Taste Survey
              </button>

              <button
                onClick={handleSkipSurvey}
                className="px-6 py-4 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Skip for now →
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (surveyStage === 'survey') {
    return <BubbleSurvey onComplete={handleSurveyComplete} onSkip={handleSkipSurvey} />;
  }

  if (surveyStage === 'results') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-400 via-blue-500 to-purple-600 flex items-center justify-center p-4">
        <div className="max-w-4xl mx-auto bg-white rounded-3xl shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-green-500 to-blue-600 p-8 text-white text-center">
            <Star className="w-16 h-16 mx-auto mb-4" />
            <h1 className="text-3xl font-bold mb-2">🎉 Taste Profile Complete!</h1>
            <p className="text-xl opacity-90">
              Your personalized food preferences have been analyzed
            </p>
          </div>

          <div className="p-8">
            {/* Results Summary */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              <div className="bg-purple-50 rounded-xl p-6 text-center">
                <div className="text-3xl font-bold text-purple-600 mb-2">
                  {results?.final_score || 0}
                </div>
                <div className="text-purple-800 font-semibold">Taste Points</div>
                <div className="text-sm text-purple-600 mt-1">Survey completion score</div>
              </div>

              <div className="bg-blue-50 rounded-xl p-6 text-center">
                <div className="text-3xl font-bold text-blue-600 mb-2">
                  {results?.total_rounds_completed || 0}/6
                </div>
                <div className="text-blue-800 font-semibold">Rounds Completed</div>
                <div className="text-sm text-blue-600 mt-1">Preference categories</div>
              </div>

              <div className="bg-green-50 rounded-xl p-6 text-center">
                <div className="text-3xl font-bold text-green-600 mb-2">
                  {Math.round((results?.preference_strength || 0) * 100)}%
                </div>
                <div className="text-green-800 font-semibold">Profile Strength</div>
                <div className="text-sm text-green-600 mt-1">Recommendation accuracy</div>
              </div>
            </div>

            {/* Initial Recommendations Preview */}
            {results?.initial_recommendations && results.initial_recommendations.length > 0 && (
              <div className="mb-8">
                <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                  <Sparkles className="w-6 h-6 mr-2 text-purple-500" />
                  Your First Personalized Recommendations
                </h3>

                <div className="grid md:grid-cols-2 gap-4 mb-6">
                  {results.initial_recommendations.slice(0, 4).map((rec: any, index: number) => (
                    <div key={rec.restaurant_id} className="border rounded-xl p-4 hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold text-gray-800">{rec.name}</h4>
                        <div className="flex items-center space-x-1">
                          <Star className="w-4 h-4 text-yellow-500 fill-current" />
                          <span className="text-sm text-gray-600">{rec.avg_rating}</span>
                        </div>
                      </div>

                      <p className="text-sm text-gray-600 mb-2">{rec.cuisine_type} • {'$'.repeat(rec.price_level)}</p>
                      <p className="text-sm text-purple-600 font-medium">{rec.match_reason}</p>

                      <div className="mt-2 flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className="text-xs text-gray-500">Match</div>
                          <div className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs font-medium">
                            {Math.round(rec.match_score * 100)}%
                          </div>
                        </div>
                        <div className="text-xs text-gray-500">#{index + 1}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Success Message */}
            <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-xl p-6 mb-6">
              <h3 className="font-bold text-purple-800 mb-2">🧠 What happens next?</h3>
              <ul className="space-y-2 text-purple-700">
                <li>• Your preferences will be used to find similar users</li>
                <li>• Restaurant ratings will be weighted based on users like you</li>
                <li>• Recommendations will get more accurate as you rate more places</li>
                <li>• You'll see match scores and explanations for each suggestion</li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={handleViewRecommendations}
                className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-8 py-4 rounded-xl font-bold text-lg hover:from-purple-600 hover:to-pink-600 transition-all transform hover:scale-105 shadow-lg"
              >
                🍽️ View My Recommendations
              </button>

              <button
                onClick={() => navigate('/explore')}
                className="px-6 py-4 text-gray-600 hover:text-gray-800 transition-colors border border-gray-300 rounded-xl hover:bg-gray-50"
              >
                Explore All Restaurants
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Complete stage - for users who already have preferences
  if (surveyStage === 'complete' && existingPreferences) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500 flex items-center justify-center p-4">
        <div className="max-w-2xl mx-auto bg-white rounded-3xl shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-8 text-white text-center">
            <Brain className="w-16 h-16 mx-auto mb-4" />
            <h1 className="text-3xl font-bold mb-2">🎯 Taste Profile Active</h1>
            <p className="text-xl opacity-90">
              Your AI-powered recommendations are ready!
            </p>
          </div>

          <div className="p-8">
            <div className="grid grid-cols-2 gap-6 mb-8">
              <div className="bg-blue-50 rounded-xl p-6 text-center">
                <div className="text-2xl font-bold text-blue-600 mb-2">
                  {existingPreferences.final_score}
                </div>
                <div className="text-blue-800 font-semibold">Taste Score</div>
              </div>

              <div className="bg-purple-50 rounded-xl p-6 text-center">
                <div className="text-2xl font-bold text-purple-600 mb-2">
                  {Math.round(existingPreferences.preference_strength * 100)}%
                </div>
                <div className="text-purple-800 font-semibold">Profile Strength</div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-blue-100 to-purple-100 rounded-xl p-6 mb-6">
              <h3 className="font-bold text-blue-800 mb-2">✨ Your taste profile is working!</h3>
              <p className="text-blue-700 mb-3">
                Survey completed on {new Date(existingPreferences.survey_completed_at).toLocaleDateString()}
              </p>
              <p className="text-blue-600 text-sm">
                The more you rate restaurants, the smarter your recommendations become.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={handleViewRecommendations}
                className="flex-1 bg-gradient-to-r from-blue-500 to-purple-500 text-white px-8 py-4 rounded-xl font-bold text-lg hover:from-blue-600 hover:to-purple-600 transition-all transform hover:scale-105 shadow-lg"
              >
                🎯 View My Recommendations
              </button>

              <button
                onClick={handleRetakeSurvey}
                className="px-6 py-4 text-gray-600 hover:text-gray-800 transition-colors border border-gray-300 rounded-xl hover:bg-gray-50"
              >
                Retake Survey
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};