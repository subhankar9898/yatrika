# 🌏 Yatrika — Smart Tourism Companion

> Book verified local guides across India's 325+ iconic tourist destinations.

Yatrika is a full-stack tourism platform with multi-role dashboards (Admin, Guide, User), real-time booking management, OTP-based authentication, and an intelligent security logging system.

---

## ✨ Features

- 🗺️ **Smart Discovery** — Filter 325+ places by zone, type, rating & entry fee
- 👤 **Expert Guides** — Book verified guides with real-time slot availability
- 📅 **Multi-Day Trips** — Book single-day or extended tours with date ranges
- 🔔 **Real-time Alerts** — In-app and email notifications for every booking event
- 🔐 **Triple-Factor Auth** — JWT + GitHub OAuth2 + Email OTP verification
- 🛡️ **Admin Dashboard** — Approve guides, manage places, download reports
- 🤖 **Anomaly Detection** — ML-ready logging to detect brute-force & suspicious activity
- 📱 **Fully Responsive** — Mobile, tablet, and desktop layouts

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18 · Vite · Tailwind CSS · TanStack Query |
| **State** | Zustand |
| **Backend** | FastAPI (Python 3.11+) |
| **Main DB** | MySQL 8.0 via SQLAlchemy ORM |
| **Log DB** | MongoDB 7.0 via Motor (async) — *activity logs & anomaly detection* |
| **Cache** | Redis 7 — *OTP rate limiting · JWT blacklisting* |
| **Email** | Jinja2 HTML templates · Gmail SMTP |
| **Images** | Cloudinary (free tier) |
| **Auth** | Dual JWT tokens · GitHub OAuth2 · Email OTP |

---

## 🚀 Quick Start

### Prerequisites
Make sure you have installed:
- **Python 3.11+** and **Node.js 18+**
- One of: **Docker** (easiest) OR local **MySQL 8**, **MongoDB**, and **Redis**

---

### Step 1 — Start Databases

**Option A: Docker (Recommended)**
```bash
docker-compose up -d
```
This auto-starts MySQL (3306), MongoDB (27017), and Redis (6379) with pre-configured credentials.

**Option B: Local (if already installed)**
```bash
# Start MySQL, MongoDB, and Redis separately as services on your machine
# Then update DATABASE_URL and MONGODB_URI in your .env (see Step 2)
```

---

### Step 2 — Configure the Backend

```bash
cd backend

# 1. Copy the environment template
cp .env.example .env

# 2. Open .env and fill in your values
#    The .env.example file has detailed instructions for every variable.
#    At minimum, update:
#    - DATABASE_URL (your MySQL password)
#    - JWT_SECRET   (generate with: openssl rand -hex 32)
```

---

### Step 3 — Install & Run the Backend

```bash
cd backend

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate        # macOS / Linux
# .\venv\Scripts\activate       # Windows

# Install dependencies
pip install -r requirements.txt

# Seed 325+ tourist places from the dataset (run once)
python scripts/seed_places.py

# Start the API server
uvicorn main:app --reload --port 8000
```

API: http://localhost:8000  
Swagger Docs: http://localhost:8000/api/docs

---

### Step 4 — Create the First Admin Account

After the backend starts, create an admin user directly in MySQL:

```sql
-- Option 1: Use MySQL Workbench or terminal
INSERT INTO users (full_name, email, password_hash, role, is_verified, is_active)
VALUES ('Admin', 'admin@yatrika.com', '<bcrypt_hash>', 'admin', 1, 1);
```

Generate the bcrypt hash with Python:
```python
from passlib.context import CryptContext
print(CryptContext(schemes=["bcrypt"]).hash("YourAdminPassword123"))
```

---

### Step 5 — Run the Frontend

```bash
cd frontend
npm install
npm run dev
```

App: http://localhost:5173

---

## ⚙️ Environment Variables

All variables are documented with step-by-step instructions inside `backend/.env.example`.

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ Yes | MySQL connection string |
| `MONGODB_URI` | ✅ Yes | MongoDB connection string (for activity logs) |
| `REDIS_URL` | ✅ Yes | Redis URL (OTP & JWT rate limiting) |
| `JWT_SECRET` | ✅ Yes | Random 64-char secret (`openssl rand -hex 32`) |
| `GMAIL_ADDRESS` | ⚡ Email | Your Gmail address for sending emails |
| `GMAIL_APP_PASSWORD` | ⚡ Email | 16-char Google App Password (not your Gmail password) |
| `GITHUB_CLIENT_ID` | 🔵 OAuth | From github.com/settings/developers |
| `GITHUB_CLIENT_SECRET` | 🔵 OAuth | From github.com/settings/developers |
| `CLOUDINARY_CLOUD_NAME` | 📸 Images | From cloudinary.com Dashboard |
| `CLOUDINARY_API_KEY` | 📸 Images | From cloudinary.com Dashboard |
| `CLOUDINARY_API_SECRET` | 📸 Images | From cloudinary.com Dashboard |

> 📖 Open `backend/.env.example` for the complete guide with screenshots-level detail for each variable.

---

## 📂 Project Structure

```
yatrika/
├── docker-compose.yml           ← MySQL + MongoDB + Redis
├── README.md
├── .gitignore
│
├── backend/
│   ├── .env.example             ← Documented template — copy to .env
│   ├── main.py                  ← FastAPI app entry point
│   ├── requirements.txt
│   ├── scripts/
│   │   ├── seed_places.py       ← Seeds 325 places from Top.csv dataset
│   │   ├── seed_guides.py       ← Seeds demo guide accounts
│   │   └── seed_bookings.py     ← Seeds sample bookings
│   ├── data/
│   │   └── Top.csv              ← 325 Indian tourist places dataset
│   └── app/
│       ├── api/v1/
│       │   ├── auth.py          ← Register · OTP · Login · GitHub OAuth · Forgot Password
│       │   ├── places.py        ← Places listing + zone/type/fee filters
│       │   ├── guides.py        ← Guide profiles · slots · bookings
│       │   ├── bookings.py      ← Booking CRUD + ratings
│       │   ├── admin.py         ← Admin dashboard · approvals · reports · anomalies
│       │   └── exports.py       ← CSV/Excel report generation
│       ├── models/
│       │   ├── mysql.py         ← All SQLAlchemy models
│       │   └── extra.py         ← Notifications · BlockedDates · AssignmentRequests
│       ├── schemas/             ← Pydantic request/response models
│       ├── core/
│       │   ├── config.py        ← Settings from .env
│       │   ├── security.py      ← JWT · bcrypt · OTP generation
│       │   └── dependencies.py  ← Role-based access control helpers
│       ├── db/
│       │   ├── mysql_session.py ← SQLAlchemy session
│       │   ├── mongo_client.py  ← MongoDB Motor client + indexes
│       │   └── redis_client.py  ← Redis rate-limiting helpers
│       └── utils/
│           └── email_service.py ← Jinja2 email rendering + SMTP send
│
└── frontend/
    ├── index.html
    ├── src/
    │   ├── App.jsx              ← All route definitions
    │   ├── main.jsx             ← React entry point
    │   ├── api/                 ← Axios instance + API functions per module
    │   ├── store/authStore.js   ← Zustand global auth state
    │   ├── hooks/               ← useDebounce · custom hooks
    │   ├── components/
    │   │   ├── ui/              ← PlaceCard · OTPModal · FilterSidebar · PageLoader
    │   │   └── layout/          ← Navbar · PublicLayout · DashboardLayout · ProtectedRoute
    │   └── pages/
    │       ├── public/          ← HomePage · PlacesPage · LoginPage · RegisterPage
    │       ├── auth/            ← ForgotPasswordPage
    │       ├── user/            ← UserDashboard
    │       ├── guide/           ← GuideDashboard
    │       └── admin/           ← AdminDashboard · AdminUsers · AdminGuides · AdminPlaces · AdminApprovals
    └── package.json
```

---

## 📡 API Overview

Full interactive documentation at [`/api/docs`](http://localhost:8000/api/docs) when backend is running.

| Module | Base Path | Auth Required |
|--------|-----------|---------------|
| Authentication | `/api/v1/auth/` | Public |
| Tourist Places | `/api/v1/places/` | Login required |
| Guides & Slots | `/api/v1/guides/` | Mixed |
| Bookings | `/api/v1/bookings/` | User JWT |
| Notifications | `/api/v1/notifications/` | User JWT |
| Admin | `/api/v1/admin/` | Admin JWT only |
| Reports/Exports | `/api/v1/export/` | Admin JWT only |

---

## 🗃️ Why Three Databases?

| Database | Used For | Why |
|----------|----------|-----|
| **MySQL** | Users, Bookings, Places, OTPs | Relational, ACID-compliant structured data |
| **MongoDB** | Activity logs, security events | High-volume unstructured event logging, schema-flexible |
| **Redis** | Rate limits, token blacklist | Ultra-fast in-memory key-value for transient state |

---

## 🤝 Contributing

1. Fork the repository
2. Create a branch: `git checkout -b feature/your-feature`
3. Commit changes: `git commit -m 'feat: add your feature'`
4. Push: `git push origin feature/your-feature`
5. Open a Pull Request
