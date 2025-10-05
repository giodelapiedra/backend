import React from 'react';
import { Card, CardContent, Box, Typography } from '@mui/material';
import { TrendingUp, TrendingDown } from '@mui/icons-material';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    value: number;
    direction: 'up' | 'down';
  };
  icon?: React.ReactNode;
  color?: string;
  isLoading?: boolean;
  onClick?: () => void;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  trend,
  icon,
  color = '#6366f1',
  isLoading = false,
  onClick
}) => {
  const getTrendColor = (direction: 'up' | 'down') => {
    return direction === 'up' ? '#10b981' : '#ef4444';
  };

  const getTrendIcon = (direction: 'up' | 'down') => {
    const IconComponent = direction === 'up' ? TrendingUp : TrendingDown;
    return <IconComponent sx={{ fontSize: 16 }} />;
  };

  if (isLoading) {
    return (
      <Card
        sx={{
          borderRadius: 3,
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)',
          border: '1px solid rgba(0, 0, 0, 0.05)',
          cursor: onClick ? 'pointer' : 'default',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          height: '100%',
          backgroundColor: '#ffffff',
          '&:hover': onClick ? {
            transform: 'translateY(-2px)',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.08)'
          } : {}
        }}
        onClick={onClick}
      >
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 2,
                  backgroundColor: '#f1f5f9',
                  animation: 'pulse 2s infinite'
                }}
              />
              <Box
                sx={{
                  height: 14,
                  borderRadius: 1,
                  backgroundColor: '#e2e8f0',
                  animation: 'pulse 2s infinite',
                  width: 100
                }}
              />
            </Box>
          </Box>
          <Box sx={{ mb: 1 }}>
            <Box sx={{ height: 32, backgroundColor: '#e2e8f0', borderRadius: 1, mb: 1, animation: 'pulse 2s infinite' }} />
            <Box sx={{ height: 12, backgroundColor: '#f1f5f9', borderRadius: 0.5, width: 120, animation: 'pulse 2s infinite' }} />
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
      `}</style>
      <Card
        sx={{
          borderRadius: { xs: '16px', md: 3 },
          boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.02)',
          border: '1px solid #e5e5e5',
          cursor: onClick ? 'pointer' : 'default',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          height: '100%',
          backgroundColor: '#ffffff',
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: `linear-gradient(90deg, ${color}, ${color}dd)`,
          },
          '&:hover': onClick ? {
            transform: 'translateY(-4px)',
            boxShadow: `0 12px 24px -8px ${color}40`,
            borderColor: `${color}80`,
          } : {}
        }}
        onClick={onClick}
      >
        <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
          {/* Header with icon and title */}
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'flex-start', 
            justifyContent: 'space-between', 
            mb: { xs: 2, md: 2 }
          }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                variant="body2"
                sx={{
                  color: '#737373',
                  fontWeight: 600,
                  fontSize: { xs: '0.8125rem', md: '0.875rem' },
                  letterSpacing: '0.02em',
                  textTransform: 'uppercase',
                  mb: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
              >
                {title}
              </Typography>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 700,
                  fontSize: { xs: '2rem', md: '2.25rem' },
                  lineHeight: 1,
                  color: '#171717',
                  letterSpacing: '-0.02em',
                  mb: 0.5
                }}
              >
                {value}
              </Typography>
              {subtitle && (
                <Typography
                  variant="body2"
                  sx={{
                    color: '#737373',
                    fontWeight: 400,
                    fontSize: { xs: '0.8125rem', md: '0.875rem' },
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {subtitle}
                </Typography>
              )}
            </Box>
            <Box
              sx={{
                width: { xs: 48, md: 56 },
                height: { xs: 48, md: 56 },
                borderRadius: '14px',
                background: `${color}15`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: color,
                flexShrink: 0,
                ml: 2
              }}
            >
              {icon}
            </Box>
          </Box>

          {/* Trend indicator */}
          {trend && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 1 }}>
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 0.5,
                color: getTrendColor(trend.direction),
                backgroundColor: `${getTrendColor(trend.direction)}15`,
                px: 1.5,
                py: 0.75,
                borderRadius: 2,
                fontSize: { xs: '0.75rem', md: '0.8125rem' },
                fontWeight: 700
              }}>
                {getTrendIcon(trend.direction)}
                {Math.abs(trend.value)}%
              </Box>
              <Typography
                variant="caption"
                sx={{
                  color: '#a3a3a3',
                  fontWeight: 500,
                  fontSize: { xs: '0.75rem', md: '0.8125rem' },
                  whiteSpace: 'nowrap'
                }}
              >
                vs last period
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>
    </>
  );
};

export default StatCard;



