import React from 'react';
import { Chip, ChipProps } from '@mui/material';
import { getStatusLabel } from '../utils/themeUtils';

interface StatusChipProps extends Omit<ChipProps, 'label' | 'color'> {
  status: string;
  variant?: 'outlined' | 'filled';
}

const StatusChip: React.FC<StatusChipProps> = ({ 
  status, 
  variant = 'filled',
  size = 'small',
  sx = {},
  ...props 
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new':
        return '#3b82f6'; // Blue
      case 'triaged':
        return '#f59e0b'; // Amber
      case 'assessed':
        return '#8b5cf6'; // Purple
      case 'in_rehab':
        return '#ef4444'; // Red
      case 'return_to_work':
        return '#f97316'; // Orange
      case 'closed':
        return '#6b7280'; // Gray
      default:
        return '#6b7280'; // Default gray
    }
  };

  const backgroundColor = getStatusColor(status);
  
  return (
    <Chip
      label={getStatusLabel(status)}
      size={size}
      variant={variant}
      sx={{
        borderRadius: '20px',
        fontWeight: 600,
        fontSize: '0.75rem',
        height: '28px',
        backgroundColor: variant === 'filled' ? backgroundColor : 'transparent',
        color: variant === 'filled' ? 'white' : backgroundColor,
        border: variant === 'outlined' ? `2px solid ${backgroundColor}` : 'none',
        '&:hover': {
          opacity: 0.9
        },
        ...sx
      }}
      {...props}
    />
  );
};

export default StatusChip;
