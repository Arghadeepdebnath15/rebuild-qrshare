import React, { useState, useRef } from 'react';
import {
    Box,
    Typography,
    Button,
    LinearProgress,
    Paper,
    Alert,
    Fade,
    useTheme,
    alpha,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import axios from 'axios';
import { API_URL } from '../config';

const MobileUpload: React.FC = () => {
    const theme = useTheme();
    const [file, setFile] = useState<File | null>(null);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState({ show: false, message: '', severity: 'error' as 'error' | 'success' });
    const [qrCode, setQrCode] = useState<string>('');
    const [downloadUrl, setDownloadUrl] = useState<string>('');
    const [showQR, setShowQR] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const getDeviceId = () => {
        // 1. Check URL parameters (from QR code)
        const params = new URLSearchParams(window.location.search);
        const urlDeviceId = params.get('deviceId');
        if (urlDeviceId && urlDeviceId !== 'null' && urlDeviceId !== 'undefined') {
            return urlDeviceId;
        }

        // 2. Check localStorage
        let deviceId = localStorage.getItem('deviceId');
        if (!deviceId || deviceId === 'null' || deviceId === 'undefined') {
            deviceId = 'device_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('deviceId', deviceId);
        }
        return deviceId;
    };

    const uploadFile = async (file: File) => {
        const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB
        const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
        const identifier = getDeviceId() + '-' + Date.now();

        try {
            // 1. Upload Chunks
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

                await axios.post(`${API_URL}/api/files/upload-chunk`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });

                const progress = Math.round((chunkNumber / totalChunks) * 100);
                setUploadProgress(progress);
            }

            // 2. Complete Upload
            const completeResponse = await axios.post(`${API_URL}/api/files/upload-complete`, {
                identifier,
                filename: file.name,
                totalChunks,
                size: file.size,
                mimetype: file.type,
                isExternal: true,
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'Device-Id': getDeviceId()
                }
            });

            return completeResponse.data;
        } catch (error) {
            throw error;
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setError({ show: false, message: '', severity: 'error' });
        }
    };

    const handleUpload = async () => {
        if (!file) return;

        setLoading(true);
        setUploadProgress(0);
        setError({ show: false, message: '', severity: 'error' });
        setShowQR(false);

        try {
            const result = await uploadFile(file);

            setQrCode(result.qrCode);
            setDownloadUrl(result.file.url);
            setShowQR(true);
            setError({ show: true, message: 'File uploaded successfully! It will appear on the main page.', severity: 'success' });
            setFile(null);
        } catch (err) {
            console.error('Upload error:', err);
            const errorMessage = err instanceof Error ? err.message : 'Upload failed';
            setError({ show: true, message: errorMessage, severity: 'error' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box sx={{ p: 2, minHeight: '100vh', display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4" fontWeight="700" gutterBottom sx={{ color: theme.palette.primary.main }}>
                    Quick Upload
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Upload files to see them on your computer instantly
                </Typography>
            </Box>

            {error.show && (
                <Fade in={error.show}>
                    <Alert
                        severity={error.severity}
                        variant="filled"
                        onClose={() => setError({ ...error, show: false })}
                        sx={{ borderRadius: '12px' }}
                    >
                        {error.message}
                    </Alert>
                </Fade>
            )}

            {!showQR ? (
                <Paper
                    elevation={0}
                    sx={{
                        p: 4,
                        border: '2px dashed',
                        borderColor: file ? theme.palette.primary.main : alpha(theme.palette.text.secondary, 0.2),
                        borderRadius: '24px',
                        textAlign: 'center',
                        bgcolor: alpha(theme.palette.background.paper, 0.5),
                        transition: 'all 0.3s ease',
                    }}
                    onClick={() => fileInputRef.current?.click()}
                >
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        style={{ display: 'none' }}
                    />
                    <CloudUploadIcon sx={{ fontSize: 64, color: file ? theme.palette.primary.main : theme.palette.text.disabled, mb: 2 }} />
                    <Typography variant="h6" gutterBottom>
                        {file ? file.name : 'Tap to select a file'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {file ? `${(file.size / (1024 * 1024)).toFixed(2)} MB` : 'All file types supported'}
                    </Typography>
                </Paper>
            ) : (
                <Paper
                    elevation={0}
                    sx={{
                        p: 4,
                        borderRadius: '24px',
                        textAlign: 'center',
                        bgcolor: alpha(theme.palette.success.main, 0.05),
                        border: '1px solid',
                        borderColor: theme.palette.success.light,
                    }}
                >
                    <CheckCircleOutlineIcon sx={{ fontSize: 64, color: theme.palette.success.main, mb: 2 }} />
                    <Typography variant="h6" gutterBottom>
                        Upload Complete!
                    </Typography>
                    {qrCode && (
                        <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                            <Box
                                component="img"
                                src={qrCode}
                                sx={{ width: 200, height: 200, borderRadius: '12px', border: '8px solid white', boxShadow: theme.shadows[4] }}
                            />
                            <Typography variant="body2" color="text.secondary">
                                Scan this QR to download the file on another device
                            </Typography>
                            <Button
                                variant="outlined"
                                component="a"
                                href={downloadUrl}
                                startIcon={<QrCode2Icon />}
                                fullWidth
                            >
                                Direct Download Link
                            </Button>
                        </Box>
                    )}
                    <Button
                        fullWidth
                        variant="contained"
                        sx={{ mt: 3 }}
                        onClick={() => setShowQR(false)}
                    >
                        Upload Another File
                    </Button>
                </Paper>
            )}

            {file && !loading && !showQR && (
                <Button
                    fullWidth
                    variant="contained"
                    size="large"
                    onClick={handleUpload}
                    sx={{ py: 2, borderRadius: '16px', fontSize: '1.1rem' }}
                >
                    Upload Now
                </Button>
            )}

            {loading && (
                <Box sx={{ width: '100%', mt: 2 }}>
                    <LinearProgress
                        variant="determinate"
                        value={uploadProgress}
                        sx={{ height: 12, borderRadius: 6 }}
                    />
                    <Typography variant="body2" sx={{ mt: 1, textAlign: 'center', fontWeight: 'bold' }}>
                        Uploading... {uploadProgress}%
                    </Typography>
                </Box>
            )}

            <Box sx={{ mt: 'auto', p: 2, textAlign: 'center' }}>
                <Typography variant="caption" color="text.disabled">
                    Your files are processed securely.
                </Typography>
            </Box>
        </Box>
    );
};

export default MobileUpload;
