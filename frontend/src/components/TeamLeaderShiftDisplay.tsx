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
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext.supabase';
import { authClient } from '../lib/supabase';

// Custom SVG Icons for enhanced UI
const CustomSVGIcons = {
  ClockIcon: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
      <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  CalendarIcon: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke="currentColor" strokeWidth="2"/>
      <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  RefreshIcon: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <polyline points="23 4 23 10 17 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <polyline points="1 20 1 14 7 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
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
          setCurrentShift({
            shift_id: activeShift.id,
            shift_name: activeShift.shift_types.name,
            start_time: activeShift.shift_types.start_time,
            end_time: activeShift.shift_types.end_time,
            color: activeShift.shift_types.color,
            effective_date: activeShift.effective_date,
            end_date: activeShift.end_date
          });
        }
      }
    } catch (error) {
      console.error('Error fetching current shift:', error);
    }
  };

  // Load data on component mount
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        await fetchCurrentShift();
      } catch (error) {
        console.error('Error loading shift data:', error);
        setError('Failed to load shift information');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user?.id]);

  // Refresh data
  const handleRefresh = async () => {
    setLoading(true);
    try {
      await fetchCurrentShift();
    } catch (error) {
      console.error('Error refreshing shift data:', error);
      setError('Failed to refresh shift information');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" alignItems="center" justifyContent="center" py={2}>
            <CircularProgress size={24} sx={{ mr: 2 }} />
            <Typography variant="body2" color="text.secondary">
              Loading shift information...
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card 
      sx={{ 
        mb: 3,
        backgroundColor: 'white',
        border: '1px solid #e5e7eb',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        transition: 'all 0.2s ease',
        '&:hover': {
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        }
      }}
    >
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Box display="flex" alignItems="center">
            <CustomSVGIcons.ClockIcon />
            <Typography variant="h6" component="h3" sx={{ ml: 1, fontWeight: '600', color: '#111827' }}>
              Current Shift Assignment
            </Typography>
          </Box>
          <Tooltip title="Refresh shift information">
            <IconButton 
              size="small" 
              onClick={handleRefresh} 
              disabled={loading}
              sx={{
                transition: 'all 0.2s ease',
                '&:hover': {
                  backgroundColor: '#f3f4f6',
                }
              }}
            >
              <CustomSVGIcons.RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {currentShift ? (
          <Box>
            {/* Current Shift Display */}
            <Box 
              sx={{ 
                p: 2, 
                borderRadius: 2, 
                backgroundColor: `${currentShift.color}15`,
                border: `2px solid ${currentShift.color}`,
                mb: 2
              }}
            >
              <Box display="flex" alignItems="center" mb={1}>
                <Box
                  width={16}
                  height={16}
                  borderRadius="50%"
                  bgcolor={currentShift.color}
                  mr={2}
                />
                <Typography variant="h5" fontWeight="bold" color={currentShift.color}>
                  {currentShift.shift_name}
                </Typography>
              </Box>
              
              <Box display="flex" alignItems="center" mb={1}>
                <CustomSVGIcons.ClockIcon />
                <Typography variant="body1" fontWeight="medium" sx={{ ml: 1 }}>
                  {currentShift.start_time} - {currentShift.end_time}
                </Typography>
              </Box>

              <Box display="flex" alignItems="center" mb={1}>
                <CustomSVGIcons.CalendarIcon />
                <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                  Effective: {new Date(currentShift.effective_date).toLocaleDateString()}
                  {currentShift.end_date && ` - ${new Date(currentShift.end_date).toLocaleDateString()}`}
                </Typography>
              </Box>

              <Chip 
                label="Active" 
                size="small" 
                color="success" 
                variant="outlined"
                sx={{ mt: 1 }}
              />
            </Box>

            {/* Simple Status Message */}
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="text.secondary" textAlign="center">
                {currentShift.end_date ? 
                  `Assignment ends ${new Date(currentShift.end_date).toLocaleDateString()}` :
                  'Ongoing assignment'
                }
              </Typography>
            </Box>
          </Box>
        ) : (
          <Box textAlign="center" py={4}>
            <CustomSVGIcons.ClockIcon />
            <Typography variant="h6" color="text.secondary" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
              No Shift Assigned
            </Typography>
            <Typography variant="body2" color="text.secondary">
              You don't have an active shift assignment. Contact your site supervisor for shift scheduling.
            </Typography>
          </Box>
        )}

      </CardContent>
    </Card>
  );
};

export default TeamLeaderShiftDisplay;
