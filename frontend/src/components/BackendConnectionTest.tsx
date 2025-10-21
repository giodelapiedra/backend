import React, { useState, useEffect } from 'react';
import { Box, Button, Typography, Alert, Card, CardContent } from '@mui/material';
import { useAuth } from '../contexts/AuthContext.supabase';
import { BackendAssignmentAPI } from '../utils/backendAssignmentApi';

const BackendConnectionTest: React.FC = () => {
  const { user, session } = useAuth();
  const [testResults, setTestResults] = useState<any>({});
  const [loading, setLoading] = useState(false);

  const runTests = async () => {
    setLoading(true);
    const results: any = {};

    try {
      // Test 1: Check authentication
      results.auth = {
        user: user ? '✅ User logged in' : '❌ No user',
        session: session ? '✅ Session active' : '❌ No session',
        token: session?.access_token ? '✅ Token present' : '❌ No token'
      };

      // Test 2: Test basic API connection
      try {
        const assignments = await BackendAssignmentAPI.getAssignments();
        results.assignments = '✅ Assignments API working';
      } catch (error: any) {
        results.assignments = `❌ Assignments API failed: ${error.message}`;
      }

      // Test 3: Test unselected workers API
      try {
        const unselected = await BackendAssignmentAPI.getUnselectedWorkers();
        results.unselected = '✅ Unselected workers API working';
      } catch (error: any) {
        results.unselected = `❌ Unselected workers API failed: ${error.message}`;
      }

      // Test 4: Test stats API
      try {
        const stats = await BackendAssignmentAPI.getAssignmentStats();
        results.stats = '✅ Stats API working';
      } catch (error: any) {
        results.stats = `❌ Stats API failed: ${error.message}`;
      }

    } catch (error: any) {
      results.general = `❌ General error: ${error.message}`;
    }

    setTestResults(results);
    setLoading(false);
  };

  useEffect(() => {
    if (user && session) {
      runTests();
    }
  }, [user, session]);

  return (
    <Card sx={{ maxWidth: 600, margin: '20px auto' }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          🔧 Backend Connection Test
        </Typography>
        
        <Box mb={2}>
          <Typography variant="body2" color="text.secondary">
            User: {user?.email || 'Not logged in'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Role: {user?.role || 'N/A'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Session: {session ? 'Active' : 'None'}
          </Typography>
        </Box>

        <Button 
          variant="contained" 
          onClick={runTests} 
          disabled={loading}
          sx={{ mb: 2 }}
        >
          {loading ? 'Testing...' : 'Run Tests'}
        </Button>

        {Object.keys(testResults).length > 0 && (
          <Box>
            {Object.entries(testResults).map(([key, value]) => (
              <Alert 
                key={key} 
                severity={value.toString().includes('✅') ? 'success' : 'error'}
                sx={{ mb: 1 }}
              >
                <span><strong>{key}:</strong> {String(value)}</span>
              </Alert>
            ))}
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default BackendConnectionTest;