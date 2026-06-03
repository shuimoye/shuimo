/**
 * 免费视频流媒体网页应用 - 主入口文件
 * 仅供学习使用，请勿商业用途
 */

// 应用状态
const AppState = {
    currentVideo: null,
    searchResults: [],
    isPlaying: false,
    volume: 1,
    currentTime: 0,
    duration: 0,
    currentView: 'welcome' // welcome, search, detail, player
};

// DOM元素缓存
const DOMElements = {
    searchInput: null,
    searchBtn: null,
    searchResults: null,
    videoPlayer: null,
    videoDetail: null,
    searchHistory: null
};

/**
 * 初始化应用
 */
function initApp() {
    console.log('初始化免费视频流媒体应用...');
    
    // 缓存DOM元素
    cacheDOMElements();
    
    // 绑定事件
    bindEvents();
    
    // 显示欢迎信息
    showWelcomeMessage();
    
    // 检查URL参数
    checkUrlParams();
    
    console.log('应用初始化完成');
}

/**
 * 缓存DOM元素
 */
function cacheDOMElements() {
    DOMElements.searchInput = document.getElementById('searchInput');
    DOMElements.searchBtn = document.getElementById('searchBtn');
    DOMElements.searchResults = document.getElementById('searchResults');
    DOMElements.videoPlayer = document.getElementById('videoPlayer');
    DOMElements.videoDetail = document.getElementById('videoDetail');
}

/**
 * 绑定事件监听器
 */
function bindEvents() {
    // 搜索按钮点击事件
    if (DOMElements.searchBtn) {
        DOMElements.searchBtn.addEventListener('click', handleSearch);
    }
    
    // 搜索输入框回车事件
    if (DOMElements.searchInput) {
        DOMElements.searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleSearch();
            }
        });
        
        // 搜索输入框获得焦点时显示搜索历史
        DOMElements.searchInput.addEventListener('focus', showSearchHistory);
    }
    
    // 点击其他区域隐藏搜索历史
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-container')) {
            hideSearchHistory();
        }
    });
}

/**
 * 检查URL参数
 */
function checkUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const videoId = urlParams.get('video');
    const keyword = urlParams.get('q');
    
    if (videoId) {
        // 加载指定视频
        loadVideoById(videoId);
    } else if (keyword) {
        // 执行搜索
        DOMElements.searchInput.value = keyword;
        handleSearch();
    }
}

/**
 * 处理搜索
 */
async function handleSearch() {
    const keyword = DOMElements.searchInput.value.trim();
    
    if (!keyword) {
        showError('请输入搜索关键词');
        return;
    }
    
    console.log(`搜索关键词: ${keyword}`);
    
    // 显示加载状态
    showLoading();
    
    // 添加到搜索历史
    searchModule.addToHistory(keyword);
    
    try {
        // 调用搜索模块
        const results = await searchModule.search(keyword);
        
        // 显示搜索结果
        displaySearchResults(results);
        
        // 更新应用状态
        AppState.searchResults = results;
        AppState.currentView = 'search';
        
    } catch (error) {
        console.error('搜索失败:', error);
        showError('搜索失败，请重试');
    }
}

/**
 * 显示搜索结果
 * @param {Array} results - 搜索结果数组
 */
function displaySearchResults(results) {
    if (!DOMElements.searchResults) return;
    
    // 清空现有结果
    DOMElements.searchResults.innerHTML = '';
    
    if (results.length === 0) {
        showEmptyState();
        return;
    }
    
    // 创建结果卡片
    results.forEach(video => {
        const card = createVideoCard(video);
        DOMElements.searchResults.appendChild(card);
    });
    
    // 显示搜索结果区域
    DOMElements.searchResults.style.display = 'grid';
    
    // 隐藏其他区域
    if (DOMElements.videoDetail) {
        DOMElements.videoDetail.style.display = 'none';
    }
    if (DOMElements.videoPlayer) {
        DOMElements.videoPlayer.style.display = 'none';
    }
}

/**
 * 创建视频卡片
 * @param {Object} video - 视频信息对象
 * @returns {HTMLElement} 视频卡片元素
 */
function createVideoCard(video) {
    const card = document.createElement('div');
    card.className = 'video-card';
    card.dataset.videoId = video.id;
    
    card.innerHTML = `
        <img class="video-cover" src="${video.cover}" alt="${video.title}" 
             onerror="this.src='assets/images/default-cover.jpg'">
        <div class="video-info">
            <h3 class="video-title">${video.title}</h3>
            <div class="video-meta">
                <span class="video-source">${video.source || '未知来源'}</span>
                <span class="video-year">${video.year || ''}</span>
            </div>
        </div>
    `;
    
    // 点击事件
    card.addEventListener('click', () => {
        showVideoDetail(video);
    });
    
    return card;
}

/**
 * 显示视频详情
 * @param {Object} video - 视频信息对象
 */
function showVideoDetail(video) {
    console.log(`显示视频详情: ${video.title}`);
    
    // 更新应用状态
    AppState.currentVideo = video;
    AppState.currentView = 'detail';
    
    // 隐藏搜索结果
    if (DOMElements.searchResults) {
        DOMElements.searchResults.style.display = 'none';
    }
    
    // 显示视频详情区域
    if (DOMElements.videoDetail) {
        DOMElements.videoDetail.style.display = 'block';
        DOMElements.videoDetail.innerHTML = `
            <div class="detail-header">
                <img class="detail-cover" src="${video.cover}" alt="${video.title}"
                     onerror="this.src='assets/images/default-cover.jpg'">
                <div class="detail-info">
                    <h2 class="detail-title">${video.title}</h2>
                    <div class="detail-meta">
                        <span>${video.type || '未知类型'}</span>
                        <span>${video.year || '未知年份'}</span>
                        <span>${video.source || '未知来源'}</span>
                    </div>
                    <p class="detail-description">${video.description || '暂无简介'}</p>
                </div>
            </div>
            
            <div class="episode-list">
                <h3 class="episode-title">播放列表</h3>
                <div class="episodes">
                    ${generateEpisodeButtons(video)}
                </div>
            </div>
            
            <div class="download-section">
                <button class="download-btn" onclick="handleDownload()">
                    📥 下载视频
                </button>
                <div class="download-progress">
                    <div class="download-progress-fill" id="downloadProgress"></div>
                </div>
                <div class="download-status" id="downloadStatus"></div>
            </div>
            
            <div class="share-section">
                <button class="share-btn" onclick="handleShare()">
                    📤 分享给朋友
                </button>
            </div>
            
            <div style="margin-top: 16px;">
                <button class="retry-btn" onclick="backToSearch()">返回搜索</button>
            </div>
        `;
    }
    
    // 显示视频播放器
    if (DOMElements.videoPlayer) {
        DOMElements.videoPlayer.style.display = 'block';
        
        // 初始化播放器
        playerModule.initPlayer(DOMElements.videoPlayer);
        
        // 如果有播放地址，开始播放
        if (video.sources && video.sources.length > 0 && video.sources[0].url) {
            playerModule.play(video.sources[0].url);
        }
    }
}

/**
 * 生成剧集按钮
 * @param {Object} video - 视频信息
 * @returns {string} HTML字符串
 */
function generateEpisodeButtons(video) {
    if (!video.sources || video.sources.length === 0) {
        return '<button class="episode-btn active">第1集</button>';
    }
    
    const source = video.sources[0];
    if (!source.episodes || source.episodes.length === 0) {
        return '<button class="episode-btn active">第1集</button>';
    }
    
    return source.episodes.map((episode, index) => `
        <button class="episode-btn ${index === 0 ? 'active' : ''}" 
                onclick="playEpisode(${index})">
            ${episode.name || `第${index + 1}集`}
        </button>
    `).join('');
}

/**
 * 播放指定剧集
 * @param {number} episodeIndex - 剧集索引
 */
function playEpisode(episodeIndex) {
    if (!AppState.currentVideo) return;
    
    const video = AppState.currentVideo;
    if (!video.sources || video.sources.length === 0) return;
    
    const source = video.sources[0];
    if (!source.episodes || source.episodes.length === 0) return;
    
    const episode = source.episodes[episodeIndex];
    if (episode && episode.url) {
        playerModule.play(episode.url);
        
        // 更新剧集按钮状态
        const episodeBtns = document.querySelectorAll('.episode-btn');
        episodeBtns.forEach((btn, index) => {
            btn.classList.toggle('active', index === episodeIndex);
        });
    }
}

/**
 * 返回搜索
 */
function backToSearch() {
    // 隐藏视频详情和播放器
    if (DOMElements.videoDetail) {
        DOMElements.videoDetail.style.display = 'none';
    }
    if (DOMElements.videoPlayer) {
        DOMElements.videoPlayer.style.display = 'none';
        playerModule.destroy();
    }
    
    // 显示搜索结果
    if (DOMElements.searchResults) {
        DOMElements.searchResults.style.display = 'grid';
    }
    
    // 清空当前视频状态
    AppState.currentVideo = null;
    AppState.currentView = 'search';
}

/**
 * 处理下载
 */
function handleDownload() {
    if (!AppState.currentVideo) {
        showError('请先选择要下载的视频');
        return;
    }
    
    const video = AppState.currentVideo;
    console.log(`开始下载: ${video.title}`);
    
    // 获取下载链接
    let downloadUrl = '';
    if (video.sources && video.sources.length > 0) {
        downloadUrl = video.sources[0].url;
    }
    
    if (!downloadUrl) {
        showError('没有可下载的视频源');
        return;
    }
    
    // 开始下载
    downloadModule.startDownload(downloadUrl, `${video.title}.mp4`);
}

/**
 * 处理分享
 */
function handleShare() {
    if (!AppState.currentVideo) {
        showError('请先选择要分享的视频');
        return;
    }
    
    // 显示分享对话框
    shareModule.showShareDialog(AppState.currentVideo);
}

/**
 * 显示搜索历史
 */
function showSearchHistory() {
    const history = searchModule.getHistory();
    if (history.length === 0) return;
    
    // 移除已存在的搜索历史
    hideSearchHistory();
    
    // 创建搜索历史元素
    const historyElement = document.createElement('div');
    historyElement.className = 'search-history';
    historyElement.style.cssText = `
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        background: white;
        border: 1px solid #e0e0e0;
        border-top: none;
        border-radius: 0 0 8px 8px;
        max-height: 300px;
        overflow-y: auto;
        z-index: 100;
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    `;
    
    // 添加标题
    const title = document.createElement('div');
    title.style.cssText = `
        padding: 12px 16px;
        font-size: 14px;
        color: #666;
        border-bottom: 1px solid #e0e0e0;
        display: flex;
        justify-content: space-between;
        align-items: center;
    `;
    title.innerHTML = `
        <span>搜索历史</span>
        <button onclick="clearSearchHistory()" style="background: none; border: none; color: #1a73e8; cursor: pointer; font-size: 12px;">清空</button>
    `;
    historyElement.appendChild(title);
    
    // 添加历史记录
    history.forEach(keyword => {
        const item = document.createElement('div');
        item.style.cssText = `
            padding: 12px 16px;
            cursor: pointer;
            border-bottom: 1px solid #f0f0f0;
            display: flex;
            justify-content: space-between;
            align-items: center;
        `;
        item.innerHTML = `
            <span>${keyword}</span>
            <button onclick="removeFromSearchHistory('${keyword}')" style="background: none; border: none; color: #999; cursor: pointer; font-size: 12px;">×</button>
        `;
        
        item.addEventListener('click', (e) => {
            if (e.target.tagName !== 'BUTTON') {
                DOMElements.searchInput.value = keyword;
                hideSearchHistory();
                handleSearch();
            }
        });
        
        historyElement.appendChild(item);
    });
    
    // 添加到搜索容器
    const searchContainer = document.querySelector('.search-container');
    if (searchContainer) {
        searchContainer.style.position = 'relative';
        searchContainer.appendChild(historyElement);
    }
}

/**
 * 隐藏搜索历史
 */
function hideSearchHistory() {
    const historyElement = document.querySelector('.search-history');
    if (historyElement) {
        historyElement.remove();
    }
}

/**
 * 清空搜索历史
 */
function clearSearchHistory() {
    searchModule.clearHistory();
    hideSearchHistory();
}

/**
 * 从搜索历史中移除
 * @param {string} keyword - 关键词
 */
function removeFromSearchHistory(keyword) {
    searchModule.removeFromHistory(keyword);
    showSearchHistory(); // 刷新显示
}

/**
 * 根据ID加载视频
 * @param {string} videoId - 视频ID
 */
async function loadVideoById(videoId) {
    try {
        console.log(`加载视频: ${videoId}`);
        
        // 这里应该调用API获取视频详情
        // 暂时使用模拟数据
        const mockVideo = {
            id: videoId,
            title: '视频标题',
            cover: 'assets/images/default-cover.jpg',
            description: '视频描述',
            year: '2024',
            type: '电影',
            source: '示例来源',
            sources: [{
                sourceId: 'mock',
                url: '',
                episodes: []
            }]
        };
        
        showVideoDetail(mockVideo);
        
    } catch (error) {
        console.error('加载视频失败:', error);
        showError('加载视频失败');
    }
}

/**
 * 显示加载状态
 */
function showLoading() {
    if (DOMElements.searchResults) {
        DOMElements.searchResults.innerHTML = `
            <div class="loading">
                <div class="loading-spinner"></div>
                <p>正在搜索...</p>
            </div>
        `;
    }
}

/**
 * 显示错误信息
 * @param {string} message - 错误信息
 */
function showError(message) {
    if (DOMElements.searchResults) {
        DOMElements.searchResults.innerHTML = `
            <div class="error">
                <div class="error-icon">⚠️</div>
                <p>${message}</p>
                <button class="retry-btn" onclick="handleSearch()">重试</button>
            </div>
        `;
    }
}

/**
 * 显示空状态
 */
function showEmptyState() {
    if (DOMElements.searchResults) {
        DOMElements.searchResults.innerHTML = `
            <div class="empty">
                <div class="empty-icon">🔍</div>
                <p>未找到相关视频</p>
            </div>
        `;
    }
}

/**
 * 显示成功信息
 * @param {string} message - 成功信息
 */
function showSuccess(message) {
    // 创建临时提示
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background-color: #34a853;
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        z-index: 1000;
        font-size: 14px;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    // 3秒后移除
    setTimeout(() => {
        document.body.removeChild(toast);
    }, 3000);
}

/**
 * 显示欢迎信息
 */
function showWelcomeMessage() {
    if (DOMElements.searchResults) {
        DOMElements.searchResults.innerHTML = `
            <div class="empty">
                <div class="empty-icon">🎬</div>
                <p>欢迎使用免费视频流媒体</p>
                <p style="font-size: 14px; color: #666; margin-top: 8px;">
                    输入关键词开始搜索视频
                </p>
            </div>
        `;
    }
}

// 页面加载完成后初始化应用
document.addEventListener('DOMContentLoaded', initApp);