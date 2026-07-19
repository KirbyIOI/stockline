import { Router } from "express";
import rateLimit from "express-rate-limit";
import bcrypt from "bcryptjs";
import { verifyLogin, issueToken, requireAuth } from "../auth.js";
import { getUserById, setUserPassword } from "../users.js";

export const router = Router();

// Slow down brute-force guessing without needing a database of attempts.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts. Try again in a few minutes." },
});

router.post("/login", loginLimiter, async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required" });
  }
  const user = await verifyLogin(String(username), String(password));
  if (!user) return res.status(401).json({ error: "Invalid username or password" });

  const token = issueToken(user);
  res.json({ token, user });
});

// GET /api/auth/me — who am I, and what can I do (used to gate admin-only UI)
router.get("/me", requireAuth, (req, res) => {
  const user = getUserById(req.user.sub);
  if (!user) return res.status(401).json({ error: "Session is no longer valid" });
  res.json({ id: user.id, username: user.username, role: user.role });
});

// POST /api/auth/change-password — any signed-in user can change their own password
router.post("/change-password", requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: "Current and new password are required" });
  }
  if (String(newPassword).length < 8) {
    return res.status(400).json({ error: "New password must be at least 8 characters" });
  }
  const user = getUserById(req.user.sub);
  if (!user) return res.status(401).json({ error: "Session is no longer valid" });

  const ok = await bcrypt.compare(currentPassword, user.password_hash);
  if (!ok) return res.status(401).json({ error: "Current password is incorrect" });

  await setUserPassword(user.id, String(newPassword));
  res.json({ ok: true });
});
