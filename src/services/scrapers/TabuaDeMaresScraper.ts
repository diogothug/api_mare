import axios from 'axios';
import { TideProvider } from '../../interfaces/TideProvider';
import { TideData } from '../../models/MarineData';
import * as cheerio from 'cheerio';

export class TabuaDeMaresScraper implements TideProvider {
    name = 'TabuaDeMares';
    private baseUrl = 'https://tabuademares.com/br/bahia';

    async getTides(region: string): Promise<TideData[]> {
        // Mapping region to URL slug if needed, for now assuming region is the slug or part of it
        // Defaulting to Velha Boipeba if region is generic
        const slug = region.toLowerCase().replace(/ /g, '-') || 'velha-boipeba';
        const url = `${this.baseUrl}/${slug}`;

        try {
            const response = await axios.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            });
            const html = response.data;
            return this.parseHtml(html);
        } catch (error) {
            console.error(`Error fetching tides from ${url}:`, error);
            throw error;
        }
    }

    public parseHtml(html: string): TideData[] {
        // Robust Strategy: Extract the GraficoMareas JS object
        const regex = /var gm = new GraficoMareas\(\);(.*?)<\/script>/s;
        const match = html.match(regex);

        if (!match) {
            throw new Error('Could not find GraficoMareas configuration in HTML');
        }

        const scriptContent = match[1];

        // Extract mareas_x (minutes from midnight) and mareas_y (heights)
        const mareasXMatches = scriptContent.match(/gm\.mareas_x\[\d+\]=(\d+);/g);
        const mareasYMatches = scriptContent.match(/gm\.mareas_y\[\d+\]=([0-9.]+);/g);

        if (!mareasXMatches || !mareasYMatches) {
            throw new Error('Could not parse mareas_x or mareas_y data');
        }

        const tides: TideData[] = [];
        // Assuming the arrays are in order and match length
        for (let i = 0; i < mareasXMatches.length; i++) {
            const timeMinutes = parseInt(mareasXMatches[i].match(/=(\d+);/)![1]);
            const height = parseFloat(mareasYMatches[i].match(/=([0-9.]+);/)![1]);

            // Convert minutes to HH:mm string (handling day overflow if necessary, though minutes are usually 0-1440)
            const hours = Math.floor(timeMinutes / 60);
            const minutes = timeMinutes % 60;

            // Handle day overflow just in case (e.g. 25:00)
            const normalizedHours = hours % 24;

            // Format to ISO 8601 snippet or just HH:mm for now as per current simple model
            // However, existing model uses 'time': string. Let's make it a full date if possible or just HH:mm
            // Ideally we get the page date.

            // Extract date from JS variable: var JS_FECHA_ACTUAL="2026-01-12+12%3A00";
            const dateMatch = html.match(/var JS_FECHA_ACTUAL="([^"]+)";/);
            let baseDate = new Date();
            if (dateMatch) {
                // "2026-01-12+12%3A00" -> "2026-01-12"
                // decode first to handle encoded chars, then take YYYY-MM-DD (10 chars)
                // safely split by '+' which acts as space in some encodings or just take 10 chars
                const rawDate = decodeURIComponent(dateMatch[1]);
                const dateStr = rawDate.substr(0, 10); // "2026-01-12"
                baseDate = new Date(dateStr);
            }

            baseDate.setHours(normalizedHours, minutes, 0, 0);

            // Determine type logic (simple heuristic: logic needs finding peaks/troughs)
            // But usually this data IS the peaks and troughs.
            // Let's verify with cheerio if needed, but for now we trust mareas_x ONLY contains extremes?
            // "gm.mareas_x" usually defines the points of HIGH and LOW tides for the graph.
            // We need to know which is which. Height relative to neighbors?

            // Since we iterate, we can check. But simpler: 
            // The scraping is raw. We will infer type later or leave as unknown if model permits.
            // Model: type: 'HIGH' | 'LOW'

            // Determine type by comparing with average height or previous
            // Simple logic: if height > 1.0 it's likely HIGH, else LOW (very naive).
            // Better: Compare to neighbors. 
            // But since we are streaming, let's just create the object first.

            let type: 'HIGH' | 'LOW' = 'HIGH'; // Placeholder, will fix in post-processing or loop

            tides.push({
                time: baseDate.toISOString(),
                height: height,
                type: 'HIGH' // Temporary
            });
        }

        // Fix types
        for (let i = 0; i < tides.length; i++) {
            const current = tides[i];
            const next = tides[(i + 1) % tides.length];
            // This is hard with only a few points.
            // Usually high tides are > mean level. 
            // Let's grab gm.altura_media if available.
            const meanMatch = scriptContent.match(/gm\.altura_media=([0-9.]+);/);
            const mean = meanMatch ? parseFloat(meanMatch[1]) : 1.0;

            tides[i].type = current.height > mean ? 'HIGH' : 'LOW';
        }

        return tides;
    }
}
