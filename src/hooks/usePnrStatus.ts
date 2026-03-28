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
      
      const response = await apiClient.get(`pnr/${pnr}`);
      const raw = response.data.data;
      
      // Map backend fields to frontend JourneyData precisely
      const journey: JourneyData = {
        pnr,
        trainNo: raw.trainNumber,
        trainName: raw.trainName,
        sourceCode: raw.from.code,
        sourceCity: raw.from.name,
        destCode: raw.to.code,
        destCity: raw.to.name,
        departs: raw.departureTime,
        arrival: raw.arrivalTime,
        platform: raw.platform,
        coach: raw.coach,
        seat: raw.seat,
        statusTag: raw.status,
        subText: raw.subText,
        currentLocation: raw.currentLocation,
        eta: raw.eta,
        progressPct: raw.progressPct,
      };
      
      // Store journey object with metadata in AsyncStorage
      const storageData = {
        journey,
        cachedAt: Date.now()
      };
      
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(storageData));
      
      return journey;
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
    // Return ONLY the journey object as requested, or the whole parsed object if needed.
    // The prompt says: "getCachedJourney() - Read from AsyncStorage - Parse JSON safely - Return null if invalid or missing"
    // And on success: "Store metadata: { journey: {...}, cachedAt: Date.now() }"
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
