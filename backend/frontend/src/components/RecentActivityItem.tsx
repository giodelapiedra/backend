import React from 'react';
import { Box, Typography, Chip } from '@mui/material';
import { formatDistanceToNow } from 'date-fns';
import {
  PersonAdd,
  Assessment,
  Warning,
  CheckCircle,
  RestoreFromTrash,
  Update,
  NewReleases,
  Assignment,
  TrendingUp,
  TrendingDown
} from '@mui/icons-material';

interface RecentActivityItemProps {
  id: string;
  type: 'user_created' | 'assessment_completed' | 'incident_reported' | 'status_changed' | 'case_opened' | 'case_closed' | 'assigned' | 'grade_changed';
  title: string;
  description: string;
  timestamp: string;
  user?: string;
  priority?: 'low' | 'medium' | 'high';
  onClick?: () => void;
}

const RecentActivityItem: React.FC<RecentActivityItemProps> = ({
  type,
  title,
  description,
  timestamp,
  user,
  priority = 'medium',
  onClick
}) => {
  const getActivityIcon = () => {
    const iconProps = {
      sx: {
        fontSize: 18,
        color: '#6366f1'
      }
    };

    switch (type) {
      case 'user_created':
        return <PersonAdd {...iconProps} sx={{ ...iconProps.sx, color: '#10b981' }} />;
      case 'assessment_completed':
        return <Assessment {...iconProps} sx={{ ...iconProps.sx, color: '#6366f1' }} />;
      case 'incident_reported':
        return <Warning {...iconProps} sx={{ ...iconProps.sx, color: '#ef4444' }} />;
      case 'status_changed':
        return <CheckCircle {...iconProps} sx={{ ...iconProps.sx, color: '#10b981' }} />;
      case 'case_opened':
        return <Assignment {...iconProps} sx={{ ...iconProps.sx, color: '#f59e0b' }} />;
      case 'case_closed':
        return <RestoreFromTrash {...iconProps} sx={{ ...iconProps.sx, color: '#8b5cf6' }} />;
      case 'assigned':
        return <Update {...iconProps} sx={{ ...iconProps.sx, color: '#06b6d4' }} />;
      case 'grade_changed':
        return <TrendingUp {...iconProps} sx={{ ...iconProps.sx, color: '#10b981' }} />;
      default:
        return <NewReleases {...iconProps} />;
    }
  };

  const getPriorityChip = () => {
    switch (priority) {
      case 'high':
        return (
          <Chip
            label="High Priority"
            size="small"
            sx={{
              backgroundColor: '#fef2f2',
              color: '#dc2626',
              fontSize: '0.625rem',
              height: 20,
              fontWeight: 600,
              '& .MuiChip-label': {
                paddingX: 1
              }
            }}
          />
        );
      case 'medium':
        return (
          <Chip
            label="Medium Priority"
            size="small"
            sx={{
              backgroundColor: '#fffbeb',
              color: '#d97706',
              fontSize: '0.625rem',
              height: 20,
              fontWeight: 600,
              '& .MuiChip-label': {
                paddingX: 1
              }
            }}
          />
        );
      case 'low':
        return (
          <Chip
            label="Low Priority"
            size="small"
            sx={{
              backgroundColor: '#f0fdf4',
              color: '#16a34a',
              fontSize: '0.625rem',
              height: 20,
              fontWeight: 600,
              '& .MuiChip-label': {
                paddingX: 1
              }
            }}
          />
        );
      default:
        return null;
    }
  };

  const formatTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return formatDistanceToNow(date, { addSuffix: true });
    } catch {
      return 'Unknown time';
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 2,
        p: 2.5,
        borderRadius: 2,
        backgroundColor: '#ffffff',
        border: '1px solid rgba(0, 0, 0, 0.05)',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        cursor: onClick ? 'pointer' : 'default',
        '&:hover': onClick ? {
          backgroundColor: '#f8fafc',
          borderColor: 'rgba(0, 0, 0, 0.08)',
          transform: 'translateY(-1px)',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)'
        } : {}
      }}
      onClick={onClick}
    >
      {/* Activity Icon */}
      <Box
        sx={{
          width: 36,
          height: 36,
          borderRadius: 1.5,
          backgroundColor: '#f8fafc',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          border: '1px solid rgba(0, 0, 0, 0.05)'
        }}
      >
        {getActivityIcon()}
      </Box>

      {/* Activity Content */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        {/* Title and Priority */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Typography
            sx={{
              fontSize: '0.875rem',
              fontWeight: 600,
              color: '#1e293b',
              fontFamily: 'Inter, system-ui, sans-serif',
              lineHeight: 1.4,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              flex: 1,
              marginRight: 2
            }}
          >
            {title}
          </Typography>
          {getPriorityChip()}
        </Box>

        {/* Description */}
        <Typography
          sx={{
            fontSize: '0.75rem',
            color: '#64748b',
            fontFamily: 'Inter, system-ui, sans-serif',
            lineHeight: 1.5,
            mb: 1,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden'
          }}
        >
          {description}
        </Typography>

        {/* Timestamp and User */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography
            sx={{
              fontSize: '0.625rem',
              color: '#94a3b8',
              fontWeight: 500,
              fontFamily: 'Inter, system-ui, sans-serif'
            }}
          >
            {formatTime(timestamp)}
          </Typography>
          {user && (
            <Typography
              sx={{
                fontSize: '0.625rem',
                color: '#94a3b8',
                fontWeight: 500,
                fontFamily: 'Inter, system-ui, sans-serif',
                opacity: 0.8
              }}
            >
              • {user}
            </Typography>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default RecentActivityItem;




