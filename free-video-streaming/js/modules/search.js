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
    }
    
    /**
     * 搜索视频
     * @param {string} keyword - 搜索关键词
     * @param {Array} sources - 数据源列表
     * @returns {Promise<Array>} 搜索结果
     */
    async search(keyword, sources = []) {
        if (this.isLoading) {
            console.log('搜索正在进行中...');
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
            
            // 并发搜索所有数据源
            const searchPromises = sources.map(source => 
                this.searchFromSource(keyword, source).catch(err => {
                    console.error(`数据源 ${source.name} 搜索失败:`, err);
                    return [];
                })
            );
            
            const results = await Promise.all(searchPromises);
            
            // 合并结果
            results.forEach((result, index) => {
                if (result && result.length > 0) {
                    this.results.push(...result);
                    this.sources.push({
                        sourceId: sources[index].id,
                        status: 'success',
                        count: result.length
                    });
                } else {
                    this.sources.push({
                        sourceId: sources[index].id,
                        status: 'error',
                        count: 0
                    });
                }
            });
            
            // 去重
            this.results = this.deduplicateResults(this.results);
            
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
        
        try {
            // 使用corsModule处理跨域（自动检测file://协议并使用JSONP）
            const response = await corsModule.fetchWithCORS(searchUrl);
            const data = await response.json();
            
            return this.parseSearchResults(data, source);
        } catch (error) {
            console.error(`${source.name} 搜索失败:`, error);
            return [];
        }
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
            allSources: [] // 所有播放源
        };
        
        try {
            // 解析播放地址 - 格式通常为 "第1集$url1#第2集$url2"
            const playUrl = item.vod_play_url || item.play_url || '';
            
            if (playUrl) {
                // 分割不同播放源
                const sources = playUrl.split('$$$');
                
                // 遍历所有播放源
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
                    
                    // 保存这个播放源
                    if (sourceEpisodes.length > 0) {
                        result.allSources.push({
                            index: sourceIndex,
                            name: `源${sourceIndex + 1}`,
                            episodes: sourceEpisodes
                        });
                        
                        // 默认使用第一个源
                        if (result.episodes.length === 0) {
                            result.episodes = sourceEpisodes;
                        }
                    }
                }
            }
        } catch (error) {
            console.error('解析剧集信息失败:', error);
        }
        
        return result;
    }
    
    /**
     * 获取真实的视频播放地址
     * @param {string} url - 播放页面URL
     * @returns {Promise<string>} 真实的视频URL
     */
    async getRealVideoUrl(url) {
        try {
            // 如果已经是视频文件链接，直接返回
            if (this.isVideoFileUrl(url)) {
                return url;
            }
            
            // 尝试从播放页面提取视频URL
            const response = await corsModule.fetchWithCORS(url);
            const html = await response.text();
            
            // 尝试多种方式提取视频URL
            let videoUrl = null;
            
            // 方法1: 查找m3u8链接
            const m3u8Match = html.match(/https?:\/\/[^"'\s]+\.m3u8[^"'\s]*/);
            if (m3u8Match) {
                videoUrl = m3u8Match[0];
            }
            
            // 方法2: 查找mp4链接
            if (!videoUrl) {
                const mp4Match = html.match(/https?:\/\/[^"'\s]+\.mp4[^"'\s]*/);
                if (mp4Match) {
                    videoUrl = mp4Match[0];
                }
            }
            
            // 方法3: 查找video标签的src
            if (!videoUrl) {
                const videoSrcMatch = html.match(/<video[^>]+src=["']([^"']+)["']/);
                if (videoSrcMatch) {
                    videoUrl = videoSrcMatch[1];
                }
            }
            
            // 方法4: 查找source标签的src
            if (!videoUrl) {
                const sourceSrcMatch = html.match(/<source[^>]+src=["']([^"']+)["']/);
                if (sourceSrcMatch) {
                    videoUrl = sourceSrcMatch[1];
                }
            }
            
            // 方法5: 查找player相关的配置
            if (!videoUrl) {
                const playerConfigMatch = html.match(/(?:url|src|file)\s*[:=]\s*["']([^"']+\.(?:m3u8|mp4|flv)[^"']*)["']/);
                if (playerConfigMatch) {
                    videoUrl = playerConfigMatch[1];
                }
            }
            
            return videoUrl || url;
            
        } catch (error) {
            console.error('获取真实视频地址失败:', error);
            return url;
        }
    }
    
    /**
     * 检查是否是视频文件URL
     * @param {string} url - URL
     * @returns {boolean} 是否是视频文件
     */
    isVideoFileUrl(url) {
        if (!url) return false;
        const videoExtensions = ['.m3u8', '.mp4', '.flv', '.ts', '.avi', '.mkv', '.webm'];
        const lowerUrl = url.toLowerCase();
        return videoExtensions.some(ext => lowerUrl.includes(ext));
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
            
            if (typeof valueA === 'string') {
                const comparison = valueA.localeCompare(valueB, 'zh-CN');
                return sortOrder === 'asc' ? comparison : -comparison;
            } else {
                const comparison = valueA - valueB;
                return sortOrder === 'asc' ? comparison : -comparison;
            }
        });
        
        return sorted;
    }
    
    /**
     * 过滤搜索结果
     * @param {Object} filters - 过滤条件
     * @returns {Array} 过滤后的结果
     */
    filterResults(filters = {}) {
        if (!this.results || this.results.length === 0) {
            return [];
        }
        
        let filtered = [...this.results];
        
        if (filters.type) {
            filtered = filtered.filter(video => 
                video.type && video.type.includes(filters.type)
            );
        }
        
        if (filters.year) {
            filtered = filtered.filter(video => 
                video.year && video.year.includes(filters.year)
            );
        }
        
        if (filters.source) {
            filtered = filtered.filter(video => 
                video.source && video.source.includes(filters.source)
            );
        }
        
        if (filters.keyword) {
            const keyword = filters.keyword.toLowerCase();
            filtered = filtered.filter(video => 
                (video.title && video.title.toLowerCase().includes(keyword)) ||
                (video.description && video.description.toLowerCase().includes(keyword))
            );
        }
        
        return filtered;
    }
    
    /**
     * 获取可用的过滤选项
     * @returns {Object} 过滤选项
     */
    getFilterOptions() {
        if (!this.results || this.results.length === 0) {
            return { types: [], years: [], sources: [] };
        }
        
        const types = [...new Set(this.results.map(v => v.type).filter(Boolean))];
        const years = [...new Set(this.results.map(v => v.year).filter(Boolean))].sort();
        const sources = [...new Set(this.results.map(v => v.source).filter(Boolean))];
        
        return { types, years, sources };
    }
    
    /**
     * 切换数据源
     * @param {string} sourceId - 数据源ID
     */
    switchSource(sourceId) {
        console.log(`切换数据源: ${sourceId}`);
    }
    
    /**
     * 获取数据源状态
     * @returns {Array} 数据源状态列表
     */
    getSourcesStatus() {
        return this.sources;
    }
    
    /**
     * 加载搜索历史
     * @returns {Array} 搜索历史
     */
    loadSearchHistory() {
        try {
            const history = localStorage.getItem('searchHistory');
            return history ? JSON.parse(history) : [];
        } catch (error) {
            console.error('加载搜索历史失败:', error);
            return [];
        }
    }
    
    /**
     * 保存搜索历史
     */
    saveSearchHistory() {
        try {
            localStorage.setItem('searchHistory', JSON.stringify(this.searchHistory));
        } catch (error) {
            console.error('保存搜索历史失败:', error);
        }
    }
    
    /**
     * 添加搜索历史
     * @param {string} keyword - 搜索关键词
     */
    addToHistory(keyword) {
        if (!keyword || !keyword.trim()) {
            return;
        }
        
        const trimmedKeyword = keyword.trim();
        
        this.searchHistory = this.searchHistory.filter(item => item !== trimmedKeyword);
        this.searchHistory.unshift(trimmedKeyword);
        
        if (this.searchHistory.length > this.maxHistorySize) {
            this.searchHistory = this.searchHistory.slice(0, this.maxHistorySize);
        }
        
        this.saveSearchHistory();
    }
    
    /**
     * 获取搜索历史
     * @returns {Array} 搜索历史
     */
    getHistory() {
        return this.searchHistory;
    }
    
    /**
     * 清空搜索历史
     */
    clearHistory() {
        this.searchHistory = [];
        this.saveSearchHistory();
    }
    
    /**
     * 删除单条搜索历史
     * @param {string} keyword - 要删除的关键词
     */
    removeFromHistory(keyword) {
        this.searchHistory = this.searchHistory.filter(item => item !== keyword);
        this.saveSearchHistory();
    }
}

// 创建全局搜索模块实例
const searchModule = new SearchModule();

// 导出搜索模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SearchModule, searchModule };
}