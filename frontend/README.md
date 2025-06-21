# ATSPAM Frontend

Automated Token System for Principal's Appointment Management - Frontend Application

## Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Development Server
```bash
npm run dev
```

The application will be available at: http://localhost:5173

## Features

### Authentication
- User registration with role selection (Faculty, Student, Principal, Admin)
- User login with JWT token authentication
- Persistent login state
- Logout functionality

### Dashboard
- Role-based dashboard with different quick actions
- User information display
- Coming soon features preview

## Project Structure

```
src/
├── components/
│   ├── Login.jsx          # Login form component
│   ├── Register.jsx       # Registration form component
│   └── Dashboard.jsx      # Main dashboard component
├── App.jsx                # Main application component
├── App.css               # Application styles
└── main.jsx              # Application entry point
```

## API Integration

The frontend communicates with the backend API at `http://localhost:8000`:

- `POST /register` - User registration
- `POST /login` - User login
- `GET /me` - Get current user info (protected)

## Technologies Used

- React 19
- Vite
- Axios for API calls
- CSS for styling
