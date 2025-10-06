import React, { useState, useEffect } from 'react';
import { 
  Snackbar, 
  Alert, 
  AlertTitle,
  Slide,
  SlideProps,
  IconButton,
  Box,
  Typography
} from '@mui/material';
import { Close, CheckCircle, Error, Warning, Info } from '@mui/icons-material';

interface ToastProps {
  open: boolean;
  onClose: () => void;
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  duration?: number;
  action?: React.ReactNode;
  position?: 'top' | 'bottom';
}

function SlideTransition(props: SlideProps) {
  return <Slide {...props} direction="up" />;
}

const Toast: React.FC<ToastProps> = ({
  open,
  onClose,
  message,
  type = 'info',
  title,
  duration = 6000,
  action,
  position = 'bottom'
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (open) {
      setIsVisible(true);
    }
  }, [open]);

  const handleClose = (event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') {
      return;
    }
    setIsVisible(false);
    setTimeout(() => {
      onClose();
    }, 300); // Wait for animation to complete
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle />;
      case 'error':
        return <Error />;
      case 'warning':
        return <Warning />;
      case 'info':
      default:
        return <Info />;
    }
  };

  const getSeverity = (): 'success' | 'error' | 'warning' | 'info' => {
    return type;
  };

  return (
    <Snackbar
      open={isVisible}
      autoHideDuration={duration}
      onClose={handleClose}
      TransitionComponent={SlideTransition}
      anchorOrigin={{
        vertical: position,
        horizontal: 'right'
      }}
      sx={{
        '& .MuiSnackbarContent-root': {
          minWidth: 300,
          maxWidth: 500
        }
      }}
    >
      <Alert
        onClose={handleClose}
        severity={getSeverity()}
        variant="filled"
        icon={getIcon()}
        action={
          <Box display="flex" alignItems="center" gap={1}>
            {action}
            <IconButton
              size="small"
              aria-label="close"
              color="inherit"
              onClick={handleClose}
            >
              <Close fontSize="small" />
            </IconButton>
          </Box>
        }
        sx={{
          width: '100%',
          '& .MuiAlert-message': {
            width: '100%'
          }
        }}
      >
        {title && (
          <AlertTitle sx={{ fontWeight: 'bold', mb: 0.5 }}>
            {title}
          </AlertTitle>
        )}
        <Typography variant="body2" component="div">
          {message}
        </Typography>
      </Alert>
    </Snackbar>
  );
};

export default Toast;
