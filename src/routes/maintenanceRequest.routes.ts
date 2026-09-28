import { Router } from "express";
import {
    listMaintenanceRequest,
    createMaintenanceRequest,
    getMaintenanceRequest,
    patchMaintenanceRequest,
    patchMaintenanceRequestStatus,
    deleteMaintenanceRequest,
    replaceRequestAssignees,
    removeRequestAssignee,
    getMaintenanceRequestHistory,
} from "../controllers/maintenanceRequest.controller.js";
import { validateRequest } from "../middleware/validateRequest.js";
import {
    createMaintenanceRequestSchema,
    updateMaintenanceRequestSchema,
    updateMaintenanceRequestStatusSchema,
    replaceRequestAssigneesSchema,
} from "../schemas/maintenanceRequest.schema.js";
export const maintenanceRequestRouter = Router();

maintenanceRequestRouter.get("/requests", listMaintenanceRequest);

maintenanceRequestRouter.post(
    "/requests",
    validateRequest(createMaintenanceRequestSchema),
    createMaintenanceRequest,
);

maintenanceRequestRouter.get("/requests/:id", getMaintenanceRequest);

maintenanceRequestRouter.patch(
    "/requests/:id",
    validateRequest(updateMaintenanceRequestSchema),
    patchMaintenanceRequest,
);

maintenanceRequestRouter.patch(
    "/requests/:id/status",
    validateRequest(updateMaintenanceRequestStatusSchema),
    patchMaintenanceRequestStatus,
);

maintenanceRequestRouter.post(
    "/requests/:id/assignees",
    validateRequest(replaceRequestAssigneesSchema),
    replaceRequestAssignees,
);

maintenanceRequestRouter.delete(
    "/requests/:id/assignees/:userId",
    removeRequestAssignee,
);

maintenanceRequestRouter.get(
    "/requests/:id/history",
    getMaintenanceRequestHistory,
);

maintenanceRequestRouter.delete(
    "/requests/:id",
    deleteMaintenanceRequest
);
