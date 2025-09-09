-- =====================================================
-- Nano Banana AI Image Editor - 用户管理系统数据库初始化
-- =====================================================

-- 1. 用户配置表 (扩展 Supabase 的 auth.users)
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 创建用户名索引
CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON user_profiles(username);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_status ON user_profiles(status);

-- 2. 使用统计表 (按日汇总)
CREATE TABLE IF NOT EXISTS usage_stats (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    date DATE NOT NULL,
    token_consumed INTEGER DEFAULT 0 CHECK (token_consumed >= 0),
    request_count INTEGER DEFAULT 0 CHECK (request_count >= 0),
    generation_count INTEGER DEFAULT 0 CHECK (generation_count >= 0),
    edit_count INTEGER DEFAULT 0 CHECK (edit_count >= 0),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    -- 确保每个用户每天只有一条记录
    UNIQUE(user_id, date)
);

-- 创建使用统计索引
CREATE INDEX IF NOT EXISTS idx_usage_stats_user_date ON usage_stats(user_id, date);
CREATE INDEX IF NOT EXISTS idx_usage_stats_date ON usage_stats(date);

-- 3. 行为日志表
CREATE TABLE IF NOT EXISTS action_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    action TEXT NOT NULL,
    details JSONB DEFAULT '{}',
    session_id TEXT,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 创建行为日志索引
CREATE INDEX IF NOT EXISTS idx_action_logs_user_id ON action_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_action_logs_action ON action_logs(action);
CREATE INDEX IF NOT EXISTS idx_action_logs_session ON action_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_action_logs_created_at ON action_logs(created_at);

-- 4. 聊天历史表
CREATE TABLE IF NOT EXISTS chat_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    project_id TEXT,
    prompt TEXT NOT NULL,
    response TEXT DEFAULT '',
    type TEXT NOT NULL CHECK (type IN ('generate', 'edit')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 创建聊天历史索引
CREATE INDEX IF NOT EXISTS idx_chat_history_user_id ON chat_history(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_history_project ON chat_history(project_id);
CREATE INDEX IF NOT EXISTS idx_chat_history_type ON chat_history(type);
CREATE INDEX IF NOT EXISTS idx_chat_history_created_at ON chat_history(created_at);

-- 5. 系统配置表 (管理员配置)
CREATE TABLE IF NOT EXISTS system_config (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    key TEXT UNIQUE NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    updated_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 创建系统配置索引
CREATE INDEX IF NOT EXISTS idx_system_config_key ON system_config(key);

-- =====================================================
-- 行级安全策略 (Row Level Security)
-- =====================================================

-- 启用 RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;

-- ===== 用户配置表策略 =====

-- 用户可以查看和更新自己的配置
CREATE POLICY "users_can_view_own_profile" ON user_profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "users_can_update_own_profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = id);

-- 管理员可以查看和管理所有用户
CREATE POLICY "admins_can_view_all_profiles" ON user_profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "admins_can_manage_all_profiles" ON user_profiles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ===== 使用统计表策略 =====

-- 用户可以查看自己的使用统计
CREATE POLICY "users_can_view_own_usage_stats" ON usage_stats
    FOR SELECT USING (auth.uid() = user_id);

-- 管理员可以查看所有使用统计
CREATE POLICY "admins_can_view_all_usage_stats" ON usage_stats
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- 系统可以插入和更新使用统计 (服务端使用)
CREATE POLICY "service_can_manage_usage_stats" ON usage_stats
    FOR ALL USING (true);

-- ===== 行为日志表策略 =====

-- 用户可以查看自己的行为日志
CREATE POLICY "users_can_view_own_action_logs" ON action_logs
    FOR SELECT USING (auth.uid() = user_id);

-- 管理员可以查看所有行为日志
CREATE POLICY "admins_can_view_all_action_logs" ON action_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- 系统可以插入行为日志 (服务端使用)
CREATE POLICY "service_can_insert_action_logs" ON action_logs
    FOR INSERT WITH CHECK (true);

-- ===== 聊天历史表策略 =====

-- 用户可以查看和管理自己的聊天历史
CREATE POLICY "users_can_manage_own_chat_history" ON chat_history
    FOR ALL USING (auth.uid() = user_id);

-- 管理员可以查看所有聊天历史
CREATE POLICY "admins_can_view_all_chat_history" ON chat_history
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ===== 系统配置表策略 =====

-- 只有管理员可以查看和管理系统配置
CREATE POLICY "admins_only_system_config" ON system_config
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- =====================================================
-- 数据库函数
-- =====================================================

-- 1. 增量更新使用统计的函数
CREATE OR REPLACE FUNCTION increment_usage_stats(
    p_user_id UUID,
    p_date DATE,
    p_token_consumed INTEGER DEFAULT 0,
    p_action_type TEXT DEFAULT 'generate'
) RETURNS VOID AS $$
BEGIN
    INSERT INTO usage_stats (user_id, date, token_consumed, request_count, generation_count, edit_count)
    VALUES (
        p_user_id, 
        p_date, 
        p_token_consumed, 
        1,
        CASE WHEN p_action_type = 'generate' THEN 1 ELSE 0 END,
        CASE WHEN p_action_type = 'edit' THEN 1 ELSE 0 END
    )
    ON CONFLICT (user_id, date)
    DO UPDATE SET
        token_consumed = usage_stats.token_consumed + p_token_consumed,
        request_count = usage_stats.request_count + 1,
        generation_count = usage_stats.generation_count + 
            (CASE WHEN p_action_type = 'generate' THEN 1 ELSE 0 END),
        edit_count = usage_stats.edit_count + 
            (CASE WHEN p_action_type = 'edit' THEN 1 ELSE 0 END),
        updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. 获取用户统计概览的函数
CREATE OR REPLACE FUNCTION get_user_stats_overview(p_user_id UUID, p_days INTEGER DEFAULT 30)
RETURNS TABLE (
    total_tokens BIGINT,
    total_requests BIGINT,
    total_generations BIGINT,
    total_edits BIGINT,
    avg_daily_tokens NUMERIC,
    most_active_day DATE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(token_consumed), 0) as total_tokens,
        COALESCE(SUM(request_count), 0) as total_requests,
        COALESCE(SUM(generation_count), 0) as total_generations,
        COALESCE(SUM(edit_count), 0) as total_edits,
        COALESCE(AVG(token_consumed), 0) as avg_daily_tokens,
        (
            SELECT date 
            FROM usage_stats 
            WHERE user_id = p_user_id 
                AND date >= (CURRENT_DATE - p_days)
            ORDER BY (token_consumed + request_count) DESC 
            LIMIT 1
        ) as most_active_day
    FROM usage_stats 
    WHERE user_id = p_user_id 
        AND date >= (CURRENT_DATE - p_days);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. 清理旧日志的函数
CREATE OR REPLACE FUNCTION cleanup_old_logs(p_days INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- 删除超过指定天数的行为日志
    DELETE FROM action_logs 
    WHERE created_at < (now() - INTERVAL '1 day' * p_days);
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 触发器
-- =====================================================

-- 1. 更新 updated_at 字段的触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 为需要的表创建触发器
CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_usage_stats_updated_at
    BEFORE UPDATE ON usage_stats
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_system_config_updated_at
    BEFORE UPDATE ON system_config
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 初始数据
-- =====================================================

-- 插入默认系统配置
INSERT INTO system_config (key, value, description) VALUES
    ('max_daily_tokens', '10000', '用户每日最大 Token 限制'),
    ('max_daily_requests', '100', '用户每日最大请求次数'),
    ('log_retention_days', '90', '日志保留天数'),
    ('notification_enabled', 'true', '是否启用通知功能'),
    ('maintenance_mode', 'false', '维护模式开关')
ON CONFLICT (key) DO NOTHING;

-- =====================================================
-- 权限设置
-- =====================================================

-- 为认证用户授予必要权限
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- 为匿名用户授予有限权限
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT ON user_profiles TO anon;

COMMENT ON TABLE user_profiles IS '用户配置表 - 扩展 Supabase Auth 用户信息';
COMMENT ON TABLE usage_stats IS '使用统计表 - 按用户和日期汇总的使用数据';
COMMENT ON TABLE action_logs IS '行为日志表 - 记录用户的所有操作行为';
COMMENT ON TABLE chat_history IS '聊天历史表 - 记录 AI 对话历史';
COMMENT ON TABLE system_config IS '系统配置表 - 存储系统级别的配置信息';

-- 完成
SELECT 'Nano Banana AI Image Editor 数据库初始化完成!' as message;