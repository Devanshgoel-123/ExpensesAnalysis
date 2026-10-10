import { Router } from "express";
import { requireAuth } from "../auth/service.js";
import { loadDemoDataController } from "./controller.js";

export const demoRouter = Router();

demoRouter.use(requireAuth);

demoRouter.post("/load", loadDemoDataController);
