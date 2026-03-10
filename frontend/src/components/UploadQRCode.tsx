import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  alpha,
  Paper,
  Zoom,
  IconButton,
  Tooltip,
  ButtonGroup,
  Fade,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import QRCode from 'react-qr-code';
import PhoneIphoneIcon from '@mui/icons-material/PhoneIphone';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import ShareIcon from '@mui/icons-material/Share';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { API_URL } from '../config';

const UploadQRCode: React.FC = () => {
  const theme = useTheme();
  const [shareError, setShareError] = useState<string>('');
  const [isHovered, setIsHovered] = useState(false);
  const [uploadUrl, setUploadUrl] = useState<string>(`${API_URL}/files/upload-page`);

  // Fetch the absolute reachable base URL from backend on mount
  React.useEffect(() => {
    fetch('/api/config/base-url')
      .then(res => res.json())
      .then(data => {
        if (data.baseUrl) {
          // If we got an absolute URL, use it
          const deviceId = localStorage.getItem('deviceId') || '';
          setUploadUrl(`${data.baseUrl}/api/files/upload-page?deviceId=${deviceId}`);
        }
      })
      .catch(err => console.error('Error fetching base URL:', err));
  }, []);

  const copyToClipboard = async (text: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
        textArea.remove();
        return true;
      } catch (err) {
        textArea.remove();
        return false;
      }
    } catch (err) {
      return false;
    }
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'QR File Share - Upload Page',
          text: 'Scan this QR code or use the link to upload files',
          url: uploadUrl,
        });
      } else {
        const copied = await copyToClipboard(uploadUrl);
        if (copied) {
          setShareError('Link copied to clipboard!');
          setTimeout(() => setShareError(''), 3000);
        } else {
          throw new Error('Failed to copy to clipboard');
        }
      }
    } catch (err) {
      console.error('Error sharing:', err);
      setShareError('Failed to share');
      setTimeout(() => setShareError(''), 3000);
    }
  };

  return (
    <Zoom in={true}>
      <Card
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        sx={{
          mt: 4,
          mb: 4,
          background: theme.palette.mode === 'dark'
            ? `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.9)} 0%, ${alpha(theme.palette.background.paper, 0.7)} 100%)`
            : 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.85) 100%)',
          backdropFilter: 'blur(20px)',
          borderRadius: '24px',
          overflow: 'visible',
          position: 'relative',
          transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
          transform: isHovered ? 'translateY(-8px)' : 'none',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            borderRadius: '24px',
            background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.primary.main, 0.05)} 100%)`,
            opacity: isHovered ? 1 : 0,
            transition: 'opacity 0.4s ease',
          },
          '&::after': {
            content: '""',
            position: 'absolute',
            top: -1,
            left: -1,
            right: -1,
            bottom: -1,
            borderRadius: '25px',
            background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
            opacity: isHovered ? 0.2 : 0,
            transition: 'opacity 0.4s ease',
          },
          boxShadow: isHovered
            ? `0 16px 40px ${alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.3 : 0.2)}`
            : `0 8px 20px ${alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.2 : 0.1)}`,
        }}
      >
        <CardContent sx={{
          textAlign: 'center',
          pt: 5,
          position: 'relative',
          zIndex: 1,
          '&:last-child': { pb: 4 },
        }}>
          <Box sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 4,
            px: 2,
          }}>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 600,
                flex: 1,
                background: theme.palette.mode === 'dark'
                  ? 'linear-gradient(45deg, #768fff 30%, #b47cff 90%)'
                  : 'linear-gradient(45deg, #2962ff 30%, #7c4dff 90%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                letterSpacing: '0.5px',
                transform: isHovered ? 'scale(1.03)' : 'none',
                transition: 'transform 0.3s ease',
              }}
            >
              Quick Upload QR Code
            </Typography>
            <ButtonGroup
              variant="outlined"
              size="small"
              sx={{
                '& .MuiButtonGroup-grouped': {
                  borderColor: theme.palette.mode === 'dark'
                    ? alpha(theme.palette.primary.main, 0.3)
                    : alpha(theme.palette.primary.main, 0.2),
                  '&:hover': {
                    borderColor: theme.palette.primary.main,
                    backgroundColor: alpha(theme.palette.primary.main, 0.1),
                  },
                },
              }}
            >
              <Tooltip title="Copy Link" arrow>
                <IconButton
                  onClick={async () => {
                    const copied = await copyToClipboard(uploadUrl);
                    if (copied) {
                      setShareError('Link copied to clipboard!');
                      setTimeout(() => setShareError(''), 3000);
                    } else {
                      setShareError('Failed to copy to clipboard');
                      setTimeout(() => setShareError(''), 3000);
                    }
                  }}
                  size="small"
                  sx={{
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      transform: 'scale(1.1)',
                    },
                  }}
                >
                  <ContentCopyIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Share" arrow>
                <IconButton
                  onClick={handleShare}
                  size="small"
                  sx={{
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      transform: 'scale(1.1)',
                    },
                  }}
                >
                  <ShareIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </ButtonGroup>
          </Box>

          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mb: 4,
              gap: 1,
              px: 2,
            }}
          >
            {[
              { icon: <PhoneIphoneIcon />, label: 'Scan' },
              { icon: <CloudUploadIcon />, label: 'Upload' },
              { icon: <ArrowUpwardIcon />, label: 'Done' }
            ].map((step, index) => (
              <React.Fragment key={step.label}>
                {index > 0 && (
                  <Box
                    sx={{
                      height: 2,
                      width: { xs: 20, sm: 40 },
                      background: `linear-gradient(90deg, ${alpha(theme.palette.primary.main, 0.3)} 0%, ${alpha(theme.palette.primary.main, 0.1)} 100%)`,
                      transform: isHovered ? 'scaleX(1.1)' : 'none',
                      transition: 'transform 0.3s ease',
                    }}
                  />
                )}
                <Paper
                  elevation={0}
                  sx={{
                    textAlign: 'center',
                    px: 2,
                    py: 1.5,
                    borderRadius: 2,
                    bgcolor: theme.palette.mode === 'dark'
                      ? alpha(theme.palette.primary.main, isHovered ? 0.15 : 0.1)
                      : alpha(theme.palette.primary.main, isHovered ? 0.1 : 0.05),
                    border: '1px solid',
                    borderColor: theme.palette.mode === 'dark'
                      ? alpha(theme.palette.primary.main, isHovered ? 0.3 : 0.2)
                      : alpha(theme.palette.primary.main, isHovered ? 0.2 : 0.1),
                    transition: 'all 0.3s ease',
                    transform: isHovered ? 'translateY(-2px)' : 'none',
                    position: 'relative',
                    zIndex: 1,
                  }}
                >
                  <Box
                    sx={{
                      color: theme.palette.mode === 'dark' ? 'primary.light' : 'primary.main',
                      mb: 0.5,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transform: isHovered ? 'scale(1.1)' : 'none',
                      transition: 'transform 0.3s ease',
                    }}
                  >
                    {step.icon}
                  </Box>
                  <Typography
                    variant="body2"
                    sx={{
                      color: theme.palette.mode === 'dark'
                        ? alpha(theme.palette.text.primary, 0.8)
                        : theme.palette.text.secondary,
                      fontWeight: 500,
                    }}
                  >
                    {step.label}
                  </Typography>
                </Paper>
              </React.Fragment>
            ))}
          </Box>

          <Box
            sx={{
              mb: 4,
              position: 'relative',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: -10,
                left: -10,
                right: -10,
                bottom: -10,
                background: `radial-gradient(circle, ${alpha(theme.palette.primary.main, 0.1)} 0%, transparent 70%)`,
                opacity: isHovered ? 1 : 0,
                transition: 'opacity 0.3s ease',
                borderRadius: '20px',
              },
            }}
          >
            <Paper
              elevation={isHovered ? 8 : 2}
              sx={{
                p: 3,
                bgcolor: '#fff',
                borderRadius: '16px',
                display: 'inline-block',
                transition: 'all 0.3s ease',
                transform: isHovered ? 'scale(1.02)' : 'none',
                position: 'relative',
              }}
            >
              <QRCode
                value={uploadUrl}
                size={200}
                style={{
                  display: 'block',
                }}
              />
            </Paper>
          </Box>

          <Typography
            variant="body1"
            sx={{
              color: theme.palette.text.secondary,
              fontWeight: 500,
              opacity: 0.9,
              transform: isHovered ? 'translateY(-2px)' : 'none',
              transition: 'transform 0.3s ease',
            }}
          >
            Scan this QR code to quickly access the upload page
          </Typography>

          <Fade in={!!shareError}>
            <Typography
              variant="body2"
              color={shareError.includes('copied') ? 'success.main' : 'error.main'}
              sx={{
                mt: 2,
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1,
              }}
            >
              {shareError}
            </Typography>
          </Fade>
        </CardContent>
      </Card>
    </Zoom>
  );
};

export default UploadQRCode;
