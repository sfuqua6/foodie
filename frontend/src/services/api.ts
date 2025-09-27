import axios from 'axios';
import type {
  Restaurant,
  User,
  Rating,
  Review,
  AuthTokens,
  LoginCredentials,
  RegisterData,
  RestaurantSearch,
  RecommendationRequest,
  RestaurantCheckin,
  RestaurantCheckinCreate,
  DetailedRating,
  DetailedRatingCreate,
  UserPoints,
  PointTransaction,
  LeaderboardEntry,
  MonthlyLottery,
  BulkImportRequest,
  BubblePreferenceCreate,
  BubblePreferenceResponse
} from '../types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

// Auth token management
let authToken: string | null = localStorage.getItem('auth_token');

const setAuthToken = (token: string) => {
  authToken = token;
  localStorage.setItem('auth_token', token);
  api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
};

const clearAuthToken = () => {
  authToken = null;
  localStorage.removeItem('auth_token');
  delete api.defaults.headers.common['Authorization'];
};

// Set initial auth header if token exists
if (authToken) {
  api.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
}

// Response interceptor for handling auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearAuthToken();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: async (credentials: LoginCredentials): Promise<AuthTokens> => {
    const formData = new FormData();
    formData.append('username', credentials.username);
    formData.append('password', credentials.password);

    const response = await api.post('/auth/token', formData);
    const tokens = response.data;
    setAuthToken(tokens.access_token);
    return tokens;
  },

  register: async (userData: RegisterData): Promise<User> => {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },

  logout: () => {
    clearAuthToken();
  }
};

// Users API
export const usersAPI = {
  getProfile: async (): Promise<User> => {
    const response = await api.get('/users/me');
    return response.data;
  },

  updateProfile: async (userData: Partial<User>): Promise<User> => {
    const response = await api.put('/users/me', userData);
    return response.data;
  }
};

// Restaurants API
export const restaurantsAPI = {
  search: async (params: RestaurantSearch): Promise<Restaurant[]> => {
    const response = await api.get('/restaurants/', { params });
    return response.data;
  },

  getById: async (id: number): Promise<Restaurant> => {
    const response = await api.get(`/restaurants/${id}`);
    return response.data;
  },

  getNearby: async (lat: number, lng: number, radius: number = 10): Promise<Restaurant[]> => {
    const response = await api.get('/restaurants/nearby/', {
      params: { lat, lng, radius }
    });
    return response.data;
  },

  getSearchSuggestions: async (query: string): Promise<string[]> => {
    const response = await api.get('/restaurants/search/suggestions', {
      params: { q: query }
    });
    return response.data.suggestions;
  },

  getSearchCorrections: async (query: string): Promise<{original_query: string; suggestions: string[]; has_suggestions: boolean}> => {
    const response = await api.get('/restaurants/search/corrections', {
      params: { q: query }
    });
    return response.data;
  },

  analyzeSearchQuery: async (query: string): Promise<any> => {
    const response = await api.get('/restaurants/search/analyze', {
      params: { q: query }
    });
    return response.data;
  }
};

// Ratings API
export const ratingsAPI = {
  create: async (restaurantId: number, rating: number): Promise<Rating> => {
    const response = await api.post('/ratings/', {
      restaurant_id: restaurantId,
      rating
    });
    return response.data;
  },

  getUserRatings: async (): Promise<Rating[]> => {
    const response = await api.get('/ratings/user');
    return response.data;
  },

  getRestaurantRatings: async (restaurantId: number): Promise<Rating[]> => {
    const response = await api.get(`/ratings/restaurant/${restaurantId}`);
    return response.data;
  },

  delete: async (ratingId: number): Promise<void> => {
    await api.delete(`/ratings/${ratingId}`);
  }
};

// Reviews API
export const reviewsAPI = {
  create: async (restaurantId: number, title: string, content: string): Promise<Review> => {
    const response = await api.post('/reviews/', {
      restaurant_id: restaurantId,
      title,
      content
    });
    return response.data;
  },

  getUserReviews: async (): Promise<Review[]> => {
    const response = await api.get('/reviews/user');
    return response.data;
  },

  getRestaurantReviews: async (restaurantId: number): Promise<Review[]> => {
    const response = await api.get(`/reviews/restaurant/${restaurantId}`);
    return response.data;
  },

  update: async (reviewId: number, title: string, content: string): Promise<Review> => {
    const response = await api.put(`/reviews/${reviewId}`, {
      title,
      content
    });
    return response.data;
  },

  delete: async (reviewId: number): Promise<void> => {
    await api.delete(`/reviews/${reviewId}`);
  }
};

// Recommendations API
export const recommendationsAPI = {
  get: async (params?: RecommendationRequest): Promise<Restaurant[]> => {
    const response = await api.post('/recommendations/', params || {});
    return response.data;
  },

  getUserRecommendations: async (recommendationType: string = 'for-you'): Promise<Restaurant[]> => {
    const response = await api.get('/recommendations/', {
      params: { recommendation_type: recommendationType }
    });
    return response.data;
  }
};

// Utility APIs
export const utilityAPI = {
  getCuisines: async (): Promise<{ cuisines: string[] }> => {
    const response = await api.get('/cuisines');
    return response.data;
  },

  getPriceLevels: async (): Promise<{
    price_levels: Array<{
      level: number;
      label: string;
      description: string;
    }>
  }> => {
    const response = await api.get('/price-levels');
    return response.data;
  },

  getHealth: async (): Promise<{ status: string; version: string; environment: string }> => {
    const response = await api.get('/health');
    return response.data;
  }
};

// Lottery System API
export const lotteryAPI = {
  // Check-ins
  checkin: async (checkinData: RestaurantCheckinCreate): Promise<RestaurantCheckin> => {
    const response = await api.post('/lottery/checkin', checkinData);
    return response.data;
  },

  getActiveCheckins: async (): Promise<RestaurantCheckin[]> => {
    const response = await api.get('/lottery/checkins/active');
    return response.data;
  },

  // Ratings
  submitDetailedRating: async (ratingData: DetailedRatingCreate): Promise<DetailedRating> => {
    const response = await api.post('/lottery/ratings', ratingData);
    return response.data;
  },

  // Points
  getUserPoints: async (): Promise<UserPoints> => {
    const response = await api.get('/lottery/points');
    return response.data;
  },

  // Leaderboard
  getLeaderboard: async (month?: string, limit: number = 20): Promise<LeaderboardEntry[]> => {
    const params: any = { limit };
    if (month) params.month = month;

    const response = await api.get('/lottery/leaderboard', { params });
    return response.data;
  },

  // Bulk Import
  bulkImport: async (importData: BulkImportRequest): Promise<{
    message: string;
    points_earned: number;
    capped_at_200: boolean;
  }> => {
    const response = await api.post('/lottery/bulk-import', importData);
    return response.data;
  },

  // Lottery
  getCurrentLottery: async (): Promise<MonthlyLottery> => {
    const response = await api.get('/lottery/lottery/current');
    return response.data;
  }
};

// Bubble Survey API functions
export const submitBubblePreferences = async (preferences: BubblePreferenceCreate): Promise<BubblePreferenceResponse> => {
  const response = await api.post('/bubble-survey/submit', preferences);
  return response.data;
};

export const getBubblePreferences = async (): Promise<BubblePreferenceResponse> => {
  const response = await api.get('/bubble-survey/preferences');
  return response.data;
};

export const deleteBubblePreferences = async (): Promise<{ message: string }> => {
  const response = await api.delete('/bubble-survey/preferences');
  return response.data;
};

export const getPreferenceAnalysis = async (): Promise<{
  user_id: number;
  preference_strength: number;
  taste_profile: any;
  recommendations_accuracy: number;
  profile_completeness: number;
}> => {
  const response = await api.get('/bubble-survey/analysis');
  return response.data;
};

// Enhanced Recommendations API
export const getPersonalizedRecommendations = async (params: {
  limit?: number;
  location_lat?: number;
  location_lng?: number;
  cuisine_filter?: string[];
  price_filter?: number[];
  include_visited?: boolean;
}): Promise<any[]> => {
  const response = await api.post('/recommendations/personalized', params);
  return response.data;
};

export const submitRecommendationFeedback = async (feedback: {
  restaurant_id: number;
  recommendation_score: number;
  recommendation_rank: number;
  was_clicked?: boolean;
  was_visited?: boolean;
  actual_rating?: number;
  feedback_score?: number;
}): Promise<{ message: string }> => {
  const response = await api.post('/recommendations/feedback', feedback);
  return response.data;
};

export const getSimilarUsers = async (limit: number = 10): Promise<{
  user_id: number;
  username: string;
  similarity_score: number;
  common_restaurants: number;
  taste_overlap: any;
}[]> => {
  const response = await api.get(`/users/similar?limit=${limit}`);
  return response.data;
};

export const getUserClusterInfo = async (): Promise<{
  cluster_id: number;
  cluster_size: number;
  dominant_cuisines: string[];
  avg_price_preference: number;
  adventure_level: string;
  similar_users: any[];
}> => {
  const response = await api.get('/users/cluster');
  return response.data;
};

export { setAuthToken, clearAuthToken };