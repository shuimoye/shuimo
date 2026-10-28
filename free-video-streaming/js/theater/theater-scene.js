import * as THREE from '../../lib/three.module.js';

function rand(min, max) {
    return min + Math.random() * (max - min);
}

function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
}

function canvas2d(w, h) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return { c, ctx: c.getContext('2d') };
}

function fontFace() {
    return '"Noto Serif SC", "Songti SC", "STSong", "SimSun", "KaiTi", "WenQuanYi Zen Hei", serif';
}

function drawVerticalText(ctx, text, x, y, size, step) {
    ctx.font = '600 ' + size + 'px ' + fontFace();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const chars = String(text).split('');
    for (let i = 0; i < chars.length; i++) {
        ctx.fillText(chars[i], x, y + i * step);
    }
}

export function createTheater(options) {
    const opts = options || {};
    const container = opts.container;

    let renderer = null;
    let scene = null;
    let camera = null;
    let root = null;
    let dust = null;
    let stageRing = null;
    let active = false;
    let running = false;
    let needsResize = true;
    let rafId = 0;
    let lastTime = 0;
    let time = 0;
    let smallScreen = false;

    const lanterns = [];
    const glowSprites = [];
    const disposables = [];
    const textures = [];
    const geometryCache = new Map();
    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };

    const view = {
        base: new THREE.Vector3(0, 4.9, 15.5),
        target: new THREE.Vector3(0, 3.35, -0.8),
        pos: new THREE.Vector3(0, 4.9, 15.5),
        look: new THREE.Vector3(0, 3.35, -0.8)
    };

    function track(item) {
        disposables.push(item);
        return item;
    }

    function tex(w, h, draw, repeat) {
        const { c, ctx } = canvas2d(w, h);
        draw(ctx, w, h);
        const t = new THREE.CanvasTexture(c);
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = 4;
        if (repeat) {
            t.wrapS = THREE.RepeatWrapping;
            t.wrapT = THREE.RepeatWrapping;
            t.repeat.set(repeat[0], repeat[1]);
        }
        textures.push(t);
        return t;
    }

    function boxGeo(w, h, d) {
        const key = w.toFixed(3) + '|' + h.toFixed(3) + '|' + d.toFixed(3);
        if (!geometryCache.has(key)) {
            geometryCache.set(key, track(new THREE.BoxGeometry(w, h, d)));
        }
        return geometryCache.get(key);
    }

    function addBox(parent, w, h, d, mat, x, y, z, rx, ry, rz) {
        const mesh = new THREE.Mesh(boxGeo(w, h, d), mat);
        mesh.position.set(x, y, z);
        if (rx) mesh.rotation.x = rx;
        if (ry) mesh.rotation.y = ry;
        if (rz) mesh.rotation.z = rz;
        parent.add(mesh);
        return mesh;
    }

    function woodTexture() {
        return tex(512, 512, function (ctx, w, h) {
            const base = ctx.createLinearGradient(0, 0, 0, h);
            base.addColorStop(0, '#3a2617');
            base.addColorStop(0.5, '#2c1b10');
            base.addColorStop(1, '#1f120a');
            ctx.fillStyle = base;
            ctx.fillRect(0, 0, w, h);
            for (let y = 0; y < h; y += 64) {
                ctx.strokeStyle = 'rgba(0,0,0,0.55)';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(w, y);
                ctx.stroke();
                ctx.strokeStyle = 'rgba(120,84,50,0.16)';
                ctx.lineWidth = 1;
                for (let i = 0; i < 7; i++) {
                    const gy = y + 8 + i * 8 + rand(-2, 2);
                    ctx.beginPath();
                    ctx.moveTo(0, gy);
                    ctx.bezierCurveTo(w * 0.3, gy + rand(-3, 3), w * 0.7, gy + rand(-3, 3), w, gy);
                    ctx.stroke();
                }
            }
            for (let i = 0; i < 40; i++) {
                ctx.strokeStyle = 'rgba(0,0,0,0.18)';
                ctx.lineWidth = rand(1, 2);
                const x = rand(0, w);
                ctx.beginPath();
                ctx.moveTo(x, rand(0, h));
                ctx.lineTo(x + rand(-6, 6), rand(0, h));
                ctx.stroke();
            }
        }, [3, 1.4]);
    }

    function stoneTexture() {
        return tex(512, 512, function (ctx, w, h) {
            ctx.fillStyle = '#14100c';
            ctx.fillRect(0, 0, w, h);
            for (let i = 0; i < 900; i++) {
                const v = Math.floor(rand(18, 52));
                ctx.fillStyle = 'rgba(' + v + ',' + (v - 2) + ',' + (v - 5) + ',' + rand(0.25, 0.7) + ')';
                const s = rand(1, 5);
                ctx.fillRect(rand(0, w), rand(0, h), s, s);
            }
            ctx.strokeStyle = 'rgba(8,6,4,0.85)';
            ctx.lineWidth = 3;
            for (let x = 0; x < w; x += 128) {
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, h);
                ctx.stroke();
            }
            for (let y = 0; y < h; y += 128) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(w, y);
                ctx.stroke();
            }
            for (let i = 0; i < 24; i++) {
                ctx.strokeStyle = 'rgba(0,0,0,0.35)';
                ctx.lineWidth = 1;
                const x = rand(0, w);
                const y = rand(0, h);
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.lineTo(x + rand(-40, 40), y + rand(-40, 40));
                ctx.stroke();
            }
        }, [10, 10]);
    }

    function latticeTexture() {
        return tex(1024, 512, function (ctx, w, h) {
            const paper = ctx.createLinearGradient(0, 0, 0, h);
            paper.addColorStop(0, '#d9c49a');
            paper.addColorStop(0.55, '#c9ad7d');
            paper.addColorStop(1, '#a98a5b');
            ctx.fillStyle = paper;
            ctx.fillRect(0, 0, w, h);
            ctx.fillStyle = 'rgba(150,104,56,0.16)';
            for (let i = 0; i < 90; i++) {
                ctx.beginPath();
                ctx.arc(rand(0, w), rand(0, h), rand(2, 14), 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.strokeStyle = '#3c1c10';
            ctx.lineWidth = 12;
            for (let x = 0; x <= w; x += 128) {
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, h);
                ctx.stroke();
            }
            for (let y = 0; y <= h; y += 128) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(w, y);
                ctx.stroke();
            }
            ctx.strokeStyle = '#5c2a16';
            ctx.lineWidth = 4;
            for (let x = 0; x <= w; x += 128) {
                for (let y = 0; y <= h; y += 128) {
                    ctx.save();
                    ctx.translate(x + 64, y + 64);
                    ctx.rotate(Math.PI / 4);
                    ctx.strokeRect(-40, -40, 80, 80);
                    ctx.restore();
                }
            }
            ctx.strokeStyle = '#c9a35f';
            ctx.lineWidth = 10;
            ctx.strokeRect(12, 12, w - 24, h - 24);
        });
    }

    function plaqueTexture(text, sub) {
        return tex(1024, 320, function (ctx, w, h) {
            const lac = ctx.createLinearGradient(0, 0, 0, h);
            lac.addColorStop(0, '#1c120b');
            lac.addColorStop(0.5, '#120b07');
            lac.addColorStop(1, '#0b0604');
            ctx.fillStyle = lac;
            ctx.fillRect(0, 0, w, h);
            ctx.strokeStyle = '#8a6a34';
            ctx.lineWidth = 6;
            ctx.strokeRect(22, 22, w - 44, h - 44);
            ctx.strokeStyle = 'rgba(201,163,95,0.5)';
            ctx.lineWidth = 2;
            ctx.strokeRect(38, 38, w - 76, h - 76);
            ctx.fillStyle = '#e2bd77';
            ctx.shadowColor = 'rgba(255,186,92,0.55)';
            ctx.shadowBlur = 18;
            const chars = String(text).split('');
            const size = sub ? 142 : 158;
            ctx.font = '700 ' + size + 'px ' + fontFace();
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const gap = 190;
            const startX = w / 2 - ((chars.length - 1) * gap) / 2;
            for (let i = 0; i < chars.length; i++) {
                ctx.fillText(chars[i], startX + i * gap, h / 2 + (sub ? -6 : 4));
            }
            ctx.shadowBlur = 0;
            if (sub) {
                ctx.font = '400 30px ' + fontFace();
                ctx.fillStyle = 'rgba(201,163,95,0.7)';
                ctx.fillText(sub, w / 2, h - 52);
            }
        });
    }

    function bannerTexture(text) {
        return tex(256, 768, function (ctx, w, h) {
            const g = ctx.createLinearGradient(0, 0, w, 0);
            g.addColorStop(0, '#4c1210');
            g.addColorStop(0.45, '#7a1d18');
            g.addColorStop(0.55, '#6d1a15');
            g.addColorStop(1, '#3d0e0c');
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, w, h);
            ctx.strokeStyle = 'rgba(201,163,95,0.75)';
            ctx.lineWidth = 6;
            ctx.strokeRect(16, 16, w - 32, h - 32);
            ctx.fillStyle = '#e6c07a';
            drawVerticalText(ctx, text, w / 2, h / 2 - 40, 104, 132);
        });
    }

    function valanceTexture() {
        return tex(1024, 256, function (ctx, w, h) {
            const g = ctx.createLinearGradient(0, 0, 0, h);
            g.addColorStop(0, '#6b1a15');
            g.addColorStop(0.7, '#53110e');
            g.addColorStop(1, '#390b09');
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, w, h);
            for (let x = 0; x < w; x += 64) {
                ctx.fillStyle = 'rgba(0,0,0,0.22)';
                ctx.fillRect(x + 26, 0, 12, h);
                ctx.fillStyle = 'rgba(255,120,90,0.06)';
                ctx.fillRect(x + 4, 0, 10, h);
            }
            ctx.strokeStyle = '#c9a35f';
            ctx.lineWidth = 8;
            ctx.beginPath();
            ctx.moveTo(0, h - 34);
            for (let x = 0; x <= w; x += 128) {
                ctx.quadraticCurveTo(x + 64, h - 4, x + 128, h - 34);
            }
            ctx.stroke();
            ctx.fillStyle = 'rgba(201,163,95,0.85)';
            for (let x = 32; x < w; x += 64) {
                ctx.beginPath();
                ctx.arc(x, h - 22, 4, 0, Math.PI * 2);
                ctx.fill();
            }
        });
    }

    function curtainTexture() {
        return tex(512, 1024, function (ctx, w, h) {
            const g = ctx.createLinearGradient(0, 0, w, 0);
            g.addColorStop(0, '#2e0b09');
            g.addColorStop(0.3, '#611714');
            g.addColorStop(0.5, '#7d1f19');
            g.addColorStop(0.7, '#5c1512');
            g.addColorStop(1, '#2a0908');
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, w, h);
            for (let x = 0; x < w; x += 48) {
                ctx.fillStyle = 'rgba(0,0,0,0.2)';
                ctx.fillRect(x + 18, 0, 10, h);
            }
            ctx.strokeStyle = 'rgba(201,163,95,0.5)';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(w / 2, h * 0.44, 130, 0, Math.PI * 2);
            ctx.stroke();
            ctx.fillStyle = 'rgba(201,163,95,0.85)';
            ctx.font = '600 120px ' + fontFace();
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('戏', w / 2, h * 0.44);
            ctx.fillStyle = 'rgba(201,163,95,0.7)';
            ctx.fillRect(0, h - 14, w, 14);
        });
    }

    function tileTexture() {
        return tex(512, 512, function (ctx, w, h) {
            ctx.fillStyle = '#241b18';
            ctx.fillRect(0, 0, w, h);
            for (let x = 0; x < w; x += 32) {
                const g = ctx.createLinearGradient(x, 0, x + 32, 0);
                g.addColorStop(0, 'rgba(0,0,0,0.5)');
                g.addColorStop(0.45, 'rgba(96,74,62,0.5)');
                g.addColorStop(0.55, 'rgba(110,86,70,0.42)');
                g.addColorStop(1, 'rgba(0,0,0,0.55)');
                ctx.fillStyle = g;
                ctx.fillRect(x, 0, 32, h);
            }
            ctx.strokeStyle = 'rgba(0,0,0,0.45)';
            ctx.lineWidth = 4;
            for (let y = 0; y < h; y += 64) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(w, y);
                ctx.stroke();
            }
        }, [6, 2]);
    }

    function glowTexture() {
        return tex(256, 256, function (ctx, w, h) {
            const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
            g.addColorStop(0, 'rgba(255,214,150,0.95)');
            g.addColorStop(0.28, 'rgba(255,168,88,0.55)');
            g.addColorStop(0.62, 'rgba(255,120,50,0.16)');
            g.addColorStop(1, 'rgba(255,100,40,0)');
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, w, h);
        });
    }

    function setupRenderer() {
        renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: false,
            powerPreference: 'high-performance'
        });
        smallScreen = window.innerWidth <= 768;
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, smallScreen ? 1.5 : 1.75));
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = smallScreen ? 1.46 : 1.32;
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.setClearColor(0x050403, 1);
        renderer.domElement.setAttribute('aria-label', '观澜榭三维戏台');
        container.appendChild(renderer.domElement);
    }

    function setupScene() {
        scene = new THREE.Scene();
        scene.fog = new THREE.FogExp2(0x080605, 0.0145);
        scene.background = new THREE.Color(0x050403);

        camera = new THREE.PerspectiveCamera(43, 1, 0.1, 120);

        root = new THREE.Group();
        scene.add(root);

        scene.add(new THREE.AmbientLight(0x8a6d4f, 2.1));
        const hemi = new THREE.HemisphereLight(0x9db4d6, 0x3a2616, 1.55);
        scene.add(hemi);

        const key = new THREE.DirectionalLight(0xffd6a2, 3.15);
        key.position.set(7.5, 12, 10);
        key.castShadow = true;
        const shadowSize = smallScreen ? 512 : 1024;
        key.shadow.mapSize.set(shadowSize, shadowSize);
        key.shadow.camera.near = 1;
        key.shadow.camera.far = 42;
        key.shadow.camera.left = -15;
        key.shadow.camera.right = 15;
        key.shadow.camera.top = 16;
        key.shadow.camera.bottom = -2;
        key.shadow.bias = -0.0014;
        key.shadow.normalBias = 0.035;
        scene.add(key);

        const fill = new THREE.DirectionalLight(0x8ba4cc, 1.15);
        fill.position.set(-11, 7, 6);
        scene.add(fill);

        const front = new THREE.DirectionalLight(0xffe0b0, 1.5);
        front.position.set(0, 4.4, 11);
        scene.add(front);

        const bounce = new THREE.PointLight(0xffb070, 26, 19, 2);
        bounce.position.set(0, 2.1, 3.6);
        scene.add(bounce);
    }

    function buildStage(mats) {
        const stage = new THREE.Group();
        root.add(stage);

        const floor = new THREE.Mesh(
            track(new THREE.PlaneGeometry(90, 90)),
            mats.stone
        );
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        root.add(floor);

        const base = addBox(stage, 15.2, 1.0, 8.2, mats.wood, 0, 0.5, -1.35);
        base.castShadow = true;
        base.receiveShadow = true;

        addBox(stage, 15.3, 0.16, 0.22, mats.gold, 0, 0.94, 2.76);
        addBox(stage, 15.3, 0.1, 0.12, mats.gold, 0, 0.2, 2.76);

        const deck = new THREE.Mesh(track(new THREE.PlaneGeometry(14.8, 7.9)), mats.deck);
        deck.rotation.x = -Math.PI / 2;
        deck.position.set(0, 1.005, -1.35);
        deck.receiveShadow = true;
        stage.add(deck);

        addBox(stage, 6.4, 0.03, 5.6, mats.carpet, 0, 1.02, -0.5);

        const steps = new THREE.Group();
        stage.add(steps);
        for (let i = 0; i < 3; i++) {
            const w = 7 - i * 1.1;
            const s = addBox(steps, w, 0.24, 0.5, mats.wood, 0, 0.12 + i * 0.24, 3.02 + i * 0.42);
            s.castShadow = true;
            s.receiveShadow = true;
        }

        const columns = [
            [-6.4, 1.5], [6.4, 1.5],
            [-6.4, -4.5], [6.4, -4.5],
            [-2.2, -4.7], [2.2, -4.7]
        ];
        const colGeo = track(new THREE.CylinderGeometry(0.24, 0.28, 5.7, 18));
        for (let i = 0; i < columns.length; i++) {
            const col = new THREE.Mesh(colGeo, mats.lacquer);
            col.position.set(columns[i][0], 3.85, columns[i][1]);
            col.castShadow = true;
            stage.add(col);
            const foot = new THREE.Mesh(track(new THREE.CylinderGeometry(0.38, 0.42, 0.2, 18)), mats.stoneTrim);
            foot.position.set(columns[i][0], 1.1, columns[i][1]);
            stage.add(foot);
            const cap = new THREE.Mesh(track(new THREE.CylinderGeometry(0.34, 0.3, 0.18, 18)), mats.gold);
            cap.position.set(columns[i][0], 6.62, columns[i][1]);
            stage.add(cap);
        }

        const ringGeo = track(new THREE.RingGeometry(2.3, 2.46, 64));
        stageRing = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({
            color: 0xffab60,
            transparent: true,
            opacity: 0.22,
            side: THREE.DoubleSide,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        }));
        track(stageRing.material);
        stageRing.rotation.x = -Math.PI / 2;
        stageRing.position.set(0, 1.03, 1.1);
        stage.add(stageRing);

        const table = addBox(stage, 2.6, 0.14, 0.9, mats.darkWood, 0, 1.52, -3.3);
        table.castShadow = true;
        addBox(stage, 0.16, 0.5, 0.16, mats.darkWood, -1.05, 1.27, -3.3);
        addBox(stage, 0.16, 0.5, 0.16, mats.darkWood, 1.05, 1.27, -3.3);
        const censer = new THREE.Mesh(track(new THREE.CylinderGeometry(0.2, 0.15, 0.22, 16)), mats.bronze);
        censer.position.set(0, 1.7, -3.3);
        stage.add(censer);
        const candle = new THREE.PointLight(0xffa050, 4.5, 7, 2);
        candle.position.set(0, 2.0, -3.2);
        stage.add(candle);

        return stage;
    }

    function buildBackdrop(mats) {
        const back = new THREE.Group();
        root.add(back);

        const wall = addBox(back, 14.2, 5.6, 0.4, mats.darkWood, 0, 3.8, -5.5);
        wall.receiveShadow = true;

        const lattice = new THREE.Mesh(track(new THREE.PlaneGeometry(12.4, 4.8)), mats.lattice);
        lattice.position.set(0, 3.85, -5.28);
        back.add(lattice);

        addBox(back, 12.8, 0.14, 0.14, mats.gold, 0, 6.28, -5.26);
        addBox(back, 12.8, 0.14, 0.14, mats.gold, 0, 1.42, -5.26);
        addBox(back, 0.14, 4.9, 0.14, mats.gold, -6.24, 3.85, -5.26);
        addBox(back, 0.14, 4.9, 0.14, mats.gold, 6.24, 3.85, -5.26);

        const plaque = new THREE.Mesh(track(new THREE.PlaneGeometry(4.4, 1.38)), mats.plaque);
        plaque.position.set(0, 5.56, -5.24);
        back.add(plaque);
        addBox(back, 4.7, 1.62, 0.1, mats.gold, 0, 5.56, -5.32);

        const curtains = [];
        for (let i = 0; i < 2; i++) {
            const cur = new THREE.Mesh(track(new THREE.PlaneGeometry(2.4, 4.5)), mats.curtain);
            cur.position.set(i === 0 ? -5.1 : 5.1, 4.4, -5.2);
            back.add(cur);
            curtains.push(cur);
        }

        const bannerL = new THREE.Mesh(track(new THREE.PlaneGeometry(0.86, 2.9)), mats.bannerL);
        bannerL.position.set(-6.35, 4.9, 1.8);
        bannerL.rotation.y = 0.12;
        back.add(bannerL);
        const bannerR = new THREE.Mesh(track(new THREE.PlaneGeometry(0.86, 2.9)), mats.bannerR);
        bannerR.position.set(6.35, 4.9, 1.8);
        bannerR.rotation.y = -0.12;
        back.add(bannerR);

        const valance = new THREE.Mesh(track(new THREE.PlaneGeometry(14.6, 1.3)), mats.valance);
        valance.position.set(0, 6.32, 3.2);
        back.add(valance);

        return curtains;
    }

    function buildRoof(mats) {
        const roof = new THREE.Group();
        root.add(roof);

        addBox(roof, 16.4, 0.46, 10.6, mats.darkWood, 0, 6.86, -1.4);

        const front = addBox(roof, 17.2, 0.22, 5.4, mats.tiles, 0, 8.02, 1.15, 0.4, 0, 0);
        const rear = addBox(roof, 17.2, 0.22, 5.4, mats.tiles, 0, 8.02, -3.95, -0.4, 0, 0);
        front.castShadow = rear.castShadow = false;

        const endL = addBox(roof, 5.6, 0.22, 11.0, mats.tiles, -6.1, 8.0, -1.4, 0, 0, 0.42);
        const endR = addBox(roof, 5.6, 0.22, 11.0, mats.tiles, 6.1, 8.0, -1.4, 0, 0, -0.42);
        endL.castShadow = endR.castShadow = false;

        const ridge = new THREE.Mesh(track(new THREE.CylinderGeometry(0.17, 0.17, 10.2, 14)), mats.ridge);
        ridge.rotation.z = Math.PI / 2;
        ridge.position.set(0, 9.24, -1.4);
        roof.add(ridge);

        for (let i = -1; i <= 1; i += 2) {
            const knob = new THREE.Mesh(track(new THREE.SphereGeometry(0.3, 14, 12)), mats.gold);
            knob.position.set(i * 5.2, 9.36, -1.4);
            roof.add(knob);
            const tip = new THREE.Mesh(track(new THREE.ConeGeometry(0.14, 0.6, 10)), mats.gold);
            tip.position.set(i * 5.6, 9.6, -1.4);
            tip.rotation.z = i * -0.35;
            roof.add(tip);
        }

        const corners = [
            [-8.5, 3.05, 1], [8.5, 3.05, -1],
            [-8.5, -5.85, 1], [8.5, -5.85, -1]
        ];
        for (let i = 0; i < corners.length; i++) {
            const cx = corners[i][0];
            const cz = corners[i][1];
            const dir = corners[i][2];
            const curve = new THREE.QuadraticBezierCurve3(
                new THREE.Vector3(cx, 6.88, cz),
                new THREE.Vector3(cx + dir * 1.1, 7.05, cz + (cz > 0 ? 0.5 : -0.5)),
                new THREE.Vector3(cx + dir * 1.55, 7.85, cz + (cz > 0 ? 0.75 : -0.75))
            );
            const tube = new THREE.Mesh(track(new THREE.TubeGeometry(curve, 14, 0.1, 8, false)), mats.ridge);
            roof.add(tube);
            const finial = new THREE.Mesh(track(new THREE.SphereGeometry(0.13, 10, 8)), mats.gold);
            finial.position.copy(curve.getPoint(1));
            roof.add(finial);
        }

        for (let i = 0; i < 9; i++) {
            const x = -6 + i * 1.5;
            addBox(roof, 0.22, 0.5, 0.9, mats.lacquer, x, 6.4, 3.15);
            addBox(roof, 0.62, 0.14, 0.16, mats.gold, x, 6.18, 3.35);
        }

        return roof;
    }

    function buildLanterns(mats, glowTex) {
        const spots = [
            [-4.6, 5.35, 2.35, true],
            [4.6, 5.35, 2.35, true],
            [-4.6, 5.35, -4.15, false],
            [4.6, 5.35, -4.15, false]
        ];

        for (let i = 0; i < spots.length; i++) {
            const s = spots[i];
            const group = new THREE.Group();
            group.position.set(s[0], s[1], s[2]);
            root.add(group);

            const cord = new THREE.Mesh(track(new THREE.CylinderGeometry(0.018, 0.018, 1.25, 6)), mats.cord);
            cord.position.y = 0.72;
            group.add(cord);

            const bodyMat = track(new THREE.MeshStandardMaterial({
                color: 0x8c2418,
                emissive: 0xff5c22,
                emissiveIntensity: 0.85,
                roughness: 0.65
            }));
            const body = new THREE.Mesh(track(new THREE.SphereGeometry(0.42, 20, 16)), bodyMat);
            body.scale.set(1, 1.16, 1);
            group.add(body);

            const capTop = new THREE.Mesh(track(new THREE.CylinderGeometry(0.2, 0.24, 0.1, 14)), mats.gold);
            capTop.position.y = 0.5;
            group.add(capTop);
            const capBottom = new THREE.Mesh(track(new THREE.CylinderGeometry(0.24, 0.18, 0.1, 14)), mats.gold);
            capBottom.position.y = -0.5;
            group.add(capBottom);
            const tassel = new THREE.Mesh(track(new THREE.CylinderGeometry(0.03, 0.02, 0.42, 6)), mats.tassel);
            tassel.position.y = -0.74;
            group.add(tassel);

            const glow = new THREE.Sprite(track(new THREE.SpriteMaterial({
                map: glowTex,
                color: 0xffb066,
                transparent: true,
                opacity: 0.6,
                depthWrite: false,
                blending: THREE.AdditiveBlending
            })));
            glow.scale.set(3.1, 3.1, 1);
            glow.position.y = 0;
            group.add(glow);
            glowSprites.push(glow);

            const base = s[3] ? 27 : 11;
            const light = new THREE.PointLight(0xff9c4e, base, s[3] ? 17 : 10, 2);
            light.position.set(0, 0, 0.2);
            group.add(light);
            lanterns.push({ light: light, base: base, phase: rand(0, 6.28), glow: glow });
        }
    }

    function buildAudience(mats) {
        const rows = [5.4, 7.1, 8.8];
        const cols = [-4.8, -2.4, 0, 2.4, 4.8];
        const count = rows.length * cols.length;

        const topGeo = track(new THREE.BoxGeometry(1.5, 0.1, 0.62));
        const legGeo = track(new THREE.BoxGeometry(0.1, 0.5, 0.56));
        const stoolGeo = track(new THREE.BoxGeometry(0.62, 0.14, 0.46));

        const tops = new THREE.InstancedMesh(topGeo, mats.seat, count);
        const legs = new THREE.InstancedMesh(legGeo, mats.seat, count * 2);
        const stools = new THREE.InstancedMesh(stoolGeo, mats.seat, count * 2);
        const dummy = new THREE.Object3D();
        let ti = 0;
        let li = 0;
        let si = 0;
        for (let r = 0; r < rows.length; r++) {
            for (let c = 0; c < cols.length; c++) {
                const x = cols[c];
                const z = rows[r];
                dummy.position.set(x, 0.66, z);
                dummy.rotation.set(0, 0, 0);
                dummy.scale.set(1, 1, 1);
                dummy.updateMatrix();
                tops.setMatrixAt(ti++, dummy.matrix);

                for (let k = -1; k <= 1; k += 2) {
                    dummy.position.set(x + k * 0.66, 0.39, z);
                    dummy.updateMatrix();
                    legs.setMatrixAt(li++, dummy.matrix);

                    dummy.position.set(x + k * 0.62, 0.44, z + 0.85);
                    dummy.rotation.set(0, k * 0.08, 0);
                    dummy.updateMatrix();
                    stools.setMatrixAt(si++, dummy.matrix);
                    dummy.rotation.set(0, 0, 0);
                }
            }
        }
        tops.instanceMatrix.needsUpdate = true;
        legs.instanceMatrix.needsUpdate = true;
        stools.instanceMatrix.needsUpdate = true;
        root.add(tops, legs, stools);
    }

    function buildGarden(mats) {
        const garden = new THREE.Group();
        root.add(garden);

        const trunkMat = track(new THREE.MeshStandardMaterial({ color: 0x1d1410, roughness: 1 }));
        const leafMats = [
            track(new THREE.MeshStandardMaterial({ color: 0x16241b, roughness: 1 })),
            track(new THREE.MeshStandardMaterial({ color: 0x1c2c1f, roughness: 1 })),
            track(new THREE.MeshStandardMaterial({ color: 0x121d16, roughness: 1 }))
        ];
        const trees = [
            [-12.4, -3.2, 1.5], [-13.6, -8.0, 1.8], [-10.8, 4.6, 1.2],
            [12.4, -3.2, 1.5], [13.6, -8.0, 1.8], [10.8, 4.6, 1.2]
        ];
        for (let i = 0; i < trees.length; i++) {
            const t = trees[i];
            const trunk = new THREE.Mesh(track(new THREE.CylinderGeometry(0.16, 0.24, 2.6, 8)), trunkMat);
            trunk.position.set(t[0], 1.3, t[1]);
            trunk.scale.setScalar(t[2]);
            garden.add(trunk);
            for (let j = 0; j < 3; j++) {
                const blob = new THREE.Mesh(
                    track(new THREE.IcosahedronGeometry(rand(1.1, 1.7) * t[2], 1)),
                    leafMats[(i + j) % leafMats.length]
                );
                blob.position.set(
                    t[0] + rand(-1.1, 1.1),
                    3.4 * t[2] + j * 0.62 + rand(-0.2, 0.2),
                    t[1] + rand(-1.1, 1.1)
                );
                garden.add(blob);
            }
        }

        const moonMat = track(new THREE.MeshBasicMaterial({
            color: 0xf0ddb4,
            transparent: true,
            opacity: 0.7,
            fog: false
        }));
        const moon = new THREE.Mesh(track(new THREE.CircleGeometry(2.3, 48)), moonMat);
        moon.position.set(-9.5, 11.2, -26);
        root.add(moon);
        const moonGlow = new THREE.Sprite(track(new THREE.SpriteMaterial({
            map: tex(256, 256, function (ctx, w, h) {
                const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
                g.addColorStop(0, 'rgba(240,224,190,0.5)');
                g.addColorStop(0.35, 'rgba(220,202,168,0.18)');
                g.addColorStop(1, 'rgba(220,202,168,0)');
                ctx.fillStyle = g;
                ctx.fillRect(0, 0, w, h);
            }),
            transparent: true,
            opacity: 0.7,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            fog: false
        })));
        moonGlow.scale.set(9, 9, 1);
        moonGlow.position.copy(moon.position);
        root.add(moonGlow);

        const starGeo = track(new THREE.BufferGeometry());
        const starCount = 160;
        const starPos = new Float32Array(starCount * 3);
        for (let i = 0; i < starCount; i++) {
            starPos[i * 3] = rand(-32, 32);
            starPos[i * 3 + 1] = rand(11, 26);
            starPos[i * 3 + 2] = rand(-32, -14);
        }
        starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
        const stars = new THREE.Points(starGeo, track(new THREE.PointsMaterial({
            color: 0xc8d4e6,
            size: 0.09,
            transparent: true,
            opacity: 0.5,
            depthWrite: false,
            fog: false,
            sizeAttenuation: true
        })));
        root.add(stars);

        const audienceLightL = new THREE.PointLight(0xffb878, 7, 9, 2);
        audienceLightL.position.set(-4.2, 1.7, 6.6);
        root.add(audienceLightL);
        const audienceLightR = new THREE.PointLight(0xffb878, 7, 9, 2);
        audienceLightR.position.set(4.2, 1.7, 6.6);
        root.add(audienceLightR);

        const wall = new THREE.Mesh(
            track(new THREE.PlaneGeometry(80, 22)),
            track(new THREE.MeshBasicMaterial({ color: 0x090a0c, fog: true }))
        );
        wall.position.set(0, 8, -22);
        root.add(wall);
    }

    function buildDust() {
        const count = smallScreen ? 160 : 320;
        const geo = track(new THREE.BufferGeometry());
        const positions = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
            positions[i * 3] = rand(-9, 9);
            positions[i * 3 + 1] = rand(1.2, 8.2);
            positions[i * 3 + 2] = rand(-5.5, 7);
        }
        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const mat = track(new THREE.PointsMaterial({
            color: 0xffd9a0,
            size: 0.05,
            transparent: true,
            opacity: 0.55,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            sizeAttenuation: true
        }));
        dust = new THREE.Points(geo, mat);
        root.add(dust);
    }

    function buildMaterials() {
        const wood = woodTexture();
        const deck = wood.clone();
        deck.needsUpdate = true;
        deck.repeat.set(4, 2.4);
        textures.push(deck);

        return {
            stone: track(new THREE.MeshStandardMaterial({ map: stoneTexture(), roughness: 0.96, metalness: 0.02 })),
            wood: track(new THREE.MeshStandardMaterial({ map: wood, roughness: 0.82, metalness: 0.04 })),
            deck: track(new THREE.MeshStandardMaterial({ map: deck, roughness: 0.78, metalness: 0.04 })),
            darkWood: track(new THREE.MeshStandardMaterial({ color: 0x2a1c12, roughness: 0.85 })),
            lacquer: track(new THREE.MeshStandardMaterial({ color: 0x8a2a20, roughness: 0.48, metalness: 0.14 })),
            gold: track(new THREE.MeshStandardMaterial({ color: 0x9a7638, roughness: 0.32, metalness: 0.68 })),
            ridge: track(new THREE.MeshStandardMaterial({ color: 0x3a2a22, roughness: 0.6, metalness: 0.18 })),
            tiles: track(new THREE.MeshStandardMaterial({ map: tileTexture(), roughness: 0.72, metalness: 0.08 })),
            stoneTrim: track(new THREE.MeshStandardMaterial({ color: 0x2c2620, roughness: 0.9 })),
            bronze: track(new THREE.MeshStandardMaterial({ color: 0x6b5533, roughness: 0.4, metalness: 0.8 })),
            carpet: track(new THREE.MeshStandardMaterial({ color: 0x5a1a16, roughness: 0.82 })),
            cord: track(new THREE.MeshStandardMaterial({ color: 0x241a12, roughness: 0.9 })),
            tassel: track(new THREE.MeshStandardMaterial({ color: 0xa8341f, roughness: 0.8 })),
            seat: track(new THREE.MeshStandardMaterial({ color: 0x261b13, roughness: 0.94 })),
            lattice: track(new THREE.MeshStandardMaterial({
                map: latticeTexture(),
                emissive: 0xffcf8e,
                emissiveIntensity: 0.5,
                roughness: 0.85,
                side: THREE.DoubleSide
            })),
            plaque: track(new THREE.MeshStandardMaterial({
                map: plaqueTexture('观澜榭'),
                emissive: 0xffc47a,
                emissiveIntensity: 0.34,
                roughness: 0.55
            })),
            bannerL: track(new THREE.MeshStandardMaterial({ map: bannerTexture('观澜'), roughness: 0.8, side: THREE.DoubleSide })),
            bannerR: track(new THREE.MeshStandardMaterial({ map: bannerTexture('听戏'), roughness: 0.8, side: THREE.DoubleSide })),
            valance: track(new THREE.MeshStandardMaterial({ map: valanceTexture(), roughness: 0.85, side: THREE.DoubleSide })),
            curtain: track(new THREE.MeshStandardMaterial({ map: curtainTexture(), roughness: 0.88, side: THREE.DoubleSide }))
        };
    }

    function build() {
        const mats = buildMaterials();
        const glowTex = glowTexture();
        buildStage(mats);
        buildBackdrop(mats);
        buildRoof(mats);
        buildLanterns(mats, glowTex);
        buildAudience(mats);
        buildGarden(mats);
        buildDust();
    }

    function updateCamera() {
        const sway = Math.sin(time * 0.18) * 0.34;
        const bob = Math.sin(time * 0.24 + 1.2) * 0.1;
        const px = pointer.x;
        const py = pointer.y;
        const amp = 1.15;
        const ampY = 0.5;

        view.pos.x = view.base.x + sway + px * amp;
        view.pos.y = view.base.y + bob - py * ampY;
        view.pos.z = view.base.z;

        view.look.x = view.target.x + px * 0.42;
        view.look.y = view.target.y + py * 0.24;
        view.look.z = view.target.z;

        camera.position.copy(view.pos);
        camera.lookAt(view.look);
    }

    function resize() {
        if (!renderer || !camera) return;
        const w = container.clientWidth || window.innerWidth;
        const h = container.clientHeight || window.innerHeight;
        const aspect = w / Math.max(1, h);
        const portrait = aspect < 0.9;
        const short = h < 560;

        renderer.setSize(w, h, false);
        camera.aspect = aspect;
        camera.fov = portrait ? 51 : (short ? 48 : 43);
        camera.updateProjectionMatrix();

        if (portrait) {
            view.base.set(0, 6.3, 23.5);
            view.target.set(0, 4.2, -1.6);
        } else if (short) {
            view.base.set(0, 5.4, 17.4);
            view.target.set(0, 3.9, -1.2);
        } else {
            view.base.set(0, 5.2, 15.6);
            view.target.set(0, 3.8, -0.8);
        }

        needsResize = false;
    }

    function tick(now) {
        if (!running) return;
        rafId = requestAnimationFrame(tick);
        if (!lastTime) lastTime = now;
        const dt = Math.min(0.05, (now - lastTime) / 1000);
        lastTime = now;
        time += dt;

        const k = Math.min(1, dt * 2.6);
        pointer.x += (pointer.tx - pointer.x) * k;
        pointer.y += (pointer.ty - pointer.y) * k;

        updateCamera();

        for (let i = 0; i < lanterns.length; i++) {
            const l = lanterns[i];
            const flicker = 0.9 + Math.sin(time * 2.3 + l.phase) * 0.06 + Math.sin(time * 6.1 + l.phase) * 0.03;
            if (l.light) l.light.intensity = l.base * flicker;
            if (l.glow) l.glow.material.opacity = 0.6 + flicker * 0.18;
        }

        if (stageRing) {
            stageRing.material.opacity = 0.14 + Math.sin(time * 1.4) * 0.05;
            stageRing.rotation.z = time * 0.04;
        }

        if (dust) {
            dust.rotation.y = Math.sin(time * 0.05) * 0.03;
            dust.position.y = Math.sin(time * 0.22) * 0.08;
        }

        if (needsResize) resize();
        renderer.render(scene, camera);
    }

    function start() {
        if (running) return;
        running = true;
        lastTime = 0;
        rafId = requestAnimationFrame(tick);
    }

    function stop() {
        running = false;
        if (rafId) cancelAnimationFrame(rafId);
        rafId = 0;
    }

    function setActive(val) {
        active = !!val;
        if (active) {
            needsResize = true;
            resize();
            start();
        } else {
            stop();
            pointer.tx = 0;
            pointer.ty = 0;
        }
    }

    function onPointerMove(e) {
        if (!active) return;
        const rect = container.getBoundingClientRect();
        pointer.tx = clamp(((e.clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1, -1, 1);
        pointer.ty = clamp(((e.clientY - rect.top) / Math.max(1, rect.height)) * 2 - 1, -1, 1) * 0.7;
    }

    function onPointerLeave() {
        pointer.tx = 0;
        pointer.ty = 0;
    }

    function bind() {
        const el = renderer.domElement;
        el.addEventListener('pointermove', onPointerMove);
        el.addEventListener('pointerleave', onPointerLeave);
        el.addEventListener('contextmenu', function (e) { e.preventDefault(); });
        window.addEventListener('resize', resize);
    }

    function dispose() {
        stop();
        window.removeEventListener('resize', resize);
        if (renderer) {
            const el = renderer.domElement;
            if (el && el.parentNode) el.parentNode.removeChild(el);
            renderer.dispose();
        }
        geometryCache.forEach(function (geo) { geo.dispose(); });
        disposables.forEach(function (item) {
            if (item && item.isMaterial) item.dispose();
        });
        textures.forEach(function (t) { if (t && t.dispose) t.dispose(); });
    }

    setupRenderer();
    setupScene();
    build();
    bind();
    resize();
    updateCamera();

    if (opts.onReady) opts.onReady();

    return {
        start: start,
        stop: stop,
        dispose: dispose,
        setActive: setActive,
        resize: resize
    };
}
