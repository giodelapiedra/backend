import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Image,
  SafeAreaView,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import api from '../utils/api';

interface HazardOption {
  id: string;
  label: string;
}

const hazardOptions: HazardOption[] = [
  { id: 'slippery_surface', label: 'Slippery Surface' },
  { id: 'trip_hazard', label: 'Trip Hazard' },
  { id: 'falling_objects', label: 'Falling Objects' },
  { id: 'machinery', label: 'Machinery' },
  { id: 'electrical', label: 'Electrical' },
  { id: 'chemical', label: 'Chemical' },
  { id: 'ergonomic', label: 'Ergonomic' },
  { id: 'other', label: 'Other' },
];

const IncidentReportScreen = () => {
  const [feltUnsafe, setFeltUnsafe] = useState<boolean | null>(null);
  const [selectedHazards, setSelectedHazards] = useState<string[]>([]);
  const [comments, setComments] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const pickImage = async () => {
    // Request permission
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please grant camera roll permissions to upload photos.');
      return;
    }
    
    // Pick image
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    
    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    // Request permission
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please grant camera permissions to take photos.');
      return;
    }
    
    // Take photo
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    
    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const toggleHazard = (hazardId: string) => {
    if (selectedHazards.includes(hazardId)) {
      setSelectedHazards(selectedHazards.filter(id => id !== hazardId));
    } else {
      setSelectedHazards([...selectedHazards, hazardId]);
    }
  };

  const handleSubmit = async () => {
    if (feltUnsafe === null) {
      Alert.alert('Please answer if you felt unsafe today');
      return;
    }
    
    if (feltUnsafe && selectedHazards.length === 0) {
      Alert.alert('Please select at least one hazard');
      return;
    }
    
    try {
      setSubmitting(true);
      
      // Create form data for image upload
      const formData = new FormData();
      
      formData.append('feltUnsafe', feltUnsafe.toString());
      
      if (feltUnsafe) {
        formData.append('hazards', JSON.stringify(selectedHazards));
        
        if (comments) {
          formData.append('comments', comments);
        }
        
        if (image) {
          const filename = image.split('/').pop() || 'photo.jpg';
          const match = /\.(\w+)$/.exec(filename);
          const type = match ? `image/${match[1]}` : 'image/jpeg';
          
          formData.append('image', {
            uri: Platform.OS === 'ios' ? image.replace('file://', '') : image,
            name: filename,
            type,
          } as any);
        }
      }
      
      // Submit report
      await api.post('/incidents/report', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      // Logic Trigger: If "Yes" → Auto-generate safety ticket
      if (feltUnsafe) {
        await api.post('/alerts/create', {
          type: 'safety_hazard',
          hazards: selectedHazards,
          hasImage: !!image,
        });
      }
      
      setSubmitted(true);
      
      Alert.alert(
        'Report Submitted',
        'Thank you for your report. Your safety is our priority.',
        [{ 
          text: 'OK', 
          onPress: () => {
            // Reset form after submission
            setFeltUnsafe(null);
            setSelectedHazards([]);
            setComments('');
            setImage(null);
            setSubmitted(false);
          } 
        }]
      );
    } catch (error) {
      console.error('Error submitting incident report:', error);
      Alert.alert('Error', 'Failed to submit report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Felt Unsafe?</Text>
          <Text style={styles.subtitle}>
            Report any safety concerns or hazards you encountered today
          </Text>
        </View>

        <View style={styles.formContainer}>
          <Text style={styles.questionText}>Did you feel unsafe today?</Text>
          
          <View style={styles.safetyOptions}>
            <TouchableOpacity 
              style={[
                styles.safetyOption, 
                feltUnsafe === false && styles.safetyOptionSelected,
                styles.safetyOptionNo
              ]}
              onPress={() => setFeltUnsafe(false)}
            >
              <Ionicons 
                name={feltUnsafe === false ? "checkmark-circle" : "checkmark-circle-outline"} 
                size={24} 
                color={feltUnsafe === false ? "#22c55e" : "#9ca3af"} 
              />
              <Text style={[
                styles.safetyOptionText,
                feltUnsafe === false && styles.safetyOptionTextSelected
              ]}>
                No
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.safetyOption, 
                feltUnsafe === true && styles.safetyOptionSelected,
                styles.safetyOptionYes
              ]}
              onPress={() => setFeltUnsafe(true)}
            >
              <Ionicons 
                name={feltUnsafe === true ? "warning" : "warning-outline"} 
                size={24} 
                color={feltUnsafe === true ? "#f59e0b" : "#9ca3af"} 
              />
              <Text style={[
                styles.safetyOptionText,
                feltUnsafe === true && styles.safetyOptionTextSelected
              ]}>
                Yes
              </Text>
            </TouchableOpacity>
          </View>

          {feltUnsafe && (
            <>
              <Text style={styles.questionText}>Any hazards?</Text>
              
              <View style={styles.hazardsContainer}>
                {hazardOptions.map((hazard) => (
                  <TouchableOpacity 
                    key={hazard.id}
                    style={[
                      styles.hazardOption,
                      selectedHazards.includes(hazard.id) && styles.hazardOptionSelected
                    ]}
                    onPress={() => toggleHazard(hazard.id)}
                  >
                    <Text style={[
                      styles.hazardOptionText,
                      selectedHazards.includes(hazard.id) && styles.hazardOptionTextSelected
                    ]}>
                      {hazard.label}
                    </Text>
                    {selectedHazards.includes(hazard.id) && (
                      <Ionicons name="checkmark" size={16} color="#fff" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.questionText}>Comments (Optional)</Text>
              <TextInput
                style={styles.commentsInput}
                placeholder="Describe the situation or hazard..."
                multiline
                numberOfLines={4}
                value={comments}
                onChangeText={setComments}
              />

              <Text style={styles.questionText}>Upload Photo (Optional)</Text>
              
              {image ? (
                <View style={styles.imagePreviewContainer}>
                  <Image source={{ uri: image }} style={styles.imagePreview} />
                  <TouchableOpacity 
                    style={styles.removeImageButton}
                    onPress={() => setImage(null)}
                  >
                    <Ionicons name="close-circle" size={24} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.imageButtonsContainer}>
                  <TouchableOpacity 
                    style={styles.imageButton}
                    onPress={takePhoto}
                  >
                    <Ionicons name="camera" size={24} color="#6b7280" />
                    <Text style={styles.imageButtonText}>Take Photo</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.imageButton}
                    onPress={pickImage}
                  >
                    <Ionicons name="images" size={24} color="#6b7280" />
                    <Text style={styles.imageButtonText}>Upload Photo</Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}

          <TouchableOpacity 
            style={[
              styles.submitButton,
              submitting && styles.submitButtonDisabled
            ]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            <Text style={styles.submitButtonText}>
              {submitting ? 'Sending Report...' : 'Send Report'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoCardHeader}>
            <Ionicons name="information-circle" size={24} color="#3b82f6" />
            <Text style={styles.infoCardTitle}>Why Report?</Text>
          </View>
          <Text style={styles.infoCardText}>
            Your safety reports help identify and address potential hazards before they cause injuries.
            All reports are reviewed by the safety team and appropriate actions will be taken.
          </Text>
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
  questionText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 16,
    marginTop: 16,
  },
  safetyOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  safetyOption: {
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
  safetyOptionSelected: {
    borderWidth: 2,
  },
  safetyOptionNo: {
    borderColor: '#22c55e',
    backgroundColor: '#f0fdf4',
  },
  safetyOptionYes: {
    borderColor: '#f59e0b',
    backgroundColor: '#fef3c7',
  },
  safetyOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  safetyOptionTextSelected: {
    color: '#1e293b',
  },
  hazardsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  hazardOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    gap: 4,
  },
  hazardOptionSelected: {
    backgroundColor: '#8b5cf6',
  },
  hazardOptionText: {
    fontSize: 14,
    color: '#4b5563',
  },
  hazardOptionTextSelected: {
    color: '#fff',
  },
  commentsInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#4b5563',
    height: 100,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  imageButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  imageButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    borderStyle: 'dashed',
    gap: 8,
  },
  imageButtonText: {
    fontSize: 14,
    color: '#6b7280',
  },
  imagePreviewContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 16,
    padding: 4,
  },
  submitButton: {
    backgroundColor: '#f59e0b',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  submitButtonDisabled: {
    backgroundColor: '#fcd34d',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  infoCard: {
    backgroundColor: '#dbeafe',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  infoCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  infoCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e40af',
  },
  infoCardText: {
    fontSize: 14,
    color: '#1e40af',
    lineHeight: 20,
  },
});

export default IncidentReportScreen;
