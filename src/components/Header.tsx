import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from './ui/Button';
import { FileText, Languages, User, LogOut, ChevronDown } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { authService, type AuthUser } from '../services/authService';
import { isMultiUserMode } from '../config/app';
import { cn } from '../utils/cn';

/**
 * 用户下拉菜单组件
 */
interface UserDropdownProps {
  user: AuthUser;
  onLogout: () => void;
}

const UserDropdown: React.FC<UserDropdownProps> = ({ user, onLogout }) => {
  const [showMenu, setShowMenu] = useState(false);
  const { t } = useTranslation('ui');

  // 点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('[data-user-dropdown]')) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showMenu]);

  const handleLogout = () => {
    if (window.confirm(t('user.logoutConfirm'))) {
      onLogout();
      setShowMenu(false);
    }
  };

  return (
    <div className="relative" data-user-dropdown>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowMenu(!showMenu)}
        className={cn(
          "flex items-center space-x-2 text-gray-300 hover:text-white hover:bg-gray-700",
          "transition-colors duration-200 px-3 py-2"
        )}
      >
        <div className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center">
          <User className="w-3 h-3 text-gray-900" />
        </div>
        <span className="text-sm font-medium hidden sm:block">{user.username}</span>
        {user.role === 'admin' && (
          <span className="px-1.5 py-0.5 text-xs bg-yellow-500/20 text-yellow-400 rounded hidden sm:block">
            {t('user.admin')}
          </span>
        )}
        <ChevronDown className="w-3 h-3 text-gray-400" />
      </Button>

      {showMenu && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-50">
          <div className="p-3 border-b border-gray-700">
            <p className="text-sm font-medium text-white">{user.username}</p>
            <p className="text-xs text-gray-400">{user.email}</p>
            {user.role === 'admin' && (
              <span className="inline-block mt-1 px-2 py-1 text-xs bg-yellow-500/20 text-yellow-400 rounded">
                {t('user.admin')}
              </span>
            )}
          </div>

          <div className="p-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-500/10"
            >
              <LogOut className="w-4 h-4 mr-2" />
              {t('user.logout')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export const Header: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const { t, i18n } = useTranslation('ui');
  const { currentLanguage, setCurrentLanguage } = useAppStore();

  // 监听用户认证状态
  useEffect(() => {
    if (!isMultiUserMode()) return;

    const unsubscribe = authService.onAuthStateChange((user) => {
      setCurrentUser(user);
    });

    return unsubscribe;
  }, []);

  const toggleLanguage = () => {
    const newLang = currentLanguage === 'en' ? 'zh' : 'en';
    setCurrentLanguage(newLang);
    i18n.changeLanguage(newLang);
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
      console.log('🍌 用户已退出登录');
    } catch (error) {
      console.error('退出登录失败:', error);
    }
  };

  return (
    <>
      <header className="h-16 bg-gray-950 border-b border-gray-800 flex items-center justify-between px-6">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="text-2xl">🍌</div>
            <h1 className="text-xl font-semibold text-gray-100 hidden md:block">
              {t('header.title')}
            </h1>
            <h1 className="text-xl font-semibold text-gray-100 md:hidden">
              {t('header.titleShort')}
            </h1>
          </div>
          <div className="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded">
            1.5
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* 说明文档链接 - 突出显示 */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.open('https://for-deal.feishu.cn/wiki/Sc1gw33m2iLpAbkFppRckoDvn3f', '_blank')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 hover:text-yellow-300 border border-yellow-500/40 rounded-md transition-colors"
          >
            <FileText className="h-4 w-4" />
            <span className="text-sm font-medium">{currentLanguage === 'en' ? 'Docs' : '说明文档'}</span>
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={toggleLanguage}
            title={`Switch to ${currentLanguage === 'en' ? '中文' : 'English'}`}
          >
            <Languages className="h-5 w-5" />
          </Button>

          {/* 用户菜单 - 仅在多用户模式和用户已登录时显示 */}
          {isMultiUserMode() && currentUser && (
            <UserDropdown user={currentUser} onLogout={handleLogout} />
          )}

        </div>
      </header>
    </>
  );
};