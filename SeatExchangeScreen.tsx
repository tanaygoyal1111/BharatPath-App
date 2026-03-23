import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, TextInput, Platform, StatusBar } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';

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

export default function SeatExchangeScreen({ onBack }: { onBack: () => void }) {
  const [isVerified, setIsVerified] = useState(false);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>SEAT EXCHANGE</Text>
        <View style={styles.headerRight}>
          <Feather name="bell" size={20} color={COLORS.white} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {!isVerified ? (
          <View style={styles.mainCard}>
            <View style={styles.topRow}>
              <View>
                <Text style={styles.preTitle}>SECURITY PROTOCOL</Text>
                <Text style={styles.mainTitle}>Seat Exchange</Text>
              </View>
              <MaterialCommunityIcons name="shield-check-outline" size={28} color="#94A3B8" />
            </View>

            <View style={styles.inputContainer}>
              <TextInput 
                style={styles.pnrInput}
                placeholder="Enter 10-digit PNR"
                placeholderTextColor="#94A3B8"
                keyboardType="number-pad"
                maxLength={10}
              />
            </View>

            <View style={styles.infoBlock}>
              <View style={styles.infoLeftBorder} />
              <View style={styles.infoTextWrapper}>
                <Text style={styles.infoTitle}>Secure PNR Verification</Text>
                <Text style={styles.infoDesc}>
                  Verify your PNR to start searching for matching seat swaps. Your privacy is protected with zero-knowledge local hashing.
                </Text>
              </View>
            </View>

            <TouchableOpacity style={styles.verifyButton} onPress={() => setIsVerified(true)}>
              <Text style={styles.verifyButtonText}>VERIFY & CONTINUE</Text>
              <Feather name="chevron-right" size={20} color={COLORS.white} />
            </TouchableOpacity>
          </View>
        ) : (
          <VerifiedSeatExchangeView />
        )}
      </ScrollView>
    </View>
  );
}

const VerifiedSeatExchangeView = () => {
  const [berth, setBerth] = useState('Lower Berth (LB)');
  const [showBerthDropdown, setShowBerthDropdown] = useState(false);
  const berthOptions = ['Lower Berth (LB)', 'Upper Berth (UP)', 'Side Lower (SL)', 'Side Upper (SU)'];

  return (
    <View style={styles.verifiedContainer}>
      
      {/* 1. Verification Status Card */}
      <View style={[styles.sectionCard, { paddingVertical: 16 }]}>
        <View style={styles.infoLeftBorder} />
        <View style={styles.statusTextWrap}>
           <Text style={styles.statusLabelSmall}>VERIFICATION STATUS</Text>
           <Text style={styles.statusLabelBold}>PNR 1234567890 Verified <Text style={{color: COLORS.successGreen}}>✅</Text></Text>
        </View>
        <MaterialCommunityIcons name="shield-check" size={22} color={COLORS.primary} />
      </View>

      {/* 2. Your Current Seat Card */}
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
               <TouchableOpacity style={styles.dropdownBox}>
                 <Text style={styles.dropdownText}>B4 (3-Tier AC)</Text>
                 <Feather name="chevron-down" size={16} color={COLORS.textGray} />
               </TouchableOpacity>
            </View>
            <View style={{flex: 1, marginLeft: 8}}>
               <Text style={styles.inputLabel}>SEAT (E.G., 22)</Text>
               <View style={styles.textBox}>
                 <Text style={styles.dropdownText}>22</Text>
               </View>
            </View>
          </View>
        </View>
      </View>

      {/* 3. I Want To Swap For Card */}
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

      {/* 4. Find Matches Button */}
      <TouchableOpacity style={styles.findMatchesButton}>
        <Text style={styles.verifyButtonText}>FIND MATCHES</Text>
        <Feather name="search" size={18} color={COLORS.white} style={{marginLeft: 8}} />
      </TouchableOpacity>

      {/* 5. MATCH REQUESTS Header */}
      <View style={styles.requestsHeaderRow}>
        <Text style={styles.requestsHeaderText}>MATCH REQUESTS</Text>
        <View style={styles.requestsHeaderLine} />
      </View>

      {/* 6. Match Request Cards */}
      <MatchRequestCard current="SU" offered="LB" from="B2/45" />
      <MatchRequestCard current="SU" offered="SL" from="B1/12" />

      {/* 7. Footer text */}
      <View style={styles.verifiedFooter}>
        <Feather name="lock" size={14} color={COLORS.textGray} style={styles.footerIcon} />
        <Text style={styles.verifiedFooterText}>
          Your seat details are only shared with verified PNR holders once a match is found. BharatPath ensures end-to-end identity validation for a secure travel exchange.
        </Text>
      </View>

    </View>
  );
};

const MatchRequestCard = ({current, offered, from}: {current: string, offered: string, from: string}) => (
  <View style={styles.matchCard}>
     <View style={[styles.infoLeftBorder, {backgroundColor: COLORS.primary}]} />
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
           <TouchableOpacity style={styles.actionAcceptBtn}>
             <Text style={styles.actionAcceptText}>ACCEPT SWAP</Text>
           </TouchableOpacity>
        </View>
     </View>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 16 : 16,
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
  
  // -- Verified UI Styles --
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
