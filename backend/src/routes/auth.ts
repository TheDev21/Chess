import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { getPrisma } from "../db/prisma";

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || "";
const JWT_EXPIRY = "7d";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  displayName: z.string().min(1).max(40),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(128),
});

function requireJwtSecret(res: import("express").Response): boolean {
  if (!JWT_SECRET) {
    res.status(503).json({ error: "Auth is not configured on this server (missing JWT_SECRET)." });
    return false;
  }
  return true;
}

router.post("/register", async (req, res) => {
  if (!requireJwtSecret(res)) return;
  const prisma = getPrisma();
  if (!prisma) {
    return res.status(503).json({ error: "Accounts require a database (missing DATABASE_URL)." });
  }

  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
  }
  const { email, password, displayName } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return res.status(409).json({ error: "An account with that email already exists." });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { email, displayName, passwordHash },
  });

  const token = jwt.sign({ sub: user.id, email: user.email }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
  return res.status(201).json({
    token,
    user: { id: user.id, email: user.email, displayName: user.displayName, rating: user.rating },
  });
});

router.post("/login", async (req, res) => {
  if (!requireJwtSecret(res)) return;
  const prisma = getPrisma();
  if (!prisma) {
    return res.status(503).json({ error: "Accounts require a database (missing DATABASE_URL)." });
  }

  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
  }
  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return res.status(401).json({ error: "Invalid email or password." });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: "Invalid email or password." });
  }

  const token = jwt.sign({ sub: user.id, email: user.email }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
  return res.json({
    token,
    user: { id: user.id, email: user.email, displayName: user.displayName, rating: user.rating },
  });
});

export default router;
