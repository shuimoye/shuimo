/**
 * 可复现随机数模块
 * 用于保证碰撞驱动的世界演化可回放、可复现
 */

const RNG = {
    seed: 20261031,
    state: 0,
    enabled: true,

    init(seed) {
        if (typeof seed === 'number' && Number.isFinite(seed)) this.seed = seed >>> 0;
        this.state = this.seed || 1;
    },

    random() {
        if (!this.enabled) return Math.random();
        this.state |= 0;
        this.state = (this.state + 0x6D2B79F5) | 0;
        let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },

    range(min, max) {
        return min + this.random() * (max - min);
    },

    int(min, max) {
        return Math.floor(this.range(min, max + 1));
    },

    chance(p) {
        return this.random() < p;
    },

    pick(list) {
        if (!list || list.length === 0) return null;
        return list[Math.floor(this.random() * list.length)];
    }
};

RNG.init(RNG.seed);
