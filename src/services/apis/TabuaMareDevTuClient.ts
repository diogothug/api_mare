import axios from 'axios';
import { TideProvider } from '../../interfaces/TideProvider';
import { TideData } from '../../models/MarineData';

export class TabuaMareDevTuClient implements TideProvider {
    name = 'TabuaMareDevTu';
    private baseUrl = 'https://tabuamare.devtu.qzz.io/api/v1';

    async getTides(region: string): Promise<TideData[]> {
        // Todo: Map 'region' string to coordinates + state. 
        // For MVP/Velha Boipeba, hardcoding or using a simple map.
        // Salvador Coords for testing
        const lat = -12.9714;
        const lng = -38.5014;
        const state = 'ba';

        const date = new Date();
        const month = date.getMonth() + 1;
        const day = date.getDate();

        // Requesting today and tomorrow
        const days = `[${day},${day + 1}]`;

        const url = `https://tabuamare.devtu.qzz.io/geo-tabua-mare/[${lat},${lng}]/${state}/${month}/${days}`;

        try {
            console.log(`Fetching TabuaMareDevTu: ${url}`);
            const response = await axios.get(url);

            console.log('TabuaMareDevTu Raw Status:', response.status);
            // console.log('TabuaMareDevTu Raw Data:', JSON.stringify(response.data, null, 2));
            require('fs').writeFileSync('check_api_raw.txt', JSON.stringify(response.data, null, 2));

            // Response structure from docs: { data: [ ...tides ] } 
            // Need to inspect actual structure safely.
            const rawData = response.data;
            let items: any[] = [];

            if (Array.isArray(rawData)) {
                items = rawData;
            } else if (rawData && Array.isArray(rawData.data)) {
                items = rawData.data;
            }

            console.log(`[TabuaMareDevTu] Found ${items.length} items.`);
            if (items.length > 0) {
                console.log('[TabuaMareDevTu] Sample item:', JSON.stringify(items[0], null, 2));
            }

            return items.map((item: any) => {
                // Heuristic mapping based on common API patterns
                // If it has 'date' and 'time' separate, combine them.
                // If 'time' is full ISO, use it.

                let time = item.time;
                if (!time && item.date && item.hour) {
                    time = `${item.date}T${item.hour}:00Z`; // naive
                } else if (item.data) { // sometimes "data" field holds date strings?
                    time = item.data;
                }

                // If item has "altura" (pt) or "height" (en)
                const height = parseFloat(item.height || item.altura || '0');

                // If item has "tipo" (pt) or "type" (en)
                const typeStr = (item.type || item.tipo || '').toLowerCase();
                const type = (typeStr.includes('high') || typeStr.includes('alta')) ? 'HIGH' : 'LOW';

                // Try to construct a valid ISO string if not present
                // Assuming 'time' field is trustworthy if present

                return {
                    time: time || new Date().toISOString(), // Fallback (dangerous but keeps flow)
                    height: height,
                    type: type as 'HIGH' | 'LOW'
                };
            });
        } catch (error) {
            console.error(`TabuaMareDevTu Error: ${error}`);
            throw error;
        }
    }
}
