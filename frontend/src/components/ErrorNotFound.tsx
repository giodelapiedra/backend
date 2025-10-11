import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { Home } from '@mui/icons-material';

const ErrorNotFound: React.FC = () => {
  // This version doesn't use useNavigate, so it can be used in ErrorBoundary
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        textAlign: 'center',
        p: 3,
      }}
    >
      <Typography variant="h1" component="h1" sx={{ fontSize: '8rem', fontWeight: 'bold', color: 'primary.main' }}>
        404
      </Typography>
      <Typography variant="h4" component="h2" gutterBottom>
        Page Not Found
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 400 }}>
        The page you're looking for doesn't exist or has been moved.
      </Typography>
      <Button
        variant="contained"
        startIcon={<Home />}
        onClick={() => window.location.href = '/dashboard'}
        size="large"
      >
        Go to Dashboard
      </Button>
    </Box>
  );
};

export default ErrorNotFound;
