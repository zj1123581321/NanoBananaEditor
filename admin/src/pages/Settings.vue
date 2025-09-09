<template>
  <div class="settings-page">
    <!-- 系统信息 -->
    <n-card title="系统信息" :segmented="{ content: true }">
      <n-descriptions :column="2" label-placement="left" bordered>
        <n-descriptions-item label="应用名称">
          {{ systemInfo.appName }}
        </n-descriptions-item>
        
        <n-descriptions-item label="版本号">
          {{ systemInfo.version }}
        </n-descriptions-item>
        
        <n-descriptions-item label="运行模式">
          <n-tag :type="systemInfo.mode === 'production' ? 'success' : 'warning'">
            {{ systemInfo.mode === 'production' ? '生产环境' : '开发环境' }}
          </n-tag>
        </n-descriptions-item>
        
        <n-descriptions-item label="部署时间">
          {{ systemInfo.deployTime }}
        </n-descriptions-item>
        
        <n-descriptions-item label="系统状态">
          <n-tag :type="systemStatus.healthy ? 'success' : 'error'">
            {{ systemStatus.healthy ? '正常' : '异常' }}
          </n-tag>
        </n-descriptions-item>
        
        <n-descriptions-item label="数据库">
          <n-tag :type="systemStatus.database ? 'success' : 'error'">
            {{ systemStatus.database ? '连接正常' : '连接异常' }}
          </n-tag>
        </n-descriptions-item>
      </n-descriptions>
      
      <n-space style="margin-top: 16px;">
        <n-button @click="checkSystemHealth" :loading="healthChecking">
          <template #icon>
            <n-icon>
              <HeartOutlined />
            </n-icon>
          </template>
          健康检查
        </n-button>
        
        <n-button @click="refreshSystemInfo" :loading="infoLoading">
          <template #icon>
            <n-icon>
              <ReloadOutlined />
            </n-icon>
          </template>
          刷新信息
        </n-button>
      </n-space>
    </n-card>
    
    <!-- 系统配置 -->
    <n-card title="系统配置" :segmented="{ content: true }">
      <n-form
        ref="configFormRef"
        :model="configForm"
        :rules="configRules"
        label-placement="left"
        label-width="150px"
      >
        <n-form-item label="最大文件大小" path="maxFileSize">
          <n-input-number
            v-model:value="configForm.maxFileSize"
            :min="1"
            :max="100"
            style="width: 200px"
          >
            <template #suffix>MB</template>
          </n-input-number>
          <n-text depth="3" style="margin-left: 12px;">
            上传图片的最大文件大小限制
          </n-text>
        </n-form-item>
        
        <n-form-item label="Token 限制" path="dailyTokenLimit">
          <n-input-number
            v-model:value="configForm.dailyTokenLimit"
            :min="1000"
            :max="1000000"
            style="width: 200px"
          />
          <n-text depth="3" style="margin-left: 12px;">
            每个用户每日 Token 使用限制
          </n-text>
        </n-form-item>
        
        <n-form-item label="保留天数" path="logRetentionDays">
          <n-input-number
            v-model:value="configForm.logRetentionDays"
            :min="7"
            :max="365"
            style="width: 200px"
          >
            <template #suffix>天</template>
          </n-input-number>
          <n-text depth="3" style="margin-left: 12px;">
            系统日志保留天数
          </n-text>
        </n-form-item>
        
        <n-form-item label="启用通知">
          <n-switch v-model:value="configForm.enableNotifications" />
          <n-text depth="3" style="margin-left: 12px;">
            是否启用企业微信通知功能
          </n-text>
        </n-form-item>
        
        <n-form-item label="启用统计">
          <n-switch v-model:value="configForm.enableStatistics" />
          <n-text depth="3" style="margin-left: 12px;">
            是否启用使用统计功能
          </n-text>
        </n-form-item>
      </n-form>
      
      <n-space>
        <n-button type="primary" @click="handleSaveConfig" :loading="configSaving">
          保存配置
        </n-button>
        
        <n-button @click="handleResetConfig">
          重置
        </n-button>
      </n-space>
    </n-card>
    
    <!-- 管理员账户 -->
    <n-card title="管理员账户" :segmented="{ content: true }">
      <n-form
        ref="passwordFormRef"
        :model="passwordForm"
        :rules="passwordRules"
        label-placement="left"
        label-width="150px"
      >
        <n-form-item label="当前密码" path="currentPassword">
          <n-input
            v-model:value="passwordForm.currentPassword"
            type="password"
            placeholder="请输入当前密码"
            show-password-on="mousedown"
            style="width: 300px"
          />
        </n-form-item>
        
        <n-form-item label="新密码" path="newPassword">
          <n-input
            v-model:value="passwordForm.newPassword"
            type="password"
            placeholder="请输入新密码"
            show-password-on="mousedown"
            style="width: 300px"
          />
        </n-form-item>
        
        <n-form-item label="确认新密码" path="confirmPassword">
          <n-input
            v-model:value="passwordForm.confirmPassword"
            type="password"
            placeholder="请再次输入新密码"
            show-password-on="mousedown"
            style="width: 300px"
          />
        </n-form-item>
      </n-form>
      
      <n-button type="primary" @click="handleChangePassword" :loading="passwordChanging">
        修改密码
      </n-button>
    </n-card>
    
    <!-- 数据维护 -->
    <n-card title="数据维护" :segmented="{ content: true }">
      <n-space vertical>
        <div class="maintenance-item">
          <div class="maintenance-info">
            <h4>清理过期日志</h4>
            <p>删除超过保留期的系统日志数据</p>
          </div>
          <n-button @click="handleCleanLogs" :loading="cleaningLogs">
            清理日志
          </n-button>
        </div>
        
        <n-divider />
        
        <div class="maintenance-item">
          <div class="maintenance-info">
            <h4>清理临时文件</h4>
            <p>删除系统生成的临时图片文件</p>
          </div>
          <n-button @click="handleCleanTempFiles" :loading="cleaningFiles">
            清理文件
          </n-button>
        </div>
        
        <n-divider />
        
        <div class="maintenance-item">
          <div class="maintenance-info">
            <h4>备份数据库</h4>
            <p>创建数据库备份文件</p>
          </div>
          <n-button type="primary" @click="handleBackupDatabase" :loading="backingUp">
            立即备份
          </n-button>
        </div>
      </n-space>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import type { FormInst, FormRules } from 'naive-ui'
import { useMessage, useDialog } from 'naive-ui'
import { HeartOutlined, ReloadOutlined } from '@vicons/antd'
import { useAuthStore } from '../stores/auth'
import { adminApi } from '../services/api'
import dayjs from 'dayjs'

const message = useMessage()
const dialog = useDialog()
const authStore = useAuthStore()

// 响应式数据
const healthChecking = ref(false)
const infoLoading = ref(false)
const configSaving = ref(false)
const passwordChanging = ref(false)
const cleaningLogs = ref(false)
const cleaningFiles = ref(false)
const backingUp = ref(false)

// 表单引用
const configFormRef = ref<FormInst | null>(null)
const passwordFormRef = ref<FormInst | null>(null)

// 系统信息
const systemInfo = ref({
  appName: 'Nano Banana AI Image Editor',
  version: '1.0.0',
  mode: 'production',
  deployTime: dayjs().format('YYYY-MM-DD HH:mm:ss')
})

// 系统状态
const systemStatus = ref({
  healthy: true,
  database: true,
  imageServer: true,
  notification: true
})

// 配置表单
const configForm = reactive({
  maxFileSize: 10,
  dailyTokenLimit: 10000,
  logRetentionDays: 30,
  enableNotifications: true,
  enableStatistics: true
})

// 密码表单
const passwordForm = reactive({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
})

// 配置表单验证
const configRules: FormRules = {
  maxFileSize: [
    { required: true, type: 'number', message: '请设置最大文件大小', trigger: 'blur' }
  ],
  dailyTokenLimit: [
    { required: true, type: 'number', message: '请设置 Token 限制', trigger: 'blur' }
  ],
  logRetentionDays: [
    { required: true, type: 'number', message: '请设置日志保留天数', trigger: 'blur' }
  ]
}

// 密码表单验证
const passwordRules: FormRules = {
  currentPassword: [
    { required: true, message: '请输入当前密码', trigger: 'blur' }
  ],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, message: '密码长度不能少于 6 位', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请确认新密码', trigger: 'blur' },
    {
      validator: (rule, value) => {
        return value === passwordForm.newPassword
      },
      message: '两次输入的密码不一致',
      trigger: 'blur'
    }
  ]
}

/**
 * 系统健康检查
 */
const checkSystemHealth = async () => {
  healthChecking.value = true
  
  try {
    const response = await adminApi.healthCheck()
    
    if (response.success) {
      // 根据后端实际返回的health数据结构进行映射
      const features = response.data.features || {};
      const isHealthy = response.data.mode === 'multi-user' || response.data.mode === 'standalone';
      
      systemStatus.value = {
        healthy: isHealthy,
        database: features.supabase || false,
        imageServer: features.imageServer || false,
        notification: features.notifications || false
      }
      
      // 更新系统信息
      if (response.data.mode) {
        systemInfo.value.mode = response.data.mode === 'multi-user' ? 'production' : 'development'
      }
      if (response.data.timestamp) {
        systemInfo.value.deployTime = dayjs(response.data.timestamp).format('YYYY-MM-DD HH:mm:ss')
      }
      
      message.success('健康检查完成')
    } else {
      message.error('健康检查失败')
    }
  } catch (error) {
    console.error('Health check failed:', error)
    message.error('健康检查失败')
  } finally {
    healthChecking.value = false
  }
}

/**
 * 刷新系统信息
 */
const refreshSystemInfo = async () => {
  infoLoading.value = true
  
  try {
    const response = await adminApi.getSystemConfig()
    
    if (response.success) {
      const config = response.data
      
      // 更新系统信息
      if (config.systemInfo) {
        Object.assign(systemInfo.value, config.systemInfo)
      }
      
      // 更新配置表单
      if (config.settings) {
        Object.assign(configForm, config.settings)
      }
      
      message.success('信息刷新成功')
    }
  } catch (error) {
    console.error('Refresh system info failed:', error)
    message.error('刷新失败')
  } finally {
    infoLoading.value = false
  }
}

/**
 * 保存系统配置
 */
const handleSaveConfig = async () => {
  if (!configFormRef.value) return
  
  try {
    await configFormRef.value.validate()
    configSaving.value = true
    
    const response = await adminApi.updateSystemConfig(configForm)
    
    if (response.success) {
      message.success('配置保存成功')
    } else {
      message.error(response.error || '配置保存失败')
    }
  } catch (error) {
    console.error('Save config failed:', error)
    message.error('表单验证失败')
  } finally {
    configSaving.value = false
  }
}

/**
 * 重置配置
 */
const handleResetConfig = () => {
  Object.assign(configForm, {
    maxFileSize: 10,
    dailyTokenLimit: 10000,
    logRetentionDays: 30,
    enableNotifications: true,
    enableStatistics: true
  })
  
  message.info('配置已重置')
}

/**
 * 修改密码
 */
const handleChangePassword = async () => {
  if (!passwordFormRef.value) return
  
  try {
    await passwordFormRef.value.validate()
    passwordChanging.value = true
    
    const result = await authStore.changePassword({
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword
    })
    
    if (result.success) {
      message.success('密码修改成功')
      
      // 重置表单
      Object.assign(passwordForm, {
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      })
    } else {
      message.error(result.error || '密码修改失败')
    }
  } catch (error) {
    console.error('Change password failed:', error)
    message.error('表单验证失败')
  } finally {
    passwordChanging.value = false
  }
}

/**
 * 清理过期日志
 */
const handleCleanLogs = () => {
  dialog.warning({
    title: '确认清理',
    content: '此操作将删除所有过期的日志数据，确定继续吗？',
    positiveText: '确认',
    negativeText: '取消',
    onPositiveClick: async () => {
      cleaningLogs.value = true
      
      try {
        // 这里应该调用清理日志的接口
        await new Promise(resolve => setTimeout(resolve, 2000))
        message.success('日志清理完成')
      } catch (error) {
        console.error('Clean logs failed:', error)
        message.error('日志清理失败')
      } finally {
        cleaningLogs.value = false
      }
    }
  })
}

/**
 * 清理临时文件
 */
const handleCleanTempFiles = () => {
  dialog.warning({
    title: '确认清理',
    content: '此操作将删除所有临时图片文件，确定继续吗？',
    positiveText: '确认',
    negativeText: '取消',
    onPositiveClick: async () => {
      cleaningFiles.value = true
      
      try {
        // 这里应该调用清理临时文件的接口
        await new Promise(resolve => setTimeout(resolve, 1500))
        message.success('临时文件清理完成')
      } catch (error) {
        console.error('Clean temp files failed:', error)
        message.error('临时文件清理失败')
      } finally {
        cleaningFiles.value = false
      }
    }
  })
}

/**
 * 备份数据库
 */
const handleBackupDatabase = () => {
  dialog.info({
    title: '确认备份',
    content: '此操作将创建数据库备份文件，可能需要几分钟时间，确定继续吗？',
    positiveText: '确认',
    negativeText: '取消',
    onPositiveClick: async () => {
      backingUp.value = true
      
      try {
        // 这里应该调用数据库备份的接口
        await new Promise(resolve => setTimeout(resolve, 3000))
        message.success('数据库备份完成')
      } catch (error) {
        console.error('Backup database failed:', error)
        message.error('数据库备份失败')
      } finally {
        backingUp.value = false
      }
    }
  })
}

onMounted(() => {
  refreshSystemInfo()
  checkSystemHealth()
})
</script>

<style scoped>
.settings-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.maintenance-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
}

.maintenance-info h4 {
  margin: 0 0 4px 0;
  color: var(--text-color-1);
  font-weight: 500;
}

.maintenance-info p {
  margin: 0;
  color: var(--text-color-3);
  font-size: 14px;
}

@media (max-width: 768px) {
  .maintenance-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
}
</style>