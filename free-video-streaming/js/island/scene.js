import * as THREE from '../../lib/three.module.js';

const TAU = Math.PI * 2;

function rand(min, max) {
    return min + Math.random() * (max - min);
}

function canvas2d(w, h) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return { c, ctx: c.getContext('2d') };
}

function makeTexture(canvas, repeatX = 1, repeatY = 1) {
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeatX, repeatY);
    t.anisotropy = 4;
    return t;
}

function concatFloatArrays(chunks, itemSize) {
    let total = 0;
    chunks.forEach((c) => { total += c.length; });
    const out = new Float32Array(total);
    let offset = 0;
    chunks.forEach((c) => {
        out.set(c, offset);
        offset += c.length;
    });
    return out;
}

function mergeStaticMeshes(root) {
    root.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
    const buckets = new Map();
    root.traverse((o) => {
        if (!o.isMesh || o.isInstancedMesh || o.userData.noMerge) return;
        if (!o.visible) return;
        const mat = o.material;
        if (!mat || Array.isArray(mat) || mat.transparent || mat.opacity < 0.999) return;
        if (mat.visible === false || mat.alphaTest > 0) return;
        if (!o.geometry || !o.geometry.attributes.position) return;
        let bucket = buckets.get(mat);
        if (!bucket) {
            bucket = [];
            buckets.set(mat, bucket);
        }
        bucket.push({
            mesh: o,
            geo: o.geometry,
            matrix: new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld),
            casts: o.castShadow,
            receives: o.receiveShadow
        });
    });

    buckets.forEach((items, mat) => {
        if (items.length < 2) return;
        const positions = [];
        const normals = [];
        const uvs = [];
        let hasNormals = true;
        let hasUVs = true;
        let casts = false;
        let receives = false;
        const clones = [];
        items.forEach(({ geo, matrix, casts: c, receives: r }) => {
            const cloned = geo.clone();
            cloned.applyMatrix4(matrix);
            const flat = cloned.index ? cloned.toNonIndexed() : cloned;
            if (!flat.attributes.normal) hasNormals = false;
            if (!flat.attributes.uv) hasUVs = false;
            positions.push(flat.attributes.position.array);
            if (flat.attributes.normal) normals.push(flat.attributes.normal.array);
            if (flat.attributes.uv) uvs.push(flat.attributes.uv.array);
            casts = casts || c;
            receives = receives || r;
            clones.push(cloned);
            if (flat !== cloned) clones.push(flat);
        });
        const merged = new THREE.BufferGeometry();
        merged.setAttribute('position', new THREE.BufferAttribute(concatFloatArrays(positions, 3), 3));
        if (hasNormals) {
            merged.setAttribute('normal', new THREE.BufferAttribute(concatFloatArrays(normals, 3), 3));
        } else {
            merged.computeVertexNormals();
        }
        if (hasUVs) {
            merged.setAttribute('uv', new THREE.BufferAttribute(concatFloatArrays(uvs, 2), 2));
        } else {
            const uv = new Float32Array((merged.attributes.position.count) * 2);
            merged.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
        }
        const mesh = new THREE.Mesh(merged, mat);
        mesh.castShadow = casts;
        mesh.receiveShadow = receives;
        root.add(mesh);
        items.forEach(({ mesh: original }) => {
            if (original.parent) original.parent.remove(original);
        });
        clones.forEach((c) => c.dispose());
    });
}

function makeRoofTexture() {
    const { c, ctx } = canvas2d(512, 512);
    const g = ctx.createLinearGradient(0, 0, 0, 512);
    g.addColorStop(0, '#2c3b4a');
    g.addColorStop(0.5, '#26333f');
    g.addColorStop(1, '#1d2833');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 512, 512);

    for (let x = 0; x < 512; x += 32) {
        ctx.fillStyle = 'rgba(8, 14, 20, 0.55)';
        ctx.fillRect(x, 0, 2, 512);
        const gg = ctx.createLinearGradient(x, 0, x + 32, 0);
        gg.addColorStop(0, 'rgba(255, 255, 255, 0.06)');
        gg.addColorStop(0.5, 'rgba(255, 255, 255, 0.0)');
        gg.addColorStop(1, 'rgba(0, 0, 0, 0.22)');
        ctx.fillStyle = gg;
        ctx.fillRect(x + 2, 0, 30, 512);
        for (let y = 6; y < 512; y += 26) {
            ctx.fillStyle = 'rgba(9, 15, 21, 0.32)';
            ctx.beginPath();
            ctx.ellipse(x + 16, y, 14, 6, 0, 0, Math.PI);
            ctx.fill();
        }
    }
    for (let i = 0; i < 700; i++) {
        ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.05})`;
        ctx.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
    }
    return makeTexture(c);
}

function makeWoodTexture() {
    const { c, ctx } = canvas2d(256, 256);
    ctx.fillStyle = '#6a3628';
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 60; i++) {
        ctx.strokeStyle = `rgba(38, 16, 10, ${rand(0.06, 0.24)})`;
        ctx.lineWidth = rand(0.6, 2.4);
        ctx.beginPath();
        const y = Math.random() * 256;
        ctx.moveTo(0, y);
        for (let x = 0; x <= 256; x += 24) {
            ctx.lineTo(x, y + Math.sin(x * 0.05 + i) * 3 + rand(-2, 2));
        }
        ctx.stroke();
    }
    const g = ctx.createLinearGradient(0, 0, 256, 0);
    g.addColorStop(0, 'rgba(255, 190, 120, 0.1)');
    g.addColorStop(1, 'rgba(0, 0, 0, 0.16)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
    return makeTexture(c);
}

function makeStoneTexture() {
    const { c, ctx } = canvas2d(256, 256);
    ctx.fillStyle = '#868b8c';
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 2400; i++) {
        const v = Math.random();
        ctx.fillStyle = v > 0.55 ? `rgba(255,255,255,${rand(0.03, 0.16)})` : `rgba(20,26,30,${rand(0.04, 0.2)})`;
        ctx.fillRect(Math.random() * 256, Math.random() * 256, rand(1, 3), rand(1, 3));
    }
    for (let i = 0; i < 5; i++) {
        ctx.strokeStyle = 'rgba(30, 36, 40, 0.28)';
        ctx.lineWidth = rand(0.6, 1.6);
        ctx.beginPath();
        ctx.moveTo(Math.random() * 256, 0);
        ctx.lineTo(Math.random() * 256, 256);
        ctx.stroke();
    }
    return makeTexture(c);
}

function makePlasterTexture() {
    const { c, ctx } = canvas2d(256, 256);
    ctx.fillStyle = '#e8e1d0';
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 1400; i++) {
        const v = Math.random();
        ctx.fillStyle = v > 0.5 ? `rgba(255,255,250,${rand(0.03, 0.1)})` : `rgba(150,140,120,${rand(0.03, 0.12)})`;
        ctx.fillRect(Math.random() * 256, Math.random() * 256, rand(1, 4), rand(1, 4));
    }
    for (let i = 0; i < 5; i++) {
        ctx.strokeStyle = 'rgba(120, 110, 92, 0.16)';
        ctx.lineWidth = rand(0.5, 1.1);
        ctx.beginPath();
        const x = Math.random() * 256;
        ctx.moveTo(x, Math.random() * 120);
        ctx.lineTo(x + rand(-14, 14), 256);
        ctx.stroke();
    }
    const g = ctx.createLinearGradient(0, 150, 0, 256);
    g.addColorStop(0, 'rgba(90, 84, 70, 0)');
    g.addColorStop(1, 'rgba(90, 84, 70, 0.2)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 150, 256, 106);
    return makeTexture(c, 2, 2);
}

function makeLeafTexture() {
    const { c, ctx } = canvas2d(128, 256);
    ctx.clearRect(0, 0, 128, 256);
    for (let i = 0; i < 190; i++) {
        const t = Math.random();
        const y = t * 256;
        const x = 64 + Math.sin(t * 7 + i) * rand(2, 26) + rand(-8, 8);
        const w = rand(3, 8);
        const h = rand(7, 16);
        const shade = Math.random();
        ctx.fillStyle = shade > 0.6
            ? `rgba(120, 156, 88, ${rand(0.5, 0.9)})`
            : shade > 0.25
                ? `rgba(78, 118, 62, ${rand(0.5, 0.92)})`
                : `rgba(44, 76, 44, ${rand(0.45, 0.85)})`;
        ctx.beginPath();
        ctx.ellipse(x, y, w, h, rand(-0.6, 0.6), 0, Math.PI * 2);
        ctx.fill();
    }
    return makeTexture(c, 1, 1);
}

function makeSlabTexture() {
    const { c, ctx } = canvas2d(256, 256);
    ctx.fillStyle = '#9b978d';
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 1800; i++) {
        const v = Math.random();
        ctx.fillStyle = v > 0.55 ? `rgba(255,255,248,${rand(0.03, 0.14)})` : `rgba(40,42,40,${rand(0.04, 0.16)})`;
        ctx.fillRect(Math.random() * 256, Math.random() * 256, rand(1, 3), rand(1, 3));
    }
    for (let i = 0; i < 7; i++) {
        ctx.strokeStyle = 'rgba(52, 54, 52, 0.22)';
        ctx.lineWidth = rand(0.5, 1.4);
        ctx.beginPath();
        const y = Math.random() * 256;
        ctx.moveTo(0, y);
        ctx.lineTo(256, y + rand(-30, 30));
        ctx.stroke();
    }
    return makeTexture(c, 2, 2);
}

function makeGrassTexture() {
    const { c, ctx } = canvas2d(512, 512);
    ctx.fillStyle = '#2a4433';
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 5200; i++) {
        const x = Math.random() * 512;
        const y = Math.random() * 512;
        const v = Math.random();
        if (v > 0.72) {
            ctx.strokeStyle = `rgba(118, 160, 96, ${rand(0.1, 0.45)})`;
        } else if (v > 0.4) {
            ctx.strokeStyle = `rgba(56, 92, 66, ${rand(0.12, 0.4)})`;
        } else {
            ctx.strokeStyle = `rgba(22, 38, 30, ${rand(0.15, 0.5)})`;
        }
        ctx.lineWidth = rand(0.5, 1.4);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + rand(-2, 2), y - rand(2, 7));
        ctx.stroke();
    }
    return makeTexture(c, 3, 3);
}

function makePaperTexture(base = '#f2d7a4') {
    const { c, ctx } = canvas2d(128, 128);
    const g = ctx.createRadialGradient(64, 64, 6, 64, 64, 96);
    g.addColorStop(0, base);
    g.addColorStop(0.65, '#e0b573');
    g.addColorStop(1, '#a9743c');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    return makeTexture(c);
}

function makeCloudTexture() {
    const { c, ctx } = canvas2d(256, 256);
    for (let i = 0; i < 34; i++) {
        const x = 128 + rand(-70, 70);
        const y = 128 + rand(-40, 40);
        const r = rand(24, 62);
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, 'rgba(214, 226, 240, 0.5)');
        g.addColorStop(0.55, 'rgba(184, 204, 228, 0.2)');
        g.addColorStop(1, 'rgba(150, 180, 210, 0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, TAU);
        ctx.fill();
    }
    return makeTexture(c);
}

function makeGlowTexture() {
    const { c, ctx } = canvas2d(128, 128);
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255, 232, 190, 1)');
    g.addColorStop(0.35, 'rgba(255, 196, 120, 0.55)');
    g.addColorStop(1, 'rgba(255, 170, 90, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    return makeTexture(c);
}

function makeWaterfallTexture() {
    const { c, ctx } = canvas2d(128, 512);
    const g = ctx.createLinearGradient(0, 0, 0, 512);
    g.addColorStop(0, 'rgba(196, 232, 245, 0.15)');
    g.addColorStop(0.25, 'rgba(212, 240, 250, 0.6)');
    g.addColorStop(0.85, 'rgba(170, 216, 238, 0.34)');
    g.addColorStop(1, 'rgba(150, 200, 226, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 512);
    for (let i = 0; i < 46; i++) {
        const x = Math.random() * 128;
        const w = rand(1, 4);
        const grd = ctx.createLinearGradient(0, 0, 0, 512);
        grd.addColorStop(0, 'rgba(255, 255, 255, 0)');
        grd.addColorStop(0.2, `rgba(240, 250, 255, ${rand(0.18, 0.6)})`);
        grd.addColorStop(1, 'rgba(230, 248, 255, 0)');
        ctx.fillStyle = grd;
        ctx.fillRect(x, rand(0, 120), w, rand(220, 400));
    }
    return makeTexture(c);
}

function makePlaqueTexture(text) {
    const { c, ctx } = canvas2d(512, 176);
    const g = ctx.createLinearGradient(0, 0, 0, 176);
    g.addColorStop(0, '#241a13');
    g.addColorStop(1, '#110c08');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 512, 176);
    ctx.strokeStyle = 'rgba(201, 168, 106, 0.9)';
    ctx.lineWidth = 5;
    ctx.strokeRect(12, 12, 488, 152);
    ctx.strokeStyle = 'rgba(201, 168, 106, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(24, 24, 464, 128);
    ctx.fillStyle = '#e8cf96';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '600 82px "Noto Serif SC", "Songti SC", "STSong", "SimSun", serif';
    ctx.fillText(text, 256, 92);
    return makeTexture(c);
}

function makeLatticeTexture() {
    const { c, ctx } = canvas2d(256, 256);
    const g = ctx.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, '#f6dfae');
    g.addColorStop(0.55, '#e5bd7c');
    g.addColorStop(1, '#c08a4c');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
    ctx.strokeStyle = 'rgba(74, 42, 26, 0.85)';
    ctx.lineWidth = 7;
    for (let i = 0; i <= 256; i += 42) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, 256);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(256, i);
        ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(74, 42, 26, 0.45)';
    ctx.lineWidth = 2;
    for (let i = 21; i < 256; i += 42) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, 256);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(256, i);
        ctx.stroke();
    }
    return makeTexture(c);
}

function makeScreenTexture() {
    const { c, ctx } = canvas2d(512, 288);
    const g = ctx.createLinearGradient(0, 0, 512, 288);
    g.addColorStop(0, '#0b1a26');
    g.addColorStop(0.5, '#12303f');
    g.addColorStop(1, '#0a1620');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 512, 288);
    for (let i = 0; i < 26; i++) {
        ctx.strokeStyle = `rgba(140, 214, 226, ${rand(0.05, 0.22)})`;
        ctx.lineWidth = rand(0.6, 2);
        ctx.beginPath();
        const y = Math.random() * 288;
        ctx.moveTo(0, y);
        for (let x = 0; x <= 512; x += 32) {
            ctx.lineTo(x, y + Math.sin(x * 0.02 + i) * 10);
        }
        ctx.stroke();
    }
    ctx.fillStyle = 'rgba(240, 200, 130, 0.85)';
    ctx.beginPath();
    ctx.arc(400, 84, 26, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(240, 210, 150, 0.18)';
    ctx.beginPath();
    ctx.arc(400, 84, 54, 0, TAU);
    ctx.fill();
    return makeTexture(c);
}

function hash(x, y, z) {
    const s = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453;
    return s - Math.floor(s);
}

function rockGeometry(radius, detail, roughness, seed) {
    const geo = new THREE.IcosahedronGeometry(radius, detail);
    const pos = geo.attributes.position;
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i);
        const n = hash(v.x + seed, v.y - seed, v.z + seed * 0.5);
        const n2 = hash(v.z * 2.1 + seed, v.x * 1.7, v.y * 1.3);
        const k = 1 + (n - 0.5) * roughness + (n2 - 0.5) * roughness * 0.5;
        v.multiplyScalar(k);
        v.y *= 0.88;
        pos.setXYZ(i, v.x, v.y, v.z);
    }
    geo.computeVertexNormals();
    return geo;
}

function gablePrismGeometry(length, depth, height) {
    const hl = length / 2;
    const hd = depth / 2;
    const positions = [
        -hl, 0, -hd,  hl, 0, -hd,  hl, 0, hd,  -hl, 0, hd,
        -hl, height, 0,  hl, height, 0
    ];
    const indices = [
        0, 5, 1, 0, 4, 5,
        3, 2, 5, 3, 5, 4,
        0, 3, 4,
        1, 5, 2,
        0, 1, 2, 0, 2, 3
    ];
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
}

function buildRoofGeometry(radius, rise, rings, segments, cornerLift) {
    const positions = [];
    const uvs = [];
    const indices = [];
    const p = 0.62;

    for (let j = 0; j <= rings; j++) {
        const v = j / rings;
        const y = rise * Math.pow(v, 1.7);
        const r = radius * Math.pow(1 - v, 0.86);
        for (let i = 0; i <= segments; i++) {
            const a = (i / segments) * TAU;
            const ca = Math.cos(a);
            const sa = Math.sin(a);
            const sx = Math.sign(ca) * Math.pow(Math.abs(ca), p);
            const sz = Math.sign(sa) * Math.pow(Math.abs(sa), p);
            const lift = cornerLift * Math.pow(Math.abs(Math.sin(2 * a)), 5) * Math.pow(1 - v, 2.1);
            positions.push(sx * r, y + lift, sz * r);
            uvs.push(i / segments, 1 - v);
        }
    }

    for (let j = 0; j < rings; j++) {
        for (let i = 0; i < segments; i++) {
            const a = j * (segments + 1) + i;
            const b = a + 1;
            const c = a + segments + 1;
            const d = c + 1;
            indices.push(a, c, b, b, c, d);
        }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
}

function hipRidgeCurve(radius, rise, cornerLift, angle) {
    const pts = [];
    const p = 0.62;
    for (let j = 0; j <= 10; j++) {
        const v = j / 10;
        const y = rise * Math.pow(v, 1.74) + cornerLift * Math.pow(1 - v, 2.1) * 0.92;
        const r = radius * Math.pow(1 - v, 0.86);
        const ca = Math.cos(angle);
        const sa = Math.sin(angle);
        pts.push(new THREE.Vector3(
            Math.sign(ca) * Math.pow(Math.abs(ca), p) * r,
            y + 0.06,
            Math.sign(sa) * Math.pow(Math.abs(sa), p) * r
        ));
    }
    return new THREE.CatmullRomCurve3(pts);
}

function makePlaqueTextureVertical(text) {
    const { c, ctx } = canvas2d(128, 384);
    const g = ctx.createLinearGradient(0, 0, 128, 0);
    g.addColorStop(0, '#1e1410');
    g.addColorStop(0.5, '#2a1d14');
    g.addColorStop(1, '#150e0a');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 384);
    ctx.strokeStyle = 'rgba(201, 168, 106, 0.55)';
    ctx.lineWidth = 3;
    ctx.strokeRect(8, 8, 112, 368);
    ctx.fillStyle = '#dcc08a';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '500 46px "Noto Serif SC", "Songti SC", "STSong", "SimSun", serif';
    const chars = text.split('');
    const gap = 342 / chars.length;
    chars.forEach((ch, i) => {
        ctx.fillText(ch, 64, 26 + gap * (i + 0.5) - 4);
    });
    return makeTexture(c);
}

const ROOM_LAYOUT = [
    {
        id: 'home',
        name: '望星台',
        plaque: '望星台',
        kind: 'terrace',
        position: [-1.2, 0, -10.4],
        rotation: 0.06,
        scale: 1
    },
    {
        id: 'blog',
        name: '文渊阁',
        plaque: '文渊阁',
        kind: 'pavilion',
        tiers: 2,
        position: [-10.2, 0, -3.2],
        rotation: 1.16,
        scale: 1.06
    },
    {
        id: 'video',
        name: '观澜榭',
        plaque: '观澜榭',
        kind: 'waterside',
        position: [9.0, 0, 6.8],
        rotation: -2.22,
        scale: 1
    },
    {
        id: 'about',
        name: '栖心庐',
        plaque: '栖心庐',
        kind: 'cottage',
        position: [-8.0, 0, 6.2],
        rotation: 0.72,
        scale: 0.9
    }
];

export function createIsland(options = {}) {
    const container = options.container;
    const onSelect = options.onSelect || (() => {});
    const onHover = options.onHover || (() => {});
    if (!container) throw new Error('island container missing');

    const clock = new THREE.Clock();
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2(-10, -10);
    const disposables = [];
    const roomMeshes = [];

    let renderer, scene, camera, group;
    let active = true;
    let running = false;
    let rafId = 0;
    let hovered = null;
    let selectedId = null;
    let needsRender = true;
    let lastInteraction = performance.now();
    const cameraState = {
        theta: 0.12,
        phi: 1.06,
        radius: 38.5,
        targetTheta: 0.12,
        targetPhi: 1.0,
        targetRadius: 38.5,
        focus: new THREE.Vector3(0, 1.8, 0),
        targetFocus: new THREE.Vector3(0, 1.8, 0)
    };
    const dragState = { dragging: false, moved: 0, x: 0, y: 0, id: null };
    const pointerNdc = { x: 0, y: 0 };

    let topMesh = null;
    let waterMeshes = [];
    let waterfallMats = [];
    let mistSprites = [];
    let clouds = [];
    let floaters = [];
    let fireflies = null;
    let moonSprite = null;
    let starField = null;
    let time = 0;

    function track(material) {
        disposables.push(material);
        return material;
    }

    function setupRenderer() {
        renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: false,
            powerPreference: 'high-performance'
        });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.95;
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.domElement.setAttribute('aria-label', '浮空孤岛三维场景');
        container.appendChild(renderer.domElement);
    }

    function setupScene() {
        scene = new THREE.Scene();
        scene.fog = new THREE.FogExp2(0x11212f, 0.0072);

        camera = new THREE.PerspectiveCamera(46, 1, 0.1, 900);
        scene.add(camera);

        const skyGeo = new THREE.SphereGeometry(460, 32, 20);
        const skyMat = new THREE.ShaderMaterial({
            side: THREE.BackSide,
            depthWrite: false,
            uniforms: {
                topColor: { value: new THREE.Color(0x081422) },
                midColor: { value: new THREE.Color(0x1b3a54) },
                bottomColor: { value: new THREE.Color(0x446072) },
                glowColor: { value: new THREE.Color(0x8fb2d2) }
            },
            vertexShader: `
                varying vec3 vWorld;
                void main() {
                    vec4 wp = modelMatrix * vec4(position, 1.0);
                    vWorld = wp.xyz;
                    gl_Position = projectionMatrix * viewMatrix * wp;
                }
            `,
            fragmentShader: `
                uniform vec3 topColor;
                uniform vec3 midColor;
                uniform vec3 bottomColor;
                uniform vec3 glowColor;
                varying vec3 vWorld;
                void main() {
                    float h = normalize(vWorld).y;
                    vec3 col = mix(bottomColor, midColor, smoothstep(-0.12, 0.24, h));
                    col = mix(col, topColor, smoothstep(0.18, 0.85, h));
                    float horizon = exp(-pow((h - 0.02) * 6.2, 2.0));
                    col += glowColor * horizon * 0.34;
                    gl_FragColor = vec4(col, 1.0);
                }
            `
        });
        const sky = new THREE.Mesh(skyGeo, skyMat);
        scene.add(sky);
        disposables.push(skyGeo, skyMat);

        scene.add(new THREE.AmbientLight(0x93aac6, 0.82));
        const hemi = new THREE.HemisphereLight(0xb2cdec, 0x2b3a47, 1.2);
        scene.add(hemi);

        const moonLight = new THREE.DirectionalLight(0xc3d8f7, 1.4);
        moonLight.position.set(-26, 34, 18);
        moonLight.castShadow = true;
        moonLight.shadow.mapSize.set(1024, 1024);
        moonLight.shadow.camera.near = 1;
        moonLight.shadow.camera.far = 120;
        moonLight.shadow.camera.left = -30;
        moonLight.shadow.camera.right = 30;
        moonLight.shadow.camera.top = 30;
        moonLight.shadow.camera.bottom = -30;
        moonLight.shadow.bias = -0.0015;
        moonLight.shadow.normalBias = 0.03;
        scene.add(moonLight);

        const rimLight = new THREE.DirectionalLight(0xffc98a, 0.6);
        rimLight.position.set(22, 9, -20);
        scene.add(rimLight);

        const fillLight = new THREE.DirectionalLight(0x9fbcd8, 0.55);
        fillLight.position.set(6, 12, 34);
        scene.add(fillLight);

        const moonMap = makeGlowTexture();
        const moonMat = new THREE.SpriteMaterial({
            map: moonMap,
            color: 0xdfe9ff,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            opacity: 0.9
        });
        moonSprite = new THREE.Sprite(moonMat);
        moonSprite.scale.set(46, 46, 1);
        moonSprite.position.set(-118, 96, -210);
        scene.add(moonSprite);
        disposables.push(moonMap, moonMat);

        const starGeo = new THREE.BufferGeometry();
        const starCount = 900;
        const sp = new Float32Array(starCount * 3);
        const sc = new Float32Array(starCount * 3);
        for (let i = 0; i < starCount; i++) {
            const r = rand(230, 400);
            const t = rand(0, TAU);
            const u = rand(0.02, 0.98);
            const ph = Math.acos(1 - u);
            sp[i * 3] = r * Math.sin(ph) * Math.cos(t);
            sp[i * 3 + 1] = r * Math.cos(ph);
            sp[i * 3 + 2] = r * Math.sin(ph) * Math.sin(t);
            const warm = Math.random() > 0.82;
            sc[i * 3] = warm ? 1 : 0.75;
            sc[i * 3 + 1] = warm ? 0.88 : 0.84;
            sc[i * 3 + 2] = warm ? 0.7 : 1;
        }
        starGeo.setAttribute('position', new THREE.BufferAttribute(sp, 3));
        starGeo.setAttribute('color', new THREE.BufferAttribute(sc, 3));
        const starMat = new THREE.PointsMaterial({
            size: 1.5,
            sizeAttenuation: true,
            vertexColors: true,
            transparent: true,
            opacity: 0.85,
            depthWrite: false,
            fog: false
        });
        starField = new THREE.Points(starGeo, starMat);
        scene.add(starField);
        disposables.push(starGeo, starMat);

        const cloudMap = makeCloudTexture();
        const cloudMat = new THREE.SpriteMaterial({
            map: cloudMap,
            color: 0xa9c0d8,
            transparent: true,
            opacity: 0.22,
            depthWrite: false,
            fog: true
        });
        disposables.push(cloudMap, cloudMat);
        for (let i = 0; i < 16; i++) {
            const s = new THREE.Sprite(cloudMat);
            const a = rand(0, TAU);
            const r = rand(34, 120);
            s.position.set(Math.cos(a) * r, rand(-26, 16), Math.sin(a) * r);
            const sc2 = rand(30, 80);
            s.scale.set(sc2, sc2 * rand(0.3, 0.5), 1);
            scene.add(s);
            clouds.push(s);
        }
    }

    function grassMaterial() {
        return track(new THREE.MeshStandardMaterial({
            map: makeGrassTexture(),
            roughness: 0.96,
            metalness: 0.02,
            color: 0xbfd2b4
        }));
    }

    function buildIslandTop() {
        const radius = 19;
        const segments = 96;
        const rim = [];
        for (let i = 0; i < segments; i++) {
            const a = (i / segments) * TAU;
            const wobble = 1 + Math.sin(a * 3.1) * 0.035 + Math.sin(a * 5.7 + 1.3) * 0.028 + Math.sin(a * 9.3 + 2.4) * 0.016;
            rim.push({ a, r: radius * wobble });
        }

        const positions = [0, 0.02, 0];
        const uvs = [0.5, 0.5];
        const indices = [];
        for (let i = 0; i < segments; i++) {
            const { a, r } = rim[i];
            positions.push(Math.cos(a) * r, 0.02, Math.sin(a) * r);
            uvs.push(0.5 + Math.cos(a) * 0.5, 0.5 + Math.sin(a) * 0.5);
        }
        for (let i = 0; i < segments; i++) {
            const next = (i + 1) % segments;
            indices.push(0, 1 + next, 1 + i);
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
        geo.setIndex(indices);
        geo.computeVertexNormals();

        topMesh = new THREE.Mesh(geo, grassMaterial());
        topMesh.receiveShadow = true;
        group.add(topMesh);
        disposables.push(geo);

        buildCliff(rim, segments);
        buildRimGrass(rim);
    }

    function buildCliff(rim, segments) {
        const layers = [
            { y: -0.35, k: 0.995, jag: 0.02 },
            { y: -2.4, k: 0.955, jag: 0.06 },
            { y: -4.6, k: 0.9, jag: 0.1 },
            { y: -7.0, k: 0.78, jag: 0.14 },
            { y: -9.4, k: 0.56, jag: 0.16 },
            { y: -11.8, k: 0.34, jag: 0.2 },
            { y: -14.2, k: 0.16, jag: 0.28 },
            { y: -16.4, k: 0.05, jag: 0.5 }
        ];
        const positions = [];
        const colors = [];
        const indices = [];
        const rings = layers.length;

        for (let j = 0; j < rings; j++) {
            const layer = layers[j];
            for (let i = 0; i < segments; i++) {
                const { a, r } = rim[i];
                const jag = 1 + (Math.sin(a * 4.7 + j * 1.9) * 0.6 + Math.sin(a * 8.3 - j) * 0.4) * layer.jag;
                const rr = r * layer.k * jag;
                const y = layer.y + Math.sin(a * 6.1 + j) * layer.jag * 0.9;
                positions.push(Math.cos(a) * rr, y, Math.sin(a) * rr);

                const shade = 0.3 + hash(Math.cos(a) * 3 + j, y * 0.4, Math.sin(a) * 3) * 0.24;
                const mossy = j < 2 ? 0.16 : 0;
                colors.push(shade * 0.72 + mossy * 0.5, shade * 0.74 + mossy * 0.9, shade * 0.78 + mossy * 0.4);
            }
        }

        for (let j = 0; j < rings - 1; j++) {
            for (let i = 0; i < segments; i++) {
                const next = (i + 1) % segments;
                const a = j * segments + i;
                const b = j * segments + next;
                const c = (j + 1) * segments + i;
                const d = (j + 1) * segments + next;
                indices.push(a, c, b, b, c, d);
            }
        }

        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        geo.setIndex(indices);
        geo.computeVertexNormals();

        const mat = track(new THREE.MeshStandardMaterial({
            vertexColors: true,
            roughness: 0.95,
            metalness: 0.04,
            flatShading: true
        }));
        const cliff = new THREE.Mesh(geo, mat);
        cliff.castShadow = true;
        cliff.receiveShadow = true;
        group.add(cliff);
        disposables.push(geo);

        for (let i = 0; i < 12; i++) {
            const a = (i / 12) * TAU + rand(-0.16, 0.16);
            const y = rand(-11.5, -3.2);
            const k = 1 - Math.abs(y) / 19;
            const rock = new THREE.Mesh(
                rockGeometry(rand(0.9, 2.1), 1, 0.55, i * 3.7),
                track(new THREE.MeshStandardMaterial({ color: 0x54606b, roughness: 0.94, flatShading: true }))
            );
            rock.position.set(Math.cos(a) * 19 * k * 0.92, y, Math.sin(a) * 19 * k * 0.92);
            rock.rotation.set(rand(0, 3), rand(0, 3), rand(0, 3));
            rock.castShadow = true;
            group.add(rock);
            disposables.push(rock.geometry);
        }
    }

    function buildRimGrass(rim) {
        const bladeGeo = new THREE.ConeGeometry(0.05, 0.55, 3, 1, true);
        const bladeMat = track(new THREE.MeshStandardMaterial({ color: 0x38543c, roughness: 0.9, side: THREE.DoubleSide }));
        disposables.push(bladeGeo);
        const count = 220;
        const inst = new THREE.InstancedMesh(bladeGeo, bladeMat, count);
        const dummy = new THREE.Object3D();
        for (let i = 0; i < count; i++) {
            const idx = Math.floor(rand(0, rim.length));
            const { a, r } = rim[idx];
            const rr = r * rand(0.93, 1.0);
            dummy.position.set(Math.cos(a) * rr, rand(0.1, 0.3), Math.sin(a) * rr);
            dummy.rotation.set(rand(-0.2, 0.2), rand(0, TAU), rand(-0.25, 0.25));
            dummy.scale.setScalar(rand(0.7, 1.5));
            dummy.updateMatrix();
            inst.setMatrixAt(i, dummy.matrix);
        }
        inst.castShadow = false;
        group.add(inst);
    }

    function buildPond() {
        const shape = new THREE.Shape();
        const pts = [];
        const n = 64;
        for (let i = 0; i <= n; i++) {
            const a = (i / n) * TAU;
            const r = 4.6 * (1 + Math.sin(a * 3.2) * 0.09 + Math.sin(a * 5.4 + 1.1) * 0.06);
            pts.push(new THREE.Vector2(Math.cos(a) * r * 1.18, Math.sin(a) * r * 0.86));
        }
        shape.setFromPoints(pts);

        const bedGeo = new THREE.ShapeGeometry(shape, 24);
        bedGeo.rotateX(-Math.PI / 2);
        const bedMat = track(new THREE.MeshStandardMaterial({ color: 0x1e3238, roughness: 0.9 }));
        const bed = new THREE.Mesh(bedGeo, bedMat);
        bed.position.set(9.4, 0.03, 7.0);
        bed.receiveShadow = true;
        group.add(bed);
        disposables.push(bedGeo);

        const waterGeo = new THREE.ShapeGeometry(shape, 24);
        waterGeo.rotateX(-Math.PI / 2);
        const waterMat = track(new THREE.MeshStandardMaterial({
            color: 0x2f6f82,
            roughness: 0.06,
            metalness: 0.5,
            transparent: true,
            opacity: 0.82,
            envMapIntensity: 1.4
        }));
        const water = new THREE.Mesh(waterGeo, waterMat);
        water.position.set(9.4, 0.22, 7.0);
        water.receiveShadow = true;
        group.add(water);
        waterMeshes.push({ mesh: water, base: 0.22 });
        disposables.push(waterGeo);

        const rippleGeo = new THREE.RingGeometry(0.3, 0.34, 40);
        const rippleMat = track(new THREE.MeshBasicMaterial({
            color: 0xbfe8f2,
            transparent: true,
            opacity: 0.32,
            side: THREE.DoubleSide,
            depthWrite: false
        }));
        disposables.push(rippleGeo);
        for (let i = 0; i < 3; i++) {
            const ripple = new THREE.Mesh(rippleGeo, rippleMat.clone());
            ripple.rotation.x = -Math.PI / 2;
            ripple.position.set(8.1 + i * 1.4, 0.26, 6.2 + i * 0.9);
            ripple.scale.setScalar(0.2);
            group.add(ripple);
            disposables.push(ripple.material);
            waterMeshes.push({ ripple, phase: i * 1.7 });
        }

        for (let i = 0; i < 9; i++) {
            const a = rand(0, TAU);
            const rr = rand(0.7, 1.05);
            const rock = new THREE.Mesh(
                rockGeometry(rand(0.32, 0.72), 1, 0.5, i * 9.1),
                track(new THREE.MeshStandardMaterial({ color: 0x5d6a72, roughness: 0.96, flatShading: true }))
            );
            rock.position.set(9.4 + Math.cos(a) * 4.9 * 1.16 * rr, rand(-0.1, 0.18), 7.0 + Math.sin(a) * 4.9 * 0.86 * rr);
            rock.rotation.set(rand(0, 3), rand(0, 3), rand(0, 3));
            rock.castShadow = true;
            rock.receiveShadow = true;
            group.add(rock);
            disposables.push(rock.geometry);
        }

        const lilyGeo = new THREE.CircleGeometry(0.34, 10, 0.5, 2.1);
        const lilyMat = track(new THREE.MeshStandardMaterial({ color: 0x3f7048, roughness: 0.7, side: THREE.DoubleSide }));
        disposables.push(lilyGeo);
        for (let i = 0; i < 7; i++) {
            const lily = new THREE.Mesh(lilyGeo, lilyMat);
            lily.rotation.x = -Math.PI / 2;
            lily.rotation.z = rand(0, TAU);
            lily.position.set(rand(6.6, 12.2), 0.245, rand(4.4, 9.6));
            lily.scale.setScalar(rand(0.7, 1.3));
            group.add(lily);
        }

        const petalGeo = new THREE.SphereGeometry(0.055, 6, 5);
        const petalMat = track(new THREE.MeshStandardMaterial({
            color: 0xf0b3bd,
            roughness: 0.68,
            emissive: 0x5c2a33,
            emissiveIntensity: 0.18
        }));
        const heartMat = track(new THREE.MeshStandardMaterial({ color: 0xe9d27a, roughness: 0.6 }));
        disposables.push(petalGeo);
        [[6.3, 5.0], [12.6, 9.8], [6.9, 9.2], [11.9, 4.4]].forEach(([lx, lz], idx) => {
            const flower = new THREE.Group();
            for (let pIdx = 0; pIdx < 8; pIdx++) {
                const a = (pIdx / 8) * TAU;
                const petal = new THREE.Mesh(petalGeo, petalMat);
                petal.scale.set(0.8, 2.3, 1.2);
                petal.position.set(Math.cos(a) * 0.1, 0.1, Math.sin(a) * 0.1);
                petal.rotation.set(Math.sin(a) * 0.7, -a, -Math.cos(a) * 0.7);
                flower.add(petal);
            }
            const heart = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 5), heartMat);
            heart.position.y = 0.18;
            flower.add(heart);
            disposables.push(heart.geometry);
            flower.position.set(lx, 0.28, lz);
            flower.scale.setScalar(0.9 + (idx % 2) * 0.25);
            group.add(flower);
        });
    }

    function buildWaterfall() {
        const map = makeWaterfallTexture();
        map.wrapS = THREE.RepeatWrapping;
        map.wrapT = THREE.RepeatWrapping;
        map.repeat.set(2, 1.4);
        const mat = track(new THREE.MeshBasicMaterial({
            map,
            transparent: true,
            opacity: 0.72,
            side: THREE.DoubleSide,
            depthWrite: false,
            blending: THREE.NormalBlending,
            color: 0xdaf2ff
        }));
        const geo = new THREE.PlaneGeometry(2.6, 17, 1, 16);
        const fall = new THREE.Mesh(geo, mat);
        fall.position.set(14.7, -8.3, 10.4);
        fall.rotation.y = -0.72;
        fall.rotation.x = 0.045;
        group.add(fall);
        waterfallMats.push({ mat, map, base: 1.4 });
        disposables.push(geo);

        const mistMap = makeCloudTexture();
        const mistMat = track(new THREE.SpriteMaterial({
            map: mistMap,
            color: 0xc8e6f4,
            transparent: true,
            opacity: 0.32,
            depthWrite: false
        }));
        disposables.push(mistMap);
        for (let i = 0; i < 5; i++) {
            const s = new THREE.Sprite(mistMat.clone());
            s.position.set(14.4 + rand(-1, 1), -16 + rand(-1, 1.6), 10.4 + rand(-1, 1));
            s.scale.setScalar(rand(4, 8));
            group.add(s);
            mistSprites.push(s);
            disposables.push(s.material);
        }

        const streamShape = new THREE.Shape();
        const n = 40;
        const pts = [];
        for (let i = 0; i <= n; i++) {
            const a = (i / n) * TAU;
            pts.push(new THREE.Vector2(Math.cos(a) * 0.85, Math.sin(a) * 0.55));
        }
        streamShape.setFromPoints(pts);
        const sGeo = new THREE.ShapeGeometry(streamShape, 16);
        sGeo.rotateX(-Math.PI / 2);
        const sMat = track(new THREE.MeshStandardMaterial({
            color: 0x3d7f92,
            roughness: 0.12,
            metalness: 0.4,
            transparent: true,
            opacity: 0.8
        }));
        const stream = new THREE.Mesh(sGeo, sMat);
        stream.position.set(13.6, 0.16, 9.2);
        stream.scale.set(1, 1, 1.5);
        stream.rotation.y = -0.7;
        group.add(stream);
        disposables.push(sGeo);
        waterMeshes.push({ mesh: stream, base: 0.16 });
    }

    function createMaterials() {
        const wood = makeWoodTexture();
        const stone = makeStoneTexture();
        const roof = makeRoofTexture();
        const lattice = makeLatticeTexture();
        return {
            wood: track(new THREE.MeshStandardMaterial({ map: wood, color: 0x9a5f45, roughness: 0.82, metalness: 0.04 })),
            darkWood: track(new THREE.MeshStandardMaterial({ map: wood, color: 0x5a3328, roughness: 0.85 })),
            redWood: track(new THREE.MeshStandardMaterial({ map: wood, color: 0xb3563c, roughness: 0.7 })),
            stone: track(new THREE.MeshStandardMaterial({ map: stone, color: 0xb9bdbc, roughness: 0.92 })),
            roof: track(new THREE.MeshStandardMaterial({ map: roof, color: 0xaebfce, roughness: 0.58, metalness: 0.3, emissive: 0x1a2634, emissiveIntensity: 0.55, side: THREE.DoubleSide })),
            lattice: track(new THREE.MeshStandardMaterial({ map: lattice, color: 0xfff0cf, roughness: 0.72, emissive: 0xffbf6a, emissiveIntensity: 0.32, emissiveMap: lattice })),
            paper: track(new THREE.MeshStandardMaterial({ map: makePaperTexture(), color: 0xffd9a0, emissive: 0xffa64d, emissiveIntensity: 0.85, roughness: 0.85 })),
            gold: track(new THREE.MeshStandardMaterial({ color: 0xc9a86a, roughness: 0.32, metalness: 0.85 })),
            bronze: track(new THREE.MeshStandardMaterial({ color: 0x6d7a5e, roughness: 0.46, metalness: 0.82 })),
            lanternGlow: track(new THREE.MeshStandardMaterial({ color: 0xffcf8a, emissive: 0xff9a3c, emissiveIntensity: 1.15, roughness: 0.7 })),
            dark: track(new THREE.MeshStandardMaterial({ color: 0x2b2320, roughness: 0.9 })),
            plaster: track(new THREE.MeshStandardMaterial({ map: makePlasterTexture(), color: 0xf3ecdc, roughness: 0.95 })),
            plasterSoft: track(new THREE.MeshStandardMaterial({ map: makePlasterTexture(), color: 0xded6c4, roughness: 0.97 })),
            slab: track(new THREE.MeshStandardMaterial({ map: makeSlabTexture(), color: 0xb6b1a5, roughness: 0.9, emissive: 0x2a1c10, emissiveIntensity: 0.55 })),
            slabDark: track(new THREE.MeshStandardMaterial({ map: makeSlabTexture(), color: 0x807d74, roughness: 0.94 })),
            blackTile: track(new THREE.MeshStandardMaterial({ map: roof, color: 0x3b4650, roughness: 0.5, metalness: 0.18 })),
            stoneWhite: track(new THREE.MeshStandardMaterial({ map: stone, color: 0xd9d3c5, roughness: 0.88 })),
            leaf: track(new THREE.MeshStandardMaterial({ map: makeLeafTexture(), color: 0xd6e6c0, roughness: 0.88, side: THREE.DoubleSide, transparent: true, alphaTest: 0.28 }))
        };
    }

    function addBase(parent, size, mats, height = 0.55) {
        const base = new THREE.Mesh(new THREE.BoxGeometry(size, height, size), mats.stone);
        base.position.y = height / 2;
        base.castShadow = true;
        base.receiveShadow = true;
        parent.add(base);
        disposables.push(base.geometry);

        const trim = new THREE.Mesh(new THREE.BoxGeometry(size + 0.34, 0.12, size + 0.34), mats.darkWood);
        trim.position.y = height - 0.02;
        trim.castShadow = true;
        parent.add(trim);
        disposables.push(trim.geometry);

        const steps = new THREE.Mesh(new THREE.BoxGeometry(size * 0.44, height, 0.9), mats.stone);
        steps.position.set(0, height * 0.5 - height, size / 2 + 0.55);
        steps.castShadow = true;
        steps.receiveShadow = true;
        parent.add(steps);
        disposables.push(steps.geometry);

        const stepTrim = new THREE.Mesh(new THREE.BoxGeometry(size * 0.44 + 0.14, 0.08, 1.02), mats.darkWood);
        stepTrim.position.set(0, -0.02, size / 2 + 0.55);
        parent.add(stepTrim);
        disposables.push(stepTrim.geometry);
        return height;
    }

    function addColumns(parent, half, height, mats, count = 4) {
        const geo = new THREE.CylinderGeometry(0.21, 0.24, height, 12, 1);
        disposables.push(geo);
        const positions = [
            [-half, -half], [half, -half], [-half, half], [half, half]
        ];
        if (count === 6) {
            positions.push([0, -half], [0, half]);
        }
        positions.forEach(([x, z]) => {
            const col = new THREE.Mesh(geo, mats.redWood);
            col.position.set(x, height / 2, z);
            col.castShadow = true;
            col.receiveShadow = true;
            parent.add(col);

            const baseRing = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.34, 0.16, 12), mats.stone);
            baseRing.position.set(x, 0.08, z);
            parent.add(baseRing);
            disposables.push(baseRing.geometry);
        });
    }

    function addRailings(parent, half, mats, y = 0.5) {
        const sides = [
            { x: 0, z: -half, ry: 0 },
            { x: -half, z: 0, ry: Math.PI / 2 },
            { x: half, z: 0, ry: Math.PI / 2 }
        ];
        const barM = [];
        const postM = [];
        const capM = [];
        const balM = [];
        const dummy = new THREE.Object3D();
        const balusterCount = Math.max(6, Math.round((half * 2) / 0.26));
        sides.forEach(({ x, z, ry }) => {
            for (let i = 0; i < 2; i++) {
                dummy.position.set(x, y + i * 0.42, z);
                dummy.rotation.set(0, ry, 0);
                dummy.scale.set(half * 2 - 0.2, 0.1, 0.1);
                dummy.updateMatrix();
                barM.push(dummy.matrix.clone());
            }
            for (let i = -2; i <= 2; i++) {
                const off = (i / 2) * (half - 0.1);
                const px = ry === 0 ? off : x;
                const pz = ry === 0 ? z : off;
                dummy.position.set(px, y + 0.28, pz);
                dummy.rotation.set(0, 0, 0);
                dummy.scale.set(1, 1, 1);
                dummy.updateMatrix();
                postM.push(dummy.matrix.clone());
                dummy.position.y = y + 0.63;
                dummy.updateMatrix();
                capM.push(dummy.matrix.clone());
            }
            for (let i = 0; i < balusterCount; i++) {
                const off = -half + 0.12 + (i / (balusterCount - 1)) * (half * 2 - 0.24);
                const px = ry === 0 ? off : x;
                const pz = ry === 0 ? z : off;
                dummy.position.set(px, y + 0.24, pz);
                dummy.rotation.set(0, 0, 0);
                dummy.scale.set(1, 1, 1);
                dummy.updateMatrix();
                balM.push(dummy.matrix.clone());
            }
        });
        const build = (geo, mat, matrices) => {
            const mesh = new THREE.InstancedMesh(geo, mat, matrices.length);
            matrices.forEach((m, i) => mesh.setMatrixAt(i, m));
            parent.add(mesh);
            disposables.push(geo);
        };
        build(new THREE.BoxGeometry(1, 1, 1), mats.darkWood, barM);
        build(new THREE.BoxGeometry(0.1, 0.62, 0.1), mats.redWood, postM);
        build(new THREE.SphereGeometry(0.075, 8, 6), mats.gold, capM);
        build(new THREE.CylinderGeometry(0.026, 0.034, 0.36, 6), mats.redWood, balM);
    }

    function addStoneBalustrade(parent, half, mats, y = 0.55) {
        const postGeo = new THREE.BoxGeometry(0.17, 0.76, 0.17);
        const capGeo = new THREE.BoxGeometry(0.24, 0.08, 0.24);
        const railGeo = new THREE.BoxGeometry(0.11, 0.1, 1);
        const panelGeo = new THREE.BoxGeometry(0.045, 0.4, 0.06);
        const sides = [
            { x: 0, z: -half, ry: 0 },
            { x: -half, z: 0, ry: Math.PI / 2 },
            { x: half, z: 0, ry: Math.PI / 2 }
        ];
        const seg = 0.92;
        const count = Math.max(2, Math.round((half * 2) / seg));
        const postM = [];
        const capM = [];
        const railM = [];
        const lowM = [];
        const panelM = [];
        const dummy = new THREE.Object3D();
        sides.forEach(({ x, z, ry }) => {
            for (let i = 0; i <= count; i++) {
                const off = -half + (i / count) * (half * 2);
                const px = ry === 0 ? off : x;
                const pz = ry === 0 ? z : off;
                dummy.position.set(px, y + 0.28, pz);
                dummy.rotation.set(0, 0, 0);
                dummy.scale.set(1, 1, 1);
                dummy.updateMatrix();
                postM.push(dummy.matrix.clone());
                dummy.position.y = y + 0.7;
                dummy.updateMatrix();
                capM.push(dummy.matrix.clone());
            }
            for (let i = 0; i < count; i++) {
                const t = (i + 0.5) / count;
                const off = -half + t * (half * 2);
                const px = ry === 0 ? off : x;
                const pz = ry === 0 ? z : off;
                const len = (half * 2) / count - 0.18;
                dummy.position.set(px, y + 0.58, pz);
                dummy.rotation.set(0, ry, 0);
                dummy.scale.set(1, 1, len);
                dummy.updateMatrix();
                railM.push(dummy.matrix.clone());
                dummy.position.y = y + 0.1;
                dummy.scale.set(0.9, 0.7, len);
                dummy.updateMatrix();
                lowM.push(dummy.matrix.clone());
                dummy.position.y = y + 0.34;
                dummy.scale.set(1, 1, len * 0.9);
                dummy.updateMatrix();
                panelM.push(dummy.matrix.clone());
            }
        });
        const build = (geo, mat, matrices, shadow) => {
            const mesh = new THREE.InstancedMesh(geo, mat, matrices.length);
            matrices.forEach((m, i) => mesh.setMatrixAt(i, m));
            mesh.castShadow = shadow;
            parent.add(mesh);
            disposables.push(geo, mesh.geometry);
        };
        build(postGeo, mats.stoneWhite, postM, true);
        build(capGeo, mats.stoneWhite, capM, false);
        build(railGeo, mats.stone, railM, false);
        build(railGeo.clone(), mats.stoneWhite, lowM, false);
        build(panelGeo, mats.stoneWhite, panelM, false);
    }

    function addDing(parent, x, z, mats) {
        const g = new THREE.Group();
        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.32, 0.46, 16), mats.bronze);
        body.position.y = 0.5;
        body.castShadow = true;
        g.add(body);
        disposables.push(body.geometry);
        const rim = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.045, 6, 22), mats.gold);
        rim.rotation.x = Math.PI / 2;
        rim.position.y = 0.73;
        g.add(rim);
        disposables.push(rim.geometry);
        for (let i = 0; i < 3; i++) {
            const a = (i / 3) * TAU;
            const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.04, 0.32, 8), mats.bronze);
            leg.position.set(Math.cos(a) * 0.24, 0.18, Math.sin(a) * 0.24);
            g.add(leg);
            disposables.push(leg.geometry);
        }
        [-1, 1].forEach((sgn) => {
            const handle = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.035, 5, 12, Math.PI), mats.bronze);
            handle.position.set(sgn * 0.36, 0.76, 0);
            handle.rotation.z = sgn > 0 ? -Math.PI / 2 : Math.PI / 2;
            g.add(handle);
            disposables.push(handle.geometry);
        });
        const lid = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.18, 12), mats.bronze);
        lid.position.y = 0.82;
        g.add(lid);
        disposables.push(lid.geometry);
        g.position.set(x, 0.06, z);
        parent.add(g);
    }

    function addQinTable(parent, x, z, rot, mats) {
        const g = new THREE.Group();
        const top = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.08, 0.52), mats.darkWood);
        top.position.y = 0.52;
        top.castShadow = true;
        g.add(top);
        disposables.push(top.geometry);
        [-0.6, 0.6].forEach((sx) => {
            [-0.18, 0.18].forEach((sz) => {
                const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.52, 0.08), mats.darkWood);
                leg.position.set(sx, 0.26, sz);
                g.add(leg);
                disposables.push(leg.geometry);
            });
        });
        const qin = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.09, 0.26), mats.redWood);
        qin.position.y = 0.61;
        g.add(qin);
        disposables.push(qin.geometry);
        const strings = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.012, 0.2), mats.gold);
        strings.position.y = 0.66;
        g.add(strings);
        disposables.push(strings.geometry);
        g.position.set(x, 0.06, z);
        g.rotation.y = rot;
        parent.add(g);
    }

    function addStoneLantern(parent, x, z, mats) {
        const g = new THREE.Group();
        const base = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.14, 0.42), mats.stoneWhite);
        base.position.y = 0.07;
        g.add(base);
        disposables.push(base.geometry);
        const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.1, 0.52, 8), mats.stoneWhite);
        shaft.position.y = 0.42;
        g.add(shaft);
        disposables.push(shaft.geometry);
        const house = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.3, 0.36), mats.stoneWhite);
        house.position.y = 0.83;
        g.add(house);
        disposables.push(house.geometry);
        const fire = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.18, 0.2), mats.lanternGlow);
        fire.position.y = 0.83;
        g.add(fire);
        disposables.push(fire.geometry);
        const cap = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.2, 4), mats.stone);
        cap.position.y = 1.06;
        cap.rotation.y = Math.PI / 4;
        g.add(cap);
        disposables.push(cap.geometry);
        g.position.set(x, 0.06, z);
        parent.add(g);
    }

    function addRoof(parent, radius, rise, cornerLift, mats, tiers = 1) {
        const groupRoof = new THREE.Group();
        for (let t = 0; t < tiers; t++) {
            const k = 1 - t * 0.26;
            const r = radius * k;
            const h = rise * (t === 0 ? 1 : 0.7);
            const lift = cornerLift * k;
            const geo = buildRoofGeometry(r, h, 14, 96, lift);
            const roof = new THREE.Mesh(geo, mats.roof);
            roof.position.y = t === 0 ? 0 : rise * 0.86;
            roof.castShadow = true;
            roof.receiveShadow = true;
            groupRoof.add(roof);
            disposables.push(geo);

            for (let i = 0; i < 4; i++) {
                const a = (i / 4) * TAU + Math.PI / 4;
                const curve = hipRidgeCurve(r, h, lift, a);
                const tube = new THREE.TubeGeometry(curve, 18, 0.055, 5, false);
                const ridge = new THREE.Mesh(tube, mats.darkWood);
                ridge.position.y = roof.position.y;
                groupRoof.add(ridge);
                disposables.push(tube);
            }

            const eaveRing = new THREE.Mesh(new THREE.TorusGeometry(r * 0.995, 0.055, 6, 90), mats.darkWood);
            eaveRing.rotation.x = Math.PI / 2;
            eaveRing.position.y = roof.position.y + 0.02;
            groupRoof.add(eaveRing);
            disposables.push(eaveRing.geometry);

            const rafterCount = 32;
            const rafterGeo = new THREE.BoxGeometry(0.07, 0.07, 0.3);
            const rafters = new THREE.InstancedMesh(rafterGeo, mats.darkWood, rafterCount);
            const brackets = new THREE.InstancedMesh(new THREE.BoxGeometry(0.34, 0.13, 0.13), mats.redWood, 16);
            const dummy = new THREE.Object3D();
            for (let i = 0; i < rafterCount; i++) {
                const a = (i / rafterCount) * TAU;
                const ca = Math.cos(a);
                const sa = Math.sin(a);
                const sx = Math.sign(ca) * Math.pow(Math.abs(ca), 0.62);
                const sz = Math.sign(sa) * Math.pow(Math.abs(sa), 0.62);
                dummy.position.set(sx * r * 0.965, roof.position.y - 0.04, sz * r * 0.965);
                dummy.rotation.set(0, -a, 0);
                dummy.scale.set(1, 1, 1);
                dummy.updateMatrix();
                rafters.setMatrixAt(i, dummy.matrix);
            }
            for (let i = 0; i < 16; i++) {
                const a = (i / 16) * TAU;
                dummy.position.set(Math.cos(a) * r * 0.84, roof.position.y - 0.18, Math.sin(a) * r * 0.84);
                dummy.rotation.set(0, -a - Math.PI / 2, 0);
                dummy.updateMatrix();
                brackets.setMatrixAt(i, dummy.matrix);
            }
            groupRoof.add(rafters, brackets);
            disposables.push(rafterGeo, rafters.geometry, brackets.geometry);

            const corners = [];
            for (let i = 0; i < 4; i++) {
                const a = (i / 4) * TAU + Math.PI / 4;
                const ca = Math.cos(a);
                const sa = Math.sin(a);
                corners.push({
                    a,
                    cx: Math.sign(ca) * Math.pow(Math.abs(ca), 0.62) * r,
                    cz: Math.sign(sa) * Math.pow(Math.abs(sa), 0.62) * r,
                    cy: lift + roof.position.y
                });
            }
            const curlGeo = new THREE.TubeGeometry(
                new THREE.CatmullRomCurve3([
                    new THREE.Vector3(0, 0, 0),
                    new THREE.Vector3(r * 0.07, 0.22, 0),
                    new THREE.Vector3(r * 0.14, 0.48, 0)
                ]),
                6, 0.045, 5, false
            );
            const curls = new THREE.InstancedMesh(curlGeo, mats.darkWood, 4);
            const tips = new THREE.InstancedMesh(new THREE.SphereGeometry(0.07, 8, 6), mats.gold, 4);
            const bells = new THREE.InstancedMesh(new THREE.ConeGeometry(0.07, 0.18, 8), mats.gold, 4);
            corners.forEach((c, i) => {
                dummy.position.set(c.cx * 0.96, c.cy + 0.02, c.cz * 0.96);
                dummy.rotation.set(0, -c.a, 0);
                dummy.scale.set(1, 1, 1);
                dummy.updateMatrix();
                curls.setMatrixAt(i, dummy.matrix);
                dummy.position.set(c.cx * 1.1, c.cy + 0.52, c.cz * 1.1);
                dummy.updateMatrix();
                tips.setMatrixAt(i, dummy.matrix);
                dummy.position.set(c.cx * 0.9, c.cy - 0.16, c.cz * 0.9);
                dummy.rotation.set(Math.PI, 0, 0);
                dummy.updateMatrix();
                bells.setMatrixAt(i, dummy.matrix);
            });
            curls.castShadow = true;
            groupRoof.add(curls, tips, bells);
            disposables.push(curlGeo, curls.geometry, tips.geometry, bells.geometry);
        }

        const finial = new THREE.Mesh(new THREE.SphereGeometry(0.3, 14, 10), mats.gold);
        finial.position.y = rise * (tiers === 1 ? 1 : 0.86 + 0.7) + 0.24;
        finial.castShadow = true;
        groupRoof.add(finial);
        disposables.push(finial.geometry);

        const spire = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.5, 8), mats.gold);
        spire.position.y = finial.position.y + 0.34;
        groupRoof.add(spire);
        disposables.push(spire.geometry);

        parent.add(groupRoof);
        return groupRoof;
    }

    function addPlaque(parent, text, y, z, width = 2.2, vertical = false) {
        if (vertical) {
            const map = makePlaqueTextureVertical(text);
            const mat = track(new THREE.MeshStandardMaterial({
                map,
                emissive: 0x3a2a10,
                emissiveIntensity: 0.35,
                roughness: 0.7
            }));
            const geo = new THREE.PlaneGeometry(0.62, 1.86);
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.set(0.72, y, z);
            parent.add(mesh);
            disposables.push(geo);
            return;
        }
        const map = makePlaqueTexture(text);
        const mat = track(new THREE.MeshStandardMaterial({
            map,
            emissive: 0xffcf8a,
            emissiveMap: map,
            emissiveIntensity: 0.45,
            roughness: 0.65
        }));
        const geo = new THREE.PlaneGeometry(width, width * 0.345);
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(0, y, z);
        parent.add(mesh);
        disposables.push(geo);

        const frame = new THREE.Mesh(new THREE.BoxGeometry(width + 0.16, width * 0.345 + 0.16, 0.1), new THREE.MeshStandardMaterial({ color: 0x2a1d14, roughness: 0.8 }));
        frame.position.set(0, y, z - 0.05);
        parent.add(frame);
        disposables.push(frame.geometry, frame.material);
    }

    function addLantern(parent, x, y, z, mats, scale = 1) {
        const holder = new THREE.Group();
        holder.position.set(x, y, z);
        const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.5, 5), mats.darkWood);
        rope.position.y = 0.25;
        holder.add(rope);
        disposables.push(rope.geometry);

        const body = new THREE.Mesh(new THREE.SphereGeometry(0.24, 14, 12), mats.paper);
        body.scale.set(1, 1.18, 1);
        body.position.y = -0.1;
        holder.add(body);
        disposables.push(body.geometry);

        const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.06, 10), mats.gold);
        cap.position.y = 0.16;
        holder.add(cap);
        const cap2 = cap.clone();
        cap2.position.y = -0.34;
        holder.add(cap2);
        disposables.push(cap.geometry);

        const tassel = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.24, 6), new THREE.MeshStandardMaterial({ color: 0x9b2f22, roughness: 0.8 }));
        tassel.position.y = -0.46;
        tassel.rotation.x = Math.PI;
        holder.add(tassel);
        disposables.push(tassel.geometry, tassel.material);

        holder.scale.setScalar(scale);
        parent.add(holder);
        return holder;
    }

    function addScreen(parent, width, height, mats, x, y, z, ry) {
        const g = new THREE.Group();
        const panel = new THREE.Mesh(new THREE.BoxGeometry(width, height, 0.035), mats.lattice);
        g.add(panel);
        disposables.push(panel.geometry);
        const bars = [
            [width + 0.12, 0.09, 0.1, 0, height / 2],
            [width + 0.12, 0.09, 0.1, 0, -height / 2],
            [0.09, height, 0.1, -width / 2, 0],
            [0.09, height, 0.1, width / 2, 0],
            [0.06, height, 0.08, 0, 0]
        ];
        const barGeo = new THREE.BoxGeometry(1, 1, 1);
        const frame = new THREE.InstancedMesh(barGeo, mats.darkWood, bars.length);
        const dummy = new THREE.Object3D();
        bars.forEach(([w, h, d, bx, by], i) => {
            dummy.position.set(bx, by, 0.04);
            dummy.rotation.set(0, 0, 0);
            dummy.scale.set(w, h, d);
            dummy.updateMatrix();
            frame.setMatrixAt(i, dummy.matrix);
        });
        frame.castShadow = true;
        g.add(frame);
        disposables.push(barGeo, frame.geometry);
        g.position.set(x, y, z);
        g.rotation.y = ry;
        parent.add(g);
    }

    function addDoor(parent, width, height, mats, x, y, z) {
        const g = new THREE.Group();
        const lintel = new THREE.Mesh(new THREE.BoxGeometry(width + 0.34, 0.13, 0.16), mats.darkWood);
        lintel.position.y = height / 2 + 0.06;
        g.add(lintel);
        disposables.push(lintel.geometry);
        const threshold = new THREE.Mesh(new THREE.BoxGeometry(width + 0.3, 0.08, 0.34), mats.stoneWhite);
        threshold.position.set(0, -height / 2 + 0.02, 0.06);
        g.add(threshold);
        disposables.push(threshold.geometry);
        [-1, 1].forEach((sgn) => {
            const jamb = new THREE.Mesh(new THREE.BoxGeometry(0.13, height, 0.16), mats.darkWood);
            jamb.position.set(sgn * (width / 2 + 0.09), 0, 0);
            g.add(jamb);
            disposables.push(jamb.geometry);
            const leaf = new THREE.Mesh(new THREE.BoxGeometry(width / 2 - 0.06, height - 0.12, 0.07), mats.redWood);
            leaf.position.set(sgn * (width / 4 + 0.02), -0.06, 0.02);
            g.add(leaf);
            disposables.push(leaf.geometry);
            for (let r = 0; r < 3; r++) {
                for (let c = 0; c < 2; c++) {
                    const stud = new THREE.Mesh(new THREE.SphereGeometry(0.033, 6, 5), mats.gold);
                    stud.position.set(
                        sgn * (width / 4 + 0.02) + (c - 0.5) * (width / 5),
                        0.34 + r * 0.42,
                        0.06
                    );
                    g.add(stud);
                    disposables.push(stud.geometry);
                }
            }
        });
        g.position.set(x, y, z);
        parent.add(g);
    }

    function buildPavilion(mats, opts) {
        const g = new THREE.Group();
        const size = 5.2;
        const half = size / 2;
        const baseH = addBase(g, size, mats, 0.6);
        const colH = 2.9;

        g.position.y = baseH;
        g.userData.baseY = baseH;

        const floor = new THREE.Mesh(new THREE.BoxGeometry(size - 0.2, 0.1, size - 0.2), mats.wood);
        floor.position.y = 0.06;
        floor.receiveShadow = true;
        g.add(floor);
        disposables.push(floor.geometry);

        addColumns(g, half - 0.35, colH, mats, opts.tiers > 1 ? 6 : 4);
        addRailings(g, half - 0.1, mats, 0.55);

        const beamGeo = new THREE.BoxGeometry(size + 0.3, 0.3, 0.3);
        disposables.push(beamGeo);
        [[0, half - 0.35, 0], [0, -(half - 0.35), 0]].forEach(([x, z]) => {
            const beam = new THREE.Mesh(beamGeo, mats.darkWood);
            beam.position.set(x, colH, z);
            beam.castShadow = true;
            g.add(beam);
        });
        [-1, 1].forEach((s) => {
            const beam = new THREE.Mesh(beamGeo, mats.darkWood);
            beam.position.set(s * (half - 0.35), colH, 0);
            beam.rotation.y = Math.PI / 2;
            beam.castShadow = true;
            g.add(beam);
        });

        const inner = new THREE.Mesh(
            new THREE.BoxGeometry(size * 0.44, colH * 0.72, size * 0.44),
            mats.lattice
        );
        inner.position.y = colH * 0.36;
        inner.castShadow = true;
        g.add(inner);
        disposables.push(inner.geometry);

        addScreen(g, size * 0.64, colH * 0.74, mats, 0, colH * 0.4, -(half - 0.38), 0);
        addScreen(g, size * 0.62, colH * 0.7, mats, -(half - 0.38), colH * 0.4, 0, Math.PI / 2);
        addScreen(g, size * 0.62, colH * 0.7, mats, half - 0.38, colH * 0.4, 0, Math.PI / 2);
        addDoor(g, 1.42, 2.0, mats, 0, 1.02, size * 0.22 + 0.02);

        if (opts.tiers > 1) {
            const upper = new THREE.Mesh(
                new THREE.BoxGeometry(size * 0.62, 0.18, size * 0.62),
                mats.wood
            );
            upper.position.y = colH + 0.1;
            g.add(upper);
            disposables.push(upper.geometry);

            const innerColGeo = new THREE.CylinderGeometry(0.15, 0.17, 1.5, 10);
            disposables.push(innerColGeo);
            [-1, 1].forEach((sx) => {
                [-1, 1].forEach((sz) => {
                    const c = new THREE.Mesh(innerColGeo, mats.redWood);
                    c.position.set(sx * size * 0.24, colH + 0.9, sz * size * 0.24);
                    c.castShadow = true;
                    g.add(c);
                });
            });
        }

        const roofY = opts.tiers > 1 ? colH + 1.72 : colH + 0.16;
        const roofGroup = addRoof(
            g,
            size * 0.86,
            1.72,
            0.92,
            mats,
            opts.tiers > 1 ? 2 : 1
        );
        roofGroup.position.y = roofY;

        addPlaque(g, opts.plaque, colH + 0.02, half + 0.06, 2.0);

        addLantern(g, -(half - 0.4), colH - 0.35, half - 0.4, mats);
        addLantern(g, half - 0.4, colH - 0.35, half - 0.4, mats);

        const glow = new THREE.PointLight(0xffb867, 1.35, 12, 2);
        glow.position.set(0, colH * 0.7, 0);
        g.add(glow);

        for (let i = 0; i < 2; i++) {
            const s = new THREE.Mesh(
                new THREE.BoxGeometry(size * 0.5, 0.38, 0.4),
                mats.darkWood
            );
            s.position.set(0, 0.2, (i === 0 ? 1 : -1) * (half - 0.5));
            s.rotation.y = i === 0 ? 0 : Math.PI;
            g.add(s);
            disposables.push(s.geometry);
        }

        return { group: g, roofY: roofY + baseH, size, height: roofY + baseH + 2.3 };
    }

    function buildTerrace(mats, opts) {
        const g = new THREE.Group();
        const size = 4.6;
        const half = size / 2;
        const baseH = addBase(g, size, mats, 0.7);
        g.position.y = baseH;
        g.userData.baseY = baseH;

        const floor = new THREE.Mesh(new THREE.BoxGeometry(size - 0.16, 0.1, size - 0.16), mats.wood);
        floor.position.y = 0.06;
        floor.receiveShadow = true;
        g.add(floor);
        disposables.push(floor.geometry);

        addStoneBalustrade(g, half - 0.12, mats, 0.55);
        addColumns(g, half - 0.42, 1.25, mats, 4);

        const canopy = addRoof(g, size * 0.62, 0.85, 0.72, mats, 1);
        canopy.position.y = 1.42;

        addDing(g, 1.15, 0.95, mats);
        addQinTable(g, -1.15, 0.95, -0.12, mats);
        addStoneLantern(g, 1.85, 1.85, mats);
        addStoneLantern(g, -1.85, 1.85, mats);

        const altar = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.72, 0.9), mats.stone);
        altar.position.set(0, 0.36, -0.9);
        altar.castShadow = true;
        g.add(altar);
        disposables.push(altar.geometry);

        const telescope = new THREE.Group();
        const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.13, 1.5, 10), mats.gold);
        tube.rotation.z = Math.PI / 2;
        tube.rotation.y = 0.3;
        tube.position.set(0, 0.95, 0);
        telescope.add(tube);
        disposables.push(tube.geometry);
        const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.6, 6), mats.darkWood);
        stand.position.set(0, 0.3, 0);
        telescope.add(stand);
        disposables.push(stand.geometry);
        telescope.position.set(-0.2, 0.72, -0.9);
        g.add(telescope);

        const seatGeo = new THREE.BoxGeometry(0.7, 0.1, 0.5);
        const seatMat = new THREE.MeshStandardMaterial({ color: 0x6b3a2c, roughness: 0.8 });
        disposables.push(seatGeo, seatMat);
        [[2.0, 1.2, -0.6], [2.4, 1.2, 0.9]].forEach(function (c) {
            const seat = new THREE.Mesh(seatGeo, seatMat);
            seat.position.set(c[0] - 2.4, c[1] - 0.9, c[2] - 0.4);
            g.add(seat);
        });

        addLantern(g, half - 0.5, 1.2, half - 0.5, mats, 0.92);
        addLantern(g, -(half - 0.5), 1.2, half - 0.5, mats, 0.92);

        const glow = new THREE.PointLight(0xffc078, 1.05, 10, 2);
        glow.position.set(0, 1.1, 0);
        g.add(glow);

        return { group: g, roofY: 2.27 + baseH, size, height: 3.8 };
    }

    function buildCottage(mats, opts) {
        const g = new THREE.Group();
        const size = 5.0;
        const half = size / 2;
        const baseH = addBase(g, size, mats, 0.5);
        g.position.y = baseH;
        g.userData.baseY = baseH;

        const floor = new THREE.Mesh(new THREE.BoxGeometry(size - 0.2, 0.1, size - 0.2), mats.wood);
        floor.position.y = 0.06;
        floor.receiveShadow = true;
        g.add(floor);
        disposables.push(floor.geometry);

        const wallH = 2.5;
        const wallGeo = new THREE.BoxGeometry(size - 0.5, wallH, size - 0.5);
        const walls = new THREE.Mesh(wallGeo, mats.plaster);
        walls.position.y = wallH / 2;
        walls.castShadow = true;
        walls.receiveShadow = true;
        g.add(walls);
        disposables.push(wallGeo);

        const frameGeo = new THREE.BoxGeometry(0.16, wallH, size - 0.4);
        disposables.push(frameGeo);
        [-1, 1].forEach((sx) => {
            const f = new THREE.Mesh(frameGeo, mats.darkWood);
            f.position.set(sx * (half - 0.3), wallH / 2, 0);
            f.castShadow = true;
            g.add(f);
        });
        const frame2Geo = new THREE.BoxGeometry(size - 0.4, wallH, 0.16);
        disposables.push(frame2Geo);
        [-1, 1].forEach((sz) => {
            const f = new THREE.Mesh(frame2Geo, mats.darkWood);
            f.position.set(0, wallH / 2, sz * (half - 0.3));
            f.castShadow = true;
            g.add(f);
        });

        const beamGeo = new THREE.BoxGeometry(size - 0.36, 0.15, 0.13);
        disposables.push(beamGeo);
        [-1, 1].forEach((sz) => {
            const b = new THREE.Mesh(beamGeo, mats.darkWood);
            b.position.set(0, wallH - 0.28, sz * (half - 0.26));
            g.add(b);
        });
        const beamSideGeo = new THREE.BoxGeometry(0.13, 0.15, size - 0.36);
        disposables.push(beamSideGeo);
        [-1, 1].forEach((sx) => {
            const b = new THREE.Mesh(beamSideGeo, mats.darkWood);
            b.position.set(sx * (half - 0.26), wallH - 0.28, 0);
            g.add(b);
        });
        const postGeo = new THREE.BoxGeometry(0.15, wallH - 0.2, 0.15);
        disposables.push(postGeo);
        [-1, 1].forEach((sx) => {
            [-1, 1].forEach((sz) => {
                const post = new THREE.Mesh(postGeo, mats.darkWood);
                post.position.set(sx * (half - 0.26), (wallH - 0.2) / 2, sz * (half - 0.26));
                g.add(post);
            });
        });

        addScreen(g, 1.0, 1.05, mats, -1.16, 1.62, half - 0.22, 0);
        addScreen(g, 1.0, 1.05, mats, 1.16, 1.62, half - 0.22, 0);
        addScreen(g, 1.0, 1.05, mats, -(half - 0.22), 1.62, -0.95, Math.PI / 2);
        addScreen(g, 1.0, 1.05, mats, -(half - 0.22), 1.62, 0.95, Math.PI / 2);
        addScreen(g, 1.0, 1.05, mats, half - 0.22, 1.62, 0, Math.PI / 2);
        addScreen(g, 1.6, 1.0, mats, 0, 1.62, -(half - 0.22), 0);

        const roof = addRoof(g, size * 1.04, 1.3, 0.58, mats, 1);
        roof.position.y = wallH;

        addPlaque(g, opts.plaque, wallH * 0.62, half - 0.16, 1.8);

        addDoor(g, 1.16, 1.95, mats, 0, 1.0, half - 0.2);
        const step = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.14, 0.6), mats.stoneWhite);
        step.position.set(0, 0.07, half + 0.12);
        g.add(step);
        disposables.push(step.geometry);

        addLantern(g, -(half - 0.45), wallH - 0.3, half - 0.3, mats, 0.9);
        addLantern(g, half - 0.45, wallH - 0.3, half - 0.3, mats, 0.9);

        const glow = new THREE.PointLight(0xffb266, 1.2, 11, 2);
        glow.position.set(0, 1.3, 0);
        g.add(glow);

        return { group: g, roofY: wallH + baseH, size, height: 4.2 };
    }

    function buildPaths(mats) {
        const slabGeo = new THREE.BoxGeometry(0.82, 0.1, 0.56);
        const edgeGeo = new THREE.BoxGeometry(0.26, 0.08, 0.5);
        const slabMatrices = [];
        const edgeMatrices = [];
        const dummy = new THREE.Object3D();

        const addPath = (points, width) => {
            const curve = new THREE.CatmullRomCurve3(points.map((pt) => new THREE.Vector3(pt[0], 0.05, pt[1])));
            const length = curve.getLength();
            const count = Math.max(3, Math.floor(length / 0.62));
            for (let i = 0; i < count; i++) {
                const t = (i + 0.5) / count;
                const pos = curve.getPointAt(t);
                const tan = curve.getTangentAt(t);
                const ry = Math.atan2(tan.x, tan.z);
                const nx = -tan.z;
                const nz = tan.x;
                const stagger = i % 2 === 0 ? 0.05 : -0.05;
                [-1, 1].forEach((side) => {
                    const off = width * 0.25 * side + stagger * side;
                    dummy.position.set(
                        pos.x + nx * off,
                        0.055 + rand(-0.012, 0.012),
                        pos.z + nz * off
                    );
                    dummy.rotation.set(0, ry + rand(-0.05, 0.05), 0);
                    dummy.scale.set(1 + rand(-0.05, 0.05), 1, 1 + rand(-0.08, 0.08));
                    dummy.updateMatrix();
                    slabMatrices.push(dummy.matrix.clone());
                });
                [-1, 1].forEach((side) => {
                    dummy.position.set(
                        pos.x + nx * width * 0.54 * side,
                        0.04,
                        pos.z + nz * width * 0.54 * side
                    );
                    dummy.rotation.set(0, ry + rand(-0.1, 0.1), 0);
                    dummy.scale.set(1, 1, rand(0.8, 1.15));
                    dummy.updateMatrix();
                    edgeMatrices.push(dummy.matrix.clone());
                });
            }
        };

        addPath([[0, 17.2], [0.2, 14.6], [0.6, 10.6], [0.1, 6.4], [-0.4, 2.4], [-0.9, -1.4], [-1.1, -4.4], [-1.2, -7.3]], 1.9);
        addPath([[0.1, 2.6], [-2.4, 2.2], [-4.8, 0.2], [-6.9, -1.6]], 1.45);
        addPath([[0.5, 10.5], [-1.8, 10.1], [-3.9, 9.4], [-5.3, 8.9], [-6.4, 8.5]], 1.4);
        addPath([[0.3, 6.5], [2.4, 6.0], [4.2, 5.5], [5.2, 4.8], [5.55, 4.2]], 1.4);

        const landingGeo = new THREE.BoxGeometry(2.1, 0.09, 1.35);
        const landingMatrices = [];
        [[-6.9, -1.6, 1.16], [-6.4, 8.48, 0.72], [-1.15, -7.35, 0.06], [5.55, 4.2, -2.22]].forEach(([lx, lz, rot]) => {
            dummy.position.set(lx, 0.062, lz);
            dummy.rotation.set(0, rot, 0);
            dummy.scale.set(1, 1, 1);
            dummy.updateMatrix();
            landingMatrices.push(dummy.matrix.clone());
        });
        const landings = new THREE.InstancedMesh(landingGeo, mats.slab, landingMatrices.length);
        landings.receiveShadow = true;
        landingMatrices.forEach((m, i) => landings.setMatrixAt(i, m));
        group.add(landings);
        disposables.push(landingGeo);

        const slabs = new THREE.InstancedMesh(slabGeo, mats.slab, slabMatrices.length);
        slabs.receiveShadow = true;
        slabs.castShadow = true;
        slabMatrices.forEach((m, i) => slabs.setMatrixAt(i, m));
        group.add(slabs);
        disposables.push(slabGeo);

        const edges = new THREE.InstancedMesh(edgeGeo, mats.slabDark, edgeMatrices.length);
        edges.receiveShadow = true;
        edgeMatrices.forEach((m, i) => edges.setMatrixAt(i, m));
        group.add(edges);
        disposables.push(edgeGeo);

        buildPondBridge(mats);
    }

    function buildPondBridge(mats) {
        const g = new THREE.Group();
        const start = new THREE.Vector3(4.3, 0.18, 8.6);
        const end = new THREE.Vector3(6.9, 0.34, 7.7);
        const planks = 11;
        for (let i = 0; i < planks; i++) {
            const t = (i + 0.5) / planks;
            const x = start.x + (end.x - start.x) * t;
            const z = start.z + (end.z - start.z) * t;
            const y = 0.2 + Math.sin(t * Math.PI) * 0.42;
            const plank = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.07, 0.42), mats.wood);
            plank.position.set(x, y, z);
            plank.rotation.y = Math.atan2(end.x - start.x, end.z - start.z);
            plank.castShadow = true;
            plank.receiveShadow = true;
            g.add(plank);
            disposables.push(plank.geometry);
        }
        const postGeo = new THREE.CylinderGeometry(0.035, 0.04, 0.46, 6);
        const railGeo = new THREE.BoxGeometry(0.045, 0.045, 1);
        disposables.push(postGeo, railGeo);
        [-1, 1].forEach((side) => {
            for (let i = 0; i <= 3; i++) {
                const t = i / 3;
                const x = start.x + (end.x - start.x) * t + side * 0.42;
                const z = start.z + (end.z - start.z) * t;
                const y = 0.2 + Math.sin(t * Math.PI) * 0.42;
                const post = new THREE.Mesh(postGeo, mats.darkWood);
                post.position.set(x, y + 0.22, z);
                g.add(post);
            }
            for (let i = 0; i < 6; i++) {
                const t0 = i / 6;
                const t1 = (i + 1) / 6;
                const ax = start.x + (end.x - start.x) * t0 + side * 0.42;
                const az = start.z + (end.z - start.z) * t0;
                const bx = start.x + (end.x - start.x) * t1 + side * 0.42;
                const bz = start.z + (end.z - start.z) * t1;
                const ay = 0.2 + Math.sin(t0 * Math.PI) * 0.42 + 0.36;
                const by = 0.2 + Math.sin(t1 * Math.PI) * 0.42 + 0.36;
                const len = Math.hypot(bx - ax, bz - az, by - ay);
                const rail = new THREE.Mesh(railGeo, mats.darkWood);
                rail.scale.z = len;
                rail.position.set((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2);
                rail.rotation.y = Math.atan2(bx - ax, bz - az);
                rail.rotation.x = -Math.atan2(by - ay, Math.hypot(bx - ax, bz - az));
                g.add(rail);
            }
        });
        group.add(g);
    }

    function buildPine(x, z, scale, mats) {
        if (!mats.needle) {
            mats.needle = track(new THREE.MeshStandardMaterial({
                color: 0x35533f,
                roughness: 0.9,
                flatShading: true
            }));
        }
        const tree = new THREE.Group();
        const lowerH = 1.1 * scale;
        const trunkLow = new THREE.Mesh(
            new THREE.CylinderGeometry(0.1 * scale, 0.19 * scale, lowerH, 8),
            mats.darkWood
        );
        trunkLow.position.y = lowerH / 2;
        trunkLow.rotation.z = 0.04;
        trunkLow.castShadow = true;
        tree.add(trunkLow);
        disposables.push(trunkLow.geometry);

        const upperH = 1.15 * scale;
        const trunkUp = new THREE.Mesh(
            new THREE.CylinderGeometry(0.06 * scale, 0.11 * scale, upperH, 7),
            mats.darkWood
        );
        trunkUp.position.set(0.07 * scale, lowerH + upperH / 2 - 0.04, 0);
        trunkUp.rotation.z = 0.13;
        trunkUp.castShadow = true;
        tree.add(trunkUp);
        disposables.push(trunkUp.geometry);

        const branchGeo = new THREE.CylinderGeometry(0.035 * scale, 0.06 * scale, 0.85 * scale, 5);
        disposables.push(branchGeo);
        for (let i = 0; i < 4; i++) {
            const a = (i / 4) * TAU + 0.6;
            const branch = new THREE.Mesh(branchGeo, mats.darkWood);
            branch.position.set(
                Math.cos(a) * 0.26 * scale,
                (0.85 + i * 0.34) * scale,
                Math.sin(a) * 0.26 * scale
            );
            branch.rotation.set(Math.sin(a) * 0.9, 0, -Math.cos(a) * 0.9);
            tree.add(branch);
        }

        const cones = [];
        for (let tier = 0; tier < 5; tier++) {
            const y = (0.95 + tier * 0.4) * scale;
            const ringR = Math.max(0.12, 0.82 - tier * 0.14) * scale;
            const perRing = tier >= 4 ? 3 : 6;
            for (let k = 0; k < perRing; k++) {
                const a = (k / perRing) * TAU + tier * 0.5;
                cones.push({
                    x: Math.cos(a) * ringR,
                    y: y + rand(-0.05, 0.05) * scale,
                    z: Math.sin(a) * ringR,
                    r: (0.36 - tier * 0.045) * scale * rand(0.85, 1.1),
                    h: (0.62 - tier * 0.04) * scale * rand(0.9, 1.1),
                    tiltX: Math.sin(a) * 0.28,
                    tiltZ: -Math.cos(a) * 0.28
                });
            }
            cones.push({
                x: 0,
                y: y + 0.16 * scale,
                z: 0,
                r: (0.34 - tier * 0.04) * scale,
                h: (0.66 - tier * 0.04) * scale,
                tiltX: 0,
                tiltZ: 0
            });
        }
        const coneGeo = new THREE.ConeGeometry(1, 1, 7, 1);
        const foliage = new THREE.InstancedMesh(coneGeo, mats.needle, cones.length);
        const dummy = new THREE.Object3D();
        cones.forEach((c, i) => {
            dummy.position.set(c.x, c.y, c.z);
            dummy.rotation.set(c.tiltX, rand(0, TAU), c.tiltZ);
            dummy.scale.set(c.r, c.h, c.r);
            dummy.updateMatrix();
            foliage.setMatrixAt(i, dummy.matrix);
        });
        foliage.castShadow = true;
        tree.add(foliage);
        disposables.push(coneGeo, foliage.geometry);

        tree.position.set(x, 0, z);
        tree.rotation.y = rand(0, TAU);
        group.add(tree);
        return tree;
    }

    function buildWillow(x, z, scale, mats) {
        if (!mats.willowLeaf) {
            mats.willowLeaf = track(new THREE.MeshStandardMaterial({
                map: makeLeafTexture(),
                color: 0x86ad63,
                roughness: 0.9,
                side: THREE.DoubleSide,
                transparent: true,
                alphaTest: 0.22
            }));
        }
        const tree = new THREE.Group();
        const trunk = new THREE.Mesh(
            new THREE.CylinderGeometry(0.11 * scale, 0.21 * scale, 2.1 * scale, 8),
            mats.darkWood
        );
        trunk.position.y = 1.05 * scale;
        trunk.rotation.z = rand(-0.05, 0.05);
        trunk.castShadow = true;
        tree.add(trunk);
        disposables.push(trunk.geometry);

        const branchGeo = new THREE.CylinderGeometry(0.04 * scale, 0.07 * scale, 0.95 * scale, 5);
        disposables.push(branchGeo);
        for (let i = 0; i < 3; i++) {
            const a = (i / 3) * TAU;
            const branch = new THREE.Mesh(branchGeo, mats.darkWood);
            branch.position.set(Math.cos(a) * 0.3 * scale, (2.0 + i * 0.16) * scale, Math.sin(a) * 0.3 * scale);
            branch.rotation.set(Math.sin(a) * 0.8, 0, -Math.cos(a) * 0.8);
            tree.add(branch);
        }

        const lobeGeo = new THREE.SphereGeometry(0.9 * scale, 9, 7);
        disposables.push(lobeGeo);
        const lobes = [
            [0, 2.35, 0, 1.15, 0.68, 1.15],
            [0.65, 2.15, 0.2, 0.78, 0.55, 0.82],
            [-0.6, 2.2, -0.25, 0.82, 0.58, 0.8],
            [0.1, 2.2, 0.7, 0.72, 0.5, 0.7],
            [0.05, 2.25, -0.7, 0.7, 0.5, 0.72]
        ];
        lobes.forEach(([lx, ly, lz, sx, sy, sz]) => {
            const lobe = new THREE.Mesh(lobeGeo, mats.willowLeaf);
            lobe.position.set(lx * scale, ly * scale, lz * scale);
            lobe.scale.set(sx, sy, sz);
            lobe.castShadow = true;
            tree.add(lobe);
        });

        const strandGeo = new THREE.PlaneGeometry(0.22 * scale, 1.9 * scale);
        const strandMat = mats.willowLeaf;
        const strands = new THREE.InstancedMesh(strandGeo, strandMat, 22);
        const dummy = new THREE.Object3D();
        for (let i = 0; i < 22; i++) {
            const a = (i / 22) * TAU + rand(-0.16, 0.16);
            const rr = rand(0.55, 1.05) * scale;
            const len = rand(0.7, 1.15);
            dummy.position.set(Math.cos(a) * rr, (2.15 - len * 0.95) * scale, Math.sin(a) * rr);
            dummy.rotation.set(rand(-0.12, 0.12), -a, rand(-0.1, 0.1));
            dummy.scale.set(rand(0.8, 1.2), len, 1);
            dummy.updateMatrix();
            strands.setMatrixAt(i, dummy.matrix);
        }
        tree.add(strands);
        disposables.push(strandGeo, strands.geometry);

        tree.position.set(x, 0, z);
        tree.rotation.y = rand(0, TAU);
        group.add(tree);
        return tree;
    }

    function buildBamboo(x, z, mats) {
        if (!mats.bambooStalk) {
            mats.bambooStalk = track(new THREE.MeshStandardMaterial({ color: 0x7d9855, roughness: 0.78 }));
            mats.bambooLeaf = track(new THREE.MeshStandardMaterial({
                map: makeLeafTexture(),
                color: 0x7fa35a,
                roughness: 0.86,
                side: THREE.DoubleSide,
                transparent: true,
                alphaTest: 0.24
            }));
        }
        const clump = new THREE.Group();
        const stalkGeo = new THREE.CylinderGeometry(0.035, 0.05, 1, 5);
        const nodeGeo = new THREE.TorusGeometry(0.047, 0.012, 4, 8);
        disposables.push(stalkGeo, nodeGeo);
        const nodeMatrices = [];
        for (let i = 0; i < 8; i++) {
            const h = rand(2.2, 3.6);
            const px = rand(-0.5, 0.5);
            const pz = rand(-0.5, 0.5);
            const stalk = new THREE.Mesh(stalkGeo, mats.bambooStalk);
            stalk.scale.set(1, h, 1);
            stalk.position.set(px, h / 2, pz);
            stalk.rotation.z = rand(-0.09, 0.09);
            stalk.rotation.x = rand(-0.09, 0.09);
            stalk.castShadow = true;
            clump.add(stalk);
            for (let n = 1; n < 6; n++) {
                const t = n / 6;
                nodeMatrices.push([px - stalk.rotation.z * h * (t - 0.5) * 1.4, h * t, pz + stalk.rotation.x * h * (t - 0.5) * 1.4]);
            }
        }
        const nodes = new THREE.InstancedMesh(nodeGeo, mats.bambooStalk, nodeMatrices.length);
        const dummy = new THREE.Object3D();
        nodeMatrices.forEach(([nx, ny, nz], i) => {
            dummy.position.set(nx, ny, nz);
            dummy.rotation.set(Math.PI / 2, 0, 0);
            dummy.scale.setScalar(1);
            dummy.updateMatrix();
            nodes.setMatrixAt(i, dummy.matrix);
        });
        clump.add(nodes);
        disposables.push(nodes.geometry);

        const leafGeo = new THREE.PlaneGeometry(0.62, 0.17);
        const leaves = new THREE.InstancedMesh(leafGeo, mats.bambooLeaf, 40);
        for (let i = 0; i < 40; i++) {
            dummy.position.set(rand(-1.1, 1.1), rand(1.5, 3.5), rand(-1.1, 1.1));
            dummy.rotation.set(rand(-0.7, 0.3), rand(0, TAU), rand(-0.6, 0.6));
            dummy.scale.setScalar(rand(0.7, 1.25));
            dummy.updateMatrix();
            leaves.setMatrixAt(i, dummy.matrix);
        }
        clump.add(leaves);
        disposables.push(leafGeo, leaves.geometry);

        clump.position.set(x, 0, z);
        group.add(clump);
        return clump;
    }

    function buildGarden(mats) {
        if (!mats.bushGreen) {
            mats.bushGreen = track(new THREE.MeshStandardMaterial({ color: 0x3d6444, roughness: 0.9, flatShading: true }));
            mats.flowerPink = track(new THREE.MeshStandardMaterial({ color: 0xdf9aa6, roughness: 0.75 }));
            mats.flowerWhite = track(new THREE.MeshStandardMaterial({ color: 0xf2e6dc, roughness: 0.75 }));
        }
        const spots = [
            [-2.8, 13.4, 1.25, 1], [2.9, 12.6, 1.1, 0],
            [-5.3, 12.0, 0.95, 1], [5.1, 11.4, 1.05, 0],
            [-12.4, -6.6, 1.15, 0], [-7.0, -7.9, 0.9, 1],
            [-3.1, -13.4, 1.0, 1], [2.2, -12.8, 0.95, 0],
            [13.1, 3.2, 1.1, 0], [12.0, 11.6, 1.05, 1],
            [-13.7, 3.0, 0.95, 1], [8.2, -2.4, 0.9, 0]
        ];
        const blobs = [
            [0, 0.38, 0, 0.6],
            [0.45, 0.3, 0.12, 0.42],
            [-0.4, 0.32, -0.18, 0.46],
            [0.05, 0.55, -0.3, 0.4]
        ];
        const blobM = [];
        const pinkM = [];
        const whiteM = [];
        const dummy = new THREE.Object3D();
        spots.forEach(([x, z, scale, hue]) => {
            const rot = rand(0, TAU);
            const cos = Math.cos(rot);
            const sin = Math.sin(rot);
            blobs.forEach(([bx, by, bz, br]) => {
                const lx = bx * scale;
                const lz = bz * scale;
                dummy.position.set(x + lx * cos + lz * sin, by * scale, z - lx * sin + lz * cos);
                dummy.rotation.set(0, rot, 0);
                dummy.scale.set(br * scale, br * 0.72 * scale, br * scale);
                dummy.updateMatrix();
                blobM.push(dummy.matrix.clone());
            });
            for (let i = 0; i < 20; i++) {
                const a = rand(0, TAU);
                const rr = rand(0.12, 0.78) * scale;
                const lx = Math.cos(a) * rr;
                const lz = Math.sin(a) * rr;
                dummy.position.set(x + lx * cos + lz * sin, rand(0.45, 0.85) * scale, z - lx * sin + lz * cos);
                dummy.rotation.set(0, 0, 0);
                dummy.scale.setScalar(rand(0.75, 1.35));
                dummy.updateMatrix();
                (hue ? pinkM : whiteM).push(dummy.matrix.clone());
            }
        });
        const build = (geo, mat, matrices, shadow) => {
            const mesh = new THREE.InstancedMesh(geo, mat, matrices.length);
            matrices.forEach((m, i) => mesh.setMatrixAt(i, m));
            mesh.castShadow = shadow;
            group.add(mesh);
            disposables.push(geo);
        };
        build(new THREE.IcosahedronGeometry(1, 1), mats.bushGreen, blobM, true);
        build(new THREE.SphereGeometry(0.075, 7, 5), mats.flowerPink, pinkM, false);
        build(new THREE.SphereGeometry(0.075, 7, 5), mats.flowerWhite, whiteM, false);

        const tuftGeo = new THREE.ConeGeometry(0.12, 0.5, 4, 1, true);
        const tuftMat = track(new THREE.MeshStandardMaterial({
            color: 0x4d6d43,
            roughness: 0.9,
            side: THREE.DoubleSide
        }));
        const tufts = new THREE.InstancedMesh(tuftGeo, tuftMat, 140);
        const anchors = [
            [0, 15.6], [-2.4, 7.0], [3.0, 6.2], [-4.6, 1.0],
            [4.8, -1.4], [-9.0, 2.2], [-5.6, -11.2], [1.6, -14.6],
            [10.4, 13.0], [14.2, 5.4], [-14.0, 8.4]
        ];
        for (let i = 0; i < 140; i++) {
            const anchor = anchors[i % anchors.length];
            dummy.position.set(
                anchor[0] + rand(-1.5, 1.5),
                0.22,
                anchor[1] + rand(-1.5, 1.5)
            );
            dummy.rotation.set(rand(-0.12, 0.12), rand(0, TAU), rand(-0.12, 0.12));
            dummy.scale.setScalar(rand(0.7, 1.4));
            dummy.updateMatrix();
            tufts.setMatrixAt(i, dummy.matrix);
        }
        tufts.castShadow = false;
        group.add(tufts);
        disposables.push(tuftGeo);

        const patchGeo = new THREE.CircleGeometry(1, 10);
        const patchMatA = track(new THREE.MeshBasicMaterial({
            color: 0x556b46,
            transparent: true,
            opacity: 0.24,
            depthWrite: false
        }));
        const patchMatB = track(new THREE.MeshBasicMaterial({
            color: 0x7b7c4c,
            transparent: true,
            opacity: 0.18,
            depthWrite: false
        }));
        const patchMats = [patchMatA, patchMatB];
        const patchSets = [[], []];
        let placed = 0;
        let guard = 0;
        while (placed < 26 && guard < 200) {
            guard++;
            const a = rand(0, TAU);
            const r = rand(4.2, 16.2);
            const px = Math.cos(a) * r;
            const pz = Math.sin(a) * r;
            if (Math.hypot(px - 9.4, pz - 7.0) < 6.0) continue;
            dummy.position.set(px, 0.044, pz);
            dummy.rotation.set(-Math.PI / 2, 0, rand(0, TAU));
            dummy.scale.set(rand(0.8, 2.2), rand(0.6, 1.6), 1);
            dummy.updateMatrix();
            patchSets[placed % 2].push(dummy.matrix.clone());
            placed++;
        }
        patchSets.forEach((list, i) => {
            const mesh = new THREE.InstancedMesh(patchGeo, patchMats[i], list.length);
            list.forEach((m, k) => mesh.setMatrixAt(k, m));
            group.add(mesh);
        });
        disposables.push(patchGeo);
    }

    function buildFloatRocks(mats) {
        const rockMat = track(new THREE.MeshStandardMaterial({ color: 0x4d5865, roughness: 0.96, flatShading: true }));
        for (let i = 0; i < 9; i++) {
            const a = rand(0, TAU);
            const r = rand(23, 34);
            const geo = rockGeometry(rand(0.6, 2.1), 1, 0.6, i * 5.3);
            const rock = new THREE.Mesh(geo, rockMat);
            rock.position.set(Math.cos(a) * r, rand(-16, 6), Math.sin(a) * r);
            rock.rotation.set(rand(0, 3), rand(0, 3), rand(0, 3));
            rock.castShadow = true;
            group.add(rock);
            disposables.push(geo);
            floaters.push({ mesh: rock, baseY: rock.position.y, phase: rand(0, TAU), amp: rand(0.3, 0.9), speed: rand(0.16, 0.4) });

            if (i % 2 === 0) {
                const cap = new THREE.Mesh(new THREE.SphereGeometry(0.42, 8, 6), grassMaterial());
                cap.scale.set(1.2, 0.32, 1.2);
                cap.position.y = 0.16;
                rock.add(cap);
                disposables.push(cap.geometry);

                const pineMat = track(new THREE.MeshStandardMaterial({ color: 0x274538, roughness: 0.9, flatShading: true }));
                const pine = new THREE.Group();
                [0.85, 0.62, 0.4].forEach((rad, k) => {
                    const cone = new THREE.Mesh(new THREE.ConeGeometry(rad, 1.15, 6), pineMat);
                    cone.position.y = 0.45 + k * 0.52;
                    cone.castShadow = true;
                    pine.add(cone);
                    disposables.push(cone.geometry);
                });
                pine.scale.setScalar(rand(0.55, 0.9));
                pine.position.y = 0.24;
                pine.rotation.y = rand(0, TAU);
                rock.add(pine);
            }
        }
    }

    function buildFireflies() {
        const geo = new THREE.BufferGeometry();
        const count = 120;
        const pos = new Float32Array(count * 3);
        const phase = new Float32Array(count);
        for (let i = 0; i < count; i++) {
            const a = rand(0, TAU);
            const r = rand(3, 17);
            pos[i * 3] = Math.cos(a) * r;
            pos[i * 3 + 1] = rand(0.5, 5.5);
            pos[i * 3 + 2] = Math.sin(a) * r;
            phase[i] = rand(0, TAU);
        }
        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        const map = makeGlowTexture();
        const mat = new THREE.PointsMaterial({
            map,
            color: 0xffcf85,
            size: 0.44,
            sizeAttenuation: true,
            transparent: true,
            opacity: 0.9,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });
        const points = new THREE.Points(geo, mat);
        group.add(points);
        fireflies = { points, base: pos.slice(), phase, geo, mat };
        disposables.push(geo, mat, map);
    }

    function buildRooms(mats) {
        const builders = {
            pavilion: buildPavilion,
            terrace: buildTerrace,
            cottage: buildCottage,
            waterside: buildWaterside
        };

        ROOM_LAYOUT.forEach((def, index) => {
            const builder = builders[def.kind] || buildPavilion;
            const built = builder(mats, def);
            mergeStaticMeshes(built.group);
            const holder = new THREE.Group();
            holder.position.fromArray(def.position);
            holder.rotation.y = def.rotation;
            holder.scale.setScalar(def.scale);
            holder.add(built.group);
            group.add(holder);

            const hitGeo = new THREE.BoxGeometry(built.size * 1.5, built.height, built.size * 1.5);
            const hitMat = new THREE.MeshBasicMaterial({ visible: false });
            const hit = new THREE.Mesh(hitGeo, hitMat);
            hit.position.y = built.height / 2;
            hit.userData.roomId = def.id;
            holder.add(hit);
            disposables.push(hitGeo, hitMat);

            const ringGeo = new THREE.RingGeometry(built.size * 0.72, built.size * 0.78, 48);
            const ringMat = new THREE.MeshBasicMaterial({
                color: 0xe8c88e,
                transparent: true,
                opacity: 0,
                side: THREE.DoubleSide,
                depthWrite: false
            });
            const ring = new THREE.Mesh(ringGeo, ringMat);
            ring.rotation.x = -Math.PI / 2;
            ring.position.y = 0.06;
            holder.add(ring);
            disposables.push(ringGeo, ringMat);

            roomMeshes.push({
                def,
                holder,
                hit,
                ring,
                ringMat,
                built,
                baseY: def.position[1],
                hoverT: 0,
                targetHover: 0,
                index
            });
        });
    }

    function buildWaterside(mats, opts) {
        const built = buildPavilion(mats, opts);
        const g = built.group;

        const deck = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.16, 2.6), mats.wood);
        deck.position.set(0, 0.02, -3.6);
        deck.receiveShadow = true;
        g.add(deck);
        disposables.push(deck.geometry);

        const baseH = g.userData.baseY || 0.6;
        const landing = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.3, 2.0), mats.slab);
        landing.position.set(0, 0.11 - baseH, 3.3);
        landing.receiveShadow = true;
        g.add(landing);
        disposables.push(landing.geometry);
        const landingTrim = new THREE.Mesh(new THREE.BoxGeometry(3.3, 0.09, 0.3), mats.slabDark);
        landingTrim.position.set(0, 0.28 - baseH, 4.3);
        g.add(landingTrim);
        disposables.push(landingTrim.geometry);
        const step1 = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.12, 0.3), mats.slab);
        step1.position.set(0, 0.12 - baseH, 4.48);
        step1.receiveShadow = true;
        g.add(step1);
        disposables.push(step1.geometry);
        const step2 = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.12, 0.3), mats.slab);
        step2.position.set(0, 0.04 - baseH, 4.72);
        step2.receiveShadow = true;
        g.add(step2);
        disposables.push(step2.geometry);

        const postGeo = new THREE.CylinderGeometry(0.09, 0.11, 1.2, 7);
        disposables.push(postGeo);
        for (let i = -3; i <= 3; i++) {
            [-4.8, -2.5].forEach((z) => {
                const p = new THREE.Mesh(postGeo, mats.darkWood);
                p.position.set(i, -0.55, z);
                p.castShadow = true;
                g.add(p);
            });
        }

        const railPostGeo = new THREE.BoxGeometry(0.08, 0.6, 0.08);
        const railBarGeo = new THREE.BoxGeometry(0.06, 0.06, 1);
        disposables.push(railPostGeo, railBarGeo);
        [-1, 1].forEach((side) => {
            for (let i = 0; i <= 3; i++) {
                const post = new THREE.Mesh(railPostGeo, mats.darkWood);
                post.position.set(side * 3.16, 0.4, -2.5 - i * 0.75);
                g.add(post);
            }
            for (let i = 0; i < 3; i++) {
                const bar = new THREE.Mesh(railBarGeo, mats.darkWood);
                bar.scale.z = 0.76;
                bar.position.set(side * 3.16, 0.62, -2.87 - i * 0.75);
                bar.rotation.y = Math.PI / 2;
                g.add(bar);
            }
        });
        for (let i = 0; i < 3; i++) {
            const bar = new THREE.Mesh(railBarGeo, mats.darkWood);
            bar.scale.z = 0.86;
            bar.position.set(1.2 + i * 0.9, 0.62, -4.86);
            g.add(bar);
        }

        const bridgeArc = new THREE.Group();
        for (let i = 0; i < 7; i++) {
            const t = i / 6;
            const plank = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.09, 1.5), mats.wood);
            plank.position.set(-3.2 + t * 3.4, Math.sin(t * Math.PI) * 0.42 + 0.12, -5.0);
            plank.rotation.z = -Math.cos(t * Math.PI) * 0.34;
            plank.receiveShadow = true;
            bridgeArc.add(plank);
            disposables.push(plank.geometry);
        }
        g.add(bridgeArc);

        const boat = new THREE.Group();
        const hullProfile = [
            new THREE.Vector2(0.05, 0),
            new THREE.Vector2(0.55, 0.04),
            new THREE.Vector2(0.9, 0.16),
            new THREE.Vector2(1.05, 0.3)
        ];
        const hull = new THREE.Mesh(new THREE.LatheGeometry(hullProfile, 14), mats.darkWood);
        hull.scale.set(1.5, 0.55, 0.62);
        hull.position.y = 0.02;
        boat.add(hull);
        disposables.push(hull.geometry);
        const deckIn = new THREE.Mesh(new THREE.CylinderGeometry(1.38, 1.38, 0.04, 16), mats.wood);
        deckIn.scale.set(1, 1, 0.36);
        deckIn.position.y = 0.16;
        boat.add(deckIn);
        disposables.push(deckIn.geometry);
        const canopy = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.9, 10, 1, false, 0, Math.PI), mats.darkWood);
        canopy.rotation.z = Math.PI / 2;
        canopy.position.set(-0.1, 0.62, 0);
        boat.add(canopy);
        disposables.push(canopy.geometry);
        const oar = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.8, 6), mats.wood);
        oar.rotation.z = -1.1;
        oar.position.set(0.55, 0.36, 0.34);
        boat.add(oar);
        disposables.push(oar.geometry);
        boat.position.set(-3.9, -0.02, 0.2);
        boat.rotation.y = 0.5;
        g.add(boat);

        const teaTable = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.5, 0.7), mats.darkWood);
        teaTable.position.set(-0.9, 0.17, -3.7);
        g.add(teaTable);
        disposables.push(teaTable.geometry);
        const teapot = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), mats.stoneWhite);
        teapot.position.set(-0.9, 0.48, -3.7);
        g.add(teapot);
        disposables.push(teapot.geometry);
        [-0.16, 0.16].forEach((dx) => {
            const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.07, 8), mats.stoneWhite);
            cup.position.set(-0.9 + dx, 0.45, -3.92);
            g.add(cup);
            disposables.push(cup.geometry);
        });

        return { group: g, roofY: built.roofY, size: built.size, height: built.height };
    }

    function buildPerimeterWall(mats) {
        const R = 17.9;
        const H = 2.05;
        const T = 0.26;
        const segs = 54;
        const segLen = (TAU * R) / segs;
        const gateAngle = Math.PI / 2;
        const gaps = [
            { a: gateAngle, w: 0.125 },
            { a: Math.atan2(10.4, 14.7), w: 0.1 }
        ];
        const inGap = (a) => gaps.some((g) => Math.abs(Math.atan2(Math.sin(a - g.a), Math.cos(a - g.a))) < g.w);
        const dummy = new THREE.Object3D();

        const angles = [];
        for (let i = 0; i < segs; i++) {
            const a = ((i + 0.5) / segs) * TAU;
            if (!inGap(a)) angles.push(a);
        }

        const bodyGeo = new THREE.BoxGeometry(segLen * 1.05, H, T);
        const body = new THREE.InstancedMesh(bodyGeo, mats.plaster, angles.length);
        body.castShadow = true;
        body.receiveShadow = true;
        angles.forEach((a, i) => {
            dummy.position.set(Math.cos(a) * R, H / 2, Math.sin(a) * R);
            dummy.rotation.set(0, -a - Math.PI / 2, 0);
            dummy.scale.set(1, 1, 1);
            dummy.updateMatrix();
            body.setMatrixAt(i, dummy.matrix);
        });
        group.add(body);
        disposables.push(bodyGeo);

        const plinthGeo = new THREE.BoxGeometry(segLen * 1.06, 0.3, T + 0.16);
        const plinth = new THREE.InstancedMesh(plinthGeo, mats.slabDark, angles.length);
        plinth.receiveShadow = true;
        angles.forEach((a, i) => {
            dummy.position.set(Math.cos(a) * R, 0.14, Math.sin(a) * R);
            dummy.rotation.set(0, -a - Math.PI / 2, 0);
            dummy.updateMatrix();
            plinth.setMatrixAt(i, dummy.matrix);
        });
        group.add(plinth);
        disposables.push(plinthGeo);

        const bandGeo = new THREE.BoxGeometry(segLen * 1.05, 0.08, T + 0.04);
        const band = new THREE.InstancedMesh(bandGeo, mats.darkWood, angles.length);
        angles.forEach((a, i) => {
            dummy.position.set(Math.cos(a) * R, H - 0.22, Math.sin(a) * R);
            dummy.rotation.set(0, -a - Math.PI / 2, 0);
            dummy.updateMatrix();
            band.setMatrixAt(i, dummy.matrix);
        });
        group.add(band);
        disposables.push(bandGeo);

        const capGeo = gablePrismGeometry(segLen * 1.08, T + 0.42, 0.24);
        const cap = new THREE.InstancedMesh(capGeo, mats.blackTile, angles.length);
        cap.castShadow = true;
        cap.receiveShadow = true;
        angles.forEach((a, i) => {
            dummy.position.set(Math.cos(a) * R, H - 0.02, Math.sin(a) * R);
            dummy.rotation.set(0, -a - Math.PI / 2, 0);
            dummy.updateMatrix();
            cap.setMatrixAt(i, dummy.matrix);
        });
        group.add(cap);
        disposables.push(capGeo);

        const ridgeGeo = new THREE.CylinderGeometry(0.07, 0.07, segLen * 1.04, 6);
        ridgeGeo.rotateZ(Math.PI / 2);
        const ridge = new THREE.InstancedMesh(ridgeGeo, mats.blackTile, angles.length);
        ridge.castShadow = true;
        angles.forEach((a, i) => {
            dummy.position.set(Math.cos(a) * R, H + 0.25, Math.sin(a) * R);
            dummy.rotation.set(0, -a - Math.PI / 2, 0);
            dummy.updateMatrix();
            ridge.setMatrixAt(i, dummy.matrix);
        });
        group.add(ridge);
        disposables.push(ridgeGeo);

        const postAngles = [];
        for (let i = 0; i < segs; i += 4) {
            const a = (i / segs) * TAU;
            if (!inGap(a)) postAngles.push(a);
        }
        const postGeo = new THREE.BoxGeometry(0.42, H + 0.28, 0.42);
        const posts = new THREE.InstancedMesh(postGeo, mats.plasterSoft, postAngles.length);
        posts.castShadow = true;
        posts.receiveShadow = true;
        const capPostGeo = new THREE.ConeGeometry(0.36, 0.28, 4);
        capPostGeo.rotateY(Math.PI / 4);
        const postCaps = new THREE.InstancedMesh(capPostGeo, mats.blackTile, postAngles.length);
        postCaps.castShadow = true;
        postAngles.forEach((a, i) => {
            dummy.position.set(Math.cos(a) * R, (H + 0.28) / 2, Math.sin(a) * R);
            dummy.rotation.set(0, -a, 0);
            dummy.updateMatrix();
            posts.setMatrixAt(i, dummy.matrix);
            dummy.position.y = H + 0.36;
            dummy.updateMatrix();
            postCaps.setMatrixAt(i, dummy.matrix);
        });
        group.add(posts, postCaps);
        disposables.push(postGeo, capPostGeo);

        const lampAngles = postAngles.filter((_, i) => i % 2 === 1);
        const lampGeo = new THREE.BoxGeometry(0.26, 0.34, 0.26);
        const lamps = new THREE.InstancedMesh(lampGeo, mats.paper, lampAngles.length);
        lampAngles.forEach((a, i) => {
            dummy.position.set(Math.cos(a) * (R - 0.34), H - 0.42, Math.sin(a) * (R - 0.34));
            dummy.rotation.set(0, -a, 0);
            dummy.updateMatrix();
            lamps.setMatrixAt(i, dummy.matrix);
        });
        group.add(lamps);
        disposables.push(lampGeo);

        const baseRing = new THREE.Mesh(
            new THREE.RingGeometry(16.55, 18.35, 96),
            new THREE.MeshBasicMaterial({
                color: 0x2f3a2a,
                transparent: true,
                opacity: 0.26,
                depthWrite: false,
                side: THREE.DoubleSide
            })
        );
        baseRing.rotation.x = -Math.PI / 2;
        baseRing.position.y = 0.042;
        group.add(baseRing);
        disposables.push(baseRing.geometry, baseRing.material);

        buildGate(mats, R);
    }

    function buildGate(mats, R) {
        const g = new THREE.Group();
        g.position.set(0, 0, R);

        [-1.55, 1.55].forEach((x) => {
            const plinth = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.34, 1.05), mats.slabDark);
            plinth.position.set(x, 0.17, 0);
            plinth.receiveShadow = true;
            g.add(plinth);
            disposables.push(plinth.geometry);

            const pier = new THREE.Mesh(new THREE.BoxGeometry(0.78, 2.5, 0.78), mats.plaster);
            pier.position.set(x, 0.34 + 1.25, 0);
            pier.castShadow = true;
            pier.receiveShadow = true;
            g.add(pier);
            disposables.push(pier.geometry);

            const footTrim = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.12, 0.86), mats.stoneWhite);
            footTrim.position.set(x, 0.4, 0);
            g.add(footTrim);
            disposables.push(footTrim.geometry);

            const headTrim = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.14, 0.92), mats.darkWood);
            headTrim.position.set(x, 2.78, 0);
            g.add(headTrim);
            disposables.push(headTrim.geometry);

            const cap = new THREE.Mesh(new THREE.ConeGeometry(0.62, 0.34, 4), mats.blackTile);
            cap.rotation.y = Math.PI / 4;
            cap.position.set(x, 3.01, 0);
            cap.castShadow = true;
            g.add(cap);
            disposables.push(cap.geometry);
        });

        const lintel = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.3, 0.5), mats.darkWood);
        lintel.position.set(0, 2.5, 0);
        lintel.castShadow = true;
        g.add(lintel);
        disposables.push(lintel.geometry);

        const frieze = new THREE.Mesh(new THREE.BoxGeometry(3.9, 0.18, 0.2), mats.redWood);
        frieze.position.set(0, 2.72, 0.18);
        g.add(frieze);
        disposables.push(frieze.geometry);

        [-1.35, -0.45, 0.45, 1.35].forEach((x) => {
            const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.16, 0.42), mats.gold);
            bracket.position.set(x, 2.34, 0.02);
            g.add(bracket);
            disposables.push(bracket.geometry);
        });

        const roof = addRoof(g, 2.55, 0.98, 0.62, mats, 1);
        roof.position.y = 2.86;

        addPlaque(g, '望星居', 2.52, 0.31, 1.5);
        addPlaque(g, '浮岛', 2.52, -0.31, 0.9);

        const step = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.14, 1.1), mats.slab);
        step.position.set(0, 0.07, 0.72);
        step.receiveShadow = true;
        g.add(step);
        disposables.push(step.geometry);

        addLantern(g, -1.15, 2.18, 0.46, mats, 0.9);
        addLantern(g, 1.15, 2.18, 0.46, mats, 0.9);

        group.add(g);
    }

    function buildTerrainDecor(mats) {
        buildPaths(mats);
        buildPine(-14.2, 4.6, 1.15, mats);
        buildPine(-12.0, 6.9, 0.85, mats);
        buildPine(12.6, -6.2, 1.0, mats);
        buildPine(14.4, -3.4, 0.78, mats);
        buildPine(3.4, -14.6, 0.95, mats);
        buildPine(-5.4, -13.6, 0.82, mats);
        buildWillow(5.0, 11.6, 1.05, mats);
        buildWillow(13.4, 2.2, 0.9, mats);
        buildBamboo(-13.4, -6.4, mats);
        buildBamboo(-11.6, -8.2, mats);
        buildBamboo(-13.9, -8.6, mats);

        const stoneMat = track(new THREE.MeshStandardMaterial({ color: 0x7d8488, roughness: 0.94, flatShading: true }));
        for (let i = 0; i < 7; i++) {
            const a = rand(0, TAU);
            const r = rand(9, 15);
            const rock = new THREE.Mesh(rockGeometry(rand(0.4, 1.0), 1, 0.5, i * 7.7), stoneMat);
            rock.position.set(Math.cos(a) * r, rand(-0.05, 0.12), Math.sin(a) * r);
            rock.rotation.set(rand(0, 3), rand(0, 3), rand(0, 3));
            rock.castShadow = true;
            rock.receiveShadow = true;
            if (Math.hypot(rock.position.x + 1.2, rock.position.z + 10.4) > 5) {
                group.add(rock);
                disposables.push(rock.geometry);
            }
        }

        const lanternPost = new THREE.Group();
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 1.9, 8), mats.stone);
        post.position.y = 0.95;
        post.castShadow = true;
        lanternPost.add(post);
        disposables.push(post.geometry);
        const cap = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.34, 6), mats.stone);
        cap.position.y = 1.96;
        lanternPost.add(cap);
        disposables.push(cap.geometry);
        const lightBox = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.5, 0.42), mats.paper);
        lightBox.position.y = 1.5;
        lanternPost.add(lightBox);
        disposables.push(lightBox.geometry);
        lanternPost.position.set(-3.6, 0, 12.6);
        group.add(lanternPost);
        const stoneLight = new THREE.PointLight(0xffb668, 0.9, 8, 2);
        stoneLight.position.set(-3.6, 1.6, 12.6);
        group.add(stoneLight);

        const lanternPost2 = lanternPost.clone();
        lanternPost2.position.set(6.4, 0, 13.4);
        group.add(lanternPost2);
        const stoneLight2 = new THREE.PointLight(0xffb668, 0.8, 7, 2);
        stoneLight2.position.set(6.4, 1.6, 13.4);
        group.add(stoneLight2);
    }

    function build() {
        group = new THREE.Group();
        buildIslandTop();
        buildPond();
        buildWaterfall();
        const mats = createMaterials();
        buildPerimeterWall(mats);
        buildRooms(mats);
        buildTerrainDecor(mats);
        buildGarden(mats);
        buildFloatRocks(mats);
        buildFireflies();
        scene.add(group);
    }

    function setActive(val) {
        active = val;
        if (!val) {
            running = false;
            cancelAnimationFrame(rafId);
            rafId = 0;
        } else if (!running) {
            running = true;
            clock.getDelta();
            animate();
        }
        needsRender = true;
    }

    function resize() {
        if (!renderer) return;
        const w = container.clientWidth || 1;
        const h = container.clientHeight || 1;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        const narrow = w / h < 0.85;
        camera.fov = narrow ? 60 : 46;
        camera.updateProjectionMatrix();
        needsRender = true;
    }

    function focusRoom(roomId) {
        selectedId = roomId;
        roomMeshes.forEach((r) => {
            r.targetHover = r.def.id === roomId ? 1 : 0;
            r.ringMat.opacity = 0;
        });
        const room = roomMeshes.find((r) => r.def.id === roomId);
        if (room) {
            const p = new THREE.Vector3();
            room.holder.getWorldPosition(p);
            cameraState.targetFocus.set(p.x * 0.72, 2.4 + p.y, p.z * 0.72);
            cameraState.targetRadius = 26;
            const ang = Math.atan2(p.x, p.z);
            cameraState.targetTheta = ang + 0.32;
            cameraState.targetPhi = 1.09;
        }
        needsRender = true;
    }

    function resetFocus() {
        selectedId = null;
        roomMeshes.forEach((r) => {
            r.targetHover = 0;
        });
        cameraState.targetFocus.set(0, 1.8, 0);
        cameraState.targetRadius = 38.5;
        cameraState.targetTheta = 0.12;
        cameraState.targetPhi = 1.0;
        needsRender = true;
    }

    function setHover(roomId) {
        if (hovered === roomId) return;
        hovered = roomId;
        roomMeshes.forEach((r) => {
            r.targetHover = r.def.id === roomId ? 1 : (r.def.id === selectedId ? 1 : 0);
        });
        needsRender = true;
    }

    function pickRoom(clientX, clientY) {
        const rect = renderer.domElement.getBoundingClientRect();
        pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
        pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(pointer, camera);
        const targets = roomMeshes.map((r) => r.hit);
        const hits = raycaster.intersectObjects(targets, false);
        if (hits.length > 0) {
            return hits[0].object.userData.roomId;
        }
        return null;
    }

    function projectRoom(roomId) {
        const room = roomMeshes.find((r) => r.def.id === roomId);
        if (!room) return null;
        const v = new THREE.Vector3();
        room.holder.getWorldPosition(v);
        v.y += room.built.height * 0.92;
        v.project(camera);
        const rect = renderer.domElement.getBoundingClientRect();
        return {
            x: (v.x * 0.5 + 0.5) * rect.width,
            y: (-v.y * 0.5 + 0.5) * rect.height,
            visible: v.z < 1
        };
    }

    function onPointerDown(e) {
        if (e.button !== undefined && e.button !== 0) return;
        dragState.dragging = true;
        dragState.moved = 0;
        dragState.x = e.clientX;
        dragState.y = e.clientY;
        dragState.id = e.pointerId;
        renderer.domElement.classList.add('is-dragging');
        if (renderer.domElement.setPointerCapture && e.pointerId !== undefined) {
            try { renderer.domElement.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
        }
        lastInteraction = performance.now();
    }

    function onPointerMove(e) {
        pointerNdc.x = e.clientX;
        pointerNdc.y = e.clientY;
        lastInteraction = performance.now();

        if (dragState.dragging) {
            const dx = e.clientX - dragState.x;
            const dy = e.clientY - dragState.y;
            dragState.moved += Math.abs(dx) + Math.abs(dy);
            dragState.x = e.clientX;
            dragState.y = e.clientY;
            cameraState.targetTheta -= dx * 0.005;
            cameraState.targetPhi = THREE.MathUtils.clamp(cameraState.targetPhi - dy * 0.0036, 0.5, 1.42);
            needsRender = true;
            if (dragState.moved > 6 && hovered) {
                setHover(null);
                onHover(null);
            }
            return;
        }

        const roomId = pickRoom(e.clientX, e.clientY);
        setHover(roomId);
        renderer.domElement.style.cursor = roomId ? 'pointer' : 'grab';
        onHover(roomId, projectRoom(roomId));
    }

    function onPointerUp(e) {
        if (!dragState.dragging) return;
        const wasDrag = dragState.moved > 7;
        dragState.dragging = false;
        renderer.domElement.classList.remove('is-dragging');
        if (renderer.domElement.releasePointerCapture && dragState.id !== null) {
            try { renderer.domElement.releasePointerCapture(dragState.id); } catch (err) { /* ignore */ }
        }
        dragState.id = null;
        if (wasDrag) return;

        const roomId = pickRoom(e.clientX, e.clientY);
        if (roomId) {
            focusRoom(roomId);
            onSelect(roomId);
        }
    }

    function onWheel(e) {
        e.preventDefault();
        cameraState.targetRadius = THREE.MathUtils.clamp(cameraState.targetRadius + e.deltaY * 0.016, 20, 46);
        lastInteraction = performance.now();
        needsRender = true;
    }

    function onPointerLeave() {
        setHover(null);
        onHover(null);
        if (dragState.dragging) {
            dragState.dragging = false;
            renderer.domElement.classList.remove('is-dragging');
        }
    }

    function updateCamera(dt) {
        const ease = 1 - Math.pow(0.0008, dt);
        cameraState.theta += (cameraState.targetTheta - cameraState.theta) * ease;
        cameraState.phi += (cameraState.targetPhi - cameraState.phi) * ease;
        cameraState.radius += (cameraState.targetRadius - cameraState.radius) * ease;
        cameraState.focus.lerp(cameraState.targetFocus, ease);

        const sinPhi = Math.sin(cameraState.phi);
        camera.position.set(
            cameraState.focus.x + cameraState.radius * sinPhi * Math.sin(cameraState.theta),
            cameraState.focus.y + cameraState.radius * Math.cos(cameraState.phi),
            cameraState.focus.z + cameraState.radius * sinPhi * Math.cos(cameraState.theta)
        );
        camera.position.y = Math.max(camera.position.y, -6);
        camera.lookAt(cameraState.focus);
    }

    function updateRoomState(dt, elapsed) {
        let changed = false;
        roomMeshes.forEach((room) => {
            const target = room.def.id === hovered || room.def.id === selectedId ? 1 : 0;
            room.targetHover = target;
            const diff = target - room.hoverT;
            if (Math.abs(diff) > 0.001) {
                room.hoverT += diff * Math.min(1, dt * 7);
                changed = true;
            }
            const lift = room.hoverT * 0.22;
            room.holder.position.y = room.baseY + lift;
            room.ringMat.opacity = room.hoverT * 0.55;
            room.ring.scale.setScalar(1 + room.hoverT * 0.05);
        });
        return changed;
    }

    function updateAnimations(dt, elapsed) {
        roomMeshes.forEach((room) => {
            const base = room.built.group.userData.baseY || 0;
            const bob = Math.sin(elapsed * 0.55 + room.index * 1.7) * 0.035;
            room.built.group.position.y = base + bob;
            room.built.group.rotation.z = Math.sin(elapsed * 0.4 + room.index) * 0.004;
        });

        if (topMesh) {
            group.position.y = Math.sin(elapsed * 0.42) * 0.16;
            group.rotation.z = Math.sin(elapsed * 0.31) * 0.006;
        }

        floaters.forEach((f) => {
            f.mesh.position.y = f.baseY + Math.sin(elapsed * f.speed + f.phase) * f.amp;
            f.mesh.rotation.y += dt * 0.06;
        });

        waterMeshes.forEach((w) => {
            if (w.ripple) {
                const t = (elapsed * 0.32 + w.phase) % 1;
                w.ripple.scale.setScalar(0.4 + t * 3.4);
                w.ripple.material.opacity = (1 - t) * 0.26;
            } else if (w.mesh) {
                w.mesh.position.y = w.base + Math.sin(elapsed * 0.9 + w.base) * 0.012;
            }
        });

        waterfallMats.forEach((w) => {
            w.map.offset.y = (w.map.offset.y + dt * 0.85) % 1;
        });

        mistSprites.forEach((s, i) => {
            s.position.y = -16 + Math.sin(elapsed * 0.6 + i) * 0.9;
            s.material.opacity = 0.2 + Math.sin(elapsed * 0.8 + i * 0.7) * 0.1;
        });

        clouds.forEach((c, i) => {
            c.position.x += Math.sin(elapsed * 0.06 + i) * 0.008;
            c.position.y += Math.cos(elapsed * 0.05 + i) * 0.004;
        });

        if (fireflies) {
            const arr = fireflies.geo.attributes.position.array;
            for (let i = 0; i < fireflies.phase.length; i++) {
                const p = fireflies.phase[i];
                arr[i * 3] = fireflies.base[i * 3] + Math.sin(elapsed * 0.5 + p) * 1.1;
                arr[i * 3 + 1] = fireflies.base[i * 3 + 1] + Math.sin(elapsed * 0.75 + p * 1.7) * 0.6;
                arr[i * 3 + 2] = fireflies.base[i * 3 + 2] + Math.cos(elapsed * 0.42 + p) * 1.1;
            }
            fireflies.geo.attributes.position.needsUpdate = true;
            fireflies.mat.opacity = 0.62 + Math.sin(elapsed * 1.6) * 0.22;
        }

        if (starField) {
            starField.rotation.y = elapsed * 0.006;
        }

        if (moonSprite) {
            moonSprite.material.opacity = 0.82 + Math.sin(elapsed * 0.5) * 0.06;
        }
    }

    function animate() {
        if (!active) return;
        rafId = requestAnimationFrame(animate);
        const dt = Math.min(clock.getDelta(), 0.06);
        time += dt;
        const t = time;

        updateCamera(dt);
        updateRoomState(dt, t);
        updateAnimations(dt, t);
        renderer.render(scene, camera);
    }

    function bindEvents() {
        const el = renderer.domElement;
        el.addEventListener('pointerdown', onPointerDown);
        el.addEventListener('pointermove', onPointerMove);
        el.addEventListener('pointerup', onPointerUp);
        el.addEventListener('pointercancel', onPointerUp);
        el.addEventListener('pointerleave', onPointerLeave);
        el.addEventListener('wheel', onWheel, { passive: false });
        window.addEventListener('resize', resize);
    }

    function start() {
        setupRenderer();
        setupScene();
        build();
        bindEvents();
        resize();
        running = true;
        clock.getDelta();
        animate();
        requestAnimationFrame(() => {
            resize();
            needsRender = true;
        });
    }

    function dispose() {
        active = false;
        running = false;
        cancelAnimationFrame(rafId);
        window.removeEventListener('resize', resize);
        if (renderer) {
            const el = renderer.domElement;
            el.removeEventListener('pointerdown', onPointerDown);
            el.removeEventListener('pointermove', onPointerMove);
            el.removeEventListener('pointerup', onPointerUp);
            el.removeEventListener('pointercancel', onPointerUp);
            el.removeEventListener('pointerleave', onPointerLeave);
            el.removeEventListener('wheel', onWheel);
            renderer.dispose();
            if (el.parentNode) el.parentNode.removeChild(el);
        }
        disposables.forEach((d) => {
            if (d && d.dispose) d.dispose();
        });
        disposables.length = 0;
    }

    return { start, dispose, setActive, resize, focusRoom, resetFocus, projectRoom, rooms: ROOM_LAYOUT };
}

export const ROOMS = ROOM_LAYOUT;
