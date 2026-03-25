import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import DashboardScreen from '../screens/DashboardScreen';
import OfflineDashboard from '../screens/OfflineDashboard';
import HelpScreen from '../screens/HelpScreen';
import SeatExchangeScreen from '../screens/SeatExchangeScreen';
import ConnectingJourneyScreen from '../screens/ConnectingJourneyScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Dashboard" component={DashboardScreen} />
      <Stack.Screen name="OfflineDashboard" component={OfflineDashboard} />
      <Stack.Screen name="Help" component={HelpScreen} />
      <Stack.Screen name="SeatExchange" component={SeatExchangeScreen} />
      <Stack.Screen name="ConnectingJourney" component={ConnectingJourneyScreen} />
    </Stack.Navigator>
  );
}
