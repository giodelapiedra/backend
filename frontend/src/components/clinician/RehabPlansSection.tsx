import React, { useState } from 'react';
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
} from '@mui/material';
import {
  Add,
  Edit,
  Visibility,
  Refresh,
  FitnessCenter,
  CheckCircle,
} from '@mui/icons-material';
import { RehabPlan } from '../../pages/clinician/ClinicianDashboardRedux';

interface RehabPlansSectionProps {
  activeRehabPlans: RehabPlan[];
  onCreatePlan: () => void;
  onEditPlan: (plan: RehabPlan) => void;
  onViewProgress: (plan: RehabPlan) => void;
  onClosePlan: (plan: RehabPlan) => void;
  onRefresh: () => void;
}

const RehabPlansSection: React.FC<RehabPlansSectionProps> = React.memo(({
  activeRehabPlans,
  onCreatePlan,
  onEditPlan,
  onViewProgress,
  onClosePlan,
  onRefresh,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const plansPerPage = 6; // Show 6 plans per page (2 rows of 3)
  
  // Calculate pagination
  const totalPages = Math.ceil(activeRehabPlans.length / plansPerPage);
  const startIndex = (currentPage - 1) * plansPerPage;
  const endIndex = startIndex + plansPerPage;
  const currentPlans = activeRehabPlans.slice(startIndex, endIndex);
  
  const handlePageChange = (event: React.ChangeEvent<unknown>, page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
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
                sx={{
                  backgroundColor: 'rgba(102, 126, 234, 0.1)',
                  '&:hover': { backgroundColor: 'rgba(102, 126, 234, 0.2)' }
                }}
              >
                <Refresh sx={{ color: '#667eea' }} />
              </IconButton>
            </Tooltip>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={onCreatePlan}
              sx={{
                background: 'linear-gradient(135deg, #065f46 0%, #047857 100%)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #064e3b 0%, #065f46 100%)'
                }
              }}
            >
              Create Plan
            </Button>
          </Box>
        </Box>

        {activeRehabPlans.length === 0 ? (
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
              {currentPlans.map((plan) => (
                <Grid item xs={12} md={4} key={plan._id}>
                <Card sx={{ 
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                  borderRadius: 2,
                  transition: 'all 0.3s ease',
                  '&:hover': { 
                    transform: 'translateY(-4px)',
                    boxShadow: '0 8px 24px rgba(102, 126, 234, 0.15)',
                    borderColor: '#667eea'
                  }
                }}>
                  <CardContent sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Typography variant="h6" sx={{ fontWeight: 600, color: '#2d3748' }}>
                        {plan.planName}
                      </Typography>
                      <Chip
                        label={plan.status}
                        size="small"
                        color={plan.status === 'active' ? 'success' : 'default'}
                        variant="outlined"
                      />
                    </Box>
                    
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" sx={{ color: '#718096', mb: 1 }}>
                        Case: {plan.case?.caseNumber || 'N/A'}
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#718096', mb: 1 }}>
                        Worker: {plan.case?.worker?.firstName} {plan.case?.worker?.lastName}
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#718096', mb: 1 }}>
                        Duration: {plan.duration || 7} days
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#718096' }}>
                        Progress: Day {plan.progressStats?.completedDays || 0} of {plan.progressStats?.totalDays || plan.duration || 7} ({plan.progress || 0}%)
                      </Typography>
                    </Box>

                    <LinearProgress
                      variant="determinate"
                      value={plan.progress || 0}
                      sx={{
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: '#e2e8f0',
                        '& .MuiLinearProgress-bar': {
                          borderRadius: 4,
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                        }
                      }}
                    />

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 2 }}>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                          size="small"
                          startIcon={<Visibility />}
                          onClick={() => onViewProgress(plan)}
                          sx={{ flex: 1 }}
                        >
                          View Progress
                        </Button>
                        <Button
                          size="small"
                          startIcon={<Edit />}
                          variant="outlined"
                          onClick={() => onEditPlan(plan)}
                          sx={{ flex: 1 }}
                        >
                          Edit
                        </Button>
                      </Box>
                      <Button
                        size="small"
                        fullWidth
                        startIcon={<CheckCircle />}
                        variant="contained"
                        onClick={() => onClosePlan(plan)}
                        sx={{
                          background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                          color: 'white',
                          '&:hover': {
                            background: 'linear-gradient(135deg, #38d66c 0%, #2de0c8 100%)'
                          }
                        }}
                      >
                        Complete Plan
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
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

