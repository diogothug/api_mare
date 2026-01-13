import { TideData } from '../models/MarineData';

export interface TideProvider {
    name: string;
    getTides(region: string): Promise<TideData[]>;
}
