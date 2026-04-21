import { Alert, Linking } from 'react-native';
import * as SMS from 'expo-sms';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getJourneyData } from './storage';

export type IssueType = 'cleaning' | 'medical' | 'security' | 'electrical';

/**
 * Helper to format the current date or a given date string into DDMMYYYY for IRCTC protocols.
 * Used for DOJ (Date of Journey) field.
 */
const formatDOJ = (date?: string | Date) => {
  const d = date ? new Date(date) : new Date();
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}${month}${year}`;
};

/**
 * Resolves journey data for complaint SMS body generation.
 * Priority: journey_data (legacy) → @active_pnr + active_journey (centralized)
 */
const resolveJourneyData = async (): Promise<any | null> => {
  // Priority 1: Legacy journey_data storage
  const data = await getJourneyData();
  if (data && data.pnr && data.pnr !== 'UNKNOWN') return data;

  // Priority 2: Centralized @active_pnr + active_journey cache
  try {
    const storedPnr = await AsyncStorage.getItem('@active_pnr');
    if (!storedPnr) return null;

    const activeJourneyRaw = await AsyncStorage.getItem('active_journey');
    if (activeJourneyRaw) {
      const parsed = JSON.parse(activeJourneyRaw);
      const journey = parsed.journey || parsed;
      return { ...journey, pnr: storedPnr, statusTag: journey.statusTag || 'ACTIVE' };
    }

    // PNR exists but no journey cache — return minimal data
    return { pnr: storedPnr, statusTag: 'ACTIVE' };
  } catch (e) {
    console.error('[complaintEngine] Failed to resolve journey data:', e);
    return null;
  }
};

/**
 * Triggers an official SMS string generation targeting IRCTC numbers.
 * @param issueType The category of the complaint mapped to IRCTC protocols.
 * @param customMessage Optional message appendage for security disputes.
 */
export const triggerOfficialComplaint = async (issueType: IssueType, navigation: any, customMessage: string = '') => {
  try {
    const data = await resolveJourneyData();
    
    if (!data || !data.pnr || data.pnr === 'UNKNOWN') {
      Alert.alert(
        'Missing Journey Data', 
        'Please enter your PNR on the home screen first to use the SOS feature.',
        [{ text: 'OK', onPress: () => navigation.navigate('Dashboard') }]
      );
      return;
    }

    // Inactive Journey Validation
    if (data.statusTag !== 'ON TIME' && data.statusTag !== 'BOARDED' && data.statusTag !== 'ACTIVE') {
      Alert.alert(
        'Invalid Journey',
        'Complaints can only be registered during an active, ongoing journey to prevent spamming the RailMadad system.'
      );
      return;
    }

    const doj = formatDOJ(); 
    let targetNumber = '139';
    let messageBody = '';

    switch (issueType) {
      case 'cleaning':
        // RailMadad standard is 139 for all complaints
        targetNumber = '139'; 
        messageBody = `MADAD PNR:${data.pnr} TRAIN:${data.trainNo || '00000'} DOJ:${doj} COACH:${data.coach || 'XX'} ISSUE:CLEANLINESS DESC:Coach/toilet dirty not cleaned`;
        break;
      case 'electrical':
        messageBody = `MADAD PNR:${data.pnr} TRAIN:${data.trainNo || '00000'} DOJ:${doj} COACH:${data.coach || 'XX'} SEAT:${data.seat || '00'} ISSUE:ELECTRICAL DESC:AC/charging/light not working`;
        break;
      case 'security':
        const secDesc = customMessage || "Seat occupied by another passenger";
        messageBody = `MADAD PNR:${data.pnr} TRAIN:${data.trainNo || '00000'} DOJ:${doj} COACH:${data.coach || 'XX'} SEAT:${data.seat || '00'} ISSUE:SEAT DESC:${secDesc}`;
        break;
      case 'medical':
        messageBody = `MADAD MEDICAL EMERGENCY. PNR ${data.pnr}, Coach ${data.coach || 'XX'}, Seat ${data.seat || '00'}. Send Doctor.`;
        break;
      default:
        Alert.alert('Error', 'Invalid complaint category.');
        return;
    }

    const isAvailable = await SMS.isAvailableAsync();
    
    if (isAvailable) {
      await SMS.sendSMSAsync([targetNumber], messageBody);
    } else {
      Alert.alert('SMS Unavailable', 'Your device does not support SMS messaging.');
    }
  } catch (error) {
    console.error('Failed to trigger official complaint:', error);
    Alert.alert('Error', 'Unable to process the complaint request at this time.');
  }
};

/**
 * Triggers a direct dial to a specific phone number using React Native Linking.
 * @param phoneNumber The target emergency hotline (e.g., '139').
 */
export const triggerEmergencyCall = async (phoneNumber: string) => {
  const url = `tel:${phoneNumber}`;
  try {
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    } else {
      Alert.alert('Dialer Unavailable', `Your device does not support phone calls. Please manually dial ${phoneNumber}.`);
    }
  } catch (error) {
    console.error('Failed to open dialer:', error);
    Alert.alert('Error', 'An unexpected error occurred while attempting to dial.');
  }
};

