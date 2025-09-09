<template>
  <div class="logs-page">
    <!-- 过滤条件 -->
    <n-card class="filter-card">
      <n-space align="center" wrap>
        <n-date-picker
          v-model:value="dateRange"
          type="daterange"
          clearable
          placeholder="选择时间范围"
        />
        
        <n-select
          v-model:value="selectedAction"
          :options="actionOptions"
          placeholder="操作类型"
          clearable
          style="width: 150px"
        />
        
        <n-input
          v-model:value="searchKeyword"
          placeholder="搜索用户邮箱..."
          clearable
          style="width: 200px"
        />
        
        <n-button type="primary" @click="handleFilter">
          <template #icon>
            <n-icon>
              <SearchOutlined />
            </n-icon>
          </template>
          筛选
        </n-button>
        
        <n-button @click="handleReset">
          <template #icon>
            <n-icon>
              <ReloadOutlined />
            </n-icon>
          </template>
          重置
        </n-button>
        
        <n-button @click="handleExport" :loading="exportLoading">
          <template #icon>
            <n-icon>
              <DownloadOutlined />
            </n-icon>
          </template>
          导出
        </n-button>
      </n-space>
    </n-card>
    
    <!-- 日志列表 -->
    <n-data-table
      :columns="columns"
      :data="logs"
      :loading="loading"
      :pagination="paginationConfig"
      :row-key="(row: any) => row.id"
      @update:page="handlePageChange"
      @update:page-size="handlePageSizeChange"
    />
    
    <!-- 日志详情弹窗 -->
    <n-modal v-model:show="showDetailModal" preset="card" title="日志详情" style="width: 700px">
      <div v-if="selectedLog" class="log-detail">
        <n-descriptions :column="2" label-placement="left" bordered>
          <n-descriptions-item label="操作时间">
            {{ dayjs(selectedLog.created_at).format('YYYY-MM-DD HH:mm:ss') }}
          </n-descriptions-item>
          
          <n-descriptions-item label="用户邮箱">
            {{ selectedLog.user_email || '-' }}
          </n-descriptions-item>
          
          <n-descriptions-item label="操作类型">
            <n-tag :type="getActionTagType(selectedLog.action)">
              {{ getActionLabel(selectedLog.action) }}
            </n-tag>
          </n-descriptions-item>
          
          <n-descriptions-item label="IP 地址">
            {{ selectedLog.ip_address || '-' }}
          </n-descriptions-item>
          
          <n-descriptions-item label="设备信息">
            {{ selectedLog.device_info || '-' }}
          </n-descriptions-item>
          
          <n-descriptions-item label="Token 使用">
            {{ selectedLog.tokens_used || 0 }}
          </n-descriptions-item>
          
          <n-descriptions-item label="处理时间" span="2">
            {{ selectedLog.processing_time ? `${selectedLog.processing_time}ms` : '-' }}
          </n-descriptions-item>
        </n-descriptions>
        
        <div v-if="selectedLog.request_data" class="detail-section">
          <h4>请求参数</h4>
          <n-code :code="formatJson(selectedLog.request_data)" language="json" />
        </div>
        
        <div v-if="selectedLog.response_data" class="detail-section">
          <h4>响应数据</h4>
          <n-code :code="formatJson(selectedLog.response_data)" language="json" />
        </div>
        
        <div v-if="selectedLog.error_message" class="detail-section">
          <h4>错误信息</h4>
          <n-alert type="error" :title="selectedLog.error_message" />
        </div>
      </div>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, h } from 'vue'
import type { DataTableColumns } from 'naive-ui'
import { useMessage } from 'naive-ui'
import { 
  SearchOutlined, 
  ReloadOutlined, 
  DownloadOutlined,
  EyeOutlined 
} from '@vicons/antd'
import { adminApi } from '../services/api'
import dayjs from 'dayjs'

const message = useMessage()

// 响应式数据
const loading = ref(false)
const exportLoading = ref(false)
const logs = ref<any[]>([])
const dateRange = ref<[number, number] | null>(null)
const selectedAction = ref<string | null>(null)
const searchKeyword = ref('')

// 日志详情
const showDetailModal = ref(false)
const selectedLog = ref<any>(null)

// 分页配置
const paginationConfig = reactive({
  page: 1,
  pageSize: 20,
  showSizePicker: true,
  pageSizes: [10, 20, 50, 100],
  showQuickJumper: true,
  itemCount: 0
})

// 操作类型选项
const actionOptions = [
  { label: '图片生成', value: 'generate' },
  { label: '图片编辑', value: 'edit' },
  { label: '用户登录', value: 'login' },
  { label: '用户注册', value: 'register' },
  { label: '系统错误', value: 'error' }
]

// 表格列配置
const columns: DataTableColumns = [
  {
    title: '时间',
    key: 'created_at',
    width: 150,
    render: (row: any) => dayjs(row.created_at).format('MM-DD HH:mm:ss')
  },
  {
    title: '用户',
    key: 'user_email',
    width: 200,
    ellipsis: { tooltip: true },
    render: (row: any) => row.user_email || '系统'
  },
  {
    title: '操作',
    key: 'action',
    width: 120,
    render: (row: any) => h(
      'n-tag',
      { type: getActionTagType(row.action), size: 'small' },
      { default: () => getActionLabel(row.action) }
    )
  },
  {
    title: 'Token',
    key: 'tokens_used',
    width: 100,
    render: (row: any) => row.tokens_used || '-'
  },
  {
    title: '处理时间',
    key: 'processing_time',
    width: 100,
    render: (row: any) => row.processing_time ? `${row.processing_time}ms` : '-'
  },
  {
    title: 'IP 地址',
    key: 'ip_address',
    width: 130,
    render: (row: any) => row.ip_address || '-'
  },
  {
    title: '状态',
    key: 'status',
    width: 80,
    render: (row: any) => h(
      'n-tag',
      { 
        type: row.error_message ? 'error' : 'success',
        size: 'small'
      },
      { default: () => row.error_message ? '失败' : '成功' }
    )
  },
  {
    title: '操作',
    key: 'actions',
    width: 100,
    render: (row: any) => h(
      'n-button',
      {
        size: 'small',
        type: 'primary',
        ghost: true,
        onClick: () => handleViewDetail(row)
      },
      { default: () => '详情', icon: () => h(EyeOutlined) }
    )
  }
]

/**
 * 获取操作类型标签类型
 */
const getActionTagType = (action: string) => {
  const typeMap: Record<string, string> = {
    'generate': 'success',
    'edit': 'info',
    'login': 'default',
    'register': 'warning',
    'error': 'error'
  }
  return typeMap[action] || 'default'
}

/**
 * 获取操作类型标签
 */
const getActionLabel = (action: string) => {
  const labelMap: Record<string, string> = {
    'generate': '图片生成',
    'edit': '图片编辑',
    'login': '用户登录',
    'register': '用户注册',
    'error': '系统错误'
  }
  return labelMap[action] || action
}

/**
 * 格式化 JSON
 */
const formatJson = (data: any): string => {
  if (typeof data === 'string') {
    try {
      return JSON.stringify(JSON.parse(data), null, 2)
    } catch {
      return data
    }
  }
  return JSON.stringify(data, null, 2)
}

/**
 * 加载日志列表
 */
const loadLogs = async () => {
  loading.value = true
  
  try {
    const params: any = {
      page: paginationConfig.page,
      limit: paginationConfig.pageSize
    }
    
    if (dateRange.value) {
      params.startDate = dayjs(dateRange.value[0]).format('YYYY-MM-DD')
      params.endDate = dayjs(dateRange.value[1]).format('YYYY-MM-DD')
    }
    
    if (selectedAction.value) {
      params.action = selectedAction.value
    }
    
    if (searchKeyword.value) {
      params.search = searchKeyword.value
    }
    
    const response = await adminApi.getLogs(params)
    
    if (response.success) {
      logs.value = response.data.logs || []
      paginationConfig.itemCount = response.data.total || 0
    } else {
      message.error(response.error || '加载日志失败')
    }
  } catch (error) {
    console.error('Load logs failed:', error)
    message.error('网络错误，请稍后重试')
  } finally {
    loading.value = false
  }
}

/**
 * 处理筛选
 */
const handleFilter = () => {
  paginationConfig.page = 1
  loadLogs()
}

/**
 * 重置筛选条件
 */
const handleReset = () => {
  dateRange.value = null
  selectedAction.value = null
  searchKeyword.value = ''
  paginationConfig.page = 1
  loadLogs()
}

/**
 * 导出日志
 */
const handleExport = async () => {
  exportLoading.value = true
  
  try {
    const params: any = {}
    
    if (dateRange.value) {
      params.startDate = dayjs(dateRange.value[0]).format('YYYY-MM-DD')
      params.endDate = dayjs(dateRange.value[1]).format('YYYY-MM-DD')
    }
    
    if (selectedAction.value) {
      params.action = selectedAction.value
    }
    
    if (searchKeyword.value) {
      params.search = searchKeyword.value
    }
    
    // 这里应该调用导出接口，暂时用消息提示
    message.info('导出功能开发中...')
  } catch (error) {
    console.error('Export logs failed:', error)
    message.error('导出失败')
  } finally {
    exportLoading.value = false
  }
}

/**
 * 查看详情
 */
const handleViewDetail = (log: any) => {
  selectedLog.value = log
  showDetailModal.value = true
}

/**
 * 分页变化
 */
const handlePageChange = (page: number) => {
  paginationConfig.page = page
  loadLogs()
}

/**
 * 页面大小变化
 */
const handlePageSizeChange = (pageSize: number) => {
  paginationConfig.pageSize = pageSize
  paginationConfig.page = 1
  loadLogs()
}

onMounted(() => {
  loadLogs()
})
</script>

<style scoped>
.logs-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.filter-card {
  padding: 16px;
}

.log-detail {
  max-height: 600px;
  overflow-y: auto;
}

.detail-section {
  margin-top: 20px;
}

.detail-section h4 {
  margin: 0 0 12px 0;
  color: var(--text-color-1);
  font-weight: 500;
}

@media (max-width: 768px) {
  .filter-card :deep(.n-space) {
    justify-content: center;
  }
}
</style>