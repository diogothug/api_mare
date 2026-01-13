import { TabuaDeMaresScraper } from '../../services/scrapers/TabuaDeMaresScraper';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('TabuaDeMaresScraper', () => {
    let scraper: TabuaDeMaresScraper;

    beforeEach(() => {
        scraper = new TabuaDeMaresScraper();
    });

    it('should parse tides correctly from HTML snippet', async () => {
        // Construct a realistic mock HTML snippet based on our research
        const mockHtml = `
            <html>
                <body>
                    <script>
                        var gm = new GraficoMareas();
                        gm.coef_inicio=37;
                        gm.mareas_x[0]=120; // 02:00
                        gm.mareas_y[0]=0.5;
                        gm.mareas_x[1]=400; // 06:40
                        gm.mareas_y[1]=2.5;
                        gm.altura_media=1.5;
                        var JS_FECHA_ACTUAL="2026-01-12+12%3A00";
                    </script>
                </body>
            </html>
        `;

        mockedAxios.get.mockResolvedValue({ data: mockHtml });

        const tides = await scraper.getTides('velha-boipeba');

        expect(tides).toHaveLength(2);

        // Check first tide (Low)
        expect(tides[0].height).toBe(0.5);
        expect(tides[0].type).toBe('LOW'); // 0.5 < 1.5
        expect(new Date(tides[0].time).getHours()).toBe(2);

        // Check second tide (High)
        expect(tides[1].height).toBe(2.5);
        expect(tides[1].type).toBe('HIGH'); // 2.5 > 1.5
    });

    it('should handle errors gracefully', async () => {
        mockedAxios.get.mockRejectedValue(new Error('Network Error'));

        await expect(scraper.getTides('unknown')).rejects.toThrow('Network Error');
    });
});
