import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
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
  Paper,
  Pagination,
} from '@mui/material';
import {
  People,
  Assignment,
  Assessment,
  TrendingUp,
  MoreVert,
  LocalHospital,
  Group,
  Schedule,
  Add,
  CloudUpload,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext.supabase';
import LayoutWithSidebar from '../../components/LayoutWithSidebar';
import { dataClient } from '../../lib/supabase';

const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [userDialog, setUserDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  
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
  const [successDialog, setSuccessDialog] = useState(false);
  const [createdUser, setCreatedUser] = useState<any>(null);
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      console.log('🔄 Fetching users from Supabase...');
      
      let query = dataClient
        .from('users')
        .select('*', { count: 'exact' });
      
      // Apply filters
      if (searchTerm) {
        query = query.or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
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
      setUsers(data || []);
      setTotalUsers(count || 0);
      setTotalPages(Math.ceil((count || 0) / pageSize));
    } catch (err: any) {
      console.error('❌ Error fetching users:', err);
      setError(err.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, searchTerm, roleFilter, statusFilter]);

  useEffect(() => {
    fetchUsers();
  }, [currentPage, pageSize, fetchUsers]);

  // Pagination handlers
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1); // Reset to first page when changing page size
  };

  const handleCreateUser = async () => {
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
      const errorMessage = err.response?.data?.message || 'Failed to create user';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUser = async () => {
    try {
      setLoading(true);
      console.log('🔄 Updating user in Supabase...');
      
      const updateData = {
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
      
      const { data, error } = await dataClient
        .from('users')
        .update(updateData)
        .eq('id', editingUser.id)
        .select()
        .single();
      
      if (error) {
        console.error('❌ Error updating user:', error);
        setError('Failed to update user: ' + error.message);
        return;
      }
      
      console.log('✅ User updated successfully:', data);
      setSuccessMessage('User updated successfully!');
      setUserDialog(false);
      setEditingUser(null);
      resetUserForm();
      fetchUsers();
    } catch (err: any) {
      setError(err.message || 'Failed to update user');
    } finally {
      setLoading(false);
    }
  };


  const resetUserForm = () => {
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
  };

  // Password validation function
  const validatePassword = (password: string) => {
    const validation = {
      length: password.length >= 12,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
      special: /[@$!%*?&]/.test(password)
    };
    setPasswordValidation(validation);
    return Object.values(validation).every(Boolean);
  };

  // Check if password is strong
  const isPasswordStrong = Object.values(passwordValidation).every(Boolean);

  const openUserDialog = (userToEdit?: any) => {
    if (userToEdit) {
      setEditingUser(userToEdit);
      setUserForm({
        firstName: userToEdit.firstName,
        lastName: userToEdit.lastName,
        email: userToEdit.email,
        password: '', // Don't pre-fill password
        role: userToEdit.role,
        phone: userToEdit.phone || '',
        specialty: userToEdit.specialty || '',
        licenseNumber: userToEdit.licenseNumber || '',
        team: userToEdit.team || '',
        isActive: userToEdit.isActive
      });
    } else {
      setEditingUser(null);
      resetUserForm();
    }
    setProfilePhoto(null);
    setUserDialog(true);
  };

  const getRoleColor = (role: string) => {
    const colors: { [key: string]: any } = {
      'admin': 'error',
      'clinician': 'primary',
      'case_manager': 'secondary',
      'worker': 'success',
      'employer': 'warning',
      'site_supervisor': 'info',
      'gp_insurer': 'default',
      'team_leader': 'error',
    };
    return colors[role] || 'default';
  };

  const getRoleStats = () => {
    const stats = {
      clinicians: users.filter(u => u.role === 'clinician').length,
      workers: users.filter(u => u.role === 'worker').length,
      managers: users.filter(u => u.role === 'case_manager').length,
      supervisors: users.filter(u => u.role === 'site_supervisor').length,
      teamLeaders: users.filter(u => u.role === 'team_leader').length,
    };
    return stats;
  };

  const stats = getRoleStats();

  if (loading) {
    return (
      <LayoutWithSidebar>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
          <CircularProgress />
        </Box>
      </LayoutWithSidebar>
    );
  }

  return (
    <LayoutWithSidebar>
      <Box>
        {/* Header */}
        <Box sx={{ mb: 4, px: { xs: 1, sm: 0 } }}>
          <Typography variant="h3" component="h1" sx={{ 
            fontWeight: 700, 
            mb: 1,
            fontSize: { xs: '1.75rem', sm: '2.5rem' }
          }}>
            Admin Dashboard
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ 
            fontSize: { xs: '0.875rem', sm: '1rem' }
          }}>
            Welcome back, {user?.firstName}! Manage users, cases, and system settings.
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: 2, mx: { xs: 1, sm: 0 } }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {successMessage && (
          <Alert severity="success" sx={{ mb: 3, borderRadius: 2, mx: { xs: 1, sm: 0 } }} onClose={() => setSuccessMessage('')}>
            {successMessage}
          </Alert>
        )}

        {/* Statistics Cards */}
        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' },
          gap: { xs: 2, sm: 3 }, 
          mb: 4,
          px: { xs: 1, sm: 0 }
        }}>
          <Card sx={{ 
            height: '100%',
            background: 'linear-gradient(135deg, #7B68EE 0%, #9B7FFF 100%)',
            color: 'white',
            position: 'relative',
            overflow: 'hidden',
          }}>
            <CardContent sx={{ position: 'relative', zIndex: 2, p: { xs: 2, sm: 3 } }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Box>
                  <Typography variant="body2" sx={{ opacity: 0.9, mb: 1, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                    Total Users
                  </Typography>
                  <Typography variant="h3" sx={{ fontWeight: 700, fontSize: { xs: '1.5rem', sm: '2rem' } }}>
                    {users.length}
                  </Typography>
                </Box>
                <IconButton sx={{ color: 'white', opacity: 0.8, p: { xs: 0.5, sm: 1 } }}>
                  <MoreVert sx={{ fontSize: { xs: 16, sm: 20 } }} />
                </IconButton>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <People sx={{ fontSize: { xs: 16, sm: 20 } }} />
                <Typography variant="body2" sx={{ opacity: 0.9, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                  Active Users
                </Typography>
              </Box>
            </CardContent>
            <Box
              sx={{
                position: 'absolute',
                top: -20,
                right: -20,
                width: { xs: 60, sm: 80 },
                height: { xs: 60, sm: 80 },
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.1)',
                zIndex: 1,
              }}
            />
          </Card>

          <Card sx={{ 
            height: '100%',
            background: 'linear-gradient(135deg, #20B2AA 0%, #4DD0C1 100%)',
            color: 'white',
            position: 'relative',
            overflow: 'hidden',
          }}>
            <CardContent sx={{ position: 'relative', zIndex: 2, p: { xs: 2, sm: 3 } }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Box>
                  <Typography variant="body2" sx={{ opacity: 0.9, mb: 1, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                    Active Cases
                  </Typography>
                  <Typography variant="h3" sx={{ fontWeight: 700, fontSize: { xs: '1.5rem', sm: '2rem' } }}>
                    23
                  </Typography>
                </Box>
                <IconButton sx={{ color: 'white', opacity: 0.8, p: { xs: 0.5, sm: 1 } }}>
                  <MoreVert sx={{ fontSize: { xs: 16, sm: 20 } }} />
                </IconButton>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Assignment sx={{ fontSize: { xs: 16, sm: 20 } }} />
                <Typography variant="body2" sx={{ opacity: 0.9, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                  In Progress
                </Typography>
              </Box>
            </CardContent>
            <Box
              sx={{
                position: 'absolute',
                top: -20,
                right: -20,
                width: { xs: 60, sm: 80 },
                height: { xs: 60, sm: 80 },
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.1)',
                zIndex: 1,
              }}
            />
          </Card>

          <Card sx={{ 
            height: '100%',
            background: 'linear-gradient(135deg, #FF8C00 0%, #FFA500 100%)',
            color: 'white',
            position: 'relative',
            overflow: 'hidden',
          }}>
            <CardContent sx={{ position: 'relative', zIndex: 2, p: { xs: 2, sm: 3 } }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Box>
                  <Typography variant="body2" sx={{ opacity: 0.9, mb: 1, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                    Assessments
                  </Typography>
                  <Typography variant="h3" sx={{ fontWeight: 700, fontSize: { xs: '1.5rem', sm: '2rem' } }}>
                    45
                  </Typography>
                </Box>
                <IconButton sx={{ color: 'white', opacity: 0.8, p: { xs: 0.5, sm: 1 } }}>
                  <MoreVert sx={{ fontSize: { xs: 16, sm: 20 } }} />
                </IconButton>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Assessment sx={{ fontSize: { xs: 16, sm: 20 } }} />
                <Typography variant="body2" sx={{ opacity: 0.9, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                  This month
                </Typography>
              </Box>
            </CardContent>
            <Box
              sx={{
                position: 'absolute',
                top: -20,
                right: -20,
                width: { xs: 60, sm: 80 },
                height: { xs: 60, sm: 80 },
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.1)',
                zIndex: 1,
              }}
            />
          </Card>

          <Card sx={{ 
            height: '100%',
            background: 'linear-gradient(135deg, #FF6B6B 0%, #FF8E8E 100%)',
            color: 'white',
            position: 'relative',
            overflow: 'hidden',
          }}>
            <CardContent sx={{ position: 'relative', zIndex: 2, p: { xs: 2, sm: 3 } }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Box>
                  <Typography variant="body2" sx={{ opacity: 0.9, mb: 1, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                    Avg Resolution
                  </Typography>
                  <Typography variant="h3" sx={{ fontWeight: 700, fontSize: { xs: '1.5rem', sm: '2rem' } }}>
                    12.5
                  </Typography>
                </Box>
                <IconButton sx={{ color: 'white', opacity: 0.8, p: { xs: 0.5, sm: 1 } }}>
                  <MoreVert sx={{ fontSize: { xs: 16, sm: 20 } }} />
                </IconButton>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TrendingUp sx={{ fontSize: { xs: 16, sm: 20 } }} />
                <Typography variant="body2" sx={{ opacity: 0.9, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                  days
                </Typography>
              </Box>
            </CardContent>
            <Box
              sx={{
                position: 'absolute',
                top: -20,
                right: -20,
                width: { xs: 60, sm: 80 },
                height: { xs: 60, sm: 80 },
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.1)',
                zIndex: 1,
              }}
            />
          </Card>
        </Box>

        {/* Quick Actions */}
        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' },
          gap: { xs: 2, sm: 3 },
          px: { xs: 1, sm: 0 }
        }}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: { xs: 'flex-start', sm: 'center' }, 
                mb: 3,
                flexDirection: { xs: 'column', sm: 'row' },
                gap: { xs: 2, sm: 0 }
              }}>
                <Typography variant="h5" sx={{ 
                  fontWeight: 600,
                  fontSize: { xs: '1.25rem', sm: '1.5rem' }
                }}>
                  User Management
                </Typography>
                <Button 
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => openUserDialog()}
                  sx={{
                    background: 'linear-gradient(135deg, #7B68EE 0%, #9B7FFF 100%)',
                    borderRadius: 2,
                    minWidth: { xs: '100%', sm: 'auto' },
                    fontSize: { xs: '0.875rem', sm: '1rem' }
                  }}
                >
                  Add User
                </Button>
              </Box>
              <Typography color="text.secondary" sx={{ 
                mb: 3,
                fontSize: { xs: '0.875rem', sm: '1rem' }
              }}>
                Manage system users, roles, and permissions.
              </Typography>
                
                {/* Quick Stats */}
                <Box sx={{ 
                  display: 'grid', 
                  gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' },
                  gap: { xs: 1, sm: 2 }
                }}>
                  <Box sx={{ textAlign: 'center', p: { xs: 1.5, sm: 2 }, backgroundColor: 'rgba(123, 104, 238, 0.05)', borderRadius: 2 }}>
                    <Group sx={{ fontSize: { xs: 24, sm: 32 }, color: '#7B68EE', mb: 1 }} />
                    <Typography variant="h6" sx={{ fontWeight: 600, fontSize: { xs: '1rem', sm: '1.25rem' } }}>{stats.clinicians}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Clinicians</Typography>
                  </Box>
                  <Box sx={{ textAlign: 'center', p: { xs: 1.5, sm: 2 }, backgroundColor: 'rgba(32, 178, 170, 0.05)', borderRadius: 2 }}>
                    <LocalHospital sx={{ fontSize: { xs: 24, sm: 32 }, color: '#20B2AA', mb: 1 }} />
                    <Typography variant="h6" sx={{ fontWeight: 600, fontSize: { xs: '1rem', sm: '1.25rem' } }}>{stats.workers}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Workers</Typography>
                  </Box>
                  <Box sx={{ textAlign: 'center', p: { xs: 1.5, sm: 2 }, backgroundColor: 'rgba(255, 140, 0, 0.05)', borderRadius: 2 }}>
                    <Assignment sx={{ fontSize: { xs: 24, sm: 32 }, color: '#FF8C00', mb: 1 }} />
                    <Typography variant="h6" sx={{ fontWeight: 600, fontSize: { xs: '1rem', sm: '1.25rem' } }}>{stats.managers}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Managers</Typography>
                  </Box>
                  <Box sx={{ textAlign: 'center', p: { xs: 1.5, sm: 2 }, backgroundColor: 'rgba(255, 107, 107, 0.05)', borderRadius: 2 }}>
                    <Schedule sx={{ fontSize: { xs: 24, sm: 32 }, color: '#FF6B6B', mb: 1 }} />
                    <Typography variant="h6" sx={{ fontWeight: 600, fontSize: { xs: '1rem', sm: '1.25rem' } }}>{stats.supervisors}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Supervisors</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>

          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
              <Typography variant="h5" sx={{ 
                fontWeight: 600, 
                mb: 3,
                fontSize: { xs: '1.25rem', sm: '1.5rem' }
              }}>
                System Overview
              </Typography>
                
                <Box sx={{ mb: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>System Health</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, fontSize: { xs: '0.875rem', sm: '1rem' } }}>98%</Typography>
                  </Box>
                  <Box sx={{ width: '100%', height: { xs: 6, sm: 8 }, backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: 4, overflow: 'hidden' }}>
                    <Box sx={{ width: '98%', height: '100%', background: 'linear-gradient(90deg, #7B68EE 0%, #20B2AA 100%)', borderRadius: 4 }} />
                  </Box>
                </Box>

                <Box sx={{ mb: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>Storage Used</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, fontSize: { xs: '0.875rem', sm: '1rem' } }}>2.4GB</Typography>
                  </Box>
                  <Box sx={{ width: '100%', height: { xs: 6, sm: 8 }, backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: 4, overflow: 'hidden' }}>
                    <Box sx={{ width: '60%', height: '100%', background: 'linear-gradient(90deg, #FF8C00 0%, #FFA500 100%)', borderRadius: 4 }} />
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', gap: { xs: 0.5, sm: 1 }, flexWrap: 'wrap' }}>
                  <Chip label="Online" color="success" size="small" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }} />
                  <Chip label="Secure" color="info" size="small" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }} />
                  <Chip label="Updated" color="primary" size="small" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }} />
                </Box>
              </CardContent>
            </Card>
        </Box>

        {/* Users Table */}
        <Card sx={{ mt: 3, mx: { xs: 1, sm: 0 } }}>
          <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
            <Typography variant="h6" gutterBottom sx={{ 
              fontSize: { xs: '1.1rem', sm: '1.25rem' }
            }}>
              All Users ({totalUsers})
            </Typography>
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>Name</TableCell>
                    <TableCell sx={{ fontSize: { xs: '0.875rem', sm: '1rem' }, display: { xs: 'none', sm: 'table-cell' } }}>Email</TableCell>
                    <TableCell sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>Role</TableCell>
                    <TableCell sx={{ fontSize: { xs: '0.875rem', sm: '1rem' }, display: { xs: 'none', md: 'table-cell' } }}>Phone</TableCell>
                    <TableCell sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {users.map((userItem, index) => (
                    <TableRow key={userItem.id || userItem._id || `user-${index}`}>
                      <TableCell sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                        {userItem.firstName} {userItem.lastName}
                      </TableCell>
                      <TableCell sx={{ fontSize: { xs: '0.875rem', sm: '1rem' }, display: { xs: 'none', sm: 'table-cell' } }}>
                        {userItem.email}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={userItem.role.replace('_', ' ')}
                          color={getRoleColor(userItem.role)}
                          size="small"
                          sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
                        />
                      </TableCell>
                      <TableCell sx={{ fontSize: { xs: '0.875rem', sm: '1rem' }, display: { xs: 'none', md: 'table-cell' } }}>
                        {userItem.phone || 'N/A'}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={userItem.isActive ? 'Active' : 'Inactive'}
                          color={userItem.isActive ? 'success' : 'error'}
                          size="small"
                          sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <Box sx={{ 
                p: { xs: 2, sm: 3 }, 
                borderTop: '1px solid #e1e5e9',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: { xs: 1, sm: 2 }
              }}>
                {/* Page Size Selector */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" sx={{ color: '#666', fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                    Show:
                  </Typography>
                  <FormControl size="small" sx={{ minWidth: { xs: 60, sm: 80 } }}>
                    <Select
                      value={pageSize}
                      onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                      sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
                    >
                      <MenuItem value={5}>5</MenuItem>
                      <MenuItem value={10}>10</MenuItem>
                      <MenuItem value={25}>25</MenuItem>
                      <MenuItem value={50}>50</MenuItem>
                    </Select>
                  </FormControl>
                  <Typography variant="body2" sx={{ color: '#666', fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                    per page
                  </Typography>
                </Box>

                {/* Pagination Info */}
                <Typography variant="body2" sx={{ color: '#666', fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                  Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalUsers)} of {totalUsers} users
                </Typography>

                {/* Pagination Component */}
                <Pagination
                  count={totalPages}
                  page={currentPage}
                  onChange={(event, page) => handlePageChange(page)}
                  color="primary"
                  size="small"
                  showFirstButton
                  showLastButton
                  sx={{
                    '& .MuiPaginationItem-root': {
                      borderRadius: 2,
                      fontWeight: 500,
                      fontSize: { xs: '0.75rem', sm: '0.875rem' },
                      minWidth: { xs: 32, sm: 40 },
                      height: { xs: 32, sm: 40 },
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

        {/* User Dialog */}
        <Dialog open={userDialog} onClose={() => setUserDialog(false)} maxWidth="md" fullWidth>
          <DialogTitle>
            {editingUser ? 'Edit User' : 'Create New User'}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ mt: 2 }}>
              {/* Photo Upload */}
              <Box sx={{ mb: 3, textAlign: 'center' }}>
                <Box sx={{ 
                  width: 120, 
                  height: 120, 
                  borderRadius: '50%', 
                  backgroundColor: '#f5f5f5', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  mx: 'auto',
                  mb: 2,
                  border: '2px dashed #ddd',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  {profilePhoto ? (
                    <img 
                      src={URL.createObjectURL(profilePhoto)} 
                      alt="Profile preview" 
                      style={{ 
                        width: '100%', 
                        height: '100%', 
                        objectFit: 'cover',
                        borderRadius: '50%'
                      }} 
                    />
                  ) : (
                    <CloudUpload sx={{ fontSize: 40, color: '#999' }} />
                  )}
                </Box>
                <input
                  accept="image/*"
                  style={{ display: 'none' }}
                  id="profile-photo-upload"
                  type="file"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setProfilePhoto(file);
                    }
                  }}
                />
                <label htmlFor="profile-photo-upload">
                  <Button
                    variant="outlined"
                    component="span"
                    startIcon={<CloudUpload />}
                    sx={{ 
                      borderRadius: 2,
                      borderColor: '#7B68EE',
                      color: '#7B68EE',
                      '&:hover': {
                        borderColor: '#6A5ACD',
                        backgroundColor: 'rgba(123, 104, 238, 0.04)'
                      }
                    }}
                  >
                    Upload Photo
                  </Button>
                </label>
                <Typography variant="caption" display="block" sx={{ mt: 1, color: 'text.secondary' }}>
                  Supported formats: JPG, PNG, GIF • Max size: 2MB
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                <TextField
                  fullWidth
                  label="First Name"
                  value={userForm.firstName}
                  onChange={(e) => setUserForm({ ...userForm, firstName: e.target.value })}
                />
                <TextField
                  fullWidth
                  label="Last Name"
                  value={userForm.lastName}
                  onChange={(e) => setUserForm({ ...userForm, lastName: e.target.value })}
                />
              </Box>
              
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={userForm.email}
                onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                sx={{ mb: 2 }}
              />
              
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
                sx={{ mb: 2 }}
                error={!editingUser && userForm.password.length > 0 && !isPasswordStrong}
                helperText={editingUser ? "Leave blank to keep current password" : "Password must be at least 12 characters with uppercase, lowercase, number, and special character (@$!%*?&)"}
              />
              {!editingUser && userForm.password.length > 0 && (
                <Box sx={{ mb: 2 }}>
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
              
              <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                <FormControl fullWidth>
                  <InputLabel>Role</InputLabel>
                  <Select
                    value={userForm.role}
                    onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                  >
                    <MenuItem value="worker">Worker</MenuItem>
                    <MenuItem value="clinician">Clinician</MenuItem>
                    <MenuItem value="case_manager">Case Manager</MenuItem>
                    <MenuItem value="employer">Employer</MenuItem>
                    <MenuItem value="site_supervisor">Site Supervisor</MenuItem>
                    <MenuItem value="gp_insurer">GP/Insurer</MenuItem>
                    <MenuItem value="team_leader">Team Leader</MenuItem>
                    <MenuItem value="admin">Admin</MenuItem>
                  </Select>
                </FormControl>
                
                <TextField
                  fullWidth
                  label="Phone"
                  value={userForm.phone}
                  onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })}
                />
              </Box>
              
              {userForm.role === 'clinician' && (
                <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                  <TextField
                    fullWidth
                    label="Specialty"
                    value={userForm.specialty}
                    onChange={(e) => setUserForm({ ...userForm, specialty: e.target.value })}
                    required
                    error={userForm.role === 'clinician' && !userForm.specialty.trim()}
                    helperText={userForm.role === 'clinician' && !userForm.specialty.trim() ? 'Specialty is required for clinicians' : ''}
                  />
                  <TextField
                    fullWidth
                    label="License Number"
                    value={userForm.licenseNumber}
                    onChange={(e) => setUserForm({ ...userForm, licenseNumber: e.target.value })}
                    required
                    error={userForm.role === 'clinician' && !userForm.licenseNumber.trim()}
                    helperText={userForm.role === 'clinician' && !userForm.licenseNumber.trim() ? 'License number is required for clinicians' : ''}
                  />
                </Box>
              )}
              {userForm.role === 'team_leader' && (
                <TextField
                  fullWidth
                  label="Team Name"
                  value={userForm.team}
                  onChange={(e) => setUserForm({ ...userForm, team: e.target.value })}
                  placeholder="Enter team name (e.g., TEAM ALPHA)"
                  helperText="Team name for the team leader to manage"
                  sx={{ mb: 2 }}
                />
              )}
            </Box>
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
                (!editingUser && (!userForm.password.trim() || !isPasswordStrong)) ||
                (userForm.role === 'clinician' && (!userForm.specialty.trim() || !userForm.licenseNumber.trim()))
              }
            >
              {loading ? 'Saving...' : (editingUser ? 'Update User' : 'Create User')}
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
};

export default AdminDashboard;