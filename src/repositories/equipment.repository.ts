import { Op, type WhereOptions } from "sequelize";

import type { Equipment } from "../models/equipment.model.js";
import type { EquipmentListQuery } from "../schemas/list.schema.js";
import {
    EquipmentEntity,
    EquipmentPassportEntity,
    SiteEntity,
} from "../models/entities/index.js";

const equipmentAttributes = [
    "id",
    "siteId",
    "name",
    "type",
    "serialNumber",
    "status",
    "installedAt",
] as const;

const siteAttributes = [
    "id",
    "name",
    "code",
    "region",
    "latitude",
    "longitude",
] as const;

const passportAttributes = [
    "manufacturer",
    "model",
    "ratedPowerKw",
    "lastCalibrationAt",
] as const;

const sortColumns = {
    name: "name",
    installedAt: "installedAt",
    status: "status",
    type: "type",
} as const;

function toEquipment(entity: EquipmentEntity): Equipment {
    const site = entity.site;
    if (!site) {
        throw new Error(`Equipment ${entity.id} was loaded without its site`);
    }

    const passport = entity.passport;
    return {
        id: entity.id,
        siteId: entity.siteId,
        name: entity.name,
        type: entity.type,
        serialNumber: entity.serialNumber,
        status: entity.status,
        installedAt: entity.installedAt.toISOString(),
        location: {
            lat: Number(site.latitude),
            lon: Number(site.longitude),
        },
        ...(passport
            ? {
                passport: {
                    manufacturer: passport.manufacturer,
                    model: passport.model,
                    ratedPowerKw: Number(passport.ratedPowerKw),
                    lastCalibrationAt: passport.lastCalibrationAt,
                },
            }
            : { passport: null }),
    };
}

const equipmentIncludes = [
    {
        model: SiteEntity,
        as: "site",
        attributes: [...siteAttributes],
        required: true,
    },
    {
        model: EquipmentPassportEntity,
        as: "passport",
        attributes: [...passportAttributes],
        required: false,
    },
];

export class EquipmentRepository {
    async findAll(query: EquipmentListQuery): Promise<{
        rows: Equipment[];
        count: number;
    }> {
        const where: WhereOptions<EquipmentEntity> = {};
        if (query.status) where.status = query.status;
        if (query.type) where.type = query.type;
        if (query.installedFrom || query.installedTo) {
            const installedAt: { [Op.gte]?: Date; [Op.lte]?: Date } = {};
            if (query.installedFrom) {
                installedAt[Op.gte] = new Date(query.installedFrom);
            }
            if (query.installedTo) {
                installedAt[Op.lte] = new Date(query.installedTo);
            }
            where.installedAt = installedAt;
        }

        const result = await EquipmentEntity.findAndCountAll({
            attributes: [...equipmentAttributes],
            include: equipmentIncludes,
            where,
            order: [[sortColumns[query.sortBy], query.sortOrder === "asc" ? "ASC" : "DESC"]],
            limit: query.limit,
            offset: (query.page - 1) * query.limit,
            distinct: true,
        });

        return {
            rows: result.rows.map(toEquipment),
            count: result.count,
        };
    }

    async findById(id: string): Promise<Equipment | undefined> {
        const entity = await EquipmentEntity.findByPk(id, {
            attributes: [...equipmentAttributes],
            include: equipmentIncludes,
        });
        return entity ? toEquipment(entity) : undefined;
    }

    async findBySerialNumber(serialNumber: string): Promise<Equipment | undefined> {
        const entity = await EquipmentEntity.findOne({
            attributes: [...equipmentAttributes],
            include: equipmentIncludes,
            where: { serialNumber },
        });
        return entity ? toEquipment(entity) : undefined;
    }

    async create(input: {
        siteId: string;
        name: string;
        type: Equipment["type"];
        serialNumber: string;
        status: Equipment["status"];
        installedAt: Date;
    }): Promise<Equipment> {
        const entity = await EquipmentEntity.create(input);
        const equipment = await this.findById(entity.id);
        if (!equipment) {
            throw new Error(`Created equipment ${entity.id} could not be reloaded`);
        }
        return equipment;
    }

    async update(
        id: string,
        changes: Partial<{
            siteId: string;
            name: string;
            type: Equipment["type"];
            serialNumber: string;
            status: Equipment["status"];
            installedAt: Date;
        }>,
    ): Promise<Equipment | undefined> {
        const entity = await EquipmentEntity.findByPk(id);
        if (!entity) return undefined;

        await entity.update(changes);
        return this.findById(id);
    }

    async delete(id: string): Promise<Equipment | undefined> {
        const equipment = await this.findById(id);
        if (!equipment) return undefined;

        await EquipmentEntity.destroy({ where: { id } });
        return equipment;
    }
}

export const equipmentRepository = new EquipmentRepository();
