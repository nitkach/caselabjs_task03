import type { Request, Response } from "express";

import type { CreateEquipmentInput, UpdateEquipmentInput } from "../models/equipment.model.js";
import { equipmentService } from "../services/equipment.service.js";
import { maintenanceRequestService } from "../services/maintenanceRequest.service.js";
import { weatherService } from "../services/weather.service.js";
import {
    equipmentListQuerySchema,
    maintenanceRequestListQuerySchema,
} from "../schemas/list.schema.js";
import { ValidationError } from "../errors/appError.js";

export async function listEquipment(req: Request, res: Response): Promise<void> {
    const parsed = equipmentListQuerySchema.safeParse(req.query);
    if (!parsed.success) {
        throw new ValidationError("Invalid equipment list query");
    }

    res.json({
        success: true,
        ...await equipmentService.findAll(parsed.data),
    });
};

export function createEquipment(
    req: Request<Record<string, never>, unknown, CreateEquipmentInput>,
    res: Response<unknown>
): Promise<void> {
    return equipmentService.create(req.body).then((equipment) => {
        res.status(201).json({
            success: true,
            data: equipment,
        });
    });

}

export async function getEquipment(req: Request<{ id: string }>, res: Response<unknown>): Promise<void> {
    res.json({
        success: true,
        data: await equipmentService.findById(req.params.id),
    });
}

export async function patchEquipment(
    req: Request<{ id: string }, unknown, UpdateEquipmentInput>,
    res: Response<unknown>
): Promise<void> {
    const equipment = await equipmentService.update(req.params.id, req.body);

    res.status(200).json({
        success: true,
        data: equipment,
    });
}

export async function deleteEquipment(req: Request<{ id: string }>, res: Response<unknown>): Promise<void> {
    await equipmentService.delete(req.params.id);

    res.sendStatus(204);
}

export async function getMaintenanceRequestsByEquipmentId(req: Request<{ id: string }>, res: Response<unknown>): Promise<void> {
    const parsed = maintenanceRequestListQuerySchema.safeParse(req.query);
    if (!parsed.success) {
        throw new ValidationError("Invalid request list query");
    }

    const maintenanceRequests = await maintenanceRequestService.findByEquipmentId(
        req.params.id,
        parsed.data,
    );

    res.status(200).json({
        success: true,
        ...maintenanceRequests,
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
