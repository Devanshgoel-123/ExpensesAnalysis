import { Router } from "express";
import { getStore } from "../db/index.js";
import { loginUser, registerUser, requireAuth } from "./service.js";

export const authRouter = Router();

authRouter.post("/register", async (req, res) => {
  try {
    const { email, password, inviteCode, displayName } = req.body ?? {};
    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      typeof inviteCode !== "string"
    ) {
      res.status(400).json({ detail: "email, password, and inviteCode required" });
      return;
    }
    const result = await registerUser({
      email,
      password,
      inviteCode,
      displayName: typeof displayName === "string" ? displayName : undefined,
    });
    res.status(201).json(result);
  } catch (error) {
    const status = (error as { status?: number }).status ?? 500;
    res.status(status).json({
      detail: error instanceof Error ? error.message : "Registration failed",
    });
  }
});

authRouter.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body ?? {};
    if (typeof email !== "string" || typeof password !== "string") {
      res.status(400).json({ detail: "email and password required" });
      return;
    }
    const result = await loginUser({ email, password });
    res.json(result);
  } catch (error) {
    const status = (error as { status?: number }).status ?? 500;
    res.status(status).json({
      detail: error instanceof Error ? error.message : "Login failed",
    });
  }
});

authRouter.get("/me", requireAuth, async (req, res) => {
  const store = await getStore();
  const user = await store.findUserById(req.user!.id);
  if (!user) {
    res.status(404).json({ detail: "User not found" });
    return;
  }
  res.json({
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    createdAt: user.createdAt,
  });
});

authRouter.delete("/me", requireAuth, async (req, res) => {
  const store = await getStore();
  await store.deleteUserData(req.user!.id);
  await store.audit(req.user!.id, "auth.delete_account", {});
  res.json({ ok: true });
});
