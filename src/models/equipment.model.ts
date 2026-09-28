import type {
    CreateEquipmentInput as ValidatedCreateEquipmentInput,
    UpdateEquipmentInput as ValidatedUpdateEquipmentInput,
} from "../schemas/equipment.schema.js";

export type EquipmentType =
    | "turbine"
    | "inverter"
    | "sensor"
    | "substation";

export type EquipmentStatus =
    | "operational"
    | "maintenance"
    | "fault"
    | "decommissioned";

export interface Location {
    lat: number;
    lon: number;
}

export interface Equipment {
    id: string;
    siteId: string;
    name: string;
    type: EquipmentType;
    serialNumber: string;
    location: Location;
    status: EquipmentStatus;
    installedAt: string;
    passport?: {
        manufacturer: string;
        model: string;
        ratedPowerKw: number;
        lastCalibrationAt: string | null;
    } | null;
}

export type CreateEquipmentInput = ValidatedCreateEquipmentInput;

export type UpdateEquipmentInput = ValidatedUpdateEquipmentInput;
