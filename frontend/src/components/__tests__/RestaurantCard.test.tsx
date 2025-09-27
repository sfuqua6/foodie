import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import RestaurantCard from '../RestaurantCard';
import { AuthProvider } from '../../hooks/useAuth';
import { Restaurant } from '../../types';

// Mock API
jest.mock('../../services/api', () => ({
  ratingsAPI: {
    create: jest.fn(),
  },
  reviewsAPI: {
    create: jest.fn(),
  }
}));

const mockRestaurant: Restaurant = {
  id: 1,
  name: 'Test Restaurant',
  address: '123 Test St, Chapel Hill, NC',
  phone: '(919) 123-4567',
  website: 'https://testrestaurant.com',
  cuisine_type: 'American',
  price_level: 2,
  latitude: 35.9132,
  longitude: -79.0558,
  avg_rating: 4.2,
  rating_count: 15,
  distance: 0.5
};

const MockAuthProvider: React.FC<{ children: React.ReactNode; user?: any }> = ({ children, user = null }) => {
  const mockAuthValue = {
    user: user || { id: 1, username: 'testuser', email: 'test@example.com' },
    loading: false,
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn(),
    updateUser: jest.fn(),
  };

  return (
    <div>
      {React.Children.map(children, (child) =>
        React.isValidElement(child)
          ? React.cloneElement(child as React.ReactElement<any>, {
              mockAuthValue
            })
          : child
      )}
    </div>
  );
};

const renderRestaurantCard = (props: any = {}, user: any = { id: 1, username: 'testuser' }) => {
  return render(
    <BrowserRouter>
      <MockAuthProvider user={user}>
        <RestaurantCard
          restaurant={mockRestaurant}
          {...props}
        />
        <Toaster />
      </MockAuthProvider>
    </BrowserRouter>
  );
};

describe('RestaurantCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders restaurant information correctly', () => {
    renderRestaurantCard();

    expect(screen.getByText('Test Restaurant')).toBeInTheDocument();
    expect(screen.getByText('American')).toBeInTheDocument();
    expect(screen.getByText('$$')).toBeInTheDocument();
    expect(screen.getByText('123 Test St, Chapel Hill, NC')).toBeInTheDocument();
    expect(screen.getByText('4.2/5')).toBeInTheDocument();
    expect(screen.getByText('(15 reviews)')).toBeInTheDocument();
  });

  test('shows distance when showDistance is true', () => {
    renderRestaurantCard({ showDistance: true });
    expect(screen.getByText('500m')).toBeInTheDocument();
  });

  test('shows recommendation score when showRecommendationScore is true', () => {
    const restaurantWithScore = {
      ...mockRestaurant,
      recommendation_score: 4.5,
      reasoning: 'Popular choice'
    };

    renderRestaurantCard({
      restaurant: restaurantWithScore,
      showRecommendationScore: true
    });

    expect(screen.getByText('Match Score: 4.5/5')).toBeInTheDocument();
    expect(screen.getByText('Popular choice')).toBeInTheDocument();
  });

  test('displays user rating when provided', () => {
    const userRating = { id: 1, user_id: 1, restaurant_id: 1, rating: 4, created_at: '2024-01-01' };
    renderRestaurantCard({ userRating });

    expect(screen.getByText('(4/5)')).toBeInTheDocument();
  });

  test('allows user to rate restaurant', async () => {
    const mockCreate = require('../../services/api').ratingsAPI.create;
    mockCreate.mockResolvedValue({ id: 1, rating: 5 });

    const mockOnRatingUpdate = jest.fn();
    renderRestaurantCard({ onRatingUpdate: mockOnRatingUpdate });

    // Find and click the 5th star
    const stars = screen.getAllByTestId('star-rating');
    fireEvent.click(stars[4]); // 5th star (0-indexed)

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith(1, 5);
      expect(mockOnRatingUpdate).toHaveBeenCalled();
    });
  });

  test('shows review form when write review is clicked', () => {
    renderRestaurantCard();

    const writeReviewButton = screen.getByText('Write Review');
    fireEvent.click(writeReviewButton);

    expect(screen.getByPlaceholderText('Review title (optional)')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Share your experience...')).toBeInTheDocument();
  });

  test('submits review correctly', async () => {
    const mockCreate = require('../../services/api').reviewsAPI.create;
    mockCreate.mockResolvedValue({ id: 1, title: 'Great place', content: 'Loved it!' });

    renderRestaurantCard();

    // Open review form
    const writeReviewButton = screen.getByText('Write Review');
    fireEvent.click(writeReviewButton);

    // Fill out form
    fireEvent.change(screen.getByPlaceholderText('Review title (optional)'), {
      target: { value: 'Great place' }
    });
    fireEvent.change(screen.getByPlaceholderText('Share your experience...'), {
      target: { value: 'Loved it!' }
    });

    // Submit form
    fireEvent.click(screen.getByText('Submit Review'));

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith(1, 'Great place', 'Loved it!');
    });
  });

  test('renders contact links correctly', () => {
    renderRestaurantCard();

    const phoneLink = screen.getByRole('link', { name: /phone/i });
    expect(phoneLink).toHaveAttribute('href', 'tel:(919) 123-4567');

    const websiteLink = screen.getByRole('link', { name: /website/i });
    expect(websiteLink).toHaveAttribute('href', 'https://testrestaurant.com');
  });

  test('handles missing optional fields gracefully', () => {
    const minimalRestaurant: Restaurant = {
      id: 2,
      name: 'Minimal Restaurant',
      latitude: 35.9132,
      longitude: -79.0558,
      avg_rating: 0,
      rating_count: 0
    };

    render(
      <BrowserRouter>
        <MockAuthProvider>
          <RestaurantCard restaurant={minimalRestaurant} />
        </MockAuthProvider>
      </BrowserRouter>
    );

    expect(screen.getByText('Minimal Restaurant')).toBeInTheDocument();
    expect(screen.getByText('0.0/5')).toBeInTheDocument();
    expect(screen.getByText('(0 reviews)')).toBeInTheDocument();
  });

  test('does not show rating interface for unauthenticated users', () => {
    render(
      <BrowserRouter>
        <MockAuthProvider user={null}>
          <RestaurantCard restaurant={mockRestaurant} />
        </MockAuthProvider>
      </BrowserRouter>
    );

    expect(screen.queryByText('Your Rating:')).not.toBeInTheDocument();
    expect(screen.queryByText('Write Review')).not.toBeInTheDocument();
  });
});