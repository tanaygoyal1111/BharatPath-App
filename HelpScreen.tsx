import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Platform, StatusBar } from 'react-native';
import { Feather, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';

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

export default function HelpScreen({ onBack }: { onBack: () => void }) {
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>HELP & SUPPORT</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Offline Ready Banner */}
        <View style={styles.offlineBanner}>
          <MaterialCommunityIcons name="signal-cellular-outline" size={16} color={COLORS.textGray} />
          <Text style={styles.offlineBannerText}>OFFLINE-READY: SMS REPORTING IS ACTIVE.</Text>
        </View>

        {/* Emergency SOS */}
        <Text style={styles.sectionTitle}>EMERGENCY SOS</Text>
        <View style={styles.sosGrid}>
          <TouchableOpacity style={styles.sosCard}>
            <View style={styles.sosIconBoxOrange}>
              <MaterialIcons name="phone" size={20} color={COLORS.white} />
              <Text style={styles.sosNumber}>139</Text>
            </View>
            <Text style={styles.sosCardTitle}>Railway Helpline</Text>
            <Text style={styles.sosCardSubtitle}>24/7 Security & Fire</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.sosCard}>
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

        <TouchableOpacity style={styles.listItem}>
          <View style={styles.listIconBox}>
            <MaterialCommunityIcons name="spray-bottle" size={24} color={COLORS.primary} />
          </View>
          <View style={styles.listTextWrap}>
            <Text style={styles.listTitle}>Coach Cleanliness</Text>
            <Text style={styles.listSubtitle}>Generates SMS with Coach B4, Seat 22 & Location</Text>
          </View>
          <MaterialCommunityIcons name="message-processing" size={24} color="#94A3B8" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.listItem}>
          <View style={styles.listIconBox}>
            <MaterialCommunityIcons name="snowflake" size={24} color={COLORS.primary} />
          </View>
          <View style={styles.listTextWrap}>
            <Text style={styles.listTitle}>AC / Electrical Issue</Text>
            <Text style={styles.listSubtitle}>Generates SMS with Coach B4, Seat 22 & Location</Text>
          </View>
          <MaterialCommunityIcons name="message-processing" size={24} color="#94A3B8" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.listItem}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.white,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 16 : 16,
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
});
