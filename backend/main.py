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
    if current_user["role"] not in ["faculty", "student"]:
        raise HTTPException(status_code=403, detail="Only faculty and students can book appointments")

    time_slot_id = ObjectId(appointment_data.time_slot_id)
    time_slot = time_slots_collection.find_one({"_id": time_slot_id})

    if not time_slot:
        raise HTTPException(status_code=404, detail="Time slot not found")

    appointment_doc = {
        "user_id": str(current_user["_id"]),
        "time_slot_id": appointment_data.time_slot_id,
        "purpose": appointment_data.purpose,
        "token_number": None,
        "status": "pending",
        "booked_at": datetime.now(timezone.utc)
    }

    result = appointments_collection.insert_one(appointment_doc)
    created_appointment = appointments_collection.find_one({"_id": result.inserted_id})
    created_appointment["id"] = str(created_appointment.pop("_id"))
    
    return AppointmentResponse(**created_appointment)

@app.get("/appointments/my-appointments", response_model=List[AppointmentResponse])
async def get_my_appointments(current_user: dict = Depends(get_current_active_user)):
    appointments_cursor = appointments_collection.find({"user_id": str(current_user["_id"])}).sort("booked_at", -1)
    appointments = []
    for appt in appointments_cursor:
        appt["id"] = str(appt.pop("_id"))
        time_slot = time_slots_collection.find_one({"_id": ObjectId(appt["time_slot_id"])})
        if time_slot:
            time_slot["id"] = str(time_slot.pop("_id"))
            time_slot["booked_count"] = appointments_collection.count_documents({"time_slot_id": time_slot["id"], "status": "booked"})
            appt["time_slot_details"] = TimeSlotResponse(**time_slot)
        appointments.append(AppointmentResponse(**appt))
    return appointments

# =================================================================
# Appointment Approval Routes (For Principal/Admin)
# =================================================================

@app.get("/appointments/pending", response_model=List[AppointmentResponse])
async def get_pending_appointments(current_user: dict = Depends(get_current_active_user)):
    if current_user["role"] not in ["principal", "admin"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    pending_cursor = appointments_collection.find({"status": "pending"})
    appointments = []
    for appt in pending_cursor:
        appt["id"] = str(appt.pop("_id"))
        user = users_collection.find_one({"_id": ObjectId(appt["user_id"])})
        if user:
            user["id"] = str(user.pop("_id"))
            appt["user_details"] = UserResponse(**user)
        time_slot = time_slots_collection.find_one({"_id": ObjectId(appt["time_slot_id"])})
        if time_slot:
            time_slot["id"] = str(time_slot.pop("_id"))
            time_slot["booked_count"] = appointments_collection.count_documents({"time_slot_id": time_slot["id"], "status": "booked"})
            appt["time_slot_details"] = TimeSlotResponse(**time_slot)
        appointments.append(AppointmentResponse(**appt))
    return appointments

class AppointmentReview(BaseModel):
    action: str # "approve" or "reject"

@app.put("/appointments/{appointment_id}/review", response_model=AppointmentResponse)
async def review_appointment(appointment_id: str, review_data: AppointmentReview, current_user: dict = Depends(get_current_active_user)):
    if current_user["role"] not in ["principal", "admin"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    appt_obj_id = ObjectId(appointment_id)
    appointment = appointments_collection.find_one({"_id": appt_obj_id})
    if not appointment or appointment["status"] != "pending":
        raise HTTPException(status_code=404, detail="Pending appointment not found")

    if review_data.action == "approve":
        # Generate token number for the day
        today_start = datetime.combine(datetime.today().date(), time.min)
        token_count = appointments_collection.count_documents({"booked_at": {"$gte": today_start}, "status": "booked"})
        new_token = token_count + 1
        
        update_data = {"status": "booked", "token_number": new_token}
    elif review_data.action == "reject":
        update_data = {"status": "rejected"}
    else:
        raise HTTPException(status_code=400, detail="Invalid action")

    appointments_collection.update_one({"_id": appt_obj_id}, {"$set": update_data})
    
    updated_appointment = appointments_collection.find_one({"_id": appt_obj_id})
    if updated_appointment:
        updated_appointment["id"] = str(updated_appointment.pop("_id"))
        return AppointmentResponse(**updated_appointment)
    raise HTTPException(status_code=404, detail="Appointment not found after update")

# =================================================================
# Queue Management Routes (For Principal/Admin)
# =================================================================

@app.get("/queue/today", response_model=List[AppointmentResponse])
async def get_todays_queue(current_user: dict = Depends(get_current_active_user)):
    if current_user["role"] not in ["principal", "admin"]:
        raise HTTPException(status_code=403, detail="Not authorized to view the queue")

    today_start = datetime.combine(datetime.today().date(), datetime.min.time())
    today_end = datetime.combine(datetime.today().date(), datetime.max.time())

    queue_cursor = appointments_collection.find({
        "booked_at": {"$gte": today_start, "$lt": today_end},
        "status": {"$in": ["booked", "active"]}
    })

    queue = []
    for appt in queue_cursor:
        appt["id"] = str(appt.pop("_id"))
        user = users_collection.find_one({"_id": ObjectId(appt["user_id"])})
        if user:
            user["id"] = str(user.pop("_id"))
            appt["user_details"] = UserResponse(**user)
        time_slot = time_slots_collection.find_one({"_id": ObjectId(appt["time_slot_id"])})
        if time_slot:
            time_slot["id"] = str(time_slot.pop("_id"))
            time_slot["booked_count"] = appointments_collection.count_documents({"time_slot_id": time_slot["id"], "status": "booked"})
            appt["time_slot_details"] = TimeSlotResponse(**time_slot)
        queue.append(AppointmentResponse(**appt))
    
    # Sort queue by time slot start time (chronological order)
    queue.sort(key=lambda x: x.time_slot_details.start_time if x.time_slot_details else datetime.max)
        
    return queue

@app.put("/appointments/{appointment_id}/status", response_model=AppointmentResponse)
async def update_appointment_status(appointment_id: str, status: str = Query(..., enum=["active", "completed", "cancelled"]), current_user: dict = Depends(get_current_active_user)):
    if current_user["role"] not in ["principal", "admin"]:
        raise HTTPException(status_code=403, detail="Not authorized to update appointments")

    appt_obj_id = ObjectId(appointment_id)
    appointment = appointments_collection.find_one({"_id": appt_obj_id})

    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")

    appointments_collection.update_one({"_id": appt_obj_id}, {"$set": {"status": status}})
    
    # If cancelled, make the time slot available again
    if status == "cancelled":
        time_slot_id = ObjectId(appointment["time_slot_id"])
        time_slots_collection.update_one({"_id": time_slot_id}, {"$set": {"is_available": True}})

    updated_appointment = appointments_collection.find_one({"_id": appt_obj_id})
    if updated_appointment:
        updated_appointment["id"] = str(updated_appointment.pop("_id"))
        return AppointmentResponse(**updated_appointment)
    raise HTTPException(status_code=404, detail="Appointment not found after update")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 