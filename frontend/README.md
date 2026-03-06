# MicroLend — Production-Grade Loan Management API

A production-ready, full-stack web application for managing loans, borrowers, and payments. Features server-side interest computation, paginated data, real-time analytics, Redis caching, interactive API docs, structured logging, security hardening, Docker containerization, and automated testing.

---

## 🛠️ Technical Stack

### Backend
| Technology | Purpose |
|---|---|
| **Node.js + Express 5** | RESTful API server |
| **MongoDB + Mongoose** | Document database with ODM and compound indexes |
| **Redis (ioredis)** | Cache-aside caching for read-heavy endpoints |
| **JWT (jsonwebtoken)** | Stateless authentication |
| **bcryptjs** | Secure password hashing |
| **Winston** | Structured logging (file + console) |
| **Morgan** | HTTP request logging (piped to Winston) |
| **Helmet** | Secure HTTP headers |
| **express-rate-limit** | Rate limiting (100 req/15min per IP) |
| **express-mongo-sanitize** | NoSQL injection prevention |
| **Swagger / OpenAPI 3.0** | Interactive API documentation |
| **Jest + Supertest** | Automated test suite |
| **Docker + Compose** | Containerized deployment |

### Frontend
| Technology | Purpose |
|---|---|
| **React 18 + TypeScript** | Component-based UI with static typing |
| **Vite** | Ultra-fast HMR and optimized production builds |
| **React Router DOM v7** | Nested routing, protected layouts, role-based access |
| **React Context API** | State management (`AuthProvider`, `LoanProvider`, `ToastProvider`) |
| **Recharts** | Data visualization for analytics and reports |
| **Lucide React** | Modern icon library |
| **i18next** | Multi-language support (English, Bengali) |

---

## ⚙️ Architecture

### Controller-Service Pattern

```
Route → Controller → Service → Model
 │          │            │         │
 │    HTTP concerns   Business   Database
 │    (req/res)       Logic      Schema
 └── 30 lines      └── thin   └── 470+ lines
```

### Backend Directory Structure

```
backend/
├── server.js                    # Express app + middleware stack
├── config/
│   └── redis.js                 # Redis client with graceful degradation
├── controllers/
│   ├── loanController.js        # Thin HTTP layer
│   └── paymentController.js
├── services/
│   ├── loanService.js           # Interest calc, pagination, filtering, sorting, CRUD
│   └── paymentService.js        # Payment recording, history, aggregation reports
├── middleware/
│   ├── auth.js                  # JWT verification
│   ├── errorHandler.js          # Centralized error handler (Winston integrated)
│   ├── rateLimiter.js           # 100 req/15min per IP
│   └── validate.js              # Query parameter validation & sanitization
├── validators/
│   └── loanValidator.js         # Request body validation
├── models/
│   ├── User.js                  # Lender/Borrower roles
│   ├── Loan.js                  # 3 compound indexes
│   └── Payment.js               # 3 compound indexes
├── routes/
│   ├── auth.js, loans.js, payments.js, dial2verify.js
├── docs/
│   └── swagger.js               # OpenAPI 3.0 spec
├── utils/
│   └── logger.js                # Winston configuration
├── tests/
│   ├── setup.js                 # Test DB helpers
│   ├── auth.test.js             # Auth tests
│   ├── loans.test.js            # Loan CRUD + pagination tests
│   └── payments.test.js         # Payment tests
├── logs/                        # Auto-generated log files
├── Dockerfile                   # Node 18 Alpine
└── docker-compose.yml           # App + MongoDB + Redis
```

---

## 🔧 Production Infrastructure

### 1. Redis Caching

Cache-aside strategy with graceful degradation (app works without Redis):

| Endpoint | TTL | Key Pattern |
|---|---|---|
| `GET /api/loans` | 30s | `loans:{lenderId}:p{page}l{limit}...` |
| `GET /api/loans/dashboard` | 60s | `dashboard:{lenderId}` |
| `GET /api/payments/reports` | 120s | `reports:{lenderId}` |

Cache is automatically invalidated on write operations (create/update/delete loan, record payment).

### 2. API Documentation

Interactive Swagger UI at: **`http://localhost:5000/api-docs`**

- OpenAPI 3.0 spec with all endpoints
- Request/response schemas
- JWT authentication support
- Try-it-out functionality

### 3. Structured Logging (Winston)

| Destination | Level | Format |
|---|---|---|
| `logs/combined.log` | All | JSON (timestamp, level, message, meta) |
| `logs/error.log` | Error only | JSON with stack traces |
| Console | All (dev) | Colorized human-readable |

Logged events: user login, loan creation, payment recording, API errors, DB errors.

### 4. Security Hardening

| Middleware | Purpose |
|---|---|
| **Helmet** | Secure HTTP headers (CSP, HSTS, X-Frame-Options, etc.) |
| **Rate Limiter** | 100 requests / 15 minutes per IP |
| **Mongo Sanitize** | Strips `$` and `.` from body/query to prevent NoSQL injection |
| **Body Size Limit** | `express.json({ limit: '10kb' })` |
| **JWT Auth** | All protected routes require valid Bearer token |

### 5. Docker Deployment

```bash
# Start all services
docker-compose up -d

# Stop
docker-compose down
```

Services: `microlend-api` (port 5000), `microlend-mongo` (27017), `microlend-redis` (6379)

### 6. Automated Testing

```bash
npm test
```

Test suite covers:
- **Auth**: signup, login, invalid credentials
- **Loans**: create, paginate, filter, sort, detail, soft-delete, borrower history
- **Payments**: record, paginated history, analytics reports

---

## 📡 API Endpoints

### Authentication (`/api/auth`)
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/signup` | Register (with phone verification) |
| POST | `/api/auth/login` | Login (returns JWT) |
| PUT | `/api/auth/profile` | Update user profile |

### Loans (`/api/loans`)
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/loans` | Create a new loan |
| GET | `/api/loans?page=1&limit=20&sortBy=createdAt&order=desc&status=Active` | Paginated, filtered, sorted loans with computed interest |
| GET | `/api/loans/dashboard` | Aggregated dashboard stats |
| GET | `/api/loans/pending` | Pending/overdue payments |
| GET | `/api/loans/borrower-history` | Soft-deleted borrowers |
| GET | `/api/loans/:id` | Single loan detail |
| PUT | `/api/loans/:id` | Update loan |
| DELETE | `/api/loans/:id` | Soft-delete loan |

### Payments (`/api/payments`)
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/payments` | Record a payment |
| GET | `/api/payments?page=1&limit=20` | Paginated payment history |
| GET | `/api/payments/reports` | Revenue analytics |

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** v18+
- **MongoDB** (local or Atlas)
- **Redis** (optional — app works without it)

### Local Setup
```bash
# Backend
cd backend
npm install
cp .env.example .env    # Configure MONGO_URI, JWT_SECRET
npm run dev              # → http://localhost:5000

# Frontend
cd frontend
npm install
npm run dev              # → http://localhost:5173
```

### Docker Setup
```bash
cd backend
docker-compose up -d     # Starts app + MongoDB + Redis
```

### Environment Variables
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/microlend
JWT_SECRET=your_secret_key
REDIS_URL=redis://127.0.0.1:6379
NODE_ENV=development
LOG_LEVEL=info
```
