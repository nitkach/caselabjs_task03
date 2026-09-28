import type { Request, Response } from "express";

import { ValidationError } from "../errors/appError.js";
import { equipmentLoadQuerySchema } from "../schemas/report.schema.js";
import { reportRepository } from "../repositories/report.repository.js";

export async function getSiteSummary(
    req: Request<{ id: string }>,
    res: Response<unknown>,
): Promise<void> {
    const summary = await reportRepository.getSiteSummary(req.params.id);
    res.status(200).json({ success: true, data: summary });
}

export async function getEquipmentLoadReport(
    req: Request,
    res: Response<unknown>,
): Promise<void> {
    const parsed = equipmentLoadQuerySchema.safeParse(req.query);
    if (!parsed.success) {
        const details = parsed.error.issues.map((issue) => ({
            field: issue.path.join(".") || "query",
            message: issue.message,
        }));
        throw new ValidationError("Invalid equipment load query", details);
    }

    const data = await reportRepository.getEquipmentLoad(parsed.data);
    res.status(200).json({
        success: true,
        data,
        meta: {
            count: data.length,
            filters: parsed.data,
        },
    });
}
