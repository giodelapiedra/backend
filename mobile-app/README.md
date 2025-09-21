# Worker Recovery Mobile App

A React Native mobile application for workers to track their recovery journey, complete daily check-ins, manage rehabilitation exercises, and report safety incidents.

## Features

- **Daily Check-In**: Track pain levels, mood, sleep quality, and job readiness
- **Rehabilitation Exercises**: View and complete assigned exercises
- **Weekly Readiness Review**: Assess readiness to return to full duties
- **Safety Incident Reporting**: Report workplace hazards and safety concerns
- **Profile Management**: View and update personal information

## Prerequisites

- Node.js (v14 or newer)
- npm or yarn
- Expo CLI
- iOS Simulator (for Mac) or Android Emulator

## Installation

1. Clone the repository:
   ```
   git clone <repository-url>
   cd mobile-app
   ```

2. Install dependencies:
   ```
   npm install
   ```
   or
   ```
   yarn install
   ```

3. Start the development server:
   ```
   npm start
   ```
   or
   ```
   yarn start
   ```

4. Follow the instructions in the terminal to open the app in a simulator or on your physical device using the Expo Go app.

## Backend Connection

This mobile app connects to the same backend as the web application. Make sure the backend server is running at the URL specified in `src/utils/api.ts`. 

By default, it connects to `http://localhost:5000/api`. You may need to update this URL based on your backend deployment.

## Project Structure

```
mobile-app/
├── assets/             # Images, fonts and other static assets
├── src/
│   ├── components/     # Reusable UI components
│   ├── contexts/       # React context providers
│   ├── navigation/     # Navigation configuration
│   ├── screens/        # Screen components
│   └── utils/          # Utility functions and API client
├── App.tsx             # Main application component
├── package.json        # Project dependencies and scripts
└── README.md           # Project documentation
```

## Authentication

The app uses JWT token authentication, stored securely using Expo SecureStore. The token is automatically included in API requests and refreshed when needed.

## Data Flow

1. User logs in with credentials
2. App fetches user data and displays the appropriate screens based on user role
3. Daily check-ins and other data are synchronized with the backend
4. Alerts and notifications are triggered based on business rules (e.g., high pain levels, missed exercises)

## Contributing

Please follow the project's coding standards and submit pull requests for any new features or bug fixes.

## License

This project is proprietary and confidential.
