-- =====================================================
-- Nano Banana AI Image Editor - 完整数据库初始化脚本
-- 合并版本：包含用户管理系统 + 增强 Token 统计功能
-- =====================================================

-- =====================================================
-- 1. 用户配置表 (扩展 Supabase 的 auth.users)
-- =====================================================
CREATE TABLE IF NOT EXISTS ai_image_editor_user_profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 用户配置表索引
CREATE INDEX IF NOT EXISTS idx_ai_image_editor_user_profiles_username ON ai_image_editor_user_profiles(username);
CREATE INDEX IF NOT EXISTS idx_ai_image_editor_user_profiles_role ON ai_image_editor_user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_ai_image_editor_user_profiles_status ON ai_image_editor_user_profiles(status);

-- =====================================================
-- 2. API 提供商定价表
-- =====================================================
CREATE TABLE IF NOT EXISTS ai_image_editor_pricing (
    id BIGSERIAL PRIMARY KEY,
    provider VARCHAR(50) NOT NULL,
    model_name VARCHAR(100) NOT NULL,

    -- 每百万 token 的价格 (USD)
    input_price_per_1m_tokens DECIMAL(10, 4) NOT NULL,
    output_price_per_1m_tokens DECIMAL(10, 4) NOT NULL,

    -- 生效时间
    effective_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    effective_until TIMESTAMPTZ,

    is_active BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(provider, model_name, effective_from)
);

-- 定价表索引
CREATE INDEX IF NOT EXISTS idx_pricing_active ON ai_image_editor_pricing(provider, model_name, is_active);

-- =====================================================
-- 3. 使用统计表 (增强版，支持详细的 token 和成本统计)
-- =====================================================
CREATE TABLE IF NOT EXISTS ai_image_editor_usage_stats (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,

    -- API 提供商信息
    provider VARCHAR(50) NOT NULL DEFAULT 'google',
    model_name VARCHAR(100) NOT NULL DEFAULT 'gemini-2.5-flash-image-preview',

    -- Token 使用详情 (拆分 input 和 output)
    input_tokens BIGINT DEFAULT 0,
    output_tokens BIGINT DEFAULT 0,
    total_tokens BIGINT GENERATED ALWAYS AS (input_tokens + output_tokens) STORED,

    -- 价格信息 (USD，精确到小数点后8位)
    input_cost_usd DECIMAL(12, 8) DEFAULT 0,
    output_cost_usd DECIMAL(12, 8) DEFAULT 0,
    total_cost_usd DECIMAL(12, 8) GENERATED ALWAYS AS (input_cost_usd + output_cost_usd) STORED,

    -- 操作统计
    generation_count INTEGER DEFAULT 0,
    edit_count INTEGER DEFAULT 0,
    request_count INTEGER DEFAULT 0,

    -- 时间戳
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- 唯一约束：每个用户每天每个提供商每个模型只有一条记录
    CONSTRAINT unique_user_date_provider_model UNIQUE(user_id, date, provider, model_name)
);

-- 使用统计表索引
CREATE INDEX IF NOT EXISTS idx_usage_stats_user_date ON ai_image_editor_usage_stats(user_id, date);
CREATE INDEX IF NOT EXISTS idx_usage_stats_provider_model ON ai_image_editor_usage_stats(provider, model_name);
CREATE INDEX IF NOT EXISTS idx_usage_stats_date ON ai_image_editor_usage_stats(date);
CREATE INDEX IF NOT EXISTS idx_usage_stats_cost ON ai_image_editor_usage_stats(total_cost_usd);

-- =====================================================
-- 4. 行为日志表
-- =====================================================
CREATE TABLE IF NOT EXISTS ai_image_editor_action_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    action TEXT NOT NULL,
    details JSONB DEFAULT '{}',
    session_id TEXT,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 行为日志表索引
CREATE INDEX IF NOT EXISTS idx_ai_image_editor_action_logs_user_id ON ai_image_editor_action_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_image_editor_action_logs_action ON ai_image_editor_action_logs(action);
CREATE INDEX IF NOT EXISTS idx_ai_image_editor_action_logs_session ON ai_image_editor_action_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_ai_image_editor_action_logs_created_at ON ai_image_editor_action_logs(created_at);

-- =====================================================
-- 5. 聊天历史表
-- =====================================================
CREATE TABLE IF NOT EXISTS ai_image_editor_chat_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    project_id TEXT,
    prompt TEXT NOT NULL,
    response TEXT DEFAULT '',
    type TEXT NOT NULL CHECK (type IN ('generate', 'edit')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 聊天历史表索引
CREATE INDEX IF NOT EXISTS idx_ai_image_editor_chat_history_user_id ON ai_image_editor_chat_history(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_image_editor_chat_history_project ON ai_image_editor_chat_history(project_id);
CREATE INDEX IF NOT EXISTS idx_ai_image_editor_chat_history_type ON ai_image_editor_chat_history(type);
CREATE INDEX IF NOT EXISTS idx_ai_image_editor_chat_history_created_at ON ai_image_editor_chat_history(created_at);

-- =====================================================
-- 6. 系统配置表 (管理员配置)
-- =====================================================
CREATE TABLE IF NOT EXISTS ai_image_editor_system_config (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    key TEXT UNIQUE NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    updated_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 系统配置表索引
CREATE INDEX IF NOT EXISTS idx_ai_image_editor_system_config_key ON ai_image_editor_system_config(key);

-- =====================================================
-- 辅助函数
-- =====================================================

-- 检查用户是否为管理员的函数
CREATE OR REPLACE FUNCTION is_admin(user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM ai_image_editor_user_profiles
        WHERE id = user_id AND role = 'admin' AND status = 'active'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 更新 updated_at 字段的触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 数据库函数
-- =====================================================

-- 1. 增量更新使用统计的函数 (增强版，支持详细的 token 和成本统计)
CREATE OR REPLACE FUNCTION increment_usage_stats_v2(
    p_user_id UUID,
    p_date DATE,
    p_provider VARCHAR(50),
    p_model_name VARCHAR(100),
    p_input_tokens INTEGER,
    p_output_tokens INTEGER,
    p_input_cost DECIMAL(12, 8),
    p_output_cost DECIMAL(12, 8),
    p_action_type VARCHAR(20)
) RETURNS VOID AS $$
BEGIN
    INSERT INTO ai_image_editor_usage_stats (
        user_id, date, provider, model_name,
        input_tokens, output_tokens,
        input_cost_usd, output_cost_usd,
        generation_count, edit_count, request_count
    ) VALUES (
        p_user_id, p_date, p_provider, p_model_name,
        p_input_tokens, p_output_tokens,
        p_input_cost, p_output_cost,
        CASE WHEN p_action_type = 'generate' THEN 1 ELSE 0 END,
        CASE WHEN p_action_type = 'edit' THEN 1 ELSE 0 END,
        1
    )
    ON CONFLICT (user_id, date, provider, model_name)
    DO UPDATE SET
        input_tokens = ai_image_editor_usage_stats.input_tokens + p_input_tokens,
        output_tokens = ai_image_editor_usage_stats.output_tokens + p_output_tokens,
        input_cost_usd = ai_image_editor_usage_stats.input_cost_usd + p_input_cost,
        output_cost_usd = ai_image_editor_usage_stats.output_cost_usd + p_output_cost,
        generation_count = ai_image_editor_usage_stats.generation_count +
            CASE WHEN p_action_type = 'generate' THEN 1 ELSE 0 END,
        edit_count = ai_image_editor_usage_stats.edit_count +
            CASE WHEN p_action_type = 'edit' THEN 1 ELSE 0 END,
        request_count = ai_image_editor_usage_stats.request_count + 1,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. 获取当前定价的函数
CREATE OR REPLACE FUNCTION get_current_pricing(
    p_provider VARCHAR(50),
    p_model_name VARCHAR(100)
) RETURNS TABLE (
    input_price DECIMAL(10, 4),
    output_price DECIMAL(10, 4)
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        input_price_per_1m_tokens,
        output_price_per_1m_tokens
    FROM ai_image_editor_pricing
    WHERE provider = p_provider
      AND model_name = p_model_name
      AND is_active = TRUE
      AND effective_from <= NOW()
      AND (effective_until IS NULL OR effective_until > NOW())
    ORDER BY effective_from DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- 3. 获取用户统计概览的函数 (适配增强版表结构)
CREATE OR REPLACE FUNCTION get_user_stats_overview(p_user_id UUID, p_days INTEGER DEFAULT 30)
RETURNS TABLE (
    total_input_tokens BIGINT,
    total_output_tokens BIGINT,
    total_tokens BIGINT,
    total_cost_usd DECIMAL,
    total_requests BIGINT,
    total_generations BIGINT,
    total_edits BIGINT,
    avg_daily_cost NUMERIC,
    most_active_day DATE
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(SUM(s.input_tokens), 0)::BIGINT as total_input_tokens,
        COALESCE(SUM(s.output_tokens), 0)::BIGINT as total_output_tokens,
        COALESCE(SUM(s.input_tokens + s.output_tokens), 0)::BIGINT as total_tokens,
        COALESCE(SUM(s.input_cost_usd + s.output_cost_usd), 0) as total_cost_usd,
        COALESCE(SUM(s.request_count), 0)::BIGINT as total_requests,
        COALESCE(SUM(s.generation_count), 0)::BIGINT as total_generations,
        COALESCE(SUM(s.edit_count), 0)::BIGINT as total_edits,
        COALESCE(AVG(s.input_cost_usd + s.output_cost_usd), 0) as avg_daily_cost,
        (
            SELECT s2.date
            FROM ai_image_editor_usage_stats s2
            WHERE s2.user_id = p_user_id
                AND s2.date >= (CURRENT_DATE - p_days)
            ORDER BY (s2.input_cost_usd + s2.output_cost_usd + s2.request_count) DESC
            LIMIT 1
        ) as most_active_day
    FROM ai_image_editor_usage_stats s
    WHERE s.user_id = p_user_id
        AND s.date >= (CURRENT_DATE - p_days);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. 清理旧日志的函数
CREATE OR REPLACE FUNCTION cleanup_old_logs(p_days INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM ai_image_editor_action_logs
    WHERE created_at < (now() - INTERVAL '1 day' * p_days);

    GET DIAGNOSTICS deleted_count = ROW_COUNT;

    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 触发器
-- =====================================================

-- 用户配置表更新时间触发器
DROP TRIGGER IF EXISTS update_ai_image_editor_user_profiles_updated_at ON ai_image_editor_user_profiles;
CREATE TRIGGER update_ai_image_editor_user_profiles_updated_at
    BEFORE UPDATE ON ai_image_editor_user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 使用统计表更新时间触发器
DROP TRIGGER IF EXISTS update_usage_stats_updated_at ON ai_image_editor_usage_stats;
CREATE TRIGGER update_usage_stats_updated_at
    BEFORE UPDATE ON ai_image_editor_usage_stats
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 系统配置表更新时间触发器
DROP TRIGGER IF EXISTS update_ai_image_editor_system_config_updated_at ON ai_image_editor_system_config;
CREATE TRIGGER update_ai_image_editor_system_config_updated_at
    BEFORE UPDATE ON ai_image_editor_system_config
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 初始数据
-- =====================================================

-- 插入默认系统配置
INSERT INTO ai_image_editor_system_config (key, value, description) VALUES
    ('max_daily_tokens', '10000', '用户每日最大 Token 限制'),
    ('max_daily_requests', '100', '用户每日最大请求次数'),
    ('log_retention_days', '90', '日志保留天数'),
    ('notification_enabled', 'true', '是否启用通知功能'),
    ('maintenance_mode', 'false', '维护模式开关')
ON CONFLICT (key) DO NOTHING;

-- 插入初始定价数据
INSERT INTO ai_image_editor_pricing
(provider, model_name, input_price_per_1m_tokens, output_price_per_1m_tokens)
VALUES
    -- Google Gemini 定价 (每百万 tokens)
    ('google', 'gemini-2.5-flash-image-preview', 0.30, 30.00),
    ('google', 'gemini-2.5-flash', 0.30, 30.00),
    ('google', 'gemini-1.5-flash', 0.075, 0.30),
    ('google', 'gemini-1.5-pro', 1.25, 3.75),

    -- OpenAI 预留定价 (未来使用)
    ('openai', 'dall-e-3', 40.00, 40.00),
    ('openai', 'dall-e-2', 20.00, 20.00),

    -- Anthropic 预留定价 (未来使用)
    ('anthropic', 'claude-3-opus', 15.00, 75.00),
    ('anthropic', 'claude-3-sonnet', 3.00, 15.00)
ON CONFLICT (provider, model_name, effective_from) DO NOTHING;

-- =====================================================
-- 行级安全策略 (Row Level Security)
-- =====================================================

-- 启用 RLS
ALTER TABLE ai_image_editor_user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_image_editor_usage_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_image_editor_action_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_image_editor_chat_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_image_editor_system_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_image_editor_pricing ENABLE ROW LEVEL SECURITY;

-- ===== 用户配置表策略 =====

-- 用户可以查看和更新自己的配置
CREATE POLICY "users_can_view_own_profile" ON ai_image_editor_user_profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "users_can_update_own_profile" ON ai_image_editor_user_profiles
    FOR UPDATE USING (auth.uid() = id);

-- 管理员可以查看所有用户
CREATE POLICY "admins_can_view_all_profiles" ON ai_image_editor_user_profiles
    FOR SELECT USING (is_admin());

-- 管理员可以管理所有用户
CREATE POLICY "admins_can_manage_all_profiles" ON ai_image_editor_user_profiles
    FOR ALL USING (is_admin());

-- 允许新用户注册时插入配置信息
CREATE POLICY "users_can_insert_own_profile" ON ai_image_editor_user_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- ===== 使用统计表策略 =====

-- 用户可以查看自己的使用统计
CREATE POLICY "users_can_view_own_usage_stats" ON ai_image_editor_usage_stats
    FOR SELECT USING (auth.uid() = user_id);

-- 管理员可以查看所有使用统计
CREATE POLICY "admins_can_view_all_usage_stats" ON ai_image_editor_usage_stats
    FOR SELECT USING (is_admin());

-- 系统可以插入和更新使用统计 (服务端使用)
CREATE POLICY "service_can_manage_usage_stats" ON ai_image_editor_usage_stats
    FOR ALL USING (true);

-- ===== 行为日志表策略 =====

-- 用户可以查看自己的行为日志
CREATE POLICY "users_can_view_own_action_logs" ON ai_image_editor_action_logs
    FOR SELECT USING (auth.uid() = user_id);

-- 管理员可以查看所有行为日志
CREATE POLICY "admins_can_view_all_action_logs" ON ai_image_editor_action_logs
    FOR SELECT USING (is_admin());

-- 系统可以插入行为日志 (服务端使用)
CREATE POLICY "service_can_insert_action_logs" ON ai_image_editor_action_logs
    FOR INSERT WITH CHECK (true);

-- ===== 聊天历史表策略 =====

-- 用户可以查看和管理自己的聊天历史
CREATE POLICY "users_can_manage_own_chat_history" ON ai_image_editor_chat_history
    FOR ALL USING (auth.uid() = user_id);

-- 管理员可以查看所有聊天历史
CREATE POLICY "admins_can_view_all_chat_history" ON ai_image_editor_chat_history
    FOR SELECT USING (is_admin());

-- ===== 系统配置表策略 =====

-- 只有管理员可以查看和管理系统配置
CREATE POLICY "admins_only_system_config" ON ai_image_editor_system_config
    FOR ALL USING (is_admin());

-- ===== 定价表策略 =====

-- 所有认证用户可以查看定价信息
CREATE POLICY "authenticated_can_view_pricing" ON ai_image_editor_pricing
    FOR SELECT USING (auth.role() = 'authenticated');

-- 只有管理员可以管理定价
CREATE POLICY "admins_can_manage_pricing" ON ai_image_editor_pricing
    FOR ALL USING (is_admin());

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
GRANT SELECT ON ai_image_editor_user_profiles TO anon;
GRANT SELECT ON ai_image_editor_pricing TO anon;

-- 为服务角色授予完全权限 (绕过 RLS)
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- =====================================================
-- 表注释
-- =====================================================

COMMENT ON TABLE ai_image_editor_user_profiles IS '用户配置表 - 扩展 Supabase Auth 用户信息';
COMMENT ON TABLE ai_image_editor_pricing IS 'API 提供商定价表';
COMMENT ON TABLE ai_image_editor_usage_stats IS '用户使用统计表 - 增强版，支持详细的 token 和成本统计';
COMMENT ON TABLE ai_image_editor_action_logs IS '行为日志表 - 记录用户的所有操作行为';
COMMENT ON TABLE ai_image_editor_chat_history IS '聊天历史表 - 记录 AI 对话历史';
COMMENT ON TABLE ai_image_editor_system_config IS '系统配置表 - 存储系统级别的配置信息';

COMMENT ON COLUMN ai_image_editor_usage_stats.input_tokens IS '输入 tokens 数量';
COMMENT ON COLUMN ai_image_editor_usage_stats.output_tokens IS '输出 tokens 数量 (生成的图像)';
COMMENT ON COLUMN ai_image_editor_usage_stats.input_cost_usd IS '输入成本 (美元)';
COMMENT ON COLUMN ai_image_editor_usage_stats.output_cost_usd IS '输出成本 (美元)';
COMMENT ON COLUMN ai_image_editor_usage_stats.provider IS 'API 提供商 (google, openai, anthropic)';
COMMENT ON COLUMN ai_image_editor_usage_stats.model_name IS '使用的模型名称';

-- =====================================================
-- 完成
-- =====================================================
SELECT 'Nano Banana AI Image Editor 数据库初始化完成!' as message;
