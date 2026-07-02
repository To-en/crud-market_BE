/**
 * @swagger
 * tags:
 *   - name: Auth
 *     description: Login, register, and token refresh
 *
 * /api/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               username:    { type: string, example: JohnDoe@crud-personel.ac.th }
 *               password:    { type: string, example: secret123 }
 *     responses:
 *       200:
 *         description: JWT access + refresh tokens
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 userName:     { type: string }
 *                 role:         { type: string }
 *                 accessToken:  { type: string }
 *                 refreshToken: { type: string }
 *       401:
 *         description: Invalid credentials
 *
 * /api/auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: clear JWT signed token
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken: { type: string }
 *     responses:
 *       200:
 *         description: New access token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken: { type: string }
 *       401:
 *         description: Invalid or expired refresh token
 * 
 * /api/auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register new user
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, password, classroom]
 *             properties:
 *               username:  { type: string, example: M6/2-group1 }
 *               password:  { type: string, example: secret123 }
 *               classroom: { type: string, example: M6/2 }
 *     responses:
 *       201:
 *         description: User created
 *       400:
 *         description: username/password/classroom missing or username format not recognized
 *       409:
 *         description: Username already registered
 * 
 * /api/auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Refresh access token
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken: { type: string }
 *     responses:
 *       200:
 *         description: New access token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken: { type: string }
 *       401:
 *         description: Invalid or expired refresh token
 *
 * /api/distribute-budget:
 *   post:
 *     tags: [Auth]
 *     summary: Distribute budget to all classrooms (admin only)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [centralBudget]
 *             properties:
 *               centralBudget: { type: number, example: 50000 }
 *     responses:
 *       200:
 *         description: Budget distributed
 *       400:
 *         description: centralBudget missing or not a number
 *       403:
 *         description: Insufficient role (admin only)
 */
import { Router } from 'express';
import { fileURLToPath } from 'url';
import { readdirSync } from 'fs';
import { join, dirname } from 'path';
import { validate, requireRole } from '../middleware/auth.middleware.js';
import * as Login from '../controllers/user.controller.js';
import * as controller from '../controllers/ingredient.controller.js';
import makeLogger from '../logger.js';

const logger = makeLogger(import.meta.url);
const rootRouter = Router();
const __dirname = dirname(fileURLToPath(import.meta.url));

// Public routes (no auth)
rootRouter.post("/auth/login", Login.userLogin);
rootRouter.post("/auth/logout", Login.userLogout);
rootRouter.post("/auth/refresh", Login.userRefresh);
// User click registration page -> get list first await -> then appear user Register
rootRouter.get("/auth/register/list",   Login.listClassrooms);
rootRouter.post("/auth/register",       Login.userRegister);

rootRouter.get('/ingredients',        controller.listIngredients);
rootRouter.get('/ingredients/search', controller.getIngredients);
rootRouter.get('/categories',         controller.listCategories);

// Auth wall — everything below requires validated token (Access token generated by JWT access secret)
rootRouter.use(validate);
rootRouter.post("/distribute-budget", requireRole(2), Login.triggerDistribute);

// Auto-mount sub-routers
for (const file of readdirSync(__dirname)) {
  if (!file.endsWith(".routes.js") || file === "index.js") continue;
  try {
    const mod = await import(join(__dirname, file));
    const subRouter = mod.default ?? mod;
    rootRouter.use(subRouter);
    logger.info("route loaded: %s", file);
  } catch (err) {
    logger.error("could not load route %s: %s", file, err.message);
  }
}

export default rootRouter;
