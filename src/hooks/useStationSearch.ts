import { useMemo, useState } from 'react';
import stationDataRaw from '../api/bharatpath_master_map.json';

export interface Station {
  code: string;
  name: string;
}

// Pre-process stations list once
const ALL_STATIONS: Station[] = Object.values(stationDataRaw).map((s: any) => ({
  code: s.c,
  name: s.n,
}));

export const useStationSearch = (initialValue: string = '') => {
  const [query, setQuery] = useState(initialValue);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const suggestions = useMemo(() => {
    const trimmed = query.trim().toUpperCase();
    if (!trimmed || trimmed.length < 1) return [];
    
    // Prioritize code matches, then name matches
    const codeMatches = ALL_STATIONS.filter(s => s.code.startsWith(trimmed));
    const nameMatches = ALL_STATIONS.filter(s => 
      !s.code.startsWith(trimmed) && s.name.toUpperCase().includes(trimmed)
    );

    return [...codeMatches, ...nameMatches].slice(0, 7);
  }, [query]);

  const selectStation = (code: string) => {
    setQuery(code);
    setShowSuggestions(false);
  };

  const clearSearch = () => {
    setQuery('');
    setShowSuggestions(false);
  };

  return {
    query,
    setQuery,
    suggestions,
    showSuggestions,
    setShowSuggestions,
    selectStation,
    clearSearch,
    isValid: !!(stationDataRaw as any)[query.toUpperCase()]
  };
};
