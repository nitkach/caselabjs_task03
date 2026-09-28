export type MaintenanceRequestPriority =
    | "low"
    | "medium"
    | "high"
    | "critical";

export type MaintenanceRequestStatus =
    | "new"
    | "in_progress"
    | "done"
    | "rejected";

export interface Location {
    lat: number;
    lon: number;
}

export interface MaintenanceRequest {
    id: string;
    equipmentId: string;
    title: string;
    description?: string;
    priority: MaintenanceRequestPriority;
    status: MaintenanceRequestStatus;
    plannedAt?: string;
    createdAt: string;
    updatedAt: string;
    author?: string;
    assignees?: Array<{
        id: string;
        fullName: string;
        specialization: string;
        employeeNumber: string;
        role: "lead" | "member";
        hours: number;
    }>;
}
