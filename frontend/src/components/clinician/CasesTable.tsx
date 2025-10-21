import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  CardContent,
  Typography,
  IconButton,
  Tooltip,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Avatar,
} from '@mui/material';
import {
  Refresh,
  Visibility,
  Assignment,
} from '@mui/icons-material';
import { getStatusLabel } from '../../utils/themeUtils';

interface CaseItem {
  id: string;
  case_number: string;
  status: string;
  priority: string;
  worker?: {
    first_name: string;
    last_name: string;
    email: string;
  };
  incident?: {
    incident_type: string;
    severity: string;
  };
  created_at: string;
}

interface CasesTableProps {
  cases: CaseItem[];
  onRefresh: () => void;
}

const CasesTable: React.FC<CasesTableProps> = React.memo(({ cases, onRefresh }) => {
  const navigate = useNavigate();

  const handleViewCase = (caseId: string) => {
    navigate(`/cases/${caseId}`);
  };

  return (
    <Card sx={{ 
      mb: 4, 
      border: '1px solid #e5e7eb',
      borderRadius: 2,
      boxShadow: 'none',
      backgroundColor: 'white'
    }}>
      <CardContent sx={{ p: 0 }}>
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          px: 3,
          py: 2.5,
          borderBottom: '1px solid #f3f4f6'
        }}>
          <Typography variant="h6" sx={{ fontWeight: 600, color: '#111827', fontSize: '1.125rem' }}>
            My Cases
          </Typography>
          <Tooltip title="Refresh">
            <IconButton
              onClick={onRefresh}
              size="small"
              sx={{
                border: '1px solid #e5e7eb',
                borderRadius: 1.5,
                '&:hover': { 
                  backgroundColor: '#f9fafb',
                  borderColor: '#d1d5db'
                }
              }}
            >
              <Refresh sx={{ color: '#6b7280', fontSize: 20 }} />
            </IconButton>
          </Tooltip>
        </Box>

        {cases.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8, px: 3 }}>
            <Assignment sx={{ fontSize: 48, color: '#d1d5db', mb: 2 }} />
            <Typography variant="h6" sx={{ color: '#374151', mb: 1, fontWeight: 500 }}>
              No cases assigned
            </Typography>
            <Typography variant="body2" sx={{ color: '#9ca3af' }}>
              Cases assigned by case managers will appear here
            </Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table sx={{ minWidth: 650 }}>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#fafafa' }}>
                  <TableCell sx={{ 
                    fontWeight: 600, 
                    color: '#6b7280', 
                    fontSize: '0.75rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    borderBottom: '1px solid #e5e7eb',
                    py: 1.5
                  }}>
                    Case #
                  </TableCell>
                  <TableCell sx={{ 
                    fontWeight: 600, 
                    color: '#6b7280', 
                    fontSize: '0.75rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    borderBottom: '1px solid #e5e7eb',
                    py: 1.5
                  }}>
                    Worker
                  </TableCell>
                  <TableCell sx={{ 
                    fontWeight: 600, 
                    color: '#6b7280', 
                    fontSize: '0.75rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    borderBottom: '1px solid #e5e7eb',
                    py: 1.5
                  }}>
                    Incident
                  </TableCell>
                  <TableCell sx={{ 
                    fontWeight: 600, 
                    color: '#6b7280', 
                    fontSize: '0.75rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    borderBottom: '1px solid #e5e7eb',
                    py: 1.5
                  }}>
                    Status
                  </TableCell>
                  <TableCell sx={{ 
                    fontWeight: 600, 
                    color: '#6b7280', 
                    fontSize: '0.75rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    borderBottom: '1px solid #e5e7eb',
                    py: 1.5
                  }}>
                    Priority
                  </TableCell>
                  <TableCell sx={{ 
                    fontWeight: 600, 
                    color: '#6b7280', 
                    fontSize: '0.75rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    borderBottom: '1px solid #e5e7eb',
                    py: 1.5
                  }}>
                    Created
                  </TableCell>
                  <TableCell sx={{ 
                    fontWeight: 600, 
                    color: '#6b7280', 
                    fontSize: '0.75rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    borderBottom: '1px solid #e5e7eb',
                    py: 1.5
                  }}>
                    Actions
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {cases.map((caseItem, index) => (
                  <TableRow 
                    key={caseItem.id}
                    sx={{
                      '&:hover': {
                        backgroundColor: '#fafafa'
                      },
                      borderBottom: index === cases.length - 1 ? 'none' : '1px solid #f3f4f6'
                    }}
                  >
                    <TableCell sx={{ py: 2, borderBottom: 'none' }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#111827', fontSize: '0.875rem' }}>
                        {caseItem.case_number}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ py: 2, borderBottom: 'none' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar sx={{ 
                          width: 36, 
                          height: 36, 
                          fontSize: '0.875rem',
                          backgroundColor: '#f3f4f6',
                          color: '#374151',
                          fontWeight: 600
                        }}>
                          {caseItem.worker?.first_name?.[0]}{caseItem.worker?.last_name?.[0]}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 500, color: '#111827', fontSize: '0.875rem' }}>
                            {caseItem.worker?.first_name} {caseItem.worker?.last_name}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#9ca3af', fontSize: '0.75rem' }}>
                            {caseItem.worker?.email}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ py: 2, borderBottom: 'none' }}>
                      <Typography variant="body2" sx={{ color: '#111827', fontSize: '0.875rem' }}>
                        {caseItem.incident?.incident_type || 'N/A'}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#9ca3af', fontSize: '0.75rem' }}>
                        {caseItem.incident?.severity || 'N/A'}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ py: 2, borderBottom: 'none' }}>
                      <Chip
                        label={getStatusLabel(caseItem.status)}
                        size="small"
                        sx={{
                          borderRadius: '6px',
                          fontWeight: 500,
                          fontSize: '0.75rem',
                          height: '24px',
                          backgroundColor: 
                            caseItem.status === 'new' ? '#eff6ff' :
                            caseItem.status === 'triaged' ? '#fffbeb' :
                            caseItem.status === 'assessed' ? '#f5f3ff' :
                            caseItem.status === 'in_rehab' ? '#fef2f2' :
                            caseItem.status === 'return_to_work' ? '#fff7ed' :
                            caseItem.status === 'closed' ? '#f9fafb' : '#f9fafb',
                          color: 
                            caseItem.status === 'new' ? '#3b82f6' :
                            caseItem.status === 'triaged' ? '#f59e0b' :
                            caseItem.status === 'assessed' ? '#8b5cf6' :
                            caseItem.status === 'in_rehab' ? '#ef4444' :
                            caseItem.status === 'return_to_work' ? '#f97316' :
                            caseItem.status === 'closed' ? '#6b7280' : '#6b7280',
                          border: '1px solid',
                          borderColor:
                            caseItem.status === 'new' ? '#dbeafe' :
                            caseItem.status === 'triaged' ? '#fef3c7' :
                            caseItem.status === 'assessed' ? '#ede9fe' :
                            caseItem.status === 'in_rehab' ? '#fee2e2' :
                            caseItem.status === 'return_to_work' ? '#fed7aa' :
                            caseItem.status === 'closed' ? '#e5e7eb' : '#e5e7eb'
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ py: 2, borderBottom: 'none' }}>
                      <Chip
                        label={caseItem.priority.toUpperCase()}
                        size="small"
                        sx={{
                          borderRadius: '6px',
                          fontWeight: 500,
                          fontSize: '0.75rem',
                          height: '24px',
                          backgroundColor: 
                            caseItem.priority === 'urgent' ? '#fef2f2' :
                            caseItem.priority === 'high' ? '#fef2f2' :
                            caseItem.priority === 'medium' ? '#fffbeb' : '#f9fafb',
                          color:
                            caseItem.priority === 'urgent' ? '#dc2626' :
                            caseItem.priority === 'high' ? '#ef4444' :
                            caseItem.priority === 'medium' ? '#f59e0b' : '#6b7280',
                          border: '1px solid',
                          borderColor:
                            caseItem.priority === 'urgent' ? '#fee2e2' :
                            caseItem.priority === 'high' ? '#fee2e2' :
                            caseItem.priority === 'medium' ? '#fef3c7' : '#e5e7eb'
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ py: 2, borderBottom: 'none' }}>
                      <Typography variant="body2" sx={{ color: '#6b7280', fontSize: '0.875rem' }}>
                        {new Date(caseItem.created_at).toLocaleDateString()}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ py: 2, borderBottom: 'none' }}>
                      <Tooltip title="View Details">
                        <IconButton 
                          size="small"
                          onClick={() => handleViewCase(caseItem.id)}
                          sx={{
                            border: '1px solid #e5e7eb',
                            borderRadius: 1.5,
                            '&:hover': {
                              backgroundColor: '#f9fafb',
                              borderColor: '#3b82f6'
                            }
                          }}
                        >
                          <Visibility sx={{ fontSize: 18, color: '#6b7280' }} />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </CardContent>
    </Card>
  );
});

CasesTable.displayName = 'CasesTable';

export default CasesTable;

