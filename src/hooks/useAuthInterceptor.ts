/**
 * 认证拦截器 Hook
 * 在多用户模式下检查用户登录状态，未登录时显示登录弹窗
 */
import { useState, useCallback } from 'react';
import { authService } from '../services/authService';
import { isMultiUserMode } from '../config/app';

interface AuthInterceptorOptions {
  actionName?: string; // 操作名称，用于日志记录
  requireLogin?: boolean; // 是否需要登录，默认在多用户模式下为 true
  onLoginRequired?: () => void; // 需要登录时的回调
}

interface AuthInterceptorResult {
  showLoginModal: boolean;
  setShowLoginModal: (show: boolean) => void;
  executeWithAuth: <T extends any[], R>(
    action: (...args: T) => Promise<R>,
    actionName?: string
  ) => (...args: T) => Promise<R | null>;
  checkAuthAndExecute: <T extends any[], R>(
    action: (...args: T) => Promise<R>,
    actionName?: string
  ) => Promise<{ canExecute: boolean; user?: any }>;
}

/**
 * 认证拦截器 Hook
 */
export const useAuthInterceptor = (options: AuthInterceptorOptions = {}): AuthInterceptorResult => {
  const [showLoginModal, setShowLoginModal] = useState(false);
  
  const {
    requireLogin = isMultiUserMode(),
    onLoginRequired,
    actionName: defaultActionName = '操作'
  } = options;

  /**
   * 检查认证状态并决定是否可以执行操作
   */
  const checkAuthAndExecute = useCallback(async <T extends any[], R>(
    action: (...args: T) => Promise<R>,
    actionName: string = defaultActionName
  ) => {
    const user = authService.getCurrentUser();
    
    // 如果不需要登录或用户已登录，直接允许执行
    if (!requireLogin || user) {
      return { canExecute: true, user };
    }
    
    // 多用户模式下用户未登录
    console.warn(`🍌 ${actionName}需要登录，当前用户未登录`);
    
    // 触发登录回调
    onLoginRequired?.();
    setShowLoginModal(true);
    
    return { canExecute: false, user: null };
  }, [requireLogin, onLoginRequired, defaultActionName]);

  /**
   * 包装操作函数，添加认证检查
   */
  const executeWithAuth = useCallback(<T extends any[], R>(
    action: (...args: T) => Promise<R>,
    actionName: string = defaultActionName
  ) => {
    return async (...args: T): Promise<R | null> => {
      const { canExecute, user } = await checkAuthAndExecute(action, actionName);
      
      if (!canExecute) {
        return null;
      }
      
      try {
        console.log(`🍌 ${actionName}开始执行`, user ? `- 用户: ${user.username}` : '');
        const result = await action(...args);
        console.log(`✅ ${actionName}执行成功`);
        return result;
      } catch (error) {
        console.error(`❌ ${actionName}执行失败:`, error);
        throw error;
      }
    };
  }, [checkAuthAndExecute, defaultActionName]);

  return {
    showLoginModal,
    setShowLoginModal,
    executeWithAuth,
    checkAuthAndExecute
  };
};

/**
 * 操作需要认证的高阶函数
 */
export const withAuth = <T extends any[], R>(
  action: (...args: T) => Promise<R>,
  actionName?: string
) => {
  return async (...args: T): Promise<R | null> => {
    const user = authService.getCurrentUser();
    
    if (!isMultiUserMode() || user) {
      return await action(...args);
    }
    
    console.warn(`🍌 ${actionName || '操作'}需要登录，请先登录`);
    return null;
  };
};

/**
 * 检查用户是否可以执行操作
 */
export const canExecuteAction = (actionName?: string): boolean => {
  const user = authService.getCurrentUser();
  const canExecute = !isMultiUserMode() || !!user;
  
  if (!canExecute && actionName) {
    console.warn(`🍌 ${actionName}需要登录，当前用户未登录`);
  }
  
  return canExecute;
};