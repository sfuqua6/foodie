import { useState, useEffect } from 'react';

interface Location {
  latitude: number;
  longitude: number;
}

interface UseLocationReturn {
  location: Location | null;
  loading: boolean;
  error: string | null;
  requestLocation: () => void;
}

const CHAPEL_HILL_DEFAULT = {
  latitude: 35.9132,
  longitude: -79.0558
};

export const useLocation = (): UseLocationReturn => {
  const [location, setLocation] = useState<Location | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser');
      setLocation(CHAPEL_HILL_DEFAULT);
      return;
    }

    setLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
        setLoading(false);
      },
      (error) => {
        let errorMessage = 'Failed to get location';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied. Using Chapel Hill as default.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information unavailable. Using Chapel Hill as default.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out. Using Chapel Hill as default.';
            break;
        }
        setError(errorMessage);
        setLocation(CHAPEL_HILL_DEFAULT);
        setLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 60000 // Cache location for 1 minute
      }
    );
  };

  useEffect(() => {
    // Try to get location on mount
    requestLocation();
  }, []);

  return {
    location,
    loading,
    error,
    requestLocation
  };
};