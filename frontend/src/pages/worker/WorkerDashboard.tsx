import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Alert,
  Grid,
} from '@mui/material';
import {
  CheckCircle,
  LocalHospital,
  Work,
  PlayArrow,
  Assessment,
  Favorite,
  Warning,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext.supabase';
import LayoutWithSidebar from '../../components/LayoutWithSidebar';
import SimpleCheckIn from '../../components/SimpleCheckIn';
import SimpleWorkReadiness from '../../components/SimpleWorkReadiness';
import GoalTrackingCard from '../../components/GoalTrackingCard';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { SupabaseAPI } from '../../utils/supabaseApi';
import { dataClient } from '../../lib/supabase';

// Interfaces
interface Case {
  _id: string;
  caseNumber: string;
  status: string;
  description: string;
  priority: string;
}

interface Appointment {
  _id: string;
  title: string;
  date: string;
}

interface Notification {
  _id: string;
  title: string;
  message: string;
  type: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  isRead: boolean;
  createdAt: string;
  sender: {
    firstName: string;
    lastName: string;
  };
  actionUrl?: string;
}

interface DashboardStats {
  totalCheckIns: number;
  completedTasks: number;
  upcomingAppointments: number;
  unreadNotifications: number;
}

const WorkerDashboard: React.FC = memo(() => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [cases, setCases] = useState<Case[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState('');
  const [showSimpleCheckIn, setShowSimpleCheckIn] = useState(false);
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [checkInLoading, setCheckInLoading] = useState(false);
  const [checkInSuccess, setCheckInSuccess] = useState(false);
  const [checkInError, setCheckInError] = useState<string | null>(null);
  const [showWorkReadinessModal, setShowWorkReadinessModal] = useState(false);
  const [showWorkReadinessConfirmation, setShowWorkReadinessConfirmation] = useState(false);
  const [workReadinessForm, setWorkReadinessForm] = useState({
    fatigueLevel: '',
    painDiscomfort: '',
    painAreas: [] as string[],
    readinessLevel: '',
    mood: '',
    notes: ''
  });
  const [workReadinessLoading, setWorkReadinessLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [hasSubmittedToday, setHasSubmittedToday] = useState(false);
  const [todaySubmission, setTodaySubmission] = useState<any>(null);
  const [showSimpleWorkReadiness, setShowSimpleWorkReadiness] = useState(false);
  const [workReadinessSuccess, setWorkReadinessSuccess] = useState(false);
  const [workReadinessError, setWorkReadinessError] = useState<string | null>(null);
  const [timeUntilNextSubmission, setTimeUntilNextSubmission] = useState<string>('');
  const [showCycleWelcome, setShowCycleWelcome] = useState(false);
  const [cycleWelcomeMessage, setCycleWelcomeMessage] = useState('');

  const fetchWorkerData = useCallback(async () => {
    try {
      setLoading(true);
      // Skip API calls - using Supabase auth
      console.log('Worker dashboard data fetch skipped - using Supabase auth');
      const casesRes = { data: { cases: [] } };
      const notificationsRes = { data: { notifications: [] } };

      setCases(casesRes.data.cases || []);
      setNotifications(notificationsRes.data.notifications || []);
    } catch (error) {
      console.error('Error fetching worker data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    console.log('🔄 WorkerDashboard useEffect triggered');
    console.log('🔄 User:', user);
    console.log('🔄 User role:', user?.role);
    console.log('🔄 User ID:', user?.id);
    
    fetchWorkerData();
    checkTodaySubmission();
    
    // Handle login cycle for workers
    if (user?.role === 'worker') {
      console.log('🎯 Calling handleLoginCycle for worker');
      handleLoginCycle();
    } else {
      console.log('❌ Not a worker, skipping login cycle');
    }
  }, [fetchWorkerData, user?.id, user?.role]);

  const handleLoginCycle = async () => {
    try {
      if (!user?.id) {
        console.log('❌ No user ID available');
        return;
      }
      
      console.log('🎯 Starting login cycle for worker:', user.id);
      console.log('🎯 User role:', user.role);
      
      const response = await fetch('/api/goal-kpi/login-cycle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ workerId: user.id })
      });
      
      console.log('🔍 Response status:', response.status);
      const result = await response.json();
      console.log('🔍 Full result:', result);
      
      if (result.success) {
        console.log('✅ Login cycle started:', result.message);
        console.log('🔍 Debug - result.day:', result.day);
        console.log('🔍 Debug - result.needsNewLogin:', result.needsNewLogin);
        console.log('🔍 Debug - result.isFirstTimeLogin:', result.isFirstTimeLogin);
        console.log('🔍 Debug - result.isNewCycleStart:', result.isNewCycleStart);
        console.log('🔍 Debug - result.isCycleReset:', result.isCycleReset);
        
        // Check if it's a special Day 1 case (first time, new cycle, or reset)
        if (result.isFirstTimeLogin || result.isNewCycleStart || result.isCycleReset) {
          console.log('🎉 Showing Day 1 welcome popup!');
          // Show special Day 1 welcome popup
          let message = "🎉 Welcome! This is your first day of the 7-day Work Readiness cycle!";
          if (result.isNewCycleStart) {
            message = "🎉 Great! Your new 7-day Work Readiness cycle has started!";
          } else if (result.isCycleReset) {
            message = "🔄 A new cycle has started! Let's begin fresh!";
          }
          setCycleWelcomeMessage(message);
          setShowCycleWelcome(true);
        } else if (result.needsNewLogin) {
          // Cycle completed, waiting for next login
          setSuccessMessage(result.message);
          console.log('🔄 Cycle completed, waiting for next login to start new cycle');
        } else {
          // Regular cycle message
          setSuccessMessage(result.message);
          console.log('📝 Regular cycle message:', result.message);
        }
      } else {
        console.error('❌ Failed to start login cycle:', result.message);
      }
    } catch (error) {
      console.error('❌ Error starting login cycle:', error);
    }
  };

  const calculateTimeUntilNextSubmission = useCallback((lastSubmissionTime: string) => {
    const lastTime = new Date(lastSubmissionTime);
    const now = new Date();
    const hoursSinceLastSubmission = (now.getTime() - lastTime.getTime()) / (1000 * 60 * 60);
    const hoursRemaining = 24 - hoursSinceLastSubmission;
    
    if (hoursRemaining <= 0) {
      setTimeUntilNextSubmission('');
      return;
    }
    
    const hours = Math.floor(hoursRemaining);
    const minutes = Math.floor((hoursRemaining - hours) * 60);
    
    if (hours > 0) {
      setTimeUntilNextSubmission(`${hours}h ${minutes}m remaining`);
    } else {
      setTimeUntilNextSubmission(`${minutes}m remaining`);
    }
  }, []);

  const checkTodaySubmission = async () => {
    try {
      if (!user?.id) return;
      
      console.log('🔍 Checking last work readiness submission for user:', user.id);
      
      // Get the most recent submission (not just today's)
      const { data, error } = await dataClient
        .from('work_readiness')
        .select('*')
        .eq('worker_id', user.id)
        .order('submitted_at', { ascending: false })
        .limit(1);
      
      if (error) {
        console.error('❌ Error fetching last submission:', error);
        setHasSubmittedToday(false);
        setTodaySubmission(null);
        return;
      }
      
      if (data && data.length > 0) {
        const lastSubmission = data[0];
        const lastSubmissionTime = new Date(lastSubmission.submitted_at);
        const now = new Date();
        const hoursSinceLastSubmission = (now.getTime() - lastSubmissionTime.getTime()) / (1000 * 60 * 60);
        
        console.log('📅 Last submission:', lastSubmission.submitted_at);
        console.log('⏰ Hours since last submission:', hoursSinceLastSubmission);
        
        if (hoursSinceLastSubmission < 24) {
        setHasSubmittedToday(true);
          setTodaySubmission(lastSubmission);
          calculateTimeUntilNextSubmission(lastSubmission.submitted_at);
          console.log('✅ Work readiness is disabled - last submission was', Math.round(hoursSinceLastSubmission), 'hours ago');
      } else {
        setHasSubmittedToday(false);
        setTodaySubmission(null);
          setTimeUntilNextSubmission('');
          console.log('✅ Work readiness is enabled - last submission was', Math.round(hoursSinceLastSubmission), 'hours ago');
        }
      } else {
        setHasSubmittedToday(false);
        setTodaySubmission(null);
        console.log('❌ No previous submissions found');
      }
    } catch (error) {
      console.error('❌ Error checking last submission:', error);
      setHasSubmittedToday(false);
      setTodaySubmission(null);
    }
  };

  // Add CSS for animations
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      
      @keyframes fadeIn {
        0% { opacity: 0; }
        100% { opacity: 1; }
      }
      
      @keyframes slideInUp {
        0% { 
          opacity: 0; 
          transform: translateY(30px) scale(0.95); 
        }
        100% { 
          opacity: 1; 
          transform: translateY(0) scale(1); 
        }
      }
      
      @keyframes pulse {
        0%, 100% { 
          transform: scale(1); 
        }
        50% { 
          transform: scale(1.05); 
        }
      }
      
      .animate-spin {
        animation: spin 1s linear infinite;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      if (document.head.contains(style)) {
        document.head.removeChild(style);
      }
    };
  }, []);

  // Countdown timer for work readiness
  useEffect(() => {
    if (!hasSubmittedToday || !todaySubmission) return;

    const updateCountdown = () => {
      calculateTimeUntilNextSubmission(todaySubmission.submitted_at);
    };

    // Update immediately
    updateCountdown();

    // Update every minute
    const interval = setInterval(updateCountdown, 60000);

    return () => clearInterval(interval);
  }, [hasSubmittedToday, todaySubmission, calculateTimeUntilNextSubmission]);

  // Global mouse and touch events for dragging
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      
      const sliderTrack = document.querySelector('[data-slider-track]') as HTMLElement;
      if (!sliderTrack) return;
      
      const rect = sliderTrack.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
      
      // Convert percentage to level (1-5)
      let level: number;
      if (percentage <= 20) level = 1;
      else if (percentage <= 40) level = 2;
      else if (percentage <= 60) level = 3;
      else if (percentage <= 80) level = 4;
      else level = 5;
      
      setWorkReadinessForm(prev => ({ ...prev, fatigueLevel: level.toString() }));
    };

    const handleGlobalTouchMove = (e: TouchEvent) => {
      if (!isDragging) return;
      
      const sliderTrack = document.querySelector('[data-slider-track]') as HTMLElement;
      if (!sliderTrack) return;
      
      const rect = sliderTrack.getBoundingClientRect();
      const x = e.touches[0].clientX - rect.left;
      const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
      
      // Convert percentage to level (1-5)
      let level: number;
      if (percentage <= 20) level = 1;
      else if (percentage <= 40) level = 2;
      else if (percentage <= 60) level = 3;
      else if (percentage <= 80) level = 4;
      else level = 5;
      
      setWorkReadinessForm(prev => ({ ...prev, fatigueLevel: level.toString() }));
    };

    const handleGlobalMouseUp = () => {
      setIsDragging(false);
    };

    const handleGlobalTouchEnd = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
      document.addEventListener('touchmove', handleGlobalTouchMove, { passive: false });
      document.addEventListener('touchend', handleGlobalTouchEnd);
    }

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
      document.removeEventListener('touchmove', handleGlobalTouchMove);
      document.removeEventListener('touchend', handleGlobalTouchEnd);
    };
  }, [isDragging]);

  // Memoized calculations
  const unreadNotifications = useMemo(() => 
    notifications.filter(n => !n.isRead), [notifications]
  );

  const unreadNotificationCount = useMemo(() => 
    unreadNotifications.length, [unreadNotifications]
  );

  const recentNotifications = useMemo(() => 
    unreadNotifications.slice(0, 3), [unreadNotifications]
  );

  useEffect(() => {
    if (showSimpleCheckIn && cases.length === 1 && !selectedCase) {
      setSelectedCase(cases[0]);
    }
  }, [showSimpleCheckIn, cases, selectedCase]);

  const handleSimpleCheckInSubmit = useCallback(async (data: any) => {
    try {
      setCheckInLoading(true);
      setCheckInError(null);
      setCheckInSuccess(false);
      
      // Convert SimpleCheckIn data to backend format
      const checkInData = {
        case: data.caseId || selectedCase?._id || cases[0]?._id,
        painLevel: {
          current: data.painLevel,
          worst: data.painLevel,
          average: data.painLevel
        },
        functionalStatus: {
          sleep: data.sleepQuality === 'good' ? 8 : data.sleepQuality === 'ok' ? 5 : 2,
          mood: data.mood === 'great' ? 8 : data.mood === 'okay' ? 5 : 2,
          energy: data.mood === 'great' ? 8 : data.mood === 'okay' ? 5 : 2,
          mobility: data.canDoJob === 'yes' ? 8 : data.canDoJob === 'modified' ? 5 : 2,
          dailyActivities: data.canDoJob === 'yes' ? 8 : data.canDoJob === 'modified' ? 5 : 2
        },
        workStatus: {
          workedToday: data.canDoJob !== 'no',
          hoursWorked: data.canDoJob === 'yes' ? 8 : data.canDoJob === 'modified' ? 4 : 0,
          difficulties: data.canDoJob === 'modified' ? ['Modified duties'] : [],
          painAtWork: data.canDoJob === 'no' ? data.painLevel : 0
        },
        symptoms: {
          swelling: false,
          stiffness: false,
          weakness: false,
          numbness: false,
          tingling: false,
          other: ''
        },
        notes: `Check-in: Pain ${data.painLevel}/10, Job: ${data.canDoJob}, Mood: ${data.mood}, Sleep: ${data.sleepQuality}`
      };

      console.log('Submitting check-in data:', checkInData);
      
      // Skip API call - using Supabase auth
      console.log('Check-in submission skipped - using Supabase auth');
      
      // Show success modal
      setCheckInSuccess(true);
      
      // Refresh data after a short delay
      setTimeout(async () => {
        await fetchWorkerData();
      }, 2000);
      
    } catch (err: any) {
      console.error('Error submitting check-in:', err);
      
      // Check if it's a duplicate check-in error
      if (err.response?.data?.message?.includes('already exists') || 
          err.response?.data?.message?.includes('duplicate')) {
        setCheckInError('duplicate');
      } else {
        setCheckInError(err.response?.data?.message || 'Failed to submit check-in');
      }
      
      // Don't set general error state for check-in errors - modal handles it
    } finally {
      setCheckInLoading(false);
    }
  }, [selectedCase, cases, fetchWorkerData]);

  // Callback handlers
  const handleNotificationAction = useCallback((notification: Notification) => {
    // Skip API call - using Supabase auth
    console.log('Notification read skipped - using Supabase auth');
    window.location.href = notification.actionUrl || '/cases';
  }, []);

  const handleMarkAsRead = useCallback(async (notificationId: string) => {
    try {
      // Skip API call - using Supabase auth
      console.log('Notification read skipped - using Supabase auth');
      // Refresh notifications
      setNotifications([]);
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  }, []);

  const handleCheckInClick = useCallback(() => {
    setShowSimpleCheckIn(true);
  }, []);

  const handleRehabPlanClick = useCallback(() => {
    navigate('/worker/rehabilitation-plan');
  }, [navigate]);

  const handleWorkReadinessClick = useCallback(() => {
    setShowSimpleWorkReadiness(true);
  }, []);

  const handleCloseWorkReadiness = useCallback(() => {
    setShowSimpleWorkReadiness(false);
    setWorkReadinessSuccess(false);
    setWorkReadinessError(null);
  }, []);

  const handleSimpleWorkReadinessSubmit = useCallback(async (data: any) => {
    if (!user?.id) {
      setWorkReadinessError('User not authenticated');
      return;
    }

    console.log('🚀 Starting work readiness submission for user:', user.id);
    console.log('🚀 User team:', user.team);
    console.log('🚀 Has submitted today:', hasSubmittedToday);

    try {
      setWorkReadinessLoading(true);
      setWorkReadinessError(null);
      setWorkReadinessSuccess(false);
      
      // Get worker's team leader ID
      let teamLeaderId = null;
      console.log('🔍 Worker team info:', { team: user.team, workerId: user.id });
      
      if (user.team) {
        try {
          // Look for team leader who manages this team (in managed_teams array)
          const { data: teamLeader, error: teamLeaderError } = await dataClient
            .from('users')
            .select('id, first_name, last_name, managed_teams')
            .eq('role', 'team_leader')
            .eq('is_active', true)
            .contains('managed_teams', [user.team])
            .single();
          
          if (!teamLeaderError && teamLeader) {
            teamLeaderId = teamLeader.id;
            console.log('✅ Found team leader:', { 
              id: teamLeader.id, 
              name: `${teamLeader.first_name} ${teamLeader.last_name}`,
              managedTeams: teamLeader.managed_teams,
              workerTeam: user.team 
            });
          } else {
            console.error('❌ Team leader lookup failed:', teamLeaderError);
            console.log('🔍 Looking for team leader who manages team:', user.team);
            
            // Fallback: try to find team leader by team field as well
            const { data: fallbackLeader, error: fallbackError } = await dataClient
              .from('users')
              .select('id, first_name, last_name, team, email')
              .eq('role', 'team_leader')
              .eq('team', user.team)
              .eq('is_active', true)
              .single();
            
            if (!fallbackError && fallbackLeader) {
              teamLeaderId = fallbackLeader.id;
              console.log('✅ Found team leader (fallback):', { 
                id: fallbackLeader.id, 
                name: `${fallbackLeader.first_name} ${fallbackLeader.last_name}`,
                email: fallbackLeader.email,
                team: fallbackLeader.team,
                workerTeam: user.team 
              });
            } else {
              console.error('❌ Fallback team leader lookup also failed:', fallbackError);
              
              // Additional debugging: list all team leaders
              const { data: allLeaders, error: allLeadersError } = await dataClient
                .from('users')
                .select('id, first_name, last_name, email, team, managed_teams')
                .eq('role', 'team_leader')
                .eq('is_active', true);
              
              if (!allLeadersError && allLeaders) {
                console.log('🔍 All active team leaders:', allLeaders);
              }
            }
          }
        } catch (error) {
          console.error('❌ Error finding team leader:', error);
        }
      } else {
        console.warn('⚠️ Worker has no team assigned');
      }
      
      // Convert simple form data to work readiness format
      // Map 0-10 scale to appropriate database values
      const fatigueLevel = Math.max(0, Math.min(10, data.fatigueLevel)); // Ensure 0-10 range
      
      let workReadinessData = {
        worker_id: user.id,
        team_leader_id: teamLeaderId, // Set to specific team leader
        team: user.team || 'DEFAULT TEAM',
        fatigue_level: fatigueLevel,
        pain_discomfort: data.painLevel > 0 ? 'yes' : 'no',
        readiness_level: data.painLevel <= 2 && data.fatigueLevel <= 2 && data.stressLevel <= 2 && data.sleepHours >= 6 ? 'fit' : 
                        data.painLevel <= 5 && data.fatigueLevel <= 5 && data.stressLevel <= 5 ? 'minor' : 'not_fit',
        mood: data.stressLevel <= 2 ? 'excellent' : data.stressLevel <= 5 ? 'good' : data.stressLevel <= 7 ? 'okay' : 'poor',
        notes: data.notes || null,
        submitted_at: new Date().toISOString(),
        status: 'submitted'
      };

      console.log('📤 Submitting work readiness data:', workReadinessData);
      console.log('📤 Team leader ID for notification:', teamLeaderId);
      
      // Submit work readiness data with cycle tracking
      try {
        const cycleResponse = await fetch(`${process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000'}/api/goal-kpi/submit-assessment`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            workerId: user.id,
            assessmentData: workReadinessData
          })
        });
        
        const cycleResult = await cycleResponse.json();
        
        if (cycleResult.success) {
          console.log('✅ Work readiness submitted with cycle data:', cycleResult.message);
          // Show cycle progress message
          setSuccessMessage(cycleResult.message);
          
          // Use the assessment data returned from the API (includes cycle info)
          const result = {
            workReadiness: cycleResult.assessmentData
          };
          
          console.log('✅ Work readiness submitted successfully:', result);
        } else {
          throw new Error(cycleResult.message || 'Failed to submit assessment');
        }
      } catch (cycleError) {
        console.error('❌ Error submitting work readiness:', cycleError);
        throw cycleError;
      }
      
      // Send notification to team leader if found
      if (teamLeaderId) {
        try {
          const notificationData = {
            recipient_id: teamLeaderId,
            sender_id: user.id,
            type: 'work_readiness_submitted',
            title: workReadinessData.readiness_level === 'not_fit' ? 'Work Readiness Assessment - NOT FIT' : 'Work Readiness Assessment Submitted',
            message: `${user.firstName || 'Worker'} has submitted their work readiness assessment. Status: ${workReadinessData.readiness_level === 'not_fit' ? 'NOT FIT FOR WORK' : workReadinessData.readiness_level === 'minor' ? 'Minor Concerns' : 'Fit for Work'}.`,
            priority: workReadinessData.readiness_level === 'not_fit' ? 'high' : 'medium',
            action_url: '/team-leader',
            metadata: {
              worker_id: user.id,
              worker_name: user.firstName || 'Worker',
              readiness_level: workReadinessData.readiness_level,
              fatigue_level: workReadinessData.fatigue_level,
              mood: workReadinessData.mood
            }
          };

          console.log('📤 Sending notification to team leader:', {
            teamLeaderId: teamLeaderId,
            notificationData: notificationData
          });

          const { error: notificationError } = await dataClient
            .from('notifications')
            .insert([notificationData]);

          if (notificationError) {
            console.error('❌ Failed to send notification to team leader:', notificationError);
            console.error('❌ Notification data that failed:', notificationData);
          } else {
            console.log('✅ Notification sent to team leader successfully:', teamLeaderId);
          }
        } catch (notificationError) {
          console.error('❌ Error sending notification:', notificationError);
        }
      } else {
        console.warn('⚠️ No team leader ID found, skipping notification');
        
        // Additional debugging: try to find team leader by email
        try {
          const { data: teamLeaderByEmail, error: emailError } = await dataClient
            .from('users')
            .select('id, first_name, last_name, email, team, managed_teams')
            .eq('email', 'admin_team_leader@test.com')
            .eq('is_active', true)
            .single();
          
          if (!emailError && teamLeaderByEmail) {
            console.log('🔍 Found team leader by email:', teamLeaderByEmail);
            
            // Check if this team leader manages the worker's team
            if (teamLeaderByEmail.managed_teams && teamLeaderByEmail.managed_teams.includes(user.team)) {
              console.log('✅ Team leader manages worker team, sending notification...');
              
              const notificationData = {
                recipient_id: teamLeaderByEmail.id,
                sender_id: user.id,
                type: 'work_readiness_submitted',
                title: workReadinessData.readiness_level === 'not_fit' ? 'Work Readiness Assessment - NOT FIT' : 'Work Readiness Assessment Submitted',
                message: `${user.firstName || 'Worker'} has submitted their work readiness assessment. Status: ${workReadinessData.readiness_level === 'not_fit' ? 'NOT FIT FOR WORK' : workReadinessData.readiness_level === 'minor' ? 'Minor Concerns' : 'Fit for Work'}.`,
                priority: workReadinessData.readiness_level === 'not_fit' ? 'high' : 'medium',
                action_url: '/team-leader',
                metadata: {
                  worker_id: user.id,
                  worker_name: user.firstName || 'Worker',
                  readiness_level: workReadinessData.readiness_level,
                  fatigue_level: workReadinessData.fatigue_level,
                  mood: workReadinessData.mood
                }
              };

              const { error: notificationError } = await dataClient
                .from('notifications')
                .insert([notificationData]);

              if (notificationError) {
                console.error('❌ Failed to send notification by email lookup:', notificationError);
              } else {
                console.log('✅ Notification sent to team leader by email lookup:', teamLeaderByEmail.id);
              }
            } else {
              console.log('❌ Team leader does not manage worker team:', {
                teamLeaderTeams: teamLeaderByEmail.managed_teams,
                workerTeam: user.team
              });
            }
          } else {
            console.error('❌ Team leader not found by email:', emailError);
          }
        } catch (error) {
          console.error('❌ Error in email lookup:', error);
        }
      }
      
      // Show success
      setWorkReadinessSuccess(true);
      
      // Update submission status
      setHasSubmittedToday(true);
      
      // Refresh the submission status to get the latest data
      await checkTodaySubmission();
      
      // Refresh data after a short delay
      setTimeout(async () => {
        await checkTodaySubmission();
      }, 2000);
      
    } catch (err: any) {
      console.error('Error submitting work readiness:', err);
      setWorkReadinessError(err.message || 'Failed to submit work readiness assessment');
    } finally {
      setWorkReadinessLoading(false);
    }
  }, [user]);

  const handleWorkReadinessSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!workReadinessForm.fatigueLevel || !workReadinessForm.painDiscomfort || 
        !workReadinessForm.readinessLevel || !workReadinessForm.mood || !user?.id) {
      return;
    }

    // Show confirmation modal instead of submitting directly
    setShowWorkReadinessModal(false);
    setShowWorkReadinessConfirmation(true);
  }, [workReadinessForm, user]);

  const handleConfirmWorkReadiness = useCallback(async () => {
    if (!workReadinessForm.fatigueLevel || !workReadinessForm.painDiscomfort || 
        !workReadinessForm.readinessLevel || !workReadinessForm.mood || !user?.id) {
      return;
    }

    // 🚨 DUPLICATE PREVENTION: Check if already submitted today
    if (hasSubmittedToday) {
      setSuccessMessage('You have already submitted your work readiness assessment for today.');
      setShowWorkReadinessConfirmation(false);
      return;
    }

    // 🚨 DUPLICATE PREVENTION: Check if submission is already in progress
    if (workReadinessLoading) {
      console.log('⚠️ Submission already in progress, ignoring duplicate click');
      return;
    }

    try {
      setWorkReadinessLoading(true);
      
      // 🚨 DUPLICATE PREVENTION: Check for existing submission in database
      const today = new Date().toISOString().split('T')[0];
      const existingSubmission = await SupabaseAPI.getWorkReadinessByWorker(user.id, today);
      
      if (existingSubmission && existingSubmission.length > 0) {
        console.log('⚠️ Duplicate submission detected, already submitted today');
        setHasSubmittedToday(true);
        setTodaySubmission(existingSubmission[0]);
        setSuccessMessage('You have already submitted your work readiness assessment for today.');
        setShowWorkReadinessConfirmation(false);
        return;
      }
      
      // Get worker's team leader ID
      let teamLeaderId = null;
      if (user.team) {
        try {
          const { data: teamLeader, error: teamLeaderError } = await dataClient
            .from('users')
            .select('id, first_name, last_name, managed_teams')
            .eq('role', 'team_leader')
            .eq('is_active', true)
            .contains('managed_teams', [user.team])
            .single();
          
          if (!teamLeaderError && teamLeader) {
            teamLeaderId = teamLeader.id;
          }
        } catch (error) {
          console.error('Error finding team leader:', error);
        }
      }

      // Prepare work readiness data for submission
      const workReadinessData = {
        worker_id: user.id,
        team_leader_id: teamLeaderId,
        team: user.team || 'DEFAULT TEAM',
        fatigue_level: parseInt(workReadinessForm.fatigueLevel),
        pain_discomfort: workReadinessForm.painDiscomfort,
        readiness_level: workReadinessForm.readinessLevel,
        mood: workReadinessForm.mood,
        notes: workReadinessForm.notes || '',
        submitted_at: new Date().toISOString(),
        status: 'submitted'
      };

      console.log('Submitting work readiness data:', workReadinessData);
      
      // Submit work readiness data with cycle tracking
      const cycleResponse = await fetch(`${process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000'}/api/goal-kpi/submit-assessment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          workerId: user.id,
          assessmentData: workReadinessData
        })
      });
      
      const cycleResult = await cycleResponse.json();
      
      if (cycleResult.success) {
        console.log('✅ Work readiness submitted with cycle data:', cycleResult.message);
        // Show cycle progress message
        setSuccessMessage(cycleResult.message);
        
        // Use the assessment data returned from the API (includes cycle info)
        const result = {
          workReadiness: cycleResult.assessmentData
        };
        
        console.log('Work readiness submitted successfully:', result);
        
        // Reset form and close modals
        setWorkReadinessForm({
          fatigueLevel: '',
          painDiscomfort: '',
          painAreas: [],
          readinessLevel: '',
          mood: '',
          notes: ''
        });
        setShowWorkReadinessConfirmation(false);
        
        // Show success message
        setSuccessMessage('Work readiness assessment submitted successfully!');
        
        // Update submission status
        setHasSubmittedToday(true);
        setTodaySubmission(result.workReadiness);
        
      } else {
        throw new Error(cycleResult.message || 'Failed to submit assessment');
      }
      
    } catch (error: any) {
      console.error('Error submitting work readiness:', error);
      setHasSubmittedToday(false);
      setTodaySubmission(null);
      setSuccessMessage('Failed to submit work readiness assessment. Please try again.');
    } finally {
      setWorkReadinessLoading(false);
    }
  }, [workReadinessForm, user, hasSubmittedToday, workReadinessLoading]);

  const handleCancelWorkReadiness = useCallback(() => {
    setShowWorkReadinessConfirmation(false);
    setShowWorkReadinessModal(true);
  }, []);

  const handleSliderMouseDown = useCallback(() => {
    setIsDragging(true);
  }, []);

  const handleSliderTouchStart = useCallback(() => {
    setIsDragging(true);
  }, []);

  const handleSliderClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    
    // Convert percentage to level (1-5)
    let level: number;
    if (percentage <= 20) level = 1;
    else if (percentage <= 40) level = 2;
    else if (percentage <= 60) level = 3;
    else if (percentage <= 80) level = 4;
    else level = 5;
    
    setWorkReadinessForm(prev => ({ ...prev, fatigueLevel: level.toString() }));
  }, []);

  const handleCloseCheckIn = useCallback(() => {
    setShowSimpleCheckIn(false);
    setSelectedCase(null);
    setCheckInSuccess(false);
    setCheckInError(null);
  }, []);

  if (loading) {
    return (
      <LayoutWithSidebar>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
          <Typography>Loading dashboard...</Typography>
        </Box>
      </LayoutWithSidebar>
    );
  }

  return (
    <LayoutWithSidebar>
      <Box sx={{ 
        minHeight: '100vh', 
        background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
        padding: { xs: 1, sm: 2, md: 3 },
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}>
        {/* Error messages now handled by modals - no inline error display needed */}

        {successMessage && (
          <Alert 
            severity="success" 
            sx={{ 
              mb: 3, 
              borderRadius: 2,
              backgroundColor: '#f0fdf4',
              borderColor: '#bbf7d0',
              color: '#166534'
            }} 
            onClose={() => setSuccessMessage('')}
          >
            {successMessage}
          </Alert>
        )}

        {/* Welcome Section */}
        <Box sx={{ 
          textAlign: 'center', 
          mb: 6,
          width: '100%',
          maxWidth: { xs: '100%', sm: 600 }
        }}>
          <Typography 
            variant="h3" 
            component="h1" 
            sx={{ 
              fontWeight: 700, 
              color: '#1e293b',
              mb: 2,
              fontSize: { xs: '1.8rem', sm: '2.2rem', md: '3rem' }
            }}
          >
            Welcome Back!
          </Typography>
          <Typography 
            variant="h6" 
            sx={{ 
              color: '#64748b',
              fontWeight: 400,
              fontSize: { xs: '0.9rem', sm: '1rem', md: '1.25rem' },
              px: { xs: 2, sm: 0 },
              mb: 3
            }}
          >
            Let's check in on your recovery progress today
          </Typography>
          
          {/* Team Information */}
          {user?.team && (
            <Box sx={{
              display: 'inline-flex',
              alignItems: 'center',
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '0.5rem 1rem',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              transition: 'all 0.2s ease',
              '&:hover': {
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                borderColor: '#3b82f6'
              }
            }}>
              <Work sx={{ 
                color: '#6b7280', 
                mr: 1, 
                fontSize: '1.25rem' 
              }} />
              <Typography 
                variant="body2" 
                sx={{ 
                  fontWeight: 500, 
                  color: '#374151',
                  fontSize: '0.875rem',
                  mr: 1
                }}
              >
                {user.team}
              </Typography>
              {user?.package && (
                <Chip
                  label={user.package === 'package1' ? 'Package 1' : user.package === 'package2' ? 'Package 2' : 'Package 3'}
                  size="small"
                  sx={{
                    backgroundColor: user.package === 'package1' ? '#dcfce7' : user.package === 'package2' ? '#dbeafe' : '#fef3c7',
                    color: user.package === 'package1' ? '#166534' : user.package === 'package2' ? '#1e40af' : '#92400e',
                    fontSize: '0.75rem',
                    height: '20px',
                    fontWeight: 500
                  }}
                />
              )}
            </Box>
          )}
        </Box>

        {/* Weekly Goal Tracking & KPI */}
        <Box sx={{ mb: 4, width: '100%', maxWidth: { xs: '100%', sm: 800 } }}>
          <GoalTrackingCard userId={user?.id || ''} />
        </Box>

        {/* Main Action Cards */}
        {/* Notifications Section */}
        {unreadNotificationCount > 0 && (
          <Card sx={{ 
            mb: 3, 
            borderRadius: 3,
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
            backgroundColor: 'white',
            border: '1px solid #e2e8f0'
          }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2} sx={{ mb: 2 }}>
                <Box sx={{ 
                  backgroundColor: '#f59e0b',
                  borderRadius: 2,
                  p: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Warning sx={{ fontSize: 20, color: 'white' }} />
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b' }}>
                  Alerts ({unreadNotificationCount})
                </Typography>
              </Box>
              
              {recentNotifications.map((notification) => (
                <Box key={notification._id} sx={{ 
                  mb: 3, 
                  p: 3, 
                  bgcolor: notification.type === 'high_pain' ? '#fef2f2' : 
                           notification.type === 'rtw_review' ? '#fef3c7' : 
                           notification.type === 'case_closed' ? '#f0fdf4' :
                           notification.type === 'return_to_work' ? '#fef3c7' : '#f0f9ff', 
                  borderRadius: 2,
                  border: notification.type === 'high_pain' ? '1px solid #fecaca' :
                          notification.type === 'rtw_review' ? '1px solid #fde68a' :
                          notification.type === 'case_closed' ? '1px solid #bbf7d0' :
                          notification.type === 'return_to_work' ? '1px solid #fde68a' : '1px solid #bae6fd'
                }}>
                  <Box display="flex" alignItems="center" gap={2} sx={{ mb: 2 }}>
                    <Box sx={{ 
                      backgroundColor: notification.type === 'high_pain' ? '#ef4444' : 
                                      notification.type === 'rtw_review' ? '#f59e0b' : 
                                      notification.type === 'case_closed' ? '#22c55e' :
                                      notification.type === 'return_to_work' ? '#f59e0b' : '#3b82f6',
                      borderRadius: 2,
                      p: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {notification.type === 'high_pain' ? <LocalHospital sx={{ fontSize: 20, color: 'white' }} /> :
                       notification.type === 'rtw_review' ? <Work sx={{ fontSize: 20, color: 'white' }} /> :
                       notification.type === 'case_closed' ? <CheckCircle sx={{ fontSize: 20, color: 'white' }} /> :
                       notification.type === 'return_to_work' ? <Work sx={{ fontSize: 20, color: 'white' }} /> :
                       <Assessment sx={{ fontSize: 20, color: 'white' }} />}
                    </Box>
                    <Box flex={1}>
                      <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b' }}>
                        {notification.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        From: {notification.sender.firstName} {notification.sender.lastName} • {new Date(notification.createdAt).toLocaleString()}
                      </Typography>
                    </Box>
                    <Chip
                      label={notification.priority.toUpperCase()}
                      color={notification.priority === 'urgent' ? 'error' : 
                             notification.priority === 'high' ? 'warning' : 'info'}
                      size="small"
                      sx={{ fontWeight: 600 }}
                    />
                  </Box>
                  
                  <Typography variant="body1" sx={{ mb: 2, color: '#374151' }}>
                    {notification.message}
                  </Typography>
                  
                  <Box display="flex" gap={1} sx={{ mt: 2 }}>
                    {notification.actionUrl && (
                      <Button
                        variant="contained"
                        color={notification.type === 'high_pain' ? 'error' : 
                               notification.type === 'rtw_review' ? 'warning' : 
                               notification.type === 'case_closed' ? 'success' :
                               notification.type === 'return_to_work' ? 'warning' : 'primary'}
                        size="small"
                        onClick={() => handleNotificationAction(notification)}
                        sx={{
                          borderRadius: 2,
                          textTransform: 'none',
                          fontWeight: 600,
                          backgroundColor: notification.type === 'high_pain' ? '#ef4444' : 
                                          notification.type === 'rtw_review' ? '#f59e0b' : 
                                          notification.type === 'case_closed' ? '#22c55e' :
                                          notification.type === 'return_to_work' ? '#f59e0b' : '#3b82f6',
                          '&:hover': {
                            backgroundColor: notification.type === 'high_pain' ? '#dc2626' : 
                                            notification.type === 'rtw_review' ? '#d97706' : 
                                            notification.type === 'case_closed' ? '#16a34a' :
                                            notification.type === 'return_to_work' ? '#d97706' : '#2563eb'
                          }
                        }}
                      >
                        View Details
                      </Button>
                    )}
                    <Button
                      variant="outlined"
                      color="success"
                      size="small"
                      startIcon={<CheckCircle />}
                      onClick={() => handleMarkAsRead(notification._id)}
                      sx={{
                        borderRadius: 2,
                        textTransform: 'none',
                        fontWeight: 600,
                        borderColor: '#22c55e',
                        color: '#22c55e',
                        '&:hover': {
                          borderColor: '#16a34a',
                          backgroundColor: '#f0fdf4'
                        }
                      }}
                    >
                      Mark as Read
                    </Button>
                  </Box>
                </Box>
              ))}
              
              {unreadNotifications.length > 3 && (
                <Button
                  variant="outlined"
                  color="warning"
                  fullWidth
                  sx={{
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 600,
                    borderColor: '#f59e0b',
                    color: '#92400e',
                    '&:hover': {
                      borderColor: '#d97706',
                      backgroundColor: '#fef3c7'
                    }
                  }}
                >
                  View All Alerts ({unreadNotifications.length})
                </Button>
              )}
            </CardContent>
          </Card>
        )}


        <Grid container spacing={window.innerWidth <= 768 ? 2 : 3} sx={{ 
          maxWidth: { xs: '100%', sm: 600 }, 
          mx: 'auto',
          px: { xs: 2, sm: 0 }
        }}>
          {/* Daily Check-In Card - Only for Package 2+ */}
          {user?.package && user.package !== 'package1' && (
            <Grid item xs={12}>
              <Card 
                sx={{ 
                  borderRadius: 3,
                  boxShadow: '0 4px 20px rgba(59, 130, 246, 0.15)',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                  color: 'white',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 8px 30px rgba(59, 130, 246, 0.25)',
                  }
                }}
                onClick={handleCheckInClick}
              >
                <CardContent sx={{ textAlign: 'center', py: 4 }}>
                  <Box sx={{ mb: 2 }}>
                    <Favorite sx={{ fontSize: 48, opacity: 0.9 }} />
                  </Box>
                  <Typography variant="h5" sx={{ fontWeight: 600 }}>
                    Daily Check-In
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* Recovery Exercises Card - Only for Package 2+ */}
          {user?.package && user.package !== 'package1' && (
            <Grid item xs={12}>
              <Card 
                sx={{ 
                  borderRadius: 3,
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
                  backgroundColor: 'white',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)',
                  }
                }}
                onClick={handleRehabPlanClick}
              >
                <CardContent sx={{ textAlign: 'center', py: 4 }}>
                  <Box sx={{ mb: 2 }}>
                    <PlayArrow sx={{ fontSize: 48, color: '#1e293b' }} />
                  </Box>
                  <Typography variant="h5" sx={{ fontWeight: 600, color: '#1e293b' }}>
                    Recovery Exercises
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* Work Readiness Card */}
          <Grid item xs={12}>
            <Card 
              sx={{ 
                borderRadius: 3,
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
                backgroundColor: hasSubmittedToday ? '#f0f9ff' : 'white',
                cursor: hasSubmittedToday ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s ease',
                opacity: hasSubmittedToday ? 0.7 : 1,
                '&:hover': hasSubmittedToday ? {} : {
                  transform: 'translateY(-2px)',
                  boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)',
                }
              }}
              onClick={hasSubmittedToday ? undefined : handleWorkReadinessClick}
            >
              <CardContent sx={{ textAlign: 'center', py: 4 }}>
                <Box sx={{ mb: 2 }}>
                  {hasSubmittedToday ? (
                    <CheckCircle sx={{ fontSize: 48, color: '#10b981' }} />
                  ) : (
                    <Work sx={{ fontSize: 48, color: '#1e293b' }} />
                  )}
                </Box>
                <Typography variant="h5" sx={{ fontWeight: 600, color: hasSubmittedToday ? '#10b981' : '#1e293b' }}>
                  {hasSubmittedToday ? 'Already Submitted Today' : 'Work Readiness'}
                </Typography>
                {hasSubmittedToday && todaySubmission && (
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="body2" sx={{ color: '#6b7280' }}>
                    Submitted at {(() => {
                      try {
                        const submittedAt = todaySubmission.submitted_at || todaySubmission.submittedAt;
                        if (!submittedAt) return 'Unknown time';
                        const date = new Date(submittedAt);
                        return isNaN(date.getTime()) ? 'Unknown time' : date.toLocaleTimeString();
                      } catch {
                        return 'Unknown time';
                      }
                    })()}
                    </Typography>
                    {timeUntilNextSubmission && (
                      <Typography variant="body2" sx={{ color: '#f59e0b', fontWeight: 600, mt: 0.5 }}>
                        Next submission in: {timeUntilNextSubmission}
                  </Typography>
                    )}
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Report Incident Card */}
          <Grid item xs={12}>
            <Card 
              sx={{ 
                borderRadius: 3,
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
                backgroundColor: 'white',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)',
                }
              }}
              onClick={() => {/* Navigate to incident reporting */}}
            >
              <CardContent sx={{ textAlign: 'center', py: 4 }}>
                <Box sx={{ mb: 2 }}>
                  <Warning sx={{ fontSize: 48, color: '#1e293b' }} />
                </Box>
                <Typography variant="h5" sx={{ fontWeight: 600, color: '#1e293b' }}>
                  Report Incident
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Work Readiness Modal */}
        {showWorkReadinessModal && (
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
            padding: window.innerWidth <= 768 ? '0' : '1rem'
          }}>
            <div style={{
              backgroundColor: 'white',
              borderRadius: window.innerWidth <= 768 ? '0' : '1rem',
              padding: window.innerWidth <= 768 ? '1rem' : '2rem',
              maxWidth: '600px',
              width: '100%',
              height: window.innerWidth <= 768 ? '100vh' : 'auto',
              maxHeight: window.innerWidth <= 768 ? '100vh' : '90vh',
              overflowY: 'auto',
              boxShadow: window.innerWidth <= 768 ? 'none' : '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              display: 'flex',
              flexDirection: 'column'
            }}>
              {/* Header */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: window.innerWidth <= 768 ? '1rem' : '1.5rem',
                paddingBottom: window.innerWidth <= 768 ? '0.75rem' : '1rem',
                borderBottom: '1px solid #e5e7eb',
                position: 'sticky',
                top: 0,
                backgroundColor: 'white',
                zIndex: 10
              }}>
                <div style={{
                  backgroundColor: '#3b82f6',
                  borderRadius: window.innerWidth <= 768 ? '0.5rem' : '0.75rem',
                  padding: window.innerWidth <= 768 ? '0.5rem' : '0.75rem',
                  marginRight: window.innerWidth <= 768 ? '0.75rem' : '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Work sx={{ fontSize: window.innerWidth <= 768 ? 20 : 24, color: 'white' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <h2 style={{
                    fontSize: window.innerWidth <= 768 ? '1.25rem' : '1.5rem',
                    fontWeight: 'bold',
                    color: '#111827',
                    margin: 0,
                    lineHeight: 1.2
                  }}>
                    Work Readiness Assessment
                  </h2>
                  <p style={{
                    fontSize: window.innerWidth <= 768 ? '0.75rem' : '0.875rem',
                    color: '#6b7280',
                    margin: 0,
                    marginTop: '0.25rem'
                  }}>
                    Help us understand your current work readiness
                  </p>
                </div>
                <button
                  onClick={() => setShowWorkReadinessModal(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '1.5rem',
                    color: '#6b7280',
                    cursor: 'pointer',
                    padding: '0.25rem',
                    borderRadius: '0.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  ×
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleWorkReadinessSubmit} style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                {/* Fatigue Level */}
                <div style={{ marginBottom: window.innerWidth <= 768 ? '1.25rem' : '1.5rem' }}>
                  <label style={{
                    display: 'block',
                    fontSize: window.innerWidth <= 768 ? '1rem' : '0.875rem',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: window.innerWidth <= 768 ? '0.75rem' : '0.5rem',
                    textAlign: 'center'
                  }}>
                    Fatigue Level *
                  </label>
                  
                  {/* Range Slider Container */}
                  <div style={{
                    padding: '1.5rem 1rem',
                    backgroundColor: '#f8fafc',
                    borderRadius: '1rem',
                    border: '1px solid #e2e8f0'
                  }}>
                    {/* Slider Track */}
                    <div 
                      data-slider-track
                      style={{
                        position: 'relative',
                        height: '6px',
                        backgroundColor: '#e2e8f0',
                        borderRadius: '3px',
                        marginBottom: '2rem',
                        cursor: 'pointer'
                      }}
                      onClick={handleSliderClick}
                    >
                      {/* Active Range */}
                      <div style={{
                        position: 'absolute',
                        top: 0,
                        left: '0%',
                        right: '0%',
                        height: '100%',
                        backgroundColor: workReadinessForm.fatigueLevel ? 
                          (parseInt(workReadinessForm.fatigueLevel) === 1 ? '#dcfce7' :
                           parseInt(workReadinessForm.fatigueLevel) === 2 ? '#bbf7d0' :
                           parseInt(workReadinessForm.fatigueLevel) === 3 ? '#fef3c7' :
                           parseInt(workReadinessForm.fatigueLevel) === 4 ? '#fed7aa' : '#fecaca') : '#e2e8f0',
                        borderRadius: '3px',
                        width: workReadinessForm.fatigueLevel ? `${(parseInt(workReadinessForm.fatigueLevel) - 1) * 25}%` : '0%',
                        transition: 'all 0.3s ease'
                      }} />
                      
                      {/* Slider Handle */}
                      <div
                        style={{
                          position: 'absolute',
                          top: '50%',
                          left: workReadinessForm.fatigueLevel ? `${(parseInt(workReadinessForm.fatigueLevel) - 1) * 25}%` : '0%',
                          transform: 'translate(-50%, -50%)',
                          width: '24px',
                          height: '24px',
                          backgroundColor: '#3b82f6',
                          borderRadius: '50%',
                          border: '3px solid white',
                          boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)',
                          cursor: isDragging ? 'grabbing' : 'grab',
                          transition: isDragging ? 'none' : 'all 0.3s ease',
                          zIndex: 10,
                          userSelect: 'none'
                        }}
                        onMouseDown={handleSliderMouseDown}
                        onTouchStart={handleSliderTouchStart}
                        draggable={false}
                      />
                    </div>
                    
                    {/* Level Labels */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '1rem'
                    }}>
                      {[1, 2, 3, 4, 5].map((level) => (
                        <div
                          key={level}
                          onClick={() => setWorkReadinessForm({ ...workReadinessForm, fatigueLevel: level.toString() })}
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            cursor: 'pointer',
                            padding: '0.5rem',
                            borderRadius: '0.5rem',
                            backgroundColor: workReadinessForm.fatigueLevel === level.toString() ? '#dbeafe' : 'transparent',
                            transition: 'all 0.2s ease',
                            minWidth: '60px'
                          }}
                        >
                          <div style={{
                            fontSize: '1.5rem',
                            marginBottom: '0.25rem'
                          }}>
                            {level === 1 ? '😴' : level === 2 ? '😌' : level === 3 ? '😐' : level === 4 ? '😔' : '😫'}
                          </div>
                          <div style={{
                            fontSize: '0.875rem',
                            fontWeight: '600',
                            color: workReadinessForm.fatigueLevel === level.toString() ? '#1e40af' : '#374151'
                          }}>
                            {level}
                          </div>
                          <div style={{
                            fontSize: '0.75rem',
                            color: '#6b7280',
                            textAlign: 'center',
                            lineHeight: 1.2
                          }}>
                            {level === 1 ? 'Very Low' : level === 2 ? 'Low' : level === 3 ? 'Moderate' : level === 4 ? 'High' : 'Very High'}
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {/* Current Selection Display */}
                    {workReadinessForm.fatigueLevel && (
                      <div style={{
                        textAlign: 'center',
                        padding: '0.75rem',
                        backgroundColor: 'white',
                        borderRadius: '0.5rem',
                        border: '1px solid #e2e8f0',
                        marginTop: '0.5rem'
                      }}>
                        <div style={{
                          fontSize: '1.25rem',
                          fontWeight: '600',
                          color: '#1e293b',
                          marginBottom: '0.25rem'
                        }}>
                          Level {workReadinessForm.fatigueLevel} - {
                            workReadinessForm.fatigueLevel === '1' ? 'Very Low Fatigue' :
                            workReadinessForm.fatigueLevel === '2' ? 'Low Fatigue' :
                            workReadinessForm.fatigueLevel === '3' ? 'Moderate Fatigue' :
                            workReadinessForm.fatigueLevel === '4' ? 'High Fatigue' : 'Very High Fatigue'
                          }
                        </div>
                        <div style={{
                          fontSize: '0.875rem',
                          color: '#6b7280'
                        }}>
                          {workReadinessForm.fatigueLevel === '1' ? 'Feeling fresh and energetic' :
                           workReadinessForm.fatigueLevel === '2' ? 'Slightly tired but manageable' :
                           workReadinessForm.fatigueLevel === '3' ? 'Some fatigue, need rest soon' :
                           workReadinessForm.fatigueLevel === '4' ? 'Quite tired, rest recommended' : 'Extremely tired, rest required'}
                        </div>
                      </div>
                    )}
                    
                    {/* Drag Instruction */}
                    <div style={{
                      textAlign: 'center',
                      marginTop: '0.75rem',
                      fontSize: '0.75rem',
                      color: '#6b7280',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.25rem'
                    }}>
                      <span>👆</span>
                      <span>Click and drag the blue handle or click anywhere on the track</span>
                    </div>
                  </div>
                </div>

                {/* Pain/Discomfort */}
                <div style={{ marginBottom: window.innerWidth <= 768 ? '1.25rem' : '1.5rem' }}>
                  <label style={{
                    display: 'block',
                    fontSize: window.innerWidth <= 768 ? '1rem' : '0.875rem',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: window.innerWidth <= 768 ? '0.75rem' : '0.5rem'
                  }}>
                    Pain/Discomfort *
                  </label>
                  <div style={{ 
                    display: 'flex', 
                    gap: window.innerWidth <= 768 ? '0.75rem' : '1rem',
                    flexDirection: window.innerWidth <= 768 ? 'column' : 'row'
                  }}>
                    <button
                      type="button"
                      onClick={() => setWorkReadinessForm({ ...workReadinessForm, painDiscomfort: 'yes' })}
                      style={{
                        padding: window.innerWidth <= 768 ? '1rem' : '0.75rem 1.5rem',
                        border: workReadinessForm.painDiscomfort === 'yes' ? '2px solid #ef4444' : '1px solid #d1d5db',
                        borderRadius: '0.5rem',
                        backgroundColor: workReadinessForm.painDiscomfort === 'yes' ? '#fef2f2' : 'white',
                        color: workReadinessForm.painDiscomfort === 'yes' ? '#dc2626' : '#374151',
                        fontSize: window.innerWidth <= 768 ? '1rem' : '1rem',
                        fontWeight: '500',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        flex: 1,
                        minHeight: window.innerWidth <= 768 ? '48px' : 'auto'
                      }}
                    >
                      {window.innerWidth <= 768 ? 'Yes, I have pain' : 'Yes, I have pain/discomfort'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setWorkReadinessForm({ ...workReadinessForm, painDiscomfort: 'no' })}
                      style={{
                        padding: window.innerWidth <= 768 ? '1rem' : '0.75rem 1.5rem',
                        border: workReadinessForm.painDiscomfort === 'no' ? '2px solid #10b981' : '1px solid #d1d5db',
                        borderRadius: '0.5rem',
                        backgroundColor: workReadinessForm.painDiscomfort === 'no' ? '#f0fdf4' : 'white',
                        color: workReadinessForm.painDiscomfort === 'no' ? '#059669' : '#374151',
                        fontSize: window.innerWidth <= 768 ? '1rem' : '1rem',
                        fontWeight: '500',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        flex: 1,
                        minHeight: window.innerWidth <= 768 ? '48px' : 'auto'
                      }}
                    >
                      {window.innerWidth <= 768 ? 'No pain' : 'No pain/discomfort'}
                    </button>
                  </div>
                </div>

                {/* Pain Areas (if pain is yes) */}
                {workReadinessForm.painDiscomfort === 'yes' && (
                  <div style={{ marginBottom: window.innerWidth <= 768 ? '1.25rem' : '1.5rem' }}>
                    <label style={{
                      display: 'block',
                      fontSize: window.innerWidth <= 768 ? '1rem' : '0.875rem',
                      fontWeight: '600',
                      color: '#374151',
                      marginBottom: window.innerWidth <= 768 ? '0.75rem' : '0.5rem'
                    }}>
                      Pain Areas (Select all that apply)
                    </label>
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: window.innerWidth <= 768 ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(120px, 1fr))', 
                      gap: window.innerWidth <= 768 ? '0.75rem' : '0.5rem' 
                    }}>
                      {['Head', 'Neck', 'Shoulders', 'Arms', 'Back', 'Chest', 'Abdomen', 'Hips', 'Legs', 'Feet'].map((area) => (
                        <button
                          key={area}
                          type="button"
                          onClick={() => {
                            const newAreas = workReadinessForm.painAreas.includes(area)
                              ? workReadinessForm.painAreas.filter(a => a !== area)
                              : [...workReadinessForm.painAreas, area];
                            setWorkReadinessForm({ ...workReadinessForm, painAreas: newAreas });
                          }}
                          style={{
                            padding: window.innerWidth <= 768 ? '0.75rem 0.5rem' : '0.5rem',
                            border: workReadinessForm.painAreas.includes(area) ? '2px solid #ef4444' : '1px solid #d1d5db',
                            borderRadius: '0.375rem',
                            backgroundColor: workReadinessForm.painAreas.includes(area) ? '#fef2f2' : 'white',
                            color: workReadinessForm.painAreas.includes(area) ? '#dc2626' : '#374151',
                            fontSize: window.innerWidth <= 768 ? '0.875rem' : '0.875rem',
                            fontWeight: '500',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            textAlign: 'center',
                            minHeight: window.innerWidth <= 768 ? '44px' : 'auto'
                          }}
                        >
                          {area}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Readiness Level */}
                <div style={{ marginBottom: window.innerWidth <= 768 ? '1.25rem' : '1.5rem' }}>
                  <label style={{
                    display: 'block',
                    fontSize: window.innerWidth <= 768 ? '1rem' : '0.875rem',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: window.innerWidth <= 768 ? '0.75rem' : '0.5rem'
                  }}>
                    Work Readiness *
                  </label>
                  <div style={{ 
                    display: 'flex', 
                    gap: window.innerWidth <= 768 ? '0.75rem' : '0.75rem', 
                    flexWrap: 'wrap',
                    flexDirection: window.innerWidth <= 768 ? 'column' : 'row'
                  }}>
                    {[
                      { value: 'fit', label: 'Fit for Work', color: '#dcfce7', textColor: '#166534' },
                      { value: 'minor', label: 'Minor Concerns', color: '#fef3c7', textColor: '#92400e' },
                      { value: 'not_fit', label: 'Not Fit for Work', color: '#fecaca', textColor: '#dc2626' }
                    ].map((level) => (
                      <button
                        key={level.value}
                        type="button"
                        onClick={() => setWorkReadinessForm({ ...workReadinessForm, readinessLevel: level.value })}
                        style={{
                          padding: window.innerWidth <= 768 ? '1rem' : '0.75rem 1.5rem',
                          border: workReadinessForm.readinessLevel === level.value ? '2px solid #3b82f6' : '1px solid #d1d5db',
                          borderRadius: '0.5rem',
                          backgroundColor: workReadinessForm.readinessLevel === level.value ? '#dbeafe' : level.color,
                          color: workReadinessForm.readinessLevel === level.value ? '#1e40af' : level.textColor,
                          fontSize: window.innerWidth <= 768 ? '1rem' : '1rem',
                          fontWeight: '600',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          flex: 1,
                          minWidth: window.innerWidth <= 768 ? 'auto' : '150px',
                          minHeight: window.innerWidth <= 768 ? '48px' : 'auto'
                        }}
                      >
                        {level.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Mood */}
                <div style={{ marginBottom: window.innerWidth <= 768 ? '1.25rem' : '1.5rem' }}>
                  <label style={{
                    display: 'block',
                    fontSize: window.innerWidth <= 768 ? '1rem' : '0.875rem',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: window.innerWidth <= 768 ? '0.75rem' : '0.5rem',
                    textAlign: 'center'
                  }}>
                    Current Mood *
                  </label>
                  
                  {/* Mood Options Container */}
                  <div style={{
                    padding: '1.5rem 1rem',
                    backgroundColor: '#f8fafc',
                    borderRadius: '1rem',
                    border: '1px solid #e2e8f0'
                  }}>
                    {/* Mood Options Grid */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: window.innerWidth <= 768 ? 'repeat(2, 1fr)' : 'repeat(5, 1fr)',
                      gap: window.innerWidth <= 768 ? '1rem' : '0.75rem',
                      marginBottom: '1rem'
                    }}>
                      {[
                        { value: 'excellent', label: 'Excellent', emoji: '😊', color: '#dcfce7', description: 'Feeling great!' },
                        { value: 'good', label: 'Good', emoji: '😌', color: '#bbf7d0', description: 'Pretty good' },
                        { value: 'okay', label: 'Okay', emoji: '😐', color: '#fef3c7', description: 'Not bad' },
                        { value: 'poor', label: 'Poor', emoji: '😔', color: '#fed7aa', description: 'Not great' },
                        { value: 'terrible', label: 'Terrible', emoji: '😢', color: '#fecaca', description: 'Really bad' }
                      ].map((mood) => (
                        <button
                          key={mood.value}
                          type="button"
                          onClick={() => setWorkReadinessForm({ ...workReadinessForm, mood: mood.value })}
                          style={{
                            padding: window.innerWidth <= 768 ? '1rem 0.5rem' : '1rem 0.75rem',
                            border: workReadinessForm.mood === mood.value ? '2px solid #3b82f6' : '1px solid #d1d5db',
                            borderRadius: '0.75rem',
                            backgroundColor: workReadinessForm.mood === mood.value ? '#dbeafe' : mood.color,
                            color: '#374151',
                            fontSize: window.innerWidth <= 768 ? '0.875rem' : '0.875rem',
                            fontWeight: '500',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                            textAlign: 'center',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.25rem',
                            boxShadow: workReadinessForm.mood === mood.value ? '0 4px 12px rgba(59, 130, 246, 0.3)' : '0 2px 4px rgba(0, 0, 0, 0.1)',
                            transform: workReadinessForm.mood === mood.value ? 'scale(1.05)' : 'scale(1)',
                            minHeight: window.innerWidth <= 768 ? '80px' : '100px'
                          }}
                        >
                          <div style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>{mood.emoji}</div>
                          <div style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.125rem' }}>{mood.label}</div>
                          <div style={{ fontSize: '0.75rem', opacity: 0.7, textAlign: 'center', lineHeight: 1.2 }}>{mood.description}</div>
                        </button>
                      ))}
                    </div>
                    
                    {/* Current Selection Display */}
                    {workReadinessForm.mood && (
                      <div style={{
                        textAlign: 'center',
                        padding: '0.75rem',
                        backgroundColor: 'white',
                        borderRadius: '0.5rem',
                        border: '1px solid #e2e8f0',
                        marginTop: '0.5rem'
                      }}>
                        <div style={{
                          fontSize: '1.25rem',
                          fontWeight: '600',
                          color: '#1e293b',
                          marginBottom: '0.25rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.5rem'
                        }}>
                          <span style={{ fontSize: '1.5rem' }}>
                            {workReadinessForm.mood === 'excellent' ? '😊' :
                             workReadinessForm.mood === 'good' ? '😌' :
                             workReadinessForm.mood === 'okay' ? '😐' :
                             workReadinessForm.mood === 'poor' ? '😔' : '😢'}
                          </span>
                          <span>
                            {workReadinessForm.mood === 'excellent' ? 'Excellent Mood' :
                             workReadinessForm.mood === 'good' ? 'Good Mood' :
                             workReadinessForm.mood === 'okay' ? 'Okay Mood' :
                             workReadinessForm.mood === 'poor' ? 'Poor Mood' : 'Terrible Mood'}
                          </span>
                        </div>
                        <div style={{
                          fontSize: '0.875rem',
                          color: '#6b7280'
                        }}>
                          {workReadinessForm.mood === 'excellent' ? 'You are feeling great and positive!' :
                           workReadinessForm.mood === 'good' ? 'You are in a pretty good mood' :
                           workReadinessForm.mood === 'okay' ? 'Your mood is neutral, not bad' :
                           workReadinessForm.mood === 'poor' ? 'You are not feeling great today' : 'You are feeling really down today'}
                        </div>
                      </div>
                    )}
                    
                    {/* Selection Instruction */}
                    <div style={{
                      textAlign: 'center',
                      marginTop: '0.75rem',
                      fontSize: '0.75rem',
                      color: '#6b7280',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.25rem'
                    }}>
                      <span>👆</span>
                      <span>Click any mood to select</span>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div style={{ marginBottom: window.innerWidth <= 768 ? '1.5rem' : '2rem' }}>
                  <label style={{
                    display: 'block',
                    fontSize: window.innerWidth <= 768 ? '1rem' : '0.875rem',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: window.innerWidth <= 768 ? '0.75rem' : '0.5rem'
                  }}>
                    Additional Notes (Optional)
                  </label>
                  <textarea
                    value={workReadinessForm.notes}
                    onChange={(e) => setWorkReadinessForm({ ...workReadinessForm, notes: e.target.value })}
                    placeholder="Any additional comments about your work readiness..."
                    style={{
                      width: '100%',
                      padding: window.innerWidth <= 768 ? '1rem' : '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.5rem',
                      fontSize: window.innerWidth <= 768 ? '1rem' : '0.875rem',
                      resize: 'vertical',
                      minHeight: window.innerWidth <= 768 ? '100px' : '80px',
                      fontFamily: 'inherit'
                    }}
                  />
                </div>

                {/* Action Buttons */}
                <div style={{ 
                  display: 'flex', 
                  gap: window.innerWidth <= 768 ? '0.75rem' : '1rem', 
                  justifyContent: 'flex-end',
                  marginTop: 'auto',
                  paddingTop: window.innerWidth <= 768 ? '1rem' : '0',
                  borderTop: window.innerWidth <= 768 ? '1px solid #e5e7eb' : 'none'
                }}>
                  <button
                    type="button"
                    onClick={() => setShowWorkReadinessModal(false)}
                    style={{
                      padding: window.innerWidth <= 768 ? '1rem 1.5rem' : '0.75rem 1.5rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.5rem',
                      backgroundColor: 'white',
                      color: '#374151',
                      fontSize: window.innerWidth <= 768 ? '1rem' : '1rem',
                      fontWeight: '500',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      flex: window.innerWidth <= 768 ? 1 : 'none',
                      minHeight: window.innerWidth <= 768 ? '48px' : 'auto'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={workReadinessLoading || !workReadinessForm.fatigueLevel || !workReadinessForm.painDiscomfort || !workReadinessForm.readinessLevel || !workReadinessForm.mood}
                    style={{
                      padding: window.innerWidth <= 768 ? '1rem 1.5rem' : '0.75rem 1.5rem',
                      border: 'none',
                      borderRadius: '0.5rem',
                      backgroundColor: workReadinessLoading ? '#9ca3af' : '#3b82f6',
                      color: 'white',
                      fontSize: window.innerWidth <= 768 ? '1rem' : '1rem',
                      fontWeight: '600',
                      cursor: workReadinessLoading ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s ease',
                      opacity: workReadinessLoading ? 0.6 : 1,
                      flex: window.innerWidth <= 768 ? 1 : 'none',
                      minHeight: window.innerWidth <= 768 ? '48px' : 'auto'
                    }}
                  >
                    {workReadinessLoading ? 'Submitting...' : 'Submit Assessment'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Work Readiness Confirmation Modal */}
        {showWorkReadinessConfirmation && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
            animation: 'fadeIn 0.3s ease-out'
          }}>
            <div style={{
              background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
              borderRadius: '1.5rem',
              padding: window.innerWidth <= 768 ? '1.5rem' : '2rem',
              maxWidth: window.innerWidth <= 768 ? '90vw' : '600px',
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto',
              boxShadow: '0 32px 64px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              animation: 'slideInUp 0.4s ease-out',
              position: 'relative'
            }}>
              {/* Decorative gradient overlay */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '4px',
                background: 'linear-gradient(90deg, #10b981, #3b82f6, #8b5cf6, #f59e0b)',
                borderRadius: '1.5rem 1.5rem 0 0'
              }}></div>
              
              {/* Header */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '2rem',
                marginTop: '0.5rem'
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    marginBottom: '0.5rem'
                  }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #10b981, #059669)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                    }}>
                      <svg width="20" height="20" fill="white" viewBox="0 0 24 24">
                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                      </svg>
                    </div>
                    <h2 style={{
                      fontSize: window.innerWidth <= 768 ? '1.25rem' : '1.5rem',
                      fontWeight: '700',
                      background: 'linear-gradient(135deg, #1f2937, #374151)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      margin: 0
                    }}>
                      Review Your Assessment
                    </h2>
                  </div>
                  <p style={{
                    fontSize: window.innerWidth <= 768 ? '0.75rem' : '0.875rem',
                    color: '#6b7280',
                    margin: 0,
                    marginLeft: '3.25rem',
                    lineHeight: '1.5'
                  }}>
                    Please review your answers carefully before submitting your work readiness assessment
                  </p>
                </div>
                <button
                  onClick={handleCancelWorkReadiness}
                  style={{
                    background: 'rgba(107, 114, 128, 0.1)',
                    border: 'none',
                    fontSize: '1.25rem',
                    color: '#6b7280',
                    cursor: 'pointer',
                    padding: '0.5rem',
                    borderRadius: '0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s ease',
                    width: '40px',
                    height: '40px'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                    e.currentTarget.style.color = '#ef4444';
                    e.currentTarget.style.transform = 'scale(1.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(107, 114, 128, 0.1)';
                    e.currentTarget.style.color = '#6b7280';
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  ×
                </button>
              </div>

              {/* Review Content */}
              <div style={{ marginBottom: '2rem' }}>
                {/* Fatigue Level */}
                <div style={{ 
                  marginBottom: '1.5rem',
                  padding: '1.25rem',
                  background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
                  borderRadius: '1rem',
                  border: '1px solid rgba(14, 165, 233, 0.2)',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '4px',
                    height: '100%',
                    background: 'linear-gradient(180deg, #0ea5e9, #0284c7)'
                  }}></div>
                  <div style={{ marginLeft: '1rem' }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      marginBottom: '0.75rem'
                    }}>
                      <div style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #0ea5e9, #0284c7)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <svg width="12" height="12" fill="white" viewBox="0 0 24 24">
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                        </svg>
                      </div>
                      <h3 style={{ 
                        fontSize: '0.875rem', 
                        fontWeight: '600', 
                        color: '#0c4a6e',
                        margin: 0
                      }}>
                        Fatigue Level
                      </h3>
                    </div>
                    <div style={{
                      padding: '0.75rem 1rem',
                      backgroundColor: 'rgba(255, 255, 255, 0.8)',
                      borderRadius: '0.75rem',
                      border: '1px solid rgba(14, 165, 233, 0.1)',
                      fontSize: '1rem',
                      fontWeight: '600',
                      color: '#0c4a6e'
                    }}>
                      {workReadinessForm.fatigueLevel}/5
                    </div>
                  </div>
                </div>

                {/* Pain/Discomfort */}
                <div style={{ 
                  marginBottom: '1.5rem',
                  padding: '1.25rem',
                  background: workReadinessForm.painDiscomfort === 'yes' 
                    ? 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)'
                    : 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                  borderRadius: '1rem',
                  border: `1px solid ${workReadinessForm.painDiscomfort === 'yes' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.2)'}`,
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '4px',
                    height: '100%',
                    background: workReadinessForm.painDiscomfort === 'yes' 
                      ? 'linear-gradient(180deg, #ef4444, #dc2626)'
                      : 'linear-gradient(180deg, #22c55e, #16a34a)'
                  }}></div>
                  <div style={{ marginLeft: '1rem' }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      marginBottom: '0.75rem'
                    }}>
                      <div style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        background: workReadinessForm.painDiscomfort === 'yes' 
                          ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                          : 'linear-gradient(135deg, #22c55e, #16a34a)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <svg width="12" height="12" fill="white" viewBox="0 0 24 24">
                          <path d={workReadinessForm.painDiscomfort === 'yes' 
                            ? "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"
                            : "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                          }/>
                        </svg>
                      </div>
                      <h3 style={{ 
                        fontSize: '0.875rem', 
                        fontWeight: '600', 
                        color: workReadinessForm.painDiscomfort === 'yes' ? '#991b1b' : '#14532d',
                        margin: 0
                      }}>
                        Pain/Discomfort
                      </h3>
                    </div>
                    <div style={{
                      padding: '0.75rem 1rem',
                      backgroundColor: 'rgba(255, 255, 255, 0.8)',
                      borderRadius: '0.75rem',
                      border: `1px solid ${workReadinessForm.painDiscomfort === 'yes' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)'}`,
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      color: workReadinessForm.painDiscomfort === 'yes' ? '#991b1b' : '#14532d'
                    }}>
                      {workReadinessForm.painDiscomfort === 'yes' ? 'Yes, I have pain/discomfort' : 'No, I do not have pain/discomfort'}
                    </div>
                  </div>
                </div>

                {/* Pain Areas */}
                {workReadinessForm.painAreas.length > 0 && (
                  <div style={{ 
                    marginBottom: '1.5rem',
                    padding: '1.25rem',
                    background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                    borderRadius: '1rem',
                    border: '1px solid rgba(245, 158, 11, 0.2)',
                    position: 'relative',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '4px',
                      height: '100%',
                      background: 'linear-gradient(180deg, #f59e0b, #d97706)'
                    }}></div>
                    <div style={{ marginLeft: '1rem' }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        marginBottom: '0.75rem'
                      }}>
                        <div style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <svg width="12" height="12" fill="white" viewBox="0 0 24 24">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                          </svg>
                        </div>
                        <h3 style={{ 
                          fontSize: '0.875rem', 
                          fontWeight: '600', 
                          color: '#92400e',
                          margin: 0
                        }}>
                          Pain Areas
                        </h3>
                      </div>
                      <div style={{
                        padding: '0.75rem 1rem',
                        backgroundColor: 'rgba(255, 255, 255, 0.8)',
                        borderRadius: '0.75rem',
                        border: '1px solid rgba(245, 158, 11, 0.1)',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        color: '#92400e'
                      }}>
                        {workReadinessForm.painAreas.join(', ')}
                      </div>
                    </div>
                  </div>
                )}

                {/* Work Readiness Level */}
                <div style={{ 
                  marginBottom: '1.5rem',
                  padding: '1.25rem',
                  background: workReadinessForm.readinessLevel === 'fit' 
                    ? 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)'
                    : workReadinessForm.readinessLevel === 'minor'
                    ? 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)'
                    : 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
                  borderRadius: '1rem',
                  border: `1px solid ${
                    workReadinessForm.readinessLevel === 'fit' 
                      ? 'rgba(34, 197, 94, 0.2)'
                      : workReadinessForm.readinessLevel === 'minor'
                      ? 'rgba(245, 158, 11, 0.2)'
                      : 'rgba(239, 68, 68, 0.2)'
                  }`,
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '4px',
                    height: '100%',
                    background: workReadinessForm.readinessLevel === 'fit' 
                      ? 'linear-gradient(180deg, #22c55e, #16a34a)'
                      : workReadinessForm.readinessLevel === 'minor'
                      ? 'linear-gradient(180deg, #f59e0b, #d97706)'
                      : 'linear-gradient(180deg, #ef4444, #dc2626)'
                  }}></div>
                  <div style={{ marginLeft: '1rem' }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      marginBottom: '0.75rem'
                    }}>
                      <div style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        background: workReadinessForm.readinessLevel === 'fit' 
                          ? 'linear-gradient(135deg, #22c55e, #16a34a)'
                          : workReadinessForm.readinessLevel === 'minor'
                          ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                          : 'linear-gradient(135deg, #ef4444, #dc2626)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <svg width="12" height="12" fill="white" viewBox="0 0 24 24">
                          <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                      </div>
                      <h3 style={{ 
                        fontSize: '0.875rem', 
                        fontWeight: '600', 
                        color: workReadinessForm.readinessLevel === 'fit' 
                          ? '#14532d'
                          : workReadinessForm.readinessLevel === 'minor'
                          ? '#92400e'
                          : '#991b1b',
                        margin: 0
                      }}>
                        Work Readiness Level
                      </h3>
                    </div>
                    <div style={{
                      padding: '0.75rem 1rem',
                      backgroundColor: 'rgba(255, 255, 255, 0.8)',
                      borderRadius: '0.75rem',
                      border: `1px solid ${
                        workReadinessForm.readinessLevel === 'fit' 
                          ? 'rgba(34, 197, 94, 0.1)'
                          : workReadinessForm.readinessLevel === 'minor'
                          ? 'rgba(245, 158, 11, 0.1)'
                          : 'rgba(239, 68, 68, 0.1)'
                      }`,
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: workReadinessForm.readinessLevel === 'fit' 
                        ? '#14532d'
                        : workReadinessForm.readinessLevel === 'minor'
                        ? '#92400e'
                        : '#991b1b'
                    }}>
                      {workReadinessForm.readinessLevel === 'fit' && '✅ Fit for Work'}
                      {workReadinessForm.readinessLevel === 'minor' && '⚠️ Minor Concerns - Fit for Work'}
                      {workReadinessForm.readinessLevel === 'not_fit' && '❌ Not Fit for Work'}
                    </div>
                  </div>
                </div>

                {/* Mood */}
                <div style={{ 
                  marginBottom: '1.5rem',
                  padding: '1.25rem',
                  background: 'linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%)',
                  borderRadius: '1rem',
                  border: '1px solid rgba(168, 85, 247, 0.2)',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '4px',
                    height: '100%',
                    background: 'linear-gradient(180deg, #a855f7, #9333ea)'
                  }}></div>
                  <div style={{ marginLeft: '1rem' }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      marginBottom: '0.75rem'
                    }}>
                      <div style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #a855f7, #9333ea)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <svg width="12" height="12" fill="white" viewBox="0 0 24 24">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                        </svg>
                      </div>
                      <h3 style={{ 
                        fontSize: '0.875rem', 
                        fontWeight: '600', 
                        color: '#581c87',
                        margin: 0
                      }}>
                        Mood
                      </h3>
                    </div>
                    <div style={{
                      padding: '0.75rem 1rem',
                      backgroundColor: 'rgba(255, 255, 255, 0.8)',
                      borderRadius: '0.75rem',
                      border: '1px solid rgba(168, 85, 247, 0.1)',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      color: '#581c87'
                    }}>
                      {workReadinessForm.mood === 'excellent' && '😊 Excellent'}
                      {workReadinessForm.mood === 'good' && '🙂 Good'}
                      {workReadinessForm.mood === 'okay' && '😐 Okay'}
                      {workReadinessForm.mood === 'poor' && '😔 Poor'}
                      {workReadinessForm.mood === 'terrible' && '😢 Terrible'}
                    </div>
                  </div>
                </div>

                {/* Additional Notes */}
                {workReadinessForm.notes && (
                  <div style={{ 
                    marginBottom: '1.5rem',
                    padding: '1.25rem',
                    background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
                    borderRadius: '1rem',
                    border: '1px solid rgba(14, 165, 233, 0.2)',
                    position: 'relative',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '4px',
                      height: '100%',
                      background: 'linear-gradient(180deg, #0ea5e9, #0284c7)'
                    }}></div>
                    <div style={{ marginLeft: '1rem' }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        marginBottom: '0.75rem'
                      }}>
                        <div style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #0ea5e9, #0284c7)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <svg width="12" height="12" fill="white" viewBox="0 0 24 24">
                            <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                          </svg>
                        </div>
                        <h3 style={{ 
                          fontSize: '0.875rem', 
                          fontWeight: '600', 
                          color: '#0c4a6e',
                          margin: 0
                        }}>
                          Additional Notes
                        </h3>
                      </div>
                      <div style={{
                        padding: '0.75rem 1rem',
                        backgroundColor: 'rgba(255, 255, 255, 0.8)',
                        borderRadius: '0.75rem',
                        border: '1px solid rgba(14, 165, 233, 0.1)',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        color: '#0c4a6e',
                        lineHeight: '1.5'
                      }}>
                        {workReadinessForm.notes}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div style={{
                display: 'flex',
                gap: '1rem',
                justifyContent: 'flex-end',
                paddingTop: '1rem',
                borderTop: '1px solid rgba(229, 231, 235, 0.5)'
              }}>
                <button
                  type="button"
                  onClick={handleCancelWorkReadiness}
                  style={{
                    padding: window.innerWidth <= 768 ? '0.875rem 2rem' : '0.75rem 1.5rem',
                    border: '2px solid #e5e7eb',
                    borderRadius: '0.75rem',
                    backgroundColor: 'white',
                    color: '#6b7280',
                    fontSize: window.innerWidth <= 768 ? '0.875rem' : '0.8rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f9fafb';
                    e.currentTarget.style.borderColor = '#d1d5db';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'white';
                    e.currentTarget.style.borderColor = '#e5e7eb';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.05)';
                  }}
                >
                  <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Back to Edit
                </button>
                <button
                  type="button"
                  onClick={handleConfirmWorkReadiness}
                  disabled={workReadinessLoading || hasSubmittedToday}
                  style={{
                    padding: window.innerWidth <= 768 ? '0.875rem 2rem' : '0.75rem 1.5rem',
                    border: 'none',
                    borderRadius: '0.75rem',
                    background: workReadinessLoading || hasSubmittedToday
                      ? 'linear-gradient(135deg, #9ca3af, #6b7280)'
                      : 'linear-gradient(135deg, #10b981, #059669)',
                    color: 'white',
                    fontSize: window.innerWidth <= 768 ? '0.875rem' : '0.8rem',
                    fontWeight: '600',
                    cursor: workReadinessLoading || hasSubmittedToday ? 'not-allowed' : 'pointer',
                    transition: 'all 0.3s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    boxShadow: workReadinessLoading || hasSubmittedToday
                      ? '0 2px 4px rgba(0, 0, 0, 0.1)'
                      : '0 4px 12px rgba(16, 185, 129, 0.3)',
                    minHeight: window.innerWidth <= 768 ? '48px' : 'auto',
                    opacity: workReadinessLoading || hasSubmittedToday ? 0.7 : 1
                  }}
                  onMouseEnter={(e) => {
                    if (!workReadinessLoading && !hasSubmittedToday) {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 8px 20px rgba(16, 185, 129, 0.4)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!workReadinessLoading && !hasSubmittedToday) {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.3)';
                    }
                  }}
                >
                  {workReadinessLoading ? (
                    <>
                      <svg className="animate-spin" width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Submitting...
                    </>
                  ) : hasSubmittedToday ? (
                    <>
                      <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Already Submitted
                    </>
                  ) : (
                    <>
                      <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Confirm & Submit
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SimpleCheckIn Modal */}
        {showSimpleCheckIn && (
          <SimpleCheckIn
            onSubmit={handleSimpleCheckInSubmit}
            onClose={handleCloseCheckIn}
            loading={checkInLoading}
            success={checkInSuccess}
            error={checkInError}
          />
        )}

        {/* SimpleWorkReadiness Modal */}
        {showSimpleWorkReadiness && (
          <SimpleWorkReadiness
            onSubmit={handleSimpleWorkReadinessSubmit}
            onClose={handleCloseWorkReadiness}
            loading={workReadinessLoading}
            success={workReadinessSuccess}
            error={workReadinessError}
            hasSubmittedToday={hasSubmittedToday}
          />
        )}

        {/* 🎨 PROFESSIONAL UI/UX DESIGN - Enhanced Cycle Welcome Popup */}
        {showCycleWelcome && (
          <>
            {/* Add CSS animations */}
            <style>{`
              @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
              }
              @keyframes slideInUp {
                from { 
                  opacity: 0;
                  transform: translateY(30px) scale(0.95);
                }
                to { 
                  opacity: 1;
                  transform: translateY(0) scale(1);
                }
              }
              @keyframes bounce {
                0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
                40% { transform: translateY(-10px); }
                60% { transform: translateY(-5px); }
              }
              @keyframes pulse {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.05); }
              }
              @keyframes ripple {
                0% { transform: scale(0.8); opacity: 1; }
                100% { transform: scale(1.2); opacity: 0; }
              }
              @keyframes float {
                0%, 100% { transform: translateY(0px); }
                50% { transform: translateY(-10px); }
              }
              @keyframes shimmer {
                0% { transform: translateX(-100%); }
                100% { transform: translateX(100%); }
              }
            `}</style>
            
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.9)',
              backdropFilter: 'blur(20px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 2000,
              padding: window.innerWidth <= 768 ? '0.5rem' : '1rem',
              animation: 'fadeIn 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
            }}>
              <div style={{
                background: 'linear-gradient(145deg, #ffffff 0%, #f8fafc 50%, #f1f5f9 100%)',
                borderRadius: window.innerWidth <= 768 ? '1.5rem' : '2rem',
                padding: window.innerWidth <= 768 ? '1.25rem' : '2.5rem',
                maxWidth: window.innerWidth <= 768 ? '100vw' : '650px',
                width: '100%',
                maxHeight: window.innerWidth <= 768 ? '100vh' : '95vh',
                overflow: window.innerWidth <= 768 ? 'auto' : 'visible',
                boxShadow: window.innerWidth <= 768 ? 
                  '0 0 0 1px rgba(255, 255, 255, 0.1)' :
                  `0 32px 64px -12px rgba(0, 0, 0, 0.25),
                  0 0 0 1px rgba(255, 255, 255, 0.05),
                   inset 0 1px 0 rgba(255, 255, 255, 0.1)`,
                border: '1px solid rgba(255, 255, 255, 0.2)',
                animation: 'slideInUp 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                position: 'relative',
                textAlign: 'center'
              }}>
                {/* 🎨 Enhanced Decorative Elements */}
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '6px',
                  background: 'linear-gradient(90deg, #10b981, #3b82f6, #8b5cf6, #f59e0b, #ef4444)',
                  borderRadius: '2rem 2rem 0 0',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
                }}></div>
                
                {/* Floating particles effect */}
                <div style={{
                  position: 'absolute',
                  top: '1rem',
                  left: '1rem',
                  width: '4px',
                  height: '4px',
                  background: 'linear-gradient(45deg, #10b981, #3b82f6)',
                  borderRadius: '50%',
                  animation: 'float 3s ease-in-out infinite'
                }}></div>
                <div style={{
                  position: 'absolute',
                  top: '2rem',
                  right: '2rem',
                  width: '3px',
                  height: '3px',
                  background: 'linear-gradient(45deg, #8b5cf6, #f59e0b)',
                  borderRadius: '50%',
                  animation: 'float 3s ease-in-out infinite 1s'
                }}></div>
                <div style={{
                  position: 'absolute',
                  bottom: '3rem',
                  left: '2rem',
                  width: '2px',
                  height: '2px',
                  background: 'linear-gradient(45deg, #ef4444, #10b981)',
                  borderRadius: '50%',
                  animation: 'float 3s ease-in-out infinite 2s'
                }}></div>
                
                {/* 🎨 Enhanced Close button */}
                <button
                  onClick={() => setShowCycleWelcome(false)}
                  style={{
                    position: 'absolute',
                    top: '1.5rem',
                    right: '1.5rem',
                    background: 'rgba(107, 114, 128, 0.1)',
                    borderRadius: '50%',
                    width: '2.5rem',
                    height: '2.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    color: '#6b7280',
                    fontSize: '1.1rem',
                    fontWeight: '600',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                    e.currentTarget.style.transform = 'scale(1.1) rotate(90deg)';
                    e.currentTarget.style.color = '#ef4444';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.2)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(107, 114, 128, 0.1)';
                    e.currentTarget.style.transform = 'scale(1) rotate(0deg)';
                    e.currentTarget.style.color = '#6b7280';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  ✕
                </button>
                
                {/* 🎨 Enhanced Main icon with advanced animations */}
                <div style={{
                  width: window.innerWidth <= 768 ? '4.5rem' : '6rem',
                  height: window.innerWidth <= 768 ? '4.5rem' : '6rem',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%)',
                  borderRadius: '50%',
                  margin: `0 auto ${window.innerWidth <= 768 ? '1.5rem' : '2rem'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: `
                    0 20px 40px rgba(16, 185, 129, 0.3),
                    0 0 0 1px rgba(255, 255, 255, 0.1),
                    inset 0 1px 0 rgba(255, 255, 255, 0.2)
                  `,
                  position: 'relative',
                  animation: 'bounce 2s ease-in-out infinite'
                }}>
                  <div style={{
                    width: window.innerWidth <= 768 ? '2.5rem' : '3.5rem',
                    height: window.innerWidth <= 768 ? '2.5rem' : '3.5rem',
                    background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: window.innerWidth <= 768 ? '1.4rem' : '1.8rem',
                    boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.1)',
                    animation: 'pulse 2s ease-in-out infinite'
                  }}>
                    🎯
                  </div>
                  
                  {/* Enhanced animated rings */}
                  <div style={{
                    position: 'absolute',
                    width: window.innerWidth <= 768 ? '5.5rem' : '7rem',
                    height: window.innerWidth <= 768 ? '5.5rem' : '7rem',
                    border: '3px solid rgba(16, 185, 129, 0.2)',
                    borderRadius: '50%',
                    animation: 'ripple 2s ease-out infinite'
                  }}></div>
                  <div style={{
                    position: 'absolute',
                    width: window.innerWidth <= 768 ? '6.5rem' : '8.5rem',
                    height: window.innerWidth <= 768 ? '6.5rem' : '8.5rem',
                    border: '2px solid rgba(16, 185, 129, 0.15)',
                    borderRadius: '50%',
                    animation: 'ripple 2s ease-out infinite 0.5s'
                  }}></div>
                  <div style={{
                    position: 'absolute',
                    width: window.innerWidth <= 768 ? '7.5rem' : '10rem',
                    height: window.innerWidth <= 768 ? '7.5rem' : '10rem',
                    border: '1px solid rgba(16, 185, 129, 0.1)',
                    borderRadius: '50%',
                    animation: 'ripple 2s ease-out infinite 1s'
                  }}></div>
                </div>
                
                {/* 🎨 Enhanced Welcome message with better typography */}
                <div style={{ marginBottom: window.innerWidth <= 768 ? '2rem' : '2.5rem' }}>
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    background: 'linear-gradient(135deg, #fef3c7, #fde68a)',
                    padding: '0.5rem 1rem',
                    borderRadius: '2rem',
                    marginBottom: '1rem',
                    border: '1px solid rgba(245, 158, 11, 0.2)',
                    boxShadow: '0 2px 8px rgba(245, 158, 11, 0.1)'
                  }}>
                    <span style={{ fontSize: '1.2rem' }}>🎉</span>
                    <span style={{
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: '#92400e',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>
                      Welcome to Your Journey!
                    </span>
                  </div>
                  
                  <h2 style={{
                    fontSize: window.innerWidth <= 768 ? '1.5rem' : '2rem',
                    fontWeight: '800',
                    color: '#1f2937',
                    margin: '0 0 1rem 0',
                    background: 'linear-gradient(135deg, #1f2937 0%, #374151 50%, #4b5563 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    lineHeight: '1.2'
                  }}>
                    {cycleWelcomeMessage}
                  </h2>
                  
                  <p style={{
                    fontSize: '1.1rem',
                    color: '#6b7280',
                    margin: '0 auto',
                    lineHeight: '1.6',
                    maxWidth: '480px'
                  }}>
                    Complete your daily assessments to achieve an{' '}
                    <span style={{
                      background: 'linear-gradient(135deg, #10b981, #059669)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                      fontWeight: '700'
                    }}>
                      Excellent KPI rating
                    </span>
                    {' '}and unlock your full potential! 🚀
                  </p>
                </div>
                
                {/* 🎨 Enhanced Goals section with better cards */}
                <div style={{ marginBottom: window.innerWidth <= 768 ? '2rem' : '2.5rem' }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.75rem',
                    marginBottom: '1.5rem'
                  }}>
                    <div style={{
                      width: '2rem',
                      height: '2px',
                      background: 'linear-gradient(90deg, #10b981, #3b82f6)',
                      borderRadius: '1px'
                    }}></div>
                    <h3 style={{
                      fontSize: '1.375rem',
                      fontWeight: '700',
                      color: '#374151',
                      margin: '0',
                      background: 'linear-gradient(135deg, #374151, #4b5563)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text'
                    }}>
                      Your Cycle Goals
                    </h3>
                    <div style={{
                      width: '2rem',
                      height: '2px',
                      background: 'linear-gradient(90deg, #3b82f6, #10b981)',
                      borderRadius: '1px'
                    }}></div>
                  </div>
                  
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: window.innerWidth <= 768 ? '1fr' : 'repeat(2, 1fr)',
                    gap: window.innerWidth <= 768 ? '1rem' : '1.25rem',
                    textAlign: 'left'
                  }}>
                    {/* 🎨 Enhanced Duration Card */}
                    <div style={{
                      background: 'linear-gradient(145deg, #f0f9ff 0%, #e0f2fe 50%, #bae6fd 100%)',
                      padding: window.innerWidth <= 768 ? '1.25rem' : '1.5rem',
                      borderRadius: '1rem',
                      border: '1px solid rgba(59, 130, 246, 0.15)',
                      transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                      cursor: 'pointer',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-4px) scale(1.02)';
                      e.currentTarget.style.boxShadow = '0 20px 40px rgba(59, 130, 246, 0.2)';
                      e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.3)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0) scale(1)';
                      e.currentTarget.style.boxShadow = 'none';
                      e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.15)';
                    }}
                    >
                      <div style={{
                        position: 'absolute',
                        top: '-50%',
                        right: '-50%',
                        width: '100%',
                        height: '100%',
                        background: 'linear-gradient(45deg, transparent, rgba(59, 130, 246, 0.05), transparent)',
                        animation: 'shimmer 3s ease-in-out infinite'
                      }}></div>
                      
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        marginBottom: '0.75rem',
                        position: 'relative',
                        zIndex: 1
                      }}>
                        <div style={{
                          width: '2.5rem',
                          height: '2.5rem',
                          background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                          borderRadius: '0.75rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginRight: '1rem',
                          fontSize: '1.2rem',
                          boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
                        }}>
                          📅
                        </div>
                        <h4 style={{
                          fontSize: '1rem',
                          fontWeight: '700',
                          color: '#1e40af',
                          margin: '0'
                        }}>
                          Duration
                        </h4>
                      </div>
                      <p style={{
                        fontSize: '0.875rem',
                        color: '#475569',
                        margin: '0',
                        lineHeight: '1.5',
                        position: 'relative',
                        zIndex: 1
                      }}>
                        7 consecutive days of consistent assessment
                      </p>
                    </div>
                    
                    {/* 🎨 Enhanced Goal Card */}
                    <div style={{
                      background: 'linear-gradient(145deg, #fef2f2 0%, #fee2e2 50%, #fecaca 100%)',
                      padding: window.innerWidth <= 768 ? '1.25rem' : '1.5rem',
                      borderRadius: '1rem',
                      border: '1px solid rgba(239, 68, 68, 0.15)',
                      transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                      cursor: 'pointer',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-4px) scale(1.02)';
                      e.currentTarget.style.boxShadow = '0 20px 40px rgba(239, 68, 68, 0.2)';
                      e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.3)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0) scale(1)';
                      e.currentTarget.style.boxShadow = 'none';
                      e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.15)';
                    }}
                    >
                      <div style={{
                        position: 'absolute',
                        top: '-50%',
                        right: '-50%',
                        width: '100%',
                        height: '100%',
                        background: 'linear-gradient(45deg, transparent, rgba(239, 68, 68, 0.05), transparent)',
                        animation: 'shimmer 3s ease-in-out infinite 0.5s'
                      }}></div>
                      
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        marginBottom: '0.75rem',
                        position: 'relative',
                        zIndex: 1
                      }}>
                        <div style={{
                          width: '2.5rem',
                          height: '2.5rem',
                          background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                          borderRadius: '0.75rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginRight: '1rem',
                          fontSize: '1.2rem',
                          boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)'
                        }}>
                          🎯
                        </div>
                        <h4 style={{
                          fontSize: '1rem',
                          fontWeight: '700',
                          color: '#dc2626',
                          margin: '0'
                        }}>
                          Goal
                        </h4>
                      </div>
                      <p style={{
                        fontSize: '0.875rem',
                        color: '#475569',
                        margin: '0',
                        lineHeight: '1.5',
                        position: 'relative',
                        zIndex: 1
                      }}>
                        Submit daily work readiness assessments
                      </p>
                    </div>
                    
                    {/* 🎨 Enhanced Important Card */}
                    <div style={{
                      background: 'linear-gradient(145deg, #fffbeb 0%, #fef3c7 50%, #fde68a 100%)',
                      padding: window.innerWidth <= 768 ? '1.25rem' : '1.5rem',
                      borderRadius: '1rem',
                      border: '1px solid rgba(245, 158, 11, 0.15)',
                      transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                      cursor: 'pointer',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-4px) scale(1.02)';
                      e.currentTarget.style.boxShadow = '0 20px 40px rgba(245, 158, 11, 0.2)';
                      e.currentTarget.style.borderColor = 'rgba(245, 158, 11, 0.3)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0) scale(1)';
                      e.currentTarget.style.boxShadow = 'none';
                      e.currentTarget.style.borderColor = 'rgba(245, 158, 11, 0.15)';
                    }}
                    >
                      <div style={{
                        position: 'absolute',
                        top: '-50%',
                        right: '-50%',
                        width: '100%',
                        height: '100%',
                        background: 'linear-gradient(45deg, transparent, rgba(245, 158, 11, 0.05), transparent)',
                        animation: 'shimmer 3s ease-in-out infinite 1s'
                      }}></div>
                      
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        marginBottom: '0.75rem',
                        position: 'relative',
                        zIndex: 1
                      }}>
                        <div style={{
                          width: '2.5rem',
                          height: '2.5rem',
                          background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                          borderRadius: '0.75rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginRight: '1rem',
                          fontSize: '1.2rem',
                          boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)'
                        }}>
                          ⚠️
                        </div>
                        <h4 style={{
                          fontSize: '1rem',
                          fontWeight: '700',
                          color: '#d97706',
                          margin: '0'
                        }}>
                          Important
                        </h4>
                      </div>
                      <p style={{
                        fontSize: '0.875rem',
                        color: '#475569',
                        margin: '0',
                        lineHeight: '1.5',
                        position: 'relative',
                        zIndex: 1
                      }}>
                        Don't miss any day - consistency is key!
                      </p>
                    </div>
                    
                    {/* 🎨 Enhanced Reward Card */}
                    <div style={{
                      background: 'linear-gradient(145deg, #f0fdf4 0%, #dcfce7 50%, #bbf7d0 100%)',
                      padding: window.innerWidth <= 768 ? '1.25rem' : '1.5rem',
                      borderRadius: '1rem',
                      border: '1px solid rgba(34, 197, 94, 0.15)',
                      transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                      cursor: 'pointer',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-4px) scale(1.02)';
                      e.currentTarget.style.boxShadow = '0 20px 40px rgba(34, 197, 94, 0.2)';
                      e.currentTarget.style.borderColor = 'rgba(34, 197, 94, 0.3)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0) scale(1)';
                      e.currentTarget.style.boxShadow = 'none';
                      e.currentTarget.style.borderColor = 'rgba(34, 197, 94, 0.15)';
                    }}
                    >
                      <div style={{
                        position: 'absolute',
                        top: '-50%',
                        right: '-50%',
                        width: '100%',
                        height: '100%',
                        background: 'linear-gradient(45deg, transparent, rgba(34, 197, 94, 0.05), transparent)',
                        animation: 'shimmer 3s ease-in-out infinite 1.5s'
                      }}></div>
                      
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        marginBottom: '0.75rem',
                        position: 'relative',
                        zIndex: 1
                      }}>
                        <div style={{
                          width: '2.5rem',
                          height: '2.5rem',
                          background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                          borderRadius: '0.75rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginRight: '1rem',
                          fontSize: '1.2rem',
                          boxShadow: '0 4px 12px rgba(34, 197, 94, 0.3)'
                        }}>
                          🏆
                        </div>
                        <h4 style={{
                          fontSize: '1rem',
                          fontWeight: '700',
                          color: '#16a34a',
                          margin: '0'
                        }}>
                          Reward
                        </h4>
                      </div>
                      <p style={{
                        fontSize: '0.875rem',
                        color: '#475569',
                        margin: '0',
                        lineHeight: '1.5',
                        position: 'relative',
                        zIndex: 1
                      }}>
                        Achieve Excellent KPI rating & recognition
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* 🎨 Enhanced Action button with better animations */}
                <button
                  onClick={() => {
                    setShowCycleWelcome(false);
                    setShowSimpleWorkReadiness(true);
                  }}
                  style={{
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '1rem',
                    padding: '1.25rem 2.5rem',
                    fontSize: '1.1rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    width: '100%',
                    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: `
                      0 8px 25px rgba(16, 185, 129, 0.3),
                      0 0 0 1px rgba(255, 255, 255, 0.1),
                      inset 0 1px 0 rgba(255, 255, 255, 0.2)
                    `,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.75rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-3px) scale(1.02)';
                    e.currentTarget.style.boxShadow = `
                      0 15px 35px rgba(16, 185, 129, 0.4),
                      0 0 0 1px rgba(255, 255, 255, 0.2),
                      inset 0 1px 0 rgba(255, 255, 255, 0.3)
                    `;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0) scale(1)';
                    e.currentTarget.style.boxShadow = `
                      0 8px 25px rgba(16, 185, 129, 0.3),
                      0 0 0 1px rgba(255, 255, 255, 0.1),
                      inset 0 1px 0 rgba(255, 255, 255, 0.2)
                    `;
                  }}
                >
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: '-100%',
                    width: '100%',
                    height: '100%',
                    background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent)',
                    transition: 'left 0.6s ease'
                  }}></div>
                  <span style={{ fontSize: '1.3rem' }}>🚀</span>
                  <span>Let's Begin Your Journey!</span>
                  <span style={{ fontSize: '1.3rem' }}>✨</span>
                </button>
              </div>
            </div>
          </>
        )}
      </Box>
    </LayoutWithSidebar>
  );
});

WorkerDashboard.displayName = 'WorkerDashboard';

export default WorkerDashboard;
