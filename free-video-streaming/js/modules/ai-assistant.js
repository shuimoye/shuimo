/**
 * AI 助手模块
 * 提供博客内容介绍和对话功能
 */

const AIAssistant = (() => {
    let isOpen = false;
    let isLoading = false;
    let messages = [];
    
    // 博客内容介绍
    const blogIntro = `欢迎来到望星的蛙的个人博客！

这里是博客的主要内容：

【首页】- 个人介绍页面
- 展示博主基本信息和社交媒体链接
- GitHub: github.com/shuimoye
- Gitee: gitee.com/gx95

【博客】- 技术文章分享
- 搭建免费视频流媒体网站
- Cloudflare Pages 部署指南
- Git 多远程仓库管理

【视频】- 免费视频搜索与播放
- 支持多个视频源搜索
- 自动选择最佳视频源
- 支持下载和分享功能

【关于】- 博主介绍和技术栈
- 热爱技术，热爱生活
- 技术栈：HTML, CSS, JavaScript, Git, Node.js, Python

有什么想了解的，随时问我！`;
    
    // 初始化
    const init = () => {
        createChatUI();
        bindEvents();
    };
    
    // 创建聊天 UI
    const createChatUI = () => {
        const chatHTML = `
            <div id="aiChatWidget" class="ai-chat-widget">
                <button id="aiChatToggle" class="ai-chat-toggle">
                    <span class="ai-chat-icon">🤖</span>
                    <span class="ai-chat-badge">1</span>
                </button>
                <div id="aiChatBox" class="ai-chat-box" style="display: none;">
                    <div class="ai-chat-header">
                        <span>AI 助手</span>
                        <button id="aiChatClose" class="ai-chat-close">&times;</button>
                    </div>
                    <div id="aiChatMessages" class="ai-chat-messages">
                        <div class="ai-message ai-message-bot">
                            <div class="ai-message-content">
                                ${blogIntro.replace(/\n/g, '<br>')}
                            </div>
                        </div>
                    </div>
                    <div class="ai-chat-input-area">
                        <input type="text" id="aiChatInput" class="ai-chat-input" placeholder="输入问题...">
                        <button id="aiChatSend" class="ai-chat-send">发送</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', chatHTML);
    };
    
    // 绑定事件
    const bindEvents = () => {
        document.getElementById('aiChatToggle').addEventListener('click', toggleChat);
        document.getElementById('aiChatClose').addEventListener('click', toggleChat);
        document.getElementById('aiChatSend').addEventListener('click', sendMessage);
        document.getElementById('aiChatInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendMessage();
        });
    };
    
    // 切换聊天框显示
    const toggleChat = () => {
        const chatBox = document.getElementById('aiChatBox');
        const badge = document.querySelector('.ai-chat-badge');
        
        isOpen = !isOpen;
        chatBox.style.display = isOpen ? 'flex' : 'none';
        badge.style.display = isOpen ? 'none' : 'flex';
    };
    
    // 发送消息
    const sendMessage = async () => {
        const input = document.getElementById('aiChatInput');
        const message = input.value.trim();
        
        if (!message || isLoading) return;
        
        // 添加用户消息
        addMessage(message, 'user');
        input.value = '';
        
        // 显示加载状态
        isLoading = true;
        const loadingId = addMessage('思考中...', 'bot', true);
        
        try {
            // 调用 AI API
            const response = await callAI(message);
            
            // 移除加载消息，添加回复
            removeMessage(loadingId);
            addMessage(response, 'bot');
        } catch (error) {
            removeMessage(loadingId);
            addMessage('抱歉，暂时无法回答。请稍后再试。', 'bot');
            console.error('AI API Error:', error);
        } finally {
            isLoading = false;
        }
    };
    
    // 调用 AI API
    const callAI = async (userMessage) => {
        const config = AISecureConfig;
        
        const systemPrompt = `你是望星的蛙的个人博客AI助手。你的职责是：
1. 介绍博客的内容和功能
2. 回答关于博客技术实现的问题
3. 帮助用户了解博客的各个板块

博客包含以下内容：
- 首页：个人介绍
- 博客：技术文章（视频流媒体搭建、Cloudflare Pages部署、Git多远程仓库管理）
- 视频：免费视频搜索与播放功能
- 关于：博主介绍和技术栈

请用友好、专业的语气回答问题。如果问题超出博客范围，礼貌地引导用户关注博客相关内容。`;
        
        const response = await fetch(config.endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.apiKey}`
            },
            body: JSON.stringify({
                model: config.model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    ...messages.slice(-10).map(m => ({
                        role: m.role,
                        content: m.content
                    })),
                    { role: 'user', content: userMessage }
                ],
                temperature: 0.7,
                max_tokens: 500
            })
        });
        
        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }
        
        const data = await response.json();
        return data.choices[0].message.content;
    };
    
    // 添加消息
    const addMessage = (content, role, isLoading = false) => {
        const messagesContainer = document.getElementById('aiChatMessages');
        const messageId = 'msg-' + Date.now();
        
        const messageHTML = `
            <div id="${messageId}" class="ai-message ai-message-${role} ${isLoading ? 'ai-message-loading' : ''}">
                <div class="ai-message-content">
                    ${content.replace(/\n/g, '<br>')}
                </div>
            </div>
        `;
        
        messagesContainer.insertAdjacentHTML('beforeend', messageHTML);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
        if (!isLoading) {
            messages.push({ role, content });
        }
        
        return messageId;
    };
    
    // 移除消息
    const removeMessage = (messageId) => {
        const message = document.getElementById(messageId);
        if (message) message.remove();
    };
    
    return { init };
})();

// 页面加载后初始化 AI 助手
document.addEventListener('DOMContentLoaded', AIAssistant.init);