import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Dimensions, ActivityIndicator, FlatList, StatusBar, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, Ionicons, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTrainSearch } from '../hooks/useTrainSearch';
import masterMap from '../api/bharatpath_master_map.json';

const { width } = Dimensions.get('window');

const COLORS = {
  primary: '#1A237E', // Deep Reliability Indigo
  white: '#FFFFFF',
  background: '#F3F3F3', // Lightest Gray
  inactiveGray: '#EEEEEE', // Muted/Soft Gray
  slateGray: '#64748B', // Slate Gray (Metadata)
  moonBlue: '#64748B', // Consistent with Metadata
  darkCharcoal: '#1A1C1C', // Critical Data
  secondaryLabel: '#44474E', // Secondary Labels
  divider: '#E2E8F0',
  errorRed: '#E53935',
};

export default function TrainListScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  
  const { from = 'NDLS', to = 'BSB', date: dateParam } = route.params || {};
  const [selectedDate, setSelectedDate] = useState(dateParam ? new Date(dateParam) : new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Match the date format in Image 4: "27 MAR, FRIDAY"
  const formattedDate = selectedDate.toLocaleString('en-US', { 
    day: '2-digit',
    month: 'short', 
    weekday: 'long' 
  }).toUpperCase().replace(/(\d+)\s(\w+)/, '$1 $2,');

  const { data, isLoading, isError, refetch } = useTrainSearch({
    from,
    to,
    date: `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`,
  });

  const trains = data || [];

  const renderHeader = () => (
    <View style={styles.resultsCardContainer}>
      <View style={styles.resultsContent}>
        <View style={styles.resultsTextWrapper}>
          <Text style={styles.availableServicesLabel}>AVAILABLE SERVICES</Text>
          <Text style={styles.resultsCountText}>{trains.length} TRAINS FOUND</Text>
        </View>
        <TouchableOpacity style={styles.filterButtonCard}>
          <MaterialCommunityIcons name="tune-variant" size={20} color={COLORS.primary} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.centerContainer} className="w-full">
      {isLoading ? (
        <View className="flex-1 w-full px-4 pt-4">
          <View className="h-40 bg-[#E0E0E0] rounded-xl mb-4 animate-pulse opacity-60 w-full" />
          <View className="h-40 bg-[#E0E0E0] rounded-xl mb-4 animate-pulse opacity-40 w-full" />
          <View className="h-40 bg-[#E0E0E0] rounded-xl mb-4 animate-pulse opacity-20 w-full" />
        </View>
      ) : isError && (!data || data.length === 0) ? (
        <>
          <MaterialIcons name="error-outline" size={64} color={COLORS.errorRed} />
          <Text style={[styles.errorText, { color: COLORS.errorRed }]}>Unable to connect to BharatPath servers.</Text>
          <TouchableOpacity style={styles.retryButtonOutline} onPress={() => refetch()}>
            <Text style={styles.retryTextBlue}>RETRY SEARCH</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <MaterialCommunityIcons name="train-variant" size={64} color={COLORS.moonBlue} />
          <Text style={styles.statusText}>No trains found for this route/date.</Text>
        </>
      )}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.primary }}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      
      {/* Background fill for body section */}
      <View style={{ position: 'absolute', top: 120 + insets.top, left: 0, right: 0, bottom: 0, backgroundColor: COLORS.background }} />

      {/* Header - Pixel Match for Image 4 */}
      <View style={[styles.header, { paddingTop: insets.top + 10, paddingBottom: 25 }]}>
        <TouchableOpacity onPress={() => navigation.navigate('Dashboard')} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerRouteLabel} numberOfLines={1}>ROUTE DETAILS</Text>
          <Text style={styles.headerRouteText} numberOfLines={1}>{from} → {to}</Text>
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.headerDateText}>{formattedDate}</Text>
          <TouchableOpacity onPress={() => setShowDatePicker(true)}>
            <Feather name="calendar" size={22} color={COLORS.white} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ flex: 1, backgroundColor: COLORS.background }}>
        <FlatList
          data={trains}
          keyExtractor={(item) => String(item.trainNumber)}
          renderItem={({ item }) => <TrainCard train={item} />}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={!isLoading ? renderEmptyState : null}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshing={isLoading}
          onRefresh={refetch}
        />
      </View>

      {/* Calendar Modal */}
      <CalendarModal 
        visible={showDatePicker} 
        onClose={() => setShowDatePicker(false)} 
        selectedDate={selectedDate}
        onSelectDate={(date: Date) => {
          setSelectedDate(date);
          setShowDatePicker(false);
          // Refetch will be triggered automatically because selectedDate is in params
        }}
      />
    </View>
  );
}

const TrainCard = ({ train }: { train: any }) => {
  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const dayKeys = ['M', 'Tu', 'W', 'Th', 'F', 'Sa', 'Su'];
  
  const trainNo = train.trainNumber;
  const depTime = train.departure?.time || train.depTime;
  const arrTime = train.arrival?.time || train.arrTime;
  const depCode = train.departure?.station || train.depCode;
  const arrCode = train.arrival?.station || train.arrCode;

  const runningDaysArray = dayKeys.map(key => !!train.runningDays?.[key]);

  const fromName = (masterMap as any)[depCode]?.n || depCode;
  const toName = (masterMap as any)[arrCode]?.n || arrCode;

  // Overnight logic
  const isOvernight = () => {
    if (!depTime || !arrTime) return false;
    const [dH, dM] = depTime.split(':').map(Number);
    const [aH, aM] = arrTime.split(':').map(Number);
    if (aH < dH) return true;
    if (aH === dH && aM < dM) return true;
    return false;
  };

  return (
    <View style={styles.trainCard}>
      <View style={styles.cardLeftAccentThick} />
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <Text style={styles.trainNameTextHeavy}>{trainNo} {train.trainName?.toUpperCase()}</Text>
          <Text style={styles.trainRouteText}>{fromName} - {toName}</Text>
        </View>

        <View style={styles.timeInfoRow}>
          <View style={styles.timeCluster}>
            <Text style={styles.timeTextLarge}>{depTime}</Text>
            <Text style={styles.stationCodeTiny}>{depCode}</Text>
          </View>

          <View style={styles.durationLineArea}>
            <Text style={styles.durationLabelSmall}>{train.duration}</Text>
            <View style={styles.pathLineGroup}>
              <View style={styles.squareDot} />
              <View style={styles.thinGrayLine} />
              <MaterialCommunityIcons name="train" size={16} color={COLORS.primary} style={{ marginHorizontal: 8 }} />
              <View style={styles.thinGrayLine} />
              <View style={styles.squareDot} />
            </View>
          </View>

          <View style={[styles.timeCluster, { alignItems: 'flex-end' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.timeTextLarge}>{arrTime}</Text>
              {isOvernight() && (
                <View style={{ marginBottom: 12, marginLeft: 4 }}>
                  <Ionicons name="moon" size={14} color={COLORS.slateGray} style={{ transform: [{ rotate: '-15deg' }] }} />
                </View>
              )}
            </View>
            <Text style={styles.stationCodeTiny}>{arrCode}</Text>
          </View>
        </View>

        <View style={styles.footerRow}>
          <View style={styles.daysContainer}>
            {days.map((day, i) => (
              <View 
                key={i} 
                style={[
                  styles.daySquareBox, 
                  runningDaysArray[i] ? styles.dayActiveBox : styles.dayInactiveBox
                ]}
              >
                <Text 
                  style={[
                    styles.dayTextMini, 
                    runningDaysArray[i] ? styles.dayActiveTxt : styles.dayInactiveTxt
                  ]}
                >
                  {day}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
};

const CalendarModal = ({ visible, onClose, selectedDate, onSelectDate }: any) => {
  const [viewDate, setViewDate] = useState(new Date(selectedDate));
  const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  // Days calculation
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();

  const daysArr = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const paddingArr = Array.from({ length: firstDayOfMonth }, (_, i) => null);

  const handlePrevMonth = () => {
    setViewDate(new Date(year, month - 1, 1));
  };
  const handleNextMonth = () => {
    setViewDate(new Date(year, month + 1, 1));
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity style={styles.calendarContainer} activeOpacity={1}>
          <View style={styles.calendarHeader}>
            <TouchableOpacity onPress={handlePrevMonth}>
              <MaterialIcons name="chevron-left" size={28} color={COLORS.primary} />
            </TouchableOpacity>
            <Text style={styles.calendarMonthText}>{viewDate.toLocaleString('en-US', { month: 'long', year: 'numeric' })}</Text>
            <TouchableOpacity onPress={handleNextMonth}>
              <MaterialIcons name="chevron-right" size={28} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
          <View style={styles.weekDaysRow}>
            {weekDays.map((d, i) => <Text key={i} style={styles.weekDayText}>{d}</Text>)}
          </View>
          <View style={styles.daysGrid}>
            {[...paddingArr, ...daysArr].map((day, i) => {
              if (day === null) return <View key={`p-${i}`} style={styles.dayCell} />;
              const dayDate = new Date(year, month, day);
              const isSelected = dayDate.toDateString() === selectedDate.toDateString();
              return (
                <TouchableOpacity 
                  key={day} 
                  style={[styles.dayCell, isSelected && styles.dayCellSelected]}
                  onPress={() => onSelectDate(dayDate)}
                >
                  <Text style={[styles.calendarDayText, isSelected && styles.dayTextSelected]}>{day}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: { marginRight: 15 },
  headerInfo: { flex: 1 },
  headerRouteLabel: { fontSize: 8.5, color: 'rgba(255,255,255,0.7)', fontWeight: '900', letterSpacing: 0.8 },
  headerRouteText: { fontSize: 22, fontWeight: '900', color: COLORS.white, marginTop: 2, letterSpacing: -0.5 },
  headerRight: { 
    alignItems: 'flex-end', 
    flexDirection: 'row',
    gap: 15
  },
  headerDateText: { 
    fontSize: 10, 
    color: 'rgba(255,255,255,0.85)', 
    fontWeight: '800',
    letterSpacing: 0.2
  },
  
  scrollContent: { paddingHorizontal: 16, paddingVertical: 15 },
  
  resultsCardContainer: { 
    backgroundColor: COLORS.white, borderRadius: 2, overflow: 'hidden',
    padding: 18, marginBottom: 15, elevation: 1, borderLeftWidth: 4, borderLeftColor: COLORS.primary
  },
  resultsContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  resultsTextWrapper: { flex: 1 },
  availableServicesLabel: { fontSize: 9.5, fontWeight: '900', color: COLORS.slateGray, letterSpacing: 0.8 },
  resultsCountText: { fontSize: 18, fontWeight: '900', color: COLORS.primary, marginTop: 2 },
  filterButtonCard: { padding: 8, backgroundColor: '#F1F5F9', borderRadius: 6 },

  trainCard: { 
    backgroundColor: COLORS.white, borderRadius: 2, overflow: 'hidden', 
    flexDirection: 'row', marginBottom: 16, elevation: 2
  },
  cardLeftAccentThick: { width: 4.5, backgroundColor: COLORS.primary },
  cardContent: { flex: 1, padding: 18 },
  cardHeader: { marginBottom: 15 },
  trainNameTextHeavy: { fontSize: 16, fontWeight: '900', color: COLORS.primary, letterSpacing: -0.3 },
  trainRouteText: { fontSize: 10, color: COLORS.secondaryLabel, fontWeight: '800', marginTop: 3, letterSpacing: 0.1 },
  
  timeInfoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  timeCluster: { flex: 1 },
  timeTextLarge: { fontSize: 28, fontWeight: '900', color: COLORS.darkCharcoal, letterSpacing: -0.8 },
  stationCodeTiny: { fontSize: 10.5, fontWeight: '900', color: COLORS.darkCharcoal, marginTop: 2 },
  
  durationLineArea: { flex: 1.5, alignItems: 'center' },
  durationLabelSmall: { fontSize: 9.5, fontWeight: '900', color: COLORS.slateGray, marginBottom: 5 },
  pathLineGroup: { flexDirection: 'row', alignItems: 'center', width: '100%', justifyContent: 'center' },
  thinGrayLine: { flex: 1, height: 1, backgroundColor: '#E2E8F0' },
  squareDot: { width: 4.5, height: 4.5, backgroundColor: COLORS.primary },

  footerRow: { borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 15 },
  daysContainer: { flexDirection: 'row' },
  daySquareBox: { width: 24, height: 24, borderRadius: 3, justifyContent: 'center', alignItems: 'center', marginRight: 5 },
  dayActiveBox: { backgroundColor: COLORS.primary },
  dayInactiveBox: { backgroundColor: '#F1F1F1' },
  dayTextMini: { fontSize: 9, fontWeight: '900' },
  dayActiveTxt: { color: COLORS.white },
  dayInactiveTxt: { color: COLORS.moonBlue },

  centerContainer: { flex: 1, minHeight: 300, justifyContent: 'center', alignItems: 'center' },
  statusText: { fontSize: 14, color: COLORS.slateGray, fontWeight: '800', marginTop: 15 },
  errorText: { fontSize: 16, fontWeight: '900', marginTop: 10, textAlign: 'center' },
  retryButtonOutline: { marginTop: 20, paddingHorizontal: 30, paddingVertical: 10, borderRadius: 8, borderWidth: 1.5, borderColor: COLORS.primary },
  retryTextBlue: { color: COLORS.primary, fontWeight: '900', fontSize: 12 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  calendarContainer: { width: width * 0.85, backgroundColor: COLORS.white, borderRadius: 20, padding: 20 },
  calendarHeader: { marginBottom: 20 },
  calendarMonthText: { fontSize: 17, fontWeight: '900', color: COLORS.darkCharcoal },
  weekDaysRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 10 },
  weekDayText: { width: 30, textAlign: 'center', fontSize: 11, fontWeight: '800', color: COLORS.slateGray },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: `${100 / 7}%`, aspectRatio: 1, justifyContent: 'center', alignItems: 'center' },
  dayCellSelected: { backgroundColor: COLORS.primary, borderRadius: 12 },
  calendarDayText: { fontSize: 14, fontWeight: '700', color: COLORS.darkCharcoal },
  dayTextSelected: { color: COLORS.white },
});
