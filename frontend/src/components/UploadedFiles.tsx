import React from 'react';
import {
  Box,
  Card,
  Typography,
  List,
  ListItem,
  ListItemText,
  Divider,
  Grow,
  IconButton,
  Tooltip,
  CircularProgress,
  alpha,
  useTheme,
} from '@mui/material';
import FolderIcon from '@mui/icons-material/Folder';
import RefreshIcon from '@mui/icons-material/Refresh';
import DownloadIcon from '@mui/icons-material/Download';
import NoFilesIcon from '@mui/icons-material/FileCopy';
import { API_URL } from '../config';

interface FileInfo {
  id: string;
  originalName: string;
  filename: string;
  size: number;
  uploadDate: string;
  url: string;
  downloadCount?: number;
}

const UploadedFiles: React.FC = () => {
  const theme = useTheme();
  const [files, setFiles] = React.useState<FileInfo[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const fetchAllFiles = async (showLoader = true) => {
    try {
      if (showLoader) {
        setLoading(true);
        setError(null);
      }
      const deviceId = localStorage.getItem('deviceId') || '';
      console.log('Fetching files from /api/files/recent for device:', deviceId);
      const response = await fetch(`${API_URL}/api/files/recent?deviceId=${deviceId}`, {
        credentials: 'include',
        mode: 'cors'
      });
      console.log('Response status:', response.status);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch files: ${response.status} - ${errorText}`);
      }
      const data = await response.json();
      console.log('Files fetched:', data);
      setFiles(data);
      setError(null);
    } catch (error) {
      console.error('Error fetching files:', error);
      setError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      if (showLoader) setLoading(false);
      setRefreshing(false);
    }
  };

  React.useEffect(() => {
    fetchAllFiles();
  }, []);

  // Auto-refresh every 2 seconds
  React.useEffect(() => {
    const interval = setInterval(() => {
      fetchAllFiles(false);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAllFiles(false);
  };

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

  if (loading) {
    return (
      <Box sx={{ mt: 4, textAlign: 'center', py: 4 }}>
        <CircularProgress size={40} />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Loading files...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ mt: 4 }}>
        <Card
          elevation={0}
          sx={{
            width: '100%',
            borderRadius: 3,
            p: 3,
            bgcolor: 'error.10%',
            border: '1px solid',
            borderColor: 'error.light',
          }}
        >
          <Typography variant="h6" color="error" gutterBottom>
            Error Loading Files
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {error}
          </Typography>
          <Box sx={{ mt: 2 }}>
            <IconButton onClick={handleRefresh} color="primary">
              <RefreshIcon />
            </IconButton>
            <Typography variant="caption" sx={{ ml: 1 }}>
              Click to retry
            </Typography>
          </Box>
        </Card>
      </Box>
    );
  }

  return (
    <Box sx={{ mt: 4 }}>
      <Card
        elevation={0}
        sx={{
          width: '100%',
          borderRadius: 3,
          bgcolor: theme.palette.mode === 'dark'
            ? 'rgba(255, 255, 255, 0.05)'
            : 'rgba(0, 0, 0, 0.02)',
          overflow: 'hidden',
          border: '1px solid',
          borderColor: theme.palette.mode === 'dark'
            ? 'rgba(255, 255, 255, 0.1)'
            : 'rgba(0, 0, 0, 0.05)',
        }}
      >
        {/* Header */}
        <Box
          sx={{
            p: 2.5,
            borderBottom: 1,
            borderColor: 'divider',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            position: 'sticky',
            top: 0,
            bgcolor: theme.palette.mode === 'dark'
              ? 'rgba(255, 255, 255, 0.05)'
              : 'rgba(255, 255, 255, 0.9)',
            zIndex: 1,
            backdropFilter: 'blur(10px)',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                p: 1,
                borderRadius: 2,
                bgcolor: alpha(theme.palette.primary.main, 0.1),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FolderIcon sx={{ color: theme.palette.primary.main, fontSize: 24 }} />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1.1rem' }}>
                All Uploaded Files
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {files.length} {files.length === 1 ? 'file' : 'files'}
              </Typography>
            </Box>
          </Box>

          <Tooltip title="Refresh">
            <IconButton
              onClick={handleRefresh}
              sx={{
                animation: refreshing ? 'spin 1s linear infinite' : 'none',
                '@keyframes spin': {
                  '0%': { transform: 'rotate(0deg)' },
                  '100%': { transform: 'rotate(360deg)' },
                },
              }}
            >
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Files List */}
        <Box
          sx={{
            overflowY: 'auto',
            maxHeight: '60vh',
            scrollBehavior: 'smooth',
            '&::-webkit-scrollbar': {
              width: '8px',
            },
            '&::-webkit-scrollbar-track': {
              background: 'transparent',
            },
            '&::-webkit-scrollbar-thumb': {
              background: theme.palette.mode === 'dark'
                ? 'rgba(255, 255, 255, 0.2)'
                : 'rgba(0, 0, 0, 0.2)',
              borderRadius: '4px',
            },
          }}
        >
          {files.length === 0 ? (
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                py: 8,
                px: 2,
              }}
            >
              <Box
                sx={{
                  p: 3,
                  borderRadius: '50%',
                  bgcolor: theme.palette.mode === 'dark'
                    ? 'rgba(255, 255, 255, 0.05)'
                    : 'rgba(0, 0, 0, 0.03)',
                  mb: 2,
                }}
              >
                <NoFilesIcon
                  sx={{
                    fontSize: 48,
                    color: theme.palette.mode === 'dark'
                      ? 'rgba(255, 255, 255, 0.3)'
                      : 'rgba(0, 0, 0, 0.2)',
                  }}
                />
              </Box>
              <Typography
                variant="h6"
                color="text.secondary"
                sx={{ fontWeight: 500, mb: 1 }}
              >
                No files uploaded yet
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                textAlign="center"
                sx={{ maxWidth: 300 }}
              >
                Upload files from mobile by scanning the QR code, and they will appear here
              </Typography>
            </Box>
          ) : (
            <List sx={{ py: 1 }}>
              {files.map((file, index) => (
                <Grow
                  key={file.id}
                  in
                  timeout={Math.min(300 + index * 50, 1000)}
                >
                  <Box>
                    {index > 0 && <Divider sx={{ opacity: 0.5 }} />}
                    <ListItem
                      sx={{
                        py: 2,
                        px: 3,
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          bgcolor: theme.palette.mode === 'dark'
                            ? 'rgba(255, 255, 255, 0.08)'
                            : 'rgba(0, 0, 0, 0.04)',
                        },
                      }}
                    >
                      <ListItemText
                        primaryTypographyProps={{ component: 'div' }}
                        secondaryTypographyProps={{ component: 'div' }}
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Typography
                              variant="subtitle1"
                              sx={{
                                fontWeight: 500,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                maxWidth: '250px',
                              }}
                            >
                              {file.originalName}
                            </Typography>
                            <Typography
                              variant="caption"
                              sx={{
                                px: 1,
                                py: 0.25,
                                borderRadius: 1,
                                bgcolor: alpha(theme.palette.primary.main, 0.1),
                                color: theme.palette.primary.main,
                                fontWeight: 500,
                              }}
                            >
                              {formatFileSize(file.size)}
                            </Typography>
                          </Box>
                        }
                        secondary={
                          <Box sx={{ mt: 1, display: 'flex', gap: 2 }}>
                            <Typography variant="caption" color="text.secondary">
                              📅 {formatDate(file.uploadDate)}
                            </Typography>
                            {file.downloadCount !== undefined && file.downloadCount > 0 && (
                              <Typography variant="caption" color="text.secondary">
                                ⬇️ {file.downloadCount} downloads
                              </Typography>
                            )}
                          </Box>
                        }
                      />

                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Tooltip title="Download">
                          <IconButton
                            href={file.url}
                            target="_blank"
                            size="small"
                            sx={{
                              color: theme.palette.primary.main,
                              '&:hover': {
                                bgcolor: alpha(theme.palette.primary.main, 0.1),
                              },
                            }}
                          >
                            <DownloadIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </ListItem>
                  </Box>
                </Grow>
              ))}
            </List>
          )}
        </Box>
      </Card>
    </Box>
  );
};

export default UploadedFiles;

