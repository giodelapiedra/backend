import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface HealthMetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  icon?: React.ReactNode;
}

const HealthMetricCard: React.FC<HealthMetricCardProps> = ({ title, value, unit, icon }) => {
  return (
    <View style={styles.container}>
      {icon && <View style={styles.iconContainer}>{icon}</View>}
      <Text style={styles.title}>{title}</Text>
      <View style={styles.valueContainer}>
        <Text style={styles.value}>{value}</Text>
        {unit && <Text style={styles.unit}>{unit}</Text>}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    minHeight: 100,
  },
  iconContainer: {
    marginBottom: 8,
  },
  title: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  value: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  unit: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 2,
  },
});

export default HealthMetricCard;
