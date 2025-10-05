import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  Button,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  LinearProgress,
  IconButton,
  Badge,
  Pagination,
  TablePagination
} from '@mui/material';
import {
  CheckCircle,
  Warning,
  Error as ErrorIcon,
  TrendingUp,
  People,
  Send,
  FilterList,
  Clear
} from '@mui/icons-material';
import Toast from '../../components/Toast';
import LayoutWithSidebar from '../../components/LayoutWithSidebar';
import { dataClient } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext.supabase';

interface WorkReadinessData {
  compliance: {
    totalTeamMembers: number;
    submittedAssessments: number;
    complianceRate: number;
    nonCompliantCount: number;
  };
  assessments: Array<{
    _id: string;
    worker: {
      _id: string;
      firstName: string;
      lastName: string;
      email: string;
      team: string;
    };
    fatigueLevel: number;
    painDiscomfort: string;
    painAreas: string[];
    readinessLevel: string;
    mood: string;
    notes: string;
    submittedAt: string;
  }>;
  nonCompliantWorkers: Array<{
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    team: string;
  }>;
  readinessStats: {
    fit: number;
    minor: number;
    not_fit: number;
  };
  fatigueStats: {
    low: number;
    high: number;
  };
  teamMembers?: Array<{
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    team: string;
  }>;
}

// 🔧 Utility Functions
const getReadinessColor = (level: string) => {
  switch (level) {
    case 'fit': return '#22c55e'; // Green for fit
    case 'minor': return '#f59e0b'; // Yellow/Orange for minor concerns
    case 'not_fit': return '#ef4444'; // Red for not fit
    default: return '#6b7280';
  }
};

const getReadinessLabel = (level: string) => {
  switch (level) {
    case 'fit': return 'Fit for Work';
    case 'minor': return 'Minor Concerns';
    case 'not_fit': return 'Not Fit for Work';
    default: return level;
  }
};

// Removed emoticon function for professional UI

// 🔧 Optimized Reusable StatCard Component
const StatCard = React.memo(({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: any; color: string }) => (
  <Card>
    <CardContent>
      <Box display="flex" alignItems="center" mb={1}>
        {icon}
        <Typography variant="h6" sx={{ 
          ml: 1,
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
        }}>{label}</Typography>
      </Box>
      <Typography variant="h4" color={color} sx={{
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
      }}>
        {value}
      </Typography>
    </CardContent>
  </Card>
));

const WorkReadinessDashboard: React.FC = React.memo(() => {
  const { user } = useAuth();
  const [data, setData] = useState<WorkReadinessData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  // Enhanced follow-up tracking with localStorage persistence
  const [recentlySentFollowUps, setRecentlySentFollowUps] = useState<Set<string>>(() => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const storageKey = `followups_${today}`;
      const saved = localStorage.getItem(storageKey);
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch (error) {
      console.warn('Error loading follow-ups from localStorage:', error);
      return new Set();
    }
  });

  // Follow-up State (merged)
  const [followUp, setFollowUp] = useState({
    open: false,
    worker: null as any,
    reason: '',
    message: '',
    sending: false,
  });

  // View Details State
  const [viewDetails, setViewDetails] = useState({
    open: false,
    assessment: null as any,
  });

  // Filtering State
  
  const [fatigueFilter, setFatigueFilter] = useState<string>('all'); // 'all', 'low', 'high'

  // Pagination State for Non-Compliant Workers
  const [nonCompliantPage, setNonCompliantPage] = useState(0);
  const [nonCompliantRowsPerPage] = useState(10);

  // Memoized filtered assessments to prevent unnecessary recalculations
  const filteredAssessments = useMemo(() => {
    if (!data?.assessments) return [];
    
    switch (fatigueFilter) {
      case 'low':
        return data.assessments.filter(a => a.fatigueLevel >= 0 && a.fatigueLevel <= 5);
      case 'high':
        return data.assessments.filter(a => a.fatigueLevel >= 6 && a.fatigueLevel <= 10);
      default:
        return data.assessments;
    }
  }, [data?.assessments, fatigueFilter]);

  // Memoized paginated non-compliant workers
  const paginatedNonCompliantWorkers = useMemo(() => {
    if (!data?.nonCompliantWorkers) return [];
    
    const startIndex = nonCompliantPage * nonCompliantRowsPerPage;
    const endIndex = startIndex + nonCompliantRowsPerPage;
    
    return data.nonCompliantWorkers.slice(startIndex, endIndex);
  }, [data?.nonCompliantWorkers, nonCompliantPage, nonCompliantRowsPerPage]);

  // Memoized total pages calculation
  const totalNonCompliantPages = useMemo(() => {
    if (!data?.nonCompliantWorkers?.length) return 0;
    return Math.ceil(data.nonCompliantWorkers.length / nonCompliantRowsPerPage);
  }, [data?.nonCompliantWorkers?.length, nonCompliantRowsPerPage]);

  // Optimized pagination change handler
  const handleNonCompliantPageChange = useCallback((event: React.ChangeEvent<unknown>, newPage: number) => {
    setNonCompliantPage(newPage - 1); // Pagination component uses 1-based indexing
  }, []);

  const fetchWorkReadinessData = useCallback(async () => {
    try {
      setLoading(true);
      
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      console.log('🔍 Fetching work readiness data for team leader:', user.id);

      // Get team leader's managed teams first
      const { data: teamLeader, error: teamLeaderError } = await dataClient
        .from('users')
        .select('team, managed_teams')
        .eq('id', user.id)
        .single();

      if (teamLeaderError) {
        console.error('Error fetching team leader data:', teamLeaderError);
        throw teamLeaderError;
      }

      // Get all managed teams including current team
      const managedTeams = teamLeader?.managed_teams || [];
      if (teamLeader?.team && !managedTeams.includes(teamLeader.team)) {
        managedTeams.push(teamLeader.team);
      }

      console.log('🔍 Managed teams:', managedTeams);

      // Get team members from all managed teams
      let teamMembers = [];
      if (managedTeams.length > 0) {
        const { data: teamMembersData, error: teamMembersError } = await dataClient
        .from('users')
        .select('*')
        .eq('role', 'worker')
          .eq('is_active', true)
          .in('team', managedTeams);

      if (teamMembersError) {
        console.error('Error fetching team members:', teamMembersError);
        throw teamMembersError;
        }

        teamMembers = teamMembersData || [];
      }

      console.log('🔍 Team members found:', teamMembers?.length || 0);

      const teamMemberIds = teamMembers?.map(member => member.id) || [];

      // Get today's assessments
      const today = new Date().toISOString().split('T')[0];
      
      let assessments = [];
      if (teamMemberIds.length > 0) {
        const { data: assessmentsData, error: assessmentsError } = await dataClient
        .from('work_readiness')
        .select(`
          *,
          worker:users!work_readiness_worker_id_fkey(*)
        `)
        .in('worker_id', teamMemberIds)
        .gte('submitted_at', `${today}T00:00:00.000Z`)
        .lte('submitted_at', `${today}T23:59:59.999Z`)
        .order('submitted_at', { ascending: false });

      if (assessmentsError) {
        console.error('Error fetching assessments:', assessmentsError);
        throw assessmentsError;
        }

        assessments = assessmentsData || [];
      }

      console.log('🔍 Assessments found:', assessments?.length || 0);

      // Calculate compliance
      const totalTeamMembers = teamMembers?.length || 0;
      const submittedAssessments = assessments?.length || 0;
      const complianceRate = totalTeamMembers > 0 ? Math.round((submittedAssessments / totalTeamMembers) * 100) : 0;

      // Get non-compliant workers
      const submittedWorkerIds = assessments?.map(assessment => assessment.worker_id) || [];
      const nonCompliantWorkers = teamMembers?.filter(member => 
        !submittedWorkerIds.includes(member.id)
      ) || [];

      // Group assessments by readiness level
      const readinessStats = {
        fit: assessments?.filter(a => a.readiness_level === 'fit').length || 0,
        minor: assessments?.filter(a => a.readiness_level === 'minor').length || 0,
        not_fit: assessments?.filter(a => a.readiness_level === 'not_fit').length || 0
      };

      // Group assessments by fatigue level ranges (Low: 0-5, High: 6-10)
      const fatigueStats = {
        low: assessments?.filter(a => a.fatigue_level >= 0 && a.fatigue_level <= 5).length || 0,
        high: assessments?.filter(a => a.fatigue_level >= 6 && a.fatigue_level <= 10).length || 0
      };

      // Format assessments to match expected structure
      const formattedAssessments = assessments?.map(assessment => ({
        _id: assessment.id,
        worker: {
          _id: assessment.worker_id,
          firstName: assessment.worker?.first_name || '',
          lastName: assessment.worker?.last_name || '',
          email: assessment.worker?.email || '',
          team: assessment.team || assessment.worker?.team || ''
        },
        fatigueLevel: assessment.fatigue_level,
        painDiscomfort: assessment.pain_discomfort,
        painAreas: assessment.pain_areas || [],
        readinessLevel: assessment.readiness_level,
        mood: assessment.mood,
        notes: assessment.notes || '',
        submittedAt: assessment.submitted_at
      })) || [];

      // Format non-compliant workers
      const formattedNonCompliantWorkers = nonCompliantWorkers.map(worker => ({
        _id: worker.id,
        firstName: worker.first_name,
        lastName: worker.last_name,
        email: worker.email,
        team: worker.team
      }));

      const workReadinessData: WorkReadinessData = {
        compliance: {
          totalTeamMembers,
          submittedAssessments,
          complianceRate,
          nonCompliantCount: nonCompliantWorkers.length
        },
        assessments: formattedAssessments,
        nonCompliantWorkers: formattedNonCompliantWorkers,
        readinessStats,
        fatigueStats,
        teamMembers: teamMembers?.map(member => ({
          _id: member.id,
          firstName: member.first_name,
          lastName: member.last_name,
          email: member.email,
          team: member.team
        })) || []
      };

      setData(workReadinessData);
      setError(null);
      setNonCompliantPage(0); // Reset pagination when data changes
    } catch (err: any) {
      console.error('Error fetching work readiness data:', err);
      // Set empty data structure instead of error
      setData({
        compliance: {
          totalTeamMembers: 0,
          submittedAssessments: 0,
          complianceRate: 0,
          nonCompliantCount: 0
        },
        assessments: [],
        nonCompliantWorkers: [],
        readinessStats: {
          fit: 0,
          minor: 0,
          not_fit: 0
        },
        fatigueStats: {
          low: 0,
          high: 0
        },
        teamMembers: []
      });
      setError(null); // Don't show error, show empty state instead
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchWorkReadinessData();
    
    // Clean up old follow-up data from localStorage
    try {
      const today = new Date().toISOString().split('T')[0];
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('followups_') && key !== `followups_${today}`) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.warn('Error cleaning up old follow-up data:', error);
    }
  }, [fetchWorkReadinessData]);

  const handleFollowUp = useCallback((worker: any) => {
    setFollowUp({
      open: true,
      worker,
      reason: '',
      message: `Hi ${worker.firstName}, please complete your work readiness assessment for today. This is required for team compliance.`,
      sending: false,
    });
  }, []);

  const handleViewDetails = useCallback((assessment: any) => {
    console.log('handleViewDetails called with:', assessment);
    setViewDetails({
      open: true,
      assessment,
    });
    console.log('Dialog state updated, should open now');
  }, []);

  const sendFollowUp = async () => {
    if (!followUp.worker) return;

    try {
      setFollowUp(prev => ({ ...prev, sending: true }));
      
      // Create notification for the worker
      const { error: notificationError } = await dataClient
        .from('notifications')
        .insert([{
          recipient_id: followUp.worker._id,
          sender_id: user?.id,
          type: 'general',
          title: 'Work Readiness Assessment Reminder',
          message: followUp.message,
          priority: 'medium'
        }]);

      if (notificationError) {
        console.error('Error sending notification:', notificationError);
        throw notificationError;
      }

      setToast({
        message: `Follow-up sent successfully to ${followUp.worker.firstName} ${followUp.worker.lastName}!`,
        type: 'success'
      });

      // Update follow-up tracking with localStorage persistence
      const workerId = followUp.worker._id;
      setRecentlySentFollowUps(prev => {
        const newSet = new Set(prev);
        newSet.add(workerId);
        
        // Persist to localStorage
        try {
          const today = new Date().toISOString().split('T')[0];
          const storageKey = `followups_${today}`;
          localStorage.setItem(storageKey, JSON.stringify(Array.from(newSet)));
        } catch (error) {
          console.warn('Error saving follow-ups to localStorage:', error);
        }
        
        return newSet;
      });

      setFollowUp({ open: false, worker: null, reason: '', message: '', sending: false });

      await fetchWorkReadinessData();
    } catch (err: any) {
      console.error('Error sending follow-up:', err);
      setToast({ message: 'Failed to send follow-up. Please try again.', type: 'error' });
    } finally {
      setFollowUp(prev => ({ ...prev, sending: false }));
    }
  };

  // Memoized loading and error states
  const loadingState = useMemo(() => (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
      <CircularProgress />
    </Box>
  ), []);

  const errorState = useMemo(() => (
    <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
  ), [error]);

  const emptyState = useMemo(() => (
    <LayoutWithSidebar>
      <Box sx={{ p: 3 }}>
        <Alert severity="info" sx={{ mb: 2 }}>
          No work readiness data available. The dashboard will show data once team members start submitting assessments.
        </Alert>
      </Box>
    </LayoutWithSidebar>
  ), []);

  if (loading) return loadingState;
  if (error) return errorState;
  if (!data) return emptyState;

  return (
    <LayoutWithSidebar>
      {/* Enhanced CSS Animations */}
      <style>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.7;
            transform: scale(1.2);
          }
        }
        
        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes fadeInScale {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        
        @keyframes shimmer {
          0% {
            background-position: -200px 0;
          }
          100% {
            background-position: calc(200px + 100%) 0;
          }
        }
        
        .card-animation {
          animation: fadeInScale 0.6s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .stagger-animation {
          animation: slideInUp 0.8s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .loading-shimmer {
          background: linear-gradient(
            90deg,
            #f0f0f0 25%,
            #e0e0e0 50%,
            #f0f0f0 75%
          );
          background-size: 200px 100%;
          animation: shimmer 1.5s infinite;
        }
      `}</style>
      
      <Box sx={{ 
        p: { xs: 0, sm: 2, md: 3 }, 
        pb: { xs: '100px', sm: 2, md: 3 },
        minHeight: '100vh',
        background: '#f8fafc'
      }}>
        {/* Professional Header */}
        <Box sx={{ 
          mb: { xs: 3, md: 4 },
          background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
          p: { xs: 3, md: 5 },
          borderRadius: { xs: 2, md: 3 },
          boxShadow: '0 4px 20px rgba(99, 102, 241, 0.2)'
        }}>
          <Typography variant="h4" sx={{ 
            fontWeight: 700,
            color: 'white',
            fontSize: { xs: '1.5rem', md: '2rem' },
            mb: 1,
            letterSpacing: '-0.02em'
          }}>
            Work Readiness Dashboard
          </Typography>
          <Typography sx={{ 
            color: 'rgba(255, 255, 255, 0.9)',
            fontSize: { xs: '0.875rem', md: '1rem' }
          }}>
            Monitor your team's work readiness and compliance
          </Typography>
        </Box>

        {/* Metrics Section */}
        <Box sx={{ mb: { xs: 3, md: 4 } }}>
          <Typography variant="h6" sx={{ 
            fontWeight: 700,
            color: '#0f172a',
            mb: 3,
            fontSize: { xs: '1.125rem', md: '1.25rem' },
            px: { xs: 2, md: 0 }
          }}>
            Real-time Metrics
          </Typography>
          <Grid container spacing={{ xs: 2, md: 3 }} sx={{ px: { xs: 2, md: 0 } }}>
          <Grid item xs={6} sm={6} md={3}>
            <Card sx={{ 
              background: '#ffffff',
              borderRadius: 2,
              border: '1px solid #f1f5f9',
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
              transition: 'all 0.2s ease',
              '&:hover': {
                boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                transform: 'translateY(-2px)',
                borderColor: '#e2e8f0'
              }
            }}>
              <CardContent sx={{ textAlign: 'center', p: { xs: 3, md: 4 } }}>
                <Box sx={{ 
                  width: 56,
                  height: 56,
                  borderRadius: 2,
                  background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                  boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)'
                }}>
                  <People sx={{ fontSize: 32, color: 'white' }} />
                </Box>
                <Typography variant="h3" sx={{ 
                  fontWeight: 700,
                  color: '#0f172a',
                  fontSize: { xs: '2rem', md: '2.5rem' },
                  mb: 0.5,
                  lineHeight: 1
                }}>
                  {data.compliance.totalTeamMembers}
                </Typography>
                <Typography sx={{ 
                  color: '#64748b',
                  fontSize: '0.875rem',
                  fontWeight: 500
                }}>
                  Total Team Members
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={6} md={3}>
            <Card sx={{ 
              background: '#ffffff',
              borderRadius: 2,
              border: '1px solid #f1f5f9',
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
              transition: 'all 0.2s ease',
              '&:hover': {
                boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                transform: 'translateY(-2px)',
                borderColor: '#e2e8f0'
              }
            }}>
              <CardContent sx={{ textAlign: 'center', p: { xs: 3, md: 4 } }}>
                <Box sx={{ 
                  width: 56,
                  height: 56,
                  borderRadius: 2,
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                }}>
                  <CheckCircle sx={{ fontSize: 32, color: 'white' }} />
                </Box>
                <Typography variant="h3" sx={{ 
                  fontWeight: 700,
                  color: '#0f172a',
                  fontSize: { xs: '2rem', md: '2.5rem' },
                  mb: 0.5,
                  lineHeight: 1
                }}>
                  {data.compliance.submittedAssessments}
                </Typography>
                <Typography sx={{ 
                  color: '#64748b',
                  fontSize: '0.875rem',
                  fontWeight: 500
                }}>
                  Completed Today
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={6} md={3}>
            <Card sx={{ 
              background: '#ffffff',
              borderRadius: 2,
              border: '1px solid #f1f5f9',
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
              transition: 'all 0.2s ease',
              '&:hover': {
                boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                transform: 'translateY(-2px)',
                borderColor: '#e2e8f0'
              }
            }}>
              <CardContent sx={{ textAlign: 'center', p: { xs: 3, md: 4 } }}>
                <Box sx={{ 
                  width: 56,
                  height: 56,
                  borderRadius: 2,
                  background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                  display: "flex",
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                  boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)'
                }}>
                  <TrendingUp sx={{ fontSize: 32, color: 'white' }} />
                </Box>
                <Typography variant="h3" sx={{ 
                  fontWeight: 700,
                  color: '#0f172a',
                  fontSize: { xs: '2rem', md: '2.5rem' },
                  mb: 0.5,
                  lineHeight: 1
                }}>
                  {data.compliance.complianceRate}%
                </Typography>
                <Typography sx={{ 
                  color: '#64748b',
                  fontSize: '0.875rem',
                  fontWeight: 500
                }}>
                  Compliance Rate
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={6} md={3}>
            <Card sx={{ 
              background: '#ffffff',
              borderRadius: 2,
              border: '1px solid #f1f5f9',
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
              transition: 'all 0.2s ease',
              '&:hover': {
                boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                transform: 'translateY(-2px)',
                borderColor: '#e2e8f0'
              }
            }}>
              <CardContent sx={{ textAlign: 'center', p: { xs: 3, md: 4 } }}>
                <Box sx={{ 
                  width: 56,
                  height: 56,
                  borderRadius: 2,
                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                  boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)'
                }}>
                  <Warning sx={{ fontSize: 32, color: 'white' }} />
                </Box>
                <Typography variant="h3" sx={{ 
                  fontWeight: 700,
                  color: '#0f172a',
                  fontSize: { xs: '2rem', md: '2.5rem' },
                  mb: 0.5,
                  lineHeight: 1
                }}>
                  {data.compliance.nonCompliantCount}
                </Typography>
                <Typography variant="body2" sx={{ 
                  color: '#6b7280', 
                  fontWeight: 500,
                  fontSize: { xs: '0.75rem', md: '0.875rem' }
                }}>
                  Pending
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
        </Box>

        {/* Enhanced Work Readiness Analytics */}
        <Box className="stagger-animation" sx={{ mb: 4 }}>

        <Typography variant="h6" sx={{ 
            fontWeight: 700, 
            color: '#374151',
            mb: 3,
            fontSize: { xs: '1.25rem', md: '1.5rem' },
            letterSpacing: '-0.025em',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
            borderBottom: '2px solid rgba(45, 90, 135, 0.1)',
            paddingBottom: 1
          }}>
            Work Readiness Analysis
          </Typography>
        <Grid container spacing={{ xs: 2, md: 3 }} sx={{ mb: { xs: 2, md: 3 }, position: 'relative', zIndex: 1 }}>
          <Grid item xs={12} md={6}>
            <Card sx={{ 
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(20px)',
              borderRadius: { xs: 3, md: 4 },
              border: '1px solid rgba(45, 90, 135, 0.1)',
              boxShadow: '0 8px 32px rgba(45, 90, 135, 0.15)',
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: '0 12px 40px rgba(45, 90, 135, 0.25)'
              }
            }}>
              <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                <Typography variant="h6" gutterBottom sx={{ 
                  fontWeight: 600, 
                  color: '#1a202c',
                  textShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  fontSize: { xs: '1rem', md: '1.25rem' },
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                }}>
                  Work Readiness Status
                </Typography>
                {data.compliance.totalTeamMembers === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 3 }}>
                    <Typography variant="body2" color="text.secondary">
                      No team members found. Data will appear once team members are assigned.
                    </Typography>
                  </Box>
                ) : (
                <Box display="flex" flexDirection="column" gap={2}>
                  <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ 
                    p: { xs: 1.5, md: 2 }, 
                          background: 'rgba(45, 90, 135, 0.05)', 
                    borderRadius: 2,
                    border: '1px solid rgba(34, 197, 94, 0.1)'
                  }}>
                    <Box display="flex" alignItems="center" sx={{ minWidth: 0 }}>
                      <CheckCircle sx={{ color: '#22c55e', mr: { xs: 1, md: 1.5 }, fontSize: { xs: '1rem', md: '1.25rem' } }} />
                      <Typography sx={{ 
                        fontWeight: 500, 
                        color: '#1a202c',
                        fontSize: { xs: '0.875rem', md: '1rem' }
                      }}>
                        Fit for Work
                      </Typography>
                    </Box>
                    <Chip 
                      label={data.readinessStats.fit} 
                      sx={{ 
                        backgroundColor: '#2d5a87', 
                        color: 'white', 
                        fontWeight: 600,
                        borderRadius: 2,
                        fontSize: { xs: '0.75rem', md: '0.875rem' }
                      }} 
                      size="small"
                    />
                  </Box>
                  <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ 
                    p: 2, 
                    background: 'rgba(245, 158, 11, 0.05)', 
                    borderRadius: 2,
                    border: '1px solid rgba(245, 158, 11, 0.1)'
                  }}>
                    <Box display="flex" alignItems="center">
                      <Warning sx={{ color: '#f59e0b', mr: 1.5 }} />
                      <Typography sx={{ fontWeight: 500, color: '#1a202c' }}>Minor Concerns</Typography>
                    </Box>
                    <Chip 
                      label={data.readinessStats.minor} 
                      sx={{ 
                        backgroundColor: '#f59e0b', 
                        color: 'white', 
                        fontWeight: 600,
                        borderRadius: 2
                      }} 
                    />
                  </Box>
                  <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ 
                    p: 2, 
                    background: 'rgba(239, 68, 68, 0.05)', 
                    borderRadius: 2,
                    border: '1px solid rgba(239, 68, 68, 0.1)'
                  }}>
                    <Box display="flex" alignItems="center">
                      <ErrorIcon sx={{ color: '#ef4444', mr: 1.5 }} />
                      <Typography sx={{ fontWeight: 500, color: '#1a202c' }}>Not Fit for Work</Typography>
                    </Box>
                    <Chip 
                      label={data.readinessStats.not_fit} 
                      sx={{ 
                        backgroundColor: '#ef4444', 
                        color: 'white', 
                        fontWeight: 600,
                        borderRadius: 2
                      }} 
                    />
                  </Box>
                </Box>
                )}
              </CardContent>
            </Card>
          </Grid>

        </Grid>
        </Box>

        {/* Enhanced Fatigue Analysis */}
        <Box className="stagger-animation">
        <Card sx={{ 
          background: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(10px)',
          borderRadius: 4,
          border: '1px solid rgba(34, 197, 94, 0.1)',
          boxShadow: '0 8px 32px 0 rgba(34, 197, 94, 0.1)',
          position: 'relative',
          zIndex: 1,
          mb: 3
        }}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" sx={{ 
                fontWeight: 700, 
                color: '#374151',
                mb: 2,
                fontSize: { xs: '1.1rem', md: '1.25rem' },
                letterSpacing: '-0.025em',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                borderBottom: '2px solid rgba(45, 90, 135, 0.1)',
                paddingBottom: 1
              }}>
                Fatigue Analysis
              </Typography>
              <Typography variant="body2" sx={{ 
                color: '#6b7280',
                mb: 3
              }}>
                Analyzing fatigue distribution across your team
              </Typography>
              <Box display="flex" gap={2}>
                <Chip
                  label={`Total: ${data.fatigueStats.low + data.fatigueStats.high}`}
                  sx={{ 
                    backgroundColor: '#f3f4f6',
                    color: '#374151',
                    fontWeight: 600
                  }}
                  size="small"
                />
                <Chip
                  label={`Low Fatigue: ${data.fatigueStats.low}`}
                  sx={{ 
                    backgroundColor: '#22c55e',
                    color: 'white',
                    fontWeight: 600
                  }}
                  size="small"
                />
                <Chip
                  label={`High Fatigue: ${data.fatigueStats.high}`}
                  sx={{ 
                    backgroundColor: '#ef4444',
                    color: 'white',
                    fontWeight: 600
                  }}
                  size="small"
                />
              </Box>
            </Box>

            {data.compliance.totalTeamMembers === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="body2" sx={{ color: '#6b7280' }}>
                  No fatigue data available yet. Data will appear once team members submit assessments.
                </Typography>
              </Box>
            ) : (
              <Grid container spacing={3}>
                {/* Low Fatigue Range (0-5) */}
                <Grid item xs={12} md={6}>
                  <Box>
                    <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600, color: '#1a202c' }}>
                      Low Fatigue Range (0-5)
                    </Typography>
                    <Box sx={{ mb: 1 }}>
                      <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          Workers with low fatigue
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#22c55e' }}>
                          {data.fatigueStats.low}
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={data.fatigueStats.low + data.fatigueStats.high > 0 ? (data.fatigueStats.low / (data.fatigueStats.low + data.fatigueStats.high)) * 100 : 0}
                        sx={{
                          height: 12,
                          borderRadius: 1,
                          backgroundColor: '#f3f4f6',
                          '& .MuiLinearProgress-bar': {
                            backgroundColor: '#22c55e',
                            borderRadius: 1
                          }
                        }}
                      />
                    </Box>
                    <Typography variant="caption" sx={{ color: '#6b7280' }}>
                      {data.fatigueStats.low + data.fatigueStats.high > 0 ? 
                        `${Math.round((data.fatigueStats.low / (data.fatigueStats.low + data.fatigueStats.high)) * 100)}% of submitted assessments` : 
                        'No data available'}
                    </Typography>
                  </Box>
                </Grid>

                {/* High Fatigue Range (6-10) */}
                <Grid item xs={12} md={6}>
                  <Box>
                    <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600, color: '#1a202c' }}>
                      High Fatigue Range (6-10)
                    </Typography>
                    <Box sx={{ mb: 1 }}>
                      <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          Workers with high fatigue
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#ef4444' }}>
                          {data.fatigueStats.high}
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={data.fatigueStats.low + data.fatigueStats.high > 0 ? (data.fatigueStats.high / (data.fatigueStats.low + data.fatigueStats.high)) * 100 : 0}
                        sx={{
                          height: 12,
                          borderRadius: 1,
                          backgroundColor: '#f3f4f6',
                          '& .MuiLinearProgress-bar': {
                            backgroundColor: '#ef4444',
                            borderRadius: 1
                          }
                        }}
                      />
                    </Box>
                    <Typography variant="caption" sx={{ color: '#6b7280' }}>
                      {data.fatigueStats.low + data.fatigueStats.high > 0 ? 
                        `${Math.round((data.fatigueStats.high / (data.fatigueStats.low + data.fatigueStats.high)) * 100)}% of submitted assessments` : 
                        'No data available'}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            )}
          </CardContent>
        </Card>
        </Box>

        {/* Enhanced Submitted Assessments */}
        <Box className="stagger-animation">

        {/* Submitted Assessments */}
        <Card sx={{ 
          width: '100%',
          background: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(10px)',
          borderRadius: 4,
          border: '1px solid rgba(34, 197, 94, 0.1)',
          boxShadow: '0 8px 32px 0 rgba(34, 197, 94, 0.1)',
          position: 'relative',
          zIndex: 1,
          overflow: 'hidden',
          mb: 3,
          '@media (max-width: 768px)': {
            borderRadius: 2,
            margin: '0 -8px'
          }
        }}>
          <CardContent sx={{ 
            p: { xs: 2, md: 3 },
            '@media (max-width: 768px)': {
              padding: '16px 8px'
            }
          }}>
            <Box sx={{ mb: 3 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="h6" sx={{ 
                  fontWeight: 700, 
                  color: '#374151',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
                }}>
                  Today's Assessments
                  <Chip 
                    label={filteredAssessments.length} 
                    size="small" 
                    sx={{ 
                      backgroundColor: '#2d5a87',
                      color: 'white',
                      fontWeight: 600,
                      fontSize: '0.75rem',
                      borderRadius: 2
                    }} 
                  />
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ 
                color: '#6b7280',
                mb: 2
              }}>
                Real-time assessment data from your team members
              </Typography>
              <Box display="flex" alignItems="center" gap={1}>
                {data.compliance.totalTeamMembers > 0 && (
                  <Box sx={{ 
                    width: 'calc(200px * 0.75)', 
                    height: 'calc(200px * 0.75)', 
                    borderRadius: '50%', 
                    mx: 'auto',
                    overflow: 'visible',
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    position: 'relative',
                    '@media (max-width: 768px)': {
                      width: 'calc(150px)',
                      height: 'calc(150px)',
                    }
                  }}>
                    <svg 
                      width="100%" 
                      height="100%" 
                      style={{
                        transform: 'rotate(-90deg)',
                        filter: 'drop-shadow(0 2px 4px rgba(34, 197, 94, 0.2))',
                      }}
                    >
                      <circle
                        cx="50%" 
                        cy="50%" 
                        r="calc(50% - 15px)" 
                        fill="none" 
                        stroke="rgba(34, 197, 94, 0.1)" 
                        strokeWidth="10" 
                      />
                      <circle
                        cx="50%" 
                        cy="50%" 
                        r="calc(50% - 15px)" 
                        fill="none" 
                        stroke="#22c55e" 
                        strokeWidth="10" 
                        strokeLinecap="round"
                        strokeDasharray={`${2 * Math.PI * (parseInt('calc(50% - 15px)'.replace(/[^\d]/g, '')) || 80) * 0.1}`}
                        strokeDashoffset="calc(100% - "
                        style={{
                          strokeDasharray: `${data.compliance.complianceRate * 5} ${100 - data.compliance.complianceRate * 5}`,
                          strokeDashoffset: `${100 - data.compliance.complianceRate}%`
                        }}
                      />
                    </svg>
                    <Typography sx={{ 
                      position: 'absolute',
                      fontWeight: 700,
                      color: '#2d5a87',
                      fontSize: { xs: '0.75rem', md: '1rem' }
                    }}>
                      {data.compliance.complianceRate}%
                    </Typography>
                  </Box>
                )}
                <Typography variant="body2" sx={{ 
                  ml: 2,
                  fontWeight: 500,
                  fontSize: { xs: '0.8rem', md: '0.875rem' },
                  color: '#374151',
                  lineHeight: 1.3
                }}>
                  Today's completion rate
                  <br />
                  {data.compliance.submittedAssessments}/{data.compliance.totalTeamMembers} assessed
                </Typography>
              </Box>
            </Box>

            {data.compliance.totalTeamMembers === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="body2" sx={{ color: '#6b7280' }}>
                  No team members found. Data will appear once team members are assigned.
                </Typography>
              </Box>
            ) : (
              <>
                <Typography variant="body2" sx={{ 
                  color: '#6b7280', 
                  mb: 1,
                  fontWeight: 500,
                  '@media (max-width: 768px)': {
                    padding: '0 16px',
                    marginBottom: '8px'
                  }
                }}>
                  {filteredAssessments.length === 0 ? 'No assessments found ' : `Showing ${filteredAssessments.length} assessment${filteredAssessments.length !== 1 ? 's' : ''} `}
                  {fatigueFilter !== 'all' && `(filtered${fatigueFilter})`}
                </Typography>
                {filteredAssessments.length > 0 ? (
                  <Typography variant="body2" sx={{ 
                    color: '#6b7280',
                    mb: 2,
                    fontSize: { xs: '0.75rem', md: '0.875rem' },
                    '@media (max-width: 768px)': {
                      padding: '0 16px',
                      marginBottom: '16px'
                    }
                  }}>
                    Submit your assessment daily to remain compliant
                  </Typography>
                ) : null}
                
                {/* Mobile Card Layout */}
                <Box sx={{ 
                  '@media (max-width: 768px)': { 
                    display: 'block',
                    padding: '0 16px'
                  },
                  '@media (min-width: 769px)': { 
                    display: 'none' 
                  }
                }}>
                  {filteredAssessments.map((assessment) => (
                    <Box key={`mobile-${assessment._id}`} sx={{
                      background: 'white',
                      borderRadius: '16px',
                      padding: '20px',
                      marginBottom: '12px',
                      border: '1px solid rgba(0,0,0,0.06)',
                      boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                      transition: 'all 0.2s ease',
                      '&:active': {
                        transform: 'scale(0.98)',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
                      }
                    }}>
                      {/* Worker Info */}
                      <Box sx={{ marginBottom: '16px', borderBottom: '1px solid rgba(0,0,0,0.06)', paddingBottom: '12px' }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#1a202c', fontSize: '1rem' }}>
                          {assessment.worker.firstName} {assessment.worker.lastName}
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#6b7280', fontSize: '0.875rem' }}>
                          {assessment.worker.email}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#9ca3af', fontSize: '0.75rem' }}>
                          Team: {assessment.worker.team}
                        </Typography>
                      </Box>
                      
                      {/* Assessment Details */}
                      <Box sx={{ marginBottom: '16px' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <Typography variant="body2" sx={{ fontWeight: 500, color: '#374151' }}>Work Readiness</Typography>
                          <Chip
                            label={getReadinessLabel(assessment.readinessLevel)}
                            sx={{ 
                              backgroundColor: getReadinessColor(assessment.readinessLevel), 
                              color: 'white',
                              fontWeight: 600,
                              borderRadius: '20px',
                              fontSize: '0.75rem',
                              height: '24px'
                            }}
                            size="small"
                          />
                        </Box>
                        
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <Typography variant="body2" sx={{ fontWeight: 500, color: '#374151' }}>Fatigue Level</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: '#1a202c' }}>
                            Level {assessment.fatigueLevel}/10
                          </Typography>
                        </Box>
                        
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <Typography variant="body2" sx={{ fontWeight: 500, color: '#374151' }}>Mood</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 500, color: '#1a202c', textTransform: 'capitalize' }}>
                            {assessment.mood}
                          </Typography>
                        </Box>
                        
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <Typography variant="body2" sx={{ fontWeight: 500, color: '#374151' }}>Pain/Discomfort</Typography>
                          {assessment.painDiscomfort === 'yes' ? (
                            <Chip 
                              label={`Yes (${assessment.painAreas} areas)`} 
                              sx={{ 
                                backgroundColor: '#f59e0b',
                                color: 'white',
                                fontWeight: 600,
                                borderRadius: '20px',
                                fontSize: '0.75rem',
                                height: '24px'
                              }} 
                              size="small" 
                            />
                          ) : (
                            <Chip 
                              label="No" 
                              sx={{ 
                                backgroundColor: '#2d5a87', 
                                color: 'white',
                                fontWeight: 600,
                                borderRadius: '20px',
                                fontSize: '0.75rem',
                                height: '24px'
                              }} 
                              size="small" 
                            />
                          )}
                        </Box>
                        
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="body2" sx={{ fontWeight: 500, color: '#374151' }}>Submitted</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 500, color: '#6b7280', fontSize: '0.875rem' }}>
                            {new Date(assessment.submittedAt).toLocaleTimeString()}
                          </Typography>
                        </Box>
                      </Box>
                      
                      {/* Actions */}
                      <Box sx={{ display: 'flex', gap: '12px' }}>
                        <Button
                          variant="contained"
                          fullWidth
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleViewDetails(assessment);
                          }}
                          sx={{ 
                            background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                            color: 'white',
                            borderRadius: 1.5,
                            py: 1.5,
                            fontSize: '0.875rem',
                            fontWeight: 600,
                            textTransform: 'none',
                            minHeight: '44px',
                            boxShadow: 'none',
                            '&:hover': {
                              background: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)',
                              boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)'
                            },
                            '&:active': {
                              transform: 'scale(0.98)'
                            }
                          }}
                        >
                          View Full Details
                        </Button>
                      </Box>
                    </Box>
                  ))}
                </Box>

                <TableContainer sx={{ 
                  borderRadius: 3,
                  border: '1px solid rgba(45, 90, 135, 0.1)' ,
                  background: 'rgba(255, 255, 255, 0.9)',
                  backdropFilter: 'blur(15px)',
                  '@media (max-width: 768px)': {
                    display: 'none'
                  },
                  '@media (min-width: 769px)': {
                    display: 'block'
                  }
                }}>
                  <Table sx={{ '& .MuiTableHead-root': { '@media (max-width: 768px)': { display: 'none' } } }}>
                    <TableHead sx={{ '@media (max-width: 768px)': { display: 'none' } }}>
                      <TableRow sx={{ background: 'rgba(45, 90, 135, 0.05)' }}>
                        <TableCell sx={{ fontWeight: 600, color: '#1a202c' }}>Worker</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: '#1a202c' }}>Readiness Level</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: '#1a202c' }}>Fatigue Level</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: '#1a202c', '@media (max-width: 768px)': { display: 'none' } }}>Mood</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: '#1a202c', '@media (max-width: 768px)': { display: 'none' } }}>Pain/Discomfort</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: '#1a202c', '@media (max-width: 768px)': { display: 'none' } }}>Time</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: '#1a202c' }}>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody sx={{
                      '@media (max-width: 768px)': {
                        '& tr': { display: 'block', mb: 2, border: '1px solid rgba(45, 90, 135, 0.1)', borderRadius: '8px', overflow: 'hidden' },
                        '& td': { display: 'block', border: 'none', py: 1 }
                      }
                    }}>
                      {filteredAssessments.map((assessment) => (
                        <TableRow key={assessment._id} sx={{ 
                          '&:hover': { 
                            background: 'rgba(45, 90, 135, 0.03)' 
                          } 
                        }}>
                          <TableCell sx={{ 
                            fontWeight: 500, 
                            color: '#1a202c',
                            fontSize: { xs: '0.875rem', md: '0.875rem' },
                            py: { xs: 1, md: 1.5 },
                            '@media (max-width: 768px)': { 
                              borderBottom: '1px solid rgba(45, 90, 135, 0.05)', 
                              fontWeight: 600,
                              background: 'rgba(45, 90, 135, 0.03)',
                              px: 2
                            }
                          }}>
                            <Typography variant="body2" sx={{ fontWeight: 500, color: '#1a202c', fontSize: { xs: '0.875rem', md: '0.875rem' } }}>
                              {assessment.worker.firstName} {assessment.worker.lastName}
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#6b7280', fontSize: { xs: '0.75rem' }, '@media (max-width: 768px)': { display: 'block' } }}>
                              {assessment.worker.team}
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#6b7280', fontSize: { xs: '0.75rem' }, '@media (max-width: 768px)': { display: 'block' } }}>
                              {assessment.worker.email}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ 
                            fontWeight: 500, 
                            color: '#1a202c',
                            fontSize: { xs: '0.875rem', md: '0.875rem' },
                            py: { xs: 1, md: 1.5 },
                            '@media (max-width: 768px)': { px: 2 }
                          }}>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'center', width: '100%' }}>
                              <Chip
                                label={getReadinessLabel(assessment.readinessLevel)}
                                sx={{ 
                                  backgroundColor: getReadinessColor(assessment.readinessLevel), 
                                  color: 'white',
                                  fontWeight: 600,
                                  borderRadius: 2,
                                  fontSize: { xs: '0.75rem', md: '0.875rem' },
                                  margin: '0 auto'
                                }}
                                size="small"
                              />
                              <Typography variant="caption" sx={{ 
                                color: '#6b7280', 
                                fontSize: { xs: '0.75rem' }, 
                                fontWeight: 500,
                                textAlign: 'center',
                                width: '100%',
                                '@media (max-width: 768px)': { display: 'block', mt: 0.5 } 
                              }}>
                                Work Readiness
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell sx={{ 
                            fontWeight: 500, 
                            color: '#1a202c',
                            fontSize: { xs: '0.75rem', md: '0.875rem' },
                            py: { xs: 1, md: 1.5 },
                            '@media (max-width: 768px)': { px: 2 }
                          }}>
                            <Typography variant="body2" sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' }, fontWeight: 600 }}>
                              Level {assessment.fatigueLevel}/10
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#6b7280', fontSize: { xs: '0.75rem' }, '@media (max-width: 768px)': { display: 'block', mt: 0.5 } }}>
                              Fatigue Level
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ display: { xs: 'none', md: 'table-cell' }, '@media (max-width: 768px)': { display: 'block', px: 2 } }}>
                            <Box sx={{ '@media (max-width: 768px)': { display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 } }}>
                              <Typography variant="body2" sx={{ 
                                textTransform: 'capitalize',
                                fontWeight: 500,
                                color: '#1a202c'
                              }}>
                                {assessment.mood}
                              </Typography>
                              <Typography variant="caption" sx={{ color: '#6b7280', fontSize: { xs: '0.75rem' }, '@media (max-width: 768px)': { display: 'none' } }}>
                                Mood
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell sx={{ display: { xs: 'none', md: 'table-cell' }, '@media (max-width: 768px)': { display: 'block', px: 2 } }}>
                            <Box sx={{ 
                              display: 'flex', 
                              flexDirection: 'column', 
                              gap: 1, 
                              alignItems: 'center',
                              width: '100%',
                              '@media (max-width: 768px)': { mt: 0.5 } 
                            }}>
                              {assessment.painDiscomfort === 'yes' ? (
                                <Chip 
                                  label={`Yes (${assessment.painAreas} areas)`} 
                                  sx={{ 
                                    backgroundColor: '#f59e0b',
                                    color: 'white',
                                    fontWeight: 600,
                                    borderRadius: 2,
                                    fontSize: { xs: '0.75rem', md: '0.875rem' },
                                    margin: '0 auto'
                                  }} 
                                  size="small" 
                                />
                              ) : (
                                <Chip 
                                  label="No" 
                                  sx={{ 
                                    backgroundColor: '#2d5a87', 
                                    color: 'white',
                                    fontWeight: 600,
                                    borderRadius: 2,
                                    fontSize: { xs: '0.75rem', md: '0.875rem' },
                                    margin: '0 auto'
                                  }} 
                                  size="small" 
                                />
                              )}
                              <Typography variant="caption" sx={{ 
                                color: '#6b7280', 
                                fontSize: { xs: '0.75rem' }, 
                                fontWeight: 500,
                                textAlign: 'center',
                                width: '100%',
                                '@media (max-width: 768px)': { display: 'none' } 
                              }}>
                                Pain/Discomfort
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell sx={{ 
                            color: '#6b7280',
                            fontSize: { xs: '0.75rem', md: '0.875rem' },
                            py: { xs: 1, md: 1.5 },
                            display: { xs: 'none', sm: 'table-cell' },
                            whiteSpace: 'nowrap',
                            '@media (max-width: 768px)': { display: 'block', px: 2 }
                          }}>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, alignItems: 'center', textAlign: 'center' }}>
                              <Typography variant="body2" sx={{ 
                                fontSize: { xs: '0.75rem', md: '0.875rem' },
                                fontWeight: 500,
                                color: '#374151'
                              }}>
                              {new Date(assessment.submittedAt).toLocaleTimeString()}
                            </Typography>
                            <Typography variant="caption" sx={{ 
                              color: '#6b7280', 
                              fontSize: { xs: '0.625rem', md: '0.75rem' },
                              fontWeight: 500
                            }}>
                              Submitted
                            </Typography>
                            </Box>
                          </TableCell>
                          <TableCell sx={{ '@media (max-width: 768px)': { px: 2 } }}>
                            <Box sx={{ 
                              display: 'flex', 
                              gap: { xs: '0.25rem', md: '0.5rem' }, 
                              flexDirection: { xs: 'column', sm: 'row' },
                              alignItems: { xs: 'flex-start', sm: 'center' }
                            }}>
                              <Button
                                variant="contained"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  console.log('View Details clicked for assessment:', assessment);
                                  handleViewDetails(assessment);
                                }}
                                sx={{ 
                                  background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                                  color: 'white',
                                  borderRadius: 1.5,
                                  py: 1,
                                  px: 2,
                                  fontSize: '0.875rem',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  transition: 'all 0.2s ease',
                                  minWidth: '100px',
                                  minHeight: '36px',
                                  textTransform: 'none',
                                  boxShadow: 'none',
                                  '&:hover': {
                                    background: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)',
                                    transform: 'translateY(-1px)',
                                    boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)'
                                  },
                                  '&:active': {
                                    transform: 'scale(0.98)'
                                  }
                                }}
                              >
                                View Details
                              </Button>
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </>
            )}
          </CardContent>
        </Card>
        </Box>

        {/* Enhanced Non-Compliant Workers */}
        <Box className="stagger-animation">
        {data.nonCompliantWorkers.length > 0 && (
          <Card sx={{ 
            mb: 3, 
            background: 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(10px)',
            borderRadius: 4,
            border: '1px solid rgba(34, 197, 94, 0.1)',
            boxShadow: '0 8px 32px 0 rgba(34, 197, 94, 0.1)',
            position: 'relative',
            zIndex: 1
          }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom sx={{ 
                  color: '#374151',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                }}>
                  Non-Compliant Team Members
                  <Chip 
                    label={data.nonCompliantWorkers.length} 
                    size="small" 
                    sx={{ 
                      backgroundColor: '#dc2626',
                      color: 'white',
                      fontWeight: 600,
                      fontSize: '0.75rem',
                      borderRadius: 2
                    }} 
                  />
                </Typography>
                <Typography variant="body2" sx={{ 
                  color: '#6b7280', 
                  mb: 1
                }}>
                  Team members who need to complete their assessments
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ 
                color: '#6b7280', 
                mb: 1,
                textShadow: '0 1px 2px rgba(0,0,0,0.05)'
              }}>
                Showing page {nonCompliantPage + 1} of {totalNonCompliantPages}
              </Typography>
              <Typography variant="body2" sx={{ 
                color: '#6b7280', 
                mb: 2,
                textShadow: '0 1px 2px rgba(0,0,0,0.05)'
              }}>
                Workers who haven't submitted their work readiness assessment today
              </Typography>
              <TableContainer sx={{ 
                borderRadius: 3,
                border: '1px solid rgba(45, 90, 135, 0.1)',
                background: 'rgba(255, 255, 255, 0.8)',
                backdropFilter: 'blur(10px)'
              }}>
                <Table>
                  <TableHead>
                    <TableRow sx={{ background: 'rgba(34, 197, 94, 0.05)' }}>
                      <TableCell sx={{ fontWeight: 600, color: '#1a202c' }}>Name</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: '#1a202c' }}>Email</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: '#1a202c' }}>Team</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: '#1a202c' }}>Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginatedNonCompliantWorkers.map((worker) => (
                      <TableRow key={worker._id} sx={{ 
                        '&:hover': { 
                          background: 'rgba(45, 90, 135, 0.05)' 
                        } 
                      }}>
                        <TableCell sx={{ fontWeight: 500, color: '#1a202c' }}>{worker.firstName} {worker.lastName}</TableCell>
                        <TableCell sx={{ color: '#6b7280' }}>{worker.email}</TableCell>
                        <TableCell sx={{ color: '#6b7280' }}>{worker.team}</TableCell>
                        <TableCell>
                          <Button
                            variant={recentlySentFollowUps.has(worker._id) ? "contained" : "outlined"}
                            size="small"
                            startIcon={recentlySentFollowUps.has(worker._id) ? <CheckCircle /> : <Send />}
                            onClick={() => !recentlySentFollowUps.has(worker._id) && handleFollowUp(worker)}
                            sx={{
                              backgroundColor: recentlySentFollowUps.has(worker._id) ? '#6b7280' : 'transparent',
                              color: recentlySentFollowUps.has(worker._id) ? 'white' : '#22c55e',
                              borderColor: recentlySentFollowUps.has(worker._id) ? '#6b7280' : '#22c55e',
                              fontWeight: 600,
                              borderRadius: 2,
                              opacity: recentlySentFollowUps.has(worker._id) ? 0.7 : 1,
                              cursor: recentlySentFollowUps.has(worker._id) ? 'not-allowed' : 'pointer',
                              '&:hover': {
                                backgroundColor: recentlySentFollowUps.has(worker._id) ? '#6b7280' : 'rgba(34, 197, 94, 0.1)',
                                borderColor: recentlySentFollowUps.has(worker._id) ? '#6b7280' : '#16a34a',
                                transform: recentlySentFollowUps.has(worker._id) ? 'none' : 'translateY(-1px)'
                              }
                            }}
                            disabled={recentlySentFollowUps.has(worker._id)}
                            title={recentlySentFollowUps.has(worker._id) ? 'Follow-up already sent today' : 'Send follow-up reminder'}
                          >
                            {recentlySentFollowUps.has(worker._id) ? 'Already Sent' : 'Follow Up'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              
              {/* Pagination Controls */}
              {totalNonCompliantPages > 1 && (
                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'center', 
                  mt: 3,
                  pt: 2,
                  borderTop: '1px solid rgba(34, 197, 94, 0.1)'
                }}>
                  <Pagination
                    count={totalNonCompliantPages}
                    page={nonCompliantPage + 1}
                    onChange={handleNonCompliantPageChange}
                    color="primary"
                    sx={{
                      '& .MuiPaginationItem-root': {
                        color: '#2d5a87',
                        fontWeight: 500,
                        fontSize: '0.875rem'
                      },
                      '& .MuiPaginationItem-root.Mui-selected': {
                        backgroundColor: '#2d5a87',
                        color: 'white',
                        fontWeight: 600
                      },
                      '& .MuiPaginationItem-root:hover': {
                          backgroundColor: 'rgba(45, 90, 135, 0.1)'
                      }
                    }}
                    showFirstButton
                    showLastButton
                  />
                </Box>
              )}
            </CardContent>
          </Card>
        )}
        </Box>

        {/* Enhanced Submitted Assessments */}
        <Box className="stagger-animation">

        {/* Submitted Assessments */}
        <Card sx={{ 
          background: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(10px)',
          borderRadius: 4,
          border: '1px solid rgba(34, 197, 94, 0.1)',
          boxShadow: '0 8px 32px 0 rgba(34, 197, 94, 0.1)',
          position: 'relative',
          zIndex: 1,
          overflow: 'hidden',
          '@media (max-width: 768px)': {
            borderRadius: 2,
            margin: '0 -8px'
          }
        }}>
          <CardContent sx={{ 
            p: { xs: 2, md: 3 },
            '@media (max-width: 768px)': {
              padding: '16px 8px'
            }
          }}>
            <Box sx={{ mb: 3 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="h6" sx={{ 
                  fontWeight: 700, 
                  color: '#374151',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
                }}>
                  Today's Assessments
                  <Chip 
                    label={filteredAssessments.length} 
                    size="small" 
                    sx={{ 
                      backgroundColor: '#2d5a87',
                      color: 'white',
                      fontWeight: 600,
                      fontSize: '0.75rem',
                      borderRadius: 2
                    }} 
                  />
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ 
                color: '#6b7280',
                mb: 2
              }}>
                Real-time assessment data from your team members
              </Typography>
              <Box display="flex" alignItems="center" gap={1}>
                <IconButton
                  size="small"
                  onClick={() => setFatigueFilter('all')}
                  sx={{ 
                    color: fatigueFilter === 'all' ? '#22c55e' : '#6b7280',
                    '&:hover': { color: '#22c55e' }
                  }}
                >
                  <Clear />
                </IconButton>
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <Select
                    value={fatigueFilter}
                    onChange={(e) => setFatigueFilter(e.target.value)}
                    sx={{ 
                      fontSize: '0.75rem',
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#e5e7eb'
                      },
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#22c55e'
                      },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#22c55e'
                      }
                    }}
                  >
                    <MenuItem value="all">All Levels</MenuItem>
                    <MenuItem value="low">Low (0-5)</MenuItem>
                    <MenuItem value="high">High (6-10)</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            </Box>
            {data.assessments.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="body1" color="text.secondary" mb={2}>
                  No assessments submitted today yet.
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Assessments will appear here once team members complete their work readiness forms.
                </Typography>
              </Box>
            ) : (
              <TableContainer sx={{ 
                borderRadius: 3,
                border: '1px solid rgba(45, 90, 135, 0.1)',
                background: 'rgba(255, 255, 255, 0.8)',
                backdropFilter: 'blur(10px)',
                position: 'relative',
                zIndex: 1,
                overflowX: 'auto',
                maxHeight: filteredAssessments.length > 20 ? '500px' : 'none',
                '@media (max-width: 768px)': {
                  borderRadius: 1,
                  overflowX: 'scroll',
                  border: 'none'
                }
              }}>
              <Table sx={{ minWidth: 320 }}>
                <TableHead>
                  <TableRow sx={{ background: 'rgba(34, 197, 94, 0.05)' }}>
                    <TableCell sx={{ 
                      fontWeight: 600, 
                      color: '#1a202c',
                      fontSize: { xs: '0.75rem', md: '0.875rem' },
                      py: { xs: 1, md: 1.5 },
                      whiteSpace: 'nowrap'
                    }}>
                      Worker
                    </TableCell>
                    <TableCell sx={{ 
                      fontWeight: 600, 
                      color: '#1a202c',
                      fontSize: { xs: '0.75rem', md: '0.875rem' },
                      py: { xs: 1, md: 1.5 },
                      display: { xs: 'none', sm: 'table-cell' },
                      whiteSpace: 'nowrap'
                    }}>
                      Team
                    </TableCell>
                    <TableCell sx={{ 
                      fontWeight: 600, 
                      color: '#1a202c',
                      fontSize: { xs: '0.75rem', md: '0.875rem' },
                      py: { xs: 1, md: 1.5 },
                      whiteSpace: 'nowrap'
                    }}>
                      Readiness
                    </TableCell>
                    <TableCell sx={{ 
                      fontWeight: 600, 
                      color: '#1a202c',
                      fontSize: { xs: '0.75rem', md: '0.875rem' },
                      py: { xs: 1, md: 1.5 },
                      whiteSpace: 'nowrap'
                    }}>
                      Fatigue
                    </TableCell>
                    <TableCell sx={{ 
                      fontWeight: 600, 
                      color: '#1a202c',
                      fontSize: { xs: '0.75rem', md: '0.875rem' },
                      py: { xs: 1, md: 1.5 },
                      display: { xs: 'none', md: 'table-cell' },
                      whiteSpace: 'nowrap'
                    }}>
                      Mood
                    </TableCell>
                    <TableCell sx={{ 
                      fontWeight: 600, 
                      color: '#1a202c',
                      fontSize: { xs: '0.75rem', md: '0.875rem' },
                      py: { xs: 1, md: 1.5 },
                      display: { xs: 'none', md: 'table-cell' },
                      whiteSpace: 'nowrap'
                    }}>
                      Pain
                    </TableCell>
                    <TableCell sx={{ 
                      fontWeight: 600, 
                      color: '#1a202c',
                      fontSize: { xs: '0.75rem', md: '0.875rem' },
                      py: { xs: 1, md: 1.5 },
                      display: { xs: 'none', sm: 'table-cell' },
                      whiteSpace: 'nowrap'
                    }}>
                      Submitted
                    </TableCell>
                    <TableCell sx={{ 
                      fontWeight: 600, 
                      color: '#1a202c',
                      fontSize: { xs: '0.75rem', md: '0.875rem' },
                      py: { xs: 1, md: 1.5 },
                      whiteSpace: 'nowrap'
                    }}>
                      Actions
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredAssessments.map((assessment) => (
                    <TableRow 
                      key={assessment._id}
                      sx={{ 
                        '&:hover': { 
                          background: 'rgba(45, 90, 135, 0.05)' 
                        }
                      }}
                    >
                      <TableCell sx={{ 
                        fontWeight: 500, 
                        color: '#1a202c',
                        fontSize: { xs: '0.75rem', md: '0.875rem' },
                        py: { xs: 1, md: 1.5 },
                        whiteSpace: 'nowrap'
                      }}>
                        {assessment.worker.firstName} {assessment.worker.lastName}
                      </TableCell>
                      <TableCell sx={{ 
                        color: '#6b7280',
                        fontSize: { xs: '0.75rem', md: '0.875rem' },
                        py: { xs: 1, md: 1.5 },
                        display: { xs: 'none', sm: 'table-cell' },
                        whiteSpace: 'nowrap'
                      }}>
                        {assessment.worker.team}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={getReadinessLabel(assessment.readinessLevel)}
                          sx={{ 
                            backgroundColor: getReadinessColor(assessment.readinessLevel), 
                            color: 'white',
                            fontWeight: 600,
                            borderRadius: 2
                          }}
                          size="small"
                        />
                      </TableCell>
                      <TableCell sx={{ 
                        fontWeight: 500, 
                        color: '#1a202c',
                        fontSize: { xs: '0.75rem', md: '0.875rem' },
                        py: { xs: 1, md: 1.5 },
                        whiteSpace: 'nowrap'
                      }}>
                        Level {assessment.fatigueLevel}/10
                      </TableCell>
                      <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                        <Box display="flex" alignItems="center">
                          <Typography variant="body2" sx={{ 
                            textTransform: 'capitalize',
                            fontWeight: 500,
                            color: '#1a202c'
                          }}>
                            {assessment.mood}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                        {assessment.painDiscomfort === 'yes' ? (
                          <Chip 
                            label={`Yes (${assessment.painAreas.length} areas)`} 
                            sx={{ 
                              backgroundColor: '#f59e0b', // Orange for pain/discomfort
                              color: 'white',
                              fontWeight: 600,
                              borderRadius: 2
                            }} 
                            size="small" 
                          />
                        ) : (
                          <Chip 
                            label="No" 
                            sx={{ 
                              backgroundColor: '#2d5a87', 
                              color: 'white',
                              fontWeight: 600,
                              borderRadius: 2
                            }} 
                            size="small" 
                          />
                        )}
                      </TableCell>
                      <TableCell sx={{ 
                        color: '#6b7280',
                        fontSize: { xs: '0.75rem', md: '0.875rem' },
                        py: { xs: 1, md: 1.5 },
                        display: { xs: 'none', sm: 'table-cell' },
                        whiteSpace: 'nowrap'
                      }}>
                        {new Date(assessment.submittedAt).toLocaleTimeString()}
                      </TableCell>
                      <TableCell>
                        <Box sx={{ 
                          display: 'flex', 
                          gap: { xs: '0.25rem', md: '0.5rem' }, 
                          flexDirection: { xs: 'column', sm: 'row' },
                          alignItems: { xs: 'flex-start', sm: 'center' }
                        }}>
                          <Button
                            variant="contained"
                            size="small"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              console.log('View Details clicked for assessment:', assessment);
                              handleViewDetails(assessment);
                            }}
                            sx={{ 
                              background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                              color: 'white',
                              border: 'none',
                              borderRadius: '0.375rem',
                              padding: { xs: '0.25rem 0.5rem', md: '0.375rem 0.75rem' },
                              fontSize: { xs: '0.625rem', md: '0.75rem' },
                              fontWeight: '600',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                              minWidth: { xs: '70px', md: '100px' },
                              width: { xs: '100%', sm: 'auto' },
                              pointerEvents: 'auto',
                              zIndex: 1,
                              '&:hover': {
                                background: 'linear-gradient(135deg, #16a34a, #15803d)',
                                transform: 'translateY(-1px)',
                                boxShadow: '0 4px 8px rgba(34, 197, 94, 0.3)'
                              }
                            }}
                          >
                            View
                          </Button>
                          <Button
                            variant="contained"
                            size="small"
                            sx={{ 
                              background: 'linear-gradient(135deg, #16a34a, #15803d)',
                              color: 'white',
                              border: 'none',
                              borderRadius: '0.375rem',
                              padding: '0.375rem 0.75rem',
                              fontSize: '0.75rem',
                              fontWeight: '600',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                              minWidth: { xs: '70px', md: '100px' },
                              width: { xs: '100%', sm: 'auto' },
                              '&:hover': {
                                background: 'linear-gradient(135deg, #15803d, #166534)',
                                transform: 'translateY(-1px)',
                                boxShadow: '0 4px 8px rgba(22, 163, 74, 0.3)'
                              }
                            }}
                          >
                            Contact
                          </Button>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            )}
          </CardContent>
        </Card>
      </Box>

      {/* Follow Up Dialog */}
        <Dialog open={followUp.open} onClose={() => setFollowUp(prev => ({ ...prev, open: false }))} maxWidth="md" fullWidth>
          <DialogTitle>Follow Up with Worker</DialogTitle>
          <DialogContent>
            <Box mb={2}>
              <Typography variant="body1" gutterBottom>
                Send a follow-up message to <strong>{followUp.worker?.firstName} {followUp.worker?.lastName}</strong>
              </Typography>
            </Box>

            <FormControl fullWidth margin="normal">
              <InputLabel>Reason for Follow-up</InputLabel>
              <Select
                value={followUp.reason}
                onChange={(e) => setFollowUp(prev => ({ ...prev, reason: e.target.value }))}
                label="Reason for Follow-up"
              >
                <MenuItem value="not_on_shift">Not on shift</MenuItem>
                <MenuItem value="forgot">Forgot to submit</MenuItem>
                <MenuItem value="technical_issue">Technical issue</MenuItem>
                <MenuItem value="other">Other</MenuItem>
              </Select>
            </FormControl>

            <TextField
              fullWidth
              multiline
              rows={4}
              label="Message"
              value={followUp.message}
              onChange={(e) => setFollowUp(prev => ({ ...prev, message: e.target.value }))}
              margin="normal"
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setFollowUp(prev => ({ ...prev, open: false }))}>Cancel</Button>
            <Button
              onClick={sendFollowUp}
              variant="contained"
              disabled={followUp.sending || !followUp.message.trim()}
              startIcon={followUp.sending ? <CircularProgress size={20} /> : <Send />}
            >
              {followUp.sending ? 'Sending...' : 'Send Follow-up'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* View Details Dialog */}
        <Dialog 
          open={viewDetails.open} 
          onClose={() => setViewDetails(prev => ({ ...prev, open: false }))} 
          maxWidth="md" 
          fullWidth
          sx={{ zIndex: 1300 }}
        >
          <DialogTitle>Assessment Details</DialogTitle>
          <DialogContent>
            {viewDetails.assessment && (
              <Box>
                {/* Worker Information */}
                <Box mb={3}>
                  <Typography variant="h6" gutterBottom sx={{ 
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
                  }}>Worker Information</Typography>
                  <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                    <Typography><strong>Name:</strong> {viewDetails.assessment.worker.firstName} {viewDetails.assessment.worker.lastName}</Typography>
                    <Typography><strong>Email:</strong> {viewDetails.assessment.worker.email}</Typography>
                    <Typography><strong>Team:</strong> {viewDetails.assessment.worker.team}</Typography>
                  </Box>
                </Box>

                {/* Assessment Details */}
                <Box mb={3}>
                  <Typography variant="h6" gutterBottom sx={{ 
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
                  }}>Assessment Details</Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                        <Typography variant="subtitle2" color="text.secondary">Work Readiness</Typography>
                        <Chip
                          label={getReadinessLabel(viewDetails.assessment.readinessLevel)}
                          sx={{ backgroundColor: getReadinessColor(viewDetails.assessment.readinessLevel), color: 'white', mt: 1 }}
                        />
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                        <Typography variant="subtitle2" color="text.secondary">Fatigue Level</Typography>
                        <Typography variant="h6" sx={{ 
                          mt: 1,
                          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
                        }}>Level {viewDetails.assessment.fatigueLevel}/10</Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                        <Typography variant="subtitle2" color="text.secondary">Mood</Typography>
                        <Box display="flex" alignItems="center" sx={{ mt: 1 }}>
                          <Typography sx={{ textTransform: 'capitalize' }}>{viewDetails.assessment.mood}</Typography>
                        </Box>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                        <Typography variant="subtitle2" color="text.secondary">Pain/Discomfort</Typography>
                        <Box sx={{ mt: 1 }}>
                          {viewDetails.assessment.painDiscomfort === 'yes' ? (
                            <Box>
                              <Chip label="Yes" color="warning" size="small" />
                              {viewDetails.assessment.painAreas && viewDetails.assessment.painAreas.length > 0 && (
                                <Box sx={{ mt: 1 }}>
                                  <Typography variant="body2" color="text.secondary">Affected Areas:</Typography>
                                  <Box sx={{ mt: 0.5 }}>
                                    {viewDetails.assessment.painAreas.map((area: string, index: number) => (
                                      <Chip key={index} label={area} size="small" variant="outlined" sx={{ mr: 0.5, mb: 0.5 }} />
                                    ))}
                                  </Box>
                                </Box>
                              )}
                            </Box>
                          ) : (
                            <Chip label="No" color="success" size="small" />
                          )}
                        </Box>
                      </Box>
                    </Grid>
                  </Grid>
                </Box>

                {/* Notes */}
                {viewDetails.assessment.notes && (
                  <Box mb={3}>
                    <Typography variant="h6" gutterBottom sx={{ 
                      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
                    }}>Notes</Typography>
                    <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                      <Typography>{viewDetails.assessment.notes}</Typography>
                    </Box>
                  </Box>
                )}

                {/* Submission Info */}
                <Box>
                  <Typography variant="h6" gutterBottom sx={{ 
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
                  }}>Submission Information</Typography>
                  <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                    <Typography><strong>Submitted:</strong> {new Date(viewDetails.assessment.submittedAt).toLocaleString()}</Typography>
                    <Typography><strong>Assessment ID:</strong> {viewDetails.assessment._id}</Typography>
                  </Box>
                </Box>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setViewDetails(prev => ({ ...prev, open: false }))}>Close</Button>
          </DialogActions>
        </Dialog>

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
});

WorkReadinessDashboard.displayName = 'WorkReadinessDashboard';

export default WorkReadinessDashboard;
