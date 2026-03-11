import React, { useCallback } from 'react';
import {
  Container,
  ThemeProvider,
  createTheme,
  Tabs,
  Tab,
  Box,
  Paper,
  Typography,
  IconButton,
  useMediaQuery,
  CssBaseline
} from '@mui/material';
import { StyledEngineProvider } from '@mui/material/styles';
import WbSunnyRoundedIcon from '@mui/icons-material/WbSunnyRounded';
import NightlightRoundIcon from '@mui/icons-material/NightlightRound';
import FileUpload from './components/FileUpload';
import UploadQRCode from './components/UploadQRCode';
import UploadedFiles from './components/UploadedFiles';
import ReceivedFiles from './components/ReceivedFiles';
import Blog from './components/Blog';
import MobileUpload from './components/MobileUpload';
import FileShare from './pages/FileShare';
import P2PShare from './pages/P2PShare';

// Add Poppins font
const poppinsFont = document.createElement('link');
poppinsFont.rel = 'stylesheet';
poppinsFont.href = 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap';
document.head.appendChild(poppinsFont);

// Initialize device ID if not present
if (!localStorage.getItem('deviceId')) {
  localStorage.setItem('deviceId', 'device_' + Math.random().toString(36).substr(2, 9));
}


function App() {
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
  const [mode, setMode] = React.useState<'light' | 'dark'>(() => {
    const storedTheme = localStorage.getItem('themeMode');
    if (!storedTheme) {
      const systemTheme = prefersDarkMode ? 'dark' : 'light';
      localStorage.setItem('themeMode', systemTheme);
      return systemTheme;
    }
    return storedTheme as 'light' | 'dark';
  });
  const [tabValue, setTabValue] = React.useState(0);

  const theme = React.useMemo(
    () =>
      createTheme({
        palette: {
          mode,
          primary: {
            main: '#2962ff',
            light: '#768fff',
            dark: '#0039cb',
          },
          secondary: {
            main: '#7c4dff',
            light: '#b47cff',
            dark: '#3f1dcb',
          },
          background: {
            default: mode === 'light' ? '#f5f7ff' : '#121212',
            paper: mode === 'light' ? '#ffffff' : '#1e1e1e',
          },
        },
        typography: {
          fontFamily: '"Poppins", "Roboto", "Helvetica", "Arial", sans-serif',
          h3: {
            fontWeight: 600,
            letterSpacing: '-0.5px',
          },
          h6: {
            fontWeight: 500,
          },
        },
        shape: {
          borderRadius: 12,
        },
        components: {
          MuiButton: {
            styleOverrides: {
              root: {
                borderRadius: '8px',
                textTransform: 'none',
                fontWeight: 600,
                boxShadow: 'none',
                '&:hover': {
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                },
              },
            },
          },
          MuiCard: {
            styleOverrides: {
              root: {
                borderRadius: '16px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
              },
            },
          },
          MuiTab: {
            styleOverrides: {
              root: {
                textTransform: 'none',
                fontWeight: 500,
                fontSize: '1rem',
              },
            },
          },
        },
      }),
    [mode]
  );

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const toggleColorMode = useCallback(() => {
    const newMode = mode === 'light' ? 'dark' : 'light';
    setMode(newMode);
    localStorage.setItem('themeMode', newMode);
  }, [mode]);

  const MainContent = React.useMemo(() => {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          background: mode === 'light'
            ? 'linear-gradient(135deg, #f5f7ff 0%, #ffffff 100%)'
            : 'linear-gradient(135deg, #121212 0%, #1e1e1e 100%)',
          py: 4,
          position: 'relative',
        }}
      >
        {/* Theme Toggle Button */}
        <Box
          sx={{
            position: 'fixed',
            top: { xs: 8, sm: 16 },
            right: { xs: 8, sm: 16 },
            zIndex: 1200,
          }}
        >
          <IconButton
            onClick={toggleColorMode}
            sx={{
              bgcolor: theme.palette.background.paper,
              boxShadow: theme.shadows[4],
              width: { xs: 36, sm: 40 },
              height: { xs: 36, sm: 40 },
              transition: 'transform 0.3s ease-in-out, background-color 0.3s ease-in-out',
              '&:hover': {
                bgcolor: theme.palette.background.paper,
                transform: 'rotate(45deg)',
              },
            }}
          >
            {mode === 'dark' ? (
              <WbSunnyRoundedIcon
                sx={{
                  color: '#ffd700',
                  fontSize: { xs: 20, sm: 24 },
                }}
              />
            ) : (
              <NightlightRoundIcon
                sx={{
                  color: '#5c6bc0',
                  fontSize: { xs: 20, sm: 24 },
                }}
              />
            )}
          </IconButton>
        </Box>

        <Container maxWidth="lg">
          <Paper
            elevation={0}
            sx={{
              p: 4,
              background: mode === 'light'
                ? 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.95) 100%)'
                : 'linear-gradient(135deg, rgba(30,30,30,0.9) 0%, rgba(30,30,30,0.95) 100%)',
              backdropFilter: 'blur(10px)',
              borderRadius: '24px',
              border: '1px solid',
              borderColor: mode === 'light' ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)',
            }}
          >
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <Typography
                variant="h3"
                component="h1"
                gutterBottom
                sx={{
                  background: mode === 'light'
                    ? 'linear-gradient(45deg, #2962ff 30%, #7c4dff 90%)'
                    : 'linear-gradient(45deg, #768fff 30%, #b47cff 90%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  mb: 2,
                }}
              >
                QR File Transfer
              </Typography>
              <Typography
                variant="h6"
                component="h2"
                color="text.secondary"
                sx={{
                  maxWidth: '600px',
                  margin: '0 auto',
                  opacity: 0.8,
                }}
              >
                Share Files Instantly with QR Codes - Fast, Secure, and Easy to Use
              </Typography>
            </Box>

            <Box
              sx={{
                borderBottom: 1,
                borderColor: 'divider',
                mb: 4,
              }}
            >
              <Tabs
                value={tabValue}
                onChange={handleTabChange}
                centered
              >
                <Tab label="Upload File" />
                <Tab label="Blog" />
              </Tabs>
            </Box>

            {tabValue === 0 && (
              <>
                <FileUpload />
                <UploadQRCode />
                <Box sx={{ mt: 2, mb: 4 }}>
                  <ReceivedFiles />
                </Box>
                {/* All Uploaded Files Section - Always Visible on Main Page */}
                <UploadedFiles />
              </>
            )}
            {tabValue === 1 && <Blog />}
          </Paper>
        </Container>
      </Box>
    );
  }, [mode, tabValue, theme, toggleColorMode]);

  if (window.location.pathname === '/upload') {
    return (
      <StyledEngineProvider injectFirst>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <MobileUpload />
        </ThemeProvider>
      </StyledEngineProvider>
    );
  }

    );
  }

  if (window.location.pathname.startsWith('/p2p/')) {
    return (
      <StyledEngineProvider injectFirst>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <P2PShare />
        </ThemeProvider>
      </StyledEngineProvider>
    );
  }

  if (window.location.pathname.startsWith('/share/')) {
    return (
      <StyledEngineProvider injectFirst>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <FileShare />
        </ThemeProvider>
      </StyledEngineProvider>
    );
  }

  return (
    <StyledEngineProvider injectFirst>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {MainContent}
      </ThemeProvider>
    </StyledEngineProvider>
  );
}

export default App;
