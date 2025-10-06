import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/contexts/AuthContext';
import { LoginScreen } from './src/screens/auth/LoginScreen';

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <LoginScreen />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
