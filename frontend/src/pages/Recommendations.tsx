import React, { useState, useEffect } from 'react';
import { recommendationsAPI, ratingsAPI } from '../services/api';
import { Restaurant, Rating } from '../types';
import RestaurantCard from '../components/RestaurantCard';
import { useAuth } from '../hooks/useAuth';
import { Sparkles, TrendingUp, Heart, Brain, Zap } from 'lucide-react';
import toast from 'react-hot-toast';

const Recommendations: React.FC = () => {
  const [recommendations, setRecommendations] = useState<Restaurant[]>([]);
  const [userRatings, setUserRatings] = useState<Record<number, Rating>>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'for-you' | 'trending' | 'favorites'>('for-you');
  const { user } = useAuth();

  useEffect(() => {
    loadRecommendations();
    loadUserRatings();
  }, [activeTab]);

  const loadRecommendations = async () => {
    try {
      setLoading(true);
      let data: Restaurant[] = [];

      switch (activeTab) {
        case 'for-you':
          data = await recommendationsAPI.getUserRecommendations('for-you');
          break;
        case 'trending':
          data = await recommendationsAPI.getUserRecommendations('trending');
          break;
        case 'favorites':
          data = await recommendationsAPI.getUserRecommendations('favorites');
          break;
      }

      setRecommendations(data);
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Failed to load recommendations';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const loadUserRatings = async () => {
    try {
      const ratings = await ratingsAPI.getUserRatings();
      const ratingsMap = ratings.reduce((acc, rating) => {
        acc[rating.restaurant_id] = rating;
        return acc;
      }, {} as Record<number, Rating>);
      setUserRatings(ratingsMap);
    } catch (error) {
      // User might not have any ratings yet
    }
  };

  const handleRatingUpdate = () => {
    loadUserRatings();
    setTimeout(loadRecommendations, 1000);
  };

  const tabs = [
    {
      id: 'for-you' as const,
      label: 'For You',
      icon: Sparkles,
      desc: 'AI-powered picks just for you',
      gradient: 'from-primary-500 to-accent-500'
    },
    {
      id: 'trending' as const,
      label: 'Trending',
      icon: TrendingUp,
      desc: 'What everyone\'s talking about',
      gradient: 'from-accent-500 to-secondary-500'
    },
    {
      id: 'favorites' as const,
      label: 'Similar',
      icon: Heart,
      desc: 'More like what you love',
      gradient: 'from-secondary-500 to-primary-500'
    }
  ];

  const LoadingSkeleton = () => (
    <div className="space-y-6">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="card p-6 animate-pulse">
          <div className="flex items-center space-x-4 mb-4">
            <div className="w-16 h-16 bg-neutral-200 rounded-full"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-neutral-200 rounded w-3/4"></div>
              <div className="h-3 bg-neutral-200 rounded w-1/2"></div>
            </div>
          </div>
          <div className="h-64 bg-neutral-200 rounded-xl mb-4"></div>
          <div className="space-y-2">
            <div className="h-4 bg-neutral-200 rounded w-full"></div>
            <div className="h-4 bg-neutral-200 rounded w-2/3"></div>
          </div>
        </div>
      ))}
    </div>
  );

  const EmptyState = () => (
    <div className="text-center py-16">
      <div className="w-24 h-24 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-6">
        <Brain className="w-12 h-12 text-white" />
      </div>
      <h3 className="heading-3 mb-3">Building Your Recommendations</h3>
      <p className="text-neutral-600 mb-6 max-w-md mx-auto">
        Rate a few restaurants to help our AI understand your taste preferences and get personalized recommendations!
      </p>
      <button
        onClick={() => window.location.href = '/'}
        className="btn btn-primary"
      >
        <Zap className="w-4 h-4 mr-2" />
        Discover Restaurants
      </button>
    </div>
  );

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="bg-gradient-primary text-white py-16">
        <div className="max-w-2xl mx-auto text-center px-4">
          <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Sparkles className="w-10 h-10" />
          </div>
          <h1 className="heading-1 mb-4">Recommendations</h1>
          <p className="text-lg text-white/90">
            Discover your next favorite spot with AI-powered recommendations
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white border-b border-neutral-100 sticky top-16 z-40">
        <div className="max-w-2xl mx-auto px-4">
          <div className="flex overflow-x-auto scrollbar-hide">
            {tabs.map(({ id, label, icon: Icon, desc, gradient }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex-shrink-0 px-6 py-4 border-b-2 transition-all duration-300 ${
                  activeTab === id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-neutral-600 hover:text-neutral-800'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <div className={`p-2 rounded-lg ${
                    activeTab === id
                      ? `bg-gradient-to-r ${gradient} text-white`
                      : 'bg-neutral-100 text-neutral-600'
                  } transition-all duration-300`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <div className="font-medium text-sm">{label}</div>
                    <div className="text-xs text-neutral-500 hidden sm:block">{desc}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="feed-container">
        {loading ? (
          <LoadingSkeleton />
        ) : recommendations.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {/* Tab-specific header */}
            <div className="mb-6 p-6 bg-gradient-to-r from-white to-neutral-50 rounded-2xl border border-neutral-100">
              <div className="flex items-center space-x-3 mb-2">
                {tabs.find(t => t.id === activeTab)?.icon && (
                  <div className={`p-2 rounded-lg bg-gradient-to-r ${tabs.find(t => t.id === activeTab)?.gradient} text-white`}>
                    {React.createElement(tabs.find(t => t.id === activeTab)!.icon, { className: 'w-5 h-5' })}
                  </div>
                )}
                <h2 className="heading-4">
                  {tabs.find(t => t.id === activeTab)?.label} Recommendations
                </h2>
              </div>
              <p className="text-neutral-600 text-sm">
                {activeTab === 'for-you' && 'Powered by machine learning and your taste profile'}
                {activeTab === 'trending' && 'Based on community ratings and recent activity'}
                {activeTab === 'favorites' && 'Similar to restaurants you\'ve liked before'}
              </p>
            </div>

            {/* Restaurant Cards */}
            <div className="stagger-reveal space-y-6">
              {recommendations.map((restaurant, index) => (
                <div key={restaurant.id} style={{ animationDelay: `${index * 0.1}s` }}>
                  <RestaurantCard
                    restaurant={restaurant}
                    showRecommendationScore={true}
                    showDistance={true}
                    userRating={userRatings[restaurant.id]}
                    onRatingUpdate={handleRatingUpdate}
                  />
                </div>
              ))}
            </div>

            {/* Fun Facts Footer */}
            <div className="mt-12 bg-gradient-to-r from-primary-50 to-accent-50 py-12 rounded-2xl">
              <div className="max-w-2xl mx-auto px-4 text-center">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div>
                    <div className="text-2xl font-bold text-primary-600 mb-2">
                      {recommendations.length}
                    </div>
                    <div className="text-sm text-neutral-600">Recommendations</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-accent-600 mb-2">AI</div>
                    <div className="text-sm text-neutral-600">Powered Matching</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-secondary-600 mb-2">24/7</div>
                    <div className="text-sm text-neutral-600">Always Learning</div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Recommendations;