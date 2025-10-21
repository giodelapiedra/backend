import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  Avatar
} from '@mui/material';
import {
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Add as AddIcon,
  Person as PersonIcon,
  Lock as LockIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import LayoutWithSidebar from '../components/LayoutWithSidebar';
import { useAuth } from '../contexts/AuthContext.supabase';
import PhotoUpload from '../components/PhotoUpload';
import { getProfileImageProps, clearImageCache } from '../utils/imageUtils';
import { authClient, dataClient, supabaseHelpers } from '../lib/supabase';

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

const Profile: React.FC = React.memo(() => {
  const { user, refreshUser, updateUserInContext } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
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

  const [isInitialized, setIsInitialized] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [freshProfileData, setFreshProfileData] = useState<any>(null);
  const [forceUpdate, setForceUpdate] = useState(0);
  const [justSaved, setJustSaved] = useState(false);
  const [showRefreshModal, setShowRefreshModal] = useState(false);

  // Function to refresh profile images by clearing cache
  const refreshProfileImage = () => {
    if (formData.profileImage) {
      // Clear image cache and update URL
      const refreshedImageUrl = clearImageCache(formData.profileImage);
      setFormData(prev => ({
        ...prev,
        profileImage: refreshedImageUrl
      }));
    }
  };

  // Function to aggressively clear all browser cache
  const clearAllBrowserCache = async () => {
    console.log('=== CLEARING ALL BROWSER CACHE ===');
    
    try {
      // Clear localStorage
      localStorage.clear();
      console.log('✅ localStorage cleared');
      
      // Clear sessionStorage
      sessionStorage.clear();
      console.log('✅ sessionStorage cleared');
      
      // Clear IndexedDB
      if ('indexedDB' in window) {
        try {
          const databases = await indexedDB.databases();
          await Promise.all(databases.map(db => {
            return new Promise((resolve, reject) => {
              if (db.name) {
                const deleteReq = indexedDB.deleteDatabase(db.name);
                deleteReq.onsuccess = () => resolve(true);
                deleteReq.onerror = () => reject(deleteReq.error);
              } else {
                resolve(true);
              }
            });
          }));
          console.log('✅ IndexedDB cleared');
        } catch (error) {
          console.log('❌ IndexedDB clear error:', error);
        }
      }
      
      // Clear Service Worker cache
      if ('serviceWorker' in navigator) {
        try {
          const registrations = await navigator.serviceWorker.getRegistrations();
          await Promise.all(registrations.map(registration => registration.unregister()));
          console.log('✅ Service Worker cleared');
        } catch (error) {
          console.log('❌ Service Worker clear error:', error);
        }
      }
      
      // Clear Cache API
      if ('caches' in window) {
        try {
          const cacheNames = await caches.keys();
          await Promise.all(cacheNames.map(cacheName => caches.delete(cacheName)));
          console.log('✅ Cache API cleared');
        } catch (error) {
          console.log('❌ Cache API clear error:', error);
        }
      }
      
      // Clear cookies but preserve login/auth cookies
      try {
        const cookiesToPreserve = ['supabase.auth.token', 'sb-', 'auth-token'];
        
        document.cookie.split(";").forEach(function(cookie) { 
          const cookieName = cookie.replace(/^ +/, "").split("=")[0];
          
          // Only clear cookies that are not auth-related
          const shouldPreserve = cookiesToPreserve.some(preserveName => 
            cookieName.includes(preserveName)
          );
          
          if (!shouldPreserve) {
            document.cookie = cookie.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
          }
        });
        console.log('✅ Non-auth cookies cleared (login cookies preserved)');
      } catch (error) {
        console.log('❌ Cookie clear error:', error);
      }
      
      console.log('=== BROWSER CACHE CLEARED ===');
    } catch (error) {
      console.error('Error clearing browser cache:', error);
    }
  };

  // Function to clear only profile-related cache (preserve auth)
  const clearProfileCache = async () => {
    console.log('=== CLEARING PROFILE CACHE ONLY ===');
    
    try {
      // Clear localStorage but preserve auth data
      const authKeys = ['supabase.auth.token', 'sb-', 'auth-token'];
      const keysToRemove = [];
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && !authKeys.some(authKey => key.includes(authKey))) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => localStorage.removeItem(key));
      console.log('✅ Profile localStorage cleared (auth preserved)');
      
      // Clear sessionStorage but preserve auth data
      const sessionKeysToRemove = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && !authKeys.some(authKey => key.includes(authKey))) {
          sessionKeysToRemove.push(key);
        }
      }
      
      sessionKeysToRemove.forEach(key => sessionStorage.removeItem(key));
      console.log('✅ Profile sessionStorage cleared (auth preserved)');
      
      // Clear Cache API (this shouldn't affect auth)
      if ('caches' in window) {
        try {
          const cacheNames = await caches.keys();
          await Promise.all(cacheNames.map(cacheName => caches.delete(cacheName)));
          console.log('✅ Cache API cleared');
        } catch (error) {
          console.log('❌ Cache API clear error:', error);
        }
      }
      
      console.log('=== PROFILE CACHE CLEARED (AUTH PRESERVED) ===');
    } catch (error) {
      console.error('Error clearing profile cache:', error);
    }
  };

  // Function to refresh profile data without page reload
  const refreshProfileData = async () => {
    console.log('=== REFRESHING PROFILE DATA ===');
    
    try {
      // Clear profile cache first (preserves auth)
      await clearProfileCache();
      
      // Fetch fresh profile data
      if (!user?.id) return;

      console.log('Fetching fresh profile data for user:', user.id);

      // Always fetch fresh data from database
      const { data, error } = await dataClient
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching fresh profile:', error);
        return;
      }

      console.log('Fresh profile data from DB:', data);
      
      // Transform data to match form structure
      const newFormData = {
        firstName: data.first_name || '',
        lastName: data.last_name || '',
        email: data.email || '',
        phone: data.phone || '',
        profileImage: data.profile_image_url || '',
        address: {
          street: data.address?.street || '',
          city: data.address?.city || '',
          state: data.address?.state || '',
          zipCode: data.address?.zipCode || '',
          country: data.address?.country || ''
        },
        emergencyContact: {
          name: data.emergency_contact?.name || '',
          relationship: data.emergency_contact?.relationship || '',
          phone: data.emergency_contact?.phone || '',
          email: data.emergency_contact?.email || ''
        },
        medicalInfo: {
          bloodType: data.medical_info?.bloodType || '',
          allergies: data.medical_info?.allergies || [],
          medications: data.medical_info?.medications || [],
          medicalConditions: data.medical_info?.medicalConditions || []
        }
      };

      console.log('Setting refreshed form data:', newFormData);
      setFormData(newFormData);
      
      // Update auth context with fresh data
      updateUserInContext(data);
      
      // Force UI update
      setForceUpdate(prev => prev + 1);
      
      console.log('=== PROFILE DATA REFRESHED ===');
    } catch (error) {
      console.error('Error refreshing profile data:', error);
    }
  };

  // Fresh query function to bypass Supabase caching
  const fetchFreshProfile = async (forceRefresh = false) => {
    if (!user?.id) return;

    console.log('=== FETCHING FRESH PROFILE ===');
    console.log('User ID:', user.id);
    console.log('Force refresh:', forceRefresh);

    try {
      // Disable caching in Supabase client
      const timestamp = new Date().getTime();
      
      // First, invalidate any cached data
      await dataClient.auth.refreshSession();
      
      // Then fetch fresh data with no-cache headers
      const { data, error } = await dataClient
        .from('users')
        .select('*')
        .eq('id', user.id)
        .abortSignal(new AbortController().signal) // Forces new request
        .single();

      if (error) {
        console.error('Error fetching fresh profile:', error);
        return;
      }

      console.log('Fresh profile data from database:', data);
      console.log('Fresh first_name:', data?.first_name);
      console.log('Fresh last_name:', data?.last_name);
      console.log('=== END FETCHING FRESH PROFILE ===');

      // Force a re-render by creating a new object
      const freshData = {...data, _timestamp: timestamp};
      setFreshProfileData(freshData);
      
      // Always update context to ensure sync
      updateUserInContext(freshData);
      
      return freshData;
    } catch (error) {
      console.error('Error in fetchFreshProfile:', error);
    }
  };

  // Auto-refresh profile images on page load
  useEffect(() => {
    if (formData.profileImage && !justSaved) {
      // Add a small delay to allow initial load, then refresh if needed
      const timer = setTimeout(() => {
        if (document.querySelector('img[alt*="profile"]')) {
          const img = document.querySelector('img[alt*="profile"]') as HTMLImageElement;
          if (img && img.naturalWidth === 0) {
            console.log('🔄 Auto-refreshing profile image due to failed load');
            refreshProfileImage();
          }
        }
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [formData.profileImage, justSaved]);

  // Fresh profile fetch on page load - always get latest from DB
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.id) return;

      console.log('=== FETCHING FRESH PROFILE ON LOAD ===');
      console.log('User ID:', user.id);

      try {
        // Always fetch fresh data from database
        const { data, error } = await dataClient
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error fetching fresh profile:', error);
          return;
        }

        console.log('Fresh profile data from DB:', data);
        
        // Transform data to match form structure
        const newFormData = {
          firstName: data.first_name || '',
          lastName: data.last_name || '',
          email: data.email || '',
          phone: data.phone || '',
          profileImage: data.profile_image_url || '',
          address: {
            street: data.address?.street || '',
            city: data.address?.city || '',
            state: data.address?.state || '',
            zipCode: data.address?.zipCode || '',
            country: data.address?.country || ''
          },
          emergencyContact: {
            name: data.emergency_contact?.name || '',
            relationship: data.emergency_contact?.relationship || '',
            phone: data.emergency_contact?.phone || '',
            email: data.emergency_contact?.email || ''
          },
          medicalInfo: {
            bloodType: data.medical_info?.bloodType || '',
            allergies: data.medical_info?.allergies || [],
            medications: data.medical_info?.medications || [],
            medicalConditions: data.medical_info?.medicalConditions || []
          }
        };

        console.log('Setting fresh form data:', newFormData);
        setFormData(newFormData);
        
        // Update auth context with fresh data
        updateUserInContext(data);
        
        console.log('=== END FRESH PROFILE FETCH ===');
      } catch (error) {
        console.error('Error in fetchProfile:', error);
      }
    };

    fetchProfile();
  }, [user?.id]);

  // Set up Supabase real-time subscription
  useEffect(() => {
    if (!user?.id) return;

    console.log('Setting up real-time subscription for user:', user.id);

    // Subscribe to profile changes
    const subscription = dataClient
      .channel('profile_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'users',
          filter: `id=eq.${user.id}`
        },
        async (payload) => {
          console.log('Real-time update received:', payload);
          console.log('Current justSaved state:', justSaved);
          
          // Don't fetch fresh profile if we just saved to avoid conflicts
          if (justSaved) {
            console.log('Just saved, skipping real-time update to avoid conflicts');
            return;
          }
          
          await fetchFreshProfile(true);
        }
      )
      .subscribe();

    // Cleanup subscription
    return () => {
      console.log('Cleaning up real-time subscription');
      subscription.unsubscribe();
    };
  }, [user?.id]);

  // Keep form data in sync with auth context
  useEffect(() => {
    console.log('=== AUTH CONTEXT CHANGED ===');
    console.log('Current user data:', user);
    console.log('Current form data:', formData);
    console.log('Is editing:', isEditing);
    console.log('Just saved:', justSaved);
    
    // Don't override form data if user is currently editing or just saved
    if (isEditing || justSaved) {
      console.log('User is editing or just saved, skipping auth context update');
      return;
    }
    
    console.log('WARNING: Auth context is about to override form data!');
    console.log('Auth context user data:', user);
    console.log('Current form data before override:', formData);
    
    if (user) {
      const newFormData = {
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

      console.log('New form data from auth context:', newFormData);
      console.log('WARNING: Auth context is overriding form data!');
      setFormData(newFormData);
      
      // Force immediate UI update
      requestAnimationFrame(() => {
        setFormData(current => ({...current}));
      });
    }
    
    console.log('=== END AUTH CONTEXT UPDATE ===');
  }, [user, isEditing, justSaved]);

  // Update form data when fresh profile data is available
  useEffect(() => {
    if (freshProfileData) {
      console.log('=== FRESH DATA UPDATE ===');
      console.log('Fresh profile data:', freshProfileData);
      console.log('Is editing:', isEditing);
      console.log('Just saved:', justSaved);
      
      // Don't override form data if user is currently editing
      // But allow fresh data update even after save to get latest from database
      if (isEditing) {
        console.log('User is editing, skipping fresh data update');
        return;
      }
      
      // If just saved, we still want to update with fresh data from database
      if (justSaved) {
        console.log('Just saved, but allowing fresh data update to sync with database');
      }
      
      // Transform data to match form structure
      const newFormData = {
        firstName: freshProfileData.first_name || '',
        lastName: freshProfileData.last_name || '',
        email: freshProfileData.email || '',
        phone: freshProfileData.phone || '',
        profileImage: freshProfileData.profile_image_url || '',
        address: {
          street: freshProfileData.address?.street || '',
          city: freshProfileData.address?.city || '',
          state: freshProfileData.address?.state || '',
          zipCode: freshProfileData.address?.zipCode || '',
          country: freshProfileData.address?.country || ''
        },
        emergencyContact: {
          name: freshProfileData.emergency_contact?.name || '',
          relationship: freshProfileData.emergency_contact?.relationship || '',
          phone: freshProfileData.emergency_contact?.phone || '',
          email: freshProfileData.emergency_contact?.email || ''
        },
        medicalInfo: {
          bloodType: freshProfileData.medical_info?.bloodType || '',
          allergies: freshProfileData.medical_info?.allergies || [],
          medications: freshProfileData.medical_info?.medications || [],
          medicalConditions: freshProfileData.medical_info?.medicalConditions || []
        }
      };

      console.log('New form data from fresh data:', newFormData);
      console.log('WARNING: Fresh data is overriding form data!');
      
      // Update both form and context
      setFormData(newFormData);
      updateUserInContext(freshProfileData);
      
      // Force UI update using requestAnimationFrame
      requestAnimationFrame(() => {
        setFormData(current => ({...current}));
      });
      
      console.log('=== END FRESH DATA UPDATE ===');
    }
  }, [freshProfileData, isEditing]);

  const handleInputChange = useCallback((field: string, value: any) => {
    console.log('=== HANDLE INPUT CHANGE ===');
    console.log('Field:', field);
    console.log('Value:', value);
    console.log('Current form data before change:', formData);
    
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => {
        const newData = {
          ...prev,
          [parent]: {
            ...(prev[parent as keyof ProfileFormData] as any || {}),
            [child]: value
          }
        };
        console.log('New form data (nested):', newData);
        return newData;
      });
    } else {
      setFormData(prev => {
        const newData = {
          ...prev,
          [field]: value
        };
        console.log('New form data (simple):', newData);
        return newData;
      });
    }
    
    // Force UI update
    setForceUpdate(prev => prev + 1);
    console.log('=== END HANDLE INPUT CHANGE ===');
  }, [formData]);

  // Password verification function
  const verifyPassword = async () => {
    try {
      setVerifyingPassword(true);
      setPasswordError(null);
      
      if (!password) {
        setPasswordError('Password is required');
        return;
      }

      // Verify password with Supabase Auth
      const { data, error } = await authClient.auth.signInWithPassword({
        email: user?.email || '',
        password: password
      });

      if (error) {
        console.log('Password verification error:', error);
        setPasswordError('Invalid password');
        return;
      }

      // Password verified successfully
      setPasswordDialogOpen(false);
      setPassword('');
      setIsEditing(true); // Enable edit mode after verification
    } catch (err: any) {
      console.log('Password verification error:', err);
      setPasswordError('Password verification failed');
    } finally {
      setVerifyingPassword(false);
    }
  };

  const handleEditClick = () => {
    setPasswordDialogOpen(true);
  };

  const handleSave = useCallback(async () => {
    try {
      setSaving(true);
      setIsUpdating(true);
      setError(null);
      setSuccess(null);

      // Ensure we're only updating the current user's profile
      if (!user?.id) {
        setError('User not found');
        return;
      }

      // Only include fields that have actually changed
      const changedFields: any = {};
      
      console.log('=== CHECKING CHANGED FIELDS ===');
      console.log('Current fresh profile data:', freshProfileData);
      console.log('Current form data:', formData);
      
      if (formData.firstName !== (freshProfileData?.first_name || '')) {
        console.log('FirstName changed:', freshProfileData?.first_name, '->', formData.firstName);
        changedFields.firstName = formData.firstName;
      }
      if (formData.lastName !== (freshProfileData?.last_name || '')) {
        console.log('LastName changed:', freshProfileData?.last_name, '->', formData.lastName);
        changedFields.lastName = formData.lastName;
      }
      if (formData.email !== (freshProfileData?.email || '')) {
        console.log('Email changed:', freshProfileData?.email, '->', formData.email);
        changedFields.email = formData.email;
      }
      if (formData.phone !== (freshProfileData?.phone || '')) {
        console.log('Phone changed:', freshProfileData?.phone, '->', formData.phone);
        changedFields.phone = formData.phone;
      }
      
      // Check if address has changed
      const addressChanged = JSON.stringify(formData.address) !== JSON.stringify({
        street: freshProfileData?.address?.street || '',
        city: freshProfileData?.address?.city || '',
        state: freshProfileData?.address?.state || '',
        zipCode: freshProfileData?.address?.zipCode || '',
        country: freshProfileData?.address?.country || ''
      });
      if (addressChanged) {
        console.log('Address changed');
        changedFields.address = formData.address;
      }
      
      // Check if emergency contact has changed
      const emergencyContactChanged = JSON.stringify(formData.emergencyContact) !== JSON.stringify({
        name: freshProfileData?.emergency_contact?.name || '',
        relationship: freshProfileData?.emergency_contact?.relationship || '',
        phone: freshProfileData?.emergency_contact?.phone || '',
        email: freshProfileData?.emergency_contact?.email || ''
      });
      if (emergencyContactChanged) {
        console.log('Emergency contact changed');
        changedFields.emergencyContact = formData.emergencyContact;
      }
      
      // Check if medical info has changed
      const medicalInfoChanged = JSON.stringify(formData.medicalInfo || {}) !== JSON.stringify({
        bloodType: freshProfileData?.medical_info?.bloodType || '',
        allergies: freshProfileData?.medical_info?.allergies || [],
        medications: freshProfileData?.medical_info?.medications || [],
        medicalConditions: freshProfileData?.medical_info?.medicalConditions || []
      });
      if (medicalInfoChanged) {
        console.log('Medical info changed');
        changedFields.medicalInfo = formData.medicalInfo || {};
      }

      console.log('Changed fields detected:', changedFields);
      console.log('Current form data being saved:', formData);
      console.log('=== END CHECKING CHANGED FIELDS ===');

      // Update profile using Supabase
      const updateData: any = {
        first_name: changedFields.firstName,
        last_name: changedFields.lastName,
        email: changedFields.email,
        phone: changedFields.phone,
        address: changedFields.address,
        emergency_contact: changedFields.emergencyContact,
        medical_info: changedFields.medicalInfo
      };

      // Remove undefined fields
      Object.keys(updateData).forEach((key: string) => {
        if (updateData[key] === undefined) {
          delete updateData[key];
        }
      });

      // Update user profile in Supabase with cache busting
      console.log('=== PROFILE UPDATE DEBUG ===');
      console.log('Updating user profile with data:', updateData);
      console.log('User ID:', user.id);
      console.log('User object before update:', user);
      
      // Check if updateData is empty AND no profile photo upload
      if (Object.keys(updateData).length === 0 && !profilePhoto) {
        console.warn('WARNING: updateData is empty and no profile photo to upload');
        throw new Error('No fields to update');
      }

      // If there's a profile photo but no other changes, skip the profile update
      if (Object.keys(updateData).length === 0 && profilePhoto) {
        console.log('Only profile photo upload, skipping profile data update');
        // We'll handle just the photo upload below
      }
      
      // Update profile using Supabase helper (only if there are changes)
      let updatedUser = null;
      if (Object.keys(updateData).length > 0) {
        console.log('Updating profile with data:', updateData);
        updatedUser = await supabaseHelpers.updateUserProfile(user.id, updateData);

        if (!updatedUser) {
          console.error('Failed to update profile: No data returned');
          throw new Error('Failed to update profile');
        }

        console.log('Profile updated successfully:', updatedUser);
        console.log('Updated user first_name:', updatedUser?.first_name);
        console.log('Updated user last_name:', updatedUser?.last_name);
        console.log('=== END PROFILE UPDATE DEBUG ===');
      } else {
        console.log('Skipping profile data update - no text field changes detected');
      }

      // Handle profile photo upload if provided
      if (profilePhoto) {
        try {
          console.log('Uploading profile photo to Supabase Storage...');
          const imageUrl = await supabaseHelpers.uploadProfileImage(user.id, profilePhoto);
          
          // Update the user profile with the new image URL
          console.log('💾 Saving profile_image_url to database:', imageUrl);
          const profileUpdate = await supabaseHelpers.updateUserProfile(user.id, {
            profile_image_url: imageUrl
          });
          
          console.log('✅ Profile photo URL saved to database:', profileUpdate?.profile_image_url);
          console.log('🔗 Full profile update result:', profileUpdate);
          
          // Update local state
          setFormData(prev => ({
            ...prev,
            profileImage: imageUrl
          }));
          
        } catch (error) {
          console.error('Error uploading profile photo:', error);
          throw new Error('Failed to upload profile photo. Please try again.');
        }
      }
      
      // Refresh profile from database to get latest data
      console.log('=== REFRESHING PROFILE AFTER SAVE ===');
      const { data: refreshedData, error: refreshError } = await dataClient
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (refreshError) {
        console.error('Error refreshing profile after save:', refreshError);
      } else {
        console.log('Refreshed profile data:', refreshedData);
        
        // Update form data with fresh data from database
        const newFormData = {
          firstName: refreshedData.first_name || '',
          lastName: refreshedData.last_name || '',
          email: refreshedData.email || '',
          phone: refreshedData.phone || '',
          profileImage: refreshedData.profile_image_url || '',
          address: {
            street: refreshedData.address?.street || '',
            city: refreshedData.address?.city || '',
            state: refreshedData.address?.state || '',
            zipCode: refreshedData.address?.zipCode || '',
            country: refreshedData.address?.country || ''
          },
          emergencyContact: {
            name: refreshedData.emergency_contact?.name || '',
            relationship: refreshedData.emergency_contact?.relationship || '',
            phone: refreshedData.emergency_contact?.phone || '',
            email: refreshedData.emergency_contact?.email || ''
          },
          medicalInfo: {
            bloodType: refreshedData.medical_info?.bloodType || '',
            allergies: refreshedData.medical_info?.allergies || [],
            medications: refreshedData.medical_info?.medications || [],
            medicalConditions: refreshedData.medical_info?.medicalConditions || []
          }
        };
        
        console.log('Setting refreshed form data:', newFormData);
        setFormData(newFormData);
        
        // Update auth context with fresh data
        updateUserInContext(refreshedData);
        
        // Show success message based on what was updated
        if (profilePhoto && Object.keys(updateData).length > 0) {
          setSuccess(`Profile and photo updated successfully! Name saved as: ${refreshedData.first_name} ${refreshedData.last_name}`);
        } else if (profilePhoto) {
          setSuccess('Profile photo updated successfully!');
        } else {
          setSuccess(`Profile updated successfully! Name saved as: ${refreshedData.first_name} ${refreshedData.last_name}`);
        }
        console.log('=== END PROFILE REFRESH ===');
        
        // Show beautiful confirmation modal
        setShowRefreshModal(true);
      }
      
      setIsEditing(false);
      setProfilePhoto(null); // Reset photo state after successful save
      setJustSaved(true); // Prevent useEffect from overriding the saved data
      
      // Don't reset isInitialized to prevent useEffect from overriding our form data
      
    } catch (err: any) {
      if (err.response?.status === 403) {
        setError('Access denied. You can only edit your own profile.');
      } else {
        setError(err.response?.data?.message || 'Failed to update profile');
      }
    } finally {
      setSaving(false);
      setIsUpdating(false);
    }
  }, [user, formData, profilePhoto, updateUserInContext]);

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
    setIsInitialized(false); // Reset to allow fresh data loading
    setJustSaved(false); // Reset just saved flag
  };

  // Modal handlers
  const handleRefreshConfirm = async () => {
    setShowRefreshModal(false);
    
    try {
      console.log('=== REFRESHING PROFILE DATA ===');
      
      // Use the refresh function to get fresh data
      await refreshProfileData();
      
      // Show success message
      setSuccess('Profile updated and refreshed successfully!');
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
      
    } catch (error) {
      console.error('Error refreshing profile data:', error);
      setSuccess('Profile updated successfully! Please refresh the page to see your changes.');
    }
  };

  const handleRefreshCancel = () => {
    setShowRefreshModal(false);
    setTimeout(() => {
      setSuccess(null);
    }, 3000);
  };

  const addAllergy = () => {
    if (newAllergy.trim()) {
      setFormData(prev => ({
        ...prev,
        medicalInfo: {
          bloodType: prev.medicalInfo?.bloodType || '',
          allergies: [...(prev.medicalInfo?.allergies || []), newAllergy.trim()],
          medications: prev.medicalInfo?.medications || [],
          medicalConditions: prev.medicalInfo?.medicalConditions || []
        }
      }));
      setNewAllergy('');
      setOpenAllergyDialog(false);
      setForceUpdate(prev => prev + 1);
    }
  };

  const removeAllergy = (index: number) => {
    setFormData(prev => ({
      ...prev,
      medicalInfo: {
        bloodType: prev.medicalInfo?.bloodType || '',
        allergies: (prev.medicalInfo?.allergies || []).filter((_, i) => i !== index),
        medications: prev.medicalInfo?.medications || [],
        medicalConditions: prev.medicalInfo?.medicalConditions || []
      }
    }));
    setForceUpdate(prev => prev + 1);
  };

  const addMedication = () => {
    if (newMedication.trim()) {
      setFormData(prev => ({
        ...prev,
        medicalInfo: {
          bloodType: prev.medicalInfo?.bloodType || '',
          allergies: prev.medicalInfo?.allergies || [],
          medications: [...(prev.medicalInfo?.medications || []), newMedication.trim()],
          medicalConditions: prev.medicalInfo?.medicalConditions || []
        }
      }));
      setNewMedication('');
      setOpenMedicationDialog(false);
      setForceUpdate(prev => prev + 1);
    }
  };

  const removeMedication = (index: number) => {
    setFormData(prev => ({
      ...prev,
      medicalInfo: {
        bloodType: prev.medicalInfo?.bloodType || '',
        allergies: prev.medicalInfo?.allergies || [],
        medications: (prev.medicalInfo?.medications || []).filter((_, i) => i !== index),
        medicalConditions: prev.medicalInfo?.medicalConditions || []
      }
    }));
    setForceUpdate(prev => prev + 1);
  };

  const addCondition = () => {
    if (newCondition.trim()) {
      setFormData(prev => ({
        ...prev,
        medicalInfo: {
          bloodType: prev.medicalInfo?.bloodType || '',
          allergies: prev.medicalInfo?.allergies || [],
          medications: prev.medicalInfo?.medications || [],
          medicalConditions: [...(prev.medicalInfo?.medicalConditions || []), newCondition.trim()]
        }
      }));
      setNewCondition('');
      setOpenConditionDialog(false);
      setForceUpdate(prev => prev + 1);
    }
  };

  const removeCondition = (index: number) => {
    setFormData(prev => ({
      ...prev,
      medicalInfo: {
        bloodType: prev.medicalInfo?.bloodType || '',
        allergies: prev.medicalInfo?.allergies || [],
        medications: prev.medicalInfo?.medications || [],
        medicalConditions: (prev.medicalInfo?.medicalConditions || []).filter((_, i) => i !== index)
      }
    }));
    setForceUpdate(prev => prev + 1);
  };

  // Ensure medicalInfo is always properly initialized (must be before early return)
  const safeFormData = useMemo(() => ({
    ...formData,
    medicalInfo: {
      bloodType: formData.medicalInfo?.bloodType || '',
      allergies: formData.medicalInfo?.allergies || [],
      medications: formData.medicalInfo?.medications || [],
      medicalConditions: formData.medicalInfo?.medicalConditions || []
    }
  }), [formData]);

  if (!user) {
    return (
      <LayoutWithSidebar>
        <Box>
          <Alert severity="error">Please log in to view your profile.</Alert>
        </Box>
      </LayoutWithSidebar>
    );
  }
  
  // Force re-render when form data changes
  console.log('Current form data in render:', safeFormData);
  console.log('Force update counter:', forceUpdate);

  return (
    <LayoutWithSidebar>
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
          <Alert 
            severity="success" 
            sx={{ 
              mb: 2, 
              fontSize: '1.1rem',
              fontWeight: 'medium',
              padding: '12px 16px'
            }}
          >
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
                      {...getProfileImageProps(formData.profileImage)}
                      alt={`${safeFormData.firstName} ${safeFormData.lastName}`}
                      crossOrigin="anonymous"
                      style={{
                        width: 80,
                        height: 80,
                        borderRadius: '50%',
                        objectFit: 'cover',
                        marginRight: 16,
                        border: '2px solid #e0e0e0',
                        cursor: 'pointer'
                      }}
                      onClick={() => !isEditing && handleEditClick()}
                      title="Click to edit profile"
                    />
                  ) : (
                    <Avatar 
                      sx={{ 
                        width: 80, 
                        height: 80, 
                        mr: 2,
                        cursor: 'pointer',
                        border: !formData.profileImage ? '2px dashed #ccc' : 'none',
                        backgroundColor: !formData.profileImage ? '#f5f5f5' : '#e0e0e0'
                      }}
                      onClick={() => !isEditing && handleEditClick()}
                      title="Click to upload profile photo"
                    >
                      <PersonIcon sx={{ fontSize: 40 }} />
                    </Avatar>
                  )}
                  <Box>
                    <Typography variant="h5">
                      {safeFormData.firstName} {safeFormData.lastName}
                    </Typography>
                    <Typography color="text.secondary">
                      {user.role?.replace('_', ' ').toUpperCase()}
                    </Typography>
                    <Typography color="text.secondary">
                      {safeFormData.email}
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
                      value={safeFormData.firstName}
                      onChange={(e) => handleInputChange('firstName', e.target.value)}
                      disabled={!isEditing}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="Last Name"
                      value={safeFormData.lastName}
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
                      value={safeFormData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      disabled={!isEditing}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Phone"
                      value={safeFormData.phone}
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
                      value={safeFormData.address.street}
                      onChange={(e) => handleInputChange('address.street', e.target.value)}
                      disabled={!isEditing}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="City"
                      value={safeFormData.address.city}
                      onChange={(e) => handleInputChange('address.city', e.target.value)}
                      disabled={!isEditing}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="State"
                      value={safeFormData.address.state}
                      onChange={(e) => handleInputChange('address.state', e.target.value)}
                      disabled={!isEditing}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="ZIP Code"
                      value={safeFormData.address.zipCode}
                      onChange={(e) => handleInputChange('address.zipCode', e.target.value)}
                      disabled={!isEditing}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="Country"
                      value={safeFormData.address.country}
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
                      value={safeFormData.emergencyContact.name}
                      onChange={(e) => handleInputChange('emergencyContact.name', e.target.value)}
                      disabled={!isEditing}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="Relationship"
                      value={safeFormData.emergencyContact.relationship}
                      onChange={(e) => handleInputChange('emergencyContact.relationship', e.target.value)}
                      disabled={!isEditing}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="Phone"
                      value={safeFormData.emergencyContact.phone}
                      onChange={(e) => handleInputChange('emergencyContact.phone', e.target.value)}
                      disabled={!isEditing}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Email"
                      type="email"
                      value={safeFormData.emergencyContact.email}
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
                        value={safeFormData.medicalInfo.bloodType}
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
                      {safeFormData.medicalInfo.allergies.map((allergy, index) => (
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
                      {safeFormData.medicalInfo.medications.map((medication, index) => (
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
                      {safeFormData.medicalInfo.medicalConditions.map((condition, index) => (
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

        {/* Beautiful Confirmation Modal */}
        <Dialog 
          open={showRefreshModal} 
          onClose={handleRefreshCancel}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 2,
              boxShadow: '0 8px 32px rgba(34, 197, 94, 0.2)',
              backgroundColor: 'white',
              border: '2px solid #22c55e'
            }
          }}
        >
          <DialogContent sx={{ textAlign: 'center', py: 4 }}>
            <Box sx={{ mb: 3 }}>
              <CheckCircleIcon 
                sx={{ 
                  fontSize: 80, 
                  color: '#22c55e'
                }} 
              />
            </Box>
            
            <Typography 
              variant="h4" 
              component="h2" 
              sx={{ 
                fontWeight: 'bold', 
                mb: 2,
                color: '#1f2937'
              }}
            >
              Profile Updated Successfully!
            </Typography>
            
            <Typography 
              variant="h6" 
              sx={{ 
                mb: 3,
                fontWeight: 400,
                color: '#4b5563'
              }}
            >
              Your profile has been saved successfully. Do you want to refresh the page to see your changes?
            </Typography>
            
            <Box sx={{ 
              background: '#f0fdf4', 
              borderRadius: 2, 
              p: 2, 
              mb: 3,
              border: '1px solid #22c55e'
            }}>
              <Typography variant="body2" sx={{ color: '#374151' }}>
                💡 Refreshing will show your latest changes
              </Typography>
            </Box>
          </DialogContent>
          
          <DialogActions sx={{ 
            justifyContent: 'center', 
            pb: 3,
            gap: 2
          }}>
            <Button
              onClick={handleRefreshCancel}
              variant="outlined"
              sx={{
                color: '#22c55e',
                borderColor: '#22c55e',
                px: 4,
                py: 1.5,
                borderRadius: 2,
                fontWeight: 'bold',
                backgroundColor: 'white',
                '&:hover': {
                  borderColor: '#16a34a',
                  backgroundColor: '#f0fdf4'
                }
              }}
            >
              Cancel
            </Button>
            
            <Button
              onClick={handleRefreshConfirm}
              variant="contained"
              sx={{
                backgroundColor: '#22c55e',
                color: 'white',
                px: 4,
                py: 1.5,
                borderRadius: 2,
                fontWeight: 'bold',
                '&:hover': {
                  backgroundColor: '#16a34a'
                }
              }}
            >
              Confirm
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </LayoutWithSidebar>
  );
});

Profile.displayName = 'Profile';

export default Profile;

