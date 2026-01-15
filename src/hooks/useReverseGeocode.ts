import { useState, useCallback } from 'react';
import { Location } from '@/types/ride';

export function useReverseGeocode() {
  const [loading, setLoading] = useState(false);

  const formatAddress = (addr: any, fallback: string) => {
    const parts: string[] = [];
    const city = addr.city || addr.town || addr.village;

    if (addr.road) {
      const street = addr.house_number ? `${addr.road} ${addr.house_number}` : addr.road;
      parts.push(street);
    }

    if (city) parts.push(city);

    return parts.join(', ') || fallback;
  };

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
        return formatAddress(data.address, data.display_name);
      }
      return data.display_name || 'Unbekannter Ort';
    } catch {
      setLoading(false);
      return 'Adresse nicht gefunden';
    }
  }, []);

  const searchAddress = useCallback(
    async (query: string): Promise<Array<{ location: Location; address: string }>> => {
      if (!query || query.length < 3) return [];

      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`,
          {
            headers: {
              'Accept-Language': 'de',
            },
          }
        );
        const data = await response.json();

        return data.map((item: any) => ({
          location: { lat: parseFloat(item.lat), lng: parseFloat(item.lon) },
          address: item.address ? formatAddress(item.address, item.display_name) : item.display_name,
        }));
      } catch {
        return [];
      }
    },
    []
  );

  return { getAddress, searchAddress, loading };
}

