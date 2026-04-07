/**
 * BFS Engine for BharatPath Offline Routing
 * Implements a 2-leg maximum pathfinding algorithm with clamped dynamic buffers.
 */

import offlineData from '../data/offline_graph.json';

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

const getDuration = (dep: string, arr: string): number => {
  let depMin = timeToMinutes(dep);
  let arrMin = timeToMinutes(arr);
  let dur = arrMin - depMin;
  if (dur < 0) dur += 1440;
  return dur;
};

/**
 * Calculates the required layover buffer between two legs.
 * The buffer is dynamically calculated based on the duration of the first leg:
 * - Minimum: 60 minutes
 * - Maximum: 180 minutes (3 hours)
 * - Scaled: 25% of the first leg's duration
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
 * @returns A Promise resolving to an array of JourneyOption sorted by total duration.
 */
export const findConnectingRoutes = (source: string, destination: string): Promise<JourneyOption[]> => {
  return new Promise(resolve => {
    // Execute on the next tick so the JS thread can animate the UI loading spinner
    setTimeout(() => {
      const graph = (offlineData as any).graph;
      const trainMeta = (offlineData as any).train_metadata;
      const options: JourneyOption[] = [];

      if (!graph || !graph[source]) return resolve([]);

      // 1. Direct routes
      if (graph[source][destination]) {
        graph[source][destination].forEach((edge: any) => {
          const trainNo = edge[0].toString();
          const dep = edge[1];
          const arr = edge[2];
          const duration = getDuration(dep, arr);

          options.push({
            id: `direct-${trainNo}-${dep}`,
            legs: [{
              fromCode: source,
              toCode: destination,
              trainNo,
              trainName: trainMeta[trainNo] || 'UNKNOWN',
              depTime: dep,
              arrTime: arr,
              duration
            }],
            totalDuration: duration
          });
        });
      }

      // 2. 1-Stop routes (Transfers)
      Object.entries(graph[source]).forEach(([intermediate, edges1]: [string, any]) => {
        if (intermediate === destination) return;
        
        if (graph[intermediate] && graph[intermediate][destination]) {
          const edges2 = graph[intermediate][destination];
          
          edges1.forEach((leg1Data: any) => {
            const trainNo1 = leg1Data[0].toString();
            const dep1 = leg1Data[1];
            const arr1 = leg1Data[2];
            const dur1 = getDuration(dep1, arr1);

            edges2.forEach((leg2Data: any) => {
              const trainNo2 = leg2Data[0].toString();
              const dep2 = leg2Data[1];
              const arr2 = leg2Data[2];
              const dur2 = getDuration(dep2, arr2);

              const leg1ArrMinutes = timeToMinutes(arr1);
              const leg2DepMinutes = timeToMinutes(dep2);
              
              let layover = leg2DepMinutes - leg1ArrMinutes;
              if (layover < 0) layover += 1440; 

              const requiredBuffer = calculateBuffer(dur1);

              if (layover >= requiredBuffer) {
                options.push({
                  id: `conn-${trainNo1}-${intermediate}-${trainNo2}-${dep1}-${dep2}`,
                  legs: [
                    {
                      fromCode: source,
                      toCode: intermediate,
                      trainNo: trainNo1,
                      trainName: trainMeta[trainNo1] || 'UNKNOWN',
                      depTime: dep1,
                      arrTime: arr1,
                      duration: dur1
                    },
                    {
                      fromCode: intermediate,
                      toCode: destination,
                      trainNo: trainNo2,
                      trainName: trainMeta[trainNo2] || 'UNKNOWN',
                      depTime: dep2,
                      arrTime: arr2,
                      duration: dur2
                    }
                  ],
                  totalDuration: dur1 + layover + dur2,
                  layoverDuration: layover
                });
              }
            });
          });
        }
      });

      // 3. Resolve execution and return top 50 options sorted by fastest
      resolve(options.sort((a, b) => a.totalDuration - b.totalDuration).slice(0, 50));
    }, 0);
  });
};
