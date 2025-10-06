import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface CasesState {
  selectedCase: any | null;
  filters: {
    status?: string;
    priority?: string;
    clinician?: string;
    worker?: string;
  };
  sortBy: 'createdAt' | 'updatedAt' | 'priority' | 'status';
  sortOrder: 'asc' | 'desc';
}

const initialState: CasesState = {
  selectedCase: null,
  filters: {},
  sortBy: 'createdAt',
  sortOrder: 'desc',
};

const casesSlice = createSlice({
  name: 'cases',
  initialState,
  reducers: {
    setSelectedCase: (state, action: PayloadAction<any | null>) => {
      state.selectedCase = action.payload;
    },
    setFilters: (state, action: PayloadAction<Partial<CasesState['filters']>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    setSorting: (state, action: PayloadAction<{ sortBy: CasesState['sortBy']; sortOrder: CasesState['sortOrder'] }>) => {
      state.sortBy = action.payload.sortBy;
      state.sortOrder = action.payload.sortOrder;
    },
    clearFilters: (state) => {
      state.filters = {};
    },
  },
});

export const { setSelectedCase, setFilters, setSorting, clearFilters } = casesSlice.actions;
export default casesSlice.reducer;


