import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
  LinearProgress,
  TablePagination,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  FilterList,
  Download,
  Search,
  Refresh,
  Visibility,
  Person,
  Assessment,
  Mood,
  TrendingUp
} from '@mui/icons-material';
import Toast from '../../components/Toast';
import LayoutWithSidebar from '../../components/LayoutWithSidebar';
import { dataClient } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext.supabase';

interface AssessmentLog {
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
  status: string;
  reviewedBy?: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  reviewedAt?: string;
  followUpReason?: string;
  followUpNotes?: string;
}

interface AssessmentLogsData {
  assessments: AssessmentLog[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    limit: number;
  };
  summary: {
    totalAssessments: number;
    avgFatigueLevel: number;
    readinessDistribution: {
      fit: number;
      minor: number;
      not_fit: number;
    };
    fatigueDistribution: {
      1: number;
      2: number;
      3: number;
      4: number;
      5: number;
    };
    moodDistribution: {
      excellent: number;
      good: number;
      okay: number;
      poor: number;
      terrible: number;
    };
  };
  teamMembers: Array<{
    _id: string;
    name: string;
    email: string;
    team: string;
  }>;
}

interface FilterState {
  startDate: Date | null;
  endDate: Date | null;
  workerId: string;
  readinessLevel: string;
  fatigueLevel: string;
  mood: string;
  searchTerm: string;
}

const AssessmentLogs: React.FC = () => {
  const { user } = useAuth();
  const [data, setData] = useState<AssessmentLogsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [selectedAssessment, setSelectedAssessment] = useState<AssessmentLog | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const [filters, setFilters] = useState<FilterState>({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    endDate: new Date(),
    workerId: '',
    readinessLevel: '',
    fatigueLevel: '',
    mood: '',
    searchTerm: ''
  });

  const fetchAssessmentLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (!user?.id) {
        setError('User not authenticated');
        return;
      }

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

      const teamMemberIds = teamMembers?.map(member => member.id) || [];

      // Build query for work readiness assessments
      let query = dataClient
        .from('work_readiness')
        .select(`
          *,
          worker:users!work_readiness_worker_id_fkey(*)
        `)
        .in('worker_id', teamMemberIds)
        .order('submitted_at', { ascending: false });

      // Apply date filters
      if (filters.startDate) {
        query = query.gte('submitted_at', `${filters.startDate.toISOString().split('T')[0]}T00:00:00.000Z`);
      }
      if (filters.endDate) {
        query = query.lte('submitted_at', `${filters.endDate.toISOString().split('T')[0]}T23:59:59.999Z`);
      }

      // Apply other filters
      if (filters.workerId) {
        query = query.eq('worker_id', filters.workerId);
      }
      if (filters.readinessLevel) {
        query = query.eq('readiness_level', filters.readinessLevel);
      }
      if (filters.fatigueLevel) {
        query = query.eq('fatigue_level', parseInt(filters.fatigueLevel));
      }
      if (filters.mood) {
        query = query.eq('mood', filters.mood);
      }

      // Apply pagination
      const offset = page * rowsPerPage;
      query = query.range(offset, offset + rowsPerPage - 1);

      const { data: assessments, error: assessmentsError } = await query;

      if (assessmentsError) {
        console.error('Error fetching assessments:', assessmentsError);
        throw assessmentsError;
      }

      // Get total count for pagination
      let countQuery = dataClient
        .from('work_readiness')
        .select('*', { count: 'exact', head: true })
        .in('worker_id', teamMemberIds);

      // Apply same filters for count
      if (filters.startDate) {
        countQuery = countQuery.gte('submitted_at', `${filters.startDate.toISOString().split('T')[0]}T00:00:00.000Z`);
      }
      if (filters.endDate) {
        countQuery = countQuery.lte('submitted_at', `${filters.endDate.toISOString().split('T')[0]}T23:59:59.999Z`);
      }
      if (filters.workerId) {
        countQuery = countQuery.eq('worker_id', filters.workerId);
      }
      if (filters.readinessLevel) {
        countQuery = countQuery.eq('readiness_level', filters.readinessLevel);
      }
      if (filters.fatigueLevel) {
        countQuery = countQuery.eq('fatigue_level', parseInt(filters.fatigueLevel));
      }
      if (filters.mood) {
        countQuery = countQuery.eq('mood', filters.mood);
      }

      const { count, error: countError } = await countQuery;

      if (countError) {
        console.error('Error fetching count:', countError);
        throw countError;
      }

      // Calculate summary statistics
      const totalAssessments = count || 0;
      const avgFatigueLevel = assessments?.length > 0 
        ? assessments.reduce((sum, a) => sum + (a.fatigue_level || 0), 0) / assessments.length 
        : 0;

      const readinessDistribution = {
        fit: assessments?.filter(a => a.readiness_level === 'fit').length || 0,
        minor: assessments?.filter(a => a.readiness_level === 'minor').length || 0,
        not_fit: assessments?.filter(a => a.readiness_level === 'not_fit').length || 0
      };

      const fatigueDistribution = {
        1: assessments?.filter(a => a.fatigue_level === 1).length || 0,
        2: assessments?.filter(a => a.fatigue_level === 2).length || 0,
        3: assessments?.filter(a => a.fatigue_level === 3).length || 0,
        4: assessments?.filter(a => a.fatigue_level === 4).length || 0,
        5: assessments?.filter(a => a.fatigue_level === 5).length || 0
      };

      const moodDistribution = {
        excellent: assessments?.filter(a => a.mood === 'excellent').length || 0,
        good: assessments?.filter(a => a.mood === 'good').length || 0,
        okay: assessments?.filter(a => a.mood === 'okay').length || 0,
        poor: assessments?.filter(a => a.mood === 'poor').length || 0,
        terrible: assessments?.filter(a => a.mood === 'terrible').length || 0
      };

      // Format assessments to match expected structure
      const formattedAssessments = assessments?.map(assessment => ({
        _id: assessment.id,
        worker: {
          _id: assessment.worker?.id,
          firstName: assessment.worker?.first_name,
          lastName: assessment.worker?.last_name,
          email: assessment.worker?.email,
          team: assessment.worker?.team
        },
        fatigueLevel: assessment.fatigue_level,
        painDiscomfort: assessment.pain_discomfort,
        painAreas: assessment.pain_areas || [],
        readinessLevel: assessment.readiness_level,
        mood: assessment.mood,
        notes: assessment.notes,
        submittedAt: assessment.submitted_at,
        status: assessment.status
      })) || [];

      const formattedTeamMembers = teamMembers?.map(member => ({
        _id: member.id,
        name: `${member.first_name} ${member.last_name}`,
        email: member.email,
        team: member.team
      })) || [];

      const responseData: AssessmentLogsData = {
        assessments: formattedAssessments,
        pagination: {
          currentPage: page + 1,
          totalPages: Math.ceil(totalAssessments / rowsPerPage),
          totalCount: totalAssessments,
          limit: rowsPerPage
        },
        summary: {
          totalAssessments,
          avgFatigueLevel: Math.round(avgFatigueLevel * 10) / 10,
          readinessDistribution,
          fatigueDistribution,
          moodDistribution
        },
        teamMembers: formattedTeamMembers
      };

      setData(responseData);
    } catch (err: any) {
      console.error('Error fetching assessment logs:', err);
      setError(err.message || 'Failed to fetch assessment logs');
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, filters, user?.id]);

  useEffect(() => {
    fetchAssessmentLogs();
  }, [fetchAssessmentLogs]);

  const handlePageChange = useCallback((event: unknown, newPage: number) => {
    setPage(newPage);
  }, []);

  const handleRowsPerPageChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  }, []);

  const handleFilterChange = useCallback((key: keyof FilterState, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(0); // Reset to first page when filters change
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilters({
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate: new Date(),
      workerId: '',
      readinessLevel: '',
      fatigueLevel: '',
      mood: '',
      searchTerm: ''
    });
    setPage(0);
  }, []);

  const handleViewDetails = useCallback((assessment: AssessmentLog) => {
    setSelectedAssessment(assessment);
    setDetailDialogOpen(true);
  }, []);

  const handleExportLogs = useCallback(async () => {
    try {
      const queryParams = new URLSearchParams();
      
      // Add all filters for export
      if (filters.startDate) {
        queryParams.append('startDate', filters.startDate.toISOString().split('T')[0]);
      }
      if (filters.endDate) {
        queryParams.append('endDate', filters.endDate.toISOString().split('T')[0]);
      }
      if (filters.workerId) {
        queryParams.append('workerId', filters.workerId);
      }
      if (filters.readinessLevel) {
        queryParams.append('readinessLevel', filters.readinessLevel);
      }
      if (filters.fatigueLevel) {
        queryParams.append('fatigueLevel', filters.fatigueLevel);
      }
      if (filters.mood) {
        queryParams.append('mood', filters.mood);
      }

      // Export all records (no pagination)
      queryParams.append('limit', '10000');

      // Use the same fetch logic but without pagination for export
      if (!user?.id) {
        setToast({ message: 'User not authenticated', type: 'error' });
        return;
      }

      // Get team leader's managed teams first
      const { data: teamLeader, error: teamLeaderError } = await dataClient
        .from('users')
        .select('team, managed_teams')
        .eq('id', user.id)
        .single();

      if (teamLeaderError) {
        throw teamLeaderError;
      }

      // Get all managed teams including current team
      const managedTeams = teamLeader?.managed_teams || [];
      if (teamLeader?.team && !managedTeams.includes(teamLeader.team)) {
        managedTeams.push(teamLeader.team);
      }

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
          throw teamMembersError;
        }

        teamMembers = teamMembersData || [];
      }

      const teamMemberIds = teamMembers?.map(member => member.id) || [];

      // Build query for work readiness assessments
      let query = dataClient
        .from('work_readiness')
        .select(`
          *,
          worker:users!work_readiness_worker_id_fkey(*)
        `)
        .in('worker_id', teamMemberIds)
        .order('submitted_at', { ascending: false });

      // Apply date filters
      if (filters.startDate) {
        query = query.gte('submitted_at', `${filters.startDate.toISOString().split('T')[0]}T00:00:00.000Z`);
      }
      if (filters.endDate) {
        query = query.lte('submitted_at', `${filters.endDate.toISOString().split('T')[0]}T23:59:59.999Z`);
      }

      // Apply other filters
      if (filters.workerId) {
        query = query.eq('worker_id', filters.workerId);
      }
      if (filters.readinessLevel) {
        query = query.eq('readiness_level', filters.readinessLevel);
      }
      if (filters.fatigueLevel) {
        query = query.eq('fatigue_level', parseInt(filters.fatigueLevel));
      }
      if (filters.mood) {
        query = query.eq('mood', filters.mood);
      }

      // Limit to 10000 records for export
      query = query.limit(10000);

      const { data: assessments, error: assessmentsError } = await query;

      if (assessmentsError) {
        throw assessmentsError;
      }

      const logs = assessments?.map(assessment => ({
        _id: assessment.id,
        worker: {
          _id: assessment.worker?.id,
          firstName: assessment.worker?.first_name,
          lastName: assessment.worker?.last_name,
          email: assessment.worker?.email,
          team: assessment.worker?.team
        },
        fatigueLevel: assessment.fatigue_level,
        painDiscomfort: assessment.pain_discomfort,
        painAreas: assessment.pain_areas || [],
        readinessLevel: assessment.readiness_level,
        mood: assessment.mood,
        notes: assessment.notes,
        submittedAt: assessment.submitted_at,
        status: assessment.status
      })) || [];

      // Create CSV content
      const csvContent = [
        ['Date', 'Worker', 'Email', 'Team', 'Fatigue Level', 'Pain/Discomfort', 'Pain Areas', 'Readiness Level', 'Mood', 'Notes', 'Status'].join(','),
        ...logs.map((log: AssessmentLog) => [
          new Date(log.submittedAt).toLocaleDateString(),
          `"${log.worker.firstName} ${log.worker.lastName}"`,
          `"${log.worker.email}"`,
          `"${log.worker.team}"`,
          log.fatigueLevel,
          log.painDiscomfort,
          `"${log.painAreas.join(', ')}"`,
          log.readinessLevel,
          log.mood,
          `"${log.notes || ''}"`,
          log.status
        ].join(','))
      ].join('\n');

      // Download CSV
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `assessment-logs-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setToast({ message: 'Assessment logs exported successfully', type: 'success' });
    } catch (err: any) {
      console.error('Error exporting logs:', err);
      setToast({ message: 'Failed to export logs', type: 'error' });
    }
  }, [filters]);

  const getReadinessColor = (level: string) => {
    switch (level) {
      case 'fit': return 'success';
      case 'minor': return 'warning';
      case 'not_fit': return 'error';
      default: return 'default';
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

  const getMoodEmoji = (mood: string) => {
    switch (mood) {
      case 'excellent': return '😊';
      case 'good': return '🙂';
      case 'okay': return '😐';
      case 'poor': return '😟';
      case 'terrible': return '😰';
      default: return '😐';
    }
  };

  const getMoodLabel = (mood: string) => {
    switch (mood) {
      case 'excellent': return 'Excellent';
      case 'good': return 'Good';
      case 'okay': return 'Okay';
      case 'poor': return 'Poor';
      case 'terrible': return 'Terrible';
      default: return mood;
    }
  };

  // Filter assessments based on search term
  const filteredAssessments = useMemo(() => {
    if (!data?.assessments) return [];
    
    if (!filters.searchTerm) return data.assessments;
    
    const searchLower = filters.searchTerm.toLowerCase();
    return data.assessments.filter(assessment => 
      assessment.worker.firstName.toLowerCase().includes(searchLower) ||
      assessment.worker.lastName.toLowerCase().includes(searchLower) ||
      assessment.worker.email.toLowerCase().includes(searchLower) ||
      assessment.notes.toLowerCase().includes(searchLower)
    );
  }, [data?.assessments, filters.searchTerm]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
        <CircularProgress size={60} />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 3 }}>
        {error}
      </Alert>
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
            background: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23000000" fill-opacity="0.02"%3E%3Ccircle cx="30" cy="30" r="2"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
            zIndex: 0
          }
        }}>
          {/* Enhanced Header with Section Dividers */}
          <Box sx={{ 
            mb: 4, // 32px - reduced spacing to bring sections closer
            position: 'relative', 
            zIndex: 1,
            borderRadius: 3,
            overflow: 'hidden',
            pb: 2, // Reduced padding bottom
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
            <Box sx={{ 
              mb: 4, // 32px - consistent medium spacing
              position: 'relative'
            }}>
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
                    mb: 1
                  }}>
                    Assessment Logs
                  </Typography>
                  <Typography variant="subtitle1" sx={{ 
                    fontSize: { xs: '0.875rem', md: '1rem' },
                    fontWeight: 400,
                    color: '#6b7280',
                    mb: 0,
                    maxWidth: { xs: '100%', md: '600px' }
                  }}>
                    Complete history of team work readiness assessments
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', gap: 2, mt: { xs: 2, md: 0 } }}>
                  <Button
                    variant="outlined"
                    startIcon={<FilterList />}
                    onClick={() => setShowFilters(!showFilters)}
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
                      },
                      '&:active': {
                        transform: 'translateY(1px)',
                        boxShadow: '0 2px 8px rgba(123, 104, 238, 0.2)'
                      }
                    }}
                  >
                    {showFilters ? 'Hide Filters' : 'Show Filters'}
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={<Download />}
                    onClick={handleExportLogs}
                    sx={{ 
                      borderRadius: '12px',
                      padding: '12px 20px',
                      background: 'linear-gradient(135deg, #7B68EE 0%, #5A4FCF 100%)',
                      fontWeight: 600,
                      boxShadow: '0 4px 12px rgba(123, 104, 238, 0.3)',
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      '&:hover': { 
                        background: 'linear-gradient(135deg, #5A4FCF 0%, #4c3db8 100%)',
                        transform: 'translateY(-2px)',
                        boxShadow: '0 8px 25px rgba(123, 104, 238, 0.4)'
                      },
                      '&:active': {
                        transform: 'translateY(1px)',
                        boxShadow: '0 2px 8px rgba(123, 104, 238, 0.3)'
                      }
                    }}
                  >
                    Export CSV
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<Refresh />}
                    onClick={fetchAssessmentLogs}
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
                    Refresh
                  </Button>
                </Box>
              </Box>
            </Box>

            {/* Summary Cards with Professional Spacing */}
            {data?.summary && (
              <Box sx={{ 
                mb: 4, // 32px - reduced spacing to bring sections closer
                position: 'relative', 
                zIndex: 1,
                pb: 2, // Reduced padding for divider
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
                <Grid container spacing={2} justifyContent="center"> {/* Perfectly centered */}
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
                            {data.summary.totalAssessments}
                          </Typography>
                          <Typography sx={{ 
                            fontSize: '0.875rem',
                            fontWeight: 500,
                            color: '#6b7280',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em'
                          }}>
                            Total Assessments
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
                          <Assessment sx={{ fontSize: 30, color: 'white' }} />
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
                            {data.summary.avgFatigueLevel}
                          </Typography>
                          <Typography sx={{ 
                            fontSize: '0.875rem',
                            fontWeight: 500,
                            color: '#6b7280',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em'
                          }}>
                            Avg Fatigue Level
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
                          <TrendingUp sx={{ fontSize: 30, color: 'white' }} />
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
                            {data.summary.readinessDistribution.fit}
                          </Typography>
                          <Typography sx={{ 
                            fontSize: '0.875rem',
                            fontWeight: 500,
                            color: '#6b7280',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em'
                          }}>
                            Fit for Work
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
                          <Person sx={{ fontSize: 30, color: 'white' }} />
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
                            {data.summary.readinessDistribution.not_fit}
                          </Typography>
                          <Typography sx={{ 
                            fontSize: '0.875rem',
                            fontWeight: 500,
                            color: '#6b7280',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em'
                          }}>
                            Not Fit for Work
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
                          <Mood sx={{ fontSize: 30, color: 'white' }} />
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
                </Grid>
              </Box>
            )}

            {/* Enhanced Filters with Professional Spacing */}
            <Box sx={{
              maxHeight: showFilters ? '500px' : '0',
              overflow: 'hidden',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              mb: showFilters ? 6 : 0, // 48px when visible
              opacity: showFilters ? 1 : 0,
              position: 'relative',
              '&::after': showFilters ? {
                content: '""',
                position: 'absolute',
                bottom: -24, // Half margin distance
                left: 0,
                right: 0,
                height: '1px',
                background: 'linear-gradient(90deg, transparent 0%, rgba(123, 104, 238, 0.08) 30%, rgba(123, 104, 238, 0.15) 50%, rgba(123, 104, 238, 0.08) 70%, transparent 100%)',
                opacity: 0.6
              } : {}
            }}>
              <Card sx={{ 
                borderRadius: '16px',
                border: '1px solid rgba(0, 0, 0, 0.06)',
                background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(20px)',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)',
                position: 'relative',
                zIndex: 1
              }}>
                <CardContent>
                  <Typography sx={{ 
                    mb: 3,
                    fontSize: '1.125rem',
                    fontWeight: 600,
                    color: '#374151',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1
                  }}>
                    <FilterList sx={{ fontSize: '1.25rem' }} />
                    Advanced Filters
                  </Typography>
                  <Grid container spacing={3}>
                    <Grid item xs={12} sm={6} md={3}>
                      <TextField
                        label="Start Date"
                        type="date"
                        value={filters.startDate ? filters.startDate.toISOString().split('T')[0] : ''}
                        onChange={(e) => handleFilterChange('startDate', e.target.value ? new Date(e.target.value) : null)}
                        size="small"
                        fullWidth
                        InputLabelProps={{ shrink: true }}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            background: 'rgba(255, 255, 255, 0.6)',
                            backdropFilter: 'blur(10px)',
                            borderRadius: 3,
                            '& fieldset': {
                              borderColor: 'rgba(0, 0, 0, 0.1)',
                            },
                            '&:hover fieldset': {
                              borderColor: 'rgba(0, 0, 0, 0.2)',
                            },
                            '&.Mui-focused fieldset': {
                              borderColor: 'rgba(59, 130, 246, 0.5)',
                            },
                          },
                          '& .MuiInputLabel-root': {
                            color: '#6b7280',
                          },
                          '& .MuiInputBase-input': {
                            color: '#1a202c',
                          },
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <TextField
                        label="End Date"
                        type="date"
                        value={filters.endDate ? filters.endDate.toISOString().split('T')[0] : ''}
                        onChange={(e) => handleFilterChange('endDate', e.target.value ? new Date(e.target.value) : null)}
                        size="small"
                        fullWidth
                        InputLabelProps={{ shrink: true }}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            background: 'rgba(255, 255, 255, 0.6)',
                            backdropFilter: 'blur(10px)',
                            borderRadius: 3,
                            '& fieldset': {
                              borderColor: 'rgba(0, 0, 0, 0.1)',
                            },
                            '&:hover fieldset': {
                              borderColor: 'rgba(0, 0, 0, 0.2)',
                            },
                            '&.Mui-focused fieldset': {
                              borderColor: 'rgba(59, 130, 246, 0.5)',
                            },
                          },
                          '& .MuiInputLabel-root': {
                            color: '#6b7280',
                          },
                          '& .MuiInputBase-input': {
                            color: '#1a202c',
                          },
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <FormControl fullWidth size="small">
                        <InputLabel sx={{ color: '#6b7280' }}>Worker</InputLabel>
                        <Select
                          value={filters.workerId}
                          onChange={(e) => handleFilterChange('workerId', e.target.value)}
                          label="Worker"
                          sx={{
                            background: 'rgba(255, 255, 255, 0.6)',
                            backdropFilter: 'blur(10px)',
                            borderRadius: 3,
                            color: '#1a202c',
                            '& .MuiOutlinedInput-notchedOutline': {
                              borderColor: 'rgba(0, 0, 0, 0.1)',
                            },
                            '&:hover .MuiOutlinedInput-notchedOutline': {
                              borderColor: 'rgba(0, 0, 0, 0.2)',
                            },
                            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                              borderColor: 'rgba(59, 130, 246, 0.5)',
                            },
                            '& .MuiSvgIcon-root': {
                              color: '#6b7280',
                            },
                          }}
                          MenuProps={{
                            PaperProps: {
                              sx: {
                                background: 'rgba(255, 255, 255, 0.95)',
                                backdropFilter: 'blur(10px)',
                                borderRadius: 3,
                                border: '1px solid rgba(0, 0, 0, 0.1)',
                                boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.15)',
                              },
                            },
                          }}
                        >
                          <MenuItem value="">All Workers</MenuItem>
                          {data?.teamMembers.map((member) => (
                            <MenuItem key={member._id} value={member._id}>
                              {member.name}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Readiness Level</InputLabel>
                        <Select
                          value={filters.readinessLevel}
                          onChange={(e) => handleFilterChange('readinessLevel', e.target.value)}
                          label="Readiness Level"
                        >
                          <MenuItem value="">All Levels</MenuItem>
                          <MenuItem value="fit">Fit for Work</MenuItem>
                          <MenuItem value="minor">Minor Concerns</MenuItem>
                          <MenuItem value="not_fit">Not Fit for Work</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Fatigue Level</InputLabel>
                        <Select
                          value={filters.fatigueLevel}
                          onChange={(e) => handleFilterChange('fatigueLevel', e.target.value)}
                          label="Fatigue Level"
                        >
                          <MenuItem value="">All Levels</MenuItem>
                          <MenuItem value="1">Level 1 - Very Low</MenuItem>
                          <MenuItem value="2">Level 2 - Low</MenuItem>
                          <MenuItem value="3">Level 3 - Moderate</MenuItem>
                          <MenuItem value="4">Level 4 - High</MenuItem>
                          <MenuItem value="5">Level 5 - Very High</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Mood</InputLabel>
                        <Select
                          value={filters.mood}
                          onChange={(e) => handleFilterChange('mood', e.target.value)}
                          label="Mood"
                        >
                          <MenuItem value="">All Moods</MenuItem>
                          <MenuItem value="excellent">Excellent</MenuItem>
                          <MenuItem value="good">Good</MenuItem>
                          <MenuItem value="okay">Okay</MenuItem>
                          <MenuItem value="poor">Poor</MenuItem>
                          <MenuItem value="terrible">Terrible</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Search"
                        placeholder="Search by name, email, or notes..."
                        value={filters.searchTerm}
                        onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
                        InputProps={{
                          startAdornment: <Search sx={{ mr: 1, color: '#9ca3af' }} />
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <Button
                        variant="outlined"
                        onClick={handleClearFilters}
                        sx={{ height: '40px', borderRadius: 2 }}
                      >
                        Clear Filters
                      </Button>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Box>
          </Box>

          {/* Enhanced Assessment Logs Table with Perfect Alignment */}
          <Card sx={{ 
            borderRadius: '16px',
            border: '1px solid rgba(0, 0, 0, 0.06)',
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)',
            position: 'relative',
            zIndex: 1,
            overflow: 'hidden',
            mx: 0, // Ensure full width alignment
            mt: 0 // Removed margin - closer to header
          }}>
            <CardContent sx={{ p: 0 }}>
              <Box sx={{ p: 3, borderBottom: '1px solid rgba(0, 0, 0, 0.08)' }}>
                <Typography sx={{ 
                  fontSize: '1.125rem',
                  fontWeight: 600,
                  color: '#374151',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2
                }}>
                  <Assessment sx={{ fontSize: '1.25rem', opacity: 0.7 }} />
                  Assessment Records
                  {data?.pagination && (
                    <Typography component="span" sx={{ 
                      fontSize: '0.875rem',
                      fontWeight: 400,
                      color: '#6b7280',
                      opacity: 0.8
                    }}>
                      • {data.pagination.totalCount} total records
                    </Typography>
                  )}
                </Typography>
              </Box>
              
              <TableContainer>
                <Table sx={{
                  '& .MuiTableRow-root:nth-of-type(even)': {
                    background: 'rgba(248, 250, 252, 0.5)'
                  },
                  '& .MuiTableCell-root': {
                    padding: '16px 12px',
                    borderBottom: '1px solid rgba(0, 0, 0, 0.08)'
                  },
                  '& .MuiTableRow-root:hover': {
                    background: 'rgba(123, 104, 238, 0.04)',
                    transition: 'all 0.15s ease'
                  }
                }}>
                  <TableHead>
                    <TableRow sx={{ 
                      background: 'rgba(248, 250, 252, 0.8)',
                      borderBottom: '2px solid rgba(0, 0, 0, 0.12)'
                    }}>
                      <TableCell sx={{ 
                        fontWeight: 600,
                        color: '#374151',
                        fontSize: '0.875rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}>Date & Time</TableCell>
                      <TableCell sx={{ 
                        fontWeight: 600,
                        color: '#374151',
                        fontSize: '0.875rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}>Worker</TableCell>
                      <TableCell sx={{ 
                        fontWeight: 600,
                        color: '#374151',
                        fontSize: '0.875rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}>Fatigue Level</TableCell>
                      <TableCell sx={{ 
                        fontWeight: 600,
                        color: '#374151',
                        fontSize: '0.875rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}>Readiness</TableCell>
                      <TableCell sx={{ 
                        fontWeight: 600,
                        color: '#374151',
                        fontSize: '0.875rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}>Mood</TableCell>
                      <TableCell sx={{ 
                        fontWeight: 600,
                        color: '#374151',
                        fontSize: '0.875rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}>Pain Areas</TableCell>
                      <TableCell sx={{ 
                        fontWeight: 600,
                        color: '#374151',
                        fontSize: '0.875rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}>Status</TableCell>
                      <TableCell sx={{ 
                        fontWeight: 600,
                        color: '#374151',
                        fontSize: '0.875rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredAssessments.map((assessment) => (
                      <TableRow 
                        key={assessment._id}
                        sx={{
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          '&:hover': {
                            background: 'rgba(123, 104, 238, 0.06)',
                            transform: 'scale(1.001)'
                          }
                        }}
                      >
                        <TableCell>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              {new Date(assessment.submittedAt).toLocaleDateString()}
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#6b7280' }}>
                              {new Date(assessment.submittedAt).toLocaleTimeString()}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Avatar sx={{ 
                              width: 32, 
                              height: 32, 
                              fontSize: '0.75rem',
                              background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                              fontWeight: 600
                            }}>
                              {`${assessment.worker.firstName} ${assessment.worker.lastName}`.split(' ').map((n: string) => n[0]).join('')}
                            </Avatar>
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                {`${assessment.worker.firstName} ${assessment.worker.lastName}`}
                              </Typography>
                              <Typography variant="caption" sx={{ color: '#6b7280' }}>
                                {assessment.worker.email}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              Level {assessment.fatigueLevel}
                            </Typography>
                            <LinearProgress
                              variant="determinate"
                              value={(assessment.fatigueLevel / 5) * 100}
                              sx={{ 
                                width: 40, 
                                height: 6, 
                                borderRadius: 3,
                                backgroundColor: '#e2e8f0',
                                '& .MuiLinearProgress-bar': {
                                  borderRadius: 3,
                                  background: assessment.fatigueLevel <= 2 ? 
                                    'linear-gradient(135deg, #10b981 0%, #059669 100%)' :
                                    assessment.fatigueLevel <= 3 ?
                                    'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' :
                                    'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                                }
                              }}
                            />
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={getReadinessLabel(assessment.readinessLevel)}
                            color={getReadinessColor(assessment.readinessLevel) as any}
                            size="small"
                            sx={{ borderRadius: 2, fontWeight: 500 }}
                          />
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography sx={{ fontSize: '1.2rem' }}>
                              {getMoodEmoji(assessment.mood)}
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              {getMoodLabel(assessment.mood)}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ color: '#6b7280' }}>
                            {assessment.painAreas.length > 0 ? 
                              assessment.painAreas.join(', ') : 
                              'None'
                            }
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={assessment.status.charAt(0).toUpperCase() + assessment.status.slice(1)}
                            color={assessment.status === 'submitted' ? 'primary' : 'secondary'}
                            size="small"
                            sx={{ borderRadius: 2, fontWeight: 500 }}
                          />
                        </TableCell>
                        <TableCell>
                          <Tooltip title="View Details">
                            <IconButton
                              size="small"
                              onClick={() => handleViewDetails(assessment)}
                              sx={{ color: '#3b82f6' }}
                            >
                              <Visibility />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Pagination */}
              {data?.pagination && (
                <TablePagination
                  rowsPerPageOptions={[10, 25, 50, 100]}
                  component="div"
                  count={data.pagination.totalCount}
                  rowsPerPage={rowsPerPage}
                  page={page}
                  onPageChange={handlePageChange}
                  onRowsPerPageChange={handleRowsPerPageChange}
                  sx={{
                    borderTop: '1px solid #e2e8f0',
                    '& .MuiTablePagination-toolbar': {
                      color: '#4a5568'
                    }
                  }}
                />
              )}
            </CardContent>
          </Card>

          {/* Assessment Detail Dialog */}
          <Dialog
            open={detailDialogOpen}
            onClose={() => setDetailDialogOpen(false)}
            maxWidth="md"
            fullWidth
          >
            <DialogTitle sx={{ fontWeight: 600, color: '#1a202c' }}>
              Assessment Details
            </DialogTitle>
            <DialogContent>
              {selectedAssessment && (
                <Box sx={{ mt: 2 }}>
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#374151', mb: 1 }}>
                        Worker Information
                      </Typography>
                      <Box sx={{ p: 2, background: '#f8fafc', borderRadius: 2 }}>
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          <strong>Name:</strong> {`${selectedAssessment.worker.firstName} ${selectedAssessment.worker.lastName}`}
                        </Typography>
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          <strong>Email:</strong> {selectedAssessment.worker.email}
                        </Typography>
                        <Typography variant="body2">
                          <strong>Team:</strong> {selectedAssessment.worker.team}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#374151', mb: 1 }}>
                        Assessment Information
                      </Typography>
                      <Box sx={{ p: 2, background: '#f8fafc', borderRadius: 2 }}>
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          <strong>Submitted:</strong> {new Date(selectedAssessment.submittedAt).toLocaleString()}
                        </Typography>
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          <strong>Status:</strong> {selectedAssessment.status.charAt(0).toUpperCase() + selectedAssessment.status.slice(1)}
                        </Typography>
                        {selectedAssessment.reviewedBy && (
                          <Typography variant="body2">
                            <strong>Reviewed by:</strong> {`${selectedAssessment.reviewedBy.firstName} ${selectedAssessment.reviewedBy.lastName}`}
                          </Typography>
                        )}
                      </Box>
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#374151', mb: 1 }}>
                        Assessment Responses
                      </Typography>
                      <Box sx={{ p: 2, background: '#f8fafc', borderRadius: 2 }}>
                        <Grid container spacing={2}>
                          <Grid item xs={12} sm={6}>
                            <Typography variant="body2" sx={{ mb: 1 }}>
                              <strong>Fatigue Level:</strong> Level {selectedAssessment.fatigueLevel}
                            </Typography>
                            <LinearProgress
                              variant="determinate"
                              value={(selectedAssessment.fatigueLevel / 5) * 100}
                              sx={{ 
                                width: '100%', 
                                height: 8, 
                                borderRadius: 4,
                                backgroundColor: '#e2e8f0',
                                '& .MuiLinearProgress-bar': {
                                  borderRadius: 4,
                                  background: selectedAssessment.fatigueLevel <= 2 ? 
                                    'linear-gradient(135deg, #10b981 0%, #059669 100%)' :
                                    selectedAssessment.fatigueLevel <= 3 ?
                                    'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' :
                                    'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                                }
                              }}
                            />
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <Typography variant="body2" sx={{ mb: 1 }}>
                              <strong>Mood:</strong> {getMoodEmoji(selectedAssessment.mood)} {getMoodLabel(selectedAssessment.mood)}
                            </Typography>
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <Typography variant="body2" sx={{ mb: 1 }}>
                              <strong>Pain/Discomfort:</strong> {selectedAssessment.painDiscomfort === 'yes' ? 'Yes' : 'No'}
                            </Typography>
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <Typography variant="body2" sx={{ mb: 1 }}>
                              <strong>Readiness Level:</strong> 
                              <Chip
                                label={getReadinessLabel(selectedAssessment.readinessLevel)}
                                color={getReadinessColor(selectedAssessment.readinessLevel) as any}
                                size="small"
                                sx={{ ml: 1, borderRadius: 2, fontWeight: 500 }}
                              />
                            </Typography>
                          </Grid>
                          <Grid item xs={12}>
                            <Typography variant="body2" sx={{ mb: 1 }}>
                              <strong>Pain Areas:</strong> {selectedAssessment.painAreas.length > 0 ? selectedAssessment.painAreas.join(', ') : 'None'}
                            </Typography>
                          </Grid>
                          {selectedAssessment.notes && (
                            <Grid item xs={12}>
                              <Typography variant="body2" sx={{ mb: 1 }}>
                                <strong>Notes:</strong>
                              </Typography>
                              <Typography variant="body2" sx={{ 
                                p: 2, 
                                background: 'white', 
                                borderRadius: 2, 
                                border: '1px solid #e2e8f0',
                                fontStyle: 'italic'
                              }}>
                                {selectedAssessment.notes}
                              </Typography>
                            </Grid>
                          )}
                        </Grid>
                      </Box>
                    </Grid>
                  </Grid>
                </Box>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDetailDialogOpen(false)} sx={{ borderRadius: 2 }}>
                Close
              </Button>
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
};

export default AssessmentLogs;

