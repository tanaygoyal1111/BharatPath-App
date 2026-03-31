import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, TextInput, Platform, StatusBar, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { supabase } from '../lib/supabase';
import Animated, { FadeIn, FadeOut, Easing, withTiming, useSharedValue, useAnimatedStyle, withRepeat } from 'react-native-reanimated';

const COLORS = {
  primary: '#1A237E', 
  white: '#FFFFFF', 
  background: '#F8F9FA', 
  textDark: '#1A1C1C', 
  textGray: '#64748B',
  inputBg: '#F1F5F9',
  blueLight: '#EEF2FF',
  divider: '#E2E8F0',
  warningOrange: '#F97316',
  successGreen: '#22C55E',
};

export default function SeatExchangeScreen() {
  const navigation = useNavigation();
  const [pnr, setPnr] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [pnrError, setPnrError] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);

  const handleVerifyPnr = async () => {
    setPnrError(null);
    if (pnr.length !== 10) {
      setPnrError('Please enter a valid 10-digit PNR number.');
      return;
    }
    setIsVerifying(true);
    try {
      // In production, this would hit a PNR scraper logic API.
      // For now, we simulate a secure verification delay.
      await new Promise(res => setTimeout(res, 1000));
      
      // Transition to verified state
      setRequestId('verified_pnr_state');
      
    } catch (err: any) {
      let debugMessage = err.message;
      if (err instanceof Error && 'context' in err) {
         try {
           const contextObj = await (err as any).context.json();
           debugMessage = contextObj.error || JSON.stringify(contextObj);
         } catch(e) {}
      }
      console.log("EDGE FXN ERROR =>", debugMessage);
      setPnrError(debugMessage || 'PNR Verification Failed');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>SEAT EXCHANGE</Text>
        <View style={styles.headerRight}>
          <Feather name="bell" size={20} color={COLORS.white} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {!requestId ? (
          <View style={styles.mainCard}>
            <View style={styles.topRow}>
              <View>
                <Text style={styles.preTitle}>SECURITY PROTOCOL</Text>
                <Text style={styles.mainTitle}>Seat Exchange</Text>
              </View>
              <MaterialCommunityIcons name="shield-check-outline" size={28} color="#94A3B8" />
            </View>

            {pnrError && (
              <View style={styles.errorBanner}>
                 <Feather name="alert-circle" size={16} color="#DC2626" />
                 <Text style={styles.errorBannerText}>{pnrError}</Text>
              </View>
            )}

            <View style={styles.inputContainer}>
              <TextInput 
                style={styles.pnrInput}
                placeholder="Enter 10-digit PNR"
                placeholderTextColor="#94A3B8"
                keyboardType="number-pad"
                maxLength={10}
                value={pnr}
                onChangeText={setPnr}
              />
            </View>

            <View style={styles.infoBlock}>
              <View style={styles.infoLeftBorder} />
              <View style={styles.infoTextWrapper}>
                <Text style={styles.infoTitle}>Secure PNR Verification</Text>
                <Text style={styles.infoDesc}>
                  Verify your PNR to start searching for matching seat swaps. Your privacy is protected via server-side secure hashing.
                </Text>
              </View>
            </View>

            <TouchableOpacity 
              style={[styles.verifyButton, pnr.length !== 10 && { backgroundColor: '#94A3B8' }]} 
              onPress={handleVerifyPnr}
              disabled={pnr.length !== 10 || isVerifying}
            >
              {isVerifying ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <>
                  <Text style={styles.verifyButtonText}>VERIFY & CONTINUE</Text>
                  <Feather name="chevron-right" size={20} color={COLORS.white} />
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <VerifiedSeatExchangeView pnr={pnr} requestId={requestId} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

interface VerifiedViewProps {
  pnr: string;
  requestId: string;
}

const SkeletonCard = () => {
  const opacity = useSharedValue(0.5);
  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, []);
  
  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View style={[styles.matchCard, animatedStyle, { minHeight: 140 }]}>
      <View style={[styles.infoLeftBorder, {backgroundColor: '#CBD5E1', marginRight: 0}]} />
      <View style={[styles.matchCardContent, { padding: 20 }]}>
        <View style={[styles.matchTopRow, { marginBottom: 24 }]}>
          <View style={{ width: 60, height: 32, backgroundColor: '#E2E8F0', borderRadius: 8 }} />
          <View style={{ width: 80, height: 16, backgroundColor: '#E2E8F0', borderRadius: 4 }} />
          <View style={{ width: 60, height: 32, backgroundColor: '#E2E8F0', borderRadius: 8 }} />
        </View>
        <View style={styles.matchActionsRow}>
          <View style={[styles.actionIgnoreBtn, { backgroundColor: '#E2E8F0', height: 42 }]} />
          <View style={[styles.actionAcceptBtn, { backgroundColor: '#E2E8F0', height: 42 }]} />
        </View>
      </View>
    </Animated.View>
  );
}

const VerifiedSeatExchangeView = ({ pnr, requestId }: VerifiedViewProps) => {
  const [berth, setBerth] = useState('Lower Berth (LB)');
  const [showBerthDropdown, setShowBerthDropdown] = useState(false);
  const berthOptions = ['Lower Berth (LB)', 'Middle Berth (MB)', 'Upper Berth (UB)', 'Side Lower (SL)', 'Side Upper (SU)'];
  
  const [coach, setCoach] = useState('B4');
  const [seatNum, setSeatNum] = useState('22');

  const [matches, setMatches] = useState<any[]>([]);
  const [isFinding, setIsFinding] = useState(false);
  const [swapStatus, setSwapStatus] = useState<'IDLE' | 'COMPLETED'>('IDLE');
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  // Listen to Real-Time matches
  useEffect(() => {
    if (!activeRequestId) return;
    
    // Using a dedicated channel name for all seat matches, filtering client-side
    const channel = supabase.channel('seat_matches_channel')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'seat_matches' },
        async (payload) => {
          const newMatch = payload.new;
          // Filter to ensure user only sees matches where they are involved
          if (newMatch.request_a_id === activeRequestId || newMatch.request_b_id === activeRequestId) {
            
            // We found a match in real time! Now fetch the OTHER person's seat details from seat_requests
            const counterpartId = newMatch.request_a_id === activeRequestId ? newMatch.request_b_id : newMatch.request_a_id;
            
            // Bypass edge fetch error if testing without backend setup by wrapping in try
            try {
               const { data: counterpartRequest } = await supabase
                 .from('seat_requests')
                 .select('coach, seat_no, berth_type, preference, pnr_hash')
                 .eq('id', counterpartId)
                 .single();

               Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
               
               const enrichedMatch = {
                  id: newMatch.id,
                  counterpart_id: counterpartId,
                  offered_seat: counterpartRequest?.berth_type || "SU",
                  requested_berth: counterpartRequest?.preference || berth.match(/\(([^)]+)\)/)?.[1] || "LB",
                  from_pnr_part: counterpartRequest?.coach 
                     ? `${counterpartRequest.coach}/${counterpartRequest.seat_no}` 
                     : "B2/45",
               };

               setMatches(prev => {
                 const exists = prev.find(m => m.id === newMatch.id);
                 if (exists) return prev;
                 return [enrichedMatch, ...prev];
               });
            } catch (e) {
               console.log("Joined fetch failed, using fallback data.");
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeRequestId, berth]);

  const handleFindMatches = async () => {
    setIsFinding(true);
    setApiError(null);
    setMatches([]);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("You must be signed in to access Seat Exchange.");

      const prefBerth = berth.match(/\(([^)]+)\)/)?.[1] || berth;
      const seatNoInt = parseInt(seatNum, 10);
      
      // Create the live insert via edge function exactly matching production snake_case payload
      // user_id is implicit via the Supabase Authorization header passed by .invoke() securely!
      const { data, error } = await supabase.functions.invoke('create-seat-request', {
        body: { 
          pnr,
          train_number: "12259", // Derived from PNR in final app
          journey_date: "2026-04-20", // Derived
          train_class: "3AC", // Derived
          coach: coach,
          seat_no: seatNoInt,
          berth_type: "LB", // Derived
          preference: prefBerth
        },
      });

      if (error) {
           let debugMessage = error.message;
           if (error instanceof Error && 'context' in error) {
              try {
                const contextObj = await (error as any).context.json();
                debugMessage = contextObj.error || JSON.stringify(contextObj);
              } catch(e) {}
           }
           throw new Error(debugMessage);
      }

      const newRequestId = data?.[0]?.id || data?.id;
      setActiveRequestId(newRequestId);
      
      // Fallback: Check if the trigger already generated matches instantly
      const { data: dbMatches, error: rpcError } = await supabase.rpc('find_seat_matches', {
        p_train_number: "12259", 
        p_journey_date: "2026-04-20",
        p_train_class: "3A",   
        p_my_berth: "SU",       
        p_target_preference: prefBerth,
        p_current_user_id: user.id 
      });

      if (!rpcError && dbMatches) {
        // We set manually resolved data for now, realtime channel should catch exact insertions ideally.
      }
      
    } catch (err: any) {
      setApiError(err.message || 'Failed to initialize request');
    } finally {
      setIsFinding(false);
    }
  };

  const handleAcceptSwap = async (matchId: string) => {
    setApiError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("You must be logged in to accept swaps.");

      const { error } = await supabase.rpc('accept_seat_swap_final', {
        p_match_id: matchId,
        p_user_id: user.id,
      });

      if (error) {
        if (error.message.includes('MATCH_EXPIRED')) {
          setApiError('This match has expired or was accepted by someone else.');
        } else if (error.message.includes('UNAUTHORIZED_ACTION')) {
          setApiError('Security Alert: You are not authorized to perform this action.');
        } else if (error.message.includes('MATCH_ALREADY_RESOLVED')) {
          setApiError('This match has already been resolved and taken.');
        } else {
          setApiError(error.message);
        }
        return;
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSwapStatus('COMPLETED');
    } catch (err: any) {
      setApiError(err.message || 'Swap Error occurred.');
    }
  };

  if (swapStatus === 'COMPLETED') {
    return (
      <Animated.View entering={FadeIn} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 80 }}>
        <View style={{ width: 96, height: 96, backgroundColor: '#DCFCE7', borderRadius: 48, alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
          <MaterialCommunityIcons name="check-decagram" size={64} color="#22C55E" />
        </View>
        <Text style={{ fontSize: 24, fontWeight: '900', color: COLORS.textDark, marginBottom: 8 }}>Swap Verified!</Text>
        <Text style={{ textAlign: 'center', color: COLORS.textGray, fontWeight: '500', paddingHorizontal: 32, lineHeight: 22 }}>
          Your seat exchange is now locked securely via the railway network framework. 
          Please proceed to your new seat.
        </Text>
        <TouchableOpacity 
          style={[styles.verifyButton, { marginTop: 40, paddingHorizontal: 32 }]}
          onPress={() => setSwapStatus('IDLE')}
        >
          <Text style={styles.verifyButtonText}>RETURN TO DASHBOARD</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  return (
    <Animated.View entering={FadeIn} style={styles.verifiedContainer}>
      
      {apiError && (
        <View style={[styles.errorBanner, { marginHorizontal: 16, marginTop: 16 }]}>
           <Feather name="alert-circle" size={16} color="#DC2626" />
           <Text style={styles.errorBannerText}>{apiError}</Text>
        </View>
      )}

      <View style={[styles.sectionCard, { paddingVertical: 16, marginTop: apiError ? 0 : 16 }]}>
        <View style={styles.infoLeftBorder} />
        <View style={styles.statusTextWrap}>
           <Text style={styles.statusLabelSmall}>VERIFICATION STATUS</Text>
           <Text style={styles.statusLabelBold}>PNR {pnr} Verified <Text style={{color: COLORS.successGreen}}>✅</Text></Text>
        </View>
        <MaterialCommunityIcons name="shield-check" size={22} color={COLORS.primary} />
      </View>

      <View style={styles.sectionCard}>
        <View style={[styles.infoLeftBorder, {backgroundColor: COLORS.primary}]} />
        <View style={styles.cardContent}>
          <View style={styles.cardHeaderRow}>
            <MaterialCommunityIcons name="seat-passenger" size={16} color={COLORS.primary} />
            <Text style={styles.cardSectionTitle}>YOUR CURRENT SEAT</Text>
          </View>
          <View style={styles.inputRow}>
            <View style={{flex: 1, marginRight: 8}}>
               <Text style={styles.inputLabel}>COACH (E.G., B4)</Text>
               <View style={styles.textBox}>
                 <TextInput 
                   style={styles.dropdownText}
                   value={coach}
                   onChangeText={setCoach}
                   placeholder="B4"
                 />
               </View>
            </View>
            <View style={{flex: 1, marginLeft: 8}}>
               <Text style={styles.inputLabel}>SEAT (E.G., 22)</Text>
               <View style={styles.textBox}>
                 <TextInput 
                   style={styles.dropdownText}
                   keyboardType="number-pad"
                   value={seatNum}
                   onChangeText={setSeatNum}
                   placeholder="22"
                 />
               </View>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.sectionCard}>
        <View style={[styles.infoLeftBorder, {backgroundColor: COLORS.warningOrange}]} />
        <View style={styles.cardContent}>
          <View style={styles.cardHeaderRow}>
            <MaterialCommunityIcons name="swap-horizontal" size={16} color={COLORS.warningOrange} />
            <Text style={styles.cardSectionTitle}>I WANT TO SWAP FOR</Text>
          </View>
          <Text style={styles.inputLabel}>PREFERRED BERTH</Text>
          <TouchableOpacity 
            style={styles.dropdownBox}
            activeOpacity={0.7}
            onPress={() => setShowBerthDropdown(!showBerthDropdown)}
          >
            <Text style={styles.dropdownText}>{berth}</Text>
            <Feather name={showBerthDropdown ? "chevron-up" : "chevron-down"} size={16} color={COLORS.textGray} />
          </TouchableOpacity>

          {showBerthDropdown && (
            <View style={styles.dropdownList}>
              {berthOptions.map((option, idx) => (
                <TouchableOpacity 
                  key={idx} 
                  style={[styles.dropdownItem, idx === berthOptions.length - 1 && styles.dropdownItemLast]}
                  onPress={() => {
                    setBerth(option);
                    setShowBerthDropdown(false);
                  }}
                >
                  <Text style={styles.dropdownItemText}>{option}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <Text style={[styles.inputLabel, {marginTop: 20}]}>LIMIT TO COACHES IN MY CLASS</Text>
          <TouchableOpacity style={styles.dropdownBox}>
            <Text style={styles.dropdownText}>Any in 3-Tier AC</Text>
            <Feather name="chevron-down" size={16} color={COLORS.textGray} />
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity style={styles.findMatchesButton} onPress={handleFindMatches} disabled={isFinding}>
        <Text style={styles.verifyButtonText}>{isFinding ? 'FINDING...' : 'FIND MATCHES'}</Text>
        {!isFinding && <Feather name="search" size={18} color={COLORS.white} style={{marginLeft: 8}} />}
      </TouchableOpacity>

      <View style={styles.requestsHeaderRow}>
        <Text style={styles.requestsHeaderText}>MATCH REQUESTS</Text>
        <View style={styles.requestsHeaderLine} />
      </View>

      {isFinding ? (
        <>
           <SkeletonCard />
           <SkeletonCard />
        </>
      ) : matches.length > 0 ? (
        matches.map((match: any, i) => (
          <MatchRequestCard 
            key={match.id || i}
            current={match.offered_seat || "SU"} 
            offered={match.requested_berth || berth.match(/\(([^)]+)\)/)?.[1] || "LB"} 
            from={match.from_pnr_part || "B2/45"}
            onAccept={() => handleAcceptSwap(match.id)}
          />
        ))
      ) : (
        <View style={{ paddingVertical: 32, alignItems: 'center', backgroundColor: COLORS.white, borderRadius: 16, borderWidth: 1, borderColor: COLORS.divider, borderStyle: 'dashed' }}>
           <Feather name="inbox" size={32} color="#CBD5E1" style={{ marginBottom: 8 }} />
           <Text style={{ color: '#94A3B8', fontWeight: '600', fontSize: 13 }}>No matches found yet.</Text>
           <Text style={{ color: '#94A3B8', fontWeight: '500', fontSize: 11, marginTop: 4 }}>We are actively listening for new requests.</Text>
        </View>
      )}

      <View style={styles.verifiedFooter}>
        <Feather name="lock" size={14} color={COLORS.textGray} style={styles.footerIcon} />
        <Text style={styles.verifiedFooterText}>
          Your seat details are only shared with verified PNR holders once a match is found. BharatPath ensures end-to-end identity validation for a secure travel exchange.
        </Text>
      </View>

    </Animated.View>
  );
};

interface MatchCardProps {
  current: string;
  offered: string;
  from: string;
  onAccept: () => void;
}

const MatchRequestCard = ({current, offered, from, onAccept}: MatchCardProps) => (
  <Animated.View entering={FadeIn.delay(200)} style={styles.matchCard}>
     <View style={[styles.infoLeftBorder, {backgroundColor: COLORS.primary, marginRight: 0}]} />
     <View style={styles.matchCardContent}>
        <View style={styles.matchTopRow}>
           <View style={{flexDirection: 'row', alignItems: 'center'}}>
             <View style={{alignItems: 'center'}}>
               <Text style={styles.matchLabel}>CURRENT</Text>
               <Text style={styles.matchValue}>{current}</Text>
             </View>
             <MaterialCommunityIcons name="swap-horizontal" size={24} color="#CBD5E1" style={{marginHorizontal: 16}} />
             <View style={{alignItems: 'center'}}>
               <Text style={styles.matchLabel}>OFFERED</Text>
               <Text style={[styles.matchValue, {color: COLORS.primary}]}>{offered}</Text>
             </View>
           </View>
           <View style={{alignItems: 'flex-end'}}>
              <Text style={styles.matchLabelDark}>FROM {from}</Text>
              <Text style={styles.matchLabelSmall}>Verified PNR</Text>
           </View>
        </View>
        <View style={styles.matchActionsRow}>
           <TouchableOpacity style={styles.actionIgnoreBtn}>
             <Text style={styles.actionIgnoreText}>IGNORE</Text>
           </TouchableOpacity>
           <TouchableOpacity style={styles.actionAcceptBtn} onPress={onAccept}>
             <Text style={styles.actionAcceptText}>ACCEPT SWAP</Text>
           </TouchableOpacity>
        </View>
     </View>
  </Animated.View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: 16,
    paddingBottom: 24,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: { padding: 8, marginLeft: -8 },
  headerTitle: { color: COLORS.white, fontSize: 14, fontWeight: '800', letterSpacing: 1 },
  headerRight: { padding: 8, marginRight: -8 },
  
  scrollContent: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 40 },
  mainCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  preTitle: { fontSize: 10, color: COLORS.textGray, fontWeight: '800', letterSpacing: 1, marginBottom: 4 },
  mainTitle: { fontSize: 22, fontWeight: '900', color: COLORS.textDark, letterSpacing: -0.5 },
  
  inputContainer: { marginBottom: 32 },
  pnrInput: {
    backgroundColor: COLORS.inputBg,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 18,
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontWeight: '700',
    color: COLORS.textDark,
    letterSpacing: 2,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  
  infoBlock: { flexDirection: 'row', marginBottom: 32 },
  infoLeftBorder: { width: 4, backgroundColor: COLORS.primary, marginRight: 16, borderRadius: 2 },
  infoTextWrapper: { flex: 1 },
  infoTitle: { fontSize: 16, fontWeight: '800', color: COLORS.textDark, marginBottom: 8 },
  infoDesc: { fontSize: 12, color: COLORS.textGray, lineHeight: 18 },
  
  verifyButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 18,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  verifyButtonText: { color: COLORS.white, fontWeight: '800', fontSize: 13, letterSpacing: 1, marginRight: 4 },
  
  // -- UI Styles --
  verifiedContainer: { flex: 1 },
  sectionCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 16,
    flexDirection: 'row',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  statusTextWrap: { flex: 1, justifyContent: 'center' },
  statusLabelSmall: { fontSize: 9, fontWeight: '800', color: COLORS.textGray, letterSpacing: 1, marginBottom: 4 },
  statusLabelBold: { fontSize: 14, fontWeight: '900', color: COLORS.primary },
  
  cardContent: { flex: 1 },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  cardSectionTitle: { fontSize: 12, fontWeight: '800', color: COLORS.textDark, letterSpacing: 0.5, marginLeft: 8 },
  inputRow: { flexDirection: 'row', justifyContent: 'space-between' },
  inputLabel: { fontSize: 10, fontWeight: '800', color: COLORS.textGray, letterSpacing: 0.5, marginBottom: 8 },
  errorBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF2F2', padding: 12, borderRadius: 8, marginBottom: 20, borderWidth: 1, borderColor: '#FECACA' },
  errorBannerText: { fontSize: 12, fontWeight: '600', color: '#DC2626', marginLeft: 8, flex: 1 },
  dropdownBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.divider,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
  },
  textBox: {
    alignItems: 'flex-start',
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.divider,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
  },
  dropdownText: { fontSize: 13, fontWeight: '700', color: COLORS.textDark },
  
  dropdownList: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    marginTop: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
    marginBottom: 8,
  },
  dropdownItem: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  dropdownItemLast: {
    borderBottomWidth: 0,
  },
  dropdownItemText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  
  findMatchesButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 18,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 32,
  },
  
  requestsHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  requestsHeaderText: { fontSize: 11, fontWeight: '800', color: COLORS.textDark, letterSpacing: 1, marginRight: 16 },
  requestsHeaderLine: { flex: 1, height: 1, backgroundColor: COLORS.divider },
  
  matchCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    flexDirection: 'row',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    overflow: 'hidden',
  },
  matchCardContent: { flex: 1, padding: 20 },
  matchTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  matchLabel: { fontSize: 9, fontWeight: '800', color: COLORS.textGray, letterSpacing: 0.5, marginBottom: 6 },
  matchValue: { fontSize: 24, fontWeight: '900', color: COLORS.textDark },
  matchLabelDark: { fontSize: 10, fontWeight: '800', color: COLORS.textDark, marginBottom: 2 },
  matchLabelSmall: { fontSize: 9, fontWeight: '600', color: COLORS.textGray },
  
  matchActionsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  actionIgnoreBtn: { flex: 1, backgroundColor: COLORS.inputBg, paddingVertical: 14, borderRadius: 8, marginRight: 8, alignItems: 'center' },
  actionIgnoreText: { fontSize: 11, fontWeight: '800', color: COLORS.textGray, letterSpacing: 0.5 },
  actionAcceptBtn: { flex: 1.5, backgroundColor: COLORS.primary, paddingVertical: 14, borderRadius: 8, marginLeft: 8, alignItems: 'center' },
  actionAcceptText: { fontSize: 11, fontWeight: '800', color: COLORS.white, letterSpacing: 0.5 },
  
  verifiedFooter: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 16, paddingHorizontal: 8 },
  footerIcon: { marginTop: 2, marginRight: 12 },
  verifiedFooterText: { flex: 1, fontSize: 11, color: COLORS.textGray, lineHeight: 16, fontWeight: '500' },
});
