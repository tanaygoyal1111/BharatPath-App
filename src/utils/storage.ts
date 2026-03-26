import AsyncStorage from '@react-native-async-storage/async-storage';

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
