import React, { memo } from 'react';
import { Box, IconButton, Tooltip, Typography } from '@mui/material';
import {
  Visibility,
  Edit,
  VideoCall,
  ContentCopy,
  CheckCircle,
  Cancel,
  PlayArrow,
  Delete
} from '@mui/icons-material';
import { Appointment } from '../../types/appointment.types';
import { APPOINTMENT_STATUS } from '../../constants/appointmentConstants';

interface AppointmentActionsProps {
  appointment: Appointment;
  isWorker: boolean;
  onViewDetails: (appointment: Appointment) => void;
  onEdit: (appointment: Appointment) => void;
  onStatusUpdate: (id: string, status: string) => void;
  onConfirm: (id: string) => void;
  onDecline: (id: string) => void;
  onDelete: (id: string) => void;
  copyToClipboard: (text: string) => Promise<void>;
}

export const AppointmentActions: React.FC<AppointmentActionsProps> = memo(({
  appointment,
  isWorker,
  onViewDetails,
  onEdit,
  onStatusUpdate,
  onConfirm,
  onDecline,
  onDelete,
  copyToClipboard
}) => {
  if (isWorker) {
    return (
      <Box display="flex" gap={0.5}>
        {appointment.status === APPOINTMENT_STATUS.SCHEDULED && (
          <>
            <Tooltip title="Confirm Appointment">
              <IconButton 
                size="small" 
                color="success"
                onClick={() => onConfirm(appointment._id)}
              >
                <CheckCircle />
              </IconButton>
            </Tooltip>
            <Tooltip title="Decline Appointment">
              <IconButton 
                size="small" 
                color="error"
                onClick={() => onDecline(appointment._id)}
              >
                <Cancel />
              </IconButton>
            </Tooltip>
          </>
        )}
        {appointment.status === APPOINTMENT_STATUS.CONFIRMED && (
          <>
            <Typography variant="caption" color="success.main" sx={{ mr: 1 }}>
              Confirmed ✓
            </Typography>
            {appointment.location === 'telehealth' && appointment.telehealthInfo?.zoomMeeting && (
              <>
                <Tooltip title="Join Zoom Meeting">
                  <IconButton 
                    size="small" 
                    color="primary"
                    onClick={() => {
                      console.log('Worker joining Zoom meeting:', appointment.telehealthInfo?.zoomMeeting?.joinUrl);
                      window.open(appointment.telehealthInfo!.zoomMeeting!.joinUrl, '_blank');
                    }}
                  >
                    <VideoCall />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Copy Meeting Link">
                  <IconButton 
                    size="small" 
                    onClick={() => copyToClipboard(appointment.telehealthInfo!.zoomMeeting!.joinUrl)}
                  >
                    <ContentCopy />
                  </IconButton>
                </Tooltip>
              </>
            )}
          </>
        )}
        {appointment.status === APPOINTMENT_STATUS.COMPLETED && (
          <Typography variant="caption" color="info.main">
            Completed ✓
          </Typography>
        )}
      </Box>
    );
  }

  // Clinician actions
  return (
    <Box display="flex" gap={0.5}>
      <Tooltip title="View Details">
        <IconButton size="small" onClick={() => onViewDetails(appointment)}>
          <Visibility />
        </IconButton>
      </Tooltip>
      <Tooltip title="Edit">
        <IconButton size="small" onClick={() => onEdit(appointment)}>
          <Edit />
        </IconButton>
      </Tooltip>
      {appointment.location === 'telehealth' && appointment.telehealthInfo?.zoomMeeting && (
        <Tooltip title="Start Zoom Meeting">
          <IconButton 
            size="small" 
            color="primary"
            onClick={() => {
              console.log('Starting Zoom meeting:', appointment.telehealthInfo?.zoomMeeting?.joinUrl);
              window.open(appointment.telehealthInfo!.zoomMeeting!.joinUrl, '_blank');
            }}
          >
            <VideoCall />
          </IconButton>
        </Tooltip>
      )}
      {appointment.status === APPOINTMENT_STATUS.SCHEDULED && (
        <Tooltip title="Confirm">
          <IconButton 
            size="small" 
            onClick={() => onStatusUpdate(appointment._id, APPOINTMENT_STATUS.CONFIRMED)}
          >
            <CheckCircle />
          </IconButton>
        </Tooltip>
      )}
      {appointment.status === APPOINTMENT_STATUS.CONFIRMED && (
        <Tooltip title="Start">
          <IconButton 
            size="small" 
            onClick={() => onStatusUpdate(appointment._id, APPOINTMENT_STATUS.IN_PROGRESS)}
          >
            <PlayArrow />
          </IconButton>
        </Tooltip>
      )}
      {appointment.status === APPOINTMENT_STATUS.IN_PROGRESS && (
        <Tooltip title="Complete">
          <IconButton 
            size="small" 
            onClick={() => onStatusUpdate(appointment._id, APPOINTMENT_STATUS.COMPLETED)}
          >
            <CheckCircle />
          </IconButton>
        </Tooltip>
      )}
      <Tooltip title="Delete Appointment">
        <IconButton 
          size="small" 
          color="error"
          onClick={() => onDelete(appointment._id)}
        >
          <Delete />
        </IconButton>
      </Tooltip>
    </Box>
  );
});

AppointmentActions.displayName = 'AppointmentActions';

