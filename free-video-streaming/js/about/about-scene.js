import * as THREE from '../../lib/three.module.js';

const BRUSH = '"Ma Shan Zheng", "STKaiti", "KaiTi", "Noto Serif SC", serif';

function rand(min, max) {
    return min + Math.random() * (max - min);
}

function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
}

function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
}

function easeInOut(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function canvas2d(w, h) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return { c, ctx: c.getContext('2d') };
}

function drawVerticalText(ctx, text, x, y, size, step, color) {
    ctx.font = '400 ' + size + 'px ' + BRUSH;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = color;
    const chars = String(text).split('');
    for (let i = 0; i < chars.length; i++) {
        ctx.fillText(chars[i], x, y + i * step);
    }
    return y + chars.length * step;
}

export function createHermitage(options) {
    const opts = options || {};
    const container = opts.container;
    const scrolls = opts.scrolls || [];
    const onHover = opts.onHover || function () {};
    const onSelect = opts.onSelect || function () {};

    let renderer = null;
    let scene = null;
    let camera = null;
    let root = null;
    let scrollGroup = null;
    let dust = null;
    let active = false;
    let running = false;
    let needsResize = true;
    let rafId = 0;
    let lastTime = 0;
    let time = 0;
    let enterStart = -1;
    let focused = null;
    let panelOpen = false;
    let smallScreen = false;
    let hovered = null;

    const doorPivots = [];
    const lanterns = [];
    const scrollMeshes = [];
    const scrollAnchors = {};
    const disposables = [];
    const textures = [];
    const geometryCache = new Map();
    const raycaster = new THREE.Raycaster();
    const pointerNdc = new THREE.Vector2(2, 2);
    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
    const tmpVec = new THREE.Vector3();

    const cam = {
        pos: new THREE.Vector3(0, 6, 25.5),
        look: new THREE.Vector3(0, 6.6, 9.5),
        fov: 46
    };

    const HALL = {
        halfW: 12,
        height: 13.2,
        door: 9.5,
        back: -13,
        scrollZ: -12.9,
        scrollY: 6.15
    };

    const SCROLL_XS = [-7.4, -3.7, 0, 3.7, 7.4];

    function track(item) {
        disposables.push(item);
        return item;
    }

    function tex(w, h, draw, repeat) {
        const { c, ctx } = canvas2d(w, h);
        draw(ctx, w, h);
        const t = new THREE.CanvasTexture(c);
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = 8;
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

    function addBox(parent, w, h, d, mat, x, y, z, ry) {
        const mesh = new THREE.Mesh(boxGeo(w, h, d), mat);
        mesh.position.set(x, y, z);
        if (ry) mesh.rotation.y = ry;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        parent.add(mesh);
        return mesh;
    }

    function woodTexture() {
        return tex(512, 512, function (ctx, w, h) {
            const g = ctx.createLinearGradient(0, 0, w, h);
            g.addColorStop(0, '#3a2417');
            g.addColorStop(0.5, '#452b1b');
            g.addColorStop(1, '#2c1a10');
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, w, h);
            for (let i = 0; i < 90; i++) {
                const y = Math.random() * h;
                ctx.strokeStyle = 'rgba(18, 10, 5, ' + rand(0.08, 0.24).toFixed(3) + ')';
                ctx.lineWidth = rand(0.6, 2.4);
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.bezierCurveTo(w * 0.3, y + rand(-9, 9), w * 0.7, y + rand(-9, 9), w, y + rand(-6, 6));
                ctx.stroke();
            }
            for (let i = 0; i < 18; i++) {
                ctx.strokeStyle = 'rgba(150, 104, 62, ' + rand(0.04, 0.12).toFixed(3) + ')';
                ctx.lineWidth = rand(0.5, 1.4);
                ctx.beginPath();
                ctx.moveTo(0, Math.random() * h);
                ctx.bezierCurveTo(w * 0.4, Math.random() * h, w * 0.6, Math.random() * h, w, Math.random() * h);
                ctx.stroke();
            }
        }, [2, 2]);
    }

    function floorTexture() {
        return tex(512, 512, function (ctx, w, h) {
            ctx.fillStyle = '#241a13';
            ctx.fillRect(0, 0, w, h);
            const cell = 128;
            for (let y = 0; y < h; y += cell) {
                for (let x = 0; x < w; x += cell) {
                    const l = rand(-8, 8);
                    ctx.fillStyle = 'rgb(' + (38 + l) + ',' + (29 + l) + ',' + (21 + l) + ')';
                    ctx.fillRect(x + 2, y + 2, cell - 4, cell - 4);
                    ctx.strokeStyle = 'rgba(90, 68, 46, 0.16)';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(x + 2, y + 2, cell - 4, cell - 4);
                }
            }
            for (let i = 0; i < 700; i++) {
                ctx.fillStyle = 'rgba(255, 226, 178, ' + rand(0.01, 0.05).toFixed(3) + ')';
                ctx.fillRect(Math.random() * w, Math.random() * h, rand(1, 2.4), rand(1, 2.4));
            }
        }, [7, 7]);
    }

    function plasterTexture() {
        return tex(512, 512, function (ctx, w, h) {
            ctx.fillStyle = '#2b2119';
            ctx.fillRect(0, 0, w, h);
            for (let i = 0; i < 2600; i++) {
                const v = rand(-10, 12);
                ctx.fillStyle = 'rgba(' + clamp(43 + v, 0, 255) + ',' + clamp(33 + v, 0, 255) + ',' + clamp(24 + v, 0, 255) + ',0.5)';
                ctx.fillRect(Math.random() * w, Math.random() * h, rand(1, 3), rand(1, 3));
            }
            ctx.strokeStyle = 'rgba(12, 8, 5, 0.4)';
            for (let i = 0; i < 26; i++) {
                ctx.lineWidth = rand(0.5, 1.6);
                ctx.beginPath();
                ctx.moveTo(rand(0, w), 0);
                ctx.bezierCurveTo(rand(0, w), h * 0.4, rand(0, w), h * 0.7, rand(0, w), h);
                ctx.stroke();
            }
        }, [3, 2]);
    }

    function latticeTexture() {
        return tex(512, 1024, function (ctx, w, h) {
            const g = ctx.createRadialGradient(w / 2, h * 0.36, 20, w / 2, h * 0.36, w * 0.82);
            g.addColorStop(0, '#f3c384');
            g.addColorStop(0.55, '#b47a3c');
            g.addColorStop(1, '#3d2413');
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, w, h);
            ctx.fillStyle = 'rgba(24, 14, 8, 0.92)';
            ctx.fillRect(0, 0, w, 56);
            ctx.fillRect(0, h - 56, w, 56);
            ctx.strokeStyle = 'rgba(201, 162, 92, 0.5)';
            ctx.lineWidth = 3;
            ctx.strokeRect(16, 16, w - 32, h - 32);
            const top = 96;
            const bottom = h * 0.62;
            ctx.fillStyle = 'rgba(250, 208, 146, 0.32)';
            ctx.fillRect(40, top, w - 80, bottom - top);
            ctx.fillStyle = 'rgba(28, 17, 10, 0.96)';
            const cols = 6;
            const rows = 12;
            const cw = (w - 80) / cols;
            const ch = (bottom - top) / rows;
            for (let i = 0; i <= cols; i++) {
                ctx.fillRect(40 + i * cw - 4, top, 8, bottom - top);
            }
            for (let j = 0; j <= rows; j++) {
                ctx.fillRect(40, top + j * ch - 4, w - 80, 8);
            }
            ctx.fillStyle = 'rgba(30, 18, 11, 0.9)';
            ctx.fillRect(0, bottom + 40, w, 4);
            for (let i = 0; i < 4; i++) {
                for (let j = 0; j < 3; j++) {
                    const cx = 96 + i * 106;
                    const cy = bottom + 130 + j * 110;
                    ctx.beginPath();
                    ctx.arc(cx, cy, 12, 0, Math.PI * 2);
                    ctx.fillStyle = 'rgba(201, 162, 92, 0.75)';
                    ctx.fill();
                    ctx.beginPath();
                    ctx.arc(cx, cy, 20, 0, Math.PI * 2);
                    ctx.strokeStyle = 'rgba(201, 162, 92, 0.28)';
                    ctx.lineWidth = 2;
                    ctx.stroke();
                }
            }
        });
    }

    function scrollTexture(info) {
        return tex(600, 1400, function (ctx, w, h) {
            const g = ctx.createLinearGradient(0, 0, w, h);
            g.addColorStop(0, '#e6d4b4');
            g.addColorStop(0.45, '#dcc79a');
            g.addColorStop(1, '#d0b87e');
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, w, h);

            for (let i = 0; i < 1500; i++) {
                ctx.fillStyle = 'rgba(120, 86, 48, ' + rand(0.012, 0.05).toFixed(3) + ')';
                ctx.fillRect(Math.random() * w, Math.random() * h, rand(1, 2.6), rand(1, 2.6));
            }
            for (let i = 0; i < 26; i++) {
                ctx.strokeStyle = 'rgba(150, 116, 74, ' + rand(0.02, 0.06).toFixed(3) + ')';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(rand(0, w), 0);
                ctx.bezierCurveTo(rand(0, w), h * 0.4, rand(0, w), h * 0.7, rand(0, w), h);
                ctx.stroke();
            }

            ctx.fillStyle = '#38453c';
            ctx.fillRect(0, 0, w, 52);
            ctx.fillRect(0, h - 52, w, 52);
            ctx.strokeStyle = 'rgba(201, 170, 106, 0.7)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(0, 56);
            ctx.lineTo(w, 56);
            ctx.moveTo(0, h - 56);
            ctx.lineTo(w, h - 56);
            ctx.stroke();

            const rules = [140, 246, 352];
            ctx.strokeStyle = 'rgba(150, 60, 44, 0.16)';
            ctx.lineWidth = 1.5;
            for (let i = 0; i < rules.length; i++) {
                ctx.beginPath();
                ctx.moveTo(rules[i], 110);
                ctx.lineTo(rules[i], h - 110);
                ctx.stroke();
            }

            drawVerticalText(ctx, info.title || '', 468, 158, 128, 150, 'rgba(30, 18, 10, 0.96)');

            const cols = info.cols || [];
            for (let i = 0; i < Math.min(3, cols.length); i++) {
                const x = 352 - i * 106;
                drawVerticalText(ctx, cols[i], x, 188, 54, 64, 'rgba(44, 28, 16, 0.9)');
            }

            const sealY = 158 + (info.title || '').length * 150 + 84;
            ctx.save();
            ctx.translate(470, Math.min(sealY, h - 220));
            ctx.rotate(-0.02);
            ctx.fillStyle = 'rgba(154, 44, 32, 0.9)';
            ctx.fillRect(-46, -46, 92, 92);
            ctx.strokeStyle = 'rgba(245, 226, 196, 0.75)';
            ctx.lineWidth = 3;
            ctx.strokeRect(-38, -38, 76, 76);
            ctx.fillStyle = 'rgba(246, 232, 208, 0.94)';
            ctx.font = '400 56px ' + BRUSH;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(info.seal || '', 0, 4);
            ctx.restore();

            ctx.fillStyle = 'rgba(58, 40, 26, 0.5)';
            ctx.font = '400 26px "Noto Serif SC", serif';
            ctx.textAlign = 'left';
            ctx.fillText(info.sub || '', 60, h - 84);
        });
    }

    function plaqueTexture(text, sub) {
        return tex(1024, 300, function (ctx, w, h) {
            const g = ctx.createLinearGradient(0, 0, 0, h);
            g.addColorStop(0, '#3b2415');
            g.addColorStop(0.5, '#4a2d1a');
            g.addColorStop(1, '#2e1b0f');
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, w, h);
            ctx.strokeStyle = 'rgba(201, 162, 92, 0.85)';
            ctx.lineWidth = 7;
            ctx.strokeRect(20, 20, w - 40, h - 40);
            ctx.strokeStyle = 'rgba(201, 162, 92, 0.35)';
            ctx.lineWidth = 2;
            ctx.strokeRect(38, 38, w - 76, h - 76);
            ctx.fillStyle = '#e8c98d';
            ctx.font = '400 132px ' + BRUSH;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(text, w / 2, h / 2 + 6);
            if (sub) {
                ctx.font = '400 26px "Noto Serif SC", serif';
                ctx.fillStyle = 'rgba(226, 200, 152, 0.66)';
                ctx.fillText(sub, w / 2, h - 62);
            }
        });
    }

    function bannerTexture(text) {
        return tex(256, 768, function (ctx, w, h) {
            const g = ctx.createLinearGradient(0, 0, 0, h);
            g.addColorStop(0, '#73271c');
            g.addColorStop(0.5, '#8c2f21');
            g.addColorStop(1, '#5d1e15');
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, w, h);
            ctx.strokeStyle = 'rgba(201, 162, 92, 0.45)';
            ctx.lineWidth = 3;
            ctx.strokeRect(14, 14, w - 28, h - 28);
            drawVerticalText(ctx, text, w / 2, 130, 96, 118, 'rgba(238, 214, 168, 0.9)');
        });
    }

    function glowTexture() {
        return tex(256, 256, function (ctx, w, h) {
            const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
            g.addColorStop(0, 'rgba(255, 206, 138, 0.9)');
            g.addColorStop(0.35, 'rgba(255, 176, 96, 0.42)');
            g.addColorStop(1, 'rgba(255, 150, 70, 0)');
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
        renderer.toneMappingExposure = smallScreen ? 1.42 : 1.28;
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.setClearColor(0x050403, 1);
        renderer.domElement.setAttribute('aria-label', '栖心庐三维书画阁');
        container.appendChild(renderer.domElement);
    }

    function setupScene() {
        scene = new THREE.Scene();
        scene.fog = new THREE.FogExp2(0x070504, 0.0135);
        scene.background = new THREE.Color(0x050403);

        camera = new THREE.PerspectiveCamera(46, 1, 0.1, 160);

        root = new THREE.Group();
        scene.add(root);

        scene.add(new THREE.AmbientLight(0x7d6448, 1.85));
        scene.add(new THREE.HemisphereLight(0x8ea6cc, 0x3a2616, 1.2));

        const moon = new THREE.DirectionalLight(0x9db4d8, 0.85);
        moon.position.set(-11, 18, 22);
        scene.add(moon);

        const key = new THREE.DirectionalLight(0xffd6a2, 2.35);
        key.position.set(8, 15, 11);
        key.castShadow = true;
        const shadowSize = smallScreen ? 512 : 1024;
        key.shadow.mapSize.set(shadowSize, shadowSize);
        key.shadow.camera.near = 1;
        key.shadow.camera.far = 60;
        key.shadow.camera.left = -18;
        key.shadow.camera.right = 18;
        key.shadow.camera.top = 20;
        key.shadow.camera.bottom = -4;
        key.shadow.bias = -0.0014;
        key.shadow.normalBias = 0.04;
        scene.add(key);

        const fill = new THREE.DirectionalLight(0x8ba4cc, 0.72);
        fill.position.set(-13, 9, 4);
        scene.add(fill);
    }

    function buildMaterials() {
        const wood = new THREE.MeshStandardMaterial({
            map: woodTexture(),
            roughness: 0.82,
            metalness: 0.04,
            color: 0xb08a62
        });
        const darkWood = new THREE.MeshStandardMaterial({
            map: woodTexture(),
            roughness: 0.78,
            metalness: 0.06,
            color: 0x7c5c3c
        });
        const lacquer = new THREE.MeshStandardMaterial({
            color: 0x6d2419,
            roughness: 0.5,
            metalness: 0.12
        });
        const stone = new THREE.MeshStandardMaterial({
            map: floorTexture(),
            roughness: 0.95,
            metalness: 0.02,
            color: 0x9a8a76
        });
        const plaster = new THREE.MeshStandardMaterial({
            map: plasterTexture(),
            roughness: 0.94,
            color: 0xa08a70
        });
        const gold = new THREE.MeshStandardMaterial({
            color: 0xc9a25c,
            roughness: 0.34,
            metalness: 0.72,
            emissive: 0x3a2810,
            emissiveIntensity: 0.5
        });
        const carpet = new THREE.MeshStandardMaterial({
            color: 0x4d1712,
            roughness: 0.9,
            metalness: 0.02
        });
        const paper = new THREE.MeshStandardMaterial({
            color: 0xe6d0a8,
            roughness: 0.88,
            metalness: 0.01,
            emissive: 0x3d2a12,
            emissiveIntensity: 0.32
        });
        return { wood, darkWood, lacquer, stone, plaster, gold, carpet, paper };
    }

    function buildGround(mats) {
        const ground = new THREE.Mesh(
            track(new THREE.PlaneGeometry(120, 120)),
            new THREE.MeshStandardMaterial({ color: 0x15100c, roughness: 1 })
        );
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -0.92;
        ground.receiveShadow = true;
        root.add(ground);

        const floor = new THREE.Mesh(track(new THREE.PlaneGeometry(58, 58)), mats.stone);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        root.add(floor);

        const rug = new THREE.Mesh(track(new THREE.PlaneGeometry(6.6, 19)), mats.carpet);
        rug.rotation.x = -Math.PI / 2;
        rug.position.set(0, 0.02, -1.4);
        rug.receiveShadow = true;
        root.add(rug);

        const border = new THREE.Mesh(track(new THREE.PlaneGeometry(7.4, 19.8)), mats.darkWood);
        border.rotation.x = -Math.PI / 2;
        border.position.set(0, 0.008, -1.4);
        root.add(border);

        for (let i = 0; i < 3; i++) {
            addBox(root, 13 + i * 1.7, 0.34, 1.1, mats.stone, 0, -0.18 - i * 0.34, 10.1 + i * 1.0);
        }
    }

    function buildWalls(mats) {
        const back = new THREE.Mesh(
            track(new THREE.PlaneGeometry(34, HALL.height)),
            mats.wood
        );
        back.position.set(0, HALL.height / 2, HALL.back - 0.35);
        back.receiveShadow = true;
        root.add(back);

        for (let i = 0; i < 5; i++) {
            addBox(root, 0.22, HALL.height, 0.4, mats.darkWood, -10.5 + i * 5.25, HALL.height / 2, HALL.back - 0.1);
        }

        const sideGeo = track(new THREE.PlaneGeometry(23, HALL.height));
        const left = new THREE.Mesh(sideGeo, mats.plaster);
        left.position.set(-HALL.halfW, HALL.height / 2, (HALL.door + HALL.back) / 2);
        left.rotation.y = Math.PI / 2;
        left.receiveShadow = true;
        root.add(left);

        const right = new THREE.Mesh(sideGeo, mats.plaster);
        right.position.set(HALL.halfW, HALL.height / 2, (HALL.door + HALL.back) / 2);
        right.rotation.y = -Math.PI / 2;
        right.receiveShadow = true;
        root.add(right);

        const ceiling = new THREE.Mesh(
            track(new THREE.PlaneGeometry(26, 24)),
            new THREE.MeshStandardMaterial({ color: 0x1a120c, roughness: 0.95 })
        );
        ceiling.rotation.x = Math.PI / 2;
        ceiling.position.set(0, HALL.height - 0.1, -1.8);
        root.add(ceiling);

        for (let i = 0; i < 9; i++) {
            addBox(root, 26, 0.28, 0.34, mats.darkWood, 0, HALL.height - 0.3, 10 - i * 2.6);
        }
        for (let i = 0; i < 9; i++) {
            addBox(root, 0.34, 0.28, 24, mats.darkWood, -11.6 + i * 2.9, HALL.height - 0.32, -1.8);
        }
    }

    function buildColumns(mats) {
        const colGeo = track(new THREE.CylinderGeometry(0.5, 0.56, 12.2, 18));
        const baseGeo = boxGeo(1.5, 0.62, 1.5);
        const bracketGeo = boxGeo(1.9, 0.34, 1.9);
        const zs = [4.5, -3.5, -11];
        for (let i = 0; i < zs.length; i++) {
            for (let s = -1; s <= 1; s += 2) {
                const x = s * 9.9;
                const col = new THREE.Mesh(colGeo, mats.lacquer);
                col.position.set(x, 6.1, zs[i]);
                col.castShadow = true;
                col.receiveShadow = true;
                root.add(col);

                const base = new THREE.Mesh(baseGeo, mats.stone);
                base.position.set(x, 0.31, zs[i]);
                base.castShadow = true;
                base.receiveShadow = true;
                root.add(base);

                const bracket = new THREE.Mesh(bracketGeo, mats.gold);
                bracket.position.set(x, 12.28, zs[i]);
                root.add(bracket);
            }
            addBox(root, 20.6, 0.62, 0.9, mats.darkWood, 0, HALL.height - 0.62, zs[i]);
        }
        addBox(root, 0.86, 0.6, 22.5, mats.darkWood, -9.9, HALL.height - 0.66, -1.1);
        addBox(root, 0.86, 0.6, 22.5, mats.darkWood, 9.9, HALL.height - 0.66, -1.1);
    }

    function buildLatticeWalls(mats) {
        const lattice = new THREE.MeshStandardMaterial({
            map: latticeTexture(),
            roughness: 0.88,
            metalness: 0.04,
            emissive: 0xffb96a,
            emissiveIntensity: 0.24,
            transparent: true,
            opacity: 0.96
        });
        const geo = track(new THREE.PlaneGeometry(2.6, 9.4));
        [-10.3, 10.3].forEach(function (x) {
            const panel = new THREE.Mesh(geo, lattice);
            panel.position.set(x, 6.6, HALL.back + 0.02);
            root.add(panel);
        });

        const sideGeo = track(new THREE.PlaneGeometry(2.2, 7.2));
        [-2.2, 3.2].forEach(function (z) {
            const panel = new THREE.Mesh(sideGeo, lattice);
            panel.position.set(-HALL.halfW + 0.06, 6.4, z);
            panel.rotation.y = Math.PI / 2;
            root.add(panel);

            const panel2 = new THREE.Mesh(sideGeo, lattice);
            panel2.position.set(HALL.halfW - 0.06, 6.4, z);
            panel2.rotation.y = -Math.PI / 2;
            root.add(panel2);
        });
    }

    function buildDoor(mats) {
        const frameMat = mats.darkWood;

        addBox(root, 1.0, 12.4, 1.2, frameMat, -5.55, 6.2, HALL.door);
        addBox(root, 1.0, 12.4, 1.2, frameMat, 5.55, 6.2, HALL.door);
        addBox(root, 12.1, 1.1, 1.2, frameMat, 0, 11.85, HALL.door);
        addBox(root, 13.4, 0.5, 1.6, mats.gold, 0, 11.15, HALL.door);

        addBox(root, 14.6, 11.7, 0.7, mats.plaster, -12.3, 5.85, HALL.door + 0.1);
        addBox(root, 14.6, 11.7, 0.7, mats.plaster, 12.3, 5.85, HALL.door + 0.1);

        const plaque = new THREE.Mesh(
            track(new THREE.PlaneGeometry(4.4, 1.3)),
            new THREE.MeshStandardMaterial({
                map: plaqueTexture('栖心庐', 'THE HERMITAGE'),
                roughness: 0.6,
                metalness: 0.16,
                emissive: 0x3a2a12,
                emissiveIntensity: 0.5
            })
        );
        plaque.position.set(0, 12.4, HALL.door + 0.5);
        root.add(plaque);

        const doorMap = latticeTexture();
        const doorMat = new THREE.MeshStandardMaterial({
            map: doorMap,
            roughness: 0.8,
            metalness: 0.06,
            emissive: 0xffb066,
            emissiveIntensity: 0.1
        });

        const panelGeo = boxGeo(5.14, 10.7, 0.26);
        for (let s = -1; s <= 1; s += 2) {
            const pivot = new THREE.Group();
            pivot.position.set(s * 5.14, 5.35, HALL.door);
            root.add(pivot);
            const panel = new THREE.Mesh(panelGeo, doorMat);
            panel.position.set(s * 2.57, 0, 0);
            panel.castShadow = true;
            panel.receiveShadow = true;
            pivot.add(panel);

            const ring = new THREE.Mesh(
                track(new THREE.TorusGeometry(0.26, 0.05, 8, 20)),
                mats.gold
            );
            ring.position.set(s * 4.55, -0.5, 0.2);
            pivot.add(ring);
            doorPivots.push({ group: pivot, dir: s });
        }
    }

    function buildScrolls(mats) {
        scrollGroup = new THREE.Group();
        root.add(scrollGroup);

        const rodGeo = track(new THREE.CylinderGeometry(0.065, 0.065, 3.9, 12));
        const knobGeo = track(new THREE.SphereGeometry(0.13, 12, 10));
        const cordGeo = track(new THREE.CylinderGeometry(0.014, 0.014, 1.05, 6));

        for (let i = 0; i < scrolls.length; i++) {
            const info = scrolls[i];
            const x = SCROLL_XS[i] !== undefined ? SCROLL_XS[i] : (i - 2) * 3.6;
            const y = HALL.scrollY + (i % 2 === 0 ? 0.12 : -0.06);
            const z = HALL.scrollZ + (i % 3) * 0.04;
            const h = 7.4;
            const w = 3.35;
            scrollAnchors[info.id] = { x: x, y: y, z: z };

            const group = new THREE.Group();
            group.position.set(x, y, z);
            group.rotation.y = (i % 2 === 0 ? 1 : -1) * 0.012;
            scrollGroup.add(group);

            const backing = new THREE.Mesh(
                track(new THREE.PlaneGeometry(w + 0.3, h + 0.3)),
                new THREE.MeshStandardMaterial({ color: 0x241a12, roughness: 0.9 })
            );
            backing.position.z = -0.02;
            group.add(backing);

            const paperMat = new THREE.MeshStandardMaterial({
                map: scrollTexture(info),
                roughness: 0.88,
                metalness: 0.02,
                emissive: 0x2a1c0b,
                emissiveIntensity: 0.2
            });
            const plane = new THREE.Mesh(track(new THREE.PlaneGeometry(w, h)), paperMat);
            plane.userData.scrollId = info.id;
            plane.userData.baseEmissive = 0.2;
            plane.castShadow = true;
            group.add(plane);
            scrollMeshes.push(plane);

            const rodTop = new THREE.Mesh(rodGeo, mats.darkWood);
            rodTop.rotation.z = Math.PI / 2;
            rodTop.position.set(0, h / 2 + 0.08, 0.04);
            group.add(rodTop);

            const rodBottom = new THREE.Mesh(rodGeo, mats.darkWood);
            rodBottom.rotation.z = Math.PI / 2;
            rodBottom.position.set(0, -h / 2 - 0.08, 0.06);
            group.add(rodBottom);

            for (let e = -1; e <= 1; e += 2) {
                const knob = new THREE.Mesh(knobGeo, mats.gold);
                knob.position.set(e * 1.98, h / 2 + 0.08, 0.04);
                group.add(knob);
                const knob2 = new THREE.Mesh(knobGeo, mats.gold);
                knob2.position.set(e * 1.98, -h / 2 - 0.08, 0.06);
                group.add(knob2);
            }

            for (let e = -1; e <= 1; e += 2) {
                const cord = new THREE.Mesh(cordGeo, mats.gold);
                cord.position.set(e * 1.25, h / 2 + 0.62, 0.02);
                cord.rotation.z = -e * 0.16;
                group.add(cord);
            }
        }

        const plaque = new THREE.Mesh(
            track(new THREE.PlaneGeometry(4.2, 1.16)),
            new THREE.MeshStandardMaterial({
                map: plaqueTexture('书画阁', 'GALLERY OF INK'),
                roughness: 0.62,
                metalness: 0.14,
                emissive: 0x3a2a12,
                emissiveIntensity: 0.5
            })
        );
        plaque.position.set(0, 11.15, HALL.back + 0.08);
        root.add(plaque);
    }

    function buildSideShelves(mats) {
        const rollGeo = track(new THREE.CylinderGeometry(0.15, 0.15, 1.7, 10));
        for (let side = -1; side <= 1; side += 2) {
            const x = side * (HALL.halfW - 0.55);
            [4.6, 7.4].forEach(function (y, row) {
                addBox(root, 0.6, 0.14, 17.4, mats.darkWood, x, y, -2.2);
                for (let i = 0; i < 12; i++) {
                    const roll = new THREE.Mesh(rollGeo, i % 3 === 0 ? mats.paper : mats.darkWood);
                    roll.rotation.z = Math.PI / 2;
                    roll.rotation.y = Math.PI / 2;
                    roll.position.set(x + side * 0.16, y + 0.24, -10 + i * 1.45);
                    root.add(roll);
                }
            });
        }
    }

    function buildFurniture(mats) {
        addBox(root, 5.2, 0.16, 1.7, mats.darkWood, 0, 0.94, -6.2);
        for (let s = -1; s <= 1; s += 2) {
            for (let t = -1; t <= 1; t += 2) {
                addBox(root, 0.16, 0.9, 0.16, mats.darkWood, s * 2.3, 0.45, -6.2 + t * 0.7);
            }
        }

        const burner = new THREE.Mesh(
            track(new THREE.CylinderGeometry(0.34, 0.28, 0.5, 14)),
            mats.gold
        );
        burner.position.set(0, 1.28, -6.2);
        root.add(burner);

        const incense = new THREE.Mesh(
            track(new THREE.CylinderGeometry(0.02, 0.02, 0.7, 6)),
            mats.gold
        );
        incense.position.set(0, 1.9, -6.2);
        root.add(incense);

        const rollGeo = track(new THREE.CylinderGeometry(0.12, 0.12, 1.3, 8));
        const a = new THREE.Mesh(rollGeo, mats.paper);
        a.rotation.z = Math.PI / 2;
        a.position.set(-1.5, 1.12, -6.2);
        root.add(a);
        const b = new THREE.Mesh(rollGeo, mats.paper);
        b.rotation.z = Math.PI / 2;
        b.position.set(1.4, 1.12, -6.25);
        root.add(b);
    }

    function buildBanners(mats) {
        const bannerMat = new THREE.MeshStandardMaterial({
            map: bannerTexture('观书'),
            roughness: 0.92,
            metalness: 0.02,
            side: THREE.DoubleSide
        });
        const bannerMat2 = new THREE.MeshStandardMaterial({
            map: bannerTexture('栖心'),
            roughness: 0.92,
            metalness: 0.02,
            side: THREE.DoubleSide
        });
        const geo = track(new THREE.PlaneGeometry(1.15, 3.5));

        const b1 = new THREE.Mesh(geo, bannerMat);
        b1.position.set(-8.4, 8.4, 6.4);
        root.add(b1);
        const b2 = new THREE.Mesh(geo, bannerMat2);
        b2.position.set(8.4, 8.4, 6.4);
        root.add(b2);

        addBox(root, 0.12, 0.12, 0.12, mats.gold, -8.4, 10.24, 6.4);
        addBox(root, 0.12, 0.12, 0.12, mats.gold, 8.4, 10.24, 6.4);
    }

    function buildLanterns(mats, glowTex) {
        const positions = [
            [-5.6, 8.7, 2.6],
            [5.6, 8.7, 2.6],
            [-5.6, 8.7, -5.2],
            [5.6, 8.7, -5.2],
            [-5.6, 8.7, -10.2],
            [5.6, 8.7, -10.2]
        ];
        const bodyGeo = track(new THREE.SphereGeometry(0.46, 16, 14));
        const capGeo = track(new THREE.CylinderGeometry(0.2, 0.2, 0.12, 12));
        const cordGeo = track(new THREE.CylinderGeometry(0.014, 0.014, 1.9, 6));
        const glowGeo = track(new THREE.PlaneGeometry(2.6, 2.6));

        positions.forEach(function (p, i) {
            const mat = new THREE.MeshStandardMaterial({
                color: 0xd8583a,
                roughness: 0.6,
                emissive: 0xff8a4a,
                emissiveIntensity: 0.85
            });
            const body = new THREE.Mesh(bodyGeo, mat);
            body.scale.set(1, 1.24, 1);
            body.position.set(p[0], p[1], p[2]);
            root.add(body);

            const capTop = new THREE.Mesh(capGeo, mats.gold);
            capTop.position.set(p[0], p[1] + 0.58, p[2]);
            root.add(capTop);
            const capBottom = new THREE.Mesh(capGeo, mats.gold);
            capBottom.position.set(p[0], p[1] - 0.58, p[2]);
            root.add(capBottom);

            const cord = new THREE.Mesh(cordGeo, mats.gold);
            cord.position.set(p[0], p[1] + 1.5, p[2]);
            root.add(cord);

            const glow = new THREE.Mesh(glowGeo, new THREE.MeshBasicMaterial({
                map: glowTex,
                transparent: true,
                opacity: 0.6,
                depthWrite: false,
                blending: THREE.AdditiveBlending
            }));
            glow.position.set(p[0], p[1], p[2] + 0.3);
            root.add(glow);

            const light = new THREE.PointLight(0xffa35e, i < 4 ? 24 : 18, 20, 2);
            light.position.set(p[0], p[1] - 0.1, p[2]);
            root.add(light);

            lanterns.push({ light: light, base: light.intensity, glow: glow, phase: i * 1.7 });
        });

        const wallSpot = new THREE.SpotLight(0xffc98a, 96, 30, 0.66, 0.72, 1.7);
        wallSpot.position.set(0, 9.2, -1.5);
        wallSpot.target.position.set(0, 6.2, -12.6);
        root.add(wallSpot);
        root.add(wallSpot.target);

        const wallSpot2 = new THREE.SpotLight(0xffb877, 54, 26, 0.8, 0.78, 1.7);
        wallSpot2.position.set(0, 8.4, 7.5);
        wallSpot2.target.position.set(0, 6.6, -12.6);
        root.add(wallSpot2);
        root.add(wallSpot2.target);
    }

    function buildDust() {
        const count = smallScreen ? 180 : 320;
        const positions = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
            positions[i * 3] = rand(-10, 10);
            positions[i * 3 + 1] = rand(0.6, 12);
            positions[i * 3 + 2] = rand(-12, 8);
        }
        const geo = track(new THREE.BufferGeometry());
        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const mat = new THREE.PointsMaterial({
            color: 0xffd9a0,
            size: 0.055,
            transparent: true,
            opacity: 0.42,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });
        dust = new THREE.Points(geo, mat);
        root.add(dust);
    }

    function build() {
        const mats = buildMaterials();
        const glowTex = glowTexture();
        buildGround(mats);
        buildWalls(mats);
        buildColumns(mats);
        buildLatticeWalls(mats);
        buildDoor(mats);
        buildScrolls(mats);
        buildSideShelves(mats);
        buildFurniture(mats);
        buildBanners(mats);
        buildLanterns(mats, glowTex);
        buildDust();
    }

    function viewLayout() {
        const aspect = camera.aspect;
        const h = container.clientHeight || window.innerHeight;
        const portrait = aspect < 0.86;
        const short = h < 540;
        if (portrait) {
            return {
                pos: new THREE.Vector3(0, 6.2, 6.4),
                look: new THREE.Vector3(0, 6.35, HALL.back),
                fov: 54,
                start: new THREE.Vector3(0, 6.1, 25.8),
                startLook: new THREE.Vector3(0, 6.6, HALL.door),
                focusZ: HALL.scrollZ + 8.2,
                panelY: -1.7,
                panelX: 0
            };
        }
        if (short) {
            return {
                pos: new THREE.Vector3(0, 5.7, 5.6),
                look: new THREE.Vector3(0, 6.3, HALL.back),
                fov: 50,
                start: new THREE.Vector3(0, 5.9, 25.4),
                startLook: new THREE.Vector3(0, 6.5, HALL.door),
                focusZ: HALL.scrollZ + 7.4,
                panelY: 0,
                panelX: 2.0
            };
        }
        return {
            pos: new THREE.Vector3(0, 5.95, 3.4),
            look: new THREE.Vector3(0, 6.35, HALL.back),
            fov: 46,
            start: new THREE.Vector3(0, 6.05, 25.6),
            startLook: new THREE.Vector3(0, 6.6, HALL.door),
            focusZ: HALL.scrollZ + 9.6,
            panelY: 0,
            panelX: 2.2
        };
    }

    function desiredCamera() {
        const layout = viewLayout();
        const out = {
            pos: layout.pos.clone(),
            look: layout.look.clone(),
            fov: layout.fov
        };
        if (focused && scrollAnchors[focused]) {
            const a = scrollAnchors[focused];
            const portrait = camera.aspect < 0.86;
            out.pos.set(
                a.x + (panelOpen && !portrait ? layout.panelX : 0),
                a.y + 0.1,
                layout.focusZ
            );
            out.look.set(
                a.x,
                a.y + (panelOpen && portrait ? layout.panelY : 0),
                a.z
            );
        }
        return { out: out, layout: layout };
    }

    function applyCamera(dt, entering) {
        const wanted = desiredCamera();
        let pos = wanted.out.pos;
        let look = wanted.out.look;
        let fov = wanted.out.fov;

        if (entering) {
            const p = clamp((time - enterStart) / 3.4, 0, 1);
            const e = easeInOut(p);
            pos = wanted.layout.start.clone().lerp(pos, e);
            look = wanted.layout.startLook.clone().lerp(look, e);
        }

        const sway = Math.sin(time * 0.19) * 0.22;
        const bob = Math.sin(time * 0.26 + 1.1) * 0.07;
        if (!entering) {
            pos = pos.clone();
            pos.x += sway + pointer.x * 0.55;
            pos.y += bob - pointer.y * 0.3;
            look = look.clone();
            look.x += pointer.x * 0.34;
            look.y += pointer.y * 0.2;
        }

        const k = entering ? Math.min(1, dt * 9) : Math.min(1, dt * 2.8);
        cam.pos.lerp(pos, k);
        cam.look.lerp(look, k);
        cam.fov += (fov - cam.fov) * Math.min(1, dt * 3.2);

        camera.position.copy(cam.pos);
        camera.lookAt(cam.look);
        if (Math.abs(camera.fov - cam.fov) > 0.01) {
            camera.fov = cam.fov;
            camera.updateProjectionMatrix();
        }
    }

    function resize() {
        if (!renderer || !camera) return;
        const w = container.clientWidth || window.innerWidth;
        const h = container.clientHeight || window.innerHeight;
        const aspect = w / Math.max(1, h);

        renderer.setSize(w, h, false);
        camera.aspect = aspect;
        const layout = viewLayout();
        camera.fov = layout.fov;
        camera.updateProjectionMatrix();
        cam.fov = layout.fov;

        needsResize = false;
    }

    function updateDoors() {
        if (enterStart < 0) return;
        const p = clamp((time - enterStart) / 2.3, 0, 1);
        const angle = easeOutCubic(p) * 1.92;
        for (let i = 0; i < doorPivots.length; i++) {
            const d = doorPivots[i];
            d.group.rotation.y = d.dir * angle;
            if ((time - enterStart) > 2.5) d.group.visible = false;
        }
    }

    function tick(now) {
        if (!running) return;
        rafId = requestAnimationFrame(tick);
        if (!lastTime) lastTime = now;
        const dt = Math.min(0.05, (now - lastTime) / 1000);
        lastTime = now;
        time += dt;

        const entering = enterStart >= 0 && (time - enterStart) < 3.4;
        const k = Math.min(1, dt * 2.6);
        pointer.x += (pointer.tx - pointer.x) * k;
        pointer.y += (pointer.ty - pointer.y) * k;

        updateDoors();
        applyCamera(dt, entering);

        for (let i = 0; i < lanterns.length; i++) {
            const l = lanterns[i];
            const flicker = 0.9 + Math.sin(time * 2.2 + l.phase) * 0.07 + Math.sin(time * 5.7 + l.phase) * 0.03;
            l.light.intensity = l.base * flicker;
            if (l.glow) l.glow.material.opacity = 0.52 + flicker * 0.16;
        }

        if (dust) {
            dust.rotation.y = Math.sin(time * 0.04) * 0.03;
            dust.position.y = Math.sin(time * 0.2) * 0.1;
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
            hovered = null;
            onHover(null, null);
        }
    }

    function enter() {
        enterStart = time;
        focused = null;
        panelOpen = false;
        clearHover();
        for (let i = 0; i < doorPivots.length; i++) doorPivots[i].group.visible = true;
    }

    function focusScroll(id) {
        if (!scrollAnchors[id]) return;
        focused = id;
    }

    function showAll() {
        focused = null;
    }

    function setPanelOpen(val) {
        panelOpen = !!val;
    }

    function clearHover() {
        if (hovered) {
            hovered.material.emissiveIntensity = hovered.userData.baseEmissive || 0.2;
            hovered = null;
            renderer.domElement.style.cursor = '';
            onHover(null, null);
        }
    }

    function pick() {
        if (!renderer) return null;
        raycaster.setFromCamera(pointerNdc, camera);
        const hits = raycaster.intersectObjects(scrollMeshes, false);
        return hits.length ? hits[0].object : null;
    }

    function updateHover(clientX, clientY) {
        if (!active || !renderer) return;
        const rect = renderer.domElement.getBoundingClientRect();
        pointerNdc.x = ((clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1;
        pointerNdc.y = -((clientY - rect.top) / Math.max(1, rect.height)) * 2 + 1;
        const hit = pick();
        if (hit !== hovered) {
            clearHover();
            if (hit) {
                hovered = hit;
                hit.material.emissiveIntensity = (hit.userData.baseEmissive || 0.2) + 0.5;
                renderer.domElement.style.cursor = 'pointer';
                const info = scrolls.find(function (s) { return s.id === hit.userData.scrollId; });
                onHover(info || null, {
                    x: clientX - rect.left,
                    y: clientY - rect.top,
                    visible: true
                });
            }
        } else if (hovered) {
            const info = scrolls.find(function (s) { return s.id === hovered.userData.scrollId; });
            onHover(info || null, {
                x: clientX - rect.left,
                y: clientY - rect.top,
                visible: true
            });
        }
    }

    function onPointerMove(e) {
        if (!active) return;
        const rect = container.getBoundingClientRect();
        pointer.tx = clamp(((e.clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1, -1, 1);
        pointer.ty = clamp(((e.clientY - rect.top) / Math.max(1, rect.height)) * 2 - 1, -1, 1) * 0.7;
        updateHover(e.clientX, e.clientY);
    }

    function onPointerLeave() {
        pointer.tx = 0;
        pointer.ty = 0;
        clearHover();
    }

    function onClick(e) {
        if (!active) return;
        const hit = pick();
        if (!hit) return;
        const id = hit.userData.scrollId;
        if (id) onSelect(id);
    }

    function onTouch(e) {
        if (!active || !e.changedTouches || !e.changedTouches.length) return;
        const t = e.changedTouches[0];
        const rect = renderer.domElement.getBoundingClientRect();
        pointerNdc.x = ((t.clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1;
        pointerNdc.y = -((t.clientY - rect.top) / Math.max(1, rect.height)) * 2 + 1;
        const hit = pick();
        if (hit && hit.userData.scrollId) onSelect(hit.userData.scrollId);
    }

    function bind() {
        const el = renderer.domElement;
        el.addEventListener('pointermove', onPointerMove);
        el.addEventListener('pointerleave', onPointerLeave);
        el.addEventListener('click', onClick);
        el.addEventListener('touchend', onTouch);
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
    cam.pos.copy(viewLayout().pos);
    cam.look.copy(viewLayout().look);
    camera.position.copy(cam.pos);
    camera.lookAt(cam.look);

    if (opts.onReady) opts.onReady();

    return {
        start: start,
        stop: stop,
        dispose: dispose,
        setActive: setActive,
        resize: resize,
        enter: enter,
        focusScroll: focusScroll,
        showAll: showAll,
        setPanelOpen: setPanelOpen,
        clearHover: clearHover
    };
}
