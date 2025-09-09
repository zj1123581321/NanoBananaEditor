/**
 * 应用配置管理
 * 支持单用户和多用户模式的配置切换
 */

export type AppMode = 'standalone' | 'multi-user';

export interface AppConfig {
  mode: AppMode;
  supabase?: {
    url: string;
    anonKey: string;
  };
  backend?: {
    url: string;
  };
  features: {
    auth: boolean;
    notifications: boolean;
    statistics: boolean;
    multiUser: boolean;
  };
}

/**
 * 获取应用配置
 */
function getAppConfig(): AppConfig {
  const mode = (import.meta.env.VITE_APP_MODE as AppMode) || 'standalone';
  
  const config: AppConfig = {
    mode,
    features: {
      auth: mode === 'multi-user',
      notifications: !!import.meta.env.VITE_WECOM_WEBHOOK_URL,
      statistics: mode === 'multi-user',
      multiUser: mode === 'multi-user'
    }
  };

  // 多用户模式下的额外配置
  if (mode === 'multi-user') {
    config.supabase = {
      url: import.meta.env.VITE_SUPABASE_URL!,
      anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY!,
    };
    
    config.backend = {
      url: import.meta.env.VITE_IMAGE_SERVER_URL || 'http://localhost:3002',
    };
  }

  return config;
}

export const appConfig = getAppConfig();

/**
 * 检查功能是否启用
 */
export function isFeatureEnabled(feature: keyof AppConfig['features']): boolean {
  return appConfig.features[feature];
}

/**
 * 检查是否为多用户模式
 */
export function isMultiUserMode(): boolean {
  return appConfig.mode === 'multi-user';
}

/**
 * 检查是否为单用户模式
 */
export function isStandaloneMode(): boolean {
  return appConfig.mode === 'standalone';
}

/**
 * 获取后端服务 URL
 */
export function getBackendUrl(): string {
  if (isMultiUserMode() && appConfig.backend) {
    return appConfig.backend.url;
  }
  
  return import.meta.env.VITE_IMAGE_SERVER_URL || 'http://localhost:3002';
}

/**
 * 开发环境配置验证
 */
export function validateConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (isMultiUserMode()) {
    if (!appConfig.supabase?.url) {
      errors.push('VITE_SUPABASE_URL is required in multi-user mode');
    }
    
    if (!appConfig.supabase?.anonKey) {
      errors.push('VITE_SUPABASE_ANON_KEY is required in multi-user mode');
    }
    
    if (!appConfig.backend?.url) {
      errors.push('Backend URL is not configured');
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

// 开发环境下验证配置
if (import.meta.env.DEV) {
  const validation = validateConfig();
  if (!validation.valid) {
    console.warn('🍌 应用配置警告:', validation.errors);
  } else {
    console.log(`🍌 应用配置已加载 - 模式: ${appConfig.mode}`);
  }
}