import axios from 'axios';
import { authAPI, restaurantsAPI, ratingsAPI } from '../api';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('API Services', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
      },
      writable: true,
    });
  });

  describe('authAPI', () => {
    test('login makes correct API call', async () => {
      const mockResponse = {
        data: {
          access_token: 'test-token',
          token_type: 'bearer'
        }
      };
      mockedAxios.create().post = jest.fn().mockResolvedValue(mockResponse);

      const credentials = { username: 'testuser', password: 'password123' };
      const result = await authAPI.login(credentials);

      expect(result).toEqual(mockResponse.data);
      expect(localStorage.setItem).toHaveBeenCalledWith('auth_token', 'test-token');
    });

    test('register makes correct API call', async () => {
      const mockResponse = {
        data: {
          id: 1,
          username: 'testuser',
          email: 'test@example.com'
        }
      };
      mockedAxios.create().post = jest.fn().mockResolvedValue(mockResponse);

      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      };
      const result = await authAPI.register(userData);

      expect(result).toEqual(mockResponse.data);
    });

    test('logout clears auth token', () => {
      authAPI.logout();
      expect(localStorage.removeItem).toHaveBeenCalledWith('auth_token');
    });
  });

  describe('restaurantsAPI', () => {
    test('search makes correct API call with parameters', async () => {
      const mockResponse = {
        data: [
          { id: 1, name: 'Test Restaurant' }
        ]
      };
      mockedAxios.create().get = jest.fn().mockResolvedValue(mockResponse);

      const searchParams = {
        query: 'pizza',
        user_lat: 35.9132,
        user_lng: -79.0558,
        limit: 10
      };

      const result = await restaurantsAPI.search(searchParams);

      expect(result).toEqual(mockResponse.data);
      expect(mockedAxios.create().get).toHaveBeenCalledWith('/restaurants/', {
        params: searchParams
      });
    });

    test('getById makes correct API call', async () => {
      const mockResponse = {
        data: { id: 1, name: 'Test Restaurant' }
      };
      mockedAxios.create().get = jest.fn().mockResolvedValue(mockResponse);

      const result = await restaurantsAPI.getById(1);

      expect(result).toEqual(mockResponse.data);
      expect(mockedAxios.create().get).toHaveBeenCalledWith('/restaurants/1');
    });

    test('getNearby makes correct API call', async () => {
      const mockResponse = {
        data: [
          { id: 1, name: 'Nearby Restaurant', distance: 0.5 }
        ]
      };
      mockedAxios.create().get = jest.fn().mockResolvedValue(mockResponse);

      const result = await restaurantsAPI.getNearby(35.9132, -79.0558, 5);

      expect(result).toEqual(mockResponse.data);
      expect(mockedAxios.create().get).toHaveBeenCalledWith('/restaurants/nearby/', {
        params: { lat: 35.9132, lng: -79.0558, radius: 5 }
      });
    });
  });

  describe('ratingsAPI', () => {
    test('create makes correct API call', async () => {
      const mockResponse = {
        data: { id: 1, restaurant_id: 1, rating: 4.5 }
      };
      mockedAxios.create().post = jest.fn().mockResolvedValue(mockResponse);

      const result = await ratingsAPI.create(1, 4.5);

      expect(result).toEqual(mockResponse.data);
      expect(mockedAxios.create().post).toHaveBeenCalledWith('/ratings/', {
        restaurant_id: 1,
        rating: 4.5
      });
    });

    test('getUserRatings makes correct API call', async () => {
      const mockResponse = {
        data: [
          { id: 1, restaurant_id: 1, rating: 4.5 }
        ]
      };
      mockedAxios.create().get = jest.fn().mockResolvedValue(mockResponse);

      const result = await ratingsAPI.getUserRatings();

      expect(result).toEqual(mockResponse.data);
      expect(mockedAxios.create().get).toHaveBeenCalledWith('/ratings/user');
    });

    test('delete makes correct API call', async () => {
      mockedAxios.create().delete = jest.fn().mockResolvedValue({});

      await ratingsAPI.delete(1);

      expect(mockedAxios.create().delete).toHaveBeenCalledWith('/ratings/1');
    });
  });

  describe('Error handling', () => {
    test('handles 401 responses by clearing token and redirecting', async () => {
      const mockError = {
        response: { status: 401 }
      };

      // Mock window.location
      delete (window as any).location;
      window.location = { href: '' } as any;

      mockedAxios.create().get = jest.fn().mockRejectedValue(mockError);

      try {
        await restaurantsAPI.getById(1);
      } catch (error) {
        // Expected to throw
      }

      expect(localStorage.removeItem).toHaveBeenCalledWith('auth_token');
      expect(window.location.href).toBe('/login');
    });

    test('propagates other errors', async () => {
      const mockError = {
        response: { status: 500, data: { detail: 'Server error' } }
      };

      mockedAxios.create().get = jest.fn().mockRejectedValue(mockError);

      await expect(restaurantsAPI.getById(1)).rejects.toEqual(mockError);
    });
  });

  describe('Authorization headers', () => {
    test('sets authorization header when token exists', () => {
      const mockCreate = jest.fn().mockReturnValue({
        defaults: { headers: { common: {} } },
        interceptors: { response: { use: jest.fn() } }
      });
      mockedAxios.create = mockCreate;

      (localStorage.getItem as jest.Mock).mockReturnValue('test-token');

      // Re-import to trigger initialization
      jest.resetModules();
      require('../api');

      expect(mockCreate().defaults.headers.common['Authorization']).toBe('Bearer test-token');
    });
  });
});