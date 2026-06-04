/**
 * 搜索模块
 * 处理用户搜索请求，聚合多个资源网站结果
 */

class SearchModule {
    constructor() {
        this.results = [];
        this.sources = [];
        this.currentKeyword = '';
        this.isLoading = false;
        this.searchHistory = this.loadSearchHistory();
        this.maxHistorySize = 20;
        this.cache = new Map(); // 搜索缓存
        this.cacheTime = 5 * 60 * 1000; // 缓存5分钟
    }
    
    /**
     * 搜索视频（优化版）
     * @param {string} keyword - 搜索关键词
     * @param {Array} sources - 数据源列表
     * @returns {Promise<Array>} 搜索结果
     */
    async search(keyword, sources = []) {
        if (this.isLoading) {
            console.log('搜索正在进行中...');
            return this.results;
        }
        
        // 检查缓存
        const cacheKey = keyword.toLowerCase().trim();
        const cached = this.cache.get(cacheKey);
        if (cached && Date.now() - cached.time < this.cacheTime) {
            console.log(`使用缓存: ${keyword}`);
            this.results = cached.results;
            return this.results;
        }
        
        this.isLoading = true;
        this.currentKeyword = keyword;
        this.results = [];
        this.sources = [];
        
        try {
            console.log(`开始搜索: ${keyword}`);
            
            // 如果没有指定数据源，使用默认数据源
            if (sources.length === 0) {
                sources = VIDEO_SOURCES.filter(s => s.enabled);
            }
            
            // 竞速搜索：哪个源先返回就先用
            const searchPromises = sources.map(async (source) => {
                try {
                    const result = await this.searchFromSource(keyword, source);
                    return { source, result, success: true };
                } catch (err) {
                    console.error(`数据源 ${source.name} 搜索失败:`, err);
                    return { source, result: [], success: false };
                }
            });
            
            // 使用 Promise.allSettled 等待所有结果
            const results = await Promise.allSettled(searchPromises);
            
            // 收集成功的结果
            results.forEach((settled) => {
                if (settled.status === 'fulfilled' && settled.value.success) {
                    const { source, result } = settled.value;
                    if (result && result.length > 0) {
                        this.results.push(...result);
                        this.sources.push({
                            sourceId: source.id,
                            status: 'success',
                            count: result.length
                        });
                    }
                }
            });
            
            // 去重
            this.results = this.deduplicateResults(this.results);
            
            // 缓存结果
            if (this.results.length > 0) {
                this.cache.set(cacheKey, {
                    results: this.results,
                    time: Date.now()
                });
            }
            
            console.log(`搜索完成，找到 ${this.results.length} 个结果`);
            return this.results;
            
        } catch (error) {
            console.error('搜索过程中发生错误:', error);
            throw error;
        } finally {
            this.isLoading = false;
        }
    }
    
    /**
     * 从单个数据源搜索
     * @param {string} keyword - 搜索关键词
     * @param {Object} source - 数据源配置
     * @returns {Promise<Array>} 搜索结果
     */
    async searchFromSource(keyword, source) {
        console.log(`从 ${source.name} 搜索: ${keyword}`);
        
        const searchUrl = source.api + source.searchPath.replace('{keyword}', encodeURIComponent(keyword));
        
        // 使用更快的超时时间
        const response = await corsModule.fetchWithCORS(searchUrl, { timeout: 4000 });
        const data = await response.json();
        
        return this.parseSearchResults(data, source);
    }
    
    /**
     * 解析搜索结果
     * @param {Object} data - API返回的数据
     * @param {Object} source - 数据源配置
     * @returns {Array} 视频列表
     */
    parseSearchResults(data, source) {
        const videos = [];
        
        try {
            // 不同API返回格式不同，需要适配
            let list = [];
            
            if (data.list && Array.isArray(data.list)) {
                list = data.list;
            } else if (data.data && data.data.list && Array.isArray(data.data.list)) {
                list = data.data.list;
            } else if (Array.isArray(data)) {
                list = data;
            }
            
            list.forEach((item, index) => {
                const video = this.parseVideoItem(item, source, index);
                if (video) {
                    videos.push(video);
                }
            });
        } catch (error) {
            console.error('解析搜索结果失败:', error);
        }
        
        return videos;
    }
    
    /**
     * 解析单个视频项
     * @param {Object} item - 原始数据
     * @param {Object} source - 数据源配置
     * @param {number} index - 索引
     * @returns {Object|null} 视频信息
     */
    parseVideoItem(item, source, index) {
        try {
            const id = item.vod_id || item.id || `${source.id}_${index}`;
            const title = item.vod_name || item.name || item.title || '';
            
            if (!title) return null;
            
            const cover = item.vod_pic || item.pic || item.img || '';
            const year = item.vod_year || item.year || '';
            const type = item.type_name || item.vod_class || item.type || '';
            const description = item.vod_content || item.vod_blurb || item.desc || '';
            
            // 解析播放地址
            const episodeResult = this.parseEpisodes(item);
            
            return {
                id: id.toString(),
                title: title,
                cover: cover,
                year: year.toString(),
                type: type,
                description: description,
                source: source.name,
                sourceId: source.id,
                episodes: episodeResult.episodes,
                allSources: episodeResult.allSources
            };
        } catch (error) {
            console.error('解析视频项失败:', error);
            return null;
        }
    }
    
    /**
     * 解析剧集信息
     * @param {Object} item - 视频数据
     * @returns {Object} 包含剧集列表和所有播放源
     */
    parseEpisodes(item) {
        const result = {
            episodes: [],
            allSources: []
        };
        
        try {
            const playUrl = item.vod_play_url || item.play_url || '';
            
            if (playUrl) {
                const sources = playUrl.split('$$$');
                let bestSourceIndex = -1;
                let bestSourceScore = -1;
                
                for (let sourceIndex = 0; sourceIndex < sources.length; sourceIndex++) {
                    const episodesStr = sources[sourceIndex];
                    const episodeList = episodesStr.split('#');
                    
                    const sourceEpisodes = [];
                    
                    episodeList.forEach((ep, index) => {
                        const parts = ep.split('$');
                        if (parts.length >= 2) {
                            sourceEpisodes.push({
                                name: parts[0] || `第${index + 1}集`,
                                url: parts[1],
                                sourceIndex: sourceIndex
                            });
                        } else if (parts.length === 1 && parts[0]) {
                            sourceEpisodes.push({
                                name: `第${index + 1}集`,
                                url: parts[0],
                                sourceIndex: sourceIndex
                            });
                        }
                    });
                    
                    if (sourceEpisodes.length > 0) {
                        let score = 0;
                        const firstUrl = sourceEpisodes[0].url || '';
                        const lowerUrl = firstUrl.toLowerCase();
                        
                        if (lowerUrl.includes('.m3u8')) score = 100;
                        else if (lowerUrl.includes('.mp4')) score = 90;
                        else if (lowerUrl.includes('.flv')) score = 80;
                        else if (lowerUrl.includes('.ts')) score = 70;
                        else score = 10;
                        
                        result.allSources.push({
                            index: sourceIndex,
                            name: `源${sourceIndex + 1}`,
                            episodes: sourceEpisodes,
                            score: score
                        });
                        
                        if (score > bestSourceScore) {
                            bestSourceScore = score;
                            bestSourceIndex = sourceIndex;
                        }
                    }
                }
                
                if (bestSourceIndex >= 0) {
                    result.episodes = result.allSources.find(s => s.index === bestSourceIndex).episodes;
                }
            }
        } catch (error) {
            console.error('解析剧集信息失败:', error);
        }
        
        return result;
    }
    
    /**
     * 获取视频详情
     * @param {string} videoId - 视频ID
     * @param {string} sourceId - 数据源ID
     * @returns {Promise<Object>} 视频详情
     */
    async getVideoDetail(videoId, sourceId) {
        const source = VIDEO_SOURCES.find(s => s.id === sourceId);
        if (!source) {
            throw new Error('未找到数据源');
        }
        
        const detailUrl = source.api + source.detailPath.replace('{id}', videoId);
        
        try {
            const response = await corsModule.fetchWithCORS(detailUrl);
            const data = await response.json();
            
            let item = null;
            if (data.list && data.list.length > 0) {
                item = data.list[0];
            } else if (data.data && data.data.list && data.data.list.length > 0) {
                item = data.data.list[0];
            }
            
            if (item) {
                return this.parseVideoItem(item, source, 0);
            }
            
            throw new Error('未找到视频详情');
        } catch (error) {
            console.error('获取视频详情失败:', error);
            throw error;
        }
    }
    
    /**
     * 获取默认数据源
     * @returns {Array} 默认数据源列表
     */
    getDefaultSources() {
        return VIDEO_SOURCES.filter(s => s.enabled);
    }
    
    /**
     * 结果去重
     * @param {Array} results - 搜索结果
     * @returns {Array} 去重后的结果
     */
    deduplicateResults(results) {
        const seen = new Set();
        return results.filter(result => {
            const key = `${result.title}_${result.source}`;
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        });
    }
    
    /**
     * 获取搜索结果
     * @returns {Array} 搜索结果
     */
    getResults() {
        return this.results;
    }
    
    /**
     * 排序搜索结果
     * @param {string} sortBy - 排序字段
     * @param {string} sortOrder - 排序顺序
     * @returns {Array} 排序后的结果
     */
    sortResults(sortBy = 'title', sortOrder = 'asc') {
        if (!this.results || this.results.length === 0) {
            return [];
        }
        
        const sorted = [...this.results].sort((a, b) => {
            let valueA, valueB;
            
            switch (sortBy) {
                case 'title':
                    valueA = a.title || '';
                    valueB = b.title || '';
                    break;
                case 'year':
                    valueA = parseInt(a.year) || 0;
                    valueB = parseInt(b.year) || 0;
                    break;
                case 'source':
                    valueA = a.source || '';
                    valueB = b.source || '';
                    break;
                default:
                    valueA = a.title || '';
                    valueB = b.title || '';
            }
            
            if (sortOrder === 'asc') {
                return valueA > valueB ? 1 : -1;
            } else {
                return valueA < valueB ? 1 : -1;
            }
        });
        
        return sorted;
    }
    
    /**
     * 按类型筛选
     * @param {string} type - 类型
     * @returns {Array} 筛选后的结果
     */
    filterByType(type) {
        if (!type || type === 'all') {
            return this.results;
        }
        
        return this.results.filter(video => 
            video.type && video.type.includes(type)
        );
    }
    
    /**
     * 搜索历史管理
     */
    loadSearchHistory() {
        try {
            const history = localStorage.getItem('searchHistory');
            return history ? JSON.parse(history) : [];
        } catch (e) {
            return [];
        }
    }
    
    saveSearchHistory() {
        try {
            localStorage.setItem('searchHistory', JSON.stringify(this.searchHistory));
        } catch (e) {
            console.error('保存搜索历史失败:', e);
        }
    }
    
    addToHistory(keyword) {
        if (!keyword || !keyword.trim()) return;
        
        keyword = keyword.trim();
        
        // 移除重复项
        this.searchHistory = this.searchHistory.filter(item => item !== keyword);
        
        // 添加到开头
        this.searchHistory.unshift(keyword);
        
        // 限制大小
        if (this.searchHistory.length > this.maxHistorySize) {
            this.searchHistory = this.searchHistory.slice(0, this.maxHistorySize);
        }
        
        this.saveSearchHistory();
    }
    
    removeFromHistory(keyword) {
        this.searchHistory = this.searchHistory.filter(item => item !== keyword);
        this.saveSearchHistory();
    }
    
    clearHistory() {
        this.searchHistory = [];
        this.saveSearchHistory();
    }
    
    getHistory() {
        return this.searchHistory;
    }
    
    /**
     * 清除缓存
     */
    clearCache() {
        this.cache.clear();
    }
}

// 创建全局搜索模块实例
const searchModule = new SearchModule();

// 导出搜索模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SearchModule, searchModule };
}