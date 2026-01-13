
import { TideProvider } from '../interfaces/TideProvider';
import { TabuaDeMaresScraper } from './scrapers/TabuaDeMaresScraper';
import { MarineData, TideData } from '../models/MarineData';
import { FirebaseService } from './FirebaseService';

export class MarineDataService {
    private providers: TideProvider[] = [];
    private db: FirebaseService;

    constructor() {
        this.providers.push(new TabuaDeMaresScraper());
        this.db = new FirebaseService();
    }

    async getTides(region: string, source?: string): Promise<MarineData> {
        // 1. Try to get from DB first (Cache Strategy)
        // Window: Now to +24h (example default view) or based on request?
        // For simplicity, let's look for "future" data.
        const now = new Date();
        const future = new Date();
        future.setDate(now.getDate() + 30); // Check next 30 days coverage

        try {
            const cachedTides = await this.db.getTides(region, now, future);

            // If we have substantial data (e.g. > 5 points), return it.
            // This is a naive cache check. Ideally we check if we have data for the *specific day* requested.
            // But for this MVP: if we have db data, use it.
            if (cachedTides.length > 5 && !source) { // If source is specified, force fetch from it? Or filter?
                // If specific provider requested, we might still want fresh data or filtered db data.
                // Current logic: simple fallback.
                console.log(`[Aggregator] Returning ${cachedTides.length} cached tides from Firebase.`);
                return {
                    location: region,
                    region: region,
                    source: 'Firebase (Aggregated)',
                    timestamp: new Date().toISOString(),
                    tides: cachedTides
                };
            }
        } catch (dbErr) {
            console.warn('[Aggregator] DB Read failed, falling back to live fetch:', dbErr);
        }

        // 2. Fetch Live
        let providersToFetch = this.providers;

        if (source) {
            const found = this.providers.find(p => p.name.toLowerCase() === source.toLowerCase());
            if (found) {
                providersToFetch = [found];
            } else {
                console.warn(`[Aggregator] Source '${source}' not found. Using all.`);
            }
        }

        try {
            console.log(`[Aggregator] Fetching live from ${providersToFetch.length} sources...`);

            // Parallel Fetch
            const results = await Promise.allSettled(
                providersToFetch.map(async p => ({
                    name: p.name,
                    data: await p.getTides(region)
                }))
            );

            // Collect successful data
            const validResults: { name: string, data: TideData[] }[] = [];

            for (const res of results) {
                if (res.status === 'fulfilled') {
                    validResults.push(res.value);
                } else {
                    console.error(`[Aggregator] Fetch failed:`, res.reason);
                }
            }

            if (validResults.length === 0) {
                throw new Error('All providers failed');
            }

            // Aggregate
            // If only one source (or user filtered), no need to average
            let aggregatedTides: TideData[] = [];

            if (validResults.length === 1) {
                aggregatedTides = validResults[0].data;
            } else {
                aggregatedTides = this.calculateWeightedAverage(validResults);
            }

            const marineData: MarineData = {
                location: region,
                region: region,
                source: validResults.length > 1 ? 'Aggregated' : validResults[0].name,
                timestamp: new Date().toISOString(),
                tides: aggregatedTides
            };

            // 3. Save to DB
            try {
                await this.db.saveTides(region, marineData);
                console.log('[Aggregator] Data saved to Firebase.');
            } catch (saveErr) {
                console.error('[Aggregator] Failed to save to Firebase:', saveErr);
            }

            return marineData;
        } catch (error) {
            console.error('Aggregator Error:', error);
            throw error;
        }
    }

    private calculateWeightedAverage(results: { name: string, data: TideData[] }[]): TideData[] {
        const weights: { [key: string]: number } = {
            'TabuaDeMares': 0.9,
            'TabuaMareDevTu': 0.8,
            'OpenMeteo': 0.5
        };

        // Map timestamp -> { totalHeight: number, totalWeight: number, types: string[] }
        const points = new Map<number, { totalHeight: number, totalWeight: number, types: string[] }>();

        for (const res of results) {
            const weight = weights[res.name] || 0.5;
            for (const tide of res.data) {
                const time = new Date(tide.time).getTime();

                if (!points.has(time)) {
                    points.set(time, { totalHeight: 0, totalWeight: 0, types: [] });
                }

                const entry = points.get(time)!;
                entry.totalHeight += tide.height * weight;
                entry.totalWeight += weight;
                entry.types.push(tide.type);
            }
        }

        const aggregated: TideData[] = [];

        for (const [time, entry] of points.entries()) {
            const avgHeight = entry.totalHeight / entry.totalWeight;

            // Majority vote for type
            const highCount = entry.types.filter(t => t === 'HIGH').length;
            const type = highCount >= (entry.types.length / 2) ? 'HIGH' : 'LOW';

            aggregated.push({
                time: new Date(time).toISOString(),
                height: avgHeight,
                type: type as 'HIGH' | 'LOW'
            });
        }

        return aggregated.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
    }
}
