import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../utils/api';

interface ReadinessReview {
  _id?: string;
  date: string;
  isReady: boolean;
  limitingFactor?: string;
  comments?: string;
  submittedAt?: string;
}

const LimitingFactorOption = ({ 
  label, 
  value, 
  selected, 
  onSelect 
}: { 
  label: string; 
  value: string; 
  selected: boolean; 
  onSelect: () => void; 
}) => {
  return (
    <TouchableOpacity 
      style={[styles.limitingFactorOption, selected && styles.limitingFactorOptionSelected]} 
      onPress={onSelect}
    >
      <Text style={[styles.limitingFactorText, selected && styles.limitingFactorTextSelected]}>
        {label}
      </Text>
      {selected && <Ionicons name="checkmark-circle" size={20} color="#8b5cf6" />}
    </TouchableOpacity>
  );
};

const WeeklyReadinessScreen = () => {
  const [previousReviews, setPreviousReviews] = useState<ReadinessReview[]>([]);
  const [currentReview, setCurrentReview] = useState<ReadinessReview>({
    date: new Date().toISOString(),
    isReady: true,
    limitingFactor: '',
  });
  const [loading, setLoading] = useState(true);
  const [canSubmit, setCanSubmit] = useState(true);
  const [consecutiveNoCount, setConsecutiveNoCount] = useState(0);

  const limitingFactors = [
    { label: 'Pain', value: 'pain' },
    { label: 'Mobility', value: 'mobility' },
    { label: 'Confidence', value: 'confidence' },
    { label: 'Other', value: 'other' },
  ];

  useEffect(() => {
    fetchReadinessReviews();
  }, []);

  const fetchReadinessReviews = async () => {
    try {
      setLoading(true);
      const response = await api.get('/readiness-reviews');
      setPreviousReviews(response.data.reviews || []);
      
      // Check if user can submit a new review this week
      setCanSubmit(response.data.canSubmitThisWeek || false);
      
      // Calculate consecutive "No" responses
      const noResponses = response.data.reviews?.filter(r => !r.isReady) || [];
      setConsecutiveNoCount(calculateConsecutiveNos(noResponses));
    } catch (error) {
      console.error('Error fetching readiness reviews:', error);
      Alert.alert('Error', 'Failed to load readiness data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const calculateConsecutiveNos = (reviews: ReadinessReview[]) => {
    // Sort reviews by date, most recent first
    const sortedReviews = [...reviews].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    
    let count = 0;
    for (const review of sortedReviews) {
      if (!review.isReady) {
        count++;
      } else {
        break;
      }
    }
    
    return count;
  };

  const handleSubmit = async () => {
    try {
      if (!currentReview.isReady && !currentReview.limitingFactor) {
        Alert.alert('Please select a limiting factor');
        return;
      }

      await api.post('/readiness-reviews', currentReview);
      
      // Update local state
      const updatedReview = {
        ...currentReview,
        submittedAt: new Date().toISOString(),
      };
      
      setPreviousReviews([updatedReview, ...previousReviews]);
      setCanSubmit(false);
      
      // Logic Trigger: If "No" 3 consecutive weeks
      if (!currentReview.isReady) {
        const newConsecutiveNoCount = consecutiveNoCount + 1;
        setConsecutiveNoCount(newConsecutiveNoCount);
        
        if (newConsecutiveNoCount >= 3) {
          // Trigger case escalation
          await api.post('/alerts/create', {
            type: 'rtw_escalation',
            consecutiveNoCount: newConsecutiveNoCount,
            limitingFactor: currentReview.limitingFactor,
          });
          
          Alert.alert(
            'Notice',
            'Your case has been escalated to your physical therapist and employer for review.'
          );
        }
      } else {
        setConsecutiveNoCount(0);
      }
      
      Alert.alert(
        'Success',
        'Your readiness review has been submitted.',
        [{ text: 'OK' }]
      );
      
      // Reset form
      setCurrentReview({
        date: new Date().toISOString(),
        isReady: true,
        limitingFactor: '',
      });
    } catch (error) {
      console.error('Error submitting readiness review:', error);
      Alert.alert('Error', 'Failed to submit readiness review. Please try again.');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Work Readiness Check</Text>
          <Text style={styles.subtitle}>
            Weekly assessment of your readiness to return to full duties
          </Text>
        </View>

        {canSubmit ? (
          <View style={styles.formContainer}>
            <View style={styles.questionContainer}>
              <Text style={styles.questionText}>Ready for Full Duties?</Text>
              <View style={styles.readinessOptions}>
                <TouchableOpacity 
                  style={[
                    styles.readinessOption, 
                    currentReview.isReady && styles.readinessOptionSelected,
                    styles.readinessOptionYes
                  ]}
                  onPress={() => setCurrentReview({ ...currentReview, isReady: true, limitingFactor: '' })}
                >
                  <Ionicons 
                    name={currentReview.isReady ? "checkmark-circle" : "checkmark-circle-outline"} 
                    size={24} 
                    color={currentReview.isReady ? "#22c55e" : "#9ca3af"} 
                  />
                  <Text style={[
                    styles.readinessOptionText,
                    currentReview.isReady && styles.readinessOptionTextSelected
                  ]}>
                    Yes
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[
                    styles.readinessOption, 
                    !currentReview.isReady && styles.readinessOptionSelected,
                    styles.readinessOptionNo
                  ]}
                  onPress={() => setCurrentReview({ ...currentReview, isReady: false })}
                >
                  <Ionicons 
                    name={!currentReview.isReady ? "close-circle" : "close-circle-outline"} 
                    size={24} 
                    color={!currentReview.isReady ? "#ef4444" : "#9ca3af"} 
                  />
                  <Text style={[
                    styles.readinessOptionText,
                    !currentReview.isReady && styles.readinessOptionTextSelected
                  ]}>
                    No
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {!currentReview.isReady && (
              <View style={styles.limitingFactorContainer}>
                <Text style={styles.limitingFactorTitle}>Limiting Factor</Text>
                {limitingFactors.map((factor) => (
                  <LimitingFactorOption
                    key={factor.value}
                    label={factor.label}
                    value={factor.value}
                    selected={currentReview.limitingFactor === factor.value}
                    onSelect={() => setCurrentReview({ ...currentReview, limitingFactor: factor.value })}
                  />
                ))}
              </View>
            )}

            <TouchableOpacity 
              style={styles.submitButton}
              onPress={handleSubmit}
            >
              <Text style={styles.submitButtonText}>Submit</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.alreadySubmittedContainer}>
            <Ionicons name="checkmark-circle" size={64} color="#22c55e" />
            <Text style={styles.alreadySubmittedText}>
              You've already submitted your readiness review for this week
            </Text>
            <Text style={styles.alreadySubmittedSubtext}>
              Next review will be available next week
            </Text>
          </View>
        )}

        <View style={styles.historyContainer}>
          <Text style={styles.historyTitle}>Previous Reviews</Text>
          
          {previousReviews.length > 0 ? (
            previousReviews.map((review, index) => (
              <View key={review._id || index} style={styles.historyItem}>
                <View style={styles.historyItemHeader}>
                  <Text style={styles.historyItemDate}>{formatDate(review.date)}</Text>
                  <View style={[
                    styles.historyItemBadge,
                    review.isReady ? styles.historyItemBadgeReady : styles.historyItemBadgeNotReady
                  ]}>
                    <Text style={[
                      styles.historyItemBadgeText,
                      review.isReady ? styles.historyItemBadgeTextReady : styles.historyItemBadgeTextNotReady
                    ]}>
                      {review.isReady ? 'Ready' : 'Not Ready'}
                    </Text>
                  </View>
                </View>
                
                {!review.isReady && review.limitingFactor && (
                  <Text style={styles.historyItemLimitingFactor}>
                    Limiting Factor: {review.limitingFactor.charAt(0).toUpperCase() + review.limitingFactor.slice(1)}
                  </Text>
                )}
              </View>
            ))
          ) : (
            <Text style={styles.noHistoryText}>No previous reviews</Text>
          )}
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
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
  },
  formContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  questionContainer: {
    marginBottom: 24,
  },
  questionText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 16,
  },
  readinessOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  readinessOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 8,
  },
  readinessOptionSelected: {
    borderWidth: 2,
  },
  readinessOptionYes: {
    borderColor: '#22c55e',
    backgroundColor: '#f0fdf4',
  },
  readinessOptionNo: {
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2',
  },
  readinessOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  readinessOptionTextSelected: {
    color: '#1e293b',
  },
  limitingFactorContainer: {
    marginBottom: 24,
  },
  limitingFactorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 16,
  },
  limitingFactorOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  limitingFactorOptionSelected: {
    backgroundColor: '#f3e8ff',
  },
  limitingFactorText: {
    fontSize: 16,
    color: '#4b5563',
  },
  limitingFactorTextSelected: {
    color: '#8b5cf6',
    fontWeight: '500',
  },
  submitButton: {
    backgroundColor: '#8b5cf6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  alreadySubmittedContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    marginBottom: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  alreadySubmittedText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  alreadySubmittedSubtext: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  historyContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 16,
  },
  historyItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  historyItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  historyItemDate: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4b5563',
  },
  historyItemBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  historyItemBadgeReady: {
    backgroundColor: '#dcfce7',
  },
  historyItemBadgeNotReady: {
    backgroundColor: '#fecaca',
  },
  historyItemBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  historyItemBadgeTextReady: {
    color: '#166534',
  },
  historyItemBadgeTextNotReady: {
    color: '#991b1b',
  },
  historyItemLimitingFactor: {
    fontSize: 14,
    color: '#6b7280',
  },
  noHistoryText: {
    fontSize: 14,
    color: '#6b7280',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 16,
  },
});

export default WeeklyReadinessScreen;
