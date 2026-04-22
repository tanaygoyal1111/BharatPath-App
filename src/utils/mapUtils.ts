import { Linking, Platform, Alert } from 'react-native';

/**
 * Interface for location data. Supports both Overpass and generic mappings.
 */
export interface PlaceLocation {
  name?: string;
  lat: number;
  lon?: number;
  [key: string]: any; // To allow for additional properties like 'lng'
}

/**
 * Utility to open coordinates in the best available map application.
 * - Android: Google Maps App ('geo:' protocol)
 * - iOS: Google Maps App (if installed, 'comgooglemaps:' protocol)
 * - iOS Fallback: Apple Maps App ('http://maps.apple.com/' protocol)
 * - Final Fallback: Browser-based Google Maps
 * 
 * @param place Object containing lat, lon, and name
 */
export const openInMaps = async (place: PlaceLocation) => {
  try {
    const lat = place?.lat;
    const lon = place?.lon || (place as any).lng;
    const name = place?.name || "Destination";

    // VALIDATION: Ensure we have numeric coordinates
    if (typeof lat !== 'number' || typeof lon !== 'number') {
      Alert.alert("Error", "Invalid location data");
      return;
    }

    const label = encodeURIComponent(name);

    // URL SCHEMES
    // Google Maps URL scheme for iOS: https://developers.google.com/maps/documentation/urls/ios-urlscheme
    const googleMapsIOS = `comgooglemaps://?q=${lat},${lon}(${label})`;
    
    // Android Geo URI: https://developer.android.com/guide/components/intents-common#Maps
    const androidGeo = `geo:${lat},${lon}?q=${lat},${lon}(${label})`;
    
    // Apple Maps URL: https://developer.apple.com/library/archive/featuredarticles/iPhoneURLScheme_Reference/MapLinks/MapLinks.html
    const appleMaps = `http://maps.apple.com/?ll=${lat},${lon}&q=${label}`;
    
    // Browser Fallback (Universal)
    const browserFallback = `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;

    // ANDROID FLOW
    if (Platform.OS === 'android') {
      return Linking.openURL(androidGeo);
    }

    // iOS FLOW
    const canOpenGoogle = await Linking.canOpenURL(googleMapsIOS);

    if (canOpenGoogle) {
      return Linking.openURL(googleMapsIOS);
    }

    // Fallback to Apple Maps, which is always installed on iOS
    return Linking.openURL(appleMaps);

  } catch (error) {

    // FINAL FALLBACK: Attempt browser-based maps if deep linking failed
    if (place?.lat && (place?.lon || (place as any).lng)) {
      const fallback = `https://www.google.com/maps/search/?api=1&query=${place.lat},${place.lon || (place as any).lng}`;
      Linking.openURL(fallback);
    } else {
      Alert.alert("Error", "Unable to open maps");
    }
  }
};
