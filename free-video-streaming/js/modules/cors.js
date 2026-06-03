/**
 * 跨域处理模块
 * 解决跨域访问问题
 */

class CORSModule {
    constructor() {
        this.strategies = [
            {
                name: 'CORS代理',
                type: 'proxy',
                urls: [
                    'https://cors-anywhere.herokuapp.com/',
                    'https://api.allorigins.win/raw?url=',
                    'https://corsproxy.io/?'
                ]
            },
            {
                name: 'JSONP',
                type: 'jsonp',
                support: true
            }
        ];
        
        this.currentStrategyIndex = 0;
        this.proxyIndex = 0;
    }
    
    /**
     * 发送跨域请求
     * @param {string} url - 请求URL
     * @param {Object} options - 请求选项
     * @returns {Promise<Response>} 响应对象
     */
    async fetchWithCORS(url, options = {}) {
        const strategies = this.getAvailableStrategies();
        
        for (const strategy of strategies) {
            try {
                console.log(`尝试跨域策略: ${strategy.name}`);
                const response = await this.executeStrategy(strategy, url, options);
                console.log(`跨域策略 ${strategy.name} 成功`);
                return response;
            } catch (error) {
                console.warn(`跨域策略 ${strategy.name} 失败:`, error.message);
                continue;
            }
        }
        
        throw new Error('所有跨域策略失败');
    }
    
    /**
     * 获取可用策略
     * @returns {Array} 策略列表
     */
    getAvailableStrategies() {
        const strategies = [];
        
        // 首先尝试直接请求
        strategies.push({
            name: '直接请求',
            type: 'direct'
        });
        
        // 添加CORS代理策略
        this.strategies.forEach(strategy => {
            if (strategy.type === 'proxy') {
                strategy.urls.forEach((url, index) => {
                    strategies.push({
                        name: `CORS代理 ${index + 1}`,
                        type: 'proxy',
                        proxyUrl: url
                    });
                });
            } else if (strategy.type === 'jsonp' && strategy.support) {
                strategies.push({
                    name: 'JSONP',
                    type: 'jsonp'
                });
            }
        });
        
        return strategies;
    }
    
    /**
     * 执行跨域策略
     * @param {Object} strategy - 策略配置
     * @param {string} url - 请求URL
     * @param {Object} options - 请求选项
     * @returns {Promise<Response>} 响应对象
     */
    async executeStrategy(strategy, url, options) {
        switch (strategy.type) {
            case 'direct':
                return await this.directFetch(url, options);
            case 'proxy':
                return await this.proxyFetch(strategy.proxyUrl, url, options);
            case 'jsonp':
                return await this.jsonpFetch(url, options);
            default:
                throw new Error(`未知的跨域策略类型: ${strategy.type}`);
        }
    }
    
    /**
     * 直接请求
     * @param {string} url - 请求URL
     * @param {Object} options - 请求选项
     * @returns {Promise<Response>} 响应对象
     */
    async directFetch(url, options) {
        const response = await fetch(url, {
            ...options,
            mode: 'cors'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP错误: ${response.status}`);
        }
        
        return response;
    }
    
    /**
     * 代理请求
     * @param {string} proxyUrl - 代理URL
     * @param {string} url - 目标URL
     * @param {Object} options - 请求选项
     * @returns {Promise<Response>} 响应对象
     */
    async proxyFetch(proxyUrl, url, options) {
        const encodedUrl = encodeURIComponent(url);
        const fullUrl = proxyUrl + encodedUrl;
        
        const response = await fetch(fullUrl, {
            ...options,
            mode: 'cors'
        });
        
        if (!response.ok) {
            throw new Error(`代理请求失败: ${response.status}`);
        }
        
        return response;
    }
    
    /**
     * JSONP请求
     * @param {string} url - 请求URL
     * @param {Object} options - 请求选项
     * @returns {Promise<Object>} 响应数据
     */
    async jsonpFetch(url, options) {
        return new Promise((resolve, reject) => {
            const callbackName = 'jsonp_callback_' + Date.now() + '_' + Math.random().toString(36).substr(2);
            const script = document.createElement('script');
            
            // 清理函数
            const cleanup = () => {
                if (script.parentNode) {
                    script.parentNode.removeChild(script);
                }
                delete window[callbackName];
            };
            
            // 设置回调函数
            window[callbackName] = (data) => {
                cleanup();
                resolve({
                    ok: true,
                    json: () => Promise.resolve(data),
                    text: () => Promise.resolve(JSON.stringify(data))
                });
            };
            
            // 设置超时
            const timeout = setTimeout(() => {
                cleanup();
                reject(new Error('JSONP请求超时'));
            }, options.timeout || 10000);
            
            // 处理URL
            const separator = url.includes('?') ? '&' : '?';
            const jsonpUrl = `${url}${separator}callback=${callbackName}`;
            
            script.src = jsonpUrl;
            script.onerror = () => {
                clearTimeout(timeout);
                cleanup();
                reject(new Error('JSONP脚本加载失败'));
            };
            
            document.head.appendChild(script);
        });
    }
    
    /**
     * 带重试的请求
     * @param {string} url - 请求URL
     * @param {Object} options - 请求选项
     * @param {number} retries - 重试次数
     * @returns {Promise<Response>} 响应对象
     */
    async fetchWithRetry(url, options = {}, retries = 3) {
        let lastError;
        
        for (let i = 0; i < retries; i++) {
            try {
                const response = await this.fetchWithCORS(url, options);
                return response;
            } catch (error) {
                lastError = error;
                console.warn(`请求失败，第 ${i + 1} 次重试:`, error.message);
                
                if (i < retries - 1) {
                    // 指数退避
                    await this.delay(1000 * Math.pow(2, i));
                }
            }
        }
        
        throw lastError;
    }
    
    /**
     * 延迟函数
     * @param {number} ms - 毫秒数
     * @returns {Promise} Promise对象
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    /**
     * 添加自定义代理
     * @param {string} proxyUrl - 代理URL
     */
    addProxy(proxyUrl) {
        const proxyStrategy = this.strategies.find(s => s.type === 'proxy');
        if (proxyStrategy) {
            proxyStrategy.urls.push(proxyUrl);
        }
    }
    
    /**
     * 移除代理
     * @param {string} proxyUrl - 代理URL
     */
    removeProxy(proxyUrl) {
        const proxyStrategy = this.strategies.find(s => s.type === 'proxy');
        if (proxyStrategy) {
            const index = proxyStrategy.urls.indexOf(proxyUrl);
            if (index > -1) {
                proxyStrategy.urls.splice(index, 1);
            }
        }
    }
    
    /**
     * 获取当前策略
     * @returns {Object} 当前策略
     */
    getCurrentStrategy() {
        return this.strategies[this.currentStrategyIndex];
    }
    
    /**
     * 切换策略
     * @param {number} index - 策略索引
     */
    switchStrategy(index) {
        if (index >= 0 && index < this.strategies.length) {
            this.currentStrategyIndex = index;
        }
    }
}

// 创建全局跨域模块实例
const corsModule = new CORSModule();

// 导出跨域模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CORSModule, corsModule };
}