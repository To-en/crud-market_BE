import { Op, col } from 'sequelize';
import models from '../models/index.js';
import makeLogger from '../logger.js';

const logger = makeLogger(import.meta.url);

const categoryInclude = { model: models.Category, attributes: [] };
const withCategoryName = { include: [[col('category.name'), 'category']] };

// GET /ingredient → all ingredients (paginated)
// req.query always returns strings — parseInt before arithmetic; clamp prevents runaway DB scan
export async function listIngredients(req, res) {
  const page  = Math.max(1,   parseInt(req.query.page)  || 1);
  const limit = Math.min(100, parseInt(req.query.limit) || 15);

  try {
    const { count, rows } = await models.Ingre.findAndCountAll({
      attributes: withCategoryName,
      include: categoryInclude,
      offset: (page - 1) * limit,
      limit,
    });

    res.status(200).json({
      total: count,
      page,
      limit,
      data: rows,
    });
  } catch (error) {
    logger.error("fetch ingredients failed: %s", error.message);
    res.status(500).json({ error: "Failed to fetch ingredients" });
  }
}

// GET /categories → distinct category names, for the market filter bar
export async function listCategories(req, res) {
  try {
    const rows = await models.Category.findAll({ attributes: ['name'], order: [['name', 'ASC']] });
    res.status(200).json(rows.map((r) => r.name));
  } catch (error) {
    logger.error("fetch categories failed: %s", error.message);
    res.status(500).json({ error: "Failed to fetch categories" });
  }
}

// GET /ingredient?category=โปรตีน           → filter by category
// GET /ingredient?q=หมู                     → search by name (case-insensitive)
// GET /ingredient?category=โปรตีน&q=หมู    → both combined
// GET /ingredient?category=โปรตีน&page=2   → filter + paginate
export async function getIngredients(req, res) {
  const { category, q, inStock } = req.query;
  const page  = Math.max(1,   parseInt(req.query.page)  || 1);
  const limit = Math.min(100, parseInt(req.query.limit) || 15);

  const where = {};
  if (q)        where.name = { [Op.iLike]: `%${q}%` };
  if (inStock === 'true') where.stock = { [Op.gt]: 0 };

  try {
    const { count, rows } = await models.Ingre.findAndCountAll({
      where,
      attributes: withCategoryName,
      include: {
        ...categoryInclude,
        where: category ? { name: category } : undefined,
      },
      offset: (page - 1) * limit,
      limit,
    });

    res.status(200).json({
      total: count,
      page,
      limit,
      data: rows,
    });
  } catch (error) {
    logger.error("fetch ingredients failed: %s", error.message);
    res.status(500).json({ error: "Failed to fetch ingredients" });
  }
}

// POST /api/ingre/
/**
request JSON body
{
  "id":     od,
  "Name":   od,
  "qty":    od,
  "price":  od,
  "category": od,
}
 */
export async function createIngredient(req, res) {
  const { name, unit, stock, category } = req.body;
  if (!name || !unit || stock == null || !category)
    return res.status(400).json({ error: "name, unit, stock, category required" });

  try {
    const cat = await models.Category.findOne({ where: { name: category } });
    if (!cat) return res.status(400).json({ error: "Invalid category" });

    const item = await models.Ingre.create({
      name,
      unit,
      stock: Number(stock),
      categoryId: cat.id,
    });
    res.status(201).json({ ...item.toJSON(), category });
  } catch (error) {
    logger.error("create ingredient failed: %s", error.message);
    res.status(500).json({ error: "Failed to create ingredient" });
  }
}

// PUT /api/ingre/id?value=[ ,...]
export async function updateIngredient(req, res) {
  const { name, unit, stock, category } = req.body;
  if (!name || !unit || stock == null || !category)
    return res.status(400).json({ error: "name, unit, stock, category required" });

  try {
    const ingredient = await models.Ingre.findOne({ where: { id: Number(req.params.id) } });
    if (!ingredient) return res.status(404).json({ error: "Ingredient not found" });

    const cat = await models.Category.findOne({ where: { name: category } });
    if (!cat) return res.status(400).json({ error: "Invalid category" });

    await ingredient.update({
      name,
      unit,
      stock: Number(stock),
      categoryId: cat.id,
    });
    res.status(200).json({ ...ingredient.toJSON(), category });
  } catch (error) {
    logger.error("update ingredient %s failed: %s", req.params.id, error.message);
    res.status(500).json({ error: "Failed to update ingredient" });
  }
}

// DEL /api/ingre/id?value=[ ,... ]
export async function deleteIngredient(req, res) {
  try {
    const ingredient = await models.Ingre.findOne({ where: { id: Number(req.params.id) } });
    if (!ingredient) return res.status(404).json({ error: "Ingredient not found" });
    await ingredient.destroy();
    res.status(200).json({ message: "Deleted", ingredient });
  } catch (error) {
    logger.error("delete ingredient %s failed: %s", req.params.id, error.message);
    res.status(500).json({ error: error.message });
  }
}

// Make another one called softdelete which will just marked deleteAt
