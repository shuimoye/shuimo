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
        
        try {
            console.log(`开始搜索: ${keyword}`);
            
            // 如果没有指定数据源，使用默认数据源
            if (sources.length === 0) {
                sources = this.getDefaultSources();
            }
            
            // 并发搜索所有数据源
            const searchPromises = sources.map(source => 
                this.searchFromSource(keyword, source)
            );
            
            const results = await Promise.allSettled(searchPromises);
            
            // 合并结果
            results.forEach((result, index) => {
                if (result.status === 'fulfilled') {
                    this.results.push(...result.value);
                    this.sources.push({
                        sourceId: sources[index].id,
                        status: 'success',
                        count: result.value.length
                    });
                } else {
                    console.error(`数据源 ${sources[index].name} 搜索失败:`, result.reason);
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
        // 这里将调用具体的爬虫或API
        // 暂时返回模拟数据
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve([
                    {
                        id: `${source.id}_1`,
                        title: `${keyword} - 来自${source.name}`,
                        cover: 'assets/images/default-cover.jpg',
                        year: '2024',
                        type: '电影',
                        source: source.name
                    }
                ]);
            }, 500);
        });
    }
    
    /**
     * 获取默认数据源
     * @returns {Array} 默认数据源列表
     */
    getDefaultSources() {
        return [
            {
                id: 'source1',
                name: '免费影视网站A',
                type: 'crawl',
                url: 'https://example.com',
                searchPath: '/search?q=',
                enabled: true
            },
            {
                id: 'source2',
                name: '免费API服务',
                type: 'api',
                url: 'https://api.example.com',
                apiKey: '',
                enabled: true
            }
        ];
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
     * @param {string} sortBy - 排序字段：title/year.source
     * @param {string} sortOrder - 排序顺序：asc/desc
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
            
            // 比较值
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
        
        // 按类型过滤
        if (filters.type) {
            filtered = filtered.filter(video => 
                video.type && video.type.includes(filters.type)
            );
        }
        
        // 按年份过滤
        if (filters.year) {
            filtered = filtered.filter(video => 
                video.year && video.year.includes(filters.year)
            );
        }
        
        // 按来源过滤
        if (filters.source) {
            filtered = filtered.filter(video => 
                video.source && video.source.includes(filters.source)
            );
        }
        
        // 按关键词过滤
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
        // 这里可以实现数据源切换逻辑
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
        
        // 移除重复项
        this.searchHistory = this.searchHistory.filter(item => item !== trimmedKeyword);
        
        // 添加到开头
        this.searchHistory.unshift(trimmedKeyword);
        
        // 限制历史记录大小
        if (this.searchHistory.length > this.maxHistorySize) {
            this.searchHistory = this.searchHistory.slice(0, this.maxHistorySize);
        }
        
        // 保存到本地存储
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