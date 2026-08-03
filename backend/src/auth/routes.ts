import { Router } from "express";
import { getStore } from "../db/index.js";
import { AppError } from "../errors/AppError.js";
import { validate } from "../middleware/validate.js";
import { loginBodySchema, registerBodySchema } from "../validators/auth.js";
import { loginUser, registerUser, requireAuth } from "./service.js";

export const authRouter = Router();

authRouter.post("/register", validate(registerBodySchema), async (req, res) => {
  const body = req.body as {
    email: string;
    password: string;
    inviteCode: string;
    displayName?: string;
  };
  const result = await registerUser({
    email: body.email,
    password: body.password,
    inviteCode: body.inviteCode,
    displayName: body.displayName,
  });
  res.status(201).json(result);
});

authRouter.post("/login", validate(loginBodySchema), async (req, res) => {
  const body = req.body as { email: string; password: string };
  const result = await loginUser({
    email: body.email,
    password: body.password,
  });
  res.json(result);
});

authRouter.get("/me", requireAuth, async (req, res) => {
  const store = await getStore();
  const user = await store.findUserById(req.user!.id);
  if (!user) {
    throw AppError.notFound("User not found");
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
