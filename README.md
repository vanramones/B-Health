# B-Health: Barangay Health Management System

A comprehensive health management system for barangay health centers, enabling efficient patient care, appointment scheduling, and health record management.

## 📋 Table of Contents
- [System Overview](#system-overview)
- [Functional Decomposition Diagram](#functional-decomposition-diagram)
- [Features](#features)
- [System Objectives](#system-objectives)
- [Technical Requirements](#technical-requirements)
- [Technology Stack](#technology-stack)
- [Installation Guide](#installation-guide)
- [User Guide](#user-guide)
- [Admin Guide](#admin-guide)
- [API Documentation](#api-documentation)
- [Troubleshooting](#troubleshooting)

---

## 🏥 System Overview

B-Health is a dual-interface health management system designed for barangay health centers in the Philippines. It consists of:

1. **User/Resident Portal** - Mobile-first interface for residents to book appointments, view health records, and stay updated with health announcements
2. **Admin Portal** - Web-based dashboard for health workers to manage appointments, maintain health records, and generate reports

---

## 📊 Functional Decomposition Diagram

*Functional Decomposition Diagram of B-Health: Barangay Digital Health System*

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                        B-HEALTH                                         │
│                            Barangay Digital Health System                                │
└──────────────────────────────────────┬──────────────────────────────────────────────────┘
                                       │
                    ┌──────────────────┴──────────────────┐
                    │                                     │
             ┌──────┴──────┐                       ┌──────┴──────┐
             │    USER     │                       │    ADMIN    │
             └──────┬──────┘                       └──────┬──────┘
                    │                                     │
    ┌───────┬───────┼───────┬────────┬─────────┐         │
    │       │       │       │        │         │         │
    ▼       ▼       ▼       ▼        ▼         ▼         │
```

### USER MODULE

```
USER
 │
 ├── Authentication
 │    ├── Login/Register
 │    └── Guest Access
 │
 ├── Dashboard
 │    ├── Overview Display
 │    └── Quick Actions
 │
 ├── Appointments
 │    ├── Book Appointment
 │    ├── View History
 │    └── Cancel Appointment
 │
 ├── Health Records
 │    ├── View Records
 │    └── Record Details
 │
 ├── Vaccinations
 │    ├── View Schedule
 │    ├── Track Progress
 │    └── Print Card
 │
 ├── Health Services
 │    ├── View Services
 │    └── Book Service
 │
 ├── Announcements
 │    ├── View Announcements
 │    └── Calendar View
 │
 ├── Notifications
 │    ├── View Alerts
 │    └── Mark Read
 │
 ├── Profile
 │    ├── Edit Profile
 │    └── Upload Photo
 │
 ├── Emergency
 │    ├── Call Services
 │    └── View Contacts
 │
 └── Language
      ├── Select English
      └── Select Tagalog
```

### ADMIN MODULE

```
ADMIN
 │
 ├── Authentication
 │    └── Admin Login
 │
 ├── Dashboard
 │    ├── Live Statistics
 │    └── Realtime Updates
 │
 ├── Appointments
 │    ├── Manage Appointments
 │    ├── Approve/Reject
 │    └── Calendar View
 │
 ├── Residents
 │    ├── Manage Residents
 │    └── View Profile
 │
 ├── Users
 │    ├── Manage Users
 │    └── Toggle Status
 │
 ├── Health Records
 │    ├── Manage Records
 │    └── Record Details
 │
 ├── Vaccinations
 │    ├── Manage Vaccinations
 │    └── Update Status
 │
 ├── Services
 │    ├── Manage Services
 │    └── Toggle Active
 │
 ├── Announcements
 │    ├── Manage Announcements
 │    └── Pin/Publish
 │
 ├── Emergency
 │    ├── Manage Contacts
 │    └── Mark Favorite
 │
 ├── Notifications
 │    ├── Manage Notifications
 │    └── Mark Read
 │
 ├── Reports
 │    ├── View Analytics
 │    └── Export/Print
 │
 ├── Accounts
 │    ├── Manage Admins
 │    └── Assign Roles
 │
 ├── Settings
 │    ├── System Config
 │    └── Data Backup
 │
 └── Trash
      ├── Restore Item
      └── Purge Item
```

---

## ✨ Features

### For Residents (User Portal)
- 📱 **Mobile-Responsive Interface** - Optimized for smartphones
- 🌐 **Bilingual Support** - English and Tagalog (Filipino)
- 🔐 **Secure Authentication** - Register and login with email
- 📅 **Appointment Booking** - Request appointments with real-time slot availability
- 📋 **Health Records Access** - View personal health history
- 💉 **Vaccination Tracking** - Monitor vaccination schedules and reminders
- 📢 **Announcements & Events** - Stay updated with health programs (No login required)
- 🔔 **Real-time Notifications** - Get instant updates on appointment status
- 👤 **Profile Management** - Update personal and emergency contact information

### For Health Workers (Admin Portal)
- 🖥️ **Comprehensive Dashboard** - Overview of appointments, residents, and health services
- 📊 **Analytics & Reports** - Visual charts and downloadable reports (CSV, PDF)
- 👥 **Resident Management** - Register and manage resident profiles
- 📅 **Appointment Management** 
  - List and Calendar views
  - Approve/Reject/Complete appointments
  - Real-time notifications for new bookings
  - Automatic scheduling with slot limits
- 🏥 **Health Records Management**
  - Create, Read, Update, Delete (CRUD) operations
  - Multiple record types (Consultation, Vaccination, Prenatal, Lab Results, Prescription)
  - Patient search and filtering
- 💉 **Vaccination Management** - Track and schedule vaccinations
- 🏥 **Health Services** - Manage available services and programs
- 📢 **Announcements** - Create and publish health announcements
- 🚨 **Emergency Contacts** - Maintain emergency hotline information
- 🔔 **Notification System** - Toast notifications for new appointments

---

## 🎯 System Objectives

### ✅ Objective 1: Health Workers Input & Update Patient Records
**Status: IMPLEMENTED**

**Features:**
- Full CRUD operations for health records
- Multiple record types: Consultation, Vaccination, Prenatal, Lab Results, Prescription
- Patient search with autocomplete
- Record status tracking (Ongoing, Follow-up, Closed)
- Real-time updates via Supabase
- Form validation and error handling

**Location:** `Admin Portal > Health Records`

**How to Use:**
1. Navigate to "Health Records" in admin sidebar
2. Click "+ New Record" button
3. Select patient from dropdown (search by name)
4. Choose record type and fill in details
5. Click "Save Record"
6. Edit records by clicking the edit icon
7. View full details by clicking the eye icon

---

### ✅ Objective 2: Users Submit Appointment Requests
**Status: IMPLEMENTED**

**Features:**
- User-friendly booking form
- Service selection (Consultation, Prenatal Care, Vaccination, etc.)
- Date picker with available dates
- Time slot selection with real-time availability
- Slot limit enforcement (max 5 per time slot)
- Optional notes field
- Appointment history view
- Status tracking (Pending, Approved, Completed, Rejected)

**Location:** `User Portal > Appointments`

**How to Use:**
1. Login to user portal
2. Navigate to "Appointments"
3. Click "Book Appointment" button
4. Select service type
5. Choose date and available time slot
6. Add optional notes
7. Click "Book Appointment"
8. Wait for admin approval

---

### ✅ Objective 3: Automate Scheduling & Management
**Status: IMPLEMENTED**

**Features:**
- **Automatic Slot Management**
  - Real-time slot availability checking
  - Configurable slot limits (default: 5 per time slot)
  - Prevents double-booking
  - Dynamic slot updates

- **Calendar View**
  - Monthly calendar grid
  - Color-coded appointments by status
  - Day-by-day appointment overview
  - Quick navigation (previous/next month)
  - Click appointments to view details

- **List View**
  - Filterable by status (All, Pending, Approved, Completed, Rejected)
  - Search functionality
  - Quick approve/reject actions
  - Sortable columns

- **Real-time Updates**
  - Socket.io for instant updates
  - Supabase Realtime for database changes
  - Auto-refresh on new appointments

**Location:** `Admin Portal > Appointments`

**How to Use:**

**Calendar View:**
1. Go to Appointments page
2. Click "Calendar" button (top-right)
3. Navigate months using arrow buttons
4. Click any appointment to view details
5. Approve/reject from modal

**List View:**
1. Go to Appointments page
2. Click "List" button (top-right)
3. Use filters to view specific status
4. Search by patient name or service
5. Click checkmark to approve, X to reject

---

### ✅ Objective 4: Notification System for Appointments
**Status: IMPLEMENTED**

**Features:**

**Admin Notifications:**
- **Toast Notifications**
  - Pop-up alerts for new appointments
  - Shows patient name, service, date, time
  - Auto-dismisses after 5 seconds
  - Green theme with bell icon

- **Visual Indicators**
  - Yellow highlight for new appointments
  - "NEW" red badge beside patient name
  - Counter badge on "Pending" filter button
  - Auto-dismiss when viewed

- **Sound Notification** (Optional)
  - Plays notification sound if available
  - Configurable audio file

**User Notifications:**
- **Real-time Status Updates**
  - Instant notification when appointment is approved/rejected
  - Toast notifications in user portal
  - Status badge updates

- **Email Notifications** (Backend)
  - Appointment confirmation emails
  - Status change notifications

**Location:** 
- Admin: `Appointments page` (automatic)
- User: `Appointments page` (automatic)

**How It Works:**
1. User books appointment
2. Socket.io emits event to admin
3. Admin receives toast notification
4. Appointment highlighted in yellow with "NEW" badge
5. Admin approves/rejects
6. User receives status update notification

---

### ✅ Objective 5: Generate Reports
**Status: IMPLEMENTED**

**Features:**
- **Visual Analytics**
  - Bar charts for monthly appointments
  - Area charts for trends
  - Pie charts for service breakdown
  - Responsive charts (Recharts library)

- **Report Types**
  - Monthly summaries
  - Quarterly reports
  - Annual reports
  - Custom date ranges

- **Export Options**
  - CSV export
  - PDF export (print-friendly)
  - Excel-compatible format

- **Metrics Tracked**
  - Total appointments
  - Completed appointments
  - Vaccinations administered
  - Service distribution
  - Resident demographics

**Location:** `Admin Portal > Reports`

**How to Use:**
1. Navigate to "Reports" in admin sidebar
2. Select date range (3 months, 6 months, 8 months, 1 year)
3. View visual charts and statistics
4. Click "Download CSV" to export data
5. Click "Print Report" for PDF generation
6. Access recent reports from the table

**Available Reports:**
- Monthly Summary
- Vaccination Report
- Resident Demographics
- Appointment Trends
- Service Breakdown

---

## � Technical Requirements

*Technical Requirements for the Development of B-Health: Barangay Digital Health System*

### Software Requirements

| Category | Software/Tool | Version | Purpose |
|----------|--------------|---------|---------|
| **Frontend Framework** | React.js | 18.x | Build user interfaces for both user and admin portals |
| **Build Tool** | Vite | 8.x | Fast development server and production builds |
| **UI Library** | React Bootstrap | 2.x | Responsive UI components and styling |
| **Mobile Framework** | Ionic React | 8.x | Native mobile app components |
| **Routing** | React Router | 6.x | Client-side navigation and routing |
| **Icons** | Lucide React | Latest | Modern icon library for UI elements |
| **Charts** | Recharts | 2.x | Data visualization for reports and analytics |
| **Real-time Communication** | Socket.io Client | 4.x | Live updates between client and server |
| **Mobile Wrapper** | Capacitor | 8.x | Convert web app to native mobile app |
| **Backend Framework** | Node.js | 18.x | JavaScript runtime environment |
| **Web Framework** | Express.js | 4.x | RESTful API server |
| **Database** | PostgreSQL | 15.x | Relational database via Supabase |
| **Realtime Database** | Supabase | Latest | Real-time database updates and subscriptions |
| **Authentication** | JWT (JSON Web Tokens) | Latest | Secure user authentication |
| **Password Hashing** | Bcrypt | 5.x | Password encryption and security |
| **WebSocket** | Socket.io | 4.x | Real-time bidirectional communication |
| **API Client** | Axios | 1.x | HTTP client for API requests |
| **Development Environment** | VS Code / Cursor | Latest | Code editor and IDE |
| **Version Control** | Git | 2.x | Source code management |
| **Package Manager** | npm | 9.x | Node.js package management |
| **Mobile Development** | Android Studio | Latest | Android app development and building |
| **Deployment Platform** | Vercel | Latest | Web application hosting and deployment |

### Hardware Requirements

**Development Machine:**
- **Processor:** Intel Core i5 or equivalent (i7 recommended)
- **RAM:** 8GB minimum (16GB recommended)
- **Storage:** 256GB SSD (for fast build times)
- **Display:** 1920x1080 resolution or higher
- **Internet:** Stable broadband connection

**Mobile Testing Device:**
- **Android:** Version 8.0 (API 26) or higher
- **RAM:** 4GB minimum
- **Storage:** 64GB minimum

**Server/Hosting:**
- **Vercel:** Automatic scaling (serverless)
- **Supabase:** PostgreSQL database hosting
- **Backend:** Node.js server (can be deployed on Vercel, Railway, or Render)

### Development Tools

| Tool | Version | Purpose |
|------|---------|---------|
| **Node.js** | 18.x LTS | JavaScript runtime |
| **npm** | 9.x | Package manager |
| **Git** | 2.x | Version control |
| **VS Code** | Latest | Primary code editor |
| **Android Studio** | Latest | Android development |
| **Postman** | Latest | API testing |
| **Vercel CLI** | Latest | Deployment tool |

### System Architecture

**Frontend (Client-Side):**
```
React.js + Vite + React Bootstrap + Ionic React
├── User Portal (Mobile-First)
│   ├── Home/Dashboard
│   ├── Appointments
│   ├── Health Records
│   ├── Vaccinations
│   ├── Announcements
│   └── Profile
└── Admin Portal (Web Dashboard)
    ├── Dashboard
    ├── Appointments (Calendar + List)
    ├── Health Records
    ├── Registered Users
    ├── Vaccinations
    ├── Services
    ├── Announcements
    ├── Emergency Contacts
    ├── Notifications
    └── Reports
```

**Backend (Server-Side):**
```
Node.js + Express.js + Supabase
├── Authentication API (JWT)
├── User Management API
├── Appointments API
├── Health Records API
├── Vaccinations API
├── Services API
├── Announcements API
└── Notifications API (Socket.io)
```

**Database (Supabase):**
```
PostgreSQL + Realtime
├── users table
├── appointments table
├── health_records table
├── vaccinations table
├── health_services table
├── announcements table
└── emergency_contacts table
```

**Mobile App:**
```
Capacitor + Android
├── Native Android Wrapper
├── WebView Integration
├── Push Notifications
└── Local Notifications
```

### Network Requirements

- **Internet Connection:** Required for all operations
- **Minimum Speed:** 5 Mbps for smooth operation
- **WebSocket Support:** Required for real-time features
- **HTTPS:** Required for secure authentication

### Security Requirements

- **HTTPS/TLS:** Encrypted data transmission
- **JWT Tokens:** Secure authentication
- **Password Hashing:** Bcrypt encryption
- **Input Validation:** Server-side validation
- **CORS:** Configured for specific origins
- **Environment Variables:** Secure API keys and secrets

### Browser Compatibility

| Browser | Minimum Version | Status |
|---------|----------------|--------|
| **Chrome** | 90+ | ✅ Fully Supported |
| **Firefox** | 88+ | ✅ Fully Supported |
| **Safari** | 14+ | ✅ Fully Supported |
| **Edge** | 90+ | ✅ Fully Supported |
| **Opera** | 76+ | ✅ Fully Supported |

### Mobile OS Compatibility

| Platform | Minimum Version | Status |
|----------|----------------|--------|
| **Android** | 8.0 (API 26) | ✅ Supported |
| **iOS** | 14+ | ⚠️ Not yet implemented |

---

## �🛠️ Technology Stack

### Frontend
- **React 18** - UI library
- **React Router v6** - Client-side routing
- **React Bootstrap** - UI components
- **Ionic Framework** - Mobile components
- **Vite** - Build tool
- **Lucide React** - Icons
- **Recharts** - Data visualization
- **Socket.io Client** - Real-time communication

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **Supabase** - Database (PostgreSQL) & Realtime
- **Socket.io** - WebSocket server
- **JWT** - Authentication
- **Bcrypt** - Password hashing

### Mobile
- **Capacitor** - Native mobile wrapper
- **Android Studio** - Android development

### Database
- **PostgreSQL** (via Supabase)
- **Supabase Realtime** - Live database updates

---

## 📦 Installation Guide

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- Android Studio (for mobile app)
- Supabase account
- Git

### Step 1: Clone Repository
```bash
git clone <repository-url>
cd B-Health
```

### Step 2: Install Dependencies
```bash
# Install frontend dependencies
cd Admin
npm install

# Install backend dependencies
cd ../server
npm install
```

### Step 3: Environment Configuration

**Frontend (.env in Admin folder):**
```env
VITE_API_URL=http://localhost:5000
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

**Backend (.env in server folder):**
```env
PORT=5000
DATABASE_URL=your_postgresql_connection_string
JWT_SECRET=your_jwt_secret_key
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_supabase_service_key
```

### Step 4: Database Setup
1. Create Supabase project
2. Run database migrations (if available)
3. Create tables:
   - users
   - appointments
   - health_records
   - vaccinations
   - health_services
   - announcements
   - emergency_contacts

### Step 5: Run Development Servers

**Backend:**
```bash
cd server
npm run dev
```

**Frontend:**
```bash
cd Admin
npm run dev
```

Access:
- Admin Portal: `http://localhost:5173/admin`
- User Portal: `http://localhost:5173/user`

### Step 6: Build for Production

**Web:**
```bash
cd Admin
npm run build
```

**Android:**
```bash
cd Admin
npm run build
npx cap sync android
npx cap open android
```

Then build APK in Android Studio.

---

## 👤 User Guide

### Getting Started

#### 1. Registration
1. Open the app (after splash screen, you'll see the home page)
2. Click "Sign In" button in sidebar
3. Click "Create Account" link
4. Fill in:
   - Full Name
   - Email
   - Password
   - Purok (neighborhood)
   - Phone Number
5. Click "Register"
6. Login with your credentials

#### 2. Browsing as Guest
- You can browse the home page and announcements without logging in
- To access other features (appointments, health records, etc.), you need to sign in

#### 3. Changing Language
1. Click the language toggle button in the header
2. Choose between:
   - 🇺🇸 EN (English)
   - 🇵🇭 TL (Tagalog)
3. All text will update automatically

### Features Guide

#### Booking an Appointment
1. **Login** to your account
2. Navigate to **"Appointments"** (bottom navigation or sidebar)
3. Click **"Book Appointment"** button
4. Fill in the form:
   - **Service**: Select type (Consultation, Prenatal, Vaccination, etc.)
   - **Date**: Choose available date
   - **Time**: Select available time slot (green = available, red = full)
   - **Notes**: Add optional details
5. Click **"Book Appointment"**
6. Wait for admin approval (you'll receive a notification)

#### Viewing Appointment Status
1. Go to **"Appointments"**
2. See your appointments with status:
   - **Pending** (Yellow) - Waiting for approval
   - **Approved** (Blue) - Confirmed by admin
   - **Completed** (Green) - Appointment done
   - **Rejected** (Red) - Not approved
3. Click any appointment to view full details

#### Viewing Health Records
1. Login to your account
2. Navigate to **"Health Records"**
3. View your medical history:
   - Consultations
   - Vaccinations
   - Prenatal records
   - Lab results
   - Prescriptions
4. Click any record to view details

#### Checking Vaccination Schedule
1. Go to **"Vaccinations"**
2. View:
   - **Upcoming & Scheduled** - Next vaccinations due
   - **Vaccination History** - Completed vaccinations
3. Red badge = Overdue
4. Click "Schedule Appointment" if needed

#### Reading Announcements
1. Go to **"Announcements"** (accessible without login)
2. Browse health programs and events
3. Use search bar to find specific announcements
4. Filter by type (Program, Vaccination, Health Alert, Announcement)
5. Click any announcement to read full details

#### Updating Profile
1. Go to **"Profile"**
2. Click **"Edit Profile"**
3. Update:
   - Personal information
   - Contact details
   - Emergency contact
4. Click **"Save Changes"**

---

## 👨‍⚕️ Admin Guide

### Getting Started

#### 1. Admin Login
1. Navigate to `http://localhost:5173/admin/login`
2. Enter admin credentials
3. Access admin dashboard

#### 2. Dashboard Overview
The dashboard shows:
- Total appointments (today, this week, this month)
- Total residents
- Available health services
- Recent appointments
- Quick actions

### Managing Appointments

#### List View
1. Go to **"Appointments"** in sidebar
2. Click **"List"** button (top-right)
3. **Filter by status:**
   - All
   - Pending (shows count + NEW badge)
   - Approved
   - Completed
   - Rejected
4. **Search** by patient name or service
5. **Quick actions:**
   - ✓ (Checkmark) - Approve appointment
   - ✗ (X) - Reject appointment
   - Eye icon - View full details

#### Calendar View
1. Go to **"Appointments"**
2. Click **"Calendar"** button (top-right)
3. **Navigate months:**
   - Click **<** for previous month
   - Click **>** for next month
4. **View appointments:**
   - Each day shows appointments
   - Color-coded by status
   - Shows time + patient name
   - "+X more" if more than 3 appointments
5. **Click appointment** to view/manage

#### Handling New Appointments
When a user books an appointment:
1. **Toast notification** appears (top-right)
2. **Yellow highlight** on appointment row
3. **"NEW" badge** beside patient name
4. **Counter badge** on "Pending" button
5. Click appointment to view details
6. Approve or reject
7. Badge disappears automatically

#### Creating Manual Appointment
1. Click **"+ New Appointment"** button
2. Fill in:
   - Patient Name
   - Service
   - Date
   - Time
3. Click **"Create Appointment"**

### Managing Health Records

#### Creating a Health Record
1. Go to **"Health Records"**
2. Click **"+ New Record"** button
3. Fill in the form:
   - **Patient**: Search and select patient
   - **Type**: Consultation, Vaccination, Prenatal, Lab Result, Prescription
   - **Diagnosis**: Medical findings
   - **Doctor/Staff**: Your name
   - **Date**: Record date
   - **Notes**: Additional details
   - **Status**: Ongoing, Follow-up, Closed
4. Click **"Save Record"**

#### Updating a Health Record
1. Find the record in the table
2. Click **edit icon** (pencil)
3. Modify fields
4. Click **"Update Record"**

#### Viewing Health Record Details
1. Click **eye icon** on any record
2. View complete information
3. Close modal when done

#### Filtering Records
1. Use status filter buttons:
   - All
   - Ongoing
   - Follow-up
   - Closed
2. Use search bar to find specific patient
3. Filter by record type

### Managing Residents

#### Registering a New Resident
1. Go to **"Registered Users"**
2. Click **"+ Register User"** button
3. Fill in:
   - Full Name
   - Email
   - Password
   - Purok
   - Phone Number
   - Date of Birth
   - Gender
   - Blood Type
   - Civil Status
4. Click **"Register User"**

#### Viewing Resident Details
1. Click on any resident in the table
2. View complete profile
3. See appointment history
4. Check health records

### Managing Services

#### Adding a Health Service
1. Go to **"Services"**
2. Click **"+ Add Service"** button
3. Fill in:
   - Service Name
   - Description
   - Schedule
   - Location
4. Click **"Add Service"**

#### Editing a Service
1. Click **edit icon** on service
2. Update information
3. Click **"Update Service"**

### Managing Vaccinations

#### Recording a Vaccination
1. Go to **"Vaccination"**
2. Click **"+ New Vaccination"** button
3. Fill in:
   - Patient
   - Vaccine Name
   - Dose Number
   - Date Administered
   - Next Due Date
   - Administered By
4. Click **"Save Vaccination"**

### Creating Announcements

#### Publishing an Announcement
1. Go to **"Announcements"**
2. Click **"+ New Announcement"** button
3. Fill in:
   - Title
   - Content/Body
   - Category (Program, Vaccination, Health Alert, Announcement)
   - Priority (Normal, Important, Urgent)
   - Event Date (optional)
   - Image URL (optional)
4. Check **"Pin to top"** if important
5. Click **"Publish Announcement"**

#### Editing an Announcement
1. Click **edit icon** on announcement
2. Modify content
3. Click **"Update Announcement"**

### Generating Reports

#### Viewing Analytics
1. Go to **"Reports"**
2. Select date range:
   - Last 3 months
   - Last 6 months
   - Last 8 months
   - Last year
3. View charts:
   - Monthly Appointments (Bar Chart)
   - Appointment Trends (Area Chart)
   - Service Breakdown (Pie Chart)

#### Exporting Reports
1. Click **"Download CSV"** button
2. Choose report type:
   - Appointments Report
   - Vaccinations Report
   - Services Report
3. File downloads automatically

#### Printing Reports
1. Click **"Print Report"** button
2. Print preview opens
3. Print or save as PDF

### Managing Emergency Contacts

#### Adding Emergency Contact
1. Go to **"Emergency Contacts"**
2. Click **"+ Add Contact"** button
3. Fill in:
   - Name
   - Category (Police, Fire, Medical, Barangay)
   - Phone Number
   - Description
4. Click **"Add Contact"**

---

## 🔌 API Documentation

### Base URL
```
http://localhost:5000/api
```

### Authentication Endpoints

#### Register User
```http
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "full_name": "Juan Dela Cruz",
  "purok": "1",
  "phone": "09123456789"
}
```

#### Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}

Response:
{
  "token": "jwt_token_here",
  "user": { ... }
}
```

### Appointment Endpoints

#### Get User Appointments
```http
GET /user/appointments
Authorization: Bearer {token}
```

#### Create Appointment
```http
POST /user/appointments
Authorization: Bearer {token}
Content-Type: application/json

{
  "service": "Consultation",
  "date": "2026-08-15",
  "time": "9:00 AM",
  "notes": "Optional notes"
}
```

#### Get Available Slots
```http
GET /user/appointments/slots?date=2026-08-15&service=Consultation
Authorization: Bearer {token}
```

#### Update Appointment Status (Admin)
```http
PATCH /appointments/:id
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "status": "approved"
}
```

### Health Records Endpoints

#### Get All Health Records (Admin)
```http
GET /health-records
Authorization: Bearer {admin_token}
```

#### Create Health Record (Admin)
```http
POST /health-records
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "patient": "user_id",
  "type": "Consultation",
  "diagnosis": "Common cold",
  "doctor": "Dr. Smith",
  "date": "2026-08-15",
  "notes": "Rest and hydration",
  "status": "ongoing"
}
```

#### Get User Health Records
```http
GET /user/health-records
Authorization: Bearer {token}
```

### Announcements Endpoints

#### Get All Announcements (Public)
```http
GET /user/announcements
```

#### Create Announcement (Admin)
```http
POST /announcements
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "title": "Free Vaccination Program",
  "body": "Details here...",
  "category": "Vaccination",
  "pinned": true,
  "event_date": "2026-08-20"
}
```

---

## 🐛 Troubleshooting

### Common Issues

#### 1. White Screen on User Portal
**Problem:** App shows blank white screen

**Solutions:**
- Check browser console for errors (F12)
- Verify API server is running
- Check if Supabase credentials are correct
- Clear browser cache and reload
- Check network tab for failed requests

#### 2. Appointments Not Updating
**Problem:** New appointments don't appear immediately

**Solutions:**
- Check Socket.io connection (should see "connected" in console)
- Verify backend server is running
- Check Supabase Realtime is enabled
- Refresh the page manually
- Check browser console for WebSocket errors

#### 3. Login Issues
**Problem:** Cannot login with correct credentials

**Solutions:**
- Verify email and password are correct
- Check if user exists in database
- Check JWT_SECRET in backend .env
- Clear browser cookies and localStorage
- Check backend logs for authentication errors

#### 4. Calendar View Not Showing Appointments
**Problem:** Calendar is empty but appointments exist

**Solutions:**
- Check date format in database (YYYY-MM-DD)
- Verify appointments have valid dates
- Check filter settings (should be "all")
- Refresh the page
- Check browser console for errors

#### 5. Build Errors
**Problem:** `npm run build` fails

**Solutions:**
- Delete `node_modules` and run `npm install` again
- Check for syntax errors in code
- Verify all imports are correct
- Check Node.js version (should be v18+)
- Clear npm cache: `npm cache clean --force`

#### 6. Android Build Issues
**Problem:** Capacitor sync or build fails

**Solutions:**
- Run `npm run build` first
- Check `capacitor.config.json` is correct
- Verify Android SDK is installed
- Run `npx cap sync android` again
- Open Android Studio and sync Gradle

#### 7. Real-time Updates Not Working
**Problem:** Changes don't appear in real-time

**Solutions:**
- Check Supabase Realtime is enabled for tables
- Verify Socket.io server is running
- Check WebSocket connection in Network tab
- Restart both frontend and backend servers
- Check firewall settings

#### 8. Notification Toast Not Appearing
**Problem:** Admin doesn't receive appointment notifications

**Solutions:**
- Check Socket.io connection
- Verify `appointment-created` event is emitted from backend
- Check browser console for errors
- Test with browser console: `socket.emit('test')`
- Restart backend server

---

## 📞 Support

For issues, questions, or contributions:
- Create an issue on GitHub
- Contact the development team
- Check documentation at `/docs`

---

## 📄 License

[Your License Here]

---

## 👥 Contributors

- Development Team
- Barangay Health Workers
- Community Testers

---

## 🎉 Acknowledgments

- Barangay Health Center staff
- Community residents
- Open-source libraries and tools

---

**Last Updated:** December 2024
**Version:** 1.0.0
