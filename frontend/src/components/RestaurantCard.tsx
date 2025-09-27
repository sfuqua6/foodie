import React, { useState } from 'react';
import {
  Star,
  MapPin,
  Phone,
  Globe,
  Heart,
  MessageCircle,
  Share,
  DollarSign,
  Clock
} from 'lucide-react';
import { Restaurant, Rating } from '../types';
import { ratingsAPI, reviewsAPI } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';

interface RestaurantCardProps {
  restaurant: Restaurant;
  showDistance?: boolean;
  showRecommendationScore?: boolean;
  userRating?: Rating;
  onRatingUpdate?: () => void;
}

const RestaurantCard: React.FC<RestaurantCardProps> = ({
  restaurant,
  showDistance = false,
  showRecommendationScore = false,
  userRating,
  onRatingUpdate
}) => {
  const { user } = useAuth();
  const [isRating, setIsRating] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewContent, setReviewContent] = useState('');
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(Math.floor(Math.random() * 50) + 10);

  const handleRating = async (rating: number) => {
    if (!user || isRating) return;

    try {
      setIsRating(true);
      await ratingsAPI.create(restaurant.id, rating);
      toast.success('Rating submitted! 🌟');
      onRatingUpdate?.();
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Failed to submit rating';
      toast.error(message);
    } finally {
      setIsRating(false);
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      await reviewsAPI.create(restaurant.id, reviewTitle, reviewContent);
      toast.success('Review posted! 💬');
      setShowReviewForm(false);
      setReviewTitle('');
      setReviewContent('');
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Failed to submit review';
      toast.error(message);
    }
  };

  const handleLike = () => {
    setIsLiked(!isLiked);
    setLikeCount(prev => isLiked ? prev - 1 : prev + 1);
  };

  const getPriceLevelDisplay = (level?: number) => {
    if (!level) return 'N/A';
    return '$'.repeat(level);
  };

  const formatDistance = (distance?: number) => {
    if (!distance) return null;
    return distance < 1 ? `${Math.round(distance * 1000)}m` : `${distance.toFixed(1)}km`;
  };

  const renderStars = (rating: number, interactive: boolean = false, onStarClick?: (rating: number) => void) => {
    return (
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`star ${star <= rating ? 'filled' : 'empty'} ${
              interactive ? 'cursor-pointer hover:scale-110 active:scale-95' : ''
            }`}
            onClick={interactive && onStarClick ? () => onStarClick(star) : undefined}
          />
        ))}
      </div>
    );
  };

  // Get restaurant image - prefer Google Photos, fallback to placeholder
  const getRestaurantImage = () => {
    // Use first Google Photo if available
    if (restaurant.google_photos && restaurant.google_photos.length > 0) {
      return restaurant.google_photos[0];
    }

    // Generate a themed placeholder
    const colors = ['F97316', 'EC4899', '10B981', '8B5CF6'];
    const color = colors[restaurant.id % colors.length];
    return `https://via.placeholder.com/600x300/${color}/ffffff?text=${encodeURIComponent(restaurant.name)}`;
  };

  return (
    <article className="feed-item animate-fade-in">
      {/* Header with restaurant info */}
      <div className="p-4 pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="story-ring">
              <div
                className="story-avatar bg-gradient-primary flex items-center justify-center text-white font-bold text-lg"
              >
                {restaurant.name.charAt(0)}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-neutral-900 truncate">{restaurant.name}</h3>
              <div className="flex items-center space-x-2 text-sm text-neutral-600">
                {restaurant.address && (
                  <span className="flex items-center truncate">
                    <MapPin className="w-3 h-3 mr-1 flex-shrink-0" />
                    {restaurant.address.split(',')[0]}
                  </span>
                )}
                {showDistance && restaurant.distance && (
                  <span className="flex items-center text-primary-600">
                    <Clock className="w-3 h-3 mr-1" />
                    {formatDistance(restaurant.distance)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Options button */}
          <button className="p-2 hover:bg-neutral-100 rounded-full transition-colors">
            <div className="flex flex-col space-y-1">
              <div className="w-1 h-1 bg-neutral-400 rounded-full"></div>
              <div className="w-1 h-1 bg-neutral-400 rounded-full"></div>
              <div className="w-1 h-1 bg-neutral-400 rounded-full"></div>
            </div>
          </button>
        </div>
      </div>

      {/* Restaurant Image */}
      <div className="relative">
        <img
          src={getRestaurantImage()}
          alt={restaurant.name}
          className="w-full h-64 object-cover"
          onError={(e) => {
            // Fallback to placeholder if image fails to load
            const target = e.target as HTMLImageElement;
            const colors = ['F97316', 'EC4899', '10B981', '8B5CF6'];
            const color = colors[restaurant.id % colors.length];
            target.src = `https://via.placeholder.com/600x300/${color}/ffffff?text=${encodeURIComponent(restaurant.name)}`;
          }}
        />

        {/* Overlay badges */}
        <div className="absolute top-3 left-3 flex space-x-2">
          {restaurant.cuisine_type && (
            <span className="badge badge-primary backdrop-blur-sm bg-white/90">
              {restaurant.cuisine_type}
            </span>
          )}
          {restaurant.price_level && (
            <span className="badge badge-secondary backdrop-blur-sm bg-white/90 flex items-center">
              <DollarSign className="w-3 h-3 mr-1" />
              {getPriceLevelDisplay(restaurant.price_level)}
            </span>
          )}
        </div>

        {/* Recommendation score */}
        {showRecommendationScore && restaurant.recommendation_score && (
          <div className="absolute top-3 right-3 bg-primary-500 text-white px-3 py-1 rounded-full text-sm font-medium">
            {restaurant.recommendation_score.toFixed(1)}★ Match
          </div>
        )}
      </div>

      {/* Social actions */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-4">
            <button
              onClick={handleLike}
              className={`like-button ${isLiked ? 'liked' : ''}`}
            >
              <Heart className={`w-6 h-6 ${isLiked ? 'fill-current' : ''}`} />
            </button>
            <button
              onClick={() => setShowReviewForm(!showReviewForm)}
              className="hover:scale-110 transition-transform"
            >
              <MessageCircle className="w-6 h-6 text-neutral-600" />
            </button>
            <button className="hover:scale-110 transition-transform">
              <Share className="w-6 h-6 text-neutral-600" />
            </button>
          </div>

          <div className="flex items-center space-x-2">
            {restaurant.phone && (
              <a
                href={`tel:${restaurant.phone}`}
                className="p-2 hover:bg-neutral-100 rounded-full transition-colors"
              >
                <Phone className="w-4 h-4 text-neutral-600" />
              </a>
            )}
            {restaurant.website && (
              <a
                href={restaurant.website}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 hover:bg-neutral-100 rounded-full transition-colors"
              >
                <Globe className="w-4 h-4 text-neutral-600" />
              </a>
            )}
          </div>
        </div>

        {/* Like count and caption */}
        <div className="mb-3">
          <p className="font-medium text-sm text-neutral-900 mb-1">
            {likeCount} likes
          </p>

          {/* Rating display */}
          <div className="flex items-center space-x-4 mb-2">
            <div className="flex items-center space-x-2">
              {renderStars(restaurant.avg_rating)}
              <span className="text-sm text-neutral-600">
                {restaurant.avg_rating.toFixed(1)} ({restaurant.rating_count} reviews)
              </span>
            </div>

            {restaurant.google_rating && (
              <div className="flex items-center space-x-1 text-xs text-neutral-500">
                <span>Google:</span>
                <span>{restaurant.google_rating.toFixed(1)}★</span>
                <span>({restaurant.google_rating_count})</span>
              </div>
            )}
          </div>

          {/* Recommendation reasoning */}
          {restaurant.reasoning && (
            <p className="text-sm text-neutral-600 mb-2">
              💡 {restaurant.reasoning}
            </p>
          )}
        </div>

        {/* User rating section */}
        {user && (
          <div className="border-t border-neutral-100 pt-3">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-neutral-700">Your rating:</span>
                {userRating ? (
                  <div className="flex items-center space-x-2">
                    {renderStars(userRating.rating)}
                    <span className="text-sm text-neutral-600">({userRating.rating}/5)</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-1">
                    {renderStars(0, true, handleRating)}
                    <span className="text-xs text-neutral-500 ml-2">Tap to rate</span>
                  </div>
                )}
              </div>
            </div>

            {/* Review form */}
            {showReviewForm && (
              <form onSubmit={handleReviewSubmit} className="space-y-3 animate-slide-up">
                <input
                  type="text"
                  placeholder="Add a title... (optional)"
                  value={reviewTitle}
                  onChange={(e) => setReviewTitle(e.target.value)}
                  className="input"
                />
                <textarea
                  placeholder="Share your experience..."
                  value={reviewContent}
                  onChange={(e) => setReviewContent(e.target.value)}
                  required
                  rows={3}
                  className="input resize-none"
                />
                <div className="flex space-x-2">
                  <button type="submit" className="btn btn-primary btn-sm">
                    Post Review
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowReviewForm(false)}
                    className="btn btn-ghost btn-sm"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Timestamp */}
        <p className="text-xs text-neutral-400 mt-3">
          {new Date().toLocaleDateString()} • Chapel Hill, NC
        </p>
      </div>
    </article>
  );
};

export default RestaurantCard;