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
} from '@mui/material';
import FolderIcon from '@mui/icons-material/Folder';
import NoFilesIcon from '@mui/icons-material/FileCopy';
import { useTheme } from '@mui/material/styles';

interface FileInfo {
  id: string;
  originalName: string;
  filename: string;
  size: number;
  uploadDate: string;
  url: string;
}

const RecentFiles: React.FC = () => {
  const theme = useTheme();
  const [files, setFiles] = React.useState<FileInfo[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Get or generate device ID
  const getDeviceId = React.useCallback(() => {
    let deviceId = localStorage.getItem('deviceId');
    if (!deviceId) {
      deviceId = 'device_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('deviceId', deviceId);
    }
    return deviceId;
  }, []);

  const fetchRecentFiles = async () => {
    try {
      setLoading(true);
      setError(null);
      // Fetch ALL recent files (not device-specific) so uploads from mobile appear on main page
      const response = await fetch(`/api/files/recent`);
      if (!response.ok) {
        throw new Error('Failed to fetch recent files');
      }
      const data = await response.json();
      setFiles(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchRecentFiles();

    // Auto-refresh every 3 seconds to show new uploads from mobile
    const interval = setInterval(() => {
      fetchRecentFiles();
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  if (loading) {
    return (
      <Box sx={{ mt: 4 }}>
        <Card
          elevation={0}
          sx={{
            width: '100%',
            borderRadius: 2,
            bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
            overflow: 'hidden',
            maxHeight: '80vh',
          }}
        >
          <Box
            sx={{
              p: 2,
              borderBottom: 1,
              borderColor: 'divider',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              position: 'sticky',
              top: 0,
              bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
              zIndex: 1,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <FolderIcon sx={{ color: theme.palette.primary.main, fontSize: 24 }} />
              <Typography variant="h6" sx={{ fontWeight: 500, fontSize: '1.1rem' }}>
                Your Files
              </Typography>
            </Box>
          </Box>

          <Box
            sx={{
              overflowY: 'auto',
              scrollBehavior: 'smooth',
              '&::-webkit-scrollbar': {
                width: '8px',
                background: 'transparent',
              },
              '&::-webkit-scrollbar-track': {
                background: 'transparent',
              },
              '&::-webkit-scrollbar-thumb': {
                background: theme.palette.mode === 'dark'
                  ? 'rgba(255, 255, 255, 0.2)'
                  : 'rgba(0, 0, 0, 0.2)',
                borderRadius: '4px',
                '&:hover': {
                  background: theme.palette.mode === 'dark'
                    ? 'rgba(255, 255, 255, 0.3)'
                    : 'rgba(0, 0, 0, 0.3)',
                },
              },
              scrollbarWidth: 'thin',
              scrollbarColor: theme.palette.mode === 'dark'
                ? 'rgba(255, 255, 255, 0.2) transparent'
                : 'rgba(0, 0, 0, 0.2) transparent',
            }}
          >
            {files.length === 0 ? (
              <Box
                sx={{
                  position: 'relative',
                  width: '100%',
                  '&::before': {
                    content: '""',
                    display: 'block',
                    paddingTop: '100%',
                  },
                }}
              >
                <Box
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 1.5,
                  }}
                >
                  <NoFilesIcon
                    sx={{
                      fontSize: 48,
                      color: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.2)',
                    }}
                  />
                  <Typography variant="subtitle1" color="text.secondary" sx={{ fontWeight: 500 }}>
                    No files uploaded yet
                  </Typography>
                  <Typography variant="body2" color="text.secondary" textAlign="center">
                    Your uploaded files will appear here
                  </Typography>
                </Box>
              </Box>
            ) : (
              <List sx={{ py: 0 }}>
                {files.map((file, index) => (
                  <Grow
                    key={file.id}
                    in
                    timeout={300 + index * 100}
                  >
                    <Box>
                      {index > 0 && <Divider />}
                      <ListItem
                        sx={{
                          py: 2,
                          px: { xs: 2, sm: 3 },
                          transition: 'all 0.2s ease',
                          '&:hover': {
                            bgcolor: theme.palette.mode === 'dark'
                              ? 'rgba(255, 255, 255, 0.08)'
                              : 'rgba(0, 0, 0, 0.04)',
                            transform: 'translateY(-1px)',
                          },
                        }}
                      >
                        <ListItemText
                          primaryTypographyProps={{ component: 'div' }}
                          secondaryTypographyProps={{ component: 'div' }}
                          primary={
                            <Typography variant="subtitle1" sx={{ fontWeight: 500, mb: 1 }}>
                              {file.originalName}
                            </Typography>
                          }
                          secondary={
                            <Box sx={{ mt: 1 }}>
                              <Typography
                                variant="caption"
                                display="block"
                                sx={{
                                  mt: 1,
                                  color: 'text.secondary',
                                }}
                              >
                                Uploaded: {formatDate(file.uploadDate)}
                              </Typography>
                            </Box>
                          }
                        />
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
  }

  if (error) {
    return (
      <Box sx={{ mt: 4 }}>
        <Card
          elevation={0}
          sx={{
            width: '100%',
            borderRadius: 2,
            bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
            overflow: 'hidden',
            maxHeight: '80vh',
          }}
        >
          <Box
            sx={{
              p: 2,
              borderBottom: 1,
              borderColor: 'divider',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              position: 'sticky',
              top: 0,
              bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
              zIndex: 1,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <FolderIcon sx={{ color: theme.palette.primary.main, fontSize: 24 }} />
              <Typography variant="h6" sx={{ fontWeight: 500, fontSize: '1.1rem' }}>
                Your Files
              </Typography>
            </Box>
          </Box>

          <Box
            sx={{
              overflowY: 'auto',
              scrollBehavior: 'smooth',
              '&::-webkit-scrollbar': {
                width: '8px',
                background: 'transparent',
              },
              '&::-webkit-scrollbar-track': {
                background: 'transparent',
              },
              '&::-webkit-scrollbar-thumb': {
                background: theme.palette.mode === 'dark'
                  ? 'rgba(255, 255, 255, 0.2)'
                  : 'rgba(0, 0, 0, 0.2)',
                borderRadius: '4px',
                '&:hover': {
                  background: theme.palette.mode === 'dark'
                    ? 'rgba(255, 255, 255, 0.3)'
                    : 'rgba(0, 0, 0, 0.3)',
                },
              },
              scrollbarWidth: 'thin',
              scrollbarColor: theme.palette.mode === 'dark'
                ? 'rgba(255, 255, 255, 0.2) transparent'
                : 'rgba(0, 0, 0, 0.2) transparent',
            }}
          >
            {files.length === 0 ? (
              <Box
                sx={{
                  position: 'relative',
                  width: '100%',
                  '&::before': {
                    content: '""',
                    display: 'block',
                    paddingTop: '100%',
                  },
                }}
              >
                <Box
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 1.5,
                  }}
                >
                  <NoFilesIcon
                    sx={{
                      fontSize: 48,
                      color: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.2)',
                    }}
                  />
                  <Typography variant="subtitle1" color="text.secondary" sx={{ fontWeight: 500 }}>
                    No files uploaded yet
                  </Typography>
                  <Typography variant="body2" color="text.secondary" textAlign="center">
                    Your uploaded files will appear here
                  </Typography>
                </Box>
              </Box>
            ) : (
              <List sx={{ py: 0 }}>
                {files.map((file, index) => (
                  <Grow
                    key={file.id}
                    in
                    timeout={300 + index * 100}
                  >
                    <Box>
                      {index > 0 && <Divider />}
                      <ListItem
                        sx={{
                          py: 2,
                          px: { xs: 2, sm: 3 },
                          transition: 'all 0.2s ease',
                          '&:hover': {
                            bgcolor: theme.palette.mode === 'dark'
                              ? 'rgba(255, 255, 255, 0.08)'
                              : 'rgba(0, 0, 0, 0.04)',
                            transform: 'translateY(-1px)',
                          },
                        }}
                      >
                        <ListItemText
                          primaryTypographyProps={{ component: 'div' }}
                          secondaryTypographyProps={{ component: 'div' }}
                          primary={
                            <Typography variant="subtitle1" sx={{ fontWeight: 500, mb: 1 }}>
                              {file.originalName}
                            </Typography>
                          }
                          secondary={
                            <Box sx={{ mt: 1 }}>
                              <Typography
                                variant="caption"
                                display="block"
                                sx={{
                                  mt: 1,
                                  color: 'text.secondary',
                                }}
                              >
                                Uploaded: {formatDate(file.uploadDate)}
                              </Typography>
                            </Box>
                          }
                        />
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
  }

  return (
    <Box sx={{ mt: 4 }}>
      <Card
        elevation={0}
        sx={{
          width: '100%',
          borderRadius: 2,
          bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
          overflow: 'hidden',
          maxHeight: '80vh',
        }}
      >
        <Box
          sx={{
            p: 2,
            borderBottom: 1,
            borderColor: 'divider',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            position: 'sticky',
            top: 0,
            bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
            zIndex: 1,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <FolderIcon sx={{ color: theme.palette.primary.main, fontSize: 24 }} />
            <Typography variant="h6" sx={{ fontWeight: 500, fontSize: '1.1rem' }}>
              Your Files
            </Typography>
          </Box>
        </Box>

        <Box
          sx={{
            overflowY: 'auto',
            scrollBehavior: 'smooth',
            '&::-webkit-scrollbar': {
              width: '8px',
              background: 'transparent',
            },
            '&::-webkit-scrollbar-track': {
              background: 'transparent',
            },
            '&::-webkit-scrollbar-thumb': {
              background: theme.palette.mode === 'dark'
                ? 'rgba(255, 255, 255, 0.2)'
                : 'rgba(0, 0, 0, 0.2)',
              borderRadius: '4px',
              '&:hover': {
                background: theme.palette.mode === 'dark'
                  ? 'rgba(255, 255, 255, 0.3)'
                  : 'rgba(0, 0, 0, 0.3)',
              },
            },
            scrollbarWidth: 'thin',
            scrollbarColor: theme.palette.mode === 'dark'
              ? 'rgba(255, 255, 255, 0.2) transparent'
              : 'rgba(0, 0, 0, 0.2) transparent',
          }}
        >
          {files.length === 0 ? (
            <Box
              sx={{
                position: 'relative',
                width: '100%',
                '&::before': {
                  content: '""',
                  display: 'block',
                  paddingTop: '100%',
                },
              }}
            >
              <Box
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 1.5,
                }}
              >
                <NoFilesIcon
                  sx={{
                    fontSize: 48,
                    color: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.2)',
                  }}
                />
                <Typography variant="subtitle1" color="text.secondary" sx={{ fontWeight: 500 }}>
                  No files uploaded yet
                </Typography>
                <Typography variant="body2" color="text.secondary" textAlign="center">
                  Your uploaded files will appear here
                </Typography>
              </Box>
            </Box>
          ) : (
            <List sx={{ py: 0 }}>
              {files.map((file, index) => (
                <Grow
                  key={file.id}
                  in
                  timeout={300 + index * 100}
                >
                  <Box>
                    {index > 0 && <Divider />}
                    <ListItem
                      sx={{
                        py: 2,
                        px: { xs: 2, sm: 3 },
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          bgcolor: theme.palette.mode === 'dark'
                            ? 'rgba(255, 255, 255, 0.08)'
                            : 'rgba(0, 0, 0, 0.04)',
                          transform: 'translateY(-1px)',
                        },
                      }}
                    >
                      <ListItemText
                        primaryTypographyProps={{ component: 'div' }}
                        secondaryTypographyProps={{ component: 'div' }}
                        primary={
                          <Typography variant="subtitle1" sx={{ fontWeight: 500, mb: 1 }}>
                            {file.originalName}
                          </Typography>
                        }
                        secondary={
                          <Box sx={{ mt: 1 }}>
                            <Typography
                              variant="caption"
                              display="block"
                              sx={{
                                mt: 1,
                                color: 'text.secondary',
                              }}
                            >
                              Uploaded: {formatDate(file.uploadDate)}
                            </Typography>
                          </Box>
                        }
                      />
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

export default RecentFiles; 