<template>
  <n-layout has-sider style="height: 100vh; overflow: hidden;">
    <!-- 侧边栏 -->
    <n-layout-sider
      bordered
      collapse-mode="width"
      :collapsed-width="64"
      :width="240"
      :collapsed="appStore.sidebarCollapsed"
      show-trigger
      @collapse="appStore.toggleSidebar"
      @expand="appStore.toggleSidebar"
      style="height: 100vh; position: relative;"
    >
      <div class="sidebar-header">
        <div class="logo">
          <span class="logo-icon">🍌</span>
          <span v-show="!appStore.sidebarCollapsed" class="logo-text">Nano Banana</span>
        </div>
      </div>
      
      <n-menu
        :collapsed="appStore.sidebarCollapsed"
        :collapsed-width="64"
        :collapsed-icon-size="20"
        :options="menuOptions"
        :value="currentRoute"
        @update:value="handleMenuSelect"
        style="padding-top: 8px;"
      />
      
      <div class="sidebar-footer">
        <n-dropdown
          :options="userMenuOptions"
          @select="handleUserMenuSelect"
        >
          <div class="user-info">
            <n-avatar size="small" :src="userAvatar">
              {{ userInitial }}
            </n-avatar>
            <div v-show="!appStore.sidebarCollapsed" class="user-text">
              <div class="user-name">{{ authStore.user?.username || 'Admin' }}</div>
              <div class="user-role">管理员</div>
            </div>
          </div>
        </n-dropdown>
      </div>
    </n-layout-sider>
    
    <!-- 主内容区域 -->
    <n-layout style="height: 100vh; overflow: hidden;">
      <!-- 顶部导航栏 -->
      <n-layout-header bordered style="height: 64px; padding: 0 24px; flex-shrink: 0;">
        <div class="header-content">
          <div class="header-left">
            <h2 class="page-title">{{ currentPageTitle }}</h2>
          </div>
          
          <div class="header-right">
            <n-space>
              <!-- 主题切换 -->
              <n-button 
                quaternary 
                @click="appStore.toggleTheme"
              >
                {{ appStore.isDark ? '☀️' : '🌙' }}
              </n-button>
              
              <!-- 刷新按钮 -->
              <n-button 
                quaternary 
                circle 
                :loading="refreshing"
                @click="handleRefresh"
              >
                <template #icon>
                  <n-icon>
                    <ReloadOutlined />
                  </n-icon>
                </template>
              </n-button>
              
              <!-- 全屏按钮 -->
              <n-button 
                quaternary 
                circle 
                @click="toggleFullscreen"
              >
                <template #icon>
                  <n-icon>
                    <component :is="isFullscreen ? CompressOutlined : ExpandOutlined" />
                  </n-icon>
                </template>
              </n-button>
            </n-space>
          </div>
        </div>
      </n-layout-header>
      
      <!-- 页面内容 -->
      <n-layout-content style="padding: 24px; height: calc(100vh - 64px); overflow: auto;">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </n-layout-content>
    </n-layout>
  </n-layout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useMessage } from 'naive-ui'
import type { MenuOption } from 'naive-ui'
import { 
  DashboardOutlined, 
  UserOutlined, 
  BarChartOutlined, 
  FileTextOutlined, 
  SettingOutlined,
  LogoutOutlined,
  UserSwitchOutlined,
  ReloadOutlined,
  ExpandOutlined,
  CompressOutlined
} from '@vicons/antd'
import { useAppStore } from '../stores/app'
import { useAuthStore } from '../stores/auth'

const route = useRoute()
const router = useRouter()
const message = useMessage()
const appStore = useAppStore()
const authStore = useAuthStore()

const refreshing = ref(false)
const isFullscreen = ref(false)

// 当前路由名
const currentRoute = computed(() => route.name as string)

// 当前页面标题
const currentPageTitle = computed(() => {
  const routeMeta = route.meta
  return routeMeta?.title || '管理后台'
})

// 用户头像和昵称
const userAvatar = computed(() => {
  // 可以根据用户邮箱生成头像，这里简化处理
  return undefined
})

const userInitial = computed(() => {
  const username = authStore.user?.username || 'A'
  return username.charAt(0).toUpperCase()
})

// 菜单配置
const menuOptions: MenuOption[] = [
  {
    label: '概览',
    key: 'Overview',
    icon: () => h(DashboardOutlined)
  },
  {
    label: '用户管理',
    key: 'Users',
    icon: () => h(UserOutlined)
  },
  {
    label: '使用统计',
    key: 'Statistics',
    icon: () => h(BarChartOutlined)
  },
  {
    label: '操作日志',
    key: 'Logs',
    icon: () => h(FileTextOutlined)
  },
  {
    label: '系统设置',
    key: 'Settings',
    icon: () => h(SettingOutlined)
  }
]

// 用户菜单
const userMenuOptions = [
  {
    label: '个人设置',
    key: 'profile',
    icon: () => h(UserSwitchOutlined)
  },
  {
    type: 'divider'
  },
  {
    label: '退出登录',
    key: 'logout',
    icon: () => h(LogoutOutlined)
  }
]

/**
 * 处理菜单选择
 */
const handleMenuSelect = (key: string) => {
  router.push({ name: key })
}

/**
 * 处理用户菜单选择
 */
const handleUserMenuSelect = (key: string) => {
  switch (key) {
    case 'profile':
      // 打开个人设置弹窗
      message.info('个人设置功能开发中...')
      break
    case 'logout':
      handleLogout()
      break
  }
}

/**
 * 处理退出登录
 */
const handleLogout = () => {
  authStore.logout()
  router.push('/login')
  message.success('已退出登录')
}

/**
 * 刷新页面
 */
const handleRefresh = async () => {
  refreshing.value = true
  try {
    // 触发当前页面的刷新逻辑
    await new Promise(resolve => setTimeout(resolve, 500))
    window.location.reload()
  } finally {
    refreshing.value = false
  }
}

/**
 * 切换全屏
 */
const toggleFullscreen = () => {
  if (!isFullscreen.value) {
    document.documentElement.requestFullscreen()
    isFullscreen.value = true
  } else {
    document.exitFullscreen()
    isFullscreen.value = false
  }
}

// 监听全屏状态变化
document.addEventListener('fullscreenchange', () => {
  isFullscreen.value = !!document.fullscreenElement
})

onMounted(() => {
  appStore.initializeApp()
})
</script>

<script lang="ts">
import { h } from 'vue'
export default {
  name: 'Dashboard'
}
</script>

<style scoped>
.sidebar-header {
  padding: 16px;
  border-bottom: 1px solid var(--border-color);
}

.logo {
  display: flex;
  align-items: center;
  gap: 8px;
}

.logo-icon {
  font-size: 24px;
}

.logo-text {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-color-1);
}

.sidebar-footer {
  position: absolute;
  bottom: 16px;
  left: 0;
  right: 0;
  padding: 0 16px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.user-info:hover {
  background-color: var(--hover-color);
}

.user-text {
  flex: 1;
}

.user-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-color-1);
  margin-bottom: 2px;
}

.user-role {
  font-size: 12px;
  color: var(--text-color-3);
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 100%;
}

.header-left {
  display: flex;
  align-items: center;
}

.page-title {
  margin: 0;
  font-size: 18px;
  font-weight: 500;
  color: var(--text-color-1);
}

.header-right {
  display: flex;
  align-items: center;
}

/* 页面切换动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>