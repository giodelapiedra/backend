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
  TextField,
  FormControl,
  FormHelperText,
  InputLabel,
  Select,
  MenuItem,
  Avatar,
  Chip,
} from '@mui/material';
import { LocalHospital, CalendarToday, People } from '@mui/icons-material';
import { createImageProps } from '../../utils/imageUtils';
import { getAvailabilityStatusColor } from '../../utils/themeUtils';

interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  specialty?: string;
  isActive: boolean;
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

interface Incident {
  _id: string;
  incidentNumber: string;
  incidentDate: string;
  incidentType: string;
  severity: string;
  worker: User;
  description: string;
  photos?: Array<{
    url: string;
    caption: string;
    uploadedAt: string;
  }>;
}

interface CaseReviewDialogProps {
  open: boolean;
  onClose: () => void;
  selectedIncident: Incident | null;
  availableClinicians: Clinician[];
  clinicians: User[];
  assignmentForm: {
    clinician: string;
  };
  caseForm: {
    expectedReturnDate: string;
    notes: string;
  };
  onAssignmentFormChange: (field: string, value: any) => void;
  onCaseFormChange: (field: string, value: any) => void;
  onSubmit: () => void;
}

const CaseReviewDialog: React.FC<CaseReviewDialogProps> = ({
  open,
  onClose,
  selectedIncident,
  availableClinicians,
  clinicians,
  assignmentForm,
  caseForm,
  onAssignmentFormChange,
  onCaseFormChange,
  onSubmit,
}) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Review Incident & Assign Clinician
        {selectedIncident && (
          <>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 1 }}>
              Incident: {selectedIncident.incidentNumber} - {selectedIncident.worker?.firstName} {selectedIncident.worker?.lastName}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Type: {selectedIncident.incidentType} | Severity: {selectedIncident.severity}
            </Typography>
          </>
        )}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          {/* Incident Details Summary */}
          <Card sx={{ mb: 3, bgcolor: 'background.default' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom color="primary">
                Incident Details
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Typography variant="body2">
                  <strong>Date:</strong> {selectedIncident ? new Date(selectedIncident.incidentDate).toLocaleDateString() : ''}
                </Typography>
                <Typography variant="body2">
                  <strong>Type:</strong> {selectedIncident?.incidentType}
                </Typography>
                <Typography variant="body2">
                  <strong>Severity:</strong> {selectedIncident?.severity}
                </Typography>
                <Typography variant="body2">
                  <strong>Description:</strong> {selectedIncident?.description}
                </Typography>
              </Box>
              
              {/* Incident Photos */}
              {selectedIncident?.photos && selectedIncident.photos.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                    Incident Photos:
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 1 }}>
                    {selectedIncident.photos.map((photo, index) => (
                      <Box key={index} sx={{ position: 'relative' }}>
                        <img
                          {...createImageProps(photo.url)}
                          alt={photo.caption || `Incident photo ${index + 1}`}
                          style={{
                            width: 200,
                            height: 200,
                            objectFit: 'cover',
                            borderRadius: 8,
                            border: '2px solid #8b5cf6',
                            cursor: 'pointer',
                            display: 'block'
                          }}
                          onClick={() => window.open(createImageProps(photo.url).src, '_blank')}
                        />
                        {photo.caption && (
                          <Typography variant="caption" sx={{ 
                            display: 'block', 
                            mt: 0.5, 
                            textAlign: 'center',
                            color: 'text.secondary',
                            fontSize: '0.7rem'
                          }}>
                            {photo.caption}
                          </Typography>
                        )}
                      </Box>
                    ))}
                  </Box>
                </Box>
              )}
            </CardContent>
          </Card>

          <Box sx={{ mt: 3, mb: 3, p: 2, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', display: 'flex', alignItems: 'center', gap: 1 }}>
              <LocalHospital color="primary" />
              Clinician Assignment
            </Typography>
            
            <FormControl fullWidth error={!assignmentForm.clinician && open}>
              <InputLabel id="clinician-select-label" required>Select Clinician</InputLabel>
              <Select
                labelId="clinician-select-label"
                value={assignmentForm.clinician}
                onChange={(e) => onAssignmentFormChange('clinician', e.target.value)}
                required
                label="Select Clinician"
              >
                {availableClinicians.map((clinician) => (
                  <MenuItem 
                    key={clinician._id} 
                    value={clinician._id}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                      <Avatar sx={{ bgcolor: 'primary.main' }}>
                        <LocalHospital />
                      </Avatar>
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="subtitle1">
                          Dr. {clinician.firstName || ''} {clinician.lastName || ''}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block">
                          {clinician.specialty || 'General Practice'}
                        </Typography>
                      </Box>
                      <Chip 
                        size="small"
                        label={`${clinician.workload?.activeCases || 0} cases`}
                        color={getAvailabilityStatusColor(clinician.workload?.availabilityStatus || 'available')}
                      />
                    </Box>
                  </MenuItem>
                ))}
                {availableClinicians.length === 0 && (
                  <MenuItem disabled key="no-clinicians-available">
                    <Box sx={{ textAlign: 'center', width: '100%', py: 2 }}>
                      <Typography color="text.secondary">No clinicians available</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Please add clinicians to the system
                      </Typography>
                    </Box>
                  </MenuItem>
                )}
              </Select>
              {!assignmentForm.clinician && open && (
                <FormHelperText error>Please select a clinician</FormHelperText>
              )}
              <FormHelperText>
                {availableClinicians.length} clinician{availableClinicians.length !== 1 ? 's' : ''} available
              </FormHelperText>
            </FormControl>
            
            <Typography 
              variant="caption" 
              color="text.secondary" 
              sx={{ 
                mt: 1,
                display: 'flex',
                alignItems: 'center',
                gap: 0.5
              }}
            >
              <People fontSize="small" />
              {clinicians.length} clinician{clinicians.length !== 1 ? 's' : ''} available
            </Typography>
          </Box>

          {/* Expected Return Date */}
          <Box sx={{ mt: 3, mb: 3, p: 2, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', display: 'flex', alignItems: 'center', gap: 1 }}>
              <CalendarToday color="primary" />
              Expected Return to Work
            </Typography>
            
            <TextField
              fullWidth
              label="Expected Return Date"
              type="date"
              value={caseForm.expectedReturnDate}
              onChange={(e) => onCaseFormChange('expectedReturnDate', e.target.value)}
              InputLabelProps={{ shrink: true }}
              helperText="Estimated date when the worker is expected to return to work"
            />
          </Box>

          <TextField
            fullWidth
            label="Notes"
            multiline
            rows={3}
            value={caseForm.notes}
            onChange={(e) => onCaseFormChange('notes', e.target.value)}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button 
          variant="contained" 
          onClick={onSubmit}
          disabled={!assignmentForm.clinician}
          color={!assignmentForm.clinician ? "inherit" : "primary"}
        >
          Assign Clinician & Create Case
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CaseReviewDialog;

