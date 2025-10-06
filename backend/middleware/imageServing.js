const express = require('express');
const path = require('path');
const fs = require('fs');
const { authMiddleware } = require('../middleware/auth');

// Enhanced image serving middleware
const imageServingMiddleware = (req, res, next) => {
  // Set common headers for all image responses
  res.header('X-Content-Type-Options', 'nosniff');
  res.header('X-Frame-Options', 'DENY');
  res.header('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
  
  next();
};

// Main image serving route - handles both local and Cloudinary images
const serveImage = async (req, res) => {
  try {
    const { type, filename } = req.params;
    
    // Validate type parameter
    if (!['users', 'incidents', 'profiles'].includes(type)) {
      return res.status(400).json({ message: 'Invalid image type' });
    }
    
    // Check if it's a Cloudinary URL
    if (filename.includes('cloudinary.com') || filename.includes('res.cloudinary.com')) {
      // Redirect to Cloudinary URL
      const cloudinaryUrl = filename.startsWith('http') ? filename : `https://${filename}`;
      return res.redirect(cloudinaryUrl);
    }
    
    // Handle local file serving
    const safeFilename = path.basename(filename);
    
    // Validate file extension
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const fileExtension = path.extname(safeFilename).toLowerCase();
    
    if (!allowedExtensions.includes(fileExtension)) {
      return res.status(403).json({ message: 'Invalid file type' });
    }
    
    // Check if file exists in uploads directory
    const filePath = path.join(__dirname, '../uploads', type, safeFilename);
    
    if (fs.existsSync(filePath)) {
      // Set appropriate content type
      const contentTypes = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp'
      };
      
      res.setHeader('Content-Type', contentTypes[fileExtension] || 'application/octet-stream');
      return res.sendFile(filePath);
    }
    
    // If file doesn't exist locally, try to find it with different naming patterns
    const uploadDir = path.join(__dirname, '../uploads', type);
    
    if (fs.existsSync(uploadDir)) {
      const files = fs.readdirSync(uploadDir);
      const matchingFile = files.find(file => {
        // Try different matching patterns
        return file === safeFilename || 
               file.includes(safeFilename.split('-')[0]) ||
               safeFilename.includes(file.split('-')[0]);
      });
      
      if (matchingFile) {
        const matchingFilePath = path.join(uploadDir, matchingFile);
        const contentTypes = {
          '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg',
          '.png': 'image/png',
          '.gif': 'image/gif',
          '.webp': 'image/webp'
        };
        
        res.setHeader('Content-Type', contentTypes[path.extname(matchingFile).toLowerCase()] || 'application/octet-stream');
        return res.sendFile(matchingFilePath);
      }
    }
    
    // Return default avatar if no image found
    return serveDefaultAvatar(res);
    
  } catch (error) {
    console.error('Error serving image:', error);
    return serveDefaultAvatar(res);
  }
};

// Serve default avatar
const serveDefaultAvatar = (res) => {
  const defaultAvatarPath = path.join(__dirname, '../public/default-avatar.png');
  
  if (fs.existsSync(defaultAvatarPath)) {
    res.setHeader('Content-Type', 'image/png');
    return res.sendFile(defaultAvatarPath);
  }
  
  // If no default avatar, return a simple SVG
  const svgAvatar = `
    <svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="50" fill="#e0e0e0"/>
      <circle cx="50" cy="35" r="15" fill="#999"/>
      <path d="M20 80 Q50 60 80 80" stroke="#999" stroke-width="3" fill="none"/>
    </svg>
  `;
  
  res.setHeader('Content-Type', 'image/svg+xml');
  res.send(svgAvatar);
};

// Public image serving (no authentication required)
const servePublicImage = async (req, res) => {
  try {
    const { filename } = req.params;
    
    // Handle Cloudinary URLs
    if (filename.includes('cloudinary.com') || filename.includes('res.cloudinary.com')) {
      const cloudinaryUrl = filename.startsWith('http') ? filename : `https://${filename}`;
      return res.redirect(cloudinaryUrl);
    }
    
    // Handle local files
    const safeFilename = path.basename(filename);
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const fileExtension = path.extname(safeFilename).toLowerCase();
    
    if (!allowedExtensions.includes(fileExtension)) {
      return res.status(403).json({ message: 'Invalid file type' });
    }
    
    // Try different directories
    const possiblePaths = [
      path.join(__dirname, '../uploads/users', safeFilename),
      path.join(__dirname, '../uploads/incidents', safeFilename),
      path.join(__dirname, '../public', safeFilename)
    ];
    
    for (const filePath of possiblePaths) {
      if (fs.existsSync(filePath)) {
        const contentTypes = {
          '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg',
          '.png': 'image/png',
          '.gif': 'image/gif',
          '.webp': 'image/webp'
        };
        
        res.setHeader('Content-Type', contentTypes[fileExtension] || 'application/octet-stream');
        return res.sendFile(filePath);
      }
    }
    
    // Return default avatar
    return serveDefaultAvatar(res);
    
  } catch (error) {
    console.error('Error serving public image:', error);
    return serveDefaultAvatar(res);
  }
};

// Image proxy for Cloudinary (handles CORS issues)
const proxyCloudinaryImage = async (req, res) => {
  try {
    const { url } = req.query;
    
    if (!url || !url.includes('cloudinary.com')) {
      return res.status(400).json({ message: 'Invalid Cloudinary URL' });
    }
    
    // For now, just redirect to the Cloudinary URL
    // In production, you might want to proxy the actual image data
    return res.redirect(url);
    
  } catch (error) {
    console.error('Error proxying Cloudinary image:', error);
    return serveDefaultAvatar(res);
  }
};

module.exports = {
  imageServingMiddleware,
  serveImage,
  servePublicImage,
  proxyCloudinaryImage,
  serveDefaultAvatar
};

