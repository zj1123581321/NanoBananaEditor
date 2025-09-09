<template>
  <n-config-provider :theme="theme">
    <n-message-provider>
      <n-loading-bar-provider>
        <n-dialog-provider>
          <n-notification-provider>
            <router-view />
          </n-notification-provider>
        </n-dialog-provider>
      </n-loading-bar-provider>
    </n-message-provider>
  </n-config-provider>
</template>

<script setup lang="ts">
import { computed, onErrorCaptured, onMounted } from 'vue'
import { darkTheme, type GlobalTheme } from 'naive-ui'
import { useAppStore } from './stores/app'

const appStore = useAppStore()

const theme = computed<GlobalTheme | null>(() => {
  return appStore.isDark ? darkTheme : null
})

// 全局错误捕获
onErrorCaptured((err, instance, info) => {
  console.error('Vue Error Captured:', err)
  console.error('Component instance:', instance)
  console.error('Error info:', info)
  
  // 如果是 parentNode 相关的错误，则静默处理
  if (err.message && err.message.includes('parentNode')) {
    console.warn('Suppressing parentNode error during component transition')
    return false // 阻止错误向上传播
  }
  
  return true // 让其他错误正常传播
})

onMounted(() => {
  // 全局错误处理
  window.addEventListener('error', (event) => {
    if (event.error && event.error.message && event.error.message.includes('parentNode')) {
      console.warn('Suppressing global parentNode error')
      event.preventDefault()
    }
  })
  
  // 全局 Promise 错误处理
  window.addEventListener('unhandledrejection', (event) => {
    if (event.reason && event.reason.message && event.reason.message.includes('parentNode')) {
      console.warn('Suppressing unhandled parentNode promise rejection')
      event.preventDefault()
    }
  })
})
</script>

<style scoped>
#app {
  height: 100vh;
  width: 100vw;
}
</style>