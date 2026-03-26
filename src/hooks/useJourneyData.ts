// src/hooks/useJourneyData.ts
import { useQuery } from '@tanstack/react-query';
import { saveJourneyData, getJourneyData } from '../utils/storage';
import mockData from '../api/mock_data.json';
// Import axios as requested in dependencies (will be used broadly in the future)

/**
 * Custom hook managing the user's active journey data State.
 * Integrates TanStack Query with MMKV for strict Offline-First capabilities.
 */
export const useJourneyData = (isOffline: boolean) => {
  return useQuery({
    queryKey: ['journey', isOffline],
    
    queryFn: async () => {
      if (isOffline) {
        const cachedData = await getJourneyData();
        return cachedData || mockData; 
      }

      try {
        const data = await new Promise((resolve) => {
          setTimeout(() => resolve(mockData), 1000);
        });

        await saveJourneyData(data);
        return data as typeof mockData;

      } catch (error) {
        const cachedFallback = await getJourneyData();
        if (cachedFallback) {
          return cachedFallback;
        }
        throw error;
      }
    },
    staleTime: 1000 * 60 * 5, 
  });
};
