const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fileRoutes = require('./routes/fileRoutes');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Force HTTPS in production
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    // Check if the request is already HTTPS or is from a proxy that used HTTPS
    if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
      next();
    } else {
      // Redirect to HTTPS
      res.redirect(301, `https://${req.headers.host}${req.url}`);
    }
  });
}

// CORS configuration
const corsOptions = {
  origin: true, // Allow all origins
  credentials: true, // Allow credentials
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'Device-Id'
  ],
  maxAge: 86400 // 24 hours
};

// Apply CORS middleware
app.use(cors(corsOptions));

// Handle preflight requests
app.options('*', cors(corsOptions));

// Parse JSON bodies
app.use(express.json());

// Serve uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// MongoDB connection string directly in code
const MONGODB_URI = 'mongodb+srv://debnatharghadeep_db_user:dQ2zQWVVKA3KWIYC@cluster0.2glreqr.mongodb.net/?appName=Cluster0';

const mongooseOptions = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    family: 4,
    retryWrites: true,
    retryReads: true
};

// Track MongoDB connection status
let isMongoConnected = false;

mongoose.connection.on('connected', () => {
    console.log('MongoDB connected successfully');
    isMongoConnected = true;
});

mongoose.connection.on('error', (err) => {
    console.error('MongoDB connection error:', err.message);
    isMongoConnected = false;
});

mongoose.connection.on('disconnected', () => {
    console.warn('MongoDB disconnected. Attempting to reconnect...');
    isMongoConnected = false;
});

// Connect to MongoDB
const connectToMongo = async () => {
    try {
        await mongoose.connect(MONGODB_URI, mongooseOptions);
        console.log('MongoDB connected successfully');
        isMongoConnected = true;
    } catch (err) {
        console.error('MongoDB connection error:', err.message);
        isMongoConnected = false;
    }
};

// Initial connection attempt
connectToMongo();

// Middleware to check MongoDB connection
app.use((req, res, next) => {
    if (!isMongoConnected && req.path.startsWith('/api/')) {
        return res.status(503).json({
            message: 'Database connection is not available. Please try again later.',
            error: 'MongoDB connection error'
        });
    }
    next();
});

// API Routes
app.use('/api/files', fileRoutes);

// API health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: isMongoConnected ? 'ok' : 'degraded',
        message: isMongoConnected ? 'API is running' : 'API is running but database is not connected',
        database: isMongoConnected ? 'connected' : 'disconnected'
    });
});

// Error handling middleware for API routes
app.use('/api', (err, req, res, next) => {
    console.error('API Error:', err.message);
    res.status(500).json({ 
        message: 'Something went wrong!',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined,
        database: isMongoConnected ? 'connected' : 'disconnected'
    });
});

// Serve static assets in production
if (process.env.NODE_ENV === 'production') {
    // Look for build files in the public directory first
    const publicPath = path.join(__dirname, 'public');
    const buildPath = path.join(__dirname, '../frontend/build');
    
    // Serve static files from public directory first, then try frontend/build
    app.use(express.static(publicPath));
    app.use(express.static(buildPath));

    // Catch-all route for frontend - MUST come after API routes
    app.get('*', (req, res, next) => {
        // If this is an API request that wasn't caught by previous routes, return 404
        if (req.url.startsWith('/api/')) {
            return res.status(404).json({ 
                status: 'error',
                message: 'API endpoint not found' 
            });
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
            error: process.env.NODE_ENV === 'development' ? err.message : undefined,
            database: isMongoConnected ? 'connected' : 'disconnected'
        });
    } else {
        res.status(500).send('Internal Server Error');
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log('Available endpoints:');
    console.log('- GET /api/health');
    console.log('- GET /api/files/recent');
    console.log('- POST /api/files/upload');
}); 