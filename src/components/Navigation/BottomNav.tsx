import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useNetInfo } from '@react-native-community/netinfo';

const COLORS = {
  primary: '#1A237E', 
  textDark: '#1E293B', 
  textGray: '#475569', 
  textLightGray: '#94A3B8',
  white: '#FFFFFF', 
  background: '#F8FAFC', 
  bgP2P: '#EEF2FF', 
  warning: '#F59E0B', 
  success: '#10B981',
  inputBg: '#F1F5F9'
};

interface BottomNavProps {
  isOffline?: boolean;
  activeTab?: 'HOME' | 'LIVE_STATUS' | 'SOS_HELP' | 'PROFILE';
}

export const BottomNav = ({ isOffline = false, activeTab = 'HOME' }: BottomNavProps) => {
  const navigation = useNavigation<any>();
  const netInfo = useNetInfo();



  // ── Tab Interceptors ─────────────────────────────────────────────
  const handleLiveStatusPress = () => {
    if (activeTab === 'LIVE_STATUS') return;
    const isCurrentlyOffline = netInfo.isConnected === false;
    if (isCurrentlyOffline) {
      Alert.alert(
        'Connection Required',
        'Live Status requires an active internet connection.',
        [{ text: 'OK', style: 'cancel' }]
      );
      return;
    }
    navigation.navigate('LiveStatus');
  };

  const handleSOSPress = () => {
    if (activeTab === 'SOS_HELP') return;
    
    // Navigation is now unblocked so users can proactively link their PNR
    navigation.navigate('Help', { isOffline });
  };

  return (
    <View style={styles.bottomNav}>
      <TouchableOpacity 
        style={styles.navItemWrap} 
        onPress={() => activeTab !== 'HOME' && navigation.navigate('Dashboard')}
      >
        <View style={activeTab === 'HOME' ? (isOffline ? styles.navHomeActivePillOffline : styles.navHomeActivePillOnline) : {}}>
          <MaterialIcons 
            name="home" 
            size={26} 
            color={activeTab === 'HOME' ? (isOffline ? COLORS.white : COLORS.primary) : COLORS.textLightGray} 
          />
          {activeTab === 'HOME' && isOffline ? <Text style={styles.navTextActivePillOffline}>HOME</Text> : null}
        </View>
        {activeTab === 'HOME' && !isOffline ? <Text style={styles.navTextActiveOnline}>HOME</Text> : null}
        {activeTab !== 'HOME' ? <Text style={styles.navText}>HOME</Text> : null}
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.navItemWrap} 
        onPress={handleLiveStatusPress}
      >
        <View style={activeTab === 'LIVE_STATUS' ? styles.navHomeActivePillOnline : {}}>
          <MaterialIcons 
            name="wifi-tethering" 
            size={24} 
            color={activeTab === 'LIVE_STATUS' ? COLORS.primary : COLORS.textLightGray} 
          />
        </View>
        {activeTab === 'LIVE_STATUS' ? <Text style={styles.navTextActiveOnline}>LIVE STATUS</Text> : <Text style={styles.navText}>LIVE STATUS</Text>}
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.navItemWrap} 
        onPress={handleSOSPress}
      >
        <View style={activeTab === 'SOS_HELP' ? styles.navHomeActivePillOnline : {}}>
          <MaterialIcons 
            name="sos" 
            size={24} 
            color={activeTab === 'SOS_HELP' ? COLORS.primary : COLORS.textLightGray} 
          />
        </View>
        {activeTab === 'SOS_HELP' ? <Text style={styles.navTextActiveOnline}>SOS HELP</Text> : <Text style={styles.navText}>SOS HELP</Text>}
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.navItemWrap}
        onPress={() => activeTab !== 'PROFILE' && navigation.navigate('Profile')}
      >
        <View style={activeTab === 'PROFILE' ? styles.navHomeActivePillOnline : {}}>
          <MaterialIcons 
            name="person-outline" 
            size={26} 
            color={activeTab === 'PROFILE' ? COLORS.primary : COLORS.textLightGray} 
          />
        </View>
        {activeTab === 'PROFILE' ? <Text style={styles.navTextActiveOnline}>PROFILE</Text> : <Text style={styles.navText}>PROFILE</Text>}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  bottomNav: {
    flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center',
    backgroundColor: COLORS.white, paddingTop: 12, paddingBottom: Dimensions.get('window').height > 800 ? 32 : 16,
    borderTopWidth: 1, borderColor: COLORS.inputBg,
  },
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
});
