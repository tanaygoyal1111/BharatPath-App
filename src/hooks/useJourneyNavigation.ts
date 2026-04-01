import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { JourneyData } from './usePnrStatus';

type JourneyStatus = 'UPCOMING' | 'ACTIVE' | 'COMPLETED';

interface JourneyNavParams {
  pnr: string;
  trainNumber: string;
  from: { code: string; name: string };
  to: { code: string; name: string };
}

/**
 * Hook to encapsulate journey navigation logic.
 * Provides a safe navigation handler and status-aware button config.
 */
export const useJourneyNavigation = () => {
  const navigation = useNavigation<any>();

  const navigateToJourney = useCallback((journey: JourneyData) => {
    try {
      const params: JourneyNavParams = {
        pnr: journey.pnr,
        trainNumber: journey.trainNo,
        from: { code: journey.sourceCode, name: journey.sourceCity },
        to: { code: journey.destCode, name: journey.destCity },
      };
      navigation.navigate('Journey', params);
    } catch (error) {
      console.warn('[JourneyNav] Navigation failed:', error);
    }
  }, [navigation]);

  const getButtonConfig = useCallback((status: JourneyStatus) => {
    switch (status) {
      case 'ACTIVE':
        return { label: 'TRACK LIVE', icon: 'navigation' as const, pulse: true };
      case 'UPCOMING':
        return { label: 'VIEW JOURNEY', icon: 'map-pin' as const, pulse: false };
      default:
        return { label: 'TRACK JOURNEY', icon: 'map-pin' as const, pulse: false };
    }
  }, []);

  return { navigateToJourney, getButtonConfig };
};
