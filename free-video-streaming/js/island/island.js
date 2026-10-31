/* 浮空孤岛首页控制器 */
(function () {
    'use strict';

    var SCRIPT_SRC = (document.currentScript && document.currentScript.src) || window.location.href;
    var SCENE_URL = new URL('scene.js', SCRIPT_SRC).href;

    var ROOM_INFO = {
        home: {
            order: '序',
            kicker: 'OVERLOOK',
            name: '望星台',
            target: 'home',
            enterLabel: '环岛远眺',
            desc: '孤岛之主亭，四面临风。凭栏可俯瞰云海与整座岛屿，是归返与启程的地方。',
            meta: ['岛屿中枢', '全景视角', '随时归来']
        },
        blog: {
            order: '壹',
            kicker: 'THE STUDY',
            name: '文渊阁',
            target: 'blog',
            enterLabel: '入阁阅文',
            desc: '双层飞檐的书阁，藏有技术随笔与工程笔记。推门而入，可见分类书架与文章详情。',
            meta: ['技术文章', '学习笔记', '持续更新']
        },
        video: {
            order: '贰',
            kicker: 'THE PAVILION',
            name: '观澜榭',
            target: 'video',
            enterLabel: '临水观澜',
            desc: '临水而建的水榭，栈桥探入湖心。此处可搜片、可播放、可下载，风过水面便起涟漪。',
            meta: ['视频搜索', '在线播放', '资源下载']
        },
        about: {
            order: '叁',
            kicker: 'THE HERMITAGE',
            name: '栖心庐',
            target: 'about',
            enterLabel: '推门入庐',
            desc: '竹影掩映的小庐，主人日常起居之处。关于我、联系方式与支持方式，都收在这一室灯火里。',
            meta: ['关于站长', '联系方式', '支持小屋']
        },
        'ai-town': {
            order: '肆',
            kicker: 'THE TOWN',
            name: '问道镇',
            target: 'ai-town',
            href: 'ai-town/index.html',
            enterLabel: '入镇寻仙',
            desc: '大模型驱动的修仙小镇，NPC 各有决策、彼此平权。镇中可修炼、建造、交易与对话，AI 对话需自备 Key。',
            meta: ['修仙世界', 'NPC 自主', '自备 Key']
        }
    };

    var state = {
        scene: null,
        module: null,
        loading: false,
        loaded: false,
        modalRoom: null,
        lastFocusedRoom: null,
        transitionTimer: null,
        loaderGuard: null
    };

    var dom = {};

    function cache() {
        dom.section = document.getElementById('home');
        dom.canvasHost = document.getElementById('islandCanvas');
        dom.loading = document.getElementById('islandLoading');
        dom.fallback = document.getElementById('islandFallback');
        dom.label = document.getElementById('islandHoverLabel');
        dom.modal = document.getElementById('roomModal');
        dom.modalBackdrop = dom.modal ? dom.modal.querySelector('.room-modal-backdrop') : null;
        dom.modalClose = dom.modal ? dom.modal.querySelector('.room-modal-close') : null;
        dom.modalKicker = document.getElementById('roomModalKicker');
        dom.modalTitle = document.getElementById('roomModalTitle');
        dom.modalDesc = document.getElementById('roomModalDesc');
        dom.modalMeta = document.getElementById('roomModalMeta');
        dom.enter = document.getElementById('roomEnter');
        dom.later = document.getElementById('roomLater');
        dom.transition = document.getElementById('islandTransition');
        dom.returnBtn = document.getElementById('returnIsle');
    }

    function supportsWebGL() {
        try {
            var canvas = document.createElement('canvas');
            return !!(window.WebGLRenderingContext && (canvas.getContext('webgl2') || canvas.getContext('webgl')));
        } catch (e) {
            return false;
        }
    }

    function loadScene() {
        if (state.loading || state.loaded) return;
        state.loading = true;
        state.loaderGuard = setTimeout(function () {
            if (dom.loading) dom.loading.classList.add('is-hidden');
        }, 12000);

        if (!supportsWebGL()) {
            showFallback();
            return;
        }

        import(SCENE_URL).then(function (mod) {
            clearTimeout(state.loaderGuard);
            state.module = mod;
            state.scene = mod.createIsland({
                container: dom.canvasHost,
                onSelect: handleRoomSelect,
                onHover: handleRoomHover
            });
            state.scene.start();
            state.loaded = true;
            state.loading = false;
            if (dom.loading) {
                setTimeout(function () {
                    dom.loading.classList.add('is-hidden');
                }, 220);
            }
            if (window.innerWidth <= 768) {
                state.scene.resetFocus();
            }
        }).catch(function (err) {
            clearTimeout(state.loaderGuard);
            console.error('孤岛场景加载失败', err);
            state.loading = false;
            showFallback();
        });
    }

    function showFallback() {
        if (dom.fallback) dom.fallback.hidden = false;
        if (dom.loading) dom.loading.classList.add('is-hidden');
        document.body.classList.add('island-active');
    }

    function enterIsland() {
        document.body.classList.add('island-active');
        document.body.classList.remove('away-from-isle');
        if (!state.loaded) loadScene();
        if (state.scene) state.scene.setActive(true);
        if (window.innerWidth > 768) {
            setTimeout(function () {
                if (state.scene) state.scene.resize();
            }, 60);
        }
    }

    function leaveIsland(targetSection) {
        document.body.classList.remove('island-active');
        document.body.classList.toggle('away-from-isle', targetSection !== 'home');
        if (state.scene) state.scene.setActive(false);
        closeModal(true);
    }

    function handleRoomSelect(roomId) {
        openModal(roomId);
    }

    function handleRoomHover(roomId, pos) {
        if (!dom.label) return;
        if (!roomId || !pos || !pos.visible) {
            dom.label.classList.remove('is-visible');
            return;
        }
        var info = ROOM_INFO[roomId];
        if (!info) return;
        dom.label.innerHTML = info.name + '<small>' + info.kicker + '</small>';
        var host = dom.canvasHost;
        var left = pos.x + 18;
        var top = pos.y - 16;
        if (left + 150 > host.clientWidth) left = pos.x - 158;
        if (top < 8) top = 8;
        dom.label.style.transform = 'translate(' + left + 'px, ' + top + 'px)';
        dom.label.classList.add('is-visible');
    }

    function openModal(roomId) {
        var info = ROOM_INFO[roomId];
        if (!info || !dom.modal) return;
        state.modalRoom = roomId;
        dom.modalKicker.textContent = info.order + ' · ' + info.kicker;
        dom.modalTitle.textContent = info.name;
        dom.modalDesc.textContent = info.desc;
        dom.modalMeta.innerHTML = info.meta.map(function (m) { return '<span>' + m + '</span>'; }).join('<i></i>');
        dom.enter.textContent = info.enterLabel;
        dom.modal.hidden = false;
        document.body.style.overflow = 'hidden';
        if (dom.label) dom.label.classList.remove('is-visible');
        if (state.scene && roomId !== 'home') state.scene.focusRoom(roomId);
        setTimeout(function () {
            if (dom.enter) dom.enter.focus({ preventScroll: true });
        }, 80);
    }

    function closeModal(silent) {
        if (!dom.modal || dom.modal.hidden) return;
        dom.modal.hidden = true;
        if (document.body.classList.contains('away-from-isle')) {
            document.body.style.overflow = 'auto';
        } else {
            document.body.style.overflow = '';
        }
        var room = state.modalRoom;
        state.modalRoom = null;
        if (!silent && state.scene) {
            state.scene.resetFocus();
        }
    }

    function runTransition(label, done) {
        if (!dom.transition) {
            done();
            return;
        }
        var span = dom.transition.querySelector('span');
        if (span) span.textContent = label;
        dom.transition.classList.add('is-active');
        clearTimeout(state.transitionTimer);
        state.transitionTimer = setTimeout(function () {
            done();
            setTimeout(function () {
                if (dom.transition) dom.transition.classList.remove('is-active');
            }, 260);
        }, 560);
    }

    function enterRoom() {
        var roomId = state.modalRoom;
        var info = ROOM_INFO[roomId];
        if (!info) return;
        closeModal(true);
        document.body.style.overflow = 'auto';

        if (info.href) {
            runTransition('入 · ' + info.name, function () {
                window.location.href = new URL(info.href, window.location.href).href;
            });
            return;
        }

        if (roomId === 'home') {
            if (state.scene) state.scene.resetFocus();
            document.body.style.overflow = '';
            return;
        }

        runTransition('入 · ' + info.name, function () {
            navigate(info.target);
        });
    }

    function navigate(sectionId) {
        if (typeof window.showSection === 'function') {
            window.showSection(sectionId, { fromIsland: true });
        } else {
            window.location.hash = sectionId;
        }
    }

    function goHomeIsland() {
        if (window.location.hash === '#home' || window.location.hash === '') {
            if (typeof window.showSection === 'function') window.showSection('home');
        } else {
            window.location.hash = 'home';
        }
    }

    function syncWithSection(sectionId) {
        if (sectionId === 'home') {
            enterIsland();
        } else {
            leaveIsland(sectionId);
        }
    }

    function wrapShowSection() {
        var original = window.showSection;
        if (typeof original !== 'function' || original.__islandWrapped) return;

        var wrapped = function (sectionId, options) {
            var opts = options || {};
            if (!opts.fromIsland && (sectionId === 'blog' || sectionId === 'video' || sectionId === 'about')) {
                if (document.body.classList.contains('island-active') || sectionId === 'home') {
                    openModal(sectionId);
                    return;
                }
            }
            original(sectionId);
            syncWithSection(sectionId);
            if (!opts.noHash) {
                var hash = '#' + sectionId;
                if (window.location.hash !== hash) {
                    try {
                        history.replaceState(null, '', hash);
                    } catch (e) {
                        window.location.hash = sectionId;
                    }
                }
            }
            window.scrollTo(0, 0);
        };
        wrapped.__islandWrapped = true;
        window.showSection = wrapped;
    }

    function bind() {
        var cards = document.querySelectorAll('.island-room-card');
        Array.prototype.forEach.call(cards, function (card) {
            card.addEventListener('click', function () {
                var roomId = card.getAttribute('data-room');
                if (roomId) {
                    if (state.scene) state.scene.focusRoom(roomId);
                    openModal(roomId);
                }
            });
        });

        var fallbackActions = document.querySelectorAll('[data-fallback-section]');
        Array.prototype.forEach.call(fallbackActions, function (btn) {
            btn.addEventListener('click', function () {
                var target = btn.getAttribute('data-fallback-section');
                if (target) {
                    document.body.classList.remove('island-active');
                    document.body.classList.add('away-from-isle');
                    navigate(target);
                }
            });
        });

        var navLinks = document.querySelectorAll('.nav-links a, .nav-logo');
        Array.prototype.forEach.call(navLinks, function (link) {
            link.addEventListener('click', function (e) {
                if (!document.body.classList.contains('island-active')) return;
                var href = link.getAttribute('href') || '';
                var id = href.replace('#', '');
                if (id === 'blog' || id === 'video' || id === 'about') {
                    e.preventDefault();
                } else if (id === 'home' || href === '#') {
                    e.preventDefault();
                }
            });
        });

        var jumpLinks = document.querySelectorAll('[data-room-jump]');
        Array.prototype.forEach.call(jumpLinks, function (link) {
            link.addEventListener('click', function (e) {
                e.preventDefault();
                var target = link.getAttribute('data-room-jump');
                if (target) {
                    document.body.classList.remove('island-active');
                    document.body.classList.add('away-from-isle');
                    navigate(target);
                }
            });
        });

        if (dom.enter) dom.enter.addEventListener('click', enterRoom);
        if (dom.later) dom.later.addEventListener('click', function () { closeModal(); });
        if (dom.modalClose) dom.modalClose.addEventListener('click', function () { closeModal(); });
        if (dom.modalBackdrop) dom.modalBackdrop.addEventListener('click', function () { closeModal(); });
        if (dom.returnBtn) {
            dom.returnBtn.addEventListener('click', function () {
                goHomeIsland();
            });
        }

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && dom.modal && !dom.modal.hidden) {
                closeModal();
            }
        });

        window.addEventListener('hashchange', function () {
            var id = (window.location.hash || '#home').slice(1) || 'home';
            var valid = ['home', 'blog', 'video', 'about'];
            if (valid.indexOf(id) === -1) id = 'home';
            if (typeof window.showSection === 'function') {
                window.showSection(id, { fromIsland: id !== 'home', noHash: true });
            }
        });

        document.addEventListener('visibilitychange', function () {
            if (!state.scene) return;
            if (document.hidden) {
                state.scene.setActive(false);
            } else if (document.body.classList.contains('island-active')) {
                state.scene.setActive(true);
            }
        });
    }

    function boot() {
        cache();
        if (!dom.section || !dom.canvasHost) return;
        wrapShowSection();
        bind();

        var initial = (window.location.hash || '#home').slice(1) || 'home';
        var validRooms = ['home', 'blog', 'video', 'about'];
        if (validRooms.indexOf(initial) === -1) initial = 'home';
        if (initial === 'home') {
            enterIsland();
        } else {
            document.body.classList.add('away-from-isle');
            setTimeout(function () {
                if (typeof window.showSection === 'function') {
                    window.showSection(initial, { fromIsland: true, noHash: true });
                }
            }, 0);
        }

        if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            if (dom.loading) {
                setTimeout(function () { dom.loading.classList.add('is-hidden'); }, 400);
            }
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();
