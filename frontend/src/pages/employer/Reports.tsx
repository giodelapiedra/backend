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
  Grid,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
} from '@mui/material';
import {
  Download,
  Visibility,
  Assessment,
  Description,
  TrendingUp,
  Warning,
  CheckCircle,
  Schedule,
  Refresh,
} from '@mui/icons-material';
import Layout from '../../components/Layout';
import api from '../../utils/api';

interface Report {
  _id: string;
  title: string;
  type: string;
  status: string;
  generatedDate: string;
  generatedBy: {
    firstName: string;
    lastName: string;
  };
  description: string;
  data: any;
  fileUrl?: string;
}

interface ReportTemplate {
  _id: string;
  name: string;
  description: string;
  type: string;
  isActive: boolean;
}

const Reports: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [detailsDialog, setDetailsDialog] = useState(false);
  const [generateDialog, setGenerateDialog] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Mock data for reports
      const mockReports: Report[] = [
        {
          _id: '1',
          title: 'Monthly Safety Report',
          type: 'safety',
          status: 'completed',
          generatedDate: new Date().toISOString(),
          generatedBy: { firstName: 'John', lastName: 'Doe' },
          description: 'Comprehensive monthly safety analysis including incident trends and compliance metrics.',
          data: { incidents: 15, cases: 8, compliance: 92 }
        },
        {
          _id: '2',
          title: 'Worker Compliance Report',
          type: 'compliance',
          status: 'completed',
          generatedDate: new Date(Date.now() - 86400000).toISOString(),
          generatedBy: { firstName: 'Jane', lastName: 'Smith' },
          description: 'Detailed worker compliance analysis with recommendations for improvement.',
          data: { totalWorkers: 45, compliant: 38, nonCompliant: 7 }
        },
        {
          _id: '3',
          title: 'Incident Analysis Report',
          type: 'incidents',
          status: 'generating',
          generatedDate: new Date(Date.now() - 172800000).toISOString(),
          generatedBy: { firstName: 'Mike', lastName: 'Johnson' },
          description: 'Deep dive analysis of incident patterns and root causes.',
          data: {}
        }
      ];

      const mockTemplates: ReportTemplate[] = [
        {
          _id: '1',
          name: 'Safety Report Template',
          description: 'Standard monthly safety report template',
          type: 'safety',
          isActive: true
        },
        {
          _id: '2',
          name: 'Compliance Report Template',
          description: 'Worker compliance analysis template',
          type: 'compliance',
          isActive: true
        },
        {
          _id: '3',
          name: 'Incident Report Template',
          description: 'Incident analysis and trends template',
          type: 'incidents',
          isActive: true
        }
      ];

      setReports(mockReports);
      setTemplates(mockTemplates);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch reports data');
    } finally {
      setLoading(false);
    }
  };

  const handleViewReport = (report: Report) => {
    setSelectedReport(report);
    setDetailsDialog(true);
  };

  const handleDownloadReport = (report: Report) => {
    // Mock download functionality
    alert(`Downloading report: ${report.title}`);
  };

  const handleGenerateReport = (template: ReportTemplate) => {
    // Mock report generation
    alert(`Generating report: ${template.name}`);
    setGenerateDialog(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'generating': return 'warning';
      case 'failed': return 'error';
      default: return 'default';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'safety': return 'primary';
      case 'compliance': return 'info';
      case 'incidents': return 'warning';
      default: return 'default';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'safety': return <Assessment />;
      case 'compliance': return <CheckCircle />;
      case 'incidents': return <Warning />;
      default: return <Description />;
    }
  };

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
          <Box 
            display="flex" 
            flexDirection={{ xs: 'column', md: 'row' }} 
            justifyContent="space-between" 
            alignItems={{ xs: 'flex-start', md: 'center' }}
            gap={{ xs: 2, md: 0 }}
          >
            <Box>
              <Typography variant="h3" component="h1" sx={{ 
                fontWeight: 700, 
                color: '#1e293b',
                mb: 1,
                fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2rem' }
              }}>
                Reports
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ 
                fontSize: { xs: '0.875rem', sm: '1rem' }
              }}>
                Generate and manage workplace safety reports
              </Typography>
            </Box>
            <Box 
              display="flex" 
              gap={{ xs: 1, sm: 2 }}
              width={{ xs: '100%', md: 'auto' }}
              flexDirection={{ xs: 'column', sm: 'row' }}
            >
              <Button
                variant="contained"
                startIcon={<Assessment />}
                onClick={() => setGenerateDialog(true)}
                sx={{ 
                  backgroundColor: '#8b5cf6',
                  borderRadius: { xs: 3, sm: 2 },
                  px: { xs: 3, sm: 3 },
                  py: { xs: 1.5, sm: 1.5 },
                  textTransform: 'none',
                  fontSize: { xs: '1rem', sm: '1rem' },
                  fontWeight: 600,
                  width: { xs: '100%', sm: 'auto' },
                  minHeight: { xs: '48px', sm: '40px' },
                  touchAction: 'manipulation',
                  '&:hover': {
                    backgroundColor: '#7c3aed'
                  }
                }}
              >
                Generate Report
              </Button>
              <Button
                variant="outlined"
                startIcon={<Refresh />}
                onClick={fetchData}
                sx={{ 
                  borderRadius: { xs: 3, sm: 2 },
                  px: { xs: 3, sm: 3 },
                  py: { xs: 1.5, sm: 1.5 },
                  textTransform: 'none',
                  fontSize: { xs: '1rem', sm: '1rem' },
                  fontWeight: 600,
                  width: { xs: '100%', sm: 'auto' },
                  minHeight: { xs: '48px', sm: '40px' },
                  touchAction: 'manipulation',
                  borderColor: '#e2e8f0',
                  color: '#64748b',
                  '&:hover': {
                    borderColor: '#8b5cf6',
                    color: '#8b5cf6'
                  }
                }}
              >
                Refresh
              </Button>
            </Box>
          </Box>
        </Box>

        {error && (
          <Alert 
            severity="error" 
            sx={{ 
              mb: 3, 
              borderRadius: 2,
              backgroundColor: '#fef2f2',
              borderColor: '#fecaca',
              color: '#dc2626'
            }} 
            onClose={() => setError(null)}
          >
            {error}
          </Alert>
        )}

        {/* Reports Table */}
        <Card sx={{ 
          borderRadius: { xs: 0, sm: 2, md: 3 },
          boxShadow: { xs: 'none', sm: '0 1px 3px rgba(0,0,0,0.1)' },
          border: 'none',
          overflow: 'hidden',
          borderTop: { xs: '1px solid #e2e8f0', sm: 'none' }
        }}>
          <Box sx={{ p: { xs: 1, sm: 2, md: 4 } }}>
            <Box 
              display="flex" 
              flexDirection={{ xs: 'column', sm: 'row' }} 
              justifyContent="space-between" 
              alignItems={{ xs: 'flex-start', sm: 'center' }} 
              gap={{ xs: 1, sm: 0 }}
              mb={{ xs: 2, sm: 3 }}
            >
              <Typography variant="h5" sx={{ 
                fontWeight: 700, 
                color: '#1e293b',
                fontSize: { xs: '1.25rem', sm: '1.5rem', md: '1.75rem' }
              }}>
                Recent Reports
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {reports.length} total reports
              </Typography>
            </Box>
            
            <Box sx={{ 
              backgroundColor: 'white',
              borderRadius: { xs: 0, sm: 1, md: 2 },
              overflow: 'auto',
              border: { xs: 'none', sm: '1px solid #e2e8f0' },
              maxWidth: '100%',
              WebkitOverflowScrolling: 'touch',
              '&::-webkit-scrollbar': {
                height: '6px',
                width: '6px',
              },
              '&::-webkit-scrollbar-track': {
                backgroundColor: '#f1f1f1',
                borderRadius: '3px',
              },
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: '#c1c1c1',
                borderRadius: '3px',
                '&:hover': {
                  backgroundColor: '#a8a8a8',
                },
              },
            }}>
              <Table size="small">
                <TableHead sx={{ backgroundColor: '#f8fafc' }}>
                  <TableRow>
                    <TableCell sx={{ 
                      fontWeight: 600, 
                      color: '#374151',
                      borderBottom: '1px solid #e2e8f0',
                      whiteSpace: 'nowrap',
                      padding: { xs: '8px', sm: '16px' },
                      fontSize: { xs: '0.75rem', sm: '0.875rem' }
                    }}>Report</TableCell>
                    <TableCell sx={{ 
                      fontWeight: 600, 
                      color: '#374151',
                      borderBottom: '1px solid #e2e8f0',
                      whiteSpace: 'nowrap',
                      padding: { xs: '8px', sm: '16px' },
                      fontSize: { xs: '0.75rem', sm: '0.875rem' }
                    }}>Type</TableCell>
                    <TableCell sx={{ 
                      fontWeight: 600, 
                      color: '#374151',
                      borderBottom: '1px solid #e2e8f0',
                      whiteSpace: 'nowrap',
                      padding: { xs: '8px', sm: '16px' },
                      fontSize: { xs: '0.75rem', sm: '0.875rem' }
                    }}>Status</TableCell>
                    <TableCell sx={{ 
                      fontWeight: 600, 
                      color: '#374151',
                      borderBottom: '1px solid #e2e8f0',
                      whiteSpace: 'nowrap',
                      padding: { xs: '8px', sm: '16px' },
                      fontSize: { xs: '0.75rem', sm: '0.875rem' },
                      display: { xs: 'none', md: 'table-cell' }
                    }}>Generated By</TableCell>
                    <TableCell sx={{ 
                      fontWeight: 600, 
                      color: '#374151',
                      borderBottom: '1px solid #e2e8f0',
                      whiteSpace: 'nowrap',
                      padding: { xs: '8px', sm: '16px' },
                      fontSize: { xs: '0.75rem', sm: '0.875rem' }
                    }}>Date</TableCell>
                    <TableCell sx={{ 
                      fontWeight: 600, 
                      color: '#374151',
                      borderBottom: '1px solid #e2e8f0',
                      whiteSpace: 'nowrap',
                      padding: { xs: '8px', sm: '16px' },
                      fontSize: { xs: '0.75rem', sm: '0.875rem' }
                    }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {reports.map((report) => (
                    <TableRow 
                      key={report._id}
                      sx={{ 
                        '&:hover': { backgroundColor: '#f8fafc' },
                        '&:last-child td': { borderBottom: 0 }
                      }}
                    >
                      <TableCell sx={{ 
                        padding: { xs: '8px', sm: '16px' },
                        fontSize: { xs: '0.75rem', sm: '0.875rem' }
                      }}>
                        <Box>
                          <Typography variant="body2" sx={{ 
                            fontWeight: 500,
                            fontSize: { xs: '0.75rem', sm: '0.875rem' }
                          }}>
                            {report.title}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{
                            fontSize: { xs: '0.65rem', sm: '0.75rem' }
                          }}>
                            {report.description.length > 50 
                              ? `${report.description.substring(0, 50)}...` 
                              : report.description}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ 
                        padding: { xs: '8px', sm: '16px' },
                        fontSize: { xs: '0.75rem', sm: '0.875rem' }
                      }}>
                        <Chip
                          icon={getTypeIcon(report.type)}
                          label={report.type}
                          color={getTypeColor(report.type)}
                          size="small"
                          sx={{ 
                            fontWeight: 500,
                            textTransform: 'capitalize',
                            height: { xs: '20px', sm: '24px' },
                            fontSize: { xs: '0.65rem', sm: '0.75rem' }
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ 
                        padding: { xs: '8px', sm: '16px' },
                        fontSize: { xs: '0.75rem', sm: '0.875rem' }
                      }}>
                        <Chip
                          label={report.status}
                          color={getStatusColor(report.status)}
                          size="small"
                          sx={{ 
                            fontWeight: 500,
                            textTransform: 'capitalize',
                            height: { xs: '20px', sm: '24px' },
                            fontSize: { xs: '0.65rem', sm: '0.75rem' }
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ 
                        padding: { xs: '8px', sm: '16px' },
                        fontSize: { xs: '0.75rem', sm: '0.875rem' },
                        display: { xs: 'none', md: 'table-cell' }
                      }}>
                        <Typography variant="body2" sx={{
                          fontSize: { xs: '0.75rem', sm: '0.875rem' }
                        }}>
                          {report.generatedBy.firstName} {report.generatedBy.lastName}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ 
                        padding: { xs: '8px', sm: '16px' },
                        fontSize: { xs: '0.75rem', sm: '0.875rem' },
                        whiteSpace: 'nowrap'
                      }}>
                        <Typography variant="body2" sx={{
                          fontSize: { xs: '0.75rem', sm: '0.875rem' }
                        }}>
                          {new Date(report.generatedDate).toLocaleDateString()}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ 
                        padding: { xs: '8px', sm: '16px' },
                        fontSize: { xs: '0.75rem', sm: '0.875rem' }
                      }}>
                        <Box display="flex" gap={1}>
                          <IconButton
                            size="small"
                            onClick={() => handleViewReport(report)}
                            sx={{ 
                              color: '#8b5cf6',
                              '&:hover': { backgroundColor: '#f3e8ff' },
                              padding: { xs: '12px', sm: '8px' },
                              minWidth: { xs: '48px', sm: '40px' },
                              minHeight: { xs: '48px', sm: '40px' },
                              touchAction: 'manipulation',
                              borderRadius: { xs: 2, sm: 1 }
                            }}
                          >
                            <Visibility sx={{ fontSize: { xs: '1.5rem', sm: '1.25rem' } }} />
                          </IconButton>
                          {report.status === 'completed' && (
                            <IconButton
                              size="small"
                              onClick={() => handleDownloadReport(report)}
                              sx={{ 
                                color: '#22c55e',
                                '&:hover': { backgroundColor: '#dcfce7' },
                                padding: { xs: '12px', sm: '8px' },
                                minWidth: { xs: '48px', sm: '40px' },
                                minHeight: { xs: '48px', sm: '40px' },
                                touchAction: 'manipulation',
                                borderRadius: { xs: 2, sm: 1 }
                              }}
                            >
                              <Download sx={{ fontSize: { xs: '1.5rem', sm: '1.25rem' } }} />
                            </IconButton>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          </Box>
        </Card>

        {/* Report Details Dialog */}
        <Dialog 
          open={detailsDialog} 
          onClose={() => setDetailsDialog(false)} 
          maxWidth="md" 
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: { xs: 0, sm: 3 },
              boxShadow: { xs: 'none', sm: '0 10px 25px rgba(0,0,0,0.1)' },
              m: { xs: 0, sm: 2 },
              maxHeight: { xs: '100vh', sm: '90vh' },
              width: { xs: '100%', sm: 'auto' }
            }
          }}
        >
          {selectedReport && (
            <>
              <DialogTitle sx={{ 
                backgroundColor: '#8b5cf6',
                color: 'white',
                fontWeight: 700,
                fontSize: { xs: '1.25rem', sm: '1.5rem' },
                py: { xs: 2, sm: 3 },
                px: { xs: 2, sm: 3 }
              }}>
                Report Details: {selectedReport.title}
              </DialogTitle>
              <DialogContent sx={{ 
                p: { xs: 1.5, sm: 2, md: 3 }, 
                maxHeight: { xs: 'calc(100vh - 200px)', sm: 'auto' },
                overflowY: { xs: 'auto', sm: 'visible' }
              }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 1.5, sm: 2 } }}>
                  <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, flexWrap: 'wrap', gap: { xs: 1.5, sm: 2 } }}>
                    <Box sx={{ flex: '1 1 300px', minWidth: { xs: '100%', sm: '300px' } }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: { xs: '0.875rem', sm: '1rem' } }}>Type:</Typography>
                      <Chip
                        icon={getTypeIcon(selectedReport.type)}
                        label={selectedReport.type}
                        color={getTypeColor(selectedReport.type)}
                        size="small"
                        sx={{ 
                          height: { xs: '24px', sm: '28px' },
                          fontSize: { xs: '0.7rem', sm: '0.75rem' },
                          textTransform: 'capitalize',
                          mt: 0.5
                        }}
                      />
                    </Box>
                    <Box sx={{ flex: '1 1 300px', minWidth: { xs: '100%', sm: '300px' } }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: { xs: '0.875rem', sm: '1rem' } }}>Status:</Typography>
                      <Chip
                        label={selectedReport.status}
                        color={getStatusColor(selectedReport.status)}
                        size="small"
                        sx={{ 
                          height: { xs: '24px', sm: '28px' },
                          fontSize: { xs: '0.7rem', sm: '0.75rem' },
                          textTransform: 'capitalize',
                          mt: 0.5
                        }}
                      />
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, flexWrap: 'wrap', gap: { xs: 1.5, sm: 2 } }}>
                    <Box sx={{ flex: '1 1 300px', minWidth: { xs: '100%', sm: '300px' } }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: { xs: '0.875rem', sm: '1rem' } }}>Generated By:</Typography>
                      <Typography sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                        {selectedReport.generatedBy.firstName} {selectedReport.generatedBy.lastName}
                      </Typography>
                    </Box>
                    <Box sx={{ flex: '1 1 300px', minWidth: { xs: '100%', sm: '300px' } }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: { xs: '0.875rem', sm: '1rem' } }}>Generated Date:</Typography>
                      <Typography sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                        {new Date(selectedReport.generatedDate).toLocaleString()}
                      </Typography>
                    </Box>
                  </Box>
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: { xs: '0.875rem', sm: '1rem' } }}>Description:</Typography>
                    <Typography sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>{selectedReport.description}</Typography>
                  </Box>
                </Box>
              </DialogContent>
              <DialogActions sx={{ 
                p: { xs: 1.5, sm: 2, md: 3 }, 
                backgroundColor: '#f8fafc',
                borderTop: '1px solid #e2e8f0',
                position: { xs: 'sticky', sm: 'static' },
                bottom: { xs: 0, sm: 'auto' },
                zIndex: { xs: 1, sm: 'auto' }
              }}>
                <Button 
                  onClick={() => setDetailsDialog(false)}
                  variant="outlined"
                  fullWidth={true}
                  sx={{ 
                    borderRadius: { xs: 3, sm: 2 },
                    px: { xs: 3, sm: 3 },
                    py: { xs: 1.5, sm: 1.5 },
                    textTransform: 'none',
                    fontSize: { xs: '1rem', sm: '1rem' },
                    fontWeight: 600,
                    color: '#8b5cf6',
                    borderColor: '#8b5cf6',
                    minHeight: { xs: '52px', sm: '40px' },
                    touchAction: 'manipulation'
                  }}
                >
                  Close
                </Button>
              </DialogActions>
            </>
          )}
        </Dialog>

        {/* Generate Report Dialog */}
        <Dialog 
          open={generateDialog} 
          onClose={() => setGenerateDialog(false)} 
          maxWidth="sm" 
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: { xs: 0, sm: 3 },
              boxShadow: { xs: 'none', sm: '0 10px 25px rgba(0,0,0,0.1)' },
              m: { xs: 0, sm: 2 },
              maxHeight: { xs: '100vh', sm: '90vh' },
              width: { xs: '100%', sm: 'auto' }
            }
          }}
        >
          <DialogTitle sx={{ 
            backgroundColor: '#8b5cf6',
            color: 'white',
            fontWeight: 700,
            fontSize: { xs: '1.25rem', sm: '1.5rem' },
            py: { xs: 2, sm: 3 },
            px: { xs: 2, sm: 3 }
          }}>
            Generate New Report
          </DialogTitle>
          <DialogContent sx={{ 
            p: { xs: 1.5, sm: 2, md: 3 }, 
            maxHeight: { xs: 'calc(100vh - 200px)', sm: 'auto' },
            overflowY: { xs: 'auto', sm: 'visible' }
          }}>
            <Typography variant="h6" sx={{ 
              fontWeight: 600, 
              mb: 2,
              fontSize: { xs: '1rem', sm: '1.25rem' }
            }}>
              Select Report Template
            </Typography>
            <List>
              {templates.map((template, index) => (
                <React.Fragment key={template._id}>
                  <ListItem 
                    button
                    onClick={() => handleGenerateReport(template)}
                    sx={{ 
                      py: { xs: 1.5, sm: 2 },
                      borderRadius: { xs: 2, sm: 1 },
                      '&:hover': { backgroundColor: '#f3e8ff' }
                    }}
                  >
                    <ListItemIcon>
                      {getTypeIcon(template.type)}
                    </ListItemIcon>
                    <ListItemText
                      primary={template.name}
                      secondary={template.description}
                      primaryTypographyProps={{
                        fontSize: { xs: '0.875rem', sm: '1rem' },
                        fontWeight: 500
                      }}
                      secondaryTypographyProps={{
                        fontSize: { xs: '0.75rem', sm: '0.875rem' }
                      }}
                    />
                  </ListItem>
                  {index < templates.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          </DialogContent>
          <DialogActions sx={{ 
            p: { xs: 1.5, sm: 2, md: 3 }, 
            backgroundColor: '#f8fafc',
            borderTop: '1px solid #e2e8f0',
            position: { xs: 'sticky', sm: 'static' },
            bottom: { xs: 0, sm: 'auto' },
            zIndex: { xs: 1, sm: 'auto' }
          }}>
            <Button 
              onClick={() => setGenerateDialog(false)}
              variant="outlined"
              fullWidth={true}
              sx={{ 
                borderRadius: { xs: 3, sm: 2 },
                px: { xs: 3, sm: 3 },
                py: { xs: 1.5, sm: 1.5 },
                textTransform: 'none',
                fontSize: { xs: '1rem', sm: '1rem' },
                fontWeight: 600,
                color: '#64748b',
                borderColor: '#e2e8f0',
                minHeight: { xs: '52px', sm: '40px' },
                touchAction: 'manipulation',
                '&:hover': {
                  borderColor: '#cbd5e1',
                  backgroundColor: '#f1f5f9'
                }
              }}
            >
              Cancel
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  );
};

export default Reports;



