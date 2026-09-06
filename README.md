# LendWise — Enterprise Loan & Microfinance Platform

LendWise is a full-stack microfinance and peer-to-peer loan management platform. Built with Node.js, Express 5, MongoDB, Redis, and React 18 with TypeScript, LendWise delivers real-time transaction reconciliation, automated interest schedule computation, role-isolated lender and borrower portals, contextual AI risk assistance, and comprehensive financial auditability.

---

## 🚀 Core Features & Capabilities

* **Role-Isolated Portals**: Dedicated, authorized experiences for Lenders (portfolio management, disbursements, borrower tracking, yield analytics) and Borrowers (active loans, repayment schedules, upcoming dues).
* **Authoritative Financial Ledger**: Atomic payment recording, dynamic interest calculation (Simple & Compounding), remaining balance tracking, and immutable transaction audit logs.
* **Concurrent Payment Protection**: Optimistic locking (`__v` versioning) and MongoDB session transactions preventing race conditions or double-charging.
* **Real-Time Reconciliation**: Socket.IO event broadcasting for instant multi-device balance updates without manual page refreshes.
* **LendWise AI Assistant**: Contextual AI financial advisor evaluating risk profiles, loan schedule estimations, and borrower inquiries.
* **PDF & Financial Exports**: Server-side generation of official loan agreement PDFs, payment receipts, and SpreadsheetML executive summary exports.
* **Performance Caching**: Redis cache-aside caching layer for high-throughput dashboard analytics and payment history queries with automatic write-invalidation.
* **Production Security**: Hardened JWT authentication, role-based authorization, IP rate limiting, Helmet HTTP security headers, NoSQL injection protection, and environment variable validation.

---

## 🛠️ Technology Stack

### Backend
| Technology | Purpose |
|---|---|
| **Node.js + Express 5** | Modular RESTful API server using Controller-Service architecture |
| **MongoDB + Mongoose** | Document database with compound indexing and transactions |
| **Redis (ioredis)** | Cache-aside performance caching with graceful degradation |
| **Socket.IO** | Bi-directional real-time event broadcasting |
| **JWT & bcryptjs** | Role-aware stateless authentication and password hashing |
| **PDFKit** | Server-side financial agreement & receipt PDF generation |
| **Winston & Morgan** | Structured JSON logging with multi-level file/console output |
| **Helmet & Rate-Limit** | Security headers and request rate limiting |
| **Jest & Supertest** | Comprehensive test suite (134 automated unit/integration tests) |

### Frontend
| Technology | Purpose |
|---|---|
| **React 18 + TypeScript** | Strict typed UI component architecture |
| **Vite** | Optimized production bundling with vendor chunk splitting |
| **React Router DOM v7** | Role-aware protected routing and layout navigation |
| **Recharts** | Interactive financial charts and repayment analytics |
| **Lucide React** | Modern design icon system |

---

## 📂 Repository Architecture

```text
├── backend/
│   ├── config/              # Database, Redis, Firebase, Env validation
│   ├── controllers/         # Thin HTTP request handlers
│   ├── services/            # Core business logic (loans, payments, reports)
│   ├── middleware/         # Auth, validation, security, error handling
│   ├── models/              # User, Loan, Payment, Activity Mongoose schemas
│   ├── routes/              # Express API route modules
│   ├── utils/               # Winston logger, PDF generators, socket server
│   ├── tests/               # Jest test suite (134 passing tests)
│   ├── Dockerfile           # Multi-stage production container setup
│   └── reconcile_audit.js   # Read-only financial reconciliation script
├── frontend/
│   ├── src/
│   │   ├── components/      # Modular UI components, Modals, Navbar, Footer
│   │   ├── context/         # AuthContext, LoanContext, ToastContext
│   │   ├── pages/           # Landing, Dashboards, Borrower views, Settings, Reports
│   │   └── services/        # API client and Socket.IO connection manager
│   ├── Dockerfile           # Production container build
│   └── nginx.conf           # SPA routing and production HTTP setup
└── docker-compose.yml       # Production orchestration (App, MongoDB, Redis)
```

---

## ⚠️ Technical Operational Conditions & Architecture Notes

1. **MongoDB Replica Set for Transactions**:
   - Multi-document session transactions require a **MongoDB Replica Set** or managed cluster (e.g., MongoDB Atlas).
   - On standalone MongoDB instances (such as local dev setups), the backend payment service automatically uses atomic single-document `findOneAndUpdate` fallback mode.

2. **Socket.IO Horizontal Scaling**:
   - Socket.IO operates in-memory for single-instance backend deployments.
   - For multi-instance load-balanced deployments, integrate `@socket.io/redis-adapter` to synchronize real-time socket events across backend nodes.

3. **Excel Report Generation**:
   - Excel export (`/api/reports/excel`) generates Microsoft Office SpreadsheetML (XML format) served with spreadsheet headers.
   - It is natively recognized and opened by Microsoft Excel and LibreOffice, but uses SpreadsheetML/XML format rather than binary OOXML (`.xlsx`).

4. **Performance & Build Validation**:
   - Production validation covers TypeScript compilation, code splitting, vendor chunk optimization, and runtime stability.
   - High-throughput capacity certification requires environment-specific load testing under synthetic concurrency.

5. **Accepted Residual Dependency Risks**:
   - Transitive `uuid` dependencies within `firebase-admin` contain 8 moderate `npm audit` flags.
   - These are retained as accepted residual risk to avoid breaking changes in the Firebase Admin SDK.

---

## ⚙️ Environment Configuration

Copy `backend/.env.example` to `backend/.env` and configure your settings:

```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/lendwise
JWT_SECRET=your_super_strong_production_secret_at_least_32_chars
REDIS_URL=redis://127.0.0.1:6379
CORS_ORIGIN=http://localhost:5173
```

---

## 🚦 Getting Started

### Local Development

1. **Start Backend**:
   ```bash
   cd backend
   npm install
   npm run dev
   ```

2. **Start Frontend**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

3. **Run Automated Test Suite**:
   ```bash
   cd backend
   npm test
   ```

4. **Run Read-Only Financial Reconciliation Audit**:
   ```bash
   cd backend
   node reconcile_audit.js
   ```

### Docker Deployment

To launch the complete production stack (Backend API, Frontend Nginx SPA, MongoDB, Redis):

```bash
docker-compose up -d --build
```

---

## 🛡️ Database Disaster Recovery Runbook

### Database Hot Backup (`mongodump`)
```bash
mongodump --uri="mongodb://localhost:27017/lendwise" --out=/backups/lendwise_$(date +%Y%m%d_%H%M%S) --gzip
```

### Database Restore Procedure (`mongorestore`)
```bash
mongorestore --uri="mongodb://localhost:27017/lendwise" --dir=/backups/lendwise_YYYYMMDD_HHMMSS/lendwise --drop --gzip
```

### Post-Restore Verification
```bash
cd backend && node reconcile_audit.js
```
