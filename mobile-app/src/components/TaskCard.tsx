import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface TaskCardProps {
  hasPendingTasks: boolean;
}

const TaskCard: React.FC<TaskCardProps> = ({ hasPendingTasks }) => {
  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Ionicons name="clipboard-outline" size={24} color="#fff" />
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.title}>My Tasks</Text>
        <Text style={styles.subtitle}>
          {hasPendingTasks ? 'You have pending tasks' : 'No pending tasks'}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'linear-gradient(135deg, #0d0080 0%, #a83279 100%)',
    borderRadius: 12,
    marginBottom: 16,
    backgroundColor: '#4527A0',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    marginLeft: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.8,
  },
});

export default TaskCard;
