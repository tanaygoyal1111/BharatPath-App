import apiClient from '../api/client';
import { supabase } from '../lib/supabase';

/**
 * Journey API response shape (matches backend journeyProvider contract)
 */
export interface JourneyStation {
  name: string;
  code?: string;
  lat: number;
  lng: number;
  distance: number; // cumulative distance from source in km
  time: string;
  platform?: string;
  schArrival?: string;
  actArrival?: string;
}

export interface JourneyAPIData {
  pnr?: string;
  trainName: string;
  trainNumber?: string;
  startTime: number;
  endTime: number;
  currentStation?: JourneyStation; // Used by JourneyScreen
  currentStationCode?: string;
  statusMessage?: string;
  stations: JourneyStation[];
  
  // Used by JourneyScreen
  fallback?: boolean;
  destination?: { name?: string; code?: string };
  distanceToDestination?: number;
  currentSpeed?: number;
  arrivalTime?: string;
}

/**
 * Amenity item returned by the backend (Overpass-sourced)
 */
export interface AmenityAPIItem {
  name: string;
  lat: number;
  lng?: number;
  lon?: number;
}

/**
 * Amenities API response shape
 */
export interface AmenitiesAPIResponse {
  success: boolean;
  data: {
    hospitals: AmenityAPIItem[];
    hotels: AmenityAPIItem[];
  };
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

/**
 * Fetch nearby amenities (hospitals & hotels) from the backend.
 * POST /api/v1/amenities — Public endpoint, no auth required.
 */
export const fetchAmenities = async (lat: number, lng: number): Promise<AmenitiesAPIResponse> => {
  const response = await apiClient.post('amenities', { lat, lng });

  if (!response.data?.success) {
    throw new Error('Failed to fetch nearby amenities');
  }

  return response.data;
};
