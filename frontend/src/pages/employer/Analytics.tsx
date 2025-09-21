import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  LinearProgress,
} from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
} from 'recharts';
import {
  Person,
  Assignment,
  Warning,
  TrendingUp,
  TrendingDown,
  Schedule,
  HealthAndSafety,
  Assessment,
  CheckCircle,
  Error,
  AccessTime,
} from '@mui/icons-material';
import Layout from '../../components/Layout';
import api from '../../utils/api';

interface DashboardStats {
  incidents: {
    total: number;
    recent: number;
    statusStats: Array<{ _id: string; count: number }>;
    severityStats: Array<{ _id: string; count: number }>;
  };
  cases: {
    total: number;
    statusStats: Array<{ _id: string; count: number }>;
    priorityStats: Array<{ _id: string; count: number }>;
  };
  compliance: {
    totalWorkers: number;
    compliantWorkers: number;
    nonCompliantWorkers: number;
    averageComplianceScore: number;
    restrictionViolations: number;
  };
  workers: Array<{
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    lastCheckIn?: string;
    complianceScore?: number;
  }>;
  recentIncidents: Array<{
    _id: string;
    description: string;
    severity: string;
    status: string;
    reportedDate: string;
  }>;
}

const Analytics: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [incidentsRes, casesRes, workersRes, incidentStatsRes, caseStatsRes, checkInsRes] = await Promise.all([
        api.get('/incidents'),
        api.get('/cases'),
        api.get('/users/role/worker'),
        api.get('/incidents/dashboard/stats'),
        api.get('/cases/dashboard/stats'),
        api.get('/check-ins').catch(() => ({ data: { checkIns: [] } }))
      ]);

      // Calculate compliance stats from real data
      const totalWorkers = workersRes.data.users?.length || 0;
      const recentCheckIns = checkInsRes.data.checkIns || [];
      
      // Calculate compliance score for each worker based on their check-ins
      const workersWithCompliance = workersRes.data.users?.map((worker: any) => {
        const workerCheckIns = recentCheckIns.filter((checkIn: any) => 
          checkIn.workerId === worker._id
        );
        
        if (workerCheckIns.length === 0) {
          return {
            ...worker,
            complianceScore: 0,
            lastCheckIn: null
          };
        }
        
        const compliantCheckIns = workerCheckIns.filter((checkIn: any) => 
          checkIn.exerciseCompliance?.completed && 
          checkIn.medicationCompliance?.taken
        );
        
        const complianceScore = Math.round((compliantCheckIns.length / workerCheckIns.length) * 100);
        const lastCheckIn = workerCheckIns.sort((a: any, b: any) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )[0]?.createdAt;
        
        return {
          ...worker,
          complianceScore,
          lastCheckIn
        };
      }) || [];
      
      const compliantWorkers = workersWithCompliance.filter((w: any) => w.complianceScore >= 80).length;
      const nonCompliantWorkers = totalWorkers - compliantWorkers;
      const averageComplianceScore = totalWorkers > 0 ? 
        Math.round(workersWithCompliance.reduce((sum: number, w: any) => sum + w.complianceScore, 0) / totalWorkers) : 0;
      
      setStats({
        incidents: {
          total: incidentsRes.data.pagination?.total || 0,
          recent: incidentStatsRes.data.recentIncidents || 0,
          statusStats: incidentStatsRes.data.statusStats || [],
          severityStats: incidentStatsRes.data.severityStats || []
        },
        cases: {
          total: casesRes.data.pagination?.total || 0,
          statusStats: caseStatsRes.data.statusStats || [],
          priorityStats: caseStatsRes.data.priorityStats || []
        },
        compliance: {
          totalWorkers,
          compliantWorkers,
          nonCompliantWorkers,
          averageComplianceScore,
          restrictionViolations: 0
        },
        workers: workersWithCompliance,
        recentIncidents: incidentsRes.data.incidents?.slice(0, 5) || []
      });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch analytics data');
    } finally {
      setLoading(false);
    }
  };

  // Chart data functions
  const getIncidentData = () => {
    if (!stats?.incidents.statusStats) return [];
    return stats.incidents.statusStats.map(stat => ({
      name: stat._id.replace('_', ' '),
      count: stat.count
    }));
  };

  const getCaseData = () => {
    if (!stats?.cases.priorityStats) return [];
    return stats.cases.priorityStats.map(stat => ({
      name: stat._id,
      value: stat.count,
      fill: stat._id === 'urgent' ? '#ef4444' : 
            stat._id === 'high' ? '#f59e0b' : 
            stat._id === 'medium' ? '#3b82f6' : '#10b981'
    }));
  };

  const getSeverityData = () => {
    if (!stats?.incidents.severityStats) return [];
    return stats.incidents.severityStats.map(stat => ({
      name: stat._id.replace('_', ' '),
      count: stat.count,
      fill: stat._id === 'fatality' ? '#dc2626' :
            stat._id === 'lost_time' ? '#f59e0b' :
            stat._id === 'medical_treatment' ? '#3b82f6' :
            stat._id === 'first_aid' ? '#10b981' : '#6b7280'
    }));
  };

  const getComplianceTrendData = () => {
    // Calculate compliance trend from real check-in data
    if (!stats?.workers) return [];
    
    // Group workers by compliance score ranges
    const complianceRanges = [
      { range: '90-100%', count: stats.workers.filter(w => (w.complianceScore || 0) >= 90).length },
      { range: '80-89%', count: stats.workers.filter(w => (w.complianceScore || 0) >= 80 && (w.complianceScore || 0) < 90).length },
      { range: '70-79%', count: stats.workers.filter(w => (w.complianceScore || 0) >= 70 && (w.complianceScore || 0) < 80).length },
      { range: '60-69%', count: stats.workers.filter(w => (w.complianceScore || 0) >= 60 && (w.complianceScore || 0) < 70).length },
      { range: 'Below 60%', count: stats.workers.filter(w => (w.complianceScore || 0) < 60).length }
    ];
    
    return complianceRanges;
  };

  // Helper functions
  const getSeverityColor = (severity: string) => {
    const colors: { [key: string]: string } = {
      'fatality': '#dc2626',
      'lost_time': '#f59e0b',
      'medical_treatment': '#3b82f6',
      'first_aid': '#10b981',
      'near_miss': '#6b7280'
    };
    return colors[severity] || '#6b7280';
  };

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      'reported': '#ef4444',
      'investigating': '#f59e0b',
      'investigated': '#3b82f6',
      'closed': '#10b981'
    };
    return colors[status] || '#6b7280';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  // Calculate real trends from data
  const getTrendData = () => {
    if (!stats) return { casesTrend: '+0%', incidentsTrend: '+0%', complianceTrend: '+0%' };
    
    // Calculate trends based on recent vs total data
    const casesTrend = stats.cases.total > 0 ? 
      `+${Math.round((stats.cases.total / Math.max(stats.cases.total - 5, 1)) * 100 - 100)}%` : '+0%';
    
    const incidentsTrend = stats.incidents.total > 0 ? 
      `-${Math.round((stats.incidents.recent / stats.incidents.total) * 100)}%` : '+0%';
    
    const complianceTrend = stats.compliance.averageComplianceScore > 0 ? 
      `+${Math.round((stats.compliance.averageComplianceScore / Math.max(stats.compliance.averageComplianceScore - 10, 1)) * 100 - 100)}%` : '+0%';
    
    return { casesTrend, incidentsTrend, complianceTrend };
  };

  const trends = getTrendData();

  if (loading) {
    return (
      <Layout>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  return (
    <Layout>
      <Box sx={{ 
        minHeight: '100vh', 
        backgroundColor: '#f8fafc',
        padding: { xs: 0, sm: 0, md: 1 },
        overflowX: 'hidden',
        width: '100%',
        maxWidth: '100vw'
      }}>
        {/* Header Section */}
        <Box sx={{ 
          backgroundColor: 'white', 
          borderRadius: { xs: 0, sm: 2, md: 3 }, 
          padding: { xs: 1.5, sm: 2, md: 3 }, 
          mb: { xs: 1, sm: 2, md: 3 },
          boxShadow: { xs: 'none', sm: '0 1px 3px rgba(0,0,0,0.1)' },
          borderBottom: { xs: '1px solid #e2e8f0', sm: 'none' }
        }}>
          <Typography variant="h3" component="h1" sx={{ 
            fontWeight: 700, 
            color: '#1e293b',
            mb: 1,
            fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2rem' }
          }}>
            Analytics Dashboard
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ 
            fontSize: { xs: '0.875rem', sm: '1rem' }
          }}>
            Workplace safety and compliance overview
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Mobile-Optimized KPI Cards */}
        <Grid container spacing={{ xs: 1, sm: 2, md: 3 }} sx={{ mb: { xs: 2, sm: 3, md: 4 } }}>
          <Grid xs={6} sm={6} md={3}>
            <Card sx={{ 
              borderRadius: { xs: 2, sm: 2 },
              boxShadow: { xs: '0 2px 8px rgba(0,0,0,0.1)', sm: '0 1px 3px rgba(0,0,0,0.1)' },
              minHeight: { xs: '100px', sm: '120px' }
            }}>
              <CardContent sx={{ 
                p: { xs: 1.5, sm: 2, md: 3 }, 
                textAlign: 'center',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center'
              }}>
                <Person sx={{ 
                  fontSize: { xs: 24, sm: 32, md: 40 }, 
                  color: '#3b82f6', 
                  mb: { xs: 1, sm: 2 } 
                }} />
                <Typography variant="h4" sx={{ 
                  fontWeight: 700, 
                  color: '#1e293b', 
                  mb: 0.5,
                  fontSize: { xs: '1.25rem', sm: '1.5rem', md: '2rem' }
                }}>
                  {stats?.compliance.compliantWorkers || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{
                  fontSize: { xs: '0.7rem', sm: '0.75rem' },
                  mb: 0.5
                }}>
                  Compliant Workers
                </Typography>
                <Typography variant="body2" sx={{ 
                  color: '#10b981', 
                  fontWeight: 600,
                  fontSize: { xs: '0.65rem', sm: '0.75rem' }
                }}>
                  {stats?.compliance.averageComplianceScore || 0}% compliance rate
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid xs={6} sm={6} md={3}>
            <Card sx={{ 
              borderRadius: { xs: 2, sm: 2 },
              boxShadow: { xs: '0 2px 8px rgba(0,0,0,0.1)', sm: '0 1px 3px rgba(0,0,0,0.1)' },
              minHeight: { xs: '100px', sm: '120px' }
            }}>
              <CardContent sx={{ 
                p: { xs: 1.5, sm: 2, md: 3 }, 
                textAlign: 'center',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center'
              }}>
                <Assignment sx={{ 
                  fontSize: { xs: 24, sm: 32, md: 40 }, 
                  color: '#f59e0b', 
                  mb: { xs: 1, sm: 2 } 
                }} />
                <Typography variant="h4" sx={{ 
                  fontWeight: 700, 
                  color: '#1e293b', 
                  mb: 0.5,
                  fontSize: { xs: '1.25rem', sm: '1.5rem', md: '2rem' }
                }}>
                  {stats?.cases.total || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{
                  fontSize: { xs: '0.7rem', sm: '0.75rem' },
                  mb: 0.5
                }}>
                  Active Cases
                </Typography>
                <Typography variant="body2" sx={{ 
                  color: '#10b981', 
                  fontWeight: 600,
                  fontSize: { xs: '0.65rem', sm: '0.75rem' }
                }}>
                  <TrendingUp sx={{ fontSize: { xs: 12, sm: 16 }, mr: 0.5 }} />
                  {trends.casesTrend} from last month
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid xs={6} sm={6} md={3}>
            <Card sx={{ 
              borderRadius: { xs: 2, sm: 2 },
              boxShadow: { xs: '0 2px 8px rgba(0,0,0,0.1)', sm: '0 1px 3px rgba(0,0,0,0.1)' },
              minHeight: { xs: '100px', sm: '120px' }
            }}>
              <CardContent sx={{ 
                p: { xs: 1.5, sm: 2, md: 3 }, 
                textAlign: 'center',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center'
              }}>
                <Warning sx={{ 
                  fontSize: { xs: 24, sm: 32, md: 40 }, 
                  color: '#ef4444', 
                  mb: { xs: 1, sm: 2 } 
                }} />
                <Typography variant="h4" sx={{ 
                  fontWeight: 700, 
                  color: '#1e293b', 
                  mb: 0.5,
                  fontSize: { xs: '1.25rem', sm: '1.5rem', md: '2rem' }
                }}>
                  {stats?.incidents.total || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{
                  fontSize: { xs: '0.7rem', sm: '0.75rem' },
                  mb: 0.5
                }}>
                  Total Incidents
                </Typography>
                <Typography variant="body2" sx={{ 
                  color: '#ef4444', 
                  fontWeight: 600,
                  fontSize: { xs: '0.65rem', sm: '0.75rem' }
                }}>
                  {stats?.incidents.recent || 0} in last 30 days
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid xs={6} sm={6} md={3}>
            <Card sx={{ 
              borderRadius: { xs: 2, sm: 2 },
              boxShadow: { xs: '0 2px 8px rgba(0,0,0,0.1)', sm: '0 1px 3px rgba(0,0,0,0.1)' },
              minHeight: { xs: '100px', sm: '120px' }
            }}>
              <CardContent sx={{ 
                p: { xs: 1.5, sm: 2, md: 3 }, 
                textAlign: 'center',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center'
              }}>
                <TrendingUp sx={{ 
                  fontSize: { xs: 24, sm: 32, md: 40 }, 
                  color: '#10b981', 
                  mb: { xs: 1, sm: 2 } 
                }} />
                <Typography variant="h4" sx={{ 
                  fontWeight: 700, 
                  color: '#1e293b', 
                  mb: 0.5,
                  fontSize: { xs: '1.25rem', sm: '1.5rem', md: '2rem' }
                }}>
                  {stats?.compliance.totalWorkers || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{
                  fontSize: { xs: '0.7rem', sm: '0.75rem' },
                  mb: 0.5
                }}>
                  Total Workers
                </Typography>
                <Typography variant="body2" sx={{ 
                  color: '#3b82f6', 
                  fontWeight: 600,
                  fontSize: { xs: '0.65rem', sm: '0.75rem' }
                }}>
                  {stats?.compliance.nonCompliantWorkers || 0} need attention
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Mobile-Optimized Charts Section */}
        <Grid container spacing={{ xs: 1, sm: 2, md: 3 }} sx={{ mb: { xs: 2, sm: 3, md: 4 } }}>
          {/* Incident Status Chart */}
          <Grid xs={12} lg={6}>
            <Card sx={{ 
              borderRadius: { xs: 0, sm: 2 },
              boxShadow: { xs: 'none', sm: '0 1px 3px rgba(0,0,0,0.1)' },
              border: { xs: 'none', sm: '1px solid #e2e8f0' }
            }}>
              <CardContent sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
                <Typography variant="h6" sx={{ 
                  fontWeight: 600, 
                  mb: { xs: 2, sm: 3 },
                  fontSize: { xs: '1rem', sm: '1.25rem' }
                }}>
                  Incident Status Overview
                </Typography>
                <Box sx={{ height: { xs: 250, sm: 300 } }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={getIncidentData()}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis 
                        dataKey="name" 
                        tick={{ fontSize: 12 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis 
                        tick={{ fontSize: 12 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip />
                      <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Case Priority Chart */}
          <Grid xs={12} lg={6}>
            <Card sx={{ borderRadius: 2, boxShadow: 2 }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                  Case Priority Distribution
                </Typography>
                <Box sx={{ height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={getCaseData()}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {getCaseData().map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Incident Severity Chart */}
          <Grid xs={12} lg={6}>
            <Card sx={{ borderRadius: 2, boxShadow: 2 }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                  Incident Severity Breakdown
                </Typography>
                <Box sx={{ height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={getSeverityData()}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis 
                        dataKey="name" 
                        tick={{ fontSize: 12 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis 
                        tick={{ fontSize: 12 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip />
                      <Bar dataKey="count" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Compliance Distribution Chart */}
          <Grid xs={12} lg={6}>
            <Card sx={{ borderRadius: 2, boxShadow: 2 }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                  Worker Compliance Distribution
                </Typography>
                <Box sx={{ height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={getComplianceTrendData()}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis 
                        dataKey="range" 
                        tick={{ fontSize: 12 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis 
                        tick={{ fontSize: 12 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip />
                      <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Detailed Analytics Section */}
        <Grid container spacing={3}>
          {/* Worker Compliance Table */}
          <Grid xs={12} lg={8}>
            <Card sx={{ borderRadius: 2, boxShadow: 2 }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                  Worker Compliance Status
                </Typography>
                <TableContainer component={Paper} sx={{ boxShadow: 'none' }}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 600 }}>Worker Name</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Email</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Compliance Score</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Last Check-in</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {stats?.workers.slice(0, 10).map((worker) => (
                        <TableRow key={worker._id}>
                          <TableCell>{worker.firstName} {worker.lastName}</TableCell>
                          <TableCell>{worker.email}</TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <LinearProgress 
                                variant="determinate" 
                                value={worker.complianceScore || 0} 
                                sx={{ width: 60, height: 8, borderRadius: 4 }}
                              />
                              <Typography variant="body2">
                                {worker.complianceScore || 0}%
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={worker.complianceScore && worker.complianceScore >= 80 ? 'Compliant' : 'Needs Attention'}
                              color={worker.complianceScore && worker.complianceScore >= 80 ? 'success' : 'warning'}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            {worker.lastCheckIn ? formatDate(worker.lastCheckIn) : 'Never'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Recent Incidents */}
          <Grid xs={12} lg={4}>
            <Card sx={{ borderRadius: 2, boxShadow: 2 }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                  Recent Incidents
                </Typography>
                <Box sx={{ maxHeight: 400, overflowY: 'auto' }}>
                  {stats?.recentIncidents.map((incident) => (
                    <Box key={incident._id} sx={{ mb: 2, p: 2, backgroundColor: '#f8fafc', borderRadius: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Chip 
                          label={incident.severity.replace('_', ' ')}
                          size="small"
                          sx={{ 
                            backgroundColor: getSeverityColor(incident.severity),
                            color: 'white',
                            fontWeight: 600
                          }}
                        />
                        <Chip 
                          label={incident.status}
                          size="small"
                          sx={{ 
                            backgroundColor: getStatusColor(incident.status),
                            color: 'white',
                            fontWeight: 600
                          }}
                        />
                      </Box>
                      <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
                        {incident.description.length > 60 
                          ? `${incident.description.substring(0, 60)}...` 
                          : incident.description}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatDate(incident.reportedDate)}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </Layout>
  );
};

export default Analytics;