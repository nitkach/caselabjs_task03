import { Op, type WhereOptions } from "sequelize";

import type { MaintenanceRequest } from "../models/maintenanceRequest.model.js";
import type { MaintenanceRequestListQuery } from "../schemas/list.schema.js";
import {
    MaintenanceRequestEntity,
    RequestAssigneeEntity,
    TechnicianEntity,
} from "../models/entities/index.js";

const requestAttributes = [
    "id",
    "equipmentId",
    "title",
    "description",
    "priority",
    "status",
    "plannedAt",
    "author",
    "createdAt",
    "updatedAt",
] as const;

const technicianAttributes = [
    "id",
    "fullName",
    "specialization",
    "employeeNumber",
] as const;

const sortColumns = {
    createdAt: "createdAt",
    updatedAt: "updatedAt",
    plannedAt: "plannedAt",
    priority: "priority",
} as const;

function toMaintenanceRequest(entity: MaintenanceRequestEntity): MaintenanceRequest {
    return {
        id: entity.id,
        equipmentId: entity.equipmentId,
        title: entity.title,
        ...(entity.description === null ? {} : { description: entity.description }),
        priority: entity.priority,
        status: entity.status,
        ...(entity.plannedAt === null
            ? {}
            : { plannedAt: entity.plannedAt.toISOString() }),
        createdAt: entity.createdAt.toISOString(),
        updatedAt: entity.updatedAt.toISOString(),
        author: entity.author,
        assignees: (entity.assignees ?? []).flatMap((technician) => {
            const assignment = technician.RequestAssigneeEntity;
            if (!assignment) return [];
            return [{
                id: technician.id,
                fullName: technician.fullName,
                specialization: technician.specialization,
                employeeNumber: technician.employeeNumber,
                role: assignment.role,
                hours: Number(assignment.hours),
            }];
        }),
    };
}

const requestIncludes = [
    {
        model: TechnicianEntity,
        as: "assignees",
        attributes: [...technicianAttributes],
        through: {
            model: RequestAssigneeEntity,
            attributes: ["role", "hours"],
        },
        required: false,
    },
];

export class MaintenanceRequestRepository {
    async findAll(query: MaintenanceRequestListQuery): Promise<{
        rows: MaintenanceRequest[];
        count: number;
    }> {
        const where: WhereOptions<MaintenanceRequestEntity> = {};
        if (query.status) where.status = query.status;
        if (query.priority) where.priority = query.priority;
        if (query.equipmentId) where.equipmentId = query.equipmentId;
        if (query.createdFrom || query.createdTo) {
            const createdAt: { [Op.gte]?: Date; [Op.lte]?: Date } = {};
            if (query.createdFrom) createdAt[Op.gte] = new Date(query.createdFrom);
            if (query.createdTo) createdAt[Op.lte] = new Date(query.createdTo);
            where.createdAt = createdAt;
        }
        if (query.plannedFrom || query.plannedTo) {
            const plannedAt: { [Op.gte]?: Date; [Op.lte]?: Date } = {};
            if (query.plannedFrom) plannedAt[Op.gte] = new Date(query.plannedFrom);
            if (query.plannedTo) plannedAt[Op.lte] = new Date(query.plannedTo);
            where.plannedAt = plannedAt;
        }

        const result = await MaintenanceRequestEntity.findAndCountAll({
            attributes: [...requestAttributes],
            include: requestIncludes,
            where,
            order: [[sortColumns[query.sortBy], query.sortOrder === "asc" ? "ASC" : "DESC"]],
            limit: query.limit,
            offset: (query.page - 1) * query.limit,
            distinct: true,
        });

        return {
            rows: result.rows.map(toMaintenanceRequest),
            count: result.count,
        };
    }

    async findById(id: string): Promise<MaintenanceRequest | undefined> {
        const entity = await MaintenanceRequestEntity.findByPk(id, {
            attributes: [...requestAttributes],
            include: requestIncludes,
        });
        return entity ? toMaintenanceRequest(entity) : undefined;
    }

    async create(input: {
        equipmentId: string;
        title: string;
        description?: string;
        priority: MaintenanceRequest["priority"];
        plannedAt?: Date;
    }): Promise<MaintenanceRequest> {
        const entity = await MaintenanceRequestEntity.create({
            ...input,
            status: "new",
            author: "system",
        });
        const request = await this.findById(entity.id);
        if (!request) {
            throw new Error(`Created request ${entity.id} could not be reloaded`);
        }
        return request;
    }

    async update(
        id: string,
        changes: Partial<Pick<
            MaintenanceRequest,
            "title" | "description" | "priority" | "status"
        >> & { plannedAt?: Date | null },
    ): Promise<MaintenanceRequest | undefined> {
        const entity = await MaintenanceRequestEntity.findByPk(id);
        if (!entity) return undefined;

        await entity.update(changes);
        return this.findById(id);
    }

    async hasOpenByEquipmentId(equipmentId: string): Promise<boolean> {
        const count = await MaintenanceRequestEntity.count({
            where: {
                equipmentId,
                status: { [Op.in]: ["new", "in_progress"] },
            },
        });
        return count > 0;
    }

    async delete(id: string): Promise<MaintenanceRequest | undefined> {
        const entity = await MaintenanceRequestEntity.findByPk(id, {
            attributes: [...requestAttributes],
            include: requestIncludes,
        });
        if (!entity) return undefined;

        const request = toMaintenanceRequest(entity);
        await entity.destroy();
        return request;
    }
}

export const maintenanceRequestRepository = new MaintenanceRequestRepository();
