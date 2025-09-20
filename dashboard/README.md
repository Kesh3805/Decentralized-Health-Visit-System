# Health Visit Admin Dashboard

This is the admin dashboard for the Decentralized Health Visit Verification System. It provides an interface for administrators to monitor and manage:

- Visit logs and verification status
- Community Health Workers (CHWs)
- Analytics and reporting
- Fraud detection alerts

## Features

- **Dashboard Overview**: Key metrics and recent activity
- **Visit Management**: View and verify health visits
- **CHW Management**: Register and monitor community health workers
- **Analytics**: Visualizations of visit trends, feedback, and performance
- **Fraud Detection**: Monitor and resolve fraud alerts

## Tech Stack

- React.js
- Material-UI (MUI)
- Chart.js with react-chartjs-2
- Mapbox GL JS with react-map-gl

## Getting Started

1. Install dependencies:
   ```
   npm install
   ```

2. Start the development server:
   ```
   npm start
   ```

3. Build for production:
   ```
   npm run build
   ```

## Folder Structure

```
src/
├── components/
│   ├── Dashboard.js
│   ├── Visits.js
│   ├── CHWs.js
│   ├── Analytics.js
│   ├── FraudDetection.js
│   └── Navigation.js
├── App.js
├── App.css
├── index.js
├── index.css
└── reportWebVitals.js
```

## Components

### Dashboard
Main overview page showing key metrics and recent activity.

### Visits
Table view of all health visits with filtering and search capabilities.

### CHWs
Management interface for community health workers with registration functionality.

### Analytics
Data visualization components for visits, feedback, and performance metrics.

### FraudDetection
Interface for monitoring and resolving fraud alerts.

### Navigation
Responsive navigation component with drawer and app bar.
