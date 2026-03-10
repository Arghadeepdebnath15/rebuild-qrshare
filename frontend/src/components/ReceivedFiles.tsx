import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Card,
  Typography,
  List,
  ListItem,
  ListItemText,
  Divider,
  Badge,
  IconButton,
  Button,
  alpha,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import FolderIcon from '@mui/icons-material/Folder';
import NoFilesIcon from '@mui/icons-material/FileCopy';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import DownloadIcon from '@mui/icons-material/Download';
import { useTheme } from '@mui/material/styles';
import { API_URL, CONFIG } from '../config';

interface FileInfo {
  id: string;
  originalName: string;
  filename: string;
  size: number;
  uploadDate: string;
  url: string;
  isNew?: boolean;
  isPasswordProtected?: boolean;
}

const ReceivedFiles: React.FC = () => {
  const theme = useTheme();
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newFilesCount, setNewFilesCount] = useState(0);
  const [downloadingFiles, setDownloadingFiles] = useState<Set<string>>(new Set());
  const [passwordDialog, setPasswordDialog] = useState<{
    open: boolean;
    fileId: string;
    filename: string;
  }>({ open: false, fileId: '', filename: '' });
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Use refs for values that shouldn't trigger re-renders
  const retryCountRef = useRef(0);
  const lastFetchTimeRef = useRef(0);
  const isMountedRef = useRef(true);

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const calculateRetryDelay = (retry: number) => {
    // Exponential backoff with jitter
    const baseDelay = Math.min(
      CONFIG.MAX_RETRY_DELAY,
      Math.max(CONFIG.MIN_RETRY_DELAY, CONFIG.RETRY_DELAY * Math.pow(2, retry))
    );
    // Add random jitter of up to 1 second
    return baseDelay + Math.random() * 1000;
  };

  const fetchFiles = useCallback(async (isRetry = false) => {
    // Skip if component is unmounted
    if (!isMountedRef.current) return;

    try {
      // If this is not a retry, check if we need to wait
      if (!isRetry) {
        const now = Date.now();
        const timeSinceLastFetch = now - lastFetchTimeRef.current;
        if (timeSinceLastFetch < CONFIG.POLL_INTERVAL) {
          // Skip this fetch if it's too soon
          return;
        }
      }

      setLoading(true);
      setError(null);

      const deviceId = localStorage.getItem('deviceId');
      if (!deviceId) {
        throw new Error('Device ID not found');
      }

      const response = await fetch(`${API_URL}/api/files/recent/${deviceId}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Origin': window.location.origin,
          'X-Requested-With': 'XMLHttpRequest'
        },
        credentials: 'include',
        mode: 'cors'
      });

      if (!response.ok) {
        let errorMessage;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || `HTTP error! status: ${response.status}`;
        } catch {
          errorMessage = `HTTP error! status: ${response.status}`;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();

      if (!Array.isArray(data)) {
        throw new Error('Invalid response format: expected an array');
      }

      // Reset retry count on successful fetch
      retryCountRef.current = 0;
      lastFetchTimeRef.current = Date.now();

      // Mark files as new if they were uploaded in the last 5 minutes
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const processedFiles = data.map((file: FileInfo) => ({
        ...file,
        isNew: new Date(file.uploadDate) > fiveMinutesAgo
      }));

      if (isMountedRef.current) {
        setFiles(processedFiles);
        setNewFilesCount(processedFiles.filter((f: FileInfo) => f.isNew).length);
      }
    } catch (err) {
      const errorMessage = err instanceof Error
        ? `Error: ${err.message}`
        : 'An unknown error occurred';

      if (isMountedRef.current) {
        setError(errorMessage);
      }
      console.error('Error fetching files:', err);

      // Implement retry logic with exponential backoff
      if (retryCountRef.current < CONFIG.MAX_RETRIES) {
        retryCountRef.current += 1;
        const delay = calculateRetryDelay(retryCountRef.current);
        await sleep(delay);
        if (isMountedRef.current) {
          await fetchFiles(true); // Mark this as a retry attempt
        }
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, []); // Empty dependency array since we're using refs

  // Setup polling with cleanup
  useEffect(() => {
    isMountedRef.current = true;
    fetchFiles(); // Initial fetch

    // Set up polling interval
    const intervalId = setInterval(() => {
      if (isMountedRef.current) {
        fetchFiles();
      }
    }, CONFIG.POLL_INTERVAL);

    // Cleanup function
    return () => {
      isMountedRef.current = false;
      clearInterval(intervalId);
    };
  }, [fetchFiles]);


  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const markAllAsRead = async () => {
    try {
      await fetch(`${API_URL}/api/files/mark-all-read`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        mode: 'cors'
      });
      setFiles(files.map(file => ({ ...file, isNew: false })));
      setNewFilesCount(0);
    } catch (err) {
      console.error('Error marking files as read:', err);
    }
  };

  const handleDownload = async (file: FileInfo) => {
    if (downloadingFiles.has(file.id)) return;

    try {
      setDownloadingFiles(prev => {
        const next = new Set(prev);
        next.add(file.id);
        return next;
      });

      // If file is password protected, show password dialog
      if (file.isPasswordProtected) {
        setPasswordDialog({
          open: true,
          fileId: file.id,
          filename: file.filename
        });
        return;
      }

      await downloadFile(file);
    } catch (err) {
      console.error('Download error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to download file';
      setError(`Error downloading ${file.originalName}: ${errorMessage}`);
      setTimeout(() => setError(null), 5000);
    } finally {
      setDownloadingFiles(prev => {
        const next = new Set(prev);
        next.delete(file.id);
        return next;
      });
    }
  };

  const verifyPassword = async (file: FileInfo, password: string): Promise<string> => {
    const response = await fetch(`${API_URL}/api/files/verify-password/${file.filename}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ password }),
    });

    if (!response.ok) {
      throw new Error('Failed to verify password');
    }

    const data = await response.json();
    if (!data.valid) {
      throw new Error(data.message || 'Invalid password');
    }

    return file.id;
  };

  const downloadFile = async (file: FileInfo, verificationToken?: string) => {
    const downloadUrl = `${API_URL}/api/files/download/${file.filename}${verificationToken ? `?token=${verificationToken}` : ''
      }`;

    const response = await fetch(downloadUrl, {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      if (response.status === 403) {
        const data = await response.json();
        if (data.requiresPassword) {
          setPasswordDialog({
            open: true,
            fileId: file.id,
            filename: file.filename
          });
          return;
        }
      }
      throw new Error(`Failed to download file (Status: ${response.status})`);
    }

    // Check if the response is JSON (error message) or a blob (actual file)
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      if (data.requiresPassword) {
        setPasswordDialog({
          open: true,
          fileId: file.id,
          filename: file.filename
        });
        return;
      }
      throw new Error(data.message || 'Failed to download file');
    }

    const blob = await response.blob();
    if (blob.size === 0) {
      throw new Error('Downloaded file is empty');
    }

    // Create and trigger download
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = file.originalName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const handlePasswordSubmit = async () => {
    const file = files.find(f => f.id === passwordDialog.fileId);
    if (!file) return;

    try {
      // First verify the password
      const verificationToken = await verifyPassword(file, password);

      // If password is valid, proceed with download
      await downloadFile(file, verificationToken);

      // Clear password dialog
      setPasswordDialog({ open: false, fileId: '', filename: '' });
      setPassword('');
      setPasswordError('');
    } catch (err) {
      console.error('Download error:', err);
      setPasswordError(err instanceof Error ? err.message : 'Invalid password. Please try again.');
    }
  };

  const renderContent = () => {
    if (loading && files.length === 0) {
      return (
        <Box sx={{ textAlign: 'center', py: 3 }}>
          <Typography>Loading files...</Typography>
        </Box>
      );
    }

    if (error) {
      return (
        <Box sx={{ textAlign: 'center', py: 3 }}>
          <Typography color="error">{error}</Typography>
        </Box>
      );
    }

    if (files.length === 0) {
      return (
        <Box sx={{
          textAlign: 'center',
          py: 3,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2
        }}>
          <NoFilesIcon sx={{ fontSize: 48, color: 'text.secondary' }} />
          <Typography color="text.secondary">No files received yet</Typography>
        </Box>
      );
    }

    return (
      <List>
        {files.map((file, index) => (
          <React.Fragment key={file.id}>
            <ListItem
              sx={{
                bgcolor: file.isNew ? alpha(theme.palette.info.main, 0.1) : 'transparent',
                borderRadius: 1,
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                alignItems: { xs: 'stretch', sm: 'center' },
                gap: 1,
                py: 2,
              }}
            >
              <Box sx={{
                display: 'flex',
                alignItems: 'center',
                flex: 1,
                minWidth: 0, // This ensures text truncation works
              }}>
                <FolderIcon sx={{ mr: 2, color: 'primary.main' }} />
                <ListItemText
                  primary={
                    <Typography
                      variant="subtitle1"
                      sx={{
                        fontWeight: file.isNew ? 600 : 400,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {file.originalName}
                    </Typography>
                  }
                  secondary={
                    <Typography component="div" variant="body2" color="text.secondary">
                      <Box sx={{
                        display: 'flex',
                        flexDirection: { xs: 'column', sm: 'row' },
                        gap: { xs: 0.5, sm: 2 },
                        '& > span': {
                          fontSize: '0.875rem',
                        }
                      }}>
                        <span>{formatFileSize(file.size)}</span>
                        <span>{formatDate(file.uploadDate)}</span>
                      </Box>
                    </Typography>
                  }
                />
              </Box>
              <Button
                variant="contained"
                color="primary"
                startIcon={<DownloadIcon />}
                onClick={() => handleDownload(file)}
                disabled={downloadingFiles.has(file.id)}
                sx={{
                  minWidth: 120,
                  alignSelf: { xs: 'stretch', sm: 'center' }
                }}
              >
                {downloadingFiles.has(file.id) ? 'Downloading...' : 'Download'}
              </Button>
            </ListItem>
            {index < files.length - 1 && <Divider />}
          </React.Fragment>
        ))}
      </List>
    );
  };

  return (
    <>
      <Card sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <Box sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: 1,
          borderColor: 'divider'
        }}>
          <Badge badgeContent={newFilesCount} color="primary">
            <Typography variant="h6" component="h2">
              Received Files
            </Typography>
          </Badge>
          {newFilesCount > 0 && (
            <IconButton onClick={markAllAsRead} size="small" title="Mark all as read">
              <DoneAllIcon />
            </IconButton>
          )}
        </Box>
        <Box sx={{
          flex: 1,
          overflow: 'auto',
          p: 2
        }}>
          {renderContent()}
        </Box>
      </Card>

      <Dialog
        open={passwordDialog.open}
        onClose={() => {
          setPasswordDialog({ open: false, fileId: '', filename: '' });
          setPassword('');
          setPasswordError('');
        }}
      >
        <DialogTitle>Password Protected File</DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            This file is password protected. Please enter the password to download.
          </Typography>
          <TextField
            fullWidth
            type="password"
            label="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={!!passwordError}
            helperText={passwordError}
            autoFocus
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setPasswordDialog({ open: false, fileId: '', filename: '' });
              setPassword('');
              setPasswordError('');
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handlePasswordSubmit}
            variant="contained"
            disabled={!password}
          >
            Download
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ReceivedFiles; 