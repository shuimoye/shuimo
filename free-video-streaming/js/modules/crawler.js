/**
 * 网站爬虫模块
 * 爬取免费影视网站内容，提取视频信息
 */

class WebCrawler {
    constructor() {
        this.parser = new DOMParser();
        this.corsModule = corsModule; // 使用全局跨域模块
    }
    
    /**
     * 爬取搜索页面
     * @param {string} url - 搜索页面URL
     * @param {string} keyword - 搜索关键词
     * @returns {Promise<Array>} 视频信息列表
     */
    async crawlSearchPage(url, keyword) {
        try {
            console.log(`开始爬取搜索页面: ${url}, 关键词: ${keyword}`);
            
            // 构建搜索URL
            const searchUrl = this.buildSearchUrl(url, keyword);
            
            // 获取页面内容
            const html = await this.fetchPage(searchUrl);
            
            // 解析HTML
            const doc = this.parseHTML(html);
            
            // 提取视频信息
            const videos = this.extractVideoInfo(doc, url);
            
            console.log(`爬取完成，找到 ${videos.length} 个视频`);
            return videos;
            
        } catch (error) {
            console.error('爬取搜索页面失败:', error);
            throw error;
        }
    }
    
    /**
     * 构建搜索URL
     * @param {string} baseUrl - 基础URL
     * @param {string} keyword - 搜索关键词
     * @returns {string} 搜索URL
     */
    buildSearchUrl(baseUrl, keyword) {
        // 编码关键词
        const encodedKeyword = encodeURIComponent(keyword);
        
        // 如果URL已经包含搜索路径模板
        if (baseUrl.includes('{keyword}')) {
            return baseUrl.replace('{keyword}', encodedKeyword);
        }
        
        // 默认搜索路径
        const separator = baseUrl.includes('?') ? '&' : '?';
        return `${baseUrl}${separator}q=${encodedKeyword}`;
    }
    
    /**
     * 获取页面内容
     * @param {string} url - 页面URL
     * @returns {Promise<string>} HTML内容
     */
    async fetchPage(url) {
        try {
            const response = await this.corsModule.fetchWithCORS(url);
            return await response.text();
        } catch (error) {
            console.error('获取页面失败:', error);
            throw error;
        }
    }
    
    /**
     * 解析HTML
     * @param {string} html - HTML字符串
     * @returns {Document} DOM文档对象
     */
    parseHTML(html) {
        try {
            return this.parser.parseFromString(html, 'text/html');
        } catch (error) {
            console.error('HTML解析失败:', error);
            throw error;
        }
    }
    
    /**
     * 提取视频信息
     * @param {Document} doc - DOM文档对象
     * @param {string} baseUrl - 基础URL
     * @returns {Array<VideoInfo>} 视频信息列表
     */
    extractVideoInfo(doc, baseUrl) {
        const videos = [];
        
        try {
            // 这里需要根据具体网站的HTML结构来实现
            // 以下是一个通用的提取逻辑示例
            
            // 尝试常见的视频列表选择器
            const selectors = [
                '.video-item',
                '.movie-item',
                '.search-result-item',
                '.list-item',
                '.item',
                'article',
                '.card'
            ];
            
            let elements = [];
            for (const selector of selectors) {
                elements = doc.querySelectorAll(selector);
                if (elements.length > 0) {
                    console.log(`使用选择器 "${selector}" 找到 ${elements.length} 个元素`);
                    break;
                }
            }
            
            // 提取每个视频的信息
            elements.forEach((element, index) => {
                try {
                    const video = this.extractSingleVideo(element, baseUrl, index);
                    if (video) {
                        videos.push(video);
                    }
                } catch (error) {
                    console.warn(`提取第 ${index} 个视频信息失败:`, error);
                }
            });
            
        } catch (error) {
            console.error('提取视频信息失败:', error);
        }
        
        return videos;
    }
    
    /**
     * 提取单个视频信息
     * @param {Element} element - DOM元素
     * @param {string} baseUrl - 基础URL
     * @param {number} index - 索引
     * @returns {VideoInfo|null} 视频信息
     */
    extractSingleVideo(element, baseUrl, index) {
        try {
            // 提取标题
            const titleElement = element.querySelector('h2, h3, .title, .name, a');
            const title = titleElement ? titleElement.textContent.trim() : '';
            
            if (!title) {
                return null;
            }
            
            // 提取链接
            const linkElement = element.querySelector('a[href]');
            let link = linkElement ? linkElement.getAttribute('href') : '';
            
            // 处理相对路径
            if (link && !link.startsWith('http')) {
                link = this.resolveUrl(baseUrl, link);
            }
            
            // 提取封面图
            const imgElement = element.querySelector('img');
            let cover = imgElement ? imgElement.getAttribute('src') || imgElement.getAttribute('data-src') : '';
            
            // 处理相对路径
            if (cover && !cover.startsWith('http')) {
                cover = this.resolveUrl(baseUrl, cover);
            }
            
            // 提取年份
            const yearElement = element.querySelector('.year, .date, time');
            const year = yearElement ? yearElement.textContent.trim() : '';
            
            // 提取类型
            const typeElement = element.querySelector('.type, .genre, .category');
            const type = typeElement ? typeElement.textContent.trim() : '';
            
            // 提取描述
            const descElement = element.querySelector('.description, .summary, .intro, p');
            const description = descElement ? descElement.textContent.trim() : '';
            
            // 创建视频信息对象
            return createVideoInfo({
                id: `crawled_${Date.now()}_${index}`,
                title: title,
                cover: cover,
                description: description,
                year: year,
                type: type,
                sources: [createVideoSource({
                    sourceId: 'crawled',
                    url: link,
                    episodes: []
                })]
            });
            
        } catch (error) {
            console.error('提取单个视频信息失败:', error);
            return null;
        }
    }
    
    /**
     * 解析URL
     * @param {string} baseUrl - 基础URL
     * @param {string} relativeUrl - 相对URL
     * @returns {string} 完整URL
     */
    resolveUrl(baseUrl, relativeUrl) {
        try {
            return new URL(relativeUrl, baseUrl).href;
        } catch (error) {
            console.error('URL解析失败:', error);
            return relativeUrl;
        }
    }
    
    /**
     * 提取视频链接
     * @param {Document} doc - DOM文档对象
     * @returns {Array<string>} 视频链接列表
     */
    extractVideoLinks(doc) {
        const links = [];
        
        try {
            // 查找所有视频相关链接
            const linkSelectors = [
                'a[href*="play"]',
                'a[href*="video"]',
                'a[href*="watch"]',
                'a[href*="movie"]',
                'a[href*="episode"]',
                '.play-link',
                '.video-link'
            ];
            
            linkSelectors.forEach(selector => {
                const elements = doc.querySelectorAll(selector);
                elements.forEach(element => {
                    const href = element.getAttribute('href');
                    if (href && !links.includes(href)) {
                        links.push(href);
                    }
                });
            });
            
        } catch (error) {
            console.error('提取视频链接失败:', error);
        }
        
        return links;
    }
    
    /**
     * 处理分页
     * @param {string} url - 当前页面URL
     * @param {number} page - 页码
     * @returns {Promise<Array>} 下一页视频信息
     */
    async handlePagination(url, page) {
        try {
            // 构建分页URL
            const pageUrl = this.buildPageUrl(url, page);
            
            // 爬取下一页
            return await this.crawlSearchPage(pageUrl, '');
            
        } catch (error) {
            console.error('处理分页失败:', error);
            return [];
        }
    }
    
    /**
     * 构建分页URL
     * @param {string} url - 基础URL
     * @param {number} page - 页码
     * @returns {string} 分页URL
     */
    buildPageUrl(url, page) {
        // 尝试常见的分页参数
        const separators = ['?', '&'];
        const pageParams = ['page', 'p', 'pg', 'offset'];
        
        // 检查URL是否已包含分页参数
        for (const param of pageParams) {
            if (url.includes(`${param}=`)) {
                return url.replace(new RegExp(`${param}=\\d+`), `${param}=${page}`);
            }
        }
        
        // 添加分页参数
        const separator = url.includes('?') ? '&' : '?';
        return `${url}${separator}page=${page}`;
    }
    
    /**
     * 获取视频详情
     * @param {string} url - 视频详情页URL
     * @returns {Promise<VideoInfo>} 视频信息
     */
    async getVideoDetail(url) {
        try {
            console.log(`获取视频详情: ${url}`);
            
            // 获取页面内容
            const html = await this.fetchPage(url);
            
            // 解析HTML
            const doc = this.parseHTML(html);
            
            // 提取详细信息
            const video = this.extractDetailedVideoInfo(doc, url);
            
            return video;
            
        } catch (error) {
            console.error('获取视频详情失败:', error);
            throw error;
        }
    }
    
    /**
     * 提取详细视频信息
     * @param {Document} doc - DOM文档对象
     * @param {string} url - 页面URL
     * @returns {VideoInfo} 视频信息
     */
    extractDetailedVideoInfo(doc, url) {
        // 提取标题
        const titleElement = doc.querySelector('h1, .title, .video-title');
        const title = titleElement ? titleElement.textContent.trim() : '未知标题';
        
        // 提取封面
        const imgElement = doc.querySelector('.poster img, .cover img, .video-cover img');
        let cover = imgElement ? imgElement.getAttribute('src') || imgElement.getAttribute('data-src') : '';
        if (cover && !cover.startsWith('http')) {
            cover = this.resolveUrl(url, cover);
        }
        
        // 提取描述
        const descElement = doc.querySelector('.description, .summary, .intro, .plot');
        const description = descElement ? descElement.textContent.trim() : '';
        
        // 提取年份
        const yearElement = doc.querySelector('.year, .date, [itemprop="dateCreated"]');
        const year = yearElement ? yearElement.textContent.trim() : '';
        
        // 提取类型
        const typeElement = doc.querySelector('.genre, .type, .category');
        const type = typeElement ? typeElement.textContent.trim() : '';
        
        // 提取剧集信息
        const episodes = this.extractEpisodes(doc);
        
        return createVideoInfo({
            id: `detail_${Date.now()}`,
            title: title,
            cover: cover,
            description: description,
            year: year,
            type: type,
            sources: [createVideoSource({
                sourceId: 'crawled',
                url: url,
                episodes: episodes
            })]
        });
    }
    
    /**
     * 提取剧集信息
     * @param {Document} doc - DOM文档对象
     * @returns {Array<Episode>} 剧集列表
     */
    extractEpisodes(doc) {
        const episodes = [];
        
        try {
            // 查找剧集列表
            const episodeSelectors = [
                '.episode-list a',
                '.episodes a',
                '.playlist a',
                '.source-list a',
                'a[href*="episode"]',
                'a[href*="play"]'
            ];
            
            let episodeElements = [];
            for (const selector of episodeSelectors) {
                episodeElements = doc.querySelectorAll(selector);
                if (episodeElements.length > 0) {
                    console.log(`使用选择器 "${selector}" 找到 ${episodeElements.length} 个剧集`);
                    break;
                }
            }
            
            episodeElements.forEach((element, index) => {
                const name = element.textContent.trim() || `第${index + 1}集`;
                let url = element.getAttribute('href') || '';
                
                if (url && !url.startsWith('http')) {
                    url = this.resolveUrl(doc.baseURI || window.location.href, url);
                }
                
                episodes.push(createEpisode({
                    name: name,
                    url: url
                }));
            });
            
        } catch (error) {
            console.error('提取剧集信息失败:', error);
        }
        
        return episodes;
    }
}

// 创建全局爬虫模块实例
const webCrawler = new WebCrawler();

// 导出爬虫模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { WebCrawler, webCrawler };
}