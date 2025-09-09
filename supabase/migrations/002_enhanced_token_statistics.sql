-- Enhanced Token Statistics Migration
-- 增强的 Token 统计功能迁移脚本

-- 1. 删除现有数据 (按要求清空历史数据)
TRUNCATE TABLE ai_image_editor_usage_stats CASCADE;
TRUNCATE TABLE ai_image_editor_action_logs CASCADE;

-- 2. 创建 API 提供商定价表
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

-- 3. 重构使用统计表结构
-- 先备份现有表结构（如果需要的话）
-- CREATE TABLE ai_image_editor_usage_stats_backup AS SELECT * FROM ai_image_editor_usage_stats;

-- 删除现有表并重新创建
DROP TABLE IF EXISTS ai_image_editor_usage_stats CASCADE;

CREATE TABLE ai_image_editor_usage_stats (
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
    
    -- 价格信息 (USD，精确到小数点后6位)
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

-- 4. 插入初始定价数据
INSERT INTO ai_image_editor_pricing 
(provider, model_name, input_price_per_1m_tokens, output_price_per_1m_tokens) 
VALUES 
    -- Google Gemini 定价 (每百万 tokens)
    ('google', 'gemini-2.5-flash-image-preview', 0.30, 30.00),
    ('google', 'gemini-2.5-flash', 0.30, 30.00),
    ('google', 'gemini-1.5-flash', 0.075, 0.30),
    ('google', 'gemini-1.5-pro', 1.25, 3.75),
    
    -- OpenAI 预留定价 (未来使用)
    ('openai', 'dall-e-3', 40.00, 40.00), -- 假设价格，实际需要调整
    ('openai', 'dall-e-2', 20.00, 20.00),
    
    -- Anthropic 预留定价 (未来使用)  
    ('anthropic', 'claude-3-opus', 15.00, 75.00),
    ('anthropic', 'claude-3-sonnet', 3.00, 15.00);

-- 5. 创建索引以优化查询性能
CREATE INDEX idx_usage_stats_user_date ON ai_image_editor_usage_stats(user_id, date);
CREATE INDEX idx_usage_stats_provider_model ON ai_image_editor_usage_stats(provider, model_name);
CREATE INDEX idx_usage_stats_date ON ai_image_editor_usage_stats(date);
CREATE INDEX idx_usage_stats_cost ON ai_image_editor_usage_stats(total_cost_usd);

CREATE INDEX idx_pricing_active ON ai_image_editor_pricing(provider, model_name, is_active);

-- 6. 创建更新时间戳的触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_usage_stats_updated_at 
    BEFORE UPDATE ON ai_image_editor_usage_stats 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 7. 创建用于增量更新统计的存储过程
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
$$ LANGUAGE plpgsql;

-- 8. 创建获取当前定价的函数
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

-- 9. 添加注释说明
COMMENT ON TABLE ai_image_editor_usage_stats IS '用户使用统计表 - 增强版，支持详细的 token 和成本统计';
COMMENT ON TABLE ai_image_editor_pricing IS 'API 提供商定价表';

COMMENT ON COLUMN ai_image_editor_usage_stats.input_tokens IS '输入 tokens 数量';
COMMENT ON COLUMN ai_image_editor_usage_stats.output_tokens IS '输出 tokens 数量 (生成的图像)';
COMMENT ON COLUMN ai_image_editor_usage_stats.input_cost_usd IS '输入成本 (美元)';
COMMENT ON COLUMN ai_image_editor_usage_stats.output_cost_usd IS '输出成本 (美元)';
COMMENT ON COLUMN ai_image_editor_usage_stats.provider IS 'API 提供商 (google, openai, anthropic)';
COMMENT ON COLUMN ai_image_editor_usage_stats.model_name IS '使用的模型名称';

-- 完成迁移
SELECT 'Enhanced token statistics migration completed successfully!' as status;