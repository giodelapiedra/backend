# Occupational Rehab System - Backend

## Database Configuration

This system is configured to use MongoDB with the following details:

- **Database Name:** `occupational-rehab`
- **Connection URL:** `mongodb://localhost:27017/occupational-rehab`

## Getting Started

1. Make sure MongoDB is installed and running on your system.
2. Create the `occupational-rehab` database if it doesn't exist.
3. Install dependencies:
   ```
   npm install
   ```
4. Start the server:
   ```
   npm start
   ```

## Testing Database Connection

You can test the database connection using the provided script:

```
node scripts/testDatabaseConnection.js
```

This will:
- Connect to the `occupational-rehab` database
- List all collections in the database
- Show document counts for each collection

## Environment Variables

Create a `.env` file in the backend directory with the following variables:

```
MONGODB_URI=mongodb://localhost:27017/occupational-rehab
PORT=5000
JWT_SECRET=your_jwt_secret_key
CSRF_SECRET=your_csrf_secret_key
NODE_ENV=development
```

## Database Collections

The system uses the following collections:
- activitylogs
- appointments
- assessments
- authenticationlogs
- cases
- checkins
- counters
- incidents
- notifications
- rehabilitationplans
- rehabplans
- users

All data is stored in the `occupational-rehab` database.
