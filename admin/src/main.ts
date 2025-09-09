import { createApp } from 'vue'
import { createPinia } from 'pinia'
import naive from 'naive-ui'
import router from './router'
import App from './App.vue'
import { useAuthStore } from './stores/auth'
import './styles/main.css'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.use(naive)

// 应用挂载后初始化认证状态
app.mount('#app')

// 初始化认证状态（非阻塞）
const authStore = useAuthStore()
authStore.initializeAuth().catch(error => {
  console.warn('认证状态初始化失败:', error)
})