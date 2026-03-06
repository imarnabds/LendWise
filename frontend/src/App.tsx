import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { LoanProvider } from './context/LoanContext';

// Layouts
import { AuthLayout } from './layouts/AuthLayout';
import { DashboardLayout } from './layouts/DashboardLayout';

// Pages
import { Landing } from './pages/Landing';
import { Signup } from './pages/Auth/Signup';
import { Login } from './pages/Auth/Login';

// Lender Pages
import { LenderDashboard } from './pages/Lender/LenderDashboard';
import { AddBorrower } from './pages/Lender/AddBorrower';
import { BorrowerList } from './pages/Lender/BorrowerList';
import { PendingPayments } from './pages/Lender/PendingPayments';
import { RecordPayment } from './pages/Lender/RecordPayment';
import { LenderReports } from './pages/Lender/Reports';
import { BorrowerHistory } from './pages/Lender/BorrowerHistory';

// Borrower Pages
import { BorrowerDashboard } from './pages/Borrower/BorrowerDashboard';

// Shared
import { Settings } from './pages/Settings/Settings';
import { PaymentHistory } from './pages/Shared/PaymentHistory';

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <LoanProvider>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Landing />} />

              {/* Auth Routes */}
              <Route element={<AuthLayout />}>
                <Route path="/signup" element={<Signup />} />
                <Route path="/login" element={<Login />} />
              </Route>

              {/* Protected Dashboard Routes */}
              <Route element={<DashboardLayout />}>
                {/* Lender Routes */}
                <Route path="/lender/dashboard" element={<LenderDashboard />} />
                <Route path="/lender/add-borrower" element={<AddBorrower />} />
                <Route path="/lender/active-loans" element={<BorrowerList />} />
                <Route path="/lender/pending-payments" element={<PendingPayments />} />
                <Route path="/lender/history" element={<PaymentHistory />} />
                <Route path="/lender/record-payment" element={<RecordPayment />} />
                <Route path="/lender/reports" element={<LenderReports />} />
                <Route path="/lender/borrower-history" element={<BorrowerHistory />} />
                <Route path="/lender/notifications" element={<Navigate to="/lender/dashboard" replace />} /> {/* Placeholder */}

                {/* Borrower Routes */}
                <Route path="/borrower/dashboard" element={<BorrowerDashboard />} />
                <Route path="/borrower/my-loans" element={<BorrowerDashboard />} /> {/* Placeholder reusing dash */}
                <Route path="/borrower/payment-history" element={<PaymentHistory />} />
                <Route path="/borrower/upcoming-dues" element={<Navigate to="/borrower/dashboard" replace />} />
                <Route path="/borrower/notifications" element={<Navigate to="/borrower/dashboard" replace />} />

                {/* Shared Routes */}
                <Route path="/settings" element={<Settings />} />
                <Route path="/dashboard" element={<Navigate to="/" replace />} />
              </Route>

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </LoanProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
};

export default App;
