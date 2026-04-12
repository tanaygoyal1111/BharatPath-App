import { useMutation } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../api/client';

export interface JourneyStation {
  name: string;
  code?: string;
  schArrival?: string;
  actArrival?: string;
  schDeparture?: string;
  actDeparture?: string;
  platform?: string;
}

export interface JourneyData {
  pnr: string;
  trainNo: string;
  trainNumber?: string; // Add alias for trainNo if needed
  trainName: string;
  source: {
    code: string;
    name: string;
    schDeparture?: string;
  };
  destination: {
    code: string;
    name: string;
    schArrival?: string;
  };
  sourceCode: string; // Keep for backward compatibility
  sourceCity: string;
  destCode: string;
  destCity: string;
  departs: string; // ISO format
  arrival: string; // ISO format
  platform: string;
  coach: string;
  seat: string;
  statusTag?: string;
  subText?: string;
  currentLocation?: string;
  eta?: string;
  progressPct?: number;
  stations?: JourneyStation[];
  delayInMins?: string;
}

export const STORAGE_KEY = 'active_journey';

/**
 * Normalizes flat API response into a rich JourneyData object for UI consistency.
 * This acts as the "Standardized Sync" layer between Backend and Frontend.
 */
export const normalizeJourneyData = (raw: any): JourneyData => {
  return {
    ...raw,
    // Add nested source object if missing
    source: raw.source || {
      code: raw.sourceCode,
      name: raw.sourceCity,
      schDeparture: raw.departs,
    },
    // Add nested destination object if missing
    destination: raw.destination || {
      code: raw.destCode,
      name: raw.destCity,
      schArrival: raw.arrival,
    },
    // Ensure trainNumber alias exists for UI components
    trainNumber: raw.trainNumber || raw.trainNo,
    // Ensure stations array is at least empty
    stations: raw.stations || [],
  };
};

export const usePnrStatus = (
  onSuccessCallback?: (data: JourneyData) => void,
  onErrorCallback?: (error: any) => void
) => {
  return useMutation({
    mutationFn: async (pnr: string) => {
      // Validate PNR (must be exactly 10 digits)
      if (!/^\d{10}$/.test(pnr)) {
        throw new Error('Enter valid 10-digit PNR');
      }
      
      try {
        const response = await apiClient.get(`/pnr/${pnr}`);
        // Apply Standardized Normalization
        const journey: JourneyData = normalizeJourneyData(response.data.data);
        
        // Task 2: Implement Offline Resilience
        await AsyncStorage.setItem(`pnr_cache_${pnr}`, JSON.stringify(journey));
        
        // Store journey object with metadata in AsyncStorage for active tracking
        const storageData = {
          journey,
          cachedAt: Date.now()
        };
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(storageData));
        await AsyncStorage.setItem('last_tracked_pnr', pnr); 
        
        return journey;
      } catch (error) {
        // Fallback to offline cache
        const cachedData = await AsyncStorage.getItem(`pnr_cache_${pnr}`);
        if (cachedData) {
          const parsed = JSON.parse(cachedData);
          // Re-normalize cached data just in case it was stored before sync logic
          const journey = normalizeJourneyData(parsed);
          
          const storageData = {
            journey,
            cachedAt: Date.now()
          };
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(storageData));
          await AsyncStorage.setItem('last_tracked_pnr', pnr); 
          
          return journey;
        }
        throw new Error("Unable to fetch data. Please ensure you entered a valid 10-digit PNR."); 
      }
    },
    onSuccess: (data) => {
      onSuccessCallback?.(data);
    },
    onError: (error) => {
      onErrorCallback?.(error);
    }
  });
};

export const getCachedJourney = async (): Promise<JourneyData | null> => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY);
    if (!data) return null;
    const parsed = JSON.parse(data);
    return parsed.journey || null;
  } catch (e) {
    console.error('[PNR Cache] Error parsing journey:', e);
    return null;
  }
};

export const clearActiveJourney = async () => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error('[PNR Cache] Error clearing journey:', e);
  }
};
