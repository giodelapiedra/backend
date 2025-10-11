import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// Types
export interface Case {
  _id: string;
  caseNumber: string;
  status: string;
  description: string;
  priority: string;
}

export interface Notification {
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

export interface WorkReadinessSubmission {
  id?: string;
  worker_id: string;
  team_leader_id: string | null;
  team: string;
  fatigue_level: number;
  pain_discomfort: string;
  readiness_level: string;
  mood: string;
  notes: string;
  submitted_at: string;
  submittedAt?: string;
  status: string;
}

export interface Assignment {
  id: string;
  worker_id: string;
  assigned_date: string;
  due_time: string;
  status: string;
}

interface WorkerState {
  // Data
  cases: Case[];
  notifications: Notification[];
  currentAssignment: Assignment | null;
  todaySubmission: WorkReadinessSubmission | null;
  
  // Exercise completion tracking
  hasCompletedExercisesToday: boolean;
  exerciseCompletionTime: string | null;
  
  // Submission status
  hasSubmittedToday: boolean;
  timeUntilNextSubmission: string;
  
  // UI State
  loading: boolean;
  successMessage: string;
  
  // Modals
  showSimpleCheckIn: boolean;
  showSimpleWorkReadiness: boolean;
  showWorkReadinessModal: boolean;
  showWorkReadinessConfirmation: boolean;
  showCycleWelcome: boolean;
  
  // Check-in state
  checkInLoading: boolean;
  checkInSuccess: boolean;
  checkInError: string | null;
  
  // Work readiness state
  workReadinessLoading: boolean;
  workReadinessSuccess: boolean;
  workReadinessError: string | null;
  
  // Messages
  cycleWelcomeMessage: string;
  
  // Forms
  selectedCase: Case | null;
  workReadinessForm: {
    fatigueLevel: string;
    painDiscomfort: string;
    painAreas: string[];
    readinessLevel: string;
    mood: string;
    notes: string;
  };
  
  // Slider interaction
  isDragging: boolean;
}

const initialState: WorkerState = {
  // Data
  cases: [],
  notifications: [],
  currentAssignment: null,
  todaySubmission: null,
  
  // Exercise completion tracking
  hasCompletedExercisesToday: false,
  exerciseCompletionTime: null,
  
  // Submission status
  hasSubmittedToday: false,
  timeUntilNextSubmission: '',
  
  // UI State
  loading: true,
  successMessage: '',
  
  // Modals
  showSimpleCheckIn: false,
  showSimpleWorkReadiness: false,
  showWorkReadinessModal: false,
  showWorkReadinessConfirmation: false,
  showCycleWelcome: false,
  
  // Check-in state
  checkInLoading: false,
  checkInSuccess: false,
  checkInError: null,
  
  // Work readiness state
  workReadinessLoading: false,
  workReadinessSuccess: false,
  workReadinessError: null,
  
  // Messages
  cycleWelcomeMessage: '',
  
  // Forms
  selectedCase: null,
  workReadinessForm: {
    fatigueLevel: '',
    painDiscomfort: '',
    painAreas: [],
    readinessLevel: '',
    mood: '',
    notes: ''
  },
  
  // Slider interaction
  isDragging: false,
};

const workerSlice = createSlice({
  name: 'worker',
  initialState,
  reducers: {
    // Data actions
    setCases: (state, action: PayloadAction<Case[]>) => {
      state.cases = action.payload;
    },
    
    setNotifications: (state, action: PayloadAction<Notification[]>) => {
      state.notifications = action.payload;
    },
    
    setCurrentAssignment: (state, action: PayloadAction<Assignment | null>) => {
      state.currentAssignment = action.payload;
    },
    
    setTodaySubmission: (state, action: PayloadAction<WorkReadinessSubmission | null>) => {
      state.todaySubmission = action.payload;
    },
    
    // Exercise completion
    setHasCompletedExercisesToday: (state, action: PayloadAction<boolean>) => {
      state.hasCompletedExercisesToday = action.payload;
    },
    
    setExerciseCompletionTime: (state, action: PayloadAction<string | null>) => {
      state.exerciseCompletionTime = action.payload;
    },
    
    // Submission status
    setHasSubmittedToday: (state, action: PayloadAction<boolean>) => {
      state.hasSubmittedToday = action.payload;
    },
    
    setTimeUntilNextSubmission: (state, action: PayloadAction<string>) => {
      state.timeUntilNextSubmission = action.payload;
    },
    
    // UI State
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    
    setSuccessMessage: (state, action: PayloadAction<string>) => {
      state.successMessage = action.payload;
    },
    
    clearSuccessMessage: (state) => {
      state.successMessage = '';
    },
    
    // Modal actions
    setShowSimpleCheckIn: (state, action: PayloadAction<boolean>) => {
      state.showSimpleCheckIn = action.payload;
    },
    
    setShowSimpleWorkReadiness: (state, action: PayloadAction<boolean>) => {
      state.showSimpleWorkReadiness = action.payload;
    },
    
    setShowWorkReadinessModal: (state, action: PayloadAction<boolean>) => {
      state.showWorkReadinessModal = action.payload;
    },
    
    setShowWorkReadinessConfirmation: (state, action: PayloadAction<boolean>) => {
      state.showWorkReadinessConfirmation = action.payload;
    },
    
    setShowCycleWelcome: (state, action: PayloadAction<boolean>) => {
      state.showCycleWelcome = action.payload;
    },
    
    // Check-in actions
    setCheckInLoading: (state, action: PayloadAction<boolean>) => {
      state.checkInLoading = action.payload;
    },
    
    setCheckInSuccess: (state, action: PayloadAction<boolean>) => {
      state.checkInSuccess = action.payload;
    },
    
    setCheckInError: (state, action: PayloadAction<string | null>) => {
      state.checkInError = action.payload;
    },
    
    // Work readiness actions
    setWorkReadinessLoading: (state, action: PayloadAction<boolean>) => {
      state.workReadinessLoading = action.payload;
    },
    
    setWorkReadinessSuccess: (state, action: PayloadAction<boolean>) => {
      state.workReadinessSuccess = action.payload;
    },
    
    setWorkReadinessError: (state, action: PayloadAction<string | null>) => {
      state.workReadinessError = action.payload;
    },
    
    // Messages
    setCycleWelcomeMessage: (state, action: PayloadAction<string>) => {
      state.cycleWelcomeMessage = action.payload;
    },
    
    // Forms
    setSelectedCase: (state, action: PayloadAction<Case | null>) => {
      state.selectedCase = action.payload;
    },
    
    setWorkReadinessForm: (state, action: PayloadAction<Partial<WorkerState['workReadinessForm']>>) => {
      state.workReadinessForm = { ...state.workReadinessForm, ...action.payload };
    },
    
    resetWorkReadinessForm: (state) => {
      state.workReadinessForm = {
        fatigueLevel: '',
        painDiscomfort: '',
        painAreas: [],
        readinessLevel: '',
        mood: '',
        notes: ''
      };
    },
    
    // Slider interaction
    setIsDragging: (state, action: PayloadAction<boolean>) => {
      state.isDragging = action.payload;
    },
    
    // Close modals and reset
    closeCheckIn: (state) => {
      state.showSimpleCheckIn = false;
      state.selectedCase = null;
      state.checkInSuccess = false;
      state.checkInError = null;
    },
    
    closeWorkReadiness: (state) => {
      state.showSimpleWorkReadiness = false;
      state.workReadinessSuccess = false;
      state.workReadinessError = null;
    },
    
    // Reset all state
    resetWorkerState: () => initialState,
  },
});

export const {
  setCases,
  setNotifications,
  setCurrentAssignment,
  setTodaySubmission,
  setHasCompletedExercisesToday,
  setExerciseCompletionTime,
  setHasSubmittedToday,
  setTimeUntilNextSubmission,
  setLoading,
  setSuccessMessage,
  clearSuccessMessage,
  setShowSimpleCheckIn,
  setShowSimpleWorkReadiness,
  setShowWorkReadinessModal,
  setShowWorkReadinessConfirmation,
  setShowCycleWelcome,
  setCheckInLoading,
  setCheckInSuccess,
  setCheckInError,
  setWorkReadinessLoading,
  setWorkReadinessSuccess,
  setWorkReadinessError,
  setCycleWelcomeMessage,
  setSelectedCase,
  setWorkReadinessForm,
  resetWorkReadinessForm,
  setIsDragging,
  closeCheckIn,
  closeWorkReadiness,
  resetWorkerState,
} = workerSlice.actions;

export default workerSlice.reducer;

