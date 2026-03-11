const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const QRCode = require('qrcode');
const fs = require('fs');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file upload with quality preservation
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
        // Preserve original file extension and sanitize filename
        const ext = path.extname(file.originalname);
        const name = path.basename(file.originalname, ext)
            .replace(/[^a-zA-Z0-9]/g, '_'); // Sanitize filename
        cb(null, `${name}-${Date.now()}${ext}`);
    }
});

// Configure multer with limits and file filter
const upload = multer({
    storage: storage,
    preservePath: true,
    limits: {
        fileSize: 1024 * 1024 * 1024, // 1GB limit
    },
    fileFilter: function (req, file, cb) {
        // List of allowed file types
        const filetypes = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx|zip|rar|txt|mp3|mp4|mov|avi|wav|psd|ai|eps|svg|webp|ico|json|js|css|html|xml|csv|ppt|pptx|odt|ods|odp|7z|tar|gz|bz2|tiff|bmp|rtf|ogg|webm|m4a|wma|aac|flac|mkv|wmv|mpg|mpeg|3gp|py|java|cpp|h|c|sql|md|yml|yaml|conf|ini|sh|bat|ps1|log/;

        // Check both mimetype and file extension
        const mimetype = filetypes.test(file.mimetype.toLowerCase());
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

        if (mimetype || extname) {
            return cb(null, true);
        }

        cb(new Error(`File type '${path.extname(file.originalname).toLowerCase()}' is not supported. Supported file types: ${filetypes.toString().replace(/\//g, '')}`));
    }
});

// Helper function to get base URL
const getBaseUrl = (req) => {
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
                    return `${protocol}://${net.address}${port ? ':' + port : ''}`;
                }
            }
        }
    }

    return `${protocol}://${host}`;
};

// Get recent files
router.get('/recent', async (req, res) => {
    try {
        const { deviceId } = req.query;
        let query = req.supabase
            .from('files')
            .select('*');

        if (deviceId && deviceId !== 'null' && deviceId !== 'undefined') {
            // Join with device_history to get specific device's internal uploads
            const { data: history, error: historyError } = await req.supabase
                .from('device_history')
                .select('file_id')
                .eq('device_id', deviceId)
                .eq('is_external', false);

            if (historyError) throw historyError;

            // Filter out any nullish file_ids to prevent UUID syntax errors
            const fileIds = (history || [])
                .map(h => h.file_id)
                .filter(id => id && id !== 'null' && id !== 'undefined');

            if (fileIds.length === 0) {
                return res.json([]);
            }
            query = query.in('id', fileIds);
        }

        const { data: files, error } = await query
            .order('upload_date', { ascending: false })
            .limit(10);

        if (error) throw error;

        const baseUrl = getBaseUrl(req);
        const filesWithUrls = files.map(file => ({
            ...file,
            originalName: file.original_name,
            uploadDate: file.upload_date,
            url: `${baseUrl}/api/files/download/${file.filename}`
        }));

        res.json(filesWithUrls);
    } catch (error) {
        console.error('Error fetching recent files:', error);
        res.status(500).json({ message: 'Error fetching recent files', error: error.message });
    }
});

// Get recent files for specific device
router.get('/recent/:deviceId', async (req, res) => {
    try {
        const { deviceId } = req.params;

        if (!deviceId || deviceId === 'null' || deviceId === 'undefined') {
            return res.json([]);
        }

        const { data: history, error } = await req.supabase
            .from('device_history')
            .select('files(*)')
            .eq('device_id', deviceId)
            .eq('is_external', true)
            .order('created_at', { ascending: false });

        if (error) throw error;

        const baseUrl = getBaseUrl(req);

        const files = history
            .filter(item => item && item.files)
            .map(item => ({
                ...item.files,
                originalName: item.files.original_name,
                uploadDate: item.files.upload_date,
                url: `${baseUrl}/api/files/download/${item.files.filename}`
            }));

        res.json(files);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching recent files', error: error.message });
    }
});

// Mark all files as read (no device ID needed)
router.post('/mark-all-read', async (req, res) => {
    try {
        res.json({ message: 'All files marked as read' });
    } catch (error) {
        res.status(500).json({ message: 'Error marking files as read', error: error.message });
    }
});

// Upload file and generate QR code
router.post('/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const baseUrl = getBaseUrl(req);
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        
        let downloadUrl;
        if (req.body.isPasswordProtected === 'true') {
            downloadUrl = `${frontendUrl}/share/${req.file.filename}`;
        } else {
            downloadUrl = `${baseUrl}/api/files/download/${req.file.filename}`;
        }

        // Generate QR code
        const qrCode = await QRCode.toDataURL(downloadUrl);

        const { data: file, error: fileError } = await req.supabase
            .from('files')
            .insert([{
                filename: req.file.filename,
                original_name: req.file.originalname,
                path: req.file.path,
                size: req.file.size,
                mimetype: req.file.mimetype,
                qr_code: qrCode,
                is_password_protected: req.body.isPasswordProtected === 'true',
                password_hash: req.body.isPasswordProtected === 'true' && req.body.password ? 
                    await req.securityService.hashPassword(req.body.password) : null
            }])
            .select()
            .single();

        if (fileError) throw fileError;

        // Store in recent history if device ID is provided
        const deviceId = req.headers['device-id'];
        if (deviceId) {
            await req.supabase
                .from('device_history')
                .upsert([{
                    device_id: deviceId,
                    file_id: file.id,
                    is_external: true
                }], { onConflict: 'device_id,file_id' });
        }

        res.status(201).json({
            file: {
                ...file,
                originalName: file.original_name,
                uploadDate: file.upload_date,
                url: downloadUrl
            },
            qrCode
        });
    } catch (error) {
        console.error('Upload error:', error);

        // Clean up uploaded file if database operation fails
        if (req.file && req.file.path) {
            try {
                fs.unlinkSync(req.file.path);
            } catch (unlinkError) {
                console.error('Error cleaning up file:', unlinkError);
            }
        }

        res.status(500).json({
            message: 'Error uploading file',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// Upload Chunk Endpoint
router.post('/upload-chunk', upload.single('chunk'), async (req, res) => {
    try {
        const { identifier, filename, chunkNumber, totalChunks } = req.body;

        if (!req.file || !identifier || !filename) {
            return res.status(400).json({ message: 'Missing chunk data' });
        }

        const chunkDir = path.join(uploadsDir, 'chunks', identifier);
        try {
            if (!fs.existsSync(chunkDir)) {
                fs.mkdirSync(chunkDir, { recursive: true });
            }
        } catch (e) {
            // Likely another parallel request already created it
            if (!fs.existsSync(chunkDir)) throw e;
        }

        // Move the uploaded chunk to the specific chunk directory
        const chunkPath = path.join(chunkDir, `${chunkNumber}`);
        fs.renameSync(req.file.path, chunkPath);

        res.status(200).json({ message: 'Chunk uploaded successfully' });
    } catch (error) {
        console.error('Chunk upload error:', error);
        res.status(500).json({ message: 'Error uploading chunk', error: error.message });
    }
});

// Complete Chunked Upload Endpoint
router.post('/upload-complete', async (req, res) => {
    try {
        const { identifier, filename, totalChunks, size, mimetype, isExternal } = req.body;

        if (!identifier || !filename || !totalChunks) {
            return res.status(400).json({ message: 'Missing upload completion data' });
        }

        const chunkDir = path.join(uploadsDir, 'chunks', identifier);
        const ext = path.extname(filename);
        const name = path.basename(filename, ext).replace(/[^a-zA-Z0-9]/g, '_');
        const finalFilename = `${name}-${Date.now()}${ext}`;
        const finalPath = path.join(uploadsDir, finalFilename);

        // Combine chunks
        const writeStream = fs.createWriteStream(finalPath);

        // Use a promise to handle stream writing asynchronously
        await new Promise((resolve, reject) => {
            let currentChunk = 1;

            function appendNextChunk() {
                if (currentChunk > totalChunks) {
                    writeStream.end();
                    resolve();
                    return;
                }

                const chunkPath = path.join(chunkDir, `${currentChunk}`);
                if (!fs.existsSync(chunkPath)) {
                    reject(new Error(`Missing chunk ${currentChunk}`));
                    return;
                }

                const data = fs.readFileSync(chunkPath);
                writeStream.write(data);
                fs.unlinkSync(chunkPath); // Delete chunk after reading

                currentChunk++;
                appendNextChunk();
            }

            appendNextChunk();
        });

        // Remove empty chunk directory
        try {
            fs.rmdirSync(chunkDir);
        } catch (e) {
            console.error('Error removing chunk dir:', e);
        }

        const baseUrl = getBaseUrl(req);
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        
        let downloadUrl;
        if (req.body.isPasswordProtected === 'true' || req.body.isPasswordProtected === true) {
            downloadUrl = `${frontendUrl}/share/${finalFilename}`;
        } else {
            downloadUrl = `${baseUrl}/api/files/download/${finalFilename}`;
        }

        // Generate QR code
        const qrCode = await QRCode.toDataURL(downloadUrl);

        const { data: file, error: fileError } = await req.supabase
            .from('files')
            .insert([{
                filename: finalFilename,
                original_name: filename,
                path: finalPath,
                size: parseInt(size),
                mimetype: mimetype || 'application/octet-stream',
                qr_code: qrCode,
                is_password_protected: req.body.isPasswordProtected === 'true' || req.body.isPasswordProtected === true,
                password_hash: (req.body.isPasswordProtected === 'true' || req.body.isPasswordProtected === true) && req.body.password ? 
                    await req.securityService.hashPassword(req.body.password) : null
            }])
            .select()
            .single();

        if (fileError) throw fileError;

        // Store in recent history if device ID is provided
        const deviceId = req.headers['device-id'];
        if (deviceId) {
            await req.supabase
                .from('device_history')
                .upsert([{
                    device_id: deviceId,
                    file_id: file.id,
                    is_external: isExternal === true
                }], { onConflict: 'device_id,file_id' });
        }

        res.status(201).json({
            file: {
                ...file,
                originalName: file.original_name,
                uploadDate: file.upload_date,
                url: downloadUrl
            },
            qrCode
        });

    } catch (error) {
        console.error('Upload completion error:', error);
        res.status(500).json({ message: 'Error completing upload', error: error.message });
    }
});

// Mobile upload page route

router.get('/upload-page', (req, res) => {
    const baseUrl = getBaseUrl(req);
    const deviceId = req.query.deviceId || '';

    // Get the frontend URL - assume it's on the same host but port 3000
    let mainPageUrl = baseUrl;
    if (baseUrl.includes(':5055')) {
        mainPageUrl = baseUrl.replace(':5055', ':3000');
    } else {
        mainPageUrl = baseUrl.replace(/:[0-9]+$/, '') + ':3000';
    }

    // Send a simple HTML form for mobile uploads
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Upload File - QR File Transfer</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <style>
            * {
                box-sizing: border-box;
                -webkit-tap-highlight-color: transparent;
            }
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                margin: 0;
                padding: 20px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .upload-container {
                max-width: 450px;
                width: 100%;
                background: white;
                padding: 30px;
                border-radius: 20px;
                box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            }
            .header {
                text-align: center;
                margin-bottom: 25px;
            }
            .header h1 {
                color: #333;
                margin: 0 0 5px 0;
                font-size: 24px;
                font-weight: 600;
            }
            .header p {
                color: #666;
                margin: 0;
                font-size: 14px;
            }
            .file-drop-area {
                position: relative;
                border: 2px dashed #667eea;
                border-radius: 15px;
                padding: 30px 20px;
                text-align: center;
                background: linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%);
                transition: all 0.3s ease;
                cursor: pointer;
                margin-bottom: 20px;
            }
            .file-drop-area:hover, .file-drop-area.dragover {
                border-color: #667eea;
                background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
            }
            .file-drop-area input[type="file"] {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                opacity: 0;
                cursor: pointer;
            }
            .file-msg {
                color: #666;
                font-size: 14px;
                margin-bottom: 10px;
            }
            .file-name-display {
                color: #667eea;
                font-weight: 600;
                font-size: 16px;
                margin-top: 10px;
            }
            .upload-btn {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 14px 28px;
                border: none;
                border-radius: 12px;
                cursor: pointer;
                width: 100%;
                font-size: 16px;
                font-weight: 600;
                transition: transform 0.2s, box-shadow 0.2s;
                box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
            }
            .upload-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(102, 126, 234, 0.5);
            }
            .upload-btn:disabled {
                opacity: 0.6;
                cursor: not-allowed;
                transform: none;
            }
            .status {
                margin-top: 20px;
                text-align: center;
                padding: 15px;
                border-radius: 10px;
                display: none;
            }
            .status.show {
                display: block;
            }
            .status.success {
                background: #d4edda;
                color: #155724;
            }
            .status.error {
                background: #f8d7da;
                color: #721c24;
            }
            .loading {
                display: none;
                text-align: center;
                margin: 20px 0;
            }
            .loading.show {
                display: block;
            }
            .spinner {
                width: 40px;
                height: 40px;
                border: 4px solid #f3f3f3;
                border-top: 4px solid #667eea;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin: 0 auto 10px;
            }
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            .qr-code {
                text-align: center;
                margin: 20px 0;
                display: none;
                padding: 20px;
                background: #f8f9fa;
                border-radius: 15px;
            }
            .qr-code.show {
                display: block;
            }
            .qr-code img {
                max-width: 180px;
                height: auto;
                border-radius: 10px;
                box-shadow: 0 4px 15px rgba(0,0,0,0.1);
            }
            .qr-code p {
                color: #666;
                font-size: 14px;
                margin-top: 15px;
            }
            .qr-code a {
                color: #667eea;
                text-decoration: none;
                font-weight: 600;
            }
            .recent-files {
                margin-top: 25px;
                border-top: 1px solid #eee;
                padding-top: 20px;
            }
            .recent-files h3 {
                color: #333;
                margin: 0 0 15px 0;
                font-size: 16px;
            }
            .file-item {
                padding: 12px;
                background: #f8f9fa;
                border-radius: 10px;
                margin-bottom: 10px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .file-info {
                flex: 1;
                min-width: 0;
            }
            .file-item-name {
                color: #333;
                font-weight: 500;
                font-size: 14px;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            .file-item-size {
                color: #999;
                font-size: 12px;
                margin-top: 2px;
            }
            .download-btn {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                text-decoration: none;
                padding: 8px 16px;
                border-radius: 8px;
                font-size: 13px;
                font-weight: 500;
            }
            .view-main-btn {
                display: block;
                text-align: center;
                margin-top: 20px;
                padding: 12px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                text-decoration: none;
                border-radius: 10px;
                font-weight: 600;
                font-size: 14px;
                box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
            }
            .view-main-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(102, 126, 234, 0.5);
            }
            .no-files {
                text-align: center;
                color: #999;
                padding: 20px;
                font-size: 14px;
            }
        </style>
    </head>
    <body>
        <div class="upload-container">
            <div class="header">
                <h1>📤 Upload File</h1>
                <p>File will appear on main page after upload</p>
            </div>
            
            <form id="uploadForm" enctype="multipart/form-data">
                <div class="file-drop-area" id="dropArea">
                    <input type="file" id="file" name="file" required>
                    <div class="file-msg">Tap to select or drag & drop</div>
                    <div class="file-name-display" id="fileName"></div>
                </div>
                <button type="submit" class="upload-btn" id="uploadBtn">Upload File</button>
            </form>
            
            <div id="loading" class="loading">
                <div class="spinner"></div>
                <p>Uploading file...</p>
            </div>
            
            <div id="status" class="status"></div>
            
            <div id="qrCode" class="qr-code">
                <img id="qrImage" src="" alt="QR Code">
                <p>📱 Scan to download on other devices</p>
                <p style="font-size: 12px;"><a href="#" id="downloadLink">Click to download file</a></p>
            </div>
            
            <a href="${mainPageUrl}" class="view-main-btn">🏠 View Main Page (See Uploaded Files)</a>
        </div>

        <script>
            const baseUrl = '${baseUrl}';
            const deviceId = '${deviceId}';
            const uploadForm = document.getElementById('uploadForm');
            const fileInput = document.getElementById('file');
            const fileNameDisplay = document.getElementById('fileName');
            const dropArea = document.getElementById('dropArea');
            const uploadBtn = document.getElementById('uploadBtn');
            const loadingDiv = document.getElementById('loading');
            const statusDiv = document.getElementById('status');
            const qrCodeDiv = document.getElementById('qrCode');
            const qrImage = document.getElementById('qrImage');
            const downloadLink = document.getElementById('downloadLink');

            fileInput.addEventListener('change', (e) => {
                if (e.target.files.length > 0) {
                    fileNameDisplay.textContent = '📄 ' + e.target.files[0].name;
                    dropArea.style.borderColor = '#667eea';
                } else {
                    fileNameDisplay.textContent = '';
                }
            });

            ['dragenter', 'dragover'].forEach(eventName => {
                dropArea.addEventListener(eventName, (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    dropArea.classList.add('dragover');
                });
            });

            ['dragleave', 'drop'].forEach(eventName => {
                dropArea.addEventListener(eventName, (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    dropArea.classList.remove('dragover');
                });
            });

            dropArea.addEventListener('drop', (e) => {
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    fileInput.files = files;
                    fileNameDisplay.textContent = '📄 ' + files[0].name;
                    dropArea.style.borderColor = '#667eea';
                }
            });

            uploadForm.onsubmit = async (e) => {
                e.preventDefault();
                const file = fileInput.files[0];
                
                if (!file) {
                    showStatus('Please select a file first', 'error');
                    return;
                }

                uploadBtn.disabled = true;
                uploadBtn.textContent = 'Uploading...';
                loadingDiv.classList.add('show');
                statusDiv.className = 'status';
                qrCodeDiv.classList.remove('show');

                const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks
                const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
                const identifier = deviceId + '-' + Date.now();

                try {
                    // 1. Upload Chunks Sequentially
                    for (let chunkNumber = 1; chunkNumber <= totalChunks; chunkNumber++) {
                        const start = (chunkNumber - 1) * CHUNK_SIZE;
                        const end = Math.min(file.size, start + CHUNK_SIZE);
                        const chunk = file.slice(start, end);

                        const formData = new FormData();
                        formData.append('chunk', chunk, 'blob');
                        formData.append('filename', file.name);
                        formData.append('identifier', identifier);
                        formData.append('chunkNumber', String(chunkNumber));
                        formData.append('totalChunks', String(totalChunks));

                        const response = await fetch(\`\${baseUrl}/api/files/upload-chunk\`, {
                            method: 'POST',
                            body: formData
                        });

                        if (!response.ok) {
                            throw new Error('Failed to upload chunk ' + chunkNumber);
                        }

                        // Update progress UI (reusing uploadBtn text for simplicity)
                        const progress = Math.round((chunkNumber / totalChunks) * 100);
                        uploadBtn.textContent = \`Uploading... \${progress}%\`;
                    }

                    // 2. Complete Upload
                    uploadBtn.textContent = 'Finalizing...';
                    const completeResponse = await fetch(\`\${baseUrl}/api/files/upload-complete\`, {
                        method: 'POST',
                        headers: { 
                            'Content-Type': 'application/json',
                            'Device-Id': deviceId
                        },
                        body: JSON.stringify({
                            identifier: identifier,
                            filename: file.name,
                            totalChunks: totalChunks,
                            size: file.size,
                            mimetype: file.type
                        })
                    });

                    if (!completeResponse.ok) {
                        const error = await completeResponse.json();
                        throw new Error(error.message || 'Upload completion failed');
                    }

                    const data = await completeResponse.json();
                    
                    showStatus('✅ File uploaded successfully! File now appears on main page.', 'success');
                    
                    qrImage.src = data.qrCode;
                    downloadLink.href = data.file.url;
                    qrCodeDiv.classList.add('show');
                    
                    fileInput.value = '';
                    fileNameDisplay.textContent = '';
                } catch (error) {
                    console.error('Upload error:', error);
                    showStatus('❌ ' + (error.message || 'Error uploading file'), 'error');
                } finally {
                    uploadBtn.disabled = false;
                    uploadBtn.textContent = 'Upload File';
                    loadingDiv.classList.remove('show');
                }
            };

            function showStatus(message, type) {
                statusDiv.textContent = message;
                statusDiv.className = 'status show ' + type;
                setTimeout(() => {
                    statusDiv.classList.remove('show');
                }, 5000);
            }
        </script>
    </body>
    </html>
    `;
    res.send(html);
});

// Verify password for a file
router.post('/verify-password/:filename', async (req, res) => {
    try {
        const { password } = req.body;
        const { data: file, error } = await req.supabase
            .from('files')
            .select('*')
            .eq('filename', req.params.filename)
            .maybeSingle();

        if (error) throw error;
        if (!file) {
            return res.status(404).json({ message: 'File not found' });
        }

        if (!file.is_password_protected) {
            return res.json({ valid: true });
        }

        const passwordHash = await req.securityService.hashPassword(password);
        if (passwordHash === file.password_hash) {
            res.json({ valid: true });
        } else {
            res.status(401).json({ valid: false, message: 'Invalid password' });
        }
    } catch (error) {
        console.error('Password verification error:', error);
        res.status(500).json({ message: 'Error verifying password' });
    }
});

// Download file
router.get('/download/:filename', async (req, res) => {
    try {
        const { token, password } = req.query;
        const { data: file, error } = await req.supabase
            .from('files')
            .select('*')
            .eq('filename', req.params.filename)
            .maybeSingle();

        if (error) throw error;
        if (!file) {
            return res.status(404).json({ message: 'File not found' });
        }

        // Check password if protected
        if (file.is_password_protected) {
            const providedPassword = password || token; // Support both for flexibility
            if (!providedPassword) {
                return res.status(403).json({ 
                    message: 'Password required', 
                    requiresPassword: true 
                });
            }

            const passwordHash = await req.securityService.hashPassword(providedPassword);
            if (passwordHash !== file.password_hash) {
                return res.status(401).json({ message: 'Invalid password' });
            }
        }

        const filePath = path.join(uploadsDir, file.filename);
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ message: 'File not found on server' });
        }

        // Update download count
        await req.supabase
            .from('files')
            .update({ download_count: (file.download_count || 0) + 1 })
            .eq('id', file.id);

        // Set proper content type and headers for iPad/iOS download compatibility
        // Using application/octet-stream forces a download instead of a preview
        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.original_name)}"`);
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

        // Stream the file
        const fileStream = fs.createReadStream(filePath);

        fileStream.pipe(res);
    } catch (error) {
        console.error('Download error:', error);
        res.status(500).json({
            message: 'Error downloading file',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// Get file info
router.get('/info/:filename', async (req, res) => {
    try {
        const { data: file, error } = await req.supabase
            .from('files')
            .select('*')
            .eq('filename', req.params.filename)
            .maybeSingle();

        if (error) throw error;
        if (!file) {
            return res.status(404).json({ message: 'File not found' });
        }
        res.json({
            ...file,
            originalName: file.original_name,
            uploadDate: file.upload_date
        });
    } catch (error) {
        res.status(500).json({ message: 'Error getting file info', error: error.message });
    }
});

// Get device-specific files
router.post('/device-files', async (req, res) => {
    try {
        const { fileIds } = req.body;

        if (!Array.isArray(fileIds)) {
            return res.status(400).json({ message: 'fileIds must be an array' });
        }

        const { data: files, error } = await req.supabase
            .from('files')
            .select('*')
            .in('id', fileIds)
            .order('upload_date', { ascending: false });

        if (error) throw error;

        res.json(files.map(file => ({
            ...file,
            originalName: file.original_name,
            uploadDate: file.upload_date
        })));
    } catch (error) {
        console.error('Error fetching device files:', error);
        res.status(500).json({ message: 'Error fetching device files' });
    }
});

// Clear recent history for a device
router.post('/clear-recent-history', async (req, res) => {
    try {
        const { deviceId } = req.body;
        const { error } = await req.supabase
            .from('device_history')
            .delete()
            .eq('device_id', deviceId);

        if (error) throw error;
        res.json({ message: 'Recent history cleared successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error clearing recent history', error: error.message });
    }
});

// Add file to device's recent history
router.post('/add-to-recent/:deviceId', async (req, res) => {
    try {
        const { deviceId } = req.params;
        const { fileId } = req.body;

        const { error } = await req.supabase
            .from('device_history')
            .upsert([{
                device_id: deviceId,
                file_id: fileId
            }], { onConflict: 'device_id,file_id' });

        if (error) throw error;
        res.json({ message: 'File added to recent history' });
    } catch (error) {
        res.status(500).json({ message: 'Error updating recent history', error: error.message });
    }
});

module.exports = router;
