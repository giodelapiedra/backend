import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  CircularProgress,
  Alert,
  Card,
  TextField,
  Stack,
  Chip,
  Tabs,
  Tab,
  Avatar,
  CardContent
} from '@mui/material';
import { CalendarToday, Assessment, People, Timeline } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext.supabase';
import { BackendAssignmentAPI } from '../utils/backendAssignmentApi';
import WorkReadinessKPI from '../components/WorkReadinessKPI';
import WorkerPerformanceKPI from '../components/WorkerPerformanceKPI';
import WeeklyPerformanceKPI from '../components/WeeklyPerformanceKPI';
import LayoutWithSidebar from '../components/LayoutWithSidebar';
import { dataClient } from '../lib/supabase';

const WorkReadinessKPIPage: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    fetchAssignments();
  }, [user]);

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!user?.id) {
        setAssignments([]);
        return;
      }

      // Fetch assignments directly from Supabase (trust database for overdue status)
      const { data: assignments, error: fetchError } = await dataClient
        .from('work_readiness_assignments')
        .select('*, worker:users!work_readiness_assignments_worker_id_fkey(id, first_name, last_name, team_leader_id)')
        .eq('team_leader_id', user.id)
        .order('assigned_date', { ascending: false });

      if (fetchError) throw fetchError;
      
      setAssignments(assignments || []);
    } catch (err: any) {
      console.error('Error fetching assignments:', err);
      setError(err.message || 'Failed to load assignments');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <LayoutWithSidebar>
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: '80vh'
        }}>
          <CircularProgress />
        </Box>
      </LayoutWithSidebar>
    );
  }

  if (error) {
    return (
      <LayoutWithSidebar>
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Alert severity="error">{error}</Alert>
        </Container>
      </LayoutWithSidebar>
    );
  }

  return (
    <LayoutWithSidebar>
      <Box sx={{ 
        minHeight: '100vh',
        background: { xs: '#fafafa', sm: '#FAFAFA' },
        py: { xs: 2, sm: 4 }
      }}>
        <Container maxWidth="xl" sx={{ px: { xs: 2, sm: 3 } }}>
        <Box sx={{ mb: { xs: 3, sm: 5 } }}>
          <Stack direction="row" alignItems="center" spacing={{ xs: 1.5, sm: 2 }} mb={1}>
            <Box sx={{
              width: { xs: 40, sm: 48 },
              height: { xs: 40, sm: 48 },
              borderRadius: { xs: 2, sm: 3 },
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: { xs: '0 4px 12px rgba(102, 126, 234, 0.2)', sm: '0 8px 16px rgba(102, 126, 234, 0.3)' }
            }}>
              <Assessment sx={{ color: 'white', fontSize: { xs: 24, sm: 28 } }} />
            </Box>
            <Box>
              <Typography variant="h3" sx={{ 
                fontWeight: 800, 
                color: '#0F172A',
                fontSize: { xs: '1.25rem', sm: '2.125rem' },
                letterSpacing: '-0.02em',
                mb: { xs: 0.25, sm: 0.5 }
              }}>
                Team Work Readiness KPI
              </Typography>
              <Typography variant="body1" sx={{ 
                color: '#64748B',
                fontSize: { xs: '0.8rem', sm: '1rem' },
                fontWeight: 500,
                display: { xs: 'none', sm: 'block' }
              }}>
                Real-time shift-based performance analytics and quality metrics
              </Typography>
            </Box>
          </Stack>
        </Box>

        {/* Month Filter - Mobile Optimized */}
        <Card sx={{ 
          mb: { xs: 3, sm: 4 },
          background: 'white',
          borderRadius: { xs: 3, sm: 4 },
          border: '1px solid #E2E8F0',
          boxShadow: { xs: '0 2px 8px rgba(0, 0, 0, 0.08)', sm: '0 2px 8px rgba(0, 0, 0, 0.04)' },
          overflow: 'hidden'
        }}>
          <Box sx={{ 
            p: { xs: 2, sm: 3 },
            borderLeft: { xs: '3px solid #667eea', sm: '4px solid #667eea' }
          }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 2, sm: 3 }} alignItems={{ xs: 'flex-start', sm: 'center' }} justifyContent="space-between">
              <Stack direction="row" spacing={2} alignItems="center" flex={1}>
                <Box sx={{
                  width: { xs: 36, sm: 40 },
                  height: { xs: 36, sm: 40 },
                  borderRadius: 2,
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <CalendarToday sx={{ fontSize: { xs: 18, sm: 20 }, color: 'white' }} />
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ 
                    color: '#64748B', 
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    fontSize: { xs: '0.65rem', sm: '0.75rem' }
                  }}>
                    Reporting Period
                  </Typography>
                  <Typography variant="h6" sx={{ 
                    color: '#0F172A',
                    fontWeight: 700,
                    fontSize: { xs: '0.9rem', sm: '1.125rem' }
                  }}>
                    {new Date(selectedMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </Typography>
                </Box>
              </Stack>
              
              <Stack direction="row" spacing={2} alignItems="center" sx={{ width: { xs: '100%', sm: 'auto' } }}>
                <TextField
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  size="small"
                  fullWidth
                  sx={{
                    minWidth: { xs: 'auto', sm: 200 },
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      bgcolor: 'white',
                      fontWeight: 600,
                      fontSize: { xs: '0.875rem', sm: '1rem' },
                      '& fieldset': {
                        borderColor: '#E2E8F0',
                        borderWidth: 2
                      },
                      '&:hover fieldset': {
                        borderColor: '#667eea'
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#667eea',
                        borderWidth: 2
                      }
                    }
                  }}
                />
                <Chip 
                  label="Month View"
                  size="small"
                  sx={{ 
                    bgcolor: '#EEF2FF',
                    color: '#667eea',
                    fontWeight: 700,
                    fontSize: { xs: '0.7rem', sm: '0.75rem' },
                    height: { xs: 24, sm: 28 },
                    px: 1,
                    display: { xs: 'none', sm: 'flex' }
                  }}
                />
              </Stack>
            </Stack>
          </Box>
        </Card>

        {/* Tabs - Mobile App Style */}
        <Card sx={{ 
          background: 'white',
          borderRadius: { xs: 3, sm: 4 },
          border: '1px solid #e2e8f0',
          boxShadow: { xs: '0 2px 8px rgba(0, 0, 0, 0.08)', sm: '0 4px 20px rgba(0, 0, 0, 0.08)' },
          overflow: 'hidden'
        }}>
          <Box sx={{ 
            background: '#fafbfc',
            borderBottom: '1px solid #e2e8f0',
            px: { xs: 0, sm: 2 }
          }}>
            <Tabs 
              value={activeTab} 
              onChange={(e, newValue) => setActiveTab(newValue)}
              variant="scrollable"
              scrollButtons="auto"
              sx={{
                '& .MuiTab-root': {
                  textTransform: 'none',
                  fontWeight: 700,
                  fontSize: { xs: '0.8rem', sm: '1rem' },
                  minHeight: { xs: 48, sm: 64 },
                  px: { xs: 2, sm: 4 },
                  color: '#64748B',
                  transition: 'all 0.3s ease',
                  position: 'relative',
                  '&.Mui-selected': {
                    color: '#667eea',
                    background: { xs: 'white', sm: 'linear-gradient(to bottom, transparent 0%, rgba(102, 126, 234, 0.05) 100%)' }
                  },
                  '&:hover': {
                    color: '#667eea',
                    background: 'rgba(102, 126, 234, 0.03)'
                  }
                },
                '& .MuiTabs-indicator': {
                  height: { xs: 3, sm: 4 },
                  borderRadius: '4px 4px 0 0',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  boxShadow: { xs: '0 -1px 4px rgba(102, 126, 234, 0.3)', sm: '0 -2px 8px rgba(102, 126, 234, 0.4)' }
                }
              }}
            >
              <Tab 
                icon={<Assessment sx={{ fontSize: { xs: 18, sm: 22 } }} />} 
                iconPosition="start" 
                label="Team KPI" 
                sx={{ '& .MuiTab-iconWrapper': { mr: { xs: 0.75, sm: 1.5 } } }}
              />
              <Tab 
                icon={<Timeline sx={{ fontSize: { xs: 18, sm: 22 } }} />} 
                iconPosition="start" 
                label="Weekly Performance" 
                sx={{ '& .MuiTab-iconWrapper': { mr: { xs: 0.75, sm: 1.5 } } }}
              />
              <Tab 
                icon={<People sx={{ fontSize: { xs: 18, sm: 22 } }} />} 
                iconPosition="start" 
                label="Worker Performance" 
                sx={{ '& .MuiTab-iconWrapper': { mr: { xs: 0.75, sm: 1.5 } } }}
              />
            </Tabs>
          </Box>

          <CardContent sx={{ p: { xs: 1.5, sm: 3 } }}>
            {/* Team KPI Tab */}
            {activeTab === 0 && (
              <WorkReadinessKPI 
                assignments={assignments}
                selectedMonth={selectedMonth}
              />
            )}

            {/* Weekly Performance Tab */}
            {activeTab === 1 && (
              <Box>
                <Box sx={{ 
                  mb: { xs: 3, sm: 4 },
                  p: { xs: 2.5, sm: 3 },
                  borderRadius: 3,
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  boxShadow: '0 8px 24px rgba(102, 126, 234, 0.25)'
                }}>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Box sx={{
                      width: { xs: 48, sm: 56 },
                      height: { xs: 48, sm: 56 },
                      borderRadius: 3,
                      background: 'rgba(255, 255, 255, 0.2)',
                      backdropFilter: 'blur(10px)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '2px solid rgba(255, 255, 255, 0.3)'
                    }}>
                      <Timeline sx={{ color: 'white', fontSize: { xs: 28, sm: 32 } }} />
                    </Box>
                    <Box flex={1}>
                      <Typography variant="h4" sx={{ 
                        fontWeight: 800, 
                        color: 'white',
                        fontSize: { xs: '1.25rem', sm: '1.75rem' },
                        letterSpacing: '-0.02em',
                        mb: { xs: 0.25, sm: 0.5 }
                      }}>
                        Weekly Performance Trends
                      </Typography>
                      <Typography variant="body1" sx={{ 
                        color: 'rgba(255, 255, 255, 0.9)',
                        fontSize: { xs: '0.875rem', sm: '1rem' },
                        fontWeight: 500,
                        display: { xs: 'none', sm: 'block' }
                      }}>
                        Shift-based weekly breakdown with quality scores and trends
                      </Typography>
                    </Box>
                  </Stack>
                </Box>

                <WeeklyPerformanceKPI 
                  assignments={assignments}
                  selectedMonth={selectedMonth}
                />
              </Box>
            )}

            {/* Worker Performance Tab */}
            {activeTab === 2 && (
              <Box>
                <Box sx={{ 
                  mb: { xs: 3, sm: 4 },
                  p: { xs: 2.5, sm: 3 },
                  borderRadius: 3,
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  boxShadow: '0 8px 24px rgba(102, 126, 234, 0.25)'
                }}>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Box sx={{
                      width: { xs: 48, sm: 56 },
                      height: { xs: 48, sm: 56 },
                      borderRadius: 3,
                      background: 'rgba(255, 255, 255, 0.2)',
                      backdropFilter: 'blur(10px)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '2px solid rgba(255, 255, 255, 0.3)'
                    }}>
                      <People sx={{ color: 'white', fontSize: { xs: 28, sm: 32 } }} />
                    </Box>
                    <Box flex={1}>
                      <Typography variant="h4" sx={{ 
                        fontWeight: 800, 
                        color: 'white',
                        fontSize: { xs: '1.25rem', sm: '1.75rem' },
                        letterSpacing: '-0.02em',
                        mb: { xs: 0.25, sm: 0.5 }
                      }}>
                        Worker Performance Rankings
                      </Typography>
                      <Typography variant="body1" sx={{ 
                        color: 'rgba(255, 255, 255, 0.9)',
                        fontSize: { xs: '0.875rem', sm: '1rem' },
                        fontWeight: 500,
                        display: { xs: 'none', sm: 'block' }
                      }}>
                        Individual performance metrics, quality scores, and leaderboard
                      </Typography>
                    </Box>
                  </Stack>
                </Box>

                <WorkerPerformanceKPI 
                  assignments={assignments}
                  selectedMonth={selectedMonth}
                />
              </Box>
            )}
          </CardContent>
        </Card>
        </Container>
      </Box>
    </LayoutWithSidebar>
  );
};

export default WorkReadinessKPIPage;

