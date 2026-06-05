/**
 * AI 配置安全模块
 * 使用多层加密保护敏感配置
 */

const AISecureConfig = (() => {
    // 基础偏移量
    const _shift = 7;
    
    // 字符转换表 (凯撒密码变种)
    const _rotate = (s, n) => s.split('').map(c => {
        const code = c.charCodeAt(0);
        if (code >= 32 && code <= 126) {
            return String.fromCharCode(((code - 32 + n + 95) % 95) + 32);
        }
        return c;
    }).join('');
    
    // 反转字符串
    const _rev = s => s.split('').reverse().join('');
    
    // 配置数据 (已加密)
    // 模型名称: agnes-2.0-flash
    const _emodel = _rev('hsalf-0.2-senga');
    
    // API 地址: https://apihub.agnes-ai.com/v1
    // 加密方式: 先反转，再凯撒密码偏移5
    const _eendpoint = '6{4rth3nf2xjslf3gzmnuf44?xuyym';
    
    // API Key (分段存储)
    const _kparts = [
        _rotate('sk-', 3),
        _rotate('J6Up', 4),
        _rotate('aaNP', 5),
        _rotate('45eub', 6),
        _rotate('Wm2', 7),
        _rotate('WH69', 8),
        _rotate('iUVG', 9),
        _rotate('omvgE', 10),
        _rotate('TUW', 11),
        _rotate('Raia', 12),
        _rotate('C1fRBz', 13),
        _rotate('uw8FOk', 14)
    ];
    
    // 解密函数
    const _decryptKey = () => {
        return _kparts.map((part, i) => 
            _rotate(part, -(i + 3))
        ).join('');
    };
    
    return {
        get model() { return _emodel; },
        get endpoint() { return _rev(_rotate(_eendpoint, -5)); },
        get apiKey() { return _decryptKey(); }
    };
})();

// 冻结并密封配置
Object.freeze(AISecureConfig);
Object.seal(AISecureConfig);