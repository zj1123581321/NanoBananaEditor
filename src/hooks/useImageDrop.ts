import { useCallback, useEffect, useState } from 'react';

export interface DroppedImageData {
  file: File;
  dataUrl: string;
  width: number;
  height: number;
}

export interface UseImageDropOptions {
  onImageDropped: (imageData: DroppedImageData) => void;
  onError?: (error: string) => void;
  enabled?: boolean;
  targetElement?: HTMLElement | null;
  maxFileSize?: number; // Maximum file size in bytes, default 10MB
  allowedTypes?: string[]; // Allowed file types, default ['image/png', 'image/jpeg', 'image/gif', 'image/webp']
}

/**
 * Image drag and drop upload hook
 * Supports dragging images directly into the application
 */
export const useImageDrop = ({
  onImageDropped,
  onError,
  enabled = true,
  targetElement = null,
  maxFileSize = 10 * 1024 * 1024, // 10MB
  allowedTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp']
}: UseImageDropOptions) => {
  const [isDragOver, setIsDragOver] = useState(false);

  /**
   * Handle drag over event
   */
  const handleDragOver = useCallback((event: DragEvent) => {
    if (!enabled) return;

    event.preventDefault();
    event.stopPropagation();
    
    // Check if dragged items contain files
    if (event.dataTransfer?.types.includes('Files')) {
      setIsDragOver(true);
    }
  }, [enabled]);

  /**
   * Handle drag leave event
   */
  const handleDragLeave = useCallback((event: DragEvent) => {
    if (!enabled) return;

    event.preventDefault();
    event.stopPropagation();
    
    // Only set drag over to false if we're leaving the target element
    const target = event.currentTarget as HTMLElement;
    const relatedTarget = event.relatedTarget as HTMLElement;
    
    if (!target.contains(relatedTarget)) {
      setIsDragOver(false);
    }
  }, [enabled]);

  /**
   * Handle drop event
   */
  const handleDrop = useCallback(async (event: DragEvent) => {
    if (!enabled) return;

    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(false);

    const files = Array.from(event.dataTransfer?.files || []);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));

    if (imageFiles.length === 0) return;

    for (const file of imageFiles) {
      try {
        // Check file type
        if (!allowedTypes.includes(file.type)) {
          onError?.(`Unsupported image format: ${file.type}`);
          continue;
        }

        // Check file size
        if (file.size > maxFileSize) {
          onError?.(`Image file too large: ${(file.size / 1024 / 1024).toFixed(1)}MB, maximum: ${(maxFileSize / 1024 / 1024).toFixed(1)}MB`);
          continue;
        }

        // Convert to DataURL
        const dataUrl = await fileToDataUrl(file);
        
        // Get image dimensions
        const { width, height } = await getImageDimensions(dataUrl);

        const imageData: DroppedImageData = {
          file,
          dataUrl,
          width,
          height
        };

        onImageDropped(imageData);
        break; // Only process first image
      } catch (error) {
        onError?.(error instanceof Error ? error.message : 'Error processing dropped image');
      }
    }
  }, [enabled, onImageDropped, onError, maxFileSize, allowedTypes]);

  /**
   * Add and remove event listeners
   */
  useEffect(() => {
    if (!enabled) return;

    const element = targetElement || document;
    
    element.addEventListener('dragover', handleDragOver as EventListener);
    element.addEventListener('dragleave', handleDragLeave as EventListener);
    element.addEventListener('drop', handleDrop as EventListener);

    return () => {
      element.removeEventListener('dragover', handleDragOver as EventListener);
      element.removeEventListener('dragleave', handleDragLeave as EventListener);
      element.removeEventListener('drop', handleDrop as EventListener);
    };
  }, [enabled, handleDragOver, handleDragLeave, handleDrop, targetElement]);

  return {
    isDragOver,
    // Manual trigger for drop handling (for testing or special scenarios)
    handleManualDrop: handleDrop
  };
};

/**
 * Convert File to DataURL
 */
const fileToDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = () => {
      resolve(reader.result as string);
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read image file'));
    };
    
    reader.readAsDataURL(file);
  });
};

/**
 * Get image dimensions
 */
const getImageDimensions = (dataUrl: string): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight
      });
    };
    
    img.onerror = () => {
      reject(new Error('Failed to get image dimensions'));
    };
    
    img.src = dataUrl;
  });
};