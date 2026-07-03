import swaggerJsdoc from 'swagger-jsdoc';

const PORT = process.env.PORT || 3000;

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Ingredient Market API',
      version: '1.0.0',
      description: 'API for high school students to order cooking ingredients',
    },
    servers: [{ url: `http://localhost:${PORT}` }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        Ingredient: {
          type: 'object',
          properties: {
            id:        { type: 'integer' },
            name:      { type: 'string', example: 'Tomato' },
            unitPrice: { type: 'number', example: 12.5 },
            unit:      { type: 'string', example: 'kg' },
            stock:     { type: 'integer', example: 100 },
            category:  { type: 'string', example: 'Vegetable' },
            imageUrl:  { type: 'string', example: 'https://...' },
          },
        },
        OrderItem: {
          type: 'object',
          description: 'Expanded line item returned by GET /order/:id',
          properties: {
            ingredientId: { type: 'integer' },
            name:         { type: 'string' },
            unit:         { type: 'string' },
            unitPrice:    { type: 'number' },
            qty:          { type: 'integer' },
            subtotal:     { type: 'number' },
          },
        },
        Order: {
          type: 'object',
          properties: {
            id:          { type: 'integer' },
            name:        { type: 'string', example: 'Monday Lunch' },
            status:      { type: 'string', enum: ['confirmed', 'cancelled'], description: '0 (integer) while pending, string after teacher action' },
            ingreId:     { type: 'array', items: { type: 'integer' }, example: [1, 2, 5] },
            qty:         { type: 'array', items: { type: 'integer' }, example: [2, 1, 3] },
            grandTotal:  { type: 'number' },
            userId:      { type: 'integer' },
            createdDate: { type: 'string', format: 'date-time' },
            items:       { type: 'array', items: { $ref: '#/components/schemas/OrderItem' }, description: 'Populated only on GET /order/:id' },
          },
        },
        OrderSummary: {
          type: 'object',
          description: 'Row shape for GET /order and /order/search. owner/classroom populated by role scope (admin=both, teacher=classroom, student=null).',
          properties: {
            id:          { type: 'integer' },
            name:        { type: 'string', example: 'Monday Lunch' },
            status:      { type: 'integer', example: 0, description: '0 pending, 1 approved, 2 cancelled' },
            grandTotal:  { type: 'number' },
            createdDate: { type: 'string', format: 'date-time' },
            username:       { type: 'string', nullable: true, description: 'Order owner username (admin scope only)' },
            classroom:   { type: 'string', nullable: true, description: 'Owner classroom (admin/teacher scope)' },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./src/routes/*.js'],
};

export const swaggerSpec = swaggerJsdoc(options);