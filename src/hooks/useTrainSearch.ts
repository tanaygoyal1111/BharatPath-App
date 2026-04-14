import { useQuery } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
      try {
        const response = await apiClient.get(`/trains/search?from=${from}&to=${to}&date=${date}`);
        const trainData = response.data.data as Train[];
        
        
        await AsyncStorage.setItem(`train_cache_${from}_${to}`, JSON.stringify(trainData));
        return trainData;
      } catch (error) {
        const cachedData = await AsyncStorage.getItem(`train_cache_${from}_${to}`);
        if (cachedData) {
          return JSON.parse(cachedData) as Train[];
        }
        throw error;
      }
    },
    // Only enable query if all parameters are provided
    enabled: !!from && !!to && !!date,
    // Keep data fresh for 5 minutes
    staleTime: 0,
    // Retry multiple times on failure to overcome transient network issues
    retry: 3,
  });
};
