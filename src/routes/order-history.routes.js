/**
 * @swagger
 * tags:
 *   - name: Order History
 *     description: Past orders — view, search, edit, export.
 *
 * /api/order:
 *   get:
 *     tags: [Order History]
 *     summary: List past orders (paginated)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, example: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, example: 20, maximum: 100 }
 *     responses:
 *       200:
 *         description: Paginated order list, scoped by role (student=own, teacher=class, admin=all)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total: { type: integer }
 *                 page:  { type: integer }
 *                 limit: { type: integer }
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/OrderSummary'
 *
 * /api/order/search:
 *   get:
 *     tags: [Order History]
 *     summary: Search past orders by name or ID
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: value
 *         required: true
 *         schema: { type: string }
 *         description: Search keyword (matches name) or numeric order ID
 *       - in: query
 *         name: page
 *         schema: { type: integer, example: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, example: 20, maximum: 100 }
 *     responses:
 *       200:
 *         description: Matching orders
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total: { type: integer }
 *                 page:  { type: integer }
 *                 limit: { type: integer }
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/OrderSummary'
 *       400:
 *         description: query param 'value' required
 *
 * /api/order/{id}:
 *   get:
 *     tags: [Order History]
 *     summary: Get full order bill detail
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Order with expanded line items (items[] populated)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Order'
 *       404:
 *         description: Order not found
 *
 * /api/order/{id}/edit:
 *   patch:
 *     tags: [Order History]
 *     summary: Edit pending order
 *     description: Only allowed while order status is 0 (pending) — returns 403 once confirmed or cancelled
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:    { type: string }
 *               ingreId: { type: array, items: { type: integer }, example: [1, 3] }
 *               qty:     { type: array, items: { type: integer }, example: [2, 5] }
 *     responses:
 *       200:
 *         description: Updated order
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Order'
 *       400:
 *         description: ingreId and qty arrays must be same length
 *       403:
 *         description: Order already confirmed or cancelled — cannot edit
 *       404:
 *         description: Order not found
 *
 * /api/order/{id}/export:
 *   get:
 *     tags: [Order History]
 *     summary: Export order bill as CSV
 *     description: PDF export is not yet implemented. Only csv is supported.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *       - in: query
 *         name: format
 *         schema: { type: string, enum: [csv], default: csv }
 *     responses:
 *       200:
 *         description: CSV file download
 *         content:
 *           text/csv:
 *             schema: { type: string, format: binary }
 *       400:
 *         description: Unsupported export format
 *       404:
 *         description: Order not found
 *
 * /api/order/{id}/delete:
 *   delete:
 *     tags: [Order History]
 *     summary: Delete order from history (teacher/admin only)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Deleted — returns confirmation message
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: Deleted }
 *       404:
 *         description: Order not found
 */
import { Router } from 'express';
import { requireRole } from '../middleware/auth.middleware.js';
import * as controller from '../controllers/order-history.controller.js';
const router = Router();

// THese route serve on separate page
router.get('/order',                    controller.listOrders);
router.get('/order/search',             controller.searchOrder);
router.get('/order/:id',                                  controller.openOrderBill);
router.patch('/order/:id/edit',         controller.editOrder);
router.get('/order/:id/export',                           controller.exportOrderBill);
router.delete('/order/:id/delete', requireRole(1, 2), controller.deleteOrder);
// Teacher would only see their assigned class , but requireOwnership is a guardrail just in case

export default router;
