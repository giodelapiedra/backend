/**
 * Utility functions for handling image URLs
 */

/**
 * Constructs the full URL for an uploaded image
 * @param imagePath - The relative path to the image (e.g., "/uploads/incidents/filename.jpg")
 * @returns The full URL to access the image
 */
export const getImageUrl = (imagePath: string): string => {
  // Get the base URL from environment variable
  const baseUrl = process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5000';
  
  // Ensure imagePath starts with /
  const normalizedPath = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
  
  // Construct the full URL
  const fullUrl = `${baseUrl}${normalizedPath}`;
  
  return fullUrl;
};

/**
 * Creates an image element with error handling and fallback
 * @param imagePath - The relative path to the image
 * @param onError - Optional callback for error handling
 * @param onLoad - Optional callback for successful load
 * @returns Image element props
 */
export const createImageProps = (
  imagePath: string,
  onError?: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void,
  onLoad?: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void
) => {
  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const img = e.currentTarget;
    
    // Check if the image actually failed to load
    if (img.complete && img.naturalWidth === 0) {
      // Try alternative URL construction as fallback
      const alternativeUrl = `http://localhost:5000${imagePath}`;
      
      // Only try alternative if it's different from current URL
      if (img.src !== alternativeUrl) {
        img.src = alternativeUrl;
      } else {
        // Show error placeholder
        img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjVGNUY1Ii8+CjxwYXRoIGQ9Ik03NSA3NUgxMjVWMTI1SDc1Vjc1WiIgZmlsbD0iI0NDQ0NDQyIvPgo8c3ZnIHg9Ijc1IiB5PSI3NSIgd2lkdGg9IjUwIiBoZWlnaHQ9IjUwIiB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzk5OTk5OSIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPgo8cGF0aCBkPSJNMTQuNSAySDkuNVY3SDE0LjVWMloiLz4KPHBhdGggZD0iTTE3IDlIN1YxOUgxN1Y5WiIvPgo8L3N2Zz4KPC9zdmc+';
        img.style.border = '2px dashed #ff0000';
      }
    }
    
    // Call the original onError callback if provided
    if (onError) {
      onError(e);
    }
  };

  const handleLoad = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    // Call the original onLoad callback if provided
    if (onLoad) {
      onLoad(e);
    }
  };

  return {
    src: getImageUrl(imagePath),
    onError: handleError,
    onLoad: handleLoad,
    crossOrigin: 'anonymous' as 'anonymous'
  };
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
      crossOrigin: img.crossOrigin
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
