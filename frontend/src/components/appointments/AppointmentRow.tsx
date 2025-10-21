import React, { memo } from 'react';
import { TableRow, TableCell, Box, Typography, Avatar, Chip, Tooltip } from '@mui/material';
import { VideoCall, CheckCircle, Cancel, Schedule } from '@mui/icons-material';
import { Appointment } from '../../types/appointment.types';
import { AppointmentActions } from './AppointmentActions';
import { getStatusIcon, getLocationIcon } from './AppointmentIcons';
import { STATUS_COLORS } from '../../constants/appointmentConstants';
import { formatDate, formatTime, formatLabel } from '../../utils/appointmentUtils';

interface AppointmentRowProps {
  appointment: Appointment;
  isWorker: boolean;
  onEdit: (appointment: Appointment) => void;
  onViewDetails: (appointment: Appointment) => void;
  onStatusUpdate: (id: string, status: string) => void;
  onConfirm: (id: string) => void;
  onDecline: (id: string) => void;
  onDelete: (id: string) => void;
  copyToClipboard: (text: string) => Promise<void>;
}

export const AppointmentRow: React.FC<AppointmentRowProps> = memo(({
  appointment,
  isWorker,
  onEdit,
  onViewDetails,
  onStatusUpdate,
  onConfirm,
  onDecline,
  onDelete,
  copyToClipboard
}) => {
  return (
    <TableRow key={appointment._id}>
      <TableCell>
        <Box>
          <Typography variant="body2" fontWeight={600}>
            {formatDate(appointment.scheduledDate)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {formatTime(appointment.scheduledDate)}
          </Typography>
        </Box>
      </TableCell>
      
      {isWorker ? (
        <TableCell>
          <Box display="flex" alignItems="center" gap={1}>
            {appointment.clinician ? (
              <>
                <Avatar sx={{ width: 32, height: 32, fontSize: '0.875rem' }}>
                  {(appointment.clinician?.firstName || '?')?.charAt(0)}{(appointment.clinician?.lastName || '')?.charAt(0)}
                </Avatar>
                <Box>
                  <Typography variant="body2">
                    {appointment.clinician.firstName} {appointment.clinician.lastName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Case: {appointment.case?.caseNumber || 'N/A'}
                  </Typography>
                </Box>
              </>
            ) : (
              <Typography variant="body2" color="text.secondary">No clinician assigned</Typography>
            )}
          </Box>
        </TableCell>
      ) : (
        <TableCell>
          <Box display="flex" alignItems="center" gap={1}>
            {appointment.worker || (appointment.case && appointment.case.worker) ? (
              <>
                <Avatar sx={{ width: 32, height: 32, fontSize: '0.875rem' }}>
                  {((appointment.worker?.firstName || appointment.case?.worker?.firstName || '?') as string).charAt(0)}
                  {((appointment.worker?.lastName || appointment.case?.worker?.lastName || '') as string).charAt(0)}
                </Avatar>
                <Box>
                  <Typography variant="body2">
                    {appointment.worker?.firstName || appointment.case?.worker?.firstName || 'Unknown'} {appointment.worker?.lastName || appointment.case?.worker?.lastName || ''}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Case: {appointment.case?.caseNumber || 'N/A'}
                  </Typography>
                </Box>
              </>
            ) : (
              <Typography variant="body2" color="text.secondary">No worker assigned</Typography>
            )}
          </Box>
        </TableCell>
      )}
      
      <TableCell>
        <Chip
          label={formatLabel(appointment.appointmentType)}
          size="small"
          variant="outlined"
        />
      </TableCell>
      
      <TableCell>
        <Box display="flex" alignItems="center" gap={0.5}>
          {getLocationIcon(appointment.location)}
          <Typography variant="body2">
            {appointment.location}
          </Typography>
          {appointment.location === 'telehealth' && appointment.telehealthInfo?.zoomMeeting && (
            <Tooltip title="Zoom Meeting Available">
              <VideoCall sx={{ fontSize: 16, color: '#2D8CFF', ml: 1 }} />
            </Tooltip>
          )}
        </Box>
      </TableCell>
      
      <TableCell>
        <Typography variant="body2">
          {appointment.duration} min
        </Typography>
      </TableCell>
      
      {!isWorker && (
        <TableCell>
          <Chip
            icon={appointment.status === 'confirmed' ? <CheckCircle /> : appointment.status === 'cancelled' ? <Cancel /> : <Schedule />}
            label={appointment.status === 'confirmed' ? 'Confirmed' : appointment.status === 'cancelled' ? 'Declined' : 'Pending'}
            color={appointment.status === 'confirmed' ? 'success' : appointment.status === 'cancelled' ? 'error' : 'warning'}
            size="small"
          />
        </TableCell>
      )}
      
      <TableCell>
        <Chip
          icon={getStatusIcon(appointment.status)}
          label={formatLabel(appointment.status)}
          color={STATUS_COLORS[appointment.status] || 'default'}
          size="small"
        />
      </TableCell>
      
      <TableCell>
        <AppointmentActions
          appointment={appointment}
          isWorker={isWorker}
          onViewDetails={onViewDetails}
          onEdit={onEdit}
          onStatusUpdate={onStatusUpdate}
          onConfirm={onConfirm}
          onDecline={onDecline}
          onDelete={onDelete}
          copyToClipboard={copyToClipboard}
        />
      </TableCell>
    </TableRow>
  );
});

AppointmentRow.displayName = 'AppointmentRow';

