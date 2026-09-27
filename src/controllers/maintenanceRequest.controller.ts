import type { Request, Response } from "express";

import { maintenanceRequestService } from "../services/maintenanceRequest.service.js";
import type {
    CreateMaintenanceRequestInput,
    UpdateMaintenanceRequestInput,
    UpdateMaintenanceRequestStatusInput,
} from "../schemas/maintenanceRequest.schema.js";
import {
    maintenanceRequestListQuerySchema,
} from "../schemas/list.schema.js";
import { ValidationError } from "../errors/appError.js";

export function listMaintenanceRequest(req: Request, res: Response): void {
    const parsed = maintenanceRequestListQuerySchema.safeParse(req.query);
    if (!parsed.success) {
        throw new ValidationError("Invalid request list query");
    }

    res.json({
        success: true,
        ...maintenanceRequestService.findAll(parsed.data),
    });
};


export function createMaintenanceRequest(
    req: Request<Record<string, never>, unknown, CreateMaintenanceRequestInput>,
    res: Response<unknown>
): void {
    const maintenanceRequest = maintenanceRequestService.create(req.body);

    res.status(201).json({
        success: true,
        data: maintenanceRequest,
    });
}

export function getMaintenanceRequest(req: Request<{ id: string }>, res: Response<unknown>): void {
    res.json({
        success: true,
        data: maintenanceRequestService.findById(req.params.id),
    });
}


export function patchMaintenanceRequest(
    req: Request<{ id: string }, unknown, UpdateMaintenanceRequestInput>,
    res: Response<unknown>
): void {
    const maintenanceRequest = maintenanceRequestService.update(req.params.id, req.body);

    res.status(200).json({
        success: true,
        data: maintenanceRequest,
    });
}

export function patchMaintenanceRequestStatus(
    req: Request<{ id: string }, unknown, UpdateMaintenanceRequestStatusInput>,
    res: Response<unknown>,
): void {
    const maintenanceRequest = maintenanceRequestService.updateStatus(
        req.params.id,
        req.body,
    );

    res.status(200).json({
        success: true,
        data: maintenanceRequest,
    });
}


export function deleteMaintenanceRequest(req: Request<{ id: string }>, res: Response<unknown>): void {
    maintenanceRequestService.delete(req.params.id);

    res.sendStatus(204);
}
