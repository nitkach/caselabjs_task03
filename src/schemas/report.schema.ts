import { z } from "zod";

export const equipmentLoadQuerySchema = z.object({
    from: z.iso.datetime().optional(),
    to: z.iso.datetime().optional(),
    minRequests: z.coerce.number().int().min(0).max(100_000).default(0),
}).refine(
    ({ from, to }) => !from || !to || new Date(from) <= new Date(to),
    { path: ["to"], message: "to must be later than or equal to from" },
);

export type EquipmentLoadQuery = z.infer<typeof equipmentLoadQuerySchema>;
