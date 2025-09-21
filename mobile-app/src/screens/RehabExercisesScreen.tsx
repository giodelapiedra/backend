import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  Modal,
  SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../utils/api';

interface Exercise {
  _id: string;
  name: string;
  description: string;
  sets: number;
  repetitions: number;
  frequency: string;
  status: string;
  imageUrl?: string;
  videoUrl?: string;
}

const ExerciseCard = ({ 
  exercise, 
  onComplete, 
  onSkip 
}: { 
  exercise: Exercise; 
  onComplete: () => void; 
  onSkip: (reason: string) => void; 
}) => {
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [skipReason, setSkipReason] = useState('');
  const [skipModalVisible, setSkipModalVisible] = useState(false);
  
  const skipReasons = [
    'Too painful',
    'Don\'t have equipment',
    'Don\'t understand instructions',
    'No time',
    'Forgot',
    'Other'
  ];

  return (
    <View style={styles.exerciseCard}>
      <TouchableOpacity 
        style={styles.exerciseHeader} 
        onPress={() => setDetailsVisible(!detailsVisible)}
      >
        <View style={styles.exerciseInfo}>
          <Text style={styles.exerciseName}>{exercise.name}</Text>
          <Text style={styles.exerciseDetails}>
            {exercise.sets} sets × {exercise.repetitions} reps • {exercise.frequency}
          </Text>
        </View>
        <View style={styles.exerciseActions}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.completeButton]}
            onPress={onComplete}
          >
            <Ionicons name="checkmark" size={20} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionButton, styles.skipButton]}
            onPress={() => setSkipModalVisible(true)}
          >
            <Ionicons name="time-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>

      {detailsVisible && (
        <View style={styles.exerciseDetails}>
          {exercise.imageUrl && (
            <Image 
              source={{ uri: exercise.imageUrl }} 
              style={styles.exerciseImage}
              resizeMode="cover"
            />
          )}
          <Text style={styles.exerciseDescription}>{exercise.description}</Text>
        </View>
      )}

      {/* Skip Reason Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={skipModalVisible}
        onRequestClose={() => setSkipModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Why are you skipping?</Text>
              <TouchableOpacity onPress={() => setSkipModalVisible(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody}>
              {skipReasons.map((reason) => (
                <TouchableOpacity 
                  key={reason}
                  style={[
                    styles.reasonOption,
                    skipReason === reason && styles.reasonOptionSelected
                  ]}
                  onPress={() => setSkipReason(reason)}
                >
                  <Text style={[
                    styles.reasonText,
                    skipReason === reason && styles.reasonTextSelected
                  ]}>
                    {reason}
                  </Text>
                  {skipReason === reason && (
                    <Ionicons name="checkmark-circle" size={20} color="#8b5cf6" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
            
            <TouchableOpacity 
              style={styles.submitButton}
              onPress={() => {
                if (skipReason) {
                  onSkip(skipReason);
                  setSkipModalVisible(false);
                  setSkipReason('');
                } else {
                  Alert.alert('Please select a reason');
                }
              }}
            >
              <Text style={styles.submitButtonText}>Submit</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const RehabExercisesScreen = () => {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [completedCount, setCompletedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [consecutiveCompletions, setConsecutiveCompletions] = useState(0);
  
  useEffect(() => {
    fetchExercises();
    fetchStats();
  }, []);

  const fetchExercises = async () => {
    try {
      setLoading(true);
      const response = await api.get('/rehab-plans/exercises/today');
      setExercises(response.data.exercises || []);
      setTotalCount(response.data.exercises?.length || 0);
      setCompletedCount(response.data.exercises?.filter(e => e.status === 'completed').length || 0);
    } catch (error) {
      console.error('Error fetching exercises:', error);
      Alert.alert('Error', 'Failed to load exercises. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get('/rehab-plans/stats');
      setConsecutiveCompletions(response.data.consecutiveCompletions || 0);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleCompleteExercise = async (exerciseId: string) => {
    try {
      await api.put(`/rehab-plans/exercises/${exerciseId}/complete`);
      
      // Update local state
      setExercises(exercises.map(ex => 
        ex._id === exerciseId ? { ...ex, status: 'completed' } : ex
      ));
      
      setCompletedCount(prev => prev + 1);
      
      // Check if all exercises are completed
      const allCompleted = exercises.every(ex => 
        ex._id === exerciseId ? true : ex.status === 'completed'
      );
      
      if (allCompleted) {
        // Logic Trigger: If all exercises completed 5 days in a row
        if (consecutiveCompletions + 1 >= 5) {
          Alert.alert(
            'Great Progress!',
            'You\'ve completed all exercises for 5 consecutive days. Keep up the excellent work!'
          );
        }
      }
    } catch (error) {
      console.error('Error completing exercise:', error);
      Alert.alert('Error', 'Failed to mark exercise as completed.');
    }
  };

  const handleSkipExercise = async (exerciseId: string, reason: string) => {
    try {
      await api.put(`/rehab-plans/exercises/${exerciseId}/skip`, { reason });
      
      // Update local state
      setExercises(exercises.map(ex => 
        ex._id === exerciseId ? { ...ex, status: 'skipped' } : ex
      ));
      
      // Logic Trigger: If skipped ≥ 2 consecutive sessions
      const skippedExercises = exercises.filter(ex => ex.status === 'skipped').length;
      if (skippedExercises >= 2) {
        // Notify physio to review plan
        await api.post('/alerts/create', {
          type: 'exercise_compliance',
          skippedCount: skippedExercises,
          reason: reason,
        });
        
        Alert.alert(
          'Notice',
          'Your physical therapist has been notified that you\'re having difficulty completing these exercises.'
        );
      }
    } catch (error) {
      console.error('Error skipping exercise:', error);
      Alert.alert('Error', 'Failed to mark exercise as skipped.');
    }
  };

  const handleAllDone = async () => {
    if (completedCount === totalCount) {
      try {
        await api.post('/rehab-plans/complete-session');
        Alert.alert(
          'Great Job!',
          'You\'ve completed all your exercises for today.',
          [{ text: 'OK' }]
        );
      } catch (error) {
        console.error('Error completing session:', error);
      }
    } else {
      Alert.alert(
        'Exercises Remaining',
        'You still have exercises to complete or skip.',
        [{ text: 'OK' }]
      );
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Today's Recovery Plan</Text>
          <View style={styles.progressContainer}>
            <Text style={styles.progressText}>
              {completedCount}/{totalCount} Completed
            </Text>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` }
                ]} 
              />
            </View>
          </View>
        </View>

        <ScrollView style={styles.exerciseList}>
          {exercises.length > 0 ? (
            exercises.map((exercise) => (
              <ExerciseCard
                key={exercise._id}
                exercise={exercise}
                onComplete={() => handleCompleteExercise(exercise._id)}
                onSkip={(reason) => handleSkipExercise(exercise._id, reason)}
              />
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="fitness" size={64} color="#d1d5db" />
              <Text style={styles.emptyStateText}>No exercises scheduled for today</Text>
              <Text style={styles.emptyStateSubtext}>
                Check back tomorrow or contact your physical therapist
              </Text>
            </View>
          )}
        </ScrollView>

        {exercises.length > 0 && (
          <TouchableOpacity 
            style={[
              styles.allDoneButton,
              completedCount === totalCount ? styles.allDoneButtonActive : {}
            ]}
            onPress={handleAllDone}
          >
            <Text style={styles.allDoneButtonText}>All Done</Text>
          </TouchableOpacity>
        )}
      </View>
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
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  progressContainer: {
    marginBottom: 8,
  },
  progressText: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#8b5cf6',
    borderRadius: 4,
  },
  exerciseList: {
    flex: 1,
  },
  exerciseCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  exerciseDetails: {
    fontSize: 14,
    color: '#6b7280',
  },
  exerciseActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  completeButton: {
    backgroundColor: '#22c55e',
  },
  skipButton: {
    backgroundColor: '#f59e0b',
  },
  exerciseDetails: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  exerciseImage: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    marginBottom: 12,
  },
  exerciseDescription: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },
  allDoneButton: {
    backgroundColor: '#e5e7eb',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  allDoneButtonActive: {
    backgroundColor: '#8b5cf6',
  },
  allDoneButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  modalBody: {
    maxHeight: 300,
  },
  reasonOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  reasonOptionSelected: {
    backgroundColor: '#f3e8ff',
  },
  reasonText: {
    fontSize: 16,
    color: '#4b5563',
  },
  reasonTextSelected: {
    color: '#8b5cf6',
    fontWeight: '500',
  },
  submitButton: {
    backgroundColor: '#8b5cf6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default RehabExercisesScreen;
