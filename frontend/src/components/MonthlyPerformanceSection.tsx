import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import axios from 'axios';

interface MonthlyPerformanceSectionProps {
  teamLeaderId?: string;
}

interface WorkerKPI {
  workerId: string;
  workerName: string;
  email: string;
  team: string;
  monthlyMetrics: {
    totalAssessments: number;
    completedCycles: number;
    workingDaysInMonth: number;
    completionRate: number;
    averageCycleKPI: number;
    monthlyKPI: {
      rating: string;
      score: number;
      color: string;
      description: string;
    };
  };
  readinessBreakdown: {
    fit: number;
    minor: number;
    not_fit: number;
  };
  averageFatigueLevel: number;
  cycleDetails: Array<{
    cycleStart: string;
    completedAt: string;
    streakDays: number;
    kpi: {
      rating: string;
      score: number;
    };
  }>;
}

interface MonthlyTrend {
  month: string;
  totalAssessments: number;
  completedCycles: number;
  workingDays: number;
  completionRate: number;
  teamKPI: {
    rating: string;
    score: number;
    color: string;
  };
}

interface PerformanceInsight {
  type: 'success' | 'warning' | 'info';
  title: string;
  message: string;
  data?: any;
}

// Input validation utilities
const validateTeamLeaderId = (id: string | undefined): boolean => {
  if (!id) return false;
  // UUID v4 pattern validation
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
};

const sanitizeInput = (input: any): any => {
  if (typeof input === 'string') {
    return input.replace(/[<>]/g, '').trim();
  }
  return input;
};

const validateMonth = (month: number): boolean => {
  return month >= 1 && month <= 12;
};

const validateYear = (year: number): boolean => {
  const currentYear = new Date().getFullYear();
  return year >= 2020 && year <= currentYear + 1;
};

const MonthlyPerformanceSection: React.FC<MonthlyPerformanceSectionProps> = memo(({ teamLeaderId }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [monthlyData, setMonthlyData] = useState<any>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [expandedWorker, setExpandedWorker] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [membersPerPage, setMembersPerPage] = useState(5);
  const [retryCount, setRetryCount] = useState(0);

  const fetchMonthlyPerformance = useCallback(async () => {
    try {
      // Input validation
      if (!validateTeamLeaderId(teamLeaderId)) {
        setError('Invalid team leader ID format');
        setLoading(false);
        return;
      }

      if (!validateMonth(selectedMonth) || !validateYear(selectedYear)) {
        setError('Invalid month or year selected');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      
      // Create axios instance with security headers
      const apiClient = axios.create({
        timeout: 15000, // Increased timeout
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        }
      });

      // Add request interceptor for security
      apiClient.interceptors.request.use(
        (config) => {
          // Sanitize parameters
          if (config.params) {
            config.params.teamLeaderId = sanitizeInput(config.params.teamLeaderId);
            config.params.year = sanitizeInput(config.params.year);
            config.params.month = sanitizeInput(config.params.month);
          }
          return config;
        },
        (error) => Promise.reject(error)
      );

      // Add response interceptor for security
      apiClient.interceptors.response.use(
        (response) => {
          // Validate response structure
          if (!response.data || typeof response.data !== 'object') {
            throw new Error('Invalid response format');
          }
          return response;
        },
        (error) => {
          console.error('API Error:', error);
          return Promise.reject(error);
        }
      );

      const response = await apiClient.get(
        `${process.env.REACT_APP_API_BASE_URL || 'https://sociosystem.onrender.com'}/api/goal-kpi/team-leader/monthly-performance`,
        {
          params: {
            teamLeaderId: sanitizeInput(teamLeaderId),
            year: sanitizeInput(selectedYear),
            month: sanitizeInput(selectedMonth),
            includePreviousMonths: 3
          }
        }
      );

      if (response.data.success) {
        // Validate response data structure
        const data = response.data.data;
        if (!data || !data.monthlyTeamSummary) {
          throw new Error('Invalid data structure received');
        }
        
        setMonthlyData(data);
        setLastUpdated(new Date());
        setError(null);
        setRetryCount(0); // Reset retry count on success
      } else {
        throw new Error(response.data.message || 'Failed to load monthly performance data');
      }
    } catch (err: any) {
      console.error('Error fetching monthly performance:', err);
      
      let errorMessage = 'Failed to load monthly performance data';
      
      if (err.code === 'ECONNABORTED') {
        errorMessage = 'Request timeout - please check your connection';
      } else if (err.response?.status === 401) {
        errorMessage = 'Unauthorized access - please login again';
      } else if (err.response?.status === 403) {
        errorMessage = 'Access forbidden - insufficient permissions';
      } else if (err.response?.status === 404) {
        errorMessage = 'API endpoint not found - please check backend server';
      } else if (err.response?.status === 429) {
        errorMessage = 'Too many requests - please wait before retrying';
      } else if (err.response?.status === 500) {
        errorMessage = 'Server error - please try again later';
      } else if (err.response?.status >= 400 && err.response?.status < 500) {
        errorMessage = 'Client error - please check your request';
      } else if (err.response?.status >= 500) {
        errorMessage = 'Server error - please try again later';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      
      // Implement retry logic for network errors
      if (retryCount < 3 && (err.code === 'ECONNABORTED' || err.response?.status >= 500)) {
        setRetryCount(prev => prev + 1);
        setTimeout(() => {
          fetchMonthlyPerformance();
        }, Math.pow(2, retryCount) * 1000); // Exponential backoff
      }
    } finally {
      setLoading(false);
    }
  }, [teamLeaderId, selectedYear, selectedMonth, retryCount]);

  useEffect(() => {
    if (teamLeaderId) {
      fetchMonthlyPerformance();
    }
  }, [teamLeaderId, selectedMonth, selectedYear, fetchMonthlyPerformance]);

  // Memoized utility functions for performance
  const getKPIColor = useMemo(() => (rating: string) => {
    switch (rating) {
      case 'Excellent': return '#10b981';
      case 'Good': return '#22c55e';
      case 'Average': return '#eab308';
      default: return '#ef4444';
    }
  }, []);

  const getInsightIcon = useMemo(() => (type: string) => {
    switch (type) {
      case 'success': return '🏆';
      case 'warning': return '⚠️';
      default: return 'ℹ️';
    }
  }, []);

  // Memoized sorted workers for performance
  const sortedWorkers = useMemo(() => {
    if (!monthlyData?.monthlyWorkerKPIs) return [];
    return [...monthlyData.monthlyWorkerKPIs].sort(
      (a, b) => b.monthlyMetrics.completionRate - a.monthlyMetrics.completionRate
    );
  }, [monthlyData?.monthlyWorkerKPIs]);

  // Memoized pagination calculations
  const paginationData = useMemo(() => {
    const totalPages = Math.ceil(sortedWorkers.length / membersPerPage);
    const startIndex = (currentPage - 1) * membersPerPage;
    const endIndex = startIndex + membersPerPage;
    const currentWorkers = sortedWorkers.slice(startIndex, endIndex);
    
    return { totalPages, startIndex, endIndex, currentWorkers };
  }, [sortedWorkers, membersPerPage, currentPage]);

  // Memoized screen size detection
  const isMobile = useMemo(() => window.innerWidth <= 768, []);

  // XSS protection for text content
  const sanitizeText = useCallback((text: string) => {
    return text.replace(/[<>]/g, '').trim();
  }, []);

  const handlePageChange = useCallback((page: number) => {
    if (page < 1 || page > paginationData.totalPages) return;
    setCurrentPage(page);
    setExpandedWorker(null); // Close any expanded worker when changing pages
  }, [paginationData.totalPages]);

  const handleMembersPerPageChange = useCallback((perPage: number) => {
    if (perPage < 1 || perPage > 50) return; // Limit max items per page
    setMembersPerPage(perPage);
    setCurrentPage(1); // Reset to first page
    setExpandedWorker(null); // Close any expanded worker
  }, []);

  const handleMonthChange = useCallback((month: number) => {
    if (!validateMonth(month)) return;
    setSelectedMonth(month);
  }, []);

  const handleYearChange = useCallback((year: number) => {
    if (!validateYear(year)) return;
    setSelectedYear(year);
  }, []);

  // Loading skeleton component
  const LoadingSkeleton = useMemo(() => (
    <div style={{
      backgroundColor: 'white',
      padding: isMobile ? '1rem' : '2rem',
      borderRadius: '0.5rem',
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      marginBottom: '2rem'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1rem',
        marginBottom: '1rem'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '4px solid #f3f4f6',
          borderTop: '4px solid #3b82f6',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <div>
          <div style={{
            width: '200px',
            height: '20px',
            backgroundColor: '#f3f4f6',
            borderRadius: '4px',
            marginBottom: '8px',
            animation: 'pulse 1.5s ease-in-out infinite'
          }} />
          <div style={{
            width: '150px',
            height: '16px',
            backgroundColor: '#f3f4f6',
            borderRadius: '4px',
            animation: 'pulse 1.5s ease-in-out infinite'
          }} />
        </div>
      </div>
      
      {/* Skeleton cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: isMobile ? '0.75rem' : '1rem',
        marginBottom: '1.5rem'
      }}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} style={{
            backgroundColor: '#f9fafb',
            padding: isMobile ? '1rem' : '1.5rem',
            borderRadius: '0.5rem',
            border: '1px solid #e5e7eb'
          }}>
            <div style={{
              width: '32px',
              height: '32px',
              backgroundColor: '#e5e7eb',
              borderRadius: '4px',
              marginBottom: '0.5rem',
              animation: 'pulse 1.5s ease-in-out infinite'
            }} />
            <div style={{
              width: '60px',
              height: '32px',
              backgroundColor: '#e5e7eb',
              borderRadius: '4px',
              marginBottom: '0.25rem',
              animation: 'pulse 1.5s ease-in-out infinite'
            }} />
            <div style={{
              width: '120px',
              height: '16px',
              backgroundColor: '#e5e7eb',
              borderRadius: '4px',
              marginBottom: '0.5rem',
              animation: 'pulse 1.5s ease-in-out infinite'
            }} />
            <div style={{
              width: '80px',
              height: '12px',
              backgroundColor: '#e5e7eb',
              borderRadius: '4px',
              animation: 'pulse 1.5s ease-in-out infinite'
            }} />
          </div>
        ))}
      </div>
      
      <p style={{ 
        marginTop: '1rem', 
        color: '#6b7280',
        textAlign: 'center',
        fontSize: isMobile ? '0.8rem' : '0.875rem'
      }}>
        Loading monthly performance data...
      </p>
    </div>
  ), [isMobile]);

  if (!teamLeaderId) {
    return null;
  }

  if (loading) {
    return LoadingSkeleton;
  }

  if (error) {
    return (
      <div style={{
        backgroundColor: '#f0f9ff',
        padding: isMobile ? '1rem' : '1.5rem',
        borderRadius: '0.5rem',
        border: '1px solid #bae6fd',
        marginBottom: '2rem',
        textAlign: 'center'
      }}>
        <div style={{
          fontSize: isMobile ? '2rem' : '3rem',
          marginBottom: '1rem'
        }}>
          📊
        </div>
        <h3 style={{
          color: '#dc2626',
          margin: '0 0 0.5rem 0',
          fontSize: isMobile ? '1rem' : '1.125rem',
          fontWeight: '600'
        }}>
          Error Loading Data
        </h3>
        <p style={{ 
          color: '#dc2626', 
          margin: '0 0 1rem 0',
          fontSize: isMobile ? '0.8rem' : '0.875rem'
        }}>
          {error}
        </p>
        {retryCount > 0 && (
          <p style={{
            color: '#6b7280',
            margin: '0 0 1rem 0',
            fontSize: isMobile ? '0.7rem' : '0.75rem'
          }}>
            Retry attempt {retryCount}/3
          </p>
        )}
        <button
          onClick={() => {
            setRetryCount(0);
            setError(null);
            fetchMonthlyPerformance();
          }}
          style={{
            backgroundColor: '#dc2626',
            color: 'white',
            padding: isMobile ? '0.5rem 1rem' : '0.75rem 1.5rem',
            borderRadius: '0.375rem',
            border: 'none',
            cursor: 'pointer',
            fontSize: isMobile ? '0.8rem' : '0.875rem',
            fontWeight: '500',
            transition: 'background-color 0.2s ease'
          }}
          onMouseEnter={(e) => {
            if (!isMobile) {
              e.currentTarget.style.backgroundColor = '#b91c1c';
            }
          }}
          onMouseLeave={(e) => {
            if (!isMobile) {
              e.currentTarget.style.backgroundColor = '#dc2626';
            }
          }}
        >
          🔄 Retry
        </button>
      </div>
    );
  }

  if (!monthlyData) {
    return null;
  }

  const { monthlyWorkerKPIs, monthlyTeamSummary, monthlyTrends, performanceInsights } = monthlyData;

  // Use memoized pagination data
  const { totalPages, startIndex, endIndex, currentWorkers } = paginationData;

  return (
    <div style={{ marginBottom: '2rem' }}>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(-20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }
        @keyframes realTimeGlow {
          0% { box-shadow: 0 0 5px rgba(16, 185, 129, 0.5); }
          50% { box-shadow: 0 0 20px rgba(16, 185, 129, 0.8); }
          100% { box-shadow: 0 0 5px rgba(16, 185, 129, 0.5); }
        }
        .monthly-card {
          animation: fadeIn 0.3s ease-out;
        }
        .monthly-insight {
          animation: slideIn 0.4s ease-out;
        }
        .real-time-indicator {
          animation: realTimeGlow 2s infinite;
        }
      `}</style>

      {/* Header Section */}
      <div style={{
        backgroundColor: 'white',
        padding: window.innerWidth <= 768 ? '1rem' : '1.5rem',
        borderRadius: '0.5rem',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        marginBottom: '1.5rem'
      }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'flex-start', 
          flexWrap: 'wrap', 
          gap: '1rem',
          flexDirection: window.innerWidth <= 768 ? 'column' : 'row'
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ marginBottom: '0.5rem' }}>
              <h2 style={{
                fontSize: window.innerWidth <= 768 ? '1.25rem' : '1.5rem',
                fontWeight: '700',
                color: '#1f2937',
                margin: 0,
                background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>
                📅 Monthly Performance Tracking
              </h2>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <p style={{ color: '#6b7280', margin: 0, fontSize: window.innerWidth <= 768 ? '0.8rem' : '0.875rem' }}>
                {monthlyTeamSummary.month} - Comprehensive KPI Analysis
              </p>
              
              {lastUpdated && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <p style={{ color: '#9ca3af', margin: 0, fontSize: window.innerWidth <= 768 ? '0.7rem' : '0.75rem' }}>
                    Last updated: {lastUpdated.toLocaleTimeString()}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Month/Year Selector */}
          <div style={{ 
            display: 'flex', 
            gap: '0.5rem', 
            alignItems: 'center',
            flexDirection: window.innerWidth <= 768 ? 'row' : 'row',
            width: window.innerWidth <= 768 ? '100%' : 'auto'
          }}>
            <select
              value={selectedMonth}
              onChange={(e) => handleMonthChange(parseInt(e.target.value))}
              style={{
                padding: window.innerWidth <= 768 ? '0.75rem 1rem' : '0.5rem 1rem',
                borderRadius: '0.375rem',
                border: '1px solid #d1d5db',
                backgroundColor: 'white',
                fontSize: window.innerWidth <= 768 ? '1rem' : '0.875rem',
                fontWeight: '500',
                color: '#374151',
                cursor: 'pointer',
                flex: window.innerWidth <= 768 ? 1 : 'none',
                minHeight: window.innerWidth <= 768 ? '44px' : 'auto'
              }}
            >
              {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((month, index) => (
                <option key={index} value={index + 1}>{sanitizeText(month)}</option>
              ))}
            </select>

            <select
              value={selectedYear}
              onChange={(e) => handleYearChange(parseInt(e.target.value))}
              style={{
                padding: window.innerWidth <= 768 ? '0.75rem 1rem' : '0.5rem 1rem',
                borderRadius: '0.375rem',
                border: '1px solid #d1d5db',
                backgroundColor: 'white',
                fontSize: window.innerWidth <= 768 ? '1rem' : '0.875rem',
                fontWeight: '500',
                color: '#374151',
                cursor: 'pointer',
                flex: window.innerWidth <= 768 ? 1 : 'none',
                minHeight: window.innerWidth <= 768 ? '44px' : 'auto'
              }}
            >
              {[2023, 2024, 2025].map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Team Summary Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: window.innerWidth <= 768 ? '1fr' : 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: window.innerWidth <= 768 ? '0.75rem' : '1rem',
        marginBottom: '1.5rem'
      }}>
        {/* Total Members */}
        <div className="monthly-card" style={{
          backgroundColor: 'white',
          padding: window.innerWidth <= 768 ? '1rem' : '1.5rem',
          borderRadius: '0.5rem',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          border: '1px solid #e5e7eb',
          transition: 'all 0.2s ease',
          cursor: 'pointer'
        }}
        onMouseEnter={(e) => {
          if (window.innerWidth > 768) {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.12)';
          }
        }}
        onMouseLeave={(e) => {
          if (window.innerWidth > 768) {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
          }
        }}
        >
          <div style={{ marginBottom: '0.5rem' }}>
            <svg width={window.innerWidth <= 768 ? "24" : "32"} height={window.innerWidth <= 768 ? "24" : "32"} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M17 21V19C17 17.9391 16.5786 16.9217 15.8284 16.1716C15.0783 15.4214 14.0609 15 13 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="9" cy="7" r="4" stroke="#3b82f6" strokeWidth="2"/>
              <path d="M23 21V19C23 18.1645 22.7155 17.3541 22.2094 16.7006C21.7033 16.0471 20.9999 15.5854 20.2 15.38" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M16 3.13C16.8604 3.35031 17.623 3.85071 18.1676 4.55232C18.7122 5.25392 19.0078 6.11683 19.0078 7.005C19.0078 7.89317 18.7122 8.75608 18.1676 9.45768C17.623 10.1593 16.8604 10.6597 16 10.88" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div style={{ fontSize: window.innerWidth <= 768 ? '1.75rem' : '2rem', fontWeight: '700', color: '#1f2937', marginBottom: '0.25rem' }}>
            {monthlyTeamSummary.totalMembers}
          </div>
          <div style={{ fontSize: window.innerWidth <= 768 ? '0.8rem' : '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>
            Total Team Members
          </div>
          <div style={{ fontSize: window.innerWidth <= 768 ? '0.7rem' : '0.75rem', color: '#10b981', fontWeight: '600' }}>
            ✓ {monthlyTeamSummary.activeMembers} Active
          </div>
        </div>

        {/* Total Assessments */}
        <div className="monthly-card" style={{
          backgroundColor: 'white',
          padding: '1.5rem',
          borderRadius: '0.5rem',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          border: '1px solid #e5e7eb',
          transition: 'all 0.2s ease',
          cursor: 'pointer'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.12)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
        }}
        >
          <div style={{ marginBottom: '0.5rem' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M14 2V8H20" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M16 13H8" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M16 17H8" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M10 9H8" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: '700', color: '#1f2937', marginBottom: '0.25rem' }}>
            {monthlyTeamSummary.totalAssessments}
          </div>
          <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
            Total Assessments
          </div>
        </div>

        {/* Completed Cycles */}
        <div className="monthly-card" style={{
          backgroundColor: 'white',
          padding: '1.5rem',
          borderRadius: '0.5rem',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          border: '1px solid #e5e7eb',
          transition: 'all 0.2s ease',
          cursor: 'pointer'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.12)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
        }}
        >
          <div style={{ marginBottom: '0.5rem' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12Z" stroke="#10b981" strokeWidth="2"/>
              <path d="M8 12L10.5 14.5L16 9" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: '700', color: '#1f2937', marginBottom: '0.25rem' }}>
            {monthlyTeamSummary.totalCompletedCycles}
          </div>
          <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
            Completed Cycles
          </div>
        </div>

        {/* Team Monthly KPI */}
        <div className="monthly-card" style={{
          backgroundColor: 'white',
          padding: '1.5rem',
          borderRadius: '0.5rem',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          border: `2px solid ${monthlyTeamSummary.teamKPI?.color || '#6b7280'}`,
          transition: 'all 0.2s ease',
          cursor: 'pointer'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = `0 4px 12px ${monthlyTeamSummary.teamKPI?.color || '#6b7280'}40`;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
        }}
        >
          <div style={{ marginBottom: '0.5rem' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L15.09 8.26L22 9L17 14L18.18 21L12 17.77L5.82 21L7 14L2 9L8.91 8.26L12 2Z" stroke={monthlyTeamSummary.teamKPI?.color || '#6b7280'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div style={{
            fontSize: '1.5rem',
            fontWeight: '700',
            color: monthlyTeamSummary.teamKPI?.color || '#6b7280',
            marginBottom: '0.25rem'
          }}>
            {monthlyTeamSummary.teamKPI?.rating || 'N/A'}
          </div>
          <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>
            Team Monthly KPI
          </div>
          <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
            {Math.round(monthlyTeamSummary.averageCompletionRate)}% Completion Rate
          </div>
        </div>
      </div>

      {/* Monthly Trends Chart */}
      {monthlyTrends && monthlyTrends.length > 0 && (
        <div style={{
          backgroundColor: 'white',
          padding: '1.5rem',
          borderRadius: '0.5rem',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          marginBottom: '1.5rem'
        }}>
          <h3 style={{
            fontSize: '1.125rem',
            fontWeight: '600',
            color: '#1f2937',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 3V21H21" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M9 9L12 6L16 10L20 6" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Monthly Performance Trends
          </h3>

          <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${monthlyTrends.length}, 1fr)`,
            gap: '1rem'
          }}>
            {monthlyTrends.map((trend: MonthlyTrend, index: number) => (
              <div key={index} style={{
                padding: '1rem',
                borderRadius: '0.375rem',
                backgroundColor: '#f9fafb',
                border: '1px solid #e5e7eb',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', marginBottom: '0.5rem' }}>
                  {trend.month}
                </div>
                <div style={{
                  fontSize: '1.25rem',
                  fontWeight: '700',
                  color: trend.teamKPI.color,
                  marginBottom: '0.25rem'
                }}>
                  {trend.teamKPI.rating}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                  {trend.completedCycles} cycles
                </div>
                <div style={{
                  fontSize: '0.75rem',
                  color: '#3b82f6',
                  fontWeight: '600'
                }}>
                  {Math.round(trend.completionRate)}%
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Performance Insights */}
      {performanceInsights && performanceInsights.length > 0 && (
        <div style={{
          backgroundColor: 'white',
          padding: '1.5rem',
          borderRadius: '0.5rem',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          marginBottom: '1.5rem'
        }}>
          <h3 style={{
            fontSize: '1.125rem',
            fontWeight: '600',
            color: '#1f2937',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="10" stroke="#3b82f6" strokeWidth="2"/>
              <path d="M12 16V12" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round"/>
              <path d="M12 8H12.01" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            Performance Insights
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {performanceInsights.map((insight: PerformanceInsight, index: number) => (
              <div key={index} className="monthly-insight" style={{
                padding: '1rem',
                borderRadius: '0.375rem',
                backgroundColor: insight.type === 'success' ? '#f0fdf4' : insight.type === 'warning' ? '#fef3c7' : '#eff6ff',
                border: `1px solid ${insight.type === 'success' ? '#86efac' : insight.type === 'warning' ? '#fcd34d' : '#93c5fd'}`
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                  <div style={{ fontSize: '1.5rem' }}>{getInsightIcon(insight.type)}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: '#1f2937',
                      marginBottom: '0.25rem'
                    }}>
                      {insight.title}
                    </div>
                    <div style={{
                      fontSize: '0.75rem',
                      color: '#6b7280'
                    }}>
                      {insight.message}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

       {/* Individual Worker Performance */}
       <div style={{
         backgroundColor: 'white',
         padding: window.innerWidth <= 768 ? '1rem' : '1.5rem',
         borderRadius: '0.5rem',
         boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
       }}>
         <div style={{ 
           display: 'flex', 
           justifyContent: 'space-between', 
           alignItems: 'center', 
           marginBottom: '1rem', 
           flexWrap: 'wrap', 
           gap: '1rem',
           flexDirection: window.innerWidth <= 768 ? 'column' : 'row'
         }}>
           <h3 style={{
             fontSize: window.innerWidth <= 768 ? '1rem' : '1.125rem',
             fontWeight: '600',
             color: '#1f2937',
             margin: 0,
             display: 'flex',
             alignItems: 'center',
             gap: '0.5rem'
           }}>
             <svg width={window.innerWidth <= 768 ? "16" : "20"} height={window.innerWidth <= 768 ? "16" : "20"} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
               <path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
               <circle cx="12" cy="7" r="4" stroke="#3b82f6" strokeWidth="2"/>
             </svg>
             Individual Worker Performance
           </h3>
           
           {/* Pagination Controls */}
           <div style={{ 
             display: 'flex', 
             alignItems: 'center', 
             gap: '1rem', 
             flexWrap: 'wrap',
             width: window.innerWidth <= 768 ? '100%' : 'auto',
             justifyContent: window.innerWidth <= 768 ? 'space-between' : 'flex-end'
           }}>
             {/* Members per page selector */}
             <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
               <span style={{ fontSize: window.innerWidth <= 768 ? '0.8rem' : '0.875rem', color: '#6b7280', fontWeight: '500' }}>Show:</span>
               <select
                 value={membersPerPage}
                 onChange={(e) => handleMembersPerPageChange(parseInt(e.target.value))}
                 style={{
                   padding: window.innerWidth <= 768 ? '0.5rem 0.75rem' : '0.375rem 0.75rem',
                   borderRadius: '0.25rem',
                   border: '1px solid #d1d5db',
                   backgroundColor: 'white',
                   fontSize: window.innerWidth <= 768 ? '0.9rem' : '0.875rem',
                   fontWeight: '500',
                   color: '#374151',
                   cursor: 'pointer',
                   minHeight: window.innerWidth <= 768 ? '40px' : 'auto'
                 }}
               >
                 <option value={5}>5 members</option>
                 <option value={10}>10 members</option>
                 <option value={15}>15 members</option>
                 <option value={20}>20 members</option>
               </select>
             </div>
             
             {/* Page info */}
             <div style={{ fontSize: window.innerWidth <= 768 ? '0.8rem' : '0.875rem', color: '#6b7280' }}>
               Showing {startIndex + 1} to {Math.min(endIndex, sortedWorkers.length)} of {sortedWorkers.length} members
             </div>
           </div>
         </div>

         {/* Sorting indicator */}
         <div style={{
           padding: window.innerWidth <= 768 ? '0.5rem' : '0.75rem',
           backgroundColor: '#f0f9ff',
           borderRadius: '0.375rem',
           marginBottom: '1rem',
           border: '1px solid #bfdbfe'
         }}>
           <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
             <svg width={window.innerWidth <= 768 ? "14" : "16"} height={window.innerWidth <= 768 ? "14" : "16"} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
               <path d="M3 3V21H21" stroke="#1e40af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
               <path d="M9 9L12 6L16 10L20 6" stroke="#1e40af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
             </svg>
             <span style={{ fontSize: window.innerWidth <= 768 ? '0.75rem' : '0.875rem', fontWeight: '600', color: '#1e40af' }}>
               Sorted by Completion Rate (Highest First)
             </span>
           </div>
         </div>

         {/* Mobile Card View */}
         {window.innerWidth <= 768 ? (
           <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
             {currentWorkers.map((worker: WorkerKPI, index: number) => (
               <div key={worker.workerId} style={{
                 border: startIndex + index + 1 === 1 ? '2px solid #f59e0b' : '1px solid #e5e7eb',
                 borderRadius: '0.5rem',
                 overflow: 'hidden',
                 transition: 'all 0.2s ease',
                 backgroundColor: startIndex + index + 1 === 1 ? '#fefce8' : 'white',
                 boxShadow: startIndex + index + 1 === 1 ? '0 4px 12px rgba(245, 158, 11, 0.2)' : 'none'
               }}>
                 {/* Worker Header */}
                 <div
                   onClick={() => setExpandedWorker(expandedWorker === worker.workerId ? null : worker.workerId)}
                   style={{
                     padding: '0.75rem',
                     backgroundColor: startIndex + index + 1 === 1 ? '#fef3c7' : '#f9fafb',
                     cursor: 'pointer',
                     display: 'flex',
                     justifyContent: 'space-between',
                     alignItems: 'center',
                     transition: 'all 0.2s ease'
                   }}
                 >
                   <div style={{ flex: 1 }}>
                     <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                       {/* Ranking Badge */}
                       <div style={{
                         padding: '0.25rem 0.5rem',
                         borderRadius: '0.25rem',
                         backgroundColor: startIndex + index + 1 === 1 ? '#fef3c7' : startIndex + index + 1 <= 3 ? '#fef3c7' : '#f3f4f6',
                         border: startIndex + index + 1 === 1 ? '2px solid #f59e0b' : startIndex + index + 1 <= 3 ? '1px solid #f59e0b' : '1px solid #d1d5db',
                         fontSize: '0.7rem',
                         fontWeight: '700',
                         color: startIndex + index + 1 === 1 ? '#92400e' : startIndex + index + 1 <= 3 ? '#92400e' : '#6b7280',
                         minWidth: '1.5rem',
                         textAlign: 'center',
                         position: 'relative'
                       }}>
                         {startIndex + index + 1 === 1 && (
                           <span style={{ 
                             position: 'absolute', 
                             top: '-8px', 
                             right: '-8px', 
                             fontSize: '0.8rem',
                             filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))'
                           }}>
                             🥇
                           </span>
                         )}
                         #{startIndex + index + 1}
                       </div>
                       
                       <div style={{
                         fontSize: '0.8rem',
                         fontWeight: '600',
                         color: '#1f2937'
                       }}>
                         {worker.workerName}
                       </div>
                     </div>
                     <div style={{ fontSize: '0.7rem', color: '#6b7280' }}>
                       {worker.email} • {worker.team}
                     </div>
                   </div>

                   <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                     {/* Monthly KPI Badge */}
                     <div style={{
                       padding: '0.25rem 0.5rem',
                       borderRadius: '0.25rem',
                       backgroundColor: worker.monthlyMetrics?.monthlyKPI?.color || '#6b7280',
                       color: 'white',
                       fontSize: '0.7rem',
                       fontWeight: '600'
                     }}>
                       {worker.monthlyMetrics?.monthlyKPI?.rating || 'N/A'}
                     </div>

                     {/* Completion Rate */}
                     <div style={{
                       fontSize: '0.8rem',
                       fontWeight: '600',
                       color: '#3b82f6'
                     }}>
                       {Math.round(worker.monthlyMetrics.completionRate)}%
                     </div>

                     {/* Expand Arrow */}
                     <div style={{
                       fontSize: '1rem',
                       color: '#6b7280',
                       transition: 'transform 0.2s ease',
                       transform: expandedWorker === worker.workerId ? 'rotate(180deg)' : 'rotate(0)'
                     }}>
                       ▼
                     </div>
                   </div>
                 </div>

                 {/* Worker Details (Expandable) */}
                 {expandedWorker === worker.workerId && (
                   <div style={{
                     padding: '0.75rem',
                     backgroundColor: 'white',
                     animation: 'fadeIn 0.3s ease-out'
                   }}>
                     <div style={{
                       display: 'grid',
                       gridTemplateColumns: '1fr 1fr',
                       gap: '0.5rem',
                       marginBottom: '0.75rem'
                     }}>
                       {/* Total Assessments */}
                       <div style={{
                         padding: '0.5rem',
                         backgroundColor: '#f9fafb',
                         borderRadius: '0.375rem'
                       }}>
                         <div style={{ fontSize: '0.7rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                           Total Assessments
                         </div>
                         <div style={{ fontSize: '1rem', fontWeight: '700', color: '#1f2937' }}>
                           {worker.monthlyMetrics.totalAssessments}
                         </div>
                       </div>

                       {/* Completed Cycles */}
                       <div style={{
                         padding: '0.5rem',
                         backgroundColor: '#f9fafb',
                         borderRadius: '0.375rem'
                       }}>
                         <div style={{ fontSize: '0.7rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                           Completed Cycles
                         </div>
                         <div style={{ fontSize: '1rem', fontWeight: '700', color: '#1f2937' }}>
                           {worker.monthlyMetrics.completedCycles}
                         </div>
                       </div>

                       {/* Avg Cycle KPI */}
                       <div style={{
                         padding: '0.5rem',
                         backgroundColor: '#f9fafb',
                         borderRadius: '0.375rem'
                       }}>
                         <div style={{ fontSize: '0.7rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                           Avg Cycle KPI
                         </div>
                         <div style={{ fontSize: '1rem', fontWeight: '700', color: '#1f2937' }}>
                           {worker.monthlyMetrics.averageCycleKPI}
                         </div>
                       </div>

                       {/* Avg Fatigue */}
                       <div style={{
                         padding: '0.5rem',
                         backgroundColor: '#f9fafb',
                         borderRadius: '0.375rem'
                       }}>
                         <div style={{ fontSize: '0.7rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                           Avg Fatigue Level
                         </div>
                         <div style={{ fontSize: '1rem', fontWeight: '700', color: '#1f2937' }}>
                           {worker.averageFatigueLevel}
                         </div>
                       </div>
                     </div>

                     {/* Readiness Breakdown */}
                     <div style={{
                       padding: '0.5rem',
                       backgroundColor: '#f9fafb',
                       borderRadius: '0.375rem',
                       marginBottom: '0.75rem'
                     }}>
                       <div style={{ fontSize: '0.7rem', fontWeight: '600', color: '#6b7280', marginBottom: '0.5rem' }}>
                         Readiness Breakdown
                       </div>
                       <div style={{ display: 'flex', gap: '0.5rem' }}>
                         <div style={{ flex: 1, textAlign: 'center' }}>
                           <div style={{ fontSize: '1rem', fontWeight: '700', color: '#10b981' }}>
                             {worker.readinessBreakdown.fit}
                           </div>
                           <div style={{ fontSize: '0.6rem', color: '#6b7280' }}>Fit</div>
                         </div>
                         <div style={{ flex: 1, textAlign: 'center' }}>
                           <div style={{ fontSize: '1rem', fontWeight: '700', color: '#eab308' }}>
                             {worker.readinessBreakdown.minor}
                           </div>
                           <div style={{ fontSize: '0.6rem', color: '#6b7280' }}>Minor</div>
                         </div>
                         <div style={{ flex: 1, textAlign: 'center' }}>
                           <div style={{ fontSize: '1rem', fontWeight: '700', color: '#ef4444' }}>
                             {worker.readinessBreakdown.not_fit}
                           </div>
                           <div style={{ fontSize: '0.6rem', color: '#6b7280' }}>Not Fit</div>
                         </div>
                       </div>
                     </div>

                     {/* Cycle Details */}
                     {worker.cycleDetails && worker.cycleDetails.length > 0 && (
                       <div>
                         <div style={{ fontSize: '0.7rem', fontWeight: '600', color: '#6b7280', marginBottom: '0.5rem' }}>
                           Completed Cycles This Month
                         </div>
                         <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                           {worker.cycleDetails.map((cycle, index) => (
                             <div key={index} style={{
                               padding: '0.375rem',
                               backgroundColor: '#f9fafb',
                               borderRadius: '0.25rem',
                               display: 'flex',
                               justifyContent: 'space-between',
                               alignItems: 'center',
                               fontSize: '0.7rem'
                             }}>
                               <div style={{ color: '#6b7280', fontSize: '0.65rem' }}>
                                 {new Date(cycle.cycleStart).toLocaleDateString()} - {new Date(cycle.completedAt).toLocaleDateString()}
                               </div>
                               <div style={{
                                 padding: '0.125rem 0.375rem',
                                 borderRadius: '0.25rem',
                                 backgroundColor: getKPIColor(cycle.kpi.rating),
                                 color: 'white',
                                 fontWeight: '600',
                                 fontSize: '0.65rem'
                               }}>
                                 {cycle.kpi.rating}
                               </div>
                             </div>
                           ))}
                         </div>
                       </div>
                     )}
                   </div>
                 )}
               </div>
             ))}
           </div>
         ) : (
           /* Desktop View */
           <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
             {currentWorkers.map((worker: WorkerKPI, index: number) => (
              <div key={worker.workerId} style={{
                border: startIndex + index + 1 === 1 ? '2px solid #f59e0b' : '1px solid #e5e7eb',
                borderRadius: '0.5rem',
                overflow: 'hidden',
                transition: 'all 0.2s ease',
                backgroundColor: startIndex + index + 1 === 1 ? '#fefce8' : 'white',
                boxShadow: startIndex + index + 1 === 1 ? '0 4px 12px rgba(245, 158, 11, 0.2)' : 'none'
              }}>
                {/* Worker Header */}
                <div
                  onClick={() => setExpandedWorker(expandedWorker === worker.workerId ? null : worker.workerId)}
                  style={{
                    padding: '1rem',
                    backgroundColor: startIndex + index + 1 === 1 ? '#fef3c7' : '#f9fafb',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = startIndex + index + 1 === 1 ? '#fde68a' : '#f3f4f6';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = startIndex + index + 1 === 1 ? '#fef3c7' : '#f9fafb';
                  }}
                >
                   <div style={{ flex: 1 }}>
                     <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                       {/* Ranking Badge */}
                       <div style={{
                         padding: '0.25rem 0.5rem',
                         borderRadius: '0.25rem',
                         backgroundColor: startIndex + index + 1 === 1 ? '#fef3c7' : startIndex + index + 1 <= 3 ? '#fef3c7' : '#f3f4f6',
                         border: startIndex + index + 1 === 1 ? '2px solid #f59e0b' : startIndex + index + 1 <= 3 ? '1px solid #f59e0b' : '1px solid #d1d5db',
                         fontSize: '0.75rem',
                         fontWeight: '700',
                         color: startIndex + index + 1 === 1 ? '#92400e' : startIndex + index + 1 <= 3 ? '#92400e' : '#6b7280',
                         minWidth: '2rem',
                         textAlign: 'center',
                         position: 'relative'
                       }}>
                         {startIndex + index + 1 === 1 && (
                           <span style={{ 
                             position: 'absolute', 
                             top: '-10px', 
                             right: '-10px', 
                             fontSize: '1rem',
                             filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'
                           }}>
                             🥇
                           </span>
                         )}
                         #{startIndex + index + 1}
                       </div>
                       
                       <div style={{
                         fontSize: '0.875rem',
                         fontWeight: '600',
                         color: '#1f2937'
                       }}>
                         {worker.workerName}
                       </div>
                     </div>
                     <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                       {worker.email} • {worker.team}
                     </div>
                   </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    {/* Monthly KPI Badge */}
                    <div style={{
                      padding: '0.375rem 0.75rem',
                      borderRadius: '0.25rem',
                      backgroundColor: worker.monthlyMetrics?.monthlyKPI?.color || '#6b7280',
                      color: 'white',
                      fontSize: '0.75rem',
                      fontWeight: '600'
                    }}>
                      {worker.monthlyMetrics?.monthlyKPI?.rating || 'N/A'}
                    </div>

                    {/* Completion Rate */}
                    <div style={{
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: '#3b82f6'
                    }}>
                      {Math.round(worker.monthlyMetrics.completionRate)}%
                    </div>

                    {/* Expand Arrow */}
                    <div style={{
                      fontSize: '1.25rem',
                      color: '#6b7280',
                      transition: 'transform 0.2s ease',
                      transform: expandedWorker === worker.workerId ? 'rotate(180deg)' : 'rotate(0)'
                    }}>
                      ▼
                    </div>
                  </div>
                </div>

                {/* Worker Details (Expandable) */}
                {expandedWorker === worker.workerId && (
                  <div style={{
                    padding: '1rem',
                    backgroundColor: 'white',
                    animation: 'fadeIn 0.3s ease-out'
                  }}>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                      gap: '1rem',
                      marginBottom: '1rem'
                    }}>
                      {/* Total Assessments */}
                      <div style={{
                        padding: '0.75rem',
                        backgroundColor: '#f9fafb',
                        borderRadius: '0.375rem'
                      }}>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                          Total Assessments
                        </div>
                        <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#1f2937' }}>
                          {worker.monthlyMetrics.totalAssessments}
                        </div>
                      </div>

                      {/* Completed Cycles */}
                      <div style={{
                        padding: '0.75rem',
                        backgroundColor: '#f9fafb',
                        borderRadius: '0.375rem'
                      }}>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                          Completed Cycles
                        </div>
                        <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#1f2937' }}>
                          {worker.monthlyMetrics.completedCycles}
                        </div>
                      </div>

                      {/* Avg Cycle KPI */}
                      <div style={{
                        padding: '0.75rem',
                        backgroundColor: '#f9fafb',
                        borderRadius: '0.375rem'
                      }}>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                          Avg Cycle KPI
                        </div>
                        <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#1f2937' }}>
                          {worker.monthlyMetrics.averageCycleKPI}
                        </div>
                      </div>

                      {/* Avg Fatigue */}
                      <div style={{
                        padding: '0.75rem',
                        backgroundColor: '#f9fafb',
                        borderRadius: '0.375rem'
                      }}>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                          Avg Fatigue Level
                        </div>
                        <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#1f2937' }}>
                          {worker.averageFatigueLevel}
                        </div>
                      </div>
                    </div>

                    {/* Readiness Breakdown */}
                    <div style={{
                      padding: '0.75rem',
                      backgroundColor: '#f9fafb',
                      borderRadius: '0.375rem',
                      marginBottom: '1rem'
                    }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', marginBottom: '0.5rem' }}>
                        Readiness Breakdown
                      </div>
                      <div style={{ display: 'flex', gap: '1rem' }}>
                        <div style={{ flex: 1, textAlign: 'center' }}>
                          <div style={{ fontSize: '1.125rem', fontWeight: '700', color: '#10b981' }}>
                            {worker.readinessBreakdown.fit}
                          </div>
                          <div style={{ fontSize: '0.625rem', color: '#6b7280' }}>Fit</div>
                        </div>
                        <div style={{ flex: 1, textAlign: 'center' }}>
                          <div style={{ fontSize: '1.125rem', fontWeight: '700', color: '#eab308' }}>
                            {worker.readinessBreakdown.minor}
                          </div>
                          <div style={{ fontSize: '0.625rem', color: '#6b7280' }}>Minor</div>
                        </div>
                        <div style={{ flex: 1, textAlign: 'center' }}>
                          <div style={{ fontSize: '1.125rem', fontWeight: '700', color: '#ef4444' }}>
                            {worker.readinessBreakdown.not_fit}
                          </div>
                          <div style={{ fontSize: '0.625rem', color: '#6b7280' }}>Not Fit</div>
                        </div>
                      </div>
                    </div>

                    {/* Cycle Details */}
                    {worker.cycleDetails && worker.cycleDetails.length > 0 && (
                      <div>
                        <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', marginBottom: '0.5rem' }}>
                          Completed Cycles This Month
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {worker.cycleDetails.map((cycle, index) => (
                            <div key={index} style={{
                              padding: '0.5rem',
                              backgroundColor: '#f9fafb',
                              borderRadius: '0.25rem',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              fontSize: '0.75rem'
                            }}>
                              <div style={{ color: '#6b7280' }}>
                                {new Date(cycle.cycleStart).toLocaleDateString()} - {new Date(cycle.completedAt).toLocaleDateString()}
                              </div>
                              <div style={{
                                padding: '0.25rem 0.5rem',
                                borderRadius: '0.25rem',
                                backgroundColor: getKPIColor(cycle.kpi.rating),
                                color: 'white',
                                fontWeight: '600'
                              }}>
                                {cycle.kpi.rating}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                   </div>
                 )}
               </div>
             ))}
           </div>
         )}

         {/* Pagination Controls */}
         {totalPages > 1 && (
           <div style={{
             display: 'flex',
             justifyContent: 'center',
             alignItems: 'center',
             gap: window.innerWidth <= 768 ? '0.25rem' : '0.5rem',
             marginTop: '2rem',
             padding: window.innerWidth <= 768 ? '0.75rem' : '1rem',
             backgroundColor: '#f9fafb',
             borderRadius: '0.5rem',
             border: '1px solid #e5e7eb',
             flexWrap: 'wrap'
           }}>
             {/* First Page */}
             <button
               onClick={() => handlePageChange(1)}
               disabled={currentPage === 1}
               style={{
                 padding: window.innerWidth <= 768 ? '0.375rem 0.5rem' : '0.5rem 0.75rem',
                 borderRadius: '0.375rem',
                 border: '1px solid #d1d5db',
                 backgroundColor: currentPage === 1 ? '#f3f4f6' : 'white',
                 color: currentPage === 1 ? '#9ca3af' : '#374151',
                 fontSize: window.innerWidth <= 768 ? '0.75rem' : '0.875rem',
                 fontWeight: '500',
                 cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                 transition: 'all 0.2s ease',
                 minHeight: window.innerWidth <= 768 ? '36px' : 'auto'
               }}
               onMouseEnter={(e) => {
                 if (currentPage !== 1 && window.innerWidth > 768) {
                   e.currentTarget.style.backgroundColor = '#f3f4f6';
                 }
               }}
               onMouseLeave={(e) => {
                 if (currentPage !== 1 && window.innerWidth > 768) {
                   e.currentTarget.style.backgroundColor = 'white';
                 }
               }}
             >
               {window.innerWidth <= 768 ? '««' : '««'}
             </button>

             {/* Previous Page */}
             <button
               onClick={() => handlePageChange(currentPage - 1)}
               disabled={currentPage === 1}
               style={{
                 padding: window.innerWidth <= 768 ? '0.375rem 0.5rem' : '0.5rem 0.75rem',
                 borderRadius: '0.375rem',
                 border: '1px solid #d1d5db',
                 backgroundColor: currentPage === 1 ? '#f3f4f6' : 'white',
                 color: currentPage === 1 ? '#9ca3af' : '#374151',
                 fontSize: window.innerWidth <= 768 ? '0.75rem' : '0.875rem',
                 fontWeight: '500',
                 cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                 transition: 'all 0.2s ease',
                 minHeight: window.innerWidth <= 768 ? '36px' : 'auto'
               }}
               onMouseEnter={(e) => {
                 if (currentPage !== 1 && window.innerWidth > 768) {
                   e.currentTarget.style.backgroundColor = '#f3f4f6';
                 }
               }}
               onMouseLeave={(e) => {
                 if (currentPage !== 1 && window.innerWidth > 768) {
                   e.currentTarget.style.backgroundColor = 'white';
                 }
               }}
             >
               {window.innerWidth <= 768 ? '«' : '« Previous'}
             </button>

             {/* Page Numbers */}
             {Array.from({ length: Math.min(window.innerWidth <= 768 ? 3 : 5, totalPages) }, (_, i) => {
               let pageNum: number;
               if (totalPages <= (window.innerWidth <= 768 ? 3 : 5)) {
                 pageNum = i + 1;
               } else if (currentPage <= 3) {
                 pageNum = i + 1;
               } else if (currentPage >= totalPages - 2) {
                 pageNum = totalPages - (window.innerWidth <= 768 ? 2 : 4) + i;
               } else {
                 pageNum = currentPage - 2 + i;
               }

               return (
                 <button
                   key={pageNum}
                   onClick={() => handlePageChange(pageNum)}
                   style={{
                     padding: window.innerWidth <= 768 ? '0.375rem 0.5rem' : '0.5rem 0.75rem',
                     borderRadius: '0.375rem',
                     border: '1px solid #d1d5db',
                     backgroundColor: currentPage === pageNum ? '#3b82f6' : 'white',
                     color: currentPage === pageNum ? 'white' : '#374151',
                     fontSize: window.innerWidth <= 768 ? '0.75rem' : '0.875rem',
                     fontWeight: '500',
                     cursor: 'pointer',
                     transition: 'all 0.2s ease',
                     minWidth: window.innerWidth <= 768 ? '28px' : '2.5rem',
                     minHeight: window.innerWidth <= 768 ? '36px' : 'auto'
                   }}
                   onMouseEnter={(e) => {
                     if (currentPage !== pageNum && window.innerWidth > 768) {
                       e.currentTarget.style.backgroundColor = '#f3f4f6';
                     }
                   }}
                   onMouseLeave={(e) => {
                     if (currentPage !== pageNum && window.innerWidth > 768) {
                       e.currentTarget.style.backgroundColor = 'white';
                     }
                   }}
                 >
                   {pageNum}
                 </button>
               );
             })}

             {/* Next Page */}
             <button
               onClick={() => handlePageChange(currentPage + 1)}
               disabled={currentPage === totalPages}
               style={{
                 padding: window.innerWidth <= 768 ? '0.375rem 0.5rem' : '0.5rem 0.75rem',
                 borderRadius: '0.375rem',
                 border: '1px solid #d1d5db',
                 backgroundColor: currentPage === totalPages ? '#f3f4f6' : 'white',
                 color: currentPage === totalPages ? '#9ca3af' : '#374151',
                 fontSize: window.innerWidth <= 768 ? '0.75rem' : '0.875rem',
                 fontWeight: '500',
                 cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                 transition: 'all 0.2s ease',
                 minHeight: window.innerWidth <= 768 ? '36px' : 'auto'
               }}
               onMouseEnter={(e) => {
                 if (currentPage !== totalPages && window.innerWidth > 768) {
                   e.currentTarget.style.backgroundColor = '#f3f4f6';
                 }
               }}
               onMouseLeave={(e) => {
                 if (currentPage !== totalPages && window.innerWidth > 768) {
                   e.currentTarget.style.backgroundColor = 'white';
                 }
               }}
             >
               {window.innerWidth <= 768 ? '»' : 'Next »'}
             </button>

             {/* Last Page */}
             <button
               onClick={() => handlePageChange(totalPages)}
               disabled={currentPage === totalPages}
               style={{
                 padding: window.innerWidth <= 768 ? '0.375rem 0.5rem' : '0.5rem 0.75rem',
                 borderRadius: '0.375rem',
                 border: '1px solid #d1d5db',
                 backgroundColor: currentPage === totalPages ? '#f3f4f6' : 'white',
                 color: currentPage === totalPages ? '#9ca3af' : '#374151',
                 fontSize: window.innerWidth <= 768 ? '0.75rem' : '0.875rem',
                 fontWeight: '500',
                 cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                 transition: 'all 0.2s ease',
                 minHeight: window.innerWidth <= 768 ? '36px' : 'auto'
               }}
               onMouseEnter={(e) => {
                 if (currentPage !== totalPages && window.innerWidth > 768) {
                   e.currentTarget.style.backgroundColor = '#f3f4f6';
                 }
               }}
               onMouseLeave={(e) => {
                 if (currentPage !== totalPages && window.innerWidth > 768) {
                   e.currentTarget.style.backgroundColor = 'white';
                 }
               }}
             >
               {window.innerWidth <= 768 ? '»»' : '»»'}
             </button>
           </div>
         )}

         {/* Page Summary */}
         <div style={{
           textAlign: 'center',
           marginTop: '1rem',
           fontSize: window.innerWidth <= 768 ? '0.8rem' : '0.875rem',
           color: '#6b7280'
         }}>
           Page {currentPage} of {totalPages} • {sortedWorkers.length} total members
         </div>
       </div>
     </div>
   );
});

// Add display name for debugging
MonthlyPerformanceSection.displayName = 'MonthlyPerformanceSection';

export default MonthlyPerformanceSection;

