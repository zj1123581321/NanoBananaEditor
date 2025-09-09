/**
 * 认证包装器组件
 * 在多用户模式下管理用户认证状态和登录流程
 */
import React, { useState, useEffect } from 'react';
import { authService, type AuthUser } from '../services/authService';
import { isMultiUserMode } from '../config/app';
import { LoginModal } from './LoginModal';
import { User, LogOut } from 'lucide-react';
import { Button } from './ui/Button';
import { cn } from '../utils/cn';

interface AuthWrapperProps {
  children: React.ReactNode;
}

interface AuthStateProps {
  user: AuthUser | null;
  showUserMenu: boolean;
  onUserMenuToggle: () => void;
  onLogout: () => void;
}

/**
 * 用户状态显示组件
 */
const UserAuthState: React.FC<AuthStateProps> = ({ 
  user, 
  showUserMenu, 
  onUserMenuToggle, 
  onLogout 
}) => {
  if (!isMultiUserMode() || !user) return null;

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={onUserMenuToggle}
        className={cn(
          "flex items-center space-x-2 text-gray-300 hover:text-white hover:bg-gray-700",
          "transition-colors duration-200"
        )}
      >
        <div className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center">
          <User className="w-3 h-3 text-gray-900" />
        </div>
        <span className="text-sm font-medium">{user.username}</span>
        {user.role === 'admin' && (
          <span className="px-1.5 py-0.5 text-xs bg-yellow-500/20 text-yellow-400 rounded">
            管理员
          </span>
        )}
      </Button>

      {showUserMenu && (
        <div className="absolute right-0 top-full mt-2 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-50">
          <div className="p-3 border-b border-gray-700">
            <p className="text-sm font-medium text-white">{user.username}</p>
            <p className="text-xs text-gray-400">{user.email}</p>
          </div>
          
          <div className="p-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onLogout}
              className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-500/10"
            >
              <LogOut className="w-4 h-4 mr-2" />
              登出
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * 认证包装器主组件
 */
export const AuthWrapper: React.FC<AuthWrapperProps> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
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

  // 点击其他地方关闭用户菜单
  useEffect(() => {
    const handleClickOutside = () => setShowUserMenu(false);
    
    if (showUserMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showUserMenu]);

  const handleLogout = async () => {
    try {
      await authService.logout();
      setShowUserMenu(false);
      console.log('🍌 用户已登出');
    } catch (error) {
      console.error('登出失败:', error);
    }
  };

  const handleLoginSuccess = () => {
    setShowLoginModal(false);
    console.log('🍌 登录成功，继续使用应用');
  };

  // 检查是否需要显示登录界面
  const requiresLogin = isMultiUserMode() && !user && authInitialized;
  const showAuthState = isMultiUserMode() && user;

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
      <div className="flex-1 flex flex-col">
        {/* 用户状态栏（在多用户模式下显示） */}
        {showAuthState && (
          <div className="bg-gray-800 border-b border-gray-700 px-4 py-2 flex justify-end">
            <UserAuthState
              user={user}
              showUserMenu={showUserMenu}
              onUserMenuToggle={() => setShowUserMenu(!showUserMenu)}
              onLogout={handleLogout}
            />
          </div>
        )}

        {/* 应用主体 */}
        <div className="flex-1">
          {children}
        </div>
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