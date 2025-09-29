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
import api from '../../utils/api';
import Toast from '../../components/Toast';
import LayoutWithSidebar from '../../components/LayoutWithSidebar';

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

      const queryParams = new URLSearchParams();
      
      // Add pagination
      queryParams.append('page', (page + 1).toString());
      queryParams.append('limit', rowsPerPage.toString());

      // Add filters
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

      const response = await api.get(`/work-readiness/logs?${queryParams.toString()}`);
      setData(response.data.data);
    } catch (err: any) {
      console.error('Error fetching assessment logs:', err);
      setError(err.response?.data?.message || 'Failed to fetch assessment logs');
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, filters]);

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

      const response = await api.get(`/work-readiness/logs?${queryParams.toString()}`);
      const logs = response.data.data.assessments;

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
          p: 3, 
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
          position: 'relative',
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
          {/* Header */}
          <Box sx={{ mb: 4, position: 'relative', zIndex: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Box>
                <Typography variant="h4" component="h1" gutterBottom sx={{ 
                  fontWeight: 700, 
                  color: '#1a202c',
                  textShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}>
                  Assessment Logs
                </Typography>
                <Typography variant="subtitle1" sx={{ 
                  color: '#4a5568',
                  textShadow: '0 1px 2px rgba(0,0,0,0.05)'
                }}>
                  Complete history of team work readiness assessments
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                  variant="outlined"
                  startIcon={<FilterList />}
                  onClick={() => setShowFilters(!showFilters)}
                  sx={{ 
                    borderRadius: 3,
                    background: 'rgba(255, 255, 255, 0.8)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    color: '#374151',
                    fontWeight: 600,
                    boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                    '&:hover': {
                      background: 'rgba(255, 255, 255, 0.9)',
                      border: '1px solid rgba(255, 255, 255, 0.5)',
                      transform: 'translateY(-2px)',
                      boxShadow: '0 8px 25px rgba(0,0,0,0.15)'
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
                    borderRadius: 3,
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    boxShadow: '0 4px 15px rgba(16, 185, 129, 0.4)',
                    fontWeight: 600,
                    '&:hover': { 
                      background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                      transform: 'translateY(-2px)',
                      boxShadow: '0 8px 25px rgba(16, 185, 129, 0.6)'
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
                    borderRadius: 3,
                    background: 'rgba(255, 255, 255, 0.8)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    color: '#374151',
                    fontWeight: 600,
                    boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                    '&:hover': {
                      background: 'rgba(255, 255, 255, 0.9)',
                      border: '1px solid rgba(255, 255, 255, 0.5)',
                      transform: 'translateY(-2px)',
                      boxShadow: '0 8px 25px rgba(0,0,0,0.15)'
                    }
                  }}
                >
                  Refresh
                </Button>
              </Box>
            </Box>

            {/* Summary Cards */}
            {data?.summary && (
              <Grid container spacing={3} sx={{ mb: 3, position: 'relative', zIndex: 1 }}>
                <Grid item xs={12} sm={6} md={3}>
                  <Card sx={{ 
                    background: 'rgba(255, 255, 255, 0.8)',
                    backdropFilter: 'blur(10px)',
                    borderRadius: 4,
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.1)',
                    color: '#1a202c',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-5px)',
                      boxShadow: '0 12px 40px 0 rgba(0, 0, 0, 0.15)',
                      background: 'rgba(255, 255, 255, 0.9)'
                    }
                  }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Box>
                          <Typography variant="h4" sx={{ fontWeight: 700, textShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                            {data.summary.totalAssessments}
                          </Typography>
                          <Typography variant="body2" sx={{ opacity: 0.9, textShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                            Total Assessments
                          </Typography>
                        </Box>
                        <Box sx={{ 
                          width: 60, 
                          height: 60, 
                          borderRadius: 3, 
                          background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 4px 20px rgba(59, 130, 246, 0.4)'
                        }}>
                          <Assessment sx={{ fontSize: 30, color: 'white' }} />
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card sx={{ 
                    background: 'rgba(255, 255, 255, 0.8)',
                    backdropFilter: 'blur(10px)',
                    borderRadius: 4,
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.1)',
                    color: '#1a202c',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-5px)',
                      boxShadow: '0 12px 40px 0 rgba(0, 0, 0, 0.15)',
                      background: 'rgba(255, 255, 255, 0.9)'
                    }
                  }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Box>
                          <Typography variant="h4" sx={{ fontWeight: 700, textShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                            {data.summary.avgFatigueLevel}
                          </Typography>
                          <Typography variant="body2" sx={{ opacity: 0.9, textShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                            Avg Fatigue Level
                          </Typography>
                        </Box>
                        <Box sx={{ 
                          width: 60, 
                          height: 60, 
                          borderRadius: 3, 
                          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 4px 20px rgba(16, 185, 129, 0.4)'
                        }}>
                          <TrendingUp sx={{ fontSize: 30, color: 'white' }} />
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card sx={{ 
                    background: 'rgba(255, 255, 255, 0.8)',
                    backdropFilter: 'blur(10px)',
                    borderRadius: 4,
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.1)',
                    color: '#1a202c',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-5px)',
                      boxShadow: '0 12px 40px 0 rgba(0, 0, 0, 0.15)',
                      background: 'rgba(255, 255, 255, 0.9)'
                    }
                  }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Box>
                          <Typography variant="h4" sx={{ fontWeight: 700, textShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                            {data.summary.readinessDistribution.fit}
                          </Typography>
                          <Typography variant="body2" sx={{ opacity: 0.9, textShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                            Fit for Work
                          </Typography>
                        </Box>
                        <Box sx={{ 
                          width: 60, 
                          height: 60, 
                          borderRadius: 3, 
                          background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 4px 20px rgba(245, 158, 11, 0.4)'
                        }}>
                          <Person sx={{ fontSize: 30, color: 'white' }} />
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card sx={{ 
                    background: 'rgba(255, 255, 255, 0.8)',
                    backdropFilter: 'blur(10px)',
                    borderRadius: 4,
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.1)',
                    color: '#1a202c',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-5px)',
                      boxShadow: '0 12px 40px 0 rgba(0, 0, 0, 0.15)',
                      background: 'rgba(255, 255, 255, 0.9)'
                    }
                  }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Box>
                          <Typography variant="h4" sx={{ fontWeight: 700, textShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                            {data.summary.readinessDistribution.not_fit}
                          </Typography>
                          <Typography variant="body2" sx={{ opacity: 0.9, textShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                            Not Fit for Work
                          </Typography>
                        </Box>
                        <Box sx={{ 
                          width: 60, 
                          height: 60, 
                          borderRadius: 3, 
                          background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 4px 20px rgba(139, 92, 246, 0.4)'
                        }}>
                          <Mood sx={{ fontSize: 30, color: 'white' }} />
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            )}

            {/* Filters */}
            {showFilters && (
              <Card sx={{ 
                mb: 3, 
                background: 'rgba(255, 255, 255, 0.8)',
                backdropFilter: 'blur(10px)',
                borderRadius: 4,
                border: '1px solid rgba(255, 255, 255, 0.3)',
                boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.1)',
                position: 'relative',
                zIndex: 1
              }}>
                <CardContent>
                  <Typography variant="h6" sx={{ 
                    mb: 3, 
                    fontWeight: 600, 
                    color: '#1a202c',
                    textShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  }}>
                    <FilterList sx={{ mr: 1, verticalAlign: 'middle' }} />
                    Filters
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
            )}
          </Box>

          {/* Assessment Logs Table */}
          <Card sx={{ 
            background: 'rgba(255, 255, 255, 0.8)',
            backdropFilter: 'blur(10px)',
            borderRadius: 4,
            border: '1px solid rgba(255, 255, 255, 0.3)',
            boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.1)',
            position: 'relative',
            zIndex: 1
          }}>
            <CardContent sx={{ p: 0 }}>
              <Box sx={{ p: 3, borderBottom: '1px solid #e2e8f0' }}>
                <Typography variant="h6" sx={{ fontWeight: 600, color: '#1a202c' }}>
                  Assessment Records
                  {data?.pagination && (
                    <Typography component="span" variant="body2" sx={{ color: '#6b7280', ml: 2 }}>
                      ({data.pagination.totalCount} total records)
                    </Typography>
                  )}
                </Typography>
              </Box>
              
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow sx={{ background: '#f8fafc' }}>
                      <TableCell sx={{ fontWeight: 600 }}>Date & Time</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Worker</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Fatigue Level</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Readiness</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Mood</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Pain Areas</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredAssessments.map((assessment) => (
                      <TableRow key={assessment._id} sx={{ '&:hover': { background: '#f8fafc' } }}>
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

