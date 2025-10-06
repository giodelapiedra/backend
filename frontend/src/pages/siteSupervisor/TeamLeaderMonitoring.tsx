import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  TextField,
  InputAdornment,
  Alert,
  CircularProgress,
  Avatar,
  Grid,
  Badge,
  Pagination,
  Tabs,
  Tab,
  LinearProgress,
  Tooltip,
  IconButton,
  Divider,
  Stack,
} from '@mui/material';
import {
  Search,
  Person,
  Group,
  Warning,
  Assignment,
  Visibility,
  Schedule,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  EmojiEvents,
  Assessment,
  Refresh,
  Analytics,
  Insights,
  Star,
  StarBorder,
  Timeline,
  BarChart,
  Info,
} from '@mui/icons-material';
import LayoutWithSidebar from '../../components/LayoutWithSidebar';
import { useAuth } from '../../contexts/AuthContext.supabase';
import TeamKPIDashboard from '../../components/TeamKPIDashboard';

interface TeamMember {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  team: string;
  package: string;
  lastLogin: string;
  hasLoggedInToday: boolean | null;
  lastLoginToday?: string;
}

interface TeamLeader {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  team: string;
  managedTeams: string[];
  defaultTeam: string;
  lastLogin: string;
  hasLoggedInToday: boolean | null;
  lastLoginToday: string | undefined;
  teamMembers: TeamMember[];
  teamStats: {
    totalMembers: number;
    activeMembers: number;
    onlineToday: number;
    onlineRate: number;
    activeCases: number;
    recentIncidents: number;
    completedToday: number;
    complianceRate: number;
  };
  recentIncidents: any[];
  activeCases: any[];
  teamKPI?: {
    weekLabel: string;
    overallTeamKPI: {
      rating: string;
      color: string;
      description: string;
      score: number;
    };
    teamOverview: {
      totalMembers: number;
      activeMembers: number;
      averageCompletion: number;
      teamKPI: string;
    };
    individualKPIs: any[];
    performanceInsights: any[];
  };
}

interface SupervisorData {
  overall: {
    totalTeamLeaders: number;
    totalWorkers: number;
    onlineTeamLeaders: number;
    onlineWorkers: number;
    totalActiveCases: number;
    totalRecentIncidents: number;
  };
  teamLeaders: TeamLeader[];
  lastUpdated: string;
}

const TeamLeaderMonitoring: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<SupervisorData | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTeamLeader, setSelectedTeamLeader] = useState<TeamLeader | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [teamsPerPage] = useState(5);
  const [membersCurrentPage, setMembersCurrentPage] = useState(1);
  const [membersPerPage] = useState(10);
  const [activeTab, setActiveTab] = useState(0);
  const [kpiLoading, setKpiLoading] = useState(false);
  const [kpiError, setKpiError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  // Fetch KPI data for all team leaders
  const fetchKPIData = async (teamLeaders: TeamLeader[]) => {
    try {
      setKpiLoading(true);
      setKpiError(null);
      
      console.log('🔄 Fetching KPI data for team leaders...');
      
      // Get Supabase session token
      const { authClient } = await import('../../lib/supabase');
      const { data: { session }, error: sessionError } = await authClient.auth.getSession();
      
      if (sessionError || !session?.access_token) {
        throw new Error('No access token found. Please log in again.');
      }

      // Fetch KPI data for each team leader
      const kpiPromises = teamLeaders.map(async (teamLeader) => {
        try {
          console.log(`🔍 Fetching KPI for team leader ${teamLeader._id}`);
          const response = await fetch(`${process.env.REACT_APP_API_BASE_URL || 'https://sociosystem.onrender.com'}/api/goal-kpi/team-leader/weekly-summary?teamLeaderId=${teamLeader._id}`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json',
            }
          });

          console.log(`🔍 Response for team leader ${teamLeader._id}:`, response.status, response.ok);

          if (!response.ok) {
            const errorText = await response.text();
            console.error(`❌ Failed to fetch KPI for team leader ${teamLeader._id}:`, response.status, response.statusText, errorText);
            return { teamLeaderId: teamLeader._id, kpiData: undefined };
          }

          const result = await response.json();
          
          if (result.success) {
            return { teamLeaderId: teamLeader._id, kpiData: result.data.teamKPI };
          } else {
            console.warn(`KPI fetch failed for team leader ${teamLeader._id}: ${result.message}`);
            return { teamLeaderId: teamLeader._id, kpiData: undefined };
          }
        } catch (error) {
          console.error(`Error fetching KPI for team leader ${teamLeader._id}:`, error);
          return { teamLeaderId: teamLeader._id, kpiData: undefined };
        }
      });

      const kpiResults = await Promise.all(kpiPromises);
      
      // Update team leaders with KPI data
      const updatedTeamLeaders = teamLeaders.map(teamLeader => {
        const kpiResult = kpiResults.find(result => result.teamLeaderId === teamLeader._id);
        return {
          ...teamLeader,
          teamKPI: kpiResult?.kpiData
        };
      });

      // Update the data state
      setData(prevData => {
        if (!prevData) return null;
        return {
          ...prevData,
          teamLeaders: updatedTeamLeaders
        };
      });

      console.log('✅ KPI data fetched successfully for all team leaders');
    } catch (err: any) {
      console.error('❌ Error fetching KPI data:', err);
      setKpiError(err.message || 'Failed to fetch KPI data');
    } finally {
      setKpiLoading(false);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Fetching team leader monitoring data from Supabase...');
      
      // Fetch team leaders data from Supabase
      const { dataClient } = await import('../../lib/supabase');
      
      // Get all team leaders with their team members
      const { data: teamLeaders, error: teamLeadersError } = await dataClient
        .from('users')
        .select(`
          id,
          first_name,
          last_name,
          email,
          role,
          team,
          managed_teams,
          default_team,
          is_active,
          created_at,
          updated_at
        `)
        .eq('role', 'team_leader')
        .eq('is_active', true)
        .order('first_name');

      if (teamLeadersError) {
        throw teamLeadersError;
      }

      console.log('Found team leaders:', teamLeaders?.length || 0);
      console.log('Team leaders data:', teamLeaders);

      // Debug: Check all users to understand the data structure
      const { data: allUsers, error: allUsersError } = await dataClient
        .from('users')
        .select('id, first_name, last_name, role, team, default_team, is_active')
        .eq('is_active', true)
        .order('role');
      
      if (!allUsersError) {
        console.log('All active users:', allUsers);
        console.log('Total users:', allUsers?.length || 0);
        console.log('Users by role:', allUsers?.reduce((acc, user) => {
          acc[user.role] = (acc[user.role] || 0) + 1;
          return acc;
        }, {} as any));
      }

      // For each team leader, get their team members and stats
      const teamLeadersWithMembers = await Promise.all(
        (teamLeaders || []).map(async (teamLeader) => {
          try {
            // Get team members under this team leader - using SAME logic as /team-leader
            // First get the managed teams (same logic as useTeamLeaderAnalytics)
            const managedTeams = teamLeader.managed_teams || [];
            const allManagedTeams = [...managedTeams];
            if (teamLeader.team && !allManagedTeams.includes(teamLeader.team)) {
              allManagedTeams.push(teamLeader.team);
            }
            
            console.log(`Team leader ${teamLeader.first_name} managed teams:`, allManagedTeams);

            // Query team members using managed teams (SAME as /team-leader)
            let { data: teamMembers, error: membersError } = await dataClient
              .from('users')
              .select(`
                id,
                first_name,
                last_name,
                email,
                role,
                team,
                default_team,
                created_at,
                updated_at
              `)
              .eq('role', 'worker')
              .in('team', allManagedTeams)
              .eq('is_active', true)
              .order('first_name');

            // Fallback: If no members found, try default_team as backup
            if (!membersError && (!teamMembers || teamMembers.length === 0)) {
              console.log(`No workers found with managed teams, trying default_team fallback...`);
              const { data: defaultTeamMembers, error: defaultMembersError } = await dataClient
                .from('users')
                .select(`
                  id,
                  first_name,
                  last_name,
                  email,
                  role,
                  team,
                  default_team,
                  created_at,
                  updated_at
                `)
                .eq('default_team', teamLeader.team)
                .neq('role', 'team_leader')
                .eq('is_active', true)
                .order('first_name');
              
              if (!defaultMembersError && defaultTeamMembers) {
                teamMembers = defaultTeamMembers;
                membersError = defaultMembersError;
              }
            }

            if (membersError) {
              console.error('Error fetching team members:', membersError);
              return null;
            }

            console.log(`Team members for ${teamLeader.first_name} (${teamLeader.team}):`, teamMembers?.length || 0);
            console.log('Team members data:', teamMembers);
            console.log('Team leader ID:', teamLeader.id);

            // Get today's date for login tracking
            const today = new Date();
            const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
            const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

            // Get login activity from AuthenticationLog collection
            // Note: Since we're using Supabase directly, we'll use a simplified approach
            // In a real implementation, you'd need to query the AuthenticationLog collection
            // For now, we'll use updated_at as a proxy for recent activity
            const teamMembersWithStatus = (teamMembers || []).map(member => {
              const lastUpdated = member.updated_at ? new Date(member.updated_at) : null;
              // Consider "logged in today" if updated within the last 24 hours
              const hasLoggedInToday = lastUpdated && lastUpdated >= todayStart;
              
              return {
                _id: member.id,
                firstName: member.first_name,
                lastName: member.last_name,
                email: member.email,
                role: member.role,
                team: member.team,
                package: 'package1', // Default package for workers
                lastLogin: member.updated_at,
                hasLoggedInToday,
                lastLoginToday: hasLoggedInToday ? member.updated_at : undefined
              };
            });

            // Check team leader's login status using updated_at
            const teamLeaderLastUpdated = teamLeader.updated_at ? new Date(teamLeader.updated_at) : null;
            const teamLeaderHasLoggedInToday = teamLeaderLastUpdated && teamLeaderLastUpdated >= todayStart;

            // Get work readiness data for compliance calculation
            let workReadinessData: any[] = [];
            let completedToday = 0;
            let complianceRate = 0;
            
            try {
              const teamMemberIds = (teamMembers || []).map(m => m.id);
              if (teamMemberIds.length > 0) {
                const { data: wrData, error: workReadinessError } = await dataClient
                  .from('work_readiness')
                  .select('*')
                  .in('worker_id', teamMemberIds)
                  .order('submitted_at', { ascending: false });

                if (!workReadinessError) {
                  workReadinessData = wrData || [];
                  
                  // Calculate today's compliance
                  const today = new Date();
                  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
                  const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
                  
                  completedToday = workReadinessData.filter(w => {
                    if (!w.submitted_at) return false;
                    const submissionDate = new Date(w.submitted_at);
                    return submissionDate >= todayStart && submissionDate <= todayEnd;
                  }).length;
                  
                  complianceRate = teamMembers ? Math.round((completedToday / teamMembers.length) * 100) : 0;
                }
              }
            } catch (workReadinessError) {
              console.log('Work readiness table not available:', workReadinessError);
            }

            // Get recent incidents for this team
            let recentIncidents: any[] = [];
            try {
              const { data: incidents } = await dataClient
                .from('incidents')
                .select('id, incident_number, incident_date, severity, description, worker_id')
                .in('worker_id', (teamMembers || []).map(m => m.id))
                .order('created_at', { ascending: false })
                .limit(5);
              
              recentIncidents = incidents || [];
            } catch (incidentError) {
              console.log('Incidents table not available or error fetching incidents:', incidentError);
            }

            // Get active cases for this team
            let activeCases: any[] = [];
            try {
              const { data: cases } = await dataClient
                .from('cases')
                .select('id, case_number, status, priority, worker_id')
                .in('worker_id', (teamMembers || []).map(m => m.id))
                .in('status', ['open', 'in_progress', 'in_rehab', 'assessed'])
                .order('created_at', { ascending: false })
                .limit(5);
              
              activeCases = cases || [];
            } catch (caseError) {
              console.log('Cases table not available or error fetching cases:', caseError);
            }

            // Calculate team stats (same logic as /team-leader)
            const activeMembersCount = teamMembersWithStatus.filter(member => member.role === 'worker').length;
            const onlineTodayCount = teamMembersWithStatus.filter(member => member.hasLoggedInToday).length;
            const onlineRate = activeMembersCount > 0 ? Math.round((onlineTodayCount / activeMembersCount) * 100) : 0;

            console.log(`Final team stats for ${teamLeader.first_name}:`, {
              totalMembers: teamMembersWithStatus.length,
              activeMembers: activeMembersCount,
              onlineToday: onlineTodayCount,
              onlineRate: onlineRate,
              completedToday: completedToday,
              complianceRate: complianceRate
            });

            return {
              _id: teamLeader.id,
              firstName: teamLeader.first_name,
              lastName: teamLeader.last_name,
              email: teamLeader.email,
              team: teamLeader.team,
              managedTeams: teamLeader.managed_teams || [],
              defaultTeam: teamLeader.default_team,
              package: null, // Team leaders can have no package
              lastLogin: teamLeader.updated_at,
              hasLoggedInToday: teamLeaderHasLoggedInToday,
              lastLoginToday: teamLeaderHasLoggedInToday ? teamLeader.updated_at : undefined,
              teamMembers: teamMembersWithStatus,
              teamStats: {
                totalMembers: teamMembersWithStatus.length,
                activeMembers: activeMembersCount,
                onlineToday: onlineTodayCount,
                onlineRate,
                activeCases: activeCases.length,
                recentIncidents: recentIncidents.length,
                // Compliance stats based on work readiness
                completedToday: completedToday,
                complianceRate: complianceRate
              },
              recentIncidents: recentIncidents.slice(0, 3),
              activeCases: activeCases.slice(0, 5)
            };
          } catch (innerErr) {
            console.error(`Error processing team leader ${teamLeader.first_name}:`, innerErr);
            return null;
          }
        })
      );

      // Filter out null results and ensure type safety
      const validTeamLeaders = teamLeadersWithMembers.filter((leader): leader is NonNullable<typeof leader> => leader !== null);

      // Calculate overall statistics
      const overall = validTeamLeaders.reduce((acc, teamLeader) => {
        acc.totalTeamLeaders += 1;
        acc.totalWorkers += teamLeader.teamStats.totalMembers;
        if (teamLeader.hasLoggedInToday === true) acc.onlineTeamLeaders += 1;
        acc.onlineWorkers += teamLeader.teamStats.onlineToday;
        acc.totalActiveCases += teamLeader.teamStats.activeCases;
        acc.totalRecentIncidents += teamLeader.teamStats.recentIncidents;
        return acc;
      }, {
          totalTeamLeaders: 0,
          totalWorkers: 0,
          onlineTeamLeaders: 0,
          onlineWorkers: 0,
          totalActiveCases: 0,
          totalRecentIncidents: 0
      });

      console.log('Team leader monitoring data fetched successfully:', {
        totalTeamLeaders: overall.totalTeamLeaders,
        totalWorkers: overall.totalWorkers,
        onlineTeamLeaders: overall.onlineTeamLeaders,
        onlineWorkers: overall.onlineWorkers
      });

      setData({
        overall,
        teamLeaders: validTeamLeaders,
        lastUpdated: new Date().toISOString()
      });

      // Fetch KPI data after basic data is loaded
      if (validTeamLeaders.length > 0) {
        await fetchKPIData(validTeamLeaders);
      }
    } catch (err: any) {
      console.error('Error fetching team leader data:', err);
      setError(err.message || 'Failed to fetch team leader data');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (hasLoggedIn: boolean | null) => {
    return hasLoggedIn === true ? 'success' : 'default';
  };

  const getStatusIcon = (hasLoggedIn: boolean | null) => {
    return hasLoggedIn === true ? <CheckCircle fontSize="small" /> : <Schedule fontSize="small" />;
  };

  // KPI helper functions
  const getKPIButtonColor = (rating: string) => {
    switch (rating) {
      case 'Excellent': return 'success';
      case 'Good': return 'primary';
      case 'Average': return 'warning';
      case 'Needs Improvement': return 'error';
      case 'Not Started': return 'default';
      case 'On Track': return 'info';
      default: return 'default';
    }
  };

  const getKPIIcon = (rating: string) => {
    switch (rating) {
      case 'Excellent': return <EmojiEvents sx={{ fontSize: 20 }} />;
      case 'Good': return <TrendingUp sx={{ fontSize: 20 }} />;
      case 'Average': return <Assessment sx={{ fontSize: 20 }} />;
      case 'Needs Improvement': return <TrendingDown sx={{ fontSize: 20 }} />;
      case 'Not Started': return <Info sx={{ fontSize: 20 }} />;
      case 'On Track': return <CheckCircle sx={{ fontSize: 20 }} />;
      default: return <Assessment sx={{ fontSize: 20 }} />;
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };


  const formatTimeAgo = (lastLogin?: string) => {
    if (!lastLogin) return 'Never logged in';
    const now = new Date();
    const loginTime = new Date(lastLogin);
    const diffMs = now.getTime() - loginTime.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (diffHours > 24) {
      return `${Math.floor(diffHours / 24)} days ago`;
    } else if (diffHours > 0) {
      return `${diffHours}h ${diffMinutes}m ago`;
    } else {
      return `${diffMinutes}m ago`;
    }
  };

  const filteredTeamLeaders = data?.teamLeaders.filter(leader =>
    leader.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    leader.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    leader.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    leader.team.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  // Pagination logic
  const totalPages = Math.ceil(filteredTeamLeaders.length / teamsPerPage);
  const startIndex = (currentPage - 1) * teamsPerPage;
  const endIndex = startIndex + teamsPerPage;
  const paginatedTeamLeaders = filteredTeamLeaders.slice(startIndex, endIndex);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const handleViewDetails = (teamLeader: TeamLeader) => {
    setSelectedTeamLeader(teamLeader);
    setMembersCurrentPage(1); // Reset to first page when opening new team details
    setDetailsDialogOpen(true);
  };

  const formatLastLogin = (lastLogin?: string) => {
    if (!lastLogin) return 'Never';
    const date = new Date(lastLogin);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  if (!user) {
    return (
      <LayoutWithSidebar>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
          <Typography variant="h6" color="text.secondary">
            Please log in to access the monitoring dashboard
          </Typography>
        </Box>
      </LayoutWithSidebar>
    );
  }

  if (loading) {
    return (
      <LayoutWithSidebar>
        <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" minHeight="50vh">
          <CircularProgress size={60} />
          <Typography variant="h6" sx={{ mt: 2, color: 'text.secondary' }}>
            Loading Team Leader Monitoring...
          </Typography>
          <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
            Fetching team leaders and member data
          </Typography>
        </Box>
      </LayoutWithSidebar>
    );
  }

  return (
    <LayoutWithSidebar>
      <Box sx={{ 
        p: { xs: 1, sm: 2, md: 3 }, 
        minHeight: '100vh',
        background: { xs: 'transparent', md: 'transparent' },
        fontFamily: { xs: '-apple-system BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', md: 'inherit' },
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill: "%23000000" fill-opacity="0.02"%3E%3Ccircle cx="30" cy="30" r="2"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
          zIndex: 0
        }
      }}>
        {/* Enhanced Professional Header */}
        <Box sx={{ 
          mb: 4, // Consistent spacing
          position: 'relative', 
          zIndex: 1,
          borderRadius: 3,
          overflow: 'hidden',
          pb: 2, // Padding for divider space
          '&::after': {
            content: '""',
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '1px',
            background: 'linear-gradient(90deg, transparent 0%, rgba(123, 104, 238, 0.2) 20%, rgba(123, 104, 238, 0.3) 50%, rgba(123, 104, 238, 0.2) 80%, transparent 100%)',
            opacity: 0.8
          }
        }}>
          <Box sx={{ mb: 4 }}>
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'flex-start', 
              mb: 3
            }}>
              <Box sx={{ textAlign: { xs: 'center', md: 'left' }, flex: 1 }}>
                <Typography variant="h4" component="h1" gutterBottom sx={{ 
                  fontSize: { xs: '1.75rem', md: '2.25rem' },
                  fontWeight: 700,
                  lineHeight: 1.2,
                  letterSpacing: '-0.025em',
                  color: '#1a202c',
                  mb: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2
                }}>
                  <Group sx={{ fontSize: { xs: '1.5rem', md: '2rem' }, color: '#7B68EE' }} />
                  Team Leader Monitoring
                </Typography>
                <Typography sx={{ 
                  fontSize: { xs: '0.875rem', md: '1rem' },
                  fontWeight: 400,
                  color: '#6b7280',
                  mb: 2,
                  maxWidth: { xs: '100%', md: '600px' }
                }}>
                  Comprehensive oversight of team leaders and their members • Monitor team performance and worker engagement
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Chip 
                    label={`${data?.overall.totalTeamLeaders || 0} Teams`}
                    sx={{ 
                      background: 'rgba(123, 104, 238, 0.1)',
                      color: '#5A4FCF',
                      fontWeight: 600,
                      borderRadius: '16px'
                    }} 
                  />
                  <Chip 
                    label={`${data?.overall.totalWorkers || 0} Workers`}
                    sx={{ 
                      background: 'rgba(32, 178, 170, 0.1)',
                      color: '#008B8B',
                      fontWeight: 600,
                      borderRadius: '16px'
                    }} 
                  />
                </Box>
              </Box>
              
              <Box sx={{ display: 'flex', gap: 2, mt: { xs: 2, md: 0 } }}>
                <Tooltip title={refreshing ? "Refreshing data..." : "Refresh all data"}>
                  <IconButton 
                    onClick={handleRefresh}
                    disabled={refreshing}
                    sx={{ 
                      color: refreshing ? '#7B68EE' : '#64748b',
                      backgroundColor: refreshing ? 'rgba(123, 104, 238, 0.1)' : 'transparent',
                      '&:hover': { 
                        backgroundColor: refreshing ? 'rgba(123, 104, 238, 0.15)' : '#f1f5f9' 
                      },
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <Refresh sx={{ 
                      fontSize: 24, 
                      animation: refreshing ? 'spin 1s linear infinite' : 'none',
                      '@keyframes spin': {
                        '0%': { transform: 'rotate(0deg)' },
                        '100%': { transform: 'rotate(360deg)' },
                      }
                    }} />
                  </IconButton>
                </Tooltip>
                <Button
                  variant="outlined"
                  startIcon={<Search />}
                  onClick={() => {}}
                  sx={{ 
                    borderRadius: '12px',
                    padding: '12px 20px',
                    background: 'rgba(255, 255, 255, 0.9)',
                    border: '2px solid rgba(123, 104, 238, 0.2)',
                    color: '#5A4FCF',
                    fontWeight: 600,
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    '&:hover': {
                      border: '2px solid rgba(123, 104, 238, 0.4)',
                      background: 'rgba(123, 104, 238, 0.05)',
                      transform: 'translateY(-2px)',
                      boxShadow: '0 8px 25px rgba(123, 104, 238, 0.2)'
                    }
                  }}
                >
                  Search Teams
                </Button>
              </Box>
            </Box>
          </Box>
        </Box>
        {/* Enhanced Overview Cards */}
        {data?.overall && (
          <Box sx={{ 
            mb: 4, // Consistent spacing
            position: 'relative', 
            zIndex: 1,
            pb: 2, // Padding for divider space
            '&::after': {
              content: '""',
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '1px',
              background: 'linear-gradient(90deg, transparent 0%, rgba(123, 104, 238, 0.1) 30%, rgba(123, 104, 238, 0.2) 50%, rgba(123, 104, 238, 0.1) 70%, transparent 100%)',
              opacity: 0.6
            }
          }}>
            <Grid container spacing={2} justifyContent="center">
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ 
                  borderRadius: '16px',
                  border: '1px solid rgba(0, 0, 0, 0.06)',
                  background: 'rgba(255, 255, 255, 0.95)',
                  backdropFilter: 'blur(20px)',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15), 0 4px 10px rgba(0, 0, 0, 0.09)'
                  }
                }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box>
                        <Typography sx={{ 
                          fontSize: '1.75rem',
                          fontWeight: 700,
                          color: '#111827',
                          lineHeight: 1.2,
                          mb: 0.5
                        }}>
                          {data.overall.totalTeamLeaders}
                        </Typography>
                        <Typography sx={{ 
                          fontSize: '0.875rem',
                          fontWeight: 500,
                          color: '#6b7280',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em'
                        }}>
                          Total Team Leaders
                        </Typography>
                      </Box>
                      <Box sx={{ 
                        width: 56, 
                        height: 56, 
                        borderRadius: '14px', 
                        background: 'linear-gradient(135deg, #7B68EE 0%, #5A4FCF 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 4px 12px rgba(123, 104, 238, 0.25), 0 2px 6px rgba(123, 104, 238, 0.15)',
                        transition: 'all 0.2s ease'
                      }}>
                        <Group sx={{ fontSize: 24, color: 'white' }} />
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ 
                  borderRadius: '16px',
                  border: '1px solid rgba(0, 0, 0, 0.06)',
                  background: 'rgba(255, 255, 255, 0.95)',
                  backdropFilter: 'blur(20px)',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15), 0 4px 10px rgba(0, 0, 0, 0.09)'
                  }
                }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box>
                        <Typography sx={{ 
                          fontSize: '1.75rem',
                          fontWeight: 700,
                          color: '#111827',
                          lineHeight: 1.2,
                          mb: 0.5
                        }}>
                          {data.overall.totalWorkers}
                        </Typography>
                        <Typography sx={{ 
                          fontSize: '0.875rem',
                          fontWeight: 500,
                          color: '#6b7280',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em'
                        }}>
                          Total Workers
                        </Typography>
                      </Box>
                      <Box sx={{ 
                        width: 56, 
                        height: 56, 
                        borderRadius: '14px', 
                        background: 'linear-gradient(135deg, #20B2AA 0%, #008B8B 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 4px 12px rgba(32, 178, 170, 0.25), 0 2px 6px rgba(32, 178, 170, 0.15)',
                        transition: 'all 0.2s ease'
                      }}>
                        <Person sx={{ fontSize: 24, color: 'white' }} />
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ 
                  borderRadius: '16px',
                  border: '1px solid rgba(0, 0, 0, 0.06)',
                  background: 'rgba(255, 255, 255, 0.95)',
                  backdropFilter: 'blur(20px)',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15), 0 4px 10px rgba(0, 0, 0, 0.09)'
                  }
                }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box>
                        <Typography sx={{ 
                          fontSize: '1.75rem',
                          fontWeight: 700,
                          color: '#111827',
                          lineHeight: 1.2,
                          mb: 0.5
                        }}>
                          {data.overall.totalActiveCases}
                        </Typography>
                        <Typography sx={{ 
                          fontSize: '0.875rem',
                          fontWeight: 500,
                          color: '#6b7280',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em'
                        }}>
                          Active Cases
                        </Typography>
                      </Box>
                      <Box sx={{ 
                        width: 56, 
                        height: 56, 
                        borderRadius: '14px', 
                        background: 'linear-gradient(135deg, #FF8C00 0%, #FF7F00 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 4px 12px rgba(255, 140, 0, 0.25), 0 2px 6px rgba(255, 140, 0, 0.15)',
                        transition: 'all 0.2s ease'
                      }}>
                        <Schedule sx={{ fontSize: 24, color: 'white' }} />
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ 
                  borderRadius: '16px',
                  border: '1px solid rgba(0, 0, 0, 0.06)',
                  background: 'rgba(255, 255, 255, 0.95)',
                  backdropFilter: 'blur(20px)',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15), 0 4px 10px rgba(0, 0, 0, 0.09)'
                  }
                }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box>
                        <Typography sx={{ 
                          fontSize: '1.75rem',
                          fontWeight: 700,
                          color: '#111827',
                          lineHeight: 1.2,
                          mb: 0.5
                        }}>
                          {data.overall.totalRecentIncidents}
                        </Typography>
                        <Typography sx={{ 
                          fontSize: '0.875rem',
                          fontWeight: 500,
                          color: '#6b7280',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em'
                        }}>
                          Recent Incidents
                        </Typography>
                      </Box>
                      <Box sx={{ 
                        width: 56, 
                        height: 56, 
                        borderRadius: '14px', 
                        background: 'linear-gradient(135deg, #FF6B6B 0%, #E55555 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 4px 12px rgba(255, 107, 107, 0.25), 0 2px 6px rgba(255, 107, 107, 0.15)',
                        transition: 'all 0.2s ease'
                      }}>
                        <Warning sx={{ fontSize: 24, color: 'white' }} />
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        )}

        {/* Enhanced Tabs Section */}
        <Box sx={{ 
          mb: 4, 
          position: 'relative', 
          zIndex: 1,
          borderRadius: 3,
          overflow: 'hidden',
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
          border: '1px solid rgba(0, 0, 0, 0.06)'
        }}>
          <Tabs 
            value={activeTab} 
            onChange={handleTabChange}
            sx={{
              '& .MuiTabs-indicator': {
                backgroundColor: '#7B68EE',
                height: 3,
                borderRadius: '2px 2px 0 0'
              },
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '1rem',
                minHeight: 60,
                color: '#6b7280',
                '&.Mui-selected': {
                  color: '#7B68EE'
                }
              }
            }}
          >
            <Tab 
              icon={<Group sx={{ fontSize: 20 }} />} 
              iconPosition="start"
              label="Team Overview" 
            />
            <Tab 
              icon={<Analytics sx={{ fontSize: 20 }} />} 
              iconPosition="start"
              label="KPI Performance" 
            />
            <Tab 
              icon={<Insights sx={{ fontSize: 20 }} />} 
              iconPosition="start"
              label="Analytics Dashboard" 
            />
          </Tabs>
        </Box>

        {/* Error Alerts */}
          {error && (
            <Alert 
              severity="error" 
              sx={{ mb: 3 }}
              onClose={() => setError(null)}
              action={
                <Button color="inherit" size="small" onClick={fetchData}>
                  Retry
                </Button>
              }
            >
              {error}
            </Alert>
          )}

          {kpiError && (
            <Alert 
              severity="info" 
              sx={{ mb: 3 }}
              onClose={() => setKpiError(null)}
              action={
                <Button color="inherit" size="small" onClick={() => data && fetchKPIData(data.teamLeaders)}>
                  Retry KPI
                </Button>
              }
            >
              <Typography variant="body2">
                <strong>KPI Data Status:</strong> {kpiError}
                <br />
                <small>KPI data will be available when backend is connected.</small>
              </Typography>
            </Alert>
          )}

        {/* Tab Content */}
        {activeTab === 0 && (
          <Box>
            {/* Original Team Overview Content */}

          {/* Enhanced Statistics Overview */}
          {data && (
            <Box sx={{ mb: 5 }}>
              <Typography variant="h5" sx={{ mb: 3, fontWeight: 600 }}>
                Overview Dashboard
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6} md={3}>
                  <Card sx={{ 
                    borderRadius: 3,
                    overflow: 'hidden',
                    height: 140,
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    position: 'relative'
                  }}>
                    <CardContent sx={{ position: 'relative', zIndex: 2 }}>
                      <Box display="flex" alignItems="center" justifyContent="space-between">
                        <Box>
                          <Typography sx={{ opacity: 0.9, fontSize: '0.875rem', fontWeight: 500 }}>
                            Team Leaders
                          </Typography>
                          <Typography variant="h3" sx={{ fontWeight: 700, my: 1 }}>
                            {data.overall.totalTeamLeaders}
                          </Typography>
                          <Typography sx={{ opacity: 0.8, fontSize: '0.75rem' }}>
                            {data.overall.onlineTeamLeaders} online today
                          </Typography>
                        </Box>
                        <Avatar sx={{ 
                          bgcolor: 'rgba(255,255,255,0.2)', 
                          width: 56, 
                          height: 56,
                          backdropFilter: 'blur(10px)'
                        }}>
                          <Person sx={{ fontSize: 28 }} />
                        </Avatar>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <Card sx={{ 
                    borderRadius: 3,
                    overflow: 'hidden',
                    height: 140,
                    background: 'linear-gradient(135deg, #56ab2f 0%, #a8e6cf 100%)',
                    color: 'white',
                    position: 'relative'
                  }}>
                    <CardContent sx={{ position: 'relative', zIndex: 2 }}>
                      <Box display="flex" alignItems="center" justifyContent="space-between">
                        <Box>
                          <Typography sx={{ opacity: 0.9, fontSize: '0.875rem', fontWeight: 500 }}>
                            Total Workers
                          </Typography>
                          <Typography variant="h3" sx={{ fontWeight: 700, my: 1 }}>
                            {data.overall.totalWorkers}
                          </Typography>
                          <Typography sx={{ opacity: 0.8, fontSize: '0.75rem' }}>
                            {data.overall.onlineWorkers} online today
                          </Typography>
                        </Box>
                        <Avatar sx={{ 
                          bgcolor: 'rgba(255,255,255,0.2)', 
                          width: 56, 
                          height: 56,
                          backdropFilter: 'blur(10px)'
                        }}>
                          <Group sx={{ fontSize: 28 }} />
                        </Avatar>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <Card sx={{ 
                    borderRadius: 3,
                    overflow: 'hidden',
                    height: 140,
                    background: 'linear-gradient(135deg, #ff9500 0%, #ffed4e 100%)',
                    color: 'white',
                    position: 'relative'
                  }}>
                    <CardContent sx={{ position: 'relative', zIndex: 2 }}>
                      <Box display="flex" alignItems="center" justifyContent="space-between">
                        <Box>
                          <Typography sx={{ opacity: 0.9, fontSize: '0.875rem', fontWeight: 500 }}>
                            Active Cases
                          </Typography>
                          <Typography variant="h3" sx={{ fontWeight: 700, my: 1 }}>
                            {data.overall.totalActiveCases}
                          </Typography>
                          <Typography sx={{ opacity: 0.8, fontSize: '0.75rem' }}>
                            Requiring attention
                          </Typography>
                        </Box>
                        <Avatar sx={{ 
                          bgcolor: 'rgba(255,255,255,0.2)', 
                          width: 56, 
                          height: 56,
                          backdropFilter: 'blur(10px)'
                        }}>
                          <Assignment sx={{ fontSize: 28 }} />
                        </Avatar>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <Card sx={{ 
                    borderRadius: 3,
                    overflow: 'hidden',
                    height: 140,
                    background: 'linear-gradient(135deg, #ff416c 0%, #ff4b2b 100%)',
                    color: 'white',
                    position: 'relative'
                  }}>
                    <CardContent sx={{ position: 'relative', zIndex: 2 }}>
                      <Box display="flex" alignItems="center" justifyContent="space-between">
                        <Box>
                          <Typography sx={{ opacity: 0.9, fontSize: '0.875rem', fontWeight: 500 }}>
                            Recent Incidents
                          </Typography>
                          <Typography variant="h3" sx={{ fontWeight: 700, my: 1 }}>
                            {data.overall.totalRecentIncidents}
                          </Typography>
                          <Typography sx={{ opacity: 0.8, fontSize: '0.75rem' }}>
                            Last 7 days
                          </Typography>
                        </Box>
                        <Avatar sx={{ 
                          bgcolor: 'rgba(255,255,255,0.2)', 
                          width: 56, 
                          height: 56,
                          backdropFilter: 'blur(10px)'
                        }}>
                          <Warning sx={{ fontSize: 28 }} />
                        </Avatar>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Box>
          )}

          {/* Simple Search Section */}
          <Card sx={{ mb: 4, borderRadius: 3 }}>
            <CardContent sx={{ py: 2 }}>
              <TextField
                fullWidth
                placeholder="Search teams..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    '& fieldset': {
                      borderColor: 'rgba(0,0,0,0.1)',
                    },
                    '&:hover fieldset': {
                      borderColor: 'primary.main',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: 'primary.main',
                    }
                  }
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search sx={{ color: 'text.secondary' }} />
                    </InputAdornment>
                  ),
                }}
              />
            </CardContent>
          </Card>

          {/* Team Leaders List - Grid Layout with Maximized Spacing */}
          {data && (
            <Box sx={{ 
              display: 'grid', 
              gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' },
              gap: 4,
              p: 2
            }}>
              {paginatedTeamLeaders.map((teamLeader, index) => (
                <Card key={teamLeader._id} sx={{ 
                  borderRadius: 3,
                  overflow: 'hidden',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                  transition: 'all 0.3s ease',
                  border: '1px solid rgba(0,0,0,0.06)',
                  backgroundColor: '#ffffff',
                  minHeight: 320,
                  display: 'flex',
                  flexDirection: 'column',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
                    border: '1px solid rgba(0,0,0,0.1)',
                  }
                }}>
                  <CardContent sx={{ p: 4, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                    {/* Header Section */}
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 3 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        {/* Team Leader Avatar */}
                        <Avatar sx={{ 
                          width: 56, 
                          height: 56, 
                          bgcolor: '#e3f2fd',
                          color: '#1976d2',
                          fontSize: 20,
                          fontWeight: 600
                        }}>
                          {teamLeader.firstName.charAt(0)}{teamLeader.lastName.charAt(0)}
                        </Avatar>
                        
                        {/* Team Leader Info */}
                        <Box>
                          <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5, color: '#1a1a1a' }}>
                            {teamLeader.firstName} {teamLeader.lastName}
                          </Typography>
                          <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 500 }}>
                            Team Leader
                          </Typography>
                        </Box>
                      </Box>
                      
                      {/* Action Icons */}
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button size="small" sx={{ minWidth: 'auto', p: 1 }}>
                          <Visibility sx={{ fontSize: 20, color: '#666' }} />
                        </Button>
                        <Button size="small" sx={{ minWidth: 'auto', p: 1 }}>
                          <Assignment sx={{ fontSize: 20, color: '#666' }} />
                        </Button>
                      </Box>
                    </Box>

                    {/* Content Section */}
                    <Box sx={{ mb: 3, flexGrow: 1 }}>
                      {/* Email */}
                      <Typography variant="body1" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1, fontWeight: 500 }}>
                        📧 {teamLeader.email}
                      </Typography>
                      
                      {/* Team */}
                      <Typography variant="body1" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1, fontWeight: 500 }}>
                        🏢 Team: {teamLeader.team || 'No Team Assigned'}
                      </Typography>

                      {/* Stats Row */}
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Typography variant="h4" sx={{ fontWeight: 700, color: teamLeader.teamStats.complianceRate > 0 ? '#2e7d32' : '#666' }}>
                            {teamLeader.teamStats.completedToday}/{teamLeader.teamStats.totalMembers}
                          </Typography>
                          <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 500 }}>
                            Compliance Today
                          </Typography>
                          <Chip
                            label={`${teamLeader.teamStats.complianceRate}%`}
                            size="medium"
                            sx={{ 
                              backgroundColor: teamLeader.teamStats.complianceRate > 50 ? '#e8f5e8' : teamLeader.teamStats.complianceRate > 25 ? '#fff3cd' : '#f5f5f5',
                              color: teamLeader.teamStats.complianceRate > 50 ? '#2e7d32' : teamLeader.teamStats.complianceRate > 25 ? '#996f00' : '#666',
                              fontWeight: 600,
                              height: 28,
                              fontSize: '0.875rem'
                            }}
                          />
                        </Box>

                        {/* KPI Rating Row */}
                        {teamLeader.teamKPI && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 500 }}>
                              Team KPI:
                            </Typography>
                            <Chip
                              icon={getKPIIcon(teamLeader.teamKPI.overallTeamKPI.rating)}
                              label={teamLeader.teamKPI.overallTeamKPI.rating}
                              color={getKPIButtonColor(teamLeader.teamKPI.overallTeamKPI.rating) as any}
                              size="small"
                              sx={{ fontWeight: 600 }}
                            />
                            <Typography variant="body2" sx={{ color: '#6b7280', fontWeight: 500 }}>
                              {teamLeader.teamKPI.teamOverview.averageCompletion}% completion
                            </Typography>
                          </Box>
                        )}
                        
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                          <Typography variant="body1" sx={{ fontWeight: 600 }}>
                            {teamLeader.teamStats.totalMembers} Total
                          </Typography>
                          <Typography variant="body1" sx={{ fontWeight: 600 }}>
                            {teamLeader.teamStats.activeCases} Cases
                          </Typography>
                          <Typography variant="body1" sx={{ fontWeight: 600 }}>
                            {teamLeader.teamStats.recentIncidents} Incidents
                          </Typography>
                        </Box>
                      </Box>

                      {/* Status */}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                        <Chip
                          icon={getStatusIcon(teamLeader.hasLoggedInToday)}
                          label={teamLeader.hasLoggedInToday === true ? 'Leader Online' : 'Leader Offline'}
                          size="medium"
                          sx={{ 
                            fontWeight: 600, 
                            height: 32,
                            backgroundColor: teamLeader.hasLoggedInToday === true ? '#4caf50' : '#f5f5f5',
                            color: teamLeader.hasLoggedInToday === true ? '#ffffff' : '#666666',
                            '& .MuiChip-icon': {
                              color: teamLeader.hasLoggedInToday === true ? '#ffffff' : '#666666'
                            }
                          }}
                        />
                        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                          {formatTimeAgo(teamLeader.lastLoginToday)}
                        </Typography>
                      </Box>
                    </Box>

                    {/* Footer Actions */}
                    <Box sx={{ display: 'flex', gap: 2, mt: 'auto' }}>
                      <Button
                        variant="outlined"
                        startIcon={<Visibility />}
                        onClick={() => handleViewDetails(teamLeader)}
                        sx={{
                          borderRadius: 2,
                          borderColor: '#ddd',
                          color: '#333',
                          px: 3,
                          py: 1.5,
                          fontWeight: 600,
                          '&:hover': {
                            borderColor: '#1976d2',
                            backgroundColor: '#f5f5f5'
                          }
                        }}
                      >
                        View Details
                      </Button>
                      <Button
                        variant="outlined"
                        startIcon={<Assignment />}
                        sx={{
                          borderRadius: 2,
                          borderColor: '#ddd',
                          color: '#333',
                          px: 3,
                          py: 1.5,
                          fontWeight: 600,
                          '&:hover': {
                            borderColor: '#1976d2',
                            backgroundColor: '#f5f5f5'
                          }
                        }}
                      >
                        Manage Team
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              ))}
              
              {filteredTeamLeaders.length === 0 && !loading && (
                <Card sx={{  }}>
                  <CardContent>
                    <Box textAlign="center" py={3}>
                      <Typography color="text.secondary">
                        {searchTerm ? 'No team leaders match your search' : 'No team leaders found'}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              )}
              
              {/* Pagination - Only show if more than 5 teams */}
              {filteredTeamLeaders.length > 5 && (
                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'center', 
                  alignItems: 'center', 
                  mt: 3,
                  py: 2,
                  px: 3,
                  backgroundColor: 'rgba(0,0,0,0.02)',
                  borderRadius: 2,
                  border: '1px solid rgba(0,0,0,0.06)'
                }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mr: 2 }}>
                    Showing {startIndex + 1}-{Math.min(endIndex, filteredTeamLeaders.length)} of {filteredTeamLeaders.length} teams
                  </Typography>
                  <Pagination 
                    count={totalPages} 
                    page={currentPage}
                    onChange={(_, page) => setCurrentPage(page)}
                    color="primary"
                    size="small"
                    showFirstButton
                    showLastButton
                  />
                </Box>
              )}
            </Box>
          )}

          {/* Enhanced Team Leader Details Dialog */}
          <Dialog 
            open={detailsDialogOpen} 
            onClose={() => setDetailsDialogOpen(false)}
            maxWidth="lg"
            fullWidth
            sx={{
              '& .MuiDialog-paper': {
                borderRadius: 4,
                boxShadow: '0 8px 40px rgba(0,0,0,0.2)',
                overflow: 'hidden'
              }
            }}
          >
            <DialogTitle sx={{ 
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              py: 3,
              display: 'flex',
              alignItems: 'center',
              gap: 2
            }}>
              <Avatar sx={{ 
                bgcolor: 'rgba(255,255,255,0.2)', 
                width: 48, 
                height: 48,
                backdropFilter: 'blur(10px)'
              }}>
                {selectedTeamLeader && selectedTeamLeader.firstName.charAt(0)}{selectedTeamLeader && selectedTeamLeader.lastName.charAt(0)}
              </Avatar>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  {selectedTeamLeader && `${selectedTeamLeader.firstName} ${selectedTeamLeader.lastName}`}
                </Typography>
                <Typography variant="subtitle1" sx={{ opacity: 0.9, fontWeight: 300 }}>
                  Team Leader Details & Member Management
                </Typography>
              </Box>
            </DialogTitle>
            <DialogContent sx={{ p: 4 }}>
              {selectedTeamLeader && (
                <Box>
                  {/* Enhanced Team Statistics */}
                  <Box sx={{ 
                    mb: 4,
                    p: 3,
                    borderRadius: 3,
                    background: 'linear-gradient(145deg, #f8fafc 0%, #e2e8f0 100%)',
                    border: '1px solid rgba(0,0,0,0.06)'
                  }}>
                    <Typography variant="h5" sx={{ mb: 3, fontWeight: 700 }}>
                      Team Statistics Overview
                    </Typography>
                    <Grid container spacing={3}>
                      <Grid item xs={12} sm={6} md={3}>
                        <Card sx={{ 
                          borderRadius: 3,
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          color: 'white',
                          overflow: 'hidden'
                        }}>
                          <CardContent sx={{ py: 2 }}>
                            <Typography sx={{ opacity: 0.9, fontSize: '0.875rem', fontWeight: 500 }}>
                              Total Members
                            </Typography>
                            <Typography variant="h3" sx={{ fontWeight: 700, my: 1 }}>
                              {selectedTeamLeader.teamStats.totalMembers}
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <Card sx={{ 
                          borderRadius: 3,
                          background: 'linear-gradient(135deg, #56ab2f 0%, #a8e6cf 100%)',
                          color: 'white',
                          overflow: 'hidden'
                        }}>
                          <CardContent sx={{ py: 2 }}>
                            <Typography sx={{ opacity: 0.9, fontSize: '0.875rem', fontWeight: 500 }}>
                              Online Today
                            </Typography>
                            <Typography variant="h3" sx={{ fontWeight: 700, my: 1 }}>
                              {selectedTeamLeader.teamStats.onlineToday}
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <Card sx={{ 
                          borderRadius: 3,
                          background: 'linear-gradient(135deg, #ff9500 0%, #ffed4e 100%)',
                          color: 'white',
                          overflow: 'hidden'
                        }}>
                          <CardContent sx={{ py: 2 }}>
                            <Typography sx={{ opacity: 0.9, fontSize: '0.875rem', fontWeight: 500 }}>
                              Active Cases
                            </Typography>
                            <Typography variant="h3" sx={{ fontWeight: 700, my: 1 }}>
                              {selectedTeamLeader.teamStats.activeCases}
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <Card sx={{ 
                          borderRadius: 3,
                          background: 'linear-gradient(135deg, #ff416c 0%, #ff4b2b 100%)',
                          color: 'white',
                          overflow: 'hidden'
                        }}>
                          <CardContent sx={{ py: 2 }}>
                            <Typography sx={{ opacity: 0.9, fontSize: '0.875rem', fontWeight: 500 }}>
                              Recent Incidents
                            </Typography>
                            <Typography variant="h3" sx={{ fontWeight: 700, my: 1 }}>
                              {selectedTeamLeader.teamStats.recentIncidents}
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                    </Grid>
                  </Box>

                  {/* Team Members */}
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="h6" gutterBottom>
                      All Team Members ({selectedTeamLeader.teamMembers.length})
                    </Typography>
                  </Box>
                  
                  {/* Paginated Team Members Table */}
                  {(() => {
                    const membersTotalPages = Math.ceil(selectedTeamLeader.teamMembers.length / membersPerPage);
                    const membersStartIndex = (membersCurrentPage - 1) * membersPerPage;
                    const membersEndIndex = membersStartIndex + membersPerPage;
                    const paginatedMembers = selectedTeamLeader.teamMembers.slice(membersStartIndex, membersEndIndex);
                    
                    return (
                      <>
                        <TableContainer 
                          component={Paper} 
                          variant="outlined" 
                          sx={{  }}
                        >
                          <Table>
                            <TableHead sx={{ bgcolor: 'grey.200' }}>
                              <TableRow>
                                <TableCell>Member</TableCell>
                                <TableCell>Role</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell>Last Login</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {paginatedMembers.map((member) => (
                          <TableRow key={member._id} hover>
                            <TableCell>
                              <Box display="flex" alignItems="center" gap={1}>
                                <Badge
                                  color={getStatusColor(member.hasLoggedInToday)}
                                  variant="dot"
                                >
                                  <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                                    {member.firstName.charAt(0)}{member.lastName.charAt(0)}
                                  </Avatar>
                                </Badge>
                                <Box>
                                  <Typography variant="body2" fontWeight={500}>
                                    {member.firstName} {member.lastName}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {member.email}
                                  </Typography>
                               </Box>
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Chip label={member.role} size="small" variant="outlined" />
                            </TableCell>
                            <TableCell>
                              <Chip
                                icon={getStatusIcon(member.hasLoggedInToday)}
                                label={member.hasLoggedInToday ? 'Online Today' : 'Offline'}
                                color={getStatusColor(member.hasLoggedInToday)}
                                size="small"
                              />
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">
                                {formatLastLogin(member.lastLoginToday)}
                              </Typography>
                            </TableCell>
                          </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </TableContainer>
                          
                          {/* Team Members Pagination - Only show if more than 10 members */}
                          {selectedTeamLeader.teamMembers.length > 10 && (
                            <Box sx={{ 
                              display: 'flex', 
                              justifyContent: 'space-between', 
                              alignItems: 'center', 
                              mt: 2,
                              py: 2,
                              px: 2,
                              backgroundColor: 'rgba(0,0,0,0.02)',
                              borderRadius: 2,
                              border: '1px solid rgba(0,0,0,0.06)'
                            }}>
                              <Typography variant="body2" color="text.secondary">
                                Showing {membersStartIndex + 1}-{Math.min(membersEndIndex, selectedTeamLeader.teamMembers.length)} of {selectedTeamLeader.teamMembers.length} members
                              </Typography>
                              <Pagination 
                                count={membersTotalPages} 
                                page={membersCurrentPage}
                                onChange={(_, page) => setMembersCurrentPage(page)}
                                color="primary"
                                size="small"
                                showFirstButton
                                showLastButton
                              />
                            </Box>
                          )}
                        </>
                      );
                    })()}

                  {/* KPI Performance Section */}
                  {selectedTeamLeader.teamKPI && (
                    <Box sx={{ mt: 4 }}>
                      <Typography variant="h5" sx={{ mb: 3, fontWeight: 700, color: '#1e293b' }}>
                        Team KPI Performance
                      </Typography>
                      
                      <Grid container spacing={3} sx={{ mb: 3 }}>
                        {/* Overall KPI Rating */}
                        <Grid item xs={12} sm={6}>
                          <Card sx={{ borderRadius: 3, boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)' }}>
                            <CardContent sx={{ p: 3 }}>
                              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: '#1e293b' }}>
                                Overall Team KPI
                              </Typography>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Chip
                                  icon={getKPIIcon(selectedTeamLeader.teamKPI.overallTeamKPI.rating)}
                                  label={selectedTeamLeader.teamKPI.overallTeamKPI.rating}
                                  color={getKPIButtonColor(selectedTeamLeader.teamKPI.overallTeamKPI.rating) as any}
                                  size="medium"
                                  sx={{ fontWeight: 600, fontSize: '1rem', height: '36px' }}
                                />
                                <Typography variant="body2" sx={{ color: '#6b7280' }}>
                                  {selectedTeamLeader.teamKPI.overallTeamKPI.description}
                                </Typography>
                              </Box>
                            </CardContent>
                          </Card>
                        </Grid>

                        {/* Completion Rate */}
                        <Grid item xs={12} sm={6}>
                          <Card sx={{ borderRadius: 3, boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)' }}>
                            <CardContent sx={{ p: 3 }}>
                              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: '#1e293b' }}>
                                Completion Rate
                              </Typography>
                              <Box sx={{ mb: 2 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                  <Typography variant="body2" sx={{ color: '#6b7280', fontWeight: 500 }}>
                                    {selectedTeamLeader.teamKPI.teamOverview.averageCompletion}%
                                  </Typography>
                                  <Typography variant="caption" sx={{ color: '#6b7280' }}>
                                    Average across all members
                                  </Typography>
                                </Box>
                                <LinearProgress
                                  variant="determinate"
                                  value={selectedTeamLeader.teamKPI.teamOverview.averageCompletion}
                                  sx={{
                                    height: 8,
                                    borderRadius: 4,
                                    backgroundColor: '#e5e7eb',
                                    '& .MuiLinearProgress-bar': {
                                      borderRadius: 4,
                                      backgroundColor: selectedTeamLeader.teamKPI.overallTeamKPI.color,
                                    }
                                  }}
                                />
                              </Box>
                            </CardContent>
                          </Card>
                        </Grid>
                      </Grid>

                      {/* Team Overview Stats */}
                      <Card sx={{ borderRadius: 3, boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)' }}>
                        <CardContent sx={{ p: 3 }}>
                          <Typography variant="h6" sx={{ mb: 3, fontWeight: 600, color: '#1e293b' }}>
                            Team Performance Overview
                          </Typography>
                          <Grid container spacing={3}>
                            <Grid item xs={6} sm={3}>
                              <Box sx={{ textAlign: 'center' }}>
                                <Typography variant="h4" sx={{ fontWeight: 700, color: '#1e293b', mb: 1 }}>
                                  {selectedTeamLeader.teamKPI.teamOverview.totalMembers}
                                </Typography>
                                <Typography variant="body2" sx={{ color: '#6b7280' }}>
                                  Total Members
                                </Typography>
                              </Box>
                            </Grid>
                            <Grid item xs={6} sm={3}>
                              <Box sx={{ textAlign: 'center' }}>
                                <Typography variant="h4" sx={{ fontWeight: 700, color: '#1e293b', mb: 1 }}>
                                  {selectedTeamLeader.teamKPI.teamOverview.activeMembers}
                                </Typography>
                                <Typography variant="body2" sx={{ color: '#6b7280' }}>
                                  Active Members
                                </Typography>
                              </Box>
                            </Grid>
                            <Grid item xs={6} sm={3}>
                              <Box sx={{ textAlign: 'center' }}>
                                <Typography variant="h4" sx={{ fontWeight: 700, color: '#1e293b', mb: 1 }}>
                                  {selectedTeamLeader.teamKPI.teamOverview.averageCompletion}%
                                </Typography>
                                <Typography variant="body2" sx={{ color: '#6b7280' }}>
                                  Average Completion
                                </Typography>
                              </Box>
                            </Grid>
                            <Grid item xs={6} sm={3}>
                              <Box sx={{ textAlign: 'center' }}>
                                <Typography variant="h4" sx={{ fontWeight: 700, color: '#1e293b', mb: 1 }}>
                                  {selectedTeamLeader.teamKPI.teamOverview.teamKPI}
                                </Typography>
                                <Typography variant="body2" sx={{ color: '#6b7280' }}>
                                  Team KPI Rating
                                </Typography>
                              </Box>
                            </Grid>
                          </Grid>
                        </CardContent>
                      </Card>
                    </Box>
                  )}
                </Box>
              )}
            </DialogContent>
          </Dialog>

          {/* Last Updated */}
          {data && (
            <Box sx={{ mt: 3, textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary">
                Last updated: {new Date(data.lastUpdated).toLocaleString()}
              </Typography>
              </Box>
            )}
          </Box>
        )}

        {/* KPI Performance Tab */}
        {activeTab === 1 && (
          <Box>
            {/* KPI Loading State */}
            {kpiLoading && (
              <Box sx={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                py: 8,
                backgroundColor: 'rgba(255, 255, 255, 0.8)',
                borderRadius: 3,
                mb: 3
              }}>
                <CircularProgress size={60} sx={{ mb: 2, color: '#7B68EE' }} />
                <Typography variant="h6" sx={{ color: '#7B68EE', fontWeight: 600 }}>
                  Loading KPI Performance Data...
                </Typography>
                <Typography variant="body2" sx={{ color: '#6b7280', mt: 1 }}>
                  Fetching team performance metrics
                </Typography>
              </Box>
            )}

            {/* KPI Performance Overview */}
            {!kpiLoading && data && (
              <Box sx={{ mb: 4 }}>
                <Typography variant="h5" sx={{ mb: 3, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Analytics sx={{ color: '#7B68EE' }} />
                  Team KPI Performance Overview
                </Typography>
                
                {/* Overall KPI Stats */}
                <Grid container spacing={3} sx={{ mb: 4 }}>
                  {data.teamLeaders.map((teamLeader) => (
                    <Grid item xs={12} sm={6} md={4} key={teamLeader._id}>
                      <Card sx={{ 
                        borderRadius: 3,
                        overflow: 'hidden',
                        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
                        border: '1px solid rgba(0, 0, 0, 0.06)',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          transform: 'translateY(-4px)',
                          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)'
                        }
                      }}>
                        <CardContent sx={{ p: 3 }}>
                          {/* Team Leader Header */}
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                            <Avatar sx={{ 
                              width: 48, 
                              height: 48, 
                              bgcolor: '#e3f2fd',
                              color: '#1976d2',
                              fontSize: 18,
                              fontWeight: 600
                            }}>
                              {teamLeader.firstName.charAt(0)}{teamLeader.lastName.charAt(0)}
                            </Avatar>
                            <Box sx={{ flex: 1 }}>
                              <Typography variant="h6" sx={{ fontWeight: 700, color: '#1a1a1a', mb: 0.5 }}>
                                {teamLeader.firstName} {teamLeader.lastName}
                              </Typography>
                              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                                {teamLeader.team}
                              </Typography>
                            </Box>
                          </Box>

                          {/* Basic Team Info */}
                          <Box sx={{ mb: 3 }}>
                            <Grid container spacing={2}>
                              <Grid item xs={6}>
                                <Box sx={{ textAlign: 'center', p: 2, backgroundColor: '#f8fafc', borderRadius: 2 }}>
                                  <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b' }}>
                                    {teamLeader.teamMembers.length}
                                  </Typography>
                                  <Typography variant="caption" sx={{ color: '#6b7280' }}>
                                    Total Members
                                  </Typography>
                                </Box>
                              </Grid>
                              <Grid item xs={6}>
                                <Box sx={{ textAlign: 'center', p: 2, backgroundColor: '#f8fafc', borderRadius: 2 }}>
                                  <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b' }}>
                                    {teamLeader.teamMembers.filter(member => member.hasLoggedInToday).length}
                                  </Typography>
                                  <Typography variant="caption" sx={{ color: '#6b7280' }}>
                                    Active Today
                                  </Typography>
                                </Box>
                              </Grid>
                            </Grid>
                          </Box>

                          {/* View Details Button */}
                          <Box sx={{ textAlign: 'center' }}>
                            <Button
                              variant="outlined"
                              size="small"
                              startIcon={<Visibility />}
                              onClick={() => {
                                setSelectedTeamLeader(teamLeader);
                                setDetailsDialogOpen(true);
                              }}
                              sx={{
                                borderRadius: 2,
                                borderColor: '#ddd',
                                color: '#333',
                                fontWeight: 600,
                                '&:hover': {
                                  borderColor: '#7B68EE',
                                  backgroundColor: '#f5f5f5'
                                }
                              }}
                            >
                              View Details
                            </Button>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>

                {/* Individual Team KPI Dashboards */}
                <Typography variant="h5" sx={{ mb: 3, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 2 }}>
                  <BarChart sx={{ color: '#7B68EE' }} />
                  Detailed KPI Dashboards
                </Typography>
                
                <Grid container spacing={3}>
                  {data.teamLeaders.map((teamLeader) => (
                    <Grid item xs={12} key={teamLeader._id}>
                      <Card sx={{ 
                        borderRadius: 3,
                        overflow: 'hidden',
                        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
                        border: '1px solid rgba(0, 0, 0, 0.06)'
                      }}>
                        <CardContent sx={{ p: 0 }}>
                          <Box sx={{ 
                            p: 3, 
                            backgroundColor: '#f8fafc',
                            borderBottom: '1px solid #e5e7eb'
                          }}>
                            <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b' }}>
                              {teamLeader.firstName} {teamLeader.lastName} - Team Performance Dashboard
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#6b7280', mt: 0.5 }}>
                              {teamLeader.team} • {teamLeader.teamMembers.length} members
                            </Typography>
                          </Box>
                          <Box sx={{ p: 3 }}>
                            <TeamKPIDashboard 
                              teamLeaderId={teamLeader._id} 
                              compact={true}
                            />
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            )}
          </Box>
        )}

        {/* Analytics Dashboard Tab */}
        {activeTab === 2 && (
          <Box>
            <Typography variant="h5" sx={{ mb: 3, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 2 }}>
              <Insights sx={{ color: '#7B68EE' }} />
              Advanced Analytics Dashboard
            </Typography>
            
            <Card sx={{ 
              borderRadius: 3,
              overflow: 'hidden',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
              border: '1px solid rgba(0, 0, 0, 0.06)',
              minHeight: 400
            }}>
              <CardContent sx={{ p: 4, textAlign: 'center' }}>
                <Timeline sx={{ fontSize: 80, color: '#e5e7eb', mb: 2 }} />
                <Typography variant="h6" sx={{ color: '#6b7280', mb: 1 }}>
                  Advanced Analytics Coming Soon
                </Typography>
                <Typography variant="body2" sx={{ color: '#9ca3af' }}>
                  Comprehensive analytics dashboard with trends, comparisons, and predictive insights will be available in the next update.
                </Typography>
              </CardContent>
            </Card>
            </Box>
          )}
        </Box>
    </LayoutWithSidebar>
  );
};

export default TeamLeaderMonitoring;
