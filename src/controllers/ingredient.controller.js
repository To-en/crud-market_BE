import { Op, col } from 'sequelize';
import models from '../models/index.js';
import makeLogger from '../logger.js';
import { getImageUrl, getSignedUrl, uploadImage, deleteImage } from '../middleware/image.middleware.js';

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

// ---- Image endpoints (each uses exactly one image.middleware fn) ----
//   object path = `${name}.jpg`, same convention as ingredient.service.js.
//   Swap to a per-row stored path if you ever need non-jpg / multiple images per ingredient.
const imagePath = (name) => `${name}.jpg`;

// POST /api/ingredients/:id/image  → uploadImage
// Needs multer upstream (multipart field "image") to populate req.file = { buffer, mimetype }.
export async function uploadIngredientImage(req, res) {
  if (!req.file) return res.status(400).json({ error: "image file required (multipart field 'image')" });
  try {
    const ingredient = await models.Ingre.findOne({ where: { id: Number(req.params.id) } });
    if (!ingredient) return res.status(404).json({ error: "Ingredient not found" });

    const publicUrl = await uploadImage(imagePath(ingredient.name), req.file.buffer, req.file.mimetype);
    await ingredient.update({ imageUrl: publicUrl });
    res.status(200).json({ id: ingredient.id, imageUrl: publicUrl });
  } catch (error) {
    logger.error("upload image %s failed: %s", req.params.id, error.message);
    res.status(500).json({ error: "Failed to upload image" });
  }
}

// GET /api/ingredients/:id/image  → getImageUrl
export async function getIngredientImageUrl(req, res) {
  try {
    const ingredient = await models.Ingre.findOne({ where: { id: Number(req.params.id) } });
    if (!ingredient) return res.status(404).json({ error: "Ingredient not found" });

    const imageUrl = getImageUrl(imagePath(ingredient.name));
    res.status(200).json({ id: ingredient.id, imageUrl });
  } catch (error) {
    logger.error("get image url %s failed: %s", req.params.id, error.message);
    res.status(500).json({ error: "Failed to get image url" });
  }
}

// GET /api/ingredients/:id/image/signed  → getSignedUrl (private bucket, expiring)
export async function getIngredientSignedUrl(req, res) {
  try {
    const ingredient = await models.Ingre.findOne({ where: { id: Number(req.params.id) } });
    if (!ingredient) return res.status(404).json({ error: "Ingredient not found" });

    const url = await getSignedUrl(imagePath(ingredient.name));
    res.status(200).json({ id: ingredient.id, url });
  } catch (error) {
    logger.error("get signed url %s failed: %s", req.params.id, error.message);
    res.status(500).json({ error: "Failed to get signed url" });
  }
}

// DELETE /api/ingredients/:id/image  → deleteImage
// expect url input from query value
export async function deleteIngredientImage(req, res) {
  try {
    const ingredient = await models.Ingre.findOne({ where: { id: Number(req.params.id) } });
    if (!ingredient) return res.status(404).json({ error: "Ingredient not found" });

    // Get desired image url and delete from supabase storage
    await deleteImage(imagePath(ingredient.name));
    await ingredient.update({ imageUrl: null });
    res.status(200).json({ id: ingredient.id, message: "Image deleted" });
  } catch (error) {
    logger.error("delete image %s failed: %s", req.params.id, error.message);
    res.status(500).json({ error: "Failed to delete image" });
  }
}