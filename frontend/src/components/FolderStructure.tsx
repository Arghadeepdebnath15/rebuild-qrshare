import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Paper,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  alpha,
} from '@mui/material';
import {
  Folder as FolderIcon,
  CreateNewFolder as CreateNewFolderIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import { API_URL } from '../config';

interface Folder {
  id: string;
  name: string;
  files: string[];
}

interface FolderStructureProps {
  onFolderSelect: (folderId: string) => void;
}

const FolderStructure: React.FC<FolderStructureProps> = ({ onFolderSelect }: FolderStructureProps) => {
  const [folders, setFolders] = useState<Folder[]>([
    { id: 'default', name: 'My Files', files: [] }
  ]);
  const [openDialog, setOpenDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null);

  const fetchFolders = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/folders`);
      if (response.ok) {
        const data = await response.json();
        setFolders(data);
      }
    } catch (error) {
      console.error('Error fetching folders:', error);
    }
  }, []);

  useEffect(() => {
    fetchFolders();
  }, [fetchFolders]);

  return (
    <Box>
      <Typography variant="h6">Folders</Typography>
      <List>
        {folders.map((folder) => (
          <ListItem key={folder.id} onClick={() => onFolderSelect(folder.id)}>
            <ListItemIcon>
              <FolderIcon />
            </ListItemIcon>
            <ListItemText primary={folder.name} />
          </ListItem>
        ))}
      </List>
    </Box>
  );
}; 