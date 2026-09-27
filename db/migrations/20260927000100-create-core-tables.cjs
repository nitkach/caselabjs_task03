"use strict";

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.sequelize.transaction(async (transaction) => {
            await queryInterface.createTable(
                "sites",
                {
                    id: {
                        type: Sequelize.UUID,
                        allowNull: false,
                        primaryKey: true,
                    },
                    name: {
                        type: Sequelize.STRING(120),
                        allowNull: false,
                    },
                    code: {
                        type: Sequelize.STRING(30),
                        allowNull: false,
                        unique: true,
                    },
                    region: {
                        type: Sequelize.STRING(120),
                        allowNull: false,
                    },
                    latitude: {
                        type: Sequelize.DECIMAL(9, 6),
                        allowNull: false,
                    },
                    longitude: {
                        type: Sequelize.DECIMAL(9, 6),
                        allowNull: false,
                    },
                    created_at: {
                        type: Sequelize.DATE,
                        allowNull: false,
                    },
                    updated_at: {
                        type: Sequelize.DATE,
                        allowNull: false,
                    },
                },
                { transaction },
            );

            await queryInterface.createTable(
                "equipment",
                {
                    id: {
                        type: Sequelize.UUID,
                        allowNull: false,
                        primaryKey: true,
                    },
                    site_id: {
                        type: Sequelize.UUID,
                        allowNull: false,
                        references: { model: "sites", key: "id" },
                        onUpdate: "CASCADE",
                        onDelete: "RESTRICT",
                    },
                    name: {
                        type: Sequelize.STRING(100),
                        allowNull: false,
                    },
                    type: {
                        type: Sequelize.STRING(20),
                        allowNull: false,
                    },
                    serial_number: {
                        type: Sequelize.STRING(80),
                        allowNull: false,
                        unique: true,
                    },
                    status: {
                        type: Sequelize.STRING(20),
                        allowNull: false,
                    },
                    installed_at: {
                        type: Sequelize.DATEONLY,
                        allowNull: false,
                    },
                    created_at: {
                        type: Sequelize.DATE,
                        allowNull: false,
                    },
                    updated_at: {
                        type: Sequelize.DATE,
                        allowNull: false,
                    },
                },
                { transaction },
            );

            await queryInterface.createTable(
                "equipment_passports",
                {
                    id: {
                        type: Sequelize.UUID,
                        allowNull: false,
                        primaryKey: true,
                    },
                    equipment_id: {
                        type: Sequelize.UUID,
                        allowNull: false,
                        unique: true,
                        references: { model: "equipment", key: "id" },
                        onUpdate: "CASCADE",
                        onDelete: "CASCADE",
                    },
                    manufacturer: {
                        type: Sequelize.STRING(120),
                        allowNull: false,
                    },
                    model: {
                        type: Sequelize.STRING(120),
                        allowNull: false,
                    },
                    rated_power_kw: {
                        type: Sequelize.DECIMAL(12, 3),
                        allowNull: false,
                    },
                    last_calibration_at: {
                        type: Sequelize.DATEONLY,
                        allowNull: true,
                    },
                    created_at: {
                        type: Sequelize.DATE,
                        allowNull: false,
                    },
                    updated_at: {
                        type: Sequelize.DATE,
                        allowNull: false,
                    },
                },
                { transaction },
            );

            await queryInterface.createTable(
                "maintenance_requests",
                {
                    id: {
                        type: Sequelize.UUID,
                        allowNull: false,
                        primaryKey: true,
                    },
                    equipment_id: {
                        type: Sequelize.UUID,
                        allowNull: false,
                        references: { model: "equipment", key: "id" },
                        onUpdate: "CASCADE",
                        onDelete: "RESTRICT",
                    },
                    title: {
                        type: Sequelize.STRING(120),
                        allowNull: false,
                    },
                    description: {
                        type: Sequelize.TEXT,
                        allowNull: true,
                    },
                    priority: {
                        type: Sequelize.STRING(20),
                        allowNull: false,
                    },
                    status: {
                        type: Sequelize.STRING(20),
                        allowNull: false,
                        defaultValue: "new",
                    },
                    planned_at: {
                        type: Sequelize.DATE,
                        allowNull: true,
                    },
                    author: {
                        type: Sequelize.STRING(120),
                        allowNull: false,
                        defaultValue: "system",
                    },
                    created_at: {
                        type: Sequelize.DATE,
                        allowNull: false,
                    },
                    updated_at: {
                        type: Sequelize.DATE,
                        allowNull: false,
                    },
                },
                { transaction },
            );

            await queryInterface.sequelize.query(
                `ALTER TABLE equipment
                    ADD CONSTRAINT equipment_type_check
                        CHECK (type IN ('turbine', 'inverter', 'sensor', 'substation')),
                    ADD CONSTRAINT equipment_status_check
                        CHECK (status IN ('operational', 'maintenance', 'fault', 'decommissioned'))`,
                { transaction },
            );
            await queryInterface.sequelize.query(
                `ALTER TABLE sites
                    ADD CONSTRAINT sites_latitude_range_check
                        CHECK (latitude BETWEEN -90 AND 90),
                    ADD CONSTRAINT sites_longitude_range_check
                        CHECK (longitude BETWEEN -180 AND 180)`,
                { transaction },
            );
            await queryInterface.sequelize.query(
                `ALTER TABLE maintenance_requests
                    ADD CONSTRAINT maintenance_requests_priority_check
                        CHECK (priority IN ('low', 'medium', 'high', 'critical')),
                    ADD CONSTRAINT maintenance_requests_status_check
                        CHECK (status IN ('new', 'in_progress', 'done', 'rejected'))`,
                { transaction },
            );

            await queryInterface.addIndex("equipment", ["site_id"], {
                name: "equipment_site_id_idx",
                transaction,
            });
            await queryInterface.addIndex(
                "maintenance_requests",
                ["equipment_id", "status"],
                { name: "maintenance_requests_equipment_status_idx", transaction },
            );
            await queryInterface.addIndex(
                "maintenance_requests",
                ["status", "priority"],
                { name: "maintenance_requests_status_priority_idx", transaction },
            );
            await queryInterface.addIndex(
                "maintenance_requests",
                ["created_at"],
                { name: "maintenance_requests_created_at_idx", transaction },
            );
            await queryInterface.addIndex(
                "maintenance_requests",
                ["planned_at"],
                { name: "maintenance_requests_planned_at_idx", transaction },
            );
        });
    },

    async down(queryInterface) {
        await queryInterface.sequelize.transaction(async (transaction) => {
            await queryInterface.dropTable("maintenance_requests", { transaction });
            await queryInterface.dropTable("equipment_passports", { transaction });
            await queryInterface.dropTable("equipment", { transaction });
            await queryInterface.dropTable("sites", { transaction });
        });
    },
};
