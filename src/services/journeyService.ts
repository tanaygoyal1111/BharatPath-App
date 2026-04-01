import apiClient from '../api/client';
import { supabase } from '../lib/supabase';

/**
 * Journey API response shape (matches backend journeyProvider contract)
 */
export interface JourneyAPIData {
  pnr: string;
  trainNumber: string;
  trainName: string;
  status: string;
  currentSpeed: number;
  delayInMinutes: number;
  platform: string;
  journeyDate: string;
  departureTime: string;
  arrivalTime: string;
  currentStation: {
    code: string;
    name: string;
    lat: number | null;
    lng: number | null;
  };
  nextStation: {
    code: string;
    name: string;
    lat: number | null;
    lng: number | null;
    distanceKm: number;
    eta: string;
  };
  destination: {
    code: string;
    name: string;
    lat: number | null;
    lng: number | null;
  };
  distanceToDestination: number;
  routeStations: Array<{
    code: string;
    name: string;
    lat: number | null;
    lng: number | null;
    status: string;
  }>;
  source?: string;
  fallback?: boolean;
  message?: string;
}

/**
 * Fetch live journey data from the backend.
 * Automatically attaches Supabase JWT for authenticated requests.
 */
export const fetchJourneyData = async (pnr: string): Promise<JourneyAPIData> => {
  // Get current session token
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const response = await apiClient.get(`journey/${pnr}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!response.data?.success) {
    throw new Error(response.data?.error || 'Failed to fetch journey data');
  }

  return response.data.data;
};
