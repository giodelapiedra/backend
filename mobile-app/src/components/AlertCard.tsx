import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface AlertCardProps {
  message: string;
  buttonText: string;
  onPress: () => void;
  type: 'warning' | 'danger' | 'info';
}

const AlertCard: React.FC<AlertCardProps> = ({ message, buttonText, onPress, type }) => {
  const getColors = () => {
    switch (type) {
      case 'danger':
        return {
          background: '#fef2f2',
          border: '#fecaca',
          icon: '#dc2626',
          text: '#991b1b',
        };
      case 'warning':
        return {
          background: '#fef3c7',
          border: '#fde68a',
          icon: '#f59e0b',
          text: '#92400e',
        };
      case 'info':
      default:
        return {
          background: '#dbeafe',
          border: '#bfdbfe',
          icon: '#3b82f6',
          text: '#1e40af',
        };
    }
  };

  const colors = getColors();
  
  return (
    <View style={[styles.container, { backgroundColor: colors.background, borderColor: colors.border }]}>
      <View style={styles.iconContainer}>
        <Ionicons 
          name={type === 'danger' ? 'alert-circle' : type === 'warning' ? 'warning' : 'information-circle'} 
          size={24} 
          color={colors.icon} 
        />
      </View>
      <Text style={[styles.message, { color: colors.text }]}>{message}</Text>
      <TouchableOpacity 
        style={[styles.button, { backgroundColor: colors.icon }]} 
        onPress={onPress}
      >
        <Text style={styles.buttonText}>{buttonText}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  iconContainer: {
    marginBottom: 8,
  },
  message: {
    fontSize: 16,
    marginBottom: 16,
    lineHeight: 22,
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});

export default AlertCard;
