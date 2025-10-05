import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Alert,
  CircularProgress,
  Box,
  Typography,
  Chip
} from '@mui/material';
import { Assignment, Person, Work } from '@mui/icons-material';
import { CaseAssignmentService } from '../utils/caseAssignmentService';

interface Case {
  id: string;
  case_number: string;
  status: string;
  worker?: {
    id: string;
    first_name: string;
    last_name: string;
  };
  incident?: {
    id: string;
    incident_type: string;
    severity: string;
  };
}

interface Clinician {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  specialty?: string;
}

interface CaseAssignmentDialogProps {
  open: boolean;
  onClose: () => void;
  caseItem: Case | null;
  caseManagerId: string;
  onAssignmentSuccess: () => void;
}

const CaseAssignmentDialog: React.FC<CaseAssignmentDialogProps> = ({
  open,
  onClose,
  caseItem,
  caseManagerId,
  onAssignmentSuccess
}) => {
  const [clinicians, setClinicians] = useState<Clinician[]>([]);
  const [selectedClinicianId, setSelectedClinicianId] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      fetchClinicians();
      setSelectedClinicianId('');
      setNotes('');
      setError(null);
      setSuccess(null);
    }
  }, [open]);

  const fetchClinicians = async () => {
    try {
      setLoading(true);
      const availableClinicians = await CaseAssignmentService.getAvailableClinicians();
      setClinicians(availableClinicians);
    } catch (err: any) {
      console.error('Error fetching clinicians:', err);
      setError('Failed to fetch available clinicians');
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!caseItem || !selectedClinicianId) {
      setError('Please select a clinician');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await CaseAssignmentService.assignCaseToClinician({
        caseId: caseItem.id,
        clinicianId: selectedClinicianId,
        caseManagerId: caseManagerId,
        notes: notes || 'Case assigned by case manager'
      });

      setSuccess('Case assigned successfully! Notification sent to clinician.');
      onAssignmentSuccess();
      
      // Close dialog after a short delay
      setTimeout(() => {
        onClose();
      }, 2000);

    } catch (err: any) {
      console.error('Error assigning case:', err);
      setError(err.message || 'Failed to assign case');
    } finally {
      setLoading(false);
    }
  };

  const selectedClinician = clinicians.find(c => c.id === selectedClinicianId);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 1,
        backgroundColor: '#f8fafc',
        borderBottom: '1px solid #e2e8f0'
      }}>
        <Assignment color="primary" />
        <Typography variant="h6" component="div">
          Assign Case to Clinician
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ pt: 3 }}>
        {caseItem && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Case Details
            </Typography>
            <Box sx={{ 
              p: 2, 
              backgroundColor: '#f8fafc', 
              borderRadius: 2,
              border: '1px solid #e2e8f0'
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Work fontSize="small" color="primary" />
                <Typography variant="body1" fontWeight={600}>
                  {caseItem.case_number}
                </Typography>
                <Chip 
                  label={caseItem.status} 
                  size="small" 
                  color={caseItem.status === 'new' ? 'warning' : 'info'}
                />
              </Box>
              
              {caseItem.worker && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Person fontSize="small" color="action" />
                  <Typography variant="body2">
                    Worker: {caseItem.worker.first_name} {caseItem.worker.last_name}
                  </Typography>
                </Box>
              )}

              {caseItem.incident && (
                <Typography variant="body2" color="text.secondary">
                  Incident: {caseItem.incident.incident_type} ({caseItem.incident.severity})
                </Typography>
              )}
            </Box>
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Select Clinician</InputLabel>
          <Select
            value={selectedClinicianId}
            onChange={(e) => setSelectedClinicianId(e.target.value)}
            label="Select Clinician"
            disabled={loading}
          >
            {clinicians.map((clinician) => (
              <MenuItem key={clinician.id} value={clinician.id}>
                <Box>
                  <Typography variant="body1">
                    Dr. {clinician.first_name} {clinician.last_name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {clinician.email}
                    {clinician.specialty && ` • ${clinician.specialty}`}
                  </Typography>
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {selectedClinician && (
          <Box sx={{ 
            p: 2, 
            backgroundColor: '#e3f2fd', 
            borderRadius: 2,
            mb: 2,
            border: '1px solid #bbdefb'
          }}>
            <Typography variant="body2" color="primary" fontWeight={600}>
              Selected Clinician
            </Typography>
            <Typography variant="body2">
              Dr. {selectedClinician.first_name} {selectedClinician.last_name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {selectedClinician.email}
            </Typography>
          </Box>
        )}

        <TextField
          fullWidth
          multiline
          rows={3}
          label="Assignment Notes (Optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add any specific instructions or notes for the clinician..."
          disabled={loading}
        />
      </DialogContent>

      <DialogActions sx={{ p: 3, backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
        <Button 
          onClick={onClose} 
          disabled={loading}
          sx={{ color: '#64748b' }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleAssign}
          variant="contained"
          disabled={loading || !selectedClinicianId}
          startIcon={loading ? <CircularProgress size={20} /> : <Assignment />}
          sx={{
            backgroundColor: '#3b82f6',
            '&:hover': { backgroundColor: '#2563eb' }
          }}
        >
          {loading ? 'Assigning...' : 'Assign Case'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CaseAssignmentDialog;




