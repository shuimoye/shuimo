/**
 * 跨域处理模块
 * 支持file://协议下的跨域请求
 */

class CORSModule {
    constructor() {
        // 多个CORS代理服务
        this.proxyServices = [
            {
                name: 'allorigins',
                url: 'https://api.allorigins.win/get?url=',
                type: 'json' // 返回JSON格式，需要解析contents
            },
            {
                name: 'corsproxy',
                url: 'https://corsproxy.io/?',
                type: 'raw'
            },
            {
                name: 'codetabs',
                url: 'https://api.codetabs.com/v1/proxy?quest=',
                type: 'raw'
            },
            {
                name: 'cors-anywhere',
                url: 'https://cors-anywhere.herokuapp.com/',
                type: 'raw'
            }
        ];
        this.failedServices = new Set();
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
        
        // 策略1: 尝试直接请求（非file://协议时）
        if (!isFileProtocol) {
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
        }
        
        // 策略2: 使用代理服务
        const availableServices = this.proxyServices.filter(s => !this.failedServices.has(s.name));
        
        for (const service of availableServices) {
            try {
                console.log(`尝试代理: ${service.name}`);
                const proxyUrl = service.url + encodeURIComponent(url);
                const response = await fetch(proxyUrl, {
                    ...options,
                    mode: 'cors'
                });
                
                if (response.ok) {
                    console.log(`代理成功: ${service.name}`);
                    
                    // 根据代理类型处理响应
                    if (service.type === 'json') {
                        // allorigins返回 { contents: "..." }
                        const jsonData = await response.json();
                        return {
                            ok: true,
                            json: () => Promise.resolve(JSON.parse(jsonData.contents)),
                            text: () => Promise.resolve(jsonData.contents)
                        };
                    }
                    
                    return response;
                }
            } catch (error) {
                console.warn(`代理失败: ${service.name}`, error.message);
                this.failedServices.add(service.name);
            }
        }
        
        throw new Error('所有代理服务都失败了，请使用本地代理服务器');
    }
    
    /**
     * 重置失败的服务列表
     */
    resetFailedServices() {
        this.failedServices.clear();
    }
}

// 创建全局跨域模块实例
const corsModule = new CORSModule();

// 导出跨域模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CORSModule, corsModule };
}