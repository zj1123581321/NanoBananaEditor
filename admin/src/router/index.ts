/**
 * 管理后台路由配置
 */
import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.PROD ? '/admin/' : '/'),
  routes: [
    {
      path: '/login',
      name: 'Login',
      component: () => import('../pages/Login.vue'),
      meta: { requiresAuth: false }
    },
    {
      path: '/',
      name: 'Dashboard',
      component: () => import('../pages/Dashboard.vue'),
      meta: { requiresAuth: true },
      redirect: '/overview',
      children: [
        {
          path: 'overview',
          name: 'Overview',
          component: () => import('../pages/Overview.vue'),
          meta: { title: '概览' }
        },
        {
          path: 'users',
          name: 'Users',
          component: () => import('../pages/Users.vue'),
          meta: { title: '用户管理' }
        },
        {
          path: 'statistics',
          name: 'Statistics',
          component: () => import('../pages/Statistics.vue'),
          meta: { title: '使用统计' }
        },
        {
          path: 'logs',
          name: 'Logs',
          component: () => import('../pages/Logs.vue'),
          meta: { title: '操作日志' }
        },
        {
          path: 'settings',
          name: 'Settings',
          component: () => import('../pages/Settings.vue'),
          meta: { title: '系统设置' }
        }
      ]
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/'
    }
  ]
})

// 路由守卫
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()
  
  // 如果访问登录页且已登录，重定向到首页
  if (to.name === 'Login' && authStore.isAuthenticated) {
    next('/')
    return
  }
  
  // 检查是否需要认证
  if (to.meta.requiresAuth !== false) {
    // 检查当前认证状态
    if (!authStore.isAuthenticated) {
      // 尝试从 localStorage 恢复会话
      const token = localStorage.getItem('admin_token')
      if (token) {
        try {
          const isValid = await authStore.verifyToken(token)
          if (isValid && authStore.isAuthenticated) {
            next()
            return
          }
        } catch (error) {
          console.warn('Token verification failed:', error)
          // 清理无效的本地存储
          authStore.logout()
        }
      }
      
      // 重定向到登录页面
      next('/login')
      return
    }
  }
  
  next()
})

export default router