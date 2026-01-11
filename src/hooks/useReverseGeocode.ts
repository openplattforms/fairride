import { useState, useCallback } from 'react';
import { Location } from '@/types/ride';

export function useReverseGeocode() {
  const [loading, setLoading] = useState(false);

  const getAddress = useCallback(async (location: Location): Promise<string> => {
    setLoading(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${location.lat}&lon=${location.lng}&zoom=18&addressdetails=1`,
        {
          headers: {
            'Accept-Language': 'de',
          },
        }
      );
      const data = await response.json();
      setLoading(false);
      
      if (data.address) {
        const parts = [];
        if (data.address.road) parts.push(data.address.road);
        if (data.address.house_number) parts.push(data.address.house_number);
        if (data.address.city || data.address.town || data.address.village) {
          parts.push(data.address.city || data.address.town || data.address.village);
        }
        return parts.join(', ') || data.display_name;
      }
      return data.display_name || 'Unbekannter Ort';
    } catch (error) {
      setLoading(false);
      return 'Adresse nicht gefunden';
    }
  }, []);

  const searchAddress = useCallback(async (query: string): Promise<Array<{ location: Location; address: string }>> => {
    if (!query || query.length < 3) return [];
    
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`,
        {
          headers: {
            'Accept-Language': 'de',
          },
        }
      );
      const data = await response.json();
      
      return data.map((item: any) => ({
        location: { lat: parseFloat(item.lat), lng: parseFloat(item.lon) },
        address: item.display_name,
      }));
    } catch (error) {
      return [];
    }
  }, []);

  return { getAddress, searchAddress, loading };
}
