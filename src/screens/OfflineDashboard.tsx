import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ImageBackground, Dimensions, ActivityIndicator, Switch, Alert, Animated as RNAnimated } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useJourneyData } from '../hooks/useJourneyData';
import { getCachedJourney, normalizeJourneyData, JourneyData } from '../hooks/usePnrStatus';
import { useNetInfo } from '@react-native-community/netinfo';


const { width } = Dimensions.get('window');

const COLORS = {
  primary: '#1A237E', // Deep Reliability Indigo
  white: '#FFFFFF', // Pure White
  background: '#F3F3F3', // Light Gray
  inputBg: '#EEEEEE',
  warning: '#FF9F43', // Warning Saffron
  success: '#008CFF',
  bgP2P: '#E8EAF6',
  bgProximity: '#E3F2FD',
  bgComplaint: '#FFEBEE',
  textDark: '#1A1C1C', // Dark Charcoal & Muted Navy
  textGray: '#44474E', // Medium Gray
  textLightGray: '#74777F', // Light Gray Metadata
  disabledBg: '#F9F9F9', // Muted Gray for disabled cards
  disabledText: '#9E9E9E', // 40% opacity gray
  divider: '#E2E8F0',
  alertRed: '#C62828', // Alert Red
};

export default function OfflineDashboard({ onHelpPress }: { onHelpPress?: () => void }) {
  const navigation = useNavigation<any>();
  const { data, isLoading } = useJourneyData(null, true); // Always offline in this dashboard

  // Proximity Alert State
  const [isProximityEnabled, setIsProximityEnabled] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('proximity_enabled').then(val => {
      if (val) setIsProximityEnabled(JSON.parse(val));
    });
  }, []);

  const handleToggleProximity = async (value: boolean) => {
    if (!data) return; // Guard: Never allow toggle without a journey

    if (value) {
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') {
        const { status: newStatus } = await Notifications.requestPermissionsAsync();
        if (newStatus !== 'granted') {
          Alert.alert("Permission required", "Enable notifications to use proximity alerts.");
          return;
        }
      }
    }
    setIsProximityEnabled(value);
    await AsyncStorage.setItem('proximity_enabled', JSON.stringify(value));
  };

  // Task 1: Retrieve Cached Data (Synced with active_journey)
  const [cachedJourney, setCachedJourney] = useState<JourneyData | null>(null);
  const [isHydrating, setIsHydrating] = useState(true);

  useEffect(() => {
    getCachedJourney().then(journey => {
      if (journey) {
        setCachedJourney(normalizeJourneyData(journey));
      }
      setIsHydrating(false);
    });
  }, []);

  // ── Network Recovery Detection ────────────────────────────────
  const netInfo = useNetInfo();
  const isOnline = netInfo.isConnected === true && netInfo.isInternetReachable !== false;

  // ── Snackbar State ────────────────────────────────────────────
  const [isSnackbarDismissed, setIsSnackbarDismissed] = useState(false);
  const slideAnim = useRef(new RNAnimated.Value(150)).current;
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // ── Reset dismissal if network drops again ────────────────────
  useEffect(() => {
    if (netInfo.isConnected === false) {
      setIsSnackbarDismissed(false);
      if (timerRef.current) clearTimeout(timerRef.current);
    }
  }, [netInfo.isConnected]);

  // ── Snackbar Animation & 10s Auto-Dismiss (Recovery Flow) ─────
  useEffect(() => {
    const shouldShow = isOnline && !isSnackbarDismissed;
    RNAnimated.spring(slideAnim, {
      toValue: shouldShow ? 0 : 150,
      useNativeDriver: true,
      tension: 50,
      friction: 8,
    }).start();

    if (timerRef.current) clearTimeout(timerRef.current);
    if (shouldShow) {
      timerRef.current = setTimeout(() => setIsSnackbarDismissed(true), 10000);
    }

    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [isOnline, isSnackbarDismissed, slideAnim]);

  // ── Snackbar → Switch to Live Mode ────────────────────────────
  const handleSwitchToLive = () => {
    setIsSnackbarDismissed(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    // Wait for pill slide-down animation, then cleanly replace the screen
    setTimeout(() => {
      navigation.replace('Dashboard');
    }, 1500);
  };

  // ── Feature Availability Matrix Interceptor ──────────────────
  const handleFeaturePress = (
    routeName: string,
    requiresLiveInternet: boolean,
    requiresPnr: boolean
  ) => {
    // Rule 1: Internet Check
    if (requiresLiveInternet && !isOnline) {
      Alert.alert(
        "Connection Required",
        "This feature requires an active internet connection.",
        [{ text: "OK", style: "cancel" }]
      );
      return;
    }

    // Rule 2: PNR / Cache Check
    if (requiresPnr && !hasActiveJourney) {
      Alert.alert(
        "PNR Required",
        "This feature requires an active journey. Please enter your PNR to enable it.",
        [{ text: "OK", style: "cancel" }]
      );
      return;
    }

    // Passed all checks: Navigate with the offline flag context
    navigation.navigate(routeName, { isOfflineMode: !isOnline });
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100 }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const hasActiveJourney = !!cachedJourney && (!!cachedJourney.trainNumber || !!cachedJourney.trainNo);

  // Task 4: The Logic for Upcoming vs Boarded
  let isUpcoming = false;
  let timeToGoText = '';

  if (cachedJourney) {
    const departsBase = cachedJourney.source?.schDeparture || cachedJourney.departs;
    if (departsBase) {
      const departureTime = new Date(departsBase).getTime();
      const now = Date.now();
      
      if (departureTime > now) {
        isUpcoming = true;
        const diffMs = departureTime - now;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        
        if (diffDays > 0) {
          timeToGoText = `${diffDays} Day${diffDays > 1 ? 's' : ''} to Go`;
        } else {
          timeToGoText = `Departs in ${diffHours} Hour${diffHours > 1 ? 's' : ''}`;
        }
      }
    }
  }

  let nextHaltName = "DESTINATION";
  let nextHaltCode = "---";

  if (!isUpcoming && cachedJourney && cachedJourney.stations && cachedJourney.stations.length > 0) {
    const now = new Date().getTime();
    const lastKnownDelayMins = parseInt(cachedJourney.delayInMins || '0', 10);
    const delayInMilliseconds = lastKnownDelayMins * 60 * 1000;

    const upcomingStation = cachedJourney.stations.find((station: any) => {
      if (!station.schDeparture) return false;
      const scheduledTime = new Date(station.schDeparture).getTime();
      const adjustedDepartureTime = scheduledTime + delayInMilliseconds; 
      return adjustedDepartureTime > now;
    });
    
    if (upcomingStation) {
      nextHaltName = upcomingStation.name?.toUpperCase() || '';
      nextHaltCode = upcomingStation.code || '';
    } else {
      nextHaltName = cachedJourney.destination?.name?.toUpperCase() || 'ARRIVED';
      nextHaltCode = cachedJourney.destination?.code || '';
    }
  }

  return (
    <View style={{ flex: 1 }}>
      {!hasActiveJourney ? (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Empty State */}
          <View style={styles.emptyStateContainer}>
            <Text style={styles.emptyStateHeader}>UPCOMING TRIP (NO DATA)</Text>
            <View style={styles.emptyStateCard}>
              <View style={styles.emptyStateIconCircle}>
                <MaterialCommunityIcons name="ticket-confirmation-outline" size={30} color="#9E9E9E" />
              </View>
              <Text style={styles.emptyStateTitle}>No Active Journey Found</Text>
              <Text style={styles.emptyStateSubtext}>
                Enter your 10-digit PNR online to sync your trip. We'll download your route map and offline alerts so you're safe when the network drops.
              </Text>
            </View>
          </View>
          <OfflineUtilities 
            onHelpPress={onHelpPress} 
            navigation={navigation}
            isProximityEnabled={isProximityEnabled}
            onToggleProximity={handleToggleProximity}
            hasJourney={hasActiveJourney}
            onFeaturePress={handleFeaturePress}
          />
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {isUpcoming ? (
            <UpcomingCard data={cachedJourney!} timeToGoText={timeToGoText} />
          ) : (
            <BoardedCard cachedJourney={cachedJourney} />
          )}
          
          <OfflineUtilities 
            onHelpPress={onHelpPress} 
            navigation={navigation}
            isProximityEnabled={isProximityEnabled}
            onToggleProximity={handleToggleProximity}
            hasJourney={hasActiveJourney && !isUpcoming}
            onFeaturePress={handleFeaturePress}
          />
          {!isUpcoming && <NextHaltBanner haltName={nextHaltName} haltCode={nextHaltCode} />}
        </ScrollView>
      )}

      {/* ── Floating Recovery Pill Snackbar ──────────────────────── */}
      <RNAnimated.View style={[styles.floatingPillSnackbar, { transform: [{ translateY: slideAnim }] }]}>
        <View style={styles.snackBarTextContainer}>
          <MaterialCommunityIcons name="wifi" size={20} color="#FFF" />
          <Text style={styles.snackBarText}>Connection restored.</Text>
        </View>
        <View style={styles.snackBarActions}>
          <TouchableOpacity style={styles.snackBarButton} onPress={handleSwitchToLive}>
            <Text style={styles.snackBarButtonText}>SWITCH TO LIVE</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.snackBarCloseIcon} onPress={() => setIsSnackbarDismissed(true)}>
            <MaterialCommunityIcons name="close" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>
      </RNAnimated.View>
    </View>
  );
}

const UpcomingCard = ({ data, timeToGoText }: { data: JourneyData, timeToGoText: string }) => (
  <View style={styles.upcomingCard}>
    <View style={styles.upcomingHeaderRow}>
      <View style={styles.timeToGoContainer}>
        <MaterialCommunityIcons name="clock-outline" size={24} color="#FF9F43" />
        <Text style={styles.timeToGoText}>{timeToGoText}</Text>
      </View>
      <View style={styles.upcomingPill}>
        <Text style={styles.upcomingPillText}>UPCOMING</Text>
      </View>
    </View>
    
    <Text style={styles.trainNumberText}>TRAIN {data.trainNumber || data.trainNo}</Text>
    <Text style={styles.trainNameText}>{data.trainName?.toUpperCase()}</Text>
    
    <View style={styles.routeVisualizer}>
      <View style={styles.stationBlock}>
        <Text style={styles.stationCode}>{data.source?.code || '--'}</Text>
        <Text style={styles.stationName}>{data.source?.name || '--'}</Text>
      </View>
      <View style={styles.routeLineContainer}>
        <View style={styles.routeLine} />
        <MaterialCommunityIcons name="train" size={26} color="#1A237E" style={styles.routeTrainIcon} />
      </View>
      <View style={[styles.stationBlock, { alignItems: 'flex-end' }]}>
        <Text style={styles.stationCode}>{data.destination?.code || '--'}</Text>
        <Text style={styles.stationName}>{data.destination?.name || '--'}</Text>
      </View>
    </View>
    
    <View style={styles.divider} />
    
    <View style={styles.detailsGrid}>
      <View style={styles.upcomingGridItem}>
        <Text style={styles.gridLabel}>PNR NUMBER</Text>
        <Text style={styles.gridValue}>{data.pnr}</Text>
      </View>
      <View style={styles.upcomingGridItem}>
        <Text style={styles.gridLabel}>DEPARTS</Text>
        <Text style={styles.gridValue}>
          {new Date(data.source?.schDeparture || data.departs).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
      <View style={styles.upcomingGridItem}>
        <Text style={styles.gridLabel}>PLATFORM</Text>
        <Text style={[styles.gridValue, !data.platform || data.platform === 'TBA' ? { color: '#FF9F43' } : {}]}>
          {data.platform || 'TBA'}
        </Text>
      </View>
      <View style={styles.upcomingGridItem}>
        <Text style={styles.gridLabel}>COACH / SEAT</Text>
        <Text style={styles.gridValue}>{data.coach} / {data.seat}</Text>
      </View>
    </View>
  </View>
);

const BoardedCard = ({ cachedJourney }: { cachedJourney: any }) => (
  <View style={styles.boardedCard}>
    <Text style={styles.boardedSubtitle}>CURRENTLY BOARDED</Text>
    <Text style={styles.boardedTitle}>
      {cachedJourney?.trainNumber || '----'} {cachedJourney?.trainName?.split(' ')[0] || 'Unknown'}{'\n'}
      {cachedJourney?.trainName?.split(' ').slice(1).join(' ') || 'Train'}
    </Text>

    <View style={styles.routeHeader}>
      <View style={styles.routeOrigin}>
        <Text style={styles.routeLabelSmall}>ORIGIN</Text>
        <Text style={styles.routeCode} adjustsFontSizeToFit numberOfLines={1}>{cachedJourney?.source?.code || '--'}</Text>
        <Text style={styles.routeCity}>{cachedJourney?.source?.name || '--'}</Text>
      </View>

      <View style={styles.routeCenter}>
        <View style={styles.dashLineLeft} />
        <View style={styles.transitBadge}>
          <MaterialCommunityIcons name="train" size={20} color={COLORS.primary} />
          <Text style={styles.transitText}>IN TRANSIT</Text>
        </View>
        <View style={styles.dashLineRight} />
      </View>

      <View style={styles.routeDest}>
        <Text style={styles.routeLabelSmall}>DESTINATION</Text>
        <Text style={styles.routeCode} adjustsFontSizeToFit numberOfLines={1}>{cachedJourney?.destination?.code || '--'}</Text>
        <Text style={styles.routeCity}>{cachedJourney?.destination?.name || '--'}</Text>
      </View>
    </View>

    <View style={styles.quickInfoBlocks}>
      <View style={styles.infoBlock}>
        <Text style={styles.blockLabel}>PLATFORM</Text>
        <Text style={styles.blockValue}>{cachedJourney?.platform || '--'}</Text>
      </View>
      <View style={[styles.infoBlock, {marginHorizontal: 12}]}>
        <Text style={styles.blockLabel}>ETA</Text>
        <Text style={styles.blockValue}>
          {cachedJourney?.destination?.schArrival ? new Date(cachedJourney.destination.schArrival).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--'}
        </Text>
      </View>
      <View style={[styles.infoBlock, styles.coachBlock]}>
        <Text style={styles.blockLabel}>COACH/SEAT</Text>
        <Text style={styles.blockValue}>
          {cachedJourney?.coach ? `${cachedJourney.coach}/${cachedJourney.seat}` : 'Waitlisted/NA'}
        </Text>
      </View>
    </View>
  </View>
);

const OfflineUtilities = ({ 
  onHelpPress, 
  navigation,
  isProximityEnabled,
  onToggleProximity,
  hasJourney,
  onFeaturePress
}: { 
  onHelpPress?: () => void, 
  navigation: any,
  isProximityEnabled: boolean,
  onToggleProximity: (val: boolean) => void,
  hasJourney: boolean,
  onFeaturePress: (routeName: string, requiresLiveInternet: boolean, requiresPnr: boolean) => void
}) => (
  <View style={styles.offlineUtilsContainer}>
    {/* Active Offline Utilities */}
    <View style={styles.offlineRow}>
      <View style={[styles.offlineUtilitySquare, styles.utilBlueBorder]}>
        <View style={[styles.iconBox3D, { backgroundColor: '#FFF3E0' }]}>
          <MaterialCommunityIcons name="bell-ring" size={28} color={COLORS.warning} />
          <View style={[styles.iconBadge, { backgroundColor: COLORS.primary }]}>
            <MaterialCommunityIcons name="radar" size={14} color={COLORS.white} />
          </View>
        </View>
        <View style={styles.utilityTextWrap}>
          <Text style={styles.offlineUtilTitle}>PROXIMITY ALERTS</Text>
          <Text style={styles.offlineUtilDesc}>
            {!hasJourney ? 'Requires active journey' : isProximityEnabled ? 'Alerts enabled' : 'Alerts disabled'}
          </Text>
          <View style={{ marginTop: 8, alignItems: 'flex-start' }}>
            <Switch 
              value={isProximityEnabled} 
              onValueChange={onToggleProximity} 
              trackColor={{ false: '#767577', true: '#22C55E' }}
              thumbColor={isProximityEnabled ? '#fff' : '#f4f3f4'}
              disabled={!hasJourney}
              style={{ transform: [{ scale: 0.8 }], marginLeft: -4 }}
            />
          </View>
        </View>
      </View>

      <TouchableOpacity style={[styles.offlineUtilitySquare, styles.utilOrangeBorder]} onPress={() => onFeaturePress('QuickComplaint', true, false)}>
        <View style={[styles.iconBox3D, { backgroundColor: COLORS.bgComplaint }]}>
          <MaterialCommunityIcons name="alert-decagram" size={28} color={COLORS.alertRed || '#D32F2F'} />
          <View style={[styles.iconBadge, { backgroundColor: COLORS.primary }]}>
            <MaterialCommunityIcons name="headset" size={12} color={COLORS.white} />
          </View>
        </View>
        <View style={styles.utilityTextWrap}>
          <Text style={styles.offlineUtilTitle}>QUICK COMPLAINT</Text>
          <Text style={styles.offlineUtilDescOrange}>RAILMADAD DIRECT</Text>
        </View>
      </TouchableOpacity>
    </View>

    {/* Disabled Utilities */}
    <View style={styles.offlineRow}>
      <TouchableOpacity 
        style={[styles.offlineUtilitySquare, styles.utilDisabled]}
        onPress={() => onFeaturePress('SeatExchange', true, false)}
        activeOpacity={0.6}
      >
        <MaterialCommunityIcons name="cloud-off-outline" size={20} color={COLORS.disabledText} style={styles.cloudOffIcon} />
        <View style={[styles.iconBox3D, { backgroundColor: '#EEEEEE' }]}>
          <MaterialCommunityIcons name="seat-recline-extra" size={28} color={COLORS.disabledText} />
          <View style={[styles.iconBadge, { backgroundColor: COLORS.textLightGray }]}>
            <MaterialCommunityIcons name="swap-horizontal" size={14} color={COLORS.white} />
          </View>
        </View>
        <View style={styles.utilityTextWrap}>
          <Text style={styles.offlineUtilTitleDisabled}>SEAT EXCHANGE</Text>
          <Text style={styles.offlineUtilDescDisabled}>Requires Connection</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.offlineUtilitySquare, styles.utilIndigoBorder]} 
        onPress={() => onFeaturePress('ConnectingJourney', false, false)}
      >
        <View style={[styles.iconBox3D, { backgroundColor: '#E8EAF6' }]}>
          <MaterialCommunityIcons name="train" size={28} color={COLORS.primary} />
          <View style={[styles.iconBadge, { backgroundColor: COLORS.warning }]}>
            <MaterialCommunityIcons name="directions-fork" size={14} color={COLORS.white} />
          </View>
        </View>
        <View style={styles.utilityTextWrap}>
          <Text style={styles.offlineUtilTitle}>CONNECTING TRIP</Text>
          <Text style={styles.offlineUtilDesc}>Find multi-leg offline routes</Text>
        </View>
      </TouchableOpacity>
    </View>
  </View>
);

const NextHaltBanner = ({ haltName, haltCode }: { haltName: string, haltCode: string }) => (
  <View style={styles.nextHaltContainer}>
    <ImageBackground 
      source={{uri: 'https://images.unsplash.com/photo-1474487548417-781cb71495f3?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'}} 
      style={styles.nextHaltBg}
      imageStyle={{borderRadius: 16}}
    >
      <View style={styles.nextHaltOverlay}>
        <Text style={styles.nextHaltLabel}>NEXT MAJOR HALT</Text>
        <Text style={styles.nextHaltStation}>{haltName} ({haltCode})</Text>
      </View>
    </ImageBackground>
  </View>
);

const styles = StyleSheet.create({
  scrollContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40 },
  
  boardedCard: {
    backgroundColor: COLORS.white, borderRadius: 16, padding: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3,
  },
  boardedSubtitle: { fontSize: 10, color: COLORS.primary, fontWeight: '800', letterSpacing: 1, marginBottom: 4 },
  boardedTitle: { fontSize: 26, fontWeight: '900', color: COLORS.primary, letterSpacing: -0.5, lineHeight: 28 },
  
  routeHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 28 },
  routeOrigin: { alignItems: 'flex-start', flex: 1 },
  routeDest: { alignItems: 'flex-end', flex: 1 },
  routeLabelSmall: { fontSize: 9, color: COLORS.textGray, fontWeight: '800', letterSpacing: 1 },
  routeCode: { fontSize: width > 350 ? 32 : 26, fontWeight: '900', color: COLORS.textDark, letterSpacing: -1, marginVertical: 4 },
  routeCity: { fontSize: 12, color: COLORS.textGray, fontWeight: '600' },
  
  routeCenter: { flex: 1.2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  dashLineLeft: { flex: 1, height: 1, backgroundColor: COLORS.divider },
  dashLineRight: { flex: 1, height: 1, backgroundColor: COLORS.divider },
  transitBadge: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  transitText: { fontSize: 9, color: COLORS.primary, fontWeight: '800', marginTop: 4, letterSpacing: 0.5 },

  quickInfoBlocks: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 32 },
  infoBlock: { flex: 1, backgroundColor: COLORS.background, borderRadius: 8, padding: 12 },
  coachBlock: { paddingLeft: 12, borderLeftWidth: 4, borderLeftColor: '#5D4037' },
  blockLabel: { fontSize: 9, color: COLORS.textDark, fontWeight: '800', letterSpacing: 0.5 },
  blockValue: { fontSize: width > 350 ? 20 : 16, fontWeight: '900', color: COLORS.primary, marginTop: 4 },

  offlineUtilsContainer: { marginTop: 16 },
  offlineRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  offlineUtilitySquare: {
    width: '48%', backgroundColor: COLORS.white, borderRadius: 12, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
    position: 'relative',
  },
  utilBlueBorder: { borderLeftWidth: 4, borderLeftColor: COLORS.primary },
  utilIndigoBorder: { borderLeftWidth: 4, borderLeftColor: COLORS.primary, borderWidth: 1, borderColor: COLORS.divider },
  utilOrangeBorder: { borderWidth: 2, borderColor: COLORS.warning },
  utilDisabled: { backgroundColor: COLORS.disabledBg, shadowOpacity: 0, elevation: 0 },
  
  iconBox3D: { width: 48, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  iconBadge: { position: 'absolute', bottom: -4, right: -4, width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  cloudOffIcon: { position: 'absolute', top: 12, right: 12 },

  utilityTextWrap: { marginTop: 16 },
  offlineUtilTitle: { fontSize: 12, fontWeight: '900', color: COLORS.textDark, letterSpacing: 0.5 },
  offlineUtilDesc: { fontSize: 10, color: COLORS.textLightGray, fontWeight: '600', marginTop: 4 },
  offlineUtilDescOrange: { fontSize: 10, color: COLORS.warning, fontWeight: '800', marginTop: 4, letterSpacing: 0.5 },
  
  offlineUtilTitleDisabled: { fontSize: 12, fontWeight: '900', color: COLORS.disabledText, letterSpacing: 0.5 },
  offlineUtilDescDisabled: { fontSize: 10, color: COLORS.disabledText, fontWeight: '600', marginTop: 4 },

  nextHaltContainer: { height: 120, borderRadius: 16, overflow: 'hidden', marginTop: 8 },
  nextHaltBg: { width: '100%', height: '100%', justifyContent: 'flex-end' },
  nextHaltOverlay: {
    backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 20, paddingVertical: 16, height: '100%', justifyContent: 'flex-end'
  },
  nextHaltLabel: { fontSize: 10, color: 'rgba(255,255,255,0.8)', fontWeight: '800', letterSpacing: 2 },
  nextHaltStation: { fontSize: 22, color: COLORS.white, fontWeight: '900', letterSpacing: 0.5 },

  // Empty State Styles
  emptyStateContainer: { marginTop: 8, marginBottom: 16 },
  emptyStateHeader: { fontSize: 10, color: COLORS.primary, fontWeight: '800', letterSpacing: 1, marginBottom: 12, marginLeft: 4 },
  emptyStateCard: {
    backgroundColor: COLORS.white, borderRadius: 16, padding: 32, alignItems: 'center',
    borderWidth: 2, borderColor: COLORS.divider, borderStyle: 'dashed',
  },
  emptyStateIconCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#F5F5F5', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  emptyStateTitle: { fontSize: 18, fontWeight: '900', color: COLORS.textDark, marginBottom: 8 },
  emptyStateSubtext: { fontSize: 13, color: COLORS.textGray, fontWeight: '500', textAlign: 'center', lineHeight: 20 },

  // Premium Upcoming Card Styles
  upcomingCard: { 
    backgroundColor: '#FFFFFF', 
    borderRadius: 16, 
    padding: 24, 
    borderWidth: 1,
    borderColor: '#E3F2FD',
    shadowColor: '#1A237E', 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.08, 
    shadowRadius: 12, 
    elevation: 3 
  },
  upcomingHeaderRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 24 
  },
  timeToGoContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 12 
  },
  timeToGoText: { 
    fontSize: 24, 
    fontWeight: '900', 
    color: '#1A1C1C',
    letterSpacing: -0.5
  },
  upcomingPill: { 
    backgroundColor: '#1A237E', 
    paddingVertical: 6, 
    paddingHorizontal: 12, 
    borderRadius: 8 
  },
  upcomingPillText: { 
    color: '#FFFFFF', 
    fontSize: 10, 
    fontWeight: '800', 
    letterSpacing: 1,
    textTransform: 'uppercase'
  },
  trainNumberText: { 
    fontSize: 12, 
    color: '#1A237E', 
    fontWeight: '700', 
    letterSpacing: 1.5, 
    marginBottom: 4,
    textTransform: 'uppercase'
  },
  trainNameText: { 
    fontSize: 18, 
    fontWeight: '900', 
    color: '#1A237E', 
    marginBottom: 32,
    letterSpacing: -0.2,
    textTransform: 'uppercase'
  },
  routeVisualizer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    marginBottom: 32,
    paddingHorizontal: 4
  },
  stationBlock: { 
    alignItems: 'flex-start', 
    flex: 1 
  },
  stationCode: { 
    fontSize: 30, 
    fontWeight: '900', 
    color: '#1A1C1C',
    letterSpacing: -1
  },
  stationName: { 
    fontSize: 11, 
    color: '#64748B', 
    fontWeight: '600', 
    marginTop: 6, 
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  routeLineContainer: { 
    flex: 1.5, 
    alignItems: 'center', 
    justifyContent: 'center', 
    position: 'relative',
    marginHorizontal: 10
  },
  routeLine: { 
    height: 3, 
    backgroundColor: '#E3F2FD', 
    width: '100%', 
    position: 'absolute',
    borderRadius: 2
  },
  routeTrainIcon: { 
    backgroundColor: '#FFFFFF', 
    paddingHorizontal: 8 
  },
  divider: { 
    height: 1, 
    backgroundColor: '#E3F2FD', 
    marginBottom: 24 
  },
  detailsGrid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap',
    marginTop: 8
  },
  upcomingGridItem: { 
    width: '50%',
    marginBottom: 20
  },
  gridLabel: { 
    fontSize: 10, 
    color: '#64748B', 
    fontWeight: '600', 
    letterSpacing: 2, 
    marginBottom: 6,
    textTransform: 'uppercase'
  },
  gridValue: { 
    fontSize: 14, 
    fontWeight: '800', 
    color: '#1A1C1C' 
  },

  // ── FLOATING SNACKBAR STYLES (Recovery Green) ─────────────────
  floatingPillSnackbar: { position: 'absolute', bottom: 30, alignSelf: 'center', width: '92%', backgroundColor: '#2E7D32', borderRadius: 50, paddingVertical: 12, paddingHorizontal: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 8, zIndex: 100 },
  snackBarTextContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  snackBarText: { color: '#FFFFFF', fontSize: 14, fontWeight: '500' },
  snackBarActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  snackBarButton: { backgroundColor: '#FFFFFF', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  snackBarButtonText: { color: '#2E7D32', fontSize: 11, fontWeight: 'bold' },
  snackBarCloseIcon: { padding: 4 },
});
