/**
 * Deal with order that status has not been accepted ()
 */
import models from '../models/index.js';
import * as service from '../services/budget.service.js';
import { scopeQueryByClassroom } from '../services/order-history.service.js';
import makeLogger from '../logger.js';
const logger = makeLogger(import.meta.url);   // label = [order.controller]

// POST /order/create → student submits an order (status stays pending)
// Budget deduction deferred to confirmation — never deduct optimistically on create
/** JSON BODY
{
  "name": "Monday Lunch",
  "ingreId": [1, 2, 5],
  "qty":     [2, 1, 3]
}
*/
export async function submitOrder(req, res) {
  const { name, ingreId, qty } = req.body;

  if (!name || !Array.isArray(ingreId) || !Array.isArray(qty) || ingreId.length === 0)
    return res.status(400).json({ error: "name, ingreId[], qty[] required" });

  if (ingreId.length !== qty.length)
    return res.status(400).json({ error: "ingreId and qty must be the same length" });

  try {
    const grandTotal = await service.getGrandTotal(ingreId, qty);
    const order = await models.Order.create({
      name,
      ingreId,
      qty,
      grandTotal,
      status: 0,
      userId: req.user.id,
      createdDate: new Date(),
    });

    res.status(201).json(order);
  } catch (error) {
    logger.error("submitOrder failed for user %s: %s", req.user?.id, error.message);
    res.status(500).json({ error: "Failed to create order" });
  }
}

// --- Teacher roles controller

// PATCH /order/:id/status → teacher confirms or cancels a pending order
// Only two valid transitions — confirmed deducts budget, cancelled leaves budget untouched
export async function updateOrderStatus(req, res) {
  const status = Number(req.body.status);

  try {
    const order = await models.Order.findOne(scopeQueryByClassroom(req.user, Number(req.params.id)));
    if (!order) return res.status(404).json({ error: "Order not found" });

    // only confirmed then deduct budget
    if (status === 1) {
      // Deduct budget from student — grandTotal calculated inside service
      await service.confirmAndDeductBudget(order);
    }

    // A cancled budget will refund

    await order.update({ status, lastModified: new Date() });
    res.status(200).json(order); 
  } catch (error) {
    logger.error("order %s status→%s failed: %s", req.params.id, status, error.message);
    res.status(500).json({ error: "Failed to update order status" });
  }
}
