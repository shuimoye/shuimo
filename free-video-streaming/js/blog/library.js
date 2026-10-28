/* 藏书楼三维博客控制器 */
(function () {
    'use strict';

    var SCRIPT_SRC = (document.currentScript && document.currentScript.src) || window.location.href;
    var SCENE_URL = new URL('library-scene.js', SCRIPT_SRC).href;

    var CATEGORY_ORDER = ['工具', 'AI', '教程', '部署'];
    var CATEGORY_INFO = {
        '工具': { label: '开发工具' },
        'AI': { label: 'AI 大模型' },
        '教程': { label: '技术教程' },
        '部署': { label: '部署指南' }
    };
    var SHORT_TITLES = {
        'monkeycode-review': 'MonkeyCode 体验',
        'agnes-analysis': 'Agnes AI 解析',
        'mimo-analysis': 'MiMo 大模型',
        'mimocode-guide': 'MiMo Code',
        'video-project': '视频站搭建',
        'cloudflare': 'Pages 部署',
        'git-multi': 'Git 多远程'
    };

    var state = {
        module: null,
        scene: null,
        loading: false,
        loaded: false,
        active: false,
        catalog: null,
        loaderGuard: null,
        hoverKey: null,
        focus: 'all'
    };

    var dom = {};

    function cache() {
        dom.section = document.getElementById('blog');
        dom.stage = document.getElementById('libraryStage');
        dom.canvasHost = document.getElementById('libraryCanvas');
        dom.fallback = document.getElementById('libraryFallback');
        dom.loading = document.getElementById('libraryLoading');
        dom.hover = document.getElementById('libraryHover');
        dom.tags = document.getElementById('libraryShelfTags');
        dom.list = document.getElementById('libraryList');
        dom.listBtn = document.getElementById('libraryListBtn');
        dom.back = document.getElementById('libraryBack');
        dom.count = document.getElementById('libraryCount');
    }

    function supportsWebGL() {
        try {
            var canvas = document.createElement('canvas');
            return !!(window.WebGLRenderingContext && (canvas.getContext('webgl2') || canvas.getContext('webgl')));
        } catch (e) {
            return false;
        }
    }

    function extractId(card) {
        var countEl = card.querySelector('[data-article]');
        if (countEl) return countEl.getAttribute('data-article');
        var link = card.querySelector('.blog-link');
        var onclick = link ? link.getAttribute('onclick') || '' : '';
        var match = onclick.match(/'([^']+)'/);
        return match ? match[1] : null;
    }

    function readCatalog() {
        var cards = document.querySelectorAll('#libraryFallback .blog-card');
        var items = [];
        Array.prototype.forEach.call(cards, function (card) {
            var id = extractId(card);
            if (!id) return;
            var titleEl = card.querySelector('.blog-title');
            var dateEl = card.querySelector('.blog-date');
            var category = card.getAttribute('data-category') || '';
            var title = titleEl ? titleEl.textContent.trim() : id;
            var rawDate = dateEl ? dateEl.textContent : '';
            var dateMatch = rawDate.match(/\d{4}-\d{2}-\d{2}/);
            items.push({
                id: id,
                title: title,
                short: SHORT_TITLES[id] || title,
                category: category,
                date: dateMatch ? dateMatch[0] : rawDate.trim()
            });
        });

        var categories = [];
        for (var i = 0; i < CATEGORY_ORDER.length; i++) {
            var key = CATEGORY_ORDER[i];
            for (var j = 0; j < items.length; j++) {
                if (items[j].category === key) {
                    categories.push(key);
                    break;
                }
            }
        }

        return { items: items, categories: categories };
    }

    function categoryLabel(key) {
        return CATEGORY_INFO[key] ? CATEGORY_INFO[key].label : key;
    }

    function buildTags() {
        if (!dom.tags) return;
        var html = '';
        for (var i = 0; i < state.catalog.categories.length; i++) {
            var key = state.catalog.categories[i];
            html += '<button type="button" class="library-shelf-tag" data-shelf="' + key + '" aria-label="进入' + categoryLabel(key) + '书架">' +
                '<span class="library-shelf-tag-label">' + categoryLabel(key) + '</span>' +
                '<em class="library-shelf-tag-count">' + countCategory(key) + '</em>' +
                '</button>';
        }
        dom.tags.innerHTML = html;
        dom.tags.addEventListener('click', function (e) {
            var btn = e.target.closest('.library-shelf-tag');
            if (!btn || !state.scene) return;
            var category = btn.getAttribute('data-shelf');
            state.scene.focusShelf(state.focus === category ? 'all' : category);
        });
    }

    function handlePlaqueLayout(list) {
        if (!dom.tags || !list) return;
        var w = dom.stage ? dom.stage.clientWidth : 0;
        var h = dom.stage ? dom.stage.clientHeight : 0;
        if (!w || !h) return;
        for (var i = 0; i < list.length; i++) {
            var info = list[i];
            var btn = dom.tags.querySelector('.library-shelf-tag[data-shelf="' + info.category + '"]');
            if (!btn) continue;
            var show = info.visible && (state.focus === 'all' || state.focus === info.category);
            btn.classList.toggle('is-hidden', !show);
            if (!show) continue;
            var x = Math.max(50, Math.min(w - 62, info.x));
            var y = Math.max(90, Math.min(h - 110, info.y));
            btn.style.transform = 'translate(' + x.toFixed(1) + 'px, ' + y.toFixed(1) + 'px) translate(-50%, -50%)';
        }
    }

    function buildList() {
        if (!dom.list) return;
        var html = '<div class="library-list-head">' +
            '<div><p class="library-list-kicker">CATALOGUE</p><h3>阁中书目</h3></div>' +
            '<button type="button" class="library-list-close" aria-label="关闭书目">&times;</button>' +
            '</div><div class="library-list-body">';

        for (var i = 0; i < state.catalog.categories.length; i++) {
            var key = state.catalog.categories[i];
            html += '<section class="library-list-group"><h4>' + categoryLabel(key) + '<span>' + countCategory(key) + ' 卷</span></h4><ul>';
            for (var j = 0; j < state.catalog.items.length; j++) {
                var item = state.catalog.items[j];
                if (item.category !== key) continue;
                html += '<li><button type="button" class="library-list-item" data-id="' + item.id + '">' +
                    '<span class="library-list-title">' + escapeHtml(item.title) + '</span>' +
                    '<span class="library-list-meta">' + escapeHtml(item.date) + '</span>' +
                    '</button></li>';
            }
            html += '</ul></section>';
        }
        html += '</div>';
        dom.list.innerHTML = html;

        var closeBtn = dom.list.querySelector('.library-list-close');
        if (closeBtn) closeBtn.addEventListener('click', closeList);

        var entries = dom.list.querySelectorAll('.library-list-item');
        Array.prototype.forEach.call(entries, function (entry) {
            entry.addEventListener('click', function () {
                var id = entry.getAttribute('data-id');
                closeList();
                openArticle(id);
            });
        });
    }

    function countCategory(key) {
        var n = 0;
        for (var i = 0; i < state.catalog.items.length; i++) {
            if (state.catalog.items[i].category === key) n++;
        }
        return n;
    }

    function escapeHtml(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function openList() {
        if (!dom.list) return;
        dom.list.hidden = false;
        requestAnimationFrame(function () {
            dom.list.classList.add('is-open');
        });
        if (dom.listBtn) {
            dom.listBtn.classList.add('is-active');
            dom.listBtn.setAttribute('aria-expanded', 'true');
        }
        if (state.scene) state.scene.clearHover();
    }

    function closeList() {
        if (!dom.list || dom.list.hidden) return;
        dom.list.classList.remove('is-open');
        if (dom.listBtn) {
            dom.listBtn.classList.remove('is-active');
            dom.listBtn.setAttribute('aria-expanded', 'false');
        }
        setTimeout(function () {
            if (dom.list && !dom.list.classList.contains('is-open')) dom.list.hidden = true;
        }, 220);
    }

    function toggleList() {
        if (!dom.list) return;
        if (dom.list.hidden) {
            openList();
        } else {
            closeList();
        }
    }

    function showFallback() {
        if (dom.stage) dom.stage.hidden = true;
        if (dom.fallback) dom.fallback.hidden = false;
        if (dom.loading) dom.loading.classList.add('is-hidden');
        document.body.classList.remove('library-focus');
        document.body.classList.remove('library-in-shelf');
    }

    function hideLoading() {
        if (!dom.loading) return;
        setTimeout(function () {
            dom.loading.classList.add('is-hidden');
        }, 180);
    }

    function loadScene() {
        if (state.loading || state.loaded || !state.catalog) return;
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
            state.module = mod;
            state.scene = mod.createLibrary({
                container: dom.canvasHost,
                catalog: state.catalog,
                onSelect: handleSelect,
                onHover: handleHover,
                onShelfHover: handleShelfHover,
                onShelfFocus: handleShelfFocus,
                onPlaqueLayout: handlePlaqueLayout
            });
            state.loaded = true;
            state.loading = false;
            if (state.active) state.scene.setActive(true);
            hideLoading();
            if (window.innerWidth <= 768 && state.scene) {
                setTimeout(function () { state.scene.resize(); }, 80);
            }
        }).catch(function (err) {
            clearTimeout(state.loaderGuard);
            console.error('藏书楼场景加载失败', err);
            state.loading = false;
            showFallback();
        });
    }

    function handleSelect(item) {
        if (!item || !item.id) return;
        if (state.scene) state.scene.clearHover();
        openArticle(item.id);
    }

    function openArticle(id) {
        if (typeof window.showArticle === 'function') {
            window.showArticle(id);
        }
    }

    function hideHover() {
        if (!dom.hover) return;
        dom.hover.classList.remove('is-visible');
        state.hoverKey = null;
    }

    function showHover(key, html, pos) {
        if (!dom.hover || !pos || !pos.visible) {
            hideHover();
            return;
        }
        if (state.hoverKey !== key) {
            state.hoverKey = key;
            dom.hover.innerHTML = html;
        }
        var left = pos.x + 18;
        var top = pos.y - 44;
        var stageW = dom.stage ? dom.stage.clientWidth : 0;
        var stageH = dom.stage ? dom.stage.clientHeight : 0;
        if (left + 230 > stageW) left = pos.x - 242;
        if (left < 12) left = 12;
        if (top < 12) top = 12;
        if (stageH && top + 92 > stageH) top = stageH - 96;
        dom.hover.style.transform = 'translate(' + left + 'px, ' + top + 'px)';
        dom.hover.classList.add('is-visible');
    }

    function handleHover(item, pos) {
        if (!item || !pos || !pos.visible) {
            hideHover();
            return;
        }
        showHover('book:' + item.id,
            '<strong>' + escapeHtml(item.short || item.title) + '</strong>' +
            '<span>' + escapeHtml(categoryLabel(item.category)) + ' · ' + escapeHtml(item.date) + '</span>' +
            '<em>点击展卷</em>', pos);
    }

    function handleShelfHover(entry, pos) {
        if (!entry || !pos || !pos.visible) {
            hideHover();
            return;
        }
        var active = state.focus === entry.category;
        var meta = active
            ? '<span>再次点击返回全景</span>'
            : '<span>' + (entry.category === 'all' ? '藏书楼全景' : entry.count + ' 卷藏书') + '</span>';
        showHover('shelf:' + entry.category + (active ? ':active' : ''),
            '<strong>' + escapeHtml(entry.label) + '</strong>' +
            meta +
            '<em>' + (active ? '返回全景' : '点击入架') + '</em>', pos);
    }

    function handleShelfFocus(category) {
        state.focus = category || 'all';
        document.body.classList.toggle('library-in-shelf', state.focus !== 'all');
        if (dom.back) dom.back.hidden = state.focus === 'all';
        if (dom.tags) {
            var tags = dom.tags.querySelectorAll('.library-shelf-tag');
            for (var i = 0; i < tags.length; i++) {
                tags[i].classList.toggle('is-active', tags[i].getAttribute('data-shelf') === state.focus);
            }
        }
        hideHover();
    }

    function syncSection(sectionId) {
        var isBlog = sectionId === 'blog';
        if (isBlog) {
            state.active = true;
            document.body.classList.add('library-focus');
            if (!state.loaded) loadScene();
            if (state.scene) state.scene.setActive(true);
            setTimeout(function () {
                if (state.scene && state.active) state.scene.resize();
            }, 80);
        } else {
            state.active = false;
            document.body.classList.remove('library-focus');
            if (state.scene) {
                state.scene.focusShelf('all');
                state.scene.setActive(false);
            }
            state.focus = 'all';
            document.body.classList.remove('library-in-shelf');
            if (dom.back) dom.back.hidden = true;
            hideHover();
            closeList();
        }
    }

    function wrapShowSection() {
        var original = window.showSection;
        if (typeof original !== 'function' || original.__libraryWrapped) return;

        var wrapped = function (sectionId, options) {
            original(sectionId, options);
            syncSection(sectionId);
        };
        wrapped.__libraryWrapped = true;
        window.showSection = wrapped;
    }

    function bind() {
        if (dom.listBtn) dom.listBtn.addEventListener('click', toggleList);
        if (dom.back) {
            dom.back.addEventListener('click', function () {
                if (state.scene) state.scene.focusShelf('all');
            });
        }
        document.addEventListener('pointerdown', function (e) {
            if (!dom.list || dom.list.hidden) return;
            if (dom.list.contains(e.target)) return;
            if (dom.listBtn && (e.target === dom.listBtn || dom.listBtn.contains(e.target))) return;
            closeList();
        }, true);

        document.addEventListener('keydown', function (e) {
            if (e.key !== 'Escape') return;
            var articleModal = document.getElementById('articleModal');
            if (articleModal && articleModal.style.display === 'flex' && typeof window.closeModal === 'function') {
                window.closeModal();
                return;
            }
            if (dom.list && !dom.list.hidden) {
                closeList();
                return;
            }
            if (state.focus !== 'all' && state.scene) state.scene.focusShelf('all');
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

        var articleModal = document.getElementById('articleModal');
        if (articleModal && window.MutationObserver) {
            var observer = new MutationObserver(function () {
                if (!state.scene) return;
                if (articleModal.style.display === 'flex') {
                    state.scene.setActive(false);
                } else if (state.active && !document.hidden) {
                    state.scene.setActive(true);
                }
            });
            observer.observe(articleModal, { attributes: true, attributeFilter: ['style'] });
        }
    }

    function boot() {
        cache();
        if (!dom.section || !dom.stage) return;

        state.catalog = readCatalog();
        if (!state.catalog.items.length) {
            showFallback();
            return;
        }
        if (dom.count) dom.count.textContent = String(state.catalog.items.length);

        wrapShowSection();
        buildTags();
        buildList();
        bind();

        var initial = (window.location.hash || '').replace('#', '');
        if (initial === 'blog' && !dom.section.classList.contains('active')) {
            setTimeout(function () {
                if (dom.section.classList.contains('active')) return;
                if (typeof window.showSection === 'function') {
                    window.showSection('blog', { fromIsland: true, noHash: true });
                }
            }, 0);
        } else if (dom.section.classList.contains('active')) {
            syncSection('blog');
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();
