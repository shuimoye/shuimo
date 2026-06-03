/**
 * 视频源配置
 * 配置免费可用的视频API和网站
 */

const VIDEO_SOURCES = [
    {
        id: 'heimuer',
        name: '黑木耳资源',
        type: 'api',
        api: 'https://json.heimuer.xyz/api/index.php',
        searchPath: '?search={keyword}',
        detailPath: '?detail={id}',
        enabled: true
    },
    {
        id: 'ffzy',
        name: '非凡资源',
        type: 'api',
        api: 'https://cj.ffzyapi.com/api.php/provide/vod',
        searchPath: '/?ac=detail&wd={keyword}',
        detailPath: '/?ac=detail&ids={id}',
        enabled: true
    },
    {
        id: 'hongniu',
        name: '红牛资源',
        type: 'api',
        api: 'https://www.hongniuzy2.com/api.php/provide/vod',
        searchPath: '/?ac=detail&wd={keyword}',
        detailPath: '/?ac=detail&ids={id}',
        enabled: true
    }
];

// 导出配置
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { VIDEO_SOURCES };
}