"use strict";

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.sequelize.transaction(async (transaction) => {
            await queryInterface.createTable(
                "technicians",
                {
                    id: {
                        type: Sequelize.UUID,
                        allowNull: false,
                        primaryKey: true,
                    },
                    full_name: {
                        type: Sequelize.STRING(160),
                        allowNull: false,
                    },
                    specialization: {
                        type: Sequelize.STRING(120),
                        allowNull: false,
                    },
                    employee_number: {
                        type: Sequelize.STRING(40),
                        allowNull: false,
                        unique: true,
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
                "request_status_history",
                {
                    id: {
                        type: Sequelize.UUID,
                        allowNull: false,
                        primaryKey: true,
                    },
                    request_id: {
                        type: Sequelize.UUID,
                        allowNull: false,
                        references: { model: "maintenance_requests", key: "id" },
                        onUpdate: "CASCADE",
                        onDelete: "RESTRICT",
                    },
                    previous_status: {
                        type: Sequelize.STRING(20),
                        allowNull: true,
                    },
                    new_status: {
                        type: Sequelize.STRING(20),
                        allowNull: false,
                    },
                    changed_by: {
                        type: Sequelize.STRING(120),
                        allowNull: false,
                    },
                    comment: {
                        type: Sequelize.TEXT,
                        allowNull: true,
                    },
                    changed_at: {
                        type: Sequelize.DATE,
                        allowNull: false,
                    },
                },
                { transaction },
            );

            await queryInterface.createTable(
                "request_assignees",
                {
                    request_id: {
                        type: Sequelize.UUID,
                        allowNull: false,
                        primaryKey: true,
                        references: { model: "maintenance_requests", key: "id" },
                        onUpdate: "CASCADE",
                        onDelete: "CASCADE",
                    },
                    technician_id: {
                        type: Sequelize.UUID,
                        allowNull: false,
                        primaryKey: true,
                        references: { model: "technicians", key: "id" },
                        onUpdate: "CASCADE",
                        onDelete: "RESTRICT",
                    },
                    role: {
                        type: Sequelize.STRING(10),
                        allowNull: false,
                    },
                    hours: {
                        type: Sequelize.DECIMAL(6, 2),
                        allowNull: false,
                    },
                },
                { transaction },
            );

            await queryInterface.sequelize.query(
                `ALTER TABLE request_status_history
                    ADD CONSTRAINT request_status_history_previous_status_check
                        CHECK (previous_status IS NULL OR previous_status IN ('new', 'in_progress', 'done', 'rejected')),
                    ADD CONSTRAINT request_status_history_new_status_check
                        CHECK (new_status IN ('new', 'in_progress', 'done', 'rejected'))`,
                { transaction },
            );
            await queryInterface.sequelize.query(
                `ALTER TABLE request_assignees
                    ADD CONSTRAINT request_assignees_role_check
                        CHECK (role IN ('lead', 'member')),
                    ADD CONSTRAINT request_assignees_hours_positive_check
                        CHECK (hours > 0)`,
                { transaction },
            );

            await queryInterface.addIndex(
                "request_status_history",
                ["request_id", "changed_at"],
                { name: "request_status_history_request_changed_idx", transaction },
            );
            await queryInterface.addIndex(
                "request_assignees",
                ["technician_id"],
                { name: "request_assignees_technician_id_idx", transaction },
            );
            await queryInterface.sequelize.query(
                `CREATE UNIQUE INDEX request_assignees_one_lead_per_request_idx
                    ON request_assignees (request_id)
                    WHERE role = 'lead'`,
                { transaction },
            );
            await queryInterface.sequelize.query(
                `CREATE FUNCTION prevent_request_status_history_mutation()
                    RETURNS trigger
                    LANGUAGE plpgsql
                    AS $$
                    BEGIN
                        RAISE EXCEPTION 'request status history is append-only'
                            USING ERRCODE = '55000';
                    END;
                    $$`,
                { transaction },
            );
            await queryInterface.sequelize.query(
                `CREATE TRIGGER request_status_history_immutable
                    BEFORE UPDATE OR DELETE ON request_status_history
                    FOR EACH ROW
                    EXECUTE FUNCTION prevent_request_status_history_mutation()`,
                { transaction },
            );
        });
    },

    async down(queryInterface) {
        await queryInterface.sequelize.transaction(async (transaction) => {
            await queryInterface.sequelize.query(
                "DROP TRIGGER request_status_history_immutable ON request_status_history",
                { transaction },
            );
            await queryInterface.sequelize.query(
                "DROP FUNCTION prevent_request_status_history_mutation()",
                { transaction },
            );
            await queryInterface.dropTable("request_assignees", { transaction });
            await queryInterface.dropTable("request_status_history", { transaction });
            await queryInterface.dropTable("technicians", { transaction });
        });
    },
};
