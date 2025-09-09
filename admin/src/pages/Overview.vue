<template>
  <div class="overview-page">
    <!-- 统计卡片 -->
    <n-grid x-gap="16" y-gap="16" :cols="4" responsive="screen">
      <n-gi span="4 s:2 m:1">
        <n-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon user-icon">
              <n-icon size="24">
                <UserOutlined />
              </n-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.totalUsers }}</div>
              <div class="stat-label">总用户数</div>
            </div>
          </div>
        </n-card>
      </n-gi>
      
      <n-gi span="4 s:2 m:1">
        <n-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon generation-icon">
              <n-icon size="24">
                <PictureOutlined />
              </n-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.totalGenerations }}</div>
              <div class="stat-label">生成次数</div>
            </div>
          </div>
        </n-card>
      </n-gi>
      
      <n-gi span="4 s:2 m:1">
        <n-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon token-icon">
              <n-icon size="24">
                <CreditCardOutlined />
              </n-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ formatNumber(stats.totalTokens) }}</div>
              <div class="stat-label">Token 使用</div>
            </div>
          </div>
        </n-card>
      </n-gi>
      
      <n-gi span="4 s:2 m:1">
        <n-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon cost-icon">
              <n-icon size="24">
                <CreditCardOutlined />
              </n-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ formatCost(stats.totalCost) }}</div>
              <div class="stat-label">总成本 (USD)</div>
            </div>
          </div>
        </n-card>
      </n-gi>
      
      <n-gi span="4 s:2 m:1">
        <n-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon active-icon">
              <n-icon size="24">
                <ClockCircleOutlined />
              </n-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.activeUsers }}</div>
              <div class="stat-label">活跃用户</div>
            </div>
          </div>
        </n-card>
      </n-gi>
    </n-grid>
    
    <!-- 图表区域 -->
    <n-grid x-gap="16" y-gap="16" :cols="2" class="charts-section" responsive="screen">
      <!-- 使用趋势图表 -->
      <n-gi span="2 m:1">
        <n-card title="使用趋势" :segmented="{ content: true }">
          <div class="chart-container">
            <v-chart 
              v-if="usageTrendData.length > 0" 
              :option="usageTrendOption" 
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
    </n-grid>
    
    <!-- 最近活动 -->
    <n-card title="最近活动" :segmented="{ content: true }" class="recent-activity">
      <n-list>
        <n-list-item v-for="activity in recentActivities" :key="activity.id">
          <template #prefix>
            <n-avatar size="small" :src="activity.userAvatar">
              {{ activity.userName.charAt(0).toUpperCase() }}
            </n-avatar>
          </template>
          
          <n-thing :title="activity.userName">
            <template #description>
              <n-text depth="3">
                {{ formatActivityTime(activity.createdAt) }}
              </n-text>
            </template>
            {{ activity.description }}
          </n-thing>
          
          <template #suffix>
            <n-tag :type="getActivityTagType(activity.action)" size="small">
              {{ activity.action }}
            </n-tag>
          </template>
        </n-list-item>
      </n-list>
      
      <div v-if="recentActivities.length === 0" class="empty-state">
        <n-empty description="暂无最近活动" />
      </div>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart, PieChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent
} from 'echarts/components'
import VChart from 'vue-echarts'
import { 
  UserOutlined, 
  PictureOutlined, 
  CreditCardOutlined, 
  ClockCircleOutlined 
} from '@vicons/antd'
import { adminApi } from '../services/api'
import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'

use([
  CanvasRenderer,
  LineChart,
  PieChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent
])

dayjs.locale('zh-cn')

// 响应式数据
const stats = ref({
  totalUsers: 0,
  totalGenerations: 0,
  totalTokens: 0,
  totalCost: 0,
  activeUsers: 0
})

const usageTrendData = ref<any[]>([])
const tokenDistributionData = ref<any[]>([])
const recentActivities = ref<any[]>([])

// 使用趋势图表配置
const usageTrendOption = computed(() => ({
  tooltip: {
    trigger: 'axis',
    axisPointer: {
      type: 'cross'
    }
  },
  legend: {
    data: ['生成次数', 'Token 使用']
  },
  grid: {
    left: '3%',
    right: '4%',
    bottom: '3%',
    containLabel: true
  },
  xAxis: {
    type: 'category',
    data: usageTrendData.value.map(item => dayjs(item.date).format('MM-DD'))
  },
  yAxis: [
    {
      type: 'value',
      name: '生成次数'
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
      data: usageTrendData.value.map(item => item.generations),
      smooth: true,
      itemStyle: {
        color: '#18a058'
      }
    },
    {
      name: 'Token 使用',
      type: 'line',
      yAxisIndex: 1,
      data: usageTrendData.value.map(item => item.tokens),
      smooth: true,
      itemStyle: {
        color: '#2080f0'
      }
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
      radius: '50%',
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

/**
 * 格式化数字
 */
const formatNumber = (num: number): string => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M'
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K'
  }
  return num.toString()
}

/**
 * 格式化成本 (USD)
 */
const formatCost = (cost: number): string => {
  if (cost === 0) return '$0'
  if (cost < 0.001) return '<$0.001'
  if (cost < 1) return `$${cost.toFixed(3)}`
  return `$${cost.toFixed(2)}`
}

/**
 * 格式化活动时间
 */
const formatActivityTime = (time: string): string => {
  return dayjs(time).fromNow()
}

/**
 * 获取活动标签类型
 */
const getActivityTagType = (action: string) => {
  const tagMap: Record<string, string> = {
    'generate': 'success',
    'edit': 'info',
    'login': 'default',
    'register': 'warning'
  }
  return tagMap[action] || 'default'
}

/**
 * 加载概览统计数据
 */
const loadOverviewStats = async () => {
  try {
    const response = await adminApi.getOverviewStats()
    
    if (response.success) {
      stats.value = response.data.stats || {
        totalUsers: 0,
        totalGenerations: 0,
        totalTokens: 0,
        totalCost: 0,
        activeUsers: 0
      }
      
      usageTrendData.value = response.data.usageTrend || []
      tokenDistributionData.value = response.data.tokenDistribution || []
      recentActivities.value = response.data.recentActivities || []
    }
  } catch (error) {
    console.error('Load overview stats failed:', error)
  }
}

onMounted(() => {
  loadOverviewStats()
})
</script>

<style scoped>
.overview-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.stat-card {
  height: 120px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

.stat-content {
  display: flex;
  align-items: center;
  gap: 16px;
  height: 100%;
}

.stat-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 8px;
  color: white;
}

.user-icon {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.generation-icon {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.token-icon {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

.active-icon {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
}

.cost-icon {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 24px;
  font-weight: 600;
  color: var(--text-color-1);
  margin-bottom: 4px;
}

.stat-label {
  font-size: 14px;
  color: var(--text-color-3);
}

.charts-section {
  margin-top: 24px;
}

.chart-container {
  width: 100%;
}

.recent-activity {
  margin-top: 24px;
}

.empty-state {
  padding: 40px 0;
  text-align: center;
}

@media (max-width: 768px) {
  .stat-card {
    height: 100px;
  }
  
  .stat-icon {
    width: 40px;
    height: 40px;
  }
  
  .stat-value {
    font-size: 20px;
  }
}
</style>