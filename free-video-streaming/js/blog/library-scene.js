import * as THREE from '../../lib/three.module.js';

const CATEGORY_META = {
    '工具': { label: '开发工具', kicker: 'CRAFT & TOOLS', color: 0x2f6b5b },
    'AI': { label: 'AI 大模型', kicker: 'AI & MODELS', color: 0x3d4d86 },
    '教程': { label: '技术教程', kicker: 'TUTORIALS', color: 0x8a5a2b },
    '部署': { label: '部署指南', kicker: 'DEPLOYMENT', color: 0x7c3232 }
};

const CATEGORY_ORDER = ['工具', 'AI', '教程', '部署'];
const SHELF_X = [-4.28, -1.43, 1.43, 4.28];
let mainPlaque = null;

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

function wrapLines(ctx, text, maxWidth, maxLines) {
    const chars = String(text || '').split('');
    const lines = [];
    let line = '';
    for (let i = 0; i < chars.length; i++) {
        const ch = chars[i];
        if (ch === '\n') {
            lines.push(line);
            line = '';
            continue;
        }
        const test = line + ch;
        if (line && ctx.measureText(test).width > maxWidth) {
            lines.push(line);
            line = ch;
        } else {
            line = test;
        }
    }
    if (line) lines.push(line);
    if (lines.length > maxLines) {
        const keep = lines.slice(0, maxLines);
        keep[maxLines - 1] = keep[maxLines - 1].replace(/.$/, '…');
        return keep;
    }
    return lines;
}

function makeTexture(canvas, repeatX, repeatY) {
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    if (repeatX || repeatY) t.repeat.set(repeatX || 1, repeatY || 1);
    t.anisotropy = 4;
    return t;
}

function makeFloorTexture() {
    const { c, ctx } = canvas2d(512, 512);
    const g = ctx.createLinearGradient(0, 0, 512, 512);
    g.addColorStop(0, '#6d4728');
    g.addColorStop(0.5, '#57371f');
    g.addColorStop(1, '#412716');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 512, 512);

    for (let y = 0; y < 512; y += 64) {
        ctx.fillStyle = 'rgba(12, 7, 4, 0.5)';
        ctx.fillRect(0, y, 512, 2);
        for (let x = 0; x < 512; x += 128) {
            const off = (y / 64) % 2 ? 64 : 0;
            ctx.fillRect(x + off, y, 2, 64);
        }
    }
    for (let i = 0; i < 140; i++) {
        ctx.strokeStyle = 'rgba(126, 86, 52, ' + rand(0.04, 0.16).toFixed(3) + ')';
        ctx.lineWidth = rand(0.5, 1.6);
        const y = rand(0, 512);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.bezierCurveTo(160, y + rand(-6, 6), 340, y + rand(-6, 6), 512, y + rand(-4, 4));
        ctx.stroke();
    }
    return makeTexture(c, 4, 3);
}

function makeWallTexture() {
    const { c, ctx } = canvas2d(512, 512);
    const g = ctx.createLinearGradient(0, 0, 0, 512);
    g.addColorStop(0, '#e1d0b2');
    g.addColorStop(0.55, '#d5c09d');
    g.addColorStop(1, '#c8b088');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 2600; i++) {
        ctx.fillStyle = 'rgba(' + (100 + Math.floor(rand(0, 60))) + ',' + (80 + Math.floor(rand(0, 46))) + ',' + (52 + Math.floor(rand(0, 40))) + ',' + rand(0.02, 0.1).toFixed(3) + ')';
        const s = rand(0.6, 2.2);
        ctx.fillRect(rand(0, 512), rand(0, 512), s, s);
    }
    for (let i = 0; i < 8; i++) {
        ctx.strokeStyle = 'rgba(96, 72, 48, 0.08)';
        ctx.lineWidth = rand(0.6, 1.4);
        ctx.beginPath();
        ctx.moveTo(0, rand(0, 512));
        ctx.lineTo(512, rand(0, 512));
        ctx.stroke();
    }
    return makeTexture(c, 3, 2);
}

function makeGlowTexture() {
    const { c, ctx } = canvas2d(64, 64);
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255, 240, 205, 1)');
    g.addColorStop(0.35, 'rgba(255, 214, 150, 0.55)');
    g.addColorStop(1, 'rgba(255, 190, 120, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
    return makeTexture(c);
}

function makeCoverTexture(item, meta) {
    const { c, ctx } = canvas2d(256, 360);
    const base = new THREE.Color(meta.color);
    const dark = base.clone().offsetHSL(0, 0.02, -0.11);
    const light = base.clone().offsetHSL(0, -0.02, 0.04);
    const g = ctx.createLinearGradient(0, 0, 256, 360);
    g.addColorStop(0, '#' + light.getHexString());
    g.addColorStop(0.55, '#' + base.getHexString());
    g.addColorStop(1, '#' + dark.getHexString());
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 360);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.045)';
    ctx.lineWidth = 1;
    for (let i = -360; i < 360; i += 7) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i + 360, 360);
        ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(214, 180, 118, 0.88)';
    ctx.lineWidth = 3;
    ctx.strokeRect(15, 15, 226, 330);
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(214, 180, 118, 0.55)';
    ctx.strokeRect(23, 23, 210, 314);

    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(233, 207, 160, 0.8)';
    ctx.font = '15px ' + fontFace();
    ctx.fillText('文 渊 阁 藏', 128, 54);

    ctx.font = '600 33px ' + fontFace();
    ctx.fillStyle = '#f6e9ca';
    const lines = wrapLines(ctx, item.short || item.title, 184, 3);
    const lineHeight = 40;
    let startY = 142 - (lines.length - 1) * lineHeight / 2;
    for (let i = 0; i < lines.length; i++) {
        ctx.fillText(lines[i], 128, startY + i * lineHeight);
    }

    ctx.fillStyle = 'rgba(214, 180, 118, 0.5)';
    ctx.fillRect(78, 268, 100, 1);

    ctx.fillStyle = 'rgba(232, 206, 160, 0.86)';
    ctx.font = '13px ' + fontFace();
    ctx.fillText(meta.label, 128, 292);

    ctx.fillStyle = 'rgba(232, 206, 160, 0.55)';
    ctx.font = '11px ' + fontFace();
    ctx.fillText(item.date || '', 128, 312);

    ctx.fillStyle = '#b23a2e';
    ctx.fillRect(186, 296, 34, 34);
    ctx.strokeStyle = 'rgba(246, 226, 190, 0.7)';
    ctx.lineWidth = 1;
    ctx.strokeRect(189, 299, 28, 28);
    ctx.fillStyle = '#f3e2bf';
    ctx.font = '19px ' + fontFace();
    ctx.fillText('藏', 203, 320);

    return makeTexture(c);
}

function makeEdgeLabel(item) {
    const { c, ctx } = canvas2d(256, 42);
    ctx.fillStyle = '#241610';
    ctx.fillRect(0, 0, 256, 42);
    ctx.strokeStyle = 'rgba(201, 162, 92, 0.5)';
    ctx.lineWidth = 1;
    ctx.strokeRect(1, 1, 254, 40);
    ctx.fillStyle = 'rgba(239, 222, 186, 0.92)';
    ctx.font = '17px ' + fontFace();
    ctx.textAlign = 'center';
    ctx.fillText(item.short || item.title, 128, 27);
    return makeTexture(c);
}

function makeShelfPlaque(meta, count) {
    const { c, ctx } = canvas2d(512, 144);
    ctx.fillStyle = '#241410';
    ctx.fillRect(0, 0, 512, 144);
    ctx.strokeStyle = 'rgba(201, 162, 92, 0.9)';
    ctx.lineWidth = 3;
    ctx.strokeRect(8, 8, 496, 128);
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(201, 162, 92, 0.45)';
    ctx.strokeRect(16, 16, 480, 112);

    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(201, 162, 92, 0.8)';
    ctx.font = '15px ' + fontFace();
    ctx.fillText(meta.kicker, 256, 44);

    ctx.fillStyle = '#f2e3c4';
    ctx.font = '600 38px ' + fontFace();
    ctx.fillText(meta.label, 256, 88);

    ctx.fillStyle = 'rgba(214, 180, 118, 0.68)';
    ctx.font = '14px ' + fontFace();
    ctx.fillText('共 ' + count + ' 卷', 256, 118);

    return makeTexture(c);
}

function makeMainPlaque() {
    const { c, ctx } = canvas2d(1024, 280);
    ctx.fillStyle = '#1d0f0b';
    ctx.fillRect(0, 0, 1024, 280);
    ctx.strokeStyle = 'rgba(206, 168, 98, 0.92)';
    ctx.lineWidth = 6;
    ctx.strokeRect(18, 18, 988, 244);
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(206, 168, 98, 0.5)';
    ctx.strokeRect(32, 32, 960, 216);

    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(206, 168, 98, 0.8)';
    ctx.font = '20px ' + fontFace();
    ctx.fillText('W A N G X I N G   I S L E', 512, 78);

    ctx.fillStyle = '#f6e7c6';
    ctx.font = '600 116px ' + fontFace();
    const title = '藏书楼';
    const spacing = 148;
    const startX = 512 - spacing;
    for (let i = 0; i < title.length; i++) {
        ctx.fillText(title[i], startX + i * spacing, 190);
    }

    ctx.fillStyle = 'rgba(214, 180, 118, 0.72)';
    ctx.font = '20px ' + fontFace();
    ctx.fillText('文 渊 阁 · 七 卷 藏 书', 512, 238);

    ctx.strokeStyle = 'rgba(206, 168, 98, 0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(120, 154);
    ctx.lineTo(220, 154);
    ctx.moveTo(804, 154);
    ctx.lineTo(904, 154);
    ctx.stroke();

    return makeTexture(c);
}

function makeLanternTexture() {
    const { c, ctx } = canvas2d(128, 128);
    const g = ctx.createRadialGradient(64, 64, 4, 64, 64, 70);
    g.addColorStop(0, '#ffe4b0');
    g.addColorStop(0.5, '#f4b45f');
    g.addColorStop(1, '#c96f2e');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    ctx.strokeStyle = 'rgba(120, 52, 20, 0.3)';
    for (let y = 16; y < 128; y += 20) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(128, y);
        ctx.stroke();
    }
    return makeTexture(c);
}

export function createLibrary(options) {
    const container = options.container;
    const catalog = options.catalog || { items: [], categories: [] };
    const onSelect = options.onSelect || function () {};
    const onHover = options.onHover || function () {};
    const onShelfHover = options.onShelfHover || function () {};
    const onShelfFocus = options.onShelfFocus || function () {};
    const onPlaqueLayout = options.onPlaqueLayout || function () {};

    let renderer, scene, camera, root;
    let active = false;
    let running = false;
    let rafId = 0;
    let lastTime = 0;
    let time = 0;
    let hoveredEntry = null;
    let hoveredPlaque = null;
    let focusedShelf = 'all';
    let dust = null;
    let needsResize = true;

    const disposables = [];
    const textures = [];
    const geometryCache = new Map();
    const bookMeshes = [];
    const bookEntries = [];
    const plaqueMeshes = [];
    const lanterns = [];
    const shelfPositions = {};

    const cameraState = {
        theta: 0,
        phi: 1.44,
        radius: 10.2,
        targetTheta: 0,
        targetPhi: 1.43,
        targetRadius: 10.2,
        focus: new THREE.Vector3(0, 2.2, -3.0),
        targetFocus: new THREE.Vector3(0, 2.2, -3.0)
    };

    const drag = { down: false, moved: 0, x: 0, y: 0, id: null };
    const pointer = { x: 0, y: 0 };
    const raycaster = new THREE.Raycaster();
    const tmpVec = new THREE.Vector3();

    function track(item) {
        disposables.push(item);
        return item;
    }

    function boxGeo(w, h, d) {
        const key = w.toFixed(3) + '|' + h.toFixed(3) + '|' + d.toFixed(3);
        if (!geometryCache.has(key)) {
            geometryCache.set(key, new THREE.BoxGeometry(w, h, d));
        }
        return geometryCache.get(key);
    }

    function addBox(parent, w, h, d, mat, x, y, z, ry, rx, rz) {
        const mesh = new THREE.Mesh(boxGeo(w, h, d), mat);
        mesh.position.set(x, y, z);
        if (ry) mesh.rotation.y = ry;
        if (rx) mesh.rotation.x = rx;
        if (rz) mesh.rotation.z = rz;
        parent.add(mesh);
        return mesh;
    }

    function setupRenderer() {
        renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: false,
            powerPreference: 'high-performance'
        });
        const smallScreen = window.innerWidth <= 768;
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, smallScreen ? 1.5 : 1.75));
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = window.innerWidth <= 768 ? 1.46 : 1.38;
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.setClearColor(0x0b0806, 1);
        renderer.domElement.setAttribute('aria-label', '藏书楼三维场景');
        container.appendChild(renderer.domElement);
    }

    function setupScene() {
        scene = new THREE.Scene();
        scene.fog = new THREE.FogExp2(0x0c0906, 0.012);

        camera = new THREE.PerspectiveCamera(42, 1, 0.1, 90);
        scene.add(camera);

        root = new THREE.Group();
        scene.add(root);

        scene.add(new THREE.AmbientLight(0xac906a, 1.9));
        const hemi = new THREE.HemisphereLight(0xe0c59a, 0x35200f, 1.6);
        scene.add(hemi);

        const key = new THREE.DirectionalLight(0xffd8a4, 1.55);
        key.position.set(6.5, 10, 9);
        key.castShadow = true;
        const shadowSize = window.innerWidth <= 768 ? 512 : 1024;
        key.shadow.mapSize.set(shadowSize, shadowSize);
        key.shadow.camera.near = 0.5;
        key.shadow.camera.far = 32;
        key.shadow.camera.left = -12;
        key.shadow.camera.right = 12;
        key.shadow.camera.top = 12;
        key.shadow.camera.bottom = -2;
        key.shadow.bias = -0.0015;
        key.shadow.normalBias = 0.03;
        scene.add(key);

        const fill = new THREE.DirectionalLight(0x92a8c8, 0.62);
        fill.position.set(-9, 6, 4);
        scene.add(fill);

        const front = new THREE.DirectionalLight(0xffe2b8, 0.9);
        front.position.set(0, 3.6, 9.5);
        scene.add(front);

        const bounce = new THREE.PointLight(0xffc887, 9, 13, 2);
        bounce.position.set(0, 1.1, 2.6);
        scene.add(bounce);
    }

    function buildWindows(lacquer, paper, gold) {
        const paperMat = track(new THREE.MeshStandardMaterial({
            color: 0xf7d9a1,
            emissive: 0xcf7f35,
            emissiveIntensity: 0.62,
            roughness: 0.9,
            side: THREE.DoubleSide
        }));

        const positions = [
            [-11.78, 3.35, -2.4, Math.PI / 2],
            [-11.78, 3.35, 2.1, Math.PI / 2],
            [11.78, 3.35, -2.4, -Math.PI / 2],
            [11.78, 3.35, 2.1, -Math.PI / 2]
        ];

        for (let p = 0; p < positions.length; p++) {
            const item = positions[p];
            const group = new THREE.Group();
            group.position.set(item[0], item[1], item[2]);
            group.rotation.y = item[3];
            root.add(group);

            const panel = new THREE.Mesh(track(new THREE.PlaneGeometry(3.1, 2.3)), paperMat);
            panel.position.z = 0.02;
            group.add(panel);

            addBox(group, 3.3, 0.12, 0.1, lacquer, 0, 1.2, 0.08);
            addBox(group, 3.3, 0.12, 0.1, lacquer, 0, -1.2, 0.08);
            addBox(group, 0.12, 2.5, 0.1, lacquer, -1.62, 0, 0.08);
            addBox(group, 0.12, 2.5, 0.1, lacquer, 1.62, 0, 0.08);

            for (let i = -3; i <= 3; i++) {
                addBox(group, 0.045, 2.32, 0.05, lacquer, i * 0.42, 0, 0.12);
            }
            for (let i = -2; i <= 2; i++) {
                addBox(group, 3.1, 0.045, 0.05, lacquer, 0, i * 0.44, 0.12);
            }
            addBox(group, 0.1, 0.1, 0.12, gold, 0, 0, 0.14);
        }
    }

    function buildPlaque(lacquer, gold) {
        const group = new THREE.Group();
        group.position.set(0, 5.28, -5.95);
        root.add(group);
        addBox(group, 4.7, 1.24, 0.12, lacquer, 0, 0, 0);
        addBox(group, 4.86, 0.12, 0.16, gold, 0, 0.66, 0.01);
        addBox(group, 4.86, 0.12, 0.16, gold, 0, -0.66, 0.01);
        addBox(group, 0.12, 1.34, 0.16, gold, -2.37, 0, 0.01);
        addBox(group, 0.12, 1.34, 0.16, gold, 2.37, 0, 0.01);

        const tex = track(makeMainPlaque());
        textures.push(tex);
        const mat = track(new THREE.MeshStandardMaterial({
            map: tex,
            emissive: 0x2a1a0c,
            emissiveIntensity: 0.35,
            roughness: 0.72
        }));
        const panel = new THREE.Mesh(track(new THREE.PlaneGeometry(4.5, 1.16)), mat);
        panel.position.z = 0.075;
        group.add(panel);

        addBox(group, 0.03, 0.5, 0.03, gold, -2.1, -0.9, 0.02);
        addBox(group, 0.03, 0.5, 0.03, gold, 2.1, -0.9, 0.02);
        const tasselMat = track(new THREE.MeshStandardMaterial({ color: 0x9b2f25, roughness: 0.9 }));
        addBox(group, 0.07, 0.42, 0.07, tasselMat, -2.1, -1.34, 0.02);
        addBox(group, 0.07, 0.42, 0.07, tasselMat, 2.1, -1.34, 0.02);
        return group;
    }

    function buildLanterns(gold, paper) {
        const lanternTex = track(makeLanternTexture());
        textures.push(lanternTex);
        const glowMat = track(new THREE.MeshStandardMaterial({
            map: lanternTex,
            emissive: 0xff9d45,
            emissiveIntensity: 0.95,
            color: 0xffd9a4,
            roughness: 0.85
        }));

        const spots = [[-4.5, 4.45, 2.3], [4.5, 4.45, 2.3]];
        for (let i = 0; i < spots.length; i++) {
            const group = new THREE.Group();
            group.position.set(spots[i][0], spots[i][1], spots[i][2]);
            root.add(group);

            const cord = new THREE.Mesh(track(new THREE.CylinderGeometry(0.014, 0.014, 1.2, 6)), gold);
            cord.position.y = 1.08;
            group.add(cord);

            const body = new THREE.Mesh(track(new THREE.CylinderGeometry(0.3, 0.3, 0.62, 16)), glowMat);
            body.castShadow = false;
            group.add(body);

            const top = new THREE.Mesh(track(new THREE.CylinderGeometry(0.22, 0.3, 0.12, 16)), gold);
            top.position.y = 0.37;
            group.add(top);
            const bottom = new THREE.Mesh(track(new THREE.CylinderGeometry(0.3, 0.22, 0.12, 16)), gold);
            bottom.position.y = -0.37;
            group.add(bottom);
            addBox(group, 0.06, 0.34, 0.06, new THREE.MeshStandardMaterial({ color: 0x8e2c22, roughness: 0.9 }), 0, -0.6, 0);

            const light = new THREE.PointLight(0xffb066, 13, 9, 2);
            light.position.set(0, 0, 0.05);
            group.add(light);
            lanterns.push({ light: light, base: 13, phase: rand(0, Math.PI * 2), mat: glowMat });
        }
    }

    function buildTable(woodDark, woodMid, paper, gold) {
        const group = new THREE.Group();
        group.position.set(0, 0, 1.6);
        group.scale.set(1, 0.78, 0.92);
        if (window.innerWidth <= 900) {
            group.position.z = 4.2;
            group.scale.set(1.4, 0.85, 1.3);
        }
        root.add(group);

        const top = addBox(group, 3.6, 0.14, 0.95, woodMid, 0, 0.78, 0);
        top.castShadow = true;
        top.receiveShadow = true;
        addBox(group, 3.36, 0.06, 0.76, woodDark, 0, 0.69, 0);
        const legXs = [-1.54, 1.54];
        const legZs = [-0.33, 0.33];
        for (let i = 0; i < legXs.length; i++) {
            for (let j = 0; j < legZs.length; j++) {
                const leg = addBox(group, 0.12, 0.72, 0.12, woodDark, legXs[i], 0.36, legZs[j]);
                leg.castShadow = true;
            }
        }
        addBox(group, 3.1, 0.08, 0.08, woodDark, 0, 0.2, 0);
        addBox(group, 3.1, 0.08, 0.08, woodDark, 0, 0.2, 0.55);

        const stackMats = [
            track(new THREE.MeshStandardMaterial({ color: 0x355247, roughness: 0.8 })),
            track(new THREE.MeshStandardMaterial({ color: 0x5f3a28, roughness: 0.8 })),
            track(new THREE.MeshStandardMaterial({ color: 0x3e4766, roughness: 0.8 }))
        ];
        for (let i = 0; i < 3; i++) {
            const flatBook = addBox(group, 0.66, 0.075, 0.44, stackMats[i], -0.72, 0.85 + i * 0.078, 0.04, rand(-0.06, 0.06));
            flatBook.castShadow = true;
        }
        addBox(group, 0.5, 0.012, 0.012, gold, -0.72, 0.93, 0.27, 0.1);

        const burner = new THREE.Mesh(track(new THREE.CylinderGeometry(0.09, 0.12, 0.13, 12)), gold);
        burner.position.set(1.15, 0.8, 0.18);
        group.add(burner);
        const lid = new THREE.Mesh(track(new THREE.CylinderGeometry(0.06, 0.09, 0.05, 12)), woodDark);
        lid.position.set(1.15, 0.89, 0.18);
        group.add(lid);
    }

    function buildShelfUnit(category, items, x) {
        const meta = CATEGORY_META[category] || { label: category, kicker: 'COLLECTION', color: 0x5d5d5d };
        const woodDark = track(new THREE.MeshStandardMaterial({ color: 0x3d2416, roughness: 0.82 }));
        const woodMid = track(new THREE.MeshStandardMaterial({ color: 0x5d3a23, roughness: 0.8 }));
        const woodLight = track(new THREE.MeshStandardMaterial({ color: 0x7b4f2e, roughness: 0.78 }));
        const lacquer = track(new THREE.MeshStandardMaterial({ color: 0x24110c, roughness: 0.55 }));
        const gold = track(new THREE.MeshStandardMaterial({ color: 0xc9a25c, metalness: 0.6, roughness: 0.34 }));
        const paper = track(new THREE.MeshStandardMaterial({ color: 0xe9d6af, roughness: 0.9 }));

        const unit = new THREE.Group();
        unit.position.set(x, 0, -5.45);
        root.add(unit);

        const W = 2.5;
        const H = 4.06;
        const D = 0.86;

        addBox(unit, W + 0.2, 0.1, D + 0.14, woodDark, 0, 0.05, 0);
        addBox(unit, W, 0.18, D, woodDark, 0, 0.16, 0);
        addBox(unit, W - 0.1, 0.06, D - 0.06, woodMid, 0, 0.26, 0.01);

        addBox(unit, 0.1, H, D, woodDark, -W / 2 + 0.05, H / 2, 0);
        addBox(unit, 0.1, H, D, woodDark, W / 2 - 0.05, H / 2, 0);
        addBox(unit, W - 0.16, H - 0.2, 0.06, woodMid, 0, H / 2 + 0.02, -D / 2 + 0.06);

        const shelfYs = [1.62, 2.98, 3.96];
        for (let i = 0; i < shelfYs.length; i++) {
            const board = addBox(unit, W - 0.16, 0.07, D - 0.08, woodMid, 0, shelfYs[i], 0.01);
            board.castShadow = true;
            board.receiveShadow = true;
        }

        addBox(unit, W + 0.16, 0.12, D + 0.12, woodDark, 0, H + 0.06, 0);
        addBox(unit, W + 0.32, 0.08, D + 0.22, woodDark, 0, H + 0.17, 0);
        addBox(unit, W + 0.5, 0.06, D + 0.32, woodDark, 0, H + 0.25, 0);
        addBox(unit, W - 0.2, 0.09, 0.03, gold, 0, H + 0.02, D / 2);

        const doorZ = D / 2 + 0.02;
        for (let d = -1; d <= 1; d += 2) {
            addBox(unit, 1.08, 1.28, 0.045, woodMid, d * 0.56, 0.94, doorZ);
            addBox(unit, 0.92, 1.12, 0.018, woodDark, d * 0.56, 0.94, doorZ + 0.028);
            addBox(unit, 1.08, 0.05, 0.06, woodDark, d * 0.56, 1.56, doorZ + 0.012);
            addBox(unit, 1.08, 0.05, 0.06, woodDark, d * 0.56, 0.32, doorZ + 0.012);
            const handle = new THREE.Mesh(track(new THREE.TorusGeometry(0.05, 0.011, 6, 14)), gold);
            handle.position.set(d * 0.5, 0.98, doorZ + 0.07);
            unit.add(handle);
        }
        addBox(unit, 0.07, 0.2, 0.035, gold, 0, 0.98, doorZ + 0.05);

        const plaqueTex = track(makeShelfPlaque(meta, items.length));
        textures.push(plaqueTex);
        const plaqueMat = track(new THREE.MeshStandardMaterial({
            map: plaqueTex,
            emissive: 0x26160a,
            emissiveIntensity: 0.32,
            roughness: 0.7
        }));
        addBox(unit, 2.02, 0.58, 0.08, lacquer, 0, 4.55, 0.18);
        const plaque = new THREE.Mesh(track(new THREE.PlaneGeometry(1.9, 0.5)), plaqueMat);
        plaque.position.set(0, 4.55, 0.225);
        plaque.userData.plaque = {
            mesh: plaque,
            mat: plaqueMat,
            base: 0.32,
            category: category,
            label: meta.label,
            count: items.length
        };
        plaqueMeshes.push(plaque);
        unit.add(plaque);
        addBox(unit, 0.03, 0.48, 0.03, gold, -0.98, 4.55, 0.19);
        addBox(unit, 0.03, 0.48, 0.03, gold, 0.98, 4.55, 0.19);

        buildShelfDecor(unit, meta, items.length, woodDark, woodMid, woodLight, lacquer, paper, gold);
        buildShelfCompanions(unit, items.length);

        const offsets = items.length === 1 ? [0] : items.length === 2 ? [-0.3, 0.3] : [-0.42, 0, 0.42];
        const scale = items.length === 1 ? 1.22 : items.length === 2 ? 1.06 : 0.98;
        let baseY = 1.68;
        if (items.length === 1) {
            baseY = 2.03;
            addBox(unit, 0.78, 0.3, 0.5, woodMid, 0, 1.83, 0.12);
            addBox(unit, 0.84, 0.045, 0.56, gold, 0, 1.99, 0.12);
            addBox(unit, 0.66, 0.03, 0.42, lacquer, 0, 1.7, 0.12);
        }
        for (let i = 0; i < items.length; i++) {
            buildBook(unit, items[i], meta, offsets[i] || 0, scale, woodMid, baseY);
        }

        shelfPositions[category] = { x: x, meta: meta, count: items.length };
    }

    function buildShelfDecor(unit, meta, count, woodDark, woodMid, woodLight, lacquer, paper, gold) {
        const spineMats = [
            track(new THREE.MeshStandardMaterial({ color: 0x5f3a28, roughness: 0.8 })),
            track(new THREE.MeshStandardMaterial({ color: 0x355247, roughness: 0.8 })),
            track(new THREE.MeshStandardMaterial({ color: 0x3e4766, roughness: 0.8 })),
            track(new THREE.MeshStandardMaterial({ color: 0x6b4a2a, roughness: 0.8 }))
        ];
        const xs = [-1.0, -0.86, -0.72, -0.58, 0.58, 0.72, 0.86, 1.0];
        for (let i = 0; i < xs.length; i++) {
            const height = 0.48 + ((i * 37) % 13) / 13 * 0.16;
            const width = 0.075 + ((i * 17) % 7) / 7 * 0.03;
            const spine = addBox(unit, width, height, 0.28, spineMats[i % spineMats.length], xs[i], 3.02 + height / 2, -0.14);
            spine.castShadow = true;
        }
        for (let i = 0; i < 2; i++) {
            const scroll = new THREE.Mesh(track(new THREE.CylinderGeometry(0.05, 0.05, 0.44, 10)), paper);
            scroll.rotation.z = Math.PI / 2;
            scroll.rotation.y = i === 0 ? 0.08 : -0.1;
            scroll.position.set(i === 0 ? -0.38 : 0.38, 3.09, 0.08);
            scroll.castShadow = true;
            unit.add(scroll);
        }
        buildVase(unit, 0, 3.02);
    }

    function buildShelfCompanions(unit, count) {
        const palette = [0x5f3a28, 0x355247, 0x3e4766];
        const mats = [];
        for (let i = 0; i < palette.length; i++) {
            mats.push(track(new THREE.MeshStandardMaterial({ color: palette[i], roughness: 0.8 })));
        }
        const xs = count === 1
            ? [-0.96, -0.82, -0.68, -0.54, 0.54, 0.68, 0.82, 0.96]
            : count === 2
                ? [-0.96, -0.82, -0.68, 0.68, 0.82, 0.96]
                : [-0.96, -0.82, 0.82, 0.96];
        for (let i = 0; i < xs.length; i++) {
            const height = 0.58 + ((i * 29) % 11) / 11 * 0.14;
            const book = addBox(unit, 0.09, height, 0.27, mats[i % mats.length], xs[i], 1.68 + height / 2, 0.04, rand(-0.03, 0.03));
            book.castShadow = true;
        }
    }

    function buildVase(unit, x, baseY) {
        const y0 = baseY || 1.68;
        const lift = y0 - 1.68;
        const celadon = track(new THREE.MeshStandardMaterial({ color: 0x91a99b, roughness: 0.32, metalness: 0.12 }));
        const branchMat = track(new THREE.MeshStandardMaterial({ color: 0x4a3826, roughness: 0.85 }));
        const blossomMat = track(new THREE.MeshStandardMaterial({ color: 0xd98a9a, roughness: 0.6 }));
        const profile = [
            new THREE.Vector2(0.075, 0),
            new THREE.Vector2(0.14, 0.06),
            new THREE.Vector2(0.165, 0.18),
            new THREE.Vector2(0.135, 0.32),
            new THREE.Vector2(0.085, 0.42),
            new THREE.Vector2(0.095, 0.49),
            new THREE.Vector2(0.065, 0.53)
        ];
        const geo = track(new THREE.LatheGeometry(profile, 18));
        const vase = new THREE.Mesh(geo, celadon);
        vase.position.set(x, y0, 0.06);
        vase.castShadow = true;
        unit.add(vase);

        const branch = new THREE.Mesh(track(new THREE.CylinderGeometry(0.012, 0.018, 0.52, 6)), branchMat);
        branch.position.set(x + 0.02, 2.2 + lift, 0.06);
        branch.rotation.z = 0.22;
        branch.rotation.x = -0.08;
        unit.add(branch);
        const twig = new THREE.Mesh(track(new THREE.CylinderGeometry(0.007, 0.011, 0.3, 6)), branchMat);
        twig.position.set(x - 0.1, 2.32 + lift, 0.08);
        twig.rotation.z = -0.65;
        unit.add(twig);

        for (let i = 0; i < 5; i++) {
            const blossom = new THREE.Mesh(track(new THREE.SphereGeometry(0.026, 8, 6)), blossomMat);
            blossom.position.set(x - 0.16 + i * 0.07, 2.38 + lift + Math.sin(i * 1.4) * 0.07, 0.09);
            blossom.scale.set(1, 0.7, 1);
            unit.add(blossom);
        }
    }

    function buildBook(unit, item, meta, offsetX, scale, woodMid, baseY) {
        const group = new THREE.Group();
        group.position.set(offsetX, baseY || 1.68, 0.16);
        group.rotation.set(-0.1, 0, rand(-0.035, 0.035));
        unit.add(group);

        const w = 0.46 * scale;
        const h = 0.66 * scale;
        const t = 0.09;
        const tint = new THREE.Color(meta.color);
        tint.offsetHSL(rand(-0.012, 0.012), rand(-0.04, 0.04), rand(-0.035, 0.035));

        const clothMat = track(new THREE.MeshStandardMaterial({ color: tint, roughness: 0.78, metalness: 0.02 }));
        const coverTex = track(makeCoverTexture(item, meta));
        textures.push(coverTex);
        const coverMat = track(new THREE.MeshStandardMaterial({
            map: coverTex,
            roughness: 0.72,
            emissive: 0x000000,
            emissiveIntensity: 0
        }));
        const mats = [clothMat, clothMat, clothMat, clothMat, coverMat, clothMat];

        const book = new THREE.Mesh(boxGeo(w, h, t), mats);
        book.position.y = h / 2;
        book.castShadow = true;
        book.receiveShadow = true;
        book.userData.articleId = item.id;
        group.add(book);

        const edge = new THREE.Mesh(boxGeo(w * 1.01, 0.012, t * 1.01), new THREE.MeshStandardMaterial({
            color: 0xc9a25c,
            metalness: 0.55,
            roughness: 0.4
        }));
        edge.position.y = 0.006;
        edge.userData.articleId = item.id;
        group.add(edge);

        const stand = addBox(group, w + 0.18, 0.038, 0.3, woodMid, 0, 0.02, 0.1);
        stand.rotation.x = -0.03;
        stand.castShadow = true;

        const tagTex = track(makeEdgeLabel(item));
        textures.push(tagTex);
        const tagMat = track(new THREE.MeshStandardMaterial({ map: tagTex, roughness: 0.8 }));
        const tag = new THREE.Mesh(track(new THREE.PlaneGeometry(0.58 * scale, 0.095)), tagMat);
        tag.position.set(offsetX, 1.567, 0.432);
        unit.add(tag);

        bookMeshes.push(book);
        bookEntries.push({ mesh: book, group: group, coverMat: coverMat, baseZ: 0.16, hover: 0, item: item, meta: meta });
    }

    function buildSideCabinets() {
        const woodDark = track(new THREE.MeshStandardMaterial({ color: 0x3a2214, roughness: 0.84 }));
        const woodMid = track(new THREE.MeshStandardMaterial({ color: 0x4e301c, roughness: 0.82 }));
        const bookGeo = track(new THREE.BoxGeometry(0.062, 0.36, 0.24));
        const bookMat = track(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.82 }));
        const palette = [0x6d2f28, 0x2e5147, 0x3f456f, 0x73552f, 0x4a2f22, 0x7b6b47, 0x533a5a, 0x2d4a5e];

        const cabinets = [
            [-11.55, -2.5, Math.PI / 2],
            [-11.55, 2.0, Math.PI / 2],
            [11.55, -2.5, -Math.PI / 2],
            [11.55, 2.0, -Math.PI / 2]
        ];

        for (let c = 0; c < cabinets.length; c++) {
            const cfg = cabinets[c];
            const group = new THREE.Group();
            group.position.set(cfg[0], 0, cfg[1]);
            group.rotation.y = cfg[2];
            root.add(group);

            addBox(group, 2.5, 0.12, 0.5, woodDark, 0, 0.06, 0);
            addBox(group, 2.5, 0.1, 0.5, woodDark, 0, 3.9, 0);
            addBox(group, 0.1, 3.9, 0.5, woodDark, -1.2, 1.95, 0);
            addBox(group, 0.1, 3.9, 0.5, woodDark, 1.2, 1.95, 0);
            addBox(group, 2.4, 3.7, 0.05, woodMid, 0, 1.95, -0.24);

            const rows = [0.5, 1.24, 1.98, 2.72, 3.46];
            for (let r = 0; r < rows.length; r++) {
                addBox(group, 2.4, 0.06, 0.46, woodMid, 0, rows[r] - 0.13, 0);
            }

            const count = 26 * rows.length;
            const inst = new THREE.InstancedMesh(bookGeo, bookMat, count);
            inst.castShadow = false;
            inst.receiveShadow = true;
            const dummy = new THREE.Object3D();
            let idx = 0;
            for (let r = 0; r < rows.length; r++) {
                for (let i = 0; i < 26; i++) {
                    const bx = -1.04 + i * 0.083 + rand(-0.01, 0.01);
                    const h = rand(0.82, 1.12);
                    dummy.position.set(bx, rows[r] - 0.13 + 0.03 + 0.18 * h, 0.04);
                    dummy.scale.set(rand(0.8, 1.35), h, 1);
                    dummy.rotation.set(0, rand(-0.04, 0.04), rand(-0.02, 0.02));
                    dummy.updateMatrix();
                    inst.setMatrixAt(idx, dummy.matrix);
                    const col = new THREE.Color(palette[(idx + r) % palette.length]);
                    col.offsetHSL(rand(-0.02, 0.02), rand(-0.05, 0.05), rand(-0.04, 0.04));
                    inst.setColorAt(idx, col);
                    idx++;
                }
            }
            inst.instanceMatrix.needsUpdate = true;
            if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
            group.add(inst);
        }
    }

    function buildDust() {
        const tex = track(makeGlowTexture());
        textures.push(tex);
        const count = 180;
        const positions = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
            positions[i * 3] = rand(-10.5, 10.5);
            positions[i * 3 + 1] = rand(0.4, 5.8);
            positions[i * 3 + 2] = rand(-5.8, 7.4);
        }
        const geo = track(new THREE.BufferGeometry());
        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const mat = track(new THREE.PointsMaterial({
            map: tex,
            color: 0xffd9a0,
            size: 0.05,
            transparent: true,
            opacity: 0.55,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            sizeAttenuation: true
        }));
        const points = new THREE.Points(geo, mat);
        root.add(points);
        return points;
    }

    function build() {
        setupRenderer();
        setupScene();

        const floorTex = track(makeFloorTexture());
        const wallTex = track(makeWallTexture());
        textures.push(floorTex, wallTex);

        const woodDark = track(new THREE.MeshStandardMaterial({ color: 0x3d2416, roughness: 0.82 }));
        const woodMid = track(new THREE.MeshStandardMaterial({ color: 0x5d3a23, roughness: 0.8 }));
        const paper = track(new THREE.MeshStandardMaterial({ color: 0xe9d6af, roughness: 0.9 }));
        const gold = track(new THREE.MeshStandardMaterial({ color: 0xc9a25c, metalness: 0.6, roughness: 0.34 }));
        const lacquer = track(new THREE.MeshStandardMaterial({ color: 0x24110c, roughness: 0.55 }));

        const floorMat = track(new THREE.MeshStandardMaterial({ map: floorTex, color: 0xd8b184, roughness: 0.86 }));
        const floorGeo = track(new THREE.PlaneGeometry(24, 18));
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        root.add(floor);

        const ceilGeo = track(new THREE.PlaneGeometry(24, 18));
        const ceilMat = track(new THREE.MeshStandardMaterial({ color: 0x1c120b, roughness: 0.96 }));
        const ceil = new THREE.Mesh(ceilGeo, ceilMat);
        ceil.rotation.x = Math.PI / 2;
        ceil.position.y = 6.5;
        root.add(ceil);

        const wallMat = track(new THREE.MeshStandardMaterial({ map: wallTex, color: 0xd0bb98, roughness: 0.95 }));
        const backWall = addBox(root, 24, 7, 0.32, wallMat, 0, 3.5, -6.38);
        backWall.receiveShadow = true;
        const leftWall = addBox(root, 0.32, 7, 18, wallMat, -11.98, 3.5, 0);
        leftWall.receiveShadow = true;
        const rightWall = addBox(root, 0.32, 7, 18, wallMat, 11.98, 3.5, 0);
        rightWall.receiveShadow = true;

        addBox(root, 23.6, 0.22, 0.16, woodDark, 0, 0.16, -6.16);
        addBox(root, 0.16, 0.22, 17.6, woodDark, -11.78, 0.16, 0);
        addBox(root, 0.16, 0.22, 17.6, woodDark, 11.78, 0.16, 0);
        addBox(root, 23.6, 0.16, 0.14, woodDark, 0, 4.9, -6.16);
        addBox(root, 0.14, 0.16, 17.6, woodDark, -11.78, 4.9, 0);
        addBox(root, 0.14, 0.16, 17.6, woodDark, 11.78, 4.9, 0);

        const pillarGeo = track(new THREE.CylinderGeometry(0.24, 0.28, 6.1, 12));
        const baseGeo = track(new THREE.CylinderGeometry(0.36, 0.42, 0.3, 12));
        const stone = track(new THREE.MeshStandardMaterial({ color: 0x6e6252, roughness: 0.9 }));
        const pillarXs = [-10.25, 10.25];
        const pillarZs = [-4.75, 3.15];
        for (let i = 0; i < pillarXs.length; i++) {
            for (let j = 0; j < pillarZs.length; j++) {
                const x = pillarXs[i];
                const z = pillarZs[j];
                const base = new THREE.Mesh(baseGeo, stone);
                base.position.set(x, 0.15, z);
                base.castShadow = true;
                base.receiveShadow = true;
                root.add(base);
                const shaft = new THREE.Mesh(pillarGeo, woodDark);
                shaft.position.set(x, 3.35, z);
                shaft.castShadow = true;
                shaft.receiveShadow = true;
                root.add(shaft);
                addBox(root, 0.85, 0.18, 0.85, woodMid, x, 5.55, z);
                addBox(root, 1.02, 0.14, 1.02, woodDark, x, 5.7, z);
            }
        }

        addBox(root, 21, 0.3, 0.34, woodDark, 0, 5.86, -4.75);
        addBox(root, 21, 0.3, 0.34, woodDark, 0, 5.86, 3.15);
        addBox(root, 0.34, 0.3, 8.2, woodDark, -10.25, 5.86, -0.8);
        addBox(root, 0.34, 0.3, 8.2, woodDark, 10.25, 5.86, -0.8);
        for (let i = -4; i <= 4; i++) {
            addBox(root, 0.12, 0.12, 17.4, woodDark, i * 2.2, 6.38, 0);
        }

        buildWindows(lacquer, paper, gold);
        mainPlaque = buildPlaque(lacquer, gold);
        buildLanterns(gold, paper);
        buildTable(woodDark, woodMid, paper, gold);
        buildSideCabinets();

        const groups = {};
        for (let i = 0; i < catalog.items.length; i++) {
            const item = catalog.items[i];
            if (!groups[item.category]) groups[item.category] = [];
            groups[item.category].push(item);
        }
        let shelfIndex = 0;
        for (let i = 0; i < CATEGORY_ORDER.length; i++) {
            const category = CATEGORY_ORDER[i];
            const items = groups[category];
            if (!items || !items.length) continue;
            buildShelfUnit(category, items, SHELF_X[shelfIndex]);
            shelfIndex++;
        }

        dust = buildDust();
        updateCamera();
    }

    function updateCamera() {
        const s = Math.sin(cameraState.phi);
        const c = Math.cos(cameraState.phi);
        camera.position.set(
            cameraState.focus.x + cameraState.radius * s * Math.sin(cameraState.theta),
            cameraState.focus.y + cameraState.radius * c,
            cameraState.focus.z + cameraState.radius * s * Math.cos(cameraState.theta)
        );
        camera.lookAt(cameraState.focus.x, cameraState.focus.y + 0.05, cameraState.focus.z);
    }

    function resize() {
        if (!renderer) return;
        const w = container.clientWidth;
        const h = container.clientHeight;
        if (!w || !h) return;
        const aspect = w / h;
        camera.aspect = aspect;
        camera.fov = aspect < 0.72 ? 72 : (aspect < 0.95 ? 54 : 42);
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
        if (focusedShelf === 'all') {
            const narrow = aspect < 0.72;
            cameraState.targetRadius = narrow ? 13.5 : 10.2;
            cameraState.targetFocus.y = narrow ? 2.85 : 2.2;
        }
        needsResize = false;
    }

    function setPlaqueHover(entry) {
        if (hoveredPlaque === entry) {
            if (entry) reportPlaqueHover(entry);
            return;
        }
        if (hoveredPlaque) {
            hoveredPlaque.mat.emissiveIntensity = hoveredPlaque.base;
        }
        hoveredPlaque = entry || null;
        if (hoveredPlaque) {
            hoveredPlaque.mat.emissiveIntensity = hoveredPlaque.base + 0.4;
            reportPlaqueHover(hoveredPlaque);
        } else {
            onShelfHover(null, null);
        }
    }

    function reportPlaqueLayout() {
        const rect = renderer.domElement.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        const list = [];
        for (let i = 0; i < plaqueMeshes.length; i++) {
            const mesh = plaqueMeshes[i];
            const info = mesh.userData.plaque;
            if (!info) continue;
            tmpVec.setFromMatrixPosition(mesh.matrixWorld);
            tmpVec.project(camera);
            list.push({
                category: info.category,
                x: (tmpVec.x * 0.5 + 0.5) * rect.width,
                y: (-tmpVec.y * 0.5 + 0.5) * rect.height,
                visible: tmpVec.z < 1 && tmpVec.x > -1.2 && tmpVec.x < 1.2 && tmpVec.y > -1.2 && tmpVec.y < 1.2
            });
        }
        onPlaqueLayout(list);
    }

    function reportPlaqueHover(entry) {
        const rect = renderer.domElement.getBoundingClientRect();
        tmpVec.setFromMatrixPosition(entry.mesh.matrixWorld);
        tmpVec.project(camera);
        onShelfHover({
            category: entry.category,
            label: entry.label,
            count: entry.count
        }, {
            x: (tmpVec.x * 0.5 + 0.5) * rect.width,
            y: (-tmpVec.y * 0.5 + 0.5) * rect.height,
            visible: tmpVec.z < 1
        });
    }

    function pickPlaque(clientX, clientY) {
        const rect = renderer.domElement.getBoundingClientRect();
        pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
        pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(pointer, camera);
        const hits = raycaster.intersectObjects(plaqueMeshes, false);
        if (!hits.length) return null;
        return hits[0].object.userData.plaque || null;
    }

    function setHover(entry, clientX, clientY) {
        if (hoveredEntry === entry) {
            if (entry) reportHover(entry);
            return;
        }
        if (hoveredEntry) {
            hoveredEntry.group.position.z = hoveredEntry.baseZ;
        }
        hoveredEntry = entry || null;
        if (hoveredEntry) {
            hoveredEntry.group.position.z = hoveredEntry.baseZ + 0.05;
            reportHover(hoveredEntry);
        } else {
            onHover(null, null);
        }
    }

    function reportHover(entry) {
        const rect = renderer.domElement.getBoundingClientRect();
        tmpVec.setFromMatrixPosition(entry.group.matrixWorld);
        tmpVec.y += 0.9;
        tmpVec.project(camera);
        onHover(entry.item, {
            x: (tmpVec.x * 0.5 + 0.5) * rect.width,
            y: (-tmpVec.y * 0.5 + 0.5) * rect.height,
            visible: tmpVec.z < 1
        });
    }

    function clearHover() {
        setHover(null);
        setPlaqueHover(null);
    }

    function pick(clientX, clientY) {
        const rect = renderer.domElement.getBoundingClientRect();
        pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
        pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(pointer, camera);
        const hits = raycaster.intersectObjects(bookMeshes, false);
        if (!hits.length) return null;
        const id = hits[0].object.userData.articleId;
        for (let i = 0; i < bookEntries.length; i++) {
            if (bookEntries[i].item.id === id) return bookEntries[i];
        }
        return null;
    }

    function onPointerDown(e) {
        if (!active) return;
        drag.down = true;
        drag.moved = 0;
        drag.x = e.clientX;
        drag.y = e.clientY;
        drag.id = e.pointerId;
        renderer.domElement.classList.add('is-dragging');
        try {
            renderer.domElement.setPointerCapture(e.pointerId);
        } catch (err) {
            /* ignore */
        }
    }

    function onPointerMove(e) {
        if (!active) return;
        if (drag.down && drag.id === e.pointerId) {
            const dx = e.clientX - drag.x;
            const dy = e.clientY - drag.y;
            drag.moved += Math.abs(dx) + Math.abs(dy);
            drag.x = e.clientX;
            drag.y = e.clientY;
            cameraState.targetTheta = clamp(cameraState.targetTheta - dx * 0.0032, -0.52, 0.52);
            cameraState.targetPhi = clamp(cameraState.targetPhi + dy * 0.0026, 1.3, 1.58);
            clearHover();
            return;
        }
        const plaque = pickPlaque(e.clientX, e.clientY);
        if (plaque) {
            setHover(null);
            setPlaqueHover(plaque);
            renderer.domElement.style.cursor = 'pointer';
            return;
        }
        setPlaqueHover(null);
        const entry = pick(e.clientX, e.clientY);
        setHover(entry, e.clientX, e.clientY);
        renderer.domElement.style.cursor = entry ? 'pointer' : 'grab';
    }

    function onPointerUp(e) {
        if (!drag.down) return;
        drag.down = false;
        renderer.domElement.classList.remove('is-dragging');
        try {
            renderer.domElement.releasePointerCapture(e.pointerId);
        } catch (err) {
            /* ignore */
        }
        if (drag.moved < 7) {
            const plaque = pickPlaque(e.clientX, e.clientY);
            if (plaque) {
                const category = plaque.category;
                if (category === 'all' || focusedShelf === category) {
                    focusShelf('all');
                } else {
                    focusShelf(category);
                }
            } else {
                const entry = pick(e.clientX, e.clientY);
                if (entry) {
                    setHover(entry);
                    entry.coverMat.emissive.setHex(0xffc37a);
                    entry.coverMat.emissiveIntensity = 0.9;
                    setTimeout(function () {
                        entry.coverMat.emissive.setHex(0x000000);
                        entry.coverMat.emissiveIntensity = 0;
                    }, 420);
                    onSelect(entry.item);
                }
            }
        }
        renderer.domElement.style.cursor = 'grab';
    }

    function onPointerLeave() {
        if (!drag.down) {
            clearHover();
            renderer.domElement.style.cursor = 'grab';
        }
    }

    function onWheel(e) {
        if (!active) return;
        e.preventDefault();
        cameraState.targetRadius = clamp(cameraState.targetRadius + e.deltaY * 0.0022, 7.2, 13.5);
    }

    function tick(now) {
        if (!running) return;
        rafId = requestAnimationFrame(tick);
        if (!lastTime) lastTime = now;
        const dt = Math.min(0.05, (now - lastTime) / 1000);
        lastTime = now;
        time += dt;

        const k = Math.min(1, dt * 6.5);
        cameraState.theta += (cameraState.targetTheta - cameraState.theta) * k;
        cameraState.phi += (cameraState.targetPhi - cameraState.phi) * k;
        cameraState.radius += (cameraState.targetRadius - cameraState.radius) * k;
        cameraState.focus.lerp(cameraState.targetFocus, k);
        updateCamera();
        reportPlaqueLayout();

        for (let i = 0; i < lanterns.length; i++) {
            const l = lanterns[i];
            l.light.intensity = l.base * (0.9 + Math.sin(time * 2.1 + l.phase) * 0.05 + Math.sin(time * 5.7 + l.phase) * 0.025);
        }

        for (let i = 0; i < bookEntries.length; i++) {
            const entry = bookEntries[i];
            const target = entry === hoveredEntry ? 1 : 0;
            entry.hover += (target - entry.hover) * Math.min(1, dt * 10);
            entry.group.position.z = entry.baseZ + entry.hover * 0.06;
            entry.coverMat.emissiveIntensity = Math.max(entry.coverMat.emissiveIntensity * 0.92, entry.hover * 0.22);
            if (entry.coverMat.emissiveIntensity > 0.01 && entry.coverMat.emissive.getHex() === 0) {
                entry.coverMat.emissive.setHex(0x7a4a13);
            }
        }

        if (dust) dust.rotation.y = Math.sin(time * 0.06) * 0.04;

        if (hoveredEntry) reportHover(hoveredEntry);

        if (needsResize) resize();
        renderer.render(scene, camera);
    }

    function bind() {
        const el = renderer.domElement;
        el.addEventListener('pointerdown', onPointerDown);
        el.addEventListener('pointermove', onPointerMove);
        el.addEventListener('pointerup', onPointerUp);
        el.addEventListener('pointercancel', onPointerUp);
        el.addEventListener('pointerleave', onPointerLeave);
        el.addEventListener('wheel', onWheel, { passive: false });
        el.addEventListener('contextmenu', function (e) { e.preventDefault(); });
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
            clearHover();
        }
    }

    function focusShelf(category) {
        const cat = category && category !== 'all' ? category : 'all';
        if (cat === 'all') {
            const narrow = camera.aspect < 0.72;
            cameraState.targetTheta = 0;
            cameraState.targetPhi = 1.44;
            cameraState.targetRadius = narrow ? 13.5 : 10.2;
            cameraState.targetFocus.set(0, narrow ? 2.85 : 2.2, -3.0);
            if (mainPlaque) mainPlaque.visible = true;
        } else {
            const info = shelfPositions[cat];
            if (!info) return;
            cameraState.targetTheta = 0;
            cameraState.targetPhi = 1.46;
            const portrait = camera.aspect < 0.72;
            cameraState.targetRadius = portrait ? 4.35 : 4.0;
            cameraState.targetFocus.set(info.x, portrait ? 3.9 : 3.55, -5.25);
            if (mainPlaque) mainPlaque.visible = false;
        }
        focusedShelf = cat;
        onShelfFocus(cat);
    }

    function reset() {
        focusShelf('all');
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
            if (item && item.isMaterial) {
                item.dispose();
            }
        });
        textures.forEach(function (tex) { if (tex && tex.dispose) tex.dispose(); });
    }

    build();
    bind();
    window.addEventListener('resize', resize);
    resize();
    updateCamera();

    return {
        start: start,
        stop: stop,
        dispose: dispose,
        setActive: setActive,
        resize: resize,
        focusShelf: focusShelf,
        reset: reset,
        clearHover: clearHover
    };
}
