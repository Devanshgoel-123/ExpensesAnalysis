import type { RequestHandler } from "express";
import { loadDemoData } from "./service.js";

export const loadDemoDataController: RequestHandler = async (req, res) => {
  const userId = req.user!.id;
  const result = await loadDemoData(userId);
  res.json(result);
};
