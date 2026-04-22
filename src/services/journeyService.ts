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
  schDeparture?: string;
  actDeparture?: string;
  status?: 'passed' | 'current' | 'upcoming' | 'destination';
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

/**
 * Live Train Status response shape (matches backend liveTrainProvider contract)
 */
export interface LiveTrainData {
  trainName: string;
  currentStationCode: string;
  stations: JourneyStation[];
  status?: string;
  trainNumber?: string;
  currentDistance?: number;
}

/**
 * Fetch live train status from the backend.
 * GET /api/v1/trains/live/:trainNumber?startDay=N
 *
 * @param trainNo  – 5-digit train number string
 * @param startDay – Journey start day offset (0 = today, 1 = yesterday, 2 = 2 days ago)
 */
export const fetchLiveTrainStatus = async (trainNo: string, startDay: number = 0): Promise<LiveTrainData> => {
  try {
    const response = await apiClient.get(`/trains/live/${trainNo}?startDay=${startDay}`);
    
    // Log what the frontend actually sees to the Metro console
    console.log("🚂 FRONTEND RAW JSON:", JSON.stringify(response.data).substring(0, 200));

    const payload = response.data;
    
    if (payload.success === false) {
      throw new Error(payload.error || payload.message || "API reported failure");
    }

    // Aggressive Unwrapping — handle all possible nesting depths
    let trainData = null;
    const innerData = payload.data?.data || payload.data || payload;

    // Check if the array exists under 'stations' or 'timeline'
    if (innerData.stations && Array.isArray(innerData.stations) && innerData.stations.length > 0) {
      trainData = innerData;
    } else if (innerData.timeline && Array.isArray(innerData.timeline) && innerData.timeline.length > 0) {
      innerData.stations = innerData.timeline; // Normalize to stations
      trainData = innerData;
    } else if (innerData.status === 'SCHEDULED' || innerData.trainName || innerData.trainNumber) {
      // It's a valid payload, but the train truly hasn't started (empty route)
      trainData = innerData;
    }

    if (!trainData) {
      throw new Error('Data malformed: Unrecognized payload structure.');
    }

    if (!trainData.stations) {
      trainData.stations = [];
    }

    console.log(`✅ UNWRAPPED: trainName=${trainData.trainName}, stations=${trainData.stations.length}`);

    return trainData;
  } catch (error: any) {
    console.error("❌ FETCH LIVE TRAIN ERROR:", error.message || error);
    throw error;
  }
};
