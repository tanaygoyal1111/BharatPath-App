import React, { useEffect, useRef, useMemo, useCallback, memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
  StatusBar,
  Platform,
  Animated as RNAnimated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  withDelay,
  withSpring,
  Easing,
  interpolate,
  FadeInDown,
  FadeInUp,
  SlideInDown,
} from 'react-native-reanimated';
import Svg, { Circle, Line, Path, Defs, RadialGradient, Stop, Rect, Text as SvgText } from 'react-native-svg';
import { BottomNav } from '../components/Navigation/BottomNav';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ─── COLOR SYSTEM ─────────────────────────────────────────────
const COLORS = {
  // Core Branding
  primary: '#1A237E',
  white: '#FFFFFF',
  // Backgrounds & Surfaces
  background: '#F8F9FA',
  surfaceGray: '#F3F3F3',
  alertBg: '#F3EFE0',
  // Status & Alert
  saffron: '#FF9F43',
  // Typography & Metadata
  darkCharcoal: '#1A1C1C',
  mediumGray: '#44474E',
  mutedSlate: '#74777F',
  // Map
  mapBg: '#E8EDF2',
  mapRoad: '#C5CDD8',
  mapWater: '#B8D4E8',
  mapGreen: '#D4E6D4',
  // Misc
  divider: '#E2E8F0',
  success: '#10B981',
  shadow: 'rgba(26, 35, 126, 0.12)',
};

// ─── TYPES ────────────────────────────────────────────────────
interface TrainData {
  trainNumber: string;
  trainName: string;
  currentSpeed: number;
  arrivalTime: string;
  arrivalTimezone: string;
}

interface Amenity {
  id: string;
  label: string;
  icon: string;
  count?: number;
}

interface JourneyProps {
  isOnline?: boolean;
  distanceToDestination?: number;
  trainData?: TrainData;
  amenities?: Amenity[];
  destinationName?: string;
}

// ─── MOCK DATA ────────────────────────────────────────────────
const MOCK_TRAIN: TrainData = {
  trainNumber: '12128',
  trainName: 'Intercity Exp',
  currentSpeed: 84,
  arrivalTime: '14:45',
  arrivalTimezone: 'IST',
};

const MOCK_AMENITIES: Amenity[] = [
  { id: '1', label: 'Hospitals', icon: 'local-hospital', count: 3 },
  { id: '2', label: 'Hotels', icon: 'hotel', count: 5 },
  { id: '3', label: 'Station Exits', icon: 'exit-to-app', count: 4 },
];

// ─── ANIMATED MAP CARD ───────────────────────────────────────
const AnimatedSvgCircle = (() => {
  // We'll use RNAnimated for SVG since reanimated native driver doesn't work with SVG props
  return RNAnimated.createAnimatedComponent(Circle);
})();

const MapCard = memo(({ destinationName = 'PUNE JCT', distanceKm = 9.2 }: { destinationName?: string; distanceKm?: number }) => {
  // Pulsing marker
  const pulse1 = useRef(new RNAnimated.Value(0)).current;
  const pulse2 = useRef(new RNAnimated.Value(0)).current;
  const pulse3 = useRef(new RNAnimated.Value(0)).current;
  const markerScale = useRef(new RNAnimated.Value(1)).current;
  const scanLine = useRef(new RNAnimated.Value(0)).current;
  const trainDot = useRef(new RNAnimated.Value(0)).current;

  // Distance number animation
  const distanceOpacity = useSharedValue(0);
  const distanceTranslate = useSharedValue(20);

  useEffect(() => {
    // Ripple 1
    RNAnimated.loop(
      RNAnimated.timing(pulse1, { toValue: 1, duration: 2400, useNativeDriver: true })
    ).start();
    // Ripple 2 (offset)
    setTimeout(() => {
      RNAnimated.loop(
        RNAnimated.timing(pulse2, { toValue: 1, duration: 2400, useNativeDriver: true })
      ).start();
    }, 800);
    // Ripple 3 (offset)
    setTimeout(() => {
      RNAnimated.loop(
        RNAnimated.timing(pulse3, { toValue: 1, duration: 2400, useNativeDriver: true })
      ).start();
    }, 1600);

    // Marker subtle bounce
    RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.timing(markerScale, { toValue: 1.15, duration: 1200, useNativeDriver: true }),
        RNAnimated.timing(markerScale, { toValue: 1, duration: 1200, useNativeDriver: true }),
      ])
    ).start();

    // Scanning sweep line
    RNAnimated.loop(
      RNAnimated.timing(scanLine, { toValue: 1, duration: 4000, useNativeDriver: true })
    ).start();

    // Train dot moving along path
    RNAnimated.loop(
      RNAnimated.timing(trainDot, { toValue: 1, duration: 8000, useNativeDriver: true })
    ).start();

    // Distance fade in
    distanceOpacity.value = withDelay(400, withTiming(1, { duration: 800 }));
    distanceTranslate.value = withDelay(400, withTiming(0, { duration: 800, easing: Easing.out(Easing.cubic) }));
  }, []);

  const rippleStyle = (anim: RNAnimated.Value) => ({
    opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] }),
    transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [1, 3.5] }) }],
  });

  const scanLineTranslate = scanLine.interpolate({
    inputRange: [0, 1],
    outputRange: [-SCREEN_WIDTH, SCREEN_WIDTH],
  });

  const trainDotX = trainDot.interpolate({
    inputRange: [0, 0.3, 0.6, 1],
    outputRange: [60, 130, 180, 250],
  });
  const trainDotY = trainDot.interpolate({
    inputRange: [0, 0.3, 0.6, 1],
    outputRange: [160, 130, 115, 100],
  });

  const distanceAnimStyle = useAnimatedStyle(() => ({
    opacity: distanceOpacity.value,
    transform: [{ translateY: distanceTranslate.value }],
  }));

  const mapWidth = SCREEN_WIDTH - 48;
  const mapHeight = 200;
  const centerX = mapWidth / 2;
  const centerY = mapHeight / 2 - 10;

  return (
    <Animated.View entering={FadeInDown.duration(600).delay(200)} style={styles.mapCardContainer}>
      {/* System Status */}
      <View style={styles.systemStatusRow}>
        <Text style={styles.systemStatusLabel}>SYSTEM STATUS</Text>
        <View style={styles.systemStatusContent}>
          <MaterialCommunityIcons name="map-marker-radius" size={20} color={COLORS.primary} />
          <Text style={styles.systemStatusText}>Showing Localized Map Data (No Internet Required)</Text>
        </View>
      </View>

      {/* Map Area */}
      <View style={styles.mapArea}>
        <Svg width={mapWidth} height={mapHeight} viewBox={`0 0 ${mapWidth} ${mapHeight}`}>
          {/* Background */}
          <Rect x="0" y="0" width={mapWidth} height={mapHeight} fill={COLORS.mapBg} rx="12" />
          
          {/* Water body */}
          <Path
            d={`M 0 ${mapHeight * 0.7} Q ${mapWidth * 0.2} ${mapHeight * 0.6} ${mapWidth * 0.4} ${mapHeight * 0.75} Q ${mapWidth * 0.6} ${mapHeight * 0.9} ${mapWidth} ${mapHeight * 0.8} L ${mapWidth} ${mapHeight} L 0 ${mapHeight} Z`}
            fill={COLORS.mapWater}
            opacity={0.3}
          />

          {/* Green patches */}
          <Circle cx={mapWidth * 0.15} cy={mapHeight * 0.3} r={25} fill={COLORS.mapGreen} opacity={0.4} />
          <Circle cx={mapWidth * 0.75} cy={mapHeight * 0.2} r={18} fill={COLORS.mapGreen} opacity={0.3} />
          <Circle cx={mapWidth * 0.85} cy={mapHeight * 0.65} r={22} fill={COLORS.mapGreen} opacity={0.35} />

          {/* Road network */}
          <Line x1={mapWidth * 0.1} y1={mapHeight * 0.2} x2={mapWidth * 0.5} y2={mapHeight * 0.5} stroke={COLORS.mapRoad} strokeWidth={2} opacity={0.5} />
          <Line x1={mapWidth * 0.3} y1={mapHeight * 0.1} x2={mapWidth * 0.7} y2={mapHeight * 0.6} stroke={COLORS.mapRoad} strokeWidth={1.5} opacity={0.4} />
          <Line x1={mapWidth * 0.05} y1={mapHeight * 0.55} x2={mapWidth * 0.9} y2={mapHeight * 0.4} stroke={COLORS.mapRoad} strokeWidth={1.5} opacity={0.4} />
          <Line x1={mapWidth * 0.2} y1={mapHeight * 0.8} x2={mapWidth * 0.8} y2={mapHeight * 0.15} stroke={COLORS.mapRoad} strokeWidth={2} opacity={0.3} />

          {/* Rail track (dashed) */}
          <Line
            x1={60} y1={160} x2={centerX} y2={centerY}
            stroke={COLORS.primary}
            strokeWidth={2}
            strokeDasharray="6,4"
            opacity={0.5}
          />

          {/* Place labels */}
          <SvgText x={mapWidth * 0.08} y={mapHeight * 0.15} fontSize="8" fill={COLORS.mutedSlate} fontWeight="600" opacity={0.7}>Lonavla</SvgText>
          <SvgText x={mapWidth * 0.7} y={mapHeight * 0.12} fontSize="8" fill={COLORS.mutedSlate} fontWeight="600" opacity={0.7}>Khadki</SvgText>
          <SvgText x={mapWidth * 0.12} y={mapHeight * 0.65} fontSize="8" fill={COLORS.mutedSlate} fontWeight="600" opacity={0.7}>Chinchwad</SvgText>
          <SvgText x={mapWidth * 0.68} y={mapHeight * 0.75} fontSize="8" fill={COLORS.mutedSlate} fontWeight="600" opacity={0.7}>Hadapsar</SvgText>
          <SvgText x={mapWidth * 0.38} y={mapHeight * 0.88} fontSize="8" fill={COLORS.mutedSlate} fontWeight="600" opacity={0.7}>Shivajinagar</SvgText>
        </Svg>

        {/* Ripple effects overlay */}
        <View style={[styles.markerOverlay, { left: centerX - 30, top: centerY - 30 }]}>
          <RNAnimated.View style={[styles.rippleCircle, rippleStyle(pulse1)]} />
          <RNAnimated.View style={[styles.rippleCircle, rippleStyle(pulse2)]} />
          <RNAnimated.View style={[styles.rippleCircle, rippleStyle(pulse3)]} />
          <RNAnimated.View style={[styles.markerPin, { transform: [{ scale: markerScale }] }]}>
            <MaterialCommunityIcons name="map-marker" size={28} color={COLORS.primary} />
          </RNAnimated.View>
        </View>

        {/* Destination label */}
        <View style={[styles.destinationLabel, { left: centerX - 40, top: centerY + 20 }]}>
          <Text style={styles.destinationLabelText}>{destinationName}</Text>
        </View>

        {/* Animated train dot */}
        <RNAnimated.View
          style={[
            styles.trainDot,
            {
              transform: [
                { translateX: trainDotX },
                { translateY: trainDotY },
              ],
            },
          ]}
        >
          <MaterialCommunityIcons name="train" size={14} color={COLORS.white} />
        </RNAnimated.View>

        {/* Scanning sweep */}
        <RNAnimated.View
          style={[
            styles.scanSweep,
            { transform: [{ translateX: scanLineTranslate }] },
          ]}
        />
      </View>

      {/* Distance Info */}
      <Animated.View style={[styles.distanceContainer, distanceAnimStyle]}>
        <Text style={styles.distanceNumber}>{distanceKm}</Text>
        <View style={styles.distanceMeta}>
          <Text style={styles.distanceUnit}>KILOMETERS</Text>
          <Text style={styles.distanceSub}>TO DESTINATION</Text>
        </View>
      </Animated.View>
    </Animated.View>
  );
});

// ─── AMENITY LIST ITEM ───────────────────────────────────────
const AmenityItem = memo(({ item, index }: { item: Amenity; index: number }) => {
  const getAmenityIcon = (icon: string) => {
    switch (icon) {
      case 'local-hospital': return 'hospital-building';
      case 'hotel': return 'bed';
      case 'exit-to-app': return 'exit-run';
      default: return 'map-marker';
    }
  };

  const getAmenityColor = (icon: string) => {
    switch (icon) {
      case 'local-hospital': return '#E53935';
      case 'hotel': return '#1565C0';
      case 'exit-to-app': return '#2E7D32';
      default: return COLORS.primary;
    }
  };

  return (
    <Animated.View entering={FadeInDown.duration(400).delay(400 + index * 120)}>
      <TouchableOpacity style={styles.amenityItem} activeOpacity={0.7}>
        <View style={[styles.amenityIconWrap, { backgroundColor: getAmenityColor(item.icon) + '12' }]}>
          <MaterialCommunityIcons name={getAmenityIcon(item.icon) as any} size={22} color={getAmenityColor(item.icon)} />
        </View>
        <Text style={styles.amenityLabel}>{item.label}</Text>
        <Feather name="chevron-right" size={20} color={COLORS.mutedSlate} />
      </TouchableOpacity>
    </Animated.View>
  );
});

// ─── AMENITIES LIST ──────────────────────────────────────────
const AmenitiesList = memo(({ amenities }: { amenities: Amenity[] }) => (
  <Animated.View entering={FadeInDown.duration(500).delay(350)} style={styles.amenitiesSection}>
    <Text style={styles.sectionTitle}>NEARBY AMENITIES</Text>
    {amenities.map((item, index) => (
      <AmenityItem key={item.id} item={item} index={index} />
    ))}
  </Animated.View>
));

// ─── PROXIMITY ALERT CARD ────────────────────────────────────
const ProximityAlertCard = memo(() => {
  const glowAnim = useRef(new RNAnimated.Value(0.4)).current;

  useEffect(() => {
    RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.timing(glowAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
        RNAnimated.timing(glowAnim, { toValue: 0.4, duration: 1500, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View entering={FadeInDown.duration(500).delay(600)} style={styles.proximityCard}>
      <View style={styles.proximityHeader}>
        <RNAnimated.View style={{ opacity: glowAnim }}>
          <MaterialCommunityIcons name="alert-circle" size={18} color={COLORS.saffron} />
        </RNAnimated.View>
        <Text style={styles.proximityTitle}>GEOFENCE ALERT</Text>
      </View>
      <Text style={styles.proximityText}>
        Proximity alert will trigger when you are within 2km of the arrival platform.
      </Text>
    </Animated.View>
  );
});

// ─── TRAIN STATUS CARD ───────────────────────────────────────
const TrainStatusCard = memo(({ train }: { train: TrainData }) => {
  const cardScale = useSharedValue(0.92);
  const cardOpacity = useSharedValue(0);

  useEffect(() => {
    cardScale.value = withDelay(700, withSpring(1, { damping: 14, stiffness: 90 }));
    cardOpacity.value = withDelay(700, withTiming(1, { duration: 600 }));
  }, []);

  const cardAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
    opacity: cardOpacity.value,
  }));

  return (
    <Animated.View style={[styles.trainStatusCard, cardAnimStyle]}>
      <View style={styles.trainStatusInner}>
        {/* Arrival Section */}
        <View style={styles.trainArrivalSection}>
          <Text style={styles.trainArrivalLabel}>ARRIVAL ESTIMATE</Text>
          <View style={styles.trainArrivalTimeRow}>
            <Text style={styles.trainArrivalTime}>{train.arrivalTime}</Text>
            <Text style={styles.trainArrivalTz}>{train.arrivalTimezone}</Text>
          </View>
        </View>

        {/* Divider */}
        <View style={styles.trainDivider} />

        {/* Train Info Row */}
        <View style={styles.trainInfoRow}>
          <View style={styles.trainInfoBlock}>
            <Text style={styles.trainInfoLabel}>TRAIN NUMBER</Text>
            <Text style={styles.trainInfoValue}>{train.trainNumber} • {train.trainName}</Text>
          </View>
        </View>

        {/* Speed */}
        <View style={styles.trainSpeedRow}>
          <Text style={styles.trainSpeedLabel}>CURRENT SPEED</Text>
          <Text style={styles.trainSpeedValue}>{train.currentSpeed} km/h</Text>
        </View>

        {/* Full Schedule Button */}
        <TouchableOpacity style={styles.scheduleBtn} activeOpacity={0.8}>
          <Text style={styles.scheduleBtnText}>FULL SCHEDULE</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
});

// ─── HEADER ──────────────────────────────────────────────────
const Header = memo(({ isOnline }: { isOnline: boolean }) => {
  const navigation = useNavigation<any>();

  return (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={COLORS.white} />
        </TouchableOpacity>
        <MaterialCommunityIcons name="train-car" size={20} color={COLORS.white} />
        <Text style={styles.headerTitle}>BHARATPATH</Text>
      </View>
      <View style={[styles.statusBadge, isOnline ? styles.statusOnline : styles.statusOffline]}>
        <View style={[styles.statusDot, { backgroundColor: isOnline ? COLORS.success : COLORS.saffron }]} />
        <Text style={[styles.statusText, { color: isOnline ? COLORS.success : COLORS.saffron }]}>
          {isOnline ? 'ONLINE' : 'OFFLINE'}
        </Text>
      </View>
    </View>
  );
});

// ─── MAIN SCREEN ─────────────────────────────────────────────
export default function JourneyScreen({
  isOnline = false,
  distanceToDestination = 9.2,
  trainData = MOCK_TRAIN,
  amenities = MOCK_AMENITIES,
  destinationName = 'PUNE JCT',
}: JourneyProps) {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      <Header isOnline={isOnline} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <MapCard destinationName={destinationName} distanceKm={distanceToDestination} />
        <AmenitiesList amenities={amenities} />
        <ProximityAlertCard />
        <TrainStatusCard train={trainData} />
        <View style={styles.scrollSpacer} />
      </ScrollView>

      <BottomNav activeTab="LIVE_STATUS" />
    </SafeAreaView>
  );
}

// ─── STYLES ──────────────────────────────────────────────────
const styles = StyleSheet.create({
  // Layout
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  scrollView: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  scrollSpacer: {
    height: 16,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backBtn: {
    padding: 4,
    marginRight: 4,
  },
  headerTitle: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 5,
  },
  statusOnline: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  statusOffline: {
    backgroundColor: 'rgba(255, 159, 67, 0.15)',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
  },

  // Map Card
  mapCardContainer: {
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 6,
  },
  systemStatusRow: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  systemStatusLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.mutedSlate,
    letterSpacing: 1,
    marginBottom: 8,
  },
  systemStatusContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  systemStatusText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.darkCharcoal,
    flex: 1,
    lineHeight: 20,
  },
  mapArea: {
    marginHorizontal: 12,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  markerOverlay: {
    position: 'absolute',
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rippleCircle: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
  },
  markerPin: {
    zIndex: 10,
  },
  destinationLabel: {
    position: 'absolute',
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  destinationLabelText: {
    fontSize: 10,
    fontWeight: '900',
    color: COLORS.primary,
    letterSpacing: 0.5,
  },
  trainDot: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  scanSweep: {
    position: 'absolute',
    top: 0,
    width: 60,
    height: '100%',
    opacity: 0.08,
    backgroundColor: COLORS.primary,
  },

  // Distance
  distanceContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    gap: 8,
  },
  distanceNumber: {
    fontSize: 48,
    fontWeight: '900',
    color: COLORS.primary,
    letterSpacing: -2,
    lineHeight: 52,
  },
  distanceMeta: {
    paddingBottom: 6,
  },
  distanceUnit: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.mutedSlate,
    letterSpacing: 1.5,
  },
  distanceSub: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.mutedSlate,
    letterSpacing: 0.5,
    marginTop: 1,
  },

  // Amenities
  amenitiesSection: {
    marginHorizontal: 16,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: COLORS.darkCharcoal,
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  amenityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceGray,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  amenityIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  amenityLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.mediumGray,
  },

  // Proximity Alert
  proximityCard: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: COLORS.alertBg,
    borderRadius: 16,
    padding: 18,
  },
  proximityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  proximityTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: COLORS.saffron,
    letterSpacing: 1,
  },
  proximityText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.mediumGray,
    lineHeight: 21,
  },

  // Train Status Card
  trainStatusCard: {
    marginHorizontal: 16,
    marginTop: 20,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 10,
  },
  trainStatusInner: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  trainArrivalSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  trainArrivalLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  trainArrivalTimeRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  trainArrivalTime: {
    fontSize: 42,
    fontWeight: '900',
    color: COLORS.white,
    letterSpacing: -1,
  },
  trainArrivalTz: {
    fontSize: 16,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.5)',
  },
  trainDivider: {
    width: '80%',
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
    marginBottom: 18,
  },
  trainInfoRow: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 14,
  },
  trainInfoBlock: {
    alignItems: 'center',
  },
  trainInfoLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 1,
    marginBottom: 4,
  },
  trainInfoValue: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.white,
  },
  trainSpeedRow: {
    alignItems: 'center',
    marginBottom: 20,
  },
  trainSpeedLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 1,
    marginBottom: 4,
  },
  trainSpeedValue: {
    fontSize: 24,
    fontWeight: '900',
    color: COLORS.white,
  },
  scheduleBtn: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 24,
  },
  scheduleBtnText: {
    fontSize: 13,
    fontWeight: '900',
    color: COLORS.white,
    letterSpacing: 1,
  },
});
