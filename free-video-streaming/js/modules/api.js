/**
 * API适配器模块
 * 对接免费视频API服务
 */

class APIAdapter {
    constructor() {
        this.corsModule = corsModule; // 使用全局跨域模块
        this.apis = new Map(); // 存储API配置
    }
    
    /**
     * 注册API
     * @param {SourceConfig} config - API配置
     */
    registerAPI(config) {
        if (config.type !== 'api') {
            console.warn('只能注册API类型的数据源');
            return;
        }
        
        this.apis.set(config.id, config);
        console.log(`注册API: ${config.name}`);
    }
    
    /**
     * 调用搜索API
     * @param {string} keyword - 搜索关键词
     * @param {SourceConfig} apiConfig - API配置
     * @returns {Promise<Array<VideoInfo>>} 搜索结果
     */
    async searchAPI(keyword, apiConfig) {
        try {
            console.log(`调用搜索API: ${apiConfig.name}, 关键词: ${keyword}`);
            
            // 构建请求URL
            const url = this.buildSearchUrl(apiConfig, keyword);
            
            // 发送请求
            const response = await this.corsModule.fetchWithCORS(url);
            
            // 解析响应
            const data = await this.parseResponse(response, apiConfig);
            
            // 转换为标准格式
            const videos = this.transformSearchResults(data, apiConfig);
            
            console.log(`API搜索完成，找到 ${videos.length} 个结果`);
            return videos;
            
        } catch (error) {
            console.error('API搜索失败:', error);
            throw error;
        }
    }
    
    /**
     * 构建搜索URL
     * @param {SourceConfig} apiConfig - API配置
     * @param {string} keyword - 搜索关键词
     * @returns {string} 请求URL
     */
    buildSearchUrl(apiConfig, keyword) {
        const encodedKeyword = encodeURIComponent(keyword);
        
        // 如果有搜索路径模板
        if (apiConfig.searchPath) {
            const searchPath = apiConfig.searchPath.replace('{keyword}', encodedKeyword);
            return `${apiConfig.url}${searchPath}`;
        }
        
        // 默认搜索路径
        return `${apiConfig.url}/search?q=${encodedKeyword}`;
    }
    
    /**
     * 解析响应
     * @param {Response} response - 响应对象
     * @param {SourceConfig} apiConfig - API配置
     * @returns {Promise<Object>} 解析后的数据
     */
    async parseResponse(response, apiConfig) {
        const contentType = response.headers.get('content-type') || '';
        
        if (contentType.includes('application/json')) {
            return await response.json();
        } else {
            const text = await response.text();
            try {
                return JSON.parse(text);
            } catch (error) {
                console.error('JSON解析失败:', error);
                throw new Error('响应格式错误');
            }
        }
    }
    
    /**
     * 转换搜索结果
     * @param {Object} data - API响应数据
     * @param {SourceConfig} apiConfig - API配置
     * @returns {Array<VideoInfo>} 视频信息列表
     */
    transformSearchResults(data, apiConfig) {
        const videos = [];
        
        try {
            // 根据不同的API格式进行转换
            // 这里需要根据实际API的响应格式来实现
            
            // 假设API返回格式为: { results: [...] } 或 { data: [...] } 或 [...]
            let results = [];
            
            if (Array.isArray(data)) {
                results = data;
            } else if (data.results && Array.isArray(data.results)) {
                results = data.results;
            } else if (data.data && Array.isArray(data.data)) {
                results = data.data;
            } else if (data.list && Array.isArray(data.list)) {
                results = data.list;
            } else if (data.items && Array.isArray(data.items)) {
                results = data.items;
            }
            
            // 转换每个结果
            results.forEach((item, index) => {
                try {
                    const video = this.transformSingleResult(item, apiConfig, index);
                    if (video) {
                        videos.push(video);
                    }
                } catch (error) {
                    console.warn(`转换第 ${index} 个结果失败:`, error);
                }
            });
            
        } catch (error) {
            console.error('转换搜索结果失败:', error);
        }
        
        return videos;
    }
    
    /**
     * 转换单个结果
     * @param {Object} item - 原始数据
     * @param {SourceConfig} apiConfig - API配置
     * @param {number} index - 索引
     * @returns {VideoInfo|null} 视频信息
     */
    transformSingleResult(item, apiConfig, index) {
        try {
            // 提取标题
            const title = item.title || item.name || item.video_name || '';
            
            if (!title) {
                return null;
            }
            
            // 提取封面
            const cover = item.cover || item.poster || item.image || item.thumb || '';
            
            // 提取描述
            const description = item.description || item.desc || item.summary || '';
            
            // 提取年份
            const year = item.year || item.release_date || item.date || '';
            
            // 提取类型
            const type = item.type || item.genre || item.category || '';
            
            // 提取ID
            const id = item.id || item.video_id || item.vid || `api_${Date.now()}_${index}`;
            
            // 提取播放地址
            const playUrl = item.url || item.play_url || item.video_url || item.href || '';
            
            return createVideoInfo({
                id: id.toString(),
                title: title,
                cover: cover,
                description: description,
                year: year.toString(),
                type: type,
                sources: [createVideoSource({
                    sourceId: apiConfig.id,
                    url: playUrl,
                    episodes: []
                })]
            });
            
        } catch (error) {
            console.error('转换单个结果失败:', error);
            return null;
        }
    }
    
    /**
     * 获取视频详情
     * @param {string} videoId - 视频ID
     * @param {SourceConfig} apiConfig - API配置
     * @returns {Promise<VideoInfo>} 视频信息
     */
    async getVideoDetail(videoId, apiConfig) {
        try {
            console.log(`获取视频详情: ${videoId}`);
            
            // 构建请求URL
            const url = `${apiConfig.url}/video/${videoId}`;
            
            // 发送请求
            const response = await this.corsModule.fetchWithCORS(url);
            
            // 解析响应
            const data = await this.parseResponse(response, apiConfig);
            
            // 转换为标准格式
            const video = this.transformDetailResult(data, apiConfig);
            
            return video;
            
        } catch (error) {
            console.error('获取视频详情失败:', error);
            throw error;
        }
    }
    
    /**
     * 转换详情结果
     * @param {Object} data - API响应数据
     * @param {SourceConfig} apiConfig - API配置
     * @returns {VideoInfo} 视频信息
     */
    transformDetailResult(data, apiConfig) {
        // 提取基本信息
        const title = data.title || data.name || '未知标题';
        const cover = data.cover || data.poster || data.image || '';
        const description = data.description || data.desc || '';
        const year = data.year || data.release_date || '';
        const type = data.type || data.genre || '';
        const id = data.id || data.video_id || `detail_${Date.now()}`;
        
        // 提取剧集信息
        const episodes = [];
        if (data.episodes && Array.isArray(data.episodes)) {
            data.episodes.forEach((ep, index) => {
                episodes.push(createEpisode({
                    name: ep.name || ep.title || `第${index + 1}集`,
                    url: ep.url || ep.play_url || ep.video_url || ''
                }));
            });
        }
        
        return createVideoInfo({
            id: id.toString(),
            title: title,
            cover: cover,
            description: description,
            year: year.toString(),
            type: type,
            sources: [createVideoSource({
                sourceId: apiConfig.id,
                url: data.url || data.play_url || '',
                episodes: episodes
            })]
        });
    }
    
    /**
     * 获取播放地址
     * @param {string} videoId - 视频ID
     * @param {string} episodeId - 剧集ID
     * @param {SourceConfig} apiConfig - API配置
     * @returns {Promise<string>} 播放地址
     */
    async getPlayUrl(videoId, episodeId, apiConfig) {
        try {
            console.log(`获取播放地址: 视频${videoId}, 剧集${episodeId}`);
            
            // 构建请求URL
            let url = `${apiConfig.url}/play/${videoId}`;
            if (episodeId) {
                url += `?episode=${episodeId}`;
            }
            
            // 发送请求
            const response = await this.corsModule.fetchWithCORS(url);
            
            // 解析响应
            const data = await this.parseResponse(response, apiConfig);
            
            // 提取播放地址
            const playUrl = data.url || data.play_url || data.video_url || data.src || '';
            
            if (!playUrl) {
                throw new Error('未找到播放地址');
            }
            
            return playUrl;
            
        } catch (error) {
            console.error('获取播放地址失败:', error);
            throw error;
        }
    }
    
    /**
     * 获取所有已注册的API
     * @returns {Array<SourceConfig>} API配置列表
     */
    getRegisteredAPIs() {
        return Array.from(this.apis.values());
    }
    
    /**
     * 获取指定API
     * @param {string} apiId - API ID
     * @returns {SourceConfig|null} API配置
     */
    getAPI(apiId) {
        return this.apis.get(apiId) || null;
    }
    
    /**
     * 移除API
     * @param {string} apiId - API ID
     */
    removeAPI(apiId) {
        this.apis.delete(apiId);
        console.log(`移除API: ${apiId}`);
    }
}

// 创建全局API适配器实例
const apiAdapter = new APIAdapter();

// 导出API适配器
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { APIAdapter, apiAdapter };
}