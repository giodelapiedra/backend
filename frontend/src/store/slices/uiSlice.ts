import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// UI Slice for managing application state

interface UIState {
  loading: boolean;
  error: string | null;
  successMessage: string | null;
  lastFetchTime: number;
  dialogs: {
    incidentDialog: boolean;
    incidentDetailsDialog: boolean;
    teamDialog: boolean;
    memberDialog: boolean;
    assignmentDialog: boolean;
  };
  activeTab: number;
}

const initialState: UIState = {
  loading: false,
  error: null,
  successMessage: null,
  lastFetchTime: 0,
  dialogs: {
    incidentDialog: false,
    incidentDetailsDialog: false,
    teamDialog: false,
    memberDialog: false,
    assignmentDialog: false,
  },
  activeTab: 0,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    
    setSuccessMessage: (state, action: PayloadAction<string | null>) => {
      state.successMessage = action.payload;
    },
    
    setLastFetchTime: (state, action: PayloadAction<number>) => {
      state.lastFetchTime = action.payload;
    },
    
    openDialog: (state, action: PayloadAction<keyof UIState['dialogs']>) => {
      state.dialogs[action.payload] = true;
    },
    
    closeDialog: (state, action: PayloadAction<keyof UIState['dialogs']>) => {
      state.dialogs[action.payload] = false;
    },
    
    closeAllDialogs: (state) => {
      Object.keys(state.dialogs).forEach(key => {
        state.dialogs[key as keyof UIState['dialogs']] = false;
      });
    },
    
    setActiveTab: (state, action: PayloadAction<number>) => {
      state.activeTab = action.payload;
    },
    
    clearMessages: (state) => {
      state.error = null;
      state.successMessage = null;
    },
  },
});

export const {
  setLoading,
  setError,
  setSuccessMessage,
  setLastFetchTime,
  openDialog,
  closeDialog,
  closeAllDialogs,
  setActiveTab,
  clearMessages,
} = uiSlice.actions;

export default uiSlice.reducer;
