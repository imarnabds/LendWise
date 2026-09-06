const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Get stored JWT token (checks localStorage then sessionStorage)
export const getToken = (): string | null => {
    return localStorage.getItem('token') || sessionStorage.getItem('token');
};

// Set JWT token (localStorage if rememberMe is true, sessionStorage if false)
export const setToken = (token: string, rememberMe: boolean = true) => {
    if (rememberMe) {
        localStorage.setItem('token', token);
        sessionStorage.removeItem('token');
    } else {
        sessionStorage.setItem('token', token);
        localStorage.removeItem('token');
    }
};

// Remove JWT token from all storage locations
export const removeToken = () => {
    localStorage.removeItem('token');
    sessionStorage.removeItem('token');
};

// Generic fetch wrapper with auth headers & resilient response parsing
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

    const contentType = response.headers.get('content-type') || '';
    let data: any = {};

    if (contentType.includes('application/json')) {
        try {
            data = await response.json();
        } catch {
            data = { message: 'Invalid JSON response received from server' };
        }
    } else {
        const text = await response.text();
        if (import.meta.env.DEV) {
            console.warn(`[apiFetch] Non-JSON response received for ${endpoint} (${response.status}):`, text.slice(0, 200));
        }
        data = { message: response.ok ? text : `Server error (${response.status}): Unable to process request` };
    }

    if (!response.ok) {
        // If status is 401 and it's not a login attempt, dispatch global auth expiration event
        if (response.status === 401 && !endpoint.includes('/auth/login')) {
            window.dispatchEvent(new CustomEvent('lendwise-auth-expired'));
        }
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

export const apiUpdateProfile = (body: { name?: string; email?: string; phone?: string; address?: string; emailNotifications?: boolean }) =>
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

export const apiGetLoanDashboard = (timeframe?: string) => {
    const qs = timeframe ? `?timeframe=${timeframe}` : '';
    return apiFetch(`/loans/dashboard${qs}`);
};

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
    principalPortion?: number;
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

// ==================== FIREBASE PHONE AUTH ====================

export const apiFirebasePhoneAuth = (body: {
    idToken: string;
    role?: string;
    name?: string;
    countryCode?: string;
}) => apiFetch('/auth/firebase-phone', { method: 'POST', body: JSON.stringify(body) });

// ==================== FIREBASE GOOGLE AUTH ====================

export const apiFirebaseGoogleAuth = (body: {
    idToken: string;
    role?: string;
}) => apiFetch('/auth/firebase-google', { method: 'POST', body: JSON.stringify(body) });

// ==================== AI ASSISTANT ====================

export const apiSendChatMessage = (message: string) =>
    apiFetch('/ai/chat', { method: 'POST', body: JSON.stringify({ message }) });

// ==================== REPORTS DOWNLOAD ====================

export const apiDownloadReportPdf = async (): Promise<Blob> => {
    const token = getToken();
    const response = await fetch(`${API_BASE_URL}/reports/pdf`, {
        headers: {
            Authorization: token ? `Bearer ${token}` : ''
        }
    });
    if (!response.ok) {
        if (response.status === 401) {
            window.dispatchEvent(new CustomEvent('lendwise-auth-expired'));
        }
        let msg = 'Failed to download PDF report';
        try {
            const data = await response.json();
            msg = data.message || msg;
        } catch { /* silent */ }
        throw new Error(msg);
    }
    return response.blob();
};

export const apiDownloadReportExcel = async (): Promise<Blob> => {
    const token = getToken();
    const response = await fetch(`${API_BASE_URL}/reports/excel`, {
        headers: {
            Authorization: token ? `Bearer ${token}` : ''
        }
    });
    if (!response.ok) {
        if (response.status === 401) {
            window.dispatchEvent(new CustomEvent('lendwise-auth-expired'));
        }
        let msg = 'Failed to download Excel report';
        try {
            const data = await response.json();
            msg = data.message || msg;
        } catch { /* silent */ }
        throw new Error(msg);
    }
    return response.blob();
};
