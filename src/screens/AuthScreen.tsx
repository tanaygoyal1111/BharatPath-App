import React from 'react';
import { View, StyleSheet, StatusBar } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AuthModal from '../components/Auth/AuthModal';

export default function AuthScreen() {
  const navigation = useNavigation<any>();

  const handleExit = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'Dashboard' }]
    });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8F9FA" />
      <AuthModal 
        visible={true} 
        onClose={handleExit} 
        onSuccess={() => navigation.goBack()} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  }
});
