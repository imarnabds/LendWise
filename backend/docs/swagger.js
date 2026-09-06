/**
 * Swagger / OpenAPI 3.0 configuration for LendWise API.
 */

const swaggerJsdoc = require('swagger-jsdoc');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'LendWise API',
            version: '1.0.0',
            description: 'Production-grade REST API for the LendWise loan management platform. Supports server-side pagination, filtering, sorting, APR simple interest computation, and resource-level authorization.',
            contact: { name: 'LendWise Team' }
        },
        servers: [
            { url: 'http://localhost:5000', description: 'Development' }
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                    description: 'Enter your Bearer token issued upon login or signup.'
                }
            },
            schemas: {
                User: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', example: '65f123456789abcdef012345' },
                        name: { type: 'string', example: 'Jane Doe' },
                        phone: { type: 'string', example: '9876543210' },
                        email: { type: 'string', example: 'jane@example.com' },
                        role: { type: 'string', enum: ['LENDER', 'BORROWER'] }
                    }
                },
                Pagination: {
                    type: 'object',
                    properties: {
                        currentPage: { type: 'integer', example: 1 },
                        totalPages: { type: 'integer', example: 10 },
                        totalRecords: { type: 'integer', example: 200 },
                        limit: { type: 'integer', example: 20 }
                    }
                },
                Loan: {
                    type: 'object',
                    properties: {
                        loanId: { type: 'string' },
                        lenderId: { type: 'string' },
                        borrowerId: { type: 'string' },
                        borrowerName: { type: 'string', example: 'John Doe' },
                        borrowerPhone: { type: 'string', example: '9876543210' },
                        principal: { type: 'number', example: 50000 },
                        interestRate: { type: 'number', example: 12 },
                        durationMonths: { type: 'integer', example: 12 },
                        status: { type: 'string', enum: ['Active', 'Overdue', 'Closed', 'Deleted'] },
                        monthlyInterest: { type: 'number', example: 500 },
                        totalInterest: { type: 'number', example: 6000 },
                        totalPayable: { type: 'number', example: 56000 },
                        amountPaid: { type: 'number', example: 0 },
                        remainingBalance: { type: 'number', example: 56000 },
                        emi: { type: 'number', example: 4666.67 }
                    }
                },
                Payment: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        date: { type: 'string', format: 'date' },
                        relatedParty: { type: 'string' },
                        type: { type: 'string' },
                        amount: { type: 'number' },
                        mode: { type: 'string' },
                        status: { type: 'string' },
                        ref: { type: 'string' }
                    }
                },
                Error: {
                    type: 'object',
                    properties: {
                        message: { type: 'string' }
                    }
                }
            },
            parameters: {
                Page: { in: 'query', name: 'page', schema: { type: 'integer', default: 1 }, description: 'Page number' },
                Limit: { in: 'query', name: 'limit', schema: { type: 'integer', default: 20, maximum: 100 }, description: 'Records per page' },
                SortBy: { in: 'query', name: 'sortBy', schema: { type: 'string', default: 'createdAt' }, description: 'Sort field' },
                Order: { in: 'query', name: 'order', schema: { type: 'string', enum: ['asc', 'desc'], default: 'desc' }, description: 'Sort order' },
                Status: { in: 'query', name: 'status', schema: { type: 'string', enum: ['Active', 'Overdue', 'Closed', 'All'] }, description: 'Filter by status' },
                Search: { in: 'query', name: 'search', schema: { type: 'string' }, description: 'Search by borrower name' }
            }
        },
        paths: {
            // ── Auth ─────────────────────────────────────────────
            '/api/auth/signup': {
                post: {
                    tags: ['Authentication'],
                    summary: 'Register a new user account',
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: ['name', 'phone', 'password', 'role'],
                                    properties: {
                                        name: { type: 'string', example: 'Jane Doe' },
                                        phone: { type: 'string', example: '9876543210' },
                                        email: { type: 'string', example: 'jane@example.com' },
                                        password: { type: 'string', example: 'securepassword123' },
                                        role: { type: 'string', enum: ['LENDER', 'BORROWER'], example: 'LENDER' }
                                    }
                                }
                            }
                        }
                    },
                    responses: {
                        '201': { description: 'User registered successfully' },
                        '400': { description: 'Validation error (invalid role or missing required field)' },
                        '409': { description: 'Conflict: User with this phone/email already exists' }
                    }
                }
            },
            '/api/auth/login': {
                post: {
                    tags: ['Authentication'],
                    summary: 'Login and receive JWT token',
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: ['mobileOrEmail', 'password'],
                                    properties: {
                                        mobileOrEmail: { type: 'string', example: '9876543210' },
                                        password: { type: 'string', example: 'securepassword123' }
                                    }
                                }
                            }
                        }
                    },
                    responses: {
                        '200': {
                            description: 'Login successful', content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            token: { type: 'string' },
                                            user: { $ref: '#/components/schemas/User' }
                                        }
                                    }
                                }
                            }
                        },
                        '401': { description: 'Invalid credentials' }
                    }
                }
            },
            '/api/auth/me': {
                get: {
                    tags: ['Authentication'],
                    summary: 'Get current authenticated user profile',
                    security: [{ bearerAuth: [] }],
                    responses: {
                        '200': { description: 'User profile data' },
                        '401': { description: 'Unauthorized' }
                    }
                }
            },
            '/api/auth/profile': {
                put: {
                    tags: ['Authentication'],
                    summary: 'Update user profile (allowed fields: name, email, phone, address)',
                    security: [{ bearerAuth: [] }],
                    requestBody: {
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        name: { type: 'string' },
                                        email: { type: 'string' },
                                        phone: { type: 'string' },
                                        address: { type: 'string' }
                                    }
                                }
                            }
                        }
                    },
                    responses: {
                        '200': { description: 'Profile updated' },
                        '401': { description: 'Unauthorized' }
                    }
                }
            },
            '/api/auth/password': {
                put: {
                    tags: ['Authentication'],
                    summary: 'Change password',
                    security: [{ bearerAuth: [] }],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: ['currentPassword', 'newPassword'],
                                    properties: {
                                        currentPassword: { type: 'string' },
                                        newPassword: { type: 'string', minLength: 8 }
                                    }
                                }
                            }
                        }
                    },
                    responses: {
                        '200': { description: 'Password changed successfully' },
                        '400': { description: 'Incorrect current password or weak new password' },
                        '401': { description: 'Unauthorized' }
                    }
                }
            },

            // ── Loans ────────────────────────────────────────────
            '/api/loans': {
                get: {
                    tags: ['Loans'],
                    summary: 'Get paginated loans (scoped to authenticated Lender or Borrower)',
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        { $ref: '#/components/parameters/Page' },
                        { $ref: '#/components/parameters/Limit' },
                        { $ref: '#/components/parameters/SortBy' },
                        { $ref: '#/components/parameters/Order' },
                        { $ref: '#/components/parameters/Status' },
                        { $ref: '#/components/parameters/Search' }
                    ],
                    responses: {
                        '200': { description: 'Paginated loan list' },
                        '401': { description: 'Unauthorized' }
                    }
                },
                post: {
                    tags: ['Loans'],
                    summary: 'Create a new loan (Requires existing Borrower user)',
                    security: [{ bearerAuth: [] }],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: ['borrowerPhone', 'principalAmount', 'interestRate', 'startDate', 'durationMonths'],
                                    properties: {
                                        borrowerId: { type: 'string' },
                                        borrowerName: { type: 'string', example: 'Jane Smith' },
                                        borrowerPhone: { type: 'string', example: '8888888888' },
                                        principalAmount: { type: 'number', example: 50000 },
                                        interestRate: { type: 'number', example: 12 },
                                        startDate: { type: 'string', format: 'date', example: '2026-01-01' },
                                        durationMonths: { type: 'integer', example: 12 }
                                    }
                                }
                            }
                        }
                    },
                    responses: {
                        '201': { description: 'Loan created' },
                        '404': { description: 'Borrower user not found' }
                    }
                }
            },
            '/api/loans/{id}': {
                get: {
                    tags: ['Loans'],
                    summary: 'Get single loan detail (Authorized for Lender or Borrower)',
                    security: [{ bearerAuth: [] }],
                    parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
                    responses: {
                        '200': { description: 'Loan detail' },
                        '403': { description: 'Forbidden — Not a party to this loan' },
                        '404': { description: 'Not found' }
                    }
                },
                put: {
                    tags: ['Loans'],
                    summary: 'Update loan metadata (Lender Only)',
                    security: [{ bearerAuth: [] }],
                    parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
                    responses: {
                        '200': { description: 'Loan updated' },
                        '403': { description: 'Forbidden — Borrower cannot update metadata' }
                    }
                },
                delete: {
                    tags: ['Loans'],
                    summary: 'Soft-delete loan (Lender Only)',
                    security: [{ bearerAuth: [] }],
                    parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
                    responses: {
                        '200': { description: 'Loan soft-deleted' },
                        '403': { description: 'Forbidden — Borrower cannot delete loan' }
                    }
                }
            },

            // ── Payments ─────────────────────────────────────────
            '/api/payments': {
                get: {
                    tags: ['Payments'],
                    summary: 'Get paginated payment history (Scoped to authenticated Lender or Borrower)',
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        { $ref: '#/components/parameters/Page' },
                        { $ref: '#/components/parameters/Limit' },
                        { $ref: '#/components/parameters/Search' }
                    ],
                    responses: {
                        '200': { description: 'Paginated payment list' },
                        '401': { description: 'Unauthorized' }
                    }
                },
                post: {
                    tags: ['Payments'],
                    summary: 'Record a payment (Authorized for Lender or Borrower of loan)',
                    security: [{ bearerAuth: [] }],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: ['loanId', 'amount', 'paymentDate'],
                                    properties: {
                                        loanId: { type: 'string' },
                                        amount: { type: 'number', example: 5000 },
                                        principalPortion: { type: 'number', example: 4000 },
                                        interestPortion: { type: 'number', example: 1000 },
                                        paymentDate: { type: 'string', format: 'date' },
                                        mode: { type: 'string', enum: ['Cash', 'UPI', 'Bank Transfer', 'Cheque'], default: 'Cash' }
                                    }
                                }
                            }
                        }
                    },
                    responses: {
                        '201': { description: 'Payment recorded successfully' },
                        '400': { description: 'Overpayment, allocation mismatch, or deleted/closed loan error' },
                        '403': { description: 'Forbidden — Not a party to this loan' }
                    }
                }
            },
            '/api/payments/{id}': {
                get: {
                    tags: ['Payments'],
                    summary: 'Get single payment detail (Authorized for Lender or Borrower of associated loan)',
                    security: [{ bearerAuth: [] }],
                    parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
                    responses: {
                        '200': { description: 'Payment detail' },
                        '403': { description: 'Forbidden — Not a party to the loan associated with this payment' },
                        '404': { description: 'Payment or associated loan not found' }
                    }
                }
            }
        }
    },
    apis: []
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
