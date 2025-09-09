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
import { computed } from 'vue'
import { darkTheme, type GlobalTheme } from 'naive-ui'
import { useAppStore } from './stores/app'

const appStore = useAppStore()

const theme = computed<GlobalTheme | null>(() => {
  return appStore.isDark ? darkTheme : null
})
</script>

<style scoped>
#app {
  height: 100vh;
  width: 100vw;
}
</style>