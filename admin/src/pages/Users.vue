<template>
  <div class="users-page">
    <!-- 操作栏 -->
    <div class="action-bar">
      <div class="action-left">
        <n-button type="primary" @click="showCreateUserModal = true">
          <template #icon>
            <n-icon>
              <PlusOutlined />
            </n-icon>
          </template>
          新增用户
        </n-button>
        
        <n-button @click="refreshUsers">
          <template #icon>
            <n-icon>
              <ReloadOutlined />
            </n-icon>
          </template>
          刷新
        </n-button>
      </div>
      
      <div class="action-right">
        <n-input
          v-model:value="searchKeyword"
          placeholder="搜索用户名..."
          clearable
          @clear="handleSearch"
          @keyup.enter="handleSearch"
        >
          <template #suffix>
            <n-button text @click="handleSearch">
              <template #icon>
                <n-icon>
                  <SearchOutlined />
                </n-icon>
              </template>
            </n-button>
          </template>
        </n-input>
      </div>
    </div>
    
    <!-- 用户列表 -->
    <n-data-table
      :columns="columns"
      :data="users"
      :loading="loading"
      :pagination="paginationConfig"
      :row-key="(row: any) => row.id"
      @update:page="handlePageChange"
      @update:page-size="handlePageSizeChange"
    />
    
    <!-- 创建用户弹窗 -->
    <n-modal v-model:show="showCreateUserModal" preset="dialog" title="新增用户">
      <template #default>
        <n-form
          ref="createFormRef"
          :model="createForm"
          :rules="createRules"
          label-placement="left"
          label-width="80px"
        >
          <n-form-item label="邮箱" path="email">
            <n-input v-model:value="createForm.email" placeholder="请输入邮箱地址" type="email" />
          </n-form-item>
          
          <n-form-item label="用户名" path="username">
            <n-input v-model:value="createForm.username" placeholder="请输入用户名" />
          </n-form-item>
          
          <n-form-item label="密码" path="password">
            <n-input
              v-model:value="createForm.password"
              type="password"
              placeholder="请输入初始密码"
              show-password-on="mousedown"
            />
          </n-form-item>
          
          <n-form-item label="确认密码" path="confirmPassword">
            <n-input
              v-model:value="createForm.confirmPassword"
              type="password"
              placeholder="请再次输入密码"
              show-password-on="mousedown"
            />
          </n-form-item>
          
          <n-form-item label="备注">
            <n-input
              v-model:value="createForm.metadata.note"
              type="textarea"
              placeholder="用户备注信息（可选）"
            />
          </n-form-item>
        </n-form>
      </template>
      
      <template #action>
        <n-space>
          <n-button @click="showCreateUserModal = false">取消</n-button>
          <n-button type="primary" :loading="createLoading" @click="handleCreateUser">
            创建
          </n-button>
        </n-space>
      </template>
    </n-modal>
    
    <!-- 编辑用户弹窗 -->
    <n-modal v-model:show="showEditUserModal" preset="dialog" title="编辑用户">
      <template #default>
        <n-form
          ref="editFormRef"
          :model="editForm"
          :rules="editRules"
          label-placement="left"
          label-width="80px"
        >
          <n-form-item label="用户名" path="username">
            <n-input v-model:value="editForm.username" placeholder="请输入用户名" />
          </n-form-item>
          
          <n-form-item label="备注">
            <n-input
              v-model:value="editForm.metadata.note"
              type="textarea"
              placeholder="用户备注信息（可选）"
            />
          </n-form-item>
        </n-form>
      </template>
      
      <template #action>
        <n-space>
          <n-button @click="showEditUserModal = false">取消</n-button>
          <n-button type="primary" :loading="editLoading" @click="handleUpdateUser">
            更新
          </n-button>
        </n-space>
      </template>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, h } from 'vue'
import type { DataTableColumns, FormInst, FormRules } from 'naive-ui'
import { useMessage, useDialog } from 'naive-ui'
import { 
  PlusOutlined, 
  ReloadOutlined, 
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  KeyOutlined
} from '@vicons/antd'
import { adminApi } from '../services/api'
import dayjs from 'dayjs'

const message = useMessage()
const dialog = useDialog()

// 响应式数据
const loading = ref(false)
const users = ref<any[]>([])
const searchKeyword = ref('')

// 分页配置
const paginationConfig = reactive({
  page: 1,
  pageSize: 20,
  showSizePicker: true,
  pageSizes: [10, 20, 50, 100],
  showQuickJumper: true,
  itemCount: 0
})

// 创建用户弹窗
const showCreateUserModal = ref(false)
const createLoading = ref(false)
const createFormRef = ref<FormInst | null>(null)
const createForm = reactive({
  email: '',
  username: '',
  password: '',
  confirmPassword: '',
  role: 'user',
  status: 'active',
  metadata: {
    note: ''
  }
})

// 编辑用户弹窗
const showEditUserModal = ref(false)
const editLoading = ref(false)
const editFormRef = ref<FormInst | null>(null)
const editForm = reactive({
  id: '',
  username: '',
  metadata: {
    note: ''
  }
})

// 表单验证规则
const createRules: FormRules = {
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入有效的邮箱地址', trigger: 'blur' }
  ],
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, message: '用户名长度不能少于3位', trigger: 'blur' },
    { max: 50, message: '用户名长度不能超过50位', trigger: 'blur' },
    { pattern: /^[a-zA-Z0-9_-]+$/, message: '用户名只能包含字母、数字、下划线和连字符', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码长度不能少于 6 位', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请确认密码', trigger: 'blur' },
    {
      validator: (rule, value) => {
        return value === createForm.password
      },
      message: '两次输入的密码不一致',
      trigger: 'blur'
    }
  ]
}

const editRules: FormRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, message: '用户名长度不能少于3位', trigger: 'blur' },
    { max: 50, message: '用户名长度不能超过50位', trigger: 'blur' },
    { pattern: /^[a-zA-Z0-9_-]+$/, message: '用户名只能包含字母、数字、下划线和连字符', trigger: 'blur' }
  ]
}

// 表格列配置
const columns: DataTableColumns = [
  {
    title: '用户名',
    key: 'username',
    width: 200,
    ellipsis: {
      tooltip: true
    }
  },
  {
    title: '注册时间',
    key: 'created_at',
    width: 180,
    render: (row: any) => dayjs(row.created_at).format('YYYY-MM-DD HH:mm')
  },
  {
    title: '最后登录',
    key: 'last_sign_in_at',
    width: 180,
    render: (row: any) => row.last_sign_in_at 
      ? dayjs(row.last_sign_in_at).format('YYYY-MM-DD HH:mm')
      : '从未登录'
  },
  {
    title: '操作次数',
    key: 'operation_count',
    width: 100,
    render: (row: any) => {
      const genCount = row.user_stats?.generation_count || 0
      const editCount = row.user_stats?.edit_count || 0
      return genCount + editCount
    }
  },
  {
    title: 'Token 使用',
    key: 'token_used',
    width: 150,
    render: (row: any) => {
      const inputTokens = row.user_stats?.input_tokens || 0
      const outputTokens = row.user_stats?.output_tokens || 0
      const totalTokens = row.user_stats?.total_tokens || (inputTokens + outputTokens) || 0
      
      const formatTokens = (tokens: number) => {
        if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(1)}M`
        if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}K`
        return tokens.toString()
      }
      
      return h('div', { style: 'font-size: 12px; line-height: 1.2;' }, [
        h('div', `总计: ${formatTokens(totalTokens)}`),
        h('div', { style: 'color: #888;' }, `输入: ${formatTokens(inputTokens)} | 输出: ${formatTokens(outputTokens)}`)
      ])
    }
  },
  {
    title: '成本 (USD)',
    key: 'cost_usd',
    width: 100,
    render: (row: any) => {
      const cost = row.user_stats?.total_cost_usd || 0
      if (cost === 0) return '-'
      if (cost < 0.001) return '<$0.001'
      return `$${cost.toFixed(3)}`
    }
  },
  {
    title: '备注',
    key: 'note',
    ellipsis: {
      tooltip: true
    },
    render: (row: any) => row.raw_user_meta_data?.note || '-'
  },
  {
    title: '操作',
    key: 'actions',
    width: 200,
    render: (row: any) => h('div', { class: 'action-buttons' }, [
      h(
        'n-button',
        {
          size: 'small',
          type: 'primary',
          ghost: true,
          onClick: () => handleEditUser(row)
        },
        { default: () => '编辑', icon: () => h(EditOutlined) }
      ),
      h(
        'n-button',
        {
          size: 'small',
          type: 'warning',
          ghost: true,
          style: { marginLeft: '8px' },
          onClick: () => handleResetPassword(row)
        },
        { default: () => '重置密码', icon: () => h(KeyOutlined) }
      ),
      h(
        'n-button',
        {
          size: 'small',
          type: 'error',
          ghost: true,
          style: { marginLeft: '8px' },
          onClick: () => handleDeleteUser(row)
        },
        { default: () => '删除', icon: () => h(DeleteOutlined) }
      )
    ])
  }
]

/**
 * 加载用户列表
 */
const loadUsers = async () => {
  if (isUnmounted.value) return
  
  loading.value = true
  
  try {
    const response = await adminApi.getUsers({
      page: paginationConfig.page,
      limit: paginationConfig.pageSize,
      search: searchKeyword.value
    })
    
    // 检查组件是否已卸载
    if (isUnmounted.value) return
    
    if (response.success) {
      users.value = response.data || []
      paginationConfig.itemCount = response.pagination?.total || 0
    } else {
      message.error(response.error || '加载用户列表失败')
    }
  } catch (error) {
    if (isUnmounted.value) return
    console.error('Load users failed:', error)
    message.error('网络错误，请稍后重试')
  } finally {
    if (!isUnmounted.value) {
      loading.value = false
    }
  }
}

/**
 * 刷新用户列表
 */
const refreshUsers = () => {
  loadUsers()
}

/**
 * 搜索用户
 */
const handleSearch = () => {
  paginationConfig.page = 1
  loadUsers()
}

/**
 * 分页变化
 */
const handlePageChange = (page: number) => {
  paginationConfig.page = page
  loadUsers()
}

/**
 * 页面大小变化
 */
const handlePageSizeChange = (pageSize: number) => {
  paginationConfig.pageSize = pageSize
  paginationConfig.page = 1
  loadUsers()
}

/**
 * 创建用户
 */
const handleCreateUser = async () => {
  if (!createFormRef.value) return
  
  try {
    await createFormRef.value.validate()
    createLoading.value = true
    
    const response = await adminApi.createUser({
      email: createForm.email,
      username: createForm.username,
      password: createForm.password,
      role: createForm.role,
      status: createForm.status,
      metadata: createForm.metadata
    })
    
    if (response.success) {
      message.success('用户创建成功')
      showCreateUserModal.value = false
      
      // 重置表单
      Object.assign(createForm, {
        email: '',
        username: '',
        password: '',
        confirmPassword: '',
        role: 'user',
        status: 'active',
        metadata: { note: '' }
      })
      
      // 刷新列表
      loadUsers()
    } else {
      message.error(response.error || '用户创建失败')
    }
  } catch (error) {
    console.error('Create user failed:', error)
    message.error('表单验证失败')
  } finally {
    createLoading.value = false
  }
}

/**
 * 编辑用户
 */
const handleEditUser = (user: any) => {
  editForm.id = user.id
  editForm.username = user.username
  editForm.metadata.note = user.raw_user_meta_data?.note || ''
  
  showEditUserModal.value = true
}

/**
 * 更新用户
 */
const handleUpdateUser = async () => {
  if (!editFormRef.value) return
  
  try {
    await editFormRef.value.validate()
    editLoading.value = true
    
    const response = await adminApi.updateUser(editForm.id, {
      username: editForm.username,
      metadata: editForm.metadata
    })
    
    if (response.success) {
      message.success('用户更新成功')
      showEditUserModal.value = false
      loadUsers()
    } else {
      message.error(response.error || '用户更新失败')
    }
  } catch (error) {
    console.error('Update user failed:', error)
    message.error('表单验证失败')
  } finally {
    editLoading.value = false
  }
}

/**
 * 重置用户密码
 */
const handleResetPassword = (user: any) => {
  dialog.warning({
    title: '重置密码确认',
    content: `确定要重置用户 ${user.username} 的密码吗？系统将生成一个临时密码。`,
    positiveText: '确认重置',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        const response = await adminApi.resetUserPassword(user.id)
        
        if (response.success) {
          dialog.success({
            title: '密码重置成功',
            content: `用户 ${user.username} 的临时密码是：${response.data.temporaryPassword}`,
            positiveText: '知道了'
          })
        } else {
          message.error(response.error || '密码重置失败')
        }
      } catch (error) {
        console.error('Reset password failed:', error)
        message.error('密码重置失败')
      }
    }
  })
}

/**
 * 删除用户
 */
const handleDeleteUser = (user: any) => {
  dialog.error({
    title: '删除用户确认',
    content: `确定要删除用户 ${user.username} 吗？此操作不可逆转，将同时删除该用户的所有数据。`,
    positiveText: '确认删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        const response = await adminApi.deleteUser(user.id)
        
        if (response.success) {
          message.success('用户删除成功')
          loadUsers()
        } else {
          message.error(response.error || '用户删除失败')
        }
      } catch (error) {
        console.error('Delete user failed:', error)
        message.error('用户删除失败')
      }
    }
  })
}

// 组件是否已卸载的标志
const isUnmounted = ref(false)

/**
 * 安全的异步操作包装器
 */
const safeAsync = async (fn: () => Promise<void>) => {
  if (isUnmounted.value) return
  return await fn()
}

onMounted(() => {
  loadUsers()
})

onUnmounted(() => {
  isUnmounted.value = true
})
</script>

<style scoped>
.users-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.action-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: var(--card-color);
  border-radius: 6px;
  border: 1px solid var(--border-color);
}

.action-left {
  display: flex;
  gap: 8px;
}

.action-right {
  width: 250px;
}

.action-buttons {
  display: flex;
  gap: 8px;
}

@media (max-width: 768px) {
  .action-bar {
    flex-direction: column;
    gap: 12px;
  }
  
  .action-right {
    width: 100%;
  }
}
</style>