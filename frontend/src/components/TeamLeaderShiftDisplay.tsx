import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Alert,
  CircularProgress,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Schedule,
  AccessTime,
  CalendarToday,
  Refresh,
  CheckCircle,
  Schedule as ScheduleIcon,
  TrendingUp,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext.supabase';
import { authClient } from '../lib/supabase';

// Utility function to get time until next shift
const getTimeUntilNextShift = (startTime: string): string => {
  const now = new Date();
  const [hours, minutes] = startTime.split(':').map(Number);
  const shiftStart = new Date();
  shiftStart.setHours(hours, minutes, 0, 0);
  
  if (shiftStart <= now) {
    shiftStart.setDate(shiftStart.getDate() + 1);
  }
  
  const diffMs = shiftStart.getTime() - now.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  
  if (diffHours > 0) {
    return `${diffHours}h ${diffMinutes}m`;
  }
  return `${diffMinutes}m`;
};

interface ShiftAssignment {
  shift_id: string;
  shift_name: string;
  start_time: string;
  end_time: string;
  color: string;
  effective_date: string;
  end_date?: string;
}

const TeamLeaderShiftDisplay: React.FC = () => {
  const { user } = useAuth();
  const [currentShift, setCurrentShift] = useState<ShiftAssignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [timeUntilNext, setTimeUntilNext] = useState<string>('');

  // API configuration
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

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

  // Fetch current shift assignment
  const fetchCurrentShift = async (isRefresh = false) => {
    if (!user?.id) return;

    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

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
          const shiftData = {
            shift_id: activeShift.id,
            shift_name: activeShift.shift_types.name,
            start_time: activeShift.shift_types.start_time,
            end_time: activeShift.shift_types.end_time,
            color: activeShift.shift_types.color,
            effective_date: activeShift.effective_date,
            end_date: activeShift.end_date
          };
          setCurrentShift(shiftData);
          
          // Update time until next shift
          setTimeUntilNext(getTimeUntilNextShift(shiftData.start_time));
        }
      }
    } catch (error) {
      console.error('Error fetching current shift:', error);
      setError('Failed to load shift information');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    fetchCurrentShift();
  }, [user?.id]);

  // Update time until next shift every minute
  useEffect(() => {
    if (!currentShift) return;

    const interval = setInterval(() => {
      setTimeUntilNext(getTimeUntilNextShift(currentShift.start_time));
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [currentShift]);


  return (
    <Card 
      elevation={0}
      sx={{ 
        mb: 3,
        backgroundColor: '#FFFFFF',
        border: '1px solid #E5E7EB',
        borderRadius: 2,
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          borderColor: '#D1D5DB'
        }
      }}
    >
      <CardContent sx={{ p: 3 }}>
        {/* Header */}
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
          <Box display="flex" alignItems="center">
            <Box sx={{
              p: 1,
              borderRadius: 1,
              backgroundColor: '#F3F4F6',
              mr: 2
            }}>
              <ScheduleIcon sx={{ color: '#6B7280', fontSize: 20 }} />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={600} color="#111827" sx={{ mb: 0.5 }}>
                Current Shift Assignment
              </Typography>
              <Typography variant="body2" color="#6B7280">
                Your active work schedule
              </Typography>
            </Box>
          </Box>
          <Tooltip title="Refresh shift data">
            <IconButton 
              onClick={() => fetchCurrentShift(true)}
              disabled={refreshing}
              size="small"
              sx={{ 
                color: '#6B7280',
                backgroundColor: '#F9FAFB',
                border: '1px solid #E5E7EB',
                '&:hover': { 
                  backgroundColor: '#F3F4F6',
                  borderColor: '#D1D5DB'
                },
                transition: 'all 0.2s ease'
              }}
            >
              {refreshing ? <CircularProgress size={16} sx={{ color: '#6B7280' }} /> : <Refresh sx={{ fontSize: 16 }} />}
            </IconButton>
          </Tooltip>
        </Box>

        {/* Error State */}
        {error && (
          <Alert 
            severity="error" 
            sx={{ 
              mb: 3,
              borderRadius: 1,
              backgroundColor: '#FEF2F2',
              border: '1px solid #FECACA',
              '& .MuiAlert-icon': {
                color: '#DC2626'
              }
            }}
          >
            {error}
          </Alert>
        )}

        {/* Loading State */}
        {loading && (
          <Box display="flex" flexDirection="column" alignItems="center" py={4}>
            <CircularProgress size={32} sx={{ color: '#6B7280', mb: 2 }} />
            <Typography variant="body2" color="#6B7280">
              Loading shift information...
            </Typography>
          </Box>
        )}

        {currentShift ? (
          <Box>
            {/* Current Shift Display */}
            <Box 
              sx={{ 
                p: 3, 
                borderRadius: 2, 
                backgroundColor: '#F9FAFB',
                border: '1px solid #E5E7EB',
                mb: 3,
                position: 'relative'
              }}
            >
              {/* Shift Header */}
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                <Box display="flex" alignItems="center">
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      bgcolor: currentShift.color,
                      mr: 2
                    }}
                  />
                  <Typography variant="h5" fontWeight={600} color="#111827">
                    {currentShift.shift_name}
                  </Typography>
                </Box>
                <Chip 
                  icon={<CheckCircle sx={{ fontSize: 16 }} />}
                  label="Active" 
                  size="small" 
                  sx={{ 
                    backgroundColor: '#D1FAE5',
                    color: '#065F46',
                    border: '1px solid #A7F3D0',
                    fontWeight: 500,
                    '& .MuiChip-icon': {
                      color: '#065F46'
                    }
                  }}
                />
              </Box>
              
              {/* Shift Times */}
              <Box display="flex" alignItems="center" mb={2}>
                <AccessTime sx={{ color: '#6B7280', mr: 1.5, fontSize: 18 }} />
                <Typography variant="h6" fontWeight={500} color="#374151">
                  {currentShift.start_time} - {currentShift.end_time}
                </Typography>
              </Box>

              {/* Effective Dates */}
              <Box display="flex" alignItems="center" mb={2}>
                <CalendarToday sx={{ color: '#6B7280', mr: 1.5, fontSize: 18 }} />
                <Typography variant="body1" color="#6B7280">
                  Effective: {new Date(currentShift.effective_date).toLocaleDateString()}
                  {currentShift.end_date && ` - ${new Date(currentShift.end_date).toLocaleDateString()}`}
                </Typography>
              </Box>

              {/* Time Until Next Shift */}
              {timeUntilNext && (
                <Box sx={{ 
                  p: 2, 
                  borderRadius: 1, 
                  backgroundColor: '#FFFBEB',
                  border: '1px solid #FDE68A'
                }}>
                  <Box display="flex" alignItems="center">
                    <TrendingUp sx={{ color: '#92400E', mr: 1, fontSize: 16 }} />
                    <Typography variant="body2" fontWeight={500} color="#92400E">
                      Next shift starts in: {timeUntilNext}
                    </Typography>
                  </Box>
                </Box>
              )}
            </Box>

            {/* Status Message */}
            <Box sx={{ 
              p: 2, 
              borderRadius: 1, 
              backgroundColor: '#F3F4F6',
              border: '1px solid #E5E7EB'
            }}>
              <Typography variant="body2" color="#6B7280">
                {currentShift.end_date ? 
                  `Assignment ends ${new Date(currentShift.end_date).toLocaleDateString()}` :
                  'Ongoing assignment - No end date set'
                }
              </Typography>
            </Box>
          </Box>
        ) : !loading && (
          <Box textAlign="center" py={6}>
            <Box sx={{
              p: 2,
              borderRadius: '50%',
              backgroundColor: '#F3F4F6',
              display: 'inline-flex',
              mb: 3
            }}>
              <ScheduleIcon sx={{ fontSize: 32, color: '#9CA3AF' }} />
            </Box>
            <Typography variant="h6" fontWeight={600} color="#374151" gutterBottom>
              No Shift Assigned
            </Typography>
            <Typography variant="body2" color="#6B7280" sx={{ maxWidth: 300, mx: 'auto' }}>
              You don't have an active shift assignment. Contact your site supervisor for shift scheduling.
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default TeamLeaderShiftDisplay;
