/**
 * Swagger / OpenAPI 3.0 configuration for MicroLend API.
 */

const swaggerJsdoc = require('swagger-jsdoc');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'MicroLend API',
            version: '1.0.0',
            description: 'Production-grade REST API for the MicroLend loan management system. Supports server-side pagination, filtering, sorting, and interest computation.',
            contact: { name: 'MicroLend Team' }
        },
        servers: [
            { url: 'http://localhost:5000', description: 'Development' }
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT'
                }
            },
            schemas: {
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
                        borrowerName: { type: 'string', example: 'John Doe' },
                        principal: { type: 'number', example: 100000 },
                        interestRate: { type: 'number', example: 3 },
                        status: { type: 'string', enum: ['Active', 'Overdue', 'Closed', 'Deleted'] },
                        monthlyInterest: { type: 'number', example: 3000 },
                        totalPayable: { type: 'number', example: 136000 },
                        pendingInterest: { type: 'number', example: 6000 },
                        remainingBalance: { type: 'number', example: 95000 }
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
                    summary: 'Register a new user',
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: ['name', 'phone', 'password', 'role'],
                                    properties: {
                                        name: { type: 'string', example: 'John Doe' },
                                        phone: { type: 'string', example: '9876543210' },
                                        email: { type: 'string', example: 'john@example.com' },
                                        password: { type: 'string', example: 'secret123' },
                                        role: { type: 'string', enum: ['lender', 'borrower'] }
                                    }
                                }
                            }
                        }
                    },
                    responses: {
                        '201': { description: 'User registered successfully' },
                        '400': { description: 'Validation error' }
                    }
                }
            },
            '/api/auth/login': {
                post: {
                    tags: ['Authentication'],
                    summary: 'Login and get JWT token',
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: ['mobileOrEmail', 'password'],
                                    properties: {
                                        mobileOrEmail: { type: 'string', example: '9876543210' },
                                        password: { type: 'string', example: 'secret123' }
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
                                            user: { type: 'object' }
                                        }
                                    }
                                }
                            }
                        },
                        '400': { description: 'Invalid credentials' }
                    }
                }
            },
            '/api/auth/profile': {
                put: {
                    tags: ['Authentication'],
                    summary: 'Update user profile',
                    security: [{ bearerAuth: [] }],
                    requestBody: {
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        name: { type: 'string' },
                                        email: { type: 'string' },
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

            // ── Loans ────────────────────────────────────────────
            '/api/loans': {
                get: {
                    tags: ['Loans'],
                    summary: 'Get paginated, filtered, sorted loans with computed interest',
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        { $ref: '#/components/parameters/Page' },
                        { $ref: '#/components/parameters/Limit' },
                        { $ref: '#/components/parameters/SortBy' },
                        { $ref: '#/components/parameters/Order' },
                        { $ref: '#/components/parameters/Status' },
                        { $ref: '#/components/parameters/Search' },
                        { in: 'query', name: 'startDate', schema: { type: 'string', format: 'date' } },
                        { in: 'query', name: 'endDate', schema: { type: 'string', format: 'date' } }
                    ],
                    responses: {
                        '200': {
                            description: 'Paginated loan list', content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            data: { type: 'array', items: { $ref: '#/components/schemas/Loan' } },
                                            pagination: { $ref: '#/components/schemas/Pagination' }
                                        }
                                    }
                                }
                            }
                        },
                        '401': { description: 'Unauthorized' }
                    }
                },
                post: {
                    tags: ['Loans'],
                    summary: 'Create a new loan (Add Borrower)',
                    security: [{ bearerAuth: [] }],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: ['borrowerName', 'borrowerPhone', 'principalAmount', 'interestRate', 'startDate', 'durationMonths'],
                                    properties: {
                                        borrowerName: { type: 'string', example: 'Jane Smith' },
                                        borrowerPhone: { type: 'string', example: '8888888888' },
                                        borrowerAddress: { type: 'string' },
                                        principalAmount: { type: 'number', example: 100000 },
                                        interestRate: { type: 'number', example: 3 },
                                        startDate: { type: 'string', format: 'date', example: '2025-01-15' },
                                        durationMonths: { type: 'integer', example: 12 },
                                        collateral: { type: 'string' },
                                        notes: { type: 'string' }
                                    }
                                }
                            }
                        }
                    },
                    responses: {
                        '201': { description: 'Loan created' },
                        '400': { description: 'Validation error' }
                    }
                }
            },
            '/api/loans/dashboard': {
                get: {
                    tags: ['Loans'],
                    summary: 'Aggregated dashboard statistics',
                    security: [{ bearerAuth: [] }],
                    responses: {
                        '200': {
                            description: 'Dashboard stats', content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            totalBorrowers: { type: 'integer' },
                                            totalAmountLent: { type: 'number' },
                                            monthlyInterest: { type: 'number' },
                                            pendingPayments: { type: 'integer' },
                                            overdueAccounts: { type: 'integer' },
                                            loanPortfolio: { type: 'array', items: { type: 'object' } },
                                            incomeData: { type: 'array', items: { type: 'object' } }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            '/api/loans/pending': {
                get: {
                    tags: ['Loans'],
                    summary: 'Pending/overdue payments (paginated)',
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        { $ref: '#/components/parameters/Page' },
                        { $ref: '#/components/parameters/Limit' },
                        { $ref: '#/components/parameters/Status' }
                    ],
                    responses: {
                        '200': { description: 'Pending payments list with pagination' }
                    }
                }
            },
            '/api/loans/borrower-history': {
                get: {
                    tags: ['Loans'],
                    summary: 'Soft-deleted borrowers history (paginated)',
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        { $ref: '#/components/parameters/Page' },
                        { $ref: '#/components/parameters/Limit' }
                    ],
                    responses: {
                        '200': { description: 'Borrower history with pagination' }
                    }
                }
            },
            '/api/loans/{id}': {
                get: {
                    tags: ['Loans'],
                    summary: 'Get single loan detail with interest fields',
                    security: [{ bearerAuth: [] }],
                    parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
                    responses: {
                        '200': { description: 'Loan detail' },
                        '404': { description: 'Not found' }
                    }
                },
                put: {
                    tags: ['Loans'],
                    summary: 'Update a loan',
                    security: [{ bearerAuth: [] }],
                    parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
                    requestBody: {
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        status: { type: 'string' },
                                        principalAmount: { type: 'number' },
                                        interestRate: { type: 'number' }
                                    }
                                }
                            }
                        }
                    },
                    responses: {
                        '200': { description: 'Loan updated' },
                        '404': { description: 'Not found' }
                    }
                },
                delete: {
                    tags: ['Loans'],
                    summary: 'Soft-delete a loan',
                    security: [{ bearerAuth: [] }],
                    parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
                    responses: {
                        '200': { description: 'Loan soft-deleted' },
                        '404': { description: 'Not found' }
                    }
                }
            },

            // ── Payments ─────────────────────────────────────────
            '/api/payments': {
                post: {
                    tags: ['Payments'],
                    summary: 'Record a payment',
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
                                        interestPortion: { type: 'number', example: 3000 },
                                        paymentDate: { type: 'string', format: 'date' },
                                        mode: { type: 'string', enum: ['Cash', 'UPI', 'Bank Transfer'], default: 'Cash' }
                                    }
                                }
                            }
                        }
                    },
                    responses: {
                        '201': { description: 'Payment recorded' },
                        '400': { description: 'Validation error' }
                    }
                },
                get: {
                    tags: ['Payments'],
                    summary: 'Paginated payment history',
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        { $ref: '#/components/parameters/Page' },
                        { $ref: '#/components/parameters/Limit' },
                        { $ref: '#/components/parameters/Search' }
                    ],
                    responses: {
                        '200': {
                            description: 'Payment list with pagination', content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            payments: { type: 'array', items: { $ref: '#/components/schemas/Payment' } },
                                            pagination: { $ref: '#/components/schemas/Pagination' }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            '/api/payments/reports': {
                get: {
                    tags: ['Payments'],
                    summary: 'Revenue analytics & reports (aggregation pipeline)',
                    security: [{ bearerAuth: [] }],
                    responses: {
                        '200': {
                            description: 'Analytics data', content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            revenueTrend: { type: 'array', items: { type: 'object' } },
                                            paymentConsistency: { type: 'array', items: { type: 'object' } },
                                            recentTransactions: { type: 'array', items: { type: 'object' } }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    },
    apis: [] // We define paths inline above
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
