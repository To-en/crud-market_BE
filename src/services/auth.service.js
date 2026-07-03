import Jwt from "jsonwebtoken";
import model from "../models/index.js";
import config from "../config.js";

export function signAccessToken(userId, role) {
  return Jwt.sign(
    { id: userId, role },
    config.jwtsecret.access,
    { expiresIn: config.jwtsecret.accessExpire * 60 }
  );
}

export async function signRefreshToken(userId, role) {
  const refreshToken = Jwt.sign(
    { id: userId, role },
    config.jwtsecret.refresh,
    { expiresIn: config.jwtsecret.refreshExpire * 60 }
  );
  await model.User.update({ refreshToken }, { where: { id: userId } });
  return refreshToken;
}

export function assignRole(username) {
  if (username === 'admin' || username.endsWith('@crud-admin.ac.th')) return 2;
  if (username.endsWith('@crud-personel.ac.th')) return 1;
  if (/^[A-Z]\d\/\d-group\d+$/.test(username)) return 0;
  return null;
}


