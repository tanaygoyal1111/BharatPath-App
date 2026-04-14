import { useQuery } from '@tanstack/react-query';
import { saveJourneyData, getJourneyData } from '../utils/storage';
import { fetchJourneyData } from '../services/journeyService';

export const useJourneyData = (pnr: string | null, isOffline: boolean) => {
  return useQuery({
    queryKey: ['journey', pnr, isOffline],
    queryFn: async () => {
      if (isOffline) {
        const cachedData = await getJourneyData();
        if (!cachedData) throw new Error("No offline data available");
        return cachedData; 
      }
      
      if (!pnr) throw new Error("PNR is required for live fetch");

      try {
        const data = await fetchJourneyData(pnr);
        await saveJourneyData(data as any); 
        return data;
      } catch (error) {
        const cachedFallback = await getJourneyData();
        if (cachedFallback) return cachedFallback;
        throw error;
      }
    },
    enabled: !!pnr || isOffline,
    staleTime: 1000 * 60 * 5, 
  });
};
