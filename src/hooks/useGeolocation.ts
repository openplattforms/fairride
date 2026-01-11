import { useState, useEffect, useCallback } from 'react';
import { Location } from '@/types/ride';

interface GeolocationState {
  location: Location | null;
  error: string | null;
  loading: boolean;
}

export function useGeolocation(watch: boolean = false) {
  const [state, setState] = useState<GeolocationState>({
    location: null,
    error: null,
    loading: true,
  });

  const updateLocation = useCallback((position: GeolocationPosition) => {
    setState({
      location: {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      },
      error: null,
      loading: false,
    });
  }, []);

  const handleError = useCallback((error: GeolocationPositionError) => {
    setState(prev => ({
      ...prev,
      error: error.message,
      loading: false,
    }));
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) {
      setState(prev => ({
        ...prev,
        error: 'Geolocation wird nicht unterstützt',
        loading: false,
      }));
      return;
    }

    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    };

    if (watch) {
      const watchId = navigator.geolocation.watchPosition(updateLocation, handleError, options);
      return () => navigator.geolocation.clearWatch(watchId);
    } else {
      navigator.geolocation.getCurrentPosition(updateLocation, handleError, options);
    }
  }, [watch, updateLocation, handleError]);

  const refresh = useCallback(() => {
    setState(prev => ({ ...prev, loading: true }));
    navigator.geolocation.getCurrentPosition(updateLocation, handleError, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    });
  }, [updateLocation, handleError]);

  return { ...state, refresh };
}
