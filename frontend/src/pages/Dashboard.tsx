import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Box, CircularProgress } from '@mui/material';

const Dashboard: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <Box 
        display="flex" 
        justifyContent="center" 
        alignItems="center" 
        minHeight="100vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Route to role-specific dashboard
  const getRoleDashboard = () => {
    switch (user.role) {
      case 'admin':
        return '/admin';
      case 'worker':
        return '/worker';
      case 'clinician':
        return '/clinician';
      case 'employer':
        return '/employer';
      case 'case_manager':
        return '/case-manager';
      case 'site_supervisor':
        return '/site-supervisor';
      case 'gp_insurer':
        return '/gp-insurer';
      case 'team_leader':
        return '/team-leader';
      default:
        return '/dashboard';
    }
  };

  return <Navigate to={getRoleDashboard()} replace />;
};

export default Dashboard;
