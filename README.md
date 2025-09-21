# 🏥 Occupational Rehabilitation Management System

A comprehensive web-based system for managing occupational rehabilitation cases, designed to streamline the process from incident reporting to full recovery and return to work.

## 🌟 Features

### 👥 Multi-Role System
- **Workers** - Daily check-ins, rehabilitation plans, progress tracking
- **Employers** - Incident reporting, case monitoring, compliance tracking
- **Clinicians** - Assessments, treatment plans, progress evaluation
- **Case Managers** - Case coordination, scheduling, progress oversight
- **Site Supervisors** - Safety compliance, incident prevention
- **GP/Insurers** - Medical reports, insurance claims
- **Admins** - System management, analytics, user administration

### 🔧 Core Functionalities
- **Incident Management** - Report, track, and manage workplace incidents
- **Case Management** - Comprehensive case lifecycle management
- **Assessment Tools** - Medical and functional assessments
- **Rehabilitation Plans** - Customized recovery programs
- **Appointment Scheduling** - Integrated calendar system
- **Daily Check-ins** - Worker progress monitoring
- **Smart Notifications** - Automated reminders and alerts
- **Analytics Dashboard** - Comprehensive reporting and insights
- **File Management** - Document and photo uploads
- **Activity Logging** - Complete audit trail

### 🤖 Smart Features
- **Auto-Assignment** - Intelligent case and clinician assignment
- **AI Triage** - Automated case prioritization
- **Smart Notifications** - Context-aware reminders
- **Progress Tracking** - Real-time rehabilitation monitoring
- **Compliance Monitoring** - Automated safety checks

## 🛠️ Technology Stack

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM
- **JWT** - Authentication
- **Bcrypt** - Password hashing
- **Multer** - File uploads
- **Node-Cache** - Caching
- **Node-Cron** - Scheduled jobs

### Frontend
- **React** - UI framework
- **TypeScript** - Type safety
- **Material-UI** - Component library
- **Axios** - HTTP client
- **React Router** - Navigation

### Security
- **Helmet** - Security headers
- **CORS** - Cross-origin resource sharing
- **CSRF Protection** - Cross-site request forgery prevention
- **Input Sanitization** - XSS prevention
- **Rate Limiting** - DDoS protection

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (v5 or higher)
- npm (v8 or higher)

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd occupational-rehab-system
   ```

2. **Install dependencies**
   ```bash
   # Install all dependencies
   npm run install-all
   
   # Or install separately
   cd backend && npm install
   cd ../frontend && npm install
   ```

3. **Environment Setup**
   
   **Backend (.env)**
   ```env
   NODE_ENV=development
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/occupational-rehab
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   JWT_EXPIRE=7d
   FRONTEND_URL=http://localhost:3000
   ```
   
   **Frontend (.env)**
   ```env
   REACT_APP_API_URL=http://localhost:5000/api
   ```

4. **Start MongoDB**
   ```bash
   # Windows
   net start MongoDB
   
   # macOS/Linux
   sudo systemctl start mongod
   ```

5. **Run the application**
   ```bash
   # Development mode (both frontend and backend)
   npm run dev
   
   # Or run separately
   npm run server  # Backend only
   npm run client  # Frontend only
   ```

6. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000/api

## 👤 Default User Accounts

After starting the application, you can register new users or use these test accounts:

| Email | Password | Role |
|-------|----------|------|
| admin@example.com | TestPassword123! | Admin |
| casemanager@example.com | TestPassword123! | Case Manager |
| clinician@example.com | TestPassword123! | Clinician |
| employer@example.com | TestPassword123! | Employer |
| worker@example.com | TestPassword123! | Worker |

## 📁 Project Structure

```
occupational-rehab-system/
├── backend/
│   ├── controllers/          # Business logic controllers
│   ├── middleware/          # Auth, validation, caching
│   ├── models/              # Database schemas
│   ├── routes/              # API endpoints
│   ├── services/            # Business services
│   ├── utils/               # Utility functions
│   └── server.js           # Main server file
├── frontend/
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── contexts/       # React contexts
│   │   ├── pages/          # Page components
│   │   ├── styles/         # CSS files
│   │   ├── types/          # TypeScript types
│   │   └── utils/          # Utility functions
│   └── public/             # Static assets
└── README.md
```

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - User logout

### Users
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### Cases
- `GET /api/cases` - Get all cases
- `POST /api/cases` - Create new case
- `GET /api/cases/:id` - Get case by ID
- `PUT /api/cases/:id` - Update case
- `DELETE /api/cases/:id` - Delete case

### Incidents
- `GET /api/incidents` - Get all incidents
- `POST /api/incidents` - Report incident
- `GET /api/incidents/:id` - Get incident by ID
- `PUT /api/incidents/:id` - Update incident

### Assessments
- `GET /api/assessments` - Get all assessments
- `POST /api/assessments` - Create assessment
- `GET /api/assessments/:id` - Get assessment by ID
- `PUT /api/assessments/:id` - Update assessment

### Rehabilitation Plans
- `GET /api/rehabilitation-plans` - Get all plans
- `POST /api/rehabilitation-plans` - Create plan
- `GET /api/rehabilitation-plans/:id` - Get plan by ID
- `PUT /api/rehabilitation-plans/:id` - Update plan

### Appointments
- `GET /api/appointments` - Get all appointments
- `POST /api/appointments` - Schedule appointment
- `GET /api/appointments/:id` - Get appointment by ID
- `PUT /api/appointments/:id` - Update appointment

### Check-ins
- `GET /api/check-ins` - Get all check-ins
- `POST /api/check-ins` - Submit check-in
- `GET /api/check-ins/:id` - Get check-in by ID

### Notifications
- `GET /api/notifications` - Get user notifications
- `PUT /api/notifications/:id/read` - Mark as read
- `DELETE /api/notifications/:id` - Delete notification

### Admin
- `GET /api/admin/analytics` - System analytics
- `GET /api/admin/users` - User management
- `GET /api/admin/cases` - Case management

## 🔒 Security Features

- **JWT Authentication** - Secure token-based auth
- **Password Hashing** - Bcrypt encryption
- **Role-Based Access Control** - Granular permissions
- **Input Validation** - Express-validator
- **XSS Protection** - Input sanitization
- **CSRF Protection** - Cross-site request forgery prevention
- **Rate Limiting** - DDoS protection
- **Security Headers** - Helmet.js

## 📊 Performance Optimizations

- **Database Indexing** - Optimized queries
- **Caching** - Node-cache for API responses
- **Compression** - Gzip compression
- **Lazy Loading** - Component-based loading
- **Image Optimization** - Compressed uploads

## 🧪 Testing

```bash
# Run backend tests
cd backend && npm test

# Run frontend tests
cd frontend && npm test

# Run all tests
npm run test
```

## 🚀 Deployment

### Production Build
```bash
# Build frontend
cd frontend && npm run build

# Start production server
cd backend && npm start
```

### Environment Variables (Production)
```env
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb://your-production-db
JWT_SECRET=your-production-secret
FRONTEND_URL=https://your-domain.com
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

**Your Name**
- GitHub: [@yourusername](https://github.com/yourusername)
- Email: your.email@example.com

## 🙏 Acknowledgments

- Material-UI for the component library
- MongoDB for the database
- Express.js for the backend framework
- React for the frontend framework

## 📞 Support

If you have any questions or need help, please:
- Open an issue on GitHub
- Contact: your.email@example.com

---

**Made with ❤️ for better occupational health management**