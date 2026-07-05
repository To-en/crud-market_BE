import { Op } from 'sequelize'
import models from '../models/index.js';
import * as service from '../services/order-history.service.js'
const { scopeQueryByClassroom } = service;
import makeLogger from '../logger.js';

const logger = makeLogger(import.meta.url);

// Flatten a list/search row: lift joined User into flat owner/classroom so the
// FE gets a stable shape regardless of role (nested User omitted). null when unscoped.
function flattenOrderRow(row) {
  const o = row.toJSON();
  return {
    id: o.id,
    name: o.name,
    status: o.status,
    grandTotal: o.grandTotal,
    createdDate: o.createdDate,
    owner: o.user?.username ?? null,      // nested key = default belongsTo alias (model name "users" → "user")
    classroom: o.user?.class ?? null,
  };
}

// GET /order?page=1&limit=20 → paginated order list, scoped by role
// scopeQueryByClassroom injects where+include so students only see own orders, teachers see their class
export async function listOrders(req, res) {
  const page   = Math.max(1,   parseInt(req.query.page)  || 1);
  const limit  = Math.min(100, parseInt(req.query.limit) || 20);
  logger.debug("listOrders auth user: %j", {
    id: req.user?.id,
    role: req.user?.role,
    class: req.user?.class,
  });
  const { where, include } = scopeQueryByClassroom(req.user);

  try {
    const { count, rows } = await models.Order.findAndCountAll({
      attributes: ['id', 'name', 'status', 'grandTotal', 'createdDate', 'userId'], // userId (FK) required so belongsTo(User) join maps; dropped by flattenOrderRow
      where: { ...where, deleteAt: null },
      include,
      order: [['createdDate','DESC'],['id','DESC']],
      limit,
      offset: (page - 1) * limit,
    });
    res.status(200).json({ total: count, page, limit, data: rows.map(flattenOrderRow) });
  } catch (error) {
    logger.error("listOrders failed: %s", error.message);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
}

// GET /order/search?value=&page=1&limit=20 → search by name or id, same role scope as listOrders
// numericId guard avoids passing a float or NaN to the id clause
export async function searchOrder(req, res) {
  const { value } = req.query;
  if (!value) return res.status(400).json({ error: "query param 'value' required" });

  const page  = Math.max(1,   parseInt(req.query.page)  || 1);
  const limit = Math.min(100, parseInt(req.query.limit) || 20);
  const numericId = Number(value);
  const { where: scopeWhere, include } = scopeQueryByClassroom(req.user);

  const where = {
    ...scopeWhere,
    deleteAt: null,
    [Op.or]: [
      { name: { [Op.iLike]: `%${value}%` } },
      ...(Number.isInteger(numericId) && numericId > 0 ? [{ id: numericId }] : []),
    ],
  };

  try {
    const { count, rows } = await models.Order.findAndCountAll({
      attributes: ['id', 'name', 'status', 'grandTotal', 'createdDate', 'userId'], // userId (FK) required so belongsTo(User) join maps; dropped by flattenOrderRow
      where,
      include,
      order: [['createdDate', 'DESC'], ['id', 'DESC']],
      limit,
      offset: (page - 1) * limit,
    });
    res.status(200).json({ total: count, page, limit, data: rows.map(flattenOrderRow) });
  } catch (error) {
    logger.error("searchOrder failed: %s", error.message);
    res.status(500).json({ error: "Search failed" });
  }
}

// PATCH /order/:id/edit → student edits a pending order in-place
// status !== 0 means already confirmed/cancelled — immutable after that point
export async function editOrder(req, res) {
  try {
    const order = await models.Order.findOne(scopeQueryByClassroom(req.user, Number(req.params.id)));
    if (!order) return res.status(404).json({ error: "Order not found" });
    if (order.status !== 0)
      return res.status(403).json({ error: "Order cannot be edited after it has been confirmed" });

    const { name, ingreId, qty } = req.body;

    if (ingreId !== undefined && qty !== undefined && ingreId.length !== qty.length)
      return res.status(400).json({ error: "ingreId and qty must be the same length" });

    await order.update({
      ...(name    !== undefined && { name }),
      ...(ingreId !== undefined && { ingreId }),
      ...(qty     !== undefined && { qty }),
      lastModified: new Date(),
    });

    res.status(200).json(order);
  } catch (error) {
    logger.error("editOrder %s failed: %s", req.params.id, error.message);
    res.status(500).json({ error: "Failed to update order" });
  }
}

// GET /order/:id → full bill view with per-line subtotals
// ingreId[i] and qty[i] are parallel arrays — ingMap converts them to keyed lookup for O(1) access
export async function openOrderBill(req, res) {
  try {
    const order = await models.Order.findOne(scopeQueryByClassroom(req.user, Number(req.params.id)));
    if (!order) return res.status(404).json({ error: "Order not found" });

    // Fetch all ingredients in this order by their ids
    const ingredients = await models.Ingre.findAll({
      where: { id: { [Op.in]: order.ingreId } },
    });

    // Converts arrays into object keyed (Dict like)
    // ingredients array (from DB)
      // [{ id: 1, name: 'หมูกรอบ' }, { id: 5, name: 'ไข่ไก่' }]
    // after Object.fromEntries(...)
      // { 1: { id: 1, name: 'หมูกรอบ' }, 5: { id: 5, name: 'ไข่ไก่' } }
    const ingMap = Object.fromEntries(ingredients.map(i => [i.id, i]));

    // Build line items — ingreId[i] matches qty[i] by index
    const items = order.ingreId.map((id, idx) => {
      const ing = ingMap[id];
      return {
        ingredientId: id,
        name:      ing?.name,
        unit:      ing?.unit,
        unitPrice: ing?.unitPrice,
        qty:       order.qty[idx],
        subtotal:  (ing?.unitPrice ?? 0) * order.qty[idx],
      };
    });

    res.status(200).json({ ...order.toJSON(), items });
  } catch (error) {
    logger.error("openOrderBill %s failed: %s", req.params.id, error.message);
    res.status(500).json({ error: "Failed to fetch order bill" });
  }
}

// GET /order/:id/export?format=pdf|csv → download bill as csv (pdf not yet implemented)
// csv is the only supported format; anything else returns 400 rather than silently hanging
export async function exportOrderBill(req, res) {
  const format = req.query.format ?? 'csv';

  try {
    const order = await models.Order.findOne(scopeQueryByClassroom(req.user, Number(req.params.id)));
    if (!order) return res.status(404).json({ error: "Order not found" });
    const ingredients = await models.Ingre.findAll({
      where: { id: { [Op.in]: order.ingreId } },
    });

    const ingMap = Object.fromEntries(ingredients.map(i => [i.id, i]));

    const items = order.ingreId.map((id, idx) => {
      const ing = ingMap[id];
      return {
        name:  ing?.name ?? id,
        qty:   order.qty[idx],
        unit:  ing?.unit ?? '-',
        price: ing?.unitPrice ?? 0,
      };
    });

    const billData = {
      schoolName:  'Ingredient Market School',
      invoiceNo:   `ORD-${order.id}`,
      date:        new Date(order.createdDate).toLocaleDateString('th-TH'),
      department:  '-',
      items,
      total:       order.grandTotal ?? items.reduce((sum, i) => sum + i.price * i.qty, 0),
    };

    if (format === 'csv') {
      const csv = await service.exportOrderCSV(billData);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=order-${order.id}.csv`);
      return res.send(csv);
    }
    if (format === 'pdf') {
      const pdf = await service.exportPDF(billData);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=order-${order.id}.pdf`);
      return res.send(pdf);
    }

    res.status(400).json({ error: "Unsupported export format" });
  } catch (error) {
    logger.error("exportOrderBill %s failed: %s", req.params.id, error.message);
    res.status(500).json({ error: "Failed to export order bill" });
  }
}

// DEL /order/:id/delete → hard delete; role scope prevents students from deleting others' orders
export async function deleteOrder(req, res) {
  try {
    const queryId = req.query.id === undefined ? null : Number(req.query.id);
    if (queryId !== null && !Number.isInteger(queryId))
      return res.status(400).json({ error: 'id must be a number' });

    const scope = scopeQueryByClassroom(req.user, queryId);
    const orders = await models.Order.findAll({
      ...scope,
      where: { ...scope.where, deleteAt: { [Op.not]: null } },
    });

    if (queryId !== null && orders.length === 0)
      return res.status(404).json({ error: 'Order not found' });

    await Promise.all(orders.map(order => order.destroy()));
    res.status(200).json({ message: 'Deleted' });
  } catch (error) {
    logger.error("deleteOrder %s failed: %s", req.params.id, error.message);
    res.status(500).json({ error: 'Failed to delete order' });
  }
}

// PATCH /order/:id/delete → soft delete; role scope prevents students from deleting others' orders
export async function softDeleteOrder(req, res) {
  try {
    const order = await models.Order.findOne(scopeQueryByClassroom(req.user, Number(req.params.id)));
    if (!order) return res.status(404).json({ error: 'Order not found' });
    await order.update({ deleteAt: new Date() });
    res.status(200).json({ message: 'Deleted' });
  } catch (error) {
    logger.error("softDeleteOrder %s failed: %s", req.params.id, error.message);
    res.status(500).json({ error: 'Failed to delete order' });
  }
}
