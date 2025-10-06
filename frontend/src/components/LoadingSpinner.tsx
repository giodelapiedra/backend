import React from 'react';
import { Box, CircularProgress, Typography, Fade } from '@mui/material';

interface LoadingSpinnerProps {
  message?: string;
  size?: number;
  fullScreen?: boolean;
  color?: 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info';
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message = 'Loading...',
  size = 40,
  fullScreen = false,
  color = 'primary'
}) => {
  const content = (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      gap={2}
      sx={{
        ...(fullScreen && {
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          zIndex: 9999
        })
      }}
    >
      <Fade in={true} timeout={500}>
        <CircularProgress 
          size={size} 
          color={color}
          thickness={4}
        />
      </Fade>
      {message && (
        <Fade in={true} timeout={800}>
          <Typography 
            variant="body2" 
            color="text.secondary"
            sx={{ 
              fontWeight: 500,
              textAlign: 'center',
              maxWidth: 300
            }}
          >
            {message}
          </Typography>
        </Fade>
      )}
    </Box>
  );

  return content;
};

export default LoadingSpinner;
