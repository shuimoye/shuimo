/**
 * 跨域处理模块
 * 解决跨域访问问题
 */

class CORSModule {
    constructor() {
        // 更可靠的CORS代理服务列表
        this.proxyUrls = [
            'https://api.allorigins.win/raw?url=',
            'https://corsproxy.io/?',
            'https://api.codetabs.com/v1/proxy?quest='
        ];
        
        this.currentProxyIndex = 0;
        this.failedProxies = new Set();
    }
    
    /**
     * 发送跨域请求
     * @param {string} url - 请求URL
     * @param {Object} options - 请求选项
     * @returns {Promise<Response>} 响应对象
     */
    async fetchWithCORS(url, options = {}) {
        // 策略1: 尝试直接请求（如果API支持CORS）
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
        
        // 策略3: 使用iframe代理（适用于支持JSONP的API）
        try {
            return await this.fetchWithIframeProxy(url);
        } catch (e) {
            console.log('iframe代理失败');
        }
        
        throw new Error('所有跨域策略都失败了，请检查网络连接或使用本地代理服务器');
    }
    
    /**
     * 使用iframe代理请求
     * @param {string} url - 请求URL
     * @returns {Promise<Response>} 响应对象
     */
    fetchWithIframeProxy(url) {
        return new Promise((resolve, reject) => {
            const iframe = document.createElement('iframe');
            iframe.style.display = 'none';
            
            const timeout = setTimeout(() => {
                document.body.removeChild(iframe);
                reject(new Error('iframe代理超时'));
            }, 10000);
            
            iframe.onload = () => {
                try {
                    const content = iframe.contentDocument || iframe.contentWindow.document;
                    const text = content.body.textContent;
                    clearTimeout(timeout);
                    document.body.removeChild(iframe);
                    
                    resolve({
                        ok: true,
                        json: () => Promise.resolve(JSON.parse(text)),
                        text: () => Promise.resolve(text)
                    });
                } catch (e) {
                    clearTimeout(timeout);
                    document.body.removeChild(iframe);
                    reject(e);
                }
            };
            
            iframe.onerror = () => {
                clearTimeout(timeout);
                document.body.removeChild(iframe);
                reject(new Error('iframe加载失败'));
            };
            
            document.body.appendChild(iframe);
            iframe.src = url;
        });
    }
    
    /**
     * 获取当前使用的代理
     * @returns {string} 当前代理URL
     */
    getCurrentProxy() {
        return this.proxyUrls[this.currentProxyIndex];
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