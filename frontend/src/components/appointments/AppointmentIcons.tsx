import React from 'react';
import {
  Schedule,
  CheckCircle,
  PlayArrow,
  Cancel,
  Warning,
  LocalHospital,
  VideoCall,
  Work,
  Home,
  LocationOn
} from '@mui/icons-material';
import { APPOINTMENT_STATUS, LOCATION_TYPES } from '../../constants/appointmentConstants';

export const getStatusIcon = (status: string): React.ReactElement => {
  switch (status) {
    case APPOINTMENT_STATUS.SCHEDULED:
      return <Schedule />;
    case APPOINTMENT_STATUS.CONFIRMED:
      return <CheckCircle />;
    case APPOINTMENT_STATUS.IN_PROGRESS:
      return <PlayArrow />;
    case APPOINTMENT_STATUS.COMPLETED:
      return <CheckCircle />;
    case APPOINTMENT_STATUS.CANCELLED:
      return <Cancel />;
    case APPOINTMENT_STATUS.NO_SHOW:
      return <Warning />;
    default:
      return <Schedule />;
  }
};

export const getLocationIcon = (location: string): React.ReactNode => {
  switch (location) {
    case LOCATION_TYPES.CLINIC:
      return <LocalHospital />;
    case LOCATION_TYPES.TELEHEALTH:
      return <VideoCall />;
    case LOCATION_TYPES.WORKPLACE:
      return <Work />;
    case LOCATION_TYPES.HOME:
      return <Home />;
    default:
      return <LocationOn />;
  }
};

