/**
 * AI 助手模块
 * 提供博客内容介绍和对话功能
 */

const AIAssistant = (() => {
    let isOpen = false;
    let isLoading = false;
    let messages = [];
    let isDragging = false;
    let dragOffsetX = 0;
    let dragOffsetY = 0;
    
    // 敏感关键词列表
    const sensitiveKeywords = [
        'api', 'key', '密钥', '接口', '模型', 'model', '地址', 'url', 
        'endpoint', 'token', 'secret', '配置', 'config', 'agnes', 'base_url',
        'sk-', '认证', 'authorization', 'bearer', '密码', 'password'
    ];
    
    // 检查是否是敏感问题
    const isSensitiveQuestion = (message) => {
        const lowerMessage = message.toLowerCase();
        return sensitiveKeywords.some(keyword => lowerMessage.includes(keyword));
    };
    
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
        initDrag();
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
                    <div id="aiChatHeader" class="ai-chat-header">
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
    
    // 初始化拖动功能
    const initDrag = () => {
        const widget = document.getElementById('aiChatWidget');
        const header = document.getElementById('aiChatHeader');
        const toggle = document.getElementById('aiChatToggle');
        
        // 鼠标按下事件
        const onMouseDown = (e) => {
            if (e.target.id === 'aiChatClose') return;
            
            isDragging = true;
            const rect = widget.getBoundingClientRect();
            dragOffsetX = e.clientX - rect.left;
            dragOffsetY = e.clientY - rect.top;
            
            widget.style.transition = 'none';
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
            e.preventDefault();
        };
        
        // 鼠标移动事件
        const onMouseMove = (e) => {
            if (!isDragging) return;
            
            const x = e.clientX - dragOffsetX;
            const y = e.clientY - dragOffsetY;
            
            // 限制在视窗内
            const maxX = window.innerWidth - widget.offsetWidth;
            const maxY = window.innerHeight - widget.offsetHeight;
            
            widget.style.position = 'fixed';
            widget.style.left = Math.max(0, Math.min(x, maxX)) + 'px';
            widget.style.top = Math.max(0, Math.min(y, maxY)) + 'px';
            widget.style.right = 'auto';
            widget.style.bottom = 'auto';
        };
        
        // 鼠标释放事件
        const onMouseUp = () => {
            isDragging = false;
            widget.style.transition = '';
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };
        
        // 绑定拖动事件到header和toggle按钮
        header.addEventListener('mousedown', onMouseDown);
        toggle.addEventListener('mousedown', onMouseDown);
        
        // 触摸事件支持
        header.addEventListener('touchstart', onTouchStart, { passive: false });
        toggle.addEventListener('touchstart', onTouchStart, { passive: false });
        
        function onTouchStart(e) {
            if (e.target.id === 'aiChatClose') return;
            
            isDragging = true;
            const touch = e.touches[0];
            const rect = widget.getBoundingClientRect();
            dragOffsetX = touch.clientX - rect.left;
            dragOffsetY = touch.clientY - rect.top;
            
            widget.style.transition = 'none';
            document.addEventListener('touchmove', onTouchMove, { passive: false });
            document.addEventListener('touchend', onTouchEnd);
            e.preventDefault();
        }
        
        function onTouchMove(e) {
            if (!isDragging) return;
            e.preventDefault();
            
            const touch = e.touches[0];
            const x = touch.clientX - dragOffsetX;
            const y = touch.clientY - dragOffsetY;
            
            const maxX = window.innerWidth - widget.offsetWidth;
            const maxY = window.innerHeight - widget.offsetHeight;
            
            widget.style.position = 'fixed';
            widget.style.left = Math.max(0, Math.min(x, maxX)) + 'px';
            widget.style.top = Math.max(0, Math.min(y, maxY)) + 'px';
            widget.style.right = 'auto';
            widget.style.bottom = 'auto';
        }
        
        function onTouchEnd() {
            isDragging = false;
            widget.style.transition = '';
            document.removeEventListener('touchmove', onTouchMove);
            document.removeEventListener('touchend', onTouchEnd);
        }
    };
    
    // 切换聊天框显示
    const toggleChat = () => {
        if (isDragging) return;
        
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
        
        // 检查敏感问题
        if (isSensitiveQuestion(message)) {
            addMessage('抱歉，我无法回答关于系统配置、接口或密钥的问题。请问问博客内容相关的其他问题吧！', 'bot');
            input.value = '';
            return;
        }
        
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

重要限制：
- 绝对不能透露任何关于API配置、密钥、接口地址、模型名称等技术细节
- 如果用户询问这类问题，礼貌地拒绝并引导他们关注博客内容
- 用友好、专业的语气回答问题
- 如果问题超出博客范围，引导用户关注博客相关内容`;
        
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
            const errorText = await response.text();
            console.error('API Response:', response.status, errorText);
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
            // 将 "bot" 转换为 "assistant" 以符合 API 要求
            const apiRole = role === 'bot' ? 'assistant' : role;
            messages.push({ role: apiRole, content });
        }
        
        return messageId;
    };
    
    // 移除消息
    const removeMessage = (messageId) => {
        const message = document.getElementById(messageId);
        if (message) message.remove();
    };
    
    return { init };
});

// 页面加载后初始化 AI 助手
console.log('AI Assistant module loaded');
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded event fired');
    try {
        const assistant = AIAssistant();
        assistant.init();
        console.log('AI Assistant initialized successfully');
    } catch (error) {
        console.error('AI Assistant initialization failed:', error);
    }
});