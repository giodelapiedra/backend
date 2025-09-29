import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../utils/api';
import LoadingSpinner from '../../components/LoadingSpinner';
import Toast from '../../components/Toast';
import LayoutWithSidebar from '../../components/LayoutWithSidebar';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  BarElement,
  Filler
} from 'chart.js';
import { Line, Pie, Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  BarElement,
  Filler
);

// Custom gradient plugin
const gradientPlugin = {
  id: 'gradient',
  beforeDraw: (chart: any) => {
    const { ctx, chartArea } = chart;
    if (!chartArea) return;

    const dataset = chart.data.datasets[0];
    if (!dataset || !dataset.fill) return;

    const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
    gradient.addColorStop(0, 'rgba(147, 51, 234, 0.4)');
    gradient.addColorStop(0.5, 'rgba(147, 51, 234, 0.2)');
    gradient.addColorStop(1, 'rgba(147, 51, 234, 0.05)');
    
    dataset.backgroundColor = gradient;
  }
};

// Register the plugin
ChartJS.register(gradientPlugin);

interface AnalyticsData {
  teamLeader: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    team: string;
    managedTeams: string[];
  };
  analytics: {
    totalTeamMembers: number;
    activeTeamMembers: number;
      workReadinessStats: {
        total: number;
        completed: number;
        pending: number;
        notStarted?: number;
        completedPercentage: number;
        pendingPercentage: number;
        notStartedPercentage: number;
        byStatus: any[];
        monthlyAssessments: any[];
      };
      todayWorkReadinessStats: {
        completed: number;
        total: number;
      };
    loginStats: {
      todayLogins: number;
      weeklyLogins: number;
      monthlyLogins: number;
      dailyBreakdown?: Array<{
        date: string;
        count: number;
      }>;
    };
    teamPerformance: Array<{
    memberName: string;
      email: string;
      role: string;
      team: string;
      lastLogin: string;
      isActive: boolean;
      workReadinessStatus: string;
      activityLevel: number;
      loggedInToday: boolean;
      recentCheckIns: number;
      recentAssessments: number;
      completedAssessments: number;
    }>;
    readinessTrendData: Array<{
      date: string;
      notFitForWork: number;
      minorConcernsFitForWork: number;
    }>;
    complianceRate: number;
    activityRate: number;
  };
}

const TeamAnalytics: React.FC = () => {
  const { user } = useAuth();
  
  // Add CSS for spinner animation
  React.useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      if (document.head.contains(style)) {
        document.head.removeChild(style);
      }
    };
  }, []);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [readinessChartLoading, setReadinessChartLoading] = useState(false);
  const [readinessModalOpen, setReadinessModalOpen] = useState(false);
  const [workReadinessChartLoading, setWorkReadinessChartLoading] = useState(false);
  const [loginChartLoading, setLoginChartLoading] = useState(false);
  // Separate date states for each chart
  const [workReadinessDateRange, setWorkReadinessDateRange] = useState<'week' | 'month' | 'year' | 'custom'>('week');
  const [workReadinessStartDate, setWorkReadinessStartDate] = useState<Date>(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
  const [workReadinessEndDate, setWorkReadinessEndDate] = useState<Date>(new Date());
  
  const [loginDateRange, setLoginDateRange] = useState<'week' | 'month' | 'year' | 'custom'>('week');
  const [loginStartDate, setLoginStartDate] = useState<Date>(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
  const [loginEndDate, setLoginEndDate] = useState<Date>(new Date());
  
  // Readiness Activity chart date filtering states
  const [readinessDateRange, setReadinessDateRange] = useState<'week' | 'month' | 'year' | 'custom'>('month');
  const [readinessStartDate, setReadinessStartDate] = useState<Date>(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
  const [readinessEndDate, setReadinessEndDate] = useState<Date>(new Date());
  
  const [showChartModal, setShowChartModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  useEffect(() => {
    fetchAnalyticsData(); // This will fetch general analytics data
  }, []);

  // Fetch data when work readiness date range changes
  useEffect(() => {
    setWorkReadinessChartLoading(true);
    fetchAnalyticsData('workReadiness').finally(() => {
      setWorkReadinessChartLoading(false);
    });
  }, [workReadinessDateRange, workReadinessStartDate, workReadinessEndDate]);

  // Fetch data when login date range changes
  useEffect(() => {
    setLoginChartLoading(true);
    fetchAnalyticsData('login').finally(() => {
      setLoginChartLoading(false);
    });
  }, [loginDateRange, loginStartDate, loginEndDate]);

  // Fetch data when readiness chart date range changes
  useEffect(() => {
    console.log('Readiness useEffect triggered with:', { readinessDateRange, readinessStartDate, readinessEndDate });
    setReadinessChartLoading(true);
    fetchAnalyticsData('readiness').finally(() => {
      setReadinessChartLoading(false);
    });
  }, [readinessDateRange, readinessStartDate, readinessEndDate]);

  const fetchAnalyticsData = async (chartType?: 'workReadiness' | 'login' | 'readiness') => {
    try {
      console.log('fetchAnalyticsData called with chartType:', chartType);
      
      // Only set main loading for initial load, not for chart-specific updates
      if (!chartType) {
      setLoading(true);
      }
      
      let url = '/team-leader/analytics';
      
      // Add date range parameters based on which chart is being filtered
      const params = new URLSearchParams();
      
      if (chartType === 'workReadiness') {
        if (workReadinessDateRange === 'custom') {
          params.append('startDate', workReadinessStartDate.toISOString());
          params.append('endDate', workReadinessEndDate.toISOString());
        } else {
          params.append('range', workReadinessDateRange);
        }
        console.log('WorkReadiness filter params:', params.toString());
      } else if (chartType === 'login') {
        if (loginDateRange === 'custom') {
          params.append('startDate', loginStartDate.toISOString());
          params.append('endDate', loginEndDate.toISOString());
        } else {
          params.append('range', loginDateRange);
        }
        console.log('Login filter params:', params.toString());
      } else if (chartType === 'readiness') {
        if (readinessDateRange === 'custom') {
          params.append('startDate', readinessStartDate.toISOString());
          params.append('endDate', readinessEndDate.toISOString());
        } else {
          params.append('range', readinessDateRange);
        }
        console.log('Readiness filter params:', params.toString());
      }
      
      const response = await api.get(`${url}?${params.toString()}`);
      setAnalyticsData(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch analytics data');
      setToast({ message: 'Failed to load analytics data', type: 'error' });
    } finally {
      // Only set main loading false for initial load
      if (!chartType) {
      setLoading(false);
      }
    }
  };

  const handleCloseToast = () => {
    setToast(null);
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <LayoutWithSidebar>
        <div className="p-6">
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </LayoutWithSidebar>
    );
  }

  return (
    <LayoutWithSidebar>
      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>
      <div style={{ 
        width: '100%',
        padding: '1rem',
        background: '#f8fafc',
        minHeight: '100vh',
        position: 'relative'
      }}>
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ 
            fontSize: '2rem', 
            fontWeight: 'bold', 
            color: '#1a202c', 
            marginBottom: '0.5rem',
            textShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            Team Analytics
          </h1>
          <p style={{ 
            color: '#4a5568', 
            marginBottom: '0.25rem',
            textShadow: '0 1px 2px rgba(0,0,0,0.05)'
          }}>
            Comprehensive analytics and performance metrics for your team
          </p>
        </div>

        {analyticsData && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Overview Cards */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
              gap: '1.5rem',
              marginBottom: '2rem'
            }}>
              <div style={{
                background: 'rgba(255, 255, 255, 0.25)',
                backdropFilter: 'blur(20px)',
                borderRadius: '1rem',
                padding: '1.5rem',
                boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
                border: '1px solid rgba(255, 255, 255, 0.18)',
                transition: 'all 0.3s ease',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{ 
                    width: '3rem', 
                    height: '3rem', 
                    backgroundColor: 'rgba(59, 130, 246, 0.15)', 
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(59, 130, 246, 0.2)',
                    boxShadow: '0 4px 16px 0 rgba(59, 130, 246, 0.2)', 
                    borderRadius: '0.75rem', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    marginRight: '1rem'
                  }}>
                    <svg width="24" height="24" fill="none" stroke="#3b82f6" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                  <div>
                    <p style={{ fontSize: '0.875rem', fontWeight: '500', color: '#6b7280', margin: '0 0 0.25rem 0' }}>
                      Total Team Members
                    </p>
                    <p style={{ fontSize: '1.875rem', fontWeight: '600', color: '#1f2937', margin: '0' }}>
                      {analyticsData.analytics.totalTeamMembers}
                    </p>
                  </div>
                </div>
              </div>

              <div style={{
                background: 'rgba(255, 255, 255, 0.25)',
                backdropFilter: 'blur(20px)',
                borderRadius: '1rem',
                padding: '1.5rem',
                boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
                border: '1px solid rgba(255, 255, 255, 0.18)',
                transition: 'all 0.3s ease',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{ 
                    width: '3rem', 
                    height: '3rem', 
                    backgroundColor: 'rgba(34, 197, 94, 0.15)', 
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(34, 197, 94, 0.2)',
                    boxShadow: '0 4px 16px 0 rgba(34, 197, 94, 0.2)', 
                    borderRadius: '0.75rem', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    marginRight: '1rem'
                  }}>
                    <svg width="24" height="24" fill="none" stroke="#22c55e" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                  <div>
                    <p style={{ fontSize: '0.875rem', fontWeight: '500', color: '#6b7280', margin: '0 0 0.25rem 0' }}>
                      Active Members
                    </p>
                    <p style={{ fontSize: '1.875rem', fontWeight: '600', color: '#1f2937', margin: '0' }}>
                      {analyticsData.analytics.activeTeamMembers}
                    </p>
                  </div>
                </div>
              </div>

              <div style={{
                background: 'rgba(255, 255, 255, 0.25)',
                backdropFilter: 'blur(20px)',
                borderRadius: '1rem',
                padding: '1.5rem',
                boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
                border: '1px solid rgba(255, 255, 255, 0.18)',
                transition: 'all 0.3s ease',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{ 
                    width: '3rem', 
                    height: '3rem', 
                    backgroundColor: 'rgba(147, 51, 234, 0.15)', 
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(147, 51, 234, 0.2)',
                    boxShadow: '0 4px 16px 0 rgba(147, 51, 234, 0.2)', 
                    borderRadius: '0.75rem', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    marginRight: '1rem'
                  }}>
                    <svg width="24" height="24" fill="none" stroke="#9333ea" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  <div>
                    <p style={{ fontSize: '0.875rem', fontWeight: '500', color: '#6b7280', margin: '0 0 0.25rem 0' }}>
                      Work Readiness Completed
                    </p>
                    <p style={{ fontSize: '1.875rem', fontWeight: '600', color: '#1f2937', margin: '0' }}>
                      {analyticsData.analytics.workReadinessStats.completed}
                    </p>
                  </div>
                </div>
              </div>

              <div style={{
                background: 'rgba(255, 255, 255, 0.25)',
                backdropFilter: 'blur(20px)',
                borderRadius: '1rem',
                padding: '1.5rem',
                boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
                border: '1px solid rgba(255, 255, 255, 0.18)',
                transition: 'all 0.3s ease',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{ 
                    width: '3rem', 
                    height: '3rem', 
                    backgroundColor: 'rgba(249, 115, 22, 0.15)', 
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(249, 115, 22, 0.2)',
                    boxShadow: '0 4px 16px 0 rgba(249, 115, 22, 0.2)', 
                    borderRadius: '0.75rem', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    marginRight: '1rem'
                  }}>
                    <svg width="24" height="24" fill="none" stroke="#f97316" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.875rem', fontWeight: '500', color: '#6b7280', margin: '0 0 0.25rem 0' }}>
                      Compliance Rate
                    </p>
                    <p style={{ fontSize: '1.875rem', fontWeight: '600', color: '#1f2937', margin: '0' }}>
                      {analyticsData.analytics.complianceRate}%
                    </p>
                  </div>
                  </div>
                </div>
              </div>

            {/* Date Filter Controls */}
            <div style={{
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(10px)',
              borderRadius: '1rem',
              padding: '1.5rem',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              marginBottom: '1.5rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {['week', 'month', 'year', 'custom'].map((range) => (
                    <button
                      key={range}
                      onClick={() => setWorkReadinessDateRange(range as any)}
                      style={{
                        padding: '0.5rem 1rem',
                        borderRadius: '0.5rem',
                        border: '1px solid rgba(0, 0, 0, 0.1)',
                        backgroundColor: workReadinessDateRange === range ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                        color: workReadinessDateRange === range ? '#3b82f6' : '#6b7280',
                        fontWeight: workReadinessDateRange === range ? 600 : 500,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {range.charAt(0).toUpperCase() + range.slice(1)}
                    </button>
                  ))}
                </div>
                {workReadinessDateRange === 'custom' && (
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input
                      type="date"
                      value={workReadinessStartDate.toISOString().split('T')[0]}
                      onChange={(e) => setWorkReadinessStartDate(new Date(e.target.value))}
                      style={{
                        padding: '0.5rem',
                        borderRadius: '0.5rem',
                        border: '1px solid rgba(0, 0, 0, 0.1)',
                        backgroundColor: 'transparent'
                      }}
                    />
                    <span style={{ color: '#6b7280' }}>to</span>
                    <input
                      type="date"
                      value={workReadinessEndDate.toISOString().split('T')[0]}
                      onChange={(e) => setWorkReadinessEndDate(new Date(e.target.value))}
                      style={{
                        padding: '0.5rem',
                        borderRadius: '0.5rem',
                        border: '1px solid rgba(0, 0, 0, 0.1)',
                        backgroundColor: 'transparent'
                      }}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Charts Section */}
            <div style={{ 
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '1.5rem',
              marginBottom: '2rem'
            }}>
              {/* Work Readiness Distribution Pie Chart */}
              <div 
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  backdropFilter: 'blur(10px)',
                  borderRadius: '1rem',
                  padding: '2rem',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  cursor: 'pointer',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                }}
                onClick={() => setShowChartModal(true)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.02)';
                  e.currentTarget.style.boxShadow = '0 8px 12px -1px rgba(0, 0, 0, 0.15), 0 4px 6px -1px rgba(0, 0, 0, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
                }}
              >
                <h3 style={{ 
                  fontSize: '1.25rem', 
                  fontWeight: '600', 
                  color: '#1f2937',
                  marginBottom: '1rem',
                  textAlign: 'center'
                }}>
                  Work Readiness Distribution
                </h3>
                <div style={{ 
                  fontSize: '0.875rem', 
                  color: '#6b7280',
                  textAlign: 'center',
                  marginBottom: '1rem'
                }}>
                  Total: {analyticsData.analytics.workReadinessStats.total || 0} | 
                  Completed: {analyticsData.analytics.workReadinessStats.completed || 0} | 
                  Pending: {analyticsData.analytics.workReadinessStats.pending || 0} | 
                  Not Started: {analyticsData.analytics.workReadinessStats.notStarted || ((analyticsData.analytics.workReadinessStats.total || 0) - ((analyticsData.analytics.workReadinessStats.completed || 0) + (analyticsData.analytics.workReadinessStats.pending || 0)))}
                </div>
                  <div style={{ height: '300px', position: 'relative' }}>
                    {(() => {
                      const completed = analyticsData.analytics.workReadinessStats.completed || 0;
                      const pending = analyticsData.analytics.workReadinessStats.pending || 0;
                      const notStarted = analyticsData.analytics.workReadinessStats.notStarted || 
                        ((analyticsData.analytics.workReadinessStats.total || 0) - 
                         ((analyticsData.analytics.workReadinessStats.completed || 0) + 
                          (analyticsData.analytics.workReadinessStats.pending || 0)));
                      
                      const total = completed + pending + notStarted;
                      
                      // If no data, show empty state
                      if (total === 0) {
                        return (
                          <div style={{
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#6b7280'
                          }}>
                            <div style={{
                              width: '120px',
                              height: '120px',
                              borderRadius: '50%',
                              backgroundColor: 'rgba(107, 114, 128, 0.1)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              marginBottom: '0.5rem'
                            }}>
                              <svg width="40" height="40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                              </svg>
                            </div>
                            <p style={{ fontSize: '0.875rem', textAlign: 'center', margin: 0 }}>
                              No data for selected period
                            </p>
                          </div>
                        );
                      }
                      
                      return (
                        <Pie
                          data={{
                            labels: ['Completed', 'Pending', 'Not Started'],
                            datasets: [{
                              data: [completed, pending, notStarted],
                              backgroundColor: [
                                'rgba(34, 197, 94, 0.8)', // Green for completed
                                'rgba(245, 158, 11, 0.8)', // Orange for pending
                                'rgba(239, 68, 68, 0.8)' // Red for not started
                              ],
                              borderColor: [
                                'rgba(34, 197, 94, 1)',
                                'rgba(245, 158, 11, 1)',
                                'rgba(239, 68, 68, 1)' // Red border for not started
                              ],
                              borderWidth: 1,
                              hoverOffset: 4
                            }]
                          }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            position: 'bottom',
                            labels: {
                              padding: 20,
                              font: {
                                size: 12,
                                weight: 500
                              },
                              usePointStyle: true,
                              pointStyle: 'circle'
                            }
                          },
                          tooltip: {
                            callbacks: {
                              label: function(context) {
                                const label = context.label || '';
                                const value = context.raw || 0;
                                const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
                                const percentage = ((value as number / total) * 100).toFixed(1);
                                return `${label}: ${value} (${percentage}%)`;
                              }
                            }
                          }
                        },
                        animation: {
                          animateScale: true,
                          animateRotate: true
                        }
                      }}
                    />
                  );
                })()}
                  </div>
                </div>

              {/* Login Activity Line Chart */}
              <div 
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  backdropFilter: 'blur(10px)',
                  borderRadius: '1rem',
                  padding: '2rem',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  cursor: 'pointer',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                }}
                onClick={() => setShowLoginModal(true)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.02)';
                  e.currentTarget.style.boxShadow = '0 8px 12px -1px rgba(0, 0, 0, 0.15), 0 4px 6px -1px rgba(0, 0, 0, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
                }}
              >
                <h3 style={{ 
                  fontSize: '1.25rem', 
                  fontWeight: '600', 
                  color: '#1f2937',
                  marginBottom: '1.5rem',
                  textAlign: 'center'
                }}>
                  Login Activity Trends
                </h3>
                <div style={{ height: '300px', position: 'relative' }}>
                  {(() => {
                    const todayLogins = analyticsData.analytics.loginStats.todayLogins || 0;
                    const weeklyLogins = analyticsData.analytics.loginStats.weeklyLogins || 0;
                    const monthlyLogins = analyticsData.analytics.loginStats.monthlyLogins || 0;
                    const dailyBreakdown = analyticsData.analytics.loginStats.dailyBreakdown || [];
                    
                    const total = todayLogins + weeklyLogins + monthlyLogins;
                    
                    // If no data for selected date range, show empty state
                    if (total === 0) {
                      return (
                        <div style={{
                          height: '100%',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#6b7280'
                        }}>
                          <div style={{
                            width: '150px',
                            height: '150px',
                            borderRadius: '50%',
                            backgroundColor: 'rgba(107, 114, 128, 0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: '1rem'
                          }}>
                            <svg width="60" height="60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                          </div>
                          <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                            No Login Data Available
                          </h3>
                          <p style={{ fontSize: '0.875rem', textAlign: 'center' }}>
                            No login activity found for the selected date range.
                          </p>
                        </div>
                      );
                    }
                    
                    return (
                      <Line
                        data={{
                          labels: dailyBreakdown.length > 0 
                            ? dailyBreakdown.map(item => new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }))
                            : ['No Data'],
                          datasets: [{
                            label: 'Daily Login Count',
                            data: dailyBreakdown.length > 0
                              ? dailyBreakdown.map(item => item.count)
                              : [0],
                            borderColor: 'rgba(147, 51, 234, 1)',
                            backgroundColor: 'rgba(147, 51, 234, 0.15)',
                            fill: true,
                            tension: 0.4,
                            pointBackgroundColor: 'rgba(147, 51, 234, 1)',
                            pointBorderColor: '#ffffff',
                            pointBorderWidth: 3,
                            pointRadius: 8,
                            pointHoverRadius: 10,
                            pointHoverBackgroundColor: 'rgba(147, 51, 234, 1)',
                            pointHoverBorderColor: '#ffffff',
                            pointHoverBorderWidth: 4
                          }]
                        }}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: {
                              position: 'top',
                              labels: {
                                font: {
                                  size: 12,
                                  weight: 500
                                }
                              }
                            }
                          },
                          scales: {
                            y: {
                              beginAtZero: true,
                              ticks: {
                                stepSize: 1
                              }
                            }
                          }
                        }}
                      />
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* Team Performance Bar Chart */}
            <div style={{
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(10px)',
              borderRadius: '1rem',
              padding: '2rem',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              marginBottom: '2rem'
            }}>
              <h3 style={{ 
                fontSize: '1.25rem', 
                fontWeight: '600', 
                color: '#1f2937',
                marginBottom: '1.5rem',
                textAlign: 'center'
              }}>
                Team Performance Overview
              </h3>
              <div style={{ height: '300px', position: 'relative' }}>
                <Bar
                  data={{
                    labels: analyticsData.analytics.teamPerformance.map((member: any) => 
                      member.memberName || member.workerName || 'Unknown'
                    ).slice(0, 5),
                    datasets: [{
                      label: 'Activity Level',
                      data: analyticsData.analytics.teamPerformance.map((member: any) => 
                        member.activityLevel || 0
                      ).slice(0, 5),
                      backgroundColor: 'rgba(59, 130, 246, 0.8)',
                      borderColor: 'rgba(59, 130, 246, 1)',
                      borderWidth: 1
                    }]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        display: false
                      }
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                          callback: (value) => `${value}%`
                        }
                      }
                    }
                  }}
                />
              </div>
            </div>

            {/* Work Readiness Activity Chart */}
            <div style={{
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(10px)',
              borderRadius: '1rem',
              padding: '1.5rem',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              marginBottom: '2rem'
            }}>
         <div style={{ 
           display: 'flex', 
           justifyContent: 'space-between', 
           alignItems: 'center',
           marginBottom: '1.5rem'
         }}>
           <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
             <h3 style={{ 
               fontSize: '1.25rem', 
               fontWeight: '600', 
               color: '#1f2937',
               margin: '0'
             }}>
               Activity
             </h3>
             <button
               onClick={() => setReadinessModalOpen(true)}
               style={{
                 padding: '0.5rem',
                 borderRadius: '0.5rem',
                 border: '1px solid #d1d5db',
                 backgroundColor: 'white',
                 color: '#6b7280',
                 cursor: 'pointer',
                 display: 'flex',
                 alignItems: 'center',
                 gap: '0.25rem',
                 fontSize: '0.875rem',
                 transition: 'all 0.2s ease',
                 boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
               }}
               onMouseEnter={(e) => {
                 e.currentTarget.style.backgroundColor = '#f9fafb';
                 e.currentTarget.style.borderColor = '#9ca3af';
                 e.currentTarget.style.color = '#374151';
               }}
               onMouseLeave={(e) => {
                 e.currentTarget.style.backgroundColor = 'white';
                 e.currentTarget.style.borderColor = '#d1d5db';
                 e.currentTarget.style.color = '#6b7280';
               }}
             >
               <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                 <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
               </svg>
               Expand
             </button>
           </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  {/* Legend */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{
                      width: '12px',
                      height: '12px',
                      borderRadius: '50%',
                      backgroundColor: '#9333ea'
                    }}></div>
                    <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Not Fit for Work</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{
                      width: '12px',
                      height: '12px',
                      borderRadius: '50%',
                      backgroundColor: '#3b82f6'
                    }}></div>
                    <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Minor Concerns Fit for Work</span>
                  </div>
                  {/* Time Filter Dropdown */}
                  <select 
                    value={readinessDateRange}
                    onChange={(e) => {
                      console.log('Readiness filter changed to:', e.target.value);
                      setReadinessDateRange(e.target.value as 'week' | 'month' | 'year' | 'custom');
                    }}
                    disabled={readinessChartLoading}
                    style={{
                      padding: '0.5rem 1rem',
                      borderRadius: '0.5rem',
                      border: '1px solid #d1d5db',
                      backgroundColor: readinessChartLoading ? '#f9fafb' : 'white',
                      fontSize: '0.875rem',
                      color: readinessChartLoading ? '#9ca3af' : '#374151',
                      cursor: readinessChartLoading ? 'not-allowed' : 'pointer',
                      opacity: readinessChartLoading ? 0.7 : 1
                    }}
                  >
                    <option value="week">This Week</option>
                    <option value="month">This Month</option>
                    <option value="year">This Year</option>
                    <option value="custom">Custom Range</option>
                  </select>
                  
                  {/* Custom Date Range Inputs */}
                  {readinessDateRange === 'custom' && (
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.5rem' }}>
                      <input
                        type="date"
                        value={readinessStartDate.toISOString().split('T')[0]}
                        onChange={(e) => setReadinessStartDate(new Date(e.target.value))}
                        style={{
                          padding: '0.5rem',
                          borderRadius: '0.375rem',
                          border: '1px solid #d1d5db',
                          fontSize: '0.875rem',
                          backgroundColor: 'white'
                        }}
                      />
                      <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>to</span>
                      <input
                        type="date"
                        value={readinessEndDate.toISOString().split('T')[0]}
                        onChange={(e) => setReadinessEndDate(new Date(e.target.value))}
                        style={{
                          padding: '0.5rem',
                          borderRadius: '0.375rem',
                          border: '1px solid #d1d5db',
                          fontSize: '0.875rem',
                          backgroundColor: 'white'
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
              
              <div style={{ height: '300px', position: 'relative' }}>
                {readinessChartLoading ? (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    color: '#6b7280'
                  }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      border: '3px solid #e5e7eb',
                      borderTop: '3px solid #3b82f6',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite',
                      marginBottom: '1rem'
                    }}></div>
                    <p style={{ fontSize: '0.875rem', margin: '0' }}>
                      Updating chart data...
                    </p>
                  </div>
                ) : (() => {
                  console.log('Readiness Trend Data:', analyticsData.analytics.readinessTrendData);
                  console.log('Data length:', analyticsData.analytics.readinessTrendData?.length);
                  console.log('Data exists check:', !!analyticsData.analytics.readinessTrendData);
                  console.log('Length > 0 check:', analyticsData.analytics.readinessTrendData?.length > 0);
                  
                  if (analyticsData.analytics.readinessTrendData && analyticsData.analytics.readinessTrendData.length > 0) {
                    console.log('First few data points:', analyticsData.analytics.readinessTrendData.slice(0, 3));
                  }
                  
                  // More robust check for data
                  const hasData = analyticsData.analytics.readinessTrendData && 
                                Array.isArray(analyticsData.analytics.readinessTrendData) && 
                                analyticsData.analytics.readinessTrendData.length > 0;
                  
                  console.log('Final hasData check:', hasData);
                  
                  return hasData ? (
                  <Line
                    data={{
                      labels: analyticsData.analytics.readinessTrendData.map(item => 
                        new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                      ),
                      datasets: [
                        {
                          label: 'Not Fit for Work',
                          data: analyticsData.analytics.readinessTrendData.map(item => item.notFitForWork),
                          borderColor: 'rgba(147, 51, 234, 1)',
                          backgroundColor: 'rgba(147, 51, 234, 0.1)',
                          fill: true,
                          tension: 0.4,
                          pointBackgroundColor: 'rgba(147, 51, 234, 1)',
                          pointBorderColor: 'rgba(147, 51, 234, 1)',
                          pointRadius: 3,
                          pointHoverRadius: 6,
                          pointHoverBackgroundColor: 'rgba(147, 51, 234, 1)',
                          pointHoverBorderColor: 'rgba(147, 51, 234, 1)',
                          pointHoverBorderWidth: 2,
                          borderWidth: 2
                        },
                        {
                          label: 'Minor Concerns Fit for Work',
                          data: analyticsData.analytics.readinessTrendData.map(item => item.minorConcernsFitForWork),
                          borderColor: 'rgba(59, 130, 246, 1)',
                          backgroundColor: 'rgba(59, 130, 246, 0.1)',
                          fill: true,
                          tension: 0.4,
                          pointBackgroundColor: 'rgba(59, 130, 246, 1)',
                          pointBorderColor: 'rgba(59, 130, 246, 1)',
                          pointRadius: 3,
                          pointHoverRadius: 6,
                          pointHoverBackgroundColor: 'rgba(59, 130, 246, 1)',
                          pointHoverBorderColor: 'rgba(59, 130, 246, 1)',
                          pointHoverBorderWidth: 2,
                          borderWidth: 2
                        }
                      ]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          display: false // We have custom legend above
                        },
                        tooltip: {
                          backgroundColor: 'rgba(0, 0, 0, 0.8)',
                          titleColor: 'white',
                          bodyColor: 'white',
                          borderColor: 'rgba(255, 255, 255, 0.1)',
                          borderWidth: 1,
                          cornerRadius: 8,
                          displayColors: true,
                          callbacks: {
                            title: function(context) {
                              return new Date(context[0].label).toLocaleDateString('en-US', { 
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              });
                            },
                            label: function(context) {
                              return `${context.dataset.label}: ${context.parsed.y} assessment${context.parsed.y !== 1 ? 's' : ''}`;
                            }
                          }
                        }
                      },
                      scales: {
                        x: {
                          grid: {
                            display: true,
                            color: 'rgba(0, 0, 0, 0.05)',
                            drawTicks: false
                          },
                          ticks: {
                            color: '#6b7280',
                            font: {
                              size: 11
                            },
                            maxTicksLimit: 8
                          }
                        },
                        y: {
                          beginAtZero: true,
                          grid: {
                            display: true,
                            color: 'rgba(0, 0, 0, 0.05)',
                            drawTicks: false
                          },
                          ticks: {
                            color: '#6b7280',
                            font: {
                              size: 11
                            },
                            stepSize: 1,
                            callback: function(value) {
                              return value === 0 ? '0' : value;
                            }
                          }
                        }
                      },
                      interaction: {
                        intersect: false,
                        mode: 'index'
                      },
                      elements: {
                        point: {
                          radius: 3,
                          hoverRadius: 6
                        },
                        line: {
                          borderWidth: 2
                        }
                      }
                    }}
                  />
                ) : (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    color: '#9ca3af'
                  }}>
                    <svg width="48" height="48" fill="currentColor" viewBox="0 0 24 24" style={{ marginBottom: '1rem', opacity: 0.5 }}>
                      <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                    </svg>
                    <p style={{ fontSize: '1rem', fontWeight: '500', margin: '0 0 0.5rem 0' }}>
                      No Readiness Data Available
                    </p>
                    <p style={{ fontSize: '0.875rem', margin: '0' }}>
                      Work readiness assessments will appear here
                    </p>
                  </div>
                );
                })()}
              </div>
            </div>

            {/* Additional Analytics Cards */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', 
              gap: '1.5rem',
              marginBottom: '2rem'
            }}>
              <div style={{
                background: 'rgba(255, 255, 255, 0.25)',
                backdropFilter: 'blur(20px)',
                borderRadius: '1rem',
                padding: '1.5rem',
                boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
                border: '1px solid rgba(255, 255, 255, 0.18)',
                transition: 'all 0.3s ease',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{ 
                    width: '3rem', 
                    height: '3rem', 
                    backgroundColor: 'rgba(59, 130, 246, 0.15)', 
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(59, 130, 246, 0.2)',
                    boxShadow: '0 4px 16px 0 rgba(59, 130, 246, 0.2)', 
                    borderRadius: '0.75rem', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    marginRight: '1rem'
                  }}>
                    <svg width="24" height="24" fill="none" stroke="#3b82f6" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  <div>
                    <p style={{ fontSize: '0.875rem', fontWeight: '500', color: '#6b7280', margin: '0 0 0.25rem 0' }}>
                      Today's Logins
                    </p>
                    <p style={{ fontSize: '1.875rem', fontWeight: '600', color: '#1f2937', margin: '0' }}>
                      {analyticsData.analytics.loginStats.todayLogins}
                    </p>
                  </div>
                  </div>
                </div>

              <div style={{
                background: 'rgba(255, 255, 255, 0.25)',
                backdropFilter: 'blur(20px)',
                borderRadius: '1rem',
                padding: '1.5rem',
                boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
                border: '1px solid rgba(255, 255, 255, 0.18)',
                transition: 'all 0.3s ease',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{ 
                    width: '3rem', 
                    height: '3rem', 
                    backgroundColor: 'rgba(34, 197, 94, 0.15)', 
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(34, 197, 94, 0.2)',
                    boxShadow: '0 4px 16px 0 rgba(34, 197, 94, 0.2)', 
                    borderRadius: '0.75rem', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    marginRight: '1rem'
                  }}>
                    <svg width="24" height="24" fill="none" stroke="#22c55e" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.875rem', fontWeight: '500', color: '#6b7280', margin: '0 0 0.25rem 0' }}>
                      Activity Rate
                    </p>
                    <p style={{ fontSize: '1.875rem', fontWeight: '600', color: '#1f2937', margin: '0' }}>
                      {analyticsData.analytics.activityRate}%
                    </p>
                  </div>
              </div>
            </div>

              <div style={{
                background: 'rgba(255, 255, 255, 0.25)',
                backdropFilter: 'blur(20px)',
                borderRadius: '1rem',
                padding: '1.5rem',
                boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
                border: '1px solid rgba(255, 255, 255, 0.18)',
                transition: 'all 0.3s ease',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{ 
                    width: '3rem', 
                    height: '3rem', 
                    backgroundColor: 'rgba(147, 51, 234, 0.15)', 
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(147, 51, 234, 0.2)',
                    boxShadow: '0 4px 16px 0 rgba(147, 51, 234, 0.2)', 
                    borderRadius: '0.75rem', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    marginRight: '1rem'
                  }}>
                    <svg width="24" height="24" fill="none" stroke="#9333ea" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
              </div>
                  <div>
                    <p style={{ fontSize: '0.875rem', fontWeight: '500', color: '#6b7280', margin: '0 0 0.25rem 0' }}>
                      Pending Assessments
                    </p>
                    <p style={{ fontSize: '1.875rem', fontWeight: '600', color: '#1f2937', margin: '0' }}>
                      {analyticsData.analytics.workReadinessStats.pending}
                    </p>
                    <p style={{ fontSize: '0.75rem', fontWeight: '500', color: '#f59e0b', margin: '0.25rem 0 0 0' }}>
                      {analyticsData.analytics.workReadinessStats.pendingPercentage}% of team
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Charts Section - Full Width */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '2fr 1fr', 
              gap: '1.5rem',
              marginBottom: '2rem'
            }}>
              {/* Team Performance Table - Takes 2/3 of space */}
              <div style={{
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                backdropFilter: 'blur(10px)',
                borderRadius: '1rem',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                overflow: 'hidden'
              }}>
                <div style={{ 
                  padding: '1.5rem', 
                  borderBottom: '1px solid rgba(229, 231, 235, 0.5)' 
                }}>
                  <h3 style={{ 
                    fontSize: '1.25rem', 
                    fontWeight: '600', 
                    color: '#1f2937',
                    margin: '0'
                  }}>
                    Team Performance Overview
                  </h3>
                </div>
                <div style={{ overflowX: 'auto', maxHeight: '500px' }}>
                  <table style={{ 
                    width: '100%', 
                    borderCollapse: 'collapse',
                    minWidth: '600px'
                  }}>
                    <thead style={{ backgroundColor: 'rgba(249, 250, 251, 0.8)', position: 'sticky', top: 0 }}>
                      <tr>
                        <th style={{ 
                          padding: '1rem 1.5rem', 
                          textAlign: 'left', 
                          fontSize: '0.875rem', 
                          fontWeight: '600', 
                          color: '#374151', 
                          textTransform: 'uppercase', 
                          letterSpacing: '0.05em',
                          borderBottom: '1px solid rgba(229, 231, 235, 0.5)'
                        }}>
                        Team Member
                      </th>
                        <th style={{ 
                          padding: '1rem 1.5rem', 
                          textAlign: 'left', 
                          fontSize: '0.875rem', 
                          fontWeight: '600', 
                          color: '#374151', 
                          textTransform: 'uppercase', 
                          letterSpacing: '0.05em',
                          borderBottom: '1px solid rgba(229, 231, 235, 0.5)'
                        }}>
                          Work Readiness Status
                      </th>
                        <th style={{ 
                          padding: '1rem 1.5rem', 
                          textAlign: 'left', 
                          fontSize: '0.875rem', 
                          fontWeight: '600', 
                          color: '#374151', 
                          textTransform: 'uppercase', 
                          letterSpacing: '0.05em',
                          borderBottom: '1px solid rgba(229, 231, 235, 0.5)'
                        }}>
                          Last Login
                      </th>
                        <th style={{ 
                          padding: '1rem 1.5rem', 
                          textAlign: 'left', 
                          fontSize: '0.875rem', 
                          fontWeight: '600', 
                          color: '#374151', 
                          textTransform: 'uppercase', 
                          letterSpacing: '0.05em',
                          borderBottom: '1px solid rgba(229, 231, 235, 0.5)'
                        }}>
                          Activity Level
                      </th>
                    </tr>
                  </thead>
                    <tbody>
                      {analyticsData.analytics.teamPerformance && analyticsData.analytics.teamPerformance.length > 0 ? (
                        analyticsData.analytics.teamPerformance.map((member: any, index: number) => (
                          <tr key={member.memberId || index} style={{ 
                            borderBottom: '1px solid rgba(229, 231, 235, 0.3)',
                            backgroundColor: index % 2 === 0 ? 'rgba(255, 255, 255, 0.5)' : 'rgba(249, 250, 251, 0.3)'
                          }}>
                            <td style={{ 
                              padding: '1.25rem 1.5rem', 
                              fontSize: '0.875rem', 
                              fontWeight: '500', 
                              color: '#1f2937'
                            }}>
                              {member.memberName || member.workerName || 'Unknown Member'}
                        </td>
                            <td style={{ padding: '1.25rem 1.5rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center' }}>
                                <div style={{ 
                                  width: '10px', 
                                  height: '10px', 
                                  borderRadius: '50%', 
                                  backgroundColor: member.workReadinessStatus === 'Completed' ? '#22c55e' : 
                                                 member.workReadinessStatus === 'In Progress' ? '#f59e0b' : 
                                                 member.workReadinessStatus === 'Pending' ? '#3b82f6' : '#6b7280',
                                  marginRight: '0.75rem'
                                }}></div>
                                <span style={{ 
                                  fontSize: '0.875rem', 
                                  color: member.workReadinessStatus === 'Completed' ? '#059669' : 
                                         member.workReadinessStatus === 'In Progress' ? '#d97706' : 
                                         member.workReadinessStatus === 'Pending' ? '#2563eb' : '#6b7280',
                                  textTransform: 'capitalize',
                                  fontWeight: '500'
                                }}>
                                  {member.workReadinessStatus || 'Not Started'}
                                </span>
                              </div>
                        </td>
                            <td style={{ 
                              padding: '1.25rem 1.5rem', 
                              fontSize: '0.875rem', 
                              color: '#6b7280',
                              fontWeight: '500'
                            }}>
                              {member.lastLogin ? new Date(member.lastLogin).toLocaleDateString() : 'Never'}
                        </td>
                            <td style={{ padding: '1.25rem 1.5rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center' }}>
                                <div style={{ 
                                  width: '80px', 
                                  backgroundColor: 'rgba(229, 231, 235, 0.5)', 
                                  borderRadius: '9999px', 
                                  height: '10px', 
                                  marginRight: '0.75rem',
                                  overflow: 'hidden'
                                }}>
                                  <div 
                                    style={{ 
                                      backgroundColor: member.activityLevel >= 70 ? '#22c55e' : 
                                                      member.activityLevel >= 40 ? '#f59e0b' : '#ef4444', 
                                      height: '100%', 
                                      borderRadius: '9999px',
                                      width: `${member.activityLevel || 0}%`,
                                      transition: 'width 0.3s ease'
                                    }}
                              ></div>
                            </div>
                                <span style={{ 
                                  fontSize: '0.875rem', 
                                  color: member.activityLevel >= 70 ? '#059669' : 
                                         member.activityLevel >= 40 ? '#d97706' : '#dc2626',
                                  fontWeight: '600'
                                }}>
                                  {member.activityLevel || 0}%
                                </span>
                          </div>
                        </td>
                      </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} style={{ 
                            padding: '3rem 1.5rem', 
                            textAlign: 'center', 
                            color: '#6b7280',
                            fontSize: '1rem',
                            fontWeight: '500'
                          }}>
                            No team performance data available
                          </td>
                        </tr>
                      )}
                  </tbody>
                </table>
                </div>
              </div>

              {/* Work Readiness Progress Chart - Takes 1/3 of space */}
              <div style={{
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                backdropFilter: 'blur(10px)',
                borderRadius: '1rem',
                padding: '1.5rem',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                height: 'fit-content'
              }}>
                <h3 style={{ 
                  fontSize: '1.25rem', 
                  fontWeight: '600', 
                  color: '#1f2937',
                  margin: '0 0 1.5rem 0'
                }}>
                  Work Readiness Progress
                </h3>
                
                {/* Progress Bars */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      marginBottom: '0.75rem'
                    }}>
                      <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#1f2937' }}>
                        Completed Assessments
                      </span>
                      <span style={{ fontSize: '0.875rem', fontWeight: '700', color: '#22c55e' }}>
                        {analyticsData.analytics.todayWorkReadinessStats.completed} / {analyticsData.analytics.todayWorkReadinessStats.total}
                      </span>
                    </div>
                    <div style={{ 
                      width: '100%', 
                      backgroundColor: 'rgba(229, 231, 235, 0.5)', 
                      borderRadius: '9999px', 
                      height: '16px',
                      overflow: 'hidden'
                    }}>
                      <div style={{ 
                        backgroundColor: '#22c55e', 
                        height: '100%', 
                        borderRadius: '9999px',
                        width: `${analyticsData.analytics.todayWorkReadinessStats.total > 0 ? 
                          (analyticsData.analytics.todayWorkReadinessStats.completed / analyticsData.analytics.todayWorkReadinessStats.total) * 100 : 0}%`,
                        transition: 'width 0.5s ease'
                      }}></div>
                    </div>
                  </div>

                  <div>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      marginBottom: '0.75rem'
                    }}>
                      <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#1f2937' }}>
                        Pending Assessments
                      </span>
                      <span style={{ fontSize: '0.875rem', fontWeight: '700', color: '#f59e0b' }}>
                        {analyticsData.analytics.workReadinessStats.pending} ({analyticsData.analytics.workReadinessStats.pendingPercentage}%)
                      </span>
                    </div>
                    <div style={{ 
                      width: '100%', 
                      backgroundColor: 'rgba(229, 231, 235, 0.5)', 
                      borderRadius: '9999px', 
                      height: '16px',
                      overflow: 'hidden'
                    }}>
                      <div style={{ 
                        backgroundColor: '#f59e0b', 
                        height: '100%', 
                        borderRadius: '9999px',
                        width: `${analyticsData.analytics.workReadinessStats.total > 0 ? 
                          (analyticsData.analytics.workReadinessStats.pending / analyticsData.analytics.workReadinessStats.total) * 100 : 0}%`,
                        transition: 'width 0.5s ease'
                      }}></div>
                    </div>
                  </div>

                  <div>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      marginBottom: '0.75rem'
                    }}>
                      <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#1f2937' }}>
                        Overall Completion Rate
                      </span>
                      <span style={{ fontSize: '0.875rem', fontWeight: '700', color: '#3b82f6' }}>
                        {analyticsData.analytics.workReadinessStats.total > 0 ? 
                          Math.round((analyticsData.analytics.workReadinessStats.completed / analyticsData.analytics.workReadinessStats.total) * 100) : 0}%
                      </span>
                    </div>
                    <div style={{ 
                      width: '100%', 
                      backgroundColor: 'rgba(229, 231, 235, 0.5)', 
                      borderRadius: '9999px', 
                      height: '16px',
                      overflow: 'hidden'
                    }}>
                      <div style={{ 
                        backgroundColor: '#3b82f6', 
                        height: '100%', 
                        borderRadius: '9999px',
                        width: `${analyticsData.analytics.workReadinessStats.total > 0 ? 
                          (analyticsData.analytics.workReadinessStats.completed / analyticsData.analytics.workReadinessStats.total) * 100 : 0}%`,
                        transition: 'width 0.5s ease'
                      }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Login Activity Chart - Full Width */}
            <div style={{
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(10px)',
              borderRadius: '1rem',
              padding: '2rem',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.2)'
            }}>
              <h3 style={{ 
                fontSize: '1.5rem', 
                fontWeight: '600', 
                color: '#1f2937',
                margin: '0 0 2rem 0'
              }}>
                Login Activity Overview
              </h3>
              
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
                gap: '1.5rem' 
              }}>
                <div style={{
                  backgroundColor: 'rgba(59, 130, 246, 0.1)',
                  borderRadius: '1rem',
                  padding: '2rem',
                  textAlign: 'center',
                  border: '2px solid rgba(59, 130, 246, 0.2)'
                }}>
                  <div style={{ fontSize: '3rem', fontWeight: '700', color: '#3b82f6', marginBottom: '1rem' }}>
                    {analyticsData.analytics.loginStats.todayLogins}
                  </div>
                  <div style={{ fontSize: '1rem', color: '#6b7280', fontWeight: '600' }}>
                    Today's Logins
                  </div>
                </div>

                <div style={{
                  backgroundColor: 'rgba(34, 197, 94, 0.1)',
                  borderRadius: '1rem',
                  padding: '2rem',
                  textAlign: 'center',
                  border: '2px solid rgba(34, 197, 94, 0.2)'
                }}>
                  <div style={{ fontSize: '3rem', fontWeight: '700', color: '#22c55e', marginBottom: '1rem' }}>
                    {analyticsData.analytics.loginStats.weeklyLogins}
                  </div>
                  <div style={{ fontSize: '1rem', color: '#6b7280', fontWeight: '600' }}>
                    This Week
                  </div>
                </div>

                <div style={{
                  backgroundColor: 'rgba(147, 51, 234, 0.1)',
                  borderRadius: '1rem',
                  padding: '2rem',
                  textAlign: 'center',
                  border: '2px solid rgba(147, 51, 234, 0.2)'
                }}>
                  <div style={{ fontSize: '3rem', fontWeight: '700', color: '#9333ea', marginBottom: '1rem' }}>
                    {analyticsData.analytics.loginStats.monthlyLogins}
                  </div>
                  <div style={{ fontSize: '1rem', color: '#6b7280', fontWeight: '600' }}>
                    This Month
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {toast && (
          <Toast
            open={true}
            message={toast.message}
            type={toast.type}
            onClose={handleCloseToast}
          />
        )}
      </div>

        {/* Chart Modal */}
        {showChartModal && analyticsData && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '2rem'
          }}>
            <div style={{
              backgroundColor: 'white',
              borderRadius: '1rem',
              padding: '2rem',
              maxWidth: '800px',
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto',
              position: 'relative'
            }}>
              <button
                onClick={() => setShowChartModal(false)}
                style={{
                  position: 'absolute',
                  top: '1rem',
                  right: '1rem',
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '0.5rem',
                  borderRadius: '0.5rem',
                  color: '#6b7280',
                  fontSize: '1.5rem'
                }}
              >
                ×
              </button>
              
              <h2 style={{
                fontSize: '1.5rem',
                fontWeight: '600',
                color: '#1f2937',
                marginBottom: '1rem',
                textAlign: 'center'
              }}>
                Work Readiness Distribution - Detailed View
              </h2>
              
              {/* Date Filter Controls */}
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '0.5rem',
                marginBottom: '1.5rem',
                flexWrap: 'wrap'
              }}>
                {['week', 'month', 'year', 'custom'].map((range) => (
                  <button
                    key={range}
                    onClick={() => setWorkReadinessDateRange(range as any)}
                    style={{
                      padding: '0.5rem 1rem',
                      borderRadius: '0.5rem',
                      border: '1px solid rgba(0, 0, 0, 0.1)',
                      backgroundColor: workReadinessDateRange === range ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                      color: workReadinessDateRange === range ? '#3b82f6' : '#6b7280',
                      fontWeight: workReadinessDateRange === range ? 600 : 500,
                      fontSize: '0.875rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {range.charAt(0).toUpperCase() + range.slice(1)}
                  </button>
                ))}
                <button
                  onClick={() => {
                    // Validate date range
                    if (workReadinessDateRange === 'custom' && workReadinessStartDate > workReadinessEndDate) {
                      setToast({ message: 'Start date cannot be after end date', type: 'error' });
                      return;
                    }
                    fetchAnalyticsData('workReadiness');
                  }}
                  disabled={loading}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '0.5rem',
                    border: '1px solid rgba(34, 197, 94, 0.3)',
                    backgroundColor: loading ? 'rgba(107, 114, 128, 0.1)' : 'rgba(34, 197, 94, 0.1)',
                    color: loading ? '#6b7280' : '#22c55e',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    opacity: loading ? 0.6 : 1
                  }}
                >
                  {loading ? (
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ animation: 'spin 1s linear infinite' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  ) : (
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  )}
                  {loading ? 'Loading...' : 'Refresh'}
                </button>
              </div>
              
              {/* Custom Date Range */}
              {workReadinessDateRange === 'custom' && (
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  gap: '1rem',
                  marginBottom: '1.5rem',
                  flexWrap: 'wrap'
                }}>
                  <div>
                    <label style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem', display: 'block' }}>
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={workReadinessStartDate.toISOString().split('T')[0]}
                      onChange={(e) => setWorkReadinessStartDate(new Date(e.target.value))}
                      style={{
                        padding: '0.5rem',
                        borderRadius: '0.375rem',
                        border: '1px solid #d1d5db',
                        fontSize: '0.875rem'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem', display: 'block' }}>
                      End Date
                    </label>
                    <input
                      type="date"
                      value={workReadinessEndDate.toISOString().split('T')[0]}
                      onChange={(e) => setWorkReadinessEndDate(new Date(e.target.value))}
                      style={{
                        padding: '0.5rem',
                        borderRadius: '0.375rem',
                        border: '1px solid #d1d5db',
                        fontSize: '0.875rem'
                      }}
                    />
                  </div>
                </div>
              )}
              
              <div style={{ height: '500px', position: 'relative' }}>
                {(() => {
                  const completed = analyticsData.analytics.workReadinessStats.completed || 0;
                  const pending = analyticsData.analytics.workReadinessStats.pending || 0;
                  const notStarted = analyticsData.analytics.workReadinessStats.notStarted || 
                    ((analyticsData.analytics.workReadinessStats.total || 0) - 
                     ((analyticsData.analytics.workReadinessStats.completed || 0) + 
                      (analyticsData.analytics.workReadinessStats.pending || 0)));
                  
                  const total = completed + pending + notStarted;
                  
                  // If no data, show empty state
                  if (total === 0) {
                    return (
                      <div style={{
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#6b7280'
                      }}>
                        <div style={{
                          width: '200px',
                          height: '200px',
                          borderRadius: '50%',
                          backgroundColor: 'rgba(107, 114, 128, 0.1)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginBottom: '1rem'
                        }}>
                          <svg width="80" height="80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                        </div>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                          No Data Available
                        </h3>
                        <p style={{ fontSize: '0.875rem', textAlign: 'center' }}>
                          No work readiness data found for the selected date range.
                        </p>
                      </div>
                    );
                  }
                  
                  return (
                    <Pie
                      data={{
                        labels: ['Completed', 'Pending', 'Not Started'],
                        datasets: [{
                          data: [completed, pending, notStarted],
                          backgroundColor: [
                            'rgba(34, 197, 94, 0.8)', // Green for completed
                            'rgba(245, 158, 11, 0.8)', // Orange for pending
                            'rgba(239, 68, 68, 0.8)' // Red for not started
                          ],
                          borderColor: [
                            'rgba(34, 197, 94, 1)',
                            'rgba(245, 158, 11, 1)',
                            'rgba(239, 68, 68, 1)' // Red border for not started
                          ],
                          borderWidth: 2,
                          hoverOffset: 8
                        }]
                      }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'bottom',
                        labels: {
                          padding: 30,
                          font: {
                            size: 16,
                            weight: 600
                          },
                          usePointStyle: true,
                          pointStyle: 'circle'
                        }
                      },
                      tooltip: {
                        callbacks: {
                          label: function(context) {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
                            const percentage = ((value as number / total) * 100).toFixed(1);
                            return `${label}: ${value} members (${percentage}%)`;
                          }
                        },
                        titleFont: {
                          size: 16,
                          weight: 600
                        },
                        bodyFont: {
                          size: 14,
                          weight: 500
                        }
                      }
                    },
                    animation: {
                      animateScale: true,
                      animateRotate: true,
                      duration: 1000
                    }
                  }}
                />
                  );
                })()}
              </div>
              
              <div style={{
                marginTop: '2rem',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1rem'
              }}>
                <div style={{
                  backgroundColor: '#f0fdf4',
                  padding: '1rem',
                  borderRadius: '0.5rem',
                  border: '1px solid #bbf7d0'
                }}>
                  <div style={{ fontSize: '0.875rem', color: '#166534', fontWeight: '600' }}>Completed</div>
                  <div style={{ fontSize: '1.5rem', color: '#166534', fontWeight: '700' }}>
                    {analyticsData.analytics.workReadinessStats.completed || 0}
                  </div>
                </div>
                <div style={{
                  backgroundColor: '#fffbeb',
                  padding: '1rem',
                  borderRadius: '0.5rem',
                  border: '1px solid #fed7aa'
                }}>
                  <div style={{ fontSize: '0.875rem', color: '#92400e', fontWeight: '600' }}>Pending</div>
                  <div style={{ fontSize: '1.5rem', color: '#92400e', fontWeight: '700' }}>
                    {analyticsData.analytics.workReadinessStats.pending || 0}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#92400e', fontWeight: '500' }}>
                    {analyticsData.analytics.workReadinessStats.pendingPercentage || 0}%
                  </div>
                </div>
                <div style={{
                  backgroundColor: '#fef2f2',
                  padding: '1rem',
                  borderRadius: '0.5rem',
                  border: '1px solid #fecaca'
                }}>
                  <div style={{ fontSize: '0.875rem', color: '#991b1b', fontWeight: '600' }}>Not Started</div>
                  <div style={{ fontSize: '1.5rem', color: '#991b1b', fontWeight: '700' }}>
                    {analyticsData.analytics.workReadinessStats.notStarted || 
                     ((analyticsData.analytics.workReadinessStats.total || 0) - 
                      ((analyticsData.analytics.workReadinessStats.completed || 0) + 
                       (analyticsData.analytics.workReadinessStats.pending || 0)))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Login Activity Modal */}
        {showLoginModal && analyticsData && (() => {
          const todayLogins = analyticsData.analytics.loginStats.todayLogins || 0;
          const weeklyLogins = analyticsData.analytics.loginStats.weeklyLogins || 0;
          const monthlyLogins = analyticsData.analytics.loginStats.monthlyLogins || 0;
          
          const total = todayLogins + weeklyLogins + monthlyLogins;
          
          // If no data, close the modal and don't show it
          if (total === 0) {
            setShowLoginModal(false);
            setToast({ message: 'No login data available for the selected period', type: 'error' });
            return null;
          }
          
          return (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '2rem'
          }}>
            <div style={{
              backgroundColor: 'white',
              borderRadius: '1rem',
              padding: '2rem',
              maxWidth: '900px',
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto',
              position: 'relative'
            }}>
              <button
                onClick={() => setShowLoginModal(false)}
                style={{
                  position: 'absolute',
                  top: '1rem',
                  right: '1rem',
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '0.5rem',
                  borderRadius: '0.5rem',
                  color: '#6b7280',
                  fontSize: '1.5rem'
                }}
              >
                ×
              </button>
              
              <h2 style={{
                fontSize: '1.5rem',
                fontWeight: '600',
                color: '#1f2937',
                marginBottom: '1rem',
                textAlign: 'center'
              }}>
                Login Activity Trends - Detailed View
              </h2>
              
              {/* Date Filter Controls */}
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '0.5rem',
                marginBottom: '1.5rem',
                flexWrap: 'wrap'
              }}>
                {['week', 'month', 'year', 'custom'].map((range) => (
                  <button
                    key={range}
                    onClick={() => setLoginDateRange(range as any)}
                    style={{
                      padding: '0.5rem 1rem',
                      borderRadius: '0.5rem',
                      border: '1px solid rgba(0, 0, 0, 0.1)',
                      backgroundColor: loginDateRange === range ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                      color: loginDateRange === range ? '#3b82f6' : '#6b7280',
                      fontWeight: loginDateRange === range ? 600 : 500,
                      fontSize: '0.875rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {range.charAt(0).toUpperCase() + range.slice(1)}
                  </button>
                ))}
                <button
                  onClick={() => {
                    // Validate date range
                    if (loginDateRange === 'custom' && loginStartDate > loginEndDate) {
                      setToast({ message: 'Start date cannot be after end date', type: 'error' });
                      return;
                    }
                    fetchAnalyticsData('login');
                  }}
                  disabled={loading}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '0.5rem',
                    border: '1px solid rgba(34, 197, 94, 0.3)',
                    backgroundColor: loading ? 'rgba(107, 114, 128, 0.1)' : 'rgba(34, 197, 94, 0.1)',
                    color: loading ? '#6b7280' : '#22c55e',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    opacity: loading ? 0.6 : 1
                  }}
                >
                  {loading ? (
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ animation: 'spin 1s linear infinite' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  ) : (
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  )}
                  {loading ? 'Loading...' : 'Refresh'}
                </button>
              </div>
              
              {/* Custom Date Range */}
              {workReadinessDateRange === 'custom' && (
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  gap: '1rem',
                  marginBottom: '1.5rem',
                  flexWrap: 'wrap'
                }}>
                  <div>
                    <label style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem', display: 'block' }}>
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={workReadinessStartDate.toISOString().split('T')[0]}
                      onChange={(e) => setWorkReadinessStartDate(new Date(e.target.value))}
                      style={{
                        padding: '0.5rem',
                        borderRadius: '0.375rem',
                        border: '1px solid #d1d5db',
                        fontSize: '0.875rem'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem', display: 'block' }}>
                      End Date
                    </label>
                    <input
                      type="date"
                      value={workReadinessEndDate.toISOString().split('T')[0]}
                      onChange={(e) => setWorkReadinessEndDate(new Date(e.target.value))}
                      style={{
                        padding: '0.5rem',
                        borderRadius: '0.375rem',
                        border: '1px solid #d1d5db',
                        fontSize: '0.875rem'
                      }}
                    />
                  </div>
                </div>
              )}
              
              <div style={{ height: '500px', position: 'relative' }}>
                {(() => {
                  const todayLogins = analyticsData.analytics.loginStats.todayLogins || 0;
                  const weeklyLogins = analyticsData.analytics.loginStats.weeklyLogins || 0;
                  const monthlyLogins = analyticsData.analytics.loginStats.monthlyLogins || 0;
                  const dailyBreakdown = analyticsData.analytics.loginStats.dailyBreakdown || [];
                  
                  const total = todayLogins + weeklyLogins + monthlyLogins;
                  
                  // If no data, show empty state
                  if (total === 0) {
                    return (
                      <div style={{
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#6b7280'
                      }}>
                        <div style={{
                          width: '200px',
                          height: '200px',
                          borderRadius: '50%',
                          backgroundColor: 'rgba(107, 114, 128, 0.1)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginBottom: '1rem'
                        }}>
                          <svg width="80" height="80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                        </div>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                          No Login Data Available
                        </h3>
                        <p style={{ fontSize: '0.875rem', textAlign: 'center' }}>
                          No login activity found for the selected date range.
                        </p>
                      </div>
                    );
                  }
                  
                  return (
                    <Line
                      data={{
                        labels: dailyBreakdown.length > 0 
                          ? dailyBreakdown.map(item => new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }))
                          : ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
                        datasets: [{
                          label: 'Daily Login Count',
                          data: dailyBreakdown.length > 0
                            ? dailyBreakdown.map(item => item.count)
                            : [
                                todayLogins,
                                weeklyLogins / 7,
                                weeklyLogins / 5,
                                monthlyLogins / 30
                              ],
                          borderColor: 'rgba(147, 51, 234, 1)',
                          backgroundColor: 'rgba(147, 51, 234, 0.15)',
                          fill: true,
                          tension: 0.4,
                          pointBackgroundColor: 'rgba(147, 51, 234, 1)',
                          pointBorderColor: '#ffffff',
                          pointBorderWidth: 3,
                          pointRadius: 8,
                          pointHoverRadius: 10,
                          pointHoverBackgroundColor: 'rgba(147, 51, 234, 1)',
                          pointHoverBorderColor: '#ffffff',
                          pointHoverBorderWidth: 4
                        }]
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            position: 'top',
                            labels: {
                              padding: 30,
                              font: {
                                size: 16,
                                weight: 600
                              },
                              usePointStyle: true,
                              pointStyle: 'line'
                            }
                          },
                          tooltip: {
                            callbacks: {
                              label: function(context) {
                                const label = context.dataset.label || '';
                                const value = context.raw || 0;
                                return `${label}: ${Math.round(value as number)} users`;
                              }
                            },
                            titleFont: {
                              size: 16,
                              weight: 600
                            },
                            bodyFont: {
                              size: 14,
                              weight: 500
                            }
                          }
                        },
                        scales: {
                          y: {
                            beginAtZero: true,
                            grid: {
                              color: 'rgba(0, 0, 0, 0.1)'
                            },
                            ticks: {
                              font: {
                                size: 12,
                                weight: 500
                              }
                            }
                          },
                          x: {
                            grid: {
                              color: 'rgba(0, 0, 0, 0.1)'
                            },
                            ticks: {
                              font: {
                                size: 12,
                                weight: 500
                              }
                            }
                          }
                        },
                        animation: {
                          duration: 1000,
                          easing: 'easeInOutQuart'
                        }
                      }}
                    />
                  );
                })()}
              </div>
              
              <div style={{
                marginTop: '2rem',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1rem'
              }}>
                <div style={{
                  backgroundColor: '#f0f9ff',
                  padding: '1rem',
                  borderRadius: '0.5rem',
                  border: '1px solid #bae6fd'
                }}>
                  <div style={{ fontSize: '0.875rem', color: '#0369a1', fontWeight: '600' }}>Today's Logins</div>
                  <div style={{ fontSize: '1.5rem', color: '#0369a1', fontWeight: '700' }}>
                    {analyticsData.analytics.loginStats.todayLogins || 0}
                  </div>
                </div>
                <div style={{
                  backgroundColor: '#f0fdf4',
                  padding: '1rem',
                  borderRadius: '0.5rem',
                  border: '1px solid #bbf7d0'
                }}>
                  <div style={{ fontSize: '0.875rem', color: '#166534', fontWeight: '600' }}>Weekly Logins</div>
                  <div style={{ fontSize: '1.5rem', color: '#166534', fontWeight: '700' }}>
                    {analyticsData.analytics.loginStats.weeklyLogins || 0}
                  </div>
                </div>
                <div style={{
                  backgroundColor: '#fef3c7',
                  padding: '1rem',
                  borderRadius: '0.5rem',
                  border: '1px solid #fde68a'
                }}>
                  <div style={{ fontSize: '0.875rem', color: '#92400e', fontWeight: '600' }}>Monthly Logins</div>
                  <div style={{ fontSize: '1.5rem', color: '#92400e', fontWeight: '700' }}>
                    {analyticsData.analytics.loginStats.monthlyLogins || 0}
                  </div>
                </div>
              </div>
            </div>
          </div>
          );
        })()}

        {/* Work Readiness Activity Modal */}
        {readinessModalOpen && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '2rem'
          }}>
            <div style={{
              backgroundColor: 'white',
              borderRadius: '1rem',
              padding: '2rem',
              maxWidth: '90vw',
              maxHeight: '90vh',
              width: '1000px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              position: 'relative',
              overflow: 'auto'
            }}>
              {/* Close Button */}
              <button
                onClick={() => setReadinessModalOpen(false)}
                style={{
                  position: 'absolute',
                  top: '1rem',
                  right: '1rem',
                  padding: '0.5rem',
                  borderRadius: '0.5rem',
                  border: 'none',
                  backgroundColor: '#f3f4f6',
                  color: '#6b7280',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '2rem',
                  height: '2rem',
                  fontSize: '1.25rem',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#e5e7eb';
                  e.currentTarget.style.color = '#374151';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#f3f4f6';
                  e.currentTarget.style.color = '#6b7280';
                }}
              >
                ×
              </button>

              {/* Modal Header */}
              <div style={{ marginBottom: '2rem' }}>
                <h2 style={{
                  fontSize: '1.5rem',
                  fontWeight: '600',
                  color: '#1f2937',
                  margin: '0 0 0.5rem 0'
                }}>
                  Work Readiness Activity - Detailed View
                </h2>
                <p style={{
                  fontSize: '0.875rem',
                  color: '#6b7280',
                  margin: '0'
                }}>
                  Monitor work readiness trends over time
                </p>
              </div>

              {/* Filter Controls */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '2rem',
                padding: '1rem',
                backgroundColor: '#f9fafb',
                borderRadius: '0.75rem',
                border: '1px solid #e5e7eb'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  {/* Legend */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{
                      width: '12px',
                      height: '12px',
                      borderRadius: '50%',
                      backgroundColor: '#9333ea'
                    }}></div>
                    <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Not Fit for Work</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{
                      width: '12px',
                      height: '12px',
                      borderRadius: '50%',
                      backgroundColor: '#3b82f6'
                    }}></div>
                    <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Minor Concerns Fit for Work</span>
                  </div>
                </div>
                
                {/* Time Filter Dropdown */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <select 
                    value={readinessDateRange}
                    onChange={(e) => {
                      console.log('Modal readiness filter changed to:', e.target.value);
                      setReadinessDateRange(e.target.value as 'week' | 'month' | 'year' | 'custom');
                    }}
                    disabled={readinessChartLoading}
                    style={{
                      padding: '0.75rem 1rem',
                      borderRadius: '0.5rem',
                      border: '1px solid #d1d5db',
                      backgroundColor: readinessChartLoading ? '#f9fafb' : 'white',
                      fontSize: '0.875rem',
                      color: readinessChartLoading ? '#9ca3af' : '#374151',
                      cursor: readinessChartLoading ? 'not-allowed' : 'pointer',
                      opacity: readinessChartLoading ? 0.7 : 1,
                      minWidth: '120px'
                    }}
                  >
                    <option value="week">This Week</option>
                    <option value="month">This Month</option>
                    <option value="year">This Year</option>
                    <option value="custom">Custom Range</option>
                  </select>
                  
                  {/* Custom Date Range Inputs */}
                  {readinessDateRange === 'custom' && (
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <input
                        type="date"
                        value={readinessStartDate.toISOString().split('T')[0]}
                        onChange={(e) => setReadinessStartDate(new Date(e.target.value))}
                        style={{
                          padding: '0.75rem',
                          borderRadius: '0.375rem',
                          border: '1px solid #d1d5db',
                          fontSize: '0.875rem',
                          backgroundColor: 'white'
                        }}
                      />
                      <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>to</span>
                      <input
                        type="date"
                        value={readinessEndDate.toISOString().split('T')[0]}
                        onChange={(e) => setReadinessEndDate(new Date(e.target.value))}
                        style={{
                          padding: '0.75rem',
                          borderRadius: '0.375rem',
                          border: '1px solid #d1d5db',
                          fontSize: '0.875rem',
                          backgroundColor: 'white'
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
              
              {/* Chart Container */}
              <div style={{ height: '500px', position: 'relative' }}>
                {readinessChartLoading ? (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    color: '#6b7280'
                  }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      border: '3px solid #e5e7eb',
                      borderTop: '3px solid #3b82f6',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite',
                      marginBottom: '1rem'
                    }}></div>
                    <p style={{ fontSize: '0.875rem', margin: '0' }}>
                      Updating chart data...
                    </p>
                  </div>
                ) : analyticsData?.analytics?.readinessTrendData && 
                   Array.isArray(analyticsData.analytics.readinessTrendData) && 
                   analyticsData.analytics.readinessTrendData.length > 0 ? (
                  <Line
                    data={{
                      labels: analyticsData.analytics.readinessTrendData.map(item => 
                        new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                      ),
                      datasets: [
                        {
                          label: 'Not Fit for Work',
                          data: analyticsData.analytics.readinessTrendData.map(item => item.notFitForWork),
                          borderColor: 'rgba(147, 51, 234, 1)',
                          backgroundColor: 'rgba(147, 51, 234, 0.1)',
                          fill: true,
                          tension: 0.4,
                          pointBackgroundColor: 'rgba(147, 51, 234, 1)',
                          pointBorderColor: 'rgba(147, 51, 234, 1)',
                          pointRadius: 4,
                          pointHoverRadius: 8,
                          pointHoverBackgroundColor: 'rgba(147, 51, 234, 1)',
                          pointHoverBorderColor: 'rgba(147, 51, 234, 1)',
                          pointHoverBorderWidth: 2,
                          borderWidth: 3
                        },
                        {
                          label: 'Minor Concerns Fit for Work',
                          data: analyticsData.analytics.readinessTrendData.map(item => item.minorConcernsFitForWork),
                          borderColor: 'rgba(59, 130, 246, 1)',
                          backgroundColor: 'rgba(59, 130, 246, 0.1)',
                          fill: true,
                          tension: 0.4,
                          pointBackgroundColor: 'rgba(59, 130, 246, 1)',
                          pointBorderColor: 'rgba(59, 130, 246, 1)',
                          pointRadius: 4,
                          pointHoverRadius: 8,
                          pointHoverBackgroundColor: 'rgba(59, 130, 246, 1)',
                          pointHoverBorderColor: 'rgba(59, 130, 246, 1)',
                          pointHoverBorderWidth: 2,
                          borderWidth: 3
                        }
                      ]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          display: false // We have custom legend above
                        },
                        tooltip: {
                          backgroundColor: 'rgba(0, 0, 0, 0.8)',
                          titleColor: 'white',
                          bodyColor: 'white',
                          borderColor: 'rgba(255, 255, 255, 0.1)',
                          borderWidth: 1,
                          cornerRadius: 8,
                          displayColors: true,
                          callbacks: {
                            title: function(context) {
                              return new Date(context[0].label).toLocaleDateString('en-US', { 
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              });
                            },
                            label: function(context) {
                              return `${context.dataset.label}: ${context.parsed.y} assessment${context.parsed.y !== 1 ? 's' : ''}`;
                            }
                          }
                        }
                      },
                      scales: {
                        x: {
                          grid: {
                            display: true,
                            color: 'rgba(0, 0, 0, 0.05)',
                            drawTicks: false
                          },
                          ticks: {
                            color: '#6b7280',
                            font: {
                              size: 12
                            },
                            maxTicksLimit: 12
                          }
                        },
                        y: {
                          beginAtZero: true,
                          grid: {
                            display: true,
                            color: 'rgba(0, 0, 0, 0.05)',
                            drawTicks: false
                          },
                          ticks: {
                            color: '#6b7280',
                            font: {
                              size: 12
                            },
                            stepSize: 1,
                            callback: function(value) {
                              return value === 0 ? '0' : value;
                            }
                          }
                        }
                      },
                      interaction: {
                        intersect: false,
                        mode: 'index'
                      },
                      elements: {
                        point: {
                          radius: 4,
                          hoverRadius: 8
                        },
                        line: {
                          borderWidth: 3
                        }
                      }
                    }}
                  />
                ) : (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    color: '#9ca3af'
                  }}>
                    <svg width="64" height="64" fill="currentColor" viewBox="0 0 24 24" style={{ marginBottom: '1rem', opacity: 0.5 }}>
                      <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                    </svg>
                    <p style={{ fontSize: '1.125rem', fontWeight: '500', margin: '0 0 0.5rem 0' }}>
                      No Readiness Data Available
                    </p>
                    <p style={{ fontSize: '0.875rem', margin: '0' }}>
                      Work readiness assessments will appear here
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
    </LayoutWithSidebar>
  );
};

export default TeamAnalytics;