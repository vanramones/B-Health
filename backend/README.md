# B-Health Backend API

Express.js + MySQL backend for the Barangay Health Management System.

## Setup

### Prerequisites
- Node.js 18+
- MySQL (via XAMPP or standalone)

### 1. Install dependencies
```bash
cd backend
npm install
```

### 2. Configure environment
Edit `.env` with your MySQL credentials:
```
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=b_health_db
JWT_SECRET=your_secret_key
```

### 3. Create database & tables
```bash
# Using XAMPP MySQL:
C:\xampp\mysql\bin\mysql.exe -u root < config/schema.sql

# Or via any MySQL client:
mysql -u root -p < config/schema.sql
```

### 4. Seed initial data
```bash
npm run seed
```

### 5. Start the server
```bash
npm run dev    # development (auto-restart with nodemon)
npm start      # production
```

Server runs at `http://localhost:5000`

## API Endpoints

All endpoints (except login) require `Authorization: Bearer <token>` header.

### Auth
| Method | Endpoint                      | Description            |
|--------|-------------------------------|------------------------|
| POST   | `/api/auth/login`             | Login, returns JWT     |
| GET    | `/api/auth/me`                | Get current admin info |
| GET    | `/api/auth/admins`            | List all admins        |
| POST   | `/api/auth/admins`            | Create admin           |
| PUT    | `/api/auth/admins/:id`        | Update admin           |
| DELETE | `/api/auth/admins/:id`        | Delete admin           |
| PATCH  | `/api/auth/admins/:id/toggle` | Toggle active status   |

### CRUD Resources
Each resource supports: `GET /`, `GET /count`, `GET /:id`, `POST /`, `PUT /:id`, `DELETE /:id`

| Base Path                  | Resource            |
|----------------------------|---------------------|
| `/api/residents`           | Residents           |
| `/api/appointments`        | Appointments        |
| `/api/health-records`      | Health Records      |
| `/api/vaccinations`        | Vaccinations        |
| `/api/services`            | Services            |
| `/api/announcements`       | Announcements       |
| `/api/emergency-contacts`  | Emergency Contacts  |
| `/api/notifications`       | Notifications       |

### Query Parameters (GET /)
- `search` — search across text columns
- `status` — filter by status
- `limit` — max results (default 100)
- `offset` — pagination offset

## Project Structure
```
backend/
├── config/
│   ├── db.js          # MySQL connection pool
│   ├── schema.sql     # Database schema
│   └── seed.js        # Seed data script
├── controllers/
│   ├── authController.js
│   └── crudHelper.js  # Generic CRUD factory
├── middleware/
│   └── auth.js        # JWT authentication
├── routes/
│   ├── authRoutes.js
│   ├── residentRoutes.js
│   ├── appointmentRoutes.js
│   ├── healthRecordRoutes.js
│   ├── vaccinationRoutes.js
│   ├── serviceRoutes.js
│   ├── announcementRoutes.js
│   ├── emergencyContactRoutes.js
│   └── notificationRoutes.js
├── .env
├── package.json
├── server.js
└── README.md
```

## Default Credentials
| Username     | Password   | Role         |
|-------------|------------|--------------|
| admin       | admin123   | Super Admin  |
| nurse.cruz  | nurse123   | Nurse        |
| doc.santos  | doc123     | Doctor       |
