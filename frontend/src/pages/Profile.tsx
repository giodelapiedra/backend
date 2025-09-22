import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  Grid,
  Alert,
  CircularProgress,
  Divider,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Avatar,
  Paper
} from '@mui/material';
import {
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Person as PersonIcon,
  Lock as LockIcon
} from '@mui/icons-material';
import Layout from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import Cookies from 'js-cookie';
import PhotoUpload from '../components/PhotoUpload';
import { getCSRFToken } from '../utils/api';
import { createImageProps } from '../utils/imageUtils';

interface ProfileFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  profileImage?: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
    email: string;
  };
  medicalInfo: {
    bloodType: string;
    allergies: string[];
    medications: string[];
    medicalConditions: string[];
  };
}

const Profile: React.FC = () => {
  const { user, logout, refreshUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [newAllergy, setNewAllergy] = useState('');
  const [newMedication, setNewMedication] = useState('');
  const [newCondition, setNewCondition] = useState('');
  const [openAllergyDialog, setOpenAllergyDialog] = useState(false);
  const [openMedicationDialog, setOpenMedicationDialog] = useState(false);
  const [openConditionDialog, setOpenConditionDialog] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  
  // Password verification states
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [verifyingPassword, setVerifyingPassword] = useState(false);

  const [formData, setFormData] = useState<ProfileFormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    profileImage: '',
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: ''
    },
    emergencyContact: {
      name: '',
      relationship: '',
      phone: '',
      email: ''
    },
    medicalInfo: {
      bloodType: '',
      allergies: [],
      medications: [],
      medicalConditions: []
    }
  });

  useEffect(() => {
    if (user) {
      console.log('Profile component - user data loaded:', {
        userId: user.id,
        userRole: user.role,
        userEmail: user.email,
        userIdType: typeof user.id,
        userProfileImage: user.profileImage,
        hasProfileImage: !!user.profileImage
      });
      
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phone: user.phone || '',
        profileImage: user.profileImage || '',
        address: {
          street: user.address?.street || '',
          city: user.address?.city || '',
          state: user.address?.state || '',
          zipCode: user.address?.zipCode || '',
          country: user.address?.country || ''
        },
        emergencyContact: {
          name: user.emergencyContact?.name || '',
          relationship: user.emergencyContact?.relationship || '',
          phone: user.emergencyContact?.phone || '',
          email: user.emergencyContact?.email || ''
        },
        medicalInfo: {
          bloodType: user.medicalInfo?.bloodType || '',
          allergies: user.medicalInfo?.allergies || [],
          medications: user.medicalInfo?.medications || [],
          medicalConditions: user.medicalInfo?.medicalConditions || []
        }
      });
      
      console.log('FormData set with profileImage:', user.profileImage || '');
    }
  }, [user]);

  const handleInputChange = (field: string, value: any) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...(prev[parent as keyof ProfileFormData] as any),
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  // Password verification function
  const verifyPassword = async () => {
    try {
      setVerifyingPassword(true);
      setPasswordError(null);
      
      const response = await api.post('/auth/verify-password', { password });
      
      if (response.data.valid) {
        console.log('Password verified successfully for profile edit');
        setPasswordDialogOpen(false);
        setPassword('');
        setIsEditing(true); // Enable edit mode after verification
      } else {
        setPasswordError('Invalid password');
      }
    } catch (err: any) {
      console.error('Password verification error:', err);
      if (err.response?.status === 400) {
        setPasswordError('Password is required');
      } else if (err.response?.status === 401) {
        setPasswordError('Invalid password');
      } else {
        setPasswordError('Password verification failed');
      }
    } finally {
      setVerifyingPassword(false);
    }
  };

  const handleEditClick = () => {
    setPasswordDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      // Ensure we're only updating the current user's profile
      if (!user?.id) {
        setError('User not found');
        return;
      }

      // Create a copy of the original user data for comparison
      const originalData = {
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phone: user.phone || '',
        profileImage: user.profileImage || '',
        address: {
          street: user.address?.street || '',
          city: user.address?.city || '',
          state: user.address?.state || '',
          zipCode: user.address?.zipCode || '',
          country: user.address?.country || ''
        },
        emergencyContact: {
          name: user.emergencyContact?.name || '',
          relationship: user.emergencyContact?.relationship || '',
          phone: user.emergencyContact?.phone || '',
          email: user.emergencyContact?.email || ''
        },
        medicalInfo: {
          bloodType: user.medicalInfo?.bloodType || '',
          allergies: user.medicalInfo?.allergies || [],
          medications: user.medicalInfo?.medications || [],
          medicalConditions: user.medicalInfo?.medicalConditions || []
        }
      };

      // Only include fields that have actually changed
      const changedFields: any = {};
      
      if (formData.firstName !== originalData.firstName) {
        changedFields.firstName = formData.firstName;
      }
      if (formData.lastName !== originalData.lastName) {
        changedFields.lastName = formData.lastName;
      }
      if (formData.email !== originalData.email) {
        changedFields.email = formData.email;
      }
      if (formData.phone !== originalData.phone) {
        changedFields.phone = formData.phone;
      }
      
      // Check if address has changed
      const addressChanged = JSON.stringify(formData.address) !== JSON.stringify(originalData.address);
      if (addressChanged) {
        changedFields.address = formData.address;
      }
      
      // Check if emergency contact has changed
      const emergencyContactChanged = JSON.stringify(formData.emergencyContact) !== JSON.stringify(originalData.emergencyContact);
      if (emergencyContactChanged) {
        changedFields.emergencyContact = formData.emergencyContact;
      }
      
      // Check if medical info has changed
      const medicalInfoChanged = JSON.stringify(formData.medicalInfo) !== JSON.stringify(originalData.medicalInfo);
      if (medicalInfoChanged) {
        changedFields.medicalInfo = formData.medicalInfo;
      }

      console.log('Profile update request:', {
        userId: user.id,
        userRole: user.role,
        changedFields: Object.keys(changedFields),
        hasPhoto: !!profilePhoto,
        authToken: Cookies.get('token') ? 'present' : 'missing',
        currentProfileImage: user.profileImage,
        formDataProfileImage: formData.profileImage
      });

      let response;
      
      if (profilePhoto) {
        // Create FormData for file upload - only send changed fields
        const formDataWithPhoto = new FormData();
        
        // Add only changed fields
        Object.keys(changedFields).forEach(key => {
          if (key === 'address' || key === 'emergencyContact' || key === 'medicalInfo') {
            formDataWithPhoto.append(key, JSON.stringify(changedFields[key]));
          } else {
            formDataWithPhoto.append(key, changedFields[key]);
          }
        });
        
        formDataWithPhoto.append('profileImage', profilePhoto);
        
        // Get CSRF token manually for FormData requests
        const csrfToken = await getCSRFToken();
        
        console.log('Sending profile update with photo (changed fields only):', Object.keys(changedFields));
        response = await api.put(`/users/${user.id}`, formDataWithPhoto, {
          headers: {
            'Content-Type': 'multipart/form-data',
            'X-CSRF-Token': csrfToken,
          },
        });
      } else {
        // Regular JSON request without photo - only send changed fields
        console.log('Sending profile update without photo (changed fields only):', Object.keys(changedFields));
        response = await api.put(`/users/${user.id}`, changedFields);
      }
      
      setSuccess('Profile updated successfully!');
      setIsEditing(false);
      setProfilePhoto(null); // Reset photo state after successful save
      
      // Refresh user data in context
      await refreshUser();
      
      // Update form data with fresh user data
      try {
        const userResponse = await api.get('/auth/me');
        const updatedUser = userResponse.data.user;
        
        setFormData({
          firstName: updatedUser.firstName || '',
          lastName: updatedUser.lastName || '',
          email: updatedUser.email || '',
          phone: updatedUser.phone || '',
          profileImage: updatedUser.profileImage || '',
          address: {
            street: updatedUser.address?.street || '',
            city: updatedUser.address?.city || '',
            state: updatedUser.address?.state || '',
            zipCode: updatedUser.address?.zipCode || '',
            country: updatedUser.address?.country || ''
          },
          emergencyContact: {
            name: updatedUser.emergencyContact?.name || '',
            relationship: updatedUser.emergencyContact?.relationship || '',
            phone: updatedUser.emergencyContact?.phone || '',
            email: updatedUser.emergencyContact?.email || ''
          },
          medicalInfo: {
            bloodType: updatedUser.medicalInfo?.bloodType || '',
            allergies: updatedUser.medicalInfo?.allergies || [],
            medications: updatedUser.medicalInfo?.medications || [],
            medicalConditions: updatedUser.medicalInfo?.medicalConditions || []
          }
        });
      } catch (refreshError) {
        console.error('Error refreshing user data:', refreshError);
        // Still show success since the update worked
      }
      
    } catch (err: any) {
      console.error('Error updating profile:', err);
      console.error('Error response:', err.response?.data);
      console.error('Error status:', err.response?.status);
      console.error('Error headers:', err.response?.headers);
      if (err.response?.status === 403) {
        setError('Access denied. You can only edit your own profile.');
      } else {
        setError(err.response?.data?.message || 'Failed to update profile');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (user) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phone: user.phone || '',
        address: {
          street: user.address?.street || '',
          city: user.address?.city || '',
          state: user.address?.state || '',
          zipCode: user.address?.zipCode || '',
          country: user.address?.country || ''
        },
        emergencyContact: {
          name: user.emergencyContact?.name || '',
          relationship: user.emergencyContact?.relationship || '',
          phone: user.emergencyContact?.phone || '',
          email: user.emergencyContact?.email || ''
        },
        medicalInfo: {
          bloodType: user.medicalInfo?.bloodType || '',
          allergies: user.medicalInfo?.allergies || [],
          medications: user.medicalInfo?.medications || [],
          medicalConditions: user.medicalInfo?.medicalConditions || []
        }
      });
    }
    setIsEditing(false);
    setError(null);
    setSuccess(null);
  };

  const addAllergy = () => {
    if (newAllergy.trim()) {
      setFormData(prev => ({
        ...prev,
        medicalInfo: {
          ...prev.medicalInfo,
          allergies: [...prev.medicalInfo.allergies, newAllergy.trim()]
        }
      }));
      setNewAllergy('');
      setOpenAllergyDialog(false);
    }
  };

  const removeAllergy = (index: number) => {
    setFormData(prev => ({
      ...prev,
      medicalInfo: {
        ...prev.medicalInfo,
        allergies: prev.medicalInfo.allergies.filter((_, i) => i !== index)
      }
    }));
  };

  const addMedication = () => {
    if (newMedication.trim()) {
      setFormData(prev => ({
        ...prev,
        medicalInfo: {
          ...prev.medicalInfo,
          medications: [...prev.medicalInfo.medications, newMedication.trim()]
        }
      }));
      setNewMedication('');
      setOpenMedicationDialog(false);
    }
  };

  const removeMedication = (index: number) => {
    setFormData(prev => ({
      ...prev,
      medicalInfo: {
        ...prev.medicalInfo,
        medications: prev.medicalInfo.medications.filter((_, i) => i !== index)
      }
    }));
  };

  const addCondition = () => {
    if (newCondition.trim()) {
      setFormData(prev => ({
        ...prev,
        medicalInfo: {
          ...prev.medicalInfo,
          medicalConditions: [...prev.medicalInfo.medicalConditions, newCondition.trim()]
        }
      }));
      setNewCondition('');
      setOpenConditionDialog(false);
    }
  };

  const removeCondition = (index: number) => {
    setFormData(prev => ({
      ...prev,
      medicalInfo: {
        ...prev.medicalInfo,
        medicalConditions: prev.medicalInfo.medicalConditions.filter((_, i) => i !== index)
      }
    }));
  };

  if (loading) {
    return (
      <Layout>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  if (!user) {
    return (
      <Layout>
        <Box>
          <Alert severity="error">Please log in to view your profile.</Alert>
        </Box>
      </Layout>
    );
  }

  return (
    <Layout>
      <Box>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4" component="h1">
            Profile
          </Typography>
          {!isEditing ? (
            <Button
              variant="contained"
              startIcon={<EditIcon />}
              onClick={handleEditClick}
            >
              Edit Profile
            </Button>
          ) : (
            <Box>
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={handleSave}
                disabled={saving}
                sx={{ mr: 1 }}
              >
                {saving ? <CircularProgress size={20} /> : 'Save'}
              </Button>
              <Button
                variant="outlined"
                startIcon={<CancelIcon />}
                onClick={handleCancel}
                disabled={saving}
              >
                Cancel
              </Button>
            </Box>
          )}
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        <Grid container spacing={3}>
          {/* Profile Header */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" mb={2}>
                  {formData.profileImage ? (
                    <img
                      {...createImageProps(formData.profileImage)}
                      alt={`${user.firstName} ${user.lastName}`}
                      style={{
                        width: 80,
                        height: 80,
                        borderRadius: '50%',
                        objectFit: 'cover',
                        marginRight: 16,
                        border: '2px solid #e0e0e0'
                      }}
                    />
                  ) : (
                    <Avatar 
                      sx={{ width: 80, height: 80, mr: 2 }}
                    >
                      <PersonIcon sx={{ fontSize: 40 }} />
                    </Avatar>
                  )}
                  <Box>
                    <Typography variant="h5">
                      {user.firstName} {user.lastName}
                    </Typography>
                    <Typography color="text.secondary">
                      {user.role?.replace('_', ' ').toUpperCase()}
                    </Typography>
                    <Typography color="text.secondary">
                      {user.email}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Personal Information */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Personal Information
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="First Name"
                      value={formData.firstName}
                      onChange={(e) => handleInputChange('firstName', e.target.value)}
                      disabled={!isEditing}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="Last Name"
                      value={formData.lastName}
                      onChange={(e) => handleInputChange('lastName', e.target.value)}
                      disabled={!isEditing}
                    />
                  </Grid>
                  
                  {/* Photo Upload */}
                  {isEditing && (
                    <Grid item xs={12}>
                      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                        <PhotoUpload
                          onPhotoChange={setProfilePhoto}
                          currentPhoto={formData.profileImage}
                          size={120}
                        />
                      </Box>
                    </Grid>
                  )}
                  
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      disabled={!isEditing}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Phone"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      disabled={!isEditing}
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Address Information */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Address Information
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Street Address"
                      value={formData.address.street}
                      onChange={(e) => handleInputChange('address.street', e.target.value)}
                      disabled={!isEditing}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="City"
                      value={formData.address.city}
                      onChange={(e) => handleInputChange('address.city', e.target.value)}
                      disabled={!isEditing}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="State"
                      value={formData.address.state}
                      onChange={(e) => handleInputChange('address.state', e.target.value)}
                      disabled={!isEditing}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="ZIP Code"
                      value={formData.address.zipCode}
                      onChange={(e) => handleInputChange('address.zipCode', e.target.value)}
                      disabled={!isEditing}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="Country"
                      value={formData.address.country}
                      onChange={(e) => handleInputChange('address.country', e.target.value)}
                      disabled={!isEditing}
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Emergency Contact */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Emergency Contact
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Contact Name"
                      value={formData.emergencyContact.name}
                      onChange={(e) => handleInputChange('emergencyContact.name', e.target.value)}
                      disabled={!isEditing}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="Relationship"
                      value={formData.emergencyContact.relationship}
                      onChange={(e) => handleInputChange('emergencyContact.relationship', e.target.value)}
                      disabled={!isEditing}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="Phone"
                      value={formData.emergencyContact.phone}
                      onChange={(e) => handleInputChange('emergencyContact.phone', e.target.value)}
                      disabled={!isEditing}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Email"
                      type="email"
                      value={formData.emergencyContact.email}
                      onChange={(e) => handleInputChange('emergencyContact.email', e.target.value)}
                      disabled={!isEditing}
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Medical Information */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Medical Information
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <FormControl fullWidth disabled={!isEditing}>
                      <InputLabel>Blood Type</InputLabel>
                      <Select
                        value={formData.medicalInfo.bloodType}
                        onChange={(e) => handleInputChange('medicalInfo.bloodType', e.target.value)}
                        label="Blood Type"
                      >
                        <MenuItem value="">Select Blood Type</MenuItem>
                        <MenuItem value="A+">A+</MenuItem>
                        <MenuItem value="A-">A-</MenuItem>
                        <MenuItem value="B+">B+</MenuItem>
                        <MenuItem value="B-">B-</MenuItem>
                        <MenuItem value="AB+">AB+</MenuItem>
                        <MenuItem value="AB-">AB-</MenuItem>
                        <MenuItem value="O+">O+</MenuItem>
                        <MenuItem value="O-">O-</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  
                  <Grid item xs={12}>
                    <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                      <Typography variant="subtitle2">Allergies</Typography>
                      {isEditing && (
                        <IconButton
                          size="small"
                          onClick={() => setOpenAllergyDialog(true)}
                        >
                          <AddIcon />
                        </IconButton>
                      )}
                    </Box>
                    <Box display="flex" flexWrap="wrap" gap={1}>
                      {formData.medicalInfo.allergies.map((allergy, index) => (
                        <Chip
                          key={index}
                          label={allergy}
                          onDelete={isEditing ? () => removeAllergy(index) : undefined}
                          color="error"
                          variant="outlined"
                        />
                      ))}
                    </Box>
                  </Grid>

                  <Grid item xs={12}>
                    <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                      <Typography variant="subtitle2">Medications</Typography>
                      {isEditing && (
                        <IconButton
                          size="small"
                          onClick={() => setOpenMedicationDialog(true)}
                        >
                          <AddIcon />
                        </IconButton>
                      )}
                    </Box>
                    <Box display="flex" flexWrap="wrap" gap={1}>
                      {formData.medicalInfo.medications.map((medication, index) => (
                        <Chip
                          key={index}
                          label={medication}
                          onDelete={isEditing ? () => removeMedication(index) : undefined}
                          color="primary"
                          variant="outlined"
                        />
                      ))}
                    </Box>
                  </Grid>

                  <Grid item xs={12}>
                    <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                      <Typography variant="subtitle2">Medical Conditions</Typography>
                      {isEditing && (
                        <IconButton
                          size="small"
                          onClick={() => setOpenConditionDialog(true)}
                        >
                          <AddIcon />
                        </IconButton>
                      )}
                    </Box>
                    <Box display="flex" flexWrap="wrap" gap={1}>
                      {formData.medicalInfo.medicalConditions.map((condition, index) => (
                        <Chip
                          key={index}
                          label={condition}
                          onDelete={isEditing ? () => removeCondition(index) : undefined}
                          color="warning"
                          variant="outlined"
                        />
                      ))}
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Password Verification Dialog */}
        <Dialog 
          open={passwordDialogOpen} 
          onClose={() => {
            setPasswordDialogOpen(false);
            setPassword('');
            setPasswordError(null);
          }}
          maxWidth="sm" 
          fullWidth
        >
          <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LockIcon color="primary" />
            Security Verification Required
          </DialogTitle>
          <DialogContent>
            <Typography variant="body1" sx={{ mb: 2 }}>
              Please enter your password to edit your profile.
            </Typography>
            <TextField
              fullWidth
              type="password"
              label="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={!!passwordError}
              helperText={passwordError}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  verifyPassword();
                }
              }}
              disabled={verifyingPassword}
              sx={{ mt: 2 }}
            />
          </DialogContent>
          <DialogActions>
            <Button 
              onClick={() => {
                setPasswordDialogOpen(false);
                setPassword('');
                setPasswordError(null);
              }}
              disabled={verifyingPassword}
            >
              Cancel
            </Button>
            <Button 
              onClick={verifyPassword}
              variant="contained"
              disabled={!password || verifyingPassword}
              startIcon={verifyingPassword ? <CircularProgress size={20} /> : <LockIcon />}
            >
              {verifyingPassword ? 'Verifying...' : 'Verify Password'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Add Allergy Dialog */}
        <Dialog open={openAllergyDialog} onClose={() => setOpenAllergyDialog(false)}>
          <DialogTitle>Add Allergy</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Allergy"
              fullWidth
              variant="outlined"
              value={newAllergy}
              onChange={(e) => setNewAllergy(e.target.value)}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenAllergyDialog(false)}>Cancel</Button>
            <Button onClick={addAllergy} variant="contained">Add</Button>
          </DialogActions>
        </Dialog>

        {/* Add Medication Dialog */}
        <Dialog open={openMedicationDialog} onClose={() => setOpenMedicationDialog(false)}>
          <DialogTitle>Add Medication</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Medication"
              fullWidth
              variant="outlined"
              value={newMedication}
              onChange={(e) => setNewMedication(e.target.value)}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenMedicationDialog(false)}>Cancel</Button>
            <Button onClick={addMedication} variant="contained">Add</Button>
          </DialogActions>
        </Dialog>

        {/* Add Condition Dialog */}
        <Dialog open={openConditionDialog} onClose={() => setOpenConditionDialog(false)}>
          <DialogTitle>Add Medical Condition</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Medical Condition"
              fullWidth
              variant="outlined"
              value={newCondition}
              onChange={(e) => setNewCondition(e.target.value)}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenConditionDialog(false)}>Cancel</Button>
            <Button onClick={addCondition} variant="contained">Add</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  );
};

export default Profile;
