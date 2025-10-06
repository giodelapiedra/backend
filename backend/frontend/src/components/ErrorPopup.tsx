import React from 'react';
import { Box, Typography, IconButton } from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';

interface ErrorPopupProps {
  message: string;
  onClose: () => void;
  show: boolean;
}

const ErrorPopup: React.FC<ErrorPopupProps> = ({ message, onClose, show }) => {
  if (!show) return null;

  return (
    <>
      {/* Backdrop */}
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 9998,
          animation: 'fadeIn 0.3s ease-out',
        }}
        onClick={onClose}
      />
      
      {/* Popup */}
      <Box
        sx={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
          padding: '24px',
          minWidth: '320px',
          maxWidth: '400px',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'flex-start',
          gap: '16px',
          animation: 'fadeIn 0.3s ease-out',
          '@keyframes fadeIn': {
            '0%': {
              opacity: 0,
              transform: 'translate(-50%, -50%) scale(0.9)',
            },
            '100%': {
              opacity: 1,
              transform: 'translate(-50%, -50%) scale(1)',
            },
          },
        }}
      >
      {/* Error Icon */}
      <Box
        sx={{
          width: '24px',
          height: '24px',
          borderRadius: '50%',
          backgroundColor: '#1976d2',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          mt: '2px',
        }}
      >
        <Typography
          sx={{
            color: 'white',
            fontSize: '14px',
            fontWeight: 'bold',
            lineHeight: 1,
          }}
        >
          !
        </Typography>
      </Box>

      {/* Error Content */}
      <Box sx={{ flex: 1 }}>
        <Typography
          variant="h6"
          sx={{
            color: '#1976d2',
            fontWeight: 'bold',
            fontSize: '16px',
            marginBottom: '4px',
            lineHeight: 1.2,
          }}
        >
          Invalid credentials
        </Typography>
        <Typography
          sx={{
            color: '#666',
            fontSize: '14px',
            lineHeight: 1.4,
          }}
        >
          {message}
        </Typography>
      </Box>

      {/* Close Button */}
      <IconButton
        onClick={onClose}
        sx={{
          padding: '4px',
          color: '#999',
          '&:hover': {
            backgroundColor: '#f5f5f5',
            color: '#666',
          },
        }}
      >
        <CloseIcon sx={{ fontSize: '18px' }} />
      </IconButton>
      </Box>
    </>
  );
};

export default ErrorPopup;
