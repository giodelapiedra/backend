import React, { useState, useEffect } from 'react';
import { Avatar } from '@mui/material';
import api from '../utils/api';

interface SecureImageProps {
  imagePath: string;
  alt: string;
  style?: React.CSSProperties;
  fallbackIcon?: React.ReactNode;
}

const SecureImage: React.FC<SecureImageProps> = ({ 
  imagePath, 
  alt, 
  style, 
  fallbackIcon 
}) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchImage = async () => {
      try {
        setLoading(true);
        setError(false);
        
        // Extract filename and type from path
        const filename = imagePath.split('/').pop();
        const type = imagePath.includes('/users/') ? 'users' : 'incidents';
        
        // Fetch image as blob with authentication
        const response = await api.get(`/images/${type}/${filename}`, {
          responseType: 'blob'
        });
        
        // Create object URL from blob
        const blob = new Blob([response.data]);
        const url = URL.createObjectURL(blob);
        setImageUrl(url);
        
      } catch (error) {
        console.error('Error loading secure image:', error);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    if (imagePath) {
      fetchImage();
    }
  }, [imagePath]);

  // Cleanup object URL on unmount
  useEffect(() => {
    return () => {
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl);
      }
    };
  }, [imageUrl]);

  if (loading) {
    return (
      <Avatar style={style}>
        {fallbackIcon}
      </Avatar>
    );
  }

  if (error || !imageUrl) {
    return (
      <Avatar style={style}>
        {fallbackIcon}
      </Avatar>
    );
  }

  return (
    <img
      src={imageUrl}
      alt={alt}
      style={style}
      onError={() => setError(true)}
    />
  );
};

export default SecureImage;
