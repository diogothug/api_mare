export interface TideData {
    time: string;
    height: number;
    type: 'HIGH' | 'LOW';
}

export interface WeatherData {
    temperature?: number;
    windSpeed?: number;
    windDirection?: string;
    description?: string;
}

export interface MarineData {
    location: string;
    region: string; // Estado ou região (ex: "Sudeste", "SP")
    timestamp: string;
    tides: TideData[];
    weather?: WeatherData;
    source: string;
}
