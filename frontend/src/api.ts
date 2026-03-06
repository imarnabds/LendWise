const API_BASE_URL = 'http://localhost:5000/api';

// Get stored JWT token
const getToken = (): string | null => {
    return localStorage.getItem('token');
};

// Set JWT token
export const setToken = (token: string) => {
    localStorage.setItem('token', token);
};

// Remove JWT token
export const removeToken = () => {
    localStorage.removeItem('token');
};

// Generic fetch wrapper with auth headers
const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
    const token = getToken();
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string> || {})
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || 'Something went wrong');
    }

    return data;
};

// ==================== AUTH ====================

export const apiSignup = (body: {
    name: string;
    phone: string;
    email?: string;
    password: string;
    address?: string;
    role: string;
}) => apiFetch('/auth/signup', { method: 'POST', body: JSON.stringify(body) });


export const apiLogin = (body: { mobileOrEmail: string; password: string }) =>
    apiFetch('/auth/login', { method: 'POST', body: JSON.stringify(body) });

export const apiGetMe = () => apiFetch('/auth/me');

export const apiUpdateProfile = (body: { name?: string; email?: string; phone?: string }) =>
    apiFetch('/auth/profile', { method: 'PUT', body: JSON.stringify(body) });

export const apiChangePassword = (body: { currentPassword: string; newPassword: string }) =>
    apiFetch('/auth/password', { method: 'PUT', body: JSON.stringify(body) });

// ==================== LOANS ====================

export const apiCreateLoan = (body: {
    borrowerName: string;
    borrowerPhone: string;
    borrowerAddress?: string;
    principalAmount: number;
    interestRate: number;
    startDate: string;
    durationMonths: number;
    collateral?: string;
    notes?: string;
}) => apiFetch('/loans', { method: 'POST', body: JSON.stringify(body) });

export const apiGetLoans = (params?: { search?: string; status?: string; page?: number; limit?: number; sortBy?: string; order?: string }) => {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.status) query.set('status', params.status);
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.sortBy) query.set('sortBy', params.sortBy);
    if (params?.order) query.set('order', params.order);
    const qs = query.toString();
    return apiFetch(`/loans${qs ? `?${qs}` : ''}`);
};

export const apiGetLoanDashboard = () => apiFetch('/loans/dashboard');

export const apiGetPendingPayments = (status?: string, page?: number, limit?: number) => {
    const query = new URLSearchParams();
    if (status && status !== 'All') query.set('status', status);
    if (page) query.set('page', String(page));
    if (limit) query.set('limit', String(limit));
    const qs = query.toString();
    return apiFetch(`/loans/pending${qs ? `?${qs}` : ''}`);
};

export const apiGetLoan = (id: string) => apiFetch(`/loans/${id}`);

export const apiUpdateLoan = (id: string, body: Record<string, unknown>) =>
    apiFetch(`/loans/${id}`, { method: 'PUT', body: JSON.stringify(body) });

export const apiDeleteLoan = (id: string) =>
    apiFetch(`/loans/${id}`, { method: 'DELETE' });

export const apiGetBorrowerHistory = () => apiFetch('/loans/borrower-history');

// ==================== PAYMENTS ====================

export const apiRecordPayment = (body: {
    loanId: string;
    amount: number;
    interestPortion?: number;
    paymentDate: string;
    mode?: string;
}) => apiFetch('/payments', { method: 'POST', body: JSON.stringify(body) });

export const apiGetPayments = (search?: string, page?: number, limit?: number) => {
    const query = new URLSearchParams();
    if (search) query.set('search', search);
    if (page) query.set('page', String(page));
    if (limit) query.set('limit', String(limit));
    const qs = query.toString();
    return apiFetch(`/payments${qs ? `?${qs}` : ''}`);
};

export const apiGetReports = () => apiFetch('/payments/reports');

// ==================== PHONE VERIFICATION (Dial2Verify) ====================

export const apiInitiatePhoneVerify = (phone: string) =>
    apiFetch('/verify/initiate', { method: 'POST', body: JSON.stringify({ phone }) });

export const apiCheckPhoneVerifyStatus = (sessionId: string) =>
    apiFetch(`/verify/status/${sessionId}`);

export const apiSimulatePhoneVerify = (sessionId: string) =>
    apiFetch(`/verify/simulate/${sessionId}`, { method: 'POST' });
