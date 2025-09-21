import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';

interface UserHeaderProps {
  age?: number;
  gender?: string;
}

const UserHeader: React.FC<UserHeaderProps> = ({ age, gender }) => {
  const { user } = useAuth();
  
  return (
    <View style={styles.container}>
      {/* Using Ionicons instead of an image */}
      <View style={styles.avatar}>
        <Ionicons name="person" size={36} color="#fff" />
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.welcomeText}>Welcome,</Text>
        <Text style={styles.nameText}>{user?.firstName} {user?.lastName}</Text>
      </View>
      {(age && gender) && (
        <Text style={styles.infoText}>{age}/{gender}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#003087',
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    marginLeft: 12,
    flex: 1,
  },
  welcomeText: {
    fontSize: 16,
    color: '#8b5cf6',
    fontWeight: '500',
  },
  nameText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#003087',
  },
  infoText: {
    fontSize: 16,
    color: '#8b5cf6',
    fontWeight: '500',
  },
});

export default UserHeader;