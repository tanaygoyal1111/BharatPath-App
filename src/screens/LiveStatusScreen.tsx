import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Platform,
  ScrollView,
  ActivityIndicator,
  LayoutAnimation,
  Animated,
  Switch,
} from 'react-native';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import * as Haptics from 'expo-haptics';
import { useQuery } from '@tanstack/react-query';
import { fetchJourneyData, JourneyAPIData, JourneyStation } from '../services/journeyService';

// --- TYPES & CONSTANTS ---
type JourneyState = 'LOADING' | 'UPCOMING' | 'ACTIVE' | 'NOT_TRAVELLING' | 'COMPLETED' | 'GPS_OFF';
type Confidence = 'LOW' | 'MEDIUM' | 'HIGH';

const TEST_MODE = true;

const { width } = Dimensions.get('window');

const COLORS = {
  navy: '#1A1F71',
  white: '#FFFFFF',
  offWhite: '#F8F9FA',
  red: '#DC2626',
  emerald: '#10B981',
  saffron: '#FF9F43',
  slateMuted: '#64748B',
  slateBorder: '#CBD5E1',
  slateDark: '#1E293B',
};

const MIN_HEIGHT = 80;
const MAX_HEIGHT = 280;

// --- UTILS ---
const toRad = (val: number) => (val * Math.PI) / 180;

function getDistance(locA: { lat: number; lng: number }, locB: { lat: number; lng: number }) {
  const R = 6371; // km
  const dLat = toRad(locB.lat - locA.lat);
  const dLng = toRad(locB.lng - locA.lng);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(locA.lat)) *
      Math.cos(toRad(locB.lat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Distance point to line segment
function getDistanceFromSegment(
  p: { lat: number; lng: number },
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
) {
  const d_ab = getDistance(a, b);
  if (d_ab === 0) return getDistance(p, a);

  const d_pa = getDistance(p, a);
  const d_pb = getDistance(p, b);

  // Hero's formula for area of triangle, then altitude = 2*area / base
  const s = (d_ab + d_pa + d_pb) / 2;
  const areaSq = s * (s - d_ab) * (s - d_pa) * (s - d_pb);
  const area = Math.sqrt(Math.max(0, areaSq));
  const altitude = (2 * area) / d_ab;

  // Check if projection is outside segment AB (obtuse angles)
  if (d_pa * d_pa > d_pb * d_pb + d_ab * d_ab) return d_pb;
  if (d_pb * d_pb > d_pa * d_pa + d_ab * d_ab) return d_pa;

  return altitude;
}

function normalize(val: number, minOut: number, maxOut: number) {
  const minK = 5;
  const maxK = 150;
  const clamped = Math.max(minK, Math.min(maxK, val));
  return minOut + ((clamped - minK) / (maxK - minK)) * (maxOut - minOut);
}

function getConfidence({ isMoving, isNearRoute, accuracy }: { isMoving: boolean; isNearRoute: boolean; accuracy: number }): Confidence {
  if (!isMoving) return 'LOW';
  if (isNearRoute && accuracy < 50) return 'HIGH';
  return 'MEDIUM';
}

// --- MAIN COMPONENT ---
export default function LiveStatusScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const [activePnr, setActivePnr] = useState<string | null>(route.params?.pnr || null);
  const [isInitializing, setIsInitializing] = useState(!route.params?.pnr);

  useEffect(() => {
    if (!activePnr) {
      const loadStoredPnr = async () => {
        const stored = await AsyncStorage.getItem('last_tracked_pnr');
        if (stored) {
          setActivePnr(stored);
        } else {
          // Task 3: Secondary fallback to extract PNR from journey_cache
          const cachedJourneyStr = await AsyncStorage.getItem('journey_cache');
          if (cachedJourneyStr) {
            try {
              const parsedJourney = JSON.parse(cachedJourneyStr);
              if (parsedJourney?.pnr) {
                setActivePnr(parsedJourney.pnr);
              }
            } catch (e) {
              // Ignore cache parse error
            }
          }
        }
        setIsInitializing(false);
      };
      loadStoredPnr();
    } else {
      setIsInitializing(false);
    }
  }, [activePnr]);

  // State
  const [journey, setJourney] = useState<JourneyAPIData | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [jState, setJState] = useState<JourneyState>('LOADING');
  const [progress, setProgress] = useState<{ currentIndex: number; distanceToNext: number } | null>(null);
  const [confidence, setConfidence] = useState<Confidence>('LOW');
  const [layoutOffsets, setLayoutOffsets] = useState<{ [key: number]: number }>({});
  
  // Hybrid Tracking State
  const [isBoarded, setIsBoarded] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.5, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    ).start();
  }, [pulseAnim]);

  // Handle hybrid mode persistence
  useEffect(() => {
    const loadBoardedState = async () => {
      if (!activePnr) return;
      const val = await AsyncStorage.getItem(`isBoarded_${activePnr}`);
      if (val) setIsBoarded(val === 'true');
    };
    loadBoardedState();
  }, [activePnr]);

  const toggleIsBoarded = async (val: boolean) => {
    setIsBoarded(val);
    if (activePnr) await AsyncStorage.setItem(`isBoarded_${activePnr}`, val ? 'true' : 'false');
  };
  
  // Proximity State
  const [isProximityEnabled, setIsProximityEnabled] = useState(false);
  const [alertTriggered, setAlertTriggered] = useState(false);
  
  const scrollRef = useRef<ScrollView>(null);
  const lastUpdateRef = useRef<number>(0);
  const lastLocationRef = useRef<{lat: number, lng: number} | null>(null);
  const lastAlertTimeRef = useRef<number>(0);

  const smoothLocation = useCallback((newLoc: { lat: number; lng: number }) => {
    if (!lastLocationRef.current) {
      lastLocationRef.current = newLoc;
      return newLoc;
    }
    const dist = getDistance(lastLocationRef.current, newLoc);
    if (dist > 2) return lastLocationRef.current; // ignore jumps > 2km

    lastLocationRef.current = newLoc;
    return newLoc;
  }, []);

  // 1. TanStack Query
  const { data: fetchedJourney, isLoading, error } = useQuery({
    queryKey: ['journey', activePnr],
    queryFn: () => fetchJourneyData(activePnr!),
    enabled: !!activePnr,
    staleTime: 60000, 
    refetchOnWindowFocus: false,
    refetchInterval: 60000,
    retry: 2,
    retryDelay: 1000,
  });

  // 2. Cache Sync (Offline support)
  useEffect(() => {
    const syncData = async () => {
      if (fetchedJourney) {
        setJourney(fetchedJourney);
        setIsOffline(false);
        await AsyncStorage.setItem('journey_cache', JSON.stringify(fetchedJourney));
      } else if (!isLoading) {
        const cached = await AsyncStorage.getItem('journey_cache');
        if (cached) {
          setJourney(JSON.parse(cached));
          setIsOffline(true);
        }
      }
    };
    syncData();
  }, [fetchedJourney, isLoading]);

  // 2.5 Proximity Init & Reset
  useEffect(() => {
    const setupProximity = async () => {
      const lastPnr = await AsyncStorage.getItem('last_tracked_pnr');
      if (activePnr && lastPnr !== activePnr) {
        await AsyncStorage.removeItem('alert_triggered');
        await AsyncStorage.setItem('last_tracked_pnr', activePnr);
        setAlertTriggered(false);
        lastAlertTimeRef.current = 0;
      } else {
        const aTriggered = await AsyncStorage.getItem('alert_triggered');
        if (aTriggered) setAlertTriggered(true);
      }

      const pEnabled = await AsyncStorage.getItem('proximity_enabled');
      if (pEnabled) setIsProximityEnabled(JSON.parse(pEnabled));
    };
    setupProximity();
  }, [activePnr]);

  useEffect(() => {
    if (jState === 'COMPLETED') {
      AsyncStorage.removeItem('alert_triggered');
    }
  }, [jState]);

  // 3. Base State Determination
  useEffect(() => {
    if (isLoading && !journey) {
      setJState('LOADING');
      return;
    }
    if (!journey) return;

    const now = Date.now();
    // Assuming backend returns startTime / endTime in epoch ms
    if (now < journey.startTime) jState !== 'GPS_OFF' && setJState('UPCOMING');
    else if (now > journey.endTime) jState !== 'GPS_OFF' && setJState('COMPLETED');
    else {
      if (jState !== 'NOT_TRAVELLING' && jState !== 'GPS_OFF') {
        setJState('ACTIVE');
      }
    }
  }, [journey, isLoading]);

  // 4. Remote Tracker (Mode A)
  useEffect(() => {
    if (isBoarded || !journey?.stations) return;
    
    if (journey.currentStationCode) {
      const idx = journey.stations.findIndex(st => st.code === journey.currentStationCode);
      if (idx !== -1) {
        setProgress((prev) => {
          if (prev && prev.currentIndex === idx) return prev;
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          return {
            currentIndex: Math.max(idx, prev?.currentIndex || 0),
            distanceToNext: 0,
          };
        });
        setJState('ACTIVE');
        setConfidence('HIGH');
      }
    }
  }, [isBoarded, journey]);

  // 5. Location Engine (Mode B)
  useEffect(() => {
    if (!isBoarded) return;
    if (jState !== 'ACTIVE' && jState !== 'NOT_TRAVELLING') return;

    let sub: Location.LocationSubscription;

    const startTracking = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setJState('GPS_OFF');
        return;
      }

      const cachedLoc = await AsyncStorage.getItem('last_location');
      if (cachedLoc && !progress && jState === 'NOT_TRAVELLING') {
        // Hydrate silently if needed, but wait for fresh update
      }

      if (TEST_MODE) return; // Prevent real tracking in test mode

      sub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          distanceInterval: 200, // meters
          timeInterval: 5000,
        },
        (location) => handleLocationUpdate(location)
      );
    };

    startTracking();

    return () => {
      sub?.remove();
    };
  }, [jState, journey]);

  const handleLocationUpdate = useCallback(
    async (location: Location.LocationObject) => {
      if (!journey || !journey.stations || journey.stations.length === 0) return;

      const now = Date.now();
      // Throttling: Return early if < 3s since last handled update
      if (now - lastUpdateRef.current < 3000) return;
      lastUpdateRef.current = now;

      await AsyncStorage.setItem('last_location', JSON.stringify(location));

      const speedMs = location.coords.speed || 0;
      const speedKmH = speedMs * 3.6;

      // Speed check: between 20km/h and 140km/h
      const isMoving = speedKmH > 20 && speedKmH < 140;

      // GPS Anti-Jump Smoothing
      const smoothedCoords = smoothLocation({
        lat: location.coords.latitude,
        lng: location.coords.longitude,
      });

      const stations = journey.stations;
      let minRouteDist = Infinity;
      let nearestIdx = 0;

      // Segment Check
      for (let i = 0; i < stations.length - 1; i++) {
        const d = getDistanceFromSegment(
          smoothedCoords,
          stations[i],
          stations[i + 1]
        );
        if (d < minRouteDist) {
          minRouteDist = d;
          nearestIdx = i; // The current station passed is i
        }
      }

      const isNearRoute = minRouteDist < 5; // km threshold

      if (!isNearRoute || !isMoving) {
        if (!TEST_MODE) {
          setJState('NOT_TRAVELLING');
          return;
        }
      }

      setJState('ACTIVE');

      // Confidence System
      const locAcc = location.coords.accuracy || Infinity;
      const conf = getConfidence({ isMoving: isMoving || TEST_MODE, isNearRoute, accuracy: locAcc });
      setConfidence(conf);

      const distToNextNode = getDistance(
        smoothedCoords,
        stations[Math.min(nearestIdx + 1, stations.length - 1)]
      );

      // --- PROXIMITY ALERT ENGINE ---
      if (isBoarded && isProximityEnabled && conf !== 'LOW') {
        const destNode = stations[stations.length - 1];
        const distToDest = getDistance(smoothedCoords, destNode);
        
        if (distToDest < 10 && !alertTriggered) {
          const nowMs = Date.now();
          if (nowMs - lastAlertTimeRef.current > 60000) {
            lastAlertTimeRef.current = nowMs;
            
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Notifications.scheduleNotificationAsync({
              content: {
                title: 'Arrival Alert 🚆',
                body: 'You are near your destination station!',
              },
              trigger: null,
            });

            setAlertTriggered(true);
            AsyncStorage.setItem('alert_triggered', 'true');
          }
        }
      }

      // Progression Lock
      setProgress((prev) => {
        if (prev && nearestIdx < prev.currentIndex) {
          return prev; // Never allow backward movement
        }
        if (!prev || nearestIdx !== prev.currentIndex) {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        }
        return {
          currentIndex: Math.max(nearestIdx, prev?.currentIndex || 0),
          distanceToNext: Math.round(distToNextNode),
        };
      });
    },
    [journey, smoothLocation]
  );

  // 5. Auto Scroll removed for manual control via FAB

  // 6. Test Mode Simulator Component
  useEffect(() => {
    if (!TEST_MODE || !journey) return;
    setJState('ACTIVE'); // force active

    let mockIndex = 0;
    const interval = setInterval(() => {
      const stations = journey.stations;
      if (!stations || mockIndex >= stations.length) {
        clearInterval(interval);
        setJState('COMPLETED');
        return;
      }
      const st = stations[mockIndex];
      // Emit mock location frame
      handleLocationUpdate({
        coords: {
          latitude: st.lat,
          longitude: st.lng,
          speed: 30, // 30 m/s (~108 km/h) = isMoving true
          accuracy: 10,
          altitude: 0,
          heading: 0,
          altitudeAccuracy: 0,
        },
        timestamp: Date.now(),
      } as Location.LocationObject);
      
      mockIndex++;
    }, 4000); // jump stations every 4 seconds

    return () => clearInterval(interval);
  }, [TEST_MODE, journey, handleLocationUpdate]);

  // --- RENDERS ---
  if (isInitializing) return <SafeAreaView style={styles.safeArea} />; // Blank while checking storage
  if (!activePnr) return <EmptyState text="Enter PNR to start tracking" onBack={() => navigation.navigate('Dashboard')} />;

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.safeArea, { alignItems: 'center', justifyContent: 'center' }]}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.navy} />
        <ActivityIndicator size="large" color={COLORS.emerald} />
        <Text style={{ marginTop: 10, color: COLORS.white, fontWeight: '700' }}>Fetching Journey...</Text>
      </SafeAreaView>
    );
  }

  if (!journey || !journey.stations || journey.stations.length === 0) {
    return <EmptyState text="No journey found" onBack={() => navigation.goBack()} />;
  }

  if (jState === 'UPCOMING') {
    return <UpcomingScreen onBack={() => navigation.goBack()} />;
  }

  if (jState === 'COMPLETED') {
    return <CompletedScreen onBack={() => navigation.goBack()} />;
  }

  if (jState === 'ACTIVE' && !progress) {
    return (
      <SafeAreaView style={[styles.safeArea, { alignItems: 'center', justifyContent: 'center' }]}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.navy} />
        <ActivityIndicator size="large" color={COLORS.emerald} />
        <Text style={{ marginTop: 10, color: COLORS.white, fontWeight: '700' }}>Syncing location...</Text>
      </SafeAreaView>
    );
  }

  const stations = journey.stations;
  const nextStationIndex = progress ? Math.min(progress.currentIndex + 1, stations.length - 1) : 0;
  const nextStationName = stations[nextStationIndex]?.name;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.navy} />

      {/* HEADER SECTION */}
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8, marginLeft: -8 }}>
            <Feather name="arrow-left" size={24} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>BHARATPATH LIVE</Text>
          <View style={styles.delayPill}>
            <Text style={[styles.delayPillText, { color: COLORS.white }]}>
               {confidence} CONFIDENCE
            </Text>
          </View>
        </View>

        <View style={styles.trainInfoRow}>
          <Text style={styles.liveTrackingText}>LIVE TRACKING</Text>
          <Text style={styles.trainNumberName}>{journey.trainName}</Text>
          {journey.statusMessage ? (
            <Text style={styles.statusMessage}>{journey.statusMessage}</Text>
          ) : null}
        </View>
      </View>

      {/* OVERLAP FOREGROUND CARD */}
      <View style={styles.focusCardContainer}>
        <View style={styles.focusCard}>
          <Text style={styles.nextStopLabel}>NEXT STOP</Text>
          <Text style={styles.nextStopValue}>{nextStationName}</Text>
          <View style={styles.focusCardDivider} />
          <View style={styles.focusCardBottom}>
            <View style={styles.focusMetric}>
              <Text style={styles.metricLabel}>EST. ARRIVAL</Text>
              <Text style={styles.metricValue}>{stations[nextStationIndex]?.time || '--:--'}</Text>
            </View>
            <View style={styles.focusMetricBorder} />
            <View style={styles.focusMetric}>
              <Text style={styles.metricLabel}>DISTANCE</Text>
              <Text style={styles.metricValue}>{progress?.distanceToNext ?? '--'} <Text style={{ fontSize: 14 }}>KM</Text></Text>
            </View>
          </View>
          <View style={styles.focusCardDivider} />
          <View style={styles.toggleRow}>
             <Text style={styles.toggleLabel}>I am inside this train</Text>
             <Switch 
               value={isBoarded} 
               onValueChange={toggleIsBoarded}
               trackColor={{ false: COLORS.slateBorder, true: COLORS.emerald }}
               thumbColor={COLORS.white}
             />
          </View>
        </View>
      </View>

      {/* EDGE CASE BANNERS */}
      {isOffline && (
        <View style={[styles.banner, { backgroundColor: COLORS.saffron }]}>
          <Text style={styles.bannerText}>Using last synced data</Text>
        </View>
      )}
      {jState === 'GPS_OFF' && (
        <View style={[styles.banner, { backgroundColor: COLORS.red }]}>
          <Text style={[styles.bannerText, { color: COLORS.white }]}>Enable location for live tracking.</Text>
        </View>
      )}
      {jState === 'NOT_TRAVELLING' && (
        <View style={[styles.banner, { backgroundColor: COLORS.slateDark }]}>
          <Text style={[styles.bannerText, { color: COLORS.white }]}>Tracking will start when movement is detected.</Text>
        </View>
      )}

      {/* TIMELINE LIST */}
      <View style={styles.timelineWrapper}>
        <View style={styles.timelineListContainer}>
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {stations.map((station, index) => {
              const isFirst = index === 0;
              const isLast = index === stations.length - 1;
              const isActiveNode = progress && index === progress.currentIndex;
              const isPassed = progress && index <= progress.currentIndex;

              // Calculate Next Segment Distance for Height Normalization
              let segmentHeight = MIN_HEIGHT;
              if (!isLast) {
                const nextStation = stations[index + 1];
                const physicalDist = nextStation.distance - station.distance; // Assuming cumulated distances in km
                segmentHeight = normalize(physicalDist, MIN_HEIGHT, MAX_HEIGHT);
              }

              // Calculate Train Positioning
              let trainTopOffset = 0;
              if (isActiveNode && !isLast) {
                const nextStation = stations[index + 1];
                const totalSegmentDist = nextStation?.distance - station.distance || 1;
                const coveredDist = totalSegmentDist - (progress?.distanceToNext || 0);
                const percentComplete = Math.max(0, Math.min(1, coveredDist / totalSegmentDist));
                trainTopOffset = percentComplete * segmentHeight;
              }

              return (
                <View 
                  key={index} 
                  style={[styles.row, { height: isLast ? 80 : segmentHeight }]}
                  onLayout={(event) => {
                    const { y } = event.nativeEvent.layout;
                    setLayoutOffsets(prev => ({...prev, [index]: y}));
                  }}
                >
                  {/* TIME */}
                  <Text style={[styles.time, isPassed && styles.timeCompleted]}>{station.time}</Text>

                  {/* LINE & DOT */}
                  <View style={styles.timelineContainer}>
                    {!isLast && (
                      <View style={[styles.line, isPassed ? styles.lineSolid : styles.lineDashed]} />
                    )}

                    {isActiveNode && !isLast && (
                      <Animated.View style={[styles.currentDot, { position: 'absolute', top: Math.max(0, trainTopOffset), zIndex: 10 }]}>
                        <MaterialCommunityIcons name="train" size={16} color={COLORS.white} />
                      </Animated.View>
                    )}

                    <View style={styles.dotContainer}>
                      {isActiveNode && (
                         <Animated.View style={[
                           styles.pulseDot, 
                           { transform: [{ scale: pulseAnim }], opacity: pulseAnim.interpolate({inputRange: [1, 1.5], outputRange: [0.5, 0]}) }
                         ]} />
                      )}
                      <View
                        style={[
                          styles.dot,
                          isPassed && styles.completedDot,
                          isActiveNode && { backgroundColor: 'transparent' }, // hide underlying static dot
                          isLast && styles.destinationDot,
                          !isPassed && !isLast && !isActiveNode && styles.upcomingDot,
                        ]}
                      >
                        {isLast ? (
                           <Feather name="flag" size={14} color={COLORS.white} />
                        ) : (isPassed && !isActiveNode) ? (
                           <MaterialCommunityIcons name="check" size={14} color={COLORS.white} />
                        ) : null}
                      </View>
                    </View>
                  </View>

                  {/* CONTENT */}
                  <View style={styles.content}>
                    <Text style={styles.stationName}>{station.name}</Text>
                    {station.platform && (
                      <Text style={styles.platformText}>PF {station.platform}</Text>
                    )}
                    
                    {(station.schArrival || station.actArrival) && (
                      <View style={styles.arrivalTimesRow}>
                        {station.schArrival && <Text style={styles.schTime}>SCH: {station.schArrival}</Text>}
                        {station.actArrival && <Text style={styles.actTime}>ACT: {station.actArrival}</Text>}
                      </View>
                    )}

                    {isActiveNode && (
                      <Text style={styles.status}>
                        {progress?.distanceToNext ? `${progress.distanceToNext} KM REMAINING` : 'REACHING SHORTLY'}
                      </Text>
                    )}
                    {isPassed && !isActiveNode && (
                      <Text style={styles.remaining}>DEPARTED</Text>
                    )}
                    {!isPassed && !isLast && (
                      <Text style={styles.remaining}>UPCOMING</Text>
                    )}
                    {isLast && (
                      <Text style={styles.remaining}>DESTINATION</Text>
                    )}

                    {station.lat && station.lng ? (
                      <View style={styles.amenityButtonsRow}>
                        <TouchableOpacity
                          style={[styles.amenityButton, { backgroundColor: 'rgba(229, 57, 53, 0.1)' }]}
                          onPress={() => navigation.navigate('AmenitiesList', { type: 'hospital', stationLat: station.lat, stationLng: station.lng })}
                        >
                          <MaterialCommunityIcons name="hospital-marker" size={14} color="#E53935" />
                          <Text style={[styles.amenityButtonText, { color: '#E53935' }]}>Hospitals</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.amenityButton, { backgroundColor: 'rgba(21, 101, 192, 0.1)' }]}
                          onPress={() => navigation.navigate('AmenitiesList', { type: 'hotel', stationLat: station.lat, stationLng: station.lng })}
                        >
                          <MaterialCommunityIcons name="bed" size={14} color="#1565C0" />
                          <Text style={[styles.amenityButtonText, { color: '#1565C0' }]}>Hotels</Text>
                        </TouchableOpacity>
                      </View>
                    ) : null}
                  </View>
                </View>
              );
            })}
          </ScrollView>
        </View>
      </View>

      {/* FAB - Back to Live */}
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.8}
        onPress={() => {
          scrollRef.current?.scrollTo({
            y: Math.max(0, (layoutOffsets[progress?.currentIndex || 0] || 0) - 40),
            animated: true,
          });
        }}
      >
        <MaterialCommunityIcons name="crosshairs-gps" size={24} color={COLORS.white} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const EmptyState = ({ text, onBack }: { text: string; onBack: () => void }) => (
  <SafeAreaView style={[styles.safeArea, { alignItems: 'center', justifyContent: 'center' }]}>
    <StatusBar barStyle="light-content" backgroundColor={COLORS.navy} />
    <Feather name="info" size={48} color={COLORS.slateMuted} style={{ marginBottom: 16 }} />
    <Text style={{ color: COLORS.white, fontSize: 16, fontWeight: '700', marginBottom: 24 }}>{text}</Text>
    <TouchableOpacity onPress={onBack} style={{ paddingHorizontal: 20, paddingVertical: 10, backgroundColor: COLORS.white, borderRadius: 8 }}>
      <Text style={{ color: COLORS.navy, fontWeight: '800' }}>Go Back</Text>
    </TouchableOpacity>
  </SafeAreaView>
);

const UpcomingScreen = ({ onBack }: { onBack: () => void }) => (
  <SafeAreaView style={[styles.safeArea, { alignItems: 'center', justifyContent: 'center' }]}>
    <StatusBar barStyle="light-content" backgroundColor={COLORS.navy} />
    <MaterialCommunityIcons name="clock-outline" size={48} color={COLORS.emerald} style={{ marginBottom: 16 }} />
    <Text style={{ color: COLORS.white, fontSize: 18, fontWeight: '800', marginBottom: 8 }}>Journey Not Started</Text>
    <Text style={{ color: COLORS.slateBorder, fontSize: 14, marginBottom: 24 }}>Your train hasn't departed yet.</Text>
    <TouchableOpacity onPress={onBack} style={{ paddingHorizontal: 20, paddingVertical: 10, backgroundColor: COLORS.white, borderRadius: 8 }}>
      <Text style={{ color: COLORS.navy, fontWeight: '800' }}>Go Back</Text>
    </TouchableOpacity>
  </SafeAreaView>
);

const CompletedScreen = ({ onBack }: { onBack: () => void }) => (
  <SafeAreaView style={[styles.safeArea, { alignItems: 'center', justifyContent: 'center' }]}>
    <StatusBar barStyle="light-content" backgroundColor={COLORS.navy} />
    <Feather name="check-circle" size={48} color={COLORS.emerald} style={{ marginBottom: 16 }} />
    <Text style={{ color: COLORS.white, fontSize: 18, fontWeight: '800', marginBottom: 8 }}>Journey Completed</Text>
    <Text style={{ color: COLORS.slateBorder, fontSize: 14, marginBottom: 24 }}>You have reached your destination.</Text>
    <TouchableOpacity onPress={onBack} style={{ paddingHorizontal: 20, paddingVertical: 10, backgroundColor: COLORS.white, borderRadius: 8 }}>
      <Text style={{ color: COLORS.navy, fontWeight: '800' }}>Go Back</Text>
    </TouchableOpacity>
  </SafeAreaView>
);

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.navy,
  },
  header: {
    backgroundColor: COLORS.navy,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 20) : 10,
    paddingBottom: 80,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  headerTitle: {
    color: COLORS.white,
    fontFamily: 'System',
    fontWeight: '800',
    fontSize: 16,
    letterSpacing: 0.5,
  },
  delayPill: {
    backgroundColor: 'rgba(255,255,255,0.2)', // Modified for confidence
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  delayPillText: {
    fontSize: 10,
    fontWeight: '900',
  },
  trainInfoRow: {
    marginBottom: 20,
    alignItems: 'flex-start',
  },
  liveTrackingText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 4,
  },
  trainNumberName: {
    color: COLORS.white,
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  statusMessage: {
    color: COLORS.saffron,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 4,
  },
  focusCardContainer: {
    alignItems: 'center',
    marginTop: -60,
    zIndex: 10,
  },
  focusCard: {
    backgroundColor: COLORS.white,
    width: width - 40,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: COLORS.navy,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 10,
  },
  nextStopLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.slateMuted,
    letterSpacing: 1,
  },
  nextStopValue: {
    fontSize: 34,
    fontWeight: '900',
    color: COLORS.navy,
    letterSpacing: -1,
    marginTop: 4,
  },
  focusCardDivider: {
    height: 1,
    width: '100%',
    backgroundColor: COLORS.slateBorder,
    opacity: 0.3,
    marginVertical: 16,
  },
  focusCardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 20,
  },
  focusMetric: {
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 11,
    color: COLORS.slateMuted,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '900',
    color: COLORS.slateDark,
    marginTop: 4,
  },
  focusMetricBorder: {
    width: 1,
    height: 40,
    backgroundColor: COLORS.slateBorder,
    opacity: 0.4,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 20,
    marginTop: 8,
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.slateDark,
  },

  banner: {
    zIndex: 20,
    marginHorizontal: 16,
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    elevation: 3,
  },
  bannerText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
    color: COLORS.slateDark,
  },

  timelineWrapper: {
    flex: 1,
    backgroundColor: COLORS.offWhite,
    marginTop: -40,
    paddingTop: 50, // pull up offset for overlapping card/banner
  },
  timelineListContainer: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    marginHorizontal: 16,
    paddingTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  scrollContent: {
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 80,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 0,
  },
  time: {
    width: 60,
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.slateDark,
    textAlign: 'right',
    marginTop: 2,
  },
  timeCompleted: {
    color: COLORS.slateMuted,
  },
  timelineContainer: {
    width: 40,
    alignItems: 'center',
  },
  line: {
    position: 'absolute',
    width: 2,
    height: '100%',
    top: 10,
    bottom: -10,
  },
  lineSolid: {
    backgroundColor: COLORS.navy,
  },
  lineDashed: {
    borderWidth: 1,
    borderColor: COLORS.slateBorder,
    borderStyle: 'dashed',
    backgroundColor: 'transparent',
    width: 0,
  },
  dotContainer: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -4,
  },
  pulseDot: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.emerald,
  },
  dot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.slateBorder,
    zIndex: 2,
    marginTop: 0,
  },
  completedDot: {
    backgroundColor: COLORS.navy,
  },
  currentDot: {
    backgroundColor: COLORS.navy,
    width: 32,
    height: 32,
    borderRadius: 16,
    marginTop: -4,
    shadowColor: COLORS.navy,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 5,
  },
  upcomingDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: COLORS.white,
    borderWidth: 4,
    borderColor: COLORS.navy,
    marginTop: 5,
  },
  destinationDot: {
    backgroundColor: COLORS.navy,
    width: 32,
    height: 32,
    borderRadius: 16,
    marginTop: -4,
  },
  content: {
    flex: 1,
    marginLeft: 10,
    marginTop: 2,
    paddingBottom: 40,
  },
  stationName: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.slateDark,
    letterSpacing: -0.2,
  },
  platformText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.slateMuted,
    marginTop: 2,
  },
  arrivalTimesRow: {
    flexDirection: 'row',
    marginTop: 4,
    gap: 8,
  },
  schTime: {
    fontSize: 11,
    color: COLORS.slateMuted,
    fontWeight: '600',
  },
  actTime: {
    fontSize: 11,
    color: COLORS.emerald,
    fontWeight: '700',
  },
  status: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.red, // To indicate action/live distance
    marginTop: 4,
  },
  remaining: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.slateMuted,
    marginTop: 4,
    letterSpacing: 0.5,
  },
  amenityButtonsRow: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  amenityButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  amenityButtonText: {
    fontSize: 11,
    fontWeight: '700',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.navy,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.navy,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
    zIndex: 100,
  },
});
