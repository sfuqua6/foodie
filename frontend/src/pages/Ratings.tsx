import React, { useState, useEffect } from 'react';
import { Award, Star, Clock, TrendingUp, Upload, Plus, Calendar, Trophy } from 'lucide-react';
import { lotteryAPI, restaurantsAPI } from '../services/api';
import { RestaurantCheckin, UserPoints, Restaurant } from '../types';
import { useAuth } from '../hooks/useAuth';
import { useLocation } from '../hooks/useLocation';
import LotteryLeaderboard from '../components/LotteryLeaderboard';
import BulkImportModal from '../components/BulkImportModal';
import RestaurantCheckinComponent from '../components/RestaurantCheckin';
import toast from 'react-hot-toast';

const Ratings: React.FC = () => {
  const { user } = useAuth();
  const { location } = useLocation();
  const [activeCheckins, setActiveCheckins] = useState<RestaurantCheckin[]>([]);
  const [userPoints, setUserPoints] = useState<UserPoints | null>(null);
  const [nearbyRestaurants, setNearbyRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBulkImport, setShowBulkImport] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [checkinsData, pointsData, restaurantsData] = await Promise.all([
        lotteryAPI.getActiveCheckins(),
        lotteryAPI.getUserPoints(),
        location
          ? restaurantsAPI.search({
              user_lat: location.latitude,
              user_lng: location.longitude,
              limit: 5
            })
          : Promise.resolve([])
      ]);

      setActiveCheckins(checkinsData);
      setUserPoints(pointsData);
      setNearbyRestaurants(restaurantsData);
    } catch (error) {
      toast.error('Failed to load ratings data');
    } finally {
      setLoading(false);
    }
  };

  const formatMonth = (monthString: string): string => {
    const date = new Date(monthString + '-01');
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const getCurrentMonth = (): string => {
    const now = new Date();
    return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
  };

  const handleBulkImportSuccess = () => {
    loadData(); // Refresh all data
    setShowBulkImport(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50">
        {/* Loading Hero */}
        <div className="bg-gradient-primary text-white py-16">
          <div className="max-w-2xl mx-auto text-center px-4">
            <div className="animate-pulse">
              <div className="w-20 h-20 bg-white/20 rounded-full mx-auto mb-6"></div>
              <div className="h-8 bg-white/20 rounded w-1/2 mx-auto mb-4"></div>
              <div className="h-4 bg-white/20 rounded w-3/4 mx-auto"></div>
            </div>
          </div>
        </div>

        {/* Loading Content */}
        <div className="feed-container">
          <div className="space-y-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl p-6 animate-pulse">
                <div className="h-4 bg-neutral-200 rounded w-1/3 mb-4"></div>
                <div className="space-y-3">
                  <div className="h-3 bg-neutral-200 rounded"></div>
                  <div className="h-3 bg-neutral-200 rounded w-2/3"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Hero Section */}
      <div className="bg-gradient-primary text-white py-16">
        <div className="max-w-2xl mx-auto text-center px-4">
          <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Award className="w-10 h-10" />
          </div>
          <h1 className="heading-1 mb-4">Lottery Ratings</h1>
          <p className="text-lg text-white/90 mb-8">
            Check in, rate restaurants, and win $100 monthly prizes!
          </p>

          {/* Points Dashboard */}
          {userPoints && (
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold">{userPoints.total_points}</div>
                  <div className="text-white/80 text-sm">Total Points</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-yellow-300">{userPoints.monthly_points}</div>
                  <div className="text-white/80 text-sm">This Month</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">{userPoints.total_ratings}</div>
                  <div className="text-white/80 text-sm">Ratings</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">{userPoints.total_checkins}</div>
                  <div className="text-white/80 text-sm">Check-ins</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="feed-container">
        {/* Bulk Import CTA */}
        {userPoints && !userPoints.bulk_import_completed && (
          <div className="mb-8 bg-gradient-to-r from-accent-50 to-secondary-50 border border-accent-200 rounded-2xl p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-accent-100 rounded-full flex items-center justify-center">
                  <Upload className="w-6 h-6 text-accent-600" />
                </div>
                <div>
                  <h3 className="heading-4 text-accent-900 mb-1">Earn 200 Bonus Points!</h3>
                  <p className="text-accent-700 text-sm">
                    Add restaurants you've visited recently to boost your lottery chances
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowBulkImport(true)}
                className="btn btn-accent"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Past Visits
              </button>
            </div>
          </div>
        )}

        {/* Active Check-ins Section */}
        {activeCheckins.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center space-x-3 mb-6">
              <Clock className="w-6 h-6 text-primary-600" />
              <h2 className="heading-3">Active Check-ins</h2>
            </div>
            <div className="space-y-4">
              {activeCheckins.map(checkin => {
                const restaurant = nearbyRestaurants.find(r => r.id === checkin.restaurant_id);
                if (!restaurant) return null;

                return (
                  <RestaurantCheckinComponent
                    key={checkin.id}
                    restaurant={restaurant}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* Nearby Restaurants for Check-in */}
        {nearbyRestaurants.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center space-x-3 mb-6">
              <Star className="w-6 h-6 text-primary-600" />
              <h2 className="heading-3">Nearby Restaurants</h2>
            </div>
            <div className="grid gap-4">
              {nearbyRestaurants.slice(0, 3).map(restaurant => (
                <RestaurantCheckinComponent
                  key={restaurant.id}
                  restaurant={restaurant}
                />
              ))}
            </div>
          </div>
        )}

        {/* Leaderboard */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-6">
            <Trophy className="w-6 h-6 text-primary-600" />
            <h2 className="heading-3">Leaderboard & Lottery</h2>
          </div>
          <LotteryLeaderboard />
        </div>

        {/* How It Works */}
        <div className="bg-white rounded-2xl shadow-sm p-8">
          <h3 className="heading-3 text-center mb-8">How the Lottery System Works</h3>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-primary-600">1</span>
              </div>
              <h4 className="font-bold text-neutral-900 mb-2">Check In</h4>
              <p className="text-neutral-600 text-sm">
                Use GPS to check into restaurants within 100 meters. Stay for 10 minutes minimum.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-accent-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-accent-600">2</span>
              </div>
              <h4 className="font-bold text-neutral-900 mb-2">Rate & Review</h4>
              <p className="text-neutral-600 text-sm">
                Submit detailed ratings with 12 questions. Add photos for bonus points (10 base + 5 photo bonus).
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-secondary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-secondary-600">3</span>
              </div>
              <h4 className="font-bold text-neutral-900 mb-2">Win Prizes</h4>
              <p className="text-neutral-600 text-sm">
                Each point = 1 lottery ticket. Monthly drawings for $100 cash prizes. Points accumulate!
              </p>
            </div>
          </div>

          <div className="mt-8 bg-gradient-to-r from-primary-50 to-accent-50 rounded-xl p-6">
            <div className="text-center">
              <h4 className="font-bold text-primary-900 mb-2">Current Month: {formatMonth(getCurrentMonth())}</h4>
              <p className="text-primary-700 text-sm">
                Drawing held at the end of each month. The more points you have, the higher your chances!
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bulk Import Modal */}
      <BulkImportModal
        isOpen={showBulkImport}
        onClose={() => setShowBulkImport(false)}
        onSuccess={handleBulkImportSuccess}
      />
    </div>
  );
};

export default Ratings;