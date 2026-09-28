import { Router } from "express";

import {
    getEquipmentLoadReport,
    getSiteSummary,
} from "../controllers/report.controller.js";

export const reportRouter = Router();

reportRouter.get("/sites/:id/summary", getSiteSummary);
reportRouter.get("/reports/equipment-load", getEquipmentLoadReport);
