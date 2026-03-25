import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Platform, StatusBar, Modal, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Feather, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { triggerOfficialComplaint, triggerEmergencyCall, IssueType } from '../utils/complaintEngine';
import { saveJourneyData, getJourneyData } from '../utils/storage';

const COLORS = {
  primary: '#1A237E', // Deep Reliability Indigo
  white: '#FFFFFF', 
  background: '#F8F9FA', // Off-white/light gray app bg
  warningOrange: '#EA580C', // Heavy orange
  medicalBlueBg: '#E0F2FE', // Light blue bg
  surface: '#FFFFFF', // Card bg
  textDark: '#1A1C1C', 
  textGray: '#64748B',
  borderLight: '#F1F5F9', // light gray border
  iconBg: '#F1F5F9', 
};

export default function HelpScreen() {
  const navigation = useNavigation();
  const [showPnrModal, setShowPnrModal] = React.useState(false);
  const [pnrInput, setPnrInput] = React.useState('');
  const [activePnr, setActivePnr] = React.useState<string | null>(null);
  const [pendingIssue, setPendingIssue] = React.useState<IssueType | null>(null);

  React.useEffect(() => {
    loadActivePnr();
  }, []);

  const loadActivePnr = async () => {
    const data = await getJourneyData();
    if (data?.pnr && data.pnr !== 'UNKNOWN') {
      setActivePnr(data.pnr);
      setPnrInput(data.pnr);
    }
  };

  const handleComplaintTap = async (issueType: IssueType) => {
    const data = await getJourneyData();
    if (!data || !data.pnr || data.pnr === 'UNKNOWN') {
      setPendingIssue(issueType);
      setShowPnrModal(true);
    } else {
      triggerOfficialComplaint(issueType, navigation);
    }
  };

  const handlePnrSubmit = async () => {
    if (pnrInput.length !== 10) {
      Alert.alert('Invalid PNR', 'Please enter a valid 10-digit PNR.');
      return;
    }

    // Securely persist to disk
    const existingData = await getJourneyData();
    await saveJourneyData({ ...existingData, pnr: pnrInput });
    setActivePnr(pnrInput);
    setShowPnrModal(false);
    
    // Auto-trigger the complaint 
    if (pendingIssue) {
      setTimeout(() => {
        triggerOfficialComplaint(pendingIssue, navigation);
        setPendingIssue(null);
      }, 500); 
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>SOS & HELP</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Active Journey Badge */}
      {activePnr && (
        <View style={styles.activePnrBadge}>
          <View style={styles.pnrInfoRow}>
            <MaterialCommunityIcons name="ticket-confirmation" size={16} color={COLORS.primary} />
            <Text style={styles.activePnrText}>JOURNEY PNR: {activePnr}</Text>
          </View>
          <TouchableOpacity 
            style={styles.editPnrBtn} 
            onPress={() => {
              setPendingIssue(null); // No auto-trigger on manual edit
              setShowPnrModal(true);
            }}
          >
            <Text style={styles.editPnrText}>EDIT</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Offline Ready Banner */}
        <View style={styles.offlineBanner}>
          <MaterialCommunityIcons name="signal-cellular-outline" size={16} color={COLORS.textGray} />
          <Text style={styles.offlineBannerText}>OFFLINE-READY: SMS REPORTING IS ACTIVE.</Text>
        </View>

        {/* Emergency SOS */}
        <Text style={styles.sectionTitle}>EMERGENCY SOS</Text>
        <View style={styles.sosGrid}>
          <TouchableOpacity style={styles.sosCard} onPress={() => triggerEmergencyCall('139')}>
            <View style={styles.sosIconBoxOrange}>
              <MaterialIcons name="phone" size={20} color={COLORS.white} />
              <Text style={styles.sosNumber}>139</Text>
            </View>
            <Text style={styles.sosCardTitle}>Railway Helpline</Text>
            <Text style={styles.sosCardSubtitle}>24/7 Security & Fire</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.sosCard} onPress={() => handleComplaintTap('medical')}>
            <View style={styles.sosIconBoxBlue}>
              <Feather name="plus" size={24} color={COLORS.primary} />
              <Text style={styles.sosMedicalText}>MEDICAL</Text>
            </View>
            <Text style={styles.sosCardTitle}>Emergency SOS</Text>
            <Text style={styles.sosCardSubtitle}>First Aid Assistance</Text>
          </TouchableOpacity>
        </View>

        {/* Auto-Fill SMS Reports */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitleNoMargin}>AUTO-FILL SMS REPORTS</Text>
          <View style={styles.smsTag}>
            <Text style={styles.smsTagText}>NO INTERNET REQ.</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.listItem} onPress={() => handleComplaintTap('cleaning')}>
          <View style={styles.listIconBox}>
            <MaterialCommunityIcons name="spray-bottle" size={24} color={COLORS.primary} />
          </View>
          <View style={styles.listTextWrap}>
            <Text style={styles.listTitle}>Coach Cleanliness</Text>
            <Text style={styles.listSubtitle}>Generates SMS with Coach B4, Seat 22 & Location</Text>
          </View>
          <MaterialCommunityIcons name="message-processing" size={24} color="#94A3B8" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.listItem} onPress={() => handleComplaintTap('electrical')}>
          <View style={styles.listIconBox}>
            <MaterialCommunityIcons name="snowflake" size={24} color={COLORS.primary} />
          </View>
          <View style={styles.listTextWrap}>
            <Text style={styles.listTitle}>AC / Electrical Issue</Text>
            <Text style={styles.listSubtitle}>Generates SMS with Coach B4, Seat 22 & Location</Text>
          </View>
          <MaterialCommunityIcons name="message-processing" size={24} color="#94A3B8" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.listItem} onPress={() => handleComplaintTap('security')}>
          <View style={styles.listIconBox}>
            <MaterialCommunityIcons name="seat-passenger" size={24} color={COLORS.primary} />
          </View>
          <View style={styles.listTextWrap}>
            <Text style={styles.listTitle}>Seat Dispute</Text>
            <Text style={styles.listSubtitle}>Generates SMS with Coach B4, Seat 22 & Location</Text>
          </View>
          <MaterialCommunityIcons name="message-processing" size={24} color="#94A3B8" />
        </TouchableOpacity>

        {/* Online Services */}
        <Text style={[styles.sectionTitle, { marginTop: 32 }]}>ONLINE SERVICES</Text>
        <TouchableOpacity style={styles.onlineCard}>
          <View style={styles.listIconBox}>
            <Feather name="globe" size={24} color={COLORS.primary} />
          </View>
          <View style={styles.listTextWrap}>
            <Text style={[styles.listTitle, { color: COLORS.primary }]}>RailMadad Portal</Text>
            <Text style={styles.listSubtitle}>Requires active internet connection</Text>
          </View>
          <Feather name="arrow-up-right" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={showPnrModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setShowPnrModal(false)} />
          <View style={styles.modalContent}>
            {/* Bottom Sheet Handle */}
            <View style={styles.sheetHandle} />
            
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>IDENTIFICATION REQ.</Text>
            </View>
            
            <Text style={styles.modalDesc}>
              To file an official complaint via SMS, we need to verify your 10-digit PNR for the automated IRCTC parsing system.
            </Text>

            <View style={styles.pnrInputWrapper}>
              <MaterialCommunityIcons name="ticket" size={20} color={COLORS.primary} style={styles.pnrIcon} />
              <TextInput
                style={styles.pnrInputText}
                placeholder="Enter 10-digit PNR"
                placeholderTextColor={COLORS.textGray}
                keyboardType="number-pad"
                maxLength={10}
                value={pnrInput}
                onChangeText={setPnrInput}
              />
            </View>

            <TouchableOpacity style={styles.submitButton} onPress={handlePnrSubmit}>
              <Text style={styles.submitButtonText}>VERIFY & SEND REPORT</Text>
              <Feather name="arrow-right" size={20} color={COLORS.white} />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.white,
    paddingTop: 16,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: { padding: 8 },
  headerTitle: { color: COLORS.primary, fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 },
  
  offlineBanner: {
    backgroundColor: '#F1F5F9', borderRadius: 8, paddingVertical: 12, paddingHorizontal: 16,
    flexDirection: 'row', alignItems: 'center', marginBottom: 24,
  },
  offlineBannerText: { color: COLORS.textGray, fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginLeft: 8 },

  sectionTitle: { fontSize: 12, fontWeight: '800', color: COLORS.textGray, letterSpacing: 1, marginBottom: 16 },
  sectionTitleNoMargin: { fontSize: 12, fontWeight: '800', color: COLORS.textGray, letterSpacing: 1 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 32, marginBottom: 16 },
  
  sosGrid: { flexDirection: 'row', justifyContent: 'space-between', marginHorizontal: -6 },
  sosCard: {
    flex: 1, backgroundColor: COLORS.white, borderRadius: 16, padding: 16, alignItems: 'center',
    marginHorizontal: 6, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 2,
  },
  sosIconBoxOrange: { width: '100%', aspectRatio: 1, backgroundColor: COLORS.warningOrange, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  sosIconBoxBlue: { width: '100%', aspectRatio: 1, backgroundColor: COLORS.medicalBlueBg, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  sosNumber: { color: COLORS.white, fontSize: 32, fontWeight: '900', marginTop: 8 },
  sosMedicalText: { color: COLORS.primary, fontSize: 18, fontWeight: '900', marginTop: 8 },
  sosCardTitle: { color: COLORS.primary, fontSize: 13, fontWeight: '800', textAlign: 'center' },
  sosCardSubtitle: { color: COLORS.textGray, fontSize: 10, fontWeight: '600', marginTop: 4, textAlign: 'center' },

  smsTag: { backgroundColor: '#E2E8F0', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  smsTagText: { fontSize: 9, color: COLORS.primary, fontWeight: '800', letterSpacing: 0.5 },

  listItem: {
    backgroundColor: COLORS.white, borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 12,
    shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 1,
  },
  listIconBox: { width: 44, height: 44, backgroundColor: COLORS.iconBg, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  listTextWrap: { flex: 1, marginHorizontal: 16 },
  listTitle: { color: COLORS.textDark, fontSize: 14, fontWeight: '800', marginBottom: 4 },
  listSubtitle: { color: COLORS.textGray, fontSize: 11, fontWeight: '600', lineHeight: 16, paddingRight: 8 },

  onlineCard: {
    backgroundColor: COLORS.white, borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center',
    borderWidth: 2, borderColor: COLORS.primary, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 2,
  },
  
  // Modal Styles
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(26,28,28,0.7)', justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white, borderTopLeftRadius: 32, borderTopRightRadius: 32,
    paddingHorizontal: 28, paddingTop: 12, paddingBottom: Platform.OS === 'ios' ? 44 : 32,
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 20, elevation: 10,
  },
  sheetHandle: {
    width: 40, height: 4, backgroundColor: '#E2E8F0', borderRadius: 2,
    alignSelf: 'center', marginBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  modalTitle: {
    fontSize: 13, fontWeight: '900', color: COLORS.primary, letterSpacing: 1.5,
  },
  modalDesc: {
    fontSize: 13, color: COLORS.textGray, lineHeight: 20, marginBottom: 28, fontWeight: '600', textAlign: 'center',
  },
  pnrInputWrapper: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', borderRadius: 16, 
    paddingHorizontal: 20, paddingVertical: 18, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 28,
  },
  pnrIcon: { marginRight: 16 },
  pnrInputText: {
    flex: 1, fontSize: 18, fontWeight: '800', color: COLORS.textDark, letterSpacing: 2,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  submitButton: {
    backgroundColor: COLORS.primary, borderRadius: 18, paddingVertical: 20,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    shadowColor: COLORS.primary, shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4,
  },
  submitButtonText: {
    color: COLORS.white, fontWeight: '900', fontSize: 13, letterSpacing: 1, marginRight: 10,
  },
  // PNR Badge Styles
  activePnrBadge: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#EEF2FF', paddingHorizontal: 20, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#E0E7FF',
  },
  pnrInfoRow: {
    flexDirection: 'row', alignItems: 'center',
  },
  activePnrText: {
    fontSize: 11, fontWeight: '800', color: COLORS.primary, marginLeft: 8, letterSpacing: 0.5,
  },
  editPnrBtn: {
    backgroundColor: COLORS.white, paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 8, borderWidth: 1, borderColor: '#C7D2FE',
  },
  editPnrText: {
    fontSize: 10, fontWeight: '900', color: COLORS.primary,
  },
});
