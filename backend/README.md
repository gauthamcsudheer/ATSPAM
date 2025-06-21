# ATSPAM Backend

Automated Token System for Principal's Appointment Management - Backend API

## Setup Instructions

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Environment Variables
Create a `.env` file in the backend directory with:
```
SECRET_KEY=your-super-secret-key-change-this-in-production
MONGODB_URL=mongodb://localhost:27017/
DATABASE_NAME=atspam_db
```

### 3. MongoDB Setup
Make sure MongoDB is running on localhost:27017

### 4. Run the Server
```bash
python main.py
```

The API will be available at: http://localhost:8000

### 5. API Documentation
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## API Endpoints

### Test
- `GET /test` - Test endpoint to verify backend is working

### Authentication
- `POST /register` - User registration
- `POST /login` - User login
- `GET /me` - Get current user info (protected)

### Schedule Management (Principal/Admin Only)
- `POST /schedule/time-slots` - Create new time slots
- `GET /schedule/time-slots?day=YYYY-MM-DD` - Get available time slots for a specific day

### Appointment Booking (Faculty/Students Only)
- `POST /appointments/book` - Book an appointment
- `GET /appointments/my-appointments` - Get user's appointments

### Queue Management (Principal/Admin Only)
- `GET /queue/today` - Get today's appointment queue
- `PUT /appointments/{id}/status?status=active|completed|cancelled` - Update appointment status

### Request Examples

#### Register
```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe",
  "role": "faculty",
  "phone": "+1234567890"
}
```

#### Login
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

#### Create Time Slot (Principal/Admin)
```json
{
  "start_time": "2024-01-15T09:00:00Z",
  "end_time": "2024-01-15T10:00:00Z",
  "is_available": true
}
```

#### Book Appointment (Faculty/Student)
```json
{
  "time_slot_id": "507f1f77bcf86cd799439011",
  "purpose": "Discuss academic progress and future plans"
}
```

#### Update Appointment Status (Principal/Admin)
```
PUT /appointments/507f1f77bcf86cd799439011/status?status=active
```

## Database Collections

### users
- `_id`: ObjectId
- `email`: String (unique)
- `password`: String (hashed)
- `name`: String
- `role`: String (faculty, student, principal, admin)
- `phone`: String (optional)
- `is_active`: Boolean
- `created_at`: DateTime

### time_slots
- `_id`: ObjectId
- `start_time`: DateTime
- `end_time`: DateTime
- `is_available`: Boolean

### appointments
- `_id`: ObjectId
- `user_id`: String (reference to users._id)
- `time_slot_id`: String (reference to time_slots._id)
- `purpose`: String
- `token_number`: Integer
- `status`: String (booked, active, completed, cancelled)
- `booked_at`: DateTime

## Role-Based Access Control

### Faculty/Students
- Can view available time slots
- Can book appointments
- Can view their own appointments

### Principal/Admin
- Can create time slots
- Can view today's queue
- Can update appointment statuses
- Can view all appointments

## Troubleshooting

### CORS Issues
If you encounter CORS errors, make sure:
1. The backend is running on port 8000
2. The frontend is running on port 5173
3. Both localhost and 127.0.0.1 are allowed in CORS configuration

### JWT Issues
If you get JWT-related errors:
1. Make sure PyJWT is installed: `pip install PyJWT`
2. Check that the SECRET_KEY is set in your .env file

### MongoDB Issues
If MongoDB connection fails:
1. Ensure MongoDB is running: `mongod`
2. Check if MongoDB is accessible on localhost:27017
3. Verify the database name in the connection string

### Appointment Booking Issues
If appointment booking fails:
1. Ensure time slots exist for the selected date
2. Check that the time slot is available (not already booked)
3. Verify user has faculty or student role 