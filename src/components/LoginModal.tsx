/**
 * 用户登录弹窗组件
 * 支持多用户模式下的用户认证
 */
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, LogIn, Eye, EyeOff, User, Lock, AlertCircle } from 'lucide-react';
import { authService } from '../services/authService';
import { Button } from './ui/Button';
import { cn } from '../utils/cn';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess?: () => void;
  title?: string;
  description?: string;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  title = '用户登录',
  description = '请登录后使用图片生成功能'
}) => {
  const { t } = useTranslation(['ui', 'common']);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await authService.login(email, password);
      
      if (result.success) {
        console.log('🍌 登录成功:', result.user?.username);
        onLoginSuccess?.();
        onClose();
        
        // 清空表单
        setEmail('');
        setPassword('');
      } else {
        setError(result.error || '登录失败，请检查邮箱和密码');
      }
    } catch (error) {
      console.error('登录过程发生错误:', error);
      setError('登录过程中出现错误，请稍后再试');
    } finally {
      setLoading(false);
    }
  };

  const handleModalClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const handleOverlayClick = () => {
    if (!loading) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={handleOverlayClick}
    >
      <div 
        className="bg-gray-800 rounded-2xl shadow-2xl border border-gray-700 w-full max-w-md mx-4 animate-in fade-in duration-200"
        onClick={handleModalClick}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-yellow-500/20 rounded-full flex items-center justify-center">
              <LogIn className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">{title}</h2>
              <p className="text-sm text-gray-400 mt-1">{description}</p>
            </div>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={loading}
            className="text-gray-400 hover:text-white hover:bg-gray-700"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* 表单内容 */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* 错误提示 */}
          {error && (
            <div className="flex items-center space-x-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* 邮箱输入 */}
          <div className="space-y-2">
            <label htmlFor="email" className="block text-sm font-medium text-gray-300">
              邮箱
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                placeholder="请输入邮箱"
                className={cn(
                  "w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400",
                  "focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  "transition-colors duration-200"
                )}
              />
            </div>
          </div>

          {/* 密码输入 */}
          <div className="space-y-2">
            <label htmlFor="password" className="block text-sm font-medium text-gray-300">
              密码
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                placeholder="请输入密码"
                className={cn(
                  "w-full pl-10 pr-10 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400",
                  "focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  "transition-colors duration-200"
                )}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* 登录按钮 */}
          <div className="pt-4">
            <Button
              type="submit"
              disabled={loading || !email || !password}
              className={cn(
                "w-full py-3 bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-medium rounded-lg",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "transition-all duration-200",
                "flex items-center justify-center space-x-2"
              )}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
                  <span>登录中...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>登录</span>
                </>
              )}
            </Button>
          </div>
        </form>

        {/* 底部提示 */}
        <div className="px-6 pb-6 text-center">
          <p className="text-xs text-gray-500">
            🍌 账户由管理员创建，如需帮助请联系管理员
          </p>
        </div>
      </div>
    </div>
  );
};