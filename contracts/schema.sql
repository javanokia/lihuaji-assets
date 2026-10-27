-- ==============================================================================
-- 梨花季·译绣 (Lihuaji) - 传统与馆藏纹样数据库标准 DDL
-- 兼容: PostgreSQL 14+, SQLite 3.38+, MySQL 8.0+
-- ==============================================================================

CREATE TABLE IF NOT EXISTS patterns (
    -- 核心标识
    id VARCHAR(64) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    original_title VARCHAR(255),
    subtitle VARCHAR(255),

    -- 分类与文化归属
    region VARCHAR(64) NOT NULL DEFAULT '中原',
    collection VARCHAR(32) NOT NULL DEFAULT 'basic', -- 'basic' (简易取样) | 'archive' (复杂参考)
    style_family VARCHAR(64),                        -- 如意云、流云、团云、连续云、云气纹等
    tags JSON,                                       -- 题材标签 (花草藤蔓, 鸟兽鱼虫, 几何团花, 边饰等)
    culture JSON,                                    -- 文化朝代与地域描述数组
    period VARCHAR(128),                             -- 朝代/制作年代 (如 1300s, 清代, 西汉)
    technique VARCHAR(255),                          -- 工艺材料与织绣技法

    -- 媒体资源与图层
    image VARCHAR(255) NOT NULL,                     -- 高清 WebP 本地相对路径
    thumbnail VARCHAR(255) NOT NULL,                 -- 缩略图 WebP 本地相对路径
    image_sha256 VARCHAR(64),                        -- 高清图 SHA256 校验哈希
    thumbnail_sha256 VARCHAR(64),                    -- 缩略图 SHA256 校验哈希
    width INTEGER,                                   -- 图像像素宽度
    height INTEGER,                                  -- 图像像素高度

    -- 来源与版权许可
    source_platform VARCHAR(64) NOT NULL,            -- 来源平台 (The Met, 克利夫兰艺术博物馆, 梨花季馆藏等)
    source_name VARCHAR(255) NOT NULL,               -- 来源机构名称
    source_url TEXT,                                 -- 官方馆藏网址
    source_api_url TEXT,                             -- 官方开放 API 数据接口
    author VARCHAR(255) DEFAULT '馆方未注明',          -- 作者或织绣艺人署名
    license VARCHAR(64) NOT NULL DEFAULT 'CC0',      -- 授权许可 (CC0, Public Domain 等)
    license_url TEXT,                                -- 许可条款网址
    accession VARCHAR(128),                          -- 馆藏文物登记编号
    museum_object_id VARCHAR(64),                    -- 馆方数据库内部主键
    rights_verified_at VARCHAR(64),                  -- 授权状态核验日期 (YYYY-MM-DD)

    -- 策展与检索辅助
    description TEXT,                                -- 纹样详细介绍与策展说明
    curation_note TEXT,                              -- 刺绣初学取样建议
    label_note TEXT,                                 -- 分类与非遗边界说明
    featured BOOLEAN NOT NULL DEFAULT FALSE,         -- 是否为精选推荐
    sort_weight INTEGER NOT NULL DEFAULT 0,          -- 排序权重 (降序优先)
    search_terms TEXT,                               -- 全文检索多别名索引串

    -- 审计字段
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 常用高频索引
CREATE INDEX IF NOT EXISTS idx_patterns_region ON patterns (region);
CREATE INDEX IF NOT EXISTS idx_patterns_collection ON patterns (collection);
CREATE INDEX IF NOT EXISTS idx_patterns_platform ON patterns (source_platform);
CREATE INDEX IF NOT EXISTS idx_patterns_featured_weight ON patterns (featured, sort_weight DESC);
