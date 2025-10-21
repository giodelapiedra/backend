import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Button,
  IconButton,
  Tooltip,
  Grid,
  Box,
  Chip,
  LinearProgress,
  Pagination,
  CircularProgress,
  Alert,
  Skeleton,
} from '@mui/material';
import {
  Add,
  Edit,
  Visibility,
  Refresh,
  FitnessCenter,
  CheckCircle,
  Cancel,
  ErrorOutline,
} from '@mui/icons-material';
import { RehabPlan } from '../../pages/clinician/ClinicianDashboardRedux';

interface RehabPlansSectionProps {
  activeRehabPlans: RehabPlan[];
  onCreatePlan: () => void;
  onEditPlan: (plan: RehabPlan) => void;
  onViewProgress: (plan: RehabPlan) => void;
  onClosePlan: (plan: RehabPlan) => void;
  onCancelPlan: (plan: RehabPlan) => void;
  onRefresh: () => void;
  isLoading?: boolean;
  error?: string | null;
  isRefreshing?: boolean;
  processingPlanId?: string | null;
}

const RehabPlansSection: React.FC<RehabPlansSectionProps> = React.memo(({
  activeRehabPlans,
  onCreatePlan,
  onEditPlan,
  onViewProgress,
  onClosePlan,
  onCancelPlan,
  onRefresh,
  isLoading = false,
  error = null,
  isRefreshing = false,
  processingPlanId = null,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const plansPerPage = 6; // Show 6 plans per page (2 rows of 3)
  
  // Calculate pagination
  const totalPages = Math.ceil(activeRehabPlans.length / plansPerPage);
  const startIndex = (currentPage - 1) * plansPerPage;
  const endIndex = startIndex + plansPerPage;
  const currentPlans = activeRehabPlans.slice(startIndex, endIndex);
  
  // Handle pagination edge case: if current page becomes empty after deletion, go back
  useEffect(() => {
    if (activeRehabPlans.length > 0 && currentPlans.length === 0 && currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  }, [activeRehabPlans.length, currentPlans.length, currentPage]);
  
  const handlePageChange = (event: React.ChangeEvent<unknown>, page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Helper: Safe data getter with fallback
  const getWorkerName = (plan: RehabPlan): string => {
    const firstName = plan.case?.worker?.firstName || '';
    const lastName = plan.case?.worker?.lastName || '';
    return firstName || lastName ? `${firstName} ${lastName}`.trim() : 'Unknown Worker';
  };

  // Helper: Clamp progress value between 0-100
  const getClampedProgress = (progress: number | undefined): number => {
    return Math.min(100, Math.max(0, progress || 0));
  };

  // Helper: Get safe day values
  const getSafeDayValues = (plan: RehabPlan) => {
    const completedDays = Math.max(0, plan.progressStats?.completedDays || 0);
    const totalDays = Math.max(1, plan.progressStats?.totalDays || plan.duration || 7);
    return { completedDays, totalDays };
  };

  // Helper: Check if buttons should be enabled
  const canComplete = (plan: RehabPlan): boolean => {
    return plan.status === 'active' && !processingPlanId;
  };

  const canCancel = (plan: RehabPlan): boolean => {
    return plan.status !== 'cancelled' && plan.status !== 'completed' && !processingPlanId;
  };

  const canEdit = (plan: RehabPlan): boolean => {
    return plan.status === 'active' && !processingPlanId;
  };

  const isCardProcessing = (planId: string): boolean => {
    return processingPlanId === planId;
  };

  // Truncate long text with ellipsis
  const truncateText = (text: string, maxLength: number = 30): string => {
    if (!text) return '';
    return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
  };

  // Render loading skeleton
  const renderLoadingSkeleton = () => (
    <Grid container spacing={3}>
      {[1, 2, 3, 4, 5, 6].map((index) => (
        <Grid item xs={12} md={4} key={index}>
          <Card sx={{ border: '1px solid #e2e8f0', borderRadius: 2 }}>
            <CardContent sx={{ p: 3 }}>
              <Skeleton variant="text" width="70%" height={32} sx={{ mb: 2 }} />
              <Skeleton variant="text" width="100%" height={20} sx={{ mb: 1 }} />
              <Skeleton variant="text" width="100%" height={20} sx={{ mb: 1 }} />
              <Skeleton variant="text" width="80%" height={20} sx={{ mb: 2 }} />
              <Skeleton variant="rectangular" width="100%" height={8} sx={{ borderRadius: 4, mb: 2 }} />
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Skeleton variant="rectangular" width="50%" height={36} sx={{ borderRadius: 1 }} />
                <Skeleton variant="rectangular" width="50%" height={36} sx={{ borderRadius: 1 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );

  return (
    <Card sx={{ 
      mb: 4, 
      boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
      borderRadius: 2
    }}>
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, color: '#2d3748' }}>
            Active Rehabilitation Plans
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title="Refresh Data">
              <IconButton
                onClick={onRefresh}
                size="small"
                disabled={isRefreshing || isLoading}
                sx={{
                  backgroundColor: 'rgba(102, 126, 234, 0.1)',
                  '&:hover': { backgroundColor: 'rgba(102, 126, 234, 0.2)' },
                  '&:disabled': { backgroundColor: '#f3f4f6', opacity: 0.5 }
                }}
                aria-label="Refresh rehabilitation plans data"
              >
                {isRefreshing ? (
                  <CircularProgress size={20} sx={{ color: '#667eea' }} />
                ) : (
                  <Refresh sx={{ color: '#667eea' }} />
                )}
              </IconButton>
            </Tooltip>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={onCreatePlan}
              disabled={isLoading || !!processingPlanId}
              aria-label="Create new rehabilitation plan"
              sx={{
                background: 'linear-gradient(135deg, #065f46 0%, #047857 100%)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #064e3b 0%, #065f46 100%)'
                },
                '&:disabled': {
                  background: '#f3f4f6',
                  color: '#9ca3af'
                }
              }}
            >
              Create Plan
            </Button>
          </Box>
        </Box>

        {/* Error Display */}
        {error && (
          <Alert 
            severity="error" 
            icon={<ErrorOutline />}
            sx={{ mb: 2 }}
            onClose={() => {}}
          >
            {error}
          </Alert>
        )}

        {/* Loading State */}
        {isLoading ? (
          renderLoadingSkeleton()
        ) : activeRehabPlans.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <FitnessCenter sx={{ fontSize: 48, color: '#a0aec0', mb: 2 }} />
            <Typography variant="h6" sx={{ color: '#718096', mb: 1 }}>
              No active rehabilitation plans
            </Typography>
            <Typography variant="body2" sx={{ color: '#a0aec0' }}>
              Create rehabilitation plans for your assigned cases
            </Typography>
          </Box>
        ) : (
          <>
            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body2" sx={{ color: '#718096' }}>
                Showing {startIndex + 1}-{Math.min(endIndex, activeRehabPlans.length)} of {activeRehabPlans.length} plans
              </Typography>
            </Box>
            
            <Grid container spacing={3}>
              {currentPlans.map((plan) => {
                const { completedDays, totalDays } = getSafeDayValues(plan);
                const clampedProgress = getClampedProgress(plan.progress);
                const workerName = getWorkerName(plan);
                const isProcessing = isCardProcessing(plan._id || '');
                
                return (
                  <Grid item xs={12} md={4} key={plan._id}>
                    <Card sx={{ 
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                      borderRadius: 2,
                      transition: 'all 0.3s ease',
                      opacity: isProcessing ? 0.6 : 1,
                      pointerEvents: isProcessing ? 'none' : 'auto',
                      position: 'relative',
                      '&:hover': { 
                        transform: isProcessing ? 'none' : 'translateY(-4px)',
                        boxShadow: isProcessing ? '0 2px 8px rgba(0,0,0,0.06)' : '0 8px 24px rgba(102, 126, 234, 0.15)',
                        borderColor: isProcessing ? '#e2e8f0' : '#667eea'
                      }
                    }}>
                      {/* Processing Overlay */}
                      {isProcessing && (
                        <Box
                          sx={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: 'rgba(255, 255, 255, 0.8)',
                            zIndex: 10,
                            borderRadius: 2
                          }}
                        >
                          <CircularProgress size={40} sx={{ color: '#667eea' }} />
                        </Box>
                      )}
                      
                      <CardContent sx={{ p: 3 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                          <Tooltip title={plan.planName || 'Unnamed Plan'} placement="top">
                            <Typography 
                              variant="h6" 
                              sx={{ 
                                fontWeight: 600, 
                                color: '#2d3748',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                maxWidth: '70%'
                              }}
                            >
                              {truncateText(plan.planName || 'Unnamed Plan', 25)}
                            </Typography>
                          </Tooltip>
                          <Chip
                            label={plan.status || 'unknown'}
                            size="small"
                            color={plan.status === 'active' ? 'success' : 'default'}
                            variant="outlined"
                            sx={{ textTransform: 'capitalize' }}
                          />
                        </Box>
                        
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="body2" sx={{ color: '#718096', mb: 1 }} title={plan.case?.caseNumber || 'No Case Number'}>
                            <strong>Case:</strong> {plan.case?.caseNumber || 'N/A'}
                          </Typography>
                          <Tooltip title={workerName} placement="top">
                            <Typography 
                              variant="body2" 
                              sx={{ 
                                color: '#718096', 
                                mb: 1,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              <strong>Worker:</strong> {truncateText(workerName, 28)}
                            </Typography>
                          </Tooltip>
                          <Typography variant="body2" sx={{ color: '#718096', mb: 1 }}>
                            <strong>Duration:</strong> {plan.duration || 7} days
                          </Typography>
                          <Typography variant="body2" sx={{ color: '#718096', mb: 1 }}>
                            <strong>Progress:</strong> Day {completedDays} of {totalDays} ({clampedProgress}%)
                          </Typography>
                          <Typography variant="body2" sx={{ color: '#4a5568', fontSize: '0.875rem' }}>
                            <strong>Current Day:</strong> {completedDays === 0 ? 'Starting Day 1' : `Day ${completedDays + 1}`} 
                            {completedDays > 0 && (
                              <span style={{ color: '#10b981', fontWeight: 600 }}>
                                {' '}({completedDays} day{completedDays > 1 ? 's' : ''} completed)
                              </span>
                            )}
                          </Typography>
                        </Box>

                        <Tooltip title={`${clampedProgress}% complete`} placement="top">
                          <LinearProgress
                            variant="determinate"
                            value={clampedProgress}
                            sx={{
                              height: 8,
                              borderRadius: 4,
                              backgroundColor: '#e2e8f0',
                              '& .MuiLinearProgress-bar': {
                                borderRadius: 4,
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                              }
                            }}
                            aria-label={`Rehabilitation progress: ${clampedProgress}%`}
                          />
                        </Tooltip>

                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 2 }}>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Tooltip title={isProcessing ? "Please wait..." : "View detailed progress"}>
                              <span style={{ flex: 1 }}>
                                <Button
                                  size="small"
                                  startIcon={<Visibility />}
                                  variant="outlined"
                                  onClick={() => onViewProgress(plan)}
                                  disabled={isProcessing}
                                  fullWidth
                                  aria-label="View rehabilitation progress"
                                  sx={{ 
                                    borderColor: '#e5e7eb',
                                    color: '#6b7280',
                                    textTransform: 'none',
                                    fontWeight: 500,
                                    '&:hover': {
                                      borderColor: '#d1d5db',
                                      backgroundColor: '#f9fafb'
                                    },
                                    '&:disabled': {
                                      borderColor: '#e5e7eb',
                                      color: '#9ca3af',
                                      backgroundColor: '#f9fafb'
                                    }
                                  }}
                                >
                                  View
                                </Button>
                              </span>
                            </Tooltip>
                            <Tooltip title={!canEdit(plan) ? (plan.status !== 'active' ? 'Only active plans can be edited' : 'Please wait...') : 'Edit plan details'}>
                              <span style={{ flex: 1 }}>
                                <Button
                                  size="small"
                                  startIcon={<Edit />}
                                  variant="outlined"
                                  onClick={() => onEditPlan(plan)}
                                  disabled={!canEdit(plan) || isProcessing}
                                  fullWidth
                                  aria-label="Edit rehabilitation plan"
                                  sx={{ 
                                    borderColor: '#e5e7eb',
                                    color: '#6b7280',
                                    textTransform: 'none',
                                    fontWeight: 500,
                                    '&:hover': {
                                      borderColor: '#d1d5db',
                                      backgroundColor: '#f9fafb'
                                    },
                                    '&:disabled': {
                                      borderColor: '#e5e7eb',
                                      color: '#9ca3af',
                                      backgroundColor: '#f9fafb'
                                    }
                                  }}
                                >
                                  Edit
                                </Button>
                              </span>
                            </Tooltip>
                          </Box>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Tooltip title={!canComplete(plan) ? (plan.status !== 'active' ? 'Only active plans can be completed' : 'Please wait...') : 'Mark plan as completed'}>
                              <span style={{ flex: 1 }}>
                                <Button
                                  size="small"
                                  startIcon={<CheckCircle />}
                                  variant="contained"
                                  onClick={() => onClosePlan(plan)}
                                  disabled={!canComplete(plan) || isProcessing}
                                  fullWidth
                                  aria-label="Complete rehabilitation plan"
                                  sx={{
                                    backgroundColor: '#10b981',
                                    color: 'white',
                                    textTransform: 'none',
                                    fontWeight: 500,
                                    boxShadow: 'none',
                                    '&:hover': {
                                      backgroundColor: '#059669',
                                      boxShadow: 'none'
                                    },
                                    '&:disabled': {
                                      backgroundColor: '#d1d5db',
                                      color: '#9ca3af'
                                    }
                                  }}
                                >
                                  Complete
                                </Button>
                              </span>
                            </Tooltip>
                            <Tooltip title={!canCancel(plan) ? 'This plan cannot be cancelled' : 'Cancel this plan'}>
                              <span style={{ flex: 1 }}>
                                <Button
                                  size="small"
                                  startIcon={<Cancel />}
                                  variant="outlined"
                                  onClick={() => onCancelPlan(plan)}
                                  disabled={!canCancel(plan) || isProcessing}
                                  fullWidth
                                  aria-label="Cancel rehabilitation plan"
                                  sx={{
                                    borderColor: '#e5e7eb',
                                    color: '#ef4444',
                                    textTransform: 'none',
                                    fontWeight: 500,
                                    '&:hover': {
                                      borderColor: '#ef4444',
                                      backgroundColor: 'rgba(239, 68, 68, 0.04)'
                                    },
                                    '&:disabled': {
                                      borderColor: '#e5e7eb',
                                      color: '#9ca3af',
                                      backgroundColor: '#f9fafb'
                                    }
                                  }}
                                >
                                  Cancel
                                </Button>
                              </span>
                            </Tooltip>
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
          </Grid>
          
          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
              <Pagination 
                count={totalPages}
                page={currentPage}
                onChange={handlePageChange}
                color="primary"
                size="large"
                showFirstButton
                showLastButton
                sx={{
                  '& .MuiPaginationItem-root': {
                    fontSize: '1rem',
                    fontWeight: 500,
                  },
                  '& .Mui-selected': {
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)',
                    }
                  }
                }}
              />
            </Box>
          )}
        </>
        )}
      </CardContent>
    </Card>
  );
});

RehabPlansSection.displayName = 'RehabPlansSection';

export default RehabPlansSection;

