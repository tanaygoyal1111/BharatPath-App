import React from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, ViewStyle, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

interface ScreenWrapperProps {
  children: React.ReactNode;
  style?: ViewStyle;
  useSafeArea?: boolean;
  backgroundColor?: string;
}

export default function ScreenWrapper({ 
  children, 
  style, 
  useSafeArea = true,
  backgroundColor = '#F3F3F3' 
}: ScreenWrapperProps) {
  const insets = useSafeAreaInsets();
  
  const content = (
    <KeyboardAvoidingView 
      style={{ flex: 1 }} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {children}
    </KeyboardAvoidingView>
  );

  if (useSafeArea) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor }, style]}>
        {content}
      </SafeAreaView>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor }, style]}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  }
});
