import { env } from "../config/env.js";
import { equipmentService } from "./equipment.service.js";
import { ExternalServiceError } from "../errors/appError.js";

interface OpenMeteoResponse {
    daily?: {
        time?: string[];
        temperature_2m_max?: number[];
        temperature_2m_min?: number[];
        precipitation_sum?: number[];
        wind_speed_10m_max?: number[];
    };
}

export interface WeatherDay {
    date: string;
    temperatureMax: number;
    temperatureMin: number;
    precipitation: number;
    windSpeed: number;
    suitableForOutdoorWork: boolean;
}

export interface EquipmentWeatherForecast {
    equipmentId: string;
    location: {
        lat: number;
        lon: number;
    };
    rule: {
        maxPrecipitation: number;
        maxWindSpeedKmh: number;
    };
    days: WeatherDay[];
}

export class WeatherService {
    async getForecastForEquipment(
        equipmentId: string,
    ): Promise<EquipmentWeatherForecast> {
        const equipment = await equipmentService.findById(equipmentId);
        const url = new URL(env.weatherApiUrl);

        url.search = new URLSearchParams({
            latitude: String(equipment.location.lat),
            longitude: String(equipment.location.lon),
            daily: [
                "temperature_2m_max",
                "temperature_2m_min",
                "precipitation_sum",
                "wind_speed_10m_max",
            ].join(","),
            forecast_days: String(env.weatherForecastDays),
            timezone: "auto",
        }).toString();

        let response: Response;

        try {
            response = await fetch(url, {
                signal: AbortSignal.timeout(env.requestTimeoutMs),
            });
        } catch {
            throw new ExternalServiceError("Weather service is unavailable");
        }

        if (!response.ok) {
            throw new ExternalServiceError("Weather service returned an error");
        }

        let payload: OpenMeteoResponse;

        try {
            payload = (await response.json()) as OpenMeteoResponse;
        } catch {
            throw new ExternalServiceError("Weather service returned invalid data");
        }

        const daily = payload.daily;

        if (
            !daily?.time ||
            !daily.temperature_2m_max ||
            !daily.temperature_2m_min ||
            !daily.precipitation_sum ||
            !daily.wind_speed_10m_max
        ) {
            throw new ExternalServiceError("Weather service returned incomplete data");
        }

        const times = daily.time;
        const temperatureMaxima = daily.temperature_2m_max;
        const temperatureMinima = daily.temperature_2m_min;
        const precipitations = daily.precipitation_sum;
        const windSpeeds = daily.wind_speed_10m_max;

        const days = times.map((date, index) => {
            const precipitation = precipitations[index];
            const windSpeed = windSpeeds[index];
            const temperatureMax = temperatureMaxima[index];
            const temperatureMin = temperatureMinima[index];

            if (
                precipitation === undefined ||
                windSpeed === undefined ||
                temperatureMax === undefined ||
                temperatureMin === undefined
            ) {
                throw new ExternalServiceError("Weather service returned incomplete data");
            }

            return {
                date,
                temperatureMax,
                temperatureMin,
                precipitation,
                windSpeed,
                suitableForOutdoorWork:
                    precipitation <= env.weatherMaxPrecipitation &&
                    windSpeed <= env.weatherMaxWindSpeedKmh,
            };
        });

        return {
            equipmentId,
            location: equipment.location,
            rule: {
                maxPrecipitation: env.weatherMaxPrecipitation,
                maxWindSpeedKmh: env.weatherMaxWindSpeedKmh,
            },
            days,
        };
    }
}

export const weatherService = new WeatherService();
