import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  Button,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  CheckCircle,
  Warning,
  Error as ErrorIcon,
  TrendingUp,
  People,
  Send
} from '@mui/icons-material';
import api from '../../utils/api';
import Toast from '../../components/Toast';
import LayoutWithSidebar from '../../components/LayoutWithSidebar';

interface WorkReadinessData {
  compliance: {
    totalTeamMembers: number;
    submittedAssessments: number;
    complianceRate: number;
    nonCompliantCount: number;
  };
  assessments: Array<{
    _id: string;
    worker: {
      _id: string;
      firstName: string;
      lastName: string;
      email: string;
      team: string;
    };
    fatigueLevel: number;
    painDiscomfort: string;
    painAreas: string[];
    readinessLevel: string;
    mood: string;
    notes: string;
    submittedAt: string;
  }>;
  nonCompliantWorkers: Array<{
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    team: string;
  }>;
  readinessStats: {
    fit: number;
    minor: number;
    not_fit: number;
  };
  fatigueStats: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
}

// 🔧 Utility Functions
const getReadinessColor = (level: string) => {
  switch (level) {
    case 'fit': return '#10b981';
    case 'minor': return '#f59e0b';
    case 'not_fit': return '#ef4444';
    default: return '#6b7280';
  }
};

const getReadinessLabel = (level: string) => {
  switch (level) {
    case 'fit': return 'Fit for Work';
    case 'minor': return 'Minor Concerns';
    case 'not_fit': return 'Not Fit for Work';
    default: return level;
  }
};

const getMoodEmoji = (mood: string) => {
  switch (mood) {
    case 'excellent': return '😊';
    case 'good': return '😌';
    case 'okay': return '😐';
    case 'poor': return '😔';
    case 'terrible': return '😢';
    default: return '😐';
  }
};

// 🔧 Reusable StatCard Component
const StatCard = ({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: any; color: string }) => (
  <Card>
    <CardContent>
      <Box display="flex" alignItems="center" mb={1}>
        {icon}
        <Typography variant="h6" sx={{ ml: 1 }}>{label}</Typography>
      </Box>
      <Typography variant="h4" color={color}>
        {value}
      </Typography>
    </CardContent>
  </Card>
);

const WorkReadinessDashboard: React.FC = () => {
  const [data, setData] = useState<WorkReadinessData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [recentlySentFollowUps, setRecentlySentFollowUps] = useState<Set<string>>(new Set());

  // Follow-up State (merged)
  const [followUp, setFollowUp] = useState({
    open: false,
    worker: null as any,
    reason: '',
    message: '',
    sending: false,
  });

  useEffect(() => {
    fetchWorkReadinessData();
  }, []);

  const fetchWorkReadinessData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/work-readiness/team');
      setData(response.data.data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error fetching work readiness data');
    } finally {
      setLoading(false);
    }
  };

  const handleFollowUp = (worker: any) => {
    setFollowUp({
      open: true,
      worker,
      reason: '',
      message: `Hi ${worker.firstName}, please complete your work readiness assessment for today. This is required for team compliance.`,
      sending: false,
    });
  };

  const sendFollowUp = async () => {
    if (!followUp.worker) return;

    try {
      setFollowUp(prev => ({ ...prev, sending: true }));
      await api.post('/work-readiness/followup', {
        workerId: followUp.worker._id,
        reason: followUp.reason,
        message: followUp.message
      });

      setToast({
        message: `Follow-up sent successfully to ${followUp.worker.firstName} ${followUp.worker.lastName}!`,
        type: 'success'
      });

      setRecentlySentFollowUps(prev => {
        const newSet = new Set(prev);
        newSet.add(followUp.worker._id);
        return newSet;
      });

      setFollowUp({ open: false, worker: null, reason: '', message: '', sending: false });

      await fetchWorkReadinessData();

      setTimeout(() => {
        setRecentlySentFollowUps(prev => {
          const newSet = new Set(prev);
          newSet.delete(followUp.worker._id);
          return newSet;
        });
      }, 3000);
    } catch (err: any) {
      console.error('Error sending follow-up:', err);
      setToast({ message: 'Failed to send follow-up. Please try again.', type: 'error' });
    } finally {
      setFollowUp(prev => ({ ...prev, sending: false }));
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>;
  }

  if (!data) {
    return <Alert severity="info" sx={{ mb: 2 }}>No work readiness data available.</Alert>;
  }

  return (
    <LayoutWithSidebar>
      <Box>
        {/* Header */}
        <Box mb={3}>
          <Typography variant="h4" gutterBottom>Work Readiness Dashboard</Typography>
          <Typography variant="body1" color="text.secondary">
            Monitor your team's work readiness assessments and compliance
          </Typography>
        </Box>

        {/* Compliance Overview */}
        <Grid container spacing={3} mb={3}>
          <Grid item xs={12} md={3}>
            <StatCard icon={<People color="primary" />} label="Team Members" value={data.compliance.totalTeamMembers} color="primary" />
          </Grid>
          <Grid item xs={12} md={3}>
            <StatCard icon={<CheckCircle color="success" />} label="Completed" value={data.compliance.submittedAssessments} color="success.main" />
          </Grid>
          <Grid item xs={12} md={3}>
            <StatCard icon={<TrendingUp color="info" />} label="Compliance Rate" value={`${data.compliance.complianceRate}%`} color="info.main" />
          </Grid>
          <Grid item xs={12} md={3}>
            <StatCard icon={<Warning color="warning" />} label="Pending" value={data.compliance.nonCompliantCount} color="warning.main" />
          </Grid>
        </Grid>

        {/* Readiness Statistics */}
        <Grid container spacing={3} mb={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Work Readiness Status</Typography>
                <Box display="flex" flexDirection="column" gap={1}>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Box display="flex" alignItems="center">
                      <CheckCircle sx={{ color: '#10b981', mr: 1 }} />
                      <Typography>Fit for Work</Typography>
                    </Box>
                    <Chip label={data.readinessStats.fit} color="success" />
                  </Box>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Box display="flex" alignItems="center">
                      <Warning sx={{ color: '#f59e0b', mr: 1 }} />
                      <Typography>Minor Concerns</Typography>
                    </Box>
                    <Chip label={data.readinessStats.minor} color="warning" />
                  </Box>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Box display="flex" alignItems="center">
                      <ErrorIcon sx={{ color: '#ef4444', mr: 1 }} />
                      <Typography>Not Fit for Work</Typography>
                    </Box>
                    <Chip label={data.readinessStats.not_fit} color="error" />
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Fatigue Levels</Typography>
                <Box display="flex" flexDirection="column" gap={1}>
                  {Object.entries(data.fatigueStats).map(([level, count]) => (
                    <Box key={level} display="flex" justifyContent="space-between" alignItems="center">
                      <Typography>Level {level}</Typography>
                      <Chip label={count} variant="outlined" />
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Non-Compliant Workers */}
        {data.nonCompliantWorkers.length > 0 && (
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom color="warning.main">
                Non-Compliant Workers ({data.nonCompliantWorkers.length})
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={2}>
                Workers who haven't submitted their work readiness assessment today
              </Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>Email</TableCell>
                      <TableCell>Team</TableCell>
                      <TableCell>Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.nonCompliantWorkers.map((worker) => (
                      <TableRow key={worker._id}>
                        <TableCell>{worker.firstName} {worker.lastName}</TableCell>
                        <TableCell>{worker.email}</TableCell>
                        <TableCell>{worker.team}</TableCell>
                        <TableCell>
                          <Button
                            variant={recentlySentFollowUps.has(worker._id) ? "contained" : "outlined"}
                            size="small"
                            startIcon={recentlySentFollowUps.has(worker._id) ? <CheckCircle /> : <Send />}
                            onClick={() => handleFollowUp(worker)}
                            color={recentlySentFollowUps.has(worker._id) ? "success" : "primary"}
                            disabled={recentlySentFollowUps.has(worker._id)}
                          >
                            {recentlySentFollowUps.has(worker._id) ? 'Sent!' : 'Follow Up'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        )}

        {/* Submitted Assessments */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Today's Assessments ({data.assessments.length})
            </Typography>
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Worker</TableCell>
                    <TableCell>Team</TableCell>
                    <TableCell>Readiness</TableCell>
                    <TableCell>Fatigue</TableCell>
                    <TableCell>Mood</TableCell>
                    <TableCell>Pain</TableCell>
                    <TableCell>Submitted</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.assessments.map((assessment) => (
                    <TableRow key={assessment._id}>
                      <TableCell>{assessment.worker.firstName} {assessment.worker.lastName}</TableCell>
                      <TableCell>{assessment.worker.team}</TableCell>
                      <TableCell>
                        <Chip
                          label={getReadinessLabel(assessment.readinessLevel)}
                          sx={{ backgroundColor: getReadinessColor(assessment.readinessLevel), color: 'white' }}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>Level {assessment.fatigueLevel}</TableCell>
                      <TableCell>
                        <Box display="flex" alignItems="center">
                          <span style={{ marginRight: '4px' }}>{getMoodEmoji(assessment.mood)}</span>
                          <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                            {assessment.mood}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        {assessment.painDiscomfort === 'yes' ? (
                          <Chip label={`Yes (${assessment.painAreas.length} areas)`} color="warning" size="small" />
                        ) : (
                          <Chip label="No" color="success" size="small" />
                        )}
                      </TableCell>
                      <TableCell>{new Date(assessment.submittedAt).toLocaleTimeString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>

        {/* Follow Up Dialog */}
        <Dialog open={followUp.open} onClose={() => setFollowUp(prev => ({ ...prev, open: false }))} maxWidth="md" fullWidth>
          <DialogTitle>Follow Up with Worker</DialogTitle>
          <DialogContent>
            <Box mb={2}>
              <Typography variant="body1" gutterBottom>
                Send a follow-up message to <strong>{followUp.worker?.firstName} {followUp.worker?.lastName}</strong>
              </Typography>
            </Box>

            <FormControl fullWidth margin="normal">
              <InputLabel>Reason for Follow-up</InputLabel>
              <Select
                value={followUp.reason}
                onChange={(e) => setFollowUp(prev => ({ ...prev, reason: e.target.value }))}
                label="Reason for Follow-up"
              >
                <MenuItem value="not_on_shift">Not on shift</MenuItem>
                <MenuItem value="forgot">Forgot to submit</MenuItem>
                <MenuItem value="technical_issue">Technical issue</MenuItem>
                <MenuItem value="other">Other</MenuItem>
              </Select>
            </FormControl>

            <TextField
              fullWidth
              multiline
              rows={4}
              label="Message"
              value={followUp.message}
              onChange={(e) => setFollowUp(prev => ({ ...prev, message: e.target.value }))}
              margin="normal"
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setFollowUp(prev => ({ ...prev, open: false }))}>Cancel</Button>
            <Button
              onClick={sendFollowUp}
              variant="contained"
              disabled={followUp.sending || !followUp.message.trim()}
              startIcon={followUp.sending ? <CircularProgress size={20} /> : <Send />}
            >
              {followUp.sending ? 'Sending...' : 'Send Follow-up'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Toast */}
        {toast && (
          <Toast
            open={!!toast}
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
      </Box>
    </LayoutWithSidebar>
  );
};

export default WorkReadinessDashboard;

