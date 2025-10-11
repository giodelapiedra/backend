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
      boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
      borderRadius: 2
    }}>
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, color: '#2d3748' }}>
            My Cases
          </Typography>
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
        </Box>

        {cases.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Assignment sx={{ fontSize: 48, color: '#a0aec0', mb: 2 }} />
            <Typography variant="h6" sx={{ color: '#718096', mb: 1 }}>
              No cases assigned
            </Typography>
            <Typography variant="body2" sx={{ color: '#a0aec0' }}>
              Cases assigned by case managers will appear here
            </Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Case #</TableCell>
                  <TableCell>Worker</TableCell>
                  <TableCell>Incident</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Priority</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {cases.map((caseItem) => (
                  <TableRow key={caseItem.id}>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {caseItem.case_number}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ width: 32, height: 32, fontSize: '0.875rem' }}>
                          {caseItem.worker?.first_name?.[0]}{caseItem.worker?.last_name?.[0]}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {caseItem.worker?.first_name} {caseItem.worker?.last_name}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#718096' }}>
                            {caseItem.worker?.email}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {caseItem.incident?.incident_type || 'N/A'}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#718096' }}>
                        {caseItem.incident?.severity || 'N/A'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={caseItem.status}
                        size="small"
                        color={
                          caseItem.status === 'new' ? 'warning' :
                          caseItem.status === 'assessed' ? 'info' :
                          caseItem.status === 'in_rehab' ? 'primary' :
                          caseItem.status === 'completed' ? 'success' : 'default'
                        }
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={caseItem.priority}
                        size="small"
                        color={
                          caseItem.priority === 'urgent' ? 'error' :
                          caseItem.priority === 'high' ? 'warning' :
                          caseItem.priority === 'medium' ? 'info' : 'default'
                        }
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {new Date(caseItem.created_at).toLocaleDateString()}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Tooltip title="View Details">
                        <IconButton 
                          size="small" 
                          color="primary"
                          onClick={() => handleViewCase(caseItem.id)}
                          sx={{
                            '&:hover': {
                              backgroundColor: 'rgba(102, 126, 234, 0.1)'
                            }
                          }}
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
        )}
      </CardContent>
    </Card>
  );
});

CasesTable.displayName = 'CasesTable';

export default CasesTable;

