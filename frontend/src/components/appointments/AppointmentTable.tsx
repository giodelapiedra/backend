import React, { memo } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper
} from '@mui/material';
import { Appointment } from '../../types/appointment.types';
import { AppointmentRow } from './AppointmentRow';

interface AppointmentTableProps {
  appointments: Appointment[];
  onEdit: (appointment: Appointment) => void;
  onViewDetails: (appointment: Appointment) => void;
  onStatusUpdate: (id: string, status: string) => void;
  onConfirm: (id: string) => void;
  onDecline: (id: string) => void;
  onDelete: (id: string) => void;
  copyToClipboard: (text: string) => Promise<void>;
  isWorker: boolean;
}

export const AppointmentTable: React.FC<AppointmentTableProps> = memo(({
  appointments,
  onEdit,
  onViewDetails,
  onStatusUpdate,
  onConfirm,
  onDecline,
  onDelete,
  copyToClipboard,
  isWorker
}) => {
  if (appointments.length === 0) {
    return (
      <Box textAlign="center" py={4}>
        <Typography color="text.secondary">
          No appointments found
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <TableContainer 
        component={Paper} 
        variant="outlined"
        sx={{ 
          overflowX: 'auto',
          borderRadius: 2,
          border: '1px solid #e5e7eb',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}
      >
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#f9fafb' }}>
              <TableCell sx={{ 
                minWidth: { xs: '120px', sm: 'auto' },
                fontWeight: 600,
                color: '#374151',
                fontSize: '14px',
                borderBottom: '1px solid #e5e7eb'
              }}>Date & Time</TableCell>
              {isWorker ? (
                <>
                  <TableCell sx={{ 
                    minWidth: { xs: '100px', sm: 'auto' },
                    fontWeight: 600,
                    color: '#374151',
                    fontSize: '14px',
                    borderBottom: '1px solid #e5e7eb'
                  }}>Clinician</TableCell>
                  <TableCell sx={{ 
                    minWidth: { xs: '80px', sm: 'auto' },
                    fontWeight: 600,
                    color: '#374151',
                    fontSize: '14px',
                    borderBottom: '1px solid #e5e7eb'
                  }}>Type</TableCell>
                  <TableCell sx={{ 
                    minWidth: { xs: '80px', sm: 'auto' },
                    fontWeight: 600,
                    color: '#374151',
                    fontSize: '14px',
                    borderBottom: '1px solid #e5e7eb'
                  }}>Location</TableCell>
                  <TableCell sx={{ 
                    minWidth: { xs: '60px', sm: 'auto' },
                    fontWeight: 600,
                    color: '#374151',
                    fontSize: '14px',
                    borderBottom: '1px solid #e5e7eb'
                  }}>Duration</TableCell>
                  <TableCell sx={{ 
                    minWidth: { xs: '80px', sm: 'auto' },
                    fontWeight: 600,
                    color: '#374151',
                    fontSize: '14px',
                    borderBottom: '1px solid #e5e7eb'
                  }}>Status</TableCell>
                  <TableCell sx={{ 
                    minWidth: { xs: '100px', sm: 'auto' },
                    fontWeight: 600,
                    color: '#374151',
                    fontSize: '14px',
                    borderBottom: '1px solid #e5e7eb'
                  }}>Actions</TableCell>
                </>
              ) : (
                <>
                  <TableCell sx={{ 
                    minWidth: { xs: '100px', sm: 'auto' },
                    fontWeight: 600,
                    color: '#374151',
                    fontSize: '14px',
                    borderBottom: '1px solid #e5e7eb'
                  }}>Patient</TableCell>
                  <TableCell sx={{ 
                    minWidth: { xs: '80px', sm: 'auto' },
                    fontWeight: 600,
                    color: '#374151',
                    fontSize: '14px',
                    borderBottom: '1px solid #e5e7eb'
                  }}>Type</TableCell>
                  <TableCell sx={{ 
                    minWidth: { xs: '80px', sm: 'auto' },
                    fontWeight: 600,
                    color: '#374151',
                    fontSize: '14px',
                    borderBottom: '1px solid #e5e7eb'
                  }}>Location</TableCell>
                  <TableCell sx={{ 
                    minWidth: { xs: '60px', sm: 'auto' },
                    fontWeight: 600,
                    color: '#374151',
                    fontSize: '14px',
                    borderBottom: '1px solid #e5e7eb'
                  }}>Duration</TableCell>
                  <TableCell sx={{ 
                    minWidth: { xs: '100px', sm: 'auto' },
                    fontWeight: 600,
                    color: '#374151',
                    fontSize: '14px',
                    borderBottom: '1px solid #e5e7eb'
                  }}>Confirmation Status</TableCell>
                  <TableCell sx={{ 
                    minWidth: { xs: '80px', sm: 'auto' },
                    fontWeight: 600,
                    color: '#374151',
                    fontSize: '14px',
                    borderBottom: '1px solid #e5e7eb'
                  }}>Status</TableCell>
                  <TableCell sx={{ 
                    minWidth: { xs: '100px', sm: 'auto' },
                    fontWeight: 600,
                    color: '#374151',
                    fontSize: '14px',
                    borderBottom: '1px solid #e5e7eb'
                  }}>Actions</TableCell>
                </>
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {appointments.map((appointment) => (
              <AppointmentRow
                key={appointment._id}
                appointment={appointment}
                isWorker={isWorker}
                onEdit={onEdit}
                onViewDetails={onViewDetails}
                onStatusUpdate={onStatusUpdate}
                onConfirm={onConfirm}
                onDecline={onDecline}
                onDelete={onDelete}
                copyToClipboard={copyToClipboard}
              />
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
});

AppointmentTable.displayName = 'AppointmentTable';


