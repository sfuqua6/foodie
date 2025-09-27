import React, { useState, useEffect, useCallback } from 'react';
import InfiniteScroll from 'react-infinite-scroll-component';
import { restaurantsAPI, ratingsAPI, recommendationsAPI } from '../services/api';
import { Restaurant, Rating, RestaurantSearch } from '../types';
import RestaurantCard from '../components/RestaurantCard';
import IntelligentSearchBar from '../components/IntelligentSearchBar';
import { useLocation } from '../hooks/useLocation';
import { Search, Filter, Sliders, TrendingUp, MapPin, Sparkles, Heart, Brain, Zap } from 'lucide-react';
import toast from 'react-hot-toast';

const Feed: React.FC = () => {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [userRatings, setUserRatings] = useState<Record<number, Rating>>({});
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [mode, setMode] = useState<'discover' | 'for-you'>('discover');
  const [discoverType, setDiscoverType] = useState<'nearby' | 'trending' | 'top-rated'>('nearby');
  const [recommendationType, setRecommendationType] = useState<'for-you' | 'trending' | 'favorites'>('for-you');
  const [filters, setFilters] = useState({
    cuisines: [] as string[],
    priceLevel: [] as number[],
    minRating: 0
  });

  const { location, loading: locationLoading } = useLocation();
  const pageSize = 10;

  // Available filter options
  const cuisineOptions = [
    'American', 'Italian', 'Chinese', 'Mexican', 'Japanese', 'Thai',
    'Indian', 'Pizza', 'Cafe', 'Mediterranean', 'Korean', 'Vietnamese'
  ];

  const priceOptions = [
    { value: 1, label: '$', desc: 'Inexpensive' },
    { value: 2, label: '$$', desc: 'Moderate' },
    { value: 3, label: '$$$', desc: 'Expensive' },
    { value: 4, label: '$$$$', desc: 'Very Expensive' }
  ];

  const loadInitialData = useCallback(async () => {
    try {
      setLoading(true);
      setPage(0);
      let data: Restaurant[] = [];

      if (mode === 'discover') {
        // Search-based discovery with different types
        const baseParams = {
          user_lat: location?.latitude,
          user_lng: location?.longitude,
          limit: pageSize,
          offset: 0
        };

        let searchParams: RestaurantSearch = { ...baseParams };

        switch (discoverType) {
          case 'nearby':
            searchParams = { ...baseParams };
            break;
          case 'trending':
            searchParams = { ...baseParams, min_rating: 3.5 };
            break;
          case 'top-rated':
            searchParams = { ...baseParams, min_rating: 4.0 };
            break;
        }

        data = await restaurantsAPI.search(searchParams);
        setHasMore(data.length === pageSize);
      } else {
        // AI-powered recommendations
        data = await recommendationsAPI.getUserRecommendations(recommendationType);
        setHasMore(false); // Recommendations are not paginated
      }

      setRestaurants(data);
    } catch (error) {
      toast.error(`Failed to load ${mode === 'discover' ? 'restaurants' : 'recommendations'} 😕`);
    } finally {
      setLoading(false);
    }
  }, [location, mode, discoverType, recommendationType]);

  const handleSearch = useCallback(async (query?: string) => {
    try {
      setLoading(true);
      setPage(0);

      let baseParams: any = {
        query: query || searchQuery || undefined,
        user_lat: location?.latitude,
        user_lng: location?.longitude,
        cuisine_filter: filters.cuisines.length ? filters.cuisines : undefined,
        price_filter: filters.priceLevel.length ? filters.priceLevel : undefined,
        min_rating: filters.minRating || undefined,
        limit: pageSize,
        offset: 0
      };

      // Apply discover type filters
      if (!baseParams.min_rating) {
        switch (discoverType) {
          case 'trending':
            baseParams.min_rating = 3.5;
            break;
          case 'top-rated':
            baseParams.min_rating = 4.0;
            break;
        }
      }

      const searchParams = baseParams;

      const data = await restaurantsAPI.search(searchParams);
      setRestaurants(data);
      setHasMore(data.length === pageSize);
    } catch (error) {
      toast.error('Search failed');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, location, filters, discoverType, pageSize]);

  useEffect(() => {
    loadInitialData();
    loadUserRatings();
  }, [loadInitialData]);

  useEffect(() => {
    // Only handle search in discover mode
    if (mode === 'discover') {
      const timer = setTimeout(() => {
        if (searchQuery || filters.cuisines.length || filters.priceLevel.length || filters.minRating > 0) {
          handleSearch();
        } else {
          loadInitialData();
        }
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [searchQuery, filters, mode, handleSearch, loadInitialData]);

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

  const loadMoreRestaurants = async () => {
    if (loading || mode === 'for-you') return;

    try {
      const nextPage = page + 1;
      let baseParams: any = {
        query: searchQuery || undefined,
        user_lat: location?.latitude,
        user_lng: location?.longitude,
        cuisine_filter: filters.cuisines.length ? filters.cuisines : undefined,
        price_filter: filters.priceLevel.length ? filters.priceLevel : undefined,
        min_rating: filters.minRating || undefined,
        limit: pageSize,
        offset: nextPage * pageSize
      };

      // Apply discover type filters
      if (!baseParams.min_rating) {
        switch (discoverType) {
          case 'trending':
            baseParams.min_rating = 3.5;
            break;
          case 'top-rated':
            baseParams.min_rating = 4.0;
            break;
        }
      }

      const searchParams = baseParams;

      const data = await restaurantsAPI.search(searchParams);

      if (data.length === 0) {
        setHasMore(false);
      } else {
        setRestaurants(prev => [...prev, ...data]);
        setPage(nextPage);
        setHasMore(data.length === pageSize);
      }
    } catch (error) {
      toast.error('Failed to load more restaurants');
    }
  };

  const handleIntelligentSearch = (query: string) => {
    setSearchQuery(query);
    handleSearch(query);
  };

  const handleRatingUpdate = useCallback(() => {
    loadUserRatings();
    if (mode === 'for-you') {
      // Refresh recommendations after rating update
      setTimeout(loadInitialData, 1000);
    }
  }, [mode, loadInitialData]);

  const clearFilters = () => {
    setFilters({
      cuisines: [],
      priceLevel: [],
      minRating: 0
    });
    setSearchQuery('');
    setShowFilters(false);
  };

  const toggleCuisine = (cuisine: string) => {
    setFilters(prev => ({
      ...prev,
      cuisines: prev.cuisines.includes(cuisine)
        ? prev.cuisines.filter(c => c !== cuisine)
        : [...prev.cuisines, cuisine]
    }));
  };

  const togglePriceLevel = (price: number) => {
    setFilters(prev => ({
      ...prev,
      priceLevel: prev.priceLevel.includes(price)
        ? prev.priceLevel.filter(p => p !== price)
        : [...prev.priceLevel, price]
    }));
  };

  const activeFiltersCount = filters.cuisines.length + filters.priceLevel.length + (filters.minRating > 0 ? 1 : 0);

  // Loading skeleton
  const LoadingSkeleton = () => (
    <div className="feed-container">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="card p-4 animate-pulse">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-neutral-200 rounded-full"></div>
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

  if (loading && restaurants.length === 0) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="min-h-screen">
      {/* Mode Toggle Header */}
      <div className="bg-gradient-primary text-white py-8">
        <div className="max-w-2xl mx-auto text-center px-4">
          <div className="flex justify-center space-x-4 mb-6">
            <button
              onClick={() => setMode('discover')}
              className={`flex items-center space-x-2 px-6 py-3 rounded-2xl transition-all duration-300 ${
                mode === 'discover'
                  ? 'bg-white text-primary-600 shadow-lg'
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              <Search className="w-5 h-5" />
              <span className="font-medium">Discover</span>
            </button>
            <button
              onClick={() => setMode('for-you')}
              className={`flex items-center space-x-2 px-6 py-3 rounded-2xl transition-all duration-300 ${
                mode === 'for-you'
                  ? 'bg-white text-primary-600 shadow-lg'
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              <Sparkles className="w-5 h-5" />
              <span className="font-medium">For You</span>
            </button>
          </div>
          <h1 className="text-2xl font-bold mb-2">
            {mode === 'discover' ? 'Discover Restaurants' : 'Personalized Picks'}
          </h1>
          <p className="text-white/90 text-sm">
            {mode === 'discover'
              ? 'Search and explore Chapel Hill\'s dining scene'
              : 'AI-powered recommendations just for you'
            }
          </p>
        </div>
      </div>

      {/* Search and Filter Header - Only in Discover Mode */}
      {mode === 'discover' && (
        <div className="bg-white border-b border-neutral-100 sticky top-16 z-40">
          <div className="max-w-2xl mx-auto p-4 space-y-4">
            {/* Discover Type Selector */}
            <div className="flex overflow-x-auto scrollbar-hide space-x-2">
              {[
                { key: 'nearby' as const, label: 'Nearby', icon: MapPin, desc: 'Close to you' },
                { key: 'trending' as const, label: 'Trending', icon: TrendingUp, desc: 'Popular now' },
                { key: 'top-rated' as const, label: 'Top Rated', icon: Zap, desc: 'Best rated' }
              ].map(({ key, label, icon: Icon, desc }) => (
                <button
                  key={key}
                  onClick={() => setDiscoverType(key)}
                  className={`flex-shrink-0 flex items-center space-x-2 px-4 py-2 rounded-xl transition-all duration-300 ${
                    discoverType === key
                      ? 'bg-primary-500 text-white shadow-lg'
                      : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <div className="text-left">
                    <div className="text-sm font-medium">{label}</div>
                    <div className="text-xs opacity-75 hidden sm:block">{desc}</div>
                  </div>
                </button>
              ))}
            </div>
            {/* Intelligent Search Bar */}
            <div className="relative">
              <IntelligentSearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                onSearch={handleIntelligentSearch}
                placeholder="Try 'Italy', 'spicy food', 'cheap eats'..."
              />
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`absolute right-3 top-3 p-2 rounded-lg transition-colors z-10 ${
                  showFilters ? 'bg-primary-100 text-primary-700' : 'hover:bg-neutral-100'
                }`}
              >
                <div className="flex items-center space-x-1">
                  <Sliders className="w-4 h-4" />
                  {activeFiltersCount > 0 && (
                    <span className="bg-primary-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {activeFiltersCount}
                    </span>
                  )}
                </div>
              </button>
            </div>

            {/* Location Indicator */}
            {location && (
              <div className="flex items-center justify-center space-x-2 text-sm text-neutral-600">
                <MapPin className="w-4 h-4" />
                <span>Searching near Chapel Hill, NC</span>
                {locationLoading && <div className="loading-dots"><div></div><div></div><div></div></div>}
              </div>
            )}

            {/* Filter Panel */}
            {showFilters && (
              <div className="card p-4 space-y-6 animate-slide-up">
                {/* Cuisine Filter */}
                <div>
                  <h3 className="font-medium text-neutral-900 mb-3">Cuisine Type</h3>
                  <div className="flex flex-wrap gap-2">
                    {cuisineOptions.map(cuisine => (
                      <button
                        key={cuisine}
                        onClick={() => toggleCuisine(cuisine)}
                        className={`badge ${
                          filters.cuisines.includes(cuisine)
                            ? 'badge-primary border-primary-300'
                            : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 border-transparent'
                        } border transition-colors`}
                      >
                        {cuisine}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Price Level Filter */}
                <div>
                  <h3 className="font-medium text-neutral-900 mb-3">Price Range</h3>
                  <div className="flex flex-wrap gap-3">
                    {priceOptions.map(({ value, label, desc }) => (
                      <button
                        key={value}
                        onClick={() => togglePriceLevel(value)}
                        className={`flex items-center space-x-2 px-4 py-2 rounded-lg border transition-colors ${
                          filters.priceLevel.includes(value)
                            ? 'border-primary-300 bg-primary-50 text-primary-700'
                            : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50'
                        }`}
                      >
                        <span className="font-medium">{label}</span>
                        <span className="text-xs">{desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Rating Filter */}
                <div>
                  <h3 className="font-medium text-neutral-900 mb-3">Minimum Rating</h3>
                  <div className="flex space-x-2">
                    {[0, 3, 4, 4.5].map(rating => (
                      <button
                        key={rating}
                        onClick={() => setFilters(prev => ({ ...prev, minRating: rating }))}
                        className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                          filters.minRating === rating
                            ? 'bg-primary-500 text-white'
                            : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                        }`}
                      >
                        {rating === 0 ? 'Any' : `${rating}+ ⭐`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Filter Actions */}
                <div className="flex space-x-3 pt-4 border-t border-neutral-100">
                  <button onClick={clearFilters} className="btn btn-ghost flex-1">
                    Clear All
                  </button>
                  <button onClick={() => setShowFilters(false)} className="btn btn-primary flex-1">
                    Apply Filters
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Recommendation Type Selector - Only in For You Mode */}
      {mode === 'for-you' && (
        <div className="bg-white border-b border-neutral-100 sticky top-16 z-40">
          <div className="max-w-2xl mx-auto p-4">
            <div className="flex overflow-x-auto scrollbar-hide space-x-2">
              {[
                { key: 'for-you' as const, label: 'For You', icon: Sparkles, desc: 'AI-powered picks' },
                { key: 'trending' as const, label: 'Trending', icon: TrendingUp, desc: 'Popular right now' },
                { key: 'favorites' as const, label: 'Similar', icon: Heart, desc: 'Like what you love' }
              ].map(({ key, label, icon: Icon, desc }) => (
                <button
                  key={key}
                  onClick={() => setRecommendationType(key)}
                  className={`flex-shrink-0 flex items-center space-x-2 px-4 py-2 rounded-xl transition-all duration-300 ${
                    recommendationType === key
                      ? 'bg-primary-500 text-white shadow-lg'
                      : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <div className="text-left">
                    <div className="text-sm font-medium">{label}</div>
                    <div className="text-xs opacity-75 hidden sm:block">{desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Feed Content */}
      <div className="feed-container">
        {restaurants.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
              {mode === 'discover' ? (
                <Search className="w-8 h-8 text-white" />
              ) : (
                <Brain className="w-8 h-8 text-white" />
              )}
            </div>
            <h3 className="heading-4 mb-2">
              {mode === 'discover' ? 'No restaurants found' : 'Building Your Recommendations'}
            </h3>
            <p className="text-neutral-600 mb-6">
              {mode === 'discover'
                ? 'Try adjusting your search or filters to find more restaurants.'
                : 'Rate a few restaurants to help our AI understand your taste preferences!'
              }
            </p>
            {mode === 'discover' ? (
              <button onClick={clearFilters} className="btn btn-primary">
                Clear Filters
              </button>
            ) : (
              <button
                onClick={() => setMode('discover')}
                className="btn btn-primary"
              >
                <Zap className="w-4 h-4 mr-2" />
                Discover Restaurants
              </button>
            )}
          </div>
        ) : mode === 'discover' ? (
          <InfiniteScroll
            dataLength={restaurants.length}
            next={loadMoreRestaurants}
            hasMore={hasMore}
            loader={
              <div className="flex justify-center py-8">
                <div className="loading-dots">
                  <div></div>
                  <div></div>
                  <div></div>
                </div>
              </div>
            }
            endMessage={
              <div className="text-center py-12">
                <TrendingUp className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
                <p className="text-neutral-600">You've reached the end! 🎉</p>
                <p className="text-sm text-neutral-500 mt-1">
                  Try different filters to discover more restaurants
                </p>
              </div>
            }
            refreshFunction={loadInitialData}
            pullDownToRefresh
            pullDownToRefreshContent={
              <div className="text-center py-4">
                <p className="text-sm text-neutral-500">Pull down to refresh</p>
              </div>
            }
            releaseToRefreshContent={
              <div className="text-center py-4">
                <p className="text-sm text-neutral-500">Release to refresh</p>
              </div>
            }
          >
            <div className="stagger-reveal space-y-6">
              {restaurants.map((restaurant, index) => (
                <div key={restaurant.id} style={{ animationDelay: `${index * 0.1}s` }}>
                  <RestaurantCard
                    restaurant={restaurant}
                    showDistance={discoverType === 'nearby'}
                    userRating={userRatings[restaurant.id]}
                    onRatingUpdate={handleRatingUpdate}
                  />
                </div>
              ))}
            </div>
          </InfiniteScroll>
        ) : (
          <div className="stagger-reveal space-y-6">
            {restaurants.map((restaurant, index) => (
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
        )}
      </div>
    </div>
  );
};

export default Feed;