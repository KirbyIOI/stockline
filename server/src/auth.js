import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import "dotenv/config";
import { getUserByUsername } from "./users.js";

const JWT_SECRET = process.env.JWT_SECRET;
const TOKEN_TTL = "12h";

if (!JWT_SECRET && process.env.NODE_ENV === "production") {
  // Fail loudly in production rather than silently signing tokens with an
  // empty/guessable secret.
  throw new Error("JWT_SECRET must be set in production. Copy .env.example to .env and set a random string.");
}
const secret = JWT_SECRET || "dev-only-insecure-secret-change-me";

// A real (but useless) bcrypt hash, generated once at startup, purely so a
// login attempt for a nonexistent username still takes about as long as one
// for a real username with a wrong password — avoids leaking which usernames
// exist via response timing.
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 10);

// Checks credentials against the users table and returns a safe user object
// (no password hash) on success, or null on failure.
export async function verifyLogin(username, password) {
  const row = getUserByUsername(username);
  if (!row) {
    await bcrypt.compare(password, DUMMY_HASH);
    return null;
  }
  const ok = await bcrypt.compare(password, row.password_hash);
  return ok ? { id: row.id, username: row.username, role: row.role } : null;
}

export function issueToken(user) {
  return jwt.sign({ sub: user.id, username: user.username, role: user.role }, secret, { expiresIn: TOKEN_TTL });
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Sign in required" });
  try {
    req.user = jwt.verify(token, secret);
    next();
  } catch {
    res.status(401).json({ error: "Session expired — please sign in again" });
  }
}

// For routes that only admins should reach (user management, changing
// company-wide settings). Mount after requireAuth.
export function requireAdmin(req, res, next) {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ error: "This action requires an admin account." });
  }
  next();
}
