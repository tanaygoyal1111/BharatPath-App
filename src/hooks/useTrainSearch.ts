import { useQuery } from '@tanstack/react-query';
import apiClient from '../api/client';

interface TrainSearchParams {
  from: string;
  to: string;
  date: string;
}

export interface Train {
  trainNumber: string;
  trainName: string;
  type: string;
  duration: string;
  departure: { time: string; station: string };
  arrival: { time: string; station: string };
  runningDays: Record<string, boolean>;
  classes: string[];
}

export const useTrainSearch = (params: TrainSearchParams) => {
  const { from, to, date } = params;

  return useQuery({
    queryKey: ['trainSearch', from, to, date],
    queryFn: async () => {
      const response = await apiClient.get('trains/search', {
        params: { from, to, date },
      });
      // Handle the server's response wrapper: { success, data, count, error }
      return response.data.data as Train[];
    },
    // Only enable query if all parameters are provided
    enabled: !!from && !!to && !!date,
    // Keep data fresh for 5 minutes
    staleTime: 0,
    // Retry multiple times on failure to overcome transient network issues
    retry: 3,
  });
};
