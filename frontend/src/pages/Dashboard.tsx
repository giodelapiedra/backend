import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.supabase';
import { Box, CircularProgress, Typography } from '@mui/material';

const Dashboard: React.FC = () => {
  const { user, loading, error } = useAuth();

  console.log('🔄 Dashboard component - user:', user, 'loading:', loading, 'error:', error);

  React.useEffect(() => {
    if (loading) {
      console.log('⏳ Dashboard: Loading state active');
    }
    if (error) {
      console.error('❌ Dashboard: Error state:', error);
    }
    if (user) {
      console.log('✅ Dashboard: User loaded:', user);
    }
  }, [loading, error, user]);

  if (loading) {
    console.log('⏳ Dashboard: Rendering loading state...');
    return (
      <Box 
        display="flex" 
        flexDirection="column"
        justifyContent="center" 
        alignItems="center" 
        minHeight="100vh"
        sx={{ background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)' }}
      >
        <CircularProgress size={60} sx={{ mb: 2 }} />
        <Typography variant="h6" sx={{ color: '#1976d2' }}>
          Loading dashboard...
        </Typography>
        {error && (
          <Typography variant="body2" color="error" sx={{ mt: 2 }}>
            {error}
          </Typography>
        )}
      </Box>
    );
  }

  if (!user) {
    console.log('⚠️ Dashboard: No user, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  // Route to role-specific dashboard
  const getRoleDashboard = () => {
    console.log('Dashboard component - Current user:', user);
    
    if (!user?.role) {
      console.error('Dashboard: No user role found');
      return '/login';
    }
    
    console.log('Dashboard: User role:', user.role);
    
    const roleRoutes: Record<string, string> = {
      admin: '/admin',
      worker: '/worker',
      clinician: '/clinician',
      employer: '/employer',
      case_manager: '/case-manager',
      site_supervisor: '/site-supervisor',
      gp_insurer: '/gp-insurer',
      team_leader: '/team-leader'
    };
    
    const targetRoute = roleRoutes[user.role];
    if (!targetRoute) {
      console.error('Dashboard: Unknown role:', user.role);
      return '/dashboard';
    }
    
    console.log('Dashboard: Found route for role:', targetRoute);
    return targetRoute;
  };

  const targetRoute = getRoleDashboard();
  console.log('Dashboard: Redirecting to:', targetRoute);
  return <Navigate to={targetRoute} replace />;
};

export default Dashboard;
