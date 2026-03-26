import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import { Loader2 } from 'lucide-react';

interface AutocompleteInputProps {
  value: string;
  onChange: (val: string) => void;
  placeholder: string;
  icon: React.ReactNode;
  type: 'profession' | 'location';
  disabled?: boolean;
}

export function AutocompleteInput({ value, onChange, placeholder, icon, type, disabled }: AutocompleteInputProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchSuggestions = async (input: string) => {
    if (!input || input.trim().length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = `Provide exactly 3 relevant and logical ${type} search predictions based on the partial user input: "${input}". Return ONLY a JSON array of 3 strings.`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: `Exactly 3 ${type} predictions`
          },
          temperature: 0.3,
        }
      });

      const text = response.text;
      if (text) {
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) {
          setSuggestions(parsed.slice(0, 3));
          setIsOpen(true);
        }
      }
    } catch (error) {
      console.error("Failed to fetch suggestions:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange(val);
    
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    if (val.trim().length >= 2) {
      debounceTimerRef.current = setTimeout(() => {
        fetchSuggestions(val);
      }, 400);
    } else {
      setSuggestions([]);
      setIsOpen(false);
    }
  };

  const handleSelect = (suggestion: string) => {
    onChange(suggestion);
    setIsOpen(false);
  };

  return (
    <div className="relative flex-1" ref={wrapperRef}>
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        {icon}
      </div>
      <input
        type="text"
        value={value}
        onChange={handleInputChange}
        onFocus={() => { if (suggestions.length > 0) setIsOpen(true); }}
        placeholder={placeholder}
        disabled={disabled}
        className="block w-full pl-10 pr-10 py-3 border border-slate-300 rounded-xl leading-5 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base transition-shadow shadow-sm disabled:opacity-50"
      />
      {isLoading && (
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
          <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
        </div>
      )}
      
      {isOpen && suggestions.length > 0 && (
        <ul className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-auto py-1 text-sm sm:text-base text-left">
          {suggestions.map((suggestion, index) => (
            <li
              key={index}
              onClick={() => handleSelect(suggestion)}
              className="px-4 py-2 hover:bg-slate-100 cursor-pointer text-slate-700"
            >
              {suggestion}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
