# ATSPAM - Automated Token System for Principal's Appointment Management

A full-stack web application that allows faculty, staff, and students to book appointments with the college principal using a token-based system.

## 🚀 Quick Start

### Prerequisites
- Python 3.8+
- Node.js 16+
- MongoDB (running on localhost:27017)

### Backend Setup
```bash
cd backend
pip install -r requirements.txt
python main.py
```

The backend API will be available at: http://localhost:8000

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

The frontend application will be available at: http://localhost:5173

## 📋 Features

### ✅ Implemented
- **User Authentication**
  - Registration with role selection (Faculty, Student, Principal, Admin)
  - Login with JWT token authentication
  - Persistent login state
  - Logout functionality

- **User Dashboard**
  - Role-based dashboard with different quick actions
  - User information display
  - Coming soon features preview

### 🚧 Coming Soon
- Token booking system
- Real-time queue updates
- Appointment scheduling
- Analytics and reports
- Notification system

## 🏗️ Architecture

### Backend (FastAPI)
- **Framework**: FastAPI
- **Database**: MongoDB
- **Authentication**: JWT tokens
- **Password Hashing**: bcrypt

### Frontend (React)
- **Framework**: React 19 + Vite
- **HTTP Client**: Axios
- **Styling**: CSS with modern design

## 📁 Project Structure

```
ATSPAM/
├── backend/
│   ├── main.py              # FastAPI application
│   ├── requirements.txt     # Python dependencies
│   └── README.md           # Backend setup instructions
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   └── Dashboard.jsx
│   │   ├── App.jsx
│   │   └── App.css
│   ├── package.json
│   └── README.md
└── README.md               # This file
```

## 🔧 API Endpoints

### Authentication
- `POST /register` - User registration
- `POST /login` - User login
- `GET /me` - Get current user info (protected)

### Example Usage

#### Register a new user
```bash
curl -X POST "http://localhost:8000/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "faculty@college.edu",
    "password": "password123",
    "name": "John Doe",
    "role": "faculty",
    "phone": "+1234567890"
  }'
```

#### Login
```bash
curl -X POST "http://localhost:8000/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "faculty@college.edu",
    "password": "password123"
  }'
```

## 🎨 UI Features

- Modern, responsive design
- Role-based interface
- Smooth animations and transitions
- Mobile-friendly layout
- Clean and intuitive user experience

## 🔒 Security

- JWT token-based authentication
- Password hashing with bcrypt
- CORS configuration
- Input validation
- Error handling

## 📝 Environment Variables

Create a `.env` file in the backend directory:
```
SECRET_KEY=your-super-secret-key-change-this-in-production
MONGODB_URL=mongodb://localhost:27017/
DATABASE_NAME=atspam_db
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License. 