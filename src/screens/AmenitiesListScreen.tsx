import React, { useMemo, useRef, useEffect, memo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  StatusBar,
  Linking,
  Alert,
  Animated as RNAnimated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { fetchAmenities, AmenitiesAPIResponse, AmenityAPIItem } from '../services/journeyService';
import { openInMaps } from '../utils/mapUtils';

// ─── COLOR SYSTEM (mirrors JourneyScreen) ────────────────────
const COLORS = {
  primary: '#1A237E',
  white: '#FFFFFF',
  background: '#F8F9FA',
  surfaceGray: '#F3F3F3',
  darkCharcoal: '#1A1C1C',
  mediumGray: '#44474E',
  mutedSlate: '#74777F',
  divider: '#E2E8F0',
  success: '#10B981',
  errorRed: '#EF4444',
  shadow: 'rgba(26, 35, 126, 0.12)',
  shimmer: '#E8EDF2',
};

// ─── TYPES ───────────────────────────────────────────────────
type AmenityType = 'hospital' | 'hotel';

interface RouteParams {
  type: AmenityType;
  stationLat: number;
  stationLng: number;
}

interface EnrichedAmenity extends AmenityAPIItem {
  distance: number; // km
}

// ─── HAVERSINE DISTANCE ──────────────────────────────────────
const haversineKm = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// ─── CONFIG PER TYPE ─────────────────────────────────────────
const TYPE_CONFIG: Record<AmenityType, { title: string; icon: string; color: string; emptyText: string }> = {
  hospital: {
    title: 'Nearby Hospitals',
    icon: 'hospital-building',
    color: '#E53935',
    emptyText: 'No hospitals found nearby',
  },
  hotel: {
    title: 'Nearby Hotels',
    icon: 'bed',
    color: '#1565C0',
    emptyText: 'No hotels found nearby',
  },
};

// ─── SHIMMER BLOCK ───────────────────────────────────────────
const ShimmerBlock = memo(({ width: w, height: h, style }: { width: number | string; height: number; style?: any }) => {
  const shimmerAnim = useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
    RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.timing(shimmerAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
        RNAnimated.timing(shimmerAnim, { toValue: 0, duration: 1200, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <RNAnimated.View
      style={[
        {
          width: w,
          height: h,
          backgroundColor: COLORS.shimmer,
          borderRadius: 8,
          opacity: shimmerAnim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0.8] }),
        },
        style,
      ]}
    />
  );
});

// ─── SHIMMER CARD ────────────────────────────────────────────
const ShimmerCard = memo(({ index }: { index: number }) => (
  <Animated.View entering={FadeInDown.duration(300).delay(index * 80)}>
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <ShimmerBlock width={44} height={44} style={{ borderRadius: 14 }} />
        <View style={{ flex: 1, marginLeft: 14 }}>
          <ShimmerBlock width="70%" height={18} style={{ borderRadius: 6, marginBottom: 8 }} />
          <ShimmerBlock width="40%" height={14} style={{ borderRadius: 4 }} />
        </View>
      </View>
      <ShimmerBlock width={110} height={40} style={{ borderRadius: 12, marginTop: 14, alignSelf: 'flex-end' }} />
    </View>
  </Animated.View>
));

// ─── AMENITY CARD ────────────────────────────────────────────
const AmenityCard = memo(({ item, index, config }: { item: EnrichedAmenity; index: number; config: typeof TYPE_CONFIG['hospital'] }) => (
  <Animated.View entering={FadeInDown.duration(350).delay(index * 60)}>
    <View style={styles.card}>
      <View style={styles.cardTop}>
        {/* Icon */}
        <View style={[styles.iconCircle, { backgroundColor: config.color + '14' }]}>  
          <MaterialCommunityIcons name={config.icon as any} size={24} color={config.color} />
        </View>

        {/* Info */}
        <View style={styles.cardInfo}>
          <Text style={styles.cardName} numberOfLines={2}>{item.name}</Text>
          <View style={styles.distanceRow}>
            <Feather name="navigation" size={12} color={COLORS.mutedSlate} />
            <Text style={styles.distanceText}>{item.distance.toFixed(1)} km away</Text>
          </View>
        </View>
      </View>

      {/* Directions CTA */}
      <TouchableOpacity
        style={[styles.directionsBtn, { backgroundColor: config.color + '10', borderColor: config.color + '30' }]}
        activeOpacity={0.7}
        onPress={() => openInMaps(item)}
      >
        <MaterialCommunityIcons name="directions" size={18} color={config.color} />
        <Text style={[styles.directionsBtnText, { color: config.color }]}>Directions</Text>
      </TouchableOpacity>
    </View>
  </Animated.View>
));

// ─── EMPTY STATE ─────────────────────────────────────────────
const EmptyState = memo(({ config }: { config: typeof TYPE_CONFIG['hospital'] }) => (
  <View style={styles.emptyContainer}>
    <View style={[styles.emptyIconCircle, { backgroundColor: config.color + '12' }]}>
      <MaterialCommunityIcons name={config.icon as any} size={40} color={config.color} />
    </View>
    <Text style={styles.emptyTitle}>{config.emptyText}</Text>
    <Text style={styles.emptySubtitle}>
      Try again when the train reaches a different station.
    </Text>
  </View>
));

// ─── ERROR STATE ─────────────────────────────────────────────
const ErrorFallback = memo(({ onRetry }: { onRetry: () => void }) => (
  <View style={styles.emptyContainer}>
    <MaterialCommunityIcons name="wifi-off" size={40} color={COLORS.mutedSlate} />
    <Text style={styles.emptyTitle}>Unable to load data</Text>
    <Text style={styles.emptySubtitle}>Please check your connection and try again.</Text>
    <TouchableOpacity style={styles.retryBtn} onPress={onRetry} activeOpacity={0.8}>
      <Feather name="refresh-cw" size={14} color={COLORS.white} />
      <Text style={styles.retryBtnText}>RETRY</Text>
    </TouchableOpacity>
  </View>
));

// ─── HEADER ──────────────────────────────────────────────────
const Header = memo(({ title, count }: { title: string; count?: number }) => {
  const navigation = useNavigation<any>();

  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
        <Feather name="arrow-left" size={22} color={COLORS.white} />
      </TouchableOpacity>
      <View style={styles.headerCenter}>
        <Text style={styles.headerTitle}>{title}</Text>
        {count !== undefined && (
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{count}</Text>
          </View>
        )}
      </View>
      <View style={{ width: 30 }} />
    </View>
  );
});

// ─── MAIN SCREEN ─────────────────────────────────────────────
export default function AmenitiesListScreen() {
  const route = useRoute<any>();
  const { type, stationLat, stationLng } = route.params as RouteParams;

  const config = TYPE_CONFIG[type] || TYPE_CONFIG.hospital;

  // ── Re-use cached amenities query ────────────────────────
  const { data: amenitiesData, isLoading, isError, refetch } = useQuery<AmenitiesAPIResponse>({
    queryKey: ['amenities', stationLat, stationLng],
    queryFn: () => fetchAmenities(stationLat, stationLng),
    enabled: !!stationLat && !!stationLng,
    staleTime: 1000 * 60 * 60,
  });

  // ── Enrich items with distance & sort ────────────────────
  const enrichedItems: EnrichedAmenity[] = useMemo(() => {
    const rawItems = type === 'hospital'
      ? amenitiesData?.data?.hospitals ?? []
      : amenitiesData?.data?.hotels ?? [];

    return rawItems
      .map((item) => ({
        ...item,
        distance: haversineKm(stationLat, stationLng, item.lat, item.lon || (item as any).lng || 0),
      }))
      .sort((a, b) => a.distance - b.distance);
  }, [amenitiesData, type, stationLat, stationLng]);

  // ── Renderers ────────────────────────────────────────────
  const renderItem = useCallback(
    ({ item, index }: { item: EnrichedAmenity; index: number }) => (
      <AmenityCard item={item} index={index} config={config} />
    ),
    [config]
  );

  const keyExtractor = useCallback(
    (item: EnrichedAmenity, index: number) => `${item.name}-${item.lat}-${item.lon || item.lng}-${index}`,
    []
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      <Header
        title={config.title}
        count={isLoading ? undefined : enrichedItems.length}
      />

      {isLoading ? (
        <FlatList
          data={[0, 1, 2, 3, 4]}
          keyExtractor={(_, i) => `shimmer-${i}`}
          renderItem={({ index }) => <ShimmerCard index={index} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      ) : isError ? (
        <ErrorFallback onRetry={() => refetch()} />
      ) : enrichedItems.length === 0 ? (
        <EmptyState config={config} />
      ) : (
        <FlatList
          data={enrichedItems}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </SafeAreaView>
  );
}

// ─── STYLES ──────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  backBtn: {
    padding: 4,
    width: 30,
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    color: COLORS.white,
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  countBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  countBadgeText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '800',
  },

  // List
  listContent: {
    backgroundColor: COLORS.background,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
    flexGrow: 1,
  },
  separator: {
    height: 0,
  },

  // Card
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 18,
    marginBottom: 10,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 4,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: {
    flex: 1,
    marginLeft: 14,
  },
  cardName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.darkCharcoal,
    lineHeight: 22,
  },
  distanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  distanceText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.mutedSlate,
  },

  // Directions button
  directionsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 14,
  },
  directionsBtnText: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  // Empty state
  emptyContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.darkCharcoal,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.mutedSlate,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },

  // Retry
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 14,
    marginTop: 24,
  },
  retryBtnText: {
    fontSize: 13,
    fontWeight: '900',
    color: COLORS.white,
    letterSpacing: 1,
  },
});
