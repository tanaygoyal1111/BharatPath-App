import AsyncStorage from '@react-native-async-storage/async-storage';

// Mentor Comment: We swapped Native C++ MMKV to AsyncStorage.
// Why? Because React Native 0.81.5 (Expo 54) defaults to the Bridgeless New Architecture. 
// Old MMKV JSIs (v2) fail to link (Simulator crash), and new Nitro Modules (v4) crash the prototype engine.
// AsyncStorage provides the necessary 100% stable true on-disk persistence for Phase 1!

export const saveJourneyData = async (data: any) => {
  try {
    const existing = await AsyncStorage.getItem('journey_data');
    const existingParsed = existing ? JSON.parse(existing) : {};
    const merged = { ...existingParsed, ...data };
    await AsyncStorage.setItem('journey_data', JSON.stringify(merged));
  } catch (error) {
    console.error('Error saving journey data to disk', error);
  }
};

export const getJourneyData = async () => {
  try {
    const data = await AsyncStorage.getItem('journey_data');
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error reading journey data from disk', error);
    return null;
  }
};
