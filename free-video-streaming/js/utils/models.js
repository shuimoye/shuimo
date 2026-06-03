/**
 * 数据模型定义
 * 定义应用程序中使用的所有数据结构
 */

/**
 * 视频信息模型
 * @typedef {Object} VideoInfo
 * @property {string} id - 视频唯一标识
 * @property {string} title - 视频标题
 * @property {string} cover - 封面图片URL
 * @property {string} description - 描述信息
 * @property {string} year - 年份
 * @property {string} type - 类型：电影/电视剧/动漫
 * @property {Array<VideoSource>} sources - 视频源列表
 */
const VideoInfoSchema = {
    id: { type: 'string', required: true },
    title: { type: 'string', required: true },
    cover: { type: 'string', required: false },
    description: { type: 'string', required: false },
    year: { type: 'string', required: false },
    type: { type: 'string', required: false, enum: ['电影', '电视剧', '动漫'] },
    sources: { type: 'array', required: false }
};

/**
 * 视频源模型
 * @typedef {Object} VideoSource
 * @property {string} sourceId - 数据源ID
 * @property {string} url - 播放页面URL
 * @property {Array<Episode>} episodes - 剧集列表
 */
const VideoSourceSchema = {
    sourceId: { type: 'string', required: true },
    url: { type: 'string', required: true },
    episodes: { type: 'array', required: false }
};

/**
 * 剧集模型
 * @typedef {Object} Episode
 * @property {string} name - 剧集名称
 * @property {string} url - 播放地址
 */
const EpisodeSchema = {
    name: { type: 'string', required: true },
    url: { type: 'string', required: true }
};

/**
 * 搜索结果模型
 * @typedef {Object} SearchResult
 * @property {string} keyword - 搜索关键词
 * @property {Array<VideoInfo>} results - 搜索结果列表
 * @property {number} total - 总结果数
 * @property {number} page - 当前页码
 * @property {boolean} hasMore - 是否有更多结果
 * @property {Array<SourceStatus>} sources - 数据源状态
 */
const SearchResultSchema = {
    keyword: { type: 'string', required: true },
    results: { type: 'array', required: true },
    total: { type: 'number', required: true },
    page: { type: 'number', required: true },
    hasMore: { type: 'boolean', required: true },
    sources: { type: 'array', required: false }
};

/**
 * 数据源状态模型
 * @typedef {Object} SourceStatus
 * @property {string} sourceId - 数据源ID
 * @property {string} status - 状态：success/error/loading
 * @property {number} count - 该源结果数
 */
const SourceStatusSchema = {
    sourceId: { type: 'string', required: true },
    status: { type: 'string', required: true, enum: ['success', 'error', 'loading'] },
    count: { type: 'number', required: true }
};

/**
 * 播放状态模型
 * @typedef {Object} PlayState
 * @property {string} videoId - 当前播放视频ID
 * @property {string} url - 当前播放URL
 * @property {number} currentTime - 当前播放时间
 * @property {number} duration - 总时长
 * @property {boolean} playing - 是否正在播放
 * @property {number} volume - 音量 0-1
 * @property {string} quality - 当前清晰度
 * @property {Array<string>} qualities - 可用清晰度列表
 * @property {string} error - 错误信息
 */
const PlayStateSchema = {
    videoId: { type: 'string', required: false },
    url: { type: 'string', required: false },
    currentTime: { type: 'number', required: false, default: 0 },
    duration: { type: 'number', required: false, default: 0 },
    playing: { type: 'boolean', required: false, default: false },
    volume: { type: 'number', required: false, default: 1, min: 0, max: 1 },
    quality: { type: 'string', required: false },
    qualities: { type: 'array', required: false },
    error: { type: 'string', required: false }
};

/**
 * 数据源配置模型
 * @typedef {Object} SourceConfig
 * @property {string} id - 数据源ID
 * @property {string} name - 数据源名称
 * @property {string} type - 类型：crawl/api
 * @property {string} url - 数据源URL
 * @property {string} searchPath - 搜索路径
 * @property {string} apiKey - API密钥
 * @property {boolean} enabled - 是否启用
 */
const SourceConfigSchema = {
    id: { type: 'string', required: true },
    name: { type: 'string', required: true },
    type: { type: 'string', required: true, enum: ['crawl', 'api'] },
    url: { type: 'string', required: true },
    searchPath: { type: 'string', required: false },
    apiKey: { type: 'string', required: false },
    enabled: { type: 'boolean', required: true, default: true }
};

/**
 * 创建视频信息对象
 * @param {Object} data - 初始数据
 * @returns {VideoInfo} 视频信息对象
 */
function createVideoInfo(data = {}) {
    return {
        id: data.id || '',
        title: data.title || '',
        cover: data.cover || '',
        description: data.description || '',
        year: data.year || '',
        type: data.type || '电影',
        sources: data.sources || []
    };
}

/**
 * 创建视频源对象
 * @param {Object} data - 初始数据
 * @returns {VideoSource} 视频源对象
 */
function createVideoSource(data = {}) {
    return {
        sourceId: data.sourceId || '',
        url: data.url || '',
        episodes: data.episodes || []
    };
}

/**
 * 创建剧集对象
 * @param {Object} data - 初始数据
 * @returns {Episode} 剧集对象
 */
function createEpisode(data = {}) {
    return {
        name: data.name || '',
        url: data.url || ''
    };
}

/**
 * 创建搜索结果对象
 * @param {Object} data - 初始数据
 * @returns {SearchResult} 搜索结果对象
 */
function createSearchResult(data = {}) {
    return {
        keyword: data.keyword || '',
        results: data.results || [],
        total: data.total || 0,
        page: data.page || 1,
        hasMore: data.hasMore || false,
        sources: data.sources || []
    };
}

/**
 * 创建播放状态对象
 * @param {Object} data - 初始数据
 * @returns {PlayState} 播放状态对象
 */
function createPlayState(data = {}) {
    return {
        videoId: data.videoId || '',
        url: data.url || '',
        currentTime: data.currentTime || 0,
        duration: data.duration || 0,
        playing: data.playing || false,
        volume: data.volume !== undefined ? data.volume : 1,
        quality: data.quality || '',
        qualities: data.qualities || [],
        error: data.error || ''
    };
}

/**
 * 创建数据源配置对象
 * @param {Object} data - 初始数据
 * @returns {SourceConfig} 数据源配置对象
 */
function createSourceConfig(data = {}) {
    return {
        id: data.id || '',
        name: data.name || '',
        type: data.type || 'crawl',
        url: data.url || '',
        searchPath: data.searchPath || '',
        apiKey: data.apiKey || '',
        enabled: data.enabled !== undefined ? data.enabled : true
    };
}

/**
 * 验证视频信息对象
 * @param {VideoInfo} video - 视频信息对象
 * @returns {boolean} 是否有效
 */
function validateVideoInfo(video) {
    if (!video || typeof video !== 'object') {
        return false;
    }
    
    if (!video.id || !video.title) {
        return false;
    }
    
    return true;
}

/**
 * 验证搜索结果对象
 * @param {SearchResult} result - 搜索结果对象
 * @returns {boolean} 是否有效
 */
function validateSearchResult(result) {
    if (!result || typeof result !== 'object') {
        return false;
    }
    
    if (!result.keyword || !Array.isArray(result.results)) {
        return false;
    }
    
    return true;
}

// 导出数据模型
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        VideoInfoSchema,
        VideoSourceSchema,
        EpisodeSchema,
        SearchResultSchema,
        SourceStatusSchema,
        PlayStateSchema,
        SourceConfigSchema,
        createVideoInfo,
        createVideoSource,
        createEpisode,
        createSearchResult,
        createPlayState,
        createSourceConfig,
        validateVideoInfo,
        validateSearchResult
    };
}