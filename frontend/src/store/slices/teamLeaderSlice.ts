import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface TeamLeaderState {
  selectedTeam: string;
  selectedDate: string;
  selectedMonth: number;
  selectedYear: number;
  filterStatus: 'all' | 'pending' | 'completed' | 'overdue' | 'cancelled';
  viewMode: 'list' | 'grid' | 'calendar';
  mainTab: number;
  showInactive: boolean;
  sortBy: 'name' | 'date' | 'status' | 'compliance';
  sortOrder: 'asc' | 'desc';
}

const currentDate = new Date();

const initialState: TeamLeaderState = {
  selectedTeam: '',
  selectedDate: currentDate.toISOString().split('T')[0],
  selectedMonth: currentDate.getMonth() + 1,
  selectedYear: currentDate.getFullYear(),
  filterStatus: 'all',
  viewMode: 'list',
  mainTab: 0,
  showInactive: false,
  sortBy: 'date',
  sortOrder: 'desc',
};

const teamLeaderSlice = createSlice({
  name: 'teamLeader',
  initialState,
  reducers: {
    setSelectedTeam: (state, action: PayloadAction<string>) => {
      state.selectedTeam = action.payload;
    },
    
    setSelectedDate: (state, action: PayloadAction<string>) => {
      state.selectedDate = action.payload;
    },
    
    setSelectedMonth: (state, action: PayloadAction<number>) => {
      state.selectedMonth = action.payload;
    },
    
    setSelectedYear: (state, action: PayloadAction<number>) => {
      state.selectedYear = action.payload;
    },
    
    setFilterStatus: (state, action: PayloadAction<TeamLeaderState['filterStatus']>) => {
      state.filterStatus = action.payload;
    },
    
    setViewMode: (state, action: PayloadAction<TeamLeaderState['viewMode']>) => {
      state.viewMode = action.payload;
    },
    
    setMainTab: (state, action: PayloadAction<number>) => {
      state.mainTab = action.payload;
    },
    
    setShowInactive: (state, action: PayloadAction<boolean>) => {
      state.showInactive = action.payload;
    },
    
    setSorting: (state, action: PayloadAction<{ sortBy: TeamLeaderState['sortBy']; sortOrder: TeamLeaderState['sortOrder'] }>) => {
      state.sortBy = action.payload.sortBy;
      state.sortOrder = action.payload.sortOrder;
    },
    
    resetFilters: (state) => {
      state.filterStatus = 'all';
      state.showInactive = false;
      state.sortBy = 'date';
      state.sortOrder = 'desc';
    },
    
    resetToToday: (state) => {
      const today = new Date();
      state.selectedDate = today.toISOString().split('T')[0];
      state.selectedMonth = today.getMonth() + 1;
      state.selectedYear = today.getFullYear();
    },
  },
});

export const {
  setSelectedTeam,
  setSelectedDate,
  setSelectedMonth,
  setSelectedYear,
  setFilterStatus,
  setViewMode,
  setMainTab,
  setShowInactive,
  setSorting,
  resetFilters,
  resetToToday,
} = teamLeaderSlice.actions;

export default teamLeaderSlice.reducer;

