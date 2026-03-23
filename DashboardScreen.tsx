import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, SafeAreaView, Dimensions, StatusBar, Platform, Modal } from 'react-native';
import { Feather, Ionicons, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import OfflineDashboard from './OfflineDashboard';
import HelpScreen from './HelpScreen';
import SeatExchangeScreen from './SeatExchangeScreen';

const { width } = Dimensions.get('window');

const COLORS = {
  primary: '#1A237E',
  white: '#FFFFFF',
  background: '#F3F3F3',
  inputBg: '#EEEEEE',
  warning: '#FF9F43',
  success: '#008CFF',
  bgP2P: '#E8EAF6',
  bgProximity: '#E3F2FD',
  bgComplaint: '#FFEBEE',
  textDark: '#1A1C1C',
  textGray: '#44474E',
  textLightGray: '#74777F',
  alertRed: '#C62828',
  divider: '#E2E8F0',
};

export default function Dashboard() {
  const [isOffline, setIsOffline] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [targetState, setTargetState] = useState(true);
  const [currentTab, setCurrentTab] = useState<'home' | 'help' | 'exchange'>('home');

  const handleNetworkSwitch = (toOffline: boolean) => {
    setTargetState(toOffline);
    setIsTransitioning(true);
    setTimeout(() => {
      setIsOffline(toOffline);
      setIsTransitioning(false);
    }, 1200); // Simulate network state synchronization
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar 
        barStyle={currentTab !== 'home' ? 'dark-content' : 'light-content'} 
        backgroundColor={currentTab !== 'home' ? '#F8F9FA' : (isOffline ? COLORS.textDark : COLORS.primary)} 
      />
      <View style={styles.container}>
        
        {currentTab === 'help' ? (
          <HelpScreen onBack={() => setCurrentTab('home')} />
        ) : currentTab === 'exchange' ? (
          <SeatExchangeScreen onBack={() => setCurrentTab('home')} />
        ) : (
          <>
            {/* Dynamic Header */}
            <View style={isOffline ? styles.headerOffline : styles.headerOnline}>
          <View style={styles.headerLeft}>
            <MaterialIcons name="train" size={26} color={COLORS.white} />
            <Text style={styles.headerTitle}>BHARATPATH</Text>
          </View>
          {isOffline ? (
            <TouchableOpacity style={styles.syncedPill} onPress={() => handleNetworkSwitch(false)} activeOpacity={0.8}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.alertRed, marginRight: 6 }} />
              <Text style={styles.syncedText}>OFFLINE</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.syncedPillOnline} onPress={() => handleNetworkSwitch(true)} activeOpacity={0.8}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#22C55E', marginRight: 6 }} />
              <Text style={styles.syncedTextOnline}>ONLINE</Text>
            </TouchableOpacity>
          )}
        </View>

        {isTransitioning ? (
          <View style={styles.transitionContainer}>
            <MaterialCommunityIcons 
              name={targetState ? "lan-disconnect" : "lan-connect"} 
              size={64} 
              color={COLORS.primary} 
              style={{ marginBottom: 24 }} 
            />
            <Text style={styles.transitionTitle}>
              {targetState ? "Switching to Local Mode..." : "Reconnecting to BharatPath..."}
            </Text>
            <Text style={styles.transitionSubtitle}>
              {targetState 
                ? "Securely caching your journey data" 
                : "Synchronizing live train status and schedules"}
            </Text>
            </View>
          ) : isOffline ? (
            <OfflineDashboard onHelpPress={() => setCurrentTab('help')} />
          ) : (
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
              <SearchHubCard />
              <OnlineActiveJourneyCard />
              <OnlineUtilitiesSection onExchangePress={() => setCurrentTab('exchange')} />
            </ScrollView>
          )}
        </>
        )}

        {/* Unified Bottom Nav */}
        <BottomNav isOffline={isOffline} currentTab={currentTab} onTabPress={setCurrentTab} />
      </View>
    </SafeAreaView>
  );
}

const BottomNav = ({ isOffline, currentTab, onTabPress }: { isOffline: boolean, currentTab: string, onTabPress: (t: 'home' | 'help') => void }) => (
  <View style={styles.bottomNav}>
    <TouchableOpacity style={styles.navItemWrap} onPress={() => onTabPress('home')}>
      <View style={currentTab === 'home' ? (isOffline ? styles.navHomeActivePillOffline : styles.navHomeActivePillOnline) : null}>
        <MaterialIcons name="home" size={26} color={currentTab === 'home' ? (isOffline ? COLORS.white : COLORS.primary) : COLORS.textLightGray} />
        {currentTab === 'home' && isOffline ? <Text style={styles.navTextActivePillOffline}>HOME</Text> : null}
      </View>
      {!(currentTab === 'home' && isOffline) ? <Text style={currentTab === 'home' ? styles.navTextActiveOnline : styles.navText}>HOME</Text> : null}
    </TouchableOpacity>
    
    <TouchableOpacity style={styles.navItemWrap}>
      <MaterialIcons name="wifi-tethering" size={24} color={COLORS.textLightGray} />
      <Text style={styles.navText}>LIVE STATUS</Text>
    </TouchableOpacity>

    <TouchableOpacity style={styles.navItemWrap} onPress={() => onTabPress('help')}>
      <View style={currentTab === 'help' ? styles.navHomeActivePillOffline : null}>
        <MaterialIcons name="sos" size={24} color={currentTab === 'help' ? COLORS.white : COLORS.textLightGray} />
        {currentTab === 'help' ? <Text style={styles.navTextActivePillOffline}>SOS HELP</Text> : null}
      </View>
      {currentTab !== 'help' ? <Text style={styles.navText}>SOS HELP</Text> : null}
    </TouchableOpacity>

    <TouchableOpacity style={styles.navItemWrap}>
      <MaterialIcons name="person-outline" size={26} color={COLORS.textLightGray} />
      <Text style={styles.navText}>PROFILE</Text>
    </TouchableOpacity>
  </View>
);

const SearchHubCard = () => {
  const [activeTab, setActiveTab] = useState<'station' | 'pnr'>('station');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());

  const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  const mockDays = Array.from({length: 31}, (_, i) => i + 1);

  const handleDateSelect = (day: number) => {
    const newDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), day);
    setSelectedDate(newDate);
    setShowDatePicker(false);
  };

  const handleTodayPress = () => setSelectedDate(new Date());
  
  const handleTomoPress = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setSelectedDate(tomorrow);
  };

  const isToday = (d: Date) => {
    const today = new Date();
    return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
  };

  const isTomo = (d: Date) => {
    const tomo = new Date();
    tomo.setDate(tomo.getDate() + 1);
    return d.getDate() === tomo.getDate() && d.getMonth() === tomo.getMonth() && d.getFullYear() === tomo.getFullYear();
  };

  const formattedMain = `${selectedDate.getDate()} ${selectedDate.toLocaleString('en-US', { month: 'short' })}, `;
  const formattedSub = selectedDate.toLocaleString('en-US', { weekday: 'short' });

  const todayActive = isToday(selectedDate);
  const tomoActive = isTomo(selectedDate);

  return (
    <View style={styles.card}>
      <View style={styles.searchTabs}>
        <TouchableOpacity style={activeTab === 'station' ? styles.activeTab : styles.inactiveTab} onPress={() => setActiveTab('station')}>
          <Text style={activeTab === 'station' ? styles.activeTabText : styles.inactiveTabText}>BY STATION</Text>
        </TouchableOpacity>
        <TouchableOpacity style={activeTab === 'pnr' ? styles.activeTab : styles.inactiveTab} onPress={() => setActiveTab('pnr')}>
          <Text style={activeTab === 'pnr' ? styles.activeTabText : styles.inactiveTabText}>BY PNR</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'station' ? (
        <View>
          <View style={styles.inputsWrapper}>
            <View style={styles.inputBoxTop}>
              <View style={styles.inputLeft}>
                <Feather name="map-pin" size={18} color={COLORS.textLightGray} />
                <View style={styles.inputTextWrapper}>
                  <Text style={styles.inputLabel}>FROM STATION</Text>
                  <Text style={styles.inputValue}>NDLS</Text>
                </View>
              </View>
            </View>
            <View style={styles.inputDividerWrapper}><View style={styles.inputDivider} /></View>
            <View style={styles.inputBoxBottom}>
              <View style={styles.inputLeft}>
                <Feather name="navigation" size={18} color={COLORS.textLightGray} style={{transform: [{rotate: '45deg'}], marginLeft: -2}} />
                <View style={[styles.inputTextWrapper, {marginLeft: 14}]}>
                  <Text style={styles.inputLabel}>TO STATION</Text>
                  <Text style={styles.inputValue}>BSB</Text>
                </View>
              </View>
            </View>
            <TouchableOpacity style={styles.swapButton}>
              <Ionicons name="swap-vertical" size={20} color={COLORS.white} />
            </TouchableOpacity>
          </View>
          <View style={styles.dateRow}>
            <TouchableOpacity style={styles.dateBox} onPress={() => setShowDatePicker(true)} activeOpacity={0.7}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>DATE</Text>
                <View style={styles.dateTextRow}>
                  <Text style={styles.dateMainValue}>{formattedMain}</Text>
                  <Text style={styles.dateSubValue}>{formattedSub}</Text>
                </View>
              </View>
              <Feather name="calendar" size={18} color={COLORS.primary} />
            </TouchableOpacity>
            <View style={styles.dayToggleBox}>
              <TouchableOpacity 
                style={todayActive ? styles.dayToggleActive : styles.dayToggleInactive} 
                onPress={handleTodayPress}
              >
                <Text style={todayActive ? styles.dayToggleActiveText : styles.dayToggleInactiveText}>TODAY</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={tomoActive ? styles.dayToggleActive : styles.dayToggleInactive} 
                onPress={handleTomoPress}
              >
                <Text style={tomoActive ? styles.dayToggleActiveText : styles.dayToggleInactiveText}>TOMO</Text>
              </TouchableOpacity>
            </View>
          </View>
          <TouchableOpacity style={styles.searchButton}>
            <Text style={styles.searchButtonText}>SEARCH TRAINS</Text>
            <Feather name="arrow-right" size={20} color={COLORS.white} style={{marginLeft: 8}} />
          </TouchableOpacity>
        </View>
      ) : (
        <View>
          <View style={styles.pnrInputContainer}>
            <MaterialCommunityIcons name="ticket" size={20} color={COLORS.primary} style={styles.pnrIcon} />
            <Text style={styles.pnrPlaceholder}>Enter 10-digit PNR</Text>
          </View>
          <TouchableOpacity style={styles.searchButton}>
            <Text style={styles.searchButtonText}>CHECK STATUS</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Calendar Modal */}
      <Modal visible={showDatePicker} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowDatePicker(false)}>
          <TouchableOpacity style={styles.calendarContainer} activeOpacity={1}>
            <View style={styles.calendarHeader}>
              <Text style={styles.calendarMonthText}>{selectedDate.toLocaleString('en-US', { month: 'long', year: 'numeric' })}</Text>
              <View style={styles.calendarNav}>
                <Feather name="chevron-left" size={20} color={COLORS.textGray} style={{marginRight: 16}} />
                <Feather name="chevron-right" size={20} color={COLORS.textGray} />
              </View>
            </View>
            <View style={styles.weekDaysRow}>
              {weekDays.map((d, i) => <Text key={i} style={styles.weekDayText}>{d}</Text>)}
            </View>
            <View style={styles.daysGrid}>
              <View style={styles.dayCell} />
              <View style={styles.dayCell} />
              {mockDays.map((day) => {
                const isSelected = day === selectedDate.getDate();
                return (
                  <TouchableOpacity 
                    key={day} 
                    style={[styles.dayCell, isSelected && styles.dayCellSelected]}
                    onPress={() => handleDateSelect(day)}
                  >
                    <Text style={[styles.dayText, isSelected && styles.dayTextSelected]}>{day}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

    </View>
  );
};

const OnlineActiveJourneyCard = () => (
  <View style={styles.sectionContainer}>
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>ACTIVE JOURNEY</Text>
      <View style={styles.tagOrange}>
        <Text style={styles.tagOrangeText}>ON TIME</Text>
      </View>
    </View>
    <View style={styles.cardNoPadding}>
      <View style={styles.journeyContent}>
        <Text style={styles.journeyTrainName}>12259 SEALDAH DURONTO</Text>
        <Text style={styles.journeySubText}>FASTEST TRANSIT</Text>
        <View style={styles.stationMapping}>
          <View style={styles.stationBlockLeft}>
            <Text style={styles.stationHuge} adjustsFontSizeToFit numberOfLines={1}>NDLS</Text>
            <Text style={styles.stationCity}>NEW DELHI</Text>
          </View>
          <View style={styles.stationConnector}>
            <View style={styles.connectorLine} />
            <View style={styles.connectorIconWrap}>
              <MaterialCommunityIcons name="train" size={18} color={COLORS.textGray} />
            </View>
          </View>
          <View style={styles.stationBlockRight}>
            <Text style={styles.stationHuge} adjustsFontSizeToFit numberOfLines={1}>SDAH</Text>
            <Text style={styles.stationCity}>SEALDAH</Text>
          </View>
        </View>
        <View style={styles.journeyInfoRow}>
          <View style={styles.journeyInfoItem}>
            <Text style={styles.infoLabel}>DEPARTS</Text>
            <Text style={styles.infoValue}>18:15</Text>
          </View>
          <View style={[styles.journeyInfoItem, {alignItems: 'center'}]}>
            <Text style={styles.infoLabel}>PLATFORM</Text>
            <Text style={styles.infoValueBlue}>PF 12</Text>
          </View>
          <View style={[styles.journeyInfoItem, {alignItems: 'flex-end'}]}>
            <Text style={styles.infoLabel}>COACH/SEAT</Text>
            <Text style={styles.infoValue}>B4 / 22</Text>
          </View>
        </View>
        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <View style={styles.progressRow}>
              <Feather name="map-pin" size={14} color={COLORS.textGray} />
              <Text style={styles.progressText}>Arriving at MGS Junction</Text>
            </View>
            <Text style={styles.etaText}>ETA 20:45</Text>
          </View>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, {width: '60%'}]} />
            <View style={[styles.progressDot, {left: '60%'}]} />
          </View>
        </View>
      </View>
      <View style={styles.journeyFooter}>
        <Text style={styles.journeyFooterText}>SEALDAH DURONTO EXP</Text>
        <TouchableOpacity style={styles.liveMapBtn}>
          <Text style={styles.liveMapText}>LIVE MAP</Text>
        </TouchableOpacity>
      </View>
    </View>
  </View>
);

const OnlineUtilitiesSection = ({ onExchangePress }: { onExchangePress: () => void }) => (
  <View style={styles.sectionContainer}>
    <Text style={styles.sectionTitle}>TRAVEL UTILITIES</Text>
    <View style={styles.utilitiesGrid}>
      <TouchableOpacity style={styles.utilitySquare} onPress={onExchangePress}>
        <View style={styles.iconBox3D}>
          <MaterialCommunityIcons name="seat-recline-extra" size={32} color={COLORS.primary} />
          <View style={styles.iconBadge}>
            <MaterialCommunityIcons name="swap-horizontal" size={14} color={COLORS.white} />
          </View>
        </View>
        <View style={styles.utilityTextWrap}>
          <Text style={styles.utilityTitle}>P2P Seat{'\n'}Exchange</Text>
        </View>
      </TouchableOpacity>
      <TouchableOpacity style={styles.utilitySquare}>
        <View style={[styles.iconBox3D, { backgroundColor: '#E3F2FD' }]}>
          <MaterialCommunityIcons name="train" size={32} color={COLORS.primary} />
          <View style={[styles.iconBadge, { backgroundColor: COLORS.success }]}>
            <MaterialCommunityIcons name="directions-fork" size={14} color={COLORS.white} />
          </View>
        </View>
        <View style={styles.utilityTextWrap}>
          <Text style={styles.utilityTitle}>Connecting{'\n'}Journey</Text>
        </View>
      </TouchableOpacity>
    </View>
    <TouchableOpacity style={styles.utilityRect}>
      <View style={styles.rectContentFull}>
        <View style={styles.rectContent}>
          <View style={[styles.iconBox3D, { backgroundColor: '#FFF3E0' }]}>
            <MaterialCommunityIcons name="bell-ring" size={28} color={COLORS.warning} />
            <View style={[styles.iconBadge, { backgroundColor: COLORS.primary }]}>
              <MaterialCommunityIcons name="radar" size={14} color={COLORS.white} />
            </View>
          </View>
          <Text style={[styles.utilityTitle, {marginLeft: 16}]}>Proximity Alerts</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={COLORS.textLightGray} />
      </View>
    </TouchableOpacity>
  </View>
);

// Unified global styles mapped to the Dashboard container
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.primary },
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40 },
  
  headerOnline: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 14 : 14,
    paddingBottom: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerOffline: {
    backgroundColor: COLORS.textDark,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 14 : 14,
    paddingBottom: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: {
    color: COLORS.white, fontFamily: 'System', fontWeight: '800',
    fontSize: 18, marginLeft: 8, letterSpacing: 0.5,
  },
  headerRight: { position: 'relative', padding: 4 },
  notificationDot: {
    position: 'absolute', top: 6, right: 6, width: 8, height: 8,
    backgroundColor: COLORS.warning, borderRadius: 4, borderWidth: 1.5, borderColor: COLORS.primary,
  },
  syncedPill: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20,
  },
  syncedText: { color: COLORS.white, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  syncedPillOnline: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20,
  },
  syncedTextOnline: { color: COLORS.white, fontSize: 10, fontWeight: '800', letterSpacing: 1 },

  bottomNav: {
    flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center',
    backgroundColor: COLORS.white, paddingTop: 12, paddingBottom: Dimensions.get('window').height > 800 ? 32 : 16,
    borderTopWidth: 1, borderColor: COLORS.inputBg,
  },
  transitionContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background, paddingHorizontal: 40 },
  transitionTitle: { fontSize: 18, fontWeight: '900', color: COLORS.textDark, textAlign: 'center', letterSpacing: -0.5 },
  transitionSubtitle: { fontSize: 12, color: COLORS.textGray, textAlign: 'center', marginTop: 12, lineHeight: 18, fontWeight: '600' },
  navItemWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', height: 60 },
  navHomeActivePillOnline: {
    width: 48, height: 32, backgroundColor: COLORS.bgP2P, borderRadius: 16, justifyContent: 'center', alignItems: 'center',
  },
  navHomeActivePillOffline: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 40, paddingHorizontal: 20,
    backgroundColor: COLORS.primary, borderRadius: 20,
  },
  navText: { fontSize: 10, fontWeight: '700', color: COLORS.textLightGray, marginTop: 6 },
  navTextActiveOnline: { fontSize: 10, fontWeight: '900', color: COLORS.primary, marginTop: 4 },
  navTextActivePillOffline: { fontSize: 12, fontWeight: '800', color: COLORS.white, marginLeft: 8, letterSpacing: 0.5 },

  // --- ONLINE DASHBOARD STYLES ---
  card: { backgroundColor: COLORS.white, borderRadius: 24, padding: 16, elevation: 3 },
  searchTabs: { flexDirection: 'row', backgroundColor: COLORS.inputBg, borderRadius: 14, padding: 4 },
  activeTab: { flex: 1, backgroundColor: COLORS.primary, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  inactiveTab: { flex: 1, paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
  activeTabText: { color: COLORS.white, fontWeight: '800', fontSize: 13 },
  inactiveTabText: { color: COLORS.textGray, fontWeight: '700', fontSize: 13 },
  inputsWrapper: { marginTop: 20, backgroundColor: COLORS.inputBg, borderRadius: 20 },
  inputBoxTop: { padding: 18 },
  inputBoxBottom: { padding: 18 },
  inputDividerWrapper: { paddingHorizontal: 52 },
  inputDivider: { height: 1, backgroundColor: '#E0E0E0' },
  inputLeft: { flexDirection: 'row', alignItems: 'center' },
  inputTextWrapper: { marginLeft: 16 },
  inputLabel: { fontSize: 11, color: COLORS.primary, fontWeight: '700', marginBottom: 4, letterSpacing: 0.5 },
  inputValue: { fontSize: 18, fontWeight: '900', color: COLORS.textDark },
  swapButton: { position: 'absolute', right: 24, top: '50%', marginTop: -24, width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  dateRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
  dateBox: { flex: 1.2, flexDirection: 'row', backgroundColor: COLORS.inputBg, borderRadius: 18, padding: 16, alignItems: 'center' },
  dateTextRow: { flexDirection: 'row', alignItems: 'baseline' },
  dateMainValue: { fontSize: 16, fontWeight: '900', color: COLORS.textDark },
  dateSubValue: { fontSize: 14, color: COLORS.textGray, fontWeight: '600' },
  dayToggleBox: { flex: 1, flexDirection: 'row', backgroundColor: COLORS.inputBg, borderRadius: 18, padding: 4 },
  dayToggleActive: { flex: 1, backgroundColor: COLORS.white, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  dayToggleInactive: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  dayToggleActiveText: { color: COLORS.primary, fontWeight: '800', fontSize: 12 },
  dayToggleInactiveText: { color: COLORS.textLightGray, fontWeight: '700', fontSize: 12 },
  searchButton: { backgroundColor: COLORS.primary, marginTop: 20, paddingVertical: 18, borderRadius: 18, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  searchButtonText: { color: COLORS.white, fontWeight: '800', fontSize: 13, letterSpacing: 1 },
  pnrInputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.inputBg, borderRadius: 16, padding: 18, marginTop: 24, marginBottom: 8 },
  pnrIcon: { marginRight: 12 },
  pnrPlaceholder: { color: COLORS.textLightGray, fontSize: 13, fontWeight: '600', letterSpacing: 0.5 },
  sectionContainer: { marginTop: 32 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingHorizontal: 4 },
  sectionTitle: { fontSize: 13, fontWeight: '900', color: COLORS.textDark, letterSpacing: 1, marginBottom: 16 },
  tagOrange: { backgroundColor: COLORS.warning, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  tagOrangeText: { color: COLORS.white, fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  cardNoPadding: { backgroundColor: COLORS.white, borderRadius: 24, overflow: 'hidden' },
  journeyContent: { padding: 24 },
  journeyTrainName: { color: COLORS.primary, fontWeight: '900', fontSize: 16 },
  journeySubText: { color: COLORS.textLightGray, fontSize: 11, fontWeight: '700', marginTop: 4 },
  stationMapping: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 28 },
  stationBlockLeft: { alignItems: 'flex-start', flex: 1 },
  stationBlockRight: { alignItems: 'flex-end', flex: 1 },
  stationHuge: { fontSize: width > 350 ? 32 : 28, fontWeight: '900', color: COLORS.textDark, letterSpacing: -0.5 },
  stationCity: { color: COLORS.textGray, fontSize: 11, fontWeight: '700', marginTop: 6 },
  stationConnector: { flex: 1.5, alignItems: 'center', justifyContent: 'center', position: 'relative', paddingHorizontal: 10 },
  connectorLine: { position: 'absolute', height: 3, backgroundColor: '#E2E8F0', width: '100%', top: '50%', marginTop: -1.5, borderRadius: 2 },
  connectorIconWrap: { backgroundColor: COLORS.white, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, borderWidth: 2, borderColor: '#E2E8F0' },
  journeyInfoRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 32, backgroundColor: COLORS.inputBg, padding: 16, borderRadius: 16 },
  journeyInfoItem: { flex: 1 },
  infoLabel: { fontSize: 10, color: COLORS.textLightGray, fontWeight: '800', marginBottom: 6 },
  infoValue: { fontSize: 15, fontWeight: '900', color: COLORS.textDark },
  infoValueBlue: { fontSize: 15, fontWeight: '900', color: COLORS.primary },
  progressSection: { marginTop: 28 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  progressRow: { flexDirection: 'row', alignItems: 'center' },
  progressText: { fontSize: 12, color: COLORS.textGray, fontWeight: '700', marginLeft: 6 },
  etaText: { fontSize: 12, color: COLORS.primary, fontWeight: '900' },
  progressBarBg: { height: 10, backgroundColor: COLORS.inputBg, borderRadius: 5, position: 'relative' },
  progressBarFill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 5 },
  progressDot: { position: 'absolute', top: -3, width: 16, height: 16, backgroundColor: COLORS.white, borderWidth: 3, borderColor: COLORS.primary, borderRadius: 8, marginLeft: -8 },
  journeyFooter: { backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  journeyFooterText: { color: COLORS.white, fontWeight: '800', fontSize: 14, letterSpacing: 0.5 },
  liveMapBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 },
  liveMapText: { color: COLORS.white, fontSize: 11, fontWeight: '900' },
  utilitiesGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  utilitySquare: { width: '48%', backgroundColor: COLORS.white, borderRadius: 24, padding: 20 },
  utilityTextWrap: { marginTop: 20 },
  utilityRect: { backgroundColor: COLORS.white, borderRadius: 24, padding: 20, marginBottom: 16 },
  rectContent: { flexDirection: 'row', alignItems: 'center' },
  rectContentFull: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iconBox3D: { width: 56, height: 56, borderRadius: 18, backgroundColor: COLORS.bgP2P, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  iconBadge: { position: 'absolute', bottom: -4, right: -4, backgroundColor: COLORS.warning, width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  utilityTitle: { fontSize: 15, fontWeight: '800', color: COLORS.textDark },

  // --- CALENDAR MODAL STYLES ---
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  calendarContainer: { width: '100%', backgroundColor: COLORS.white, borderRadius: 24, padding: 24, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 20, elevation: 5 },
  calendarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  calendarMonthText: { fontSize: 16, fontWeight: '900', color: COLORS.textDark },
  calendarNav: { flexDirection: 'row' },
  weekDaysRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 12 },
  weekDayText: { width: 32, textAlign: 'center', fontSize: 12, fontWeight: '800', color: COLORS.textGray },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start' },
  dayCell: { width: `${100 / 7}%`, aspectRatio: 1, justifyContent: 'center', alignItems: 'center', padding: 2 },
  dayCellSelected: { backgroundColor: COLORS.primary, borderRadius: 16 },
  dayText: { fontSize: 14, fontWeight: '700', color: COLORS.textDark },
  dayTextSelected: { color: COLORS.white, fontWeight: '900' },
});