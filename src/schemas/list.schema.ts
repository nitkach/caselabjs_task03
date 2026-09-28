import { z } from "zod";

const positiveInt = z.coerce.number().int().min(1);
const sortOrderSchema = z.enum(["asc", "desc"]).default("asc");
const maximumOffset = 1_000_000;

export const equipmentListQuerySchema = z.object({
    status: z.enum([
        "operational",
        "maintenance",
        "fault",
        "decommissioned",
    ]).optional(),
    type: z.enum([
        "turbine",
        "inverter",
        "sensor",
        "substation",
    ]).optional(),
    installedFrom: z.iso.datetime().optional(),
    installedTo: z.iso.datetime().optional(),
    sortBy: z.enum(["name", "installedAt", "status", "type"]).default("name"),
    sortOrder: sortOrderSchema,
    page: positiveInt.default(1),
    limit: positiveInt.max(100).default(20),
}).refine(
    ({ page, limit }) => (page - 1) * limit <= maximumOffset,
    { path: ["page"], message: `Offset must not exceed ${maximumOffset}` },
);

export const maintenanceRequestListQuerySchema = z.object({
    status: z.enum(["new", "in_progress", "done", "rejected"]).optional(),
    priority: z.enum(["low", "medium", "high", "critical"]).optional(),
    equipmentId: z.uuid().optional(),
    createdFrom: z.iso.datetime().optional(),
    createdTo: z.iso.datetime().optional(),
    plannedFrom: z.iso.datetime().optional(),
    plannedTo: z.iso.datetime().optional(),
    sortBy: z.enum(["createdAt", "updatedAt", "plannedAt", "priority"]).default("createdAt"),
    sortOrder: sortOrderSchema,
    page: positiveInt.default(1),
    limit: positiveInt.max(100).default(20),
}).refine(
    ({ page, limit }) => (page - 1) * limit <= maximumOffset,
    { path: ["page"], message: `Offset must not exceed ${maximumOffset}` },
);

export type EquipmentListQuery = z.infer<typeof equipmentListQuerySchema>;
export type MaintenanceRequestListQuery = z.infer<
    typeof maintenanceRequestListQuerySchema
>;
