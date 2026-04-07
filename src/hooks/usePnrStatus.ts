import { useMutation } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../api/client';

export interface JourneyData {
  pnr: string;
  trainNo: string;
  trainName: string;
  sourceCode: string;
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
}

export const STORAGE_KEY = 'active_journey';

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
        const journey: JourneyData = response.data.data;
        
        // Task 2: Implement Offline Resilience
        await AsyncStorage.setItem(`pnr_cache_${pnr}`, JSON.stringify(journey));
        
        // Store journey object with metadata in AsyncStorage for active tracking
        const storageData = {
          journey,
          cachedAt: Date.now()
        };
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(storageData));
        
        return journey;
      } catch (error) {
        // Fallback to offline cache
        const cachedData = await AsyncStorage.getItem(`pnr_cache_${pnr}`);
        if (cachedData) {
          const parsed = JSON.parse(cachedData);
          
          // Re-update the active tracking cache as well to match fallback
          const storageData = {
            journey: parsed,
            cachedAt: Date.now()
          };
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(storageData));
          
          return parsed as JourneyData;
        }
        throw new Error("Unable to fetch data. Please ensure you entered a valid 10-digit PNR."); // No cache exists, throw to UI
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
