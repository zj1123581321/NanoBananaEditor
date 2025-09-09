/**
 * 认证服务适配器
 * 支持单用户和多用户模式的认证
 */
import { createClient, type User, type Session } from '@supabase/supabase-js';
import { appConfig, isMultiUserMode } from '../config/app';

export interface AuthUser {
  id: string;
  email: string;
  username?: string;
  role?: 'admin' | 'user';
}

export interface LoginResult {
  success: boolean;
  user?: AuthUser;
  session?: Session;
  error?: string;
}

class AuthService {
  private supabase: ReturnType<typeof createClient> | null = null;
  private currentUser: AuthUser | null = null;
  private listeners: Array<(user: AuthUser | null) => void> = [];

  constructor() {
    if (isMultiUserMode() && appConfig.supabase?.url && appConfig.supabase?.anonKey) {
      try {
        this.supabase = createClient(
          appConfig.supabase.url,
          appConfig.supabase.anonKey
        );
        
        // 监听认证状态变化
        this.supabase.auth.onAuthStateChange((event, session) => {
          if (event === 'SIGNED_IN' && session?.user) {
            this.handleUserSignedIn(session.user);
          } else if (event === 'SIGNED_OUT') {
            this.handleUserSignedOut();
          }
        });

        // 初始化时检查当前会话
        this.initializeAuth();
      } catch (error) {
        console.warn('🍌 Supabase 客户端初始化失败，将使用单用户模式:', error);
        this.supabase = null;
      }
    } else {
      // 单用户模式下创建默认用户
      this.currentUser = {
        id: 'standalone',
        email: 'standalone@local',
        username: 'Local User',
        role: 'user'
      };
    }
  }

  /**
   * 初始化认证状态
   */
  private async initializeAuth() {
    if (!this.supabase) return;

    try {
      const { data: { session } } = await this.supabase.auth.getSession();
      if (session?.user) {
        await this.handleUserSignedIn(session.user);
      }
    } catch (error) {
      console.error('初始化认证状态失败:', error);
    }
  }

  /**
   * 处理用户登录
   */
  private async handleUserSignedIn(user: User) {
    try {
      // 获取用户配置信息
      const { data: profile } = await this.supabase!
        .from('user_profiles')
        .select('username, role, status')
        .eq('id', user.id)
        .single();

      this.currentUser = {
        id: user.id,
        email: user.email || '',
        username: profile?.username || user.email?.split('@')[0] || 'User',
        role: profile?.role || 'user'
      };

      // 通知监听器
      this.notifyListeners();
      
      console.log('用户已登录:', this.currentUser.username);
    } catch (error) {
      console.error('获取用户配置失败:', error);
      
      // 创建基础用户对象
      this.currentUser = {
        id: user.id,
        email: user.email || '',
        username: user.email?.split('@')[0] || 'User',
        role: 'user'
      };
      
      this.notifyListeners();
    }
  }

  /**
   * 处理用户登出
   */
  private handleUserSignedOut() {
    this.currentUser = null;
    this.notifyListeners();
    console.log('用户已登出');
  }

  /**
   * 通知状态变化监听器
   */
  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.currentUser));
  }

  /**
   * 用户登录
   */
  async login(email: string, password: string): Promise<LoginResult> {
    if (!isMultiUserMode()) {
      return {
        success: true,
        user: this.currentUser!
      };
    }

    if (!this.supabase) {
      return {
        success: false,
        error: 'Supabase not initialized'
      };
    }

    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        return {
          success: false,
          error: error.message
        };
      }

      return {
        success: true,
        user: this.currentUser,
        session: data.session
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '登录失败'
      };
    }
  }

  /**
   * 用户登出
   */
  async logout(): Promise<void> {
    if (!isMultiUserMode()) return;
    
    if (this.supabase) {
      await this.supabase.auth.signOut();
    }
  }

  /**
   * 获取当前用户
   */
  getCurrentUser(): AuthUser | null {
    return this.currentUser;
  }

  /**
   * 检查用户是否已登录
   */
  isLoggedIn(): boolean {
    return this.currentUser !== null;
  }

  /**
   * 检查用户是否为管理员
   */
  isAdmin(): boolean {
    return this.currentUser?.role === 'admin';
  }

  /**
   * 获取认证 Token
   */
  async getAuthToken(): Promise<string | null> {
    if (!isMultiUserMode() || !this.supabase) {
      return null;
    }

    try {
      const { data: { session } } = await this.supabase.auth.getSession();
      return session?.access_token || null;
    } catch (error) {
      console.error('获取认证 Token 失败:', error);
      return null;
    }
  }

  /**
   * 监听认证状态变化
   */
  onAuthStateChange(callback: (user: AuthUser | null) => void): () => void {
    this.listeners.push(callback);
    
    // 立即调用一次以获取当前状态
    callback(this.currentUser);

    // 返回取消监听的函数
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * 创建新用户（管理员功能）
   */
  async createUser(email: string, password: string, username: string, role: 'admin' | 'user' = 'user'): Promise<LoginResult> {
    if (!isMultiUserMode() || !this.supabase || !this.isAdmin()) {
      return {
        success: false,
        error: '权限不足或功能不可用'
      };
    }

    try {
      // 创建用户账户
      const { data, error } = await this.supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true
      });

      if (error) {
        return {
          success: false,
          error: error.message
        };
      }

      // 创建用户配置
      const { error: profileError } = await this.supabase
        .from('user_profiles')
        .insert({
          id: data.user.id,
          username,
          role
        });

      if (profileError) {
        console.error('创建用户配置失败:', profileError);
        // 不阻止用户创建，但记录错误
      }

      return {
        success: true,
        user: {
          id: data.user.id,
          email: data.user.email || email,
          username,
          role
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '创建用户失败'
      };
    }
  }

  /**
   * 重置密码
   */
  async resetPassword(email: string): Promise<{ success: boolean; error?: string }> {
    if (!isMultiUserMode() || !this.supabase) {
      return {
        success: false,
        error: '功能不可用'
      };
    }

    try {
      const { error } = await this.supabase.auth.resetPasswordForEmail(email);
      
      if (error) {
        return {
          success: false,
          error: error.message
        };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '重置密码失败'
      };
    }
  }
}

export const authService = new AuthService();