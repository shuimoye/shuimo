/**
 * 跨域处理模块
 * 支持file://协议下的跨域请求
 */

class CORSModule {
    constructor() {
        this.proxyUrls = [
            'https://api.allorigins.win/raw?url=',
            'https://corsproxy.io/?',
            'https://api.codetabs.com/v1/proxy?quest='
        ];
        this.failedProxies = new Set();
        this.jsonpCallbackId = 0;
    }
    
    /**
     * 发送跨域请求
     * @param {string} url - 请求URL
     * @param {Object} options - 请求选项
     * @returns {Promise<Response>} 响应对象
     */
    async fetchWithCORS(url, options = {}) {
        // 检测是否是file://协议
        const isFileProtocol = window.location.protocol === 'file:';
        
        if (isFileProtocol) {
            // file://协议下使用JSONP或代理
            return this.fetchWithJsonp(url);
        }
        
        // 策略1: 尝试直接请求
        try {
            const response = await fetch(url, {
                ...options,
                mode: 'cors'
            });
            if (response.ok) {
                return response;
            }
        } catch (e) {
            console.log('直接请求失败，尝试代理...');
        }
        
        // 策略2: 使用CORS代理
        const availableProxies = this.proxyUrls.filter(p => !this.failedProxies.has(p));
        
        for (const proxyUrl of availableProxies) {
            try {
                console.log(`尝试代理: ${proxyUrl}`);
                const proxyFullUrl = proxyUrl + encodeURIComponent(url);
                const response = await fetch(proxyFullUrl, {
                    ...options,
                    mode: 'cors'
                });
                
                if (response.ok) {
                    console.log(`代理成功: ${proxyUrl}`);
                    return response;
                }
            } catch (error) {
                console.warn(`代理失败: ${proxyUrl}`, error.message);
                this.failedProxies.add(proxyUrl);
            }
        }
        
        throw new Error('所有跨域策略都失败了');
    }
    
    /**
     * 使用JSONP方式请求
     * @param {string} url - 请求URL
     * @returns {Promise<Response>} 响应对象
     */
    fetchWithJsonp(url) {
        return new Promise((resolve, reject) => {
            const callbackName = `jsonp_callback_${++this.jsonpCallbackId}`;
            const separator = url.includes('?') ? '&' : '?';
            const jsonpUrl = `${url}${separator}callback=${callbackName}`;
            
            // 设置超时
            const timeout = setTimeout(() => {
                cleanup();
                reject(new Error('JSONP请求超时'));
            }, 15000);
            
            // 清理函数
            const cleanup = () => {
                clearTimeout(timeout);
                delete window[callbackName];
                const script = document.getElementById(callbackName);
                if (script) {
                    script.remove();
                }
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
            
            // 创建script标签
            const script = document.createElement('script');
            script.id = callbackName;
            script.src = jsonpUrl;
            script.onerror = () => {
                cleanup();
                reject(new Error('JSONP请求失败'));
            };
            
            document.head.appendChild(script);
        });
    }
    
    /**
     * 重置失败的代理列表
     */
    resetFailedProxies() {
        this.failedProxies.clear();
    }
}

// 创建全局跨域模块实例
const corsModule = new CORSModule();

// 导出跨域模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CORSModule, corsModule };
}