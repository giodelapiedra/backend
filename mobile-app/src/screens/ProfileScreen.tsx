import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';

interface UserProfile {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  employer: string;
  department: string;
  jobTitle: string;
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
  };
}

const ProfileScreen = () => {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      const response = await api.get('/users/profile');
      setProfile(response.data);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      Alert.alert('Error', 'Failed to load profile information.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Confirm Logout',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
            } catch (error) {
              console.error('Error during logout:', error);
            }
          }
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.profileImageContainer}>
            {/* Using Ionicons instead of an image */}
            <View style={styles.profileImage}>
              <Ionicons name="person" size={50} color="#fff" />
            </View>
            <TouchableOpacity style={styles.editImageButton}>
              <Ionicons name="camera" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
          
          <Text style={styles.name}>{user?.firstName} {user?.lastName}</Text>
          <Text style={styles.jobTitle}>{profile?.jobTitle || 'Worker'}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          
          <View style={styles.infoCard}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{profile?.email || user?.email}</Text>
            </View>
            
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Phone</Text>
              <Text style={styles.infoValue}>{profile?.phone || 'Not provided'}</Text>
            </View>
            
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Department</Text>
              <Text style={styles.infoValue}>{profile?.department || 'Not provided'}</Text>
            </View>
            
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Employer</Text>
              <Text style={styles.infoValue}>{profile?.employer || 'Not provided'}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Emergency Contact</Text>
          
          <View style={styles.infoCard}>
            {profile?.emergencyContact ? (
              <>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Name</Text>
                  <Text style={styles.infoValue}>{profile.emergencyContact.name}</Text>
                </View>
                
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Relationship</Text>
                  <Text style={styles.infoValue}>{profile.emergencyContact.relationship}</Text>
                </View>
                
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Phone</Text>
                  <Text style={styles.infoValue}>{profile.emergencyContact.phone}</Text>
                </View>
              </>
            ) : (
              <Text style={styles.noDataText}>No emergency contact provided</Text>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          
          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuItemContent}>
              <Ionicons name="lock-closed-outline" size={20} color="#4b5563" />
              <Text style={styles.menuItemText}>Change Password</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuItemContent}>
              <Ionicons name="notifications-outline" size={20} color="#4b5563" />
              <Text style={styles.menuItemText}>Notification Settings</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuItemContent}>
              <Ionicons name="shield-outline" size={20} color="#4b5563" />
              <Text style={styles.menuItemText}>Privacy Settings</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={20} color="#fff" />
          <Text style={styles.logoutButtonText}>Log Out</Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.versionText}>Worker Recovery App v1.0.0</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  container: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  profileImageContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#003087',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editImageButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#8b5cf6',
    borderRadius: 16,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  jobTitle: {
    fontSize: 16,
    color: '#6b7280',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 12,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  infoItem: {
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    color: '#1e293b',
    fontWeight: '500',
  },
  noDataText: {
    fontSize: 14,
    color: '#9ca3af',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 12,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuItemText: {
    fontSize: 16,
    color: '#4b5563',
  },
  logoutButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ef4444',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    gap: 8,
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  footer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  versionText: {
    fontSize: 12,
    color: '#9ca3af',
  },
});

export default ProfileScreen;