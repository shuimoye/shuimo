/**
 * 视频源配置
 * 配置免费可用的视频API和网站
 * 按稳定性排序
 */

const VIDEO_SOURCES = [
    {
        id: 'ffzy',
        name: '非凡资源',
        type: 'api',
        api: 'https://cj.ffzyapi.com/api.php/provide/vod',
        searchPath: '/?ac=detail&wd={keyword}',
        detailPath: '/?ac=detail&ids={id}',
        enabled: true,
        priority: 1 // 优先级最高
    },
    {
        id: 'hongniu',
        name: '红牛资源',
        type: 'api',
        api: 'https://www.hongniuzy2.com/api.php/provide/vod',
        searchPath: '/?ac=detail&wd={keyword}',
        detailPath: '/?ac=detail&ids={id}',
        enabled: true,
        priority: 2
    },
    {
        id: 'heimuer',
        name: '黑木耳资源',
        type: 'api',
        api: 'https://json.heimuer.xyz/api/index.php',
        searchPath: '?search={keyword}',
        detailPath: '?detail={id}',
        enabled: true,
        priority: 3
    },
    {
        id: 'bfzy',
        name: '暴风资源',
        type: 'api',
        api: 'https://bfzyapi.com/api.php/provide/vod',
        searchPath: '/?ac=detail&wd={keyword}',
        detailPath: '/?ac=detail&ids={id}',
        enabled: true,
        priority: 4
    },
    {
        id: 'zy360',
        name: '360资源',
        type: 'api',
        api: 'https://360zy.com/api.php/provide/vod',
        searchPath: '/?ac=detail&wd={keyword}',
        detailPath: '/?ac=detail&ids={id}',
        enabled: true,
        priority: 5
    }
];

// 导出配置
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { VIDEO_SOURCES };
}