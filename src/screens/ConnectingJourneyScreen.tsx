import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Platform, StatusBar, TextInput, Animated, Dimensions, ActivityIndicator, LayoutAnimation, UIManager, Modal, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Feather, MaterialIcons, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { findConnectingRoutes, JourneyOption } from '../utils/bfsEngine';
import masterMap from '../api/bharatpath_master_map.json';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const COLORS = {
  primary: '#1A237E', // Deep Reliability Indigo
  white: '#FFFFFF',
  bg: '#F3F3F3', // Global Background
  uiGray: '#EEEEEE',
  cream: '#FFF5E9', // Layover Background
  warning: '#FF9F43', // Saffron
  secondary: '#44474E', // Meta
  placeholder: '#74777F',
  border: '#E2E8F0',
};

export default function ConnectingJourneyScreen() {
  const navigation = useNavigation();
  const [isModifying, setIsModifying] = useState(false);
  const [resultsLoaded, setResultsLoaded] = useState(true);
  const [isSearchingLoading, setIsSearchingLoading] = useState(false);

  const [fromStation, setFromStation] = useState('NDLS');
  const [toStation, setToStation] = useState('BSB');
  const [travelDate, setTravelDate] = useState('20 MAY 2026');
  const [isOnline, setIsOnline] = useState(false);
  const [journeyResults, setJourneyResults] = useState<JourneyOption[]>([]);

  const [activeInput, setActiveInput] = useState<'from' | 'to' | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(new Date());

  // NEW: State for sorting and filtering
  const [displayedCount, setDisplayedCount] = useState(10);
  const [activeSort, setActiveSort] = useState<'FASTEST' | 'CHEAPEST' | 'FEWEST STOPS'>('FASTEST');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [layoverPref, setLayoverPref] = useState<'No Preference' | 'Shortest' | 'Minimize Connections'>('No Preference');
  const [minLayover, setMinLayover] = useState('');
  const [maxLayover, setMaxLayover] = useState('');
  
  const ALL_STATIONS = useMemo(() => Object.keys(masterMap), []);

  const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  const mockDays = Array.from({length: 31}, (_, i) => i + 1);

  const handleDateSelect = (day: number) => {
    const newDate = new Date(selectedCalendarDate.getFullYear(), selectedCalendarDate.getMonth(), day);
    setSelectedCalendarDate(newDate);
    const dayStr = day.toString().padStart(2, '0');
    const monthStr = newDate.toLocaleString('en-US', { month: 'short' }).toUpperCase();
    setTravelDate(`${dayStr} ${monthStr} 2026`);
    setShowCalendar(false);
  };

  const toggleModify = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsModifying(!isModifying);
  };

  // NEW: Refactored to async to handle the Promise returned by the algorithm
  const handleUpdate = async () => {
    setIsSearchingLoading(true);
    
    // NEW: We await the result natively here without an artificial setTimeout
    const results = await findConnectingRoutes(fromStation.toUpperCase(), toStation.toUpperCase());
    
    LayoutAnimation.configureNext(LayoutAnimation.Presets.spring);
    setJourneyResults(results);
    setDisplayedCount(10); // NEW: Reset displayed count on new search
    setIsSearchingLoading(false);
    setIsModifying(false);
    setResultsLoaded(true);
  };

  useEffect(() => {
    handleUpdate();
  }, []);

  // NEW: Smart Sorting and Filtering Logic
  const sortedAndFilteredResults = useMemo(() => {
    let res = [...journeyResults];

    // Filter by min/max layover if provided
    const minL = parseInt(minLayover);
    const maxL = parseInt(maxLayover);
    
    if (!isNaN(minL) || !isNaN(maxL)) {
       res = res.filter(r => {
          if (r.layoverDuration === undefined) return true; // Keep direct flights
          const duration = r.layoverDuration;
          if (!isNaN(minL) && duration < minL) return false;
          if (!isNaN(maxL) && duration > maxL) return false;
          return true;
       });
    }

    // NEW FIX: Combined Tie-breaker Logic
    res.sort((a, b) => {
      // 1. Primary Sort
      let diff = 0;
      if (activeSort === 'FASTEST' || activeSort === 'CHEAPEST') {
        diff = a.totalDuration - b.totalDuration;
      } else if (activeSort === 'FEWEST STOPS') {
        diff = a.legs.length - b.legs.length;
      }
      
      // 2. If not tied, return primary diff
      if (diff !== 0) return diff;
      
      // 3. Secondary Sort (Tie-breaker based on Layover Preferences)
      if (layoverPref === 'Shortest') {
        return (a.layoverDuration || 0) - (b.layoverDuration || 0);
      } else if (layoverPref === 'Minimize Connections') {
        return a.legs.length - b.legs.length;
      }
      
      return 0; 
    });
    
    return res;
  }, [journeyResults, activeSort, layoverPref, minLayover, maxLayover]);

  // NEW: Expose only sliced window of results
  const visibleResults = sortedAndFilteredResults.slice(0, displayedCount);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
           <Feather name="arrow-left" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>CONNECTING JOURNEY</Text>
        <TouchableOpacity style={styles.headerRight}>
           <Feather name="bell" size={20} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      {!isOnline && (
        <View style={styles.offlineBadge}>
           <MaterialCommunityIcons name="wifi-off" size={12} color={COLORS.secondary} />
           <Text style={styles.offlineBadgeText}>OFFLINE MODE: USING SCHEDULED TIMES</Text>
        </View>
      )}

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={{ paddingBottom: 60 }}
        style={{ flex: 1 }}
      >
        
        <View style={styles.searchHubCard}>
           {!isModifying ? (
             <View>
                <Text style={styles.hubLabel}>JOURNEY DETAILS</Text>
                <Text style={styles.hubSummary}>
                   {(masterMap as any)[fromStation]?.n || fromStation} → {(masterMap as any)[toStation]?.n || toStation} • {travelDate}
                </Text>
                <TouchableOpacity onPress={toggleModify} style={styles.modifyBtn}>
                   <Feather name="edit-2" size={16} color="white" />
                   <Text style={styles.modifyBtnText}>MODIFY SEARCH</Text>
                </TouchableOpacity>
             </View>
           ) : (
             <View>
                <Text style={styles.hubTitleExpanded}>Update Search</Text>
                
                <View style={styles.inputStack}>
                   <Text style={styles.stackLabel}>FROM STATION</Text>
                   <View style={styles.inputWrapper}>
                      <Feather name="map-pin" size={16} color={COLORS.primary} />
                      <TextInput 
                        style={styles.fieldInput} 
                        value={fromStation}
                        onChangeText={(text) => {
                          setFromStation(text.toUpperCase());
                          setActiveInput('from');
                        }}
                        placeholder="Enter code (e.g. NDLS)"
                        placeholderTextColor={COLORS.placeholder}
                      />
                   </View>
                   {activeInput === 'from' && fromStation.length > 0 && (
                     <View style={styles.suggestionBox}>
                       {ALL_STATIONS.filter(s => s.startsWith(fromStation) || (masterMap as any)[s]?.n?.toUpperCase().includes(fromStation)).slice(0, 5).map(s => (
                         <TouchableOpacity key={s} onPress={() => { setFromStation(s); setActiveInput(null); }} style={styles.suggestionItem}>
                           <Text style={styles.suggestionText}>
                             {s} - <Text style={{fontWeight: '400', color: COLORS.secondary}}>{(masterMap as any)[s]?.n}</Text>
                           </Text>
                         </TouchableOpacity>
                       ))}
                     </View>
                   )}
                </View>

                <View style={styles.inputStack}>
                   <Text style={styles.stackLabel}>TO STATION</Text>
                   <View style={styles.inputWrapper}>
                      <Ionicons name="navigate-outline" size={16} color={COLORS.primary} />
                      <TextInput 
                        style={styles.fieldInput} 
                        value={toStation}
                        onChangeText={(text) => {
                          setToStation(text.toUpperCase());
                          setActiveInput('to');
                        }}
                        placeholder="Enter code (e.g. BSB)"
                        placeholderTextColor={COLORS.placeholder}
                      />
                   </View>
                   {activeInput === 'to' && toStation.length > 0 && (
                     <View style={styles.suggestionBox}>
                       {ALL_STATIONS.filter(s => s.startsWith(toStation) || (masterMap as any)[s]?.n?.toUpperCase().includes(toStation)).slice(0, 5).map(s => (
                         <TouchableOpacity key={s} onPress={() => { setToStation(s); setActiveInput(null); }} style={styles.suggestionItem}>
                           <Text style={styles.suggestionText}>
                             {s} - <Text style={{fontWeight: '400', color: COLORS.secondary}}>{(masterMap as any)[s]?.n}</Text>
                           </Text>
                         </TouchableOpacity>
                       ))}
                     </View>
                   )}
                </View>

                <View style={styles.inputStack}>
                   <Text style={styles.stackLabel}>TRAVEL DATE</Text>
                   <TouchableOpacity onPress={() => setShowCalendar(true)} style={styles.inputWrapper}>
                      <Feather name="calendar" size={16} color={COLORS.primary} />
                      <Text style={[styles.fieldInput, { paddingTop: 2 }]}>{travelDate}</Text>
                   </TouchableOpacity>
                </View>

                <View style={styles.hubActions}>
                   <TouchableOpacity onPress={toggleModify} style={styles.cancelHubBtn}>
                      <Text style={styles.cancelHubText}>CANCEL</Text>
                   </TouchableOpacity>
                   <TouchableOpacity onPress={handleUpdate} style={styles.updateHubBtn}>
                      {isSearchingLoading ? (
                        <ActivityIndicator color="white" size="small" />
                      ) : (
                        <Text style={styles.updateHubText}>UPDATE SEARCH</Text>
                      )}
                   </TouchableOpacity>
                </View>
             </View>
           )}
        </View>

        {/* NEW: Visible Filtering/Sorting Controls */}
        {journeyResults.length > 0 && !isModifying && (
          <View style={styles.filtersContainer}>
             <View style={styles.sortRow}>
                <Text style={styles.sortLabel}>Sort By:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
                   {['FASTEST', 'CHEAPEST', 'FEWEST STOPS'].map(sortOpt => (
                     <TouchableOpacity 
                       key={sortOpt} 
                       onPress={() => setActiveSort(sortOpt as any)}
                       style={[styles.chipBase, activeSort === sortOpt && styles.chipActive]}
                     >
                       <Text style={[styles.chipText, activeSort === sortOpt && styles.chipTextActive]}>{sortOpt}</Text>
                     </TouchableOpacity>
                   ))}
                </ScrollView>
                <TouchableOpacity onPress={() => setShowFilterModal(true)} style={styles.filterMenuBtn}>
                   <Feather name="filter" size={16} color={COLORS.primary} />
                </TouchableOpacity>
             </View>
          </View>
        )}

        <View style={styles.sectionHeader}>
           <Text style={styles.sectionSubtitle}>CONNECTING JOURNEYS</Text>
           {/* NEW: Dynamic text showcasing pagination and matches */}
           <Text style={styles.sectionTitle}>FOUND {Math.min(displayedCount, sortedAndFilteredResults.length)} TOP MATCHES</Text>
        </View>

        <View style={{ paddingHorizontal: 20 }}>
           {journeyResults.length > 0 ? (
             <View>
               {/* NEW: Render the limited visibleResults array instead of entire array */}
               {visibleResults.map((option, idx) => (
                 <JourneyOptionCard 
                   key={option.id}
                   option={(idx + 1).toString().padStart(2, '0')}
                   timeInfo={`${Math.floor(option.totalDuration / 60)}H ${option.totalDuration % 60}M • ${option.legs.length - 1} CONNECTION`}
                   isFastest={idx === 0 && activeSort === 'FASTEST'}
                   legs={option.legs.reduce((acc: any[], leg, i) => {
                     acc.push({
                       dep: leg.depTime,
                       from: leg.fromCode,
                       arr: leg.arrTime,
                       to: leg.toCode,
                       train: `${leg.trainName} (${leg.trainNo})`,
                       status: 'SCHEDULED'
                     });
                     
                     // Add layover pill between legs
                     if (i === 0 && option.layoverDuration) {
                       const h = Math.floor(option.layoverDuration / 60);
                       const m = option.layoverDuration % 60;
                       const layoverStr = h > 0 ? `${h}H ${m}M` : `${m}M`;
                       acc.push({
                         layover: `${layoverStr} LAYOVER AT ${leg.toCode}`
                       });
                     }
                     return acc;
                   }, [])}
                   fare={`₹${Math.floor(600 + Math.random() * 1500)}`} // Simulated fare
                   platform={`PF ${Math.floor(Math.random() * 12) + 1} → PF ${Math.floor(Math.random() * 12) + 1}`}
                 />
               ))}

               {/* NEW: Expand results action button */}
               {displayedCount < sortedAndFilteredResults.length && (
                 <TouchableOpacity 
                   style={styles.showMoreBtn}
                   onPress={() => setDisplayedCount(prev => prev + 10)}
                 >
                    <Text style={styles.showMoreBtnText}>SHOW MORE RESULTS</Text>
                 </TouchableOpacity>
               )}
             </View>
           ) : (
             <View style={styles.emptyState}>
                <Ionicons name="search-outline" size={48} color={COLORS.placeholder} />
                <Text style={styles.emptyText}>No routes found for this selection.</Text>
                <Text style={styles.emptySubText}>Try NDLS to BSB for demo paths.</Text>
             </View>
           )}
        </View>
      </ScrollView>

      {/* NEW: Detailed Preferences Filtering Modal */}
      <Modal visible={showFilterModal} transparent animationType="slide">
        <View style={styles.sheetOverlay}>
          <View style={styles.bottomSheet}>
             <View style={styles.sheetHeader}>
               <Text style={styles.sheetTitle}>Detailed Preferences</Text>
               <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                 <Feather name="x" size={24} color={COLORS.secondary} />
               </TouchableOpacity>
             </View>
             
             <Text style={styles.prefSectionLabel}>LAYOVER PREFERENCE</Text>
             <View style={styles.radioGroup}>
               {['No Preference', 'Shortest', 'Minimize Connections'].map(opt => (
                 <TouchableOpacity 
                   key={opt}
                   style={styles.radioRow}
                   onPress={() => setLayoverPref(opt as any)}
                 >
                   <View style={[styles.radioOuter, layoverPref === opt && styles.radioOuterActive]}>
                      {layoverPref === opt && <View style={styles.radioInner} />}
                   </View>
                   <Text style={styles.radioLabel}>{opt}</Text>
                 </TouchableOpacity>
               ))}
             </View>

             <Text style={styles.prefSectionLabel}>LAYOVER DURATION (MINUTES)</Text>
             <View style={styles.durationInputRow}>
                <View style={[styles.inputWrapper, { flex: 1, paddingVertical: 10 }]}>
                   <TextInput 
                     style={styles.fieldInput} 
                     placeholder="Min time"
                     keyboardType="numeric"
                     value={minLayover}
                     onChangeText={setMinLayover}
                     placeholderTextColor={COLORS.placeholder}
                   />
                </View>
                <Text style={{ marginHorizontal: 15, color: COLORS.secondary, fontWeight: '800' }}>-</Text>
                <View style={[styles.inputWrapper, { flex: 1, paddingVertical: 10 }]}>
                   <TextInput 
                     style={styles.fieldInput} 
                     placeholder="Max time"
                     keyboardType="numeric"
                     value={maxLayover}
                     onChangeText={setMaxLayover}
                     placeholderTextColor={COLORS.placeholder}
                   />
                </View>
             </View>

             <TouchableOpacity style={styles.applyFilterBtn} onPress={() => { setDisplayedCount(10); setShowFilterModal(false); }}>
                <Text style={styles.applyFilterBtnText}>APPLY FILTERS</Text>
             </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showCalendar} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowCalendar(false)}>
          <TouchableOpacity style={styles.calendarContainer} activeOpacity={1}>
            <View style={styles.calendarHeader}>
              <Text style={styles.calendarMonthText}>{selectedCalendarDate.toLocaleString('en-US', { month: 'long', year: 'numeric' })}</Text>
              <View style={styles.calendarNav}>
                <Feather name="chevron-left" size={20} color={COLORS.secondary} style={{marginRight: 16}} />
                <Feather name="chevron-right" size={20} color={COLORS.secondary} />
              </View>
            </View>
            <View style={styles.weekDaysRow}>
              {weekDays.map((d, i) => <Text key={i} style={styles.weekDayText}>{d}</Text>)}
            </View>
            <View style={styles.daysGrid}>
              {/* Padding for first day alignment */}
              <View style={styles.dayCell} />
              <View style={styles.dayCell} />
              {mockDays.map((day) => {
                const isSelected = day === selectedCalendarDate.getDate();
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

const JourneyOptionCard = ({ option, timeInfo, isFastest, legs, fare, platform, isActive = true }: any) => (
  <View style={[styles.resultCard, !isActive && { opacity: 0.9 }]}>
    <View style={[styles.resultCardHeader, !isActive && { backgroundColor: '#E2E8F0' }]}>
       <Text style={[styles.optionMeta, !isActive && { color: COLORS.secondary }]} numberOfLines={1} ellipsizeMode="tail">
          OPTION {option}  |  {timeInfo}
       </Text>
       {isFastest && (
         <View style={styles.topBadge}>
            <Text style={styles.topBadgeText}>FASTEST</Text>
         </View>
       )}
    </View>

    <View style={styles.cardMain}>
       {legs.map((leg: any, i: number) => {
         if (leg.layover) {
           return (
             <View key={i} style={styles.bridgeRow}>
                <Feather name="clock" size={14} color={COLORS.warning} />
                <Text style={styles.bridgeText}>{leg.layover}</Text>
             </View>
           );
         }
         return (
           <View key={i} style={styles.legSection}>
              <View style={styles.timeCluster}>
                 <Text style={styles.timeBig} numberOfLines={1} adjustsFontSizeToFit>{leg.dep}</Text>
                 <Text style={styles.stationMini} numberOfLines={2}>{(masterMap as any)[leg.from]?.n || leg.from}</Text>
              </View>

              <View style={styles.transitVisual}>
                 <View style={styles.trainLabelRow}>
                    <MaterialCommunityIcons name="train" size={14} color={COLORS.primary} />
                    <Text style={styles.trainLabelText} numberOfLines={1} ellipsizeMode="tail">{leg.train}</Text>
                 </View>
                 <View style={styles.lineBase}>
                    <View style={styles.circleMarker} />
                    <View style={styles.solidLine} />
                 </View>
                 <View style={styles.statusPill}>
                    <Text style={styles.statusPillText}>{leg.status}</Text>
                 </View>
              </View>

              <View style={[styles.timeCluster, { alignItems: 'flex-end' }]}>
                 <Text style={styles.timeBig} numberOfLines={1} adjustsFontSizeToFit>{leg.arr}</Text>
                 <Text style={[styles.stationMini, { textAlign: 'right' }]} numberOfLines={2}>{(masterMap as any)[leg.to]?.n || leg.to}</Text>
              </View>
           </View>
         );
       })}

       <View style={styles.dividerDots} />

       <View style={styles.cardBottom}>
          <View style={{ flex: 1 }}>
             <Text style={styles.bottomBrief}>BASE FARE</Text>
             <Text style={styles.priceHero}>{fare}</Text>
          </View>
          <View style={{ alignItems: 'flex-end', flex: 1.5 }}>
             <Text style={styles.bottomBrief}>PLATFORM INFO</Text>
             <Text style={styles.platformValue} numberOfLines={1} ellipsizeMode="tail">{platform}</Text>
          </View>
       </View>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: Platform.OS === 'ios' ? 44 : (StatusBar.currentHeight || 24) + 14,
    paddingBottom: 24,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: { padding: 8, marginLeft: -8 },
  headerTitle: { color: COLORS.white, fontSize: 14, fontWeight: '800', letterSpacing: 1 },
  headerRight: { padding: 8, marginRight: -8 },

  searchHubCard: { backgroundColor: 'white', marginTop: 20, marginHorizontal: 20, marginBottom: 15, borderRadius: 24, padding: 24, elevation: 4, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10 },
  hubLabel: { fontSize: 10, color: COLORS.secondary, fontWeight: '800', letterSpacing: 1, marginBottom: 6 },
  hubSummary: { fontSize: 18, fontWeight: '900', color: COLORS.primary, lineHeight: 26, marginBottom: 20 },
  modifyBtn: { backgroundColor: COLORS.primary, borderRadius: 16, paddingVertical: 14, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  modifyBtnText: { color: 'white', fontWeight: '900', fontSize: 13, marginLeft: 8 },

  hubTitleExpanded: { fontSize: 20, fontWeight: '900', color: COLORS.primary, marginBottom: 20 },
  inputStack: { marginBottom: 16 },
  stackLabel: { fontSize: 10, color: COLORS.secondary, fontWeight: '800', marginBottom: 6, marginLeft: 2 },
  inputWrapper: { backgroundColor: '#F8F9FA', borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center' },
  fieldInput: { flex: 1, marginLeft: 12, color: COLORS.primary, fontWeight: '700', fontSize: 14 },
  hubActions: { flexDirection: 'row', marginTop: 15, alignItems: 'center' },
  cancelHubBtn: { flex: 1, paddingVertical: 16, alignItems: 'center' },
  cancelHubText: { color: COLORS.secondary, fontWeight: '800', fontSize: 13 },
  updateHubBtn: { flex: 2, backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  updateHubText: { color: 'white', fontWeight: '900', fontSize: 13 },

  // NEW: Filter Styles
  filtersContainer: { paddingHorizontal: 20, marginBottom: 15 },
  sortRow: { flexDirection: 'row', alignItems: 'center' },
  sortLabel: { fontSize: 11, fontWeight: '800', color: COLORS.secondary, marginRight: 10 },
  chipsScroll: { flex: 1 },
  chipBase: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, backgroundColor: '#E2E8F0', marginRight: 8 },
  chipActive: { backgroundColor: COLORS.primary },
  chipText: { fontSize: 9, fontWeight: '800', color: COLORS.secondary, letterSpacing: 0.5 },
  chipTextActive: { color: 'white' },
  filterMenuBtn: { backgroundColor: '#E2E8F0', padding: 8, borderRadius: 12, marginLeft: 10 },

  showMoreBtn: { backgroundColor: 'white', borderWidth: 1, borderColor: COLORS.border, paddingVertical: 16, borderRadius: 16, alignItems: 'center', marginTop: 10, marginBottom: 20 },
  showMoreBtnText: { color: COLORS.primary, fontWeight: '800', fontSize: 12 },

  sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  bottomSheet: { backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 10 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  sheetTitle: { fontSize: 18, fontWeight: '900', color: COLORS.primary },
  prefSectionLabel: { fontSize: 10, fontWeight: '800', color: COLORS.secondary, letterSpacing: 1, marginBottom: 12 },
  radioGroup: { marginBottom: 24 },
  radioRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  radioOuter: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: COLORS.placeholder, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  radioOuterActive: { borderColor: COLORS.primary },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.primary },
  radioLabel: { fontSize: 14, fontWeight: '600', color: COLORS.primary },
  durationInputRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 30 },
  applyFilterBtn: { backgroundColor: COLORS.primary, borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
  applyFilterBtnText: { color: 'white', fontWeight: '900', fontSize: 14, letterSpacing: 1 },

  sectionHeader: { paddingHorizontal: 24, marginBottom: 16 },
  sectionSubtitle: { fontSize: 10, color: COLORS.secondary, fontWeight: '800', letterSpacing: 1, marginBottom: 4 },
  sectionTitle: { fontSize: 22, fontWeight: '900', color: COLORS.primary },

  resultCard: { backgroundColor: 'white', borderRadius: 24, marginBottom: 16, overflow: 'hidden', elevation: 4, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12 },
  resultCardHeader: { backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  optionMeta: { color: 'white', fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  topBadge: { backgroundColor: COLORS.warning, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 99 },
  topBadgeText: { color: 'white', fontSize: 9, fontWeight: '900' },
  cardMain: { padding: 24 },
  
  legSection: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  timeCluster: { flex: 1 },
  timeBig: { fontSize: 24, fontWeight: "900", color: COLORS.primary, minWidth: 60 },
  stationMini: { fontSize: 11, fontWeight: "700", color: COLORS.secondary, marginTop: 4, lineHeight: 14, minHeight: 28 },
  transitVisual: { flex: 2.2, alignItems: "center", paddingHorizontal: 8 },
  trainLabelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  trainLabelText: { fontSize: 9, fontWeight: '900', color: COLORS.primary, marginLeft: 5, textTransform: 'uppercase' },
  lineBase: { width: '100%', height: 2, backgroundColor: COLORS.primary, borderRadius: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  circleMarker: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'white', borderWidth: 2, borderColor: COLORS.primary },
  solidLine: { flex: 1, height: 2, backgroundColor: COLORS.primary },
  statusPill: { backgroundColor: '#FEF3C7', borderWidth: 1, borderColor: '#FDE68A', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3, marginTop: 12 },
  statusPillText: { color: COLORS.warning, fontSize: 8, fontWeight: '900', textTransform: 'uppercase' },

  bridgeRow: { backgroundColor: COLORS.cream, borderRadius: 20, paddingVertical: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginVertical: 20, borderWidth: 1, borderColor: '#FFEDD5' },
  bridgeText: { color: COLORS.warning, fontSize: 11, fontWeight: '900', marginLeft: 10, textTransform: 'uppercase' },

  dividerDots: { height: 1.5, backgroundColor: '#F1F5F9', marginVertical: 20 },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bottomBrief: { fontSize: 9, color: COLORS.placeholder, fontWeight: '800', letterSpacing: 1.5, marginBottom: 4 },
  priceHero: { fontSize: 20, fontWeight: '900', color: COLORS.primary },
  platformValue: { fontSize: 13, fontWeight: '900', color: COLORS.primary },
  
  offlineBadge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#E2E8F0', paddingVertical: 6, gap: 6 },
  offlineBadgeText: { fontSize: 9, fontWeight: '800', color: COLORS.secondary, letterSpacing: 0.5 },

  emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 40, opacity: 0.6 },
  emptyText: { fontSize: 16, fontWeight: '800', color: COLORS.primary, marginTop: 16 },
  emptySubText: { fontSize: 13, fontWeight: '600', color: COLORS.secondary, marginTop: 4 },

  // New UX Elements
  suggestionBox: { backgroundColor: 'white', borderBottomLeftRadius: 12, borderBottomRightRadius: 12, borderWidth: 1, borderColor: COLORS.border, marginTop: -4, padding: 8, zIndex: 100 },
  suggestionItem: { paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  suggestionText: { fontWeight: '800', color: COLORS.primary, fontSize: 13 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  calendarContainer: { width: '100%', backgroundColor: 'white', borderRadius: 24, padding: 24, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 20, elevation: 5 },
  calendarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  calendarMonthText: { fontSize: 16, fontWeight: '900', color: COLORS.primary },
  calendarNav: { flexDirection: 'row' },
  weekDaysRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 12 },
  weekDayText: { width: 32, textAlign: 'center', fontSize: 12, fontWeight: '800', color: COLORS.secondary },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start' },
  dayCell: { width: `${100 / 7}%`, aspectRatio: 1, justifyContent: 'center', alignItems: 'center', padding: 2 },
  dayCellSelected: { backgroundColor: COLORS.primary, borderRadius: 16 },
  dayText: { fontSize: 14, fontWeight: '700', color: COLORS.primary },
  dayTextSelected: { color: COLORS.white, fontWeight: '900' },
});
