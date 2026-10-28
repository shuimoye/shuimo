/* 观澜榭 · 三维戏台视频页 */
(function () {
    'use strict';

    var SCRIPT_SRC = (document.currentScript && document.currentScript.src) || window.location.href;
    var SCENE_URL = new URL('theater-scene.js', SCRIPT_SRC).href;

    var state = {
        scene: null,
        loading: false,
        loaded: false,
        active: false,
        flat: false,
        loaderGuard: null,
        syncFrame: 0,
        railAnim: 0
    };

    var dom = {};

    function cache() {
        dom.section = document.getElementById('video');
        dom.stage = document.getElementById('theaterStage');
        dom.canvas = document.getElementById('theaterCanvas');
        dom.loading = document.getElementById('theaterLoading');
        dom.head = document.querySelector('.theater-head');
        dom.search = document.getElementById('theaterSearch');
        dom.input = document.getElementById('searchInput');
        dom.wrap = document.getElementById('theaterResultsWrap');
        dom.results = document.getElementById('searchResults');
        dom.count = document.getElementById('theaterResultCount');
        dom.prev = document.getElementById('theaterPrev');
        dom.next = document.getElementById('theaterNext');
        dom.panel = document.getElementById('theaterPanel');
        dom.detail = document.getElementById('videoDetail');
        dom.player = document.getElementById('videoPlayer');
        dom.panelClose = document.getElementById('theaterPanelClose');
        dom.quick = document.getElementById('theaterQuick');
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
        document.body.classList.add('theater-flat');
        if (dom.stage) dom.stage.classList.add('is-flat');
        if (dom.loading) dom.loading.classList.add('is-hidden');
        if (state.active) document.body.style.overflow = 'auto';
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
            state.scene = mod.createTheater({
                container: dom.canvas
            });
            state.loaded = true;
            state.loading = false;
            if (state.active) {
                state.scene.setActive(true);
            } else {
                state.scene.stop();
            }
            hideLoading();
            if (window.innerWidth <= 768 && state.scene) {
                setTimeout(function () { state.scene.resize(); }, 80);
            }
            syncOverlay();
        }).catch(function (err) {
            clearTimeout(state.loaderGuard);
            console.error('戏台场景加载失败', err);
            state.loading = false;
            showFallback();
            syncOverlay();
        });
    }

    function isDetailOpen() {
        return !!(dom.detail && dom.detail.style.display === 'block') ||
            !!(dom.player && dom.player.style.display === 'block');
    }

    function updateArrows() {
        if (!dom.results || !dom.prev || !dom.next) return;
        var max = dom.results.scrollWidth - dom.results.clientWidth;
        var overflow = max > 4;
        var atStart = dom.results.scrollLeft <= 2;
        var atEnd = dom.results.scrollLeft >= max - 2;
        dom.prev.classList.toggle('is-idle', !overflow || atStart);
        dom.next.classList.toggle('is-idle', !overflow || atEnd);
        dom.prev.disabled = !overflow || atStart;
        dom.next.disabled = !overflow || atEnd;
    }

    function refreshArrows() {
        updateArrows();
        requestAnimationFrame(function () {
            updateArrows();
            requestAnimationFrame(updateArrows);
        });
        setTimeout(updateArrows, 120);
        setTimeout(updateArrows, 420);
    }

    function syncOverlay() {
        if (!dom.results) return;
        var cards = dom.results.querySelectorAll('.video-card').length;
        var stateBlock = dom.results.querySelector('.loading, .error, .empty');
        var isEmptyState = !!dom.results.querySelector('.empty');
        var detailOpen = isDetailOpen();

        dom.results.classList.toggle('is-rail', cards > 0);
        dom.results.classList.toggle('is-state', !!stateBlock);

        if (dom.wrap) {
            var show = (cards > 0 || !!stateBlock) && dom.results.style.display !== 'none' && !detailOpen;
            dom.wrap.hidden = !show;
        }
        if (dom.count) {
            dom.count.textContent = cards > 0 ? '共 ' + cards + ' 出' : '';
        }
        if (dom.quick) {
            dom.quick.hidden = !(isEmptyState && !detailOpen);
        }
        if (dom.panel) {
            dom.panel.classList.toggle('is-open', detailOpen);
        }
        document.body.classList.toggle('theater-detail', detailOpen);
        if (detailOpen && dom.panel) {
            dom.panel.scrollTop = 0;
        }
        refreshArrows();
    }

    function scheduleSync() {
        if (state.syncFrame) return;
        state.syncFrame = requestAnimationFrame(function () {
            state.syncFrame = 0;
            syncOverlay();
        });
    }

    function scrollRail(dir) {
        if (!dom.results) return;
        var el = dom.results;
        var max = el.scrollWidth - el.clientWidth;
        if (max < 5) return;
        var step = Math.max(240, el.clientWidth * 0.72);
        var target = Math.max(0, Math.min(max, el.scrollLeft + dir * step));
        var start = el.scrollLeft;
        var delta = target - start;
        if (Math.abs(delta) < 2) return;
        if (state.railAnim) cancelAnimationFrame(state.railAnim);
        var t0 = 0;
        var duration = Math.min(620, Math.max(280, Math.abs(delta) * 0.55));
        function stepFrame(now) {
            if (!t0) t0 = now;
            var p = Math.min(1, (now - t0) / duration);
            var eased = 1 - Math.pow(1 - p, 3);
            el.scrollLeft = start + delta * eased;
            if (p < 1) {
                state.railAnim = requestAnimationFrame(stepFrame);
            } else {
                state.railAnim = 0;
            }
        }
        state.railAnim = requestAnimationFrame(stepFrame);
    }

    function closePanel() {
        if (typeof window.backToSearch === 'function') {
            window.backToSearch();
        } else {
            if (dom.detail) dom.detail.style.display = 'none';
            if (dom.player) dom.player.style.display = 'none';
            if (dom.results) dom.results.style.display = 'grid';
        }
        syncOverlay();
    }

    function syncSection(sectionId) {
        var isVideo = sectionId === 'video';
        if (isVideo) {
            state.active = true;
            document.body.classList.add('theater-focus');
            document.body.style.overflow = state.flat ? 'auto' : 'hidden';
            if (!state.loaded && !state.flat) loadScene();
            if (state.scene) state.scene.setActive(true);
            setTimeout(function () {
                if (state.scene && state.active) state.scene.resize();
            }, 90);
            syncOverlay();
        } else {
            state.active = false;
            document.body.classList.remove('theater-focus');
            document.body.classList.remove('theater-detail');
            document.body.style.overflow = '';
            if (state.scene) state.scene.setActive(false);
            if (isDetailOpen()) closePanel();
        }
    }

    function wrapShowSection() {
        var original = window.showSection;
        if (typeof original !== 'function' || original.__theaterWrapped) return;

        var wrapped = function (sectionId, options) {
            original(sectionId, options);
            var target = document.getElementById(sectionId);
            if (target && target.classList.contains('active')) {
                syncSection(sectionId);
            }
        };
        wrapped.__theaterWrapped = true;
        window.showSection = wrapped;
    }

    function bind() {
        if (dom.prev) dom.prev.addEventListener('click', function () { scrollRail(-1); });
        if (dom.next) dom.next.addEventListener('click', function () { scrollRail(1); });
        if (dom.panelClose) dom.panelClose.addEventListener('click', closePanel);

        if (dom.results) {
            window.addEventListener('resize', updateArrows);
            dom.results.addEventListener('pointerdown', function () {
                if (state.railAnim) {
                    cancelAnimationFrame(state.railAnim);
                    state.railAnim = 0;
                }
            }, { passive: true });
            if (window.ResizeObserver) {
                new ResizeObserver(updateArrows).observe(dom.results);
            }
            dom.results.addEventListener('scroll', updateArrows, { passive: true });
            dom.results.addEventListener('wheel', function (e) {
                if (dom.results.scrollWidth - dom.results.clientWidth < 5) return;
                if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
                e.preventDefault();
                dom.results.scrollLeft += e.deltaY;
            }, { passive: false });
            dom.results.addEventListener('keydown', function (e) {
                if (e.key === 'ArrowRight') {
                    e.preventDefault();
                    scrollRail(1);
                } else if (e.key === 'ArrowLeft') {
                    e.preventDefault();
                    scrollRail(-1);
                }
            });
        }

        if (dom.input) {
            dom.input.addEventListener('focus', function () {
                document.body.classList.add('theater-typing');
            });
            dom.input.addEventListener('blur', function () {
                document.body.classList.remove('theater-typing');
            });
        }

        if (dom.results) {
            new MutationObserver(scheduleSync).observe(dom.results, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['style', 'class']
            });
        }
        if (dom.detail) {
            new MutationObserver(scheduleSync).observe(dom.detail, {
                attributes: true,
                attributeFilter: ['style', 'class']
            });
        }
        if (dom.player) {
            new MutationObserver(scheduleSync).observe(dom.player, {
                attributes: true,
                attributeFilter: ['style', 'class']
            });
        }

        document.addEventListener('keydown', function (e) {
            if (e.key !== 'Escape') return;
            if (!document.body.classList.contains('theater-focus')) return;
            if (isDetailOpen()) {
                closePanel();
                return;
            }
            if (dom.input && document.activeElement === dom.input) {
                dom.input.blur();
            }
        });

        var resetBtn = document.querySelector('.theater-tool-reset');
        if (resetBtn) {
            resetBtn.addEventListener('click', function () {
                if (isDetailOpen()) closePanel();
                if (dom.results) dom.results.scrollTo({ left: 0, behavior: 'smooth' });
                window.scrollTo(0, 0);
            });
        }

        if (dom.quick) {
            dom.quick.addEventListener('click', function (e) {
                var btn = e.target.closest('button[data-term]');
                if (!btn || !dom.input) return;
                dom.input.value = btn.getAttribute('data-term');
                if (typeof window.handleSearch === 'function') {
                    window.handleSearch();
                } else {
                    var searchBtn = document.getElementById('searchBtn');
                    if (searchBtn) searchBtn.click();
                }
            });
        }

        var homeBtn = document.getElementById('theaterHome');
        if (homeBtn) {
            homeBtn.addEventListener('click', function () {
                if (typeof window.showSection === 'function') {
                    window.showSection('home');
                } else {
                    window.location.hash = 'home';
                }
            });
        }
    }

    function boot() {
        cache();
        if (!dom.section || !dom.stage) return;
        wrapShowSection();
        bind();

        var initial = (window.location.hash || '').replace('#', '');
        if (initial === 'video') {
            document.body.classList.add('away-from-isle');
            setTimeout(function () {
                if (typeof window.showSection === 'function') {
                    window.showSection('video', { fromIsland: true, noHash: true });
                }
            }, 0);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();
