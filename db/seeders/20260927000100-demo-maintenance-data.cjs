"use strict";

const { Op } = require("sequelize");

const siteIds = [
    "10000000-0000-4000-8000-000000000001",
    "10000000-0000-4000-8000-000000000002",
];
const equipmentIds = Array.from(
    { length: 6 },
    (_, index) => `20000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
);
const requestIds = Array.from(
    { length: 20 },
    (_, index) => `40000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
);
const technicianIds = Array.from(
    { length: 5 },
    (_, index) => `50000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
);
const passportIds = Array.from(
    { length: 6 },
    (_, index) => `30000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
);

const requestStates = [
    "new", "new", "new", "new", "new", "new", "new", "new",
    "in_progress", "in_progress", "in_progress", "in_progress", "in_progress",
    "done", "done", "done", "done", "done",
    "rejected", "rejected",
];
const priorities = ["low", "medium", "high", "critical"];
const isoDate = (daysAfterEpoch) =>
    new Date(Date.UTC(2025, 0, 1 + daysAfterEpoch, 9)).toISOString();

module.exports = {
    async up(queryInterface) {
        await queryInterface.sequelize.transaction(async (transaction) => {
            const now = new Date();
            const timestamp = now.toISOString();

            await queryInterface.bulkInsert(
                "sites",
                [
                    {
                        id: siteIds[0],
                        name: "North Wind Farm",
                        code: "NWF",
                        region: "Northern Region",
                        latitude: 56.123456,
                        longitude: 37.654321,
                        created_at: timestamp,
                        updated_at: timestamp,
                    },
                    {
                        id: siteIds[1],
                        name: "Coastal Wind Farm",
                        code: "CWF",
                        region: "Coastal Region",
                        latitude: 54.987654,
                        longitude: 20.123456,
                        created_at: timestamp,
                        updated_at: timestamp,
                    },
                ],
                { transaction },
            );

            const kinds = ["turbine", "turbine", "inverter", "sensor", "substation", "turbine"];
            const equipment = equipmentIds.map((id, index) => ({
                id,
                site_id: siteIds[index < 3 ? 0 : 1],
                name: [
                    "North Turbine 01",
                    "North Turbine 02",
                    "North Inverter 01",
                    "Coastal Sensor 01",
                    "Coastal Substation 01",
                    "Coastal Turbine 01",
                ][index],
                type: kinds[index],
                serial_number: `CASELAB-EQ-${String(index + 1).padStart(3, "0")}`,
                status: ["operational", "maintenance", "operational", "fault", "operational", "operational"][index],
                installed_at: `202${2 + (index % 3)}-0${(index % 8) + 1}-15`,
                created_at: timestamp,
                updated_at: timestamp,
            }));
            await queryInterface.bulkInsert("equipment", equipment, { transaction });

            const passports = equipmentIds.map((equipmentId, index) => ({
                id: passportIds[index],
                equipment_id: equipmentId,
                manufacturer: ["Vestas", "Siemens Gamesa", "ABB", "Nordex", "Schneider", "Vestas"][index],
                model: ["V150", "SG 5.0-145", "PVS-100", "Wind Sensor X2", "SM6", "V117"][index],
                rated_power_kw: [4200, 5000, 100, 0.5, 1200, 3450][index],
                last_calibration_at: `2025-0${(index % 8) + 1}-10`,
                created_at: timestamp,
                updated_at: timestamp,
            }));
            await queryInterface.bulkInsert("equipment_passports", passports, { transaction });

            const technicians = [
                ["Alex Morgan", "Wind turbine maintenance", "TECH-001"],
                ["Sam Taylor", "Electrical systems", "TECH-002"],
                ["Jamie Lee", "Instrumentation", "TECH-003"],
                ["Riley Chen", "High-voltage systems", "TECH-004"],
                ["Jordan Patel", "Mechanical inspection", "TECH-005"],
            ].map(([fullName, specialization, employeeNumber], index) => ({
                id: technicianIds[index],
                full_name: fullName,
                specialization,
                employee_number: employeeNumber,
                created_at: timestamp,
                updated_at: timestamp,
            }));
            await queryInterface.bulkInsert("technicians", technicians, { transaction });

            const requests = requestIds.map((id, index) => {
                const createdAt = isoDate(index * 5);
                const status = requestStates[index];
                const closed = status === "done" || status === "rejected";
                return {
                    id,
                    equipment_id: equipmentIds[index % equipmentIds.length],
                    title: [
                        "Inspect rotor bearings",
                        "Check inverter cooling",
                        "Calibrate vibration sensor",
                        "Repair power converter",
                        "Review transformer temperature",
                    ][index % 5],
                    description: `Demonstration maintenance request ${index + 1}.`,
                    priority: priorities[index % priorities.length],
                    status,
                    planned_at: isoDate(index * 5 + 10),
                    author: `operator${(index % 4) + 1}`,
                    created_at: createdAt,
                    updated_at: closed ? isoDate(index * 5 + 4) : createdAt,
                };
            });
            await queryInterface.bulkInsert("maintenance_requests", requests, { transaction });

            const assignments = requestIds.flatMap((requestId, index) => {
                const lead = {
                    request_id: requestId,
                    technician_id: technicianIds[index % technicianIds.length],
                    role: "lead",
                    hours: 4 + (index % 5),
                };
                if (index % 3 !== 0) {
                    return [lead];
                }
                return [
                    lead,
                    {
                        request_id: requestId,
                        technician_id: technicianIds[(index + 1) % technicianIds.length],
                        role: "member",
                        hours: 2 + (index % 4),
                    },
                ];
            });
            await queryInterface.bulkInsert("request_assignees", assignments, { transaction });

            const history = requestIds.flatMap((requestId, index) => {
                const createdAt = isoDate(index * 5);
                const status = requestStates[index];
                const entries = [
                    {
                        id: `60000000-0000-4000-8000-${String(index * 2 + 1).padStart(12, "0")}`,
                        request_id: requestId,
                        previous_status: null,
                        new_status: "new",
                        changed_by: `operator${(index % 4) + 1}`,
                        comment: "Request created",
                        changed_at: createdAt,
                    },
                ];

                if (status === "in_progress" || status === "done" || (status === "rejected" && index % 2 === 1)) {
                    entries.push({
                        id: `60000000-0000-4000-8000-${String(index * 2 + 2).padStart(12, "0")}`,
                        request_id: requestId,
                        previous_status: "new",
                        new_status: "in_progress",
                        changed_by: "maintenance-coordinator",
                        comment: "Work assigned to maintenance team",
                        changed_at: isoDate(index * 5 + 1),
                    });
                }

                if (status === "done") {
                    entries.push({
                        id: `61000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
                        request_id: requestId,
                        previous_status: "in_progress",
                        new_status: "done",
                        changed_by: "maintenance-coordinator",
                        comment: "Work completed",
                        changed_at: isoDate(index * 5 + 4),
                    });
                } else if (status === "rejected") {
                    const from = index % 2 === 1 ? "in_progress" : "new";
                    entries.push({
                        id: `62000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
                        request_id: requestId,
                        previous_status: from,
                        new_status: "rejected",
                        changed_by: "maintenance-coordinator",
                        comment: "Work rejected after review",
                        changed_at: isoDate(index * 5 + 4),
                    });
                }
                return entries;
            });
            await queryInterface.bulkInsert("request_status_history", history, { transaction });
        });
    },

    async down(queryInterface) {
        await queryInterface.sequelize.transaction(async (transaction) => {
            await queryInterface.sequelize.query(
                "ALTER TABLE request_status_history DISABLE TRIGGER request_status_history_immutable",
                { transaction },
            );
            await queryInterface.bulkDelete(
                "request_assignees",
                { request_id: { [Op.in]: requestIds } },
                { transaction },
            );
            await queryInterface.bulkDelete(
                "request_status_history",
                { request_id: { [Op.in]: requestIds } },
                { transaction },
            );
            await queryInterface.bulkDelete(
                "maintenance_requests",
                { id: { [Op.in]: requestIds } },
                { transaction },
            );
            await queryInterface.bulkDelete(
                "equipment_passports",
                { equipment_id: { [Op.in]: equipmentIds } },
                { transaction },
            );
            await queryInterface.bulkDelete(
                "equipment",
                { id: { [Op.in]: equipmentIds } },
                { transaction },
            );
            await queryInterface.bulkDelete(
                "technicians",
                { id: { [Op.in]: technicianIds } },
                { transaction },
            );
            await queryInterface.bulkDelete(
                "sites",
                { id: { [Op.in]: siteIds } },
                { transaction },
            );
            await queryInterface.sequelize.query(
                "ALTER TABLE request_status_history ENABLE TRIGGER request_status_history_immutable",
                { transaction },
            );
        });
    },
};
