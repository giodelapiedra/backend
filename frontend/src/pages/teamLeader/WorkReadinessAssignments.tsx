import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Breadcrumbs,
  Link as MuiLink,
  Tooltip,
  Tabs,
  Tab
} from '@mui/material';
import {
  NavigateNext,
  Assignment as AssignmentIcon,
  Schedule as ScheduleIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.supabase';
import { authClient, dataClient } from '../../lib/supabase';
import WorkReadinessAssignmentManager from '../../components/WorkReadinessAssignmentManager';

const WorkReadinessAssignments: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Fetch team leader data from database (not cached auth)
  const [teamLeaderData, setTeamLeaderData] = useState<any>(null);
  
  // Tab state
  const [activeTab, setActiveTab] = useState(0);
  
  // Next shift timer state
  const [nextShiftTime, setNextShiftTime] = useState<Date | null>(null);
  const [timeUntilNextShift, setTimeUntilNextShift] = useState<string>('');
  const [isNextShiftActive, setIsNextShiftActive] = useState<boolean>(false);
  const [currentShift, setCurrentShift] = useState<{
    shift_name: string;
    start_time: string;
    end_time: string;
    color: string;
  } | null>(null);

  // API configuration
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

  // Fetch team leader data from database on mount
  useEffect(() => {
    const fetchTeamLeaderData = async () => {
      if (!user?.id) return;
      
      try {
        console.log('🔍 Fetching team leader data from database...');
        const { data, error } = await dataClient
          .from('users')
          .select('id, team, managed_teams')
          .eq('id', user.id)
          .single();
        
        if (error) {
          console.error('❌ Error fetching team leader data:', error);
          return;
        }
        
        console.log('✅ Team leader data from DATABASE:', data);
        setTeamLeaderData(data);
      } catch (err) {
        console.error('❌ Error:', err);
      }
    };
    
    fetchTeamLeaderData();
  }, [user?.id]);

  // Helper function to get auth token
  const getAuthToken = async () => {
    try {
      const { data: { session } } = await authClient.auth.getSession();
      return session?.access_token || null;
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  };

  // Calculate next shift start time
  const calculateNextShiftTime = (currentShift: any) => {
    if (!currentShift) return null;
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Parse shift times
    const [startHour, startMinute] = currentShift.start_time.split(':').map(Number);
    const [endHour, endMinute] = currentShift.end_time.split(':').map(Number);
    
    // Calculate next shift start time (Manila time)
    const nextShiftStart = new Date(today);
    nextShiftStart.setHours(startHour, startMinute, 0, 0);
    
    // If shift crosses midnight (end time is earlier than start time)
    if (endHour < startHour) {
      // If current time is past shift end, next shift starts tomorrow
      const shiftEndToday = new Date(today);
      shiftEndToday.setHours(endHour, endMinute, 0, 0);
      
      if (now > shiftEndToday) {
        nextShiftStart.setDate(nextShiftStart.getDate() + 1);
      }
    } else {
      // Regular shift - if current time is past shift end, next shift starts tomorrow
      const shiftEndToday = new Date(today);
      shiftEndToday.setHours(endHour, endMinute, 0, 0);
      
      if (now > shiftEndToday) {
        nextShiftStart.setDate(nextShiftStart.getDate() + 1);
      }
    }
    
    return nextShiftStart;
  };

  // Update countdown timer
  const updateCountdown = () => {
    if (!nextShiftTime) return;
    
    const now = new Date();
    const timeDiff = nextShiftTime.getTime() - now.getTime();
    
    if (timeDiff <= 0) {
      setIsNextShiftActive(true);
      setTimeUntilNextShift('Next shift is now active!');
      return;
    }
    
    setIsNextShiftActive(false);
    
    const hours = Math.floor(timeDiff / (1000 * 60 * 60));
    const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);
    
    if (hours > 0) {
      setTimeUntilNextShift(`${hours}h ${minutes}m ${seconds}s`);
    } else if (minutes > 0) {
      setTimeUntilNextShift(`${minutes}m ${seconds}s`);
    } else {
      setTimeUntilNextShift(`${seconds}s`);
    }
  };

  // Fetch team leader's current shift
  const fetchCurrentShift = async () => {
    if (!user?.id) return;
    
    try {
      const token = await getAuthToken();
      if (!token) {
        console.warn('No auth token available for shift data');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/shifts/history/${user.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        // Find the current active shift
        const activeShift = data.data?.find((shift: any) => shift.is_active);
        if (activeShift) {
          const shiftInfo = {
            shift_name: activeShift.shift_types.name,
            start_time: activeShift.shift_types.start_time,
            end_time: activeShift.shift_types.end_time,
            color: activeShift.shift_types.color
          };
          setCurrentShift(shiftInfo);
          
          // Calculate next shift time
          const nextShift = calculateNextShiftTime(shiftInfo);
          setNextShiftTime(nextShift);
          
          // Initial countdown update
          if (nextShift) {
            updateCountdown();
          }
        }
      }
    } catch (error) {
      console.error('Error fetching current shift:', error);
    }
  };

  // Timer effect - update countdown every second
  useEffect(() => {
    if (!nextShiftTime) return;

    const interval = setInterval(() => {
      updateCountdown();
    }, 1000);

    return () => clearInterval(interval);
  }, [nextShiftTime]);

  // Fetch shift data on component mount
  useEffect(() => {
    fetchCurrentShift();
  }, [user?.id]);

  return (
    <Box sx={{ bgcolor: '#F8FAFB', minHeight: '100vh', py: 4 }}>
      <Container maxWidth="xl">
        {/* Breadcrumbs */}
        <Breadcrumbs 
          separator={<NavigateNext fontSize="small" />} 
          sx={{ mb: 3 }}
        >
          <MuiLink
            color="inherit"
            onClick={() => navigate('/team-leader')}
            sx={{ 
              cursor: 'pointer',
              color: '#6B7280',
              '&:hover': { color: '#14B8A6' },
              transition: 'color 0.2s'
            }}
          >
            Dashboard
          </MuiLink>
          <Typography color="#1E3A5F" fontWeight={600}>
            Work Readiness Assignments
          </Typography>
        </Breadcrumbs>

        {/* Header - Clean Corporate Design */}
        <Paper
          elevation={0}
          sx={{
            p: 4,
            mb: 4,
            background: 'linear-gradient(135deg, #1E3A5F 0%, #0F2942 100%)',
            borderRadius: 2,
            border: '1px solid #E5E7EB',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
            position: 'relative',
            overflow: 'hidden',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: -50,
              right: -50,
              width: 200,
              height: 200,
              borderRadius: '50%',
              background: 'rgba(20, 184, 166, 0.1)',
            },
            '&::after': {
              content: '""',
              position: 'absolute',
              bottom: -30,
              left: -30,
              width: 150,
              height: 150,
              borderRadius: '50%',
              background: 'rgba(20, 184, 166, 0.08)',
            }
          }}
        >
          <Box sx={{ position: 'relative', zIndex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Box
                  sx={{
                    width: 64,
                    height: 64,
                    borderRadius: 2,
                    bgcolor: 'rgba(255, 255, 255, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mr: 2,
                    backdropFilter: 'blur(10px)',
                  }}
                >
                  <AssignmentIcon sx={{ fontSize: 36, color: 'white' }} />
                </Box>
                <Box>
                  <Typography
                    variant="h4"
                    fontWeight={700}
                    color="white"
                    sx={{
                      textShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    }}
                  >
                    Work Readiness Assignments
                  </Typography>
                  <Typography
                    variant="body1"
                    color="rgba(255, 255, 255, 0.9)"
                    sx={{ mt: 0.5 }}
                  >
                    Assign and manage work readiness assessments for your team members
                  </Typography>
                </Box>
              </Box>
              
              {/* Next Shift Timer - Clean Corporate Style */}
              {nextShiftTime && (
                <Tooltip 
                  title={
                    <Box sx={{ p: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                        {currentShift?.shift_name} Shift
                      </Typography>
                      <Typography variant="caption" sx={{ display: 'block', mb: 0.5 }}>
                        Next shift starts: {nextShiftTime.toLocaleString('en-PH', {
                          timeZone: 'Asia/Manila',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </Typography>
                      <Typography variant="caption" sx={{ display: 'block' }}>
                        Overdue workers will be available for reassignment
                      </Typography>
                    </Box>
                  }
                  arrow
                >
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 2,
                    p: 2,
                    borderRadius: 2,
                    bgcolor: isNextShiftActive ? 'rgba(20, 184, 166, 0.2)' : 'rgba(20, 184, 166, 0.15)',
                    border: '1px solid rgba(255,255,255,0.3)',
                    backdropFilter: 'blur(10px)',
                    color: 'white',
                    minWidth: 200,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease-in-out',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: '0 4px 12px rgba(20, 184, 166, 0.3)'
                    }
                  }}>
                    <ScheduleIcon sx={{ fontSize: 20 }} />
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="caption" sx={{ opacity: 0.9, display: 'block' }}>
                        {isNextShiftActive ? 'Next Shift Active' : 'Next Shift In'}
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1 }}>
                        {timeUntilNextShift}
                      </Typography>
                    </Box>
                  </Box>
                </Tooltip>
              )}
            </Box>

            {/* Quick Stats */}
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                gap: 2,
                mt: 3,
              }}
            >
              {[
                { label: 'Team', value: teamLeaderData?.team || user?.team || 'N/A' },
                { label: 'Role', value: 'Team Leader' },
                { label: 'Status', value: 'Active' },
              ].map((stat, index) => (
                <Box
                  key={index}
                  sx={{
                    bgcolor: 'rgba(255, 255, 255, 0.2)',
                    backdropFilter: 'blur(10px)',
                    p: 2,
                    borderRadius: 2,
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                  }}
                >
                  <Typography
                    variant="caption"
                    color="rgba(255, 255, 255, 0.8)"
                    fontWeight={600}
                    sx={{ textTransform: 'uppercase', letterSpacing: 1 }}
                  >
                    {stat.label}
                  </Typography>
                  <Typography
                    variant="h6"
                    color="white"
                    fontWeight={700}
                    sx={{ mt: 0.5 }}
                  >
                    {stat.value}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        </Paper>

        {/* Tabs - Clean Corporate Style */}
        <Paper 
          elevation={0}
          sx={{ 
            mb: 3,
            bgcolor: '#FFFFFF',
            borderRadius: 2,
            border: '1px solid #E5E7EB',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
          }}
        >
          <Tabs
            value={activeTab}
            onChange={(e, newValue) => setActiveTab(newValue)}
            sx={{
              borderBottom: 1,
              borderColor: '#E5E7EB',
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.9375rem',
                minHeight: 64,
                color: '#6B7280',
                transition: 'all 0.2s ease',
                '&.Mui-selected': {
                  color: '#14B8A6'
                },
                '&:hover': {
                  color: '#14B8A6',
                  bgcolor: 'rgba(20, 184, 166, 0.04)'
                }
              },
              '& .MuiTabs-indicator': {
                backgroundColor: '#14B8A6',
                height: 3
              }
            }}
          >
            <Tab
              icon={<AssignmentIcon />}
              iconPosition="start"
              label="Work Readiness Assignments"
            />
          </Tabs>
        </Paper>

        {/* Tab Content - USE DATABASE DATA, NOT CACHED AUTH DATA */}
        {activeTab === 0 && user?.id && teamLeaderData?.team && (
          <WorkReadinessAssignmentManager 
            teamLeaderId={user.id} 
            team={teamLeaderData.team} 
          />
        )}
        
        {/* Removed Unselected Workers Manager */}
      </Container>
    </Box>
  );
};

export default WorkReadinessAssignments;
