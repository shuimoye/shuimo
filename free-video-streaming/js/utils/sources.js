/**
 * 视频源配置
 * 配置免费可用的视频API和网站
 * 按稳定性排序
 */

const VIDEO_SOURCES = [
    {
        id: 'hongniu',
        name: '红牛资源',
        type: 'api',
        api: 'https://www.hongniuzy2.com/api.php/provide/vod',
        searchPath: '/?ac=detail&wd={keyword}',
        detailPath: '/?ac=detail&ids={id}',
        enabled: true,
        priority: 1
    },
    {
        id: 'bfzy',
        name: '暴风资源',
        type: 'api',
        api: 'https://bfzyapi.com/api.php/provide/vod',
        searchPath: '/?ac=detail&wd={keyword}',
        detailPath: '/?ac=detail&ids={id}',
        enabled: true,
        priority: 2
    },
    {
        id: 'zy360',
        name: '360资源',
        type: 'api',
        api: 'https://360zy.com/api.php/provide/vod',
        searchPath: '/?ac=detail&wd={keyword}',
        detailPath: '/?ac=detail&ids={id}',
        enabled: true,
        priority: 3
    }
];

// 导出配置
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { VIDEO_SOURCES };
}