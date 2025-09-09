<template>
  <div class="statistics-page">
    <!-- 时间范围选择 -->
    <n-card class="date-filter-card">
      <n-space align="center">
        <n-text>时间范围：</n-text>
        <n-date-picker
          v-model:value="dateRange"
          type="daterange"
          clearable
          @update:value="handleDateRangeChange"
        />
        
        <n-select
          v-model:value="groupBy"
          :options="groupByOptions"
          style="width: 120px"
          @update:value="handleGroupByChange"
        />
        
        <n-button @click="refreshStats">
          <template #icon>
            <n-icon>
              <ReloadOutlined />
            </n-icon>
          </template>
          刷新
        </n-button>
      </n-space>
    </n-card>
    
    <!-- 统计图表 -->
    <n-grid x-gap="16" y-gap="16" :cols="2" responsive="screen">
      <!-- 使用趋势图 -->
      <n-gi span="2 m:2">
        <n-card title="使用趋势" :segmented="{ content: true }">
          <div class="chart-container">
            <v-chart 
              v-if="usageChartData.length > 0"
              :option="usageChartOption" 
              style="height: 400px;"
            />
            <n-empty 
              v-else 
              description="暂无数据" 
              style="height: 400px;"
            />
          </div>
        </n-card>
      </n-gi>
      
      <!-- Token 使用分布 -->
      <n-gi span="2 m:1">
        <n-card title="Token 使用分布" :segmented="{ content: true }">
          <div class="chart-container">
            <v-chart 
              v-if="tokenDistributionData.length > 0"
              :option="tokenDistributionOption" 
              style="height: 300px;"
            />
            <n-empty 
              v-else 
              description="暂无数据" 
              style="height: 300px;"
            />
          </div>
        </n-card>
      </n-gi>
      
      <!-- 用户活跃度 -->
      <n-gi span="2 m:1">
        <n-card title="用户活跃度" :segmented="{ content: true }">
          <div class="chart-container">
            <v-chart 
              v-if="userActivityData.length > 0"
              :option="userActivityOption" 
              style="height: 300px;"
            />
            <n-empty 
              v-else 
              description="暂无数据" 
              style="height: 300px;"
            />
          </div>
        </n-card>
      </n-gi>
    </n-grid>
    
    <!-- 用户 Token 使用排行 -->
    <n-card title="用户 Token 使用排行" :segmented="{ content: true }">
      <n-data-table
        :columns="userRankingColumns"
        :data="userRankingData"
        :loading="loading"
        :pagination="false"
        max-height="400px"
      />
    </n-card>
    
    <!-- 详细统计表格 -->
    <n-card title="详细统计" :segmented="{ content: true }">
      <n-data-table
        :columns="detailColumns"
        :data="detailData"
        :loading="loading"
        :pagination="detailPagination"
        @update:page="handleDetailPageChange"
      />
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import type { DataTableColumns } from 'naive-ui'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart, PieChart, BarChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent
} from 'echarts/components'
import VChart from 'vue-echarts'
import { ReloadOutlined } from '@vicons/antd'
import { adminApi } from '../services/api'
import dayjs from 'dayjs'

use([
  CanvasRenderer,
  LineChart,
  PieChart,
  BarChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent
])

// 响应式数据
const loading = ref(false)
const dateRange = ref<[number, number] | null>(null)
const groupBy = ref('day')

// 图表数据
const usageChartData = ref<any[]>([])
const tokenDistributionData = ref<any[]>([])
const userActivityData = ref<any[]>([])
const userRankingData = ref<any[]>([])
const detailData = ref<any[]>([])

// 分组选项
const groupByOptions = [
  { label: '按天', value: 'day' },
  { label: '按周', value: 'week' },
  { label: '按月', value: 'month' }
]

// 详细统计分页
const detailPagination = reactive({
  page: 1,
  pageSize: 20,
  itemCount: 0,
  showSizePicker: true,
  pageSizes: [10, 20, 50]
})

// 使用趋势图表配置
const usageChartOption = computed(() => ({
  tooltip: {
    trigger: 'axis',
    axisPointer: {
      type: 'cross'
    }
  },
  legend: {
    data: ['生成次数', 'Token 使用', '活跃用户']
  },
  grid: {
    left: '3%',
    right: '4%',
    bottom: '3%',
    containLabel: true
  },
  xAxis: {
    type: 'category',
    data: usageChartData.value.map(item => formatChartDate(item.date))
  },
  yAxis: [
    {
      type: 'value',
      name: '数量',
      position: 'left'
    },
    {
      type: 'value',
      name: 'Token',
      position: 'right'
    }
  ],
  series: [
    {
      name: '生成次数',
      type: 'line',
      data: usageChartData.value.map(item => item.generations),
      smooth: true,
      itemStyle: { color: '#18a058' }
    },
    {
      name: 'Token 使用',
      type: 'line',
      yAxisIndex: 1,
      data: usageChartData.value.map(item => item.tokens),
      smooth: true,
      itemStyle: { color: '#2080f0' }
    },
    {
      name: '活跃用户',
      type: 'bar',
      data: usageChartData.value.map(item => item.activeUsers),
      itemStyle: { color: '#f0a020' }
    }
  ]
}))

// Token 分布图表配置
const tokenDistributionOption = computed(() => ({
  tooltip: {
    trigger: 'item',
    formatter: '{a} <br/>{b} : {c} ({d}%)'
  },
  legend: {
    orient: 'vertical',
    left: 'left'
  },
  series: [
    {
      name: 'Token 使用',
      type: 'pie',
      radius: '70%',
      data: tokenDistributionData.value,
      emphasis: {
        itemStyle: {
          shadowBlur: 10,
          shadowOffsetX: 0,
          shadowColor: 'rgba(0, 0, 0, 0.5)'
        }
      }
    }
  ]
}))

// 用户活跃度图表配置
const userActivityOption = computed(() => ({
  tooltip: {
    trigger: 'axis'
  },
  grid: {
    left: '3%',
    right: '4%',
    bottom: '3%',
    containLabel: true
  },
  xAxis: {
    type: 'category',
    data: userActivityData.value.map(item => item.name)
  },
  yAxis: {
    type: 'value'
  },
  series: [
    {
      type: 'bar',
      data: userActivityData.value.map(item => item.value),
      itemStyle: {
        color: '#188df0'
      }
    }
  ]
}))

// 用户排行表格列
const userRankingColumns: DataTableColumns = [
  { title: '排名', key: 'rank', width: 80 },
  { title: '用户邮箱', key: 'email', ellipsis: { tooltip: true } },
  { title: 'Token 使用', key: 'tokens', width: 120 },
  { title: '生成次数', key: 'generations', width: 100 },
  { title: '最后活跃', key: 'lastActive', width: 150 }
]

// 详细统计表格列
const detailColumns: DataTableColumns = [
  { title: '日期', key: 'date', width: 120 },
  { title: '用户邮箱', key: 'userEmail', ellipsis: { tooltip: true } },
  { title: 'Token 使用', key: 'tokens', width: 100 },
  { title: '生成次数', key: 'generations', width: 100 },
  { title: '编辑次数', key: 'edits', width: 100 },
  { title: '操作时间', key: 'createdAt', width: 150 }
]

/**
 * 格式化图表日期
 */
const formatChartDate = (date: string) => {
  const format = groupBy.value === 'month' ? 'MM月' : 
                 groupBy.value === 'week' ? 'MM-DD' : 'MM-DD'
  return dayjs(date).format(format)
}

/**
 * 处理日期范围变化
 */
const handleDateRangeChange = () => {
  loadStatistics()
}

/**
 * 处理分组方式变化
 */
const handleGroupByChange = () => {
  loadStatistics()
}

/**
 * 处理详细统计分页变化
 */
const handleDetailPageChange = (page: number) => {
  detailPagination.page = page
  loadDetailStats()
}

/**
 * 刷新统计数据
 */
const refreshStats = () => {
  loadStatistics()
  loadDetailStats()
}

/**
 * 加载统计数据
 */
const loadStatistics = async () => {
  loading.value = true
  
  try {
    const params: any = {
      groupBy: groupBy.value
    }
    
    if (dateRange.value) {
      params.startDate = dayjs(dateRange.value[0]).format('YYYY-MM-DD')
      params.endDate = dayjs(dateRange.value[1]).format('YYYY-MM-DD')
    }
    
    const [usageResponse, tokenResponse] = await Promise.all([
      adminApi.getUsageStats(params),
      adminApi.getTokenStats(params)
    ])
    
    if (usageResponse.success) {
      usageChartData.value = usageResponse.data?.chartData || []
      userRankingData.value = (usageResponse.data?.userRanking || []).map((user: any, index: number) => ({
        ...user,
        rank: index + 1,
        lastActive: user.lastActive ? dayjs(user.lastActive).format('MM-DD HH:mm') : '-'
      }))
      userActivityData.value = usageResponse.data?.userActivity || []
    }
    
    if (tokenResponse.success) {
      tokenDistributionData.value = tokenResponse.data?.distribution || []
    }
  } catch (error) {
    console.error('Load statistics failed:', error)
  } finally {
    loading.value = false
  }
}

/**
 * 加载详细统计数据
 */
const loadDetailStats = async () => {
  try {
    const params: any = {
      page: detailPagination.page,
      limit: detailPagination.pageSize
    }
    
    if (dateRange.value) {
      params.startDate = dayjs(dateRange.value[0]).format('YYYY-MM-DD')
      params.endDate = dayjs(dateRange.value[1]).format('YYYY-MM-DD')
    }
    
    const response = await adminApi.getLogs(params)
    
    if (response.success) {
      detailData.value = (response.data?.logs || []).map((log: any) => ({
        date: dayjs(log.createdAt || log.created_at).format('MM-DD'),
        userEmail: log.userName || log.user_email || '-',
        tokens: log.tokens_used || log.details?.tokens || 0,
        generations: log.action === 'generate' ? 1 : 0,
        edits: log.action === 'edit' ? 1 : 0,
        createdAt: dayjs(log.createdAt || log.created_at).format('HH:mm:ss')
      }))
      
      detailPagination.itemCount = response.data?.total || 0
    }
  } catch (error) {
    console.error('Load detail stats failed:', error)
  }
}

onMounted(() => {
  // 默认设置最近30天
  const endDate = dayjs()
  const startDate = endDate.subtract(30, 'day')
  dateRange.value = [startDate.valueOf(), endDate.valueOf()]
  
  loadStatistics()
  loadDetailStats()
})
</script>

<style scoped>
.statistics-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.date-filter-card {
  padding: 16px;
}

.chart-container {
  width: 100%;
}
</style>