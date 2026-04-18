import React, { useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import { AuthProvider } from './src/context/AuthContext';
import * as Notifications from 'expo-notifications';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

// 🛡️ The Environment Guard
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

// Only run the notification setup if we are NOT in Expo Go (or specifically on Android)
if (!isExpoGo || Platform.OS === 'android') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
} else {
  console.log("Running in iOS Expo Go: Bypassing native notifications to prevent crash.");
}

export default function App() {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  }));

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <QueryClientProvider client={queryClient}>
          <NavigationContainer>
            <AppNavigator />
          </NavigationContainer>
        </QueryClientProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}