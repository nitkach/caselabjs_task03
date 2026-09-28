import { ForeignKeyConstraintError } from "sequelize";

import type {
    MaintenanceRequest,
} from "../models/maintenanceRequest.model.js";
import {
    EquipmentRepository,
    equipmentRepository,
} from "../repositories/equipment.repository.js";
import {
    MaintenanceRequestRepository,
    maintenanceRequestRepository,
} from "../repositories/maintenanceRequest.repository.js";
import type {
    CreateMaintenanceRequestInput,
    UpdateMaintenanceRequestInput,
    UpdateMaintenanceRequestStatusInput,
} from "../schemas/maintenanceRequest.schema.js";
import type { MaintenanceRequestListQuery } from "../schemas/list.schema.js";
import { ConflictError, NotFoundError } from "../errors/appError.js";

export class MaintenanceRequestService {
    constructor(
        private readonly equipmentRepo: EquipmentRepository = equipmentRepository,
        private readonly maintenanceRequestRepo: MaintenanceRequestRepository = maintenanceRequestRepository,
    ) { }

    async findAll(query: MaintenanceRequestListQuery = {
        page: 1,
        limit: 20,
        sortBy: "createdAt",
        sortOrder: "asc",
    }): Promise<{
        data: MaintenanceRequest[];
        meta: { total: number; page: number; limit: number };
    }> {
        const result = await this.maintenanceRequestRepo.findAll(query);
        return {
            data: result.rows,
            meta: { total: result.count, page: query.page, limit: query.limit },
        };
    }

    async findById(id: string): Promise<MaintenanceRequest> {
        const request = await this.maintenanceRequestRepo.findById(id);
        if (!request) {
            throw new NotFoundError("Maintenance request not found");
        }
        return request;
    }

    async create(input: CreateMaintenanceRequestInput): Promise<MaintenanceRequest> {
        const equipment = await this.equipmentRepo.findById(input.equipmentId);
        if (!equipment) {
            throw new NotFoundError("Equipment not found");
        }

        return this.maintenanceRequestRepo.create({
            equipmentId: equipment.id,
            title: input.title,
            ...(input.description === undefined
                ? {}
                : { description: input.description }),
            priority: input.priority,
            ...(input.plannedAt === undefined
                ? {}
                : { plannedAt: new Date(input.plannedAt) }),
        });
    }

    async findByEquipmentId(
        equipmentId: string,
        query: MaintenanceRequestListQuery,
    ): Promise<{
        data: MaintenanceRequest[];
        meta: { total: number; page: number; limit: number };
    }> {
        const equipment = await this.equipmentRepo.findById(equipmentId);
        if (!equipment) {
            throw new NotFoundError("Equipment not found");
        }

        const result = await this.maintenanceRequestRepo.findAll({
            ...query,
            equipmentId,
        });
        return {
            data: result.rows,
            meta: { total: result.count, page: query.page, limit: query.limit },
        };
    }

    async update(
        id: string,
        input: UpdateMaintenanceRequestInput,
    ): Promise<MaintenanceRequest> {
        await this.findById(id);
        const { plannedAt, ...changes } = input;
        const updated = await this.maintenanceRequestRepo.update(id, {
            ...changes,
            ...(plannedAt === undefined
                ? {}
                : { plannedAt: new Date(plannedAt) }),
        });

        if (!updated) {
            throw new NotFoundError("Maintenance request not found");
        }
        return updated;
    }

    async updateStatus(
        id: string,
        input: UpdateMaintenanceRequestStatusInput,
    ): Promise<MaintenanceRequest> {
        const current = await this.findById(id);
        const allowedTransitions: Record<
            MaintenanceRequest["status"],
            MaintenanceRequest["status"][]
        > = {
            new: ["in_progress", "rejected"],
            in_progress: ["done", "rejected"],
            done: [],
            rejected: [],
        };

        if (!allowedTransitions[current.status].includes(input.status)) {
            throw new ConflictError("Invalid maintenance request status transition");
        }

        const updated = await this.maintenanceRequestRepo.update(id, {
            status: input.status,
        });
        if (!updated) {
            throw new NotFoundError("Maintenance request not found");
        }
        return updated;
    }

    async delete(id: string): Promise<MaintenanceRequest> {
        await this.findById(id);
        try {
            const deletedRequest = await this.maintenanceRequestRepo.delete(id);
            if (!deletedRequest) {
                throw new NotFoundError("Maintenance request not found");
            }
            return deletedRequest;
        } catch (error) {
            if (error instanceof ForeignKeyConstraintError) {
                throw new ConflictError("Maintenance request has immutable status history");
            }
            throw error;
        }
    }
}

export const maintenanceRequestService = new MaintenanceRequestService();
