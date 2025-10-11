/**
 * Utility functions for handling image URLs
 */

/**
 * Checks if an image URL is a Supabase storage URL
 */
const isSupabaseUrl = (url: string): boolean => {
  return url.includes('supabase.co') || url.includes('/storage/v1/object/');
};

/**
 * Checks if an image URL is a base64 data URL
 */
const isBase64Url = (url: string): boolean => {
  return url.startsWith('data:image/');
};

/**
 * Constructs the full URL for an uploaded image
 * @param imagePath - The relative path or full URL to the image
 * @returns The full URL to access the image
 */
export const getImageUrl = (imagePath: string): string => {
  // If it's already a full URL (Supabase or base64), return as is
  if (isSupabaseUrl(imagePath) || isBase64Url(imagePath) || imagePath.startsWith('http')) {
    return imagePath;
  }
  
  // Get the base URL from environment variable
  const baseUrl = process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5001';
  
  // Ensure imagePath starts with /
  const normalizedPath = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
  
  // Construct the full URL
  const fullUrl = `${baseUrl}${normalizedPath}`;
  
  return fullUrl;
};

/**
 * Creates an image element with error handling and fallback
 * @param imagePath - The relative path or full URL to the image
 * @param onError - Optional callback for error handling
 * @param onLoad - Optional callback for successful load
 * @returns Image element props
 */
export const createImageProps = (
  imagePath: string | null | undefined,
  onError?: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void,
  onLoad?: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void
) => {
  // Handle null/undefined imagePath
  if (!imagePath) {
    return {
      src: getDefaultAvatarUrl(),
      onError: onError,
      onLoad: onLoad,
      crossOrigin: 'anonymous' as 'anonymous'
    };
  }

  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const img = e.currentTarget;
    const originalSrc = img.src;
    
    // Check if it's already the fallback to prevent infinite loop
    if (!originalSrc.includes('svg+xml') && !originalSrc.includes('data:image')) {
      // Show default avatar on error
      img.src = getDefaultAvatarUrl();
      img.style.border = 'none';
      
      console.warn('Image failed to load:', originalSrc);
      console.log('Switching to fallback avatar');
    }
    
    // Call the original onError callback if provided
    if (onError) {
      onError(e);
    }
  };

  const handleLoad = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    // Reset any error styling on successful load
    e.currentTarget.style.border = 'none';
    
    // Call the original onLoad callback if provided
    if (onLoad) {
      onLoad(e);
    }
  };

  // Get the appropriate URL
  let src: string;
  
  if (isSupabaseUrl(imagePath) || isBase64Url(imagePath) || imagePath.startsWith('http')) {
    // Use the URL as-is for Supabase storage, base64, or full URLs
    src = imagePath;
  } else {
    // Use getImageUrl for local paths
    src = getImageUrl(imagePath);
  }

  return {
    src: src,
    onError: handleError,
    onLoad: handleLoad,
    crossOrigin: 'anonymous' as 'anonymous'
  };
};

/**
 * Gets the default avatar URL
 */
export const getDefaultAvatarUrl = (): string => {
  // SVG fallback avatar - corrected format
  const avatarSvg = `<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="50" fill="#e0e0e0"/><circle cx="50" cy="35" r="15" fill="#999"/><path d="M20 80 Q50 60 80 80" stroke="#999" stroke-width="3" fill="none"/></svg>`;
  
  return `data:image/svg+xml;base64,${btoa(avatarSvg)}`;
};

/**
 * Optimized profile image props with cache busting for Supabase URLs
 * @param profileImageUrl - The profile image URL from database
 * @returns Image props with proper cache handling
 */
export const getProfileImageProps = (profileImageUrl: string | null | undefined) => {
  if (!profileImageUrl) {
    return createImageProps(getDefaultAvatarUrl());
  }

  let finalUrl = profileImageUrl;

  // For Supabase storage URLs, add cache busting and check if it exists
  if (isSupabaseUrl(profileImageUrl)) {
    const separator = profileImageUrl.includes('?') ? '&' : '?';
    finalUrl = `${profileImageUrl}${separator}t=${Date.now()}`;
    
    // Add a retry mechanism for Supabase URLs
    return {
      ...createImageProps(finalUrl),
      onError: (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
        const img = e.currentTarget;
        
        // If it's a Supabase URL and failed, try without timestamp
        if (isSupabaseUrl(img.src)) {
          const baseUrl = img.src.split('?')[0];
          console.warn(`Supabase image failed: ${img.src}, trying base URL: ${baseUrl}`);
          
          img.src = baseUrl;
        } else {
          // Fall back to default avatar
          img.src = getDefaultAvatarUrl();
          img.style.border = 'none';
          console.log('Switching to fallback avatar');
        }
      }
    };
  }

  return createImageProps(finalUrl);
};

/**
 * Test function to verify image URL construction
 * This can be called from browser console for debugging
 */
export const testImageUrl = (imagePath: string = '/uploads/incidents/incident-1758381266658-855016889.jpg') => {
  const url = getImageUrl(imagePath);
  console.log('Testing image URL:', url);
  
  // Create a test image element
  const img = new Image();
  img.onload = () => console.log('✅ Image loaded successfully:', url);
  img.onerror = () => console.log('❌ Image failed to load:', url);
  img.src = url;
  
  return url;
};

/**
 * Debug function to check all image URLs in the current page
 * This can be called from browser console for debugging
 */
export const debugAllImages = () => {
  console.log('🔍 Debugging all images on the page...');
  const images = document.querySelectorAll('img');
  console.log(`Found ${images.length} images on the page`);
  
  images.forEach((img, index) => {
    console.log(`Image ${index + 1}:`, {
      src: img.src,
      complete: img.complete,
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight,
      loading: img.loading,
      crossOrigin: img.crossOrigin,
      supabaseUrl: isSupabaseUrl(img.src),
      base64Url: isBase64Url(img.src)
    });
  });
  
  return images.length;
};

/**
 * Test CORS and image loading
 * This can be called from browser console for debugging
 */
export const testImageCORS = (imagePath: string = '/uploads/incidents/incident-1758381772443-284825278.png') => {
  const url = getImageUrl(imagePath);
  console.log('🧪 Testing image CORS:', url);
  
  // Test with fetch first
  fetch(url, { 
    method: 'GET',
    mode: 'cors',
    credentials: 'omit'
  })
  .then(response => {
    console.log('✅ Fetch response:', response.status, response.statusText);
    return response.blob();
  })
  .then(blob => {
    console.log('✅ Image blob loaded:', blob.size, 'bytes');
    
    // Now test with Image element
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => console.log('✅ Image element loaded successfully');
    img.onerror = (e) => console.log('❌ Image element failed:', e);
    img.src = url;
  })
  .catch(error => {
    console.log('❌ Fetch failed:', error);
  });
  
  return url;
};

/**
 * Clear image cache for a specific URL
 */
export const clearImageCache = (imageUrl: string): string => {
  if (isSupabaseUrl(imageUrl)) {
    // Add cache busting parameter for Supabase URLs
    const separator = imageUrl.includes('?') ? '&' : '?';
    return `${imageUrl}${separator}v=${Date.now()}`;
  }
  
  // For other URLs, add timestamp parameter
  const separator = imageUrl.includes('?') ? '&' : '?';
  return `${imageUrl}${separator}t=${Date.now()}`;
};