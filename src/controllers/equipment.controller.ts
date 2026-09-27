import type { Request, Response } from "express";

import type { CreateEquipmentInput, UpdateEquipmentInput } from "../models/equipment.model.js";
import { equipmentService } from "../services/equipment.service.js";
import { maintenanceRequestService } from "../services/maintenanceRequest.service.js";
import { weatherService } from "../services/weather.service.js";
import { equipmentListQuerySchema } from "../schemas/list.schema.js";
import { ValidationError } from "../errors/appError.js";

export function listEquipment(req: Request, res: Response): void {
    const parsed = equipmentListQuerySchema.safeParse(req.query);
    if (!parsed.success) {
        throw new ValidationError("Invalid equipment list query");
    }

    res.json({
        success: true,
        ...equipmentService.findAll(parsed.data),
    });
};

export function createEquipment(
    req: Request<Record<string, never>, unknown, CreateEquipmentInput>,
    res: Response<unknown>
): void {
    const equipment = equipmentService.create(req.body);

    res.status(201).json({
        success: true,
        data: equipment.location,
    });
}

export function getEquipment(req: Request<{ id: string }>, res: Response<unknown>): void {
    res.json({
        success: true,
        data: equipmentService.findById(req.params.id),
    });
}

export function patchEquipment(
    req: Request<{ id: string }, unknown, UpdateEquipmentInput>,
    res: Response<unknown>
): void {
    const equipment = equipmentService.update(req.params.id, req.body);

    res.status(200).json({
        success: true,
        data: equipment,
    });
}

export function deleteEquipment(req: Request<{ id: string }>, res: Response<unknown>): void {
    const equipment = equipmentService.delete(req.params.id);

    res.sendStatus(204);
}

export function getMaintenanceRequestsByEquipmentId(req: Request<{ id: string }>, res: Response<unknown>): void {
    const maintenanceRequests = maintenanceRequestService.findByEquipmentId(req.params.id);

    res.status(200).json({
        success: true,
        data: maintenanceRequests,
    })
}

export async function getWeatherForecast(
    req: Request<{ id: string }>,
    res: Response<unknown>,
): Promise<void> {
    const forecast = await weatherService.getForecastForEquipment(req.params.id);

    res.status(200).json({
        success: true,
        data: forecast,
    });
}
