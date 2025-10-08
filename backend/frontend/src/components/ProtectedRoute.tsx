import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.supabase';
import { Box, CircularProgress, Typography } from '@mui/material';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  allowedRoles 
}) => {
  const { user, loading } = useAuth();

  // ✅ OPTIMIZATION: Removed console.log for production

  if (loading) {
    return (
      <Box 
        sx={{
          display: 'flex', 
          flexDirection: 'column',
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)'
        }}
      >
        <CircularProgress size={60} sx={{ mb: 2 }} />
        <Typography variant="h6" sx={{ color: '#1976d2' }}>
          Loading dashboard...
        </Typography>
      </Box>
    );
  }

  if (!user) {
    // ✅ OPTIMIZATION: Removed console.log - user will see login page
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // ✅ OPTIMIZATION: Removed console.log - user redirected to dashboard
    return <Navigate to="/dashboard" replace />;
  }

  // ✅ Access granted - render protected content
  return <>{children}</>;
};
