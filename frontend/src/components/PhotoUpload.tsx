import React, { useState, useRef } from 'react';
import {
  Box,
  Button,
  Typography,
  Avatar,
  IconButton,
  Alert,
  CircularProgress,
  Paper,
} from '@mui/material';
import {
  CloudUpload,
  Delete,
  PhotoCamera,
} from '@mui/icons-material';
import { createImageProps } from '../utils/imageUtils';

interface PhotoUploadProps {
  onPhotoChange: (file: File | null) => void;
  currentPhoto?: string;
  disabled?: boolean;
  size?: number;
}

const PhotoUpload: React.FC<PhotoUploadProps> = ({
  onPhotoChange,
  currentPhoto,
  disabled = false,
  size = 120
}) => {
  const [preview, setPreview] = useState<string | null>(currentPhoto || null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size (2MB limit)
    if (file.size > 2 * 1024 * 1024) {
      setError('Image size must be less than 2MB');
      return;
    }

    setError(null);
    setUploading(true);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
      setUploading(false);
    };
    reader.readAsDataURL(file);

    // Notify parent component
    console.log('📸 PhotoUpload: File selected:', file.name, file.size, file.type);
    onPhotoChange(file);
  };

  const handleRemovePhoto = () => {
    console.log('🗑️ PhotoUpload: Removing photo');
    setPreview(null);
    setError(null);
    onPhotoChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      {/* Photo Display */}
      <Paper
        elevation={2}
        sx={{
          width: size,
          height: size,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          position: 'relative',
          backgroundColor: '#f5f5f5',
          border: '2px dashed #ccc',
        }}
      >
        {uploading ? (
          <CircularProgress size={40} />
        ) : preview ? (
          <img
            src={preview}
            alt="Profile preview"
            style={{
              width: size - 4,
              height: size - 4,
              borderRadius: '50%',
              objectFit: 'cover'
            }}
          />
        ) : currentPhoto ? (
          <img
            {...createImageProps(currentPhoto)}
            alt="Current profile photo"
            style={{
              width: size - 4,
              height: size - 4,
              borderRadius: '50%',
              objectFit: 'cover'
            }}
          />
        ) : (
          <PhotoCamera sx={{ fontSize: size / 3, color: '#999' }} />
        )}
      </Paper>

      {/* Error Message */}
      {error && (
        <Alert severity="error" sx={{ width: '100%', fontSize: '0.875rem' }}>
          {error}
        </Alert>
      )}

      {/* Upload Controls */}
      <Box sx={{ display: 'flex', gap: 1, flexDirection: 'column', alignItems: 'center' }}>
        <Button
          variant="outlined"
          startIcon={<CloudUpload />}
          onClick={handleUploadClick}
          disabled={disabled || uploading}
          size="small"
          sx={{
            minWidth: 120,
            fontSize: '0.875rem',
          }}
        >
          {preview ? 'Change Photo' : 'Upload Photo'}
        </Button>

        {preview && (
          <IconButton
            onClick={handleRemovePhoto}
            disabled={disabled || uploading}
            size="small"
            sx={{ color: '#e74c3c' }}
          >
            <Delete fontSize="small" />
          </IconButton>
        )}
      </Box>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
        disabled={disabled}
      />

      {/* Help Text */}
      <Typography variant="caption" color="text.secondary" textAlign="center">
        Supported formats: JPG, PNG, GIF<br />
        Max size: 2MB
      </Typography>
    </Box>
  );
};

export default PhotoUpload;
