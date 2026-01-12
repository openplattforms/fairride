import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin, Navigation, Loader2, Home } from 'lucide-react';
import { useReverseGeocode } from '@/hooks/useReverseGeocode';
import { Location } from '@/types/ride';

interface LocationSearchProps {
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  onSelect: (location: Location, address: string) => void;
  icon?: 'pickup' | 'dropoff';
  houseNumber?: string;
  onHouseNumberChange?: (value: string) => void;
}

export default function LocationSearch({
  placeholder,
  value,
  onChange,
  onSelect,
  icon = 'pickup',
  houseNumber = '',
  onHouseNumberChange,
}: LocationSearchProps) {
  const [suggestions, setSuggestions] = useState<Array<{ location: Location; address: string }>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const { searchAddress } = useReverseGeocode();
  const debounceRef = useRef<NodeJS.Timeout>();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (value.length < 3) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      // Include house number in search if provided
      const searchQuery = houseNumber ? `${value} ${houseNumber}` : value;
      const results = await searchAddress(searchQuery);
      setSuggestions(results);
      setLoading(false);
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [value, houseNumber, searchAddress]);

  const handleSelect = (suggestion: { location: Location; address: string }) => {
    onSelect(suggestion.location, suggestion.address);
    // Extract street name without full address for cleaner display
    const streetName = suggestion.address.split(',')[0];
    onChange(streetName);
    setShowSuggestions(false);
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        {/* Main address input */}
        <div className="relative flex-1">
          <div className="absolute left-3 top-1/2 -translate-y-1/2">
            {icon === 'pickup' ? (
              <div className="w-3 h-3 bg-primary rounded-full" />
            ) : (
              <MapPin className="w-4 h-4 text-destructive" />
            )}
          </div>
          <Input
            ref={inputRef}
            value={value}
            onChange={(e) => {
              onChange(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            placeholder={placeholder}
            className="pl-10 bg-secondary border-border"
          />
          {loading && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>

        {/* House number input */}
        {onHouseNumberChange && (
          <div className="relative w-20">
            <div className="absolute left-2 top-1/2 -translate-y-1/2">
              <Home className="w-3 h-3 text-muted-foreground" />
            </div>
            <Input
              value={houseNumber}
              onChange={(e) => onHouseNumberChange(e.target.value)}
              placeholder="Nr."
              className="pl-7 bg-secondary border-border text-center"
              maxLength={6}
            />
          </div>
        )}
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-[calc(100%-3rem)] mt-1 bg-card border border-border rounded-lg shadow-lg overflow-hidden">
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              className="w-full px-4 py-3 text-left hover:bg-secondary transition-colors flex items-start gap-3"
              onClick={() => handleSelect(suggestion)}
            >
              <Navigation className="w-4 h-4 mt-1 text-muted-foreground flex-shrink-0" />
              <span className="text-sm line-clamp-2">{suggestion.address}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
