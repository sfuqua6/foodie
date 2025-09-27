import React, { useState, useEffect } from 'react';
import { Trophy, Award, Star, Camera, Calendar, Clock, DollarSign, TrendingUp } from 'lucide-react';
import { lotteryAPI } from '../services/api';
import { LeaderboardEntry, MonthlyLottery, UserPoints } from '../types';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';

interface LotteryLeaderboardProps {
  className?: string;
}

const LotteryLeaderboard: React.FC<LotteryLeaderboardProps> = ({ className = '' }) => {
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [userPoints, setUserPoints] = useState<UserPoints | null>(null);
  const [currentLottery, setCurrentLottery] = useState<MonthlyLottery | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'monthly' | 'all-time'>('monthly');
  const [timeUntilDraw, setTimeUntilDraw] = useState<string>('');

  useEffect(() => {
    loadData();
  }, [activeTab]);

  useEffect(() => {
    // Update countdown timer every minute
    const interval = setInterval(() => {
      updateCountdown();
    }, 60000);

    updateCountdown(); // Initial update

    return () => clearInterval(interval);
  }, [currentLottery]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [leaderboardData, userPointsData, lotteryData] = await Promise.all([
        lotteryAPI.getLeaderboard(activeTab === 'monthly' ? getCurrentMonth() : undefined),
        lotteryAPI.getUserPoints(),
        lotteryAPI.getCurrentLottery()
      ]);

      setLeaderboard(leaderboardData);
      setUserPoints(userPointsData);
      setCurrentLottery(lotteryData);
    } catch (error) {
      toast.error('Failed to load leaderboard data');
    } finally {
      setLoading(false);
    }
  };

  const getCurrentMonth = (): string => {
    const now = new Date();
    return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
  };

  const updateCountdown = () => {
    if (!currentLottery) return;

    const now = new Date();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    const timeDiff = endOfMonth.getTime() - now.getTime();

    if (timeDiff > 0) {
      const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));

      setTimeUntilDraw(`${days}d ${hours}h ${minutes}m`);
    } else {
      setTimeUntilDraw('Drawing soon...');
    }
  };

  const formatMonth = (monthString: string): string => {
    const date = new Date(monthString + '-01');
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const getUserRank = (): number => {
    if (!user || !userPoints) return 0;
    const userEntry = leaderboard.find(entry => entry.user_id === user.id);
    return userEntry?.rank || 0;
  };

  const getUserPosition = (): LeaderboardEntry | null => {
    if (!user || !userPoints) return null;
    return leaderboard.find(entry => entry.user_id === user.id) || null;
  };

  const LoadingSkeleton = () => (
    <div className="space-y-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center space-x-4 p-4 bg-white rounded-xl animate-pulse">
          <div className="w-8 h-8 bg-neutral-200 rounded-full"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-neutral-200 rounded w-1/3"></div>
            <div className="h-3 bg-neutral-200 rounded w-1/2"></div>
          </div>
          <div className="w-16 h-6 bg-neutral-200 rounded"></div>
        </div>
      ))}
    </div>
  );

  if (loading) {
    return (
      <div className={`bg-neutral-50 rounded-2xl p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-neutral-200 rounded w-1/3 mb-6"></div>
          <LoadingSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-2xl shadow-lg overflow-hidden ${className}`}>
      {/* Header with Lottery Info */}
      <div className="bg-gradient-primary text-white p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <h2 className="heading-4 mb-1">Monthly Lottery</h2>
              <p className="text-white/90 text-sm">
                {currentLottery && formatMonth(currentLottery.month)}
              </p>
            </div>
          </div>

          <div className="text-right">
            <div className="text-2xl font-bold">${currentLottery?.prize_amount || 100}</div>
            <div className="text-white/80 text-xs">Prize Pool</div>
          </div>
        </div>

        {currentLottery && (
          <div className="bg-white/10 rounded-xl p-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-lg font-bold">{currentLottery.total_tickets || 0}</div>
                <div className="text-white/80 text-xs">Total Tickets</div>
              </div>
              <div>
                <div className="text-lg font-bold">{timeUntilDraw}</div>
                <div className="text-white/80 text-xs">Until Draw</div>
              </div>
              <div>
                <div className="text-lg font-bold">{userPoints?.monthly_points || 0}</div>
                <div className="text-white/80 text-xs">Your Tickets</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* User's Current Position */}
      {userPoints && (
        <div className="bg-gradient-to-r from-accent-50 to-primary-50 p-4 border-b border-neutral-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-accent rounded-full flex items-center justify-center text-white font-bold">
                {user?.username?.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-medium text-neutral-900">Your Position</p>
                <p className="text-sm text-neutral-600">
                  {getUserRank() > 0 ? `#${getUserRank()}` : 'Not ranked'} • {userPoints.monthly_points} points this month
                </p>
              </div>
            </div>

            <div className="text-right">
              <div className="font-bold text-primary-600">{userPoints.total_points}</div>
              <div className="text-xs text-neutral-500">All-time points</div>
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex border-b border-neutral-100">
        <button
          onClick={() => setActiveTab('monthly')}
          className={`flex-1 py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'monthly'
              ? 'border-primary-500 text-primary-600 bg-primary-50'
              : 'border-transparent text-neutral-600 hover:text-neutral-800'
          }`}
        >
          <Calendar className="w-4 h-4 inline mr-2" />
          This Month
        </button>
        <button
          onClick={() => setActiveTab('all-time')}
          className={`flex-1 py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'all-time'
              ? 'border-primary-500 text-primary-600 bg-primary-50'
              : 'border-transparent text-neutral-600 hover:text-neutral-800'
          }`}
        >
          <TrendingUp className="w-4 h-4 inline mr-2" />
          All Time
        </button>
      </div>

      {/* Leaderboard */}
      <div className="p-6">
        {leaderboard.length === 0 ? (
          <div className="text-center py-8">
            <Trophy className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
            <p className="text-neutral-600 mb-2">No rankings yet</p>
            <p className="text-sm text-neutral-500">Be the first to earn points and climb the leaderboard!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {leaderboard.slice(0, 10).map((entry, index) => (
              <div
                key={entry.user_id}
                className={`flex items-center space-x-4 p-4 rounded-xl transition-all ${
                  entry.user_id === user?.id
                    ? 'bg-gradient-to-r from-primary-50 to-accent-50 border border-primary-200'
                    : 'bg-neutral-50 hover:bg-neutral-100'
                }`}
              >
                {/* Rank */}
                <div className="flex items-center justify-center w-8 h-8">
                  {entry.rank <= 3 ? (
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                        entry.rank === 1
                          ? 'bg-gradient-to-r from-yellow-400 to-yellow-500'
                          : entry.rank === 2
                          ? 'bg-gradient-to-r from-gray-300 to-gray-400'
                          : 'bg-gradient-to-r from-amber-600 to-amber-700'
                      }`}
                    >
                      {entry.rank}
                    </div>
                  ) : (
                    <span className="text-neutral-500 font-medium">#{entry.rank}</span>
                  )}
                </div>

                {/* User Info */}
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <p className="font-medium text-neutral-900">
                      {entry.username}
                      {entry.user_id === user?.id && (
                        <span className="ml-2 text-xs bg-primary-100 text-primary-700 px-2 py-1 rounded-full">
                          You
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center space-x-4 text-xs text-neutral-500 mt-1">
                    <div className="flex items-center space-x-1">
                      <Star className="w-3 h-3" />
                      <span>{entry.total_ratings} ratings</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Camera className="w-3 h-3" />
                      <span>{entry.total_photos} photos</span>
                    </div>
                  </div>
                </div>

                {/* Points */}
                <div className="text-right">
                  <div className="font-bold text-neutral-900">
                    {activeTab === 'monthly' ? entry.monthly_points : entry.total_points}
                  </div>
                  <div className="text-xs text-neutral-500">
                    {activeTab === 'monthly' ? 'this month' : 'all-time'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {leaderboard.length > 10 && (
          <div className="text-center mt-6">
            <p className="text-sm text-neutral-500">
              Showing top 10 • {leaderboard.length} total participants
            </p>
          </div>
        )}
      </div>

      {/* Footer Stats */}
      <div className="bg-neutral-50 px-6 py-4 border-t border-neutral-100">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="font-bold text-primary-600">{leaderboard.length}</div>
            <div className="text-xs text-neutral-500">Participants</div>
          </div>
          <div>
            <div className="font-bold text-accent-600">
              {leaderboard.reduce((sum, entry) => sum + entry.total_ratings, 0)}
            </div>
            <div className="text-xs text-neutral-500">Total Ratings</div>
          </div>
          <div>
            <div className="font-bold text-secondary-600">
              ${currentLottery?.prize_amount || 100}
            </div>
            <div className="text-xs text-neutral-500">Prize Pool</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LotteryLeaderboard;