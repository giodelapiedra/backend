import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface TeamsState {
  selectedTeam: string;
  teamMembers: any[];
  filters: {
    role?: string;
    status?: string;
    team?: string;
  };
  sortBy: 'name' | 'role' | 'lastLogin' | 'createdAt';
  sortOrder: 'asc' | 'desc';
}

const initialState: TeamsState = {
  selectedTeam: '',
  teamMembers: [],
  filters: {},
  sortBy: 'name',
  sortOrder: 'asc',
};

const teamsSlice = createSlice({
  name: 'teams',
  initialState,
  reducers: {
    setSelectedTeam: (state, action: PayloadAction<string>) => {
      state.selectedTeam = action.payload;
    },
    
    setTeamMembers: (state, action: PayloadAction<any[]>) => {
      state.teamMembers = action.payload;
    },
    
    addTeamMember: (state, action: PayloadAction<any>) => {
      state.teamMembers.push(action.payload);
    },
    
    updateTeamMember: (state, action: PayloadAction<{ id: string; updates: any }>) => {
      const { id, updates } = action.payload;
      const index = state.teamMembers.findIndex(member => member.id === id);
      if (index !== -1) {
        state.teamMembers[index] = { ...state.teamMembers[index], ...updates };
      }
    },
    
    removeTeamMember: (state, action: PayloadAction<string>) => {
      state.teamMembers = state.teamMembers.filter(member => member.id !== action.payload);
    },
    
    setFilters: (state, action: PayloadAction<Partial<TeamsState['filters']>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    
    clearFilters: (state) => {
      state.filters = {};
    },
    
    setSorting: (state, action: PayloadAction<{ sortBy: TeamsState['sortBy']; sortOrder: TeamsState['sortOrder'] }>) => {
      state.sortBy = action.payload.sortBy;
      state.sortOrder = action.payload.sortOrder;
    },
  },
});

export const {
  setSelectedTeam,
  setTeamMembers,
  addTeamMember,
  updateTeamMember,
  removeTeamMember,
  setFilters,
  clearFilters,
  setSorting,
} = teamsSlice.actions;

export default teamsSlice.reducer;
