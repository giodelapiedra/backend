import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
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
import { useAuth } from '../../contexts/AuthContext';
import Layout from '../../components/Layout';
import api from '../../utils/api';
import Cookies from 'js-cookie';
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
  
  // Password verification states
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [verifyingPassword, setVerifyingPassword] = useState(false);
  const [pendingEditUser, setPendingEditUser] = useState<User | null>(null);
  
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
    isActive: true
  });
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);

  // Add effect to track profilePhoto changes
  useEffect(() => {
    console.log('🔄 Admin profilePhoto state changed:', profilePhoto ? `File: ${profilePhoto.name}` : 'null');
  }, [profilePhoto]);

  const handlePhotoChange = useCallback((file: File | null) => {
    console.log('🔄 Admin PhotoUpload callback:', file ? `File: ${file.name}` : 'null');
    console.log('🔄 Admin PhotoUpload callback - file details:', file ? {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified
    } : 'null');
    setProfilePhoto(file);
    console.log('🔄 Admin PhotoUpload callback - profilePhoto state set to:', file ? file.name : 'null');
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      console.log('=== FETCH USERS START ===');
      console.log('Fetching users with pagination...');
      console.log('Current page:', currentPage);
      console.log('Page size:', pageSize);
      console.log('Search term:', searchTerm);
      console.log('Role filter:', roleFilter);
      console.log('Status filter:', statusFilter);
      
      // Build query parameters
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString(),
      });
      
      if (searchTerm.trim()) {
        params.append('search', searchTerm.trim());
      }
      
      if (roleFilter !== 'all') {
        params.append('role', roleFilter);
      }
      
      const response = await api.get(`/users?${params.toString()}`);
      console.log('=== API RESPONSE ===');
      console.log('Users fetched successfully:', response.data);
      console.log('Pagination info:', response.data.pagination);
      console.log('=== END API RESPONSE ===');
      
      setUsers(response.data.users || []);
      setTotalUsers(response.data.pagination?.total || 0);
      setTotalPages(response.data.pagination?.pages || 0);
      setError('');
    } catch (err: any) {
      console.error('=== FETCH USERS ERROR ===');
      console.error('Error fetching users:', err);
      console.error('Error response:', err.response?.data);
      console.error('Error status:', err.response?.status);
      console.error('Error headers:', err.response?.headers);
      console.error('=== END ERROR ===');
      setError(err.response?.data?.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  }, [currentUser, currentPage, pageSize, searchTerm, roleFilter, statusFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

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

  const handleCreateUser = useCallback(async () => {
    try {
      setLoading(true);
      
      let response;
      
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
        
        formData.append('profileImage', profilePhoto);
        
        await api.post('/users', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
      } else {
        // Regular JSON request without photo
        const userData: any = {
          firstName: userForm.firstName.trim(),
          lastName: userForm.lastName.trim(),
          email: userForm.email.trim().toLowerCase(),
          password: userForm.password,
          role: userForm.role,
          phone: userForm.phone.trim() || '',
          isActive: userForm.isActive,
          medicalInfo: {
            allergies: [],
            medications: [],
            medicalConditions: []
          },
          isAvailable: true
        };

        if (userForm.role === 'clinician') {
          if (userForm.specialty.trim()) {
            userData.specialty = userForm.specialty.trim();
          }
          if (userForm.licenseNumber.trim()) {
            userData.licenseNumber = userForm.licenseNumber.trim();
          }
        }

        await api.post('/users', userData);
      }
      
      setSuccessMessage('User created successfully!');
      setUserDialog(false);
      resetUserForm();
      fetchUsers();
    } catch (err: any) {
      console.error('Error creating user:', err);
      setError(err.response?.data?.message || 'Failed to create user');
    } finally {
      setLoading(false);
    }
  }, [userForm, fetchUsers, profilePhoto]);

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
        response = await api.put(`/users/${userId}/admin`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
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
        response = await api.put(`/users/${userId}/admin`, updateData);
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
  }, [editingUser, userForm, fetchUsers, profilePhoto]);

  const handleDeleteUser = useCallback(async (userId: string | undefined) => {
    if (!userId) {
      setError('Invalid user ID');
      return;
    }
    
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    
    try {
      setLoading(true);
      console.log('Deleting user with ID:', userId);
      await api.delete(`/users/${userId}`);
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
      isActive: true
    });
    setProfilePhoto(null);
  }, []);

  const openCreateDialog = useCallback(() => {
    resetUserForm();
    setEditingUser(null);
    setUserDialog(true);
  }, []);

  // Password verification function
  const verifyPassword = useCallback(async () => {
    try {
      setVerifyingPassword(true);
      setPasswordError(null);
      
      const response = await api.post('/auth/verify-password', { password });
      
      if (response.data.valid) {
        console.log('Password verified successfully for user edit');
        setPasswordDialogOpen(false);
        setPassword('');
        
        // Proceed with the pending edit
        if (pendingEditUser) {
          openEditDialogDirect(pendingEditUser);
          setPendingEditUser(null);
        }
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
  }, [password, pendingEditUser]);

  const openEditDialog = useCallback((user: User) => {
    console.log('🔍 Edit requested for user:', user);
    
    // Always require password verification for each edit
    setPendingEditUser(user);
    setPasswordDialogOpen(true);
  }, []);

  const openEditDialogDirect = useCallback((user: User) => {
    console.log('🔍 Opening edit dialog for user:', user);
    console.log('🔍 User ID:', user._id || user.id);
    console.log('🔍 User profile image:', user.profileImage);
    
    setUserForm({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      password: '',
      role: user.role,
      phone: user.phone || '',
      specialty: user.specialty || '',
      licenseNumber: user.licenseNumber || '',
      isActive: user.isActive
    });
    setProfilePhoto(null); // Reset profile photo state
    setEditingUser(user);
    setUserDialog(true);
  }, []);

  const getRoleColor = useCallback((role: string) => {
    const colors: { [key: string]: string } = {
      admin: '#e74c3c',
      clinician: '#3498db',
      case_manager: '#2ecc71',
      employer: '#f39c12',
      worker: '#9b59b6',
      site_supervisor: '#1abc9c',
      gp_insurer: '#34495e'
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
    { value: 'admin', label: 'Admin' }
  ];

  if (loading && users.length === 0) {
    return (
      <Layout>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <CircularProgress size={60} />
        </Box>
      </Layout>
    );
  }

  return (
    <Layout>
      <Box>
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 4 }}>
          <Box>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 700, color: '#1a1a1a' }}>
              👥 User Management
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Manage all users, assign roles, and control access permissions
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={openCreateDialog}
            sx={{ 
              backgroundColor: '#0073e6',
              '&:hover': { backgroundColor: '#005bb5' }
            }}
          >
            Add User
          </Button>
        </Box>

        {/* Alerts */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}
        {successMessage && (
          <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccessMessage('')}>
            {successMessage}
          </Alert>
        )}

        {/* Stats Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderRadius: 2, border: '1px solid #e1e5e9', boxShadow: 'none' }}>
              <CardContent sx={{ p: 3 }}>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontWeight: 500 }}>
                      TOTAL USERS
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: '#1a1a1a' }}>
                      {users.length}
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: '#e3f2fd', width: 56, height: 56 }}>
                    <People sx={{ fontSize: 28, color: '#2196f3' }} />
                  </Avatar>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderRadius: 2, border: '1px solid #e1e5e9', boxShadow: 'none' }}>
              <CardContent sx={{ p: 3 }}>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontWeight: 500 }}>
                      ACTIVE USERS
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: '#1a1a1a' }}>
                      {users.filter(u => u.isActive).length}
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: '#e8f5e8', width: 56, height: 56 }}>
                    <PersonAdd sx={{ fontSize: 28, color: '#4caf50' }} />
                  </Avatar>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderRadius: 2, border: '1px solid #e1e5e9', boxShadow: 'none' }}>
              <CardContent sx={{ p: 3 }}>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontWeight: 500 }}>
                      CLINICIANS
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: '#1a1a1a' }}>
                      {users.filter(u => u.role === 'clinician').length}
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: '#f3e5f5', width: 56, height: 56 }}>
                    <Work sx={{ fontSize: 28, color: '#9c27b0' }} />
                  </Avatar>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderRadius: 2, border: '1px solid #e1e5e9', boxShadow: 'none' }}>
              <CardContent sx={{ p: 3 }}>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontWeight: 500 }}>
                      WORKERS
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: '#1a1a1a' }}>
                      {users.filter(u => u.role === 'worker').length}
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: '#fff3e0', width: 56, height: 56 }}>
                    <PersonOff sx={{ fontSize: 28, color: '#ff9800' }} />
                  </Avatar>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Filters and Search */}
        <Card sx={{ borderRadius: 2, border: '1px solid #e1e5e9', boxShadow: 'none', mb: 3 }}>
          <CardContent sx={{ p: 3 }}>
            <Grid container spacing={3} alignItems="center">
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <FormControl fullWidth>
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
              <Grid item xs={12} md={3}>
                <FormControl fullWidth>
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
                >
                  Refresh
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card sx={{ borderRadius: 2, border: '1px solid #e1e5e9', boxShadow: 'none' }}>
          <CardContent sx={{ p: 0 }}>
            <Box sx={{ p: 3, borderBottom: '1px solid #e1e5e9' }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                All Users ({totalUsers})
              </Typography>
            </Box>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#f8f9fa' }}>
                    <TableCell sx={{ fontWeight: 600 }}>User</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Email</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Role</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Phone</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Created</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user._id || user.id} hover>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={2}>
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
                              {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                            </Avatar>
                          )}
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              {user.firstName} {user.lastName}
                            </Typography>
                            {user.specialty && (
                              <Typography variant="caption" color="text.secondary">
                                {user.specialty}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Email sx={{ fontSize: 16, color: 'text.secondary' }} />
                          {user.email}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={user.role.replace('_', ' ')}
                          sx={{ 
                            backgroundColor: getRoleColor(user.role),
                            color: 'white',
                            textTransform: 'capitalize',
                            fontWeight: 500
                          }}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {user.phone ? (
                          <Box display="flex" alignItems="center" gap={1}>
                            <Phone sx={{ fontSize: 16, color: 'text.secondary' }} />
                            {user.phone}
                          </Box>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            N/A
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={user.isActive ? 'Active' : 'Inactive'}
                          color={user.isActive ? 'success' : 'error'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {formatDate(user.createdAt)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box display="flex" gap={1}>
                          <Tooltip title="Edit User">
                            <IconButton
                              size="small"
                              onClick={() => openEditDialog(user)}
                              sx={{ color: '#0073e6' }}
                            >
                              <Edit />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete User">
                            <IconButton
                              size="small"
                              onClick={() => handleDeleteUser(user._id || user.id)}
                              sx={{ color: '#e74c3c' }}
                              disabled={(user._id || user.id) === currentUser?.id}
                            >
                              <Delete />
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
            {totalPages > 1 && (
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
              </Box>
            )}
          </CardContent>
        </Card>

        {/* Password Verification Dialog */}
        <Dialog 
          open={passwordDialogOpen} 
          onClose={() => {
            setPasswordDialogOpen(false);
            setPendingEditUser(null);
            setPassword('');
            setPasswordError(null);
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
              Please enter your admin password to edit user: <strong>{pendingEditUser?.firstName} {pendingEditUser?.lastName}</strong>
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
                setPasswordDialogOpen(false);
                setPendingEditUser(null);
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
              startIcon={verifyingPassword ? <CircularProgress size={20} /> : <Lock />}
            >
              {verifyingPassword ? 'Verifying...' : 'Verify Password'}
            </Button>
          </DialogActions>
        </Dialog>

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
                  onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                  required={!editingUser}
                  helperText={editingUser ? "Leave blank to keep current password" : ""}
                />
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
      </Box>
    </Layout>
  );
});

Users.displayName = 'Users';

export default Users;
