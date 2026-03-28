import { useQuery } from '@tanstack/react-query';
import apiClient from '../api/client';

interface TrainSearchParams {
  from: string;
  to: string;
  date: string;
}

export const useTrainSearch = (params: TrainSearchParams) => {
  const { from, to, date } = params;

  return useQuery({
    queryKey: ['trainSearch', from, to, date],
    queryFn: async () => {
      const response = await apiClient.get('trains/search', {
        params: { from, to, date },
      });
      return response.data;
    },
    // Only enable query if all parameters are provided
    enabled: !!from && !!to && !!date,
    // Keep data fresh for 5 minutes
    staleTime: 0,
    // Retry multiple times on failure to overcome transient network issues
    retry: 3,
  });
};
