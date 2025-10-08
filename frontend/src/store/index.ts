import { configureStore } from '@reduxjs/toolkit';
import { incidentsApi } from './api/incidentsApi';
import { teamsApi } from './api/teamsApi';
import { casesApi } from './api/casesApi';
import { teamLeaderApi } from './api/teamLeaderApi';
import incidentsReducer from './slices/incidentsSlice';
import teamsReducer from './slices/teamsSlice';
import casesReducer from './slices/casesSlice';
import uiReducer from './slices/uiSlice';
import teamLeaderReducer from './slices/teamLeaderSlice';

export const store = configureStore({
  reducer: {
    incidents: incidentsReducer,
    teams: teamsReducer,
    cases: casesReducer,
    ui: uiReducer,
    teamLeader: teamLeaderReducer,
    [incidentsApi.reducerPath]: incidentsApi.reducer,
    [teamsApi.reducerPath]: teamsApi.reducer,
    [casesApi.reducerPath]: casesApi.reducer,
    [teamLeaderApi.reducerPath]: teamLeaderApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(
      incidentsApi.middleware,
      teamsApi.middleware,
      casesApi.middleware,
      teamLeaderApi.middleware
    ),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
