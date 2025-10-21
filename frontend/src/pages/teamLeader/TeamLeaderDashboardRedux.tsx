  import React, { useState, useEffect, useCallback, useMemo } from 'react';
  import { useAuth } from '../../contexts/AuthContext.supabase';
  import {
    useGetTeamLeaderAnalyticsQuery,
    useGetWorkReadinessAssignmentsQuery,
    useGetMonthlyPerformanceQuery,
  } from '../../store/api/teamLeaderApi';
  import { useAppDispatch, useAppSelector } from '../../store/hooks';
  import {
    setMainTab,
    setSelectedDate,
    setFilterStatus,
    setShowInactive,
    setSorting,
    resetFilters,
    resetToToday,
  } from '../../store/slices/teamLeaderSlice';
  import { useWorkReadinessRealtime, useTeamRealtime } from '../../hooks/useRealtime';
  import { SupabaseAPI } from '../../utils/supabaseApi';
  import LoadingSpinner from '../../components/LoadingSpinner';
  import Toast from '../../components/Toast';
  import LayoutWithSidebar from '../../components/LayoutWithSidebar';
  import { getProfileImageProps } from '../../utils/imageUtils';
  import { dataClient } from '../../lib/supabase';
  import { Line } from 'react-chartjs-2';
  import { Box, Typography, Button, Card, CardContent, Grid, Fade, Tabs, Tab } from '@mui/material';
  import {
    People,
    TrendingUp,
    Assignment,
    CheckCircle,
    Timeline
  } from '@mui/icons-material';
  import StatCard from '../../components/StatCard';
  // TrendChart moved inline to TeamAnalytics.tsx
  import RecentActivityItem from '../../components/RecentActivityItem';
  import TeamKPIDashboard from '../../components/TeamKPIDashboard';
  import TeamLeaderShiftDisplay from '../../components/TeamLeaderShiftDisplay';
  import TeamLeaderKPICards from '../../components/TeamLeaderKPICards';
  import WorkReadinessChart from '../../components/WorkReadinessChart';
  import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title as ChartTitle,
    Tooltip as ChartTooltip,
    Legend,
    Filler
  } from 'chart.js';

  ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    ChartTitle,
    ChartTooltip,
    Legend,
    Filler
  );

  // Modern SaaS Color Palette
  const COLORS = {
    primary: {
      main: '#6366f1',
      light: '#818cf8',
      dark: '#4f46e5',
      bg: 'rgba(99, 102, 241, 0.08)',
    },
    success: {
      main: '#10b981',
      light: '#34d399',
      dark: '#059669',
      bg: 'rgba(16, 185, 129, 0.08)',
    },
    warning: {
      main: '#f59e0b',
      light: '#fbbf24',
      dark: '#d97706',
      bg: 'rgba(245, 158, 11, 0.08)',
    },
    error: {
      main: '#ef4444',
      light: '#f87171',
      dark: '#dc2626',
      bg: 'rgba(239, 68, 68, 0.08)',
    },
    purple: {
      main: '#8b5cf6',
      light: '#a78bfa',
      dark: '#7c3aed',
      bg: 'rgba(139, 92, 246, 0.08)',
    },
    neutral: {
      white: '#ffffff',
      50: '#fafafa',
      100: '#f5f5f5',
      200: '#e5e5e5',
      300: '#d4d4d4',
      400: '#a3a3a3',
      500: '#737373',
      600: '#525252',
      700: '#404040',
      800: '#262626',
      900: '#171717',
    },
    gradient: {
      primary: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      success: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      header: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
    }
  };

  const TeamLeaderDashboardRedux: React.FC = () => {
    const { user } = useAuth();
    const dispatch = useAppDispatch();
    
    // Redux state
    const {
      mainTab,
      selectedDate,
      filterStatus,
      showInactive,
      sortBy,
      sortOrder,
      selectedMonth,
      selectedYear,
    } = useAppSelector(state => state.teamLeader);

    // Local UI state
    const [showCreateUser, setShowCreateUser] = useState(false);
    const [showCreateTeam, setShowCreateTeam] = useState(false);
    const [createUserLoading, setCreateUserLoading] = useState(false);
    const [createTeamLoading, setCreateTeamLoading] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [createdUser, setCreatedUser] = useState<any>(null);
    
    // Pagination state
    const [teamMembersPage, setTeamMembersPage] = useState(1);
    const [teamMembersPageSize, setTeamMembersPageSize] = useState(10);
    const [activeCasesPage, setActiveCasesPage] = useState(1);
    const [activeCasesPageSize, setActiveCasesPageSize] = useState(5);
    const [notificationsPage, setNotificationsPage] = useState(1);
    const [notificationsPageSize, setNotificationsPageSize] = useState(10);

    // Date range states - REMOVED (handled by new WorkReadinessChart component)

    // Notifications and cases state
    const [notifications, setNotifications] = useState<any[]>([]);
    const [notificationsLoading, setNotificationsLoading] = useState(false);
    const [activeCases, setActiveCases] = useState<any[]>([]);
    const [activeCasesLoading, setActiveCasesLoading] = useState(false);
    const [viewDetails, setViewDetails] = useState({ open: false, case: null as any });
    const [searchQuery, setSearchQuery] = useState('');

    // Create user form state
    const [createUserForm, setCreateUserForm] = useState({
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      team: '',
      phone: ''
    });
    const [emailValidation, setEmailValidation] = useState({ 
      isValid: true, 
      message: '', 
      checking: false 
    });
    const [passwordValidation, setPasswordValidation] = useState({
      length: false,
      uppercase: false,
      lowercase: false,
      number: false,
      special: false
    });
    const [teamData, setTeamData] = useState<any>(null);

    // Create team form state
    const [createTeamForm, setCreateTeamForm] = useState({
      teamName: ''
    });

    // RTK Query hooks - Fetch data from Redux
    const {
      data: analyticsData,
      isLoading: analyticsLoading,
      error: analyticsError,
      refetch: refetchAnalytics
    } = useGetTeamLeaderAnalyticsQuery(user?.id || '', {
      skip: !user?.id,
      pollingInterval: 60000, // Refresh every 60 seconds
    });

    const {
      data: monthlyData,
      isLoading: monthlyLoading,
      refetch: refetchMonthly
    } = useGetMonthlyPerformanceQuery(
      { teamLeaderId: user?.id || '', year: selectedYear, month: selectedMonth },
      { skip: !user?.id }
    );

    // Real-time subscriptions - removed callback parameter since hooks don't support it
    useWorkReadinessRealtime(user?.id || '');
    useTeamRealtime(user?.id || '');

    // Use useEffect to refetch when data changes
    useEffect(() => {
      if (user?.id) {
        refetchAnalytics();
        refetchMonthly();
      }
    }, [user?.id, refetchAnalytics, refetchMonthly]);

    // Fetch notifications
    const fetchNotifications = useCallback(async () => {
      if (!user?.id) return;
      
      setNotificationsLoading(true);
      try {
        const { data, error } = await dataClient
          .from('notifications')
          .select('*')
          .eq('recipient_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50);

        if (error) throw error;
        setNotifications(data || []);
      } catch (err) {
        console.error('Error fetching notifications:', err);
      } finally {
        setNotificationsLoading(false);
      }
    }, [user?.id]);

    // Fetch active cases
    const fetchActiveCases = useCallback(async () => {
      if (!user?.id || !analyticsData?.teamMembers) return;
      
      setActiveCasesLoading(true);
      try {
        const teamMemberIds = analyticsData.teamMembers.map((m: any) => m.id);
        
        if (teamMemberIds.length === 0) {
          setActiveCases([]);
          setActiveCasesLoading(false);
          return;
        }

        const { data, error } = await dataClient
          .from('cases')
          .select(`
            *,
            worker:users!cases_worker_id_fkey(id, first_name, last_name, email)
          `)
          .in('worker_id', teamMemberIds)
          .neq('status', 'closed')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setActiveCases(data || []);
      } catch (err) {
        console.error('Error fetching active cases:', err);
      } finally {
        setActiveCasesLoading(false);
      }
    }, [user?.id, analyticsData?.teamMembers]);

    // Fetch team data - USE BACKEND DATA, NOT CACHED USER DATA!
    useEffect(() => {
      if (analyticsData && analyticsData.teamLeader) {
        if (process.env.NODE_ENV === 'development') {
          console.log('🔄 Updating teamData from backend analytics');
          console.log('📊 Backend team:', analyticsData.teamLeader.team);
          console.log('📋 Backend managedTeams:', analyticsData.teamLeader.managedTeams);
        }
        
        setTeamData({
          currentTeam: analyticsData.teamLeader.team || '',
          defaultTeam: analyticsData.teamLeader.team || '',
          managedTeams: analyticsData.teamLeader.managedTeams || []
        });
        
        if (process.env.NODE_ENV === 'development') {
          console.log('✅ teamData updated!');
        }
      }
    }, [analyticsData]);

    // Email validation function
    const validateEmail = useCallback(async (email: string) => {
      if (!email || !email.includes('@')) {
        setEmailValidation({ isValid: true, message: '', checking: false });
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        setEmailValidation({
          isValid: false,
          message: 'Invalid email format',
          checking: false
        });
      } else {
        setEmailValidation({
          isValid: true,
          message: 'Email format is valid',
          checking: false
        });
      }
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

    // Handle user creation
    const handleCreateUser = async (e: React.FormEvent) => {
      e.preventDefault();
      
      if (!createUserForm.firstName || !createUserForm.lastName || !createUserForm.email || !createUserForm.password) {
        setToast({ message: 'Please fill in all required fields', type: 'error' });
        return;
      }

      if (!emailValidation.isValid) {
        setToast({ message: 'Please use a different email address', type: 'error' });
        return;
      }

      if (!isPasswordStrong) {
        setToast({ message: 'Please ensure the password meets all requirements', type: 'error' });
        return;
      }

      try {
        setCreateUserLoading(true);
        
        const userData = {
          ...createUserForm,
          team: createUserForm.team || teamData?.defaultTeam || teamData?.managedTeams?.[0] || ''
        };
        
        console.log('Creating user with data:', userData);
        
        const result = await SupabaseAPI.createUser(userData);
        console.log('User created successfully:', result);
        
        setCreatedUser({ 
          id: result.user.id, 
          email: result.user.email, 
          firstName: result.user.first_name, 
          lastName: result.user.last_name,
          team: result.user.team
        });
        setShowSuccessModal(true);
        setShowCreateUser(false);
        setCreateUserForm({
          firstName: '',
          lastName: '',
          email: '',
          password: '',
          phone: '',
          team: ''
        });
        
        // Refetch data
        refetchAnalytics();
      } catch (error: any) {
        console.error('Error creating user:', error);
        
        let errorMessage = 'Error creating user';
        if (error.message) {
          if (error.message.includes('Email already registered')) {
            errorMessage = 'Email already registered. Please use a different email address.';
          } else if (error.message.includes('duplicate key value violates unique constraint')) {
            errorMessage = 'Email already registered. Please use a different email address.';
          } else {
            errorMessage = error.message;
          }
        }
        
        setToast({ 
          message: errorMessage, 
          type: 'error' 
        });
      } finally {
        setCreateUserLoading(false);
      }
    };

    // Handle team creation
    const handleCreateTeam = async (e: React.FormEvent) => {
      e.preventDefault();
      
      console.log('🚀 handleCreateTeam called');
      console.log('📝 Team name:', createTeamForm.teamName);
      console.log('👤 User ID:', user?.id);
      
      if (!createTeamForm.teamName.trim()) {
        console.log('❌ Team name is empty');
        setToast({ message: 'Please enter a team name', type: 'error' });
        return;
      }

      if (!user?.id) {
        console.log('❌ User not authenticated');
        setToast({ message: 'User not authenticated', type: 'error' });
        return;
      }

      // Enforce one team per team leader
      const hasExistingTeam = !!(teamData?.defaultTeam && teamData.defaultTeam.trim() !== '') || 
                             (teamData?.managedTeams?.length || 0) > 0;
      
      console.log('🔍 Checking existing team:', { hasExistingTeam, teamData });
      
      if (hasExistingTeam) {
        console.log('❌ Team already exists');
        setToast({ message: 'You already have a team. Only one team per team leader is allowed.', type: 'error' });
        return;
      }

      try {
        setCreateTeamLoading(true);
        console.log('⏳ Creating team:', createTeamForm.teamName, 'for user:', user.id);
        
        const result = await SupabaseAPI.createTeam(createTeamForm.teamName, user.id);
        console.log('✅ Team created successfully:', result);
        
        setToast({ message: 'Team created successfully! Refreshing...', type: 'success' });
        setShowCreateTeam(false);
        setCreateTeamForm({ teamName: '' });
        
        // Refetch data and reload page to update UI
        await refetchAnalytics();
        
        // Reload page after 1.5 seconds to show toast message
        setTimeout(() => {
          console.log('🔄 Reloading page to show updated team');
          window.location.reload();
        }, 1500);
      } catch (error: any) {
        console.error('❌ Error creating team:', error);
        setToast({ 
          message: error.message || 'Error creating team', 
          type: 'error' 
        });
      } finally {
        setCreateTeamLoading(false);
      }
    };

    // Handle set default team
    const handleSetDefaultTeam = async (teamName: string) => {
      try {
        if (!user?.id) {
          setToast({ message: 'User not authenticated', type: 'error' });
          return;
        }

        console.log('Setting default team:', teamName, 'for user:', user.id);
        await SupabaseAPI.updateUserTeam(user.id, teamName);
        
        setToast({ message: 'Default team updated successfully!', type: 'success' });
        
        // Refetch data
        refetchAnalytics();
      } catch (error: any) {
        console.error('Error updating default team:', error);
        setToast({ 
          message: error.message || 'Error updating default team', 
          type: 'error' 
        });
      }
    };

    // Fetch data on mount and when dependencies change
    useEffect(() => {
      fetchNotifications();
    }, [fetchNotifications]);

    useEffect(() => {
      fetchActiveCases();
    }, [fetchActiveCases]);

    // Extract data before early returns to avoid hook issues
    const { 
      teamMembers = [], 
      metrics = { totalMembers: 0, todaySubmissionCount: 0, complianceRate: '0.0', loggedInCount: 0, managedTeams: [] }, 
      workReadiness = [], 
      todaySubmissions = [] 
    } = analyticsData || {};
    const totalMembers = metrics.totalMembers || 0;
    const todaySubmissionCount = metrics.todaySubmissionCount || 0;
    const complianceRate = metrics.complianceRate || '0.0';
    const loggedInCount = metrics.loggedInCount || 0;

    // Filter team members based on search and status - MOVED BEFORE EARLY RETURNS
    const filteredTeamMembers = useMemo(() => {
      let filtered = teamMembers;

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter((member: any) =>
          member.first_name?.toLowerCase().includes(query) ||
          member.last_name?.toLowerCase().includes(query) ||
          member.email?.toLowerCase().includes(query)
        );
      }

      // Status filter
      if (!showInactive) {
        filtered = filtered.filter((member: any) => member.is_active !== false);
      }

      // Sort
      filtered.sort((a: any, b: any) => {
        let aVal, bVal;
        
        switch (sortBy) {
          case 'name':
            aVal = `${a.first_name} ${a.last_name}`.toLowerCase();
            bVal = `${b.first_name} ${b.last_name}`.toLowerCase();
            break;
          case 'date':
            aVal = a.created_at || '';
            bVal = b.created_at || '';
            break;
          default:
            aVal = a[sortBy];
            bVal = b[sortBy];
        }

        if (sortOrder === 'asc') {
          return aVal > bVal ? 1 : -1;
        } else {
          return aVal < bVal ? 1 : -1;
        }
      });

      return filtered;
    }, [teamMembers, searchQuery, showInactive, sortBy, sortOrder]);

    // Paginate team members
    const paginatedTeamMembers = useMemo(() => {
      const start = (teamMembersPage - 1) * teamMembersPageSize;
      const end = start + teamMembersPageSize;
      return filteredTeamMembers.slice(start, end);
    }, [filteredTeamMembers, teamMembersPage, teamMembersPageSize]);

    // Show loading state - AFTER ALL HOOKS
    if (analyticsLoading || !user) {
      return (
        <LayoutWithSidebar>
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
            <LoadingSpinner />
          </Box>
        </LayoutWithSidebar>
      );
    }

    // Show error state - AFTER ALL HOOKS
    if (analyticsError) {
      return (
        <LayoutWithSidebar>
          <Box sx={{ p: 3 }}>
            <Typography color="error">
              Failed to load dashboard data. Please refresh the page.
            </Typography>
            <Button 
              variant="contained" 
              onClick={() => window.location.reload()}
              sx={{ mt: 2 }}
            >
              Refresh Page
            </Button>
          </Box>
        </LayoutWithSidebar>
      );
    }

    // Handle empty data for new accounts - USE BACKEND DATA, NOT CACHED USER DATA!
    // OPTIMIZATION: Development-only logging
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 Checking if team leader has team...');
      console.log('📊 analyticsData:', analyticsData);
      console.log('👤 analyticsData.teamLeader:', analyticsData?.teamLeader);
      console.log('🏢 teamLeader.team:', analyticsData?.teamLeader?.team);
      console.log('📋 teamLeader.managedTeams:', analyticsData?.teamLeader?.managedTeams);
      console.log('🚫 user.team (CACHED - IGNORE):', user?.team);
    }
    
    // IMPORTANT: Use backend data (analyticsData.teamLeader) NOT cached user object!
    const hasNoTeam = analyticsData && 
                     analyticsData.teamLeader &&
                     !analyticsData.teamLeader.team && 
                     (!analyticsData.teamLeader.managedTeams || 
                      analyticsData.teamLeader.managedTeams.length === 0);
    
    if (process.env.NODE_ENV === 'development') {
      console.log('✅ hasNoTeam (from BACKEND data):', hasNoTeam);
    }
    
    if (hasNoTeam) {
      return (
        <LayoutWithSidebar>
          <Box sx={{ 
            p: { xs: 2, md: 3 }, 
            maxWidth: '1600px', 
            mx: 'auto',
            background: 'linear-gradient(135deg, #f5f7fa 0%,rgb(255, 255, 255) 100%)',
            minHeight: '100vh'
          }}>
            {/* Header */}
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: { xs: 'flex-start', md: 'center' },
              flexDirection: { xs: 'column', md: 'row' },
              gap: { xs: 2, md: 0 },
              mb: 4 
            }}>
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 700, color: COLORS.neutral[900], mb: 1 }}>
                  Team Leader Dashboard
                </Typography>
                <Typography variant="body1" sx={{ color: COLORS.neutral[600] }}>
                  Welcome back, {user?.firstName} {user?.lastName}
                </Typography>
              </Box>
            </Box>

            {/* Empty State - CREATE TEAM FIRST */}
            <Card sx={{ 
              p: 4, 
              textAlign: 'center',
              background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)',
              border: '1px solid #e2e8f0',
              borderRadius: 3
            }}>
              <Box sx={{ mb: 3 }}>
                <People sx={{ fontSize: 64, color: COLORS.neutral[400], mb: 2 }} />
                <Typography variant="h5" sx={{ fontWeight: 600, color: COLORS.neutral[800], mb: 1 }}>
                  Welcome to Your Team Leader Dashboard!
                </Typography>
                <Typography variant="body1" sx={{ color: COLORS.neutral[600], mb: 3 }}>
                  You're all set up as a team leader. Start by creating your team to begin managing your members.
                </Typography>
              </Box>
              
              <Button
                variant="contained"
                onClick={() => {
                  console.log('🔘 Create Your Team button clicked!');
                  console.log('📋 Current state:', { showCreateTeam });
                  console.log('👤 User:', user);
                  setShowCreateTeam(true);
                  console.log('✅ Create Team dialog should open now');
                }}
                startIcon={<People />}
                sx={{
                  background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                  borderRadius: 2,
                  px: 4,
                  py: 1.5,
                  fontSize: '1rem',
                  fontWeight: 600,
                  textTransform: 'none',
                  boxShadow: '0 4px 14px 0 rgba(22, 163, 74, 0.39)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #15803d 0%, #14532d 100%)',
                    boxShadow: '0 6px 20px 0 rgba(22, 163, 74, 0.49)',
                  },
                }}
              >
                Create Your Team
              </Button>
            </Card>

            {/* Create Team Modal - FOR NEW TEAM LEADERS */}
            {showCreateTeam && (
              <div style={{ 
                position: 'fixed', 
                top: 0, 
                left: 0, 
                right: 0, 
                bottom: 0, 
                backgroundColor: 'rgba(0,0,0,0.5)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                zIndex: 50 
              }}>
                <div style={{ 
                  backgroundColor: 'white', 
                  borderRadius: '0.5rem', 
                  padding: '1.5rem', 
                  width: '100%', 
                  maxWidth: '28rem' 
                }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1f2937', marginBottom: '1rem' }}>
                    Create Your Team
                  </h3>
                  
                  <form onSubmit={handleCreateTeam} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>
                        Team Name *
                      </label>
                      <input
                        type="text"
                        value={createTeamForm.teamName}
                        onChange={(e) => setCreateTeamForm({ ...createTeamForm, teamName: e.target.value })}
                        placeholder="Enter your team name (e.g., TEAM ALPHA)"
                        style={{
                          width: '100%',
                          padding: '0.5rem 0.75rem',
                          border: '1px solid #d1d5db',
                          borderRadius: '0.375rem',
                          outline: 'none',
                          fontSize: '0.875rem'
                        }}
                        required
                      />
                      <div style={{
                        fontSize: '0.75rem',
                        color: '#6b7280',
                        marginTop: '0.25rem'
                      }}>
                        Choose a unique name for your team
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', paddingTop: '1rem' }}>
                      <button
                        type="button"
                        onClick={() => {
                          console.log('🔘 Cancel Create Team clicked');
                          setShowCreateTeam(false);
                        }}
                        style={{
                          padding: '0.5rem 1rem',
                          color: '#6b7280',
                          border: '1px solid #d1d5db',
                          borderRadius: '0.375rem',
                          backgroundColor: 'white',
                          cursor: 'pointer'
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={createTeamLoading}
                        style={{
                          padding: '0.5rem 1rem',
                          backgroundColor: '#16a34a',
                          color: 'white',
                          borderRadius: '0.375rem',
                          border: 'none',
                          cursor: createTeamLoading ? 'not-allowed' : 'pointer',
                          opacity: createTeamLoading ? 0.5 : 1
                        }}
                      >
                        {createTeamLoading ? 'Creating...' : 'Create Team'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Toast notification */}
            {toast && (
              <Toast
                open={true}
                message={toast.message}
                type={toast.type}
                onClose={() => setToast(null)}
              />
            )}
          </Box>
        </LayoutWithSidebar>
      );
    }

    return (
      <LayoutWithSidebar>
        <Box sx={{ 
          p: { xs: 2, md: 3 }, 
          maxWidth: '1600px', 
          mx: 'auto',
          background: 'linear-gradient(135deg, #f5f7fa 0%,rgb(255, 255, 255) 100%)',
          minHeight: '100vh'
        }}>
          {/* Header with Create User Button */}
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: { xs: 'flex-start', md: 'center' },
            flexDirection: { xs: 'column', md: 'row' },
            gap: { xs: 2, md: 0 },
            mb: 4 
          }}>
            <Box>
            <Typography variant="h4" sx={{ fontWeight: 700, color: COLORS.neutral[900], mb: 1 }}>
              Team Leader Dashboard
            </Typography>
            <Typography variant="body1" sx={{ color: COLORS.neutral[600] }}>
              Welcome back, {user?.firstName} {user?.lastName}
            </Typography>
            </Box>
            <Button
              variant="contained"
              onClick={() => {
                console.log('🔘 Create New User button clicked!');
                console.log('📋 Current state:', { showCreateUser });
                setShowCreateUser(true);
                console.log('✅ Dialog should open now');
              }}
              startIcon={
                <Box component="span" sx={{ fontSize: '1.25rem', marginRight: '-4px' }}>+</Box>
              }
              sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                padding: { xs: '10px 20px', md: '12px 28px' },
                borderRadius: '12px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                width: { xs: '100%', md: 'auto' },
                fontSize: { xs: '0.8125rem', md: '0.875rem' },
                fontWeight: 600,
                textTransform: 'none',
                minWidth: { xs: '140px', md: '160px' },
                '&:hover': {
                  background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 6px 20px rgba(0,0,0,0.15)',
                },
                '&:active': {
                  transform: 'translateY(0)',
                }
              }}
            >
              Create New User
            </Button>
          </Box>

          {/* Current Shift Assignment */}
          <TeamLeaderShiftDisplay />

          {/* Team Management Section */}
          <Box sx={{ 
            backgroundColor: 'white', 
            padding: { xs: '20px', md: '1.5rem' },
            borderRadius: { xs: '12px', md: '0.5rem' },
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            marginBottom: { xs: '16px', md: '2rem' }
          }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <Typography variant="h6" sx={{ fontSize: '1.25rem', fontWeight: '600', color: '#1f2937' }}>
                Team Management
              </Typography>
              <Button
                onClick={() => {
                  const hasExistingTeam = !!(teamData?.defaultTeam && teamData.defaultTeam.trim() !== '') || 
                                         (teamData?.managedTeams?.length || 0) > 0;
                  if (hasExistingTeam) {
                    setToast({ message: 'You can only create one team.', type: 'error' });
                    return;
                  }
                  setShowCreateTeam(true);
                }}
                disabled={!!(teamData?.defaultTeam && teamData.defaultTeam.trim() !== '') || 
                         (teamData?.managedTeams?.length || 0) > 0}
                sx={{
                  backgroundColor: (!!(teamData?.defaultTeam && teamData.defaultTeam.trim() !== '') || 
                                   (teamData?.managedTeams?.length || 0) > 0) ? '#9ca3af' : '#16a34a',
                  color: 'white',
                  padding: '0.5rem 1rem',
                  borderRadius: '0.375rem',
                  '&:hover': {
                    backgroundColor: (!!(teamData?.defaultTeam && teamData.defaultTeam.trim() !== '') || 
                                     (teamData?.managedTeams?.length || 0) > 0) ? '#9ca3af' : '#15803d'
                  }
                }}
              >
                {(!!(teamData?.defaultTeam && teamData.defaultTeam.trim() !== '') || 
                  (teamData?.managedTeams?.length || 0) > 0) ? 'Team Already Created' : 'Create New Team'}
              </Button>
            </Box>
            
            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <Box sx={{ padding: '1rem', backgroundColor: '#f9fafb', borderRadius: '0.5rem' }}>
                  <Typography variant="body2" sx={{ fontSize: '0.875rem', fontWeight: '500', color: '#6b7280', marginBottom: '0.5rem' }}>
                    Current Team
                  </Typography>
                  <Typography variant="h6" sx={{ fontSize: '1.125rem', fontWeight: '600', color: '#1f2937' }}>
                    {teamData?.currentTeam || 'Not Set'}
                  </Typography>
                </Box>
            </Grid>
              
              <Grid item xs={12} sm={4}>
                <Box sx={{ padding: '1rem', backgroundColor: '#f9fafb', borderRadius: '0.5rem' }}>
                  <Typography variant="body2" sx={{ fontSize: '0.875rem', fontWeight: '500', color: '#6b7280', marginBottom: '0.5rem' }}>
                    Default Team
                  </Typography>
                  <Typography variant="h6" sx={{ fontSize: '1.125rem', fontWeight: '600', color: '#1f2937' }}>
                    {teamData?.defaultTeam || 'Not Set'}
                  </Typography>
                </Box>
            </Grid>
              
              <Grid item xs={12} sm={4}>
                <Box sx={{ padding: '1rem', backgroundColor: '#f9fafb', borderRadius: '0.5rem' }}>
                  <Typography variant="body2" sx={{ fontSize: '0.875rem', fontWeight: '500', color: '#6b7280', marginBottom: '0.5rem' }}>
                    Managed Teams
                  </Typography>
                  <Typography variant="h6" sx={{ fontSize: '1.125rem', fontWeight: '600', color: '#1f2937' }}>
                    {teamData?.managedTeams?.length || 0}
                  </Typography>
                </Box>
            </Grid>
          </Grid>

            {teamData?.managedTeams && teamData.managedTeams.length > 0 && (
              <Box sx={{ marginTop: '1rem' }}>
                <Typography variant="body2" sx={{ fontSize: '0.875rem', fontWeight: '500', color: '#6b7280', marginBottom: '0.5rem' }}>
                  Your Teams
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {teamData?.managedTeams?.map((team: string, index: number) => (
                    <Box key={index} sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '0.5rem',
                      padding: '0.5rem 0.75rem',
                      backgroundColor: team === teamData?.defaultTeam ? '#dbeafe' : '#f3f4f6',
                      borderRadius: '0.375rem',
                      border: team === teamData?.defaultTeam ? '1px solid #3b82f6' : '1px solid #d1d5db'
                    }}>
                      <Typography variant="body2" sx={{ 
                        fontSize: '0.875rem', 
                        fontWeight: '500',
                        color: team === teamData?.defaultTeam ? '#1e40af' : '#374151'
                      }}>
                        {team}
                      </Typography>
                      {team === teamData?.defaultTeam && teamData?.defaultTeam && (
                        <Typography variant="caption" sx={{ 
                          fontSize: '0.75rem', 
                          fontWeight: '600',
                          backgroundColor: '#4f94cd',
                          color: 'white',
                          padding: '0.125rem 0.375rem',
                          borderRadius: '0.25rem'
                        }}>
                          DEFAULT
                        </Typography>
                      )}
                      {team !== teamData?.defaultTeam && (
                        <Button
                          onClick={() => handleSetDefaultTeam(team)}
              sx={{
                            fontSize: '0.75rem',
                            color: '#6b7280',
                            textDecoration: 'underline',
                            minWidth: 'auto',
                            padding: 0
                          }}
                        >
                          Set Default
                        </Button>
                      )}
                    </Box>
                  ))}
                </Box>
              </Box>
            )}
          </Box>

          {/* Team Performance KPI Cards - Minimalist White */}
          {user?.id && <TeamLeaderKPICards teamLeaderId={user.id} />}

          {/* Work Readiness Activity Chart - NEW (No Redux) */}
          {user?.id && (
            <WorkReadinessChart teamLeaderId={user.id} />
          )}
        
  
          {/* Create User Modal */}
          {showCreateUser && (
            <div style={{ 
              position: 'fixed', 
              top: 0, 
              left: 0, 
              right: 0, 
              bottom: 0, 
              backgroundColor: 'rgba(0,0,0,0.5)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              zIndex: 50 
            }}>
              <div style={{ 
                backgroundColor: 'white', 
                borderRadius: '0.5rem', 
                padding: '1.5rem', 
                width: '100%', 
                maxWidth: '28rem' 
              }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1f2937', marginBottom: '1rem' }}>
                  Create New User
                </h3>
                
                <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>
                      First Name *
                    </label>
                    <input
                      type="text"
                      value={createUserForm.firstName}
                      onChange={(e) => setCreateUserForm({ ...createUserForm, firstName: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.5rem 0.75rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.375rem',
                        outline: 'none',
                        fontSize: '0.875rem'
                      }}
                      required
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>
                      Last Name *
                    </label>
                    <input
                      type="text"
                      value={createUserForm.lastName}
                      onChange={(e) => setCreateUserForm({ ...createUserForm, lastName: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.5rem 0.75rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.375rem',
                        outline: 'none',
                        fontSize: '0.875rem'
                      }}
                      required
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>
                      Email *
                    </label>
                    <input
                      type="email"
                      value={createUserForm.email}
                      onChange={(e) => {
                        setCreateUserForm({ ...createUserForm, email: e.target.value });
                        setTimeout(() => validateEmail(e.target.value), 500);
                      }}
                      style={{
                        width: '100%',
                        padding: '0.5rem 0.75rem',
                        border: `1px solid ${emailValidation.isValid ? '#d1d5db' : '#ef4444'}`,
                        borderRadius: '0.375rem',
                        outline: 'none',
                        fontSize: '0.875rem'
                      }}
                      required
                    />
                    {emailValidation.message && (
                      <div style={{
                        fontSize: '0.75rem',
                        color: emailValidation.isValid ? '#059669' : '#ef4444',
                        marginTop: '0.25rem'
                      }}>
                        {emailValidation.isValid ? '✓' : '✗'} {emailValidation.message}
                      </div>
                    )}
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>
                      Password *
                    </label>
                    <input
                      type="password"
                      value={createUserForm.password}
                      onChange={(e) => {
                        setCreateUserForm({ ...createUserForm, password: e.target.value });
                        validatePassword(e.target.value);
                      }}
                      style={{
                        width: '100%',
                        padding: '0.5rem 0.75rem',
                        border: `1px solid ${isPasswordStrong ? '#d1d5db' : '#ef4444'}`,
                        borderRadius: '0.375rem',
                        outline: 'none',
                        fontSize: '0.875rem'
                      }}
                      required
                      minLength={12}
                      placeholder="At least 12 characters with uppercase, lowercase, number, and special character"
                    />
                    <div style={{
                      fontSize: '0.75rem',
                      color: '#6b7280',
                      marginTop: '0.25rem'
                    }}>
                      Password must be at least 12 characters with uppercase, lowercase, number, and special character (@$!%*?&)
                    </div>
                    {createUserForm.password.length > 0 && (
                      <div style={{ marginTop: '0.5rem' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: '500', marginBottom: '0.25rem' }}>
                          Password Requirements:
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ 
                              color: passwordValidation.length ? '#059669' : '#ef4444',
                              fontSize: '0.75rem'
                            }}>
                              {passwordValidation.length ? '✓' : '✗'}
                            </span>
                            <span style={{ fontSize: '0.75rem', color: passwordValidation.length ? '#059669' : '#ef4444' }}>
                              At least 12 characters
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ 
                              color: passwordValidation.uppercase ? '#059669' : '#ef4444',
                              fontSize: '0.75rem'
                            }}>
                              {passwordValidation.uppercase ? '✓' : '✗'}
                            </span>
                            <span style={{ fontSize: '0.75rem', color: passwordValidation.uppercase ? '#059669' : '#ef4444' }}>
                              One uppercase letter
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ 
                              color: passwordValidation.lowercase ? '#059669' : '#ef4444',
                              fontSize: '0.75rem'
                            }}>
                              {passwordValidation.lowercase ? '✓' : '✗'}
                            </span>
                            <span style={{ fontSize: '0.75rem', color: passwordValidation.lowercase ? '#059669' : '#ef4444' }}>
                              One lowercase letter
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ 
                              color: passwordValidation.number ? '#059669' : '#ef4444',
                              fontSize: '0.75rem'
                            }}>
                              {passwordValidation.number ? '✓' : '✗'}
                            </span>
                            <span style={{ fontSize: '0.75rem', color: passwordValidation.number ? '#059669' : '#ef4444' }}>
                              One number
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ 
                              color: passwordValidation.special ? '#059669' : '#ef4444',
                              fontSize: '0.75rem'
                            }}>
                              {passwordValidation.special ? '✓' : '✗'}
                            </span>
                            <span style={{ fontSize: '0.75rem', color: passwordValidation.special ? '#059669' : '#ef4444' }}>
                              One special character (@$!%*?&)
                            </span>
                          </div>
                        </div>
                        {isPasswordStrong && (
                          <div style={{ 
                            marginTop: '0.5rem', 
                            padding: '0.5rem', 
                            backgroundColor: '#d1fae5', 
                            borderRadius: '0.375rem', 
                            border: '1px solid #059669' 
                          }}>
                            <span style={{ fontSize: '0.75rem', color: '#059669', fontWeight: '500' }}>
                              ✓ Strong password
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>
                      Team
                    </label>
                    <select
                      value={createUserForm.team}
                      onChange={(e) => setCreateUserForm({ ...createUserForm, team: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.5rem 0.75rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.375rem',
                        outline: 'none',
                        fontSize: '0.875rem'
                      }}
                    >
                      <option value="">Use Default Team ({teamData?.defaultTeam || 'None'})</option>
                      {teamData?.managedTeams?.map((team: string, index: number) => (
                        <option key={index} value={team}>{team}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={createUserForm.phone}
                      onChange={(e) => setCreateUserForm({ ...createUserForm, phone: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.5rem 0.75rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.375rem',
                        outline: 'none',
                        fontSize: '0.875rem'
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', paddingTop: '1rem' }}>
                    <button
                      type="button"
                      onClick={() => setShowCreateUser(false)}
                      style={{
                        padding: '0.5rem 1rem',
                        color: '#6b7280',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.375rem',
                        backgroundColor: 'white',
                        cursor: 'pointer'
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={createUserLoading}
                      style={{
                        padding: '0.5rem 1rem',
                        backgroundColor: '#2563eb',
                        color: 'white',
                        borderRadius: '0.375rem',
                        border: 'none',
                        cursor: createUserLoading ? 'not-allowed' : 'pointer',
                        opacity: createUserLoading ? 0.5 : 1
                      }}
                    >
                      {createUserLoading ? 'Creating...' : 'Create User'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Success Modal */}
          {showSuccessModal && createdUser && (
            <div style={{ 
              position: 'fixed', 
              top: 0, 
              left: 0, 
              right: 0, 
              bottom: 0, 
              backgroundColor: 'rgba(0,0,0,0.5)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              zIndex: 50 
            }}>
              <div style={{ 
                backgroundColor: 'white', 
                borderRadius: '0.5rem', 
                padding: '1.5rem', 
                width: '100%', 
                maxWidth: '28rem' 
              }}>
                <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>✓</div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#059669', marginBottom: '0.5rem' }}>
                    User Created Successfully!
                  </h3>
                  <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                    {createdUser.firstName} {createdUser.lastName} has been added to your team
                  </p>
                </div>
                
                <div style={{ backgroundColor: '#f3f4f6', borderRadius: '0.375rem', padding: '1rem', marginBottom: '1rem' }}>
                  <div style={{ marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block', marginBottom: '0.25rem' }}>Email</span>
                    <span style={{ fontSize: '0.875rem', fontWeight: '500', color: '#1f2937' }}>{createdUser.email}</span>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block', marginBottom: '0.25rem' }}>Team</span>
                    <span style={{ fontSize: '0.875rem', fontWeight: '500', color: '#1f2937' }}>{createdUser.team}</span>
                  </div>
                </div>

                <button
                  onClick={() => setShowSuccessModal(false)}
                  style={{
                    width: '100%',
                    padding: '0.5rem 1rem',
                    backgroundColor: '#2563eb',
                    color: 'white',
                    borderRadius: '0.375rem',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: '500'
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          )}

          {/* Create Team Modal */}
          {showCreateTeam && (
            <div style={{ 
              position: 'fixed', 
              top: 0, 
              left: 0, 
              right: 0, 
              bottom: 0, 
              backgroundColor: 'rgba(0,0,0,0.5)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              zIndex: 50 
            }}>
              <div style={{ 
                backgroundColor: 'white', 
                borderRadius: '0.5rem', 
                padding: '1.5rem', 
                width: '100%', 
                maxWidth: '28rem' 
              }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1f2937', marginBottom: '1rem' }}>
                  Create Your Team
                </h3>
                
                <form onSubmit={handleCreateTeam} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>
                      Team Name *
                    </label>
                    <input
                      type="text"
                      value={createTeamForm.teamName}
                      onChange={(e) => setCreateTeamForm({ ...createTeamForm, teamName: e.target.value })}
                      placeholder="Enter your team name (e.g., TEAM ALPHA)"
                      style={{
                        width: '100%',
                        padding: '0.5rem 0.75rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.375rem',
                        outline: 'none',
                        fontSize: '0.875rem'
                      }}
                      required
                    />
                    <div style={{
                      fontSize: '0.75rem',
                      color: '#6b7280',
                      marginTop: '0.25rem'
                    }}>
                      Choose a unique name for your team
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', paddingTop: '1rem' }}>
                    <button
                      type="button"
                      onClick={() => {
                        console.log('🔘 Cancel Create Team clicked');
                        setShowCreateTeam(false);
                      }}
                      style={{
                        padding: '0.5rem 1rem',
                        color: '#6b7280',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.375rem',
                        backgroundColor: 'white',
                        cursor: 'pointer'
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={createTeamLoading}
                      style={{
                        padding: '0.5rem 1rem',
                        backgroundColor: '#16a34a',
                        color: 'white',
                        borderRadius: '0.375rem',
                        border: 'none',
                        cursor: createTeamLoading ? 'not-allowed' : 'pointer',
                        opacity: createTeamLoading ? 0.5 : 1
                      }}
                    >
                      {createTeamLoading ? 'Creating...' : 'Create Team'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Toast notification */}
          {toast && (
            <Toast
              open={true}
              message={toast.message}
              type={toast.type}
              onClose={() => setToast(null)}
            />
          )}
        </Box>
      </LayoutWithSidebar>
    );
  };

  export default TeamLeaderDashboardRedux;

