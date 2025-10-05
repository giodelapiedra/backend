import React, { useState, useEffect, useCallback, memo } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Alert,
  CircularProgress,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Avatar,
  InputAdornment,
  Grid,
  Switch,
  FormControlLabel,
  Pagination,
} from '@mui/material';
import {
  People,
  Add,
  Edit,
  Delete,
  Search,
  Refresh,
  PersonAdd,
  PersonOff,
  Email,
  Phone,
  Work,
  Lock,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext.supabase';
import LayoutWithSidebar from '../../components/LayoutWithSidebar';
import { dataClient } from '../../lib/supabase';
import PhotoUpload from '../../components/PhotoUpload';
import { createImageProps } from '../../utils/imageUtils';

interface User {
  _id?: string;
  id?: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  phone?: string;
  specialty?: string;
  licenseNumber?: string;
  team?: string;
  isActive: boolean;
  isAvailable?: boolean;
  createdAt: string;
  lastLogin?: string;
  profileImage?: string;
}

const Users: React.FC = memo(() => {
  const { user: currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [userDialog, setUserDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [successDialog, setSuccessDialog] = useState(false);
  const [createdUser, setCreatedUser] = useState<User | null>(null);
  
  // Password verification states
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [verifyingPassword, setVerifyingPassword] = useState(false);
  const [pendingEditUser, setPendingEditUser] = useState<User | null>(null);
  const [pageAccessVerified, setPageAccessVerified] = useState(false);
  const [showPageContent, setShowPageContent] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [userForm, setUserForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'worker',
    phone: '',
    specialty: '',
    licenseNumber: '',
    team: '',
    isActive: true
  });
  const [passwordValidation, setPasswordValidation] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false
  });
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);

  // Add effect to track profilePhoto changes
  useEffect(() => {
    // Profile photo state tracking for debugging
  }, [profilePhoto]);


  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      console.log('🔄 Fetching users from Supabase...');
      
      let query = dataClient
        .from('users')
        .select('*', { count: 'exact' });
      
      // Apply filters
      if (searchTerm.trim()) {
        query = query.or(`first_name.ilike.%${searchTerm.trim()}%,last_name.ilike.%${searchTerm.trim()}%,email.ilike.%${searchTerm.trim()}%`);
      }
      
      if (roleFilter !== 'all') {
        query = query.eq('role', roleFilter);
      }
      
      if (statusFilter !== 'all') {
        query = query.eq('is_active', statusFilter === 'active');
      }
      
      // Apply pagination
      const from = (currentPage - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);
      
      const { data, error, count } = await query;
      
      if (error) {
        console.error('❌ Error fetching users:', error);
        setError('Failed to fetch users: ' + error.message);
        return;
      }
      
      console.log('✅ Users fetched:', data?.length);
      
      // Transform snake_case to camelCase for frontend compatibility
      const transformedUsers = (data || []).map((user: any) => ({
        id: user.id,
        _id: user.id, // For backward compatibility
        firstName: user.first_name || '',
        lastName: user.last_name || '',
        email: user.email || '',
        role: user.role || '',
        phone: user.phone || '',
        specialty: user.specialty || '',
        licenseNumber: user.license_number || '',
        team: user.team || '',
        isActive: user.is_active || false,
        isAvailable: user.is_available || false,
        createdAt: user.created_at || '',
        lastLogin: user.last_login || '',
        profileImage: user.profile_image_url || ''
      }));
      
      setUsers(transformedUsers);
      setTotalUsers(count || 0);
      setTotalPages(Math.ceil((count || 0) / pageSize));
      setError('');
    } catch (err: any) {
      console.error('❌ Error fetching users:', err);
      setError(err.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, searchTerm, roleFilter, statusFilter]);

  // Check if page access verification is needed
  useEffect(() => {
    if (currentUser?.role === 'case_manager') {
      // Case managers need password verification to access users page
      setPasswordDialogOpen(true);
      setShowPageContent(false);
    } else {
      // Admins can access directly
      setPageAccessVerified(true);
      setShowPageContent(true);
      fetchUsers();
    }
  }, [currentUser, fetchUsers]);

  useEffect(() => {
    if (pageAccessVerified && showPageContent) {
      fetchUsers();
    }
  }, [fetchUsers, pageAccessVerified, showPageContent]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, roleFilter, statusFilter]);

  // Pagination handlers
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const handlePageSizeChange = useCallback((newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1); // Reset to first page when changing page size
  }, []);

  const resetUserForm = useCallback(() => {
    setUserForm({
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      role: 'worker',
      phone: '',
      specialty: '',
      licenseNumber: '',
      team: '',
      isActive: true
    });
    setPasswordValidation({
      length: false,
      uppercase: false,
      lowercase: false,
      number: false,
      special: false
    });
    setProfilePhoto(null);
  }, []);

  // Password validation function
  const validatePassword = useCallback((password: string) => {
    const validation = {
      length: password.length >= 12,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
      special: /[@$!%*?&]/.test(password)
    };
    setPasswordValidation(validation);
    return Object.values(validation).every(Boolean);
  }, []);

  // Check if password is strong
  const isPasswordStrong = Object.values(passwordValidation).every(Boolean);

  const handleCreateUser = useCallback(async () => {
    // Validate password strength for new users
    if (!editingUser && !isPasswordStrong) {
      setError('Please ensure the password meets all requirements');
      return;
    }
    
    // Clear any previous errors
    setError('');
    
    try {
      setLoading(true);
      
      if (profilePhoto) {
        // Create FormData for file upload
        const formData = new FormData();
        formData.append('firstName', userForm.firstName.trim());
        formData.append('lastName', userForm.lastName.trim());
        formData.append('email', userForm.email.trim().toLowerCase());
        formData.append('password', userForm.password);
        formData.append('role', userForm.role);
        formData.append('phone', userForm.phone.trim() || '');
        formData.append('isActive', userForm.isActive.toString());
        formData.append('medicalInfo', JSON.stringify({
          allergies: [],
          medications: [],
          medicalConditions: []
        }));
        formData.append('isAvailable', 'true');
        
        if (userForm.role === 'clinician') {
          if (userForm.specialty.trim()) {
            formData.append('specialty', userForm.specialty.trim());
          }
          if (userForm.licenseNumber.trim()) {
            formData.append('licenseNumber', userForm.licenseNumber.trim());
          }
        }

        if (userForm.role === 'team_leader') {
          formData.append('team', userForm.team || 'DEFAULT TEAM');
          formData.append('defaultTeam', userForm.team || 'DEFAULT TEAM');
          formData.append('managedTeams', JSON.stringify([userForm.team || 'DEFAULT TEAM']));
        }
        
        formData.append('profileImage', profilePhoto);
        
        // For now, skip file upload and create user without photo
        console.log('⚠️ File upload not implemented yet, creating user without photo');
        const userData = {
          first_name: userForm.firstName.trim(),
          last_name: userForm.lastName.trim(),
          email: userForm.email.trim().toLowerCase(),
          password_hash: userForm.password,
          role: userForm.role,
          phone: userForm.phone.trim() || '',
          is_active: userForm.isActive,
          specialty: userForm.role === 'clinician' ? userForm.specialty.trim() : null,
          license_number: userForm.role === 'clinician' ? userForm.licenseNumber.trim() : null,
          team: userForm.role === 'team_leader' ? userForm.team || 'DEFAULT TEAM' : null,
          medical_info: {},
          emergency_contact: {},
          address: {}
        };
        
        const { data, error } = await dataClient
          .from('users')
          .insert([userData])
          .select()
          .single();
        
        if (error) {
          console.error('❌ Error creating user:', error);
          setError('Failed to create user: ' + error.message);
          return;
        }
        
        setCreatedUser(data);
      } else {
        // Regular JSON request without photo
        const userData = {
          first_name: userForm.firstName.trim(),
          last_name: userForm.lastName.trim(),
          email: userForm.email.trim().toLowerCase(),
          password_hash: userForm.password,
          role: userForm.role,
          phone: userForm.phone.trim() || '',
          is_active: userForm.isActive,
          specialty: userForm.role === 'clinician' ? userForm.specialty.trim() : null,
          license_number: userForm.role === 'clinician' ? userForm.licenseNumber.trim() : null,
          team: userForm.role === 'team_leader' ? userForm.team || 'DEFAULT TEAM' : null,
          medical_info: {
            allergies: [],
            medications: [],
            medicalConditions: []
          },
          emergency_contact: {},
          address: {}
        };

        const { data, error } = await dataClient
          .from('users')
          .insert([userData])
          .select()
          .single();
        
        if (error) {
          console.error('❌ Error creating user:', error);
          setError('Failed to create user: ' + error.message);
          return;
        }
        
        setCreatedUser(data);
      }
      
      setSuccessMessage('User created successfully!');
      setUserDialog(false);
      setSuccessDialog(true);
      resetUserForm();
      fetchUsers();
    } catch (err: any) {
      console.error('Error creating user:', err);
      const errorMessage = err.response?.data?.message || 'Failed to create user';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [userForm, fetchUsers, profilePhoto, resetUserForm, editingUser, isPasswordStrong]);

  const handleUpdateUser = useCallback(async () => {
    if (!editingUser) return;
    
    try {
      setLoading(true);
      
      // Check if we have a valid user ID
      if (!editingUser._id && !editingUser.id) {
        throw new Error('Invalid user ID - no ID found');
      }
      
      const userId = editingUser._id || editingUser.id;
      console.log('🔍 Admin Update User Debug:', {
        userId,
        profilePhoto: profilePhoto ? 'File selected' : 'No file',
        profilePhotoType: profilePhoto ? typeof profilePhoto : 'null',
        profilePhotoName: profilePhoto ? profilePhoto.name : 'N/A',
        editingUserProfileImage: editingUser.profileImage,
        profilePhotoState: profilePhoto
      });
      
      // Force a re-render to see current state
      console.log('🔄 Current profilePhoto state:', profilePhoto);
      
      let response;
      
      if (profilePhoto) {
        console.log('📸 Creating FormData with profile photo:', profilePhoto.name);
        // Create FormData for file upload
        const formData = new FormData();
        formData.append('firstName', userForm.firstName.trim());
        formData.append('lastName', userForm.lastName.trim());
        formData.append('email', userForm.email.trim().toLowerCase());
        formData.append('role', userForm.role);
        formData.append('phone', userForm.phone.trim() || '');
        formData.append('isActive', userForm.isActive.toString());
        
        // Only include password if it's provided and not empty
        if (userForm.password.trim()) {
          formData.append('password', userForm.password.trim());
        }

        if (userForm.role === 'clinician') {
          if (userForm.specialty.trim()) {
            formData.append('specialty', userForm.specialty.trim());
          }
          if (userForm.licenseNumber.trim()) {
            formData.append('licenseNumber', userForm.licenseNumber.trim());
          }
        }
        
        formData.append('profileImage', profilePhoto);
        
        console.log('Updating user with FormData (including profile photo)');
        // For now, skip file upload and update user without photo
        console.log('⚠️ File upload not implemented yet, updating user without photo');
        const updateData1: any = {
          first_name: userForm.firstName.trim(),
          last_name: userForm.lastName.trim(),
          email: userForm.email.trim().toLowerCase(),
          role: userForm.role,
          phone: userForm.phone.trim() || '',
          is_active: userForm.isActive,
          specialty: userForm.role === 'clinician' ? userForm.specialty.trim() : null,
          license_number: userForm.role === 'clinician' ? userForm.licenseNumber.trim() : null,
          team: userForm.role === 'team_leader' ? userForm.team || 'DEFAULT TEAM' : null
        };
        
        if (userForm.password.trim()) {
          updateData1.password_hash = userForm.password.trim();
        }
        
        const { data, error } = await dataClient
          .from('users')
          .update(updateData1)
          .eq('id', userId)
          .select()
          .single();
        
        if (error) {
          console.error('❌ Error updating user:', error);
          setError('Failed to update user: ' + error.message);
          return;
        }
        
        response = { data };
      } else {
        console.log('📝 No profile photo selected, using JSON request');
        // Regular JSON request without photo
        const updateData: any = {
          firstName: userForm.firstName.trim(),
          lastName: userForm.lastName.trim(),
          email: userForm.email.trim().toLowerCase(),
          role: userForm.role,
          phone: userForm.phone.trim() || '',
          isActive: userForm.isActive
        };

        // Only include password if it's provided and not empty
        if (userForm.password.trim()) {
          updateData.password = userForm.password.trim();
        }

        if (userForm.role === 'clinician') {
          if (userForm.specialty.trim()) {
            updateData.specialty = userForm.specialty.trim();
          }
          if (userForm.licenseNumber.trim()) {
            updateData.licenseNumber = userForm.licenseNumber.trim();
          }
        }

        console.log('Updating user with JSON data (no profile photo)');
        const updateData2: any = {
          first_name: userForm.firstName.trim(),
          last_name: userForm.lastName.trim(),
          email: userForm.email.trim().toLowerCase(),
          role: userForm.role,
          phone: userForm.phone.trim() || '',
          is_active: userForm.isActive,
          specialty: userForm.role === 'clinician' ? userForm.specialty.trim() : null,
          license_number: userForm.role === 'clinician' ? userForm.licenseNumber.trim() : null,
          team: userForm.role === 'team_leader' ? userForm.team || 'DEFAULT TEAM' : null
        };
        
        if (userForm.password.trim()) {
          updateData2.password_hash = userForm.password.trim();
        }
        
        const { data, error } = await dataClient
          .from('users')
          .update(updateData2)
          .eq('id', userId)
          .select()
          .single();
        
        if (error) {
          console.error('❌ Error updating user:', error);
          setError('Failed to update user: ' + error.message);
          return;
        }
        
        response = { data };
      }
      
      console.log('Update response:', response.data);
      
      setSuccessMessage('User updated successfully!');
      setUserDialog(false);
      setEditingUser(null);
      resetUserForm();
      fetchUsers();
    } catch (err: any) {
      console.error('Error updating user:', err);
      console.error('Error response:', err.response?.data);
      console.error('Error status:', err.response?.status);
      
      let errorMessage = 'Failed to update user';
      
      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.response?.data?.errors) {
        // Handle validation errors
        const errors = err.response.data.errors;
        errorMessage = Object.values(errors).flat().join(', ');
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [editingUser, userForm, fetchUsers, profilePhoto, resetUserForm]);

  const handleDeleteUser = useCallback(async (userId: string | undefined) => {
    if (!userId) {
      setError('Invalid user ID');
      return;
    }
    
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    
    try {
      setLoading(true);
      console.log('Deleting user with ID:', userId);
      const { error } = await dataClient
        .from('users')
        .delete()
        .eq('id', userId);
      
      if (error) {
        console.error('❌ Error deleting user:', error);
        setError('Failed to delete user: ' + error.message);
        return;
      }
      
      console.log('✅ User deleted successfully');
      setSuccessMessage('User deleted successfully!');
      fetchUsers();
    } catch (err: any) {
      console.error('Error deleting user:', err);
      console.error('Error response:', err.response?.data);
      setError(err.response?.data?.message || 'Failed to delete user');
    } finally {
      setLoading(false);
    }
  }, [fetchUsers]);

  const openCreateDialog = useCallback(() => {
    resetUserForm();
    setEditingUser(null);
    setUserDialog(true);
  }, [resetUserForm]);

  const openEditDialogDirect = useCallback((user: User) => {
    setUserForm({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      password: '',
      role: user.role,
      phone: user.phone || '',
      specialty: user.specialty || '',
      licenseNumber: user.licenseNumber || '',
      team: user.team || '',
      isActive: user.isActive
    });
    setProfilePhoto(null); // Reset profile photo state
    setEditingUser(user);
    setUserDialog(true);
  }, []);

  // Password verification function
  const verifyPassword = useCallback(async () => {
    try {
      setVerifyingPassword(true);
      setPasswordError(null);
      
      // For now, just check if password is not empty
      // In production, you'd want to verify against the actual user's password
      if (password.trim().length > 0) {
        setPasswordDialogOpen(false);
        setPassword('');
        
        if (pendingEditUser) {
          // User editing verification
          openEditDialogDirect(pendingEditUser);
          setPendingEditUser(null);
        } else {
          // Page access verification for case managers
          setPageAccessVerified(true);
          setShowPageContent(true);
        }
      } else {
        setPasswordError('Password cannot be empty');
      }
      
    } catch (err: any) {
      console.error('Error verifying password:', err);
      setPasswordError('Password verification failed');
    } finally {
      setVerifyingPassword(false);
    }
  }, [password, pendingEditUser, openEditDialogDirect]);


  const openEditDialog = useCallback((user: User) => {
    console.log('🔍 Edit requested for user:', user);
    
    // Always require password verification for each edit
    setPendingEditUser(user);
    setPasswordDialogOpen(true);
  }, []);

  const getRoleColor = useCallback((role: string) => {
    const colors: { [key: string]: string } = {
      admin: '#e74c3c',
      clinician: '#3498db',
      case_manager: '#2ecc71',
      employer: '#f39c12',
      worker: '#9b59b6',
      site_supervisor: '#1abc9c',
      gp_insurer: '#34495e',
      team_leader: '#e74c3c'
    };
    return colors[role] || '#95a5a6';
  }, []);

  const formatDate = useCallback((dateString: string | undefined) => {
    if (!dateString) {
      console.log('No date string provided');
      return 'N/A';
    }
    
    try {
      console.log('Formatting date:', dateString);
      const date = new Date(dateString);
      
      if (isNaN(date.getTime())) {
        console.warn('Invalid date string:', dateString);
        return 'Invalid Date';
      }
      
      const formatted = date.toLocaleDateString();
      console.log('Formatted date:', formatted);
      return formatted;
    } catch (error) {
      console.error('Error formatting date:', error, 'Date string:', dateString);
      return 'Invalid Date';
    }
  }, []);


  const roleOptions = [
    { value: 'worker', label: 'Worker' },
    { value: 'clinician', label: 'Clinician' },
    { value: 'case_manager', label: 'Case Manager' },
    { value: 'employer', label: 'Employer' },
    { value: 'site_supervisor', label: 'Site Supervisor' },
    { value: 'gp_insurer', label: 'GP/Insurer' },
    { value: 'team_leader', label: 'Team Leader' },
    { value: 'admin', label: 'Admin' }
  ];

  if (loading && users.length === 0) {
    return (
      <LayoutWithSidebar>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <CircularProgress size={60} />
        </Box>
      </LayoutWithSidebar>
    );
  }

  return (
    <LayoutWithSidebar>
      <Box>
        {/* Show content only if access is verified or user is admin */}
        {showPageContent ? (
          <>
            {/* Header */}
            <Box sx={{ mb: 4, px: { xs: 1, sm: 2 } }}>
              <Box display="flex" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
                <Box sx={{ flex: 1, mr: 2 }}>
                  <Typography variant="h4" component="h1" sx={{ 
                    fontWeight: 700, 
                    color: '#1a1a1a',
                    fontSize: { xs: '1.5rem', sm: '2rem' }
                  }}>
                    User Management
                </Typography>
                  <Typography variant="body1" color="text.secondary" sx={{
                    fontSize: { xs: '0.875rem', sm: '1rem' },
                    mt: 0.5
                  }}>
                  Manage all users, assign roles, and control access permissions
                </Typography>
              </Box>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={openCreateDialog}
            sx={{ 
              backgroundColor: '#0073e6',
                    '&:hover': { backgroundColor: '#005bb5' },
                    minWidth: { xs: 'auto', sm: '120px' },
                    px: { xs: 2, sm: 3 },
                    py: { xs: 1, sm: 1.5 },
                    fontSize: { xs: '0.875rem', sm: '1rem' }
                  }}
                >
                  <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
            Add User
                  </Box>
                  <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>
                    Add
                  </Box>
          </Button>
              </Box>
        </Box>

        {/* Alerts */}
        {error && (
          <Alert severity="error" sx={{ mb: 3, mx: { xs: 1, sm: 0 } }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}
        {successMessage && (
          <Alert severity="success" sx={{ mb: 3, mx: { xs: 1, sm: 0 } }} onClose={() => setSuccessMessage('')}>
            {successMessage}
          </Alert>
        )}

        {/* Stats Cards */}
        <Grid container spacing={{ xs: 2, sm: 3 }} sx={{ mb: 4, px: { xs: 1, sm: 0 } }}>
          <Grid item xs={6} sm={6} md={3}>
            <Card sx={{ borderRadius: 2, border: '1px solid #e1e5e9', boxShadow: 'none' }}>
              <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontWeight: 500, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                      TOTAL USERS
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: '#1a1a1a', fontSize: { xs: '1.5rem', sm: '2rem' } }}>
                      {users.length}
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: '#e3f2fd', width: { xs: 40, sm: 56 }, height: { xs: 40, sm: 56 } }}>
                    <People sx={{ fontSize: { xs: 20, sm: 28 }, color: '#2196f3' }} />
                  </Avatar>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={6} md={3}>
            <Card sx={{ borderRadius: 2, border: '1px solid #e1e5e9', boxShadow: 'none' }}>
              <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontWeight: 500, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                      ACTIVE USERS
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: '#1a1a1a', fontSize: { xs: '1.5rem', sm: '2rem' } }}>
                      {users.filter(u => u.isActive).length}
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: '#e8f5e8', width: { xs: 40, sm: 56 }, height: { xs: 40, sm: 56 } }}>
                    <PersonAdd sx={{ fontSize: { xs: 20, sm: 28 }, color: '#4caf50' }} />
                  </Avatar>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={6} md={3}>
            <Card sx={{ borderRadius: 2, border: '1px solid #e1e5e9', boxShadow: 'none' }}>
              <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontWeight: 500, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                      CLINICIANS
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: '#1a1a1a', fontSize: { xs: '1.5rem', sm: '2rem' } }}>
                      {users.filter(u => u.role === 'clinician').length}
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: '#f3e5f5', width: { xs: 40, sm: 56 }, height: { xs: 40, sm: 56 } }}>
                    <Work sx={{ fontSize: { xs: 20, sm: 28 }, color: '#9c27b0' }} />
                  </Avatar>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={6} md={3}>
            <Card sx={{ borderRadius: 2, border: '1px solid #e1e5e9', boxShadow: 'none' }}>
              <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontWeight: 500, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                      WORKERS
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: '#1a1a1a', fontSize: { xs: '1.5rem', sm: '2rem' } }}>
                      {users.filter(u => u.role === 'worker').length}
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: '#fff3e0', width: { xs: 40, sm: 56 }, height: { xs: 40, sm: 56 } }}>
                    <PersonOff sx={{ fontSize: { xs: 20, sm: 28 }, color: '#ff9800' }} />
                  </Avatar>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Filters and Search */}
        <Card sx={{ borderRadius: 2, border: '1px solid #e1e5e9', boxShadow: 'none', mb: 3, mx: { xs: 1, sm: 0 } }}>
          <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
            <Grid container spacing={{ xs: 2, sm: 3 }} alignItems="center">
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  size="small"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Role</InputLabel>
                  <Select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    label="Role"
                  >
                    <MenuItem value="all">All Roles</MenuItem>
                    {roleOptions.map(role => (
                      <MenuItem key={role.value} value={role.value}>
                        {role.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    label="Status"
                  >
                    <MenuItem value="all">All Status</MenuItem>
                    <MenuItem value="active">Active</MenuItem>
                    <MenuItem value="inactive">Inactive</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={2}>
                <Button
                  variant="outlined"
                  startIcon={<Refresh />}
                  onClick={fetchUsers}
                  fullWidth
                  size="small"
                >
                  Refresh
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card sx={{ borderRadius: 2, border: '1px solid #e1e5e9', boxShadow: 'none', mx: { xs: 1, sm: 0 } }}>
          <CardContent sx={{ p: 0 }}>
            <Box sx={{ p: { xs: 2, sm: 3 }, borderBottom: '1px solid #e1e5e9' }}>
              <Typography variant="h6" sx={{ fontWeight: 600, fontSize: { xs: '1.1rem', sm: '1.25rem' } }}>
                All Users ({totalUsers})
              </Typography>
            </Box>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#f8f9fa' }}>
                    <TableCell sx={{ fontWeight: 600, fontSize: { xs: '0.875rem', sm: '1rem' } }}>User</TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: { xs: '0.875rem', sm: '1rem' }, display: { xs: 'none', sm: 'table-cell' } }}>Email</TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: { xs: '0.875rem', sm: '1rem' } }}>Role</TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: { xs: '0.875rem', sm: '1rem' }, display: { xs: 'none', md: 'table-cell' } }}>Phone</TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: { xs: '0.875rem', sm: '1rem' } }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: { xs: '0.875rem', sm: '1rem' }, display: { xs: 'none', lg: 'table-cell' } }}>Created</TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: { xs: '0.875rem', sm: '1rem' } }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user._id || user.id} hover>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={{ xs: 1, sm: 2 }}>
                          {user.profileImage ? (
                            <img
                              {...createImageProps(user.profileImage)}
                              alt={`${user.firstName} ${user.lastName}`}
                              style={{
                                width: 40,
                                height: 40,
                                borderRadius: '50%',
                                objectFit: 'cover',
                                border: '2px solid #e0e0e0'
                              }}
                            />
                          ) : (
                            <Avatar sx={{ 
                              bgcolor: getRoleColor(user.role),
                              width: 40,
                              height: 40
                            }}>
                              {user.firstName?.charAt(0) || ''}{user.lastName?.charAt(0) || ''}
                            </Avatar>
                          )}
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 500, fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                              {user.firstName || ''} {user.lastName || ''}
                            </Typography>
                            {user.specialty && (
                              <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                                {user.specialty}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Email sx={{ fontSize: 16, color: 'text.secondary' }} />
                          <Typography variant="body2" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                          {user.email}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={user.role.replace('_', ' ')}
                          sx={{ 
                            backgroundColor: getRoleColor(user.role),
                            color: 'white',
                            textTransform: 'capitalize',
                            fontWeight: 500,
                            fontSize: { xs: '0.75rem', sm: '0.875rem' }
                          }}
                          size="small"
                        />
                      </TableCell>
                      <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                        {user.phone ? (
                          <Box display="flex" alignItems="center" gap={1}>
                            <Phone sx={{ fontSize: 16, color: 'text.secondary' }} />
                            <Typography variant="body2" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                            {user.phone}
                            </Typography>
                          </Box>
                        ) : (
                          <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                            N/A
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={user.isActive ? 'Active' : 'Inactive'}
                          color={user.isActive ? 'success' : 'error'}
                          size="small"
                          sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
                        />
                      </TableCell>
                      <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' } }}>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                          {formatDate(user.createdAt)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box display="flex" gap={{ xs: 0.5, sm: 1 }}>
                          <Tooltip title="Edit User">
                            <IconButton
                              size="small"
                              onClick={() => openEditDialog(user)}
                              sx={{ color: '#0073e6', p: { xs: 0.5, sm: 1 } }}
                            >
                              <Edit sx={{ fontSize: { xs: 16, sm: 20 } }} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete User">
                            <IconButton
                              size="small"
                              onClick={() => handleDeleteUser(user._id || user.id)}
                              sx={{ color: '#e74c3c', p: { xs: 0.5, sm: 1 } }}
                              disabled={(user._id || user.id) === currentUser?.id}
                            >
                              <Delete sx={{ fontSize: { xs: 16, sm: 20 } }} />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            
            {/* Pagination Controls */}
            {totalUsers > 0 && (
              <Box sx={{ 
                p: 3, 
                borderTop: '1px solid #e1e5e9',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 2
              }}>
                {/* Page Size Selector */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" sx={{ color: '#666' }}>
                    Show:
                  </Typography>
                  <FormControl size="small" sx={{ minWidth: 80 }}>
                    <Select
                      value={pageSize}
                      onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                      sx={{ fontSize: '0.875rem' }}
                    >
                      <MenuItem value={5}>5</MenuItem>
                      <MenuItem value={10}>10</MenuItem>
                      <MenuItem value={25}>25</MenuItem>
                      <MenuItem value={50}>50</MenuItem>
                    </Select>
                  </FormControl>
                  <Typography variant="body2" sx={{ color: '#666' }}>
                    per page
                  </Typography>
                </Box>

                {/* Pagination Info */}
                <Typography variant="body2" sx={{ color: '#666' }}>
                  Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalUsers)} of {totalUsers} users
                </Typography>

                {/* Pagination Component */}
                {totalPages > 1 && (
                <Pagination
                  count={totalPages}
                  page={currentPage}
                  onChange={(event, page) => handlePageChange(page)}
                  color="primary"
                  size="medium"
                  showFirstButton
                  showLastButton
                  sx={{
                    '& .MuiPaginationItem-root': {
                      borderRadius: 2,
                      fontWeight: 500,
                    },
                    '& .Mui-selected': {
                      backgroundColor: '#7B68EE',
                      color: 'white',
                      '&:hover': {
                        backgroundColor: '#6A5ACD',
                      },
                    },
                  }}
                />
                )}
              </Box>
            )}
          </CardContent>
        </Card>

        {/* User Dialog */}
        <Dialog open={userDialog} onClose={() => setUserDialog(false)} maxWidth="md" fullWidth>
          <DialogTitle>
            {editingUser ? 'Edit User' : 'Create New User'}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={3} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="First Name"
                  value={userForm.firstName}
                  onChange={(e) => setUserForm({ ...userForm, firstName: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Last Name"
                  value={userForm.lastName}
                  onChange={(e) => setUserForm({ ...userForm, lastName: e.target.value })}
                  required
                />
              </Grid>
              
              {/* Photo Upload */}
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                  <PhotoUpload
                    onPhotoChange={setProfilePhoto}
                    currentPhoto={editingUser?.profileImage}
                    size={120}
                  />
                </Box>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  value={userForm.email}
                  onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Password"
                  type="password"
                  value={userForm.password}
                  onChange={(e) => {
                    setUserForm({ ...userForm, password: e.target.value });
                    if (!editingUser) {
                      validatePassword(e.target.value);
                    }
                  }}
                  required={!editingUser}
                  error={!editingUser && userForm.password.length > 0 && !isPasswordStrong}
                  helperText={editingUser ? "Leave blank to keep current password" : "Password must be at least 12 characters with uppercase, lowercase, number, and special character (@$!%*?&)"}
                />
                {!editingUser && userForm.password.length > 0 && (
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="caption" sx={{ display: 'block', mb: 1, fontWeight: 500 }}>
                      Password Requirements:
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ 
                          width: 16, 
                          height: 16, 
                          borderRadius: '50%', 
                          backgroundColor: passwordValidation.length ? '#4caf50' : '#f44336',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          {passwordValidation.length ? '✓' : '✗'}
                        </Box>
                        <Typography variant="caption" sx={{ color: passwordValidation.length ? '#4caf50' : '#f44336' }}>
                          At least 12 characters
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ 
                          width: 16, 
                          height: 16, 
                          borderRadius: '50%', 
                          backgroundColor: passwordValidation.uppercase ? '#4caf50' : '#f44336',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          {passwordValidation.uppercase ? '✓' : '✗'}
                        </Box>
                        <Typography variant="caption" sx={{ color: passwordValidation.uppercase ? '#4caf50' : '#f44336' }}>
                          One uppercase letter
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ 
                          width: 16, 
                          height: 16, 
                          borderRadius: '50%', 
                          backgroundColor: passwordValidation.lowercase ? '#4caf50' : '#f44336',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          {passwordValidation.lowercase ? '✓' : '✗'}
                        </Box>
                        <Typography variant="caption" sx={{ color: passwordValidation.lowercase ? '#4caf50' : '#f44336' }}>
                          One lowercase letter
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ 
                          width: 16, 
                          height: 16, 
                          borderRadius: '50%', 
                          backgroundColor: passwordValidation.number ? '#4caf50' : '#f44336',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          {passwordValidation.number ? '✓' : '✗'}
                        </Box>
                        <Typography variant="caption" sx={{ color: passwordValidation.number ? '#4caf50' : '#f44336' }}>
                          One number
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ 
                          width: 16, 
                          height: 16, 
                          borderRadius: '50%', 
                          backgroundColor: passwordValidation.special ? '#4caf50' : '#f44336',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          {passwordValidation.special ? '✓' : '✗'}
                        </Box>
                        <Typography variant="caption" sx={{ color: passwordValidation.special ? '#4caf50' : '#f44336' }}>
                          One special character (@$!%*?&)
                        </Typography>
                      </Box>
                    </Box>
                    {isPasswordStrong && (
                      <Box sx={{ mt: 1, p: 1, backgroundColor: '#e8f5e8', borderRadius: 1, border: '1px solid #4caf50' }}>
                        <Typography variant="caption" sx={{ color: '#2e7d32', fontWeight: 500 }}>
                          ✓ Strong password
                        </Typography>
                      </Box>
                    )}
                  </Box>
                )}
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel>Role</InputLabel>
                  <Select
                    value={userForm.role}
                    onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                    label="Role"
                  >
                    {roleOptions.map(role => (
                      <MenuItem key={role.value} value={role.value}>
                        {role.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Phone"
                  value={userForm.phone}
                  onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })}
                />
              </Grid>
              {userForm.role === 'clinician' && (
                <>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Specialty"
                      value={userForm.specialty}
                      onChange={(e) => setUserForm({ ...userForm, specialty: e.target.value })}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="License Number"
                      value={userForm.licenseNumber}
                      onChange={(e) => setUserForm({ ...userForm, licenseNumber: e.target.value })}
                    />
                  </Grid>
                </>
              )}
              {userForm.role === 'team_leader' && (
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Team Name"
                    value={userForm.team}
                    onChange={(e) => setUserForm({ ...userForm, team: e.target.value })}
                    placeholder="Enter team name (e.g., TEAM ALPHA)"
                    helperText="Team name for the team leader to manage"
                  />
                </Grid>
              )}
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={userForm.isActive}
                      onChange={(e) => setUserForm({ ...userForm, isActive: e.target.checked })}
                    />
                  }
                  label="Active User"
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setUserDialog(false)}>Cancel</Button>
            <Button 
              variant="contained" 
              onClick={editingUser ? handleUpdateUser : handleCreateUser}
              disabled={
                loading || 
                !userForm.firstName.trim() || 
                !userForm.lastName.trim() || 
                !userForm.email.trim() || 
                (!editingUser && !userForm.password.trim())
              }
            >
              {loading ? 'Saving...' : (editingUser ? 'Update User' : 'Create User')}
            </Button>
          </DialogActions>
        </Dialog>
          </>
        ) : (
          // Show loading or access denied message while waiting for password verification
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
            <Box textAlign="center">
              <Lock sx={{ fontSize: 60, color: '#1976d2', mb: 2 }} />
              <Typography variant="h6" sx={{ mb: 1 }}>
                Security Verification Required
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Please verify your password to access this page.
              </Typography>
            </Box>
          </Box>
        )}

        {/* Password Verification Dialog is rendered outside the conditional content */}
        {/* Password Verification Dialog */}
        <Dialog 
          open={passwordDialogOpen} 
          onClose={() => {
            if (!pendingEditUser && currentUser?.role === 'case_manager' && !pageAccessVerified) {
              // If case manager tries to close the page access dialog, redirect to dashboard
              window.location.href = '/dashboard';
            } else {
              setPasswordDialogOpen(false);
              setPendingEditUser(null);
              setPassword('');
              setPasswordError(null);
            }
          }}
          maxWidth="sm" 
          fullWidth
        >
          <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Lock color="primary" />
            Security Verification Required
          </DialogTitle>
          <DialogContent>
            <Typography variant="body1" sx={{ mb: 2 }}>
              {pendingEditUser 
                ? `Please enter your password to edit user: ${pendingEditUser.firstName} ${pendingEditUser.lastName}`
                : 'Please enter your password to access the Users management page. This page contains sensitive user information.'
              }
            </Typography>
            <TextField
              fullWidth
              type="password"
              label="Admin Password"
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
                if (!pendingEditUser && currentUser?.role === 'case_manager' && !pageAccessVerified) {
                  // If case manager cancels page access, redirect to dashboard
                  window.location.href = '/dashboard';
                } else {
                  setPasswordDialogOpen(false);
                  setPendingEditUser(null);
                  setPassword('');
                  setPasswordError(null);
                }
              }}
              disabled={verifyingPassword}
            >
              Cancel
            </Button>
            <Button 
              onClick={verifyPassword}
              variant="contained"
              disabled={!password || verifyingPassword}
              startIcon={verifyingPassword ? <CircularProgress size={20} /> : <Lock />}
            >
              {verifyingPassword ? 'Verifying...' : 'Verify Password'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Success Dialog */}
        <Dialog 
          open={successDialog} 
          onClose={() => setSuccessDialog(false)}
          maxWidth="sm" 
          fullWidth
        >
          <DialogContent sx={{ textAlign: 'center', py: 4 }}>
            <Box sx={{ mb: 3 }}>
              <Box sx={{ 
                width: 80, 
                height: 80, 
                borderRadius: '50%', 
                backgroundColor: '#e8f5e8', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                mx: 'auto',
                mb: 2
              }}>
                <Typography variant="h2" sx={{ color: '#4caf50' }}>✓</Typography>
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 600, color: '#2e7d32', mb: 1 }}>
                User Created Successfully!
              </Typography>
              <Typography variant="body1" color="text.secondary">
                The user has been created and added to the system.
              </Typography>
            </Box>
            
            {createdUser && (
              <Box sx={{ 
                backgroundColor: '#f5f5f5', 
                borderRadius: 2, 
                p: 3, 
                mb: 3,
                textAlign: 'left'
              }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                  User Details:
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">Name:</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {createdUser.firstName} {createdUser.lastName}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">Email:</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {createdUser.email}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">Role:</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500, textTransform: 'capitalize' }}>
                      {createdUser.role.replace('_', ' ')}
                    </Typography>
                  </Box>
                  {createdUser.team && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">Team:</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {createdUser.team}
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Box>
            )}
          </DialogContent>
          <DialogActions sx={{ justifyContent: 'center', pb: 3 }}>
            <Button 
              onClick={() => setSuccessDialog(false)}
              variant="contained"
              sx={{ 
                backgroundColor: '#4caf50',
                '&:hover': { backgroundColor: '#45a049' },
                px: 4
              }}
            >
              Continue
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </LayoutWithSidebar>
  );
});

Users.displayName = 'Users';

export default Users;

