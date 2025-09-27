import React, { useState, useRef, useEffect } from 'react';
import { Search, X, AlertCircle, Lightbulb } from 'lucide-react';
import { restaurantsAPI } from '../services/api';

interface IntelligentSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: (query: string) => void;
  placeholder?: string;
  className?: string;
}

const IntelligentSearchBar: React.FC<IntelligentSearchBarProps> = ({
  value,
  onChange,
  onSearch,
  placeholder = "Search restaurants, cuisines, or countries...",
  className = ""
}) => {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [corrections, setCorrections] = useState<{original_query: string; suggestions: string[]; has_suggestions: boolean} | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  // Fetch suggestions with debouncing
  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (value.length >= 2) {
      timeoutRef.current = setTimeout(async () => {
        try {
          setIsLoading(true);
          const suggestionResults = await restaurantsAPI.getSearchSuggestions(value);
          setSuggestions(suggestionResults);
          setShowSuggestions(true);
        } catch (error) {
          console.error('Failed to fetch suggestions:', error);
          setSuggestions([]);
        } finally {
          setIsLoading(false);
        }
      }, 300);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
      setCorrections(null);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value]);

  // Check for corrections on search
  const handleSearch = async (query: string) => {
    if (!query.trim()) return;

    try {
      // Check for spelling corrections
      const correctionResults = await restaurantsAPI.getSearchCorrections(query);

      if (correctionResults.has_suggestions) {
        setCorrections(correctionResults);
      } else {
        setCorrections(null);
      }

      onSearch(query);
      setShowSuggestions(false);
    } catch (error) {
      console.error('Search failed:', error);
      onSearch(query);
      setShowSuggestions(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    setFocusedIndex(-1);
    setCorrections(null);
  };

  const handleSuggestionClick = (suggestion: string) => {
    onChange(suggestion);
    handleSearch(suggestion);
  };

  const handleCorrectionClick = (suggestion: string) => {
    onChange(suggestion);
    handleSearch(suggestion);
    setCorrections(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) {
      if (e.key === 'Enter') {
        handleSearch(value);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex(prev =>
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex(prev =>
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < suggestions.length) {
          const selectedSuggestion = suggestions[focusedIndex];
          onChange(selectedSuggestion);
          handleSearch(selectedSuggestion);
        } else {
          handleSearch(value);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setFocusedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  const clearSearch = () => {
    onChange('');
    setShowSuggestions(false);
    setCorrections(null);
    inputRef.current?.focus();
  };

  const handleFocus = () => {
    if (suggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  const handleBlur = (e: React.FocusEvent) => {
    // Don't hide suggestions if clicking on a suggestion
    if (suggestionsRef.current?.contains(e.relatedTarget as Node)) {
      return;
    }
    setTimeout(() => setShowSuggestions(false), 100);
  };

  return (
    <div className={`relative ${className}`}>
      {/* Main Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          className="w-full pl-12 pr-12 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all duration-300 text-gray-900 placeholder-gray-500 bg-white shadow-sm"
        />

        {/* Clear Button */}
        {value && (
          <button
            onClick={clearSearch}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
          </div>
        )}
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-lg z-50 max-h-60 overflow-y-auto"
        >
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion}
              onClick={() => handleSuggestionClick(suggestion)}
              className={`w-full text-left px-4 py-3 hover:bg-gray-50 focus:bg-gray-50 focus:outline-none transition-colors ${
                index === focusedIndex ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
              } ${index === 0 ? 'rounded-t-xl' : ''} ${
                index === suggestions.length - 1 ? 'rounded-b-xl' : 'border-b border-gray-100'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Search className="w-4 h-4 text-gray-400" />
                <span className="font-medium">{suggestion}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Did You Mean Suggestions */}
      {corrections && corrections.has_suggestions && (
        <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-start space-x-2">
            <Lightbulb className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-amber-800 font-medium mb-2">
                Did you mean:
              </p>
              <div className="flex flex-wrap gap-2">
                {corrections.suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleCorrectionClick(suggestion)}
                    className="inline-flex items-center px-3 py-1 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-full text-sm font-medium transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search Examples */}
      {!value && (
        <div className="mt-4 text-xs text-gray-500">
          <p className="font-medium mb-1">Try searching for:</p>
          <div className="flex flex-wrap gap-2">
            {['Italy', 'spicy food', 'pizza', 'healthy', 'cheap eats', 'fine dining'].map((example) => (
              <button
                key={example}
                onClick={() => {
                  onChange(example);
                  handleSearch(example);
                }}
                className="inline-flex items-center px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded text-xs transition-colors"
              >
                {example}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default IntelligentSearchBar;