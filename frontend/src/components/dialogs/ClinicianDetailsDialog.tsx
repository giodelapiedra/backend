import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Avatar,
  Chip,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
} from '@mui/material';
import { LocalHospital, Assignment } from '@mui/icons-material';
import { getAvailabilityScoreColor, getAvailabilityStatusColor } from '../../utils/themeUtils';

interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  specialty?: string;
  isAvailable?: boolean;
  availabilityReason?: string;
  lastAvailabilityUpdate?: string;
}

interface Clinician extends User {
  workload: {
    activeCases: number;
    appointmentsToday: number;
    appointmentsThisWeek: number;
    availabilityScore: number;
    availabilityStatus: 'available' | 'moderate' | 'busy';
  };
}

interface Case {
  _id: string;
  caseNumber?: string;
  case_number?: string;
  priority: string;
  status: string;
  worker: User;
  clinician?: User;
  injuryDetails: {
    bodyPart: string;
    injuryType: string;
  };
}

interface ClinicianDetailsDialogProps {
  open: boolean;
  onClose: () => void;
  selectedClinician: Clinician | null;
  cases: Case[];
  onUpdateAvailability: (clinicianId: string, isAvailable: boolean, reason: string) => void;
}

const ClinicianDetailsDialog: React.FC<ClinicianDetailsDialogProps> = ({
  open,
  onClose,
  selectedClinician,
  cases,
  onUpdateAvailability,
}) => {
  if (!selectedClinician) return null;

  const clinicianCases = cases.filter(c => c.clinician?._id === selectedClinician._id);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Clinician Details - Dr. {selectedClinician.firstName} {selectedClinician.lastName}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          {/* Clinician Info */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Clinician Information
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                <Avatar sx={{ bgcolor: getAvailabilityScoreColor(selectedClinician.workload.availabilityScore), width: 60, height: 60 }}>
                  <LocalHospital sx={{ fontSize: 30 }} />
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h6">
                    Dr. {selectedClinician.firstName} {selectedClinician.lastName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedClinician.specialty || 'General Medicine'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedClinician.email}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedClinician.phone}
                  </Typography>
                </Box>
                <Chip
                  label={selectedClinician.workload.availabilityStatus.toUpperCase()}
                  color={getAvailabilityStatusColor(selectedClinician.workload.availabilityStatus)}
                  size="medium"
                />
              </Box>

              {/* Availability Score */}
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="body1" fontWeight="bold">Availability Score</Typography>
                  <Typography variant="h6" fontWeight="bold" color={getAvailabilityScoreColor(selectedClinician.workload.availabilityScore)}>
                    {selectedClinician.workload.availabilityScore}%
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={selectedClinician.workload.availabilityScore}
                  sx={{
                    height: 12,
                    borderRadius: 6,
                    backgroundColor: 'rgba(0,0,0,0.1)',
                    '& .MuiLinearProgress-bar': {
                      backgroundColor: getAvailabilityScoreColor(selectedClinician.workload.availabilityScore)
                    }
                  }}
                />
              </Box>

              {/* Workload Summary */}
              <Box sx={{ display: 'flex', gap: 3 }}>
                <Box sx={{ textAlign: 'center', flex: 1 }}>
                  <Typography variant="h4" color="primary" fontWeight="bold">
                    {selectedClinician.workload.activeCases}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Active Cases
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'center', flex: 1 }}>
                  <Typography variant="h4" color="secondary" fontWeight="bold">
                    {selectedClinician.workload.appointmentsToday}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Today's Appointments
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'center', flex: 1 }}>
                  <Typography variant="h4" color="info.main" fontWeight="bold">
                    {selectedClinician.workload.appointmentsThisWeek}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    This Week
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>

          {/* Active Cases */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Active Cases
              </Typography>
              {clinicianCases.length === 0 ? (
                <Typography color="text.secondary" textAlign="center" py={2}>
                  No active cases assigned
                </Typography>
              ) : (
                <List>
                  {clinicianCases.map((caseItem) => (
                    <ListItem key={caseItem._id} divider>
                      <ListItemIcon>
                        <Assignment />
                      </ListItemIcon>
                      <ListItemText
                        primary={caseItem.caseNumber || caseItem.case_number || ''}
                        secondary={
                          <Box>
                            <Typography variant="caption" color="text.secondary">
                              {caseItem.worker?.firstName} {caseItem.worker?.lastName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" display="block">
                              {caseItem.injuryDetails?.bodyPart} - {caseItem.injuryDetails?.injuryType}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Priority: {caseItem.priority} | Status: {caseItem.status}
                            </Typography>
                          </Box>
                        }
                      />
                      <Chip
                        label={caseItem.priority?.toUpperCase()}
                        color={caseItem.priority === 'urgent' ? 'error' : caseItem.priority === 'high' ? 'warning' : 'default'}
                        size="small"
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>

          {/* Availability Management */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Availability Management
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <Typography variant="body2">
                  Current Status: {selectedClinician.isAvailable ? 'Available' : 'Unavailable'}
                </Typography>
                <Button
                  variant={selectedClinician.isAvailable ? 'outlined' : 'contained'}
                  color={selectedClinician.isAvailable ? 'error' : 'success'}
                  size="small"
                  onClick={() => {
                    onUpdateAvailability(
                      selectedClinician._id, 
                      !selectedClinician.isAvailable,
                      selectedClinician.isAvailable ? 'Marked unavailable by case manager' : 'Marked available by case manager'
                    );
                  }}
                >
                  {selectedClinician.isAvailable ? 'Mark Unavailable' : 'Mark Available'}
                </Button>
              </Box>
              {selectedClinician.availabilityReason && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  Reason: {selectedClinician.availabilityReason}
                </Typography>
              )}
              {selectedClinician.lastAvailabilityUpdate && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  Last Updated: {new Date(selectedClinician.lastAvailabilityUpdate).toLocaleString()}
                </Typography>
              )}
            </CardContent>
          </Card>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default ClinicianDetailsDialog;

