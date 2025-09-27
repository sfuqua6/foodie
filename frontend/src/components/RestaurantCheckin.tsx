import React, { useState, useEffect } from 'react';
import { MapPin, Clock, CheckCircle, Award, Timer, AlertCircle } from 'lucide-react';
import { lotteryAPI } from '../services/api';
import { Restaurant, RestaurantCheckin, CheckinStatus } from '../types';
import { useLocation } from '../hooks/useLocation';
import toast from 'react-hot-toast';
import DetailedRatingModal from './DetailedRatingModal';

interface RestaurantCheckinProps {
  restaurant: Restaurant;
  className?: string;
}

const RestaurantCheckinComponent: React.FC<RestaurantCheckinProps> = ({ restaurant, className = '' }) => {
  const [checkin, setCheckin] = useState<RestaurantCheckin | null>(null);
  const [loading, setLoading] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const { location, loading: locationLoading, error: locationError } = useLocation();

  useEffect(() => {
    loadActiveCheckins();
  }, [restaurant.id]);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (checkin && checkin.status === CheckinStatus.PENDING) {
      interval = setInterval(() => {
        const checkinTime = new Date(checkin.check_in_time);
        const now = new Date();
        const elapsedMinutes = (now.getTime() - checkinTime.getTime()) / (1000 * 60);
        const remaining = Math.max(0, 10 - elapsedMinutes);

        setTimeRemaining(remaining);

        if (remaining <= 0) {
          loadActiveCheckins(); // Refresh to get updated status
        }
      }, 1000);
    } else if (checkin && checkin.status === CheckinStatus.ACTIVE && checkin.rating_deadline) {
      interval = setInterval(() => {
        const deadline = new Date(checkin.rating_deadline!);
        const now = new Date();
        const remainingHours = Math.max(0, (deadline.getTime() - now.getTime()) / (1000 * 60 * 60));

        setTimeRemaining(remainingHours);

        if (remainingHours <= 0) {
          loadActiveCheckins(); // Refresh to get updated status
        }
      }, 60000); // Update every minute for deadline
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [checkin]);

  const loadActiveCheckins = async () => {
    try {
      const activeCheckins = await lotteryAPI.getActiveCheckins();
      const restaurantCheckin = activeCheckins.find(c => c.restaurant_id === restaurant.id);
      setCheckin(restaurantCheckin || null);
    } catch (error) {
      console.error('Failed to load check-ins:', error);
    }
  };

  const handleCheckin = async () => {
    if (!location) {
      toast.error('Location access required for check-in');
      return;
    }

    setLoading(true);
    try {
      const newCheckin = await lotteryAPI.checkin({
        restaurant_id: restaurant.id,
        user_lat: location.latitude,
        user_lng: location.longitude
      });

      setCheckin(newCheckin);
      toast.success('Check-in successful! Stay for 10 minutes to earn lottery points 🎯');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Check-in failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRatingSuccess = () => {
    loadActiveCheckins(); // Refresh to show updated status
    setShowRatingModal(false);
  };

  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371000; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lng2 - lng1) * Math.PI) / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  const isNearRestaurant = (): boolean => {
    if (!location || !restaurant.latitude || !restaurant.longitude) return false;

    const distance = calculateDistance(
      location.latitude,
      location.longitude,
      restaurant.latitude,
      restaurant.longitude
    );

    return distance <= 100; // Within 100 meters
  };

  const formatTimeRemaining = (time: number): string => {
    if (checkin?.status === CheckinStatus.PENDING) {
      const minutes = Math.floor(time);
      const seconds = Math.floor((time - minutes) * 60);
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    } else if (checkin?.status === CheckinStatus.ACTIVE) {
      const hours = Math.floor(time);
      const minutes = Math.floor((time - hours) * 60);
      if (hours > 0) {
        return `${hours}h ${minutes}m`;
      } else {
        return `${minutes}m`;
      }
    }
    return '';
  };

  if (locationLoading) {
    return (
      <div className={`bg-neutral-100 rounded-xl p-4 ${className}`}>
        <div className="flex items-center space-x-3">
          <div className="animate-spin w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full"></div>
          <span className="text-sm text-neutral-600">Getting your location...</span>
        </div>
      </div>
    );
  }

  if (locationError || !location) {
    return (
      <div className={`bg-yellow-50 border border-yellow-200 rounded-xl p-4 ${className}`}>
        <div className="flex items-center space-x-3">
          <AlertCircle className="w-5 h-5 text-yellow-600" />
          <div>
            <p className="text-sm font-medium text-yellow-800">Location Required</p>
            <p className="text-xs text-yellow-600">Enable location access to check in for lottery points</p>
          </div>
        </div>
      </div>
    );
  }

  const nearRestaurant = isNearRestaurant();

  // No active check-in
  if (!checkin) {
    return (
      <div className={`bg-white border border-neutral-200 rounded-xl p-4 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-full ${nearRestaurant ? 'bg-green-100' : 'bg-neutral-100'}`}>
              <MapPin className={`w-5 h-5 ${nearRestaurant ? 'text-green-600' : 'text-neutral-400'}`} />
            </div>
            <div>
              <p className="text-sm font-medium text-neutral-900">
                {nearRestaurant ? 'Check in available!' : 'Check-in for lottery points'}
              </p>
              <p className="text-xs text-neutral-500">
                {nearRestaurant
                  ? 'You\'re close enough to check in'
                  : 'Get within 100m of the restaurant to check in'
                }
              </p>
            </div>
          </div>

          <button
            onClick={handleCheckin}
            disabled={!nearRestaurant || loading}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
              nearRestaurant && !loading
                ? 'bg-primary-500 hover:bg-primary-600 text-white'
                : 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
            }`}
          >
            {loading ? 'Checking in...' : 'Check In'}
          </button>
        </div>
      </div>
    );
  }

  // Pending check-in (waiting for 10 minutes)
  if (checkin.status === CheckinStatus.PENDING) {
    return (
      <div className={`bg-orange-50 border border-orange-200 rounded-xl p-4 ${className}`}>
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-orange-100 rounded-full">
            <Timer className="w-5 h-5 text-orange-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-orange-900">Stay a little longer...</p>
            <p className="text-xs text-orange-600">
              {timeRemaining !== null
                ? `${formatTimeRemaining(timeRemaining)} remaining to earn lottery points`
                : 'Minimum 10-minute stay required'
              }
            </p>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-orange-600">
              {timeRemaining !== null ? formatTimeRemaining(timeRemaining) : '--:--'}
            </div>
            <div className="text-xs text-orange-500">minutes left</div>
          </div>
        </div>
      </div>
    );
  }

  // Active check-in (ready for rating)
  if (checkin.status === CheckinStatus.ACTIVE) {
    return (
      <>
        <div className={`bg-green-50 border border-green-200 rounded-xl p-4 ${className}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-full">
                <Award className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-green-900">Ready to earn points!</p>
                <p className="text-xs text-green-600">
                  {timeRemaining !== null
                    ? `${formatTimeRemaining(timeRemaining)} to submit your rating`
                    : 'Submit your detailed rating to earn lottery points'
                  }
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowRatingModal(true)}
              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors"
            >
              Rate Now
            </button>
          </div>
        </div>

        <DetailedRatingModal
          restaurant={restaurant}
          checkin={checkin}
          isOpen={showRatingModal}
          onClose={() => setShowRatingModal(false)}
          onSuccess={handleRatingSuccess}
        />
      </>
    );
  }

  // Completed or expired check-in
  if (checkin.status === CheckinStatus.RATED) {
    return (
      <div className={`bg-blue-50 border border-blue-200 rounded-xl p-4 ${className}`}>
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 rounded-full">
            <CheckCircle className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-blue-900">Rating submitted!</p>
            <p className="text-xs text-blue-600">Points earned and added to your lottery total</p>
          </div>
        </div>
      </div>
    );
  }

  if (checkin.status === CheckinStatus.EXPIRED) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-xl p-4 ${className}`}>
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-red-100 rounded-full">
            <Clock className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-red-900">Rating window expired</p>
            <p className="text-xs text-red-600">Check in again next time to earn lottery points</p>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default RestaurantCheckinComponent;