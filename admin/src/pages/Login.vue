<template>
  <div class="login-container">
    <div class="login-card">
      <div class="login-header">
        <h1 class="login-title">🍌 Nano Banana</h1>
        <p class="login-subtitle">管理后台</p>
      </div>
      
      <n-form 
        ref="formRef"
        :model="loginForm"
        :rules="rules"
        size="large"
        @keyup.enter="handleLogin"
      >
        <n-form-item path="username" label="用户名">
          <n-input 
            v-model:value="loginForm.username"
            placeholder="请输入管理员用户名"
            :disabled="loading"
          />
        </n-form-item>
        
        <n-form-item path="password" label="密码">
          <n-input 
            v-model:value="loginForm.password"
            type="password"
            placeholder="请输入密码"
            show-password-on="mousedown"
            :disabled="loading"
          />
        </n-form-item>
        
        <n-form-item>
          <n-button 
            type="primary"
            size="large"
            :loading="loading"
            :disabled="loading"
            block
            @click="handleLogin"
          >
            {{ loading ? '登录中...' : '登录' }}
          </n-button>
        </n-form-item>
      </n-form>
      
      <div class="login-footer">
        <p class="footer-text">
          Nano Banana AI Image Editor Admin Panel
        </p>
        <p class="footer-version">v1.0.0</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useMessage } from 'naive-ui'
import type { FormInst, FormRules } from 'naive-ui'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const message = useMessage()
const authStore = useAuthStore()

// 表单引用
const formRef = ref<FormInst | null>(null)
const loading = ref(false)

// 登录表单
const loginForm = reactive({
  username: 'admin',
  password: ''
})

// 表单验证规则
const rules: FormRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, message: '用户名长度不能少于 3 位', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 3, message: '密码长度不能少于 3 位', trigger: 'blur' }
  ]
}

/**
 * 处理登录
 */
const handleLogin = async () => {
  if (!formRef.value) return
  
  try {
    await formRef.value.validate()
    loading.value = true
    
    const result = await authStore.login({
      username: loginForm.username,
      password: loginForm.password
    })
    
    if (result.success) {
      message.success('登录成功')
      
      // 等待一小段时间确保状态同步，然后跳转
      await new Promise(resolve => setTimeout(resolve, 200))
      
      // 使用 replace 而不是 push，避免用户按返回键回到登录页
      await router.replace('/')
    } else {
      message.error(result.error || '登录失败')
    }
  } catch (error) {
    console.error('Login error:', error)
    message.error('表单验证失败')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.login-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  padding: 40px;
  width: 100%;
  max-width: 400px;
}

.login-header {
  text-align: center;
  margin-bottom: 32px;
}

.login-title {
  font-size: 28px;
  font-weight: 600;
  color: #333;
  margin: 0 0 8px 0;
}

.login-subtitle {
  font-size: 16px;
  color: #666;
  margin: 0;
}

.login-footer {
  text-align: center;
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid #eee;
}

.footer-text {
  font-size: 12px;
  color: #999;
  margin: 0 0 4px 0;
}

.footer-version {
  font-size: 12px;
  color: #ccc;
  margin: 0;
}
</style>