import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Modal,
  SafeAreaView,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import UserHeader from '../components/UserHeader';
import TaskCard from '../components/TaskCard';
import HealthMetricCard from '../components/HealthMetricCard';
import ProgressCircle from '../components/ProgressCircle';
import AlertCard from '../components/AlertCard';
import api from '../utils/api';
import { useAuth } from '../contexts/AuthContext';

// Slider component for pain level
const PainSlider = ({ value, onChange }) => {
  const levels = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  
  return (
    <View style={styles.sliderContainer}>
      <View style={styles.sliderTrack}>
        {levels.map((level) => (
          <TouchableOpacity
            key={level}
            style={[
              styles.sliderMarker,
              value === level && styles.sliderMarkerActive,
              level >= 7 ? styles.sliderMarkerHigh :
              level >= 4 ? styles.sliderMarkerMedium :
              styles.sliderMarkerLow
            ]}
            onPress={() => onChange(level)}
          >
            {value === level && (
              <Text style={styles.sliderMarkerText}>{level}</Text>
            )}
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.sliderLabels}>
        <Text style={styles.sliderLabelText}>No Pain</Text>
        <Text style={styles.sliderLabelText}>Severe</Text>
      </View>
    </View>
  );
};

// Segmented button component
const SegmentedButtons = ({ options, value, onChange }) => {
  return (
    <View style={styles.segmentedContainer}>
      {options.map((option) => (
        <TouchableOpacity
          key={option.value}
          style={[
            styles.segmentButton,
            value === option.value && styles.segmentButtonActive,
          ]}
          onPress={() => onChange(option.value)}
        >
          <Text style={[
            styles.segmentButtonText,
            value === option.value && styles.segmentButtonTextActive
          ]}>
            {option.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

// Emoji selector component
const EmojiSelector = ({ options, value, onChange }) => {
  return (
    <View style={styles.emojiContainer}>
      {options.map((option) => (
        <TouchableOpacity
          key={option.value}
          style={[
            styles.emojiButton,
            value === option.value && styles.emojiButtonActive,
          ]}
          onPress={() => onChange(option.value)}
        >
          <Text style={styles.emojiText}>{option.emoji}</Text>
          {value === option.value && (
            <Text style={styles.emojiLabelText}>{option.label}</Text>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
};

const HomeScreen = () => {
  const { user } = useAuth();
  const navigation = useNavigation();
  const [checkInModalVisible, setCheckInModalVisible] = useState(false);
  const [healthMetrics, setHealthMetrics] = useState({
    bmi: 22,
    height: "6'3\"",
    weight: "230 lbs",
    mskScore: 8
  });
  
  const [checkInData, setCheckInData] = useState({
    painLevel: 0,
    canDoJob: 'yes', // yes, modified, no
    mood: 'good', // good, neutral, bad
    sleepQuality: 'good', // good, ok, poor
  });

  const [hasCompletedCheckIn, setHasCompletedCheckIn] = useState(false);
  const [isHighRisk, setIsHighRisk] = useState(false);
  const [userCases, setUserCases] = useState([]);
  const [selectedCase, setSelectedCase] = useState(null);

  useEffect(() => {
    // Check if user has already completed check-in today
    checkDailyCheckInStatus();
    // Fetch health metrics
    fetchHealthMetrics();
    // Fetch user's cases
    fetchUserCases();
  }, []);

  const checkDailyCheckInStatus = async () => {
    try {
      const response = await api.get('/check-ins/today');
      setHasCompletedCheckIn(response.data.completed);
    } catch (error) {
      console.error('Error checking daily check-in status:', error);
    }
  };

  const fetchHealthMetrics = async () => {
    try {
      const response = await api.get('/users/health-metrics');
      setHealthMetrics(response.data);
    } catch (error) {
      console.error('Error fetching health metrics:', error);
    }
  };

  const fetchUserCases = async () => {
    try {
      const response = await api.get('/cases');
      if (response.data && response.data.cases && response.data.cases.length > 0) {
        setUserCases(response.data.cases);
        // Select the first case by default
        setSelectedCase(response.data.cases[0]._id);
      }
    } catch (error) {
      console.error('Error fetching user cases:', error);
    }
  };

  const handleCheckInSubmit = async () => {
    try {
      if (!selectedCase) {
        Alert.alert('Error', 'No case selected. Please contact support.');
        return;
      }

      // Check for alert triggers
      if (checkInData.painLevel >= 7) {
        // Trigger alert to physio dashboard
        await api.post('/alerts/create', {
          type: 'high_pain',
          painLevel: checkInData.painLevel,
        });
      }
      
      if (checkInData.canDoJob === 'no') {
        // Auto-flag for RTW review
        await api.post('/alerts/create', {
          type: 'rtw_review',
          canDoJob: checkInData.canDoJob,
        });
      }
      
      // Submit check-in data with case ID
      await api.post('/check-ins', {
        case: selectedCase, // Include the case ID
        painLevel: { current: checkInData.painLevel },
        functionalStatus: {
          sleep: checkInData.sleepQuality === 'good' ? 8 : checkInData.sleepQuality === 'ok' ? 5 : 2,
          mood: checkInData.mood === 'good' ? 8 : checkInData.mood === 'neutral' ? 5 : 2,
        },
        workStatus: {
          workedToday: checkInData.canDoJob !== 'no',
          difficulties: checkInData.canDoJob === 'modified' ? ['Modified duties required'] : [],
        }
      });
      
      setHasCompletedCheckIn(true);
      setCheckInModalVisible(false);
      
      Alert.alert(
        'Check-in Submitted',
        'Your daily check-in has been recorded successfully.',
        [{ text: 'OK' }]
      );
      
    } catch (error) {
      console.error('Error submitting check-in:', error);
      Alert.alert(
        'Error',
        'Failed to submit check-in. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container}>
        <UserHeader age={62} gender="Male" />
        
        <TaskCard hasPendingTasks={false} />
        
        <Text style={styles.sectionTitle}>Overall Health</Text>
        
        <View style={styles.metricsRow}>
          <View style={styles.metricsColumn}>
            <HealthMetricCard
              title="BMI"
              value={healthMetrics.bmi}
              icon={<Ionicons name="body-outline" size={24} color="#8b5cf6" />}
            />
            <HealthMetricCard
              title="Height"
              value={healthMetrics.height}
              icon={<Ionicons name="resize-outline" size={24} color="#8b5cf6" />}
            />
            <HealthMetricCard
              title="Weight"
              value={healthMetrics.weight}
              icon={<Ionicons name="scale-outline" size={24} color="#8b5cf6" />}
            />
          </View>
          
          <View style={styles.mskScoreContainer}>
            <Text style={styles.mskScoreTitle}>MSK Score</Text>
            <View style={styles.mskScoreCircle}>
              <Text style={styles.mskScoreValue}>{healthMetrics.mskScore}</Text>
            </View>
            <Ionicons name="body" size={80} color="#8b5cf6" style={styles.mskScoreIcon} />
          </View>
        </View>
        
        <View style={styles.progressCirclesContainer}>
          <ProgressCircle
            size={80}
            strokeWidth={10}
            progress={90}
            label="Posture"
            value={9}
            color="#3b82f6"
          />
          <ProgressCircle
            size={80}
            strokeWidth={10}
            progress={90}
            label="Flexibility"
            value={9}
            color="#3b82f6"
          />
          <ProgressCircle
            size={80}
            strokeWidth={10}
            progress={70}
            label="Mobility"
            value={7}
            color="#3b82f6"
          />
          <ProgressCircle
            size={80}
            strokeWidth={10}
            progress={60}
            label="Pain"
            value={6}
            color="#3b82f6"
          />
        </View>
        
        {isHighRisk && (
          <AlertCard
            type="danger"
            message="You are at high risk"
            buttonText="Next Step"
            onPress={() => navigation.navigate('Exercises')}
          />
        )}
        
        <Text style={styles.sectionTitle}>Performance Test History</Text>
        
        <View style={styles.performanceTestsContainer}>
          <TouchableOpacity style={styles.performanceTestCard}>
            <Text style={styles.performanceTestTitle}>Knee</Text>
            <Ionicons name="chevron-forward" size={24} color="#8b5cf6" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.performanceTestCard}>
            <Text style={styles.performanceTestTitle}>Back</Text>
            <Ionicons name="chevron-forward" size={24} color="#8b5cf6" />
          </TouchableOpacity>
        </View>
        
        {!hasCompletedCheckIn && (
          <TouchableOpacity 
            style={styles.checkInButton}
            onPress={() => setCheckInModalVisible(true)}
          >
            <Text style={styles.checkInButtonText}>Complete Today's Check-In</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
      
      {/* Daily Check-In Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={checkInModalVisible}
        onRequestClose={() => setCheckInModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Today's Check-In</Text>
              <TouchableOpacity onPress={() => setCheckInModalVisible(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody}>
              <Text style={styles.inputLabel}>Pain Level (0–10)</Text>
              <PainSlider
                value={checkInData.painLevel}
                onChange={(value) => setCheckInData({...checkInData, painLevel: value})}
              />
              
              <Text style={styles.inputLabel}>Can you do your normal job today?</Text>
              <SegmentedButtons
                options={[
                  { label: 'Yes', value: 'yes' },
                  { label: 'Modified', value: 'modified' },
                  { label: 'No', value: 'no' },
                ]}
                value={checkInData.canDoJob}
                onChange={(value) => setCheckInData({...checkInData, canDoJob: value})}
              />
              
              <Text style={styles.inputLabel}>Mood Today</Text>
              <EmojiSelector
                options={[
                  { emoji: '😊', label: 'Good', value: 'good' },
                  { emoji: '😐', label: 'Neutral', value: 'neutral' },
                  { emoji: '😞', label: 'Bad', value: 'bad' },
                ]}
                value={checkInData.mood}
                onChange={(value) => setCheckInData({...checkInData, mood: value})}
              />
              
              <Text style={styles.inputLabel}>Sleep Quality</Text>
              <SegmentedButtons
                options={[
                  { label: 'Good', value: 'good' },
                  { label: 'OK', value: 'ok' },
                  { label: 'Poor', value: 'poor' },
                ]}
                value={checkInData.sleepQuality}
                onChange={(value) => setCheckInData({...checkInData, sleepQuality: value})}
              />
            </ScrollView>
            
            <TouchableOpacity 
              style={styles.submitButton}
              onPress={handleCheckInSubmit}
            >
              <Text style={styles.submitButtonText}>Submit</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 16,
  },
  metricsRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  metricsColumn: {
    flex: 1,
    marginRight: 8,
    gap: 8,
  },
  mskScoreContainer: {
    flex: 1,
    backgroundColor: '#8b5cf6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  mskScoreTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  mskScoreCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  mskScoreValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#8b5cf6',
  },
  mskScoreIcon: {
    position: 'absolute',
    bottom: 10,
    opacity: 0.3,
  },
  progressCirclesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  performanceTestsContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 16,
  },
  performanceTestCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  performanceTestTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1e293b',
  },
  checkInButton: {
    backgroundColor: '#8b5cf6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  checkInButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
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
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  modalBody: {
    maxHeight: 500,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1e293b',
    marginBottom: 8,
    marginTop: 16,
  },
  sliderContainer: {
    marginBottom: 16,
  },
  sliderTrack: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 40,
    backgroundColor: '#f3f4f6',
    borderRadius: 20,
    paddingHorizontal: 4,
  },
  sliderMarker: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sliderMarkerActive: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  sliderMarkerLow: {
    backgroundColor: '#22c55e',
  },
  sliderMarkerMedium: {
    backgroundColor: '#f59e0b',
  },
  sliderMarkerHigh: {
    backgroundColor: '#ef4444',
  },
  sliderMarkerText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  sliderLabelText: {
    fontSize: 12,
    color: '#6b7280',
  },
  segmentedContainer: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    marginBottom: 16,
    overflow: 'hidden',
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  segmentButtonActive: {
    backgroundColor: '#8b5cf6',
  },
  segmentButtonText: {
    color: '#6b7280',
    fontWeight: '500',
  },
  segmentButtonTextActive: {
    color: '#fff',
  },
  emojiContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  emojiButton: {
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
  },
  emojiButtonActive: {
    backgroundColor: '#f3f4f6',
  },
  emojiText: {
    fontSize: 32,
  },
  emojiLabelText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
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

export default HomeScreen;