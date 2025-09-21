import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  Avatar,
  Tooltip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  LinearProgress,
  Tabs,
  Tab,
} from '@mui/material';
// Timeline components removed - using alternative layout
import {
  Visibility,
  Download,
  Assessment,
  LocalHospital,
  Work,
  Report,
  Refresh,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  Warning,
  Schedule,
  Assignment,
  Person,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import Layout from '../../components/Layout';
import axios from 'axios';

interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  specialty?: string;
  isActive: boolean;
}

interface Case {
  _id: string;
  caseNumber: string;
  status: string;
  priority: string;
  worker: User;
  caseManager: User;
  clinician?: User;
  incident: {
    incidentNumber: string;
    incidentDate: string;
    description: string;
  };
  injuryDetails: {
    bodyPart: string;
    injuryType: string;
    severity: string;
    description: string;
  };
  workRestrictions: {
    lifting: {
      maxWeight: number;
    };
    standing: {
      maxDuration: number;
    };
    other: string;
  };
  expectedReturnDate?: string;
  createdAt: string;
  timeline: Array<{
    date: string;
    event: string;
    description: string;
    user: string;
    type: string;
  }>;
}

interface Report {
  _id: string;
  reportType: string;
  title: string;
  generatedDate: string;
  period: {
    start: string;
    end: string;
  };
  summary: {
    totalCases: number;
    activeCases: number;
    completedCases: number;
    avgDuration: number;
    complianceRate: number;
  };
  details: any;
}

interface DashboardStats {
  totalCases: number;
  activeCases: number;
  completedCases: number;
  avgCaseDuration: number;
  complianceRate: number;
  totalCosts: number;
  avgCostPerCase: number;
  returnToWorkRate: number;
}

const GPInsurerDashboard: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  
  // Data states
  const [cases, setCases] = useState<Case[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  
  // Dialog states
  const [caseDetailsDialog, setCaseDetailsDialog] = useState(false);
  const [reportDialog, setReportDialog] = useState(false);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [casesRes, reportsRes] = await Promise.all([
        axios.get('/cases'),
        axios.get('/reports')
      ]);

      setCases(casesRes.data.cases || []);
      setReports(reportsRes.data.reports || []);
      
      // Calculate stats
      const totalCases = casesRes.data.cases?.length || 0;
      const activeCases = casesRes.data.cases?.filter((c: Case) => 
        ['triaged', 'assessed', 'in_rehab'].includes(c.status)
      ).length || 0;
      const completedCases = casesRes.data.cases?.filter((c: Case) => 
        ['return_to_work', 'closed'].includes(c.status)
      ).length || 0;
      
      setStats({
        totalCases,
        activeCases,
        completedCases,
        avgCaseDuration: 45, // Mock data
        complianceRate: 92, // Mock data
        totalCosts: 125000, // Mock data
        avgCostPerCase: 2500, // Mock data
        returnToWorkRate: 85 // Mock data
      });
    } catch (err: any) {
      console.error('Error fetching data:', err);
      setError(err.response?.data?.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleViewCaseDetails = (caseItem: Case) => {
    setSelectedCase(caseItem);
    setCaseDetailsDialog(true);
  };

  const handleViewReport = (report: Report) => {
    setSelectedReport(report);
    setReportDialog(true);
  };

  const handleDownloadReport = (report: Report) => {
    // Mock download functionality
    alert(`Downloading report: ${report.title}`);
  };

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: any } = {
      'new': 'info',
      'triaged': 'warning',
      'assessed': 'primary',
      'in_rehab': 'secondary',
      'return_to_work': 'success',
      'closed': 'default',
    };
    return colors[status] || 'default';
  };

  const getPriorityColor = (priority: string) => {
    const colors: { [key: string]: any } = {
      'urgent': 'error',
      'high': 'warning',
      'medium': 'info',
      'low': 'success',
    };
    return colors[priority] || 'default';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  if (!user) {
    return (
      <Layout>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
          <Typography variant="h6" color="text.secondary">
            Please log in to access the dashboard
          </Typography>
        </Box>
      </Layout>
    );
  }

  if (loading) {
    return (
      <Layout>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  return (
    <Layout>
      <Box>
        <Typography variant="h4" component="h1" gutterBottom>
          GP/Insurer Dashboard
        </Typography>
        <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 3 }}>
          Welcome back, {user?.firstName}! Monitor case timelines, access reports, and review work restrictions.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Quick Stats */}
        <Box sx={{ display: 'flex', gap: 3, mb: 4, flexWrap: 'wrap' }}>
          <Card sx={{ minWidth: 200, flex: 1 }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Total Cases
                  </Typography>
                  <Typography variant="h4">
                    {stats?.totalCases || 0}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'primary.main' }}>
                  <Assignment />
                </Avatar>
              </Box>
            </CardContent>
          </Card>

          <Card sx={{ minWidth: 200, flex: 1 }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Active Cases
                  </Typography>
                  <Typography variant="h4">
                    {stats?.activeCases || 0}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'warning.main' }}>
                  <Assessment />
                </Avatar>
              </Box>
            </CardContent>
          </Card>

          <Card sx={{ minWidth: 200, flex: 1 }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Return to Work Rate
                  </Typography>
                  <Typography variant="h4">
                    {stats?.returnToWorkRate || 0}%
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'success.main' }}>
                  <CheckCircle />
                </Avatar>
              </Box>
            </CardContent>
          </Card>

          <Card sx={{ minWidth: 200, flex: 1 }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Total Costs
                  </Typography>
                  <Typography variant="h4">
                    {formatCurrency(stats?.totalCosts || 0)}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'info.main' }}>
                  <TrendingUp />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Box>

        {/* Main Content Tabs */}
        <Card>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
              <Tab label="Case Timeline" />
              <Tab label="Reports" />
              <Tab label="Work Restrictions" />
              <Tab label="Analytics" />
            </Tabs>
          </Box>

          <CardContent>
            {/* Case Timeline Tab */}
            {activeTab === 0 && (
              <Box>
                <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                  <Typography variant="h6">
                    Case Timeline Overview
                  </Typography>
                  <Button
                    variant="outlined"
                    startIcon={<Refresh />}
                    onClick={fetchData}
                    size="small"
                  >
                    Refresh
                  </Button>
                </Box>

                {cases.length > 0 ? (
                  <TableContainer component={Paper} variant="outlined">
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Case #</TableCell>
                          <TableCell>Worker</TableCell>
                          <TableCell>Injury</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell>Priority</TableCell>
                          <TableCell>Duration</TableCell>
                          <TableCell>Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {cases.map((caseItem) => (
                          <TableRow key={caseItem._id}>
                            <TableCell>{caseItem.caseNumber}</TableCell>
                            <TableCell>
                              <Box display="flex" alignItems="center" gap={1}>
                                <Avatar sx={{ width: 32, height: 32, fontSize: '0.875rem' }}>
                                  {caseItem.worker.firstName.charAt(0)}{caseItem.worker.lastName.charAt(0)}
                                </Avatar>
                                <Box>
                                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                    {caseItem.worker.firstName} {caseItem.worker.lastName}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {caseItem.worker.email}
                                  </Typography>
                                </Box>
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">
                                {caseItem.injuryDetails.bodyPart}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {caseItem.injuryDetails.injuryType}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={caseItem.status.replace('_', ' ')}
                                color={getStatusColor(caseItem.status)}
                                size="small"
                              />
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={caseItem.priority}
                                color={getPriorityColor(caseItem.priority)}
                                size="small"
                                variant="outlined"
                              />
                            </TableCell>
                            <TableCell>
                              {Math.ceil((new Date().getTime() - new Date(caseItem.createdAt).getTime()) / (1000 * 60 * 60 * 24))} days
                            </TableCell>
                            <TableCell>
                              <Tooltip title="View Timeline">
                                <IconButton 
                                  size="small"
                                  onClick={() => handleViewCaseDetails(caseItem)}
                                >
                                  <Visibility />
                                </IconButton>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Box textAlign="center" py={3}>
                    <Typography color="text.secondary">
                      No cases found
                    </Typography>
                  </Box>
                )}
              </Box>
            )}

            {/* Reports Tab */}
            {activeTab === 1 && (
              <Box>
                <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                  <Typography variant="h6">
                    Available Reports
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<Report />}
                    onClick={() => alert('Generate new report functionality would be implemented here')}
                  >
                    Generate Report
                  </Button>
                </Box>

                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                  {reports.length > 0 ? (
                    reports.map((report) => (
                      <Box key={report._id} sx={{ width: { xs: '100%', md: '50%' }, p: 1 }}>
                        <Card>
                          <CardContent>
                            <Box display="flex" justifyContent="space-between" alignItems="start" sx={{ mb: 2 }}>
                              <Box>
                                <Typography variant="h6" gutterBottom>
                                  {report.title}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  {report.reportType} Report
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  Generated: {formatDate(report.generatedDate)}
                                </Typography>
                              </Box>
                              <Chip
                                label={report.reportType}
                                color="primary"
                                size="small"
                              />
                            </Box>
                            
                            <Typography variant="body2" sx={{ mb: 2 }}>
                              Period: {formatDate(report.period.start)} - {formatDate(report.period.end)}
                            </Typography>
                            
                            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                              <Box>
                                <Typography variant="caption" color="text.secondary">Total Cases</Typography>
                                <Typography variant="h6">{report.summary.totalCases}</Typography>
                              </Box>
                              <Box>
                                <Typography variant="caption" color="text.secondary">Active Cases</Typography>
                                <Typography variant="h6">{report.summary.activeCases}</Typography>
                              </Box>
                              <Box>
                                <Typography variant="caption" color="text.secondary">Avg Duration</Typography>
                                <Typography variant="h6">{report.summary.avgDuration} days</Typography>
                              </Box>
                            </Box>
                            
                            <Box display="flex" gap={1}>
                              <Button
                                variant="outlined"
                                size="small"
                                startIcon={<Visibility />}
                                onClick={() => handleViewReport(report)}
                              >
                                View
                              </Button>
                              <Button
                                variant="outlined"
                                size="small"
                                startIcon={<Download />}
                                onClick={() => handleDownloadReport(report)}
                              >
                                Download
                              </Button>
                            </Box>
                          </CardContent>
                        </Card>
                      </Box>
                    ))
                  ) : (
                    <Box sx={{ width: '100%', p: 1 }}>
                      <Box textAlign="center" py={3}>
                        <Typography color="text.secondary">
                          No reports available
                        </Typography>
                      </Box>
                    </Box>
                  )}
                </Box>
              </Box>
            )}

            {/* Work Restrictions Tab */}
            {activeTab === 2 && (
              <Box>
                <Typography variant="h6" gutterBottom>
                  Current Work Restrictions
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Review active work limitations and restrictions for all cases
                </Typography>

                {cases.filter(c => ['triaged', 'assessed', 'in_rehab'].includes(c.status)).length > 0 ? (
                  <TableContainer component={Paper} variant="outlined">
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Case #</TableCell>
                          <TableCell>Worker</TableCell>
                          <TableCell>Injury</TableCell>
                          <TableCell>Lifting Restrictions</TableCell>
                          <TableCell>Standing Restrictions</TableCell>
                          <TableCell>Other Restrictions</TableCell>
                          <TableCell>Expected Return</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {cases
                          .filter(c => ['triaged', 'assessed', 'in_rehab'].includes(c.status))
                          .map((caseItem) => (
                          <TableRow key={caseItem._id}>
                            <TableCell>{caseItem.caseNumber}</TableCell>
                            <TableCell>
                              <Box display="flex" alignItems="center" gap={1}>
                                <Avatar sx={{ width: 32, height: 32, fontSize: '0.875rem' }}>
                                  {caseItem.worker.firstName.charAt(0)}{caseItem.worker.lastName.charAt(0)}
                                </Avatar>
                                <Box>
                                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                    {caseItem.worker.firstName} {caseItem.worker.lastName}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {caseItem.worker.email}
                                  </Typography>
                                </Box>
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">
                                {caseItem.injuryDetails.bodyPart}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {caseItem.injuryDetails.injuryType}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              {caseItem.workRestrictions.lifting.maxWeight > 0 ? (
                                <Typography variant="body2">
                                  Max {caseItem.workRestrictions.lifting.maxWeight}kg
                                </Typography>
                              ) : (
                                <Typography variant="body2" color="error">
                                  No lifting
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell>
                              {caseItem.workRestrictions.standing.maxDuration > 0 ? (
                                <Typography variant="body2">
                                  Max {caseItem.workRestrictions.standing.maxDuration} min
                                </Typography>
                              ) : (
                                <Typography variant="body2" color="error">
                                  No standing
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">
                                {caseItem.workRestrictions.other || 'None'}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              {caseItem.expectedReturnDate ? formatDate(caseItem.expectedReturnDate) : 'TBD'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Box textAlign="center" py={3}>
                    <Typography color="text.secondary">
                      No active cases with restrictions
                    </Typography>
                  </Box>
                )}
              </Box>
            )}

            {/* Analytics Tab */}
            {activeTab === 3 && (
              <Box>
                <Typography variant="h6" gutterBottom>
                  Analytics & Insights
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Key performance indicators and trends
                </Typography>

                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                  <Box sx={{ width: { xs: '100%', md: '50%' }, p: 1 }}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          Case Duration Analysis
                        </Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <Box>
                            <Box display="flex" justifyContent="space-between" sx={{ mb: 1 }}>
                              <Typography variant="body2">Average Duration</Typography>
                              <Typography variant="caption">{stats?.avgCaseDuration || 0} days</Typography>
                            </Box>
                            <LinearProgress
                              variant="determinate"
                              value={75}
                              color="primary"
                            />
                          </Box>
                          <Box>
                            <Box display="flex" justifyContent="space-between" sx={{ mb: 1 }}>
                              <Typography variant="body2">Return to Work Rate</Typography>
                              <Typography variant="caption">{stats?.returnToWorkRate || 0}%</Typography>
                            </Box>
                            <LinearProgress
                              variant="determinate"
                              value={stats?.returnToWorkRate || 0}
                              color="success"
                            />
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  </Box>

                  <Box sx={{ width: { xs: '100%', md: '50%' }, p: 1 }}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          Cost Analysis
                        </Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <Box display="flex" justifyContent="space-between" alignItems="center">
                            <Typography variant="body2">Total Costs</Typography>
                            <Typography variant="h6" color="info.main">
                              {formatCurrency(stats?.totalCosts || 0)}
                            </Typography>
                          </Box>
                          <Box display="flex" justifyContent="space-between" alignItems="center">
                            <Typography variant="body2">Average Cost per Case</Typography>
                            <Typography variant="h6" color="warning.main">
                              {formatCurrency(stats?.avgCostPerCase || 0)}
                            </Typography>
                          </Box>
                          <Box display="flex" justifyContent="space-between" alignItems="center">
                            <Typography variant="body2">Compliance Rate</Typography>
                            <Typography variant="h6" color="success.main">
                              {stats?.complianceRate || 0}%
                            </Typography>
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  </Box>
                </Box>
              </Box>
            )}
          </CardContent>
        </Card>

        {/* Case Details Dialog */}
        <Dialog open={caseDetailsDialog} onClose={() => setCaseDetailsDialog(false)} maxWidth="md" fullWidth>
          <DialogTitle>
            Case Timeline: {selectedCase?.caseNumber}
          </DialogTitle>
          <DialogContent>
            {selectedCase && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Case Information
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">Worker</Typography>
                    <Typography variant="body1">
                      {selectedCase.worker.firstName} {selectedCase.worker.lastName}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">Injury</Typography>
                    <Typography variant="body1">
                      {selectedCase.injuryDetails.bodyPart} - {selectedCase.injuryDetails.injuryType}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">Status</Typography>
                    <Chip
                      label={selectedCase.status.replace('_', ' ')}
                      color={getStatusColor(selectedCase.status)}
                      size="small"
                    />
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">Priority</Typography>
                    <Chip
                      label={selectedCase.priority}
                      color={getPriorityColor(selectedCase.priority)}
                      size="small"
                      variant="outlined"
                    />
                  </Box>
                </Box>

                <Typography variant="h6" gutterBottom>
                  Timeline
                </Typography>
                <Box>
                  {selectedCase.timeline?.map((event, index) => (
                    <Box key={index} sx={{ mb: 2, display: 'flex', alignItems: 'flex-start' }}>
                      <Box sx={{ 
                        width: 12, 
                        height: 12, 
                        borderRadius: '50%', 
                        bgcolor: event.type === 'milestone' ? 'primary.main' : 'grey.400',
                        mt: 1,
                        mr: 2,
                        flexShrink: 0
                      }} />
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle2">{event.event}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {event.description}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatDate(event.date)} - By: {event.user}
                        </Typography>
                      </Box>
                      {index < selectedCase.timeline.length - 1 && (
                        <Box sx={{ 
                          width: 1, 
                          height: 20, 
                          bgcolor: 'grey.300', 
                          ml: 1.5,
                          mt: 1
                        }} />
                      )}
                    </Box>
                  ))}
                </Box>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCaseDetailsDialog(false)}>Close</Button>
          </DialogActions>
        </Dialog>

        {/* Report Dialog */}
        <Dialog open={reportDialog} onClose={() => setReportDialog(false)} maxWidth="lg" fullWidth>
          <DialogTitle>
            Report: {selectedReport?.title}
          </DialogTitle>
          <DialogContent>
            {selectedReport && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Report Summary
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">Period</Typography>
                    <Typography variant="body1">
                      {formatDate(selectedReport.period.start)} - {formatDate(selectedReport.period.end)}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">Total Cases</Typography>
                    <Typography variant="body1">{selectedReport.summary.totalCases}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">Active Cases</Typography>
                    <Typography variant="body1">{selectedReport.summary.activeCases}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">Completed Cases</Typography>
                    <Typography variant="body1">{selectedReport.summary.completedCases}</Typography>
                  </Box>
                </Box>

                <Typography variant="h6" gutterBottom>
                  Key Metrics
                </Typography>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Box sx={{ flex: 1 }}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="h4" color="primary.main">
                          {selectedReport.summary.avgDuration}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Average Duration (days)
                        </Typography>
                      </CardContent>
                    </Card>
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="h4" color="success.main">
                          {selectedReport.summary.complianceRate}%
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Compliance Rate
                        </Typography>
                      </CardContent>
                    </Card>
                  </Box>
                </Box>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setReportDialog(false)}>Close</Button>
            <Button 
              variant="contained" 
              startIcon={<Download />}
              onClick={() => selectedReport && handleDownloadReport(selectedReport)}
            >
              Download Report
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  );
};

export default GPInsurerDashboard;
