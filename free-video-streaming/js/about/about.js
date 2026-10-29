/* 栖心庐 · 三维书画阁关于页 */
(function () {
    'use strict';

    var SCRIPT_SRC = (document.currentScript && document.currentScript.src) || window.location.href;
    var SCENE_URL = new URL('about-scene.js', SCRIPT_SRC).href;

    var SCROLLS = [
        {
            id: 'self',
            title: '蛙志',
            seal: '蛙',
            sub: '望星的蛙 · 自述',
            cols: ['望星的蛙', 'Vibe Coding 开发者', '技术博主 · 开源爱好者'],
            kicker: '壹卷 · 自述',
            tone: '蛙',
            panel: '' +
                '<p class="about-lede">一名热爱技术的 vibe coding 开发者，专注于 Web 开发与开源项目。喜欢探索新技术，把学习心得写成文字，愿这座小庐能让更多人看见技术的趣味。</p>' +
                '<div class="about-facts">' +
                '<div class="about-fact"><span>名号</span><strong>望星的蛙</strong></div>' +
                '<div class="about-fact"><span>身份</span><strong>Vibe Coding 开发者 / 技术博主 / 开源爱好者</strong></div>' +
                '</div>' +
                '<p>大家好，我是望星的蛙，一个对技术充满热情的 vibe coding 开发者。这个博客，是我在日常开发之外留下的一点墨迹。</p>'
        },
        {
            id: 'share',
            title: '所好',
            seal: '好',
            sub: '庐中所书',
            cols: ['技术教程 · 开发心得', '开源项目 · 工具推荐', '视频资源 · 娱乐内容', '生活感悟 · 技术思考'],
            kicker: '贰卷 · 所好',
            tone: '好',
            panel: '' +
                '<p class="about-lede">庐中四壁，挂的都是平日记下的东西。若你也对技术感兴趣，尽可取了去看。</p>' +
                '<ul class="about-list about-list-brush">' +
                '<li>技术教程与开发心得</li>' +
                '<li>开源项目与工具推荐</li>' +
                '<li>视频资源与娱乐内容</li>' +
                '<li>生活感悟与技术思考</li>' +
                '</ul>' +
                '<p>笔墨尚浅，仍在日日添补。欢迎来信，与我交换一纸心得。</p>'
        },
        {
            id: 'craft',
            title: '技艺',
            seal: '艺',
            sub: '案头所用',
            cols: ['前端 · HTML5 CSS3', 'Vue React', '后端 · Node Python', 'Go Java', '其他 · Git Docker', 'Linux MySQL'],
            kicker: '叁卷 · 技艺',
            tone: '艺',
            panel: '' +
                '<p class="about-lede">案头所备，常在手边的几样工具。谈不上精熟，够用，也够好玩。</p>' +
                '<div class="about-skills">' +
                '<section><h4>前端开发</h4><div class="about-tags"><span>HTML5</span><span>CSS3</span><span>JavaScript</span><span>Vue.js</span><span>React</span></div></section>' +
                '<section><h4>后端开发</h4><div class="about-tags"><span>Node.js</span><span>Python</span><span>Go</span><span>Java</span></div></section>' +
                '<section><h4>其他技能</h4><div class="about-tags"><span>Git</span><span>Docker</span><span>Linux</span><span>MySQL</span></div></section>' +
                '</div>'
        },
        {
            id: 'contact',
            title: '交游',
            seal: '交',
            sub: '往来之门',
            cols: ['GitHub · shuimoye', 'Gitee · gx95', '项目网盘', 'QQ · 743162884'],
            kicker: '肆卷 · 交游',
            tone: '交',
            panel: '' +
                '<p class="about-lede">庐门常开。不论旧识新交，愿意聊聊技术，都可从下面几处寻我。</p>' +
                '<div class="about-contacts">' +
                '<a href="https://github.com/shuimoye" target="_blank" rel="noopener"><span>GitHub</span><em>github.com/shuimoye</em></a>' +
                '<a href="https://gitee.com/gx95" target="_blank" rel="noopener"><span>Gitee</span><em>gitee.com/gx95</em></a>' +
                '<a href="https://pan.baidu.com/s/1QSP4ItYw4rBGgfC-pcL4Ng" target="_blank" rel="noopener"><span>Vibe Coding 项目网盘</span><em>pan.baidu.com</em></a>' +
                '<div class="about-contact-static"><span>QQ</span><em>743162884</em></div>' +
                '</div>'
        },
        {
            id: 'heart',
            title: '心语',
            seal: '心',
            sub: '灯下数语',
            cols: ['代码改变世界', '开源创造未来', '若有所得 · 点赞分享关注'],
            kicker: '伍卷 · 心语',
            tone: '心',
            panel: '' +
                '<blockquote class="about-quote-brush">代码改变世界，开源创造未来。</blockquote>' +
                '<p>若这里的内容对你有用，欢迎点赞、分享、关注。一盏灯也要有人添油，才亮得久些。</p>' +
                '<div class="about-stats">' +
                '<div><strong>7</strong><span>技术文章</span></div>' +
                '<div><strong>10+</strong><span>视频资源</span></div>' +
                '<div><strong>2</strong><span>开源项目</span></div>' +
                '</div>' +
                '<a class="about-star" href="https://github.com/shuimoye" target="_blank" rel="noopener">在 GitHub 点一颗星</a>'
        }
    ];

    var state = {
        scene: null,
        loading: false,
        loaded: false,
        active: false,
        flat: false,
        focused: null,
        panelOpen: false,
        loaderGuard: null
    };

    var dom = {};

    function cache() {
        dom.section = document.getElementById('about');
        dom.stage = document.getElementById('aboutStage');
        dom.canvas = document.getElementById('aboutCanvas');
        dom.fallback = document.getElementById('aboutFallback');
        dom.loading = document.getElementById('aboutLoading');
        dom.hover = document.getElementById('aboutHover');
        dom.head = document.querySelector('.about-head');
        dom.tools = document.querySelector('.about-tools');
        dom.back = document.getElementById('aboutBack');
        dom.panel = document.getElementById('aboutPanel');
        dom.panelBody = document.getElementById('aboutPanelBody');
        dom.panelClose = document.getElementById('aboutPanelClose');
        dom.home = document.getElementById('aboutHome');
    }

    function supportsWebGL() {
        try {
            var canvas = document.createElement('canvas');
            return !!(window.WebGLRenderingContext && (canvas.getContext('webgl2') || canvas.getContext('webgl')));
        } catch (e) {
            return false;
        }
    }

    function showFallback() {
        state.flat = true;
        document.body.classList.add('about-flat');
        if (dom.stage) dom.stage.hidden = true;
        if (dom.fallback) dom.fallback.hidden = false;
        if (dom.loading) dom.loading.classList.add('is-hidden');
        document.body.classList.remove('about-reading');
        document.body.style.overflow = '';
    }

    function hideLoading() {
        if (!dom.loading) return;
        setTimeout(function () {
            dom.loading.classList.add('is-hidden');
        }, 200);
    }

    function loadScene() {
        if (state.loading || state.loaded) return;
        state.loading = true;

        state.loaderGuard = setTimeout(function () {
            if (dom.loading) dom.loading.classList.add('is-hidden');
        }, 12000);

        if (!supportsWebGL()) {
            clearTimeout(state.loaderGuard);
            state.loading = false;
            showFallback();
            return;
        }

        import(SCENE_URL).then(function (mod) {
            clearTimeout(state.loaderGuard);
            state.scene = mod.createHermitage({
                container: dom.canvas,
                scrolls: SCROLLS,
                onHover: handleHover,
                onSelect: openScroll
            });
            state.loaded = true;
            state.loading = false;
            if (state.active) {
                state.scene.setActive(true);
                state.scene.enter();
            } else {
                state.scene.stop();
            }
            hideLoading();
            if (window.innerWidth <= 768 && state.scene) {
                setTimeout(function () { state.scene.resize(); }, 90);
            }
        }).catch(function (err) {
            clearTimeout(state.loaderGuard);
            console.error('栖心庐场景加载失败', err);
            state.loading = false;
            showFallback();
        });
    }

    function findScroll(id) {
        for (var i = 0; i < SCROLLS.length; i++) {
            if (SCROLLS[i].id === id) return SCROLLS[i];
        }
        return null;
    }

    function hideHover() {
        if (!dom.hover) return;
        dom.hover.classList.remove('is-visible');
    }

    function handleHover(info, pos) {
        if (!dom.hover || !info || !pos || !pos.visible) {
            hideHover();
            return;
        }
        dom.hover.innerHTML = '<strong>' + info.title + '</strong><span>' + info.sub + '</span><em>点击展卷</em>';
        var left = pos.x + 18;
        var top = pos.y - 52;
        var stageW = dom.stage ? dom.stage.clientWidth : 0;
        var stageH = dom.stage ? dom.stage.clientHeight : 0;
        if (left + 210 > stageW) left = pos.x - 222;
        if (left < 12) left = 12;
        if (top < 12) top = 12;
        if (stageH && top + 96 > stageH) top = stageH - 100;
        dom.hover.style.transform = 'translate(' + left + 'px, ' + top + 'px)';
        dom.hover.classList.add('is-visible');
    }

    function renderPanel(info) {
        if (!dom.panelBody) return;
        dom.panelBody.innerHTML =
            '<p class="about-panel-kicker">' + info.kicker + '</p>' +
            '<h3 class="about-panel-title">' + info.title + '</h3>' +
            '<p class="about-panel-sub">' + info.sub + '</p>' +
            '<div class="about-panel-content">' + info.panel + '</div>';
    }

    function openScroll(id) {
        var info = findScroll(id);
        if (!info) return;
        hideHover();
        state.focused = id;
        state.panelOpen = true;
        if (state.scene) {
            state.scene.clearHover();
            state.scene.focusScroll(id);
            state.scene.setPanelOpen(true);
        }
        renderPanel(info);
        if (dom.panel) dom.panel.classList.add('is-open');
        document.body.classList.add('about-reading');
        if (dom.back) dom.back.hidden = false;
        if (dom.panel) dom.panel.scrollTop = 0;
    }

    function closePanel() {
        if (!state.panelOpen) return;
        state.panelOpen = false;
        if (dom.panel) dom.panel.classList.remove('is-open');
        document.body.classList.remove('about-reading');
        if (state.scene) state.scene.setPanelOpen(false);
    }

    function showAll() {
        state.focused = null;
        closePanel();
        if (state.scene) state.scene.showAll();
        if (dom.back) dom.back.hidden = true;
        hideHover();
    }

    function syncSection(sectionId) {
        var isAbout = sectionId === 'about';
        if (isAbout) {
            state.active = true;
            document.body.classList.add('about-focus');
            document.body.style.overflow = state.flat ? 'auto' : 'hidden';
            if (!state.loaded && !state.flat) loadScene();
            if (state.scene) {
                state.scene.setActive(true);
                state.scene.enter();
            }
            if (dom.back) dom.back.hidden = !state.focused;
        } else {
            state.active = false;
            document.body.classList.remove('about-focus');
            document.body.classList.remove('about-reading');
            document.body.style.overflow = '';
            state.panelOpen = false;
            state.focused = null;
            if (dom.panel) dom.panel.classList.remove('is-open');
            if (dom.back) dom.back.hidden = true;
            if (state.scene) state.scene.setActive(false);
            hideHover();
        }
    }

    function wrapShowSection() {
        var original = window.showSection;
        if (typeof original !== 'function' || original.__aboutWrapped) return;

        var wrapped = function (sectionId, options) {
            original(sectionId, options);
            var target = document.getElementById(sectionId);
            if (target && target.classList.contains('active')) {
                syncSection(sectionId);
            }
        };
        wrapped.__aboutWrapped = true;
        window.showSection = wrapped;
    }

    function bind() {
        if (dom.back) {
            dom.back.addEventListener('click', showAll);
        }
        if (dom.panelClose) {
            dom.panelClose.addEventListener('click', closePanel);
        }
        if (dom.home) {
            dom.home.addEventListener('click', function () {
                if (typeof window.showSection === 'function') {
                    window.showSection('home');
                } else {
                    window.location.hash = 'home';
                }
            });
        }

        document.addEventListener('keydown', function (e) {
            if (e.key !== 'Escape') return;
            if (!document.body.classList.contains('about-focus')) return;
            if (state.panelOpen) {
                closePanel();
                return;
            }
            if (state.focused) showAll();
        });

        window.addEventListener('resize', function () {
            if (state.active && state.scene) state.scene.resize();
        });

        document.addEventListener('visibilitychange', function () {
            if (!state.scene) return;
            if (document.hidden) {
                state.scene.setActive(false);
            } else if (state.active) {
                state.scene.setActive(true);
            }
        });
    }

    function boot() {
        cache();
        if (!dom.section || !dom.stage) return;
        wrapShowSection();
        bind();

        var initial = (window.location.hash || '').replace('#', '');
        if (initial === 'about') {
            document.body.classList.add('away-from-isle');
            setTimeout(function () {
                if (typeof window.showSection === 'function') {
                    window.showSection('about', { fromIsland: true, noHash: true });
                }
            }, 0);
        } else if (dom.section.classList.contains('active')) {
            syncSection('about');
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();
