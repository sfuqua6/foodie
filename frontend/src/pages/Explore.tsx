import React, { useState, useEffect } from 'react';
import { restaurantsAPI, ratingsAPI } from '../services/api';
import { Restaurant, Rating } from '../types';
import RestaurantCard from '../components/RestaurantCard';
import { useLocation } from '../hooks/useLocation';
import { MapPin, TrendingUp, Award, Compass, Filter, Search } from 'lucide-react';
import toast from 'react-hot-toast';

const Explore: React.FC = () => {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [userRatings, setUserRatings] = useState<Record<number, Rating>>({});
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<'nearby' | 'trending' | 'top-rated'>('nearby');

  const { location } = useLocation();

  useEffect(() => {
    loadRestaurants();
    loadUserRatings();
  }, [activeCategory, location]);

  const loadRestaurants = async () => {
    try {
      setLoading(true);
      let data: Restaurant[] = [];

      const searchParams = {
        user_lat: location?.latitude,
        user_lng: location?.longitude,
        limit: 20,
        offset: 0
      };

      switch (activeCategory) {
        case 'nearby':
          data = await restaurantsAPI.search(searchParams);
          break;
        case 'trending':
          // Sort by recent activity/ratings
          data = await restaurantsAPI.search({
            ...searchParams,
            min_rating: 3.5
          });
          break;
        case 'top-rated':
          data = await restaurantsAPI.search({
            ...searchParams,
            min_rating: 4.0
          });
          break;
      }

      setRestaurants(data);
    } catch (error) {
      toast.error('Failed to load restaurants 😕');
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
  };

  const categories = [
    {
      id: 'nearby' as const,
      label: 'Nearby',
      icon: MapPin,
      desc: 'Restaurants close to you',
      gradient: 'from-primary-500 to-secondary-500'
    },
    {
      id: 'trending' as const,
      label: 'Trending',
      icon: TrendingUp,
      desc: 'Popular right now',
      gradient: 'from-accent-500 to-primary-500'
    },
    {
      id: 'top-rated' as const,
      label: 'Top Rated',
      icon: Award,
      desc: 'Highest rated spots',
      gradient: 'from-secondary-500 to-accent-500'
    }
  ];

  const LoadingSkeleton = () => (
    <div className="grid grid-cols-1 gap-6">
      {[...Array(4)].map((_, i) => (
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

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="bg-gradient-primary text-white py-16">
        <div className="max-w-2xl mx-auto text-center px-4">
          <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Compass className="w-10 h-10" />
          </div>
          <h1 className="heading-1 mb-4">Explore Chapel Hill</h1>
          <p className="text-lg text-white/90">
            Discover amazing restaurants and hidden gems around town
          </p>
        </div>
      </div>

      {/* Category Navigation */}
      <div className="bg-white border-b border-neutral-100 sticky top-16 z-40">
        <div className="max-w-2xl mx-auto px-4">
          <div className="flex overflow-x-auto scrollbar-hide">
            {categories.map(({ id, label, icon: Icon, desc, gradient }) => (
              <button
                key={id}
                onClick={() => setActiveCategory(id)}
                className={`flex-shrink-0 px-6 py-4 border-b-2 transition-all duration-300 ${
                  activeCategory === id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-neutral-600 hover:text-neutral-800'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <div className={`p-2 rounded-lg ${
                    activeCategory === id
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
        {/* Category Header */}
        <div className="mb-6 p-6 bg-gradient-to-r from-white to-neutral-50 rounded-2xl border border-neutral-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {categories.find(c => c.id === activeCategory)?.icon && (
                <div className={`p-2 rounded-lg bg-gradient-to-r ${categories.find(c => c.id === activeCategory)?.gradient} text-white`}>
                  {React.createElement(categories.find(c => c.id === activeCategory)!.icon, { className: 'w-5 h-5' })}
                </div>
              )}
              <div>
                <h2 className="heading-4">
                  {categories.find(c => c.id === activeCategory)?.label} Restaurants
                </h2>
                <p className="text-neutral-600 text-sm">
                  {categories.find(c => c.id === activeCategory)?.desc}
                  {location && activeCategory === 'nearby' && ' • Chapel Hill, NC'}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <div className="text-xs text-neutral-500">
                {restaurants.length} found
              </div>
            </div>
          </div>
        </div>

        {/* Restaurant Cards */}
        {loading ? (
          <LoadingSkeleton />
        ) : restaurants.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-neutral-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <Compass className="w-8 h-8 text-neutral-400" />
            </div>
            <h3 className="heading-4 mb-2">No restaurants found</h3>
            <p className="text-neutral-600 mb-6">
              Try exploring a different category or check back later.
            </p>
            <button
              onClick={() => setActiveCategory('nearby')}
              className="btn btn-primary"
            >
              Browse Nearby
            </button>
          </div>
        ) : (
          <div className="stagger-reveal space-y-6">
            {restaurants.map((restaurant, index) => (
              <div key={restaurant.id} style={{ animationDelay: `${index * 0.1}s` }}>
                <RestaurantCard
                  restaurant={restaurant}
                  showDistance={activeCategory === 'nearby'}
                  userRating={userRatings[restaurant.id]}
                  onRatingUpdate={handleRatingUpdate}
                />
              </div>
            ))}
          </div>
        )}

        {/* Fun Stats Footer */}
        <div className="mt-12 bg-gradient-to-r from-primary-50 to-secondary-50 py-12 rounded-2xl">
          <div className="text-center">
            <h3 className="heading-3 mb-6">Chapel Hill Food Scene</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div>
                <div className="text-2xl font-bold text-primary-600 mb-2">200+</div>
                <div className="text-sm text-neutral-600">Restaurants</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-accent-600 mb-2">15+</div>
                <div className="text-sm text-neutral-600">Cuisines</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-secondary-600 mb-2">4.2</div>
                <div className="text-sm text-neutral-600">Avg Rating</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Explore;