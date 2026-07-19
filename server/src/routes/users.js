import { Router } from "express";
import {
  listUsers, createUser, getUserById, getUserByUsername,
  setUserRole, setUserPassword, deleteUser, countAdmins,
} from "../users.js";

// Mounted behind requireAuth + requireAdmin in index.js — everything here
// assumes the caller is already confirmed to be an admin.
export const router = Router();

router.get("/", (req, res) => {
  res.json(listUsers());
});

router.post("/", async (req, res) => {
  const { username, password, role } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required" });
  }
  if (String(password).length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters" });
  }
  if (getUserByUsername(String(username))) {
    return res.status(409).json({ error: `Username "${username}" is already taken` });
  }
  const user = await createUser({
    username: String(username).trim(),
    password: String(password),
    role: role === "admin" ? "admin" : "staff",
  });
  res.status(201).json(user);
});

router.patch("/:id/role", (req, res) => {
  const { role } = req.body || {};
  if (!["admin", "staff"].includes(role)) {
    return res.status(400).json({ error: "role must be 'admin' or 'staff'" });
  }
  const target = getUserById(req.params.id);
  if (!target) return res.status(404).json({ error: "User not found" });
  if (target.role === "admin" && role !== "admin" && countAdmins() <= 1) {
    return res.status(400).json({ error: "There must be at least one admin — promote someone else first." });
  }
  setUserRole(req.params.id, role);
  res.json({ ok: true });
});

router.patch("/:id/password", async (req, res) => {
  const { password } = req.body || {};
  if (!password || String(password).length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters" });
  }
  const target = getUserById(req.params.id);
  if (!target) return res.status(404).json({ error: "User not found" });
  await setUserPassword(req.params.id, String(password));
  res.json({ ok: true });
});

router.delete("/:id", (req, res) => {
  const target = getUserById(req.params.id);
  if (!target) return res.status(404).json({ error: "User not found" });
  if (target.id === req.user.sub) {
    return res.status(400).json({ error: "You can't delete the account you're currently signed in as." });
  }
  if (target.role === "admin" && countAdmins() <= 1) {
    return res.status(400).json({ error: "Can't delete the last admin account." });
  }
  deleteUser(req.params.id);
  res.status(204).end();
});
