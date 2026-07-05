/**
 * @swagger
 * tags:
 *   - name: Ingredients
 *     description: Browse and manage ingredients. Mounted at /api/ingredient
 *
 * /api/ingredients:
 *   get:
 *     tags: [Ingredients]
 *     summary: List all ingredients (paginated)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, example: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, example: 15, maximum: 100 }
 *     responses:
 *       200:
 *         description: Paginated ingredient list
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
 *                     $ref: '#/components/schemas/Ingredient'
 *
 * /api/ingredients/search:
 *   get:
 *     tags: [Ingredients]
 *     summary: Search/filter ingredients
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *         description: Name keyword (case-insensitive)
 *       - in: query
 *         name: category
 *         schema: { type: string, enum: [Grain, Protein, Vegetable, Dairy, Spice] }
 *       - in: query
 *         name: inStock
 *         schema: { type: boolean }
 *         description: Pass true to show only in-stock items
 *       - in: query
 *         name: page
 *         schema: { type: integer, example: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, example: 15, maximum: 100 }
 *     responses:
 *       200:
 *         description: Matching ingredients
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
 *                     $ref: '#/components/schemas/Ingredient'
 *
 * /api/ingredients/create:
 *   post:
 *     tags: [Ingredients]
 *     summary: Create ingredient (admin only)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, unit, stock, category]
 *             properties:
 *               name:     { type: string, example: Garlic }
 *               unit:     { type: string, enum: [kg, g, L, ml, pcs] }
 *               stock:    { type: integer, example: 50 }
 *               category: { type: string, enum: [Grain, Protein, Vegetable, Dairy, Spice] }
 *     responses:
 *       201:
 *         description: Created ingredient
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Ingredient'
 *       400:
 *         description: Missing required field or invalid unit/category value
 *
 * /api/ingredients/{id}:
 *   put:
 *     tags: [Ingredients]
 *     summary: Update ingredient (admin only)
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
 *             required: [name, unit, stock, category]
 *             properties:
 *               name:     { type: string }
 *               unit:     { type: string, enum: [kg, g, L, ml, pcs] }
 *               stock:    { type: integer }
 *               category: { type: string, enum: [Grain, Protein, Vegetable, Dairy, Spice] }
 *     responses:
 *       200:
 *         description: Updated ingredient
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Ingredient'
 *       400:
 *         description: Missing required field
 *       404:
 *         description: Ingredient not found
 *   delete:
 *     tags: [Ingredients]
 *     summary: Delete ingredient (admin only)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Deleted — returns the removed ingredient for confirmation
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:    { type: string, example: Deleted }
 *                 ingredient: { $ref: '#/components/schemas/Ingredient' }
 *       404:
 *         description: Ingredient not found
 *
 * /api/ingredients/{id}/image:
 *   post:
 *     tags: [Ingredients]
 *     summary: Upload ingredient image to Supabase (admin only)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [image]
 *             properties:
 *               image: { type: string, format: binary }
 *     responses:
 *       200:
 *         description: Uploaded — returns public image URL
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:       { type: integer }
 *                 imageUrl: { type: string, example: 'https://<ref>.supabase.co/storage/v1/object/public/ingredients/rice.jpg' }
 *       400:
 *         description: Missing image file
 *       404:
 *         description: Ingredient not found
 *   get:
 *     tags: [Ingredients]
 *     summary: Get public image URL for an ingredient (admin only)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Public image URL
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:       { type: integer }
 *                 imageUrl: { type: string }
 *       404:
 *         description: Ingredient not found
 *   delete:
 *     tags: [Ingredients]
 *     summary: Delete ingredient image from Supabase (admin only)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Image deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:      { type: integer }
 *                 message: { type: string, example: Image deleted }
 *       404:
 *         description: Ingredient not found
 *
 * /api/ingredients/{id}/image/signed:
 *   get:
 *     tags: [Ingredients]
 *     summary: Get a short-lived signed URL (private bucket, admin only)
 *     description: Returns an expiring signed URL. Frontend must refetch when it expires.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Signed URL (expires in 1h)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:  { type: integer }
 *                 url: { type: string }
 *       404:
 *         description: Ingredient not found
 */
import { Router } from 'express';
import multer from 'multer';
import { requireRole } from '../middleware/auth.middleware.js';
import * as controller from '../controllers/ingredient.controller.js';
const router = Router();

// In-memory: file lands in req.file.buffer, streamed straight to Supabase (no disk).
const upload = multer({ storage: multer.memoryStorage() });

// Listing and searching route move to index.js to allow guest user
// --- CUD are allowed for admins
router.post('/ingredients/create',   requireRole(2), controller.createIngredient);
router.put('/ingredients/:id',       requireRole(2), controller.updateIngredient);
router.delete('/ingredients/:id',    requireRole(2), controller.deleteIngredient);
router.post('/ingredients/:id/image',        requireRole(2), upload.single('image'), controller.uploadIngredientImage);
router.get('/ingredients/:id/image',         requireRole(2), controller.getIngredientImageUrl);
router.get('/ingredients/:id/image/signed',  requireRole(2), controller.getIngredientSignedUrl);
router.delete('/ingredients/:id/image',      requireRole(2), controller.deleteIngredientImage);

export default router;
