import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { MapPin, Navigation, Loader2 } from 'lucide-react';
import { useReverseGeocode } from '@/hooks/useReverseGeocode';
import { Location } from '@/types/ride';

interface LocationSearchProps {
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  onSelect: (location: Location, address: string) => void;
  icon?: 'pickup' | 'dropoff';
}

export default function LocationSearch({
  placeholder,
  value,
  onChange,
  onSelect,
  icon = 'pickup',
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
      const results = await searchAddress(value);
      setSuggestions(results);
      setLoading(false);
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [value, searchAddress]);

  const handleSelect = (suggestion: { location: Location; address: string }) => {
    onSelect(suggestion.location, suggestion.address);
    onChange(suggestion.address.split(',')[0]);
    setShowSuggestions(false);
  };

  return (
    <div className="relative">
      <div className="relative">
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

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-lg overflow-hidden">
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
