# 增强 Token 统计功能 - 迁移指南

## 📋 概述

此次更新将现有的简单 Token 统计升级为详细的输入/输出 Token 分离统计，并添加了基于实际使用量的成本计算功能。同时为未来支持多个图像生成 API 提供商做好了准备。

## 🗄️ 数据库迁移

### 1. 运行迁移脚本

在 Supabase 控制台中执行以下迁移脚本：

```bash
# 在 Supabase SQL Editor 中运行
./supabase/migrations/002_enhanced_token_statistics.sql
```

### 2. 迁移内容

- ✅ **清空历史数据** - 删除现有的统计数据
- ✅ **重构表结构** - 添加详细的 token 和成本字段
- ✅ **创建定价表** - 支持多提供商定价管理
- ✅ **添加存储过程** - 高效的统计数据更新
- ✅ **创建索引** - 优化查询性能

### 3. 新表结构

#### `ai_image_editor_usage_stats` (重构)
```sql
- input_tokens BIGINT          -- 输入 token 数量
- output_tokens BIGINT         -- 输出 token 数量  
- total_tokens BIGINT          -- 总 token 数量 (自动计算)
- input_cost_usd DECIMAL(12,8) -- 输入成本 (USD)
- output_cost_usd DECIMAL(12,8)-- 输出成本 (USD)
- total_cost_usd DECIMAL(12,8) -- 总成本 (USD, 自动计算)
- provider VARCHAR(50)         -- API 提供商
- model_name VARCHAR(100)      -- 模型名称
```

#### `ai_image_editor_pricing` (新增)
```sql
- provider VARCHAR(50)                    -- 提供商名称
- model_name VARCHAR(100)                 -- 模型名称
- input_price_per_1m_tokens DECIMAL(10,4) -- 每百万输入token价格
- output_price_per_1m_tokens DECIMAL(10,4)-- 每百万输出token价格
- effective_from TIMESTAMPTZ              -- 生效时间
- is_active BOOLEAN                       -- 是否激活
```

## 🔧 技术实现

### 1. Token 分析器系统

新增 `tokenAnalyzer.cjs` 提供：
- 🔍 **Google Gemini 解析器** - 解析详细的 token 使用信息
- 🏗️ **提供商架构** - 支持未来添加 OpenAI、Anthropic 等
- 💰 **成本计算** - 基于实时定价的精确成本计算
- 📊 **统计记录** - 自动化的数据库更新

### 2. API 响应格式

#### Google Gemini API 响应解析
```javascript
// 从 usageMetadata 中提取详细信息
{
  promptTokensDetails: [{
    modality: 'TEXT',
    tokenCount: 16
  }],
  candidatesTokensDetails: [{
    modality: 'IMAGE', 
    tokenCount: 1290
  }]
}
```

#### 成本计算公式
```javascript
inputCost = (inputTokens / 1000000) * inputPricePerMToken
outputCost = (outputTokens / 1000000) * outputPricePerMToken
totalCost = inputCost + outputCost
```

## 📊 前端显示更新

### 1. 用户列表页面
- 📈 **Token 使用详情** - 显示输入/输出 token 分离统计
- 💵 **成本显示** - 精确到小数点后3位的成本信息
- 📱 **响应式布局** - 紧凑的双行显示

### 2. 概览页面
- 🆕 **新增成本卡片** - 总体成本统计
- 📊 **增强统计信息** - 包含成本趋势分析

### 3. 统计页面  
- 🔢 **详细 Token 分析** - 输入/输出分离图表
- 💰 **成本分布图** - 按用户和提供商的成本分析

## 🚀 部署步骤

### 1. 数据库迁移
```sql
-- 在 Supabase SQL Editor 中执行
-- 文件: ./supabase/migrations/002_enhanced_token_statistics.sql
```

### 2. 服务器重启
```bash
# 重启服务器以加载新模块
npm run dev  # 或重启你的生产服务器
```

### 3. 验证功能
- ✅ 生成图像时检查控制台日志
- ✅ 在 Admin 面板中验证新的统计显示
- ✅ 检查数据库中的详细 token 记录

## 📈 定价配置

### 默认定价（已预设）

| 提供商 | 模型 | 输入 ($/1M tokens) | 输出 ($/1M tokens) |
|--------|------|-------------------|-------------------|
| Google | gemini-2.5-flash-image-preview | $0.30 | $30.00 |
| Google | gemini-2.5-flash | $0.30 | $30.00 |
| Google | gemini-1.5-flash | $0.075 | $0.30 |
| Google | gemini-1.5-pro | $1.25 | $3.75 |

### 添加新定价
```sql
INSERT INTO ai_image_editor_pricing 
(provider, model_name, input_price_per_1m_tokens, output_price_per_1m_tokens)
VALUES 
('openai', 'dall-e-3', 40.00, 40.00);
```

## 🔄 兼容性

### 向后兼容
- ✅ **旧数据支持** - 自动处理没有详细 token 信息的旧记录
- ✅ **备用方案** - API 响应缺失时使用估算值
- ✅ **渐进升级** - 新旧统计方法并存

### 错误处理
- 🛡️ **稳健性** - 统计记录失败不影响图像生成
- 📝 **详细日志** - 完整的错误和成功日志
- 🔄 **自动重试** - 失败时自动使用备用统计方法

## ⚠️ 注意事项

1. **历史数据清除** - 此次迁移将清空所有历史统计数据
2. **成本精度** - 成本计算精确到小数点后8位，显示时四舍五入
3. **定价更新** - 可通过数据库直接更新定价，支持按时间段生效
4. **多提供商准备** - 架构已支持未来添加其他图像生成API

## 🔍 故障排查

### 常见问题

1. **Token 统计为 0**
   - 检查 `usageMetadata` 是否正确传递
   - 查看服务器日志中的 token 解析信息

2. **成本计算错误**  
   - 验证定价表中的数据
   - 检查 `get_current_pricing` 函数

3. **前端显示异常**
   - 确认 API 响应格式符合前端期望
   - 检查新增的成本字段

### 调试命令
```bash
# 查看详细的 token 解析日志
tail -f server/logs/app.log | grep "Token 解析"

# 检查数据库统计数据
SELECT * FROM ai_image_editor_usage_stats ORDER BY created_at DESC LIMIT 10;

# 验证定价数据
SELECT * FROM ai_image_editor_pricing WHERE is_active = true;
```

---

## 🎉 功能验证清单

- [ ] **数据库迁移成功** - 新表结构创建完成
- [ ] **Token 解析正常** - 控制台显示详细解析日志  
- [ ] **成本计算准确** - 验证几个测试用例的成本
- [ ] **前端显示正确** - 用户列表、概览、统计页面显示正常
- [ ] **兼容性良好** - 旧功能继续正常工作
- [ ] **日志记录完整** - 错误和成功情况都有适当日志

完成以上验证后，增强的 Token 统计功能即可正式投入使用！