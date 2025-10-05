import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface IncidentForm {
  worker: string;
  incidentDate: string;
  incidentType: string;
  severity: string;
  description: string;
  location: {
    site: string;
    department: string;
    specificLocation: string;
  };
  immediateCause: string;
  rootCause: string;
  immediateActions: string[];
  correctiveActions: string[];
  preventiveActions: string[];
}

interface IncidentsState {
  selectedIncident: any | null;
  incidentForm: IncidentForm;
  selectedPhotos: File[];
  photoPreviewUrls: string[];
  filters: {
    status?: string;
    severity?: string;
    dateRange?: {
      start: string;
      end: string;
    };
  };
  sortBy: 'createdAt' | 'incidentDate' | 'severity';
  sortOrder: 'asc' | 'desc';
}

const initialState: IncidentsState = {
  selectedIncident: null,
  incidentForm: {
    worker: '',
    incidentDate: '',
    incidentType: '',
    severity: '',
    description: '',
    location: {
      site: '',
      department: '',
      specificLocation: ''
    },
    immediateCause: '',
    rootCause: '',
    immediateActions: [],
    correctiveActions: [],
    preventiveActions: []
  },
  selectedPhotos: [],
  photoPreviewUrls: [],
  filters: {},
  sortBy: 'createdAt',
  sortOrder: 'desc',
};

const incidentsSlice = createSlice({
  name: 'incidents',
  initialState,
  reducers: {
    setSelectedIncident: (state, action: PayloadAction<any | null>) => {
      state.selectedIncident = action.payload;
    },
    
    updateIncidentForm: (state, action: PayloadAction<Partial<IncidentForm>>) => {
      state.incidentForm = { ...state.incidentForm, ...action.payload };
    },
    
    resetIncidentForm: (state) => {
      state.incidentForm = initialState.incidentForm;
    },
    
    setSelectedPhotos: (state, action: PayloadAction<File[]>) => {
      state.selectedPhotos = action.payload;
    },
    
    setPhotoPreviewUrls: (state, action: PayloadAction<string[]>) => {
      state.photoPreviewUrls = action.payload;
    },
    
    addPhoto: (state, action: PayloadAction<{ file: File; previewUrl: string }>) => {
      state.selectedPhotos.push(action.payload.file);
      state.photoPreviewUrls.push(action.payload.previewUrl);
    },
    
    removePhoto: (state, action: PayloadAction<number>) => {
      const index = action.payload;
      if (index >= 0 && index < state.selectedPhotos.length) {
        // Revoke object URL to prevent memory leaks
        URL.revokeObjectURL(state.photoPreviewUrls[index]);
        state.selectedPhotos.splice(index, 1);
        state.photoPreviewUrls.splice(index, 1);
      }
    },
    
    clearPhotos: (state) => {
      // Revoke all object URLs to prevent memory leaks
      state.photoPreviewUrls.forEach(url => URL.revokeObjectURL(url));
      state.selectedPhotos = [];
      state.photoPreviewUrls = [];
    },
    
    setFilters: (state, action: PayloadAction<Partial<IncidentsState['filters']>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    
    clearFilters: (state) => {
      state.filters = {};
    },
    
    setSorting: (state, action: PayloadAction<{ sortBy: IncidentsState['sortBy']; sortOrder: IncidentsState['sortOrder'] }>) => {
      state.sortBy = action.payload.sortBy;
      state.sortOrder = action.payload.sortOrder;
    },
  },
});

export const {
  setSelectedIncident,
  updateIncidentForm,
  resetIncidentForm,
  setSelectedPhotos,
  setPhotoPreviewUrls,
  addPhoto,
  removePhoto,
  clearPhotos,
  setFilters,
  clearFilters,
  setSorting,
} = incidentsSlice.actions;

export default incidentsSlice.reducer;


