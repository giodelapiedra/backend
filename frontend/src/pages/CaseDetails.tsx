import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Alert,
  CircularProgress,
  Button,
  Chip,
  Grid,
  Avatar,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import {
  ArrowBack,
  Assignment,
  Person,
  CalendarToday,
  LocalHospital,
  Work,
  Warning,
  CheckCircle,
  Info,
  TrendingUp,
  TrendingDown,
} from '@mui/icons-material';
import Layout from '../components/Layout';
import api from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { createImageProps } from '../utils/imageUtils';

interface Case {
  _id: string;
  caseNumber: string;
  status: string;
  priority: string;
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
  createdAt: string;
  incident: {
    incidentNumber: string;
    incidentDate: string;
    description: string;
    severity: string;
    incidentType: string;
    photos?: Array<{
      url: string;
      caption: string;
      uploadedAt: string;
    }>;
  };
  caseManager: {
    firstName: string;
    lastName: string;
    email: string;
  };
  clinician?: {
    firstName: string;
    lastName: string;
    email: string;
  };
  worker: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  notes?: Array<{
    author: {
      _id: string;
      firstName: string;
      lastName: string;
    };
    content: string;
    timestamp: string;
    type?: string;
  }>;
  lastCheckIn?: {
    _id: string;
    checkInDate: string;
    painLevel: {
      current: number;
    };
    workStatus: {
      workedToday: boolean;
    };
    functionalStatus: {
      sleep: number;
      mood: number;
    };
  };
}

const CaseDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchCaseDetails();
    }
  }, [id]);

  const fetchCaseDetails = async () => {
    try {
      setLoading(true);
      console.log('Fetching case details for ID:', id);
      
      const response = await api.get(`/cases/${id}`);
      console.log('Case details response:', response.data);
      
      setCaseData(response.data.case);
    } catch (err: any) {
      console.error('Error fetching case details:', err);
      setError(err.response?.data?.message || 'Failed to fetch case details');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: any } = {
      'new': 'info',
      'triaged': 'warning',
      'assessed': 'primary',
      'in_rehab': 'secondary',
      'return_to_work': 'success',
      'closed': 'default'
    };
    return colors[status] || 'default';
  };

  const getPriorityColor = (priority: string) => {
    const colors: { [key: string]: any } = {
      'low': 'success',
      'medium': 'warning',
      'high': 'error',
      'urgent': 'error'
    };
    return colors[priority] || 'default';
  };

  const getPainLevelColor = (level: number) => {
    if (level >= 7) return '#dc2626'; // Red
    if (level >= 4) return '#f59e0b'; // Yellow
    return '#22c55e'; // Green
  };

  if (loading) {
    return (
      <Layout>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <Box sx={{ p: 3 }}>
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
          <Button
            variant="outlined"
            startIcon={<ArrowBack />}
            onClick={() => navigate('/cases')}
          >
            Back to Cases
          </Button>
        </Box>
      </Layout>
    );
  }

  if (!caseData) {
    return (
      <Layout>
        <Box sx={{ p: 3 }}>
          <Alert severity="warning" sx={{ mb: 3 }}>
            Case not found
          </Alert>
          <Button
            variant="outlined"
            startIcon={<ArrowBack />}
            onClick={() => navigate('/cases')}
          >
            Back to Cases
          </Button>
        </Box>
      </Layout>
    );
  }

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Button
            variant="outlined"
            startIcon={<ArrowBack />}
            onClick={() => navigate('/cases')}
            sx={{ mb: 2 }}
          >
            Back to Cases
          </Button>
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 600, color: '#1f2937' }}>
            Case Details: {caseData.caseNumber}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Detailed information about this case and worker progress
          </Typography>
        </Box>

        {/* Case Status Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Avatar sx={{ bgcolor: '#3b82f6', mr: 2 }}>
                    <Assignment />
                  </Avatar>
                  <Box>
                    <Typography variant="h6">{caseData.caseNumber}</Typography>
                    <Typography variant="body2" color="text.secondary">Case Number</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Avatar sx={{ bgcolor: '#10b981', mr: 2 }}>
                    <CheckCircle />
                  </Avatar>
                  <Box>
                    <Chip 
                      label={caseData.status?.replace('_', ' ').toUpperCase() || 'UNKNOWN'}
                      color={getStatusColor(caseData.status)}
                      size="small"
                    />
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Status</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Avatar sx={{ bgcolor: '#f59e0b', mr: 2 }}>
                    <Warning />
                  </Avatar>
                  <Box>
                    <Chip 
                      label={caseData.priority?.toUpperCase() || 'UNKNOWN'}
                      color={getPriorityColor(caseData.priority)}
                      size="small"
                    />
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Priority</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Avatar sx={{ bgcolor: '#8b5cf6', mr: 2 }}>
                    <CalendarToday />
                  </Avatar>
                  <Box>
                    <Typography variant="h6">
                      {caseData.createdAt ? new Date(caseData.createdAt).toLocaleDateString() : 'N/A'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">Created</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Grid container spacing={3}>
          {/* Worker Information */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                  <Person sx={{ mr: 1 }} />
                  Worker Information
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Avatar sx={{ mr: 2, bgcolor: '#3b82f6' }}>
                    {caseData.worker.firstName[0]}{caseData.worker.lastName[0]}
                  </Avatar>
                  <Box>
                    <Typography variant="h6">
                      {caseData.worker.firstName} {caseData.worker.lastName}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {caseData.worker.email}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {caseData.worker.phone}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Case Team */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                  <LocalHospital sx={{ mr: 1 }} />
                  Case Team
                </Typography>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary">Case Manager</Typography>
                  <Typography variant="body1">
                    {caseData.caseManager.firstName} {caseData.caseManager.lastName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {caseData.caseManager.email}
                  </Typography>
                </Box>
                {caseData.clinician && (
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">Clinician</Typography>
                    <Typography variant="body1">
                      {caseData.clinician.firstName} {caseData.clinician.lastName}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {caseData.clinician.email}
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Incident Information */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                  <Assignment sx={{ mr: 1 }} />
                  Incident Information
                </Typography>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" color="text.secondary">Incident Number</Typography>
                      <Typography variant="body1">{caseData.incident.incidentNumber}</Typography>
                    </Box>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" color="text.secondary">Incident Date</Typography>
                      <Typography variant="body1">
                        {new Date(caseData.incident.incidentDate).toLocaleDateString()}
                      </Typography>
                    </Box>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" color="text.secondary">Incident Type</Typography>
                      <Typography variant="body1">{caseData.incident.incidentType}</Typography>
                    </Box>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" color="text.secondary">Severity</Typography>
                      <Chip 
                        label={caseData.incident.severity?.replace('_', ' ').toUpperCase() || 'UNKNOWN'}
                        color={getPriorityColor(caseData.incident.severity)}
                        size="small"
                      />
                    </Box>
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">Description</Typography>
                      <Typography variant="body1">{caseData.incident.description}</Typography>
                    </Box>
                  </Grid>
                  
                  {/* Incident Photos */}
                  {caseData.incident.photos && caseData.incident.photos.length > 0 && (
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
                        Incident Photos ({caseData.incident.photos.length})
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                        {caseData.incident.photos.map((photo, index) => (
                          <Box key={index} sx={{ position: 'relative' }}>
                            <img
                              {...createImageProps(photo.url)}
                              alt={photo.caption || `Incident photo ${index + 1}`}
                              style={{
                                width: 150,
                                height: 150,
                                objectFit: 'cover',
                                borderRadius: 8,
                                border: '2px solid #e2e8f0',
                                cursor: 'pointer'
                              }}
                              onClick={() => window.open(createImageProps(photo.url).src, '_blank')}
                            />
                            {photo.caption && (
                              <Typography variant="caption" sx={{ 
                                display: 'block', 
                                mt: 0.5, 
                                textAlign: 'center',
                                color: 'text.secondary',
                                fontSize: '0.7rem',
                                maxWidth: 150
                              }}>
                                {photo.caption}
                              </Typography>
                            )}
                          </Box>
                        ))}
                      </Box>
                    </Grid>
                  )}
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Injury Details */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                  <Warning sx={{ mr: 1 }} />
                  Injury Details
                </Typography>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary">Body Part</Typography>
                  <Typography variant="body1">{caseData.injuryDetails.bodyPart}</Typography>
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary">Injury Type</Typography>
                  <Typography variant="body1">{caseData.injuryDetails.injuryType}</Typography>
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary">Severity</Typography>
                  <Typography variant="body1">{caseData.injuryDetails.severity}</Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">Description</Typography>
                  <Typography variant="body1">{caseData.injuryDetails.description}</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Work Restrictions */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                  <Work sx={{ mr: 1 }} />
                  Work Restrictions
                </Typography>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary">Lifting Limit</Typography>
                  <Typography variant="body1">{caseData.workRestrictions.lifting.maxWeight} kg</Typography>
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary">Standing Duration</Typography>
                  <Typography variant="body1">{caseData.workRestrictions.standing.maxDuration} minutes</Typography>
                </Box>
                {caseData.workRestrictions.other && (
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">Other Restrictions</Typography>
                    <Typography variant="body1">{caseData.workRestrictions.other}</Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Latest Check-in */}
          {caseData.lastCheckIn && (
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                    <TrendingUp sx={{ mr: 1 }} />
                    Latest Check-in
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={3}>
                      <Typography variant="subtitle2" color="text.secondary">Pain Level</Typography>
                      <Typography 
                        variant="h4" 
                        sx={{ 
                          color: getPainLevelColor(caseData.lastCheckIn.painLevel.current),
                          fontWeight: 600
                        }}
                      >
                        {caseData.lastCheckIn.painLevel.current}/10
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={3}>
                      <Typography variant="subtitle2" color="text.secondary">Work Status</Typography>
                      <Chip 
                        label={caseData.lastCheckIn.workStatus.workedToday ? 'Working' : 'Not Working'}
                        color={caseData.lastCheckIn.workStatus.workedToday ? 'success' : 'error'}
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={12} sm={3}>
                      <Typography variant="subtitle2" color="text.secondary">Sleep Quality</Typography>
                      <Typography variant="h6">
                        {caseData.lastCheckIn.functionalStatus.sleep >= 7 ? 'Good' : 
                         caseData.lastCheckIn.functionalStatus.sleep >= 4 ? 'Fair' : 'Poor'}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={3}>
                      <Typography variant="subtitle2" color="text.secondary">Last Updated</Typography>
                      <Typography variant="body1">
                        {new Date(caseData.lastCheckIn.checkInDate).toLocaleString()}
                      </Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* Case Notes */}
          {caseData.notes && caseData.notes.length > 0 && (
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Case Notes</Typography>
                  <List>
                    {caseData.notes.map((note, index) => (
                      <ListItem key={index} divider={index < caseData.notes!.length - 1}>
                        <Box sx={{ width: '100%' }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                            <Typography variant="subtitle2">
                              {note.author.firstName} {note.author.lastName}
                              {note.type && (
                                <Chip 
                                  size="small" 
                                  label={note.type === 'case_manager_note' ? 'Case Manager' : 
                                         note.type === 'assignment' ? 'Assignment' : 
                                         note.type}
                                  color={note.type === 'case_manager_note' ? 'primary' : 
                                         note.type === 'assignment' ? 'secondary' : 
                                         'default'}
                                  sx={{ ml: 1 }} 
                                />
                              )}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {new Date(note.timestamp).toLocaleString()}
                            </Typography>
                          </Box>
                          <Typography variant="body2">{note.content}</Typography>
                        </Box>
                      </ListItem>
                    ))}
                  </List>
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>
      </Box>
    </Layout>
  );
};

export default CaseDetails;