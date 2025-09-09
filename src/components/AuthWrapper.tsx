/**
 * 认证包装器组件
 * 在多用户模式下管理用户认证状态和登录流程
 */
import React, { useState, useEffect } from 'react';
import { authService, type AuthUser } from '../services/authService';
import { isMultiUserMode } from '../config/app';
import { LoginModal } from './LoginModal';
import { User } from 'lucide-react';
import { Button } from './ui/Button';

interface AuthWrapperProps {
  children: React.ReactNode;
}


/**
 * 认证包装器主组件
 */
export const AuthWrapper: React.FC<AuthWrapperProps> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [authInitialized, setAuthInitialized] = useState(false);

  useEffect(() => {
    // 初始化认证状态
    const initAuth = async () => {
      if (!isMultiUserMode()) {
        // 单用户模式直接设置为已登录
        setUser(authService.getCurrentUser());
        setLoading(false);
        setAuthInitialized(true);
        return;
      }

      // 多用户模式下监听认证状态变化
      const unsubscribe = authService.onAuthStateChange((authUser) => {
        setUser(authUser);
        setLoading(false);
        setAuthInitialized(true);
        
        if (authUser) {
          console.log('🍌 用户认证状态:', authUser.username);
        } else {
          console.log('🍌 用户未登录');
        }
      });

      return () => {
        unsubscribe();
      };
    };

    initAuth();
  }, []);


  const handleLoginSuccess = () => {
    setShowLoginModal(false);
    console.log('🍌 登录成功，继续使用应用');
  };

  // 检查是否需要显示登录界面
  const requiresLogin = isMultiUserMode() && !user && authInitialized;

  if (loading) {
    return (
      <div className="h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">🍌 初始化应用中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-900 text-gray-100 flex flex-col">
      {/* 如果需要登录但未登录，显示登录覆盖层 */}
      {requiresLogin && (
        <div className="absolute inset-0 z-40 bg-gray-900/80 backdrop-blur-sm">
          <div className="h-full flex items-center justify-center">
            <div className="bg-gray-800 rounded-2xl p-8 max-w-md mx-4 text-center border border-gray-700">
              <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <User className="w-8 h-8 text-yellow-400" />
              </div>
              
              <h2 className="text-xl font-semibold text-white mb-2">
                🍌 欢迎使用 Nano Banana
              </h2>
              <p className="text-gray-400 mb-6">
                这是一个多用户图片编辑器，请登录后使用所有功能
              </p>
              
              <Button
                onClick={() => setShowLoginModal(true)}
                className="w-full bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-medium"
              >
                立即登录
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 主应用内容 */}
      <div className="flex-1">
        {children}
      </div>

      {/* 登录弹窗 */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onLoginSuccess={handleLoginSuccess}
        title="用户登录"
        description="请登录后继续使用图片生成功能"
      />
    </div>
  );
};