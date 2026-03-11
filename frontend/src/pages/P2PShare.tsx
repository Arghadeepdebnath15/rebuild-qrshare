import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  CircularProgress,
  Fade,
  LinearProgress,
} from '@mui/material';
import {
  DownloadDoneOutlined,
  ErrorOutline,
  BluetoothSearchingOutlined,
} from '@mui/icons-material';
import Peer from 'peerjs';

const P2PShare: React.FC = () => {
  const [status, setStatus] = useState<'idle' | 'connecting' | 'receiving' | 'completed' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const [fileDetails, setFileDetails] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const receivedChunks = useRef<ArrayBuffer[]>([]);
  const peerRef = useRef<Peer | null>(null);

  const assembleAndDownload = useCallback(() => {
    if (!fileDetails) return;
    const blob = new Blob(receivedChunks.current, { type: fileDetails.type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileDetails.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setStatus('completed');
    setProgress(100);
  }, [fileDetails]);

  const setupConnection = useCallback((conn: any) => {
    conn.on('open', () => {
      setStatus('receiving');
      conn.send({ type: 'READY' });
    });

    conn.on('data', (data: any) => {
      if (data.type === 'START') {
        setFileDetails(data.file);
        receivedChunks.current = [];
        setProgress(0);
      } else if (data.type === 'CHUNK') {
        receivedChunks.current.push(data.chunk);
        const percent = Math.round((receivedChunks.current.length / data.totalChunks) * 100);
        setProgress(percent);
      } else if (data.type === 'END') {
        assembleAndDownload();
      }
    });

    conn.on('close', () => {
      if (status !== 'completed') {
        setError('Sender disconnected.');
        setStatus('error');
      }
    });
  }, [status, assembleAndDownload]);

  useEffect(() => {
    const pathParts = window.location.pathname.split('/');
    const sessionId = pathParts[pathParts.length - 1];

    const peer = new Peer({
      host: window.location.hostname === 'localhost' ? 'localhost' : 'qr-file-backend.onrender.com', 
      port: window.location.hostname === 'localhost' ? 5055 : 443,
      path: '/peerjs',
      secure: window.location.hostname !== 'localhost'
    });

    peerRef.current = peer;

    peer.on('open', () => {
      setStatus('connecting');
      const conn = peer.connect(sessionId, {
        reliable: true
      });
      setupConnection(conn);
    });

    peer.on('error', (err) => {
      console.error('Peer error:', err);
      setError('Connection failed. Make sure the sender is still online.');
      setStatus('error');
    });

    return () => {
      if (peerRef.current) peerRef.current.destroy();
    };
  }, [setupConnection]);

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
          }}
        >
          {status === 'error' ? (
            <Box>
              <ErrorOutline sx={{ fontSize: 80, color: '#ff3d60', mb: 3 }} />
              <Typography variant="h4" sx={{ fontWeight: 700, mb: 2 }}>Oops!</Typography>
              <Typography sx={{ color: 'rgba(255,255,255,0.6)', mb: 4 }}>{error}</Typography>
              <Button variant="outlined" onClick={() => window.location.reload()} sx={{ color: '#fff', borderRadius: '12px' }}>
                Retry Connection
              </Button>
            </Box>
          ) : (
            <>
              <Box sx={{ mb: 4, position: 'relative', display: 'inline-block' }}>
                 <BluetoothSearchingOutlined sx={{ fontSize: 100, color: '#4d82ff', opacity: status === 'connecting' ? 1 : 0.3 }} />
                 {status === 'receiving' && (
                   <CircularProgress
                     variant="determinate"
                     value={progress}
                     size={120}
                     sx={{
                       position: 'absolute',
                       top: -10,
                       left: -10,
                       zIndex: 2,
                       color: '#4d82ff'
                     }}
                   />
                 )}
              </Box>

              <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
                {status === 'connecting' ? 'Establishing P2P Path...' : 
                 status === 'receiving' ? 'Receiving File...' : 
                 status === 'completed' ? 'Transfer Complete!' : 'Preparing...'}
              </Typography>

              {fileDetails && (
                 <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.8)', mb: 3, wordBreak: 'break-all' }}>
                  {fileDetails.name}
                </Typography>
              )}

              {status === 'receiving' && (
                <Box sx={{ mt: 2, width: '100%' }}>
                   <Typography variant="h2" sx={{ fontWeight: 800, mb: 1, color: '#4d82ff' }}>
                    {progress}%
                  </Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={progress} 
                    sx={{ 
                      height: 10, 
                      borderRadius: 5,
                      background: 'rgba(255,255,255,0.05)',
                      '& .MuiLinearProgress-bar': {
                        background: 'linear-gradient(90deg, #2962ff 0%, #7c4dff 100%)',
                      }
                    }} 
                  />
                  <Typography variant="caption" sx={{ display: 'block', mt: 2, color: 'rgba(255,255,255,0.4)' }}>
                    Streaming directly from sender's device...
                  </Typography>
                </Box>
              )}

              {status === 'completed' && (
                <Box sx={{ mt: 2 }}>
                  <DownloadDoneOutlined sx={{ fontSize: 60, color: '#00e676', mb: 2 }} />
                  <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.7)', mb: 4 }}>
                    The file has been received and saved successfully.
                  </Typography>
                  <Button 
                    fullWidth 
                    variant="contained" 
                    onClick={() => window.location.href = '/'}
                    sx={{
                       py: 2,
                       borderRadius: '16px',
                       fontWeight: 700,
                       background: 'linear-gradient(45deg, #2962ff 30%, #7c4dff 90%)',
                    }}
                  >
                    Done
                  </Button>
                </Box>
              )}

              {status === 'connecting' && (
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)', mt: 4 }}>
                  Negotiating secure data channel...
                </Typography>
              )}

              <Typography variant="caption" sx={{ display: 'block', mt: 6, color: 'rgba(255,255,255,0.2)', letterSpacing: '1px', textTransform: 'uppercase', fontWeight: 600 }}>
                Instant Transfer • No Server Storage
              </Typography>
            </>
          )}
        </Paper>
      </Fade>
    </Box>
  );
};

export default P2PShare;
