import React from 'react';
import { CheckCircle, AlertCircle, Image, Loader2 } from 'lucide-react';
import { cn } from '../utils/cn';

interface ImagePasteToastProps {
  isVisible: boolean;
  message: string;
  type: 'idle' | 'detecting' | 'success' | 'error';
  onClose?: () => void;
}

export const ImagePasteToast: React.FC<ImagePasteToastProps> = ({
  isVisible,
  message,
  type,
  onClose
}) => {
  if (!isVisible) return null;

  const getIcon = () => {
    switch (type) {
      case 'detecting':
        return <Image className="w-5 h-5 text-blue-600" />;
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Loader2 className="w-5 h-5 animate-spin text-gray-600" />;
    }
  };

  const getStyles = () => {
    switch (type) {
      case 'detecting':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2 duration-300">
      <div className={cn(
        "max-w-sm p-4 rounded-lg shadow-lg border backdrop-blur-sm",
        getStyles()
      )}>
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            {getIcon()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">
              {message}
            </p>
            {type === 'detecting' && (
              <p className="text-xs mt-1 opacity-75">
                支持 PNG、JPEG、GIF、WebP 格式
              </p>
            )}
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <span className="sr-only">关闭</span>
              ✕
            </button>
          )}
        </div>
      </div>
    </div>
  );
};