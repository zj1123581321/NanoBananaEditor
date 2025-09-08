import { useCallback, useEffect, useState } from 'react';

export interface PastedImageData {
  file: File;
  dataUrl: string;
  width: number;
  height: number;
}

export interface UseImagePasteOptions {
  onImagePasted: (imageData: PastedImageData) => void;
  onError?: (error: string) => void;
  enabled?: boolean;
  targetElement?: HTMLElement | null;
  maxFileSize?: number; // 最大文件大小（字节），默认 10MB
  allowedTypes?: string[]; // 允许的文件类型，默认 ['image/png', 'image/jpeg', 'image/gif', 'image/webp']
}

/**
 * 图片粘贴上传 Hook
 * 支持从剪贴板直接粘贴图片到应用中
 */
export const useImagePaste = ({
  onImagePasted,
  onError,
  enabled = true,
  targetElement = null,
  maxFileSize = 10 * 1024 * 1024, // 10MB
  allowedTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp']
}: UseImagePasteOptions) => {

  /**
   * 处理粘贴事件
   */
  const handlePaste = useCallback(async (event: ClipboardEvent) => {
    if (!enabled) return;

    const clipboardData = event.clipboardData;
    if (!clipboardData) return;

    const items = Array.from(clipboardData.items);
    const imageItems = items.filter(item => item.type.startsWith('image/'));

    if (imageItems.length === 0) return;

    // 阻止默认粘贴行为
    event.preventDefault();

    for (const item of imageItems) {
      try {
        const file = item.getAsFile();
        if (!file) continue;

        // 检查文件类型
        if (!allowedTypes.includes(file.type)) {
          onError?.(`不支持的图片格式: ${file.type}`);
          continue;
        }

        // 检查文件大小
        if (file.size > maxFileSize) {
          onError?.(`图片文件过大: ${(file.size / 1024 / 1024).toFixed(1)}MB，最大支持: ${(maxFileSize / 1024 / 1024).toFixed(1)}MB`);
          continue;
        }

        // 转换为 DataURL
        const dataUrl = await fileToDataUrl(file);
        
        // 获取图片尺寸
        const { width, height } = await getImageDimensions(dataUrl);

        const imageData: PastedImageData = {
          file,
          dataUrl,
          width,
          height
        };

        onImagePasted(imageData);
        break; // 只处理第一张图片
      } catch (error) {
        onError?.(error instanceof Error ? error.message : '处理粘贴图片时出错');
      }
    }
  }, [enabled, onImagePasted, onError, maxFileSize, allowedTypes]);

  /**
   * 添加和移除事件监听器
   */
  useEffect(() => {
    if (!enabled) return;

    const element = targetElement || document;
    
    element.addEventListener('paste', handlePaste as EventListener);

    return () => {
      element.removeEventListener('paste', handlePaste as EventListener);
    };
  }, [enabled, handlePaste, targetElement]);

  return {
    // 手动触发粘贴处理（用于测试或特殊场景）
    handleManualPaste: handlePaste
  };
};

/**
 * 将 File 转换为 DataURL
 */
const fileToDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = () => {
      resolve(reader.result as string);
    };
    
    reader.onerror = () => {
      reject(new Error('读取图片文件失败'));
    };
    
    reader.readAsDataURL(file);
  });
};

/**
 * 获取图片尺寸
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
      reject(new Error('获取图片尺寸失败'));
    };
    
    img.src = dataUrl;
  });
};

/**
 * 图片粘贴提示组件的 Hook
 * 用于显示粘贴状态和提示信息
 */
export const useImagePasteStatus = () => {
  const [status, setStatus] = useState<{
    isActive: boolean;
    message: string;
    type: 'idle' | 'detecting' | 'success' | 'error';
  }>({
    isActive: false,
    message: '',
    type: 'idle'
  });

  const showPasteHint = useCallback(() => {
    setStatus({
      isActive: true,
      message: '检测到剪贴板中的图片，按 Ctrl+V (或 Cmd+V) 粘贴',
      type: 'detecting'
    });

    // 3秒后自动隐藏
    setTimeout(() => {
      setStatus(prev => ({ ...prev, isActive: false }));
    }, 3000);
  }, []);

  const showSuccess = useCallback((message: string = '图片已成功粘贴') => {
    setStatus({
      isActive: true,
      message,
      type: 'success'
    });

    setTimeout(() => {
      setStatus(prev => ({ ...prev, isActive: false }));
    }, 2000);
  }, []);

  const showError = useCallback((message: string) => {
    setStatus({
      isActive: true,
      message,
      type: 'error'
    });

    setTimeout(() => {
      setStatus(prev => ({ ...prev, isActive: false }));
    }, 4000);
  }, []);

  const hide = useCallback(() => {
    setStatus({
      isActive: false,
      message: '',
      type: 'idle'
    });
  }, []);

  return {
    status,
    showPasteHint,
    showSuccess,
    showError,
    hide
  };
};