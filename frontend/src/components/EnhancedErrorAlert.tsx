import React, { useState } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Box,
} from '@mui/material';
import { ErrorOutline } from '@mui/icons-material';

interface EnhancedErrorAlertProps {
  error: string | null;
  onClose: () => void;
  maxLength?: number;
}

const EnhancedErrorAlert: React.FC<EnhancedErrorAlertProps> = ({
  error,
  onClose,
  maxLength = 100,
}) => {
  const [showDetails, setShowDetails] = useState(false);

  if (!error) return null;

  const truncatedError = error.length > maxLength ? `${error.substring(0, maxLength)}...` : error;
  const hasMoreDetails = error.length > maxLength;

  return (
    <>
      <Alert
        severity="error"
        onClose={onClose}
        action={
          hasMoreDetails ? (
            <Button size="small" onClick={() => setShowDetails(true)}>
              Details
            </Button>
          ) : undefined
        }
        sx={{ mb: 2 }}
      >
        {truncatedError}
      </Alert>

      <Dialog open={showDetails} onClose={() => setShowDetails(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ErrorOutline color="error" />
            Error Details
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {error}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDetails(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default EnhancedErrorAlert;

