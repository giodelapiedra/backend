import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Box, CircularProgress, Typography } from '@mui/material';
import { QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext.supabase';
import { ProtectedRoute } from './components/ProtectedRoute';
import ReduxProvider from './components/ReduxProvider';
import { queryClient } from './lib/queryClient';
import './styles/design-system.css';
import './styles/modern-dashboard.css';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/admin/AdminDashboard';
import EnhancedAnalytics from './pages/admin/Analytics';
import AuthenticationLogs from './pages/admin/AuthenticationLogs';
import Users from './pages/admin/Users';
import WorkerDashboard from './pages/worker/WorkerDashboard';
import WorkerRehabilitationPlan from './pages/worker/WorkerRehabilitationPlan';
import ClinicianDashboardRedux from './pages/clinician/ClinicianDashboardRedux';
import WorkerActivityMonitor from './pages/clinician/WorkerActivityMonitor';
import AppointmentCalendar from './pages/clinician/AppointmentCalendar';
import ClinicianAnalytics from './pages/clinician/ClinicianAnalytics';
import EmployerDashboard from './pages/employer/EmployerDashboard';
import Analytics from './pages/employer/Analytics';
import CaseManagerDashboardRedux from './pages/caseManager/CaseManagerDashboardRedux';
import SiteSupervisorDashboardRedux from './pages/siteSupervisor/SiteSupervisorDashboardRedux';
import TeamLeaderMonitoring from './pages/siteSupervisor/TeamLeaderMonitoring';
import MultiTeamAnalytics from './components/MultiTeamAnalytics';
import GPInsurerDashboard from './pages/gpInsurer/GPInsurerDashboard';
import TeamLeaderDashboard from './pages/teamLeader/TeamLeaderDashboard';
import TeamAnalytics from './pages/teamLeader/TeamAnalytics';
import TeamMemberManagement from './pages/teamLeader/TeamMemberManagement';
import WorkReadinessDashboard from './pages/teamLeader/WorkReadinessDashboard';
import AssessmentLogs from './pages/teamLeader/AssessmentLogs';
import WorkReadinessAssignments from './pages/teamLeader/WorkReadinessAssignments';
import Cases from './pages/Cases';
import CaseDetails from './pages/CaseDetails';
import CheckInsPage from './pages/CheckInsPage';
import Appointments from './pages/Appointments';
import Profile from './pages/Profile';
import Notifications from './pages/Notifications';
import NotFound from './pages/NotFound';
import './styles/dashboard.css';

// Lazy-loaded components
const TaskManagement = React.lazy(() => import('./pages/clinician/TaskManagement'));

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#7B68EE', // Purple accent
      light: '#9B7FFF',
      dark: '#5A4FCF',
    },
    secondary: {
      main: '#20B2AA', // Teal accent
      light: '#4DD0C1',
      dark: '#008B8B',
    },
    background: {
      default: '#F8F9FA', // Light gray background
      paper: '#FFFFFF',
    },
    success: {
      main: '#FF8C00', // Orange accent
      light: '#FFA500',
      dark: '#FF7F00',
    },
    warning: {
      main: '#FF6B6B', // Pink accent
      light: '#FF8E8E',
      dark: '#E55555',
    },
    error: {
      main: '#E74C3C',
    },
    info: {
      main: '#3498DB',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 700,
      letterSpacing: '-0.02em',
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 600,
      letterSpacing: '-0.01em',
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 600,
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 600,
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 600,
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 600,
    },
    body1: {
      fontSize: '0.875rem',
      fontWeight: 400,
    },
    body2: {
      fontSize: '0.75rem',
      fontWeight: 400,
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: 8,
          padding: '8px 16px',
        },
        contained: {
          boxShadow: '0 2px 8px rgba(123, 104, 238, 0.3)',
          '&:hover': {
            boxShadow: '0 4px 12px rgba(123, 104, 238, 0.4)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
          borderRadius: 16,
          border: '1px solid rgba(0,0,0,0.05)',
          '&:hover': {
            boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
            transform: 'translateY(-2px)',
            transition: 'all 0.3s ease',
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#FFFFFF',
          color: '#2C3E50',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: '#FFFFFF',
          borderRight: '1px solid rgba(0,0,0,0.05)',
        },
      },
    },
  },
});

// Loading fallback component
const LoadingFallback = () => (
  <Box 
    sx={{
      display: 'flex', 
      flexDirection: 'column',
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)'
    }}
  >
    <CircularProgress size={60} sx={{ mb: 2 }} />
    <Typography variant="h6" sx={{ color: '#1976d2' }}>
      Loading application...
    </Typography>
  </Box>
);

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AuthProvider>
          <ReduxProvider>
            <Router>
              <Suspense fallback={<LoadingFallback />}>
                <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            
            {/* Protected Routes */}
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            
            {/* Role-specific dashboards */}
            <Route path="/admin" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            } />
            
            <Route path="/admin/dashboard" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            } />
            
            <Route path="/admin/analytics" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <EnhancedAnalytics />
              </ProtectedRoute>
            } />
            
            <Route path="/admin/auth-logs" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AuthenticationLogs />
              </ProtectedRoute>
            } />
            
            <Route path="/worker" element={
              <ProtectedRoute allowedRoles={['worker']}>
                <WorkerDashboard />
              </ProtectedRoute>
            } />
            
            <Route path="/worker/rehabilitation-plan/:id" element={
              <ProtectedRoute allowedRoles={['worker']}>
                <WorkerRehabilitationPlan />
              </ProtectedRoute>
            } />
            
            <Route path="/worker/rehabilitation-plan" element={
              <ProtectedRoute allowedRoles={['worker']}>
                <WorkerRehabilitationPlan />
              </ProtectedRoute>
            } />
            
            <Route path="/clinician" element={
              <ProtectedRoute allowedRoles={['clinician']}>
                <ClinicianDashboardRedux />
              </ProtectedRoute>
            } />
            
            <Route path="/clinician/dashboard" element={
              <ProtectedRoute allowedRoles={['clinician']}>
                <ClinicianDashboardRedux />
              </ProtectedRoute>
            } />
            
            <Route path="/clinician/activity-monitor" element={
              <ProtectedRoute allowedRoles={['clinician']}>
                <WorkerActivityMonitor />
              </ProtectedRoute>
            } />
            
            <Route path="/clinician/tasks" element={
              <ProtectedRoute allowedRoles={['clinician']}>
                <Suspense fallback={<LoadingFallback />}>
                  <TaskManagement />
                </Suspense>
              </ProtectedRoute>
            } />
            
            <Route path="/clinician/calendar" element={
              <ProtectedRoute allowedRoles={['clinician']}>
                <AppointmentCalendar />
              </ProtectedRoute>
            } />
            
            <Route path="/clinician/analytics" element={
              <ProtectedRoute allowedRoles={['clinician']}>
                <ClinicianAnalytics />
              </ProtectedRoute>
            } />
            
            <Route path="/employer" element={
              <ProtectedRoute allowedRoles={['employer']}>
                <EmployerDashboard />
              </ProtectedRoute>
            } />
            
            <Route path="/analytics" element={
              <ProtectedRoute allowedRoles={['employer']}>
                <Analytics />
              </ProtectedRoute>
            } />
            
            <Route path="/case-manager" element={
              <ProtectedRoute allowedRoles={['case_manager']}>
                <CaseManagerDashboardRedux />
              </ProtectedRoute>
            } />
            
            <Route path="/case-manager/dashboard" element={
              <ProtectedRoute allowedRoles={['case_manager']}>
                <CaseManagerDashboardRedux />
              </ProtectedRoute>
            } />
            
            <Route path="/site-supervisor" element={
              <ProtectedRoute allowedRoles={['site_supervisor']}>
                <SiteSupervisorDashboardRedux />
              </ProtectedRoute>
            } />
            
            <Route path="/site-supervisor/team-monitoring" element={
              <ProtectedRoute allowedRoles={['site_supervisor']}>
                <TeamLeaderMonitoring />
              </ProtectedRoute>
            } />
            
            <Route path="/site-supervisor/multi-team-analytics" element={
              <ProtectedRoute allowedRoles={['site_supervisor']}>
                <MultiTeamAnalytics />
              </ProtectedRoute>
            } />
            
            <Route path="/gp-insurer" element={
              <ProtectedRoute allowedRoles={['gp_insurer']}>
                <GPInsurerDashboard />
              </ProtectedRoute>
            } />
            
            <Route path="/team-leader" element={
              <ProtectedRoute allowedRoles={['team_leader']}>
                <TeamLeaderDashboard />
              </ProtectedRoute>
            } />
            
            <Route path="/team-leader/analytics" element={
              <ProtectedRoute allowedRoles={['team_leader']}>
                <TeamAnalytics />
              </ProtectedRoute>
            } />
            
            <Route path="/team-leader/members" element={
              <ProtectedRoute allowedRoles={['team_leader']}>
                <TeamMemberManagement />
              </ProtectedRoute>
            } />
            
            <Route path="/team-leader/work-readiness" element={
              <ProtectedRoute allowedRoles={['team_leader']}>
                <WorkReadinessDashboard />
              </ProtectedRoute>
            } />
            
            <Route path="/team-leader/assignments" element={
              <ProtectedRoute allowedRoles={['team_leader']}>
                <WorkReadinessAssignments />
              </ProtectedRoute>
            } />
            
            <Route path="/team-leader/assessment-logs" element={
              <ProtectedRoute allowedRoles={['team_leader']}>
                <AssessmentLogs />
              </ProtectedRoute>
            } />
            
            {/* Common routes */}
            <Route path="/cases" element={
              <ProtectedRoute>
                <Cases />
              </ProtectedRoute>
            } />
            
            <Route path="/cases/:id" element={
              <ProtectedRoute>
                <CaseDetails />
              </ProtectedRoute>
            } />
            
            <Route path="/check-ins" element={
              <ProtectedRoute allowedRoles={['clinician', 'case_manager', 'admin']}>
                <CheckInsPage />
              </ProtectedRoute>
            } />
            
            <Route path="/appointments" element={
              <ProtectedRoute>
                <Appointments />
              </ProtectedRoute>
            } />
            
            <Route path="/users" element={
              <ProtectedRoute allowedRoles={['admin', 'case_manager']}>
                <Users />
              </ProtectedRoute>
            } />
            
            <Route path="/profile" element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            } />
            
            <Route path="/notifications" element={
              <ProtectedRoute>
                <Notifications />
              </ProtectedRoute>
            } />
            
            <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </Router>
        </ReduxProvider>
      </AuthProvider>
    </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;