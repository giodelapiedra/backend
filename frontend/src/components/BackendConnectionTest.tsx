import React, { useState } from 'react';
import { Button, Card, CardContent, Typography, Alert, Box } from '@mui/material';
import { CheckCircle, Error as ErrorIcon, Refresh } from '@mui/icons-material';
import { testBackendConnection, kpiAPI } from '../utils/backendApi';
import { useAuth } from '../contexts/AuthContext.supabase';

const BackendConnectionTest: React.FC = () => {
  const { user } = useAuth();
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    details?: any;
  } | null>(null);

  const testConnection = async () => {
    setTesting(true);
    setResult(null);

    try {
      console.log('🔄 Testing backend connection...');
      
      // Test 1: Health check
      const healthResult = await testBackendConnection();
      
      if (!healthResult) {
        throw new Error('Health check failed');
      }

      // Test 2: KPI API (if user is available)
      let kpiResult = null;
      let kpiTestDetails = 'Not tested';
      
      if (user?.id) {
        try {
          if (user.role === 'team_leader') {
            kpiResult = await kpiAPI.getTeamWeeklySummary(user.id);
            kpiTestDetails = 'Team Leader KPI - Success';
          } else if (user.role === 'worker') {
            kpiResult = await kpiAPI.getWorkerWeeklyProgress(user.id);
            kpiTestDetails = 'Worker KPI - Success';
          }
        } catch (kpiError: any) {
          console.warn('KPI test failed:', kpiError);
          kpiTestDetails = `KPI Error: ${kpiError.message}`;
        }
      } else {
        kpiTestDetails = 'No user logged in';
      }

      // Test 3: Direct KPI endpoint test (without auth)
      let directKpiTest = 'Not tested';
      try {
        const directResponse = await fetch('https://sociosystem.onrender.com/api/goal-kpi/team-leader/weekly-summary?teamLeaderId=test');
        directKpiTest = `Direct KPI Test: ${directResponse.status} ${directResponse.statusText}`;
      } catch (directError: any) {
        directKpiTest = `Direct KPI Error: ${directError.message}`;
      }

      setResult({
        success: true,
        message: 'Backend connection successful!',
        details: {
          health: 'OK',
          kpi: kpiTestDetails,
          directKpiTest: directKpiTest,
          user: user ? `${user.role} (${user.id})` : 'No user logged in'
        }
      });

    } catch (error: any) {
      console.error('❌ Backend connection test failed:', error);
      setResult({
        success: false,
        message: error.message || 'Backend connection failed',
        details: {
          error: error.message,
          user: user ? `${user.role} (${user.id})` : 'No user logged in'
        }
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <>
      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>
      <Card sx={{ maxWidth: 600, mx: 'auto', mt: 2 }}>
        <CardContent>
        <Typography variant="h6" gutterBottom>
          Backend Connection Test
        </Typography>
        
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Test the connection between your frontend and the deployed backend at sociosystem.onrender.com
        </Typography>

        <Button
          variant="contained"
           startIcon={testing ? <Refresh sx={{ animation: 'spin 1s linear infinite' }} /> : <CheckCircle />}
          onClick={testConnection}
          disabled={testing}
          sx={{ mb: 2 }}
        >
          {testing ? 'Testing...' : 'Test Backend Connection'}
        </Button>

        {result && (
          <Box sx={{ mt: 2 }}>
            <Alert 
              severity={result.success ? 'success' : 'error'}
               icon={result.success ? <CheckCircle /> : <ErrorIcon />}
            >
              <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                {result.message}
              </Typography>
              
              {result.details && (
                <Box sx={{ mt: 1, fontSize: '0.875rem' }}>
                  <Typography variant="body2" component="div">
                    <strong>Details:</strong>
                  </Typography>
                  <pre style={{ 
                    fontSize: '0.75rem', 
                    margin: '8px 0', 
                    padding: '8px', 
                    backgroundColor: '#f5f5f5', 
                    borderRadius: '4px',
                    overflow: 'auto'
                  }}>
                    {JSON.stringify(result.details, null, 2)}
                  </pre>
                </Box>
              )}
            </Alert>
          </Box>
        )}

        <Typography variant="caption" display="block" sx={{ mt: 2, color: 'text.secondary' }}>
          This will test the connection to: https://sociosystem.onrender.com
        </Typography>
        </CardContent>
      </Card>
    </>
  );
};

export default BackendConnectionTest;
