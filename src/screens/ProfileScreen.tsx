import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions, RefreshControl, Platform, Linking, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { BottomNav } from '../components/Navigation/BottomNav';
import { fetchActiveSeatRequest, fetchUserActivity } from '../services/profileService';

const { width } = Dimensions.get('window');

const COLORS = {
  primary: '#1A237E', 
  white: '#FFFFFF',
  background: '#F8F9FA',
  divider: '#F3F3F3',
  tintGreen: '#E8F5E9',
  emerald: '#2E7D32',
  saffron: '#FF9F43',
  danger: '#C62828',
  textDark: '#1A1C1C',
  textSecondary: '#44474E',
  metadata: '#74777F',
  badgeAccepted: '#DCFCE7',
  badgeAcceptedText: '#16A34A',
  badgeIgnored: '#F1F5F9',
  badgeIgnoredText: '#64748B'
};

const ANDROID_ID = 'com.bharatpath.app';
const IOS_ID = '1234567890'; // placeholder

export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const [user, setUser] = useState<any>(null);
  const [email, setEmail] = useState<string>('Guest');
  const [initials, setInitials] = useState<string>('?');
  const [fullName, setFullName] = useState<string>('Not logged in');
  
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [activeRequest, setActiveRequest] = useState<any>(null);
  const [activityList, setActivityList] = useState<any[]>([]);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const loadProfileData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setUser(null);
        setEmail('No email');
        setFullName('You are not logged in');
        setInitials('?');
        setIsLoading(false);
        return;
      }

      setUser(user);
      const userEmail = user.email || '';
      setEmail(userEmail);
      
      // Derived name logic
      const name = userEmail.split('@')[0];
      setFullName(name);
      setInitials(name.substring(0, 2).toUpperCase() || 'U');

      // Fetch dynamic data relying solely on auth scope bindings
      const [reqResponse, matchResponse] = await Promise.all([
        fetchActiveSeatRequest(),
        fetchUserActivity()
      ]);

      if (reqResponse.error || matchResponse.error) {
        Alert.alert("Error", "Something went wrong fetching data. Try again.");
      } else {
        setActiveRequest(reqResponse.data);
        setActivityList(matchResponse.data);
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Something went wrong. Try again.");
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      loadProfileData();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProfileData();
    setRefreshing(false);
  };

  const handleLogout = () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Yes, Logout",
          style: "destructive",
          onPress: async () => {
            try {
              await supabase.auth.signOut();
              setUser(null);
              navigation.reset({
                index: 0,
                routes: [{ name: "Profile" }]
              });
            } catch (err) {
              Alert.alert("Error", "Failed to logout");
            }
          }
        }
      ]
    );
  };

  const deleteAccount = async () => {
    try {
      setIsDeleting(true);

      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      if (!token) throw new Error("No active session");

      const res = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/delete-user-account`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Delete failed");
      }

      await supabase.auth.signOut();

      navigation.reset({
        index: 0,
        routes: [{ name: "Profile" }]
      });

    } catch (err: any) {
      Alert.alert("Error", err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "This will permanently delete your account and all your data. This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: deleteAccount
        }
      ]
    );
  };

  const handleRateUs = () => {
    if (Platform.OS === 'android') {
      Linking.openURL(`market://details?id=${ANDROID_ID}`);
    } else {
      Linking.openURL(`itms-apps://itunes.apple.com/app/id${IOS_ID}`);
    }
  };

  const renderSkeletonCard = () => (
    <View style={[styles.card, { padding: 24, height: 160, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F1F5F9' }]}>
      <ActivityIndicator size="large" color={COLORS.primary} />
      <Text style={{ marginTop: 12, color: COLORS.textSecondary, fontWeight: '700' }}>Syncing BharatPath Servers...</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* HEADER SECTION (Always Visible) */}
      <View style={styles.header}>
        <View>
          <View style={styles.headerTitleRow}>
            <Feather name="user" size={18} color={COLORS.white} />
            <Text style={styles.headerTitle}>Profile</Text>
          </View>
          <Text style={styles.headerSubtitle}>Manage your account & activity</Text>
        </View>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
      >
        {/* USER INFO CARD (Secure Guard Layer) */}
        {!user ? (
           <View style={[styles.card, styles.userInfoCard, { flexDirection: 'column', alignItems: 'center' }]}>
             <View style={[styles.avatarBox, { backgroundColor: '#E2E8F0', marginBottom: 12, marginRight: 0 }]}>
               <Text style={[styles.avatarText, { color: COLORS.textSecondary }]}>{initials}</Text>
             </View>
             <Text style={[styles.userName, { marginBottom: 4 }]}>{fullName}</Text>
             
             <TouchableOpacity 
               style={{ backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, marginTop: 16 }}
               onPress={() => navigation.navigate('Auth')}
             >
               <Text style={{ color: COLORS.white, fontWeight: '900', letterSpacing: 1 }}>LOGIN / SIGNUP</Text>
             </TouchableOpacity>
           </View>
        ) : (
          <View style={[styles.card, styles.userInfoCard]}>
            <View style={[styles.avatarBorder, { backgroundColor: COLORS.primary }]} />
            <View style={[styles.avatarBox, { backgroundColor: COLORS.primary }]}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <View>
              <Text style={styles.userName}>{fullName}</Text>
              <Text style={styles.userEmail}>{email}</Text>
            </View>
          </View>
        )}

        {/* PROTECTED LAYOUT CONTENT (Skeleton blocked dynamically) */}
        {isLoading ? (
          <>
            <View style={{ marginBottom: 32 }}>{renderSkeletonCard()}</View>
            <View style={{ marginBottom: 32 }}>{renderSkeletonCard()}</View>
          </>
        ) : (
          <View style={{ opacity: user ? 1 : 0.4 }} pointerEvents={user ? 'auto' : 'none'}>
            
            {/* VERIFICATION CARD */}
            {user && (
              <View style={[styles.card, styles.verificationCard, { backgroundColor: COLORS.tintGreen }]}>
                <View style={[styles.avatarBorder, { backgroundColor: COLORS.emerald }]} />
                <MaterialCommunityIcons name="check-decagram" size={20} color={COLORS.emerald} style={styles.verificationIcon} />
                <View style={styles.verificationTextWrap}>
                  <Text style={styles.verificationTitle}>PNR VERIFIED</Text>
                  <Text style={styles.verificationSubtitle}>Your identity is verified for secure seat exchange. This ensures trust within the BharatPath community.</Text>
                </View>
              </View>
            )}

            {/* ACTIVE SEAT REQUEST */}
            <Text style={styles.sectionHeading}>ACTIVE SEAT REQUEST</Text>
            {!activeRequest ? (
              <View style={[styles.card, { padding: 32, alignItems: 'center', marginBottom: 32, borderWidth: 1, borderColor: COLORS.divider, borderStyle: 'dashed' }]}>
                <MaterialCommunityIcons name="ticket-outline" size={32} color={COLORS.textSecondary} style={{ marginBottom: 16 }} />
                <Text style={{ fontSize: 16, fontWeight: '900', color: COLORS.textDark, marginBottom: 8 }}>No active seat request</Text>
                <Text style={{ fontSize: 12, color: COLORS.textSecondary, textAlign: 'center' }}>Create a request to find matches and swap your seats instantly.</Text>
              </View>
            ) : (
              <View style={[styles.card, styles.seatRequestCard, { backgroundColor: COLORS.primary }]}>
                <View style={styles.seatRequestTopRow}>
                  <View>
                    <Text style={styles.cardLabelText}>TRAIN NUMBER</Text>
                    <Text style={styles.cardValueTextLarge}>{activeRequest.train_number || 'Unknown'}</Text>
                  </View>
                  <View style={styles.alignEnd}>
                    <Text style={styles.cardLabelText}>JOURNEY DATE</Text>
                    <Text style={styles.cardValueTextMedium}>{activeRequest.journey_date || 'Unknown'}</Text>
                  </View>
                </View>
                
                <View style={styles.seatSwapBox}>
                  <View>
                    <Text style={styles.swapLabelText}>CURRENT</Text>
                    <Text style={styles.swapValueText}>{activeRequest.coach || 'B1'} - {activeRequest.seat_no || '22'}</Text>
                    <Text style={styles.swapSubText}>{activeRequest.berth_type || 'SU'}</Text>
                  </View>
                  <MaterialCommunityIcons name="swap-horizontal" size={24} color={COLORS.saffron} />
                  <View style={styles.alignEnd}>
                    <Text style={styles.swapLabelText}>PREFERRED</Text>
                    <Text style={[styles.swapValueText, { marginTop: 8 }]}>{activeRequest.preference || 'LB'}</Text>
                  </View>
                </View>
              </View>
            )}

            {/* MY ACTIVITY */}
            <Text style={styles.sectionHeading}>MY ACTIVITY</Text>
            {activityList.length === 0 ? (
              <View style={[styles.card, { padding: 32, alignItems: 'center', marginBottom: 32 }]}>
                 <Text style={{ fontSize: 16, fontWeight: '900', color: COLORS.textDark, marginBottom: 8 }}>No activity yet</Text>
                 <Text style={{ fontSize: 12, color: COLORS.textSecondary }}>Your seat swaps will appear here</Text>
              </View>
            ) : (
              <View style={[styles.card, styles.activityList]}>
                {activityList.map((act, index) => {
                  const isAccepted = act.status === 'ACCEPTED' || act.status === 'COMPLETED';
                  const badgeBg = isAccepted ? COLORS.badgeAccepted : COLORS.badgeIgnored;
                  const badgeTxt = isAccepted ? COLORS.badgeAcceptedText : COLORS.badgeIgnoredText;
                  const label = isAccepted ? 'ACCEPTED' : (act.status || 'IGNORED');
                  const isLast = index === activityList.length - 1;

                  return (
                    <View key={act.id} style={[
                      styles.activityItem, 
                      isLast ? { borderBottomLeftRadius: 20, borderBottomRightRadius: 20, backgroundColor: '#F9FAFB' } : { borderColor: COLORS.divider, borderBottomWidth: 1 }
                    ]}>
                      <View style={styles.activityItemLeft}>
                        <View style={[styles.activityIconWrap, { backgroundColor: isLast ? '#E2E8F0' : '#F1F5F9' }]}>
                          <MaterialCommunityIcons name="history" size={20} color={COLORS.primary} />
                        </View>
                        <View>
                          <Text style={styles.activityTitle}>{act.from_berth} → {act.to_berth}</Text>
                          <Text style={styles.activityMeta}>Coach {act.my_coach} • {new Date(act.created_at).toLocaleDateString()}</Text>
                        </View>
                      </View>
                      <View style={[styles.badge, { backgroundColor: badgeBg, borderColor: isAccepted ? badgeBg : '#E5E7EB', borderWidth: 1 }]}>
                         <Text style={[styles.badgeText, { color: badgeTxt }]}>{label}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {/* ACTIONS MENU */}
            <View style={[styles.card, styles.actionsMenu]}>
              <TouchableOpacity style={[styles.menuItem, { borderColor: COLORS.divider }]} onPress={handleRateUs}>
                <View style={styles.menuItemLeft}>
                  <MaterialIcons name="star" size={22} color={COLORS.textSecondary} style={styles.menuIcon} />
                  <Text style={[styles.menuText, { color: COLORS.textDark }]}>Rate Us</Text>
                </View>
                <Feather name="chevron-right" size={18} color={COLORS.metadata} />
              </TouchableOpacity>

              <TouchableOpacity style={[styles.menuItem, { borderColor: COLORS.divider }]} onPress={handleLogout}>
                <View style={styles.menuItemLeft}>
                  <MaterialCommunityIcons name="logout" size={22} color={COLORS.textSecondary} style={styles.menuIcon} />
                  <Text style={[styles.menuText, { color: COLORS.textDark }]}>Logout</Text>
                </View>
                <Feather name="chevron-right" size={18} color={COLORS.metadata} />
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.menuItem, { borderBottomWidth: 0, opacity: isDeleting ? 0.5 : 1 }]}
                onPress={handleDeleteAccount}
                disabled={isDeleting}
              >
                <View style={styles.menuItemLeft}>
                  {isDeleting ? (
                    <ActivityIndicator size="small" color={COLORS.danger} style={[styles.menuIcon, { marginRight: 22 }]} />
                  ) : (
                    <MaterialCommunityIcons name="delete" size={22} color={COLORS.danger} style={styles.menuIcon} />
                  )}
                  <Text style={[styles.menuText, { color: COLORS.danger }]}>Delete Account</Text>
                </View>
                <Feather name="chevron-right" size={18} color={COLORS.danger} />
              </TouchableOpacity>
            </View>

            {/* SECURITY FOOTER */}
            <View style={styles.footerWrap}>
              <MaterialCommunityIcons name="lock" size={12} color={COLORS.metadata} style={styles.footerIcon} />
              <Text style={styles.footerText}>
                YOUR DATA IS SECURE. SEAT EXCHANGE REQUIRES VERIFIED PNR.
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Global Navbar */}
      <BottomNav activeTab="PROFILE" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.primary },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 96,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    backgroundColor: COLORS.primary,
  },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  headerTitle: { color: COLORS.white, fontWeight: '900', fontSize: 18, marginLeft: 8, letterSpacing: 0.5 },
  headerSubtitle: { color: '#BFDBFE', fontSize: 10, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
  headerIcon: { padding: 8, marginRight: -8 },
  
  scrollView: { backgroundColor: COLORS.background, marginTop: -60, paddingHorizontal: 16 },
  scrollContent: { paddingBottom: 60 },
  
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    shadowColor: '#1A237E',
    shadowOpacity: 0.04,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
    overflow: 'hidden',
  },
  
  userInfoCard: { padding: 20, flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  avatarBorder: { position: 'absolute', left: 0, top: 20, bottom: 20, width: 4, borderTopRightRadius: 4, borderBottomRightRadius: 4 },
  avatarBox: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  avatarText: { color: COLORS.white, fontWeight: '900', fontSize: 18 },
  userName: { fontWeight: '900', fontSize: 18, color: COLORS.textDark },
  userEmail: { color: COLORS.textSecondary, fontSize: 12, marginTop: 2 },
  
  verificationCard: { padding: 20, flexDirection: 'row', alignItems: 'flex-start', marginBottom: 32 },
  verificationIcon: { marginRight: 12, marginTop: 2 },
  verificationTextWrap: { flex: 1 },
  verificationTitle: { color: COLORS.emerald, fontWeight: '900', fontSize: 12, marginBottom: 4, letterSpacing: 1 },
  verificationSubtitle: { color: COLORS.emerald, fontSize: 12, lineHeight: 20 },
  
  sectionHeading: { color: COLORS.textSecondary, fontSize: 10, fontWeight: '900', letterSpacing: 1, marginBottom: 12, marginLeft: 4 },
  
  seatRequestCard: { padding: 24, marginBottom: 32 },
  seatRequestTopRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 32 },
  cardLabelText: { color: '#BFDBFE', fontSize: 10, fontWeight: '900', letterSpacing: 1, marginBottom: 4 },
  cardValueTextLarge: { color: COLORS.white, fontSize: 24, fontWeight: '900' },
  cardValueTextMedium: { color: COLORS.white, fontSize: 18, fontWeight: '700' },
  alignEnd: { alignItems: 'flex-end' },
  seatSwapBox: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  swapLabelText: { color: '#BFDBFE', fontSize: 9, fontWeight: '900', letterSpacing: 1, marginBottom: 4 },
  swapValueText: { color: COLORS.white, fontSize: 16, fontWeight: '900' },
  swapSubText: { color: COLORS.white, fontWeight: '700' },
  
  activityList: { marginBottom: 32 },
  activityItem: { padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  activityItemLeft: { flexDirection: 'row', alignItems: 'center' },
  activityIconWrap: { padding: 8, borderRadius: 20, marginRight: 16 },
  activityTitle: { color: COLORS.textDark, fontWeight: '900', fontSize: 13, marginBottom: 2 },
  activityMeta: { color: COLORS.metadata, fontSize: 10, fontWeight: '700', textTransform: 'lowercase' },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  badgeText: { fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  
  actionsMenu: { marginBottom: 32 },
  menuItem: { padding: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1 },
  menuItemLeft: { flexDirection: 'row', alignItems: 'center' },
  menuIcon: { marginRight: 16 },
  menuText: { fontWeight: '900' },
  
  footerWrap: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center', paddingHorizontal: 16, marginTop: 8, marginBottom: 32 },
  footerIcon: { marginTop: 2, marginRight: 8 },
  footerText: { color: COLORS.metadata, fontSize: 9, fontWeight: '900', letterSpacing: 1, textAlign: 'center', lineHeight: 16, maxWidth: 250 }
});
