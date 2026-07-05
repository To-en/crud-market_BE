import Jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import config from '../config.js';
import models from '../models/index.js';
import * as service from '../services/auth.service.js';
import { distributeBudget } from '../services/budget.service.js';
import makeLogger from '../logger.js';

const logger = makeLogger(import.meta.url);


// POST /api/auth/login
export async function userLogin(req, res) {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: "username and password required" });

  try {
    const dbUser = await models.User.findOne({ where: { username } });
    if (!dbUser)
      return res.status(401).json({ error: "Invalid credentials" });

    const match = await bcrypt.compare(password, dbUser.password);
    if (!match)
      return res.status(401).json({ error: "Invalid credentials" });

    const role = service.assignRole(username);
    if (role === null)
      return res.status(403).json({ error: "Account type not recognized" });
    
    const accessToken  = service.signAccessToken(dbUser.id, role);
    const refreshToken = await service.signRefreshToken(dbUser.id, role);

    res.status(200).json(
      { userName: username,
        role,
        accessToken,
        expires: config.jwtsecret.accessExpire,
        refreshToken });
  } catch (err) {
    logger.error("login failed for %s: %s", username, err.message);
    res.status(500).json({ error: "Internal server error" });
  }
}

// POST /api/auth/logout
// clear refresh token from userDB
export async function userLogout(req, res) {

  try {
    const { refreshToken } = req.body; // or cookie
    // delete the refresh token from the db
    await models.User.update(
      { refreshToken: null },
      { where: { refreshToken } }
    );
    res.status(200).json({ message: "Logged out" });
  } catch (err) {
    logger.error("logout failed: %s", err.message);
    res.status(500).json({ error: "Logout failed" });
  }
}


// POST /api/refresh
// use refresh token to revoke for access token
export async function userRefresh(req, res) {
  const { refreshToken } = req.body;
  if (!refreshToken)
    return res.status(400).json({ error: "refreshToken required" });

  try {
    const payload = Jwt.verify(refreshToken, config.jwtsecret.refresh);
    const dbUser = await models.User.findOne({
      where: { id: payload.id, refreshToken }
    });
    if (!dbUser)
      return res.status(401).json({ error: "Invalid or revoked refresh token" });

    const accessToken = service.signAccessToken(dbUser.id, dbUser.role);
    res.status(200).json({ accessToken, expires: config.jwtsecret.accessExpire });
  } catch (err) {
    logger.debug("refresh token rejected: %s", err.message);
    res.status(401).json({ error: "Refresh token expired or invalid" });
  }
}

// POST /api/auth/register
export async function userRegister(req, res) {
  const { username, password, classroom } = req.body;
  if (!username || !password || !classroom)
    return res.status(400).json({ error: "username, password, and classroom required" });

  try {
    // Assign role and class
    const role = service.assignRole(username);
    if (role === null)
      return res.status(400).json({ error: "Username format not recognized" });

    const existingUser = await models.User.findOne({ where: { username } });
    if (existingUser)
      return res.status(409).json({ error: "Username already registered" });

    const classroomRecord = await models.Classroom.findByPk(classroom);
    if (!classroomRecord)
      return res.status(400).json({ error: "Classroom not found" });

    const hashed = await bcrypt.hash(password, 10);
    const dbUser = await models.User.create({
      username,
      password: hashed,
      class: classroomRecord.classname,
      role
    });

    const accessToken  = service.signAccessToken(dbUser.id, role);
    const refreshToken = await service.signRefreshToken(dbUser.id, role);

    res.status(201).json(
      { userName: dbUser,
        role,
        accessToken,
        refreshToken });
  } catch (err) {
    logger.error("register failed for %s: %s", username, err.message);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function listClassrooms(_req, res) {
  try {
    const classrooms = await models.Classroom.findAll({
      attributes: ['id', ['classname', 'name']],
      order: [['classname', 'ASC']]
    });
    res.status(200).json(classrooms);
  } catch (err) {
    logger.error("classroom list failed: %s", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
}


// POST /api/distribute-budget  (admin only, role 2)
export async function triggerDistribute(req, res) {
  const { departmentId } = req.body;
  if (!departmentId || isNaN(departmentId))
    return res.status(400).json({ error: "departmentId (number) required" });

  try {
    const result = await distributeBudget(Number(departmentId));
    res.status(200).json({ status: 200, ...result });
  } catch (err) {
    logger.error("distribute budget for dept %s failed: %s", departmentId, err.message);
    res.status(500).json({ error: "Failed to distribute budget" });
  }
}
