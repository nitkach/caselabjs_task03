import { QueryTypes } from "sequelize";

import { sequelize } from "../config/database.js";
import { NotFoundError } from "../errors/appError.js";
import { SiteEntity } from "../models/entities/index.js";
import type { EquipmentLoadQuery } from "../schemas/report.schema.js";

export interface SiteSummary {
    siteId: string;
    requestCountsByStatus: Record<string, number>;
    requestCountsByPriority: Record<string, number>;
    averageClosureHours: number | null;
}

export interface EquipmentLoad {
    equipmentId: string;
    equipmentName: string;
    serialNumber: string;
    requestCount: number;
    closedRequestCount: number;
    plannedLaborHours: number;
    lastMaintenanceAt: string | null;
}

interface SiteSummaryRow {
    request_counts_by_status: Record<string, number> | null;
    request_counts_by_priority: Record<string, number> | null;
    average_closure_hours: string | null;
}

interface EquipmentLoadRow {
    equipment_id: string;
    equipment_name: string;
    serial_number: string;
    request_count: number;
    closed_request_count: number;
    planned_labor_hours: string;
    last_maintenance_at: Date | null;
}

export class ReportRepository {
    async getSiteSummary(siteId: string): Promise<SiteSummary> {
        const site = await SiteEntity.findByPk(siteId, { attributes: ["id"] });
        if (!site) {
            throw new NotFoundError("Site not found");
        }

        const [row] = await sequelize.query<SiteSummaryRow>(
            `SELECT
                COALESCE((
                    SELECT jsonb_object_agg(expected.status, COALESCE(status_counts.request_count, 0))
                    FROM (VALUES ('new'), ('in_progress'), ('done'), ('rejected')) AS expected(status)
                    LEFT JOIN (
                        SELECT mr.status, count(*)::int AS request_count
                        FROM maintenance_requests mr
                        JOIN equipment e ON e.id = mr.equipment_id
                        WHERE e.site_id = $siteId
                        GROUP BY mr.status
                    ) status_counts ON status_counts.status = expected.status
                ), '{}'::jsonb) AS request_counts_by_status,
                COALESCE((
                    SELECT jsonb_object_agg(expected.priority, COALESCE(priority_counts.request_count, 0))
                    FROM (VALUES ('low'), ('medium'), ('high'), ('critical')) AS expected(priority)
                    LEFT JOIN (
                        SELECT mr.priority, count(*)::int AS request_count
                        FROM maintenance_requests mr
                        JOIN equipment e ON e.id = mr.equipment_id
                        WHERE e.site_id = $siteId
                        GROUP BY mr.priority
                    ) priority_counts ON priority_counts.priority = expected.priority
                ), '{}'::jsonb) AS request_counts_by_priority,
                (
                    SELECT avg(extract(epoch FROM (history.changed_at - mr.created_at)) / 3600)::text
                    FROM maintenance_requests mr
                    JOIN equipment e ON e.id = mr.equipment_id
                    JOIN request_status_history history
                      ON history.request_id = mr.id
                     AND history.new_status = mr.status
                    WHERE e.site_id = $siteId
                      AND mr.status IN ('done', 'rejected')
                ) AS average_closure_hours`,
            { bind: { siteId }, type: QueryTypes.SELECT },
        );

        if (!row) {
            throw new Error(`Summary query returned no result for site ${siteId}`);
        }

        return {
            siteId,
            requestCountsByStatus: row.request_counts_by_status ?? {},
            requestCountsByPriority: row.request_counts_by_priority ?? {},
            averageClosureHours: row.average_closure_hours === null
                ? null
                : Number(row.average_closure_hours),
        };
    }

    async getEquipmentLoad(query: EquipmentLoadQuery): Promise<EquipmentLoad[]> {
        const rows = await sequelize.query<EquipmentLoadRow>(
            `WITH filtered_requests AS (
                SELECT
                    mr.id,
                    mr.equipment_id,
                    mr.status,
                    done_history.closed_at
                FROM maintenance_requests mr
                LEFT JOIN LATERAL (
                    SELECT max(history.changed_at) AS closed_at
                    FROM request_status_history history
                    WHERE history.request_id = mr.id
                      AND history.new_status = 'done'
                ) done_history ON true
                WHERE ($from::timestamptz IS NULL OR mr.created_at >= $from::timestamptz)
                  AND ($to::timestamptz IS NULL OR mr.created_at <= $to::timestamptz)
            ),
            request_stats AS (
                SELECT
                    equipment_id,
                    count(*)::int AS request_count,
                    count(*) FILTER (WHERE status IN ('done', 'rejected'))::int AS closed_request_count,
                    max(closed_at) FILTER (WHERE status = 'done') AS last_maintenance_at
                FROM filtered_requests
                GROUP BY equipment_id
            ),
            labor_stats AS (
                SELECT
                    fr.equipment_id,
                    sum(ra.hours)::numeric AS planned_labor_hours
                FROM filtered_requests fr
                JOIN request_assignees ra ON ra.request_id = fr.id
                GROUP BY fr.equipment_id
            )
            SELECT
                e.id AS equipment_id,
                e.name AS equipment_name,
                e.serial_number,
                COALESCE(rs.request_count, 0)::int AS request_count,
                COALESCE(rs.closed_request_count, 0)::int AS closed_request_count,
                COALESCE(ls.planned_labor_hours, 0)::text AS planned_labor_hours,
                rs.last_maintenance_at
            FROM equipment e
            LEFT JOIN request_stats rs ON rs.equipment_id = e.id
            LEFT JOIN labor_stats ls ON ls.equipment_id = e.id
            WHERE COALESCE(rs.request_count, 0) >= $minRequests
            ORDER BY request_count DESC, e.name ASC, e.id ASC`,
            {
                bind: {
                    from: query.from ?? null,
                    to: query.to ?? null,
                    minRequests: query.minRequests,
                },
                type: QueryTypes.SELECT,
            },
        );

        return rows.map((row) => ({
            equipmentId: row.equipment_id,
            equipmentName: row.equipment_name,
            serialNumber: row.serial_number,
            requestCount: Number(row.request_count),
            closedRequestCount: Number(row.closed_request_count),
            plannedLaborHours: Number(row.planned_labor_hours),
            lastMaintenanceAt: row.last_maintenance_at?.toISOString() ?? null,
        }));
    }
}

export const reportRepository = new ReportRepository();
