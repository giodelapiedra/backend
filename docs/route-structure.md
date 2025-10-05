# 🔗 Backend to Frontend Route Structure

## 📋 **Complete Route Mapping**

### 🔐 **Authentication Routes** (`/api/auth`)

| Method | Endpoint | Frontend Usage | Security Level |
|--------|----------|----------------|----------------|
| `POST` | `/api/auth/register` | `AuthContext.register()` | Public + Rate Limited |
| `POST` | `/api/auth/login` | `AuthContext.login()` | Public + Rate Limited |
| `GET` | `/api/auth/me` | `AuthContext.checkAuth()` | Private |
| `POST` | `/api/auth/change-password` | Profile settings | Private |
| `POST` | `/api/auth/logout` | `AuthContext.logout()` | Private |

**Frontend Implementation:**
```typescript
// frontend/src/contexts/AuthContext.tsx
const login = async (email: string, password: string) => {
  const response = await api.post('/auth/login', { email, password });
  // Token automatically set in httpOnly cookie
  setUser(response.data.user);
};

const register = async (userData: RegisterData) => {
  const response = await api.post('/auth/register', userData);
  setUser(response.data.user);
};
```

---

### 👥 **User Management Routes** (`/api/users`)

| Method | Endpoint | Frontend Usage | Security Level |
|--------|----------|----------------|----------------|
| `GET` | `/api/users` | Admin dashboard, User lists | Admin/Case Manager |
| `GET` | `/api/users/:id` | User profiles | Private (Resource-level) |
| `POST` | `/api/users` | Admin user creation | Admin only |
| `PUT` | `/api/users/:id` | Profile updates | Private (Self/Admin) |
| `DELETE` | `/api/users/:id` | User deactivation | Admin only |

**Frontend Implementation:**
```typescript
// frontend/src/pages/admin/UserManagement.tsx
const fetchUsers = async () => {
  const response = await api.get('/users', {
    params: { page, limit, role, search }
  });
  setUsers(response.data.users);
};

const createUser = async (userData: CreateUserData) => {
  await api.post('/users', userData);
  fetchUsers(); // Refresh list
};
```

---

### 📋 **Case Management Routes** (`/api/cases`)

| Method | Endpoint | Frontend Usage | Security Level |
|--------|----------|----------------|----------------|
| `GET` | `/api/cases` | Case lists, Dashboards | Role-based filtering |
| `GET` | `/api/cases/:id` | Case details | Resource-level access |
| `POST` | `/api/cases` | Create new case | Case Manager/Admin |
| `PUT` | `/api/cases/:id` | Update case | Assigned users |
| `PUT` | `/api/cases/:id/status` | Status updates | Case Manager/Admin |
| `POST` | `/api/cases/:id/notes` | Add notes | Assigned users |

**Frontend Implementation:**
```typescript
// frontend/src/pages/caseManager/CaseManagerDashboard.tsx
const fetchCases = async () => {
  const response = await api.get('/cases', {
    params: { page, limit, status, priority, search }
  });
  setCases(response.data.cases);
};

const createCase = async (caseData: CreateCaseData) => {
  const response = await api.post('/cases', caseData);
  setCases(prev => [response.data.case, ...prev]);
};

const updateCaseStatus = async (caseId: string, status: string) => {
  await api.put(`/cases/${caseId}/status`, { status });
  fetchCases(); // Refresh
};
```

---

### 📅 **Appointment Routes** (`/api/appointments`)

| Method | Endpoint | Frontend Usage | Security Level |
|--------|----------|----------------|----------------|
| `GET` | `/api/appointments` | Appointment lists | Role-based filtering |
| `GET` | `/api/appointments/:id` | Appointment details | Resource-level access |
| `POST` | `/api/appointments` | Schedule appointment | Clinician/Case Manager |
| `PUT` | `/api/appointments/:id` | Update appointment | Assigned users |
| `PUT` | `/api/appointments/:id/status` | Mark completed/no-show | Assigned users |
| `DELETE` | `/api/appointments/:id` | Cancel appointment | Assigned users |

**Frontend Implementation:**
```typescript
// frontend/src/pages/Appointments.tsx
const fetchAppointments = async () => {
  const response = await api.get('/appointments');
  setAppointments(response.data.appointments || []);
};

const createAppointment = async (appointmentData: AppointmentData) => {
  await api.post('/appointments', appointmentData);
  fetchAppointments(); // Refresh
};

const updateAppointmentStatus = async (id: string, status: string) => {
  await api.put(`/appointments/${id}/status`, { status });
  fetchAppointments();
};
```

---

### 🏥 **Check-in Routes** (`/api/check-ins`)

| Method | Endpoint | Frontend Usage | Security Level |
|--------|----------|----------------|----------------|
| `GET` | `/api/check-ins` | Check-in lists | Role-based filtering |
| `GET` | `/api/check-ins/:id` | Check-in details | Resource-level access |
| `POST` | `/api/check-ins` | Submit check-in | Workers |
| `PUT` | `/api/check-ins/:id` | Update check-in | Workers/Clinicians |
| `GET` | `/api/check-ins/dashboard/stats` | Dashboard statistics | Clinicians/Case Managers |

**Frontend Implementation:**
```typescript
// frontend/src/pages/worker/WorkerDashboard.tsx
const submitCheckIn = async (checkInData: CheckInData) => {
  await api.post('/check-ins', checkInData);
  fetchCheckIns(); // Refresh
};

const fetchCheckInStats = async () => {
  const response = await api.get('/check-ins/dashboard/stats');
  setStats(response.data);
};
```

---

### 🚨 **Incident Routes** (`/api/incidents`)

| Method | Endpoint | Frontend Usage | Security Level |
|--------|----------|----------------|----------------|
| `GET` | `/api/incidents` | Incident lists | Role-based filtering |
| `GET` | `/api/incidents/:id` | Incident details | Resource-level access |
| `POST` | `/api/incidents` | Report incident | Site Supervisor/Employer |
| `PUT` | `/api/incidents/:id` | Update incident | Reporter/Admin |
| `PUT` | `/api/incidents/:id/status` | Close incident | Admin/Case Manager |

**Frontend Implementation:**
```typescript
// frontend/src/pages/siteSupervisor/IncidentReporting.tsx
const reportIncident = async (incidentData: IncidentData) => {
  await api.post('/incidents', incidentData);
  fetchIncidents(); // Refresh
};

const fetchIncidents = async () => {
  const response = await api.get('/incidents');
  setIncidents(response.data.incidents || []);
};
```

---

### 🏥 **Rehabilitation Plan Routes** (`/api/rehabilitation-plans`)

| Method | Endpoint | Frontend Usage | Security Level |
|--------|----------|----------------|----------------|
| `GET` | `/api/rehabilitation-plans` | Plan lists | Role-based filtering |
| `GET` | `/api/rehabilitation-plans/:id` | Plan details | Resource-level access |
| `POST` | `/api/rehabilitation-plans` | Create plan | Clinicians |
| `PUT` | `/api/rehabilitation-plans/:id` | Update plan | Assigned clinician |
| `POST` | `/api/rehabilitation-plans/:id/exercises/:exerciseId/complete` | Complete exercise | Workers |

**Frontend Implementation:**
```typescript
// frontend/src/pages/worker/WorkerRehabilitationPlan.tsx
const fetchRehabilitationPlan = async () => {
  const response = await api.get('/rehabilitation-plans');
  setPlan(response.data.plans[0]); // Worker's assigned plan
};

const completeExercise = async (planId: string, exerciseId: string) => {
  await api.post(`/rehabilitation-plans/${planId}/exercises/${exerciseId}/complete`);
  fetchRehabilitationPlan(); // Refresh
};
```

---

### 📊 **Admin Routes** (`/api/admin`)

| Method | Endpoint | Frontend Usage | Security Level |
|--------|----------|----------------|----------------|
| `GET` | `/api/admin/analytics` | Analytics dashboard | Admin only |
| `GET` | `/api/admin/test` | Admin test endpoint | Admin only |
| `GET` | `/api/admin/users` | User management | Admin only |
| `GET` | `/api/admin/system-health` | System monitoring | Admin only |

**Frontend Implementation:**
```typescript
// frontend/src/pages/admin/Analytics.tsx
const fetchAnalytics = async () => {
  const response = await api.get('/admin/analytics');
  setAnalyticsData(response.data);
};
```

---

## 🔒 **Security Implementation**

### **Backend Security Stack:**
```javascript
// server.js - Route mounting with security
app.use('/api/auth', authLimiter, authRoutes);           // Rate limited
app.use('/api/users', userRoutes);                       // Protected by middleware
app.use('/api/cases', caseRoutes);                       // Protected by middleware
app.use('/api/appointments', appointmentRoutes);         // Protected by middleware
app.use('/api/check-ins', checkInRoutes);                // Protected by middleware
app.use('/api/incidents', incidentRoutes);               // Protected by middleware
app.use('/api/rehabilitation-plans', rehabilitationPlanRoutes); // Protected by middleware
app.use('/api/admin', adminRoutes);                      // Admin only
```

### **Frontend Security Stack:**
```typescript
// utils/api.ts - Axios interceptors
api.interceptors.request.use(async (config) => {
  // Add auth token
  const token = Cookies.get('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  // Add CSRF token for state-changing operations
  if (config.method !== 'get' && !config.url?.includes('/auth/')) {
    const csrf = await getCSRFToken();
    config.headers['X-CSRF-Token'] = csrf;
  }
  
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Auto-redirect to login on auth failure
      Cookies.remove('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

---

## 🎯 **Route Usage Patterns**

### **1. Dashboard Data Fetching:**
```typescript
// Multiple API calls for dashboard
useEffect(() => {
  const fetchDashboardData = async () => {
    try {
      const [casesRes, appointmentsRes, checkInsRes] = await Promise.all([
        api.get('/cases'),
        api.get('/appointments'),
        api.get('/check-ins')
      ]);
      
      setCases(casesRes.data.cases);
      setAppointments(appointmentsRes.data.appointments);
      setCheckIns(checkInsRes.data.checkIns);
    } catch (error) {
      setError('Failed to load dashboard data');
    }
  };
  
  fetchDashboardData();
}, []);
```

### **2. Form Submission with Validation:**
```typescript
const handleSubmit = async (formData: FormData) => {
  try {
    setLoading(true);
    
    // Client-side validation
    if (!formData.email || !formData.password) {
      throw new Error('Email and password are required');
    }
    
    // API call with error handling
    const response = await api.post('/auth/login', formData);
    
    // Success handling
    setUser(response.data.user);
    navigate('/dashboard');
    
  } catch (error: any) {
    setError(error.response?.data?.message || 'Login failed');
  } finally {
    setLoading(false);
  }
};
```

### **3. Real-time Updates:**
```typescript
// Polling for real-time updates
useEffect(() => {
  const interval = setInterval(async () => {
    try {
      const response = await api.get('/check-ins');
      setCheckIns(response.data.checkIns);
    } catch (error) {
      console.error('Failed to fetch updates:', error);
    }
  }, 30000); // Every 30 seconds
  
  return () => clearInterval(interval);
}, []);
```

---

## 📝 **Best Practices**

### **Backend Route Structure:**
1. **Consistent URL patterns** - RESTful design
2. **Proper HTTP methods** - GET, POST, PUT, DELETE
3. **Query parameters** for filtering/pagination
4. **Resource-level authorization** checks
5. **Input validation** and sanitization
6. **Error handling** with proper status codes

### **Frontend API Usage:**
1. **Centralized API client** with interceptors
2. **Error handling** with user-friendly messages
3. **Loading states** for better UX
4. **Optimistic updates** where appropriate
5. **Caching** for frequently accessed data
6. **Type safety** with TypeScript interfaces

This structure provides a secure, scalable, and maintainable connection between backend and frontend! 🚀



