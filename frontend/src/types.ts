export interface Restaurant {
  id: number;
  name: string;
  address?: string;
  phone?: string;
  website?: string;
  cuisine_type?: string;
  price_level?: number;
  latitude: number;
  longitude: number;
  hours?: Record<string, string>;
  google_rating?: number;
  google_rating_count?: number;
  google_photos?: string[];
  avg_rating: number;
  rating_count: number;
  distance?: number;
  recommendation_score?: number;
  reasoning?: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  full_name?: string;
  is_active: boolean;
  created_at: string;
  preferred_cuisines: string[];
  preferred_price_levels: number[];
  location_lat?: number;
  location_lng?: number;
  max_distance: number;
}

export interface Rating {
  id: number;
  user_id: number;
  restaurant_id: number;
  rating: number;
  created_at: string;
}

export interface Review {
  id: number;
  user_id: number;
  restaurant_id: number;
  title?: string;
  content: string;
  created_at: string;
  user: User;
}

export interface AuthTokens {
  access_token: string;
  token_type: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  full_name?: string;
}

export interface RestaurantSearch {
  query?: string;
  user_lat?: number;
  user_lng?: number;
  max_distance?: number;
  cuisine_filter?: string[];
  price_filter?: number[];
  min_rating?: number;
  limit?: number;
  offset?: number;
}

export interface RecommendationRequest {
  user_lat?: number;
  user_lng?: number;
  max_distance?: number;
  cuisine_filter?: string[];
  price_filter?: number[];
  limit?: number;
}

// Lottery System Types

export enum CheckinStatus {
  PENDING = "pending",
  ACTIVE = "active",
  RATED = "rated",
  EXPIRED = "expired"
}

export interface RestaurantCheckin {
  id: number;
  user_id: number;
  restaurant_id: number;
  check_in_lat: number;
  check_in_lng: number;
  distance_from_restaurant?: number;
  check_in_time: string;
  min_stay_completed_at?: string;
  rating_deadline?: string;
  status: CheckinStatus;
  rating_id?: number;
  created_at: string;
}

export interface RestaurantCheckinCreate {
  restaurant_id: number;
  user_lat: number;
  user_lng: number;
}

export interface DetailedRating {
  id: number;
  user_id: number;
  restaurant_id: number;
  rating_id: number;
  checkin_id?: number;
  overall_rating: number;

  // Food Quality (1-5 Likert scale)
  food_quality_expectation?: number;
  portion_size_appropriate?: number;
  food_fresh_prepared?: number;

  // Service Experience
  service_attentive?: number;
  wait_times_reasonable?: number;

  // Atmosphere & Experience
  atmosphere_pleasant?: number;
  restaurant_clean?: number;
  noise_level_appropriate?: number;
  restaurant_welcoming?: number;

  // Value & Overall
  prices_fair?: number;
  would_recommend?: number;
  would_return?: number;

  photos: string[];
  has_photos: boolean;
  points_earned: number;
  created_at: string;
}

export interface DetailedRatingCreate {
  restaurant_id: number;
  checkin_id?: number;
  overall_rating: number;

  // Food Quality (1-5 Likert scale)
  food_quality_expectation?: number;
  portion_size_appropriate?: number;
  food_fresh_prepared?: number;

  // Service Experience
  service_attentive?: number;
  wait_times_reasonable?: number;

  // Atmosphere & Experience
  atmosphere_pleasant?: number;
  restaurant_clean?: number;
  noise_level_appropriate?: number;
  restaurant_welcoming?: number;

  // Value & Overall
  prices_fair?: number;
  would_recommend?: number;
  would_return?: number;

  photos?: string[];
}

export interface UserPoints {
  id: number;
  user_id: number;
  total_points: number;
  monthly_points: number;
  current_month: string;
  total_ratings: number;
  total_photos: number;
  total_checkins: number;
  bulk_import_points: number;
  bulk_import_completed: boolean;
  created_at: string;
}

export interface PointTransaction {
  id: number;
  user_id: number;
  points: number;
  reason: string;
  rating_id?: number;
  checkin_id?: number;
  month: string;
  created_at: string;
}

export interface LeaderboardEntry {
  user_id: number;
  username: string;
  total_points: number;
  monthly_points: number;
  rank: number;
  total_ratings: number;
  total_photos: number;
}

export interface MonthlyLottery {
  id: number;
  month: string;
  prize_amount: number;
  prize_currency: string;
  winner_user_id?: number;
  winning_ticket_number?: number;
  total_tickets?: number;
  is_drawn: boolean;
  draw_date?: string;
  created_at: string;
}

export interface BulkImportRestaurant {
  name: string;
  cuisine_type?: string;
  rating: number;
  approximate_address?: string;
}

export interface BulkImportRequest {
  restaurants: BulkImportRestaurant[];
}

// Likert scale questions for detailed ratings
export interface LikertQuestion {
  key: keyof DetailedRatingCreate;
  question: string;
  category: 'food' | 'service' | 'atmosphere' | 'value';
}

export const LIKERT_QUESTIONS: LikertQuestion[] = [
  // Food Quality
  { key: 'food_quality_expectation', question: 'The food quality met my expectations', category: 'food' },
  { key: 'portion_size_appropriate', question: 'The portion sizes were appropriate for the price', category: 'food' },
  { key: 'food_fresh_prepared', question: 'The food was fresh and well-prepared', category: 'food' },

  // Service Experience
  { key: 'service_attentive', question: 'The service was attentive and professional', category: 'service' },
  { key: 'wait_times_reasonable', question: 'Wait times were reasonable', category: 'service' },

  // Atmosphere & Experience
  { key: 'atmosphere_pleasant', question: 'The atmosphere was pleasant and comfortable', category: 'atmosphere' },
  { key: 'restaurant_clean', question: 'The restaurant was clean and well-maintained', category: 'atmosphere' },
  { key: 'noise_level_appropriate', question: 'The noise level was appropriate for conversation', category: 'atmosphere' },
  { key: 'restaurant_welcoming', question: 'The restaurant felt welcoming and inviting', category: 'atmosphere' },

  // Value & Overall
  { key: 'prices_fair', question: 'The prices were fair for what I received', category: 'value' },
  { key: 'would_recommend', question: 'I would recommend this restaurant to others', category: 'value' },
  { key: 'would_return', question: 'I would return to this restaurant', category: 'value' }
];

// Bubble Survey Types
export interface BubblePreferenceData {
  weight: number;
  round_survived: number;
  selection_order: number;
}

export interface BubblePreferenceCreate {
  cuisine_preferences: Record<string, BubblePreferenceData>;
  atmosphere_preferences: Record<string, BubblePreferenceData>;
  price_preferences: Record<string, BubblePreferenceData>;
  service_preferences: Record<string, BubblePreferenceData>;
  dietary_preferences: Record<string, BubblePreferenceData>;
  adventure_preferences: Record<string, BubblePreferenceData>;
  total_rounds_completed: number;
  final_score: number;
}

export interface BubblePreferenceResponse {
  id: number;
  user_id: number;
  survey_completed_at: string;
  total_rounds_completed: number;
  final_score: number;
  preference_strength: number;
  cuisine_preferences?: Record<string, any>;
  atmosphere_preferences?: Record<string, any>;
  price_preferences?: Record<string, any>;
  service_preferences?: Record<string, any>;
  dietary_preferences?: Record<string, any>;
  adventure_preferences?: Record<string, any>;
  initial_recommendations?: Array<{
    restaurant_id: number;
    name: string;
    cuisine_type: string;
    price_level: number;
    avg_rating: number;
    match_score: number;
    match_reason: string;
  }>;
  message?: string;
}

export interface EnhancedRecommendation {
  restaurant_id: number;
  name: string;
  cuisine_type: string;
  price_level: number;
  avg_rating: number;
  location: {
    latitude: number;
    longitude: number;
  };
  tags: string[];
  description: string;
  image_url?: string;
  match_score: number;
  match_reason: string;
  confidence: number;
  predicted_rating: number;
  similar_users_rating?: number;
  similar_users_count: number;
  trending_score: number;
  recent_visits: number;
}