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
  Dialog,
  DialogContent,
  DialogTitle,
  TextField,
  InputAdornment,
  Alert,
  CircularProgress,
  Avatar,
  Grid,
  Badge,
  Pagination,
} from '@mui/material';
import {
  Search,
  Person,
  Group,
  Warning,
  Assignment,
  Visibility,
  Schedule,
  CheckCircle,
} from '@mui/icons-material';
import LayoutWithSidebar from '../../components/LayoutWithSidebar';
import api from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';

interface TeamMember {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  team: string;
  package: string;
  lastLogin: string;
  hasLoggedInToday: boolean;
  lastLoginToday?: string;
}

interface TeamLeader {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  team: string;
  managedTeams: string[];
  defaultTeam: string;
  lastLogin: string;
  hasLoggedInToday: boolean;
  lastLoginToday?: string;
  teamMembers: TeamMember[];
  teamStats: {
    totalMembers: number;
    activeMembers: number;
    onlineToday: number;
    onlineRate: number;
    activeCases: number;
    recentIncidents: number;
  };
  recentIncidents: any[];
  activeCases: any[];
}

interface SupervisorData {
  overall: {
    totalTeamLeaders: number;
    totalWorkers: number;
    onlineTeamLeaders: number;
    onlineWorkers: number;
    totalActiveCases: number;
    totalRecentIncidents: number;
  };
  teamLeaders: TeamLeader[];
  lastUpdated: string;
}

const TeamLeaderMonitoring: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<SupervisorData | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTeamLeader, setSelectedTeamLeader] = useState<TeamLeader | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [teamsPerPage] = useState(5);
  const [membersCurrentPage, setMembersCurrentPage] = useState(1);
  const [membersPerPage] = useState(10);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/team-leader/supervisor-overview');
      console.log('Team Leader Monitoring data:', response.data);
      setData(response.data);
    } catch (err: any) {
      console.error('Error fetching team leader data:', err);
      setError(err.response?.data?.message || 'Failed to fetch team leader data');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (hasLoggedIn: boolean) => {
    return hasLoggedIn ? 'success' : 'default';
  };

  const getStatusIcon = (hasLoggedIn: boolean) => {
    return hasLoggedIn ? <CheckCircle fontSize="small" /> : <Schedule fontSize="small" />;
  };


  const formatTimeAgo = (lastLogin?: string) => {
    if (!lastLogin) return 'Never logged in';
    const now = new Date();
    const loginTime = new Date(lastLogin);
    const diffMs = now.getTime() - loginTime.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (diffHours > 24) {
      return `${Math.floor(diffHours / 24)} days ago`;
    } else if (diffHours > 0) {
      return `${diffHours}h ${diffMinutes}m ago`;
    } else {
      return `${diffMinutes}m ago`;
    }
  };

  const filteredTeamLeaders = data?.teamLeaders.filter(leader =>
    leader.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    leader.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    leader.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    leader.team.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  // Pagination logic
  const totalPages = Math.ceil(filteredTeamLeaders.length / teamsPerPage);
  const startIndex = (currentPage - 1) * teamsPerPage;
  const endIndex = startIndex + teamsPerPage;
  const paginatedTeamLeaders = filteredTeamLeaders.slice(startIndex, endIndex);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const handleViewDetails = (teamLeader: TeamLeader) => {
    setSelectedTeamLeader(teamLeader);
    setMembersCurrentPage(1); // Reset to first page when opening new team details
    setDetailsDialogOpen(true);
  };

  const formatLastLogin = (lastLogin?: string) => {
    if (!lastLogin) return 'Never';
    const date = new Date(lastLogin);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  if (!user) {
    return (
      <LayoutWithSidebar>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
          <Typography variant="h6" color="text.secondary">
            Please log in to access the monitoring dashboard
          </Typography>
        </Box>
      </LayoutWithSidebar>
    );
  }

  if (loading) {
    return (
      <LayoutWithSidebar>
        <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" minHeight="50vh">
          <CircularProgress size={60} />
          <Typography variant="h6" sx={{ mt: 2, color: 'text.secondary' }}>
            Loading Team Leader Monitoring...
          </Typography>
          <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
            Fetching team leaders and member data
          </Typography>
        </Box>
      </LayoutWithSidebar>
    );
  }

  return (
    <LayoutWithSidebar>
      <Box sx={{ p: 3 }}>
          {/* Enhanced Header */}
          <Box sx={{ 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: 3,
            p: 4,
            mb: 4,
            color: 'white',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <Box sx={{ position: 'relative', zIndex: 2 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                  <Box display="flex" alignItems="center" gap={2} sx={{ mb: 1 }}>
                    <Group sx={{ fontSize: 32 }} />
                    <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
                      Team Leader Monitoring
                    </Typography>
                  </Box>
                  <Typography variant="h6" sx={{ opacity: 0.9, fontWeight: 300 }}>
                    Comprehensive oversight of team leaders and their members
                  </Typography>
                  <Chip 
                    label={`${data?.overall.totalTeamLeaders || 0} Teams • ${data?.overall.totalWorkers || 0} Workers`}
                    sx={{ 
                      mt: 2, 
                      backgroundColor: 'rgba(255,255,255,0.2)', 
                      color: 'white',
                      fontWeight: 500
                    }} 
                  />
                </Box>
              </Box>
            </Box>
            {/* Decorative background elements */}
            <Box sx={{
              position: 'absolute',
              top: -50,
              right: -50,
              width: 150,
              height: 150,
              borderRadius: '50%',
              backgroundColor: 'rgba(255,255,255,0.1)',
              zIndex: 1
            }} />
            <Box sx={{
              position: 'absolute',
              bottom: -30,
              left: -30,
              width: 100,
              height: 100,
              borderRadius: '50%',
              backgroundColor: 'rgba(255,255,255,0.05)',
              zIndex: 1
            }} />
          </Box>

          {/* Error Alert */}
          {error && (
            <Alert 
              severity="error" 
              sx={{ mb: 3 }}
              onClose={() => setError(null)}
              action={
                <Button color="inherit" size="small" onClick={fetchData}>
                  Retry
                </Button>
              }
            >
              {error}
            </Alert>
          )}

          {/* Enhanced Statistics Overview */}
          {data && (
            <Box sx={{ mb: 5 }}>
              <Typography variant="h5" sx={{ mb: 3, fontWeight: 600 }}>
                Overview Dashboard
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6} md={3}>
                  <Card sx={{ 
                    borderRadius: 3,
                    overflow: 'hidden',
                    height: 140,
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    position: 'relative'
                  }}>
                    <CardContent sx={{ position: 'relative', zIndex: 2 }}>
                      <Box display="flex" alignItems="center" justifyContent="space-between">
                        <Box>
                          <Typography sx={{ opacity: 0.9, fontSize: '0.875rem', fontWeight: 500 }}>
                            Team Leaders
                          </Typography>
                          <Typography variant="h3" sx={{ fontWeight: 700, my: 1 }}>
                            {data.overall.totalTeamLeaders}
                          </Typography>
                          <Typography sx={{ opacity: 0.8, fontSize: '0.75rem' }}>
                            {data.overall.onlineTeamLeaders} online today
                          </Typography>
                        </Box>
                        <Avatar sx={{ 
                          bgcolor: 'rgba(255,255,255,0.2)', 
                          width: 56, 
                          height: 56,
                          backdropFilter: 'blur(10px)'
                        }}>
                          <Person sx={{ fontSize: 28 }} />
                        </Avatar>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <Card sx={{ 
                    borderRadius: 3,
                    overflow: 'hidden',
                    height: 140,
                    background: 'linear-gradient(135deg, #56ab2f 0%, #a8e6cf 100%)',
                    color: 'white',
                    position: 'relative'
                  }}>
                    <CardContent sx={{ position: 'relative', zIndex: 2 }}>
                      <Box display="flex" alignItems="center" justifyContent="space-between">
                        <Box>
                          <Typography sx={{ opacity: 0.9, fontSize: '0.875rem', fontWeight: 500 }}>
                            Total Workers
                          </Typography>
                          <Typography variant="h3" sx={{ fontWeight: 700, my: 1 }}>
                            {data.overall.totalWorkers}
                          </Typography>
                          <Typography sx={{ opacity: 0.8, fontSize: '0.75rem' }}>
                            {data.overall.onlineWorkers} online today
                          </Typography>
                        </Box>
                        <Avatar sx={{ 
                          bgcolor: 'rgba(255,255,255,0.2)', 
                          width: 56, 
                          height: 56,
                          backdropFilter: 'blur(10px)'
                        }}>
                          <Group sx={{ fontSize: 28 }} />
                        </Avatar>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <Card sx={{ 
                    borderRadius: 3,
                    overflow: 'hidden',
                    height: 140,
                    background: 'linear-gradient(135deg, #ff9500 0%, #ffed4e 100%)',
                    color: 'white',
                    position: 'relative'
                  }}>
                    <CardContent sx={{ position: 'relative', zIndex: 2 }}>
                      <Box display="flex" alignItems="center" justifyContent="space-between">
                        <Box>
                          <Typography sx={{ opacity: 0.9, fontSize: '0.875rem', fontWeight: 500 }}>
                            Active Cases
                          </Typography>
                          <Typography variant="h3" sx={{ fontWeight: 700, my: 1 }}>
                            {data.overall.totalActiveCases}
                          </Typography>
                          <Typography sx={{ opacity: 0.8, fontSize: '0.75rem' }}>
                            Requiring attention
                          </Typography>
                        </Box>
                        <Avatar sx={{ 
                          bgcolor: 'rgba(255,255,255,0.2)', 
                          width: 56, 
                          height: 56,
                          backdropFilter: 'blur(10px)'
                        }}>
                          <Assignment sx={{ fontSize: 28 }} />
                        </Avatar>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <Card sx={{ 
                    borderRadius: 3,
                    overflow: 'hidden',
                    height: 140,
                    background: 'linear-gradient(135deg, #ff416c 0%, #ff4b2b 100%)',
                    color: 'white',
                    position: 'relative'
                  }}>
                    <CardContent sx={{ position: 'relative', zIndex: 2 }}>
                      <Box display="flex" alignItems="center" justifyContent="space-between">
                        <Box>
                          <Typography sx={{ opacity: 0.9, fontSize: '0.875rem', fontWeight: 500 }}>
                            Recent Incidents
                          </Typography>
                          <Typography variant="h3" sx={{ fontWeight: 700, my: 1 }}>
                            {data.overall.totalRecentIncidents}
                          </Typography>
                          <Typography sx={{ opacity: 0.8, fontSize: '0.75rem' }}>
                            Last 7 days
                          </Typography>
                        </Box>
                        <Avatar sx={{ 
                          bgcolor: 'rgba(255,255,255,0.2)', 
                          width: 56, 
                          height: 56,
                          backdropFilter: 'blur(10px)'
                        }}>
                          <Warning sx={{ fontSize: 28 }} />
                        </Avatar>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Box>
          )}

          {/* Simple Search Section */}
          <Card sx={{ mb: 4, borderRadius: 3 }}>
            <CardContent sx={{ py: 2 }}>
              <TextField
                fullWidth
                placeholder="Search teams..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    '& fieldset': {
                      borderColor: 'rgba(0,0,0,0.1)',
                    },
                    '&:hover fieldset': {
                      borderColor: 'primary.main',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: 'primary.main',
                    }
                  }
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search sx={{ color: 'text.secondary' }} />
                    </InputAdornment>
                  ),
                }}
              />
            </CardContent>
          </Card>

          {/* Team Leaders List - Grid Layout with Maximized Spacing */}
          {data && (
            <Box sx={{ 
              display: 'grid', 
              gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' },
              gap: 4,
              p: 2
            }}>
              {paginatedTeamLeaders.map((teamLeader, index) => (
                <Card key={teamLeader._id} sx={{ 
                  borderRadius: 3,
                  overflow: 'hidden',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                  transition: 'all 0.3s ease',
                  border: '1px solid rgba(0,0,0,0.06)',
                  backgroundColor: '#ffffff',
                  minHeight: 320,
                  display: 'flex',
                  flexDirection: 'column',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
                    border: '1px solid rgba(0,0,0,0.1)',
                  }
                }}>
                  <CardContent sx={{ p: 4, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                    {/* Header Section */}
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 3 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        {/* Team Leader Avatar */}
                        <Avatar sx={{ 
                          width: 56, 
                          height: 56, 
                          bgcolor: '#e3f2fd',
                          color: '#1976d2',
                          fontSize: 20,
                          fontWeight: 600
                        }}>
                          {teamLeader.firstName.charAt(0)}{teamLeader.lastName.charAt(0)}
                        </Avatar>
                        
                        {/* Team Leader Info */}
                        <Box>
                          <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5, color: '#1a1a1a' }}>
                            {teamLeader.firstName} {teamLeader.lastName}
                          </Typography>
                          <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 500 }}>
                            Team Leader
                          </Typography>
                        </Box>
                      </Box>
                      
                      {/* Action Icons */}
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button size="small" sx={{ minWidth: 'auto', p: 1 }}>
                          <Visibility sx={{ fontSize: 20, color: '#666' }} />
                        </Button>
                        <Button size="small" sx={{ minWidth: 'auto', p: 1 }}>
                          <Assignment sx={{ fontSize: 20, color: '#666' }} />
                        </Button>
                      </Box>
                    </Box>

                    {/* Content Section */}
                    <Box sx={{ mb: 3, flexGrow: 1 }}>
                      {/* Email */}
                      <Typography variant="body1" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1, fontWeight: 500 }}>
                        📧 {teamLeader.email}
                      </Typography>
                      
                      {/* Team */}
                      <Typography variant="body1" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1, fontWeight: 500 }}>
                        🏢 Team: {teamLeader.team || 'No Team Assigned'}
                      </Typography>

                      {/* Stats Row */}
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Typography variant="h4" sx={{ fontWeight: 700, color: teamLeader.teamStats.onlineToday > 0 ? '#2e7d32' : '#666' }}>
                            {teamLeader.teamStats.onlineToday}/{teamLeader.teamStats.totalMembers}
                          </Typography>
                          <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 500 }}>
                            Online Right Now
                          </Typography>
                          <Chip
                            label={`${Math.round((teamLeader.teamStats.onlineToday / teamLeader.teamStats.totalMembers) * 100)}%`}
                            size="medium"
                            sx={{ 
                              backgroundColor: teamLeader.teamStats.onlineToday > 0 ? '#e8f5e8' : '#f5f5f5',
                              color: teamLeader.teamStats.onlineToday > 0 ? '#2e7d32' : '#666',
                              fontWeight: 600,
                              height: 28,
                              fontSize: '0.875rem'
                            }}
                          />
                        </Box>
                        
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                          <Typography variant="body1" sx={{ fontWeight: 600 }}>
                            {teamLeader.teamStats.totalMembers} Total
                          </Typography>
                          <Typography variant="body1" sx={{ fontWeight: 600 }}>
                            {teamLeader.teamStats.activeCases} Cases
                          </Typography>
                          <Typography variant="body1" sx={{ fontWeight: 600 }}>
                            {teamLeader.teamStats.recentIncidents} Incidents
                          </Typography>
                        </Box>
                      </Box>

                      {/* Status */}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                        <Chip
                          icon={getStatusIcon(teamLeader.hasLoggedInToday)}
                          label={teamLeader.hasLoggedInToday ? 'Leader Online' : 'Leader Offline'}
                          size="medium"
                          sx={{ 
                            fontWeight: 600, 
                            height: 32,
                            backgroundColor: teamLeader.hasLoggedInToday ? '#4caf50' : '#f5f5f5',
                            color: teamLeader.hasLoggedInToday ? '#ffffff' : '#666666',
                            '& .MuiChip-icon': {
                              color: teamLeader.hasLoggedInToday ? '#ffffff' : '#666666'
                            }
                          }}
                        />
                        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                          {formatTimeAgo(teamLeader.lastLoginToday)}
                        </Typography>
                      </Box>
                    </Box>

                    {/* Footer Actions */}
                    <Box sx={{ display: 'flex', gap: 2, mt: 'auto' }}>
                      <Button
                        variant="outlined"
                        startIcon={<Visibility />}
                        onClick={() => handleViewDetails(teamLeader)}
                        sx={{
                          borderRadius: 2,
                          borderColor: '#ddd',
                          color: '#333',
                          px: 3,
                          py: 1.5,
                          fontWeight: 600,
                          '&:hover': {
                            borderColor: '#1976d2',
                            backgroundColor: '#f5f5f5'
                          }
                        }}
                      >
                        View Details
                      </Button>
                      <Button
                        variant="outlined"
                        startIcon={<Assignment />}
                        sx={{
                          borderRadius: 2,
                          borderColor: '#ddd',
                          color: '#333',
                          px: 3,
                          py: 1.5,
                          fontWeight: 600,
                          '&:hover': {
                            borderColor: '#1976d2',
                            backgroundColor: '#f5f5f5'
                          }
                        }}
                      >
                        Manage Team
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              ))}
              
              {filteredTeamLeaders.length === 0 && !loading && (
                <Card sx={{  }}>
                  <CardContent>
                    <Box textAlign="center" py={3}>
                      <Typography color="text.secondary">
                        {searchTerm ? 'No team leaders match your search' : 'No team leaders found'}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              )}
              
              {/* Pagination - Only show if more than 5 teams */}
              {filteredTeamLeaders.length > 5 && (
                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'center', 
                  alignItems: 'center', 
                  mt: 3,
                  py: 2,
                  px: 3,
                  backgroundColor: 'rgba(0,0,0,0.02)',
                  borderRadius: 2,
                  border: '1px solid rgba(0,0,0,0.06)'
                }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mr: 2 }}>
                    Showing {startIndex + 1}-{Math.min(endIndex, filteredTeamLeaders.length)} of {filteredTeamLeaders.length} teams
                  </Typography>
                  <Pagination 
                    count={totalPages} 
                    page={currentPage}
                    onChange={(_, page) => setCurrentPage(page)}
                    color="primary"
                    size="small"
                    showFirstButton
                    showLastButton
                  />
                </Box>
              )}
            </Box>
          )}

          {/* Enhanced Team Leader Details Dialog */}
          <Dialog 
            open={detailsDialogOpen} 
            onClose={() => setDetailsDialogOpen(false)}
            maxWidth="lg"
            fullWidth
            sx={{
              '& .MuiDialog-paper': {
                borderRadius: 4,
                boxShadow: '0 8px 40px rgba(0,0,0,0.2)',
                overflow: 'hidden'
              }
            }}
          >
            <DialogTitle sx={{ 
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              py: 3,
              display: 'flex',
              alignItems: 'center',
              gap: 2
            }}>
              <Avatar sx={{ 
                bgcolor: 'rgba(255,255,255,0.2)', 
                width: 48, 
                height: 48,
                backdropFilter: 'blur(10px)'
              }}>
                {selectedTeamLeader && selectedTeamLeader.firstName.charAt(0)}{selectedTeamLeader && selectedTeamLeader.lastName.charAt(0)}
              </Avatar>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  {selectedTeamLeader && `${selectedTeamLeader.firstName} ${selectedTeamLeader.lastName}`}
                </Typography>
                <Typography variant="subtitle1" sx={{ opacity: 0.9, fontWeight: 300 }}>
                  Team Leader Details & Member Management
                </Typography>
              </Box>
            </DialogTitle>
            <DialogContent sx={{ p: 4 }}>
              {selectedTeamLeader && (
                <Box>
                  {/* Enhanced Team Statistics */}
                  <Box sx={{ 
                    mb: 4,
                    p: 3,
                    borderRadius: 3,
                    background: 'linear-gradient(145deg, #f8fafc 0%, #e2e8f0 100%)',
                    border: '1px solid rgba(0,0,0,0.06)'
                  }}>
                    <Typography variant="h5" sx={{ mb: 3, fontWeight: 700 }}>
                      Team Statistics Overview
                    </Typography>
                    <Grid container spacing={3}>
                      <Grid item xs={12} sm={6} md={3}>
                        <Card sx={{ 
                          borderRadius: 3,
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          color: 'white',
                          overflow: 'hidden'
                        }}>
                          <CardContent sx={{ py: 2 }}>
                            <Typography sx={{ opacity: 0.9, fontSize: '0.875rem', fontWeight: 500 }}>
                              Total Members
                            </Typography>
                            <Typography variant="h3" sx={{ fontWeight: 700, my: 1 }}>
                              {selectedTeamLeader.teamStats.totalMembers}
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <Card sx={{ 
                          borderRadius: 3,
                          background: 'linear-gradient(135deg, #56ab2f 0%, #a8e6cf 100%)',
                          color: 'white',
                          overflow: 'hidden'
                        }}>
                          <CardContent sx={{ py: 2 }}>
                            <Typography sx={{ opacity: 0.9, fontSize: '0.875rem', fontWeight: 500 }}>
                              Online Today
                            </Typography>
                            <Typography variant="h3" sx={{ fontWeight: 700, my: 1 }}>
                              {selectedTeamLeader.teamStats.onlineToday}
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <Card sx={{ 
                          borderRadius: 3,
                          background: 'linear-gradient(135deg, #ff9500 0%, #ffed4e 100%)',
                          color: 'white',
                          overflow: 'hidden'
                        }}>
                          <CardContent sx={{ py: 2 }}>
                            <Typography sx={{ opacity: 0.9, fontSize: '0.875rem', fontWeight: 500 }}>
                              Active Cases
                            </Typography>
                            <Typography variant="h3" sx={{ fontWeight: 700, my: 1 }}>
                              {selectedTeamLeader.teamStats.activeCases}
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <Card sx={{ 
                          borderRadius: 3,
                          background: 'linear-gradient(135deg, #ff416c 0%, #ff4b2b 100%)',
                          color: 'white',
                          overflow: 'hidden'
                        }}>
                          <CardContent sx={{ py: 2 }}>
                            <Typography sx={{ opacity: 0.9, fontSize: '0.875rem', fontWeight: 500 }}>
                              Recent Incidents
                            </Typography>
                            <Typography variant="h3" sx={{ fontWeight: 700, my: 1 }}>
                              {selectedTeamLeader.teamStats.recentIncidents}
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                    </Grid>
                  </Box>

                  {/* Team Members */}
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="h6" gutterBottom>
                      All Team Members ({selectedTeamLeader.teamMembers.length})
                    </Typography>
                  </Box>
                  
                  {/* Paginated Team Members Table */}
                  {(() => {
                    const membersTotalPages = Math.ceil(selectedTeamLeader.teamMembers.length / membersPerPage);
                    const membersStartIndex = (membersCurrentPage - 1) * membersPerPage;
                    const membersEndIndex = membersStartIndex + membersPerPage;
                    const paginatedMembers = selectedTeamLeader.teamMembers.slice(membersStartIndex, membersEndIndex);
                    
                    return (
                      <>
                        <TableContainer 
                          component={Paper} 
                          variant="outlined" 
                          sx={{  }}
                        >
                          <Table>
                            <TableHead sx={{ bgcolor: 'grey.200' }}>
                              <TableRow>
                                <TableCell>Member</TableCell>
                                <TableCell>Role</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell>Last Login</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {paginatedMembers.map((member) => (
                          <TableRow key={member._id} hover>
                            <TableCell>
                              <Box display="flex" alignItems="center" gap={1}>
                                <Badge
                                  color={getStatusColor(member.hasLoggedInToday)}
                                  variant="dot"
                                >
                                  <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                                    {member.firstName.charAt(0)}{member.lastName.charAt(0)}
                                  </Avatar>
                                </Badge>
                                <Box>
                                  <Typography variant="body2" fontWeight={500}>
                                    {member.firstName} {member.lastName}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {member.email}
                                  </Typography>
                               </Box>
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Chip label={member.role} size="small" variant="outlined" />
                            </TableCell>
                            <TableCell>
                              <Chip
                                icon={getStatusIcon(member.hasLoggedInToday)}
                                label={member.hasLoggedInToday ? 'Online Today' : 'Offline'}
                                color={getStatusColor(member.hasLoggedInToday)}
                                size="small"
                              />
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">
                                {formatLastLogin(member.lastLoginToday)}
                              </Typography>
                            </TableCell>
                          </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </TableContainer>
                          
                          {/* Team Members Pagination - Only show if more than 10 members */}
                          {selectedTeamLeader.teamMembers.length > 10 && (
                            <Box sx={{ 
                              display: 'flex', 
                              justifyContent: 'space-between', 
                              alignItems: 'center', 
                              mt: 2,
                              py: 2,
                              px: 2,
                              backgroundColor: 'rgba(0,0,0,0.02)',
                              borderRadius: 2,
                              border: '1px solid rgba(0,0,0,0.06)'
                            }}>
                              <Typography variant="body2" color="text.secondary">
                                Showing {membersStartIndex + 1}-{Math.min(membersEndIndex, selectedTeamLeader.teamMembers.length)} of {selectedTeamLeader.teamMembers.length} members
                              </Typography>
                              <Pagination 
                                count={membersTotalPages} 
                                page={membersCurrentPage}
                                onChange={(_, page) => setMembersCurrentPage(page)}
                                color="primary"
                                size="small"
                                showFirstButton
                                showLastButton
                              />
                            </Box>
                          )}
                        </>
                      );
                    })()}
                </Box>
              )}
            </DialogContent>
          </Dialog>

          {/* Last Updated */}
          {data && (
            <Box sx={{ mt: 3, textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary">
                Last updated: {new Date(data.lastUpdated).toLocaleString()}
              </Typography>
            </Box>
          )}
        </Box>
    </LayoutWithSidebar>
  );
};

export default TeamLeaderMonitoring;
