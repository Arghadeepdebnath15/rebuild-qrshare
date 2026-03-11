import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  CircularProgress,
  IconButton,
  Fade,
  InputAdornment,
} from '@mui/material';
import {
  LockOutlined,
  LockOpenOutlined,
  DownloadOutlined,
  FilePresentOutlined,
  Visibility,
  VisibilityOff,
  ErrorOutline,
} from '@mui/icons-material';
import axios from 'axios';
import { API_URL } from '../config';

const FileShare: React.FC = () => {
  const [filename, setFilename] = useState<string>('');
  const [fileInfo, setFileInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unlocking, setUnlocking] = useState(false);

  useEffect(() => {
    const pathParts = window.location.pathname.split('/');
    const name = pathParts[pathParts.length - 1];
    setFilename(name);
    fetchFileInfo(name);
  }, []);

  const fetchFileInfo = async (name: string) => {
    try {
      const response = await axios.get(`${API_URL}/api/files/info/${name}`);
      setFileInfo(response.data);
    } catch (err) {
      setError('File not found or has been deleted.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    setUnlocking(true);
    setError(null);
    try {
      // If protected, verify password first
      if (fileInfo.is_password_protected) {
        const verifyResponse = await axios.post(`${API_URL}/api/files/verify-password/${filename}`, {
          password
        });
        if (!verifyResponse.data.valid) {
          setError('Invalid password. Please try again.');
          setUnlocking(false);
          return;
        }
      }

      // Trigger download
      const downloadUrl = `${API_URL}/api/files/download/${filename}${password ? `?password=${encodeURIComponent(password)}` : ''}`;
      
      // For iPad/iOS compatibility, we use a hidden link to trigger the download
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', fileInfo.original_name);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error unlocking file.');
    } finally {
      setUnlocking(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          flexDirection: 'column',
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh', 
          background: '#121212',
          gap: 2
        }}
      >
        <CircularProgress color="primary" />
        <Typography sx={{ color: 'rgba(255,255,255,0.5)' }}>Loading file details...</Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0f0f0f 0%, #1a1a2e 100%)',
        p: 2,
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: '10%',
          left: '10%',
          width: '300px',
          height: '300px',
          background: 'radial-gradient(circle, rgba(41, 98, 255, 0.15) 0%, transparent 70%)',
          zIndex: 0,
        },
        '&::after': {
          content: '""',
          position: 'absolute',
          bottom: '10%',
          right: '10%',
          width: '400px',
          height: '400px',
          background: 'radial-gradient(circle, rgba(124, 77, 255, 0.1) 0%, transparent 70%)',
          zIndex: 0,
        }
      }}
    >
      <Fade in={true} timeout={1000}>
        <Paper
          elevation={0}
          sx={{
            width: '100%',
            maxWidth: 450,
            p: { xs: 3, sm: 5 },
            borderRadius: '32px',
            background: 'rgba(255, 255, 255, 0.03)',
            backdropFilter: 'blur(30px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            textAlign: 'center',
            color: '#fff',
            zIndex: 1,
            position: 'relative',
            boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
          }}
        >
          {error && !fileInfo ? (
            <Box>
              <ErrorOutline sx={{ fontSize: 80, color: '#ff3d60', mb: 3, opacity: 0.8 }} />
              <Typography variant="h4" gutterBottom sx={{ fontWeight: 700 }}>Link Expired</Typography>
              <Typography sx={{ color: 'rgba(255,255,255,0.6)', mb: 4, lineHeight: 1.6 }}>
                {error}
              </Typography>
              <Button 
                variant="outlined" 
                onClick={() => window.location.href = '/'}
                sx={{ 
                  borderRadius: '12px', 
                  px: 4, 
                  py: 1, 
                  borderColor: 'rgba(255,255,255,0.2)',
                  color: '#fff',
                  '&:hover': { borderColor: '#fff' }
                }}
              >
                Go Back Home
              </Button>
            </Box>
          ) : (
            <>
              <Box 
                sx={{ 
                  width: 100, 
                  height: 100, 
                  borderRadius: '30px', 
                  background: 'linear-gradient(135deg, rgba(41, 98, 255, 0.2) 0%, rgba(124, 77, 255, 0.2) 100%)', 
                  display: 'flex', 
                  justifyContent: 'center', 
                  alignItems: 'center', 
                  margin: '0 auto 32px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
                }}
              >
                {fileInfo.is_password_protected ? (
                  <LockOutlined sx={{ fontSize: 48, color: '#4d82ff' }} />
                ) : (
                  <FilePresentOutlined sx={{ fontSize: 48, color: '#4d82ff' }} />
                )}
              </Box>

              <Typography variant="h5" sx={{ fontWeight: 700, mb: 1, wordBreak: 'break-all', letterSpacing: '-0.5px' }}>
                {fileInfo.original_name}
              </Typography>
              <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.5)', mb: 4, fontWeight: 500 }}>
                {formatSize(fileInfo.size)} • {fileInfo.mimetype.split('/')[1].toUpperCase()}
              </Typography>

              {fileInfo.is_password_protected ? (
                <Box sx={{ mb: 4 }}>
                   <Typography variant="body2" sx={{ mb: 2.5, color: 'rgba(255,255,255,0.7)', fontWeight: 400 }}>
                    Enter the password to unlock this file
                  </Typography>
                  <TextField
                    fullWidth
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (error) setError(null);
                    }}
                    error={!!error}
                    helperText={error}
                    variant="outlined"
                    autoFocus
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        color: '#fff',
                        borderRadius: '16px',
                        background: 'rgba(255,255,255,0.03)',
                        '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
                        '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                        '&.Mui-focused fieldset': { borderColor: '#2962ff' },
                      },
                      '& .MuiFormHelperText-root': {
                        color: '#ff3d60',
                        fontWeight: 500
                      }
                    }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <LockOutlined sx={{ color: 'rgba(255,255,255,0.3)', mr: 0.5 }} />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" sx={{ color: 'rgba(255,255,255,0.4)' }}>
                            {showPassword ? <VisibilityOff sx={{ fontSize: 20 }} /> : <Visibility sx={{ fontSize: 20 }} />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && password) handleDownload();
                    }}
                  />
                </Box>
              ) : (
                <Typography variant="body2" sx={{ mb: 4, color: 'rgba(255,255,255,0.7)', background: 'rgba(255,255,255,0.05)', py: 1, borderRadius: '8px' }}>
                  This file is ready for download
                </Typography>
              )}

              <Button
                fullWidth
                variant="contained"
                size="large"
                disabled={unlocking || (fileInfo.is_password_protected && !password)}
                onClick={handleDownload}
                startIcon={unlocking ? <CircularProgress size={20} color="inherit" /> : fileInfo.is_password_protected ? <LockOpenOutlined /> : <DownloadOutlined />}
                sx={{
                  py: 2,
                  borderRadius: '18px',
                  fontSize: '1.1rem',
                  fontWeight: 700,
                  textTransform: 'none',
                  background: 'linear-gradient(45deg, #2962ff 30%, #7c4dff 90%)',
                  boxShadow: '0 10px 25px rgba(41, 98, 255, 0.25)',
                  transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                  '&:hover': {
                    transform: 'scale(1.02)',
                    boxShadow: '0 15px 35px rgba(41, 98, 255, 0.4)',
                  },
                  '&:disabled': {
                    background: 'rgba(255,255,255,0.05)',
                    color: 'rgba(255,255,255,0.2)',
                  }
                }}
              >
                {unlocking ? 'Unlocking...' : fileInfo.is_password_protected ? 'Unlock & Download' : 'Download Now'}
              </Button>

              <Typography variant="caption" sx={{ display: 'block', mt: 6, color: 'rgba(255,255,255,0.2)', letterSpacing: '1px', textTransform: 'uppercase', fontWeight: 600 }}>
                QR File Share Secure
              </Typography>
            </>
          )}
        </Paper>
      </Fade>
    </Box>
  );
};

export default FileShare;
