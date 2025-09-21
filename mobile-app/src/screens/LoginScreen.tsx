import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  SafeAreaView
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';

const LoginScreen = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
      Alert.alert('Login Error', err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  // For testing purposes - use a worker account from your database
  const handleTestLogin = async () => {
    try {
      setLoading(true);
      setError('');
      // Use a worker account that exists in your database
      // This should match a user in your MongoDB database with role "worker"
      await login('john.worker@example.com', 'password123');
    } catch (err: any) {
      setError(err.message || 'Test login failed. Please check backend connection.');
      Alert.alert('Login Error', err.message || 'Test login failed. Please check backend connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.logoContainer}>
            {/* Using Ionicons instead of an image file */}
            <View style={styles.logoPlaceholder}>
              <Ionicons name="fitness" size={60} color="#fff" />
            </View>
            <Text style={styles.appName}>Worker Recovery</Text>
            <Text style={styles.tagline}>Track your recovery journey</Text>
          </View>

          <View style={styles.formContainer}>
            {error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
                editable={!loading}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your password"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                editable={!loading}
              />
            </View>

            <TouchableOpacity style={styles.forgotPassword}>
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.loginButton, loading && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.loginButtonText}>Log In</Text>
              )}
            </TouchableOpacity>

            {/* Test Login Button */}
            <TouchableOpacity
              style={styles.testLoginButton}
              onPress={handleTestLogin}
              disabled={loading}
            >
              <Text style={styles.testLoginButtonText}>Test Login (Worker)</Text>
            </TouchableOpacity>

            <View style={styles.supportContainer}>
              <Text style={styles.supportText}>Need help? Contact Support</Text>
              <Text style={styles.supportPhone}>1-800-123-4567</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 20,
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#8b5cf6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  appName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: '#6b7280',
  },
  formContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  errorContainer: {
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4b5563',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1e293b',
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    color: '#8b5cf6',
    fontSize: 14,
    fontWeight: '500',
  },
  loginButton: {
    backgroundColor: '#8b5cf6',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  loginButtonDisabled: {
    backgroundColor: '#c4b5fd',
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  testLoginButton: {
    backgroundColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  testLoginButtonText: {
    color: '#4b5563',
    fontSize: 14,
    fontWeight: '600',
  },
  supportContainer: {
    alignItems: 'center',
    marginTop: 16,
  },
  supportText: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  supportPhone: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4b5563',
  },
});

export default LoginScreen;