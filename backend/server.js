const express = require('express');
const http = require('http');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fileRoutes = require('./routes/fileRoutes');
const SecurityService = require('./services/SecurityService');
const { ExpressPeerServer } = require('peer');

dotenv.config();

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5055;

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Error: SUPABASE_URL and SUPABASE_KEY are required in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const securityService = new SecurityService();

// Middleware
app.use(cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Device-Id', 'device-id', 'X-Requested-With', 'Accept', 'Origin'],
    optionsSuccessStatus: 200
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Request logging middleware
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});

// Attach supabase to req for use in routes
app.use((req, res, next) => {
    req.supabase = supabase;
    req.securityService = securityService;
    next();
});

// API Routes
app.use('/api/files', fileRoutes);

// Root route for simple keep-alive
app.get('/', (req, res) => res.send('Backend is alive!'));

// Lightweight ping for cron jobs
app.get('/ping', (req, res) => res.status(200).send('pong'));
app.get(['/api/health', '/health'], async (req, res) => {
    try {
        const { data, error } = await req.supabase.from('files').select('count', { count: 'exact', head: true });
        if (error) throw error;
        res.json({
            status: 'ok',
            message: 'API is running and Supabase is connected',
            database: 'connected'
        });
    } catch (error) {
        res.json({
            status: 'degraded',
            message: 'API is running but Supabase connection failed',
            database: 'disconnected',
            error: error.message
        });
    }
});

// Config endpoint to get reachable base URL for QR codes
app.get(['/api/config/base-url', '/config/base-url'], (req, res) => {
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.headers['x-forwarded-host'] || req.get('host');

    // If we're on localhost and not in production, use the local IP so QR codes work on WiFi
    if ((host.includes('localhost') || host.includes('127.0.0.1')) && process.env.NODE_ENV !== 'production') {
        const { networkInterfaces } = require('os');
        const nets = networkInterfaces();
        for (const name of Object.keys(nets)) {
            for (const net of nets[name]) {
                if (net.family === 'IPv4' && !net.internal) {
                    const port = host.split(':')[1] || '';
                    return res.json({ baseUrl: `${protocol}://${net.address}${port ? ':' + port : ''}` });
                }
            }
        }
    }

    res.json({ baseUrl: `${protocol}://${host}` });
});

// Error handling middleware for API routes
app.use('/api', (err, req, res, next) => {
    console.error('API Error:', err.message);
    res.status(500).json({
        message: 'Something went wrong!',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// PeerJS Signaling Server (Mounted before catch-all)
const peerServer = ExpressPeerServer(server, {
    debug: true,
    proxied: true
});
app.use('/peerjs', peerServer);
console.log('PeerJS signaling registered on /peerjs');

// Serve static assets in production
if (process.env.NODE_ENV === 'production') {
    // Look for build files in the public directory first
    const publicPath = path.join(__dirname, 'public');
    const buildPath = path.join(__dirname, '../frontend/build');

    // Serve static files from public directory first, then try frontend/build
    app.use(express.static(publicPath));
    app.use(express.static(buildPath));

    // Catch-all route for frontend - MUST come after API and PeerJS routes
    app.get('*', (req, res, next) => {
        // If this is an API or PeerJS request that wasn't caught, skip catch-all
        if (req.url.startsWith('/api/') || req.url.startsWith('/peerjs/')) {
            return next();
        }

        // Try to serve index.html from public directory first
        const publicIndexPath = path.join(publicPath, 'index.html');
        const buildIndexPath = path.join(buildPath, 'index.html');

        if (require('fs').existsSync(publicIndexPath)) {
            res.sendFile(publicIndexPath);
        } else if (require('fs').existsSync(buildIndexPath)) {
            res.sendFile(buildIndexPath);
        } else {
            res.status(503).json({
                message: 'Application is starting up. If this persists, please contact support.',
                details: process.env.NODE_ENV === 'development' ? 'Frontend build not found at: ' + publicPath : undefined
            });
        }
    });
}

// Final error handler
app.use((err, req, res, next) => {
    if (res.headersSent) {
        return next(err);
    }

    console.error('Unhandled Error:', err.message);

    const isApiRequest = req.path.startsWith('/api/');
    res.setHeader('Content-Type', isApiRequest ? 'application/json' : 'text/html');

    if (isApiRequest) {
        res.status(500).json({
            message: 'Something went wrong!',
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    } else {
        res.status(500).send('Internal Server Error');
    }
});

// Get local IP address for WiFi sharing
const getLocalIp = () => {
    const { networkInterfaces } = require('os');
    const nets = networkInterfaces();
    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            // Skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
            if (net.family === 'IPv4' && !net.internal) {
                return net.address;
            }
        }
    }
    return 'localhost';
};

const localIp = getLocalIp();

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Local access: http://localhost:${PORT}`);
    console.log(`WiFi access: http://${localIp}:${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);

    // --- PEERJS SIGNALING SERVER MOVED ABOVE ---
    
    console.log('\nAvailable endpoints:');
    console.log(`- GET http://localhost:${PORT}/api/health`);
    console.log(`- GET http://localhost:${PORT}/api/files/recent`);
    console.log(`- POST http://localhost:${PORT}/api/files/upload`);
    console.log(`- GET http://localhost:${PORT}/api/files/upload-page`);

    // --- AUTO-DELETE EXPIRED FILES (5 MINUTES) ---
    setInterval(async () => {
        try {
            // Find files older than 5 minutes
            const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

            const { data: expiredFiles, error } = await supabase
                .from('files')
                .select('*')
                .lt('upload_date', fiveMinutesAgo);

            if (error) {
                console.error('Error fetching expired files:', error);
                return;
            }

            if (expiredFiles && expiredFiles.length > 0) {
                console.log(`Found ${expiredFiles.length} expired file(s) to auto-delete.`);

                for (const file of expiredFiles) {
                    // 1. Delete from local disk
                    if (file.filename) {
                        const filePath = path.join(__dirname, 'uploads', file.filename);
                        if (require('fs').existsSync(filePath)) {
                            require('fs').unlinkSync(filePath);
                            console.log(`-> Deleted expired file from disk: ${file.filename}`);
                        }
                    }

                    // 2. Delete from database
                    await supabase
                        .from('files')
                        .delete()
                        .eq('id', file.id);
                    console.log(`-> Deleted expired db record for: ${file.filename}`);
                }
            }
        } catch (err) {
            console.error('Error in auto-delete worker:', err);
        }
    }, 60 * 1000); // Check every 60 seconds
});

