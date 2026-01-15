import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import { useReverseGeocode } from '@/hooks/useReverseGeocode';
import { Location } from '@/types/ride';

interface LocationSearchProps {
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  onSelect: (location: Location, address: string) => void;
  houseNumber?: string;
  onHouseNumberChange?: (value: string) => void;
}

function extractHouseNumber(addressFirstPart: string): { street: string; houseNumber: string } {
  const match = addressFirstPart.match(/^(.*?)(?:\s+(\d+[a-zA-Z]?))\s*$/);
  if (!match) return { street: addressFirstPart.trim(), houseNumber: '' };
  return { street: match[1].trim(), houseNumber: (match[2] || '').trim() };
}

export default function LocationSearch({
  placeholder,
  value,
  onChange,
  onSelect,
  houseNumber = '',
  onHouseNumberChange,
}: LocationSearchProps) {
  const [suggestions, setSuggestions] = useState<Array<{ location: Location; address: string }>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const { searchAddress } = useReverseGeocode();
  const debounceRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
    }

    if (value.length < 3) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    debounceRef.current = window.setTimeout(async () => {
      const searchQuery = onHouseNumberChange && houseNumber ? `${value} ${houseNumber}` : value;
      const results = await searchAddress(searchQuery);
      setSuggestions(results);
      setLoading(false);
    }, 300);

    return () => {
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current);
      }
    };
  }, [value, houseNumber, onHouseNumberChange, searchAddress]);

  const handleSelect = (suggestion: { location: Location; address: string }) => {
    const firstPart = suggestion.address.split(',')[0] ?? suggestion.address;
    const extracted = extractHouseNumber(firstPart);

    // Auto-fill house number if present in the selected address
    if (onHouseNumberChange && extracted.houseNumber) {
      onHouseNumberChange(extracted.houseNumber);
    }

    onChange(extracted.street);
    onSelect(suggestion.location, suggestion.address);
    setShowSuggestions(false);
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            value={value}
            onChange={(e) => {
              onChange(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            placeholder={placeholder}
            className="bg-secondary border-border"
          />
          {loading && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>

        {onHouseNumberChange && (
          <div className="w-20">
            <Input
              value={houseNumber}
              onChange={(e) => onHouseNumberChange(e.target.value)}
              placeholder="Nr."
              className="bg-secondary border-border text-center"
              maxLength={6}
              inputMode="text"
            />
          </div>
        )}
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-[calc(100%-3rem)] mt-1 bg-card border border-border rounded-lg shadow-lg overflow-hidden">
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              className="w-full px-4 py-3 text-left hover:bg-secondary transition-colors"
              onClick={() => handleSelect(suggestion)}
              type="button"
            >
              <span className="text-sm line-clamp-2">{suggestion.address}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

