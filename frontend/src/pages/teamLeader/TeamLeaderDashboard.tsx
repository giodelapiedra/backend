import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext.supabase';
import { useTeamLeaderAnalytics, useWorkReadinessTrend } from '../../hooks/useWorkReadiness';
import { useWorkReadinessRealtime, useTeamRealtime } from '../../hooks/useRealtime';
import { SupabaseAPI } from '../../utils/supabaseApi';
import { useQueryClient } from '@tanstack/react-query';
import LoadingSpinner from '../../components/LoadingSpinner';
import Toast from '../../components/Toast';
import LayoutWithSidebar from '../../components/LayoutWithSidebar';
import { getProfileImageProps } from '../../utils/imageUtils';
import { dataClient } from '../../lib/supabase';
import { Line } from 'react-chartjs-2';
import { Box, Typography, Button, Card, CardContent, Grid, Fade, Tabs, Tab } from '@mui/material';
import { 
  People, 
  Assignment, 
  CheckCircle,
  Warning as WarningIcon
} from '@mui/icons-material';
import IncidentManagement from '../../components/IncidentManagement';
import StatCard from '../../components/StatCard';
// TrendChart moved inline to TeamAnalytics.tsx
import RecentActivityItem from '../../components/RecentActivityItem';
import TeamLeaderShiftDisplay from '../../components/TeamLeaderShiftDisplay';
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
    highFatigueCount?: number;
    notFitForWorkCount?: number;
    painReportedCount?: number;
    poorMoodCount?: number;
  };
  complianceMetrics: {
    todayCheckIns: number;
    todayCompletionRate: number;
    weeklyCheckIns: number;
    weeklyCompletionRate: number;
  };
  teamPerformance: Array<{
    memberName: string;
    email: string;
    role: string;
    team: string;
    lastLogin: string;
    loginTime?: string;
    isActive: boolean;
    workReadinessStatus: string;
    activityLevel: number;
    loggedInToday: boolean;
    recentCheckIns: number;
    recentAssessments: number;
    completedAssessments: number;
    lastAssessment: string;
    fatigueLevel?: number;
    readinessLevel?: string;
    mood?: string;
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
  fitForWork: number;
  total: number;
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

interface Notification {
  id: string;
  recipient_id: string;
  sender_id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  priority?: string;
}

// Modern SaaS Color Palette - High-end design system
const COLORS = {
  primary: {
    main: '#6366f1', // Indigo
    light: '#818cf8',
    dark: '#4f46e5',
    bg: 'rgba(99, 102, 241, 0.08)',
  },
  success: {
    main: '#10b981', // Emerald
    light: '#34d399',
    dark: '#059669',
    bg: 'rgba(16, 185, 129, 0.08)',
  },
  warning: {
    main: '#f59e0b', // Amber
    light: '#fbbf24',
    dark: '#d97706',
    bg: 'rgba(245, 158, 11, 0.08)',
  },
  error: {
    main: '#ef4444', // Red
    light: '#f87171',
    dark: '#dc2626',
    bg: 'rgba(239, 68, 68, 0.08)',
  },
  purple: {
    main: '#8b5cf6', // Violet
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

const TeamLeaderDashboard: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [createUserLoading, setCreateUserLoading] = useState(false);
  const [createTeamLoading, setCreateTeamLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdUser, setCreatedUser] = useState<any>(null);
  

  // Pagination state for Team Members
  const [teamMembersPage, setTeamMembersPage] = useState(1);
  const [teamMembersPageSize, setTeamMembersPageSize] = useState(10); // Show 10 items per page

  // Pagination state for Active Cases
  const [activeCasesPage, setActiveCasesPage] = useState(1);
  const [activeCasesPageSize, setActiveCasesPageSize] = useState(5); // Show 5 items per page

  // Pagination state for Notifications
  const [notificationsPage, setNotificationsPage] = useState(1);
  const [notificationsPageSize, setNotificationsPageSize] = useState(10); // Show 10 items per page

  // Date range states for charts
  const [readinessDateRange, setReadinessDateRange] = useState<'week' | 'month' | 'year' | 'custom'>('week');
  const [readinessStartDate, setReadinessStartDate] = useState<Date>(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
  const [readinessEndDate, setReadinessEndDate] = useState<Date>(new Date());

  // Notifications state
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);

  // Active Cases state (Not Fit workers)
  const [activeCases, setActiveCases] = useState<any[]>([]);
  const [activeCasesLoading, setActiveCasesLoading] = useState(false);

  // View Details state for Active Cases
  const [viewDetails, setViewDetails] = useState({
    open: false,
    case: null as any,
  });

  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [mainTab, setMainTab] = useState(0); // Default to Monthly Assignment Performance Tracking

  // React Query hooks
  const { 
    data: analyticsData, 
    isLoading: analyticsLoading, 
    error: analyticsError 
  } = useTeamLeaderAnalytics(user?.id || '');

  const { 
    data: trendData, 
    isLoading: trendLoading, 
    error: trendError 
  } = useWorkReadinessTrend(user?.id || '', readinessDateRange, readinessStartDate, readinessEndDate);

  // Debug logging
  console.log('🔍 TeamLeaderDashboard: user?.id:', user?.id);

  // Handle View Details for Active Cases
  const handleViewDetails = async (case_: any) => {
    console.log('handleViewDetails called with case:', case_);
    
    // Get team leader information if available
    let teamLeaderInfo = null;
    if (case_.team_leader_id) {
      try {
        const { data: teamLeader, error } = await dataClient
          .from('users')
          .select('first_name, last_name, email')
          .eq('id', case_.team_leader_id)
          .single();
        
        if (!error && teamLeader) {
          teamLeaderInfo = teamLeader;
        }
      } catch (error) {
        console.error('Error fetching team leader info:', error);
      }
    }
    
    setViewDetails({
      open: true,
      case: { ...case_, teamLeaderInfo },
    });
  };

  // Handle Print Case Details
  const handlePrintCase = () => {
    if (!viewDetails.case) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const case_ = viewDetails.case;
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Case Details - ${case_.worker?.first_name} ${case_.worker?.last_name}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 20px;
            color: #333;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #dc2626;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .header h1 {
            color: #dc2626;
            margin: 0;
            font-size: 24px;
          }
          .header p {
            color: #666;
            margin: 5px 0 0 0;
            font-size: 14px;
          }
          .section {
            margin-bottom: 25px;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            overflow: hidden;
          }
          .section-header {
            background-color: #f9fafb;
            padding: 12px 16px;
            border-bottom: 1px solid #e5e7eb;
            font-weight: 600;
            color: #374151;
          }
          .section-content {
            padding: 16px;
            background-color: white;
          }
          .assessment-details {
            background-color: #fef2f2;
            border-color: #fecaca;
          }
          .assessment-details .section-header {
            background-color: #fef2f2;
            color: #991b1b;
          }
          .info-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 16px;
          }
          .info-item {
            margin-bottom: 12px;
          }
          .info-label {
            font-size: 12px;
            color: #6b7280;
            font-weight: 600;
            margin-bottom: 4px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .info-value {
            font-size: 14px;
            color: #1f2937;
            font-weight: 500;
          }
          .status-badge {
            display: inline-block;
            background-color: #dc2626;
            color: white;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
          }
          .fatigue-high {
            color: #dc2626;
            font-weight: 700;
            font-size: 16px;
          }
          .notes {
            background-color: #f9fafb;
            padding: 12px;
            border-radius: 4px;
            border-left: 4px solid #3b82f6;
            font-style: italic;
            color: #1f2937;
          }
          .footer {
            margin-top: 30px;
            text-align: center;
            font-size: 12px;
            color: #6b7280;
            border-top: 1px solid #e5e7eb;
            padding-top: 20px;
          }
          @media print {
            body { margin: 0; }
            .section { break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Case Details Report</h1>
          <p>Generated on ${new Date().toLocaleString()}</p>
        </div>

        <div class="section">
          <div class="section-header">Worker Information</div>
          <div class="section-content">
            <div class="info-grid">
              <div class="info-item">
                <div class="info-label">Name</div>
                <div class="info-value">${case_.worker?.first_name} ${case_.worker?.last_name}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Email</div>
                <div class="info-value">${case_.worker?.email}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Team</div>
                <div class="info-value">${case_.worker?.team || case_.team}</div>
              </div>
              ${case_.teamLeaderInfo ? `
              <div class="info-item">
                <div class="info-label">Team Leader</div>
                <div class="info-value">${case_.teamLeaderInfo.first_name} ${case_.teamLeaderInfo.last_name}</div>
              </div>
              ` : ''}
            </div>
          </div>
        </div>

        <div class="section assessment-details">
          <div class="section-header">Assessment Details</div>
          <div class="section-content">
            <div class="info-grid">
              <div class="info-item">
                <div class="info-label">Work Readiness</div>
                <div class="info-value">
                  <span class="status-badge">NOT FIT</span>
                </div>
              </div>
              <div class="info-item">
                <div class="info-label">Fatigue Level</div>
                <div class="info-value fatigue-high">${case_.fatigue_level}/10</div>
              </div>
              <div class="info-item">
                <div class="info-label">Mood</div>
                <div class="info-value">${case_.mood ? case_.mood.charAt(0).toUpperCase() + case_.mood.slice(1) : 'N/A'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Pain/Discomfort</div>
                <div class="info-value">${case_.pain_discomfort ? case_.pain_discomfort.charAt(0).toUpperCase() + case_.pain_discomfort.slice(1) : 'N/A'}</div>
              </div>
            </div>
          </div>
        </div>

        ${case_.notes ? `
        <div class="section">
          <div class="section-header">Notes</div>
          <div class="section-content">
            <div class="notes">"${case_.notes}"</div>
          </div>
        </div>
        ` : ''}

        <div class="section">
          <div class="section-header">Submission Information</div>
          <div class="section-content">
            <div class="info-grid">
              <div class="info-item">
                <div class="info-label">Submitted</div>
                <div class="info-value">${new Date(case_.submitted_at).toLocaleString()}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Assessment ID</div>
                <div class="info-value" style="font-family: monospace; font-size: 12px;">${case_.id}</div>
              </div>
            </div>
          </div>
        </div>

        <div class="footer">
          <p>This report was generated from the Work Readiness Management System</p>
          <p>For questions or concerns, please contact your team leader or system administrator</p>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    
    // Wait for content to load then print
    printWindow.onload = () => {
      printWindow.print();
      printWindow.close();
    };
  };
  console.log('🔍 TeamLeaderDashboard: readinessDateRange:', readinessDateRange);
  console.log('🔍 TeamLeaderDashboard: readinessStartDate:', readinessStartDate);
  console.log('🔍 TeamLeaderDashboard: readinessEndDate:', readinessEndDate);
  console.log('🔍 TeamLeaderDashboard: trendLoading:', trendLoading);
  console.log('🔍 TeamLeaderDashboard: trendError:', trendError);

  // Real-time subscriptions
  useWorkReadinessRealtime(user?.id || '');
  useTeamRealtime(user?.id || '');

  // Create user form state
  const [createUserForm, setCreateUserForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    phone: '',
    team: ''
  });
  const [emailValidation, setEmailValidation] = useState<{
    isValid: boolean;
    message: string;
    checking: boolean;
  }>({ isValid: true, message: '', checking: false });

  // Create team form state
  const [createTeamForm, setCreateTeamForm] = useState({
    teamName: ''
  });

  // Work Readiness Activity modal state
  const [showWorkReadinessModal, setShowWorkReadinessModal] = useState(false);

  // Work Readiness Activity chart state - removed duplicate declarations

  // Transform analytics data to dashboard format
  const dashboardData = useMemo(() => {
    if (!analyticsData) return null;

    return {
        teamOverview: {
        totalMembers: analyticsData.analytics.totalTeamMembers,
        activeMembers: analyticsData.analytics.activeTeamMembers,
        teamName: analyticsData.teamLeader.team || 'Team'
        },
        safetyMetrics: {
          activeCases: 0, // Will be implemented when cases are connected
          monthlyIncidents: 0, // Will be implemented when incidents are connected
          incidentTrend: 'stable',
        highFatigueCount: analyticsData.analytics.safetyMetrics?.highFatigueCount || 0,
        notFitForWorkCount: analyticsData.analytics.safetyMetrics?.notFitForWorkCount || 0,
        painReportedCount: analyticsData.analytics.safetyMetrics?.painReportedCount || 0,
        poorMoodCount: analyticsData.analytics.safetyMetrics?.poorMoodCount || 0
        },
        complianceMetrics: {
        todayCheckIns: analyticsData.analytics.todayWorkReadinessStats.completed,
        todayCompletionRate: analyticsData.analytics.complianceRate,
        weeklyCheckIns: analyticsData.analytics.todayWorkReadinessStats.completed,
        weeklyCompletionRate: analyticsData.analytics.complianceRate
      },
      teamPerformance: analyticsData.analytics.teamPerformance,
        activeCases: [], // Will be implemented when cases are connected
      todaysCheckIns: analyticsData.analytics.teamPerformance.filter((member: any) => 
          member.workReadinessStatus === 'Completed'
      ).map((member: any) => ({
          workerName: member.memberName,
          type: 'work_readiness',
          status: member.workReadinessStatus,
          timestamp: member.lastAssessment
        }))
    };
  }, [analyticsData]);


  // Team members from analytics data with pagination
  const teamMembers = useMemo(() => {
    const allMembers = analyticsData?.analytics.teamPerformance || [];
      const startIndex = (teamMembersPage - 1) * teamMembersPageSize;
      const endIndex = startIndex + teamMembersPageSize;
    return allMembers.slice(startIndex, endIndex);
  }, [analyticsData, teamMembersPage, teamMembersPageSize]);

  const teamMembersTotal = useMemo(() => {
    return analyticsData?.analytics.teamPerformance?.length || 0;
  }, [analyticsData]);

  // Team data from analytics data
  const teamData = useMemo(() => {
    if (!analyticsData) return null;
    
    return {
      currentTeam: analyticsData.teamLeader.team || '',
      defaultTeam: analyticsData.teamLeader.team || '',
      managedTeams: analyticsData.teamLeader.managedTeams || []
    };
  }, [analyticsData]);

  // One-team-per-leader guard
  const hasExistingTeam = useMemo(() => {
    const hasDefault = !!teamData?.defaultTeam && teamData.defaultTeam.trim() !== '';
    const hasManaged = (teamData?.managedTeams?.length || 0) > 0;
    return hasDefault || hasManaged;
  }, [teamData]);

  // Chart data from trend data - Connected to database
  const chartData = useMemo(() => {
    console.log('🔍 TeamLeaderDashboard: trendData:', trendData);
    console.log('🔍 TeamLeaderDashboard: readinessTrendData:', trendData?.analytics?.readinessTrendData);
    const data = trendData?.analytics?.readinessTrendData || [];
    console.log('🔍 TeamLeaderDashboard: chartData:', data);
    
    // Log data breakdown for debugging
    if (data.length > 0) {
      const latestData = data[data.length - 1];
      console.log('📊 Latest Work Readiness Data:', {
        date: latestData.date,
        fitForWork: latestData.fitForWork,
        minorConcerns: latestData.minorConcernsFitForWork,
        notFitForWork: latestData.notFitForWork,
        total: latestData.total
      });
    }
    
    return data;
  }, [trendData]);

  // Chart configuration
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: window.innerWidth <= 768 ? 'bottom' as const : 'top' as const,
        labels: {
          padding: window.innerWidth <= 768 ? 10 : 20,
          font: {
            size: window.innerWidth <= 768 ? 12 : 14
          }
        }
      },
      title: {
        display: true,
        text: 'Work Readiness Trend',
        font: {
          size: window.innerWidth <= 768 ? 14 : 16
        }
      },
    },
    scales: {
      x: {
        ticks: {
          font: {
            size: window.innerWidth <= 768 ? 10 : 12
          }
        }
      },
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1,
          font: {
            size: window.innerWidth <= 768 ? 10 : 12
          }
        },
      },
    },
  };

  const chartDataConfig = {
    labels: chartData.map(item => {
      const date = new Date(item.date);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }),
    datasets: [
      {
        label: 'Not Fit for Work',
        data: chartData.map(item => item.notFitForWork),
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        tension: 0.1,
      },
      {
        label: 'Minor Concerns (Fit)',
        data: chartData.map(item => item.minorConcernsFitForWork),
        borderColor: 'rgb(245, 158, 11)',
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        tension: 0.1,
      },
      {
        label: 'Fit for Work',
        data: chartData.map(item => item.fitForWork),
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        tension: 0.1,
      },
    ],
  };

  // Loading state
  const loading = analyticsLoading || trendLoading;
  const readinessChartLoading = trendLoading;

  // Show toast when data updates
  useEffect(() => {
    if (analyticsData && !analyticsLoading) {
      setToast({ message: '🔄 Data updated!', type: 'success' });
      setTimeout(() => setToast(null), 2000);
    }
  }, [analyticsData, analyticsLoading]);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      setNotificationsLoading(true);
      const { data, error } = await dataClient
        .from('notifications')
        .select('*')
        .eq('recipient_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) {
        console.error('Error fetching notifications:', error);
        return;
      }

      setNotifications(data || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setNotificationsLoading(false);
    }
  }, [user?.id]);

  // Fetch notifications on mount and when user changes
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Real-time subscription for notifications
  useEffect(() => {
    if (!user?.id) return;

    const subscription = dataClient
      .channel('team-leader-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${user.id}`
        },
        (payload) => {
          console.log('New notification received:', payload);
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user?.id, fetchNotifications]);

  // Fetch active cases (Not Fit workers)
  const fetchActiveCases = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      setActiveCasesLoading(true);
      
      // Get team leader's managed teams
      const { data: teamLeader, error: leaderError } = await dataClient
        .from('users')
        .select('managed_teams, team')
        .eq('id', user.id)
        .single();
      
      if (leaderError) {
        console.error('Error fetching team leader:', leaderError);
        return;
      }
      
      const managedTeams = teamLeader?.managed_teams || [];
      if (teamLeader?.team && !managedTeams.includes(teamLeader.team)) {
        managedTeams.push(teamLeader.team);
      }
      
      if (managedTeams.length === 0) {
        setActiveCases([]);
        return;
      }
      
      // Get today's work readiness submissions that are "not_fit" (PHT)
      const { getPHTDate } = await import('../../utils/timezone');
      const today = getPHTDate();
      
      const { data: workReadinessData, error: workReadinessError } = await dataClient
        .from('work_readiness')
        .select(`
          *,
          worker:users!work_readiness_worker_id_fkey(
            id,
            first_name,
            last_name,
            email,
            team
          )
        `)
        .eq('team_leader_id', user.id)
        .eq('readiness_level', 'not_fit')
        .gte('submitted_at', `${today}T00:00:00.000Z`)
        .lte('submitted_at', `${today}T23:59:59.999Z`)
        .order('submitted_at', { ascending: false });
      
      if (workReadinessError) {
        console.error('Error fetching work readiness data:', workReadinessError);
        return;
      }
      
      setActiveCases(workReadinessData || []);
    } catch (error) {
      console.error('Error fetching active cases:', error);
    } finally {
      setActiveCasesLoading(false);
    }
  }, [user?.id]);

  // Fetch active cases on mount and when user changes
  useEffect(() => {
    fetchActiveCases();
  }, [fetchActiveCases]);

  // Real-time subscription for work readiness updates
  useEffect(() => {
    if (!user?.id) return;

    const subscription = dataClient
      .channel('team-leader-dashboard-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'work_readiness',
          filter: `team_leader_id=eq.${user.id}`
        },
        (payload) => {
          console.log('📊 New work readiness submission received - refreshing chart data:', payload);
          fetchActiveCases();
          
          // Trigger chart data refresh by invalidating the trend query
          queryClient.invalidateQueries({ queryKey: ['work-readiness-trend'] });
          queryClient.invalidateQueries({ queryKey: ['analytics'] });
          console.log('🔄 Chart data invalidated - chart will refresh with new data');
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'work_readiness',
          filter: `team_leader_id=eq.${user.id}`
        },
        (payload) => {
          console.log('📊 Work readiness assessment updated - refreshing data:', payload);
          fetchActiveCases();
          
          // Trigger chart data refresh
          queryClient.invalidateQueries({ queryKey: ['work-readiness-trend'] });
          queryClient.invalidateQueries({ queryKey: ['analytics'] });
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user?.id, fetchActiveCases]);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const { error } = await dataClient
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) {
        console.error('Error marking notification as read:', error);
        return;
      }

      // Update local state
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === notificationId 
            ? { ...notification, is_read: true }
            : notification
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, []);

  // Email validation function - simplified to avoid RLS issues
  const validateEmail = useCallback(async (email: string) => {
    if (!email || !email.includes('@')) {
      setEmailValidation({ isValid: true, message: '', checking: false });
      return;
    }

    // Basic email format validation only
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

    try {
      setCreateUserLoading(true);
      
      // Use default team if no team specified
      const userData = {
        ...createUserForm,
        team: createUserForm.team || teamData?.defaultTeam || teamData?.managedTeams?.[0] || ''
      };
      
      console.log('Creating user with data:', userData);
      
      // Create user in Supabase
      const result = await SupabaseAPI.createUser(userData);
      console.log('User created successfully:', result);
      
      // Show success modal with created user data
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
      
      // React Query will automatically refetch data due to real-time updates
    } catch (error: any) {
      console.error('Error creating user:', error);
      
      // Handle specific error messages
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

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!createTeamForm.teamName.trim()) {
      setToast({ message: 'Please enter a team name', type: 'error' });
      return;
    }

    if (!user?.id) {
      setToast({ message: 'User not authenticated', type: 'error' });
      return;
    }

    // Enforce one team per team leader
    if (hasExistingTeam) {
      setToast({ message: 'You already have a team. Only one team per team leader is allowed.', type: 'error' });
      return;
    }

    try {
      setCreateTeamLoading(true);
      console.log('Creating team:', createTeamForm.teamName, 'for user:', user.id);
      
      const result = await SupabaseAPI.createTeam(createTeamForm.teamName, user.id);
      console.log('Team created successfully:', result);
      
      setToast({ message: 'Team created successfully!', type: 'success' });
      setShowCreateTeam(false);
      setCreateTeamForm({ teamName: '' });
      
      // React Query will automatically refetch data due to real-time updates
    } catch (error: any) {
      console.error('Error creating team:', error);
      setToast({ 
        message: error.message || 'Error creating team', 
        type: 'error' 
      });
    } finally {
      setCreateTeamLoading(false);
    }
  };

  const handleSetDefaultTeam = async (teamName: string) => {
    try {
      if (!user?.id) {
        setToast({ message: 'User not authenticated', type: 'error' });
        return;
      }

      console.log('Setting default team:', teamName, 'for user:', user.id);
      await SupabaseAPI.updateUserTeam(user.id, teamName);
      
      setToast({ message: 'Default team updated successfully!', type: 'success' });
      // React Query will automatically refetch data due to real-time updates
    } catch (error: any) {
      console.error('Error updating default team:', error);
      setToast({ 
        message: error.message || 'Error updating default team', 
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
          {/* CSS Animations */}
          <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
        
        body {
          font-family: 'Inter', system-ui, sans-serif;
          overflow-x: hidden;
          margin: 0;
          padding: 0;
        }
        
        html {
          overflow-x: hidden;
        }
        
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

        @keyframes pulseRed {
          0% {
            box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7);
            transform: scale(1);
          }
          50% {
            box-shadow: 0 0 0 10px rgba(239, 68, 68, 0);
            transform: scale(1.02);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(239, 68, 68, 0);
            transform: scale(1);
          }
        }

        @keyframes pulseBorder {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }

        @keyframes pulseDot {
          0% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.3);
            opacity: 0.7;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }

        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(100%);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        /* Desktop maximization and overflow prevention */
        @media (min-width: 769px) {
          .dashboard-container {
            max-width: none !important;
            width: 100% !important;
            overflow-x: hidden !important;
          }
          
          .header-section {
            max-width: 100% !important;
          }
          
          .overview-cards {
            max-width: 100% !important;
          }
          
          * {
            box-sizing: border-box !important;
          }
        }
        
        @media (max-width: 768px) {
          .dashboard-container {
            padding: 12px !important;
            max-width: 100vw !important;
            overflow-x: hidden !important;
            background: transparent !important;
            border-radius: 0 !important;
            margin: 0 !important;
            min-height: 100vh !important;
            position: relative !important;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
            -webkit-font-smoothing: antialiased !important;
            -moz-osx-font-smoothing: grayscale !important;
          }
          
          /* Prevent horizontal overflow globally */
          * {
            box-sizing: border-box !important;
            max-width: 100% !important;
          }
          
          body, html {
            overflow-x: hidden !important;
            max-width: 100vw !important;
          }
          
          .mobile-app-container {
            background: white !important;
            border-radius: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden !important;
          }
          
          .mobile-app-header {
            background: transparent !important;
            color: #1a202c !important;
            padding: 20px 16px !important;
            margin: 0 0 12px 0 !important;
            border-radius: 0 !important;
            position: relative !important;
            box-shadow: none !important;
          }
          
          .overview-cards {
            grid-template-columns: 1fr !important;
            gap: 0.75rem !important;
            padding: 0 !important;
            margin-bottom: 1rem !important;
            clear: both !important;
          }
          
          .card-item {
            padding: 20px 16px !important;
            border-radius: 16px !important;
            margin-bottom: 12px !important;
            border: none !important;
            box-shadow: 0 4px 12px rgba(0,0,0,0.08), 0 2px 6px rgba(0,0,0,0.04) !important;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
            background: white !important;
            backdrop-filter: none !important;
            display: flex !important;
            align-items: center !important;
            gap: 16px !important;
            cursor: pointer !important;
            position: relative !important;
            overflow: hidden !important;
            clear: both !important;
          }
          
          .card-item::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 4px;
            background: transparent;
            opacity: 0;
            transition: opacity 0.3s ease;
          }
          
          .card-item:hover::before {
            opacity: 1;
          }
          
          .card-item:active {
            transform: scale(0.96) !important;
            box-shadow: 0 8px 25px rgba(0,0,0,0.15) !important;
            background: #f8fafc !important;
          }
          
          .card-item:hover {
            box-shadow: 0 6px 20px rgba(0,0,0,0.12) !important;
            transform: translateY(-2px) !important;
          }
          
          .header-section {
            flex-direction: column !important;
            align-items: flex-start !important;
            padding: 0 !important;
            margin: 0 !important;
            gap: 1rem !important;
          }
          
          .button-group {
            flex-direction: row !important;
            width: 100% !important;
            gap: 0.75rem !important;
            padding: 0 !important;
          }
          
          .button-group button {
            flex: 1 !important;
            padding: 0.875rem !important;
            border-radius: 8px !important;
            font-weight: 600 !important;
            font-size: 0.875rem !important;
            border: 2px solid rgba(255,255,255,0.3) !important;
            backdrop-filter: blur(10px) !important;
            transition: all 0.2s ease !important;
          }
          
          .button-group button:active {
            transform: scale(0.95) !important;
          }
          
          /* Mobile App Card Styling */
          .mobile-card {
            background: white !important;
            border-radius: 16px !important;
            padding: 1.25rem !important;
            margin-bottom: 1rem !important;
            border: 1px solid rgba(0,0,0,0.06) !important;
            box-shadow: 0 1px 10px rgba(0,0,0,0.1) !important;
            transition: all 0.2s ease !important;
          }
          
          .mobile-card:active {
            transform: scale(0.98) !important;
            box-shadow: 0 2px 20px rgba(0,0,0,0.15) !important;
          }
          
          /* Mobile List Items */
          .mobile-list-item {
            display: flex !important;
            align-items: flex-start !important;
            padding: 16px !important;
            background: white !important;
            border-radius: 12px !important;
            margin-bottom: 8px !important;
            border: 1px solid rgba(0,0,0,0.08) !important;
            box-shadow: 0 2px 8px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.05) !important;
            transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1) !important;
            min-height: 80px !important;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
            position: relative !important;
          }
          
          .mobile-list-item:active {
            transform: scale(0.98) !important;
            background: #f8fafc !important;
            box-shadow: 0 1px 4px rgba(0,0,0,0.15) !important;
          }
          
          .mobile-list-item:hover {
            background: white !important;
            box-shadow: 0 4px 12px rgba(0,0,0,0.12), 0 2px 4px rgba(0,0,0,0.08) !important;
          }
          
          /* Mobile Typography */
          h1, h2, h3, h4, h5, h6 {
            font-weight: 700 !important;
            letter-spacing: -0.025em !important;
          }
          
          /* Mobile Icon Styling */
          .mobile-icon {
            width: 52px !important;
            height: 52px !important;
            border-radius: 16px !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            font-size: 18px !important;
            font-weight: 700 !important;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
            letter-spacing: 0.025em !important;
            text-transform: uppercase !important;
            color: white !important;
            box-shadow: 0 4px 16px rgba(0,0,0,0.15), 0 2px 8px rgba(0,0,0,0.08) !important;
            position: relative !important;
            overflow: hidden !important;
            margin-right: 0 !important;
            flex-shrink: 0 !important;
            background: transparent !important;
          }
          
          .mobile-icon::after {
            content: '';
            position: absolute;
            bottom: 0;
            right: 0;
            width: 12px;
            height: 12px;
            border-radius: 50%;
            border: 2px solid white;
            box-shadow: 0 1px 3px rgba(0,0,0,0.2);
          }
          
          /* Mobile Touch Targets */
          button, [role="button"], .clickable {
            min-height: 44px !important;
            padding: 12px 16px !important;
            font-size: 16px !important;
            -webkit-tap-highlight-color: rgba(0,0,0,0.1) !important;
          }
          
          /* Hide scrollbars but keep functionality */
          * {
            -webkit-overflow-scrolling: touch !important;
          }
          
          /* Mobile Safe Area */
          body {
            padding-bottom: env(safe-area-inset-bottom) !important;
          }
        }
      `}</style>
      
      <Box 
        className="dashboard-modern-container"
        sx={{ 
          padding: { xs: 2, sm: 2.5, md: 3 },
          background: COLORS.neutral[50],
          minHeight: '100vh',
          position: 'relative',
          maxWidth: 'none',
          width: '100%',
          overflowX: 'hidden',
          boxSizing: 'border-box',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        }}
      >
        
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: { xs: 3, md: 4 },
          flexDirection: { xs: 'column', md: 'row' },
          background: COLORS.gradient.header,
          padding: { xs: '24px 20px', md: '32px 24px' },
          borderRadius: { xs: '16px', md: '20px' },
          boxShadow: '0 10px 40px -10px rgba(99, 102, 241, 0.3)',
          position: 'relative',
          gap: { xs: 2, md: 3 },
        }}>
          <Box sx={{ 
            textAlign: { xs: 'center', md: 'left' },
            flex: 1,
          }}>
            <Typography variant="h4" sx={{ 
              fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2rem' },
              fontWeight: 700, 
              color: COLORS.neutral.white,
              mb: 0.5,
              letterSpacing: '-0.02em',
            }}>
              Team Leader Dashboard
            </Typography>
            <Typography variant="body1" sx={{ 
              fontSize: { xs: '0.875rem', md: '0.9375rem' },
              fontWeight: 400,
              color: 'rgba(255, 255, 255, 0.9)', 
              mb: 1,
            }}>
              Welcome back, {user?.firstName}! Here's what's happening with your team today
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', justifyContent: { xs: 'center', md: 'flex-start' } }}>
              <Box sx={{ 
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                fontSize: '0.8125rem', 
                color: 'rgba(255, 255, 255, 0.85)',
              }}>
                <Box sx={{ 
                  width: '8px', 
                  height: '8px', 
                  borderRadius: '50%', 
                  backgroundColor: COLORS.success.light,
                  boxShadow: `0 0 0 3px rgba(16, 185, 129, 0.2)`,
                }} />
                Team: {dashboardData?.teamOverview?.teamName || 'Team'}
              </Box>
              <Box sx={{ 
                fontSize: '0.8125rem', 
                color: 'rgba(255, 255, 255, 0.7)',
              }}>
                •
              </Box>
              <Box sx={{ 
                fontSize: '0.8125rem', 
                color: 'rgba(255, 255, 255, 0.7)',
              }}>
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </Box>
            </Box>
          </Box>
          <Button
            variant="contained"
            onClick={() => setShowCreateUser(true)}
            startIcon={
              <Box component="span" sx={{ fontSize: '1.25rem', marginRight: '-4px' }}>+</Box>
            }
            sx={{
              background: 'rgba(255,255,255,0.2)',
              backdropFilter: 'blur(10px)',
              color: COLORS.neutral.white,
              padding: { xs: '10px 20px', md: '12px 28px' },
              borderRadius: '12px',
              border: '1px solid rgba(255,255,255,0.3)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              width: { xs: '100%', md: 'auto' },
              fontSize: { xs: '0.8125rem', md: '0.875rem' },
              fontWeight: 600,
              textTransform: 'none',
              minWidth: { xs: '140px', md: '160px' },
              '&:hover': {
                background: 'rgba(255,255,255,0.25)',
                transform: 'translateY(-2px)',
                boxShadow: '0 6px 20px rgba(0,0,0,0.15)',
                border: '1px solid rgba(255,255,255,0.4)',
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
        marginBottom: { xs: '16px', md: '2rem' },
        margin: { xs: '0 16px 16px 16px', md: '0 0 2rem 0' }
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ 
            fontSize: '1.25rem', 
            fontWeight: '600', 
            color: '#1f2937',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
          }}>
            Team Management
          </h3>
          <button
            type="button"
            onClick={() => {
              if (hasExistingTeam) {
                setToast({ message: 'You can only create one team.', type: 'error' });
                return;
              }
              setShowCreateTeam(true);
            }}
            disabled={hasExistingTeam}
            style={{
              backgroundColor: hasExistingTeam ? '#9ca3af' : '#16a34a',
              color: 'white',
              padding: '0.5rem 1rem',
              borderRadius: '0.375rem',
              border: 'none',
              cursor: hasExistingTeam ? 'not-allowed' : 'pointer',
              opacity: hasExistingTeam ? 0.8 : 1
            }}
            title={hasExistingTeam ? 'Each team leader can only create one team' : 'Create a new team'}
          >
            {hasExistingTeam ? 'Team Already Created' : 'Create New Team'}
          </button>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div style={{ padding: '1rem', backgroundColor: '#f9fafb', borderRadius: '0.5rem' }}>
            <h4 style={{ fontSize: '0.875rem', fontWeight: '500', color: '#6b7280', marginBottom: '0.5rem' }}>
              Current Team
            </h4>
            <p style={{ fontSize: '1.125rem', fontWeight: '600', color: '#1f2937' }}>
              {teamData?.currentTeam || 'Not Set'}
            </p>
          </div>
          
          <div style={{ padding: '1rem', backgroundColor: '#f9fafb', borderRadius: '0.5rem' }}>
            <h4 style={{ fontSize: '0.875rem', fontWeight: '500', color: '#6b7280', marginBottom: '0.5rem' }}>
              Default Team
            </h4>
            <p style={{ fontSize: '1.125rem', fontWeight: '600', color: '#1f2937' }}>
              {teamData?.defaultTeam || 'Not Set'}
            </p>
          </div>
          
          <div style={{ padding: '1rem', backgroundColor: '#f9fafb', borderRadius: '0.5rem' }}>
            <h4 style={{ fontSize: '0.875rem', fontWeight: '500', color: '#6b7280', marginBottom: '0.5rem' }}>
              Managed Teams
            </h4>
            <p style={{ fontSize: '1.125rem', fontWeight: '600', color: '#1f2937' }}>
              {teamData?.managedTeams?.length || 0}
            </p>
          </div>
        </div>
        
        {teamData?.managedTeams && teamData.managedTeams.length > 0 && (
          <div style={{ marginTop: '1rem' }}>
            <h4 style={{ fontSize: '0.875rem', fontWeight: '500', color: '#6b7280', marginBottom: '0.5rem' }}>
              Your Teams
            </h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {teamData?.managedTeams?.map((team: string, index: number) => (
                <div key={index} style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.5rem',
                  padding: '0.5rem 0.75rem',
                  backgroundColor: team === teamData?.defaultTeam ? '#dbeafe' : '#f3f4f6',
                  borderRadius: '0.375rem',
                  border: team === teamData?.defaultTeam ? '1px solid #3b82f6' : '1px solid #d1d5db'
                }}>
                  <span style={{ 
                    fontSize: '0.875rem', 
                    fontWeight: '500',
                    color: team === teamData?.defaultTeam ? '#1e40af' : '#374151'
                  }}>
                    {team}
                  </span>
                  {team === teamData?.defaultTeam && teamData?.defaultTeam && (
                    <span style={{ 
                      fontSize: '0.75rem', 
                      fontWeight: '600',
                      backgroundColor: '#4f94cd',
                      color: 'white',
                      padding: '0.125rem 0.375rem',
                      borderRadius: '0.25rem'
                    }}>
                      DEFAULT
                    </span>
                  )}
                  {team !== teamData?.defaultTeam && (
                    <button
                      type="button"
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
        </Box>
      {/* Main Dashboard Tabs (mobile-first, pill style) */}
      <Box sx={{ px: { xs: 1.5, md: 0 }, mb: 3 }}>
        <Tabs
          value={mainTab}
          onChange={(e, v) => setMainTab(v)}
          variant="scrollable"
          scrollButtons
          allowScrollButtonsMobile
          sx={{
            minHeight: 0,
            '& .MuiTabs-flexContainer': {
              gap: 1,
            },
            '& .MuiTab-root': {
              minHeight: 38,
              textTransform: 'none',
              borderRadius: 9999,
              px: 2,
              fontWeight: 600,
              color: '#475569',
              backgroundColor: '#f1f5f9',
            },
            '& .Mui-selected': {
              color: '#111827 !important',
              backgroundColor: '#e0e7ff !important',
            },
            '& .MuiTabs-indicator': {
              display: 'none',
            },
          }}
        >
          <Tab iconPosition="start" icon={<People sx={{ fontSize: 18 }} />} label="Team Members" />
          <Tab iconPosition="start" icon={<WarningIcon sx={{ fontSize: 18 }} />} label="Incident Management" />
        </Tabs>
      </Box>

      {/* Tab 0: Team Members */}
      {mainTab === 0 && (
        <React.Fragment>
          {/* Team Members content moved here from below */}
        </React.Fragment>
      )}

      {/* Tab 1: Incident Management */}
      {mainTab === 1 && (
        <Fade in timeout={500}>
          <Box>
            <IncidentManagement 
              teamLeaderId={user?.id || ''} 
              team={user?.team || ''} 
            />
          </Box>
        </Fade>
      )}


      {/* Floating Notifications Popup */}
      {notifications.filter(n => !n.is_read).length > 0 && (
        <div style={{
          position: 'fixed',
          top: '10px', // Position at very top
          right: '20px',
          zIndex: 9999, // Higher z-index to appear above everything including navbar
          maxWidth: '400px',
          width: '100%'
        }}>
          {notifications.filter(n => !n.is_read).slice(0, 3).map((notification, index) => (
            <div
              key={notification.id}
              style={{
                backgroundColor: notification.title.includes('NOT FIT') || notification.message.includes('NOT FIT') ? '#fef2f2' : '#ffffff',
                border: `2px solid ${notification.title.includes('NOT FIT') || notification.message.includes('NOT FIT') ? '#ef4444' : '#e5e7eb'}`,
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '12px',
                boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
                backdropFilter: 'blur(10px)',
                position: 'relative',
                animation: notification.title.includes('NOT FIT') || notification.message.includes('NOT FIT') ? 'pulseRed 2s infinite' : 'slideInRight 0.5s ease-out',
                transform: `translateY(${index * 10}px)`,
                transition: 'all 0.3s ease'
              }}
            >
              {/* Pulse Animation for NOT FIT notifications */}
              {notification.title.includes('NOT FIT') || notification.message.includes('NOT FIT') && (
                <div style={{
                  position: 'absolute',
                  top: '-2px',
                  left: '-2px',
                  right: '-2px',
                  bottom: '-2px',
                  borderRadius: '12px',
                  background: 'linear-gradient(45deg, #ef4444, #dc2626, #ef4444)',
                  backgroundSize: '200% 200%',
                  animation: 'pulseBorder 2s infinite',
                  zIndex: -1
                }} />
              )}
              
              {/* Close button */}
              <button
                onClick={() => markAsRead(notification.id)}
                style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  background: 'none',
                  border: 'none',
                  fontSize: '18px',
                  cursor: 'pointer',
                  color: '#6b7280',
                  width: '24px',
                  height: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '50%',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f3f4f6';
                  e.currentTarget.style.color = '#374151';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = '#6b7280';
                }}
              >
                ×
              </button>

              {/* Notification content */}
              <div style={{ paddingRight: '32px' }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: notification.title.includes('NOT FIT') || notification.message.includes('NOT FIT') ? '#ef4444' : '#3b82f6',
                    marginRight: '8px',
                    animation: notification.title.includes('NOT FIT') || notification.message.includes('NOT FIT') ? 'pulseDot 1.5s infinite' : 'none'
                  }} />
                  <h4 style={{
                    fontSize: '14px',
                    fontWeight: '700',
                    color: notification.title.includes('NOT FIT') || notification.message.includes('NOT FIT') ? '#dc2626' : '#1f2937',
                    margin: '0',
                    lineHeight: '1.2'
                  }}>
                    {notification.title}
                  </h4>
                </div>
                
                <p style={{
                  fontSize: '12px',
                  color: '#6b7280',
                  margin: '0 0 8px 0',
                  lineHeight: '1.4'
                }}>
                  {notification.message}
                </p>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{
                    fontSize: '10px',
                    color: '#9ca3af'
                  }}>
                    {new Date(notification.created_at).toLocaleTimeString()}
                  </span>
                  
                  <button
                    onClick={() => markAsRead(notification.id)}
                    style={{
                      background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '4px 12px',
                      fontSize: '10px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-1px)';
                      e.currentTarget.style.boxShadow = '0 4px 8px rgba(59, 130, 246, 0.3)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    Mark as Read
                  </button>
                </div>
              </div>
            </div>
          ))}
          
          {/* View All Button */}
          {notifications.filter(n => !n.is_read).length > 3 && (
            <div style={{
              textAlign: 'center',
              marginTop: '8px'
            }}>
              <button
                onClick={() => window.location.href = '/notifications'}
                style={{
                  background: 'linear-gradient(135deg, #6b7280, #4b5563)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 4px 8px rgba(107, 114, 128, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                View All ({notifications.filter(n => !n.is_read).length})
              </button>
            </div>
          )}
        </div>
      )}

      {/* Active Cases Section - Not Fit Workers */}
      {activeCases.length > 0 && (
        <Box sx={{ 
          backgroundColor: 'white', 
          padding: { xs: '20px', md: '1.5rem' },
          borderRadius: { xs: '12px', md: '0.5rem' },
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          marginBottom: { xs: '16px', md: '2rem' },
          margin: { xs: '0 16px 16px 16px', md: '0 0 2rem 0' },
          border: '2px solid #ef4444'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                backgroundColor: '#ef4444',
                animation: 'pulseDot 1.5s infinite'
              }} />
               <h2 style={{ 
                 fontSize: '1.375rem', 
                 fontWeight: '700', 
                 color: '#dc2626',
                 letterSpacing: '-0.0125em',
                 margin: '0'
               }}>
                  Active Cases - Not Ready for Work
                </h2>
            </div>
            <span style={{ 
              backgroundColor: '#ef4444', 
              color: 'white', 
              padding: '0.25rem 0.5rem', 
              borderRadius: '0.25rem', 
              fontSize: '0.75rem',
              fontWeight: '600'
            }}>
              {activeCases.length} Cases
            </span>
          </div>
          
          {/* Active Cases Pagination Controls */}
          {activeCases.length > activeCasesPageSize && (
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1rem',
              padding: '0.75rem',
              backgroundColor: '#f9fafb',
              borderRadius: '0.5rem',
              border: '1px solid #e5e7eb'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{ fontSize: '0.875rem', color: '#6b7280', fontWeight: '500' }}>
                  Show:
                </span>
                <select
                  value={activeCasesPageSize}
                  onChange={(e) => {
                    setActiveCasesPageSize(parseInt(e.target.value));
                    setActiveCasesPage(1);
                  }}
                  style={{
                    padding: '0.375rem 0.75rem',
                    borderRadius: '0.25rem',
                    border: '1px solid #d1d5db',
                    backgroundColor: 'white',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: '#374151',
                    cursor: 'pointer'
                  }}
                >
                  <option value={3}>3 cases</option>
                  <option value={5}>5 cases</option>
                  <option value={10}>10 cases</option>
                </select>
              </div>
              
              <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                Showing {Math.min((activeCasesPage - 1) * activeCasesPageSize + 1, activeCases.length)} to {Math.min(activeCasesPage * activeCasesPageSize, activeCases.length)} of {activeCases.length} cases
              </div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {activeCases
              .slice((activeCasesPage - 1) * activeCasesPageSize, activeCasesPage * activeCasesPageSize)
              .map((case_, index) => (
              <div 
                key={case_.id}
                style={{
                  padding: '1rem',
                  borderRadius: '0.5rem',
                  border: '1px solid #fecaca',
                  backgroundColor: '#fef2f2',
                  position: 'relative',
                  animation: 'slideInRight 0.5s ease-out',
                  animationDelay: `${index * 0.1}s`
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <div style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: '#ef4444',
                        animation: 'pulseDot 1.5s infinite'
                      }} />
                      <h4 style={{ 
                        fontSize: '1rem', 
                        fontWeight: '700', 
                        color: '#dc2626',
                        margin: '0'
                      }}>
                        {case_.worker?.first_name} {case_.worker?.last_name}
                      </h4>
                      <span style={{
                        backgroundColor: '#dc2626',
                        color: 'white',
                        padding: '0.125rem 0.375rem',
                        borderRadius: '0.25rem',
                        fontSize: '0.625rem',
                        fontWeight: '600'
                      }}>
                        NOT FIT
                      </span>
                    </div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem', marginBottom: '0.75rem' }}>
                      <div>
                        <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0 0 0.25rem 0' }}>
                          Email
                        </p>
                        <p style={{ fontSize: '0.875rem', fontWeight: '500', color: '#1f2937', margin: '0' }}>
                          {case_.worker?.email}
                        </p>
                      </div>
                      
                      <div>
                        <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0 0 0.25rem 0' }}>
                          Team
                        </p>
                        <p style={{ fontSize: '0.875rem', fontWeight: '500', color: '#1f2937', margin: '0' }}>
                          {case_.worker?.team || case_.team}
                        </p>
                      </div>
                      
                      <div>
                        <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0 0 0.25rem 0' }}>
                          Fatigue Level
                        </p>
                        <p style={{ fontSize: '0.875rem', fontWeight: '500', color: '#1f2937', margin: '0' }}>
                          {case_.fatigue_level}/10
                        </p>
                      </div>
                      
                      <div>
                        <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0 0 0.25rem 0' }}>
                          Mood
                        </p>
                        <p style={{ fontSize: '0.875rem', fontWeight: '500', color: '#1f2937', margin: '0' }}>
                          {case_.mood}
                        </p>
                      </div>
                    </div>
                    
                    {case_.notes && (
                      <div style={{ marginBottom: '0.75rem' }}>
                        <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0 0 0.25rem 0' }}>
                          Notes
                        </p>
                        <p style={{ fontSize: '0.875rem', color: '#1f2937', margin: '0', fontStyle: 'italic' }}>
                          "{case_.notes}"
                        </p>
                      </div>
                    )}
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{
                        fontSize: '0.75rem',
                        color: '#9ca3af'
                      }}>
                        Submitted: {new Date(case_.submitted_at).toLocaleString()}
                      </span>
                      
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          style={{
                            background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '0.375rem',
                            padding: '0.375rem 0.75rem',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                          }}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            console.log('View Details clicked for case:', case_);
                            handleViewDetails(case_);
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-1px)';
                            e.currentTarget.style.boxShadow = '0 4px 8px rgba(59, 130, 246, 0.3)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                        >
                          View Details
                        </button>
                        
                        <button
                          style={{
                            background: 'linear-gradient(135deg, #16a34a, #15803d)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '0.375rem',
                            padding: '0.375rem 0.75rem',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-1px)';
                            e.currentTarget.style.boxShadow = '0 4px 8px rgba(22, 163, 74, 0.3)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                        >
                          Contact Worker
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Active Cases Pagination Buttons */}
          {activeCases.length > activeCasesPageSize && (() => {
            const totalPages = Math.ceil(activeCases.length / activeCasesPageSize);
            return (
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '0.5rem',
                marginTop: '1.5rem',
                padding: '1rem',
                backgroundColor: '#f9fafb',
                borderRadius: '0.5rem',
                border: '1px solid #e5e7eb'
              }}>
                {/* Previous Button */}
                <button
                  onClick={() => setActiveCasesPage(Math.max(1, activeCasesPage - 1))}
                  disabled={activeCasesPage === 1}
                  style={{
                    padding: '0.5rem 0.75rem',
                    borderRadius: '0.375rem',
                    border: '1px solid #d1d5db',
                    backgroundColor: activeCasesPage === 1 ? '#f3f4f6' : 'white',
                    color: activeCasesPage === 1 ? '#9ca3af' : '#374151',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    cursor: activeCasesPage === 1 ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  « Previous
                </button>

                {/* Page Numbers */}
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (activeCasesPage <= 3) {
                    pageNum = i + 1;
                  } else if (activeCasesPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = activeCasesPage - 2 + i;
                  }

                  return (
                    <button
                      key={pageNum}
                      onClick={() => setActiveCasesPage(pageNum)}
                      style={{
                        padding: '0.5rem 0.75rem',
                        borderRadius: '0.375rem',
                        border: '1px solid #d1d5db',
                        backgroundColor: activeCasesPage === pageNum ? '#3b82f6' : 'white',
                        color: activeCasesPage === pageNum ? 'white' : '#374151',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        minWidth: '2.5rem'
                      }}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                {/* Next Button */}
                <button
                  onClick={() => setActiveCasesPage(Math.min(totalPages, activeCasesPage + 1))}
                  disabled={activeCasesPage === totalPages}
                  style={{
                    padding: '0.5rem 0.75rem',
                    borderRadius: '0.375rem',
                    border: '1px solid #d1d5db',
                    backgroundColor: activeCasesPage === totalPages ? '#f3f4f6' : 'white',
                    color: activeCasesPage === totalPages ? '#9ca3af' : '#374151',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    cursor: activeCasesPage === totalPages ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  Next »
                </button>
              </div>
            );
          })()}
        </Box>
      )}

    


      {/* Team Members - Modern Card Layout */}
      {mainTab === 1 && (
      <Box sx={{ 
        background: { xs: 'white', md: 'rgba(255, 255, 255, 0.8)' },
        backdropFilter: { md: 'blur(10px)' },
        borderRadius: { xs: '12px', md: '1rem' },
        border: { xs: 'none', md: '1px solid rgba(255, 255, 255, 0.2)' },
        boxShadow: { xs: '0 2px 8px rgba(0,0,0,0.08)', md: '0 8px 32px 0 rgba(31, 38, 135, 0.37)' },
        transition: 'all 0.3s ease-in-out',
        position: 'relative',
        zIndex: 1,
        margin: { xs: '0 16px 16px 16px', md: '0 0 2rem 0' },
        marginBottom: { xs: '16px', md: '2rem' }
      }}>
        {/* Header with Search and Filter - Mobile Optimized */}
        <Box sx={{ 
          padding: { xs: '20px', md: '1.5rem' },
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', md: 'center' },
          gap: { xs: '1rem', md: 0 },
          background: { xs: '#ffffff', md: 'transparent' }
        }}>
          <Box>
            <Typography variant="h6" sx={{ 
              fontSize: { xs: '1.1rem', md: '1.25rem' },
              fontWeight: 600, 
              color: '#1a202c',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
              textShadow: '0 1px 2px rgba(0,0,0,0.1)',
              margin: '0 0 0.25rem 0'
            }}>
              Team Members
            </Typography>
            <Typography variant="body2" sx={{ 
              fontSize: { xs: '0.8rem', md: '0.875rem' },
              color: '#6b7280',
              margin: 0,
              fontFamily: { xs: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', md: 'inherit' }
            }}>
              Your Team Members Overview
            </Typography>
          </Box>
          
          
          <div style={{ 
            display: 'flex', 
            gap: window.innerWidth <= 768 ? '0.75rem' : '0.5rem',
            alignItems: 'center',
            flexWrap: window.innerWidth <= 768 ? 'wrap' : 'nowrap'
          }}>
            {/* Filter Dropdown */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '0.875rem',
                backgroundColor: '#ffffff',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                outline: 'none',
                minWidth: '120px',
                cursor: 'pointer'
              }}
            >
              <option value="all">All Members</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="not_started">Not Started</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>

            {/* Mobile Filter Button */}
            {window.innerWidth <= 768 ? (
              <button 
                type="button"
                style={{
                padding: '0.5rem 1rem',
                borderRadius: '12px',
                border: '1px solid #d1d5db',
                backgroundColor: '#ffffff',
                color: '#6b7280',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                fontSize: '0.875rem',
                fontWeight: '500',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                transition: 'all 0.2s ease',
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f9fafb';
                e.currentTarget.style.borderColor = '#9ca3af';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#ffffff';
                e.currentTarget.style.borderColor = '#d1d5db';
              }}>
                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586v.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-4.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                Filter
              </button>
            ) : null}
          </div>
        </Box>

        {/* Team Members Cards */}
        <div style={{ padding: window.innerWidth <= 768 ? '1.25rem' : '1.5rem' }}>
          {loading ? (
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
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: window.innerWidth <= 768 ? '1.25rem' : '0.75rem' 
            }}>
              {/* Search Results Counter */}
              {(() => {
                const filteredMembers = teamMembers.filter((member) => {
                  const matchesSearch = searchQuery === '' || 
                    member.memberName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    member.email.toLowerCase().includes(searchQuery.toLowerCase());
                  
                  const memberStatus = member.workReadinessStatus || 'Not Started';
                  
                  const matchesStatus = filterStatus === 'all' || 
                    (filterStatus === 'active' && member.loggedInToday) ||
                    (filterStatus === 'inactive' && !member.loggedInToday) ||
                    (filterStatus === 'not_started' && memberStatus === 'Not Started') ||
                    (filterStatus === 'completed' && memberStatus === 'Completed');
                  
                  return matchesSearch && matchesStatus;
                });
                
                return (searchQuery || filterStatus !== 'all') && (
                  <div style={{ 
                    fontSize: '0.875rem', 
                    color: '#6b7280', 
                    marginBottom: '1rem' 
                  }}>
                    {filteredMembers.length} member{filteredMembers.length !== 1 ? 's' : ''} found
                  </div>
                );
              })()}
              
              {teamMembers
                .filter((member) => {
                  const matchesSearch = searchQuery === '' || 
                    member.memberName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    member.email.toLowerCase().includes(searchQuery.toLowerCase());
                  
                  const memberStatus = member.workReadinessStatus || 'Not Started';
                  
                  const matchesStatus = filterStatus === 'all' || 
                    (filterStatus === 'active' && member.loggedInToday) ||
                    (filterStatus === 'inactive' && !member.loggedInToday) ||
                    (filterStatus === 'not_started' && memberStatus === 'Not Started') ||
                    (filterStatus === 'completed' && memberStatus === 'Completed');
                  
                  return matchesSearch && matchesStatus;
                })
                .map((member, index) => {
                // Find work readiness data for this member
                const memberWorkReadiness = dashboardData?.teamPerformance?.find(p => p.email === member.email);
                
                return (
                <div 
                  key={member.email} 
                  className={`mobile-list-item`}
                  style={{ 
                    display: 'flex',
                    alignItems: window.innerWidth <= 768 ? 'flex-start' : 'center',
                    padding: window.innerWidth <= 768 ? '28px 24px' : '1rem',
                    backgroundColor: index === 0 ? '#f9fafb' : window.innerWidth <= 768 ? 'white' : 'transparent',
                    borderRadius: window.innerWidth <= 768 ? '20px' : '0.75rem',
                    transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
                    cursor: 'pointer',
                    border: window.innerWidth <= 768 ? '1px solid rgba(0,0,0,0.08)' : '1px solid rgba(0,0,0,0.06)',
                    boxShadow: window.innerWidth <= 768 ? '0 6px 20px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)' : 'none',
                    marginBottom: window.innerWidth <= 768 ? '0' : '0',
                    position: 'relative',
                    minHeight: window.innerWidth <= 768 ? '130px' : 'auto',
                    fontFamily: window.innerWidth <= 768 ? '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' : 'inherit'
                  }}
                  onMouseEnter={(e) => {
                    if (window.innerWidth > 768) {
                    e.currentTarget.style.backgroundColor = '#f9fafb';
                    e.currentTarget.style.borderColor = '#e5e7eb';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (window.innerWidth > 768) {
                    e.currentTarget.style.backgroundColor = index === 0 ? '#f9fafb' : 'transparent';
                    e.currentTarget.style.borderColor = 'transparent';
                    }
                  }}
                >
                  {/* Profile Picture */}
                  {member.profileImage ? (
                    <img
                      {...getProfileImageProps(member.profileImage)}
                      alt={`${member.memberName || 'User'}`}
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
                    <div className="mobile-icon" style={{
                      width: window.innerWidth <= 768 ? '52px' : '48px',
                      height: window.innerWidth <= 768 ? '52px' : '48px',
                      borderRadius: '50%',
                      backgroundColor: '#e5e7eb',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: window.innerWidth <= 768 ? '1.25rem' : '1rem',
                      fontSize: window.innerWidth <= 768 ? '18px' : '1.25rem',
                      fontWeight: '700',
                      fontFamily: window.innerWidth <= 768 ? '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' : 'inherit',
                      letterSpacing: '0.025em',
                      textTransform: 'uppercase',
                      background: `linear-gradient(135deg, ${
                        member.loggedInToday ? '#22c55e' : '#ef4444'
                      } 0%, ${
                        member.loggedInToday ? '#16a34a' : '#dc2626'
                      } 100%)`,
                      color: 'white',
                      boxShadow: window.innerWidth <= 768 ? '0 4px 16px rgba(0,0,0,0.15), 0 2px 6px rgba(0,0,0,0.1)' : '0 2px 4px rgba(0,0,0,0.1)',
                      border: window.innerWidth <= 768 ? `3px solid ${member.loggedInToday ? '#16a34a' : '#dc2626'}` : 'none',
                      position: 'relative',
                      overflow: 'hidden'
                    }}>
                      {(() => {
                        const name = member.memberName?.charAt(0);
                        // Make sure we get proper letter
                        return name ? name.toUpperCase() : 'U';
                      })()}
                      {/* Status indicator dot */}
                      {window.innerWidth <= 768 && (
                        <div style={{
                          position: 'absolute',
                          bottom: '2px',
                          right: '2px',
                          width: '14px',
                          height: '14px',
                          borderRadius: '50%',
                          backgroundColor: member.loggedInToday ? '#22c55e' : '#ef4444',
                          border: '3px solid white',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                        }} />
                      )}
                    </div>
                  )}

                  {/* Member Info */}
                  <div style={{ 
                    flex: 1, 
                    minWidth: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: window.innerWidth <= 768 ? '14px' : '4px',
                    paddingRight: window.innerWidth <= 768 ? '16px' : '12px',
                    paddingTop: window.innerWidth <= 768 ? '8px' : '0',
                    paddingBottom: window.innerWidth <= 768 ? '6px' : '0'
                  }}>
                    {/* Name Row with Tags */}
                    <div style={{ 
                      display: 'flex', 
                      flexDirection: window.innerWidth <= 768 ? 'column' : 'row',
                      alignItems: window.innerWidth <= 768 ? 'flex-start' : 'center',
                      gap: window.innerWidth <= 768 ? '12px' : '8px',
                      marginBottom: window.innerWidth <= 768 ? '0' : '6px'
                    }}>
                      <div style={{ 
                        fontSize: window.innerWidth <= 768 ? '17px' : '0.875rem', 
                        fontWeight: window.innerWidth <= 768 ? '700' : '600', 
                        color: '#111827',
                        lineHeight: window.innerWidth <= 768 ? '1.4' : 'inherit',
                        fontFamily: window.innerWidth <= 768 ? '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' : 'inherit',
                        flex: 'none',
                        marginBottom: window.innerWidth <= 768 ? '2px' : '0'
                      }}>
                        {member.memberName || 'User'}
                      </div>
                      
                      {/* Work Readiness & Role Tags */}
                      {window.innerWidth <= 768 && (
                        <div style={{ 
                          display: 'flex', 
                          flexWrap: 'wrap', 
                          gap: window.innerWidth <= 768 ? '8px' : '6px',
                          alignItems: 'center',
                          marginTop: window.innerWidth <= 768 ? '6px' : '4px'
                        }}>
                          <span style={{ 
                            padding: window.innerWidth <= 768 ? '6px 12px' : '4px 8px', 
                            fontSize: window.innerWidth <= 768 ? '12px' : '11px', 
                            fontWeight: window.innerWidth <= 768 ? '600' : '500', 
                            borderRadius: window.innerWidth <= 768 ? '10px' : '8px', 
                            backgroundColor: memberWorkReadiness?.workReadinessStatus === 'Completed' ? '#dcfce7' : '#fef3c7', 
                            color: memberWorkReadiness?.workReadinessStatus === 'Completed' ? '#166534' : '#92400e',
                            border: 'none',
                            display: 'inline-flex',
                            whiteSpace: 'nowrap'
                          }}>
                            {memberWorkReadiness?.workReadinessStatus || 'Not Started'}
                          </span>
                          <span style={{ 
                            padding: window.innerWidth <= 768 ? '6px 12px' : '4px 8px', 
                            fontSize: window.innerWidth <= 768 ? '12px' : '11px', 
                            fontWeight: window.innerWidth <= 768 ? '600' : '500', 
                            borderRadius: window.innerWidth <= 768 ? '10px' : '8px', 
                            backgroundColor: '#dbeafe', 
                            color: '#1e40af',
                            border: 'none',
                            display: 'inline-flex',
                            whiteSpace: 'nowrap'
                          }}>
                            {member.role}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Email */}
                    <div style={{ 
                      fontSize: window.innerWidth <= 768 ? '14px' : '0.75rem', 
                      color: window.innerWidth <= 768 ? '#64748b' : '#6b7280',
                      lineHeight: window.innerWidth <= 768 ? '1.3' : 'inherit',
                      fontFamily: window.innerWidth <= 768 ? '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' : 'inherit',
                      fontWeight: window.innerWidth <= 768 ? '500' : 'inherit'
                    }}>
                      {(() => {
                        if (window.innerWidth <= 768) {
                          const email = member.email;
                          if (email && email.length > 20) {
                            return email.substring(0, 20) + '...';
                          }
                          return email;
                        }
                        return member.email;
                      })()}
                    </div>

                    {/* Status Badge */}
                    <div style={{ 
                      fontSize: '0.75rem', 
                      fontWeight: '600',
                      padding: '4px 8px',
                      borderRadius: '12px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      width: 'fit-content',
                      marginTop: '4px',
                      border: '1px solid',
                      ...(member.loggedInToday ? {
                        color: '#22c55e',
                        backgroundColor: '#f0fdf4',
                        borderColor: '#bbf7d0',
                      } : {
                        color: '#ef4444',
                        backgroundColor: '#fef2f2',
                        borderColor: '#fecaca',
                      })
                    }}>
                      <div style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        backgroundColor: member.loggedInToday ? '#22c55e' : '#ef4444'
                      }}></div>
                      {member.loggedInToday ? 'Logged In' : 'Not Logged In'}
                    </div>
                    
                    {/* Login Time Display - Only show if logged in today */}
                    {member.loggedInToday && member.loginTime && (
                      <div style={{
                        fontSize: '0.7rem',
                        color: '#6b7280',
                        marginTop: '2px',
                        fontStyle: 'italic'
                      }}>
                        Last login: {new Date(member.loginTime).toLocaleString('en-PH', {
                          timeZone: 'Asia/Manila',
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    )}
                  </div>

                  {/* Desktop Work Readiness Status */}
                  {window.innerWidth > 768 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                      {/* Work Readiness Badge */}
                      <span style={{ 
                        padding: '4px 8px', 
                        display: 'inline-flex', 
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '0.75rem', 
                        fontWeight: '600', 
                        borderRadius: '12px', 
                        border: '1px solid',
                        whiteSpace: 'nowrap',
                        ...(memberWorkReadiness?.workReadinessStatus === 'Completed' ? {
                          backgroundColor: '#f0fdf4',
                          color: '#22c55e',
                          borderColor: '#bbf7d0',
                        } : {
                          backgroundColor: '#f9fafb',
                          color: '#9ca3af',
                          borderColor: '#d1d5db',
                        })
                      }}>
                        <div style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          backgroundColor: memberWorkReadiness?.workReadinessStatus === 'Completed' ? '#22c55e' : '#9ca3af'
                        }}></div>
                        {memberWorkReadiness?.workReadinessStatus || 'Not Started'}
                      </span>

                      {/* Role Badge - Hidden on Desktop */}
                      {/* <span style={{ 
                        padding: '0.25rem 0.5rem', 
                        display: 'inline-flex', 
                        fontSize: '0.75rem', 
                        fontWeight: '500', 
                        borderRadius: '0.375rem', 
                        backgroundColor: '#dbeafe', 
                        color: '#1e40af',
                        whiteSpace: 'nowrap'
                      }}>
                        {member.role}
                      </span> */}

                      {/* Options Button */}
                      <button 
                        type="button"
                        style={{
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
                        transition: 'all 0.2s ease',
                        flex: 'none'
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
                  )}

                  {/* Mobile Options Button */}
                  {window.innerWidth <= 768 && (
                    <button 
                      type="button"
                      style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      border: 'none',
                      backgroundColor: 'transparent',
                      color: '#6b7280',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s ease',
                      flex: 'none',
                      marginLeft: 'auto'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#f3f4f6';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}>
                      <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
                      </svg>
                    </button>
                  )}
                </div>
                );
              })}
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

        {/* Pagination Controls - Mobile Optimized */}
        {teamMembers.length > 0 && teamMembersTotal > teamMembersPageSize && (
          <div style={{ 
            padding: window.innerWidth <= 768 ? '0.75rem 1rem' : '1rem 1.5rem',
            borderTop: '1px solid #e5e7eb',
            display: 'flex',
            flexDirection: window.innerWidth <= 768 ? 'column' : 'row',
            justifyContent: 'space-between',
            alignItems: window.innerWidth <= 768 ? 'flex-start' : 'center',
            gap: window.innerWidth <= 768 ? '0.75rem' : '0',
            backgroundColor: '#f9fafb'
          }}>
            {/* Summary Info */}
            <div style={{ 
              fontSize: window.innerWidth <= 768 ? '0.8rem' : '0.875rem', 
              color: '#6b7280',
              fontFamily: window.innerWidth <= 768 ? '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' : 'inherit',
              textAlign: window.innerWidth <= 768 ? 'center' : 'left',
              width: window.innerWidth <= 768 ? '100%' : 'auto'
            }}>
              Showing {((teamMembersPage - 1) * teamMembersPageSize) + 1} to {Math.min(teamMembersPage * teamMembersPageSize, teamMembersTotal)} of {teamMembersTotal} team members
            </div>
            {/* Items per page selector - Mobile Optimized */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: window.innerWidth <= 768 ? '0.5rem' : '0.5rem',
              flexWrap: window.innerWidth <= 768 ? 'wrap' : 'nowrap',
              fontSize: window.innerWidth <= 768 ? '0.8rem' : '0.875rem'
            }}>
              <span style={{ 
                fontSize: window.innerWidth <= 768 ? '0.8rem' : '0.875rem', 
                color: '#6b7280',
                fontFamily: window.innerWidth <= 768 ? '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' : 'inherit'
              }}>Show:</span>
              <select 
                value={teamMembersPageSize}
                onChange={(e) => {
                  const newPageSize = parseInt(e.target.value);
                  setTeamMembersPageSize(newPageSize);
                  setTeamMembersPage(1); // Reset to first page when changing page size
                }}
                style={{
                  padding: window.innerWidth <= 768 ? '0.4rem 0.5rem' : '0.25rem 0.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: window.innerWidth <= 768 ? '8px' : '0.375rem',
                  fontSize: window.innerWidth <= 768 ? '0.8rem' : '0.875rem',
                  backgroundColor: 'white',
                  color: '#374151',
                  fontFamily: window.innerWidth <= 768 ? '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' : 'inherit',
                  minWidth: '60px'
                }}
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span style={{ 
                fontSize: window.innerWidth <= 768 ? '0.8rem' : '0.875rem', 
                color: '#6b7280',
                fontFamily: window.innerWidth <= 768 ? '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' : 'inherit'
              }}>
                of {teamMembersTotal} members
              </span>
            </div>

            {/* Page Info */}
            <div style={{ 
              fontSize: window.innerWidth <= 768 ? '0.8rem' : '0.875rem', 
              color: '#6b7280',
              fontFamily: window.innerWidth <= 768 ? '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' : 'inherit',
              textAlign: window.innerWidth <= 768 ? 'center' : 'left'
            }}>
              Page {teamMembersPage} of {Math.ceil(teamMembersTotal / teamMembersPageSize)}
            </div>

            {/* Go to Page Input - Desktop Only */}
            {window.innerWidth > 768 && (
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem',
                fontSize: '0.875rem',
                color: '#6b7280'
              }}>
                <span>Go to:</span>
                <input
                  type="number"
                  min="1"
                  max={Math.ceil(teamMembersTotal / teamMembersPageSize)}
                  value={teamMembersPage}
                  onChange={(e) => {
                    const page = parseInt(e.target.value);
                    if (page >= 1 && page <= Math.ceil(teamMembersTotal / teamMembersPageSize)) {
                      setTeamMembersPage(page);
                    }
                  }}
                  style={{
                    width: '60px',
                    padding: '0.25rem 0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    textAlign: 'center'
                  }}
                />
              </div>
            )}

            {/* Pagination buttons - Mobile Optimized */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: window.innerWidth <= 768 ? '0.25rem' : '0.5rem',
              width: window.innerWidth <= 768 ? '100%' : 'auto',
              justifyContent: window.innerWidth <= 768 ? 'center' : 'flex-end'
            }}>
              {/* First page button */}
              <button
                type="button"
                onClick={() => setTeamMembersPage(1)}
                disabled={teamMembersPage === 1}
                style={{
                  padding: window.innerWidth <= 768 ? '0.4rem 0.6rem' : '0.5rem 0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: window.innerWidth <= 768 ? '8px' : '0.375rem',
                  backgroundColor: teamMembersPage === 1 ? '#f9fafb' : 'white',
                  color: teamMembersPage === 1 ? '#9ca3af' : '#374151',
                  fontSize: window.innerWidth <= 768 ? '0.8rem' : '0.875rem',
                  cursor: teamMembersPage === 1 ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                  fontFamily: window.innerWidth <= 768 ? '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' : 'inherit',
                  fontWeight: '500',
                  boxShadow: window.innerWidth <= 768 ? '0 1px 2px rgba(0, 0, 0, 0.05)' : 'none'
                }}
                title="First page"
              >
                ««
              </button>

              {/* Previous button */}
              <button
                type="button"
                onClick={() => setTeamMembersPage(Math.max(1, teamMembersPage - 1))}
                disabled={teamMembersPage === 1}
                style={{
                  padding: window.innerWidth <= 768 ? '0.4rem 0.6rem' : '0.5rem 0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: window.innerWidth <= 768 ? '8px' : '0.375rem',
                  backgroundColor: teamMembersPage === 1 ? '#f9fafb' : 'white',
                  color: teamMembersPage === 1 ? '#9ca3af' : '#374151',
                  fontSize: window.innerWidth <= 768 ? '0.8rem' : '0.875rem',
                  cursor: teamMembersPage === 1 ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                  fontFamily: window.innerWidth <= 768 ? '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' : 'inherit',
                  fontWeight: '500',
                  boxShadow: window.innerWidth <= 768 ? '0 1px 2px rgba(0, 0, 0, 0.05)' : 'none'
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
                {window.innerWidth <= 768 ? 'Prev' : 'Previous'}
              </button>

              {/* Page numbers - Mobile Optimized */}
              <div style={{ 
                display: 'flex', 
                gap: window.innerWidth <= 768 ? '0.25rem' : '0.25rem',
                flexWrap: window.innerWidth <= 768 ? 'wrap' : 'nowrap',
                justifyContent: window.innerWidth <= 768 ? 'center' : 'flex-start'
              }}>
                {(() => {
                  const totalPages = Math.ceil(teamMembersTotal / teamMembersPageSize);
                  const pages = [];
                  
                  // Show first page
                  if (totalPages > 0) {
                    pages.push(
                      <button
                        key={1}
                        type="button"
                        onClick={() => setTeamMembersPage(1)}
                          style={{
                            width: window.innerWidth <= 768 ? '28px' : '32px',
                            height: window.innerWidth <= 768 ? '28px' : '32px',
                            border: '1px solid #d1d5db',
                            borderRadius: window.innerWidth <= 768 ? '6px' : '0.375rem',
                            backgroundColor: teamMembersPage === 1 ? '#3b82f6' : 'white',
                            color: teamMembersPage === 1 ? 'white' : '#374151',
                            fontSize: window.innerWidth <= 768 ? '0.75rem' : '0.875rem',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            fontFamily: window.innerWidth <= 768 ? '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' : 'inherit',
                            fontWeight: '500',
                            boxShadow: window.innerWidth <= 768 ? '0 1px 2px rgba(0, 0, 0, 0.05)' : 'none'
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
                          type="button"
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
                        type="button"
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

              {/* Next button - Mobile Optimized */}
              <button
                type="button"
                onClick={() => setTeamMembersPage(Math.min(Math.ceil(teamMembersTotal / teamMembersPageSize), teamMembersPage + 1))}
                disabled={teamMembersPage >= Math.ceil(teamMembersTotal / teamMembersPageSize)}
                style={{
                  padding: window.innerWidth <= 768 ? '0.4rem 0.6rem' : '0.5rem 0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: window.innerWidth <= 768 ? '8px' : '0.375rem',
                  backgroundColor: teamMembersPage >= Math.ceil(teamMembersTotal / teamMembersPageSize) ? '#f9fafb' : 'white',
                  color: teamMembersPage >= Math.ceil(teamMembersTotal / teamMembersPageSize) ? '#9ca3af' : '#374151',
                  fontSize: window.innerWidth <= 768 ? '0.8rem' : '0.875rem',
                  cursor: teamMembersPage >= Math.ceil(teamMembersTotal / teamMembersPageSize) ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                  fontFamily: window.innerWidth <= 768 ? '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' : 'inherit',
                  fontWeight: '500',
                  boxShadow: window.innerWidth <= 768 ? '0 1px 2px rgba(0, 0, 0, 0.05)' : 'none'
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

              {/* Last page button */}
              <button
                type="button"
                onClick={() => setTeamMembersPage(Math.ceil(teamMembersTotal / teamMembersPageSize))}
                disabled={teamMembersPage >= Math.ceil(teamMembersTotal / teamMembersPageSize)}
                style={{
                  padding: window.innerWidth <= 768 ? '0.4rem 0.6rem' : '0.5rem 0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: window.innerWidth <= 768 ? '8px' : '0.375rem',
                  backgroundColor: teamMembersPage >= Math.ceil(teamMembersTotal / teamMembersPageSize) ? '#f9fafb' : 'white',
                  color: teamMembersPage >= Math.ceil(teamMembersTotal / teamMembersPageSize) ? '#9ca3af' : '#374151',
                  fontSize: window.innerWidth <= 768 ? '0.8rem' : '0.875rem',
                  cursor: teamMembersPage >= Math.ceil(teamMembersTotal / teamMembersPageSize) ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                  fontFamily: window.innerWidth <= 768 ? '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' : 'inherit',
                  fontWeight: '500',
                  boxShadow: window.innerWidth <= 768 ? '0 1px 2px rgba(0, 0, 0, 0.05)' : 'none'
                }}
                title="Last page"
              >
                »»
              </button>
            </div>
          </div>
        )}
      </Box>
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
                    // Debounce email validation
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
                    marginTop: '0.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem'
                  }}>
                    {emailValidation.checking ? (
                      <>
                        <div style={{
                          width: '12px',
                          height: '12px',
                          border: '2px solid #6b7280',
                          borderTop: '2px solid transparent',
                          borderRadius: '50%',
                          animation: 'spin 1s linear infinite'
                        }} />
                        Checking email...
                      </>
                    ) : (
                      <>
                        {emailValidation.isValid ? '✓' : '✗'}
                        {emailValidation.message}
                      </>
                    )}
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
                  minLength={8}
                  pattern="^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$"
                />
                <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.25rem' }}>
                  Minimum 8 characters with uppercase, lowercase, and number
                </p>
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
                  {teamData?.managedTeams.map((team: string, index: number) => (
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
                    {createdUser.firstName || 'User'} {createdUser.lastName || ''}
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
                type="button"
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

   


      {/* Work Readiness Activity Modal */}
        {showWorkReadinessModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: window.innerWidth <= 768 ? '0' : '0.5rem'
          }}>
            <div style={{
              backgroundColor: 'white',
              borderRadius: window.innerWidth <= 768 ? '0' : '0.75rem',
              padding: window.innerWidth <= 768 ? '1rem' : '2rem',
              maxWidth: '100vw',
              maxHeight: '100vh',
              width: '100%',
              height: '100%',
              overflow: 'auto',
              position: 'relative',
              animation: 'modalSlideIn 0.3s ease-out',
              boxShadow: window.innerWidth <= 768 ? 'none' : '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
            }}>
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: window.innerWidth <= 768 ? '1rem' : '2rem',
              paddingBottom: '1rem',
              borderBottom: '1px solid #e5e7eb'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{
                  width: '2rem',
                  height: '2rem',
                  backgroundColor: '#8b5cf6',
                  borderRadius: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <svg width="16" height="16" fill="white" viewBox="0 0 24 24">
                    <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                  </svg>
                </div>
                <h2 style={{
                  fontSize: window.innerWidth <= 768 ? '1.25rem' : '1.5rem',
                  fontWeight: '600',
                  color: '#1f2937',
                  margin: 0
                }}>
                  Work Readiness Activity - Detailed View
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowWorkReadinessModal(false)}
                style={{
                  padding: '0.5rem',
                  backgroundColor: 'transparent',
                  border: 'none',
                  borderRadius: '0.375rem',
                  color: '#6b7280',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f3f4f6';
                  e.currentTarget.style.color = '#374151';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = '#6b7280';
                }}
              >
                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            </div>

            {/* Date Filter Controls */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: window.innerWidth <= 768 ? '0.5rem' : '1rem',
              marginBottom: window.innerWidth <= 768 ? '1rem' : '2rem',
              flexWrap: 'wrap'
            }}>
              {/* Legend */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    backgroundColor: '#ef4444'
                  }}></div>
                  <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Not Fit for Work</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    backgroundColor: '#f59e0b'
                  }}></div>
                  <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Minor Concerns Fit for Work</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    backgroundColor: '#10b981'
                  }}></div>
                  <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Fit for Work</span>
                </div>
              </div>
              
              {/* Time Filter Dropdown */}
              <select 
                value={readinessDateRange}
                onChange={(e) => {
                  e.preventDefault();
                  console.log('📅 Date range changed to:', e.target.value);
                  const newRange = e.target.value as 'week' | 'month' | 'year' | 'custom';
                  setReadinessDateRange(newRange);
                  
                  // Auto-update date range based on selection
                  if (newRange !== 'custom') {
                    const today = new Date();
                    let startDate: Date;
                    
                    switch (newRange) {
                      case 'week':
                        startDate = new Date(today);
                        startDate.setDate(today.getDate() - 6); // Last 7 days including today
                        break;
                      case 'month':
                        startDate = new Date(today);
                        startDate.setDate(today.getDate() - 29); // Last 30 days including today
                        break;
                      case 'year':
                        startDate = new Date(today);
                        startDate.setDate(today.getDate() - 364); // Last 365 days including today
                        break;
                      default:
                        startDate = new Date(today);
                        startDate.setDate(today.getDate() - 6);
                    }
                    
                    setReadinessStartDate(startDate);
                    setReadinessEndDate(today);
                  }
                }}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '0.5rem',
                  border: '1px solid #d1d5db',
                  fontSize: '0.875rem',
                  backgroundColor: 'white',
                  color: '#374151',
                  cursor: 'pointer'
                }}
              >
                <option value="week">Last 7 Days</option>
                <option value="month">Last 30 Days</option>
                <option value="year">Last 365 Days</option>
                <option value="custom">Custom Range</option>
              </select>
            
            {/* Custom Date Range Inputs */}
            {readinessDateRange === 'custom' && (
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input
                  type="date"
                  value={readinessStartDate.toISOString().split('T')[0]}
                  onChange={(e) => {
                      e.preventDefault();
                    console.log('📅 Start date changed to:', e.target.value);
                    // Create date at start of day to ensure it's included in the range
                    const newDate = new Date(e.target.value + 'T00:00:00.000');
                    console.log('📅 New start date object:', newDate.toISOString());
                    console.log('📅 Setting start date, will trigger useEffect...');
                    setReadinessStartDate(newDate);
                  }}
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
                  onChange={(e) => {
                      e.preventDefault();
                    console.log('📅 End date changed to:', e.target.value);
                    // Create date at end of day to ensure it's included in the range
                    const newDate = new Date(e.target.value + 'T23:59:59.999');
                    console.log('📅 New end date object:', newDate.toISOString());
                    console.log('📅 Setting end date, will trigger useEffect...');
                    setReadinessEndDate(newDate);
                  }}
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
        
            {/* Chart Container */}
            <div style={{ height: window.innerWidth <= 768 ? '400px' : '600px', position: 'relative' }}>
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
              ) : chartData && 
                 Array.isArray(chartData) && 
                 chartData.length > 0 ? (
            <Line
                  data={chartDataConfig}
                  options={chartOptions}
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

            {/* Summary Cards */}
            <div style={{
              marginTop: window.innerWidth <= 768 ? '1rem' : '2rem',
              display: 'grid',
              gridTemplateColumns: window.innerWidth <= 768 ? 'repeat(auto-fit, minmax(150px, 1fr))' : 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: window.innerWidth <= 768 ? '0.5rem' : '1rem'
            }}>
          <div style={{
            backgroundColor: '#f0f9ff',
            padding: window.innerWidth <= 768 ? '0.75rem' : '1rem',
            borderRadius: '0.5rem',
            border: '1px solid #bae6fd'
          }}>
            <div style={{ fontSize: window.innerWidth <= 768 ? '0.75rem' : '0.875rem', color: '#0369a1', fontWeight: '600' }}>Total Assessments</div>
            <div style={{ fontSize: window.innerWidth <= 768 ? '1.25rem' : '1.5rem', color: '#0369a1', fontWeight: '700' }}>
              {chartData.reduce((sum, item) => sum + item.total, 0)}
      </div>
      </div>
          <div style={{
            backgroundColor: '#f0fdf4',
            padding: window.innerWidth <= 768 ? '0.75rem' : '1rem',
            borderRadius: '0.5rem',
            border: '1px solid #bbf7d0'
          }}>
            <div style={{ fontSize: window.innerWidth <= 768 ? '0.75rem' : '0.875rem', color: '#166534', fontWeight: '600' }}>Fit for Work</div>
            <div style={{ fontSize: window.innerWidth <= 768 ? '1.25rem' : '1.5rem', color: '#166534', fontWeight: '700' }}>
              {chartData.reduce((sum, item) => sum + item.fitForWork, 0)}
            </div>
          </div>
          <div style={{
            backgroundColor: '#fef3c7',
            padding: window.innerWidth <= 768 ? '0.75rem' : '1rem',
            borderRadius: '0.5rem',
            border: '1px solid #fde68a'
          }}>
            <div style={{ fontSize: window.innerWidth <= 768 ? '0.75rem' : '0.875rem', color: '#92400e', fontWeight: '600' }}>Minor Concerns</div>
            <div style={{ fontSize: window.innerWidth <= 768 ? '1.25rem' : '1.5rem', color: '#92400e', fontWeight: '700' }}>
              {chartData.reduce((sum, item) => sum + item.minorConcernsFitForWork, 0)}
            </div>
          </div>
          <div style={{
            backgroundColor: '#fef2f2',
            padding: window.innerWidth <= 768 ? '0.75rem' : '1rem',
            borderRadius: '0.5rem',
            border: '1px solid #fecaca'
          }}>
            <div style={{ fontSize: window.innerWidth <= 768 ? '0.75rem' : '0.875rem', color: '#dc2626', fontWeight: '600' }}>Not Fit for Work</div>
            <div style={{ fontSize: window.innerWidth <= 768 ? '1.25rem' : '1.5rem', color: '#dc2626', fontWeight: '700' }}>
              {chartData.reduce((sum, item) => sum + item.notFitForWork, 0)}
            </div>
          </div>
        </div>
      </div>
      </div>
      )}

      {/* View Details Dialog for Active Cases */}
      {viewDetails.open && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '0.5rem',
            padding: '2rem',
            maxWidth: '600px',
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1f2937', margin: 0 }}>
                Case Details
              </h2>
              <button
                onClick={() => setViewDetails({ open: false, case: null })}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  color: '#6b7280',
                  padding: '0.25rem'
                }}
              >
                ×
              </button>
            </div>

            {viewDetails.case && (
              <div>
                {/* Worker Information */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#374151', marginBottom: '0.75rem' }}>
                    Worker Information
                  </h3>
                  <div style={{ 
                    backgroundColor: '#f9fafb', 
                    padding: '1rem', 
                    borderRadius: '0.375rem',
                    border: '1px solid #e5e7eb'
                  }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                      <div>
                        <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0 0 0.25rem 0', fontWeight: '600' }}>
                          Name
                        </p>
                        <p style={{ fontSize: '0.875rem', color: '#1f2937', margin: 0 }}>
                          {viewDetails.case.worker?.first_name} {viewDetails.case.worker?.last_name}
                        </p>
                      </div>
                      <div>
                        <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0 0 0.25rem 0', fontWeight: '600' }}>
                          Email
                        </p>
                        <p style={{ fontSize: '0.875rem', color: '#1f2937', margin: 0 }}>
                          {viewDetails.case.worker?.email}
                        </p>
                      </div>
              <div>
                <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0 0 0.25rem 0', fontWeight: '600' }}>
                  Team
                </p>
                <p style={{ fontSize: '0.875rem', color: '#1f2937', margin: 0 }}>
                  {viewDetails.case.worker?.team || viewDetails.case.team}
                </p>
              </div>
              {viewDetails.case.teamLeaderInfo && (
                <div>
                  <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0 0 0.25rem 0', fontWeight: '600' }}>
                    Team Leader
                  </p>
                  <p style={{ fontSize: '0.875rem', color: '#1f2937', margin: 0 }}>
                    {viewDetails.case.teamLeaderInfo.first_name} {viewDetails.case.teamLeaderInfo.last_name}
                  </p>
                </div>
              )}
                    </div>
                  </div>
                </div>

                {/* Assessment Details */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#374151', marginBottom: '0.75rem' }}>
                    Assessment Details
                  </h3>
                  <div style={{ 
                    backgroundColor: '#fef2f2', 
                    padding: '1rem', 
                    borderRadius: '0.375rem',
                    border: '1px solid #fecaca'
                  }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
                      <div>
                        <p style={{ fontSize: '0.75rem', color: '#991b1b', margin: '0 0 0.25rem 0', fontWeight: '600' }}>
                          Work Readiness
                        </p>
                        <span style={{
                          backgroundColor: '#dc2626',
                          color: 'white',
                          padding: '0.25rem 0.5rem',
                          borderRadius: '0.25rem',
                          fontSize: '0.75rem',
                          fontWeight: '600'
                        }}>
                          NOT FIT
                        </span>
                      </div>
                      <div>
                        <p style={{ fontSize: '0.75rem', color: '#991b1b', margin: '0 0 0.25rem 0', fontWeight: '600' }}>
                          Fatigue Level
                        </p>
                        <p style={{ fontSize: '1rem', fontWeight: '700', color: '#dc2626', margin: 0 }}>
                          {viewDetails.case.fatigue_level}/10
                        </p>
                      </div>
                      <div>
                        <p style={{ fontSize: '0.75rem', color: '#991b1b', margin: '0 0 0.25rem 0', fontWeight: '600' }}>
                          Mood
                        </p>
                        <p style={{ fontSize: '0.875rem', color: '#1f2937', margin: 0, textTransform: 'capitalize' }}>
                          {viewDetails.case.mood}
                        </p>
                      </div>
                      <div>
                        <p style={{ fontSize: '0.75rem', color: '#991b1b', margin: '0 0 0.25rem 0', fontWeight: '600' }}>
                          Pain/Discomfort
                        </p>
                        <p style={{ fontSize: '0.875rem', color: '#1f2937', margin: 0, textTransform: 'capitalize' }}>
                          {viewDetails.case.pain_discomfort}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                {viewDetails.case.notes && (
                  <div style={{ marginBottom: '1.5rem' }}>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#374151', marginBottom: '0.75rem' }}>
                      Notes
                    </h3>
                    <div style={{ 
                      backgroundColor: '#f9fafb', 
                      padding: '1rem', 
                      borderRadius: '0.375rem',
                      border: '1px solid #e5e7eb'
                    }}>
                      <p style={{ fontSize: '0.875rem', color: '#1f2937', margin: 0, fontStyle: 'italic' }}>
                        "{viewDetails.case.notes}"
                      </p>
                    </div>
                  </div>
                )}

                {/* Submission Information */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#374151', marginBottom: '0.75rem' }}>
                    Submission Information
                  </h3>
                  <div style={{ 
                    backgroundColor: '#f9fafb', 
                    padding: '1rem', 
                    borderRadius: '0.375rem',
                    border: '1px solid #e5e7eb'
                  }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                      <div>
                        <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0 0 0.25rem 0', fontWeight: '600' }}>
                          Submitted
                        </p>
                        <p style={{ fontSize: '0.875rem', color: '#1f2937', margin: 0 }}>
                          {new Date(viewDetails.case.submitted_at).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0 0 0.25rem 0', fontWeight: '600' }}>
                          Assessment ID
                        </p>
                        <p style={{ fontSize: '0.875rem', color: '#1f2937', margin: 0, fontFamily: 'monospace' }}>
                          {viewDetails.case.id}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                  <button
                    onClick={handlePrintCase}
                    style={{
                      backgroundColor: '#4f94cd',
                      color: 'white',
                      border: 'none',
                      borderRadius: '0.375rem',
                      padding: '0.5rem 1rem',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#2563eb';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#3b82f6';
                    }}
                  >
                    🖨️ Print
                  </button>
                  <button
                    onClick={() => setViewDetails({ open: false, case: null })}
                    style={{
                      backgroundColor: '#6b7280',
                      color: 'white',
                      border: 'none',
                      borderRadius: '0.375rem',
                      padding: '0.5rem 1rem',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#4b5563';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#6b7280';
                    }}
                  >
                    Close
                  </button>
                  <button
                    style={{
                      backgroundColor: '#16a34a',
                      color: 'white',
                      border: 'none',
                      borderRadius: '0.375rem',
                      padding: '0.5rem 1rem',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#15803d';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#16a34a';
                    }}
                  >
                    Contact Worker
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Monthly Performance Tracking Section - Moved to Tab 3 */}

      {/* Toast */}
      {toast && (
        <Toast
          open={!!toast}
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      </Box>
    </LayoutWithSidebar>
  );
};

export default TeamLeaderDashboard;
