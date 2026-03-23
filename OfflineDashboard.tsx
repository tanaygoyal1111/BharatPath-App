import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ImageBackground, Dimensions } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';

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
  return (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <BoardedCard />
      <OfflineUtilities onHelpPress={onHelpPress} />
      <NextHaltBanner />
    </ScrollView>
  );
}

const BoardedCard = () => (
  <View style={styles.boardedCard}>
    <Text style={styles.boardedSubtitle}>CURRENTLY BOARDED</Text>
    <Text style={styles.boardedTitle}>12259 SEALDAH{'\n'}DURONTO</Text>

    <View style={styles.routeHeader}>
      <View style={styles.routeOrigin}>
        <Text style={styles.routeLabelSmall}>ORIGIN</Text>
        <Text style={styles.routeCode} adjustsFontSizeToFit numberOfLines={1}>NDLS</Text>
        <Text style={styles.routeCity}>New Delhi</Text>
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
        <Text style={styles.routeCode} adjustsFontSizeToFit numberOfLines={1}>SDAH</Text>
        <Text style={styles.routeCity}>Sealdah</Text>
      </View>
    </View>

    <View style={styles.quickInfoBlocks}>
      <View style={styles.infoBlock}>
        <Text style={styles.blockLabel}>PLATFORM</Text>
        <Text style={styles.blockValue}>09</Text>
      </View>
      <View style={[styles.infoBlock, {marginHorizontal: 12}]}>
        <Text style={styles.blockLabel}>ETA</Text>
        <Text style={styles.blockValue}>12:45</Text>
      </View>
      <View style={[styles.infoBlock, styles.coachBlock]}>
        <Text style={styles.blockLabel}>COACH/SEAT</Text>
        <Text style={styles.blockValue}>B4/32</Text>
      </View>
    </View>
  </View>
);

const OfflineUtilities = ({ onHelpPress }: { onHelpPress?: () => void }) => (
  <View style={styles.offlineUtilsContainer}>
    {/* Active Offline Utilities */}
    <View style={styles.offlineRow}>
      <TouchableOpacity style={[styles.offlineUtilitySquare, styles.utilBlueBorder]}>
        <View style={[styles.iconBox3D, { backgroundColor: '#FFF3E0' }]}>
          <MaterialCommunityIcons name="bell-ring" size={28} color={COLORS.warning} />
          <View style={[styles.iconBadge, { backgroundColor: COLORS.primary }]}>
            <MaterialCommunityIcons name="radar" size={14} color={COLORS.white} />
          </View>
        </View>
        <View style={styles.utilityTextWrap}>
          <Text style={styles.offlineUtilTitle}>PROXIMITY ALERTS</Text>
          <Text style={styles.offlineUtilDesc}>Wake up 10km before station</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.offlineUtilitySquare, styles.utilOrangeBorder]} onPress={onHelpPress}>
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
      <View style={[styles.offlineUtilitySquare, styles.utilDisabled]}>
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
      </View>

      <View style={[styles.offlineUtilitySquare, styles.utilDisabled]}>
        <MaterialCommunityIcons name="cloud-off-outline" size={20} color={COLORS.disabledText} style={styles.cloudOffIcon} />
        <View style={[styles.iconBox3D, { backgroundColor: '#EEEEEE' }]}>
          <MaterialCommunityIcons name="train" size={28} color={COLORS.disabledText} />
          <View style={[styles.iconBadge, { backgroundColor: COLORS.textLightGray }]}>
            <MaterialCommunityIcons name="directions-fork" size={14} color={COLORS.white} />
          </View>
        </View>
        <View style={styles.utilityTextWrap}>
          <Text style={styles.offlineUtilTitleDisabled}>CONNECTING TRIP</Text>
          <Text style={styles.offlineUtilDescDisabled}>Requires Connection</Text>
        </View>
      </View>
    </View>
  </View>
);

const NextHaltBanner = () => (
  <View style={styles.nextHaltContainer}>
    <ImageBackground 
      source={{uri: 'https://images.unsplash.com/photo-1474487548417-781cb71495f3?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'}} 
      style={styles.nextHaltBg}
      imageStyle={{borderRadius: 16}}
    >
      <View style={styles.nextHaltOverlay}>
        <Text style={styles.nextHaltLabel}>NEXT MAJOR HALT</Text>
        <Text style={styles.nextHaltStation}>ASANSOL JN (ASN)</Text>
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
});
