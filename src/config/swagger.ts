import { OpenAPIV3 } from 'openapi-types';

const bearer: OpenAPIV3.SecurityRequirementObject = { bearerAuth: [] };

const uuidParam = (name: string): OpenAPIV3.ParameterObject => ({
    name,
    in: 'path',
    required: true,
    schema: { type: 'string', format: 'uuid' },
});

const spec: OpenAPIV3.Document = {
    openapi: '3.0.3',
    info: {
        title: 'GreenMind API',
        version: '1.0.0',
        description:
            'GreenMind Backend – complete API documentation.\n\n' +
            '**Authentication**: All protected routes require a JWT Bearer token.\n' +
            'Obtain it from `POST /api/auth/login/email`.',
    },
    servers: [{ url: '/api', description: 'API prefix' }],
    components: {
        securitySchemes: {
            bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        },
        schemas: {
            UserProfile: {
                type: 'object',
                properties: {
                    id: { type: 'string', format: 'uuid' },
                    username: { type: 'string' },
                    email: { type: 'string', format: 'email' },
                    fullName: { type: 'string' },
                    gender: { type: 'string' },
                    role: { type: 'string' },
                    dateOfBirth: { type: 'string', format: 'date-time' },
                    createdAt: { type: 'string', format: 'date-time' },
                },
            },
            Location: {
                type: 'object',
                properties: {
                    id: { type: 'string', format: 'uuid' },
                    latitude: { type: 'number' },
                    longitude: { type: 'number' },
                    address: { type: 'string' },
                    type: { type: 'string', example: 'tracking' },
                    createdAt: { type: 'string', format: 'date-time' },
                },
            },
            Todo: {
                type: 'object',
                properties: {
                    id: { type: 'string', format: 'uuid' },
                    title: { type: 'string' },
                    completed: { type: 'boolean' },
                    order: { type: 'integer' },
                    parent_id: { type: 'string', format: 'uuid', nullable: true },
                    createdAt: { type: 'string', format: 'date-time' },
                },
            },
            Invoice: {
                type: 'object',
                properties: {
                    id: { type: 'string', format: 'uuid' },
                    doc: { type: 'object', properties: { source_id: { type: 'string' }, currency: { type: 'string' }, payment_method: { type: 'string' }, notes: { type: 'string' } } },
                    vendor: { type: 'object', properties: { name: { type: 'string' }, address: { type: 'string' }, geo_hint: { type: 'string' } } },
                    datetime: { type: 'object', properties: { date: { type: 'string' }, time: { type: 'string' } } },
                    items: { type: 'array', items: { type: 'object' } },
                    totals: { type: 'object', properties: { subtotal: { type: 'number' }, discount: { type: 'number' }, tax: { type: 'number' }, grand_total: { type: 'number' } } },
                    createdAt: { type: 'string', format: 'date-time' },
                },
            },
            WasteReport: {
                type: 'object',
                properties: {
                    id: { type: 'string', format: 'uuid' },
                    householdId: { type: 'string', format: 'uuid' },
                    description: { type: 'string' },
                    imageKey: { type: 'string' },
                    imageUrl: { type: 'string', format: 'uri' },
                    lat: { type: 'number' },
                    lng: { type: 'number' },
                    status: { type: 'string', enum: ['PENDING', 'ASSIGNED', 'RESOLVED', 'REJECTED'] },
                    assignedCollectorId: { type: 'string', format: 'uuid', nullable: true },
                    createdAt: { type: 'string', format: 'date-time' },
                },
            },
            WasteCollection: {
                type: 'object',
                properties: {
                    id: { type: 'string', format: 'uuid' },
                    collectorId: { type: 'string', format: 'uuid' },
                    householdId: { type: 'string', format: 'uuid', nullable: true },
                    status: { type: 'string', enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] },
                    collectedAt: { type: 'string', format: 'date-time', nullable: true },
                    lat: { type: 'number' },
                    lng: { type: 'number' },
                    createdAt: { type: 'string', format: 'date-time' },
                },
            },
            Error: {
                type: 'object',
                properties: { message: { type: 'string' } },
            },
        },
    },
    paths: {
        // ─────────────────────────── AUTH ────────────────────────────────────
        '/auth/register/email': {
            post: {
                tags: ['Auth'],
                summary: 'Register with email & password',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['username', 'email', 'password', 'dateOfBirth'],
                                properties: {
                                    username: { type: 'string' },
                                    email: { type: 'string', format: 'email' },
                                    password: { type: 'string', format: 'password' },
                                    fullName: { type: 'string' },
                                    gender: { type: 'string' },
                                    dateOfBirth: { type: 'string', format: 'date-time' },
                                },
                            },
                        },
                    },
                },
                responses: {
                    '201': { description: 'User created successfully' },
                    '400': { description: 'Validation error' },
                },
            },
        },
        '/auth/login/email': {
            post: {
                tags: ['Auth'],
                summary: 'Login with email & password',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['email', 'password'],
                                properties: {
                                    email: { type: 'string', format: 'email' },
                                    password: { type: 'string', format: 'password' },
                                },
                            },
                        },
                    },
                },
                responses: {
                    '200': { description: 'Login success – returns access_token' },
                    '401': { description: 'Invalid credentials' },
                },
            },
        },
        '/auth/login/google': {
            post: {
                tags: ['Auth'],
                summary: 'Login with Google ID token',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['idToken'],
                                properties: { idToken: { type: 'string' } },
                            },
                        },
                    },
                },
                responses: {
                    '200': { description: 'Login success – returns access_token' },
                    '401': { description: 'Invalid Google token' },
                },
            },
        },
        '/auth/profile': {
            get: {
                tags: ['Auth'],
                summary: 'Get my profile',
                security: [bearer],
                responses: {
                    '200': { description: 'User profile', content: { 'application/json': { schema: { $ref: '#/components/schemas/UserProfile' } } } },
                    '401': { description: 'Unauthorized' },
                },
            },
        },
        '/auth/logout': {
            post: {
                tags: ['Auth'],
                summary: 'Logout (revoke token)',
                security: [bearer],
                responses: { '200': { description: 'Logged out' }, '401': { description: 'Unauthorized' } },
            },
        },
        '/auth/get-alls': {
            get: {
                tags: ['Auth'],
                summary: 'Get all users (admin only)',
                security: [bearer],
                responses: {
                    '200': { description: 'Array of users', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/UserProfile' } } } } },
                    '401': { description: 'Unauthorized' },
                    '403': { description: 'Forbidden – admin only' },
                },
            },
        },

        // ──────────────────────── LOCATIONS ──────────────────────────────────
        '/locations': {
            post: {
                tags: ['Locations'],
                summary: 'Create a location tracking point',
                security: [bearer],
                requestBody: {
                    required: true,
                    content: { 'application/json': { schema: { type: 'object', properties: { latitude: { type: 'number' }, longitude: { type: 'number' }, address: { type: 'string' }, type: { type: 'string' } } } } },
                },
                responses: { '201': { description: 'Location created' }, '401': { description: 'Unauthorized' } },
            },
            get: {
                tags: ['Locations'],
                summary: 'Get all my locations',
                security: [bearer],
                responses: { '200': { description: 'Array of locations', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Location' } } } } }, '401': { description: 'Unauthorized' } },
            },
        },
        '/locations/latest': {
            get: { tags: ['Locations'], summary: 'Get latest location', security: [bearer], responses: { '200': { description: 'Latest location' }, '401': { description: 'Unauthorized' } } },
        },
        '/locations/distanceToday': {
            get: { tags: ['Locations'], summary: 'Get distance traveled today', security: [bearer], responses: { '200': { description: 'Distance in km' }, '401': { description: 'Unauthorized' } } },
        },
        '/locations/{id}': {
            get: { tags: ['Locations'], summary: 'Get location by ID', security: [bearer], parameters: [uuidParam('id')], responses: { '200': { description: 'Location' }, '401': { description: 'Unauthorized' }, '404': { description: 'Not found' } } },
            put: { tags: ['Locations'], summary: 'Update location', security: [bearer], parameters: [uuidParam('id')], requestBody: { content: { 'application/json': { schema: { type: 'object' } } } }, responses: { '200': { description: 'Updated' }, '401': { description: 'Unauthorized' } } },
            delete: { tags: ['Locations'], summary: 'Delete location', security: [bearer], parameters: [uuidParam('id')], responses: { '200': { description: 'Deleted' }, '401': { description: 'Unauthorized' } } },
        },

        // ─────────────────────────── TODOS ───────────────────────────────────
        '/todos': {
            post: {
                tags: ['Todos'],
                summary: 'Create a todo',
                security: [bearer],
                requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['title'], properties: { title: { type: 'string' }, parent_id: { type: 'string', format: 'uuid' }, order: { type: 'integer' } } } } } },
                responses: { '201': { description: 'Created', content: { 'application/json': { schema: { $ref: '#/components/schemas/Todo' } } } }, '401': { description: 'Unauthorized' } },
            },
            get: { tags: ['Todos'], summary: 'Get all todos', security: [bearer], responses: { '200': { description: 'Todo list', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Todo' } } } } }, '401': { description: 'Unauthorized' } } },
        },
        '/todos/batch': {
            post: { tags: ['Todos'], summary: 'Create multiple todos', security: [bearer], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { todos: { type: 'array', items: { type: 'object', properties: { title: { type: 'string' } } } } } } } } }, responses: { '201': { description: 'Created' }, '401': { description: 'Unauthorized' } } },
        },
        '/todos/{id}': {
            get: { tags: ['Todos'], summary: 'Get todo by ID', security: [bearer], parameters: [uuidParam('id')], responses: { '200': { description: 'Todo' }, '404': { description: 'Not found' } } },
            put: { tags: ['Todos'], summary: 'Update todo', security: [bearer], parameters: [uuidParam('id')], requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { title: { type: 'string' }, completed: { type: 'boolean' } } } } } }, responses: { '200': { description: 'Updated' } } },
            delete: { tags: ['Todos'], summary: 'Delete todo', security: [bearer], parameters: [uuidParam('id')], responses: { '200': { description: 'Deleted' } } },
        },
        '/todos/{id}/toggle': {
            patch: { tags: ['Todos'], summary: 'Toggle todo completed', security: [bearer], parameters: [uuidParam('id')], responses: { '200': { description: 'Toggled' } } },
        },

        // ─────────────────────────── CHECKINS ────────────────────────────────
        '/checkins': {
            post: { tags: ['Checkins'], summary: 'Create checkin', security: [bearer], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } }, responses: { '201': { description: 'Created' }, '401': { description: 'Unauthorized' } } },
            get: { tags: ['Checkins'], summary: 'Get checkins', security: [bearer], responses: { '200': { description: 'List' }, '401': { description: 'Unauthorized' } } },
        },
        '/checkins/{id}': {
            put: { tags: ['Checkins'], summary: 'Update checkin', security: [bearer], parameters: [uuidParam('id')], requestBody: { content: { 'application/json': { schema: { type: 'object' } } } }, responses: { '200': { description: 'Updated' } } },
            delete: { tags: ['Checkins'], summary: 'Delete checkin', security: [bearer], parameters: [uuidParam('id')], responses: { '200': { description: 'Deleted' } } },
        },
        '/checkins/get-checkins-by-period': {
            get: { tags: ['Checkins'], summary: 'Get checkins by period', security: [bearer], parameters: [{ name: 'startDate', in: 'query', schema: { type: 'string', format: 'date' } }, { name: 'endDate', in: 'query', schema: { type: 'string', format: 'date' } }], responses: { '200': { description: 'Filtered checkins' } } },
        },
        '/checkins/get-checkins-by-params': {
            get: { tags: ['Checkins'], summary: 'Get checkins by params', security: [bearer], responses: { '200': { description: 'Filtered checkins' } } },
        },

        // ─────────────────────────── DAILY SPENDING ──────────────────────────
        '/daily-spending': {
            get: { tags: ['Daily Spending'], summary: 'Get average daily spend', security: [bearer], responses: { '200': { description: 'Spend data' } } },
            post: {
                tags: ['Daily Spending'],
                summary: 'Create or update spend',
                security: [bearer],
                requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { amount: { type: 'number' } } } } } },
                responses: { '200': { description: 'Updated' } },
            },
        },
        '/daily-spending/average-daily': {
            post: { tags: ['Daily Spending'], summary: 'Create or update average daily', security: [bearer], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } }, responses: { '200': { description: 'Updated' } } },
        },

        // ─────────────────────────── BRANDS ──────────────────────────────────
        '/brands': {
            post: {
                tags: ['Brands'],
                summary: 'Add brand records',
                security: [bearer],
                requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { brands: { type: 'array', items: { type: 'string' } }, startDay: { type: 'string', format: 'date-time' } } } } } },
                responses: { '201': { description: 'Created' }, '401': { description: 'Unauthorized' } },
            },
        },

        // ─────────────────────────── OCR / INVOICES ──────────────────────────
        '/ocr': {
            post: {
                tags: ['OCR / Invoices'],
                summary: 'Process bill image via OCR (auto-saves invoice)',
                security: [bearer],
                requestBody: { required: true, content: { 'multipart/form-data': { schema: { type: 'object', required: ['file'], properties: { file: { type: 'string', format: 'binary' } } } } } },
                responses: { '200': { description: 'OCR result + saved invoice', content: { 'application/json': { schema: { $ref: '#/components/schemas/Invoice' } } } }, '400': { description: 'File required' }, '401': { description: 'Unauthorized' } },
            },
        },
        '/ocr/invoices': {
            get: { tags: ['OCR / Invoices'], summary: 'List my invoices', security: [bearer], responses: { '200': { description: 'Invoices', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Invoice' } } } } }, '401': { description: 'Unauthorized' } } },
        },

        // ─────────────────────────── HEALTHY FOOD ────────────────────────────
        '/healthy-food-ratio': {
            post: {
                tags: ['Healthy Food'],
                summary: 'Analyze image for healthy food ratio',
                security: [bearer],
                requestBody: { required: true, content: { 'multipart/form-data': { schema: { type: 'object', required: ['file'], properties: { file: { type: 'string', format: 'binary' } } } } } },
                responses: { '200': { description: 'Analysis result' }, '401': { description: 'Unauthorized' } },
            },
        },

        // ─────────────────────────── METRICS ─────────────────────────────────
        '/metrics/avg-daily-spend': { get: { tags: ['Metrics'], summary: 'Avg daily spend metric', security: [bearer], responses: { '200': { description: 'Metric' } } }, post: { tags: ['Metrics'], summary: 'Update avg daily spend', security: [bearer], requestBody: { content: { 'application/json': { schema: { type: 'object' } } } }, responses: { '200': { description: 'Updated' } } } },
        '/metrics/spend-variability': { get: { tags: ['Metrics'], summary: 'Spend variability metric', security: [bearer], responses: { '200': { description: 'Metric' } } }, post: { tags: ['Metrics'], summary: 'Update spend variability', security: [bearer], requestBody: { content: { 'application/json': { schema: { type: 'object' } } } }, responses: { '200': { description: 'Updated' } } } },
        '/metrics/brand-novelty': { get: { tags: ['Metrics'], summary: 'Brand novelty metric', security: [bearer], responses: { '200': { description: 'Metric' } } }, post: { tags: ['Metrics'], summary: 'Update brand novelty', security: [bearer], requestBody: { content: { 'application/json': { schema: { type: 'object' } } } }, responses: { '200': { description: 'Updated' } } } },
        '/metrics/list-adherence': { get: { tags: ['Metrics'], summary: 'List adherence metric', security: [bearer], responses: { '200': { description: 'Metric' } } }, post: { tags: ['Metrics'], summary: 'Update list adherence', security: [bearer], requestBody: { content: { 'application/json': { schema: { type: 'object' } } } }, responses: { '200': { description: 'Updated' } } } },
        '/metrics/daily-distance-km': { get: { tags: ['Metrics'], summary: 'Daily distance km metric', security: [bearer], responses: { '200': { description: 'Metric' } } }, post: { tags: ['Metrics'], summary: 'Update daily distance km', security: [bearer], requestBody: { content: { 'application/json': { schema: { type: 'object' } } } }, responses: { '200': { description: 'Updated' } } } },
        '/metrics/novel-location-ratio': { get: { tags: ['Metrics'], summary: 'Novel location ratio metric', security: [bearer], responses: { '200': { description: 'Metric' } } }, post: { tags: ['Metrics'], summary: 'Update novel location ratio', security: [bearer], requestBody: { content: { 'application/json': { schema: { type: 'object' } } } }, responses: { '200': { description: 'Updated' } } } },
        '/metrics/public-transit-ratio': { get: { tags: ['Metrics'], summary: 'Public transit ratio metric', security: [bearer], responses: { '200': { description: 'Metric' } } }, post: { tags: ['Metrics'], summary: 'Update public transit ratio', security: [bearer], requestBody: { content: { 'application/json': { schema: { type: 'object' } } } }, responses: { '200': { description: 'Updated' } } } },
        '/metrics/night-out-freq': { get: { tags: ['Metrics'], summary: 'Night out frequency metric', security: [bearer], responses: { '200': { description: 'Metric' } } }, post: { tags: ['Metrics'], summary: 'Count night out', security: [bearer], requestBody: { content: { 'application/json': { schema: { type: 'object' } } } }, responses: { '200': { description: 'Updated' } } } },

        // ─────────────────────────── MEDIA ───────────────────────────────────
        '/media/upload': {
            post: {
                tags: ['Media'],
                summary: 'Upload image to Cloudflare R2 (bill photo, etc.)',
                security: [bearer],
                requestBody: { required: true, content: { 'multipart/form-data': { schema: { type: 'object', required: ['file'], properties: { file: { type: 'string', format: 'binary' } } } } } },
                responses: {
                    '200': { description: 'Upload success', content: { 'application/json': { schema: { type: 'object', properties: { imageKey: { type: 'string', example: 'bills/uid/uuid.jpg' }, imageUrl: { type: 'string', format: 'uri' } } } } } },
                    '400': { description: 'File required or wrong type' },
                    '401': { description: 'Unauthorized' },
                },
            },
        },

        // ─────────────────────────── WASTE REPORTS ───────────────────────────
        '/waste-reports': {
            post: {
                tags: ['Waste Reports'],
                summary: 'Create a waste report',
                security: [bearer],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['householdId'],
                                properties: {
                                    householdId: { type: 'string', format: 'uuid' },
                                    description: { type: 'string' },
                                    imageKey: { type: 'string', description: 'Key returned from POST /media/upload' },
                                    lat: { type: 'number' },
                                    lng: { type: 'number' },
                                },
                            },
                        },
                    },
                },
                responses: {
                    '201': { description: 'Created', content: { 'application/json': { schema: { $ref: '#/components/schemas/WasteReport' } } } },
                    '400': { description: 'householdId required' },
                    '401': { description: 'Unauthorized' },
                    '404': { description: 'Household not found' },
                },
            },
        },
        '/waste-reports/household/{householdId}': {
            get: {
                tags: ['Waste Reports'],
                summary: 'List reports for a household',
                security: [bearer],
                parameters: [uuidParam('householdId')],
                responses: { '200': { description: 'Reports', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/WasteReport' } } } } }, '401': { description: 'Unauthorized' } },
            },
        },
        '/waste-reports/urban-area/{urbanAreaId}': {
            get: {
                tags: ['Waste Reports'],
                summary: 'Aggregate reports for an urban area (all households)',
                security: [bearer],
                parameters: [uuidParam('urbanAreaId')],
                responses: {
                    '200': {
                        description: 'Aggregate result',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        urbanAreaId: { type: 'string' },
                                        totalReports: { type: 'integer' },
                                        byStatus: { type: 'object', properties: { PENDING: { type: 'integer' }, ASSIGNED: { type: 'integer' }, RESOLVED: { type: 'integer' }, REJECTED: { type: 'integer' } } },
                                        reports: { type: 'array', items: { $ref: '#/components/schemas/WasteReport' } },
                                    },
                                },
                            },
                        },
                    },
                    '401': { description: 'Unauthorized' },
                },
            },
        },
        '/waste-reports/{id}/status': {
            patch: {
                tags: ['Waste Reports'],
                summary: 'Update report status',
                security: [bearer],
                parameters: [uuidParam('id')],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['status'],
                                properties: {
                                    status: { type: 'string', enum: ['PENDING', 'ASSIGNED', 'RESOLVED', 'REJECTED'] },
                                    assignedCollectorId: { type: 'string', format: 'uuid', description: 'Required when status = ASSIGNED' },
                                },
                            },
                        },
                    },
                },
                responses: { '200': { description: 'Updated report', content: { 'application/json': { schema: { $ref: '#/components/schemas/WasteReport' } } } }, '400': { description: 'Invalid status' }, '401': { description: 'Unauthorized' }, '404': { description: 'Not found' } },
            },
        },

        // ─────────────────────────── WASTE COLLECTIONS ───────────────────────
        '/waste-collections': {
            post: {
                tags: ['Waste Collections'],
                summary: 'Create a waste collection record',
                security: [bearer],
                requestBody: {
                    required: true,
                    content: { 'application/json': { schema: { type: 'object', properties: { householdId: { type: 'string', format: 'uuid' }, lat: { type: 'number' }, lng: { type: 'number' } } } } },
                },
                responses: { '201': { description: 'Created', content: { 'application/json': { schema: { $ref: '#/components/schemas/WasteCollection' } } } }, '401': { description: 'Unauthorized' }, '404': { description: 'Household not found' } },
            },
            get: {
                tags: ['Waste Collections'],
                summary: 'List my collections (as collector)',
                security: [bearer],
                responses: { '200': { description: 'Collections', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/WasteCollection' } } } } }, '401': { description: 'Unauthorized' } },
            },
        },
        '/waste-collections/{id}': {
            get: {
                tags: ['Waste Collections'],
                summary: 'Get a collection by ID',
                security: [bearer],
                parameters: [uuidParam('id')],
                responses: { '200': { description: 'Collection', content: { 'application/json': { schema: { $ref: '#/components/schemas/WasteCollection' } } } }, '401': { description: 'Unauthorized' }, '404': { description: 'Not found' } },
            },
            patch: {
                tags: ['Waste Collections'],
                summary: 'Update status / collectedAt',
                security: [bearer],
                parameters: [uuidParam('id')],
                requestBody: {
                    required: true,
                    content: { 'application/json': { schema: { type: 'object', properties: { status: { type: 'string', enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] }, collectedAt: { type: 'string', format: 'date-time' } } } } },
                },
                responses: { '200': { description: 'Updated', content: { 'application/json': { schema: { $ref: '#/components/schemas/WasteCollection' } } } }, '400': { description: 'Invalid status' }, '401': { description: 'Unauthorized' }, '404': { description: 'Not found' } },
            },
        },

        // ─────────────────────────── QUESTIONS ───────────────────────────────
        '/questions': {
            post: { tags: ['Questions'], summary: 'Create a question (staff/admin)', security: [bearer], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { question: { type: 'string' }, templateId: { type: 'string' } } } } } }, responses: { '201': { description: 'Created' }, '401': { description: 'Unauthorized' }, '403': { description: 'Forbidden' } } },
            get: { tags: ['Questions'], summary: 'Get all questions', security: [bearer], responses: { '200': { description: 'List of questions' }, '401': { description: 'Unauthorized' } } },
        },
        '/questions/createQuestions': {
            post: { tags: ['Questions'], summary: 'Bulk create questions (staff/admin)', security: [bearer], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { questions: { type: 'array', items: { type: 'object' } } } } } } }, responses: { '201': { description: 'Created' }, '403': { description: 'Forbidden' } } },
        },
        '/questions/survey-verify': {
            post: { tags: ['Questions'], summary: 'Verify survey answers (no auth)', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } }, responses: { '200': { description: 'Verification result' } } },
        },
        '/questions/survey': {
            get: { tags: ['Questions'], summary: 'Get survey questions based on user location & age', security: [bearer], responses: { '200': { description: 'Survey questions' }, '401': { description: 'Unauthorized' } } },
        },
        '/questions/my-questions': {
            get: { tags: ['Questions'], summary: 'Get my questions', security: [bearer], responses: { '200': { description: 'Questions owned by me' }, '401': { description: 'Unauthorized' } } },
        },
        '/questions/template/{templateId}': {
            get: { tags: ['Questions'], summary: 'Get questions by template ID', security: [bearer], parameters: [{ name: 'templateId', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Questions' }, '401': { description: 'Unauthorized' } } },
        },
        '/questions/owner/{ownerId}': {
            get: { tags: ['Questions'], summary: 'Get questions by owner ID', security: [bearer], parameters: [uuidParam('ownerId')], responses: { '200': { description: 'Questions' }, '401': { description: 'Unauthorized' } } },
        },
        '/questions/{id}': {
            get: { tags: ['Questions'], summary: 'Get question by ID', security: [bearer], parameters: [uuidParam('id')], responses: { '200': { description: 'Question' }, '404': { description: 'Not found' } } },
            put: { tags: ['Questions'], summary: 'Update question (staff/admin)', security: [bearer], parameters: [uuidParam('id')], requestBody: { content: { 'application/json': { schema: { type: 'object' } } } }, responses: { '200': { description: 'Updated' }, '403': { description: 'Forbidden' } } },
            delete: { tags: ['Questions'], summary: 'Delete question (admin)', security: [bearer], parameters: [uuidParam('id')], responses: { '200': { description: 'Deleted' }, '403': { description: 'Forbidden' } } },
        },

        // ─────────────────────────── QUESTION SETS ───────────────────────────
        '/question-sets': {
            post: { tags: ['Question Sets'], summary: 'Create question set (staff/admin)', security: [bearer], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { name: { type: 'string' }, description: { type: 'string' } } } } } }, responses: { '201': { description: 'Created' }, '403': { description: 'Forbidden' } } },
            get: { tags: ['Question Sets'], summary: 'Get all question sets (staff/admin)', security: [bearer], responses: { '200': { description: 'List' }, '403': { description: 'Forbidden' } } },
        },
        '/question-sets/my-sets': {
            get: { tags: ['Question Sets'], summary: 'Get my question sets', security: [bearer], responses: { '200': { description: 'My sets' } } },
        },
        '/question-sets/owner/{ownerId}': {
            get: { tags: ['Question Sets'], summary: 'Get question sets by owner', security: [bearer], parameters: [uuidParam('ownerId')], responses: { '200': { description: 'Sets' } } },
        },
        '/question-sets/{id}': {
            get: { tags: ['Question Sets'], summary: 'Get question set by ID', security: [bearer], parameters: [uuidParam('id')], responses: { '200': { description: 'Set' }, '404': { description: 'Not found' } } },
            put: { tags: ['Question Sets'], summary: 'Update question set', security: [bearer], parameters: [uuidParam('id')], requestBody: { content: { 'application/json': { schema: { type: 'object' } } } }, responses: { '200': { description: 'Updated' } } },
            delete: { tags: ['Question Sets'], summary: 'Delete question set', security: [bearer], parameters: [uuidParam('id')], responses: { '200': { description: 'Deleted' } } },
        },

        // ─────────────────────────── TEMPLATES ───────────────────────────────
        '/templates/create': {
            post: { tags: ['Templates'], summary: 'Create a template', security: [bearer], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { name: { type: 'string' }, prompt: { type: 'string' }, intent: { type: 'string' } } } } } }, responses: { '201': { description: 'Created' }, '401': { description: 'Unauthorized' } } },
        },
        '/templates/createTemplates': {
            post: { tags: ['Templates'], summary: 'Bulk create templates', security: [bearer], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { templates: { type: 'array', items: { type: 'object' } } } } } } }, responses: { '201': { description: 'Created' } } },
        },
        '/templates/getAll': {
            get: { tags: ['Templates'], summary: 'Get all templates', security: [bearer], responses: { '200': { description: 'Templates list' } } },
        },
        '/templates/getById/{id}': {
            get: { tags: ['Templates'], summary: 'Get template by ID', security: [bearer], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Template' }, '404': { description: 'Not found' } } },
        },
        '/templates/update': {
            put: { tags: ['Templates'], summary: 'Update template', security: [bearer], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } }, responses: { '200': { description: 'Updated' } } },
        },
        '/templates/delete/{id}': {
            delete: { tags: ['Templates'], summary: 'Delete template by ID', security: [bearer], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Deleted' } } },
        },

        // ─────────────────────────── BIG FIVE ────────────────────────────────
        '/big-five': {
            post: { tags: ['Big Five'], summary: 'Submit Big Five personality assessment', security: [bearer], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { openness: { type: 'number' }, conscientiousness: { type: 'number' }, extraversion: { type: 'number' }, agreeableness: { type: 'number' }, neuroticism: { type: 'number' } } } } } }, responses: { '201': { description: 'Submitted' }, '401': { description: 'Unauthorized' } } },
            get: { tags: ['Big Five'], summary: 'Get all Big Five records (admin)', security: [bearer], responses: { '200': { description: 'All records' }, '403': { description: 'Forbidden' } } },
        },
        '/big-five/user/{userId}': {
            get: { tags: ['Big Five'], summary: 'Get Big Five by user ID', security: [bearer], parameters: [uuidParam('userId')], responses: { '200': { description: 'Big Five data' }, '404': { description: 'Not found' } } },
            put: { tags: ['Big Five'], summary: 'Update Big Five for user', security: [bearer], parameters: [uuidParam('userId')], requestBody: { content: { 'application/json': { schema: { type: 'object' } } } }, responses: { '200': { description: 'Updated' } } },
            delete: { tags: ['Big Five'], summary: 'Delete Big Five for user', security: [bearer], parameters: [uuidParam('userId')], responses: { '200': { description: 'Deleted' } } },
        },

        // ─────────────────────────── BEHAVIORS ───────────────────────────────
        '/behaviors': {
            post: { tags: ['Behaviors'], summary: 'Create behavior (staff/admin)', security: [bearer], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { name: { type: 'string' }, type: { type: 'string' }, keywords: { type: 'array', items: { type: 'string' } } } } } } }, responses: { '201': { description: 'Created' }, '403': { description: 'Forbidden' } } },
            get: { tags: ['Behaviors'], summary: 'Get all behaviors', security: [bearer], responses: { '200': { description: 'List' } } },
        },
        '/behaviors/{id}': {
            get: { tags: ['Behaviors'], summary: 'Get behavior by ID', security: [bearer], parameters: [uuidParam('id')], responses: { '200': { description: 'Behavior' }, '404': { description: 'Not found' } } },
            put: { tags: ['Behaviors'], summary: 'Update behavior (staff/admin)', security: [bearer], parameters: [uuidParam('id')], requestBody: { content: { 'application/json': { schema: { type: 'object' } } } }, responses: { '200': { description: 'Updated' }, '403': { description: 'Forbidden' } } },
            delete: { tags: ['Behaviors'], summary: 'Delete behavior (admin)', security: [bearer], parameters: [uuidParam('id')], responses: { '200': { description: 'Deleted' }, '403': { description: 'Forbidden' } } },
        },

        // ─────────────────────────── BEHAVIOR FEEDBACKS ──────────────────────
        '/behavior-feedbacks': {
            get: { tags: ['Behavior Feedbacks'], summary: 'Get all behavior feedbacks', security: [bearer], responses: { '200': { description: 'All feedbacks' } } },
        },
        '/behavior-feedbacks/users': {
            get: { tags: ['Behavior Feedbacks'], summary: 'Get mechanism feedbacks for all users', security: [bearer], responses: { '200': { description: 'Feedbacks' } } },
        },
        '/behavior-feedbacks/user/{userId}': {
            get: { tags: ['Behavior Feedbacks'], summary: 'Get mechanism feedbacks by user', security: [bearer], parameters: [uuidParam('userId')], responses: { '200': { description: 'Feedbacks' } } },
        },
        '/behavior-feedbacks/model/{modelId}': {
            get: { tags: ['Behavior Feedbacks'], summary: 'Get mechanism feedbacks by model', security: [bearer], parameters: [uuidParam('modelId')], responses: { '200': { description: 'Feedbacks' } } },
        },

        // ─────────────────────────── USER ANSWERS ────────────────────────────
        '/user-answers': {
            post: { tags: ['User Answers'], summary: 'Create a user answer', security: [bearer], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { questionId: { type: 'string', format: 'uuid' }, answer: { type: 'string' } } } } } }, responses: { '201': { description: 'Created' } } },
            get: { tags: ['User Answers'], summary: 'Get all user answers (admin)', security: [bearer], responses: { '200': { description: 'All answers' }, '403': { description: 'Forbidden' } } },
        },
        '/user-answers/submit': {
            post: { tags: ['User Answers'], summary: 'Submit multiple user answers at once', security: [bearer], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { answers: { type: 'array', items: { type: 'object', properties: { questionId: { type: 'string', format: 'uuid' }, answer: { type: 'string' } } } } } } } } }, responses: { '200': { description: 'Submitted' } } },
        },
        '/user-answers/get-user-answer-by-id/{questionId}': {
            get: { tags: ['User Answers'], summary: 'Get my answer for a question', security: [bearer], parameters: [uuidParam('questionId')], responses: { '200': { description: 'Answer' }, '404': { description: 'Not found' } } },
        },
        '/user-answers/user/{userId}': {
            get: { tags: ['User Answers'], summary: 'Get all answers by user ID', security: [bearer], parameters: [uuidParam('userId')], responses: { '200': { description: 'Answers' } } },
        },
        '/user-answers/question/{questionId}': {
            get: { tags: ['User Answers'], summary: 'Get all answers for a question (staff/admin)', security: [bearer], parameters: [uuidParam('questionId')], responses: { '200': { description: 'Answers' }, '403': { description: 'Forbidden' } } },
        },
        '/user-answers/{userId}/{questionId}': {
            put: { tags: ['User Answers'], summary: 'Update user answer', security: [bearer], parameters: [uuidParam('userId'), uuidParam('questionId')], requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { answer: { type: 'string' } } } } } }, responses: { '200': { description: 'Updated' } } },
            delete: { tags: ['User Answers'], summary: 'Delete user answer', security: [bearer], parameters: [uuidParam('userId'), uuidParam('questionId')], responses: { '200': { description: 'Deleted' } } },
        },

        // ─────────────────────────── SURVEY SCENARIOS ────────────────────────
        '/scenarios-survey/get-survey-scenario': {
            get: { tags: ['Survey Scenarios'], summary: 'Get all survey scenarios', security: [bearer], responses: { '200': { description: 'Scenarios' } } },
        },
        '/scenarios-survey/create-survey-scenario': {
            post: { tags: ['Survey Scenarios'], summary: 'Create a survey scenario', security: [bearer], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { min_age: { type: 'integer' }, max_age: { type: 'integer' }, location: { type: 'array', items: { type: 'string' } }, percentage: { type: 'integer' }, gender: { type: 'string' }, questionSetId: { type: 'string', format: 'uuid' } } } } } }, responses: { '201': { description: 'Created' } } },
        },
        '/scenarios-survey/attach-question/{id}': {
            put: { tags: ['Survey Scenarios'], summary: 'Attach questions to scenario', security: [bearer], parameters: [uuidParam('id')], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { questionIds: { type: 'array', items: { type: 'string', format: 'uuid' } } } } } } }, responses: { '200': { description: 'Attached' } } },
        },
        '/scenarios-survey/delete-survey-scenarios/{id}': {
            delete: { tags: ['Survey Scenarios'], summary: 'Delete survey scenario', security: [bearer], parameters: [uuidParam('id')], responses: { '200': { description: 'Deleted' } } },
        },
        '/scenarios-survey/simulate-scenario/{id}': {
            post: { tags: ['Survey Scenarios'], summary: 'Simulate a scenario (assign to users)', security: [bearer], parameters: [uuidParam('id')], responses: { '200': { description: 'Simulation result' } } },
        },
        '/scenarios-survey/get-simulated/{id}': {
            get: { tags: ['Survey Scenarios'], summary: 'Get simulated scenario details', security: [bearer], parameters: [uuidParam('id')], responses: { '200': { description: 'Simulated details' } } },
        },
        '/scenarios-survey/get-all-simulated-scenarios': {
            get: { tags: ['Survey Scenarios'], summary: 'Get all simulated scenarios', security: [bearer], responses: { '200': { description: 'All simulated scenarios' } } },
        },
        '/scenarios-survey/get-user-survey-question': {
            get: { tags: ['Survey Scenarios'], summary: 'Get survey questions assigned to current user', security: [bearer], responses: { '200': { description: 'Questions' } } },
        },
        '/scenarios-survey/get-user-question-set-survey': {
            get: { tags: ['Survey Scenarios'], summary: 'Get question set surveys assigned to user', security: [bearer], responses: { '200': { description: 'Question sets' } } },
        },
        '/scenarios-survey/get-all-user-question': {
            get: { tags: ['Survey Scenarios'], summary: 'Get all questions assigned to current user', security: [bearer], responses: { '200': { description: 'Questions' } } },
        },

        // ─────────────────────────── MODELS ──────────────────────────────────
        '/models/create': {
            post: { tags: ['Models'], summary: 'Create a behavior model', security: [bearer], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } }, responses: { '201': { description: 'Created' }, '401': { description: 'Unauthorized' } } },
        },
        '/models/getAll': {
            get: { tags: ['Models'], summary: 'Get all models', security: [bearer], responses: { '200': { description: 'Models list' } } },
        },
        '/models/feedbacks': {
            get: { tags: ['Models'], summary: 'Get all feedbacks (no auth required)', responses: { '200': { description: 'Feedbacks' } } },
        },
        '/models/{id}': {
            get: { tags: ['Models'], summary: 'Get model by ID', security: [bearer], parameters: [uuidParam('id')], responses: { '200': { description: 'Model' }, '404': { description: 'Not found' } } },
        },
        '/models/{id}/feedbacks': {
            get: { tags: ['Models'], summary: 'Get feedbacks by model ID (no auth required)', parameters: [uuidParam('id')], responses: { '200': { description: 'Feedbacks' } } },
        },

        // ─────────────────────────── PRE-APP SURVEY ──────────────────────────
        '/pre-app-survey': {
            get: { tags: ['Pre-App Survey'], summary: 'Get all pre-app surveys (admin)', security: [bearer], responses: { '200': { description: 'All surveys' }, '403': { description: 'Forbidden' } } },
        },
        '/pre-app-survey/submit': {
            post: {
                tags: ['Pre-App Survey'],
                summary: 'Submit or update pre-app survey',
                security: [bearer],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    daily_spending: { type: 'number', description: 'Average daily spending (VND)' },
                                    spending_variation: { type: 'integer', description: '1–5 scale' },
                                    brand_trial: { type: 'integer', description: '1–5 scale' },
                                    shopping_list: { type: 'integer', description: '1–5 scale' },
                                    daily_distance: { type: 'number', description: 'km' },
                                    new_places: { type: 'integer', description: '1–5 scale' },
                                    public_transport: { type: 'integer', description: '1–5 scale' },
                                    stable_schedule: { type: 'integer', description: '1–5 scale' },
                                    night_outings: { type: 'integer', description: '1–5 scale' },
                                    healthy_eating: { type: 'integer', description: '1–5 scale' },
                                    social_media: { type: 'integer', description: '1–5 scale' },
                                    goal_setting: { type: 'integer', description: '1–5 scale' },
                                    mood_swings: { type: 'integer', description: '1–5 scale' },
                                },
                            },
                        },
                    },
                },
                responses: { '200': { description: 'Survey submitted / updated' }, '401': { description: 'Unauthorized' } },
            },
        },
        '/pre-app-survey/parameters': {
            put: { tags: ['Pre-App Survey'], summary: 'Update survey parameters (sigmoid, weight, direction, alpha)', security: [bearer], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } }, responses: { '200': { description: 'Updated' } } },
        },
        '/pre-app-survey/{userId}': {
            get: { tags: ['Pre-App Survey'], summary: 'Get pre-app survey by user ID', security: [bearer], parameters: [uuidParam('userId')], responses: { '200': { description: 'Survey data' }, '404': { description: 'Not found' } } },
            delete: { tags: ['Pre-App Survey'], summary: 'Delete pre-app survey', security: [bearer], parameters: [uuidParam('userId')], responses: { '200': { description: 'Deleted' } } },
        },
    },
};

export default spec;
