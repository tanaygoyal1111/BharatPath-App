/**
 * BFS Engine for BharatPath Offline Routing
 * Implements a 2-leg maximum pathfinding algorithm with clamped dynamic buffers.
 */

import masterMap from '../api/bharatpath_master_map.json';

export interface JourneyLeg {
  fromCode: string;
  toCode: string;
  trainNo: string;
  trainName: string;
  depTime: string;
  arrTime: string;
  duration: number;
}

export interface JourneyOption {
  id: string;
  legs: JourneyLeg[];
  totalDuration: number;
  layoverDuration?: number;
}

/**
 * Converts "HH:MM" string to total minutes from midnight.
 * This is used to calculate layover times and validate buffer constraints.
 */
const timeToMinutes = (timeStr: string): number => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

/**
 * Calculates the required layover buffer between two legs.
 * The buffer is dynamically calculated based on the duration of the first leg:
 * - Minimum: 60 minutes
 * - Maximum: 180 minutes (3 hours)
 * - Scaled: 25% of the first leg's duration
 * 
 * Clamped Dynamic Buffer Math: max(60, min(leg1Duration * 0.25, 180))
 */
const calculateBuffer = (leg1Duration: number): number => {
  const buffer = Math.max(60, Math.min(leg1Duration * 0.25, 180));
  return buffer;
};

/**
 * Finds routes from source to destination with at most 1 transfer (2 legs).
 * Uses a BFS-like approach constrained by path depth and dynamic temporal buffers.
 * 
 * @param source - The starting station code (e.g., "NDLS")
 * @param destination - The destination station code (e.g., "BSB")
 * @returns An array of JourneyOption sorted by total duration.
 */
export const findConnectingRoutes = (source: string, destination: string): JourneyOption[] => {
  const graph = masterMap as Record<string, any>;
  const options: JourneyOption[] = [];

  if (!graph[source] || !graph[destination]) return [];

  // 1. Direct Leg Search
  const sourceStation = graph[source];
  if (sourceStation.connections) {
    sourceStation.connections.forEach((conn: any) => {
      if (conn.to === destination) {
        options.push({
          id: `direct-${conn.trainNo}`,
          legs: [{
            fromCode: source,
            toCode: destination,
            trainNo: conn.trainNo,
            trainName: conn.trainName,
            depTime: conn.dep,
            arrTime: conn.arr,
            duration: conn.duration
          }],
          totalDuration: conn.duration
        });
      }
    });
  }

  // 2. Connecting Leg Search (1 Transfer)
  if (sourceStation.connections) {
    sourceStation.connections.forEach((leg1: any) => {
      const intermediateStation = graph[leg1.to];
      if (!intermediateStation || leg1.to === destination || !intermediateStation.connections) return;

      intermediateStation.connections.forEach((leg2: any) => {
        if (leg2.to === destination) {
          // Clamped Buffer Validation
          const leg1ArrMinutes = timeToMinutes(leg1.arr);
          const leg2DepMinutes = timeToMinutes(leg2.dep);
          
          let layover = leg2DepMinutes - leg1ArrMinutes;
          if (layover < 0) layover += 1440; 

          const requiredBuffer = calculateBuffer(leg1.duration);

          // Only accept the connection if layover meets the safety buffer
          if (layover >= requiredBuffer) {
            options.push({
              id: `conn-${leg1.trainNo}-${leg2.trainNo}`,
              legs: [
                {
                  fromCode: source,
                  toCode: leg1.to,
                  trainNo: leg1.trainNo,
                  trainName: leg1.trainName,
                  depTime: leg1.dep,
                  arrTime: leg1.arr,
                  duration: leg1.duration
                },
                {
                  fromCode: leg1.to,
                  toCode: destination,
                  trainNo: leg2.trainNo,
                  trainName: leg2.trainName,
                  depTime: leg2.dep,
                  arrTime: leg2.arr,
                  duration: leg2.duration
                }
              ],
              totalDuration: leg1.duration + layover + leg2.duration,
              layoverDuration: layover
            });
          }
        }
      });
    });
  }

  return options.sort((a, b) => a.totalDuration - b.totalDuration);
};
