/**
 * 跨域处理模块
 * 优先走同源代理（Cloudflare Pages Function / 本地 proxy.py），
 * 其次直连，最后回退到公共代理。
 */

class CORSModule {
    constructor() {
        // 同源代理端点，按优先级排列
        this.sameOriginEndpoints = [
            { name: 'edge', build: url => '/api/proxy?url=' + encodeURIComponent(url) },
            { name: 'local', build: url => '/proxy/' + encodeURIComponent(url) }
        ];
        this.endpointState = { edge: null, local: null };

        // 公共代理作为最后兜底
        this.proxyServices = [
            { name: 'codetabs', url: 'https://api.codetabs.com/v1/proxy?quest=', type: 'raw' },
            { name: 'allorigins', url: 'https://api.allorigins.win/raw?url=', type: 'raw' }
        ];
        this.failedServices = new Set();
    }

    /**
     * 发送跨域请求（带超时）
     * @param {string} url - 请求URL
     * @param {Object} options - 请求选项
     * @returns {Promise<Response>} 响应对象
     */
    async fetchWithCORS(url, options = {}) {
        const timeout = options.timeout || 8000;
        const isFileProtocol = window.location.protocol === 'file:';
        const requestOptions = { ...options };
        delete requestOptions.timeout;

        // 策略1: 同源代理
        if (!isFileProtocol) {
            for (const endpoint of this.sameOriginEndpoints) {
                if (this.endpointState[endpoint.name] === false) continue;
                try {
                    const response = await this.fetchWithTimeout(
                        endpoint.build(url),
                        { ...requestOptions, mode: 'same-origin' },
                        timeout
                    );
                    const viaProxy = response.headers && response.headers.get('x-proxy');
                    if (viaProxy === 'edge' || viaProxy === 'local') {
                        this.endpointState[endpoint.name] = true;
                        return response;
                    }
                    if (response.status === 404 || response.status === 405 || response.status === 501) {
                        this.endpointState[endpoint.name] = false;
                        continue;
                    }
                    if (response.ok) {
                        this.endpointState[endpoint.name] = true;
                        return response;
                    }
                } catch (e) {
                    this.endpointState[endpoint.name] = false;
                }
            }
        }

        // 策略2: 直连
        if (!isFileProtocol) {
            try {
                const response = await this.fetchWithTimeout(
                    url,
                    { ...requestOptions, mode: 'cors' },
                    timeout
                );
                if (response.ok) return response;
            } catch (e) {
                console.log('直接请求失败，尝试代理...');
            }
        }

        // 策略3: 公共代理
        const available = this.proxyServices.filter(s => !this.failedServices.has(s.name));
        for (const service of available) {
            try {
                console.log(`尝试代理: ${service.name}`);
                const response = await this.fetchWithTimeout(
                    service.url + encodeURIComponent(url),
                    { ...requestOptions, mode: 'cors' },
                    timeout
                );
                if (response.ok) {
                    console.log(`代理成功: ${service.name}`);
                    return response;
                }
            } catch (error) {
                console.warn(`代理失败: ${service.name}`, error.message);
                this.failedServices.add(service.name);
            }
        }

        throw new Error('所有代理服务都失败了');
    }

    /**
     * 带超时的fetch
     */
    fetchWithTimeout(url, options, timeout) {
        return Promise.race([
            fetch(url, options),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error('请求超时')), timeout)
            )
        ]);
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
