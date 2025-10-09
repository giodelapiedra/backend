import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  CircularProgress,
  LinearProgress,
  Grid,
  IconButton,
  Tooltip,
  Avatar,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Alert,
  Badge,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  EmojiEvents,
  Assessment,
  People,
  Refresh,
  FilterList,
  Warning,
  CheckCircle,
  Info,
  Groups,
  Schedule,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext.supabase';
import { authClient } from '../lib/supabase';
import { kpiAPI } from '../utils/backendApi';

interface KPIData {
  rating: string;
  color: string;
  description: string;
  score: number;
  participationRate?: number;
  participationPenalty?: number;
  baseScore?: number;
  baseRating?: string;
  adjustedRating?: string;
}

interface TeamMemberKPI {
  workerId: string;
  workerName: string;
  email: string;
  team: string;
  weeklyKPIMetrics: {
    goalType: string;
    completedDays: number;
    totalWorkDays: number;
    completionRate: number;
    kpi: KPIData;
  };
  readinessBreakdown: {
    fit: number;
    minor: number;
    not_fit: number;
  };
  averageFatigueLevel: number;
  streakDays: number;
  missedDays: number;
}

interface TeamKPIInsight {
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  message: string;
  data: any[];
}

interface AssignmentKPIData {
  rating: string;
  color: string;
  description: string;
  score: number;
  completionRate: number;
  onTimeRate: number;
  qualityScore: number;
  pendingBonus: number;
  overduePenalty: number;
  completedAssignments: number;
  pendingAssignments: number;
  overdueAssignments: number;
  totalAssignments: number;
}

interface AssignmentMetrics {
  totalAssignments: number;
  completedAssignments: number;
  onTimeSubmissions: number;
  pendingAssignments: number;
  overdueAssignments: number;
  qualityScore: number;
  completionRate: number;
  onTimeRate: number;
  totalMembers: number;
}

interface IndividualAssignmentKPI {
  workerId: string;
  workerName: string;
  workerEmail: string;
  kpi: AssignmentKPIData;
  assignments: {
    total: number;
    completed: number;
    onTime: number;
    pending: number;
    overdue: number;
  };
}

interface TeamAssignmentKPIResponse {
  success: boolean;
  teamKPI: AssignmentKPIData;
  teamMetrics: AssignmentMetrics;
  individualKPIs: IndividualAssignmentKPI[];
  period: {
    start: string;
    end: string;
    month: string;
  };
}

interface TeamKPIDashboardProps {
  teamLeaderId: string;
  compact?: boolean;
}

const TeamKPIDashboard: React.FC<TeamKPIDashboardProps> = ({ 
  teamLeaderId, 
  compact = false 
}) => {
  const { user } = useAuth();
  const [data, setData] = useState<TeamAssignmentKPIResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [membersPerPage, setMembersPerPage] = useState(10);

  const fetchTeamKPIData = async () => {
    try {
      setRefreshing(true);
      
      if (!teamLeaderId) {
        throw new Error('Team Leader ID is required');
      }
      
      console.log('🔄 Fetching team KPI data for team leader:', teamLeaderId);
      console.log('📋 Team Leader ID:', teamLeaderId);
      console.log('👤 Current User:', user?.id, user?.role);
      console.log('🌐 Using Backend API');
      
      // Use the new assignment-based backend API
      const result = await kpiAPI.getTeamAssignmentSummary(teamLeaderId);
      
      if (result.success) {
        // ✅ DATA INTEGRITY VALIDATION
        console.log('📊 ===== TEAM KPI DATA VALIDATION =====');
        console.log('📋 Team KPI:', result.teamKPI);
        console.log('📈 Team Metrics:', result.teamMetrics);
        console.log('👥 Individual KPIs Count:', result.individualKPIs?.length);
        
        // Validate individual KPI data
        if (result.individualKPIs && result.individualKPIs.length > 0) {
          const validKPIs = result.individualKPIs.filter((kpi: IndividualAssignmentKPI) => {
            const hasValidData = kpi.workerId && kpi.workerName && kpi.kpi;
            if (!hasValidData) {
              console.warn('⚠️ Invalid KPI data:', kpi);
            }
            return hasValidData;
          });
          
          console.log(`✅ Valid Individual KPIs: ${validKPIs.length}/${result.individualKPIs.length}`);
          
          // Check if shift-based deadlines are being used
          const assignmentsWithDueTime = result.individualKPIs.filter((kpi: IndividualAssignmentKPI) => 
            kpi.assignments && kpi.assignments.total > 0
          ).length;
          
          console.log(`✅ Members with assignments: ${assignmentsWithDueTime}`);
          console.log('==========================================');
          
          result.individualKPIs = validKPIs;
        }
        
        setData(result);
        setError(null);
      } else {
        throw new Error(result.message || 'Failed to fetch team assignment KPI data');
      }
    } catch (err: any) {
      console.error('Error fetching team KPI data:', err);
      
      // Check if it's a network error (backend down)
      if (err.code === 'ERR_NETWORK' || err.message?.includes('Network Error') || err.message?.includes('ERR_FAILED')) {
        setError('Backend service is temporarily unavailable. Please try again later or contact support if the issue persists.');
      } else {
        setError(err.message || 'Failed to load team KPI data');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (teamLeaderId) {
      fetchTeamKPIData();
    }
  }, [teamLeaderId]);

  const handleRefresh = () => {
    fetchTeamKPIData();
  };

  // Sort members by KPI score (highest first) for ranking
  const sortedMembers = data?.individualKPIs ? [...data.individualKPIs].sort((a, b) => b.kpi.score - a.kpi.score) : [];
  
  // Pagination logic
  const totalPages = Math.ceil((sortedMembers.length || 0) / membersPerPage);
  const startIndex = (currentPage - 1) * membersPerPage;
  const endIndex = startIndex + membersPerPage;
  const currentMembers = sortedMembers.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleMembersPerPageChange = (perPage: number) => {
    setMembersPerPage(perPage);
    setCurrentPage(1); // Reset to first page
  };

  const getKPIButtonColor = (rating: string) => {
    switch (rating) {
      case 'Excellent': return 'success';
      case 'Good': return 'primary';
      case 'Average': return 'warning';
      case 'Needs Improvement': return 'error';
      case 'Not Started': return 'default';
      case 'On Track': return 'info';
      default: return 'default';
    }
  };

  const getKPIIcon = (rating: string) => {
    switch (rating) {
      case 'Excellent': return <EmojiEvents sx={{ fontSize: 20 }} />;
      case 'Good': return <TrendingUp sx={{ fontSize: 20 }} />;
      case 'Average': return <Assessment sx={{ fontSize: 20 }} />;
      case 'Needs Improvement': return <TrendingDown sx={{ fontSize: 20 }} />;
      case 'Not Started': return <Info sx={{ fontSize: 20 }} />;
      case 'On Track': return <CheckCircle sx={{ fontSize: 20 }} />;
      default: return <Assessment sx={{ fontSize: 20 }} />;
    }
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle sx={{ fontSize: 20 }} />;
      case 'warning': return <Warning sx={{ fontSize: 20 }} />;
      case 'error': return <TrendingDown sx={{ fontSize: 20 }} />;
      case 'info': return <Info sx={{ fontSize: 20 }} />;
      default: return <Info sx={{ fontSize: 20 }} />;
    }
  };

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'success': return '#dcfce7';
      case 'warning': return '#fef3c7';
      case 'error': return '#fecaca';
      case 'info': return '#dbeafe';
      default: return '#f3f4f6';
    }
  };

  const getInsightBorderColor = (type: string) => {
    switch (type) {
      case 'success': return '#bbf7d0';
      case 'warning': return '#fde68a';
      case 'error': return '#fecaca';
      case 'info': return '#bfdbfe';
      default: return '#e5e7eb';
    }
  };

  // Helper function to calculate KPI rating
  const calculateCompletionRateKPI = (completionRate: number, totalAssessments: number | null = null) => {
    let rating, color, description, score;
    
    // Check if user hasn't started KPI rating yet
    if (completionRate === 0 && (totalAssessments === 0 || totalAssessments === null)) {
      rating = 'Not Started';
      color = '#6b7280';
      description = 'KPI rating not yet started. Begin your work readiness assessments.';
      score = 0;
    } else if (completionRate >= 100) {
      rating = 'Excellent';
      color = '#10b981';
      description = 'Outstanding performance!';
      score = 100;
    } else if (completionRate >= 70) {
      rating = 'Good';
      color = '#3b82f6';
      description = 'Above average performance.';
      score = 85;
    } else if (completionRate >= 50) {
      rating = 'Average';
      color = '#f59e0b';
      description = 'Meeting expectations.';
      score = 70;
    } else {
      rating = 'Needs Improvement';
      color = '#ef4444';
      description = 'Below average performance. Needs attention.';
      score = 50;
    }
    
    return { rating, color, description, score };
  };

  // Enhanced Loading Skeleton Component
  const LoadingSkeleton = () => (
    <Box sx={{ width: '100%' }}>
      {/* Header Card Skeleton */}
      <Card sx={{ 
        borderRadius: 3,
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
        backgroundColor: 'white',
        mb: 3,
        position: 'relative',
        overflow: 'hidden',
      }}>
        <Box sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '6px',
          background: 'linear-gradient(90deg, #e5e7eb, #f3f4f6, #e5e7eb)',
          animation: 'shimmer 2s infinite',
          '@keyframes shimmer': {
            '0%': { transform: 'translateX(-100%)' },
            '100%': { transform: 'translateX(100%)' }
          }
        }} />
        
        <CardContent sx={{ p: 4 }}>
          {/* Header Skeleton */}
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            mb: 4 
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ 
                backgroundColor: '#f3f4f6',
                borderRadius: 3,
                p: 2,
                width: 64,
                height: 64,
                animation: 'pulse 2s infinite'
              }} />
              <Box>
                <Box sx={{
                  width: 200,
                  height: 24,
                  backgroundColor: '#f3f4f6',
                  borderRadius: 1,
                  mb: 1,
                  animation: 'pulse 2s infinite'
                }} />
                <Box sx={{
                  width: 150,
                  height: 16,
                  backgroundColor: '#f3f4f6',
                  borderRadius: 1,
                  animation: 'pulse 2s infinite'
                }} />
              </Box>
            </Box>
            
            <Box sx={{
              width: 40,
              height: 40,
              backgroundColor: '#f3f4f6',
              borderRadius: '50%',
              animation: 'pulse 2s infinite'
            }} />
          </Box>

          {/* Team Overview Stats Skeleton */}
          <Grid container spacing={3}>
            {[1, 2, 3, 4].map((i) => (
              <Grid item xs={12} sm={3} key={i}>
                <Box sx={{ 
                  textAlign: 'center', 
                  p: 3, 
                  backgroundColor: '#f8fafc', 
                  borderRadius: 2,
                  animation: 'pulse 2s infinite'
                }}>
                  <Box sx={{
                    width: 60,
                    height: 40,
                    backgroundColor: '#e5e7eb',
                    borderRadius: 1,
                    mx: 'auto',
                    mb: 1,
                    animation: 'pulse 2s infinite'
                  }} />
                  <Box sx={{
                    width: 120,
                    height: 16,
                    backgroundColor: '#e5e7eb',
                    borderRadius: 1,
                    mx: 'auto',
                    animation: 'pulse 2s infinite'
                  }} />
                </Box>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>

      {/* Individual Performance Table Skeleton */}
      <Card sx={{ 
        borderRadius: 3,
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
        backgroundColor: 'white',
      }}>
        <CardContent sx={{ p: 3 }}>
          {/* Table Header Skeleton */}
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            mb: 3,
            flexWrap: 'wrap',
            gap: 2
          }}>
            <Box sx={{
              width: 250,
              height: 24,
              backgroundColor: '#f3f4f6',
              borderRadius: 1,
              animation: 'pulse 2s infinite'
            }} />
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{
                width: 100,
                height: 32,
                backgroundColor: '#f3f4f6',
                borderRadius: 1,
                animation: 'pulse 2s infinite'
              }} />
              <Box sx={{
                width: 150,
                height: 16,
                backgroundColor: '#f3f4f6',
                borderRadius: 1,
                animation: 'pulse 2s infinite'
              }} />
            </Box>
          </Box>

          {/* Table Rows Skeleton */}
          <Box sx={{ display: { xs: 'none', md: 'block' } }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <Box key={i} sx={{
                display: 'flex',
                alignItems: 'center',
                p: 2,
                mb: 1,
                backgroundColor: i % 2 === 0 ? '#f9fafb' : 'white',
                borderRadius: 1,
                animation: 'pulse 2s infinite'
              }}>
                <Box sx={{
                  width: 40,
                  height: 40,
                  backgroundColor: '#e5e7eb',
                  borderRadius: '50%',
                  mr: 2,
                  animation: 'pulse 2s infinite'
                }} />
                <Box sx={{ flex: 1 }}>
                  <Box sx={{
                    width: 120,
                    height: 16,
                    backgroundColor: '#e5e7eb',
                    borderRadius: 1,
                    mb: 0.5,
                    animation: 'pulse 2s infinite'
                  }} />
                  <Box sx={{
                    width: 180,
                    height: 12,
                    backgroundColor: '#e5e7eb',
                    borderRadius: 1,
                    animation: 'pulse 2s infinite'
                  }} />
                </Box>
                <Box sx={{
                  width: 80,
                  height: 24,
                  backgroundColor: '#e5e7eb',
                  borderRadius: 1,
                  mr: 2,
                  animation: 'pulse 2s infinite'
                }} />
                <Box sx={{
                  width: 100,
                  height: 6,
                  backgroundColor: '#e5e7eb',
                  borderRadius: 1,
                  mr: 2,
                  animation: 'pulse 2s infinite'
                }} />
                <Box sx={{
                  width: 60,
                  height: 16,
                  backgroundColor: '#e5e7eb',
                  borderRadius: 1,
                  mr: 2,
                  animation: 'pulse 2s infinite'
                }} />
                <Box sx={{
                  width: 50,
                  height: 16,
                  backgroundColor: '#e5e7eb',
                  borderRadius: 1,
                  mr: 2,
                  animation: 'pulse 2s infinite'
                }} />
                <Box sx={{
                  width: 80,
                  height: 24,
                  backgroundColor: '#e5e7eb',
                  borderRadius: 1,
                  animation: 'pulse 2s infinite'
                }} />
              </Box>
            ))}
          </Box>

          {/* Mobile Cards Skeleton */}
          <Box sx={{ 
            display: { xs: 'block', md: 'none' },
            '& > * + *': { mt: 2 }
          }}>
            {[1, 2, 3].map((i) => (
              <Card key={i} sx={{ 
                borderRadius: 2,
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                border: '1px solid #e5e7eb',
                animation: 'pulse 2s infinite'
              }}>
                <CardContent sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <Box sx={{
                      width: 36,
                      height: 36,
                      backgroundColor: '#e5e7eb',
                      borderRadius: '50%',
                      animation: 'pulse 2s infinite'
                    }} />
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{
                        width: 100,
                        height: 16,
                        backgroundColor: '#e5e7eb',
                        borderRadius: 1,
                        mb: 0.5,
                        animation: 'pulse 2s infinite'
                      }} />
                      <Box sx={{
                        width: 150,
                        height: 12,
                        backgroundColor: '#e5e7eb',
                        borderRadius: 1,
                        animation: 'pulse 2s infinite'
                      }} />
                    </Box>
                    <Box sx={{
                      width: 80,
                      height: 24,
                      backgroundColor: '#e5e7eb',
                      borderRadius: 1,
                      animation: 'pulse 2s infinite'
                    }} />
                  </Box>
                  
                  <Box sx={{ mb: 2 }}>
                    <Box sx={{
                      width: 100,
                      height: 6,
                      backgroundColor: '#e5e7eb',
                      borderRadius: 1,
                      mb: 1,
                      animation: 'pulse 2s infinite'
                    }} />
                  </Box>
                  
                  <Box sx={{ 
                    display: 'grid', 
                    gridTemplateColumns: '1fr 1fr', 
                    gap: 2,
                    mb: 2
                  }}>
                    <Box sx={{
                      height: 40,
                      backgroundColor: '#f9fafb',
                      borderRadius: 1,
                      animation: 'pulse 2s infinite'
                    }} />
                    <Box sx={{
                      height: 40,
                      backgroundColor: '#f9fafb',
                      borderRadius: 1,
                      animation: 'pulse 2s infinite'
                    }} />
                  </Box>
                  
                  <Box sx={{
                    width: 80,
                    height: 24,
                    backgroundColor: '#e5e7eb',
                    borderRadius: 1,
                    mx: 'auto',
                    animation: 'pulse 2s infinite'
                  }} />
                </CardContent>
              </Card>
            ))}
          </Box>
        </CardContent>
      </Card>
    </Box>
  );

  if (loading && !data) {
    return <LoadingSkeleton />;
  }

  if (error && !data) {
    const isNetworkError = error.includes('Backend service is temporarily unavailable');
    
    return (
      <Card sx={{ 
        borderRadius: 3,
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
        backgroundColor: isNetworkError ? '#fef2f2' : '#f0f9ff',
        border: isNetworkError ? '1px solid #fecaca' : '1px solid #bae6fd',
      }}>
        <CardContent sx={{ textAlign: 'center', py: 6 }}>
          {isNetworkError ? (
            <>
              <Warning sx={{ color: '#dc2626', fontSize: 64, mb: 3 }} />
              <Typography sx={{ color: '#dc2626', mb: 2, fontSize: '1.25rem', fontWeight: 600 }}>
                Service Temporarily Unavailable
              </Typography>
              <Typography sx={{ color: '#6b7280', mb: 3 }}>
                The backend service is currently experiencing issues. This may be due to:
              </Typography>
              <Box sx={{ textAlign: 'left', mb: 3, maxWidth: 400, mx: 'auto' }}>
                <Typography sx={{ color: '#6b7280', fontSize: '0.875rem', mb: 1 }}>
                  • Server maintenance or updates
                </Typography>
                <Typography sx={{ color: '#6b7280', fontSize: '0.875rem', mb: 1 }}>
                  • Database connection issues
                </Typography>
                <Typography sx={{ color: '#6b7280', fontSize: '0.875rem', mb: 1 }}>
                  • Network connectivity problems
                </Typography>
              </Box>
              <Typography sx={{ color: '#10b981', fontSize: '0.875rem', fontWeight: 500, mb: 3 }}>
                ✅ Work readiness data collection is still working normally
              </Typography>
            </>
          ) : (
            <>
              <Assessment sx={{ color: '#3b82f6', fontSize: 64, mb: 3 }} />
              <Typography sx={{ color: '#1e40af', mb: 2, fontSize: '1.25rem', fontWeight: 600 }}>
                KPI Dashboard - Demonstration Mode
              </Typography>
              <Typography sx={{ color: '#6b7280', mb: 3 }}>
                Team performance tracking will be available once backend is deployed. Work readiness data is being collected successfully.
              </Typography>
              <Typography sx={{ color: '#10b981', fontSize: '0.875rem', fontWeight: 500 }}>
                ✅ Team member submissions are being tracked
              </Typography>
            </>
          )}
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={handleRefresh}
            sx={{ 
              mt: 2, 
              borderRadius: 2,
              borderColor: isNetworkError ? '#dc2626' : '#3b82f6',
              color: isNetworkError ? '#dc2626' : '#3b82f6',
              '&:hover': {
                borderColor: isNetworkError ? '#b91c1c' : '#2563eb',
                backgroundColor: isNetworkError ? '#fef2f2' : '#f0f9ff'
              }
            }}
          >
            Retry Connection
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const teamKPI = data.teamKPI;
  const teamMetrics = data.teamMetrics;
  
  // ✅ COMPREHENSIVE DEBUGGING
  console.log('📊 ===== TEAM KPI DASHBOARD RENDER =====');
  console.log('🎯 Team KPI Rating:', teamKPI.rating, '| Score:', teamKPI.score);
  console.log('📈 Completion Rate:', teamMetrics.completionRate, '%');
  console.log('⏰ On-Time Rate:', teamMetrics.onTimeRate, '%');
  console.log('👥 Total Members:', teamMetrics.totalMembers);
  console.log('📋 Assignments:', `${teamMetrics.completedAssignments}/${teamMetrics.totalAssignments}`);
  console.log('⏳ Pending Assignments:', teamMetrics.pendingAssignments);
  console.log('❌ Overdue Assignments:', teamMetrics.overdueAssignments);
  console.log('✅ On-Time Submissions:', teamMetrics.onTimeSubmissions);
  console.log('🏆 Quality Score:', teamMetrics.qualityScore);
  console.log('🎁 Pending Bonus:', teamKPI.pendingBonus, '%');
  console.log('⚠️ Overdue Penalty:', teamKPI.overduePenalty, '%');
  
  // ✅ UPDATED: Verify KPI calculation formula (matches backend with penalties)
  const pendingBonus = teamKPI.pendingBonus || 0;
  const overduePenalty = teamKPI.overduePenalty || 0;
  const expectedWeightedScore = (teamMetrics.completionRate * 0.7) + 
                                 (teamMetrics.onTimeRate * 0.2) + 
                                 ((teamMetrics.qualityScore || 0) * 0.1) + 
                                 pendingBonus - overduePenalty;
  console.log('🧮 Expected Weighted Score (WITH PENALTIES):', expectedWeightedScore.toFixed(2));
  console.log('🧮 Actual KPI Score:', teamKPI.score);
  console.log('🎁 Pending Bonus:', pendingBonus.toFixed(2));
  console.log('⚠️ Overdue Penalty:', overduePenalty.toFixed(2));
  
  if (Math.abs(expectedWeightedScore - teamKPI.score) > 1) {
    console.warn('⚠️ KPI score mismatch detected!');
  }
  
  console.log('==========================================');

  return (
    <Box sx={{ width: '100%' }}>
      {/* Header Card */}
      <Card sx={{ 
        borderRadius: 3,
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
        backgroundColor: 'white',
        mb: 3,
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Background gradient overlay */}
        <Box sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '6px',
          background: `linear-gradient(90deg, ${teamKPI.color}, ${teamKPI.color}88)`,
        }} />

        <CardContent sx={{ p: 4 }}>
          {/* Header */}
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            mb: 4 
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ 
                backgroundColor: '#f0f9ff',
                borderRadius: 3,
                p: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <People sx={{ fontSize: 32, color: '#0ea5e9' }} />
              </Box>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 700, color: '#1e293b' }}>
                  Team Assignment Performance
                </Typography>
                <Typography variant="body1" sx={{ color: '#64748b', mt: 0.5 }}>
                  {data.period.month}
                </Typography>
              </Box>
            </Box>
            
            <Tooltip title={refreshing ? "Refreshing data..." : "Refresh team data"}>
              <IconButton 
                onClick={handleRefresh}
                disabled={refreshing}
                sx={{ 
                  color: refreshing ? '#7B68EE' : '#64748b',
                  backgroundColor: refreshing ? 'rgba(123, 104, 238, 0.1)' : 'transparent',
                  '&:hover': { 
                    backgroundColor: refreshing ? 'rgba(123, 104, 238, 0.15)' : '#f1f5f9' 
                  },
                  transition: 'all 0.2s ease'
                }}
              >
                <Refresh sx={{ 
                  fontSize: 24, 
                  animation: refreshing ? 'spin 1s linear infinite' : 'none',
                  '@keyframes spin': {
                    '0%': { transform: 'rotate(0deg)' },
                    '100%': { transform: 'rotate(360deg)' },
                  }
                }} />
              </IconButton>
            </Tooltip>
          </Box>

          {/* Team Overview Stats */}
          <Grid container spacing={3}>
            <Grid item xs={12} sm={3}>
              <Box sx={{ textAlign: 'center', p: 3, backgroundColor: '#f8fafc', borderRadius: 2 }}>
                <Typography variant="h4" sx={{ fontWeight: 700, color: '#1e293b', mb: 1 }}>
                  {teamMetrics.totalMembers}
                </Typography>
                <Typography variant="body2" sx={{ color: '#64748b' }}>
                  Total Team Members
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={3}>
              <Box sx={{ textAlign: 'center', p: 3, backgroundColor: '#f8fafc', borderRadius: 2 }}>
                <Typography variant="h4" sx={{ fontWeight: 700, color: '#1e293b', mb: 1 }}>
                  {teamMetrics.completedAssignments}/{teamMetrics.totalAssignments}
                </Typography>
                <Typography variant="body2" sx={{ color: '#64748b' }}>
                  Assignments Completed
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={3}>
              <Box sx={{ textAlign: 'center', p: 3, backgroundColor: '#f8fafc', borderRadius: 2 }}>
                <Typography variant="h4" sx={{ fontWeight: 700, color: '#1e293b', mb: 1 }}>
                  {teamMetrics.onTimeRate}%
                </Typography>
                <Typography variant="body2" sx={{ color: '#64748b' }}>
                  On-Time Submissions
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Chip
                  icon={getKPIIcon(teamKPI.rating)}
                  label={`${teamKPI.rating} Team KPI`}
                  color={getKPIButtonColor(teamKPI.rating) as any}
                  size="medium"
                  sx={{ 
                    fontWeight: 600,
                    fontSize: '1rem',
                    height: 40,
                    px: 2
                  }}
                />
                <Typography variant="caption" sx={{ 
                  display: 'block', 
                  mt: 1, 
                  color: '#6b7280'
                }}>
                  Team Performance Rating
                </Typography>
                <Typography variant="caption" sx={{ 
                  display: 'block', 
                  mt: 0.5, 
                  color: '#9ca3af',
                  fontSize: '0.75rem'
                }}>
                  {teamMetrics.completedAssignments}/{teamMetrics.totalMembers} members this month
                </Typography>
              </Box>
            </Grid>
          </Grid>

          {/* Weekly Performance Metrics */}
          <Box sx={{ mt: 4, p: 3, backgroundColor: '#f0f9ff', borderRadius: 2, border: '1px solid #bae6fd' }}>
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e40af', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Assessment sx={{ fontSize: 20 }} />
              Weekly Performance Metrics
            </Typography>
            <Typography variant="body2" sx={{ color: '#1e40af', mb: 3 }}>
              Team performance based on weekly work readiness submissions.
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <Box sx={{ textAlign: 'center', p: 2, backgroundColor: 'white', borderRadius: 2, border: '1px solid #e5e7eb' }}>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: '#059669', mb: 0.5 }}>
                    {teamMetrics.completedAssignments}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#6b7280', fontWeight: 500 }}>
                    Completed Assignments
                  </Typography>
                  <Typography variant="caption" sx={{ display: 'block', color: '#9ca3af', fontSize: '0.7rem', mt: 0.5 }}>
                    Members who completed assignments
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Box sx={{ textAlign: 'center', p: 2, backgroundColor: 'white', borderRadius: 2, border: '1px solid #e5e7eb' }}>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: '#3b82f6', mb: 0.5 }}>
                    {teamMetrics.completionRate}%
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#6b7280', fontWeight: 500 }}>
                    Completion Rate
                  </Typography>
                  <Typography variant="caption" sx={{ display: 'block', color: '#9ca3af', fontSize: '0.7rem', mt: 0.5 }}>
                    Assignment completion percentage
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Box sx={{ textAlign: 'center', p: 2, backgroundColor: 'white', borderRadius: 2, border: '1px solid #e5e7eb' }}>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: '#dc2626', mb: 0.5 }}>
                    {teamMetrics.onTimeSubmissions}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#6b7280', fontWeight: 500 }}>
                    On-Time Submissions
                  </Typography>
                  <Typography variant="caption" sx={{ display: 'block', color: '#9ca3af', fontSize: '0.7rem', mt: 0.5 }}>
                    {teamMetrics.onTimeRate}% submitted on-time
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Box sx={{ textAlign: 'center', p: 2, backgroundColor: 'white', borderRadius: 2, border: '1px solid #e5e7eb' }}>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: '#f59e0b', mb: 0.5 }}>
                    {teamMetrics.totalMembers}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#6b7280', fontWeight: 500 }}>
                    Total Team Members
                  </Typography>
                  <Typography variant="caption" sx={{ display: 'block', color: '#9ca3af', fontSize: '0.7rem', mt: 0.5 }}>
                    Complete team size
                  </Typography>
                </Box>
              </Grid>
            </Grid>
            
            {/* Week Information */}
            <Box sx={{ mt: 3, p: 2, backgroundColor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0' }}>
              <Typography variant="body2" sx={{ color: '#475569', fontWeight: 500, mb: 1 }}>
                📅 Current Period: {data.period.start} to {data.period.end}
              </Typography>
              <Typography variant="body2" sx={{ color: '#dc2626', fontWeight: 500, mb: 1 }}>
                📅 Assignment Summary: {teamMetrics.completedAssignments}/{teamMetrics.totalAssignments} assignments completed ({teamMetrics.completionRate}%)
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748b' }}>
                Team performance is calculated based on assignment completion rates and quality scores.
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Performance Insights - Removed for assignment-based system */}
      {false && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          {[].map((insight: any, index: number) => (
            <Grid item xs={12} key={index}>
              <Alert
                severity={insight.type as any}
                icon={getInsightIcon(insight.type)}
                sx={{
                  backgroundColor: getInsightColor(insight.type),
                  border: `1px solid ${getInsightBorderColor(insight.type)}`,
                  borderRadius: 2,
                  '& .MuiAlert-icon': {
                    color: insight.type === 'success' ? '#16a34a' :
                           insight.type === 'warning' ? '#d97706' :
                           insight.type === 'error' ? '#dc2626' : '#2563eb'
                  }
                }}
              >
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                  {insight.title}
                </Typography>
                <Typography variant="body2">
                  {insight.message}
                </Typography>
              </Alert>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Individual Performance Table */}
      <Card sx={{ 
        borderRadius: 3,
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
        backgroundColor: 'white',
      }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            mb: 3,
            flexWrap: 'wrap',
            gap: 2
          }}>
            <Typography variant="h6" sx={{ 
              fontWeight: 600, 
              color: '#1e293b',
              display: 'flex',
              alignItems: 'center',
              gap: 1
            }}>
              <People sx={{ fontSize: 20 }} />
              Individual Team Member Performance
            </Typography>
            
            {/* Pagination Controls */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
              {/* Members per page selector */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" sx={{ color: '#6b7280', fontWeight: 500 }}>
                  Show:
                </Typography>
                <select
                  value={membersPerPage}
                  onChange={(e) => handleMembersPerPageChange(parseInt(e.target.value))}
                  style={{
                    padding: '0.375rem 0.75rem',
                    borderRadius: '0.25rem',
                    border: '1px solid #d1d5db',
                    backgroundColor: 'white',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: '#374151',
                    cursor: 'pointer'
                  }}
                >
                  <option value={5}>5 members</option>
                  <option value={10}>10 members</option>
                  <option value={15}>15 members</option>
                  <option value={20}>20 members</option>
                </select>
              </Box>
              
              {/* Page info */}
              <Typography variant="body2" sx={{ color: '#6b7280' }}>
                Showing {startIndex + 1} to {Math.min(endIndex, sortedMembers.length || 0)} of {sortedMembers.length || 0} members
              </Typography>
            </Box>
          </Box>

          {/* Mobile Card View */}
          <Box sx={{ 
            display: { xs: 'block', md: 'none' },
            '& > * + *': { mt: 2 }
          }}>
            {currentMembers.map((member, index) => {
              const globalRank = startIndex + index + 1;
              return (
                <Card key={member.workerId} sx={{ 
                  borderRadius: 2,
                  boxShadow: globalRank === 1 ? '0 4px 12px rgba(245, 158, 11, 0.2)' : '0 2px 8px rgba(0,0,0,0.1)',
                  border: globalRank === 1 ? '2px solid #f59e0b' : globalRank <= 3 ? '2px solid #f59e0b' : '1px solid #e5e7eb',
                  backgroundColor: globalRank === 1 ? '#fefce8' : 'white'
                }}>
                  <CardContent sx={{ p: 2 }}>
                    {/* Header with Rank and Member Info */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                      <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        backgroundColor: globalRank === 1 ? '#fef3c7' : globalRank <= 3 ? '#fef3c7' : '#f3f4f6',
                        border: globalRank === 1 ? '2px solid #f59e0b' : globalRank <= 3 ? '2px solid #f59e0b' : '1px solid #d1d5db',
                        flexShrink: 0,
                        position: 'relative'
                      }}>
                        {globalRank === 1 && (
                          <Box sx={{ 
                            position: 'absolute', 
                            top: '-8px', 
                            right: '-8px', 
                            fontSize: '0.8rem',
                            filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))'
                          }}>
                            🥇
                          </Box>
                        )}
                        <Typography sx={{ 
                          fontWeight: 700, 
                          fontSize: '0.75rem',
                          color: globalRank === 1 ? '#92400e' : globalRank <= 3 ? '#92400e' : '#6b7280'
                        }}>
                          {globalRank}
                        </Typography>
                      </Box>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#1f2937', mb: 0.5 }}>
                          {member.workerName}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#6b7280', display: 'block' }}>
                          {member.workerEmail}
                        </Typography>
                      </Box>
                      <Chip
                        icon={getKPIIcon(member.kpi.rating)}
                        label={member.kpi.rating}
                        color={getKPIButtonColor(member.kpi.rating) as any}
                        size="small"
                        sx={{ fontWeight: 500, fontSize: '0.75rem' }}
                      />
                    </Box>

                    {/* Progress Bar */}
                    <Box sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="caption" sx={{ color: '#6b7280', fontWeight: 500 }}>
                          Progress
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#6b7280', fontWeight: 600 }}>
                          {member.kpi.completionRate}%
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={member.kpi.completionRate}
                        sx={{
                          height: 6,
                          borderRadius: 3,
                          backgroundColor: '#e5e7eb',
                          '& .MuiLinearProgress-bar': {
                            borderRadius: 3,
                            backgroundColor: member.kpi.color,
                          }
                        }}
                      />
                    </Box>

                    {/* Stats Row */}
                    <Box sx={{ 
                      display: 'grid', 
                      gridTemplateColumns: '1fr 1fr', 
                      gap: 2,
                      mb: 2
                    }}>
                      <Box sx={{ textAlign: 'center', p: 1, backgroundColor: '#f9fafb', borderRadius: 1 }}>
                        <Typography variant="caption" sx={{ color: '#6b7280', display: 'block', mb: 0.5 }}>
                          Completion
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#1f2937' }}>
                          {member.assignments.completed}/{member.assignments.total}
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: 'center', p: 1, backgroundColor: '#f9fafb', borderRadius: 1 }}>
                        <Typography variant="caption" sx={{ color: '#6b7280', display: 'block', mb: 0.5 }}>
                          On-Time
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#1f2937' }}>
                          {member.assignments.onTime} on-time
                        </Typography>
                      </Box>
                    </Box>

                    {/* Status */}
                    <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                      {member.assignments.overdue === 0 ? (
                        <Chip 
                          icon={<CheckCircle sx={{ fontSize: 14 }} />}
                          label="On Track" 
                          color="success" 
                          size="small"
                          sx={{ fontSize: '0.75rem' }}
                        />
                      ) : member.assignments.overdue <= 2 ? (
                        <Chip 
                          icon={<Warning sx={{ fontSize: 14 }} />}
                          label="Minor Delay" 
                          color="warning" 
                          size="small"
                          sx={{ fontSize: '0.75rem' }}
                        />
                      ) : (
                        <Chip 
                          icon={<TrendingDown sx={{ fontSize: 14 }} />}
                          label="Needs Attention" 
                          color="error" 
                          size="small"
                          sx={{ fontSize: '0.75rem' }}
                        />
                      )}
                    </Box>
                  </CardContent>
                </Card>
              );
            })}
          </Box>

          {/* Desktop Table View */}
          <Box sx={{ display: { xs: 'none', md: 'block' } }}>
            <Table sx={{ minWidth: 650 }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600, color: '#374151', width: '60px' }}>Rank</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#374151' }}>Team Member</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#374151' }}>KPI Rating</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#374151' }}>Progress</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#374151' }}>Completion Rate</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#374151' }}>Current Streak</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#374151' }}>Status</TableCell>
                </TableRow>
              </TableHead>
            <TableBody>
              {currentMembers.map((member, index) => {
                const globalRank = startIndex + index + 1;
                return (
                <TableRow key={member.workerId} hover sx={{
                  backgroundColor: globalRank === 1 ? '#fefce8' : 'inherit',
                  '&:hover': {
                    backgroundColor: globalRank === 1 ? '#fef3c7' : '#f9fafb'
                  }
                }}>
                  <TableCell>
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      backgroundColor: globalRank === 1 ? '#fef3c7' : globalRank <= 3 ? '#fef3c7' : '#f3f4f6',
                      border: globalRank === 1 ? '2px solid #f59e0b' : globalRank <= 3 ? '2px solid #f59e0b' : '1px solid #d1d5db',
                      position: 'relative'
                    }}>
                      {globalRank === 1 && (
                        <Box sx={{ 
                          position: 'absolute', 
                          top: '-10px', 
                          right: '-10px', 
                          fontSize: '1rem',
                          filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'
                        }}>
                          🥇
                        </Box>
                      )}
                      <Typography sx={{ 
                        fontWeight: 700, 
                        fontSize: '0.875rem',
                        color: globalRank === 1 ? '#92400e' : globalRank <= 3 ? '#92400e' : '#6b7280'
                      }}>
                        {globalRank}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar sx={{ 
                        width: 32, 
                        height: 32,
                        backgroundColor: getKPIButtonColor(member.kpi.rating) === 'success' ? '#dcfce7' :
                                        getKPIButtonColor(member.kpi.rating) === 'primary' ? '#dbeafe' :
                                        getKPIButtonColor(member.kpi.rating) === 'warning' ? '#fef3c7' : '#fecaca',
                        fontSize: '0.875rem',
                        fontWeight: 600
                      }}>
                        {member.workerName.charAt(0)}
                      </Avatar>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#1f2937' }}>
                          {member.workerName}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#6b7280' }}>
                          {member.workerEmail}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  
                  <TableCell>
                    <Chip
                      icon={getKPIIcon(member.kpi.rating)}
                      label={member.kpi.rating}
                      color={getKPIButtonColor(member.kpi.rating) as any}
                      size="small"
                      sx={{ fontWeight: 500 }}
                    />
                  </TableCell>
                  
                  <TableCell sx={{ minWidth: 120 }}>
                    <LinearProgress
                      variant="determinate"
                      value={member.kpi.completionRate}
                      sx={{
                        height: 6,
                        borderRadius: 3,
                        backgroundColor: '#e5e7eb',
                        '& .MuiLinearProgress-bar': {
                          borderRadius: 3,
                          backgroundColor: member.kpi.color,
                        }
                      }}
                    />
                  </TableCell>
                  
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {member.assignments.completed}/{member.assignments.total} assignments
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#6b7280' }}>
                      {member.kpi.completionRate}%
                    </Typography>
                  </TableCell>
                  
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {member.assignments.onTime}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#6b7280' }}>
                        on-time
                      </Typography>
                    </Box>
                  </TableCell>
                  
                  <TableCell>
                    {member.assignments.overdue === 0 ? (
                      <Chip 
                        icon={<CheckCircle sx={{ fontSize: 14 }} />}
                        label="On Track" 
                        color="success" 
                        size="small"
                        sx={{ fontSize: '0.75rem' }}
                      />
                    ) : member.assignments.overdue <= 2 ? (
                      <Chip 
                        icon={<Warning sx={{ fontSize: 14 }} />}
                        label="Minor Delay" 
                        color="warning" 
                        size="small"
                        sx={{ fontSize: '0.75rem' }}
                      />
                    ) : (
                      <Chip 
                        icon={<TrendingDown sx={{ fontSize: 14 }} />}
                        label="Needs Attention" 
                        color="error" 
                        size="small"
                        sx={{ fontSize: '0.75rem' }}
                      />
                    )}
                  </TableCell>
                </TableRow>
                );
              })}
            </TableBody>
            </Table>
          </Box>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <Box sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: { xs: 0.5, md: 1 },
              marginTop: 3,
              padding: { xs: 1.5, md: 2 },
              backgroundColor: '#f9fafb',
              borderRadius: 2,
              border: '1px solid #e5e7eb',
              flexWrap: 'wrap'
            }}>
              {/* Previous Button */}
              <Button
                onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                variant="outlined"
                size="small"
                sx={{
                  minWidth: 'auto',
                  px: { xs: 1.5, md: 2 },
                  py: { xs: 0.75, md: 1 },
                  fontSize: { xs: '0.75rem', md: '0.875rem' },
                  fontWeight: 500,
                  borderColor: '#d1d5db',
                  color: currentPage === 1 ? '#9ca3af' : '#374151',
                  '&:hover': {
                    borderColor: currentPage === 1 ? '#d1d5db' : '#3b82f6',
                    backgroundColor: currentPage === 1 ? 'transparent' : '#f3f4f6'
                  },
                  '&:disabled': {
                    borderColor: '#d1d5db',
                    color: '#9ca3af'
                  }
                }}
              >
                <Box sx={{ display: { xs: 'none', sm: 'inline' } }}>« Previous</Box>
                <Box sx={{ display: { xs: 'inline', sm: 'none' } }}>«</Box>
              </Button>

              {/* Page Numbers */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }

                return (
                  <Button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    variant={currentPage === pageNum ? "contained" : "outlined"}
                    size="small"
                    sx={{
                      minWidth: { xs: '32px', md: '40px' },
                      height: { xs: '32px', md: '40px' },
                      fontSize: { xs: '0.75rem', md: '0.875rem' },
                      fontWeight: 500,
                      backgroundColor: currentPage === pageNum ? '#3b82f6' : 'white',
                      color: currentPage === pageNum ? 'white' : '#374151',
                      borderColor: currentPage === pageNum ? '#3b82f6' : '#d1d5db',
                      '&:hover': {
                        backgroundColor: currentPage === pageNum ? '#2563eb' : '#f3f4f6',
                        borderColor: currentPage === pageNum ? '#2563eb' : '#3b82f6'
                      }
                    }}
                  >
                    {pageNum}
                  </Button>
                );
              })}

              {/* Next Button */}
              <Button
                onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                variant="outlined"
                size="small"
                sx={{
                  minWidth: 'auto',
                  px: { xs: 1.5, md: 2 },
                  py: { xs: 0.75, md: 1 },
                  fontSize: { xs: '0.75rem', md: '0.875rem' },
                  fontWeight: 500,
                  borderColor: '#d1d5db',
                  color: currentPage === totalPages ? '#9ca3af' : '#374151',
                  '&:hover': {
                    borderColor: currentPage === totalPages ? '#d1d5db' : '#3b82f6',
                    backgroundColor: currentPage === totalPages ? 'transparent' : '#f3f4f6'
                  },
                  '&:disabled': {
                    borderColor: '#d1d5db',
                    color: '#9ca3af'
                  }
                }}
              >
                <Box sx={{ display: { xs: 'none', sm: 'inline' } }}>Next »</Box>
                <Box sx={{ display: { xs: 'inline', sm: 'none' } }}>»</Box>
              </Button>
            </Box>
          )}

          {/* Page Summary */}
          <Box sx={{
            textAlign: 'center',
            marginTop: 2,
            fontSize: '0.875rem',
            color: '#6b7280'
          }}>
            Page {currentPage} of {totalPages} • {sortedMembers.length || 0} total members • Ranked by completion rate
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default TeamKPIDashboard;
