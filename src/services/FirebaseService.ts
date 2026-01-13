import * as admin from 'firebase-admin';
import { TideData, MarineData } from '../models/MarineData';
import path from 'path';

// Load Service Account
let serviceAccount: any = null;

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } catch (e) {
        console.error('[Firebase] Failed to parse FIREBASE_SERVICE_ACCOUNT env var. Is it valid JSON?', e);
    }
} else {
    try {
        const serviceAccountPath = path.resolve(__dirname, '../../serviceAccountKey.json');
        serviceAccount = require(serviceAccountPath);
    } catch (e) {
        console.warn('[Firebase] No serviceAccountKey.json found and no ENV var set.');
    }
}

if (!admin.apps.length) {
    if (serviceAccount) {
        try {
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                databaseURL: "https://maremorere-default-rtdb.firebaseio.com"
            });
            console.log('[Firebase] Initialized successfully.');
        } catch (initErr) {
            console.error('[Firebase] Initialization critical error:', initErr);
            // Don't throw here to allow app to start, but DB calls will fail.
        }
    } else {
        console.error('[Firebase] CRITICAL: No credentials found. Firebase will not work.');
    }
}

export class FirebaseService {
    // Lazy init to prevent crash on class load if app setup failed
    private get db() {
        try {
            return admin.database();
        } catch (e) {
            console.error('[Firebase] Accessed DB before valid init.', e);
            throw e;
        }
    }

    /**
     * Stores aggregated marine data.
     * Structure: tides/{region}/{timestamp} 
     * (Admin SDK has no rules restrictions)
     */
    async saveTides(region: string, data: MarineData): Promise<void> {
        const slug = this.normalizeRegion(region);

        // Batch save each tide point
        const updates: { [key: string]: any } = {};

        for (const tide of data.tides) {
            const date = new Date(tide.time);
            const timestampKey = date.getTime();
            const path = `tides/${slug}/${timestampKey}`;

            updates[path] = {
                ...tide,
                source: data.source,
                location: data.location,
                insertedAt: new Date().toISOString()
            };
        }

        // Multi-path update is atomic in Firebase
        await this.db.ref().update(updates);
        await this.cleanupOldData(slug);
    }

    /**
     * Retrieves tide data for a specific window.
     */
    async getTides(region: string, start: Date, end: Date): Promise<TideData[]> {
        const slug = this.normalizeRegion(region);
        const tidesRef = this.db.ref(`tides/${slug}`);

        // Query by Key (Timestamp)
        const snapshot = await tidesRef
            .orderByKey()
            .startAt(start.getTime().toString())
            .endAt(end.getTime().toString())
            .once('value');

        if (!snapshot.exists()) return [];

        const results: TideData[] = [];
        snapshot.forEach((child) => {
            results.push(child.val() as TideData);
        });
        return results;
    }

    /**
     * Removes data older than 2 days.
     */
    private async cleanupOldData(slug: string): Promise<void> {
        const twoDaysAgo = new Date();
        twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
        const threshold = twoDaysAgo.getTime().toString();

        const tidesRef = this.db.ref(`tides/${slug}`);
        const snapshot = await tidesRef.orderByKey().endAt(threshold).once('value');

        if (snapshot.exists()) {
            const updates: { [key: string]: null } = {};
            snapshot.forEach((child) => {
                updates[`tides/${slug}/${child.key}`] = null;
            });
            await this.db.ref().update(updates);
        }
    }

    private normalizeRegion(region: string): string {
        return region.toLowerCase().replace(/[^a-z0-9]/g, '-');
    }
}
