import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

export const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(cors());
app.use(express.json());

import { TideController } from './controllers/TideController';

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Root check for Vercel
app.get('/', (req, res) => {
    res.json({
        app: 'Marine Data API',
        status: 'running',
        docs: '/api/v1/tides?region=velha-boipeba'
    });
});

app.get('/api/v1/tides', TideController.getTides);

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}
