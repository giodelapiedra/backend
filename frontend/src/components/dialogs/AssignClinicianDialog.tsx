import React from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';

interface User {
  _id: string;
  firstName: string;
  lastName: string;
  specialty?: string;
}

interface Case {
  _id: string;
  caseNumber?: string;
  case_number?: string;
  worker: User;
  clinician_id?: string;
  case_manager_id?: string;
  caseManager?: {
    _id: string;
  };
}

interface AssignClinicianDialogProps {
  open: boolean;
  onClose: () => void;
  cases: Case[];
  clinicians: User[];
  currentUserId?: string;
  assignmentForm: {
    case: string;
    clinician: string;
    assignmentDate: string;
    notes: string;
  };
  onFormChange: (form: any) => void;
  onSubmit: () => void;
}

const AssignClinicianDialog: React.FC<AssignClinicianDialogProps> = ({
  open,
  onClose,
  cases,
  clinicians,
  currentUserId,
  assignmentForm,
  onFormChange,
  onSubmit,
}) => {
  const unassignedCases = cases.filter(
    c => !c.clinician_id && (c.case_manager_id === currentUserId || c.caseManager?._id === currentUserId)
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Assign Clinician to Case</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Select Case</InputLabel>
            <Select
              value={assignmentForm.case}
              onChange={(e) => onFormChange({ ...assignmentForm, case: e.target.value })}
            >
              {unassignedCases.map((caseItem) => (
                <MenuItem key={caseItem._id} value={caseItem._id}>
                  {caseItem.caseNumber || caseItem.case_number || ''} - {caseItem.worker?.firstName} {caseItem.worker?.lastName}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Select Clinician</InputLabel>
            <Select
              value={assignmentForm.clinician}
              onChange={(e) => onFormChange({ ...assignmentForm, clinician: e.target.value })}
            >
              {clinicians.map((clinician) => (
                <MenuItem key={clinician._id} value={clinician._id}>
                  Dr. {clinician.firstName || ''} {clinician.lastName || ''} - {clinician.specialty || 'General'}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            fullWidth
            label="Assignment Date"
            type="date"
            value={assignmentForm.assignmentDate}
            onChange={(e) => onFormChange({ ...assignmentForm, assignmentDate: e.target.value })}
            InputLabelProps={{ shrink: true }}
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            label="Assignment Notes"
            multiline
            rows={3}
            value={assignmentForm.notes}
            onChange={(e) => onFormChange({ ...assignmentForm, notes: e.target.value })}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button 
          variant="contained" 
          onClick={onSubmit}
          disabled={!assignmentForm.case || !assignmentForm.clinician}
        >
          Assign Clinician
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AssignClinicianDialog;

