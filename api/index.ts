console.log('[Vercel] Starting function initialization...');
try {
    const { app } = require('../src/server');
    console.log('[Vercel] Server imported successfully.');
    module.exports = app;
} catch (error) {
    console.error('[Vercel] CRITICAL: Failed to import server.', error);
    // Return a fallback error handler
    module.exports = (req, res) => {
        res.status(500).json({ error: 'Critical Boot Error', details: error.toString() });
    };
}
