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
    currentView: 'welcome'
};

// DOM元素缓存
const DOMElements = {
    searchInput: null,
    searchBtn: null,
    searchResults: null,
    videoPlayer: null,
    videoDetail: null
};

/**
 * 初始化应用
 */
function initApp() {
    console.log('初始化免费视频流媒体应用...');
    
    cacheDOMElements();
    bindEvents();
    showWelcomeMessage();
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
    if (DOMElements.searchBtn) {
        DOMElements.searchBtn.addEventListener('click', handleSearch);
    }
    
    if (DOMElements.searchInput) {
        DOMElements.searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleSearch();
            }
        });
        
        DOMElements.searchInput.addEventListener('focus', showSearchHistory);
    }
    
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
        loadVideoById(videoId);
    } else if (keyword) {
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
    showLoading();
    searchModule.addToHistory(keyword);
    
    try {
        const results = await searchModule.search(keyword);
        displaySearchResults(results);
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
    
    DOMElements.searchResults.innerHTML = '';
    
    if (results.length === 0) {
        showEmptyState();
        return;
    }
    
    results.forEach(video => {
        const card = createVideoCard(video);
        DOMElements.searchResults.appendChild(card);
    });
    
    DOMElements.searchResults.style.display = 'grid';
    
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
    card.dataset.sourceId = video.sourceId;
    
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
    
    AppState.currentVideo = video;
    AppState.currentView = 'detail';
    
    if (DOMElements.searchResults) {
        DOMElements.searchResults.style.display = 'none';
    }
    
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
                <div class="episodes" id="episodeList">
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
    
    if (DOMElements.videoPlayer) {
        DOMElements.videoPlayer.style.display = 'block';
        playerModule.initPlayer(DOMElements.videoPlayer);
        
        // 自动播放第一集
        if (video.episodes && video.episodes.length > 0 && video.episodes[0].url) {
            setTimeout(() => {
                playEpisode(0);
            }, 500);
        }
    }
}

/**
 * 生成剧集按钮
 * @param {Object} video - 视频信息
 * @returns {string} HTML字符串
 */
function generateEpisodeButtons(video) {
    if (!video.episodes || video.episodes.length === 0) {
        return '<p style="color: #666;">暂无可用播放源</p>';
    }
    
    return video.episodes.map((episode, index) => `
        <button class="episode-btn ${index === 0 ? 'active' : ''}" 
                onclick="playEpisode(${index})"
                data-url="${episode.url}">
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
    if (!video.episodes || video.episodes.length === 0) return;
    
    const episode = video.episodes[episodeIndex];
    if (episode && episode.url) {
        console.log(`播放: ${episode.name} - ${episode.url}`);
        
        // 更新剧集按钮状态
        const episodeBtns = document.querySelectorAll('.episode-btn');
        episodeBtns.forEach((btn, index) => {
            btn.classList.toggle('active', index === episodeIndex);
        });
        
        // 直接使用iframe嵌入播放页面
        playerModule.play(episode.url);
    }
}

/**
 * 返回搜索
 */
function backToSearch() {
    if (DOMElements.videoDetail) {
        DOMElements.videoDetail.style.display = 'none';
    }
    if (DOMElements.videoPlayer) {
        DOMElements.videoPlayer.style.display = 'none';
        playerModule.destroy();
    }
    
    if (DOMElements.searchResults) {
        DOMElements.searchResults.style.display = 'grid';
    }
    
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
    
    let downloadUrl = '';
    if (video.episodes && video.episodes.length > 0) {
        downloadUrl = video.episodes[0].url;
    }
    
    if (!downloadUrl) {
        showError('没有可下载的视频源');
        return;
    }
    
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
    
    shareModule.showShareDialog(AppState.currentVideo);
}

/**
 * 显示搜索历史
 */
function showSearchHistory() {
    const history = searchModule.getHistory();
    if (history.length === 0) return;
    
    hideSearchHistory();
    
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
    showSearchHistory();
}

/**
 * 根据ID加载视频
 * @param {string} videoId - 视频ID
 */
async function loadVideoById(videoId) {
    try {
        console.log(`加载视频: ${videoId}`);
        showError('暂不支持直接加载视频ID');
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