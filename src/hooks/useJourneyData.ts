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
    // We add 'isOffline' to the query key so if network state changes, it triggers an evaluation
    queryKey: ['journey', isOffline],
    
    queryFn: async () => {
      // MENTOR COMMENT - STEP 1 (Offline Override):
      // If the app is set to offline explicitly, bypass network latency entirely.
      // We pull instantly from Disk Storage. 
      if (isOffline) {
        const cachedData = await getJourneyData();
        // Since this is Phase 1, we return 'mockData' if there's no cache yet so we have something to display.
        return cachedData || mockData; 
      }

      try {
        // MENTOR COMMENT - STEP 2 (The Fetch):
        // Simulate a network API fetch that takes 1 second, resolving to our mock JSON.
        // In a live environment scenario, this would look like: 
        // const { data } = await axios.get('https://api.bharatpath.com/journey');
        const data = await new Promise((resolve) => {
          setTimeout(() => resolve(mockData), 1000);
        });

        // MENTOR COMMENT - STEP 3 (The Offline Save):
        // If the fetch is successful, we securely 'stash' the fresh data into Disk.
        await saveJourneyData(data);
        return data as typeof mockData;

      } catch (error) {
        // MENTOR COMMENT - STEP 4 (Offline Fallback):
        // If the fetch fails (Timeout, 404, No Signal), we silently fail-over to the Disk cache.
        // This is the core "Offline-First" rule: the user must NEVER be blocked by network failure.
        const cachedFallback = await getJourneyData();
        if (cachedFallback) {
          return cachedFallback;
        }
        // Throw error if fetch failed AND we have literally nothing in storage (rare edge case)
        throw error;
      }
    },
    // MENTOR COMMENT - STEP 5 (Stale Time):
    // By providing a staleTime, we avoid aggressively fetching the same data on every re-render.
    // The query client considers the data fresh for 5 minutes here.
    staleTime: 1000 * 60 * 5, 
  });
};
