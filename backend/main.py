from fastapi import FastAPI, HTTPException, Depends, status, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from pymongo import MongoClient
from datetime import datetime, timedelta, date, time, timezone
from typing import Optional, List
import jwt
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr, Field
from bson import ObjectId
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = FastAPI(title="ATSPAM - Automated Token System for Principal's Appointment Management")

# CORS middleware - Updated configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],  # React dev server
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# Security
SECRET_KEY = os.getenv("SECRET_KEY", "rajagirischoolofengineeringandtechnology")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT token security
security = HTTPBearer()

# MongoDB connection
client = MongoClient("mongodb://localhost:27017/")
db = client["atspam_db"]
users_collection = db["users"]
appointments_collection = db["appointments"]
time_slots_collection = db["time_slots"]
notifications_collection = db["notifications"]

# Pydantic models
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: str
    phone: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: str
    phone: Optional[str] = None
    is_active: bool
    created_at: datetime

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

class TimeSlotCreate(BaseModel):
    start_time: datetime
    end_time: datetime
    is_available: bool = True

class TimeSlotResponse(BaseModel):
    id: str
    start_time: datetime
    end_time: datetime
    booked_count: int = 0

class AppointmentCreate(BaseModel):
    time_slot_id: str
    purpose: str

class AppointmentResponse(BaseModel):
    id: str
    user_id: str
    time_slot_id: str
    purpose: str
    token_number: Optional[int] = None
    status: str # pending, booked, active, completed, cancelled, rejected
    booked_at: datetime
    user_details: Optional[UserResponse] = None
    time_slot_details: Optional[TimeSlotResponse] = None

class UserStatusUpdate(BaseModel):
    is_active: bool

class UserRoleUpdate(BaseModel):
    role: str

class UserUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None

class PasswordUpdate(BaseModel):
    current_password: str
    new_password: str

class AdminStats(BaseModel):
    pending_appointments: int
    users_by_role: dict
    appointments_today: int
    total_users: int

class NotificationResponse(BaseModel):
    id: str
    user_id: str
    message: str
    is_read: bool
    created_at: datetime
    link: Optional[str] = None

# Helper functions
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        return email
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

def get_current_user(email: str = Depends(verify_token)):
    user = users_collection.find_one({"email": email})
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return user

def get_current_active_user(current_user: dict = Depends(get_current_user)):
    if not current_user.get("is_active"):
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

# Routes
@app.get("/")
async def root():
    return {"message": "ATSPAM API - Automated Token System for Principal's Appointment Management"}

@app.get("/test")
async def test():
    return {"message": "Backend is working!", "status": "success"}

@app.post("/register", response_model=UserResponse)
async def register(user_data: UserCreate):
    # Check if user already exists
    existing_user = users_collection.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Validate role
    valid_roles = ["faculty", "student", "principal", "admin"]
    if user_data.role.lower() not in valid_roles:
        raise HTTPException(status_code=400, detail="Invalid role")
    
    # Create user document
    user_doc = {
        "email": user_data.email.lower(),
        "password": get_password_hash(user_data.password),
        "name": user_data.name,
        "role": user_data.role.lower(),
        "phone": user_data.phone,
        "is_active": True,
        "created_at": datetime.utcnow()
    }
    
    # Insert user
    result = users_collection.insert_one(user_doc)
    user_doc["id"] = str(result.inserted_id)
    
    return UserResponse(**user_doc)

@app.post("/login", response_model=Token)
async def login(user_credentials: UserLogin):
    # Find user
    user = users_collection.find_one({"email": user_credentials.email.lower()})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Verify password
    if not verify_password(user_credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Check if user is active
    if not user.get("is_active", True):
        raise HTTPException(status_code=401, detail="Account is deactivated")
    
    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user["email"]}, expires_delta=access_token_expires
    )
    
    # Prepare user response
    user_response = UserResponse(
        id=str(user["_id"]),
        email=user["email"],
        name=user["name"],
        role=user["role"],
        phone=user.get("phone"),
        is_active=user.get("is_active", True),
        created_at=user["created_at"]
    )
    
    return Token(access_token=access_token, token_type="bearer", user=user_response)

@app.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    return UserResponse(
        id=str(current_user["_id"]),
        email=current_user["email"],
        name=current_user["name"],
        role=current_user["role"],
        phone=current_user.get("phone"),
        is_active=current_user.get("is_active", True),
        created_at=current_user["created_at"]
    )

# =================================================================
# User Profile Management
# =================================================================

@app.put("/me/details", response_model=UserResponse)
async def update_current_user_info(user_update: UserUpdate, current_user: dict = Depends(get_current_active_user)):
    update_data = {k: v for k, v in user_update.model_dump().items() if v is not None}

    if not update_data:
        raise HTTPException(status_code=400, detail="No update data provided")

    users_collection.update_one({"_id": current_user["_id"]}, {"$set": update_data})

    updated_user = users_collection.find_one({"_id": current_user["_id"]})
    if not updated_user:
         raise HTTPException(status_code=404, detail="User not found after update")

    return UserResponse(
        id=str(updated_user["_id"]),
        email=updated_user["email"],
        name=updated_user["name"],
        role=updated_user["role"],
        phone=updated_user.get("phone"),
        is_active=updated_user.get("is_active", True),
        created_at=updated_user["created_at"]
    )

@app.put("/me/password")
async def update_current_user_password(password_update: PasswordUpdate, current_user: dict = Depends(get_current_active_user)):
    # Verify current password
    if not verify_password(password_update.current_password, current_user["password"]):
        raise HTTPException(status_code=400, detail="Incorrect current password")

    # Hash new password
    hashed_password = get_password_hash(password_update.new_password)
    
    # Update password in the database
    users_collection.update_one({"_id": current_user["_id"]}, {"$set": {"password": hashed_password}})
    
    return {"message": "Password updated successfully"}

# =================================================================
# Admin User Management
# =================================================================

@app.get("/admin/users", response_model=List[UserResponse])
async def get_all_users(current_user: dict = Depends(get_current_active_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    all_users = []
    for user in users_collection.find({}):
        all_users.append(UserResponse(
            id=str(user["_id"]),
            email=user["email"],
            name=user["name"],
            role=user["role"],
            phone=user.get("phone"),
            is_active=user.get("is_active", True),
            created_at=user["created_at"]
        ))
    return all_users

@app.put("/admin/users/{user_id}/status", response_model=UserResponse)
async def update_user_status(user_id: str, status_update: UserStatusUpdate, current_user: dict = Depends(get_current_active_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    user_oid = ObjectId(user_id)
    target_user = users_collection.find_one({"_id": user_oid})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
        
    users_collection.update_one({"_id": user_oid}, {"$set": {"is_active": status_update.is_active}})
    
    updated_user = users_collection.find_one({"_id": user_oid})
    if not updated_user:
        raise HTTPException(status_code=404, detail="User not found after update")

    return UserResponse(
        id=str(updated_user["_id"]),
        email=updated_user["email"],
        name=updated_user["name"],
        role=updated_user["role"],
        phone=updated_user.get("phone"),
        is_active=updated_user.get("is_active", True),
        created_at=updated_user["created_at"]
    )

@app.put("/admin/users/{user_id}/role", response_model=UserResponse)
async def update_user_role(user_id: str, role_update: UserRoleUpdate, current_user: dict = Depends(get_current_active_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")

    valid_roles = ["faculty", "student", "principal", "admin"]
    if role_update.role.lower() not in valid_roles:
        raise HTTPException(status_code=400, detail="Invalid role specified")
        
    user_oid = ObjectId(user_id)
    target_user = users_collection.find_one({"_id": user_oid})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
        
    users_collection.update_one({"_id": user_oid}, {"$set": {"role": role_update.role.lower()}})

    updated_user = users_collection.find_one({"_id": user_oid})
    if not updated_user:
        raise HTTPException(status_code=404, detail="User not found after update")
        
    return UserResponse(
        id=str(updated_user["_id"]),
        email=updated_user["email"],
        name=updated_user["name"],
        role=updated_user["role"],
        phone=updated_user.get("phone"),
        is_active=updated_user.get("is_active", True),
        created_at=updated_user["created_at"]
    )

@app.get("/admin/overview-stats", response_model=AdminStats)
async def get_admin_overview_stats(current_user: dict = Depends(get_current_active_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
        
    # Pending appointments
    pending_appointments = appointments_collection.count_documents({"status": "pending"})
    
    # Users by role
    pipeline = [
        {"$group": {"_id": "$role", "count": {"$sum": 1}}}
    ]
    users_by_role_cursor = users_collection.aggregate(pipeline)
    users_by_role = {item["_id"]: item["count"] for item in users_by_role_cursor}
    
    # Appointments today
    today = date.today()
    start_of_day = datetime.combine(today, time.min)
    end_of_day = datetime.combine(today, time.max)
    todays_slots_cursor = time_slots_collection.find({"start_time": {"$gte": start_of_day, "$lt": end_of_day}})
    todays_slot_ids = [str(slot["_id"]) for slot in todays_slots_cursor]
    appointments_today = appointments_collection.count_documents({
        "time_slot_id": {"$in": todays_slot_ids},
        "status": {"$in": ["booked", "active"]}
    })
    
    # Total users
    total_users = users_collection.count_documents({})
    
    return AdminStats(
        pending_appointments=pending_appointments,
        users_by_role=users_by_role,
        appointments_today=appointments_today,
        total_users=total_users
    )

# =================================================================
# Schedule Management Routes (For Principal/Admin)
# =================================================================

@app.post("/schedule/time-slots", status_code=status.HTTP_201_CREATED, response_model=TimeSlotResponse)
async def create_time_slot(time_slot_data: TimeSlotCreate, current_user: dict = Depends(get_current_active_user)):
    if current_user["role"] not in ["principal", "admin"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    time_slot_doc = time_slot_data.model_dump()
    result = time_slots_collection.insert_one(time_slot_doc)
    created_slot = time_slots_collection.find_one({"_id": result.inserted_id})
    created_slot["id"] = str(created_slot.pop("_id"))
    return TimeSlotResponse(**created_slot)

@app.get("/schedule/time-slots", response_model=List[TimeSlotResponse])
async def get_time_slots(day: date = Query(..., description="Get time slots for a specific day")):
    start_of_day = datetime.combine(day, time.min)
    end_of_day = datetime.combine(day, time.max)
    slots_cursor = time_slots_collection.find({"start_time": {"$gte": start_of_day, "$lt": end_of_day}}).sort("start_time", 1)
    slots = []
    for slot in slots_cursor:
        slot["id"] = str(slot.pop("_id"))
        slot["booked_count"] = appointments_collection.count_documents({"time_slot_id": slot["id"], "status": "booked"})
        slots.append(TimeSlotResponse(**slot))
    return slots

# =================================================================
# Appointment Booking Routes (For Faculty/Students)
# =================================================================

@app.post("/appointments/book", status_code=status.HTTP_201_CREATED, response_model=AppointmentResponse)
async def book_appointment(appointment_data: AppointmentCreate, current_user: dict = Depends(get_current_active_user)):
    # Check if time slot exists
    time_slot_id_obj = ObjectId(appointment_data.time_slot_id)
    time_slot = time_slots_collection.find_one({"_id": time_slot_id_obj})
    if not time_slot:
        raise HTTPException(status_code=404, detail="Time slot not found")

    # Create appointment document
    appointment_doc = {
        "user_id": str(current_user["_id"]),
        "time_slot_id": appointment_data.time_slot_id,
        "purpose": appointment_data.purpose,
        "status": "pending",  # Appointments now start as pending
        "token_number": None, # Token is assigned upon approval
        "booked_at": datetime.utcnow()
    }
    
    # Insert appointment
    result = appointments_collection.insert_one(appointment_doc)
    
    # Prepare and return response
    created_appointment = appointments_collection.find_one({"_id": result.inserted_id})
    created_appointment["id"] = str(created_appointment.pop("_id"))
    
    return AppointmentResponse(**created_appointment)

@app.get("/appointments/my-appointments", response_model=List[AppointmentResponse])
async def get_my_appointments(current_user: dict = Depends(get_current_active_user)):
    user_id = str(current_user["_id"])
    appointments_cursor = appointments_collection.find({"user_id": user_id}).sort("booked_at", -1)
    
    appointments = []
    for app in appointments_cursor:
        app["id"] = str(app.pop("_id"))
        
        # Fetch associated time slot details
        time_slot = time_slots_collection.find_one({"_id": ObjectId(app["time_slot_id"])})
        if time_slot:
            time_slot["id"] = str(time_slot.pop("_id"))
            # Temp fix for booked_count, ideally we should have a proper model mapping
            time_slot["booked_count"] = appointments_collection.count_documents({"time_slot_id": app["time_slot_id"], "status": "booked"})
            app["time_slot_details"] = TimeSlotResponse(**time_slot)
        
        appointments.append(AppointmentResponse(**app))
        
    return appointments

@app.get("/appointments/pending", response_model=List[AppointmentResponse])
async def get_pending_appointments(current_user: dict = Depends(get_current_active_user)):
    if current_user["role"] not in ["principal", "admin"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    pending_cursor = appointments_collection.find({"status": "pending"}).sort("booked_at", 1)
    
    appointments = []
    for app in pending_cursor:
        app["id"] = str(app.pop("_id"))

        # Fetch user details
        user = users_collection.find_one({"_id": ObjectId(app["user_id"])})
        if user:
            app["user_details"] = UserResponse(
                id=str(user["_id"]),
                email=user["email"],
                name=user["name"],
                role=user["role"],
                phone=user.get("phone"),
                is_active=user.get("is_active", True),
                created_at=user["created_at"]
            )
        
        # Fetch time slot details
        time_slot = time_slots_collection.find_one({"_id": ObjectId(app["time_slot_id"])})
        if time_slot:
            time_slot["id"] = str(time_slot.pop("_id"))
            time_slot["booked_count"] = appointments_collection.count_documents({"time_slot_id": app["time_slot_id"], "status": "booked"})
            app["time_slot_details"] = TimeSlotResponse(**time_slot)

        appointments.append(AppointmentResponse(**app))
        
    return appointments

class AppointmentReview(BaseModel):
    action: str # "approve" or "reject"

@app.put("/appointments/{appointment_id}/review", response_model=AppointmentResponse)
async def review_appointment(appointment_id: str, review_data: AppointmentReview, current_user: dict = Depends(get_current_active_user)):
    if current_user["role"] not in ["principal", "admin"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    appointment_oid = ObjectId(appointment_id)
    appointment = appointments_collection.find_one({"_id": appointment_oid})

    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")

    if appointment["status"] != "pending":
        raise HTTPException(status_code=400, detail=f"Cannot review an appointment with status '{appointment['status']}'")

    action = review_data.action.lower()
    updated_fields = {}

    if action == "approve":
        updated_fields["status"] = "booked"
        
        # Get the date of the appointment from its time slot
        time_slot = time_slots_collection.find_one({"_id": ObjectId(appointment["time_slot_id"])})
        appointment_date = time_slot["start_time"].date()
        
        # Determine the next token number for that day
        start_of_day = datetime.combine(appointment_date, time.min)
        end_of_day = datetime.combine(appointment_date, time.max)
        
        # Find appointments on the same day that are already booked to assign the next token
        booked_appointments_today = appointments_collection.count_documents({
            "status": "booked",
            "time_slot_id": {
                "$in": [str(slot["_id"]) for slot in time_slots_collection.find({
                    "start_time": {"$gte": start_of_day, "$lt": end_of_day}
                })]
            }
        })
        updated_fields["token_number"] = booked_appointments_today + 1

    elif action == "reject":
        updated_fields["status"] = "rejected"
    else:
        raise HTTPException(status_code=400, detail="Invalid action. Must be 'approve' or 'reject'.")

    appointments_collection.update_one({"_id": appointment_oid}, {"$set": updated_fields})
    
    # --- Create Notification ---
    time_slot = time_slots_collection.find_one({"_id": ObjectId(appointment["time_slot_id"])})
    if time_slot:
        appointment_time = time_slot['start_time'].strftime('%I:%M %p on %b %d, %Y')
        if action == "approve":
            message = f"Your appointment for {appointment_time} has been approved. Your token is #{updated_fields['token_number']}."
        else: # reject
            message = f"Your appointment request for {appointment_time} has been rejected."
        
        notification_doc = {
            "user_id": appointment["user_id"],
            "message": message,
            "is_read": False,
            "created_at": datetime.utcnow(),
            "link": "/my-appointments" 
        }
        notifications_collection.insert_one(notification_doc)
    # -------------------------

    updated_appointment = appointments_collection.find_one({"_id": appointment_oid})
    if not updated_appointment:
        raise HTTPException(status_code=404, detail="Appointment not found after update")
        
    updated_appointment["id"] = str(updated_appointment.pop("_id"))
    return AppointmentResponse(**updated_appointment)

# =================================================================
# Queue Management Routes (For Principal/Admin)
# =================================================================

@app.get("/queue/today", response_model=List[AppointmentResponse])
async def get_todays_queue(current_user: dict = Depends(get_current_active_user)):
    if current_user["role"] not in ["principal", "admin"]:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    today = date.today()
    start_of_day = datetime.combine(today, time.min)
    end_of_day = datetime.combine(today, time.max)
    
    # Find all time slots for today
    todays_slots_cursor = time_slots_collection.find({"start_time": {"$gte": start_of_day, "$lt": end_of_day}})
    todays_slot_ids = [str(slot["_id"]) for slot in todays_slots_cursor]
    
    # Find all appointments in those time slots that are approved ('booked') or currently active
    queue_cursor = appointments_collection.find({
        "time_slot_id": {"$in": todays_slot_ids},
        "status": {"$in": ["booked", "active"]}
    }).sort("token_number", 1) # Sort by token number
    
    queue = []
    for app in queue_cursor:
        app["id"] = str(app.pop("_id"))
        
        user = users_collection.find_one({"_id": ObjectId(app["user_id"])})
        if user:
            app["user_details"] = UserResponse(
                id=str(user["_id"]), email=user["email"], name=user["name"], 
                role=user["role"], phone=user.get("phone"), is_active=user.get("is_active", True),
                created_at=user["created_at"]
            )
        
        time_slot = time_slots_collection.find_one({"_id": ObjectId(app["time_slot_id"])})
        if time_slot:
            time_slot["id"] = str(time_slot.pop("_id"))
            time_slot["booked_count"] = 1 # Not relevant here, but model requires it
            app["time_slot_details"] = TimeSlotResponse(**time_slot)
            
        queue.append(AppointmentResponse(**app))
        
    return queue

@app.put("/appointments/{appointment_id}/status", response_model=AppointmentResponse)
async def update_appointment_status(appointment_id: str, status: str = Query(..., enum=["active", "completed", "cancelled"]), current_user: dict = Depends(get_current_active_user)):
    appt_obj_id = ObjectId(appointment_id)
    appointment = appointments_collection.find_one({"_id": appt_obj_id})

    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")

    if current_user["role"] not in ["principal", "admin"]:
        if appointment['user_id'] != str(current_user['_id']) or status != 'cancelled':
             raise HTTPException(status_code=403, detail="Not authorized to perform this action")

    appointments_collection.update_one({"_id": appt_obj_id}, {"$set": {"status": status}})
    
    # If a 'booked' appointment is 'cancelled' by a user, notify the principal
    if status == "cancelled" and appointment.get("status") == "booked":
        # Also make the time slot available again
        time_slot_id = ObjectId(appointment["time_slot_id"])
        time_slots_collection.update_one({"_id": time_slot_id}, {"$set": {"is_available": True}})

        # Find the user who cancelled
        cancelling_user = users_collection.find_one({"_id": ObjectId(appointment["user_id"])})
        cancelling_user_name = cancelling_user["name"] if cancelling_user else "A user"

        # Find the time slot to include in the message
        time_slot = time_slots_collection.find_one({"_id": ObjectId(appointment["time_slot_id"])})
        appointment_time = ""
        if time_slot:
            appointment_time = time_slot['start_time'].strftime('%I:%M %p on %b %d, %Y')
        
        # Find all principals
        principals = users_collection.find({"role": "principal"})
        for principal in principals:
            notification_doc = {
                "user_id": str(principal["_id"]),
                "message": f"{cancelling_user_name} has cancelled their appointment for {appointment_time}.",
                "is_read": False,
                "created_at": datetime.utcnow(),
                "link": "/queue" # Or wherever the principal views their schedule
            }
            notifications_collection.insert_one(notification_doc)

    updated_appointment = appointments_collection.find_one({"_id": appt_obj_id})
    if updated_appointment:
        updated_appointment["id"] = str(updated_appointment.pop("_id"))
        return AppointmentResponse(**updated_appointment)
    raise HTTPException(status_code=404, detail="Appointment not found after update")

# =================================================================
# Notification Routes
# =================================================================

@app.get("/notifications", response_model=List[NotificationResponse])
async def get_notifications(current_user: dict = Depends(get_current_active_user)):
    user_id = str(current_user["_id"])
    notifications_cursor = notifications_collection.find({"user_id": user_id}).sort("created_at", -1)
    
    notifications = []
    for notif in notifications_cursor:
        notif["id"] = str(notif.pop("_id"))
        notifications.append(NotificationResponse(**notif))
        
    return notifications

@app.put("/notifications/read-all", status_code=status.HTTP_204_NO_CONTENT)
async def mark_all_notifications_as_read(current_user: dict = Depends(get_current_active_user)):
    user_id = str(current_user["_id"])
    notifications_collection.update_many(
        {"user_id": user_id, "is_read": False},
        {"$set": {"is_read": True}}
    )
    return

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 