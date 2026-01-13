
import { Request, Response } from 'express';
import { TideController } from '../../controllers/TideController';

// Microsoft Style: Robust Unit Test (Isolated)
// Focus: Logic correctness, edge cases, input/output contract

describe('TideController Unit Tests', () => {
    let req: Partial<Request>;
    let res: Partial<Response>;
    let jsonMock: jest.Mock;

    beforeEach(() => {
        req = {
            query: {},
        };
        jsonMock = jest.fn();
        res = {
            json: jsonMock,
            status: jest.fn().mockReturnThis(),
        };
    });

    test('getTides should return default region "Sudeste" when no query param provided', async () => {
        await TideController.getTides(req as Request, res as Response);

        expect(jsonMock).toHaveBeenCalledTimes(1);
        const responseData = jsonMock.mock.calls[0][0];
        expect(responseData).toHaveProperty('region', 'Sudeste');
        expect(responseData).toHaveProperty('location', 'Porto de Santos');
    });

    test('getTides should return requested region', async () => {
        req.query = { region: 'Nordeste' };

        await TideController.getTides(req as Request, res as Response);

        const responseData = jsonMock.mock.calls[0][0];
        expect(responseData).toHaveProperty('region', 'Nordeste');
    });

    test('getTides should return valid structure matching MarineData interface', async () => {
        await TideController.getTides(req as Request, res as Response);

        const responseData = jsonMock.mock.calls[0][0];
        
        // Asserting types explicitly (Robustness)
        expect(typeof responseData.timestamp).toBe('string');
        expect(Array.isArray(responseData.tides)).toBe(true);
        expect(responseData.source).toBeDefined();
        
        responseData.tides.forEach((tide: any) => {
            expect(tide).toHaveProperty('time');
            expect(tide).toHaveProperty('height');
            expect(tide).toHaveProperty('type');
        });
    });
});
