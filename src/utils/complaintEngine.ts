import { Alert, Linking } from 'react-native';
import * as SMS from 'expo-sms';
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
 * Triggers an official SMS string generation targeting IRCTC numbers.
 * @param issueType The category of the complaint mapped to IRCTC protocols.
 * @param customMessage Optional message appendage for security disputes.
 */
export const triggerOfficialComplaint = async (issueType: IssueType, navigation: any, customMessage: string = '') => {
  try {
    // 1. Fetch live or fallback journey details from our persistent AsyncStorage
    const data = await getJourneyData();
    
    // EDGE CASE 1: Empty Cache
    if (!data || !data.pnr || data.pnr === 'UNKNOWN') {
      Alert.alert(
        'Missing Journey Data', 
        'Please enter your PNR on the home screen first to use the SOS feature.',
        [{ text: 'OK', onPress: () => navigation.navigate('Dashboard') }]
      );
      return;
    }

    // EDGE CASE 2: Inactive Journey Validation
    // Assume active if statusTag is 'ON TIME', 'BOARDED', or 'ACTIVE'
    if (data.statusTag !== 'ON TIME' && data.statusTag !== 'BOARDED' && data.statusTag !== 'ACTIVE') {
      Alert.alert(
        'Invalid Journey',
        'Complaints can only be registered during an active, ongoing journey to prevent spamming the RailMadad system.'
      );
      return;
    }

    // 2. Format precise SMS following the fixed key-value automation pattern
    const doj = formatDOJ(); // Falling back to current date if none provided in journey data
    let targetNumber = '139'; // RailMadad standard
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

    // 3. Verify SMS capability on the physical device
    const isAvailable = await SMS.isAvailableAsync();
    
    if (isAvailable) {
      // 4. Auto-fill the message app
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

