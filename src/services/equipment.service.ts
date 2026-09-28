import { ForeignKeyConstraintError } from "sequelize";

import type {
    CreateEquipmentInput,
    Equipment,
} from "../models/equipment.model.js";
import {
    EquipmentRepository,
    equipmentRepository,
} from "../repositories/equipment.repository.js";
import {
    MaintenanceRequestRepository,
    maintenanceRequestRepository,
} from "../repositories/maintenanceRequest.repository.js";
import { ConflictError, NotFoundError } from "../errors/appError.js";
import type { UpdateEquipmentInput } from "../schemas/equipment.schema.js";
import type { EquipmentListQuery } from "../schemas/list.schema.js";

export class EquipmentService {
    constructor(
        private readonly equipmentRepo: EquipmentRepository = equipmentRepository,
        private readonly maintenanceRequestRepo: MaintenanceRequestRepository = maintenanceRequestRepository,
    ) { }

    async findAll(query: EquipmentListQuery = {
        page: 1,
        limit: 20,
        sortBy: "name",
        sortOrder: "asc",
    }): Promise<{
        data: Equipment[];
        meta: { total: number; page: number; limit: number };
    }> {
        const result = await this.equipmentRepo.findAll(query);
        return {
            data: result.rows,
            meta: { total: result.count, page: query.page, limit: query.limit },
        };
    }

    async findById(id: string): Promise<Equipment> {
        const equipment = await this.equipmentRepo.findById(id);

        if (!equipment) {
            throw new NotFoundError("Equipment not found");
        }

        return equipment;
    }

    async create(input: CreateEquipmentInput): Promise<Equipment> {
        return this.equipmentRepo.create({
            ...input,
            installedAt: new Date(input.installedAt),
        });
    }

    async update(id: string, input: UpdateEquipmentInput): Promise<Equipment> {
        const current = await this.findById(id);

        if (
            input.serialNumber !== undefined &&
            input.serialNumber !== current.serialNumber
        ) {
            const duplicate = await this.equipmentRepo.findBySerialNumber(input.serialNumber);

            if (duplicate && duplicate.id !== id) {
                throw new ConflictError("Serial number is already in use");
            }
        }

        const { installedAt, ...changes } = input;
        const updated = await this.equipmentRepo.update(id, {
            ...changes,
            ...(installedAt === undefined
                ? {}
                : { installedAt: new Date(installedAt) }),
        });
        if (!updated) {
            throw new NotFoundError("Equipment not found");
        }
        return updated;
    }

    async delete(id: string): Promise<Equipment> {
        const equipment = await this.findById(id);
        const hasOpenMaintenanceRequest =
            await this.maintenanceRequestRepo.hasOpenByEquipmentId(id);

        if (hasOpenMaintenanceRequest) {
            throw new ConflictError("Equipment has open maintenance requests");
        }

        try {
            const deleted = await this.equipmentRepo.delete(id);
            if (!deleted) {
                throw new NotFoundError("Equipment not found");
            }
            return deleted;
        } catch (error) {
            if (error instanceof ForeignKeyConstraintError) {
                throw new ConflictError("Equipment is still referenced by maintenance requests");
            }
            throw error;
        }
    }
}

export const equipmentService = new EquipmentService();
