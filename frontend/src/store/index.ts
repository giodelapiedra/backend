import { configureStore } from '@reduxjs/toolkit';
import { incidentsApi } from './api/incidentsApi';
import { teamsApi } from './api/teamsApi';
import { casesApi } from './api/casesApi';
import { teamLeaderApi } from './api/teamLeaderApi';
import { workerApi } from './api/workerApi';
import { caseManagerAnalyticsApi } from './api/caseManagerAnalyticsApi';
import incidentsReducer from './slices/incidentsSlice';
import teamsReducer from './slices/teamsSlice';
import casesReducer from './slices/casesSlice';
import uiReducer from './slices/uiSlice';
import teamLeaderReducer from './slices/teamLeaderSlice';
import workerReducer from './slices/workerSlice';

export const store = configureStore({
  reducer: {
    incidents: incidentsReducer,
    teams: teamsReducer,
    cases: casesReducer,
    ui: uiReducer,
    teamLeader: teamLeaderReducer,
    worker: workerReducer,
    [incidentsApi.reducerPath]: incidentsApi.reducer,
    [teamsApi.reducerPath]: teamsApi.reducer,
    [casesApi.reducerPath]: casesApi.reducer,
    [teamLeaderApi.reducerPath]: teamLeaderApi.reducer,
    [workerApi.reducerPath]: workerApi.reducer,
    [caseManagerAnalyticsApi.reducerPath]: caseManagerAnalyticsApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(
      incidentsApi.middleware,
      teamsApi.middleware,
      casesApi.middleware,
      teamLeaderApi.middleware,
      workerApi.middleware,
      caseManagerAnalyticsApi.middleware
    ),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
