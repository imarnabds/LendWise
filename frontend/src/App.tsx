import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { LoanProvider } from './context/LoanContext';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { OfflinePage } from './pages/OfflinePage';

// Layouts (eagerly loaded — always needed for shell)
import { AuthLayout } from './layouts/AuthLayout';
import { DashboardLayout } from './layouts/DashboardLayout';

// Protection (eagerly loaded — always needed)
import { ProtectedRoute, RoleRoute, DashboardRedirect } from './components/ProtectedRoute';

// Landing page (eagerly loaded — first paint for all visitors)
import { Landing } from './pages/Landing';

// ── Lazy-loaded Auth Pages (Firebase SDK pulled in only when navigating to login) ──
const Signup = lazy(() =>
  import('./pages/Auth/Signup').then(m => ({ default: m.Signup }))
);
const Login = lazy(() =>
  import('./pages/Login').then(m => ({ default: m.Login }))
);
const PhoneLogin = lazy(() =>
  import('./pages/Auth/PhoneLogin').then(m => ({ default: m.PhoneLogin }))
);
const ForgotPassword = lazy(() =>
  import('./pages/Auth/ForgotPassword').then(m => ({ default: m.ForgotPassword }))
);

// ── Lazy-loaded Lender Pages ─────────────────────────────────
const LenderDashboard = lazy(() =>
  import('./pages/Lender/LenderDashboard').then(m => ({ default: m.LenderDashboard }))
);
const AddBorrower = lazy(() =>
  import('./pages/Lender/AddBorrower').then(m => ({ default: m.AddBorrower }))
);
const BorrowerList = lazy(() =>
  import('./pages/Lender/BorrowerList').then(m => ({ default: m.BorrowerList }))
);
const PendingPayments = lazy(() =>
  import('./pages/Lender/PendingPayments').then(m => ({ default: m.PendingPayments }))
);
const RecordPayment = lazy(() =>
  import('./pages/Lender/RecordPayment').then(m => ({ default: m.RecordPayment }))
);
const LenderReports = lazy(() =>
  import('./pages/Lender/Reports').then(m => ({ default: m.LenderReports }))
);
const BorrowerHistory = lazy(() =>
  import('./pages/Lender/BorrowerHistory').then(m => ({ default: m.BorrowerHistory }))
);

// ── Lazy-loaded Borrower Pages ────────────────────────────────
const BorrowerDashboard = lazy(() =>
  import('./pages/Borrower/BorrowerDashboard').then(m => ({ default: m.BorrowerDashboard }))
);
const BorrowerMyLoans = lazy(() =>
  import('./pages/Borrower/BorrowerMyLoans').then(m => ({ default: m.BorrowerMyLoans }))
);
const UpcomingDues = lazy(() =>
  import('./pages/Borrower/UpcomingDues').then(m => ({ default: m.UpcomingDues }))
);

// ── Lazy-loaded Shared Pages ─────────────────────────────────
const Settings = lazy(() =>
  import('./pages/Settings/Settings').then(m => ({ default: m.Settings }))
);
const PaymentHistory = lazy(() =>
  import('./pages/Shared/PaymentHistory').then(m => ({ default: m.PaymentHistory }))
);

// ── Lazy-loaded Global AI Bot (heavy) ────────────────────────
const LendWiseAIBot = lazy(() =>
  import('./components/AIBot/LendWiseAIBot').then(m => ({ default: m.LendWiseAIBot }))
);

// ── Page-level loading fallback ──────────────────────────────
const PageLoader: React.FC = () => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      background: '#0f172a',
      color: '#94a3b8',
      fontSize: '1rem',
      gap: '0.75rem'
    }}
  >
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ animation: 'spin 1s linear infinite' }}
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
    Loading…
    <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
  </div>
);

const App: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (!isOnline) {
    return <OfflinePage />;
  }

  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <LoanProvider>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* Public Routes */}
                <Route path="/" element={<Landing />} />

                {/* Auth Routes */}
                <Route element={<AuthLayout />}>
                  <Route path="/signup" element={<Signup />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/phone-login" element={<PhoneLogin />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                </Route>

                {/* Protected Dashboard Routes */}
                <Route element={<ProtectedRoute />}>
                  <Route element={<DashboardLayout />}>
                    {/* Dynamic Dashboard Redirect */}
                    <Route path="/dashboard" element={<DashboardRedirect />} />

                    {/* Lender Specific Routes */}
                    <Route element={<RoleRoute allowedRoles={['lender']} />}>
                      <Route path="/lender/dashboard" element={<LenderDashboard />} />
                      <Route path="/lender/add-borrower" element={<AddBorrower />} />
                      <Route path="/lender/active-loans" element={<BorrowerList />} />
                      <Route path="/lender/pending-payments" element={<PendingPayments />} />
                      <Route path="/lender/history" element={<PaymentHistory />} />
                      <Route path="/lender/record-payment" element={<RecordPayment />} />
                      <Route path="/lender/reports" element={<LenderReports />} />
                      <Route path="/lender/borrower-history" element={<BorrowerHistory />} />
                    </Route>

                    {/* Borrower Specific Routes */}
                    <Route element={<RoleRoute allowedRoles={['borrower']} />}>
                      <Route path="/borrower/dashboard" element={<BorrowerDashboard />} />
                      <Route path="/borrower/my-loans" element={<BorrowerMyLoans />} />
                      <Route path="/borrower/upcoming-dues" element={<UpcomingDues />} />
                      <Route path="/borrower/payment-history" element={<PaymentHistory />} />
                      <Route path="/borrower/reports" element={<LenderReports />} />
                      <Route path="/my-loans" element={<BorrowerMyLoans />} />
                      <Route path="/upcoming-dues" element={<UpcomingDues />} />
                    </Route>

                    {/* Shared Authenticated Routes */}
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/reports" element={<LenderReports />} />
                  </Route>
                </Route>

                {/* Fallback Wildcard */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>

            {/* Global AI Assistant (lazy-loaded) */}
            <Suspense fallback={null}>
              <LendWiseAIBot />
            </Suspense>
          </LoanProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
};

export default App;
