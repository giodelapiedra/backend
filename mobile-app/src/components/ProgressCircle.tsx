import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

interface ProgressCircleProps {
  size: number;
  strokeWidth: number;
  progress: number; // 0-100
  label: string;
  value: number;
  color: string;
}

const ProgressCircle: React.FC<ProgressCircleProps> = ({
  size,
  strokeWidth,
  progress,
  label,
  value,
  color,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.circleContainer}>
        <Svg width={size} height={size}>
          {/* Background Circle */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#e5e7eb"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Progress Circle */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            transform={`rotate(-90, ${size / 2}, ${size / 2})`}
          />
        </Svg>
        <Text style={[styles.valueText, { color }]}>{value}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  label: {
    fontSize: 14,
    color: '#1e293b',
    fontWeight: '500',
    marginBottom: 4,
  },
  circleContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  valueText: {
    position: 'absolute',
    fontSize: 20,
    fontWeight: 'bold',
  },
});

export default ProgressCircle;
