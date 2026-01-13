import { Request, Response } from 'express';
import { MarineDataService } from '../services/MarineDataService';

export class TideController {
    static async getTides(req: Request, res: Response) {
        try {
            const region = (req.query.region as string) || 'Velha Boipeba'; // Changed default to user target
            const service = new MarineDataService();
            const data = await service.getTides(region);

            res.json(data);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to fetch marine data' });
        }
    }
}
