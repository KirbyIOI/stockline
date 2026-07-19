import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import { db } from "./db.js";

export function listUsers() {
  return db.prepare("SELECT id, username, role, created_at AS createdAt FROM users ORDER BY created_at ASC").all();
}

export function getUserByUsername(username) {
  return db.prepare("SELECT * FROM users WHERE username = ?").get(username);
}

export function getUserById(id) {
  return db.prepare("SELECT * FROM users WHERE id = ?").get(id);
}

export function countUsers() {
  return db.prepare("SELECT COUNT(*) AS n FROM users").get().n;
}

export function countAdmins() {
  return db.prepare("SELECT COUNT(*) AS n FROM users WHERE role = 'admin'").get().n;
}

export async function createUser({ username, password, role = "staff" }) {
  const hash = await bcrypt.hash(password, 10);
  const id = randomUUID();
  db.prepare("INSERT INTO users (id, username, password_hash, role) VALUES (?, ?, ?, ?)").run(id, username, hash, role);
  return { id, username, role };
}

export async function setUserPassword(id, password) {
  const hash = await bcrypt.hash(password, 10);
  db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(hash, id);
}

export function setUserRole(id, role) {
  db.prepare("UPDATE users SET role = ? WHERE id = ?").run(role, id);
}

export function deleteUser(id) {
  return db.prepare("DELETE FROM users WHERE id = ?").run(id);
}

// Runs once at startup. If there are no users yet (fresh install, or an
// upgrade from a pre-multi-user version of Stockline), creates the first
// admin account from ADMIN_USERNAME/ADMIN_PASSWORD in .env so there's always
// a way to log in. After that, accounts are managed from the Settings →
// Team page and the env vars are no longer consulted.
export function bootstrapAdmin() {
  if (countUsers() > 0) return;
  const username = process.env.ADMIN_USERNAME || "admin";
  const password = process.env.ADMIN_PASSWORD || "stockline123";
  const hash = bcrypt.hashSync(password, 10);
  const id = randomUUID();
  db.prepare("INSERT INTO users (id, username, password_hash, role) VALUES (?, ?, ?, 'admin')").run(id, username, hash);
  console.log(`Created initial admin account "${username}" from ADMIN_USERNAME/ADMIN_PASSWORD in .env.`);
}
