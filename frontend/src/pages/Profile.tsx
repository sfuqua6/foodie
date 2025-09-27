import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { ratingsAPI, reviewsAPI } from '../services/api';
import { Rating, Review } from '../types';
import { Star, MessageCircle, Heart, Edit3, Settings, LogOut } from 'lucide-react';
import toast from 'react-hot-toast';
import SettingsModal from '../components/SettingsModal';

const Profile: React.FC = () => {
  const { user, logout } = useAuth();
  const [userRatings, setUserRatings] = useState<Rating[]>([]);
  const [userReviews, setUserReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'ratings' | 'reviews'>('ratings');
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  useEffect(() => {
    if (user) {
      loadUserData();
    }
  }, [user]);

  const loadUserData = async () => {
    try {
      setLoading(true);
      const [ratings, reviews] = await Promise.all([
        ratingsAPI.getUserRatings(),
        reviewsAPI.getUserReviews()
      ]);
      setUserRatings(ratings);
      setUserReviews(reviews);
    } catch (error) {
      toast.error('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully! 👋');
  };

  const averageRating = userRatings.length > 0
    ? userRatings.reduce((sum, rating) => sum + rating.rating, 0) / userRatings.length
    : 0;

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${star <= rating ? 'text-yellow-400 fill-current' : 'text-neutral-300'}`}
          />
        ))}
      </div>
    );
  };

  const LoadingSkeleton = () => (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="card p-4 animate-pulse">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-12 h-12 bg-neutral-200 rounded-full"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-neutral-200 rounded w-3/4"></div>
              <div className="h-3 bg-neutral-200 rounded w-1/2"></div>
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-3 bg-neutral-200 rounded w-full"></div>
            <div className="h-3 bg-neutral-200 rounded w-2/3"></div>
          </div>
        </div>
      ))}
    </div>
  );

  if (!user) return null;

  return (
    <div className="min-h-screen">
      {/* Profile Header */}
      <div className="bg-gradient-accent text-white py-16">
        <div className="max-w-2xl mx-auto px-4">
          <div className="text-center">
            {/* Avatar */}
            <div className="relative inline-block mb-6">
              <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center text-white font-bold text-2xl shadow-xl">
                {user.username.charAt(0).toUpperCase()}
              </div>
              <button className="absolute -bottom-1 -right-1 w-8 h-8 bg-white rounded-full flex items-center justify-center text-accent-600 shadow-lg hover:scale-110 transition-transform">
                <Edit3 className="w-4 h-4" />
              </button>
            </div>

            {/* User Info */}
            <h1 className="heading-2 mb-2">{user.full_name || user.username}</h1>
            <p className="text-white/80 mb-1">@{user.username}</p>
            <p className="text-white/60 text-sm">{user.email}</p>

            {/* Quick Stats */}
            <div className="flex items-center justify-center space-x-8 mt-8">
              <div className="text-center">
                <div className="text-2xl font-bold">{userRatings.length}</div>
                <div className="text-sm text-white/80">Ratings</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{userReviews.length}</div>
                <div className="text-sm text-white/80">Reviews</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{averageRating.toFixed(1)}</div>
                <div className="text-sm text-white/80">Avg Rating</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white border-b border-neutral-100 sticky top-16 z-40">
        <div className="max-w-2xl mx-auto px-4">
          <div className="flex">
            <button
              onClick={() => setActiveTab('ratings')}
              className={`px-6 py-4 border-b-2 transition-colors ${
                activeTab === 'ratings'
                  ? 'border-accent-500 text-accent-600'
                  : 'border-transparent text-neutral-600 hover:text-neutral-800'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Star className="w-4 h-4" />
                <span className="font-medium">My Ratings</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('reviews')}
              className={`px-6 py-4 border-b-2 transition-colors ${
                activeTab === 'reviews'
                  ? 'border-accent-500 text-accent-600'
                  : 'border-transparent text-neutral-600 hover:text-neutral-800'
              }`}
            >
              <div className="flex items-center space-x-2">
                <MessageCircle className="w-4 h-4" />
                <span className="font-medium">My Reviews</span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        {loading ? (
          <LoadingSkeleton />
        ) : (
          <>
            {activeTab === 'ratings' && (
              <div className="space-y-4">
                {userRatings.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="w-16 h-16 bg-neutral-200 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Star className="w-8 h-8 text-neutral-400" />
                    </div>
                    <h3 className="heading-4 mb-2">No ratings yet</h3>
                    <p className="text-neutral-600 mb-6">
                      Start rating restaurants to see your activity here.
                    </p>
                    <button
                      onClick={() => window.location.href = '/'}
                      className="btn btn-primary"
                    >
                      Discover Restaurants
                    </button>
                  </div>
                ) : (
                  userRatings.map((rating) => (
                    <div key={rating.id} className="card p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center text-white font-bold">
                            R
                          </div>
                          <div>
                            <h4 className="font-semibold text-neutral-900">Restaurant Name</h4>
                            <p className="text-sm text-neutral-600">
                              Rated on {new Date(rating.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {renderStars(rating.rating)}
                          <span className="text-sm font-medium">{rating.rating}/5</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'reviews' && (
              <div className="space-y-4">
                {userReviews.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="w-16 h-16 bg-neutral-200 rounded-full flex items-center justify-center mx-auto mb-4">
                      <MessageCircle className="w-8 h-8 text-neutral-400" />
                    </div>
                    <h3 className="heading-4 mb-2">No reviews yet</h3>
                    <p className="text-neutral-600 mb-6">
                      Share your experiences by writing restaurant reviews.
                    </p>
                    <button
                      onClick={() => window.location.href = '/'}
                      className="btn btn-primary"
                    >
                      Write Your First Review
                    </button>
                  </div>
                ) : (
                  userReviews.map((review) => (
                    <div key={review.id} className="card p-4">
                      <div className="flex items-start space-x-3">
                        <div className="w-12 h-12 bg-gradient-accent rounded-full flex items-center justify-center text-white font-bold">
                          R
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold text-neutral-900">Restaurant Name</h4>
                            <span className="text-sm text-neutral-500">
                              {new Date(review.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          {review.title && (
                            <h5 className="font-medium text-neutral-800 mb-2">{review.title}</h5>
                          )}
                          <p className="text-neutral-600 leading-relaxed">{review.content}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </>
        )}

        {/* Profile Actions */}
        <div className="mt-12 space-y-4">
          <div className="card p-6">
            <h3 className="heading-4 mb-4">Account Settings</h3>
            <div className="space-y-3">
              <button
                onClick={() => setShowSettingsModal(true)}
                className="w-full flex items-center justify-between p-3 hover:bg-neutral-50 rounded-lg transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <Settings className="w-5 h-5 text-neutral-600" />
                  <span>Settings</span>
                </div>
              </button>
              <button className="w-full flex items-center justify-between p-3 hover:bg-neutral-50 rounded-lg transition-colors">
                <div className="flex items-center space-x-3">
                  <Heart className="w-5 h-5 text-neutral-600" />
                  <span>Favorites</span>
                </div>
              </button>
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-between p-3 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <LogOut className="w-5 h-5" />
                  <span>Sign Out</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
      />
    </div>
  );
};

export default Profile;