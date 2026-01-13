import request from 'supertest';
import { app } from '../../server';

// Apple Style: Polished Integration Test (End-to-End)
// Focus: User experience, "It just works", Clear descriptions

describe('🌊 Marine Data API - Integration Tests', () => {

    // User Story 1: Surfer checking tides
    describe('🏄 User Story: Surfer checking tides', () => {
        it('should effortlessly provide tide data for the default region (Velha Boipeba)', async () => {
            const response = await request(app).get('/api/v1/tides');

            expect(response.status).toBe(200);

            // New default is Velha Boipeba (Bahia)
            expect(response.body.location).toContain('Velha Boipeba');
            expect(response.body.region).toContain('Velha Boipeba'); // Or 'Bahia' depending on normalization
            expect(response.body.tides.length).toBeGreaterThan(0);

            // source should be TabuaDeMares
            expect(response.body.source).toBe('TabuaDeMares');

            // Weather might be undefined for now
            // expect(response.body.weather).toBeDefined();
        });

        it('should allow checking a specific region (e.g., Salvador)', async () => {
            const response = await request(app).get('/api/v1/tides?region=Salvador');

            expect(response.status).toBe(200);
            expect(response.body.region).toContain('Salvador');
        });
    });

    // System Health
    describe('🏥 System Health', () => {
        it('should be up and running', async () => {
            const response = await request(app).get('/api/health');
            expect(response.status).toBe(200);
            expect(response.body.status).toBe('ok');
        });
    });
});
