import React, { useState, useMemo, useEffect, useRef, useCallback, memo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Dimensions, StatusBar, Platform, Modal, ActivityIndicator, TextInput, Alert, Animated as RNAnimated, Switch } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, Ionicons, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import OfflineDashboard from './OfflineDashboard';
import { useStationSearch } from '../hooks/useStationSearch';
import { usePnrStatus, getCachedJourney, clearActiveJourney, JourneyData } from '../hooks/usePnrStatus';
import { useJourneyNavigation } from '../hooks/useJourneyNavigation';
import masterMap from '../api/bharatpath_master_map.json';
import { supabase } from '../lib/supabase';
import AuthModal from '../components/Auth/AuthModal';
import { BottomNav } from '../components/Navigation/BottomNav';

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
  slateGray: '#64748B',
  darkCharcoal: '#1A1C1C',
  softBlue: '#E3F2FD',
};

export default function Dashboard() {
  const navigation = useNavigation<any>();
  const [isOffline, setIsOffline] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [targetState, setTargetState] = useState(false);

  // Auth State for gatekeeping
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Proximity Alert State
  const [isProximityEnabled, setIsProximityEnabled] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('proximity_enabled').then(val => {
      if (val) setIsProximityEnabled(JSON.parse(val));
    });
  }, []);

  const handleToggleProximity = async (value: boolean) => {
    if (!activeJourney) return; // Guard: Never allow toggle without a journey

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

  // Active Journey State
  const [activeJourney, setActiveJourney] = useState<JourneyData | null>(null);
  const [isHydrating, setIsHydrating] = useState(true);

  // Hydration logic
  useEffect(() => {
    const hydrate = async () => {
      try {
        const cached = await getCachedJourney();
        if (cached) setActiveJourney(cached);
      } catch (e) {
        console.error('Hydration failed', e);
      } finally {
        setIsHydrating(false);
      }
    };
    hydrate();
  }, []);

  const handleNetworkSwitch = (toOffline: boolean) => {
    setTargetState(toOffline);
    setIsTransitioning(true);
    setTimeout(() => {
      setIsOffline(toOffline);
      setIsTransitioning(false);
    }, 1200); 
  };

  const getJourneyStatus = (journey: JourneyData) => {
    const now = new Date();
    const dep = new Date(journey.departs);
    const arr = new Date(journey.arrival);
    if (now < dep) return 'UPCOMING';
    if (now >= dep && now <= arr) return 'ACTIVE';
    return 'COMPLETED';
  };

  const handleClearJourney = () => {
    Alert.alert(
      "Remove Journey",
      "Are you sure you want to stop tracking this journey locally?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Remove", 
          style: "destructive",
          onPress: async () => {
            await clearActiveJourney();
            setActiveJourney(null);
          }
        }
      ]
    );
  };

  const handleSeatExchangePress = async () => {
    // Protected Feature Rule: Check for active session before allowing entry
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      // User is a guest - strictly block navigation and trigger modal
      setShowAuthModal(true);
    } else {
      // Authenticated user
      navigation.navigate('SeatExchange');
    }
  };

  if (isHydrating) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.primary }}>
        <ActivityIndicator color={COLORS.white} size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar 
        barStyle={isOffline ? 'light-content' : 'dark-content'} 
        backgroundColor={isOffline ? COLORS.textDark : COLORS.primary} 
      />
      <View style={styles.container}>
        
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
            <OfflineDashboard onHelpPress={() => navigation.navigate('Help', { isOffline: true })} />
          ) : (
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
              <SearchHubCard 
                activeJourney={activeJourney} 
                onJourneyUpdate={setActiveJourney} 
              />
              
              {isHydrating ? null : !activeJourney ? (
                <View style={styles.sectionContainer}>
                  <Text style={styles.sectionTitle}>UPCOMING TRIP (NO DATA)</Text>
                  <View style={[styles.card, { padding: 40, alignItems: 'center', borderStyle: 'dotted', borderWidth: 2, borderColor: COLORS.divider, elevation: 0 }]}>
                    <View style={{ backgroundColor: '#F1F5F9', width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center' }}>
                      <MaterialCommunityIcons name="ticket-confirmation-outline" size={32} color={COLORS.textLightGray} />
                    </View>
                    <Text style={{ fontSize: 18, fontWeight: '900', color: COLORS.textDark, marginTop: 24 }}>No Active Journey Found</Text>
                    <Text style={{ fontSize: 13, color: COLORS.textGray, textAlign: 'center', marginTop: 12, lineHeight: 20 }}>
                      Enter your 10-digit PNR above to sync your trip. We'll download your route map and offline alerts so you're safe when the network drops.
                    </Text>
                  </View>
                </View>
              ) : (
                <OnlineActiveJourneyCard 
                  data={activeJourney} 
                  onClear={handleClearJourney}
                  onRefresh={(updated) => setActiveJourney(updated)}
                  status={getJourneyStatus(activeJourney)}
                />
              )}

              <OnlineUtilitiesSection 
                onExchangePress={handleSeatExchangePress} 
                onConnectingPress={() => navigation.navigate('ConnectingJourney')}
                isProximityEnabled={isProximityEnabled}
                onToggleProximity={handleToggleProximity}
                hasJourney={!!activeJourney}
              />
            </ScrollView>
          )}

        {/* Unified Bottom Nav */}
        <BottomNav isOffline={isOffline} activeTab="HOME" />
      </View>

      {/* Strict Auth Gatekeeper Modal */}
      <AuthModal 
         visible={showAuthModal}
         onClose={() => {
            // "Continue as Guest" closes the modal safely returning them to Dashboard natively
            setShowAuthModal(false);
         }}
         onSuccess={() => {
            // Once logged in, seamlessly forward their active intent automatically
            setShowAuthModal(false);
            navigation.navigate('SeatExchange');
         }}
      />
    </SafeAreaView>
  );
}


const HighlightText = ({ text, highlight }: { text: string; highlight: string }) => {
  if (!highlight.trim()) return <Text>{text}</Text>;
  const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
  return (
    <Text>
      {parts.map((part, i) => (
        <Text key={i} style={part.toLowerCase() === highlight.toLowerCase() ? { fontWeight: '900', color: COLORS.primary } : {}}>
          {part}
        </Text>
      ))}
    </Text>
  );
};

function SearchHubCard({ activeJourney, onJourneyUpdate }: { activeJourney: JourneyData | null, onJourneyUpdate: (j: JourneyData | null) => void }) {
  const navigation = useNavigation<any>();
  const [activeTab, setActiveTab] = useState<'station' | 'pnr'>('station');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [pnrInput, setPnrInput] = useState('');

  // PNR Mutation
  const pnrMutation = usePnrStatus(
    (data) => {
      onJourneyUpdate(data);
      setPnrInput('');
    },
    (err) => {
      Alert.alert('PNR Error', err.message || 'Unable to fetch PNR status.');
    }
  );

  // Station Search Hooks
  const fromSearch = useStationSearch('NDLS');
  const toSearch = useStationSearch('BSB');

  const isSearchDisabled = !fromSearch.isValid || !toSearch.isValid;

  const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  const mockDays = Array.from({length: 31}, (_, i) => i + 1);

  const handleDateSelect = (day: number) => {
    const newDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), day);
    setSelectedDate(newDate);
    setShowDatePicker(false);
  };

  const handleSearch = () => {
    if (isSearchDisabled) return;
    navigation.navigate('TrainList', {
      from: fromSearch.query,
      to: toSearch.query,
      date: selectedDate.toISOString()
    });
  };

  const handleCheckPnr = () => {
    if (pnrInput.length !== 10) {
      Alert.alert('Invalid PNR', 'Please enter a valid 10-digit PNR number.');
      return;
    }
    pnrMutation.mutate(pnrInput);
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
            <View style={[styles.inputBoxTop, { zIndex: 100 }]}>
              <View style={styles.inputLeft}>
                <Feather name="map-pin" size={18} color={COLORS.textLightGray} />
                <View style={styles.inputTextWrapper}>
                  <Text style={styles.inputLabel}>FROM STATION</Text>
                  <TextInput 
                    style={styles.inputValue}
                    value={fromSearch.query}
                    onChangeText={(text) => fromSearch.setQuery(text.toUpperCase())}
                    onFocus={() => {
                      fromSearch.setShowSuggestions(true);
                      toSearch.setShowSuggestions(false);
                    }}
                    placeholder="NDLS"
                  />
                </View>
              </View>
              {fromSearch.showSuggestions && fromSearch.suggestions.length > 0 && (
                <View style={styles.suggestionBox}>
                  {fromSearch.suggestions.map((s: any) => (
                    <TouchableOpacity key={s.code} onPress={() => fromSearch.selectStation(s.code)} style={styles.suggestionItem}>
                      <Text style={styles.suggestionText}>
                        <HighlightText text={s.code} highlight={fromSearch.query} /> - <Text style={{fontWeight: '400', color: COLORS.textGray}}><HighlightText text={s.name} highlight={fromSearch.query} /></Text>
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
            <View style={styles.inputDividerWrapper}><View style={styles.inputDivider} /></View>
            <View style={[styles.inputBoxBottom, { zIndex: 90 }]}>
              <View style={styles.inputLeft}>
                <Feather name="navigation" size={18} color={COLORS.textLightGray} style={{transform: [{rotate: '45deg'}], marginLeft: -2}} />
                <View style={[styles.inputTextWrapper, {marginLeft: 14}]}>
                  <Text style={styles.inputLabel}>TO STATION</Text>
                  <TextInput 
                    style={styles.inputValue}
                    value={toSearch.query}
                    onChangeText={(text) => toSearch.setQuery(text.toUpperCase())}
                    onFocus={() => {
                      toSearch.setShowSuggestions(true);
                      fromSearch.setShowSuggestions(false);
                    }}
                    placeholder="BSB"
                  />
                </View>
              </View>
              {toSearch.showSuggestions && toSearch.suggestions.length > 0 && (
                <View style={[styles.suggestionBox, { top: 55 }]}>
                  {toSearch.suggestions.map((s: any) => (
                    <TouchableOpacity key={s.code} onPress={() => toSearch.selectStation(s.code)} style={styles.suggestionItem}>
                      <Text style={styles.suggestionText}>
                        <HighlightText text={s.code} highlight={toSearch.query} /> - <Text style={{fontWeight: '400', color: COLORS.textGray}}><HighlightText text={s.name} highlight={toSearch.query} /></Text>
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
            <TouchableOpacity 
              style={styles.swapButton}
              onPress={() => {
                const tempFrom = fromSearch.query;
                fromSearch.setQuery(toSearch.query);
                toSearch.setQuery(tempFrom);
              }}
            >
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
          <TouchableOpacity 
            style={[styles.searchButton, isSearchDisabled && { opacity: 0.6 }]} 
            onPress={handleSearch}
            disabled={isSearchDisabled}
          >
            <Text style={styles.searchButtonText}>SEARCH TRAINS</Text>
            <Feather name="arrow-right" size={20} color={COLORS.white} style={{marginLeft: 8}} />
          </TouchableOpacity>
        </View>
      ) : (
        <View>
          {!activeJourney ? (
            <>
              <View style={styles.pnrInputContainer}>
                <MaterialCommunityIcons name="ticket" size={20} color={COLORS.primary} style={styles.pnrIcon} />
                <TextInput
                  placeholder="Enter 10-digit PNR"
                  style={{ flex: 1, fontSize: 16, fontWeight: '700', color: COLORS.textDark }}
                  keyboardType="numeric"
                  maxLength={10}
                  value={pnrInput}
                  onChangeText={setPnrInput}
                />
              </View>
              <TouchableOpacity 
                style={[styles.searchButton, pnrMutation.isPending && { opacity: 0.7 }]}
                onPress={handleCheckPnr}
                disabled={pnrMutation.isPending}
              >
                {pnrMutation.isPending ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <Text style={styles.searchButtonText}>CHECK STATUS</Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <View style={{ marginTop: 20, alignItems: 'center', backgroundColor: COLORS.inputBg, padding: 20, borderRadius: 16 }}>
              <MaterialIcons name="verified" size={32} color="#22C55E" />
              <Text style={{ fontSize: 16, fontWeight: '900', color: COLORS.textDark, marginTop: 12 }}>Active Journey Found</Text>
              <Text style={{ fontSize: 12, color: COLORS.textGray, marginTop: 4 }}>Monitoring PNR: {activeJourney.pnr}</Text>
              <Text style={{ fontSize: 11, fontWeight: '800', color: COLORS.primary, marginTop: 16 }}>SCROLL DOWN FOR DETAILS</Text>
            </View>
          )}
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
}

const OnlineActiveJourneyCard = memo(({ data, onClear, onRefresh, status }: { data: JourneyData, onClear: () => void, onRefresh: (j: JourneyData) => void, status: string }) => {
  const pnrMutation = usePnrStatus(
    (updated) => onRefresh(updated),
    (err) => Alert.alert('Refresh Failed', err.message || 'Check connection')
  );
  const { navigateToJourney, getButtonConfig } = useJourneyNavigation();

  const isUpcoming = status === 'UPCOMING';
  const isActive = status === 'ACTIVE';
  const buttonConfig = getButtonConfig(status as any);

  // Pulse animation for ACTIVE CTA
  const pulseAnim = useRef(new RNAnimated.Value(1)).current;
  useEffect(() => {
    if (isActive) {
      RNAnimated.loop(
        RNAnimated.sequence([
          RNAnimated.timing(pulseAnim, { toValue: 1.04, duration: 1000, useNativeDriver: true }),
          RNAnimated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    }
  }, [isActive]);

  const getDaysToGo = (departs: string) => {
    try {
      const now = new Date();
      const dep = new Date(departs);
      const diff = dep.getTime() - now.getTime();
      const days = Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
      return days;
    } catch (e) {
      return 1;
    }
  };

  const daysToGo = isUpcoming ? getDaysToGo(data.departs) : 0;

  const formatUpcomingDate = (dateStr: string) => {
    if (!dateStr) return 'TBA';
    try {
      const d = new Date(dateStr);
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const mm = months[d.getMonth()];
      const dd = d.getDate();
      const HH = d.getHours().toString().padStart(2, '0');
      const min = d.getMinutes().toString().padStart(2, '0');
      return `${dd} ${mm}, ${HH}:${min}`;
    } catch (e) {
      return dateStr;
    }
  };

  const formatTime = (timeStr: string) => {
    if (!timeStr) return '--:--';
    try {
      if (timeStr.includes(':')) {
        const parts = timeStr.includes('T') ? timeStr.split('T')[1].split(':') : timeStr.split(':');
        return `${parts[0].slice(-2)}:${parts[1]}`;
      }
      return timeStr;
    } catch (e) {
      return timeStr;
    }
  };

  const formatPlatform = (pf: string) => {
    if (!pf) return 'TBA';
    const clean = pf.replace(/PF\s*/gi, '').trim();
    return clean || 'TBA';
  };

  const handleTrackJourney = useCallback(() => {
    navigateToJourney(data);
  }, [data, navigateToJourney]);

  return (
    <View style={styles.sectionContainer}>
      {/* Active Travel Banner */}
      {isActive && (
        <TouchableOpacity style={styles.travelBanner} onPress={handleTrackJourney} activeOpacity={0.85}>
          <View style={styles.travelBannerLeft}>
            <MaterialCommunityIcons name="train" size={18} color={COLORS.white} />
            <Text style={styles.travelBannerText}>You're currently travelling</Text>
          </View>
          <View style={styles.travelBannerBtn}>
            <Text style={styles.travelBannerBtnText}>Track Now</Text>
            <Feather name="arrow-right" size={14} color={COLORS.primary} />
          </View>
        </TouchableOpacity>
      )}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{isUpcoming ? 'UPCOMING JOURNEY' : 'ACTIVE JOURNEY'}</Text>
        <TouchableOpacity onPress={onClear}>
          <Feather name="trash-2" size={18} color={COLORS.textLightGray} />
        </TouchableOpacity>
      </View>

      {isUpcoming ? (
        <TouchableOpacity activeOpacity={0.92} onPress={handleTrackJourney}>
          <View style={[styles.cardNoPadding, { borderWidth: 1, borderColor: COLORS.softBlue }]}>
            <View style={styles.journeyContent}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <MaterialCommunityIcons name="clock-outline" size={24} color={COLORS.warning} />
                  <Text style={{ marginLeft: 10, fontSize: 24, fontWeight: '900', color: COLORS.darkCharcoal }}>{daysToGo} Days to Go</Text>
                </View>
                <View style={[styles.tagIndigo, { backgroundColor: COLORS.primary }]}>
                  <Text style={styles.tagIndigoText}>UPCOMING</Text>
                </View>
              </View>

              <Text style={[styles.infoLabel, { color: COLORS.slateGray }]}>TRAIN {data?.trainNo}</Text>
              <Text style={[styles.journeyTrainName, { marginTop: 4, letterSpacing: -0.5, fontSize: 20, color: COLORS.primary }]}>{data?.trainName?.toUpperCase()}</Text>

              <View style={styles.stationMapping}>
                <View style={styles.stationBlockLeft}>
                  <Text style={[styles.stationHuge, { color: COLORS.primary }]} adjustsFontSizeToFit numberOfLines={1}>{data?.sourceCode}</Text>
                  <Text style={[styles.stationCity, { color: COLORS.slateGray }]}>{data?.sourceCity?.toUpperCase()}</Text>
                </View>
                <View style={styles.stationConnector}>
                  <View style={[styles.connectorLine, { backgroundColor: COLORS.primary, opacity: 0.2 }]} />
                  <View style={[styles.connectorIconWrap, { borderColor: COLORS.primary, opacity: 0.8 }]}>
                    <MaterialCommunityIcons name="train" size={18} color={COLORS.primary} />
                  </View>
                </View>
                <View style={styles.stationBlockRight}>
                  <Text style={[styles.stationHuge, { color: COLORS.primary }]} adjustsFontSizeToFit numberOfLines={1}>{data?.destCode}</Text>
                  <Text style={[styles.stationCity, { color: COLORS.slateGray }]}>{data?.destCity?.toUpperCase()}</Text>
                </View>
              </View>

              <View style={{ height: 1, backgroundColor: COLORS.divider, marginVertical: 32, opacity: 0.5 }} />

              <View style={styles.upcomingGrid}>
                <View style={styles.gridRow}>
                  <View style={styles.gridItem}>
                    <Text style={[styles.infoLabel, { color: COLORS.slateGray }]}>PNR NUMBER</Text>
                    <Text style={[styles.infoValue, { color: COLORS.primary, fontSize: 18 }]}>{data?.pnr}</Text>
                  </View>
                  <View style={styles.gridItem}>
                    <Text style={[styles.infoLabel, { color: COLORS.slateGray }]}>DEPARTS</Text>
                    <Text style={[styles.infoValue, { color: COLORS.primary, fontSize: 18 }]}>{formatUpcomingDate(data?.departs)}</Text>
                  </View>
                </View>
                <View style={[styles.gridRow, { marginTop: 24 }]}>
                  <View style={styles.gridItem}>
                    <Text style={[styles.infoLabel, { color: COLORS.slateGray }]}>PLATFORM</Text>
                    <Text style={[styles.infoValue, { color: COLORS.warning, fontSize: 18 }]}>{formatPlatform(data?.platform)}</Text>
                  </View>
                  <View style={styles.gridItem}>
                    <Text style={[styles.infoLabel, { color: COLORS.slateGray }]}>COACH / SEAT</Text>
                    <Text style={[styles.infoValue, { color: COLORS.primary, fontSize: 18 }]}>{data?.coach} / {data?.seat}</Text>
                  </View>
                </View>
              </View>

              {/* VIEW JOURNEY CTA */}
              <TouchableOpacity style={styles.trackJourneyBtn} onPress={handleTrackJourney} activeOpacity={0.85}>
                <Feather name={buttonConfig.icon} size={16} color={COLORS.white} />
                <Text style={styles.trackJourneyBtnText}>{buttonConfig.label}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity activeOpacity={0.92} onPress={handleTrackJourney}>
          <View style={styles.cardNoPadding}>
            <View style={styles.journeyContent}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <View>
                  <Text style={styles.infoLabel}>TRAIN {data?.trainNo}</Text>
                  <Text style={[styles.journeyTrainName, { letterSpacing: -0.5, fontSize: 18 }]}>{data?.trainName?.toUpperCase()}</Text>
                </View>
                <View style={styles.tagOrange}>
                  <Text style={styles.tagOrangeText}>BOARDED</Text>
                </View>
              </View>
              <Text style={styles.journeySubText}>{data?.subText || 'FASTEST TRANSIT'}</Text>

              <View style={styles.stationMapping}>
                <View style={styles.stationBlockLeft}>
                  <Text style={styles.stationHuge} adjustsFontSizeToFit numberOfLines={1}>{data?.sourceCode}</Text>
                  <Text style={styles.stationCity}>{data?.sourceCity?.toUpperCase()}</Text>
                </View>
                <View style={styles.stationConnector}>
                  <View style={styles.connectorLine} />
                  <View style={styles.connectorIconWrap}>
                    <MaterialCommunityIcons name="train" size={18} color={COLORS.textGray} />
                  </View>
                </View>
                <View style={styles.stationBlockRight}>
                  <Text style={styles.stationHuge} adjustsFontSizeToFit numberOfLines={1}>{data?.destCode}</Text>
                  <Text style={styles.stationCity}>{data?.destCity?.toUpperCase()}</Text>
                </View>
              </View>

              <View style={styles.journeyInfoRow}>
                <View style={styles.journeyInfoItem}>
                  <Text style={styles.infoLabel}>DEPARTS</Text>
                  <Text style={styles.infoValue}>{formatTime(data?.departs)}</Text>
                </View>
                <View style={[styles.journeyInfoItem, {alignItems: 'center'}]}>
                  <Text style={styles.infoLabel}>PLATFORM</Text>
                  <Text style={styles.infoValueBlue}>{formatPlatform(data?.platform)}</Text>
                </View>
                <View style={[styles.journeyInfoItem, {alignItems: 'flex-end'}]}>
                  <Text style={styles.infoLabel}>COACH/SEAT</Text>
                  <Text style={styles.infoValue}>{data?.coach} / {data?.seat}</Text>
                </View>
              </View>

              <View style={styles.progressSection}>
                <View style={styles.progressHeader}>
                  <View style={styles.progressRow}>
                    <Feather name="map-pin" size={14} color={COLORS.textGray} />
                    <Text style={styles.progressText}>{data?.currentLocation || 'Arriving at MGS Junction'}</Text>
                  </View>
                  <Text style={styles.etaText}>ETA {data?.eta || '20:45'}</Text>
                </View>
                <View style={styles.progressBarBg}>
                  <View style={[styles.progressBarFill, {width: `${data?.progressPct || 65}%`}]} />
                  <View style={[styles.progressDot, {left: `${data?.progressPct || 65}%`}]} />
                </View>
              </View>

              {/* TRACK LIVE CTA with Pulse */}
              <RNAnimated.View style={{ transform: [{ scale: pulseAnim }], marginTop: 24 }}>
                <TouchableOpacity style={styles.trackLiveBtn} onPress={handleTrackJourney} activeOpacity={0.85}>
                  <Feather name={buttonConfig.icon} size={16} color={COLORS.white} />
                  <Text style={styles.trackLiveBtnText}>{buttonConfig.label}</Text>
                </TouchableOpacity>
              </RNAnimated.View>
            </View>
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
});

const OnlineUtilitiesSection = ({ 
  onExchangePress, 
  onConnectingPress,
  isProximityEnabled,
  onToggleProximity,
  hasJourney
}: { 
  onExchangePress: () => void, 
  onConnectingPress: () => void,
  isProximityEnabled: boolean,
  onToggleProximity: (val: boolean) => void,
  hasJourney: boolean
}) => (
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
      <TouchableOpacity style={styles.utilitySquare} onPress={onConnectingPress}>
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
    <View style={styles.utilityRect}>
      <View style={styles.rectContentFull}>
        <View style={styles.rectContent}>
          <View style={[styles.iconBox3D, { backgroundColor: '#FFF3E0' }]}>
            <MaterialCommunityIcons name="bell-ring" size={28} color={COLORS.warning} />
            <View style={[styles.iconBadge, { backgroundColor: COLORS.primary }]}>
              <MaterialCommunityIcons name="radar" size={14} color={COLORS.white} />
            </View>
          </View>
          <View style={{ marginLeft: 16 }}>
            <Text style={styles.utilityTitle}>Proximity Alerts</Text>
            <Text style={{ fontSize: 11, color: COLORS.textGray, marginTop: 2 }}>
              {!hasJourney 
                ? 'Requires active journey' 
                : isProximityEnabled 
                  ? 'Alerts enabled' 
                  : 'Alerts disabled'}
            </Text>
          </View>
        </View>
        <Switch 
          value={isProximityEnabled} 
          onValueChange={onToggleProximity} 
          trackColor={{ false: '#767577', true: '#22C55E' }}
          thumbColor={isProximityEnabled ? '#fff' : '#f4f3f4'}
          disabled={!hasJourney}
        />
      </View>
    </View>
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

  transitionContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background, paddingHorizontal: 40 },
  transitionTitle: { fontSize: 18, fontWeight: '900', color: COLORS.textDark, textAlign: 'center', letterSpacing: -0.5 },
  transitionSubtitle: { fontSize: 12, color: COLORS.textGray, textAlign: 'center', marginTop: 12, lineHeight: 18, fontWeight: '600' },

  // --- ONLINE DASHBOARD STYLES ---
  card: { backgroundColor: COLORS.white, borderRadius: 24, padding: 16, elevation: 3 },
  searchTabs: { flexDirection: 'row', backgroundColor: COLORS.inputBg, borderRadius: 14, padding: 4 },
  activeTab: { flex: 1, backgroundColor: COLORS.primary, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  inactiveTab: { flex: 1, paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
  activeTabText: { color: COLORS.white, fontWeight: '800', fontSize: 13 },
  inactiveTabText: { color: COLORS.textGray, fontWeight: '700', fontSize: 13 },
  inputsWrapper: { marginTop: 20, backgroundColor: COLORS.inputBg, borderRadius: 20, position: 'relative' },
  inputBoxTop: { padding: 18 },
  inputBoxBottom: { padding: 18 },
  inputDividerWrapper: { paddingHorizontal: 52 },
  inputDivider: { height: 1, backgroundColor: '#E0E0E0' },
  inputLeft: { flexDirection: 'row', alignItems: 'center' },
  inputTextWrapper: { marginLeft: 16 },
  inputLabel: { fontSize: 11, color: COLORS.primary, fontWeight: '700', marginBottom: 4, letterSpacing: 0.5 },
  inputValue: { fontSize: 18, fontWeight: '900', color: COLORS.textDark, minWidth: 100 },
  swapButton: { position: 'absolute', right: 24, top: '50%', marginTop: -24, width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', zIndex: 200 },
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
  sectionTitle: { fontSize: 13, fontWeight: '900', color: COLORS.textDark, letterSpacing: 1 },
  tagOrange: { backgroundColor: COLORS.warning, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  tagOrangeText: { color: COLORS.white, fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  tagIndigo: { backgroundColor: COLORS.primary, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  tagIndigoText: { color: COLORS.white, fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  cardNoPadding: { backgroundColor: COLORS.white, borderRadius: 24, overflow: 'hidden' },
  journeyContent: { padding: 24 },
  upcomingGrid: { paddingHorizontal: 4 },
  gridRow: { flexDirection: 'row', justifyContent: 'space-between' },
  gridItem: { flex: 1 },
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
  // Travel Banner (Active state)
  travelBanner: { backgroundColor: COLORS.primary, borderRadius: 16, paddingHorizontal: 18, paddingVertical: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  travelBannerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  travelBannerText: { color: COLORS.white, fontSize: 13, fontWeight: '700' },
  travelBannerBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.white, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  travelBannerBtnText: { color: COLORS.primary, fontSize: 12, fontWeight: '900' },
  // Track Journey CTA (Upcoming)
  trackJourneyBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.primary, paddingVertical: 16, borderRadius: 14, marginTop: 28 },
  trackJourneyBtnText: { color: COLORS.white, fontSize: 14, fontWeight: '900', letterSpacing: 1 },
  // Track Live CTA (Active - with pulse)
  trackLiveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.primary, paddingVertical: 16, borderRadius: 14 },
  trackLiveBtnText: { color: COLORS.white, fontSize: 14, fontWeight: '900', letterSpacing: 1 },
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

  // --- AUTOCOMPLETE STYLES ---
  suggestionBox: { position: 'absolute', top: 55, left: 0, right: 0, backgroundColor: COLORS.white, borderRadius: 12, elevation: 5, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, zIndex: 1000, borderWidth: 1, borderColor: COLORS.divider },
  suggestionItem: { paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: COLORS.background },
  suggestionText: { fontSize: 13, fontWeight: '800', color: COLORS.primary },
});