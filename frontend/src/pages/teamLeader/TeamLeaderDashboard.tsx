import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../utils/api';
import LoadingSpinner from '../../components/LoadingSpinner';
import Toast from '../../components/Toast';
import LayoutWithSidebar from '../../components/LayoutWithSidebar';
import { createImageProps } from '../../utils/imageUtils';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface TeamMember {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  team: string;
  phone?: string;
  isActive: boolean;
  lastLogin?: string;
  profileImage?: string;
  loggedInToday?: boolean;
}

interface DashboardData {
  teamOverview: {
    totalMembers: number;
    activeMembers: number;
    teamName: string;
  };
  safetyMetrics: {
    activeCases: number;
    monthlyIncidents: number;
    incidentTrend: string;
  };
  complianceMetrics: {
    todayCheckIns: number;
    todayCompletionRate: number;
    weeklyCheckIns: number;
    weeklyCompletionRate: number;
  };
  teamPerformance: Array<{
    workerName: string;
    totalCheckIns: number;
    avgPainLevel: number;
    avgFunctionalStatus: number;
  }>;
  recentActivity: Array<{
    description: string;
    timestamp: string;
    type: string;
  }>;
  activeCases: Array<{
    caseNumber: string;
    workerName: string;
    status: string;
    priority: string;
    daysOpen: number;
  }>;
  todaysCheckIns: Array<{
    workerName: string;
    type: string;
    status: string;
    timestamp: string;
  }>;
}

interface ReadinessTrendData {
  date: string;
  notFitForWork: number;
  minorConcernsFitForWork: number;
}

interface AnalyticsData {
  analytics: {
    readinessTrendData: ReadinessTrendData[];
  };
}

interface TeamData {
  currentTeam: string;
  defaultTeam: string;
  managedTeams: string[];
}

const TeamLeaderDashboard: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [teamData, setTeamData] = useState<TeamData | null>(null);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [createUserLoading, setCreateUserLoading] = useState(false);
  const [createTeamLoading, setCreateTeamLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdUser, setCreatedUser] = useState<any>(null);
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);
  
  // Pagination state for Recent Activity
  const [recentActivityPage, setRecentActivityPage] = useState(1);
  const [recentActivityPageSize] = useState(5); // Show 5 items per page

  // Pagination state for Team Members
  const [teamMembersPage, setTeamMembersPage] = useState(1);
  const [teamMembersPageSize, setTeamMembersPageSize] = useState(10); // Show 10 items per page
  const [teamMembersTotal, setTeamMembersTotal] = useState(0);
  const [teamMembersLoading, setTeamMembersLoading] = useState(false);

  // Create user form state
  const [createUserForm, setCreateUserForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    phone: '',
    team: ''
  });

  // Create team form state
  const [createTeamForm, setCreateTeamForm] = useState({
    teamName: ''
  });

  // Work Readiness Activity chart state
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [readinessDateRange, setReadinessDateRange] = useState<'week' | 'month' | 'year' | 'custom'>('month');
  const [readinessStartDate, setReadinessStartDate] = useState<Date>(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
  const [readinessEndDate, setReadinessEndDate] = useState<Date>(new Date());
  const [readinessChartLoading, setReadinessChartLoading] = useState(false);

  // Pagination logic for Recent Activity
  const paginatedRecentActivity = useMemo(() => {
    if (!dashboardData?.recentActivity) return { items: [], totalPages: 0, totalItems: 0 };
    
    const totalItems = dashboardData.recentActivity.length;
    const totalPages = Math.ceil(totalItems / recentActivityPageSize);
    const startIndex = (recentActivityPage - 1) * recentActivityPageSize;
    const endIndex = startIndex + recentActivityPageSize;
    const items = dashboardData.recentActivity.slice(startIndex, endIndex);
    
    return { items, totalPages, totalItems };
  }, [dashboardData?.recentActivity, recentActivityPage, recentActivityPageSize]);

  // Optimized data fetching with caching
  const fetchDashboardData = useCallback(async (forceRefresh = false) => {
    const now = Date.now();
    const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache
    
    if (!forceRefresh && (now - lastFetchTime) < CACHE_DURATION && dashboardData) {
      return; // Use cached data
    }

    try {
      setLoading(true);
      const response = await api.get('/team-leader/dashboard');
      setDashboardData(response.data.data);
      setLastFetchTime(now);
    } catch (error) {
      setToast({ message: 'Error loading dashboard data', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [dashboardData, lastFetchTime]);

  const fetchTeamMembers = useCallback(async () => {
    try {
      setTeamMembersLoading(true);
      const response = await api.get(`/team-leader/team-members?page=${teamMembersPage}&limit=${teamMembersPageSize}`);
      setTeamMembers(response.data.data.teamMembers);
      setTeamMembersTotal(response.data.data.pagination.total);
    } catch (error) {
      setToast({ message: 'Error loading team members', type: 'error' });
    } finally {
      setTeamMembersLoading(false);
    }
  }, [teamMembersPage, teamMembersPageSize]);

  const fetchTeamData = useCallback(async () => {
    try {
      const response = await api.get('/team-leader/teams');
      setTeamData(response.data.data);
    } catch (error) {
      setToast({ message: 'Error loading team data', type: 'error' });
    }
  }, []);

  const fetchAnalyticsData = useCallback(async () => {
    try {
      setReadinessChartLoading(true);
      let url = '/team-leader/analytics';
      const params = new URLSearchParams();
      
      if (readinessDateRange === 'custom') {
        params.append('startDate', readinessStartDate.toISOString());
        params.append('endDate', readinessEndDate.toISOString());
      } else {
        params.append('range', readinessDateRange);
      }
      
      const response = await api.get(`${url}?${params.toString()}`);
      setAnalyticsData(response.data);
    } catch (error) {
      console.error('Error fetching analytics data:', error);
    } finally {
      setReadinessChartLoading(false);
    }
  }, [readinessDateRange, readinessStartDate, readinessEndDate]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    fetchDashboardData();
    fetchTeamMembers();
    fetchTeamData();
    fetchAnalyticsData();

    const interval = setInterval(() => {
      fetchDashboardData(true); // Force refresh
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [fetchDashboardData, fetchTeamMembers, fetchTeamData, fetchAnalyticsData]);

  // Fetch analytics data when readiness chart filters change
  useEffect(() => {
    fetchAnalyticsData();
  }, [fetchAnalyticsData]);

  // Reset pagination when data changes
  useEffect(() => {
    setRecentActivityPage(1);
  }, [dashboardData?.recentActivity]);

  // Refetch team members when pagination changes
  useEffect(() => {
    fetchTeamMembers();
  }, [fetchTeamMembers]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!createUserForm.firstName || !createUserForm.lastName || !createUserForm.email || !createUserForm.password) {
      setToast({ message: 'Please fill in all required fields', type: 'error' });
      return;
    }

    try {
      setCreateUserLoading(true);
      
      // Use default team if no team specified
      const userData = {
        ...createUserForm,
        team: createUserForm.team || teamData?.defaultTeam || teamData?.managedTeams?.[0] || ''
      };
      
      const response = await api.post('/team-leader/create-user', userData);
      console.log('User creation response:', response.data);
      
      // Show success modal with user data
      setCreatedUser(response.data.user);
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
      
      // Refresh data
      await fetchTeamMembers();
    } catch (error: any) {
      console.error('Error creating user:', error.response?.data);
      setToast({ 
        message: error.response?.data?.message || 'Error creating worker', 
        type: 'error' 
      });
    } finally {
      setCreateUserLoading(false);
    }
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!createTeamForm.teamName.trim()) {
      setToast({ message: 'Please enter a team name', type: 'error' });
      return;
    }

    try {
      setCreateTeamLoading(true);
      await api.post('/team-leader/teams', { teamName: createTeamForm.teamName });
      
      setToast({ message: 'Team created successfully!', type: 'success' });
      setShowCreateTeam(false);
      setCreateTeamForm({ teamName: '' });
      
      // Refresh team data
      await fetchTeamData();
    } catch (error: any) {
      setToast({ 
        message: error.response?.data?.message || 'Error creating team', 
        type: 'error' 
      });
    } finally {
      setCreateTeamLoading(false);
    }
  };

  const handleSetDefaultTeam = async (teamName: string) => {
    try {
      await api.put('/team-leader/teams/default', { teamName });
      setToast({ message: 'Default team updated successfully!', type: 'success' });
      await fetchTeamData();
    } catch (error: any) {
      setToast({ 
        message: error.response?.data?.message || 'Error updating default team', 
        type: 'error' 
      });
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!dashboardData) {
    return (
      <LayoutWithSidebar>
        <div style={{ padding: '2rem' }}>
          <div style={{ textAlign: 'center' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1f2937', marginBottom: '1rem' }}>
              Team Leader Dashboard
            </h1>
            <p style={{ color: '#6b7280' }}>Error loading dashboard data</p>
          </div>
        </div>
      </LayoutWithSidebar>
    );
  }

  return (
    <LayoutWithSidebar>
      {/* Main Dashboard Content */}
      <>
          {/* CSS Animations */}
          <style>{`
        @keyframes modalSlideIn {
          from {
            opacity: 0;
            transform: scale(0.9) translateY(-20px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        
        @keyframes successPulse {
          0% {
            transform: scale(0.8);
            opacity: 0;
          }
          50% {
            transform: scale(1.1);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
        
        @keyframes checkmarkDraw {
          0% {
            stroke-dasharray: 0 24;
            stroke-dashoffset: 24;
          }
          100% {
            stroke-dasharray: 24 24;
            stroke-dashoffset: 0;
          }
        }
        
        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
      `}</style>
      
      <div style={{ 
        padding: '2rem',
        background: '#f8fafc',
        minHeight: '100vh',
        position: 'relative'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ 
              fontSize: '2rem', 
              fontWeight: 'bold', 
              color: '#1a202c', 
              marginBottom: '0.5rem',
              textShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
              Team Leader Dashboard
            </h1>
            <p style={{ 
              color: '#4a5568', 
              marginBottom: '0.25rem',
              textShadow: '0 1px 2px rgba(0,0,0,0.05)'
            }}>
              Welcome back, {user?.firstName}!
            </p>
            <p style={{ 
              fontSize: '0.875rem', 
              color: '#718096',
              textShadow: '0 1px 2px rgba(0,0,0,0.05)'
            }}>
              Team: {dashboardData.teamOverview.teamName}
            </p>
            <p style={{ 
              fontSize: '0.75rem', 
              color: '#a0aec0',
              textShadow: '0 1px 2px rgba(0,0,0,0.05)'
            }}>
              Last updated: {lastFetchTime ? new Date(lastFetchTime).toLocaleTimeString() : 'Never'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              onClick={() => fetchDashboardData(true)}
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.8)',
                backdropFilter: 'blur(10px)',
                color: '#1a202c',
                padding: '0.5rem 1rem',
                borderRadius: '0.5rem',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                transition: 'all 0.2s ease-in-out'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
              }}
            >
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Refresh</span>
            </button>
            <button
              onClick={() => setShowCreateUser(true)}
              style={{
                backgroundColor: 'rgba(37, 99, 235, 0.8)',
                backdropFilter: 'blur(10px)',
                color: 'white',
                padding: '0.5rem 1rem',
                borderRadius: '0.5rem',
                border: '1px solid rgba(37, 99, 235, 0.3)',
                cursor: 'pointer',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                transition: 'all 0.2s ease-in-out'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(37, 99, 235, 0.9)';
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(37, 99, 235, 0.8)';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
              }}
            >
              Create New User
            </button>
        </div>
      </div>

      {/* Team Management Section */}
      {teamData && (
        <div style={{ 
          backgroundColor: 'white', 
          padding: '1.5rem', 
          borderRadius: '0.5rem', 
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)', 
          marginBottom: '2rem' 
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1f2937' }}>
              Team Management
            </h3>
            <button
              onClick={() => setShowCreateTeam(true)}
              style={{
                backgroundColor: '#16a34a',
                color: 'white',
                padding: '0.5rem 1rem',
                borderRadius: '0.375rem',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              Create New Team
            </button>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div style={{ padding: '1rem', backgroundColor: '#f9fafb', borderRadius: '0.5rem' }}>
              <h4 style={{ fontSize: '0.875rem', fontWeight: '500', color: '#6b7280', marginBottom: '0.5rem' }}>
                Current Team
              </h4>
              <p style={{ fontSize: '1.125rem', fontWeight: '600', color: '#1f2937' }}>
                {teamData.currentTeam || 'Not Set'}
              </p>
            </div>
            
            <div style={{ padding: '1rem', backgroundColor: '#f9fafb', borderRadius: '0.5rem' }}>
              <h4 style={{ fontSize: '0.875rem', fontWeight: '500', color: '#6b7280', marginBottom: '0.5rem' }}>
                Default Team
              </h4>
              <p style={{ fontSize: '1.125rem', fontWeight: '600', color: '#1f2937' }}>
                {teamData.defaultTeam || 'Not Set'}
              </p>
            </div>
            
            <div style={{ padding: '1rem', backgroundColor: '#f9fafb', borderRadius: '0.5rem' }}>
              <h4 style={{ fontSize: '0.875rem', fontWeight: '500', color: '#6b7280', marginBottom: '0.5rem' }}>
                Managed Teams
              </h4>
              <p style={{ fontSize: '1.125rem', fontWeight: '600', color: '#1f2937' }}>
                {teamData.managedTeams.length}
              </p>
            </div>
          </div>
          
          {teamData.managedTeams.length > 0 && (
            <div style={{ marginTop: '1rem' }}>
              <h4 style={{ fontSize: '0.875rem', fontWeight: '500', color: '#6b7280', marginBottom: '0.5rem' }}>
                Your Teams
              </h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {teamData.managedTeams.map((team, index) => (
                  <div key={index} style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.5rem',
                    padding: '0.5rem 0.75rem',
                    backgroundColor: team === teamData.defaultTeam ? '#dbeafe' : '#f3f4f6',
                    borderRadius: '0.375rem',
                    border: team === teamData.defaultTeam ? '1px solid #3b82f6' : '1px solid #d1d5db'
                  }}>
                    <span style={{ 
                      fontSize: '0.875rem', 
                      fontWeight: '500',
                      color: team === teamData.defaultTeam ? '#1e40af' : '#374151'
                    }}>
                      {team}
                    </span>
                    {team === teamData.defaultTeam && teamData.defaultTeam && (
                      <span style={{ 
                        fontSize: '0.75rem', 
                        fontWeight: '600',
                        backgroundColor: '#3b82f6',
                        color: 'white',
                        padding: '0.125rem 0.375rem',
                        borderRadius: '0.25rem'
                      }}>
                        DEFAULT
                      </span>
                    )}
                    {team !== teamData.defaultTeam && (
                      <button
                        onClick={() => handleSetDefaultTeam(team)}
                        style={{
                          fontSize: '0.75rem',
                          color: '#6b7280',
                          backgroundColor: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          textDecoration: 'underline'
                        }}
                      >
                        Set Default
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Overview Cards */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
        gap: '1.5rem', 
        marginBottom: '2rem',
        position: 'relative',
        zIndex: 1
      }}>
        <div style={{ 
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(59, 130, 246, 0.05) 100%)',
          backdropFilter: 'blur(10px)',
          padding: '1.5rem', 
          borderRadius: '1rem', 
          border: '1px solid rgba(59, 130, 246, 0.1)',
          boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
          transition: 'all 0.3s ease-in-out',
          cursor: 'pointer',
          position: 'relative',
          overflow: 'hidden'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 12px 40px 0 rgba(31, 38, 135, 0.5)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 8px 32px 0 rgba(31, 38, 135, 0.37)';
        }}>
          {/* Icon */}
          <div style={{
            position: 'absolute',
            top: '1rem',
            left: '1rem',
            width: '48px',
            height: '48px',
            backgroundColor: '#3b82f6',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
          }}>
            <svg width="24" height="24" fill="white" viewBox="0 0 24 24">
              <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
            </svg>
          </div>

          {/* Progress Indicator */}
          <div style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end'
          }}>
            <div style={{
              width: '40px',
              height: '4px',
              backgroundColor: 'rgba(59, 130, 246, 0.2)',
              borderRadius: '2px',
              marginBottom: '4px'
            }}>
              <div style={{
                width: '30%',
                height: '100%',
                backgroundColor: '#3b82f6',
                borderRadius: '2px'
              }}></div>
            </div>
            <span style={{
              fontSize: '0.75rem',
              fontWeight: '600',
              color: '#3b82f6'
            }}>7%</span>
          </div>

          {/* Content */}
          <div style={{ marginTop: '2rem' }}>
            <p style={{ 
              fontSize: '2.5rem', 
              fontWeight: 'bold', 
              color: '#1a202c',
              margin: '0 0 0.5rem 0',
              textShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
            {dashboardData.teamOverview.totalMembers}
          </p>
            <h3 style={{ 
              fontSize: '1rem', 
              fontWeight: '600', 
              color: '#1a202c', 
              margin: '0 0 0.25rem 0',
              textShadow: '0 1px 2px rgba(0,0,0,0.1)'
            }}>
              Team Members
            </h3>
            <p style={{ 
              fontSize: '0.875rem', 
              color: '#6b7280',
              margin: '0',
              textShadow: '0 1px 2px rgba(0,0,0,0.05)'
            }}>
            {dashboardData.teamOverview.activeMembers} active today
          </p>
          </div>
        </div>

        <div style={{ 
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(234, 88, 12, 0.05) 100%)',
          backdropFilter: 'blur(10px)',
          padding: '1.5rem', 
          borderRadius: '1rem', 
          border: '1px solid rgba(234, 88, 12, 0.1)',
          boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
          transition: 'all 0.3s ease-in-out',
          cursor: 'pointer',
          position: 'relative',
          overflow: 'hidden'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 12px 40px 0 rgba(31, 38, 135, 0.5)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 8px 32px 0 rgba(31, 38, 135, 0.37)';
        }}>
          {/* Icon */}
          <div style={{
            position: 'absolute',
            top: '1rem',
            left: '1rem',
            width: '48px',
            height: '48px',
            backgroundColor: '#ea580c',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(234, 88, 12, 0.3)'
          }}>
            <svg width="24" height="24" fill="white" viewBox="0 0 24 24">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>

          {/* Progress Indicator */}
          <div style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end'
          }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              border: '3px solid rgba(234, 88, 12, 0.2)',
              borderTop: '3px solid #ea580c',
              transform: 'rotate(-90deg)',
              marginBottom: '4px'
            }}></div>
            <span style={{
              fontSize: '0.75rem',
              fontWeight: '600',
              color: '#ea580c'
            }}>0%</span>
          </div>

          {/* Content */}
          <div style={{ marginTop: '2rem' }}>
            <p style={{ 
              fontSize: '2.5rem', 
              fontWeight: 'bold', 
              color: '#1a202c',
              margin: '0 0 0.5rem 0',
              textShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
            {dashboardData.safetyMetrics.activeCases}
          </p>
            <h3 style={{ 
              fontSize: '1rem', 
              fontWeight: '600', 
              color: '#1a202c', 
              margin: '0 0 0.25rem 0',
              textShadow: '0 1px 2px rgba(0,0,0,0.1)'
            }}>
              Active Cases
            </h3>
            <p style={{ 
              fontSize: '0.875rem', 
              color: '#6b7280',
              margin: '0',
              textShadow: '0 1px 2px rgba(0,0,0,0.05)'
            }}>
            Currently being managed
          </p>
          </div>
        </div>

        <div style={{ 
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(22, 163, 74, 0.05) 100%)',
          backdropFilter: 'blur(10px)',
          padding: '1.5rem', 
          borderRadius: '1rem', 
          border: '1px solid rgba(22, 163, 74, 0.1)',
          boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
          transition: 'all 0.3s ease-in-out',
          cursor: 'pointer',
          position: 'relative',
          overflow: 'hidden'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 12px 40px 0 rgba(31, 38, 135, 0.5)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 8px 32px 0 rgba(31, 38, 135, 0.37)';
        }}>
          {/* Icon */}
          <div style={{
            position: 'absolute',
            top: '1rem',
            left: '1rem',
            width: '48px',
            height: '48px',
            backgroundColor: '#16a34a',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(22, 163, 74, 0.3)'
          }}>
            <svg width="24" height="24" fill="white" viewBox="0 0 24 24">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>

          {/* Progress Indicator */}
          <div style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end'
          }}>
            <div style={{
              width: '40px',
              height: '4px',
              backgroundColor: 'rgba(22, 163, 74, 0.2)',
              borderRadius: '2px',
              marginBottom: '4px'
            }}>
              <div style={{
                width: `${dashboardData.complianceMetrics.todayCompletionRate}%`,
                height: '100%',
                backgroundColor: '#16a34a',
                borderRadius: '2px'
              }}></div>
            </div>
            <span style={{
              fontSize: '0.75rem',
              fontWeight: '600',
              color: '#16a34a'
            }}>{dashboardData.complianceMetrics.todayCompletionRate}%</span>
          </div>

          {/* Content */}
          <div style={{ marginTop: '2rem' }}>
            <p style={{ 
              fontSize: '2.5rem', 
              fontWeight: 'bold', 
              color: '#1a202c',
              margin: '0 0 0.5rem 0',
              textShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
            {dashboardData.complianceMetrics.todayCheckIns}
          </p>
            <h3 style={{ 
              fontSize: '1rem', 
              fontWeight: '600', 
              color: '#1a202c', 
              margin: '0 0 0.25rem 0',
              textShadow: '0 1px 2px rgba(0,0,0,0.1)'
            }}>
              Today's Check-ins
            </h3>
            <p style={{ 
              fontSize: '0.875rem', 
              color: '#6b7280',
              margin: '0',
              textShadow: '0 1px 2px rgba(0,0,0,0.05)'
            }}>
            {dashboardData.complianceMetrics.todayCompletionRate}% completion rate
          </p>
          </div>
        </div>

        <div style={{ 
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(220, 38, 38, 0.05) 100%)',
          backdropFilter: 'blur(10px)',
          padding: '1.5rem', 
          borderRadius: '1rem', 
          border: '1px solid rgba(220, 38, 38, 0.1)',
          boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
          transition: 'all 0.3s ease-in-out',
          cursor: 'pointer',
          position: 'relative',
          overflow: 'hidden'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 12px 40px 0 rgba(31, 38, 135, 0.5)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 8px 32px 0 rgba(31, 38, 135, 0.37)';
        }}>
          {/* Icon */}
          <div style={{
            position: 'absolute',
            top: '1rem',
            left: '1rem',
            width: '48px',
            height: '48px',
            backgroundColor: '#dc2626',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)'
          }}>
            <svg width="24" height="24" fill="white" viewBox="0 0 24 24">
              <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
            </svg>
          </div>

          {/* Progress Indicator */}
          <div style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end'
          }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              border: '3px solid rgba(220, 38, 38, 0.2)',
              borderTop: '3px solid #dc2626',
              transform: 'rotate(-90deg)',
              marginBottom: '4px'
            }}></div>
            <span style={{
              fontSize: '0.75rem',
              fontWeight: '600',
              color: '#dc2626'
            }}>0%</span>
          </div>

          {/* Content */}
          <div style={{ marginTop: '2rem' }}>
            <p style={{ 
              fontSize: '2.5rem', 
              fontWeight: 'bold', 
              color: '#1a202c',
              margin: '0 0 0.5rem 0',
              textShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
              {dashboardData.safetyMetrics.monthlyIncidents}
            </p>
            <h3 style={{ 
              fontSize: '1rem', 
              fontWeight: '600', 
              color: '#1a202c', 
              margin: '0 0 0.25rem 0',
              textShadow: '0 1px 2px rgba(0,0,0,0.1)'
            }}>
              Monthly Incidents
            </h3>
            <p style={{ 
              fontSize: '0.875rem', 
              color: '#6b7280',
              margin: '0',
              textShadow: '0 1px 2px rgba(0,0,0,0.05)'
            }}>
              Trend: {dashboardData.safetyMetrics.incidentTrend}
            </p>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', 
        gap: '2rem', 
        marginBottom: '2rem',
        position: 'relative',
        zIndex: 1
      }}>
        <div style={{ 
          background: 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(10px)',
          padding: '1.5rem', 
          borderRadius: '1rem', 
          border: '1px solid rgba(255, 255, 255, 0.2)',
          boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
          transition: 'all 0.3s ease-in-out'
        }}>
          <h3 style={{ 
            fontSize: '1.25rem', 
            fontWeight: '600', 
            color: '#1a202c', 
            marginBottom: '1rem',
            textShadow: '0 1px 2px rgba(0,0,0,0.1)'
          }}>
            Recent Activity
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div>
              <h4 style={{ fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>Active Cases</h4>
              {dashboardData.activeCases && dashboardData.activeCases.length > 0 ? (
                dashboardData.activeCases.map((case_: any, index: number) => (
                  <div key={index} style={{ 
                    fontSize: '0.875rem', 
                    color: '#6b7280', 
                    padding: '0.5rem', 
                    backgroundColor: '#f9fafb', 
                    borderRadius: '0.25rem',
                    marginBottom: '0.25rem'
                  }}>
                    Case #{case_.caseNumber} - {case_.workerName}
                  </div>
                ))
              ) : (
                <div style={{ fontSize: '0.875rem', color: '#9ca3af', fontStyle: 'italic' }}>
                  No active cases
                </div>
              )}
            </div>
            
            <div>
              <h4 style={{ fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>Today's Check-ins</h4>
              {dashboardData.todaysCheckIns && dashboardData.todaysCheckIns.length > 0 ? (
                dashboardData.todaysCheckIns.map((checkIn: any, index: number) => (
                  <div key={index} style={{ 
                    fontSize: '0.875rem', 
                    color: '#6b7280', 
                    padding: '0.5rem', 
                    backgroundColor: '#f9fafb', 
                    borderRadius: '0.25rem',
                    marginBottom: '0.25rem'
                  }}>
                    {checkIn.workerName} - {checkIn.type}
                  </div>
                ))
              ) : (
                <div style={{ fontSize: '0.875rem', color: '#9ca3af', fontStyle: 'italic' }}>
                  No check-ins today
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Team Members - Modern Card Layout */}
      <div style={{ 
        background: 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(10px)',
        borderRadius: '1rem', 
        border: '1px solid rgba(255, 255, 255, 0.2)',
        boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
        transition: 'all 0.3s ease-in-out',
        position: 'relative',
        zIndex: 1
      }}>
        {/* Header with Search and Filter */}
        <div style={{ 
          padding: '1.5rem', 
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h3 style={{ 
              fontSize: '1.25rem', 
              fontWeight: '600', 
              color: '#1a202c',
              textShadow: '0 1px 2px rgba(0,0,0,0.1)',
              margin: '0 0 0.25rem 0'
            }}>
              Team Members
            </h3>
            <p style={{ 
              fontSize: '0.875rem', 
              color: '#6b7280',
              margin: '0'
            }}>
              Your Team Members Overview
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {/* Search Button */}
            <button style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              border: 'none',
              backgroundColor: '#f3f4f6',
              color: '#6b7280',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#e5e7eb';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#f3f4f6';
            }}>
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
            {/* Filter Button */}
            <button style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              border: 'none',
              backgroundColor: '#f3f4f6',
              color: '#6b7280',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#e5e7eb';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#f3f4f6';
            }}>
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Team Members Cards */}
        <div style={{ padding: '1.5rem' }}>
          {teamMembersLoading ? (
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              padding: '3rem 2rem' 
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                border: '4px solid #f3f4f6',
                borderTop: '4px solid #3b82f6',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }}></div>
              <span style={{ 
                marginLeft: '1rem', 
                fontSize: '0.875rem', 
                color: '#6b7280' 
              }}>
                Loading team members...
              </span>
            </div>
          ) : teamMembers.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {teamMembers.map((member, index) => (
                <div 
                  key={member._id} 
                  style={{ 
                    display: 'flex',
                    alignItems: 'center',
                    padding: '1rem',
                    backgroundColor: index === 0 ? '#f9fafb' : 'transparent',
                    borderRadius: '0.75rem',
                    transition: 'all 0.2s ease',
                    cursor: 'pointer',
                    border: '1px solid transparent'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f9fafb';
                    e.currentTarget.style.borderColor = '#e5e7eb';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = index === 0 ? '#f9fafb' : 'transparent';
                    e.currentTarget.style.borderColor = 'transparent';
                  }}
                >
                  {/* Profile Picture */}
                  {member.profileImage ? (
                    <img
                      {...createImageProps(member.profileImage)}
                      alt={`${member.firstName} ${member.lastName}`}
                      style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '50%',
                        marginRight: '1rem',
                        objectFit: 'cover',
                        border: `2px solid ${member.loggedInToday ? '#10b981' : '#ef4444'}`
                      }}
                    />
                  ) : (
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      backgroundColor: '#e5e7eb',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: '1rem',
                      fontSize: '1.25rem',
                      fontWeight: '600',
                      background: `linear-gradient(135deg, ${
                        member.loggedInToday ? '#10b981' : '#ef4444'
                      } 0%, ${
                        member.loggedInToday ? '#059669' : '#dc2626'
                      } 100%)`,
                      color: 'white'
                    }}>
                      {member.firstName.charAt(0)}{member.lastName.charAt(0)}
                    </div>
                  )}

                  {/* Member Info */}
                  <div style={{ flex: 1 }}>
                    <div style={{ 
                      fontSize: '0.875rem', 
                      fontWeight: '600', 
                      color: '#111827',
                      marginBottom: '0.25rem'
                    }}>
                      {member.firstName} {member.lastName}
                    </div>
                    <div style={{ 
                      fontSize: '0.75rem', 
                      color: '#6b7280',
                      marginBottom: '0.25rem'
                    }}>
                      {member.email}
                    </div>
                    <div style={{ 
                      fontSize: '0.75rem', 
                      color: member.loggedInToday ? '#059669' : '#dc2626',
                      fontWeight: member.loggedInToday ? '500' : '600'
                    }}>
                      {member.loggedInToday 
                        ? `Last login: ${member.lastLogin ? new Date(member.lastLogin).toLocaleDateString() : 'Today'}`
                        : 'Not logged in today'
                      }
                    </div>
                  </div>

                  {/* Status and Role */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {/* Role Badge */}
                    <span style={{ 
                      padding: '0.25rem 0.5rem', 
                      display: 'inline-flex', 
                      fontSize: '0.75rem', 
                      fontWeight: '500', 
                      borderRadius: '0.375rem', 
                      backgroundColor: '#dbeafe', 
                      color: '#1e40af' 
                    }}>
                      {member.role}
                    </span>

                    {/* Status Indicator */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: member.loggedInToday ? '#10b981' : '#ef4444'
                      }}></div>
                      <span style={{ 
                        fontSize: '0.75rem', 
                        fontWeight: '500',
                        color: member.loggedInToday ? '#059669' : '#dc2626'
                      }}>
                        {member.loggedInToday ? 'Active Today' : 'Not Active Today'}
                      </span>
                    </div>

                    {/* Options Button */}
                    <button style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      border: 'none',
                      backgroundColor: 'transparent',
                      color: '#6b7280',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#f3f4f6';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}>
                      <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ 
              textAlign: 'center', 
              padding: '3rem 2rem', 
              color: '#9ca3af' 
            }}>
              <svg width="48" height="48" fill="currentColor" viewBox="0 0 24 24" style={{ marginBottom: '1rem', opacity: 0.5 }}>
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
              </svg>
              <p style={{ fontSize: '1rem', fontWeight: '500', margin: '0 0 0.5rem 0' }}>
                No Team Members Found
              </p>
              <p style={{ fontSize: '0.875rem', margin: '0' }}>
                Start by creating your first team member
              </p>
            </div>
          )}
        </div>

        {/* Pagination Controls */}
        {teamMembers.length > 0 && teamMembersTotal > teamMembersPageSize && (
          <div style={{ 
            padding: '1rem 1.5rem',
            borderTop: '1px solid #e5e7eb',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: '#f9fafb'
          }}>
            {/* Items per page selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Show:</span>
              <select 
                value={teamMembersPageSize}
                onChange={(e) => {
                  setTeamMembersPageSize(Number(e.target.value));
                  setTeamMembersPage(1); // Reset to first page when changing page size
                }}
                style={{
                  padding: '0.25rem 0.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  backgroundColor: 'white',
                  color: '#374151'
                }}
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
              <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                of {teamMembersTotal} members
              </span>
            </div>

            {/* Pagination buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {/* Previous button */}
              <button
                onClick={() => setTeamMembersPage(Math.max(1, teamMembersPage - 1))}
                disabled={teamMembersPage === 1}
                style={{
                  padding: '0.5rem 0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  backgroundColor: teamMembersPage === 1 ? '#f9fafb' : 'white',
                  color: teamMembersPage === 1 ? '#9ca3af' : '#374151',
                  fontSize: '0.875rem',
                  cursor: teamMembersPage === 1 ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  if (teamMembersPage !== 1) {
                    e.currentTarget.style.backgroundColor = '#f3f4f6';
                  }
                }}
                onMouseLeave={(e) => {
                  if (teamMembersPage !== 1) {
                    e.currentTarget.style.backgroundColor = 'white';
                  }
                }}
              >
                Previous
              </button>

              {/* Page numbers */}
              <div style={{ display: 'flex', gap: '0.25rem' }}>
                {(() => {
                  const totalPages = Math.ceil(teamMembersTotal / teamMembersPageSize);
                  const pages = [];
                  
                  // Show first page
                  if (totalPages > 0) {
                    pages.push(
                      <button
                        key={1}
                        onClick={() => setTeamMembersPage(1)}
                        style={{
                          width: '32px',
                          height: '32px',
                          border: '1px solid #d1d5db',
                          borderRadius: '0.375rem',
                          backgroundColor: teamMembersPage === 1 ? '#3b82f6' : 'white',
                          color: teamMembersPage === 1 ? 'white' : '#374151',
                          fontSize: '0.875rem',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          if (teamMembersPage !== 1) {
                            e.currentTarget.style.backgroundColor = '#f3f4f6';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (teamMembersPage !== 1) {
                            e.currentTarget.style.backgroundColor = 'white';
                          }
                        }}
                      >
                        1
                      </button>
                    );
                  }

                  // Show ellipsis if needed
                  if (teamMembersPage > 3) {
                    pages.push(
                      <span key="ellipsis1" style={{ padding: '0.5rem', color: '#6b7280' }}>
                        ...
                      </span>
                    );
                  }

                  // Show current page and surrounding pages
                  for (let i = Math.max(2, teamMembersPage - 1); i <= Math.min(totalPages - 1, teamMembersPage + 1); i++) {
                    if (i !== 1 && i !== totalPages) {
                      pages.push(
                        <button
                          key={i}
                          onClick={() => setTeamMembersPage(i)}
                          style={{
                            width: '32px',
                            height: '32px',
                            border: '1px solid #d1d5db',
                            borderRadius: '0.375rem',
                            backgroundColor: teamMembersPage === i ? '#3b82f6' : 'white',
                            color: teamMembersPage === i ? 'white' : '#374151',
                            fontSize: '0.875rem',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseEnter={(e) => {
                            if (teamMembersPage !== i) {
                              e.currentTarget.style.backgroundColor = '#f3f4f6';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (teamMembersPage !== i) {
                              e.currentTarget.style.backgroundColor = 'white';
                            }
                          }}
                        >
                          {i}
                        </button>
                      );
                    }
                  }

                  // Show ellipsis if needed
                  if (teamMembersPage < totalPages - 2) {
                    pages.push(
                      <span key="ellipsis2" style={{ padding: '0.5rem', color: '#6b7280' }}>
                        ...
                      </span>
                    );
                  }

                  // Show last page
                  if (totalPages > 1) {
                    pages.push(
                      <button
                        key={totalPages}
                        onClick={() => setTeamMembersPage(totalPages)}
                        style={{
                          width: '32px',
                          height: '32px',
                          border: '1px solid #d1d5db',
                          borderRadius: '0.375rem',
                          backgroundColor: teamMembersPage === totalPages ? '#3b82f6' : 'white',
                          color: teamMembersPage === totalPages ? 'white' : '#374151',
                          fontSize: '0.875rem',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          if (teamMembersPage !== totalPages) {
                            e.currentTarget.style.backgroundColor = '#f3f4f6';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (teamMembersPage !== totalPages) {
                            e.currentTarget.style.backgroundColor = 'white';
                          }
                        }}
                      >
                        {totalPages}
                      </button>
                    );
                  }

                  return pages;
                })()}
              </div>

              {/* Next button */}
              <button
                onClick={() => setTeamMembersPage(Math.min(Math.ceil(teamMembersTotal / teamMembersPageSize), teamMembersPage + 1))}
                disabled={teamMembersPage >= Math.ceil(teamMembersTotal / teamMembersPageSize)}
                style={{
                  padding: '0.5rem 0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  backgroundColor: teamMembersPage >= Math.ceil(teamMembersTotal / teamMembersPageSize) ? '#f9fafb' : 'white',
                  color: teamMembersPage >= Math.ceil(teamMembersTotal / teamMembersPageSize) ? '#9ca3af' : '#374151',
                  fontSize: '0.875rem',
                  cursor: teamMembersPage >= Math.ceil(teamMembersTotal / teamMembersPageSize) ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  if (teamMembersPage < Math.ceil(teamMembersTotal / teamMembersPageSize)) {
                    e.currentTarget.style.backgroundColor = '#f3f4f6';
                  }
                }}
                onMouseLeave={(e) => {
                  if (teamMembersPage < Math.ceil(teamMembersTotal / teamMembersPageSize)) {
                    e.currentTarget.style.backgroundColor = 'white';
                  }
                }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

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
                  onChange={(e) => setCreateUserForm({ ...createUserForm, email: e.target.value })}
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
                  Password *
                </label>
                <input
                  type="password"
                  value={createUserForm.password}
                  onChange={(e) => setCreateUserForm({ ...createUserForm, password: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.375rem',
                    outline: 'none',
                    fontSize: '0.875rem'
                  }}
                  required
                  minLength={12}
                />
                <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.25rem' }}>Minimum 12 characters</p>
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
                  <option value="">Use Default Team ({teamData?.defaultTeam || teamData?.managedTeams?.[0] || 'None'})</option>
                  {teamData?.managedTeams.map((team, index) => (
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
              Create New Team
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
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.375rem',
                    outline: 'none',
                    fontSize: '0.875rem'
                  }}
                  placeholder="Enter team name"
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', paddingTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateTeam(false)}
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
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '1rem',
            padding: '2rem',
            maxWidth: '500px',
            width: '90%',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            textAlign: 'center',
            animation: 'modalSlideIn 0.3s ease-out'
          }}>
            {/* Success Icon */}
            <div style={{
              width: '80px',
              height: '80px',
              backgroundColor: '#10b981',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem',
              animation: 'successPulse 0.6s ease-out'
            }}>
              <svg 
                width="40" 
                height="40" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="white" 
                strokeWidth="3"
                style={{ animation: 'checkmarkDraw 0.8s ease-out 0.3s both' }}
              >
                <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>

            {/* Success Title */}
            <h2 style={{
              fontSize: '1.5rem',
              fontWeight: 'bold',
              color: '#111827',
              marginBottom: '0.5rem'
            }}>
              🎉 Worker Created Successfully!
            </h2>

            {/* Success Message */}
            <p style={{
              fontSize: '1rem',
              color: '#6b7280',
              marginBottom: '1.5rem',
              lineHeight: '1.5'
            }}>
              The new worker account has been created and added to your team.
            </p>

            {/* User Details Card */}
            <div style={{
              backgroundColor: '#f8fafc',
              borderRadius: '0.75rem',
              padding: '1.5rem',
              marginBottom: '1.5rem',
              border: '1px solid #e2e8f0'
            }}>
              <h3 style={{
                fontSize: '1.125rem',
                fontWeight: '600',
                color: '#1e293b',
                marginBottom: '1rem'
              }}>
                Account Details
              </h3>
              
              <div style={{ textAlign: 'left' }}>
                <div style={{ marginBottom: '0.75rem' }}>
                  <span style={{ fontWeight: '500', color: '#374151' }}>Name:</span>
                  <span style={{ marginLeft: '0.5rem', color: '#6b7280' }}>
                    {createdUser.firstName} {createdUser.lastName}
                  </span>
                </div>
                
                <div style={{ marginBottom: '0.75rem' }}>
                  <span style={{ fontWeight: '500', color: '#374151' }}>Email:</span>
                  <span style={{ marginLeft: '0.5rem', color: '#6b7280' }}>
                    {createdUser.email}
                  </span>
                </div>
                
                <div style={{ marginBottom: '0.75rem' }}>
                  <span style={{ fontWeight: '500', color: '#374151' }}>Role:</span>
                  <span style={{ 
                    marginLeft: '0.5rem', 
                    backgroundColor: '#dbeafe',
                    color: '#1e40af',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    fontWeight: '500'
                  }}>
                    Worker
                  </span>
                </div>
                
                <div>
                  <span style={{ fontWeight: '500', color: '#374151' }}>Team:</span>
                  <span style={{ 
                    marginLeft: '0.5rem', 
                    backgroundColor: '#dcfce7',
                    color: '#166534',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    fontWeight: '500'
                  }}>
                    {createdUser.team}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button
                onClick={() => {
                  setShowSuccessModal(false);
                  setCreatedUser(null);
                }}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.5rem',
                  fontSize: '1rem',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#059669';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 6px 8px -1px rgba(0, 0, 0, 0.15)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = '#10b981';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
                }}
              >
                ✨ Great! Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recent Activity, Active Cases, Today's Check-ins Section */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', 
        gap: '1.5rem', 
        marginTop: '2rem' 
      }}>
        {/* Recent Activity */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '0.75rem',
          padding: '1.5rem',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{
              width: '2rem',
              height: '2rem',
              backgroundColor: '#3b82f6',
              borderRadius: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: '0.75rem'
            }}>
              <svg width="16" height="16" fill="white" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
            </div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#1f2937', margin: 0 }}>
              Recent Activity
            </h3>
          </div>
          
          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {paginatedRecentActivity.items.length > 0 ? (
              <>
                {paginatedRecentActivity.items.map((activity: any, index: number) => (
                  <div key={index} style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    padding: '0.75rem 0',
                    borderBottom: index < paginatedRecentActivity.items.length - 1 ? '1px solid #f3f4f6' : 'none'
                  }}>
                    <div style={{
                      width: '0.5rem',
                      height: '0.5rem',
                      backgroundColor: '#10b981',
                      borderRadius: '50%',
                      marginTop: '0.5rem',
                      marginRight: '0.75rem',
                      flexShrink: 0
                    }} />
                    <div style={{ flex: 1 }}>
                      <p style={{ 
                        fontSize: '0.875rem', 
                        color: '#374151', 
                        margin: '0 0 0.25rem 0',
                        lineHeight: '1.4'
                      }}>
                        {activity.description}
                      </p>
                      <p style={{ 
                        fontSize: '0.75rem', 
                        color: '#9ca3af', 
                        margin: 0 
                      }}>
                        {new Date(activity.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
                
                {/* Pagination Controls */}
                {paginatedRecentActivity.totalPages > 1 && (
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '1rem 0',
                    borderTop: '1px solid #f3f4f6',
                    marginTop: '0.5rem'
                  }}>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                      Showing {((recentActivityPage - 1) * recentActivityPageSize) + 1} to {Math.min(recentActivityPage * recentActivityPageSize, paginatedRecentActivity.totalItems)} of {paginatedRecentActivity.totalItems} activities
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => setRecentActivityPage(prev => Math.max(1, prev - 1))}
                        disabled={recentActivityPage === 1}
                        style={{
                          padding: '0.25rem 0.5rem',
                          fontSize: '0.75rem',
                          border: '1px solid #d1d5db',
                          borderRadius: '0.25rem',
                          backgroundColor: recentActivityPage === 1 ? '#f9fafb' : 'white',
                          color: recentActivityPage === 1 ? '#9ca3af' : '#374151',
                          cursor: recentActivityPage === 1 ? 'not-allowed' : 'pointer'
                        }}
                      >
                        Previous
                      </button>
                      <span style={{ 
                        padding: '0.25rem 0.5rem', 
                        fontSize: '0.75rem', 
                        color: '#6b7280',
                        display: 'flex',
                        alignItems: 'center'
                      }}>
                        {recentActivityPage} of {paginatedRecentActivity.totalPages}
                      </span>
                      <button
                        onClick={() => setRecentActivityPage(prev => Math.min(paginatedRecentActivity.totalPages, prev + 1))}
                        disabled={recentActivityPage === paginatedRecentActivity.totalPages}
                        style={{
                          padding: '0.25rem 0.5rem',
                          fontSize: '0.75rem',
                          border: '1px solid #d1d5db',
                          borderRadius: '0.25rem',
                          backgroundColor: recentActivityPage === paginatedRecentActivity.totalPages ? '#f9fafb' : 'white',
                          color: recentActivityPage === paginatedRecentActivity.totalPages ? '#9ca3af' : '#374151',
                          cursor: recentActivityPage === paginatedRecentActivity.totalPages ? 'not-allowed' : 'pointer'
                        }}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>
                <svg width="48" height="48" fill="currentColor" viewBox="0 0 24 24" style={{ marginBottom: '1rem', opacity: 0.5 }}>
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
                <p style={{ margin: 0, fontSize: '0.875rem' }}>No recent activity</p>
              </div>
            )}
          </div>
        </div>

        {/* Active Cases */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '0.75rem',
          padding: '1.5rem',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{
              width: '2rem',
              height: '2rem',
              backgroundColor: '#ef4444',
              borderRadius: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: '0.75rem'
            }}>
              <svg width="16" height="16" fill="white" viewBox="0 0 24 24">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#1f2937', margin: 0 }}>
              Active Cases
            </h3>
          </div>
          
          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {dashboardData.activeCases && dashboardData.activeCases.length > 0 ? (
              dashboardData.activeCases.map((case_: any, index: number) => (
                <div key={index} style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  padding: '0.75rem 0',
                  borderBottom: index < dashboardData.activeCases.length - 1 ? '1px solid #f3f4f6' : 'none'
                }}>
                  <div style={{
                    width: '0.5rem',
                    height: '0.5rem',
                    backgroundColor: case_.priority === 'high' ? '#ef4444' : case_.priority === 'medium' ? '#f59e0b' : '#10b981',
                    borderRadius: '50%',
                    marginTop: '0.5rem',
                    marginRight: '0.75rem',
                    flexShrink: 0
                  }} />
                  <div style={{ flex: 1 }}>
                    <p style={{ 
                      fontSize: '0.875rem', 
                      color: '#374151', 
                      margin: '0 0 0.25rem 0',
                      fontWeight: '500'
                    }}>
                      {case_.caseNumber}
                    </p>
                    <p style={{ 
                      fontSize: '0.75rem', 
                      color: '#6b7280', 
                      margin: '0 0 0.25rem 0'
                    }}>
                      {case_.workerName}
                    </p>
                    <p style={{ 
                      fontSize: '0.75rem', 
                      color: '#9ca3af', 
                      margin: 0 
                    }}>
                      {case_.status} • {case_.daysOpen} days
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>
                <svg width="48" height="48" fill="currentColor" viewBox="0 0 24 24" style={{ marginBottom: '1rem', opacity: 0.5 }}>
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <p style={{ margin: 0, fontSize: '0.875rem' }}>No active cases</p>
              </div>
            )}
          </div>
        </div>

        {/* Today's Check-ins */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '0.75rem',
          padding: '1.5rem',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{
              width: '2rem',
              height: '2rem',
              backgroundColor: '#10b981',
              borderRadius: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: '0.75rem'
            }}>
              <svg width="16" height="16" fill="white" viewBox="0 0 24 24">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#1f2937', margin: 0 }}>
              Today's Check-ins
            </h3>
          </div>
          
          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {dashboardData.todaysCheckIns && dashboardData.todaysCheckIns.length > 0 ? (
              dashboardData.todaysCheckIns.map((checkIn: any, index: number) => (
                <div key={index} style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  padding: '0.75rem 0',
                  borderBottom: index < dashboardData.todaysCheckIns.length - 1 ? '1px solid #f3f4f6' : 'none'
                }}>
                  <div style={{
                    width: '0.5rem',
                    height: '0.5rem',
                    backgroundColor: checkIn.status === 'completed' ? '#10b981' : checkIn.status === 'partial' ? '#f59e0b' : '#ef4444',
                    borderRadius: '50%',
                    marginTop: '0.5rem',
                    marginRight: '0.75rem',
                    flexShrink: 0
                  }} />
                  <div style={{ flex: 1 }}>
                    <p style={{ 
                      fontSize: '0.875rem', 
                      color: '#374151', 
                      margin: '0 0 0.25rem 0',
                      fontWeight: '500'
                    }}>
                      {checkIn.workerName}
                    </p>
                    <p style={{ 
                      fontSize: '0.75rem', 
                      color: '#6b7280', 
                      margin: '0 0 0.25rem 0'
                    }}>
                      {checkIn.type}
                    </p>
                    <p style={{ 
                      fontSize: '0.75rem', 
                      color: '#9ca3af', 
                      margin: 0 
                    }}>
                      {checkIn.status} • {new Date(checkIn.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>
                <svg width="48" height="48" fill="currentColor" viewBox="0 0 24 24" style={{ marginBottom: '1rem', opacity: 0.5 }}>
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <p style={{ margin: 0, fontSize: '0.875rem' }}>No check-ins today</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Work Readiness Activity Chart */}
      <div style={{ 
        marginTop: '2rem',
        backgroundColor: 'white',
        borderRadius: '0.75rem',
        padding: '1.5rem',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        border: '1px solid #e5e7eb'
      }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '1.5rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{
              width: '2rem',
              height: '2rem',
              backgroundColor: '#8b5cf6',
              borderRadius: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: '0.75rem'
            }}>
              <svg width="16" height="16" fill="white" viewBox="0 0 24 24">
                <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
              </svg>
            </div>
            <h3 style={{ 
              fontSize: '1.125rem', 
              fontWeight: '600', 
              color: '#1f2937', 
              margin: 0 
            }}>
              Work Readiness Activity
            </h3>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {/* Legend */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                backgroundColor: '#9333ea'
              }}></div>
              <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Not Fit for Work</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                backgroundColor: '#3b82f6'
              }}></div>
              <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Minor Concerns Fit for Work</span>
            </div>
            
            {/* Time Filter Dropdown */}
            <select 
              value={readinessDateRange}
              onChange={(e) => setReadinessDateRange(e.target.value as 'week' | 'month' | 'year' | 'custom')}
              disabled={readinessChartLoading}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '0.5rem',
                border: '1px solid #d1d5db',
                backgroundColor: readinessChartLoading ? '#f9fafb' : 'white',
                fontSize: '0.875rem',
                color: readinessChartLoading ? '#9ca3af' : '#374151',
                cursor: readinessChartLoading ? 'not-allowed' : 'pointer',
                opacity: readinessChartLoading ? 0.7 : 1
              }}
            >
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="year">This Year</option>
              <option value="custom">Custom Range</option>
            </select>
            
            {/* Custom Date Range Inputs */}
            {readinessDateRange === 'custom' && (
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input
                  type="date"
                  value={readinessStartDate.toISOString().split('T')[0]}
                  onChange={(e) => setReadinessStartDate(new Date(e.target.value))}
                  style={{
                    padding: '0.5rem',
                    borderRadius: '0.375rem',
                    border: '1px solid #d1d5db',
                    fontSize: '0.875rem',
                    backgroundColor: 'white'
                  }}
                />
                <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>to</span>
                <input
                  type="date"
                  value={readinessEndDate.toISOString().split('T')[0]}
                  onChange={(e) => setReadinessEndDate(new Date(e.target.value))}
                  style={{
                    padding: '0.5rem',
                    borderRadius: '0.375rem',
                    border: '1px solid #d1d5db',
                    fontSize: '0.875rem',
                    backgroundColor: 'white'
                  }}
                />
              </div>
            )}
          </div>
        </div>
        
        <div style={{ height: '300px', position: 'relative' }}>
          {readinessChartLoading ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: '#6b7280'
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                border: '3px solid #e5e7eb',
                borderTop: '3px solid #3b82f6',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                marginBottom: '1rem'
              }}></div>
              <p style={{ fontSize: '0.875rem', margin: '0' }}>
                Loading chart data...
              </p>
            </div>
          ) : analyticsData?.analytics?.readinessTrendData && 
             Array.isArray(analyticsData.analytics.readinessTrendData) && 
             analyticsData.analytics.readinessTrendData.length > 0 ? (
            <Line
              data={{
                labels: analyticsData.analytics.readinessTrendData.map(item => 
                  new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                ),
                datasets: [
                  {
                    label: 'Not Fit for Work',
                    data: analyticsData.analytics.readinessTrendData.map(item => item.notFitForWork),
                    borderColor: 'rgba(147, 51, 234, 1)',
                    backgroundColor: 'rgba(147, 51, 234, 0.1)',
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: 'rgba(147, 51, 234, 1)',
                    pointBorderColor: 'rgba(147, 51, 234, 1)',
                    pointRadius: 3,
                    pointHoverRadius: 6,
                    pointHoverBackgroundColor: 'rgba(147, 51, 234, 1)',
                    pointHoverBorderColor: 'rgba(147, 51, 234, 1)',
                    pointHoverBorderWidth: 2,
                    borderWidth: 2
                  },
                  {
                    label: 'Minor Concerns Fit for Work',
                    data: analyticsData.analytics.readinessTrendData.map(item => item.minorConcernsFitForWork),
                    borderColor: 'rgba(59, 130, 246, 1)',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: 'rgba(59, 130, 246, 1)',
                    pointBorderColor: 'rgba(59, 130, 246, 1)',
                    pointRadius: 3,
                    pointHoverRadius: 6,
                    pointHoverBackgroundColor: 'rgba(59, 130, 246, 1)',
                    pointHoverBorderColor: 'rgba(59, 130, 246, 1)',
                    pointHoverBorderWidth: 2,
                    borderWidth: 2
                  }
                ]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    display: false // We have custom legend above
                  },
                  tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: 'white',
                    bodyColor: 'white',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 1,
                    cornerRadius: 8,
                    displayColors: true,
                    callbacks: {
                      title: function(context) {
                        return new Date(context[0].label).toLocaleDateString('en-US', { 
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        });
                      },
                      label: function(context) {
                        return `${context.dataset.label}: ${context.parsed.y} assessment${context.parsed.y !== 1 ? 's' : ''}`;
                      }
                    }
                  }
                },
                scales: {
                  x: {
                    grid: {
                      display: true,
                      color: 'rgba(0, 0, 0, 0.05)',
                      drawTicks: false
                    },
                    ticks: {
                      color: '#6b7280',
                      font: {
                        size: 11
                      },
                      maxTicksLimit: 8
                    }
                  },
                  y: {
                    beginAtZero: true,
                    grid: {
                      display: true,
                      color: 'rgba(0, 0, 0, 0.05)',
                      drawTicks: false
                    },
                    ticks: {
                      color: '#6b7280',
                      font: {
                        size: 11
                      },
                      stepSize: 1,
                      callback: function(value) {
                        return value === 0 ? '0' : value;
                      }
                    }
                  }
                },
                interaction: {
                  intersect: false,
                  mode: 'index'
                },
                elements: {
                  point: {
                    radius: 3,
                    hoverRadius: 6
                  },
                  line: {
                    borderWidth: 2
                  }
                }
              }}
            />
          ) : (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: '#9ca3af'
            }}>
              <svg width="48" height="48" fill="currentColor" viewBox="0 0 24 24" style={{ marginBottom: '1rem', opacity: 0.5 }}>
                <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
              </svg>
              <p style={{ fontSize: '1rem', fontWeight: '500', margin: '0 0 0.5rem 0' }}>
                No Readiness Data Available
              </p>
              <p style={{ fontSize: '0.875rem', margin: '0' }}>
                Work readiness assessments will appear here
              </p>
            </div>
          )}
        </div>
      </div>
      </div>
      </>

      {/* Toast */}
      {toast && (
        <Toast
          open={!!toast}
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </LayoutWithSidebar>
  );
};

export default TeamLeaderDashboard;

