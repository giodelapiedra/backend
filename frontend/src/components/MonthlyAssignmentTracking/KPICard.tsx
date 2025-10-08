import React from 'react';
import { Box, Card, Typography, Stack } from '@mui/material';
import { TrendingUp, TrendingDown } from '@mui/icons-material';
import { designTokens } from './designTokens';

interface KPICardProps {
  title: string;
  value: number;
  format?: 'number' | 'percentage' | 'hours';
  trend?: number;
  color?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  progress?: boolean;
}

/**
 * ✨ Modern KPI Card Component
 * Clean, scannable, professional design
 */
const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  format = 'number',
  trend,
  color = designTokens.colors.primary.main,
  subtitle,
  icon,
  progress = false
}) => {
  // Format value based on type
  const formattedValue = () => {
    switch (format) {
      case 'percentage':
        return `${value.toFixed(1)}%`;
      case 'hours':
        return `${value.toFixed(1)}h`;
      default:
        return value.toString();
    }
  };

  // Show trend indicator
  const renderTrend = () => {
    if (!trend || trend === 0) return null;
    
    const isPositive = trend > 0;
    const Icon = isPositive ? TrendingUp : TrendingDown;
    const trendColor = isPositive ? designTokens.colors.status.success.main : designTokens.colors.status.error.main;
    
    return (
      <Stack direction="row" spacing={0.5} alignItems="center">
        <Icon sx={{ fontSize: 16, color: trendColor }} />
        <Typography 
          variant="body2" 
          sx={{ 
            color: trendColor,
            fontWeight: 600,
            fontSize: '0.75rem'
          }}
        >
          {isPositive ? '+' : ''}{Math.abs(trend).toFixed(1)}%
        </Typography>
      </Stack>
    );
  };

  return (
    <Card
      sx={{
        p: 3,
        background: designTokens.colors.background.elevated,
        border: `1px solid ${designTokens.colors.border.default}`,
        borderRadius: designTokens.radius.md,
        boxShadow: designTokens.shadows.none,
        transition: designTokens.transitions.fast,
        '&:hover': {
          borderColor: designTokens.colors.border.hover,
          boxShadow: designTokens.shadows.sm
        }
      }}
    >
      <Stack spacing={2}>
        {/* Header: Label + Icon */}
        <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
          <Stack direction="row" spacing={1} alignItems="center">
            {/* Color dot indicator */}
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                bgcolor: color
              }}
            />
            
            {/* Label */}
            <Typography
              variant="caption"
              sx={{
                color: designTokens.colors.text.tertiary,
                fontWeight: 600
              }}
            >
              {title}
            </Typography>
          </Stack>
          
          {/* Optional icon */}
          {icon && (
            <Box sx={{ color: designTokens.colors.text.tertiary }}>
              {icon}
            </Box>
          )}
        </Stack>

        {/* Value */}
        <Box>
          <Typography
            variant="h2"
            sx={{
              color: designTokens.colors.text.primary,
              fontWeight: 700,
              lineHeight: 1
            }}
          >
            {formattedValue()}
          </Typography>
          
          {/* Subtitle or trend */}
          {(subtitle || trend !== undefined) && (
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
              {subtitle && (
                <Typography
                  variant="body2"
                  sx={{
                    color: designTokens.colors.text.tertiary,
                    fontSize: '0.75rem'
                  }}
                >
                  {subtitle}
                </Typography>
              )}
              {renderTrend()}
            </Stack>
          )}
        </Box>

        {/* Optional progress bar */}
        {progress && format === 'percentage' && (
          <Box
            sx={{
              height: 4,
              background: designTokens.colors.background.subtle,
              borderRadius: designTokens.radius.sm,
              overflow: 'hidden'
            }}
          >
            <Box
              sx={{
                width: `${Math.min(100, value)}%`,
                height: '100%',
                background: color,
                borderRadius: designTokens.radius.sm,
                transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
            />
          </Box>
        )}
      </Stack>
    </Card>
  );
};

export default KPICard;

