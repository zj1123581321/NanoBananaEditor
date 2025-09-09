# 🍌 Nano Banana - Supabase 数据库配置

## 数据库初始化

### 1. 自动初始化（推荐）

如果你的 Supabase 项目支持自动运行迁移，将 `migrations` 文件夹上传到你的 Supabase 项目即可。

### 2. 手动初始化

在你的 Supabase 项目的 SQL 编辑器中执行 `migrations/001_initial_setup.sql` 文件内容。

## 数据表结构

### 1. 用户配置表 (`ai_image_editor_user_profiles`)

扩展 Supabase Auth 的用户信息：

```sql
- id: UUID (关联 auth.users.id)
- username: TEXT (用户名，唯一)
- role: TEXT ('admin' | 'user')
- status: TEXT ('active' | 'disabled')
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

### 2. 使用统计表 (`ai_image_editor_usage_stats`)

按日汇总的用户使用统计：

```sql
- id: UUID
- user_id: UUID (关联用户)
- date: DATE (统计日期)
- token_consumed: INTEGER (消耗的 Token)
- request_count: INTEGER (请求次数)
- generation_count: INTEGER (图片生成次数)
- edit_count: INTEGER (图片编辑次数)
```

### 3. 行为日志表 (`ai_image_editor_action_logs`)

记录用户的详细操作行为：

```sql
- id: UUID
- user_id: UUID (关联用户)
- action: TEXT (操作类型)
- details: JSONB (操作详情)
- session_id: TEXT (会话ID)
- ip_address: INET (IP地址)
- user_agent: TEXT (用户代理)
- created_at: TIMESTAMPTZ
```

### 4. 聊天历史表 (`ai_image_editor_chat_history`)

保存用户与 AI 的对话历史：

```sql
- id: UUID
- user_id: UUID (关联用户)
- project_id: TEXT (项目ID)
- prompt: TEXT (用户提示词)
- response: TEXT (AI 响应)
- type: TEXT ('generate' | 'edit')
- metadata: JSONB (元数据)
- created_at: TIMESTAMPTZ
```

### 5. 系统配置表 (`ai_image_editor_system_config`)

存储系统级别的配置：

```sql
- id: UUID
- key: TEXT (配置键，唯一)
- value: JSONB (配置值)
- description: TEXT (配置描述)
- updated_by: UUID (更新者)
- updated_at: TIMESTAMPTZ
```

## 行级安全策略 (RLS)

### 权限模型

1. **普通用户**：
   - 只能访问自己的数据
   - 可以查看和更新自己的配置
   - 可以查看自己的统计和历史

2. **管理员**：
   - 可以访问所有用户的数据
   - 可以管理用户配置
   - 可以查看系统统计和日志
   - 可以修改系统配置

### RLS 策略示例

```sql
-- 用户只能查看自己的使用统计
CREATE POLICY "users_can_view_own_ai_image_editor_usage_stats" ON ai_image_editor_usage_stats
    FOR SELECT USING (auth.uid() = user_id);

-- 管理员可以查看所有统计
CREATE POLICY "admins_can_view_all_ai_image_editor_usage_stats" ON ai_image_editor_usage_stats
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM ai_image_editor_user_profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );
```

## 数据库函数

### 1. `increment_ai_image_editor_usage_stats()`

用于原子性地更新使用统计：

```sql
SELECT increment_ai_image_editor_usage_stats(
    'user-uuid',
    '2025-01-01'::DATE,
    100,  -- token 消耗量
    'generate'  -- 操作类型
);
```

### 2. `get_user_stats_overview()`

获取用户统计概览：

```sql
SELECT * FROM get_user_stats_overview('user-uuid', 30);
```

### 3. `cleanup_old_logs()`

清理旧日志（建议定时执行）：

```sql
SELECT cleanup_old_logs(90);  -- 删除 90 天前的日志
```

## 环境配置

### 必需的环境变量

```bash
# Supabase 配置
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# 前端配置 (多用户模式)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 权限设置

确保你的 Supabase 项目中：

1. **Service Role Key** 用于后端服务器操作
2. **Anon Key** 用于前端客户端连接
3. **RLS 策略** 已正确启用和配置

## 数据迁移

### 从现有 IndexedDB 数据迁移

如果需要从现有的本地 IndexedDB 数据迁移到 Supabase：

1. 导出现有项目数据
2. 创建用户账户
3. 使用管理员权限批量导入历史数据

### 数据备份

定期备份重要数据：

```sql
-- 备份用户配置
COPY ai_image_editor_user_profiles TO '/tmp/ai_image_editor_user_profiles_backup.csv' CSV HEADER;

-- 备份使用统计
COPY ai_image_editor_usage_stats TO '/tmp/ai_image_editor_usage_stats_backup.csv' CSV HEADER;
```

## 性能优化

### 1. 索引优化

所有重要查询字段都已创建索引：

- 用户ID 索引
- 日期范围索引
- 操作类型索引

### 2. 查询优化

- 使用分页查询避免大量数据传输
- 利用数据库函数进行聚合计算
- 定期清理过期日志数据

### 3. 监控建议

- 监控数据库连接数
- 监控慢查询
- 监控存储使用量
- 设置适当的备份策略

## 故障排除

### 常见问题

1. **RLS 策略问题**：检查用户是否有正确的角色权限
2. **权限错误**：确认 Service Role Key 配置正确
3. **连接失败**：检查网络和 Supabase 项目状态
4. **数据不同步**：检查时区设置和时间戳字段

### 调试方法

```sql
-- 检查用户权限
SELECT * FROM ai_image_editor_user_profiles WHERE id = auth.uid();

-- 检查 RLS 策略
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies WHERE schemaname = 'public';

-- 检查数据库连接
SELECT current_user, session_user, current_database();
```