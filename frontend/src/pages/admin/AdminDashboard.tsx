import React, { useState, useEffect } from 'react';
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
  Tooltip,
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
  Visibility,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import Layout from '../../components/Layout';
import api from '../../utils/api';

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
    isActive: true
  });

  useEffect(() => {
    fetchUsers();
  }, [currentPage, pageSize]);

  // Pagination handlers
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1); // Reset to first page when changing page size
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      console.log('Fetching users with pagination...');
      console.log('Current page:', currentPage);
      console.log('Page size:', pageSize);
      
      // Build query parameters
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString(),
      });
      
      const response = await api.get(`/users?${params.toString()}`);
      console.log('Users response:', response.data);
      console.log('Pagination info:', response.data.pagination);
      
      setUsers(response.data.users || []);
      setTotalUsers(response.data.pagination?.total || 0);
      setTotalPages(response.data.pagination?.pages || 0);
    } catch (err: any) {
      console.error('Error fetching users:', err);
      console.error('Error response:', err.response?.data);
      setError(err.response?.data?.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async () => {
    try {
      setLoading(true);
      console.log('Creating user with data:', userForm);
      
      // Prepare user data according to MongoDB format
      const userData: any = {
        firstName: userForm.firstName.trim(),
        lastName: userForm.lastName.trim(),
        email: userForm.email.trim().toLowerCase(),
        password: userForm.password,
        role: userForm.role,
        phone: userForm.phone.trim() || '',
        isActive: true,
        medicalInfo: {
          allergies: [],
          medications: [],
          medicalConditions: []
        },
        isAvailable: true
      };

      // Add clinician-specific fields only if role is clinician
      if (userForm.role === 'clinician') {
        if (userForm.specialty.trim()) {
          userData.specialty = userForm.specialty.trim();
        }
        if (userForm.licenseNumber.trim()) {
          userData.licenseNumber = userForm.licenseNumber.trim();
        }
      }

      console.log('Sending user data:', userData);
      const response = await api.post('/users', userData);
      console.log('User creation response:', response.data);
      
      setSuccessMessage('User created successfully!');
      setUserDialog(false);
      resetUserForm();
      fetchUsers();
    } catch (err: any) {
      console.error('Error creating user:', err);
      console.error('Error response:', err.response?.data);
      setError(err.response?.data?.message || 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUser = async () => {
    try {
      setLoading(true);
      const response = await api.put(`/users/${editingUser._id}`, userForm);
      setSuccessMessage('User updated successfully!');
      setUserDialog(false);
      setEditingUser(null);
      resetUserForm();
      fetchUsers();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update user');
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
      isActive: true
    });
  };

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
        isActive: userToEdit.isActive
      });
    } else {
      setEditingUser(null);
      resetUserForm();
    }
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
    };
    return colors[role] || 'default';
  };

  const getRoleStats = () => {
    const stats = {
      clinicians: users.filter(u => u.role === 'clinician').length,
      workers: users.filter(u => u.role === 'worker').length,
      managers: users.filter(u => u.role === 'case_manager').length,
      supervisors: users.filter(u => u.role === 'site_supervisor').length,
    };
    return stats;
  };

  const stats = getRoleStats();

  if (loading) {
    return (
      <Layout>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  return (
    <Layout>
      <Box>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h3" component="h1" sx={{ fontWeight: 700, mb: 1 }}>
            Admin Dashboard
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ fontSize: '1rem' }}>
            Welcome back, {user?.firstName}! Manage users, cases, and system settings.
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {successMessage && (
          <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setSuccessMessage('')}>
            {successMessage}
          </Alert>
        )}

        {/* Statistics Cards */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 4 }}>
          <Box sx={{ flex: '1 1 250px', minWidth: '250px' }}>
            <Card sx={{ 
              height: '100%',
              background: 'linear-gradient(135deg, #7B68EE 0%, #9B7FFF 100%)',
              color: 'white',
              position: 'relative',
              overflow: 'hidden',
            }}>
              <CardContent sx={{ position: 'relative', zIndex: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box>
                    <Typography variant="body2" sx={{ opacity: 0.9, mb: 1 }}>
                      Total Users
                    </Typography>
                    <Typography variant="h3" sx={{ fontWeight: 700 }}>
                      {users.length}
                    </Typography>
                  </Box>
                  <IconButton sx={{ color: 'white', opacity: 0.8 }}>
                    <MoreVert />
                  </IconButton>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <People sx={{ fontSize: 20 }} />
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Active Users
                  </Typography>
                </Box>
              </CardContent>
              <Box
                sx={{
                  position: 'absolute',
                  top: -20,
                  right: -20,
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.1)',
                  zIndex: 1,
                }}
              />
            </Card>
          </Box>

          <Box sx={{ flex: '1 1 250px', minWidth: '250px' }}>
            <Card sx={{ 
              height: '100%',
              background: 'linear-gradient(135deg, #20B2AA 0%, #4DD0C1 100%)',
              color: 'white',
              position: 'relative',
              overflow: 'hidden',
            }}>
              <CardContent sx={{ position: 'relative', zIndex: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box>
                    <Typography variant="body2" sx={{ opacity: 0.9, mb: 1 }}>
                      Active Cases
                    </Typography>
                    <Typography variant="h3" sx={{ fontWeight: 700 }}>
                      23
                    </Typography>
                  </Box>
                  <IconButton sx={{ color: 'white', opacity: 0.8 }}>
                    <MoreVert />
                  </IconButton>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Assignment sx={{ fontSize: 20 }} />
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    In Progress
                  </Typography>
                </Box>
              </CardContent>
              <Box
                sx={{
                  position: 'absolute',
                  top: -20,
                  right: -20,
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.1)',
                  zIndex: 1,
                }}
              />
            </Card>
          </Box>

          <Box sx={{ flex: '1 1 250px', minWidth: '250px' }}>
            <Card sx={{ 
              height: '100%',
              background: 'linear-gradient(135deg, #FF8C00 0%, #FFA500 100%)',
              color: 'white',
              position: 'relative',
              overflow: 'hidden',
            }}>
              <CardContent sx={{ position: 'relative', zIndex: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box>
                    <Typography variant="body2" sx={{ opacity: 0.9, mb: 1 }}>
                      Assessments
                    </Typography>
                    <Typography variant="h3" sx={{ fontWeight: 700 }}>
                      45
                    </Typography>
                  </Box>
                  <IconButton sx={{ color: 'white', opacity: 0.8 }}>
                    <MoreVert />
                  </IconButton>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Assessment sx={{ fontSize: 20 }} />
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    This month
                  </Typography>
                </Box>
              </CardContent>
              <Box
                sx={{
                  position: 'absolute',
                  top: -20,
                  right: -20,
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.1)',
                  zIndex: 1,
                }}
              />
            </Card>
          </Box>

          <Box sx={{ flex: '1 1 250px', minWidth: '250px' }}>
            <Card sx={{ 
              height: '100%',
              background: 'linear-gradient(135deg, #FF6B6B 0%, #FF8E8E 100%)',
              color: 'white',
              position: 'relative',
              overflow: 'hidden',
            }}>
              <CardContent sx={{ position: 'relative', zIndex: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box>
                    <Typography variant="body2" sx={{ opacity: 0.9, mb: 1 }}>
                      Avg Resolution
                    </Typography>
                    <Typography variant="h3" sx={{ fontWeight: 700 }}>
                      12.5
                    </Typography>
                  </Box>
                  <IconButton sx={{ color: 'white', opacity: 0.8 }}>
                    <MoreVert />
                  </IconButton>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TrendingUp sx={{ fontSize: 20 }} />
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    days
                  </Typography>
                </Box>
              </CardContent>
              <Box
                sx={{
                  position: 'absolute',
                  top: -20,
                  right: -20,
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.1)',
                  zIndex: 1,
                }}
              />
            </Card>
          </Box>
        </Box>

        {/* Quick Actions */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
          <Box sx={{ flex: '1 1 600px', minWidth: '600px' }}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Typography variant="h5" sx={{ fontWeight: 600 }}>
                    User Management
                  </Typography>
                  <Button 
                    variant="contained"
                    startIcon={<Add />}
                    onClick={() => openUserDialog()}
                    sx={{
                      background: 'linear-gradient(135deg, #7B68EE 0%, #9B7FFF 100%)',
                      borderRadius: 2,
                    }}
                  >
                    Add User
                  </Button>
                </Box>
                <Typography color="text.secondary" sx={{ mb: 3 }}>
                  Manage system users, roles, and permissions.
                </Typography>
                
                {/* Quick Stats */}
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                  <Box sx={{ flex: '1 1 150px', minWidth: '150px' }}>
                    <Box sx={{ textAlign: 'center', p: 2, backgroundColor: 'rgba(123, 104, 238, 0.05)', borderRadius: 2 }}>
                      <Group sx={{ fontSize: 32, color: '#7B68EE', mb: 1 }} />
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>{stats.clinicians}</Typography>
                      <Typography variant="body2" color="text.secondary">Clinicians</Typography>
                    </Box>
                  </Box>
                  <Box sx={{ flex: '1 1 150px', minWidth: '150px' }}>
                    <Box sx={{ textAlign: 'center', p: 2, backgroundColor: 'rgba(32, 178, 170, 0.05)', borderRadius: 2 }}>
                      <LocalHospital sx={{ fontSize: 32, color: '#20B2AA', mb: 1 }} />
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>{stats.workers}</Typography>
                      <Typography variant="body2" color="text.secondary">Workers</Typography>
                    </Box>
                  </Box>
                  <Box sx={{ flex: '1 1 150px', minWidth: '150px' }}>
                    <Box sx={{ textAlign: 'center', p: 2, backgroundColor: 'rgba(255, 140, 0, 0.05)', borderRadius: 2 }}>
                      <Assignment sx={{ fontSize: 32, color: '#FF8C00', mb: 1 }} />
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>{stats.managers}</Typography>
                      <Typography variant="body2" color="text.secondary">Managers</Typography>
                    </Box>
                  </Box>
                  <Box sx={{ flex: '1 1 150px', minWidth: '150px' }}>
                    <Box sx={{ textAlign: 'center', p: 2, backgroundColor: 'rgba(255, 107, 107, 0.05)', borderRadius: 2 }}>
                      <Schedule sx={{ fontSize: 32, color: '#FF6B6B', mb: 1 }} />
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>{stats.supervisors}</Typography>
                      <Typography variant="body2" color="text.secondary">Supervisors</Typography>
                    </Box>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Box>

          <Box sx={{ flex: '1 1 300px', minWidth: '300px' }}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h5" sx={{ fontWeight: 600, mb: 3 }}>
                  System Overview
                </Typography>
                
                <Box sx={{ mb: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">System Health</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>98%</Typography>
                  </Box>
                  <Box sx={{ width: '100%', height: 8, backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: 4, overflow: 'hidden' }}>
                    <Box sx={{ width: '98%', height: '100%', background: 'linear-gradient(90deg, #7B68EE 0%, #20B2AA 100%)', borderRadius: 4 }} />
                  </Box>
                </Box>

                <Box sx={{ mb: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">Storage Used</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>2.4GB</Typography>
                  </Box>
                  <Box sx={{ width: '100%', height: 8, backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: 4, overflow: 'hidden' }}>
                    <Box sx={{ width: '60%', height: '100%', background: 'linear-gradient(90deg, #FF8C00 0%, #FFA500 100%)', borderRadius: 4 }} />
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Chip label="Online" color="success" size="small" />
                  <Chip label="Secure" color="info" size="small" />
                  <Chip label="Updated" color="primary" size="small" />
                </Box>
              </CardContent>
            </Card>
          </Box>
        </Box>

        {/* Users Table */}
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              All Users ({totalUsers})
            </Typography>
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Role</TableCell>
                    <TableCell>Phone</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {users.map((userItem) => (
                    <TableRow key={userItem._id}>
                      <TableCell>
                        {userItem.firstName} {userItem.lastName}
                      </TableCell>
                      <TableCell>{userItem.email}</TableCell>
                      <TableCell>
                        <Chip
                          label={userItem.role.replace('_', ' ')}
                          color={getRoleColor(userItem.role)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{userItem.phone || 'N/A'}</TableCell>
                      <TableCell>
                        <Chip
                          label={userItem.isActive ? 'Active' : 'Inactive'}
                          color={userItem.isActive ? 'success' : 'error'}
                          size="small"
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

        {/* User Dialog */}
        <Dialog open={userDialog} onClose={() => setUserDialog(false)} maxWidth="md" fullWidth>
          <DialogTitle>
            {editingUser ? 'Edit User' : 'Create New User'}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ mt: 2 }}>
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
                onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                sx={{ mb: 2 }}
                helperText={editingUser ? "Leave blank to keep current password" : "Minimum 6 characters"}
              />
              
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
                (!editingUser && !userForm.password.trim()) ||
                (userForm.role === 'clinician' && (!userForm.specialty.trim() || !userForm.licenseNumber.trim()))
              }
            >
              {loading ? 'Saving...' : (editingUser ? 'Update User' : 'Create User')}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  );
};

export default AdminDashboard;