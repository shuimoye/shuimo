/**
 * NPC离线行为系统模块
 * 处理NPC在非对话时的自主行为动画
 */

const OfflineBehaviorSystem = {
    activeEffects: [],
    
    init() {},
    
    update(dt) {
        // 更新活跃效果
        this.activeEffects = this.activeEffects.filter(effect => {
            effect.timeLeft -= dt;
            effect.progress = 1 - (effect.timeLeft / effect.duration);
            
            // 更新粒子位置
            if (effect.particles) {
                effect.particles.forEach(p => {
                    p.x += p.vx * dt;
                    p.y += p.vy * dt;
                    p.vy += 20 * dt; // 重力
                });
            }
            
            return effect.timeLeft > 0;
        });
        
        // 随机触发新行为（每10-20秒）
        if (RNG.random() < dt * 0.06) {
            this.triggerRandomBehavior();
        }
    },
    
    triggerRandomBehavior() {
        const npcs = GameState.npcs.filter(n => !n.isMonster && n.persona);
        if (npcs.length === 0) return;
        
        const npc = npcs[Math.floor(RNG.random() * npcs.length)];
        const persona = DialogSystem.getPersona(npc);
        if (!persona || !persona.offlineEvents || persona.offlineEvents.length === 0) return;
        
        // 选择一个未使用的事件
        const availableEvents = persona.offlineEvents.filter(e => !npc.usedEvents?.includes(e.text));
        if (availableEvents.length === 0) return;
        
        const event = availableEvents[Math.floor(RNG.random() * availableEvents.length)];
        
        // 标记为已使用（循环使用）
        if (!npc.usedEvents) npc.usedEvents = [];
        npc.usedEvents.push(event.text);
        if (npc.usedEvents.length > 5) npc.usedEvents.shift();
        
        // 开始行为动画
        this.startBehavior(npc, event);
    },
    
    startBehavior(npc, event) {
        // 粒子以世界坐标记录，渲染时再转换，避免镜头移动导致粒子错位
        const particles = [];
        for (let i = 0; i < 15; i++) {
            particles.push({
                x: npc.x + (RNG.random() - 0.5) * 60,
                y: npc.y + (RNG.random() - 0.5) * 40,
                vx: (RNG.random() - 0.5) * 50,
                vy: -RNG.random() * 30 - 10,
                color: event.particle,
                size: 3 + RNG.random() * 4,
                life: 1.5 + RNG.random() * 0.5
            });
        }
        
        this.activeEffects.push({
            npcId: npc.id,
            npcName: npc.name,
            text: event.text,
            particleColor: event.particle,
            duration: event.duration,
            timeLeft: event.duration,
            progress: 0,
            particles: particles,
            type: 'offline_behavior'
        });
        
        // 添加到世界日志
        WorldLogSystem.addLog(`${npc.name}: ${event.text}`, 'behavior');
    },
    
    render(ctx) {
        this.activeEffects.forEach(effect => {
            const npc = GameState.npcs.find(n => n.id === effect.npcId);
            if (!npc) return;
            
            const pos = Renderer.worldToScreen(npc.x, npc.y);
            
            // 绘制粒子
            effect.particles.forEach(p => {
                const sp = Renderer.worldToScreen(p.x, p.y);
                ctx.beginPath();
                ctx.arc(sp.x, sp.y, p.size * (1 - effect.progress * 0.5) * Renderer.camera.zoom, 0, Math.PI * 2);
                ctx.fillStyle = effect.particleColor;
                ctx.globalAlpha = 0.6 * (1 - effect.progress);
                ctx.fill();
                ctx.globalAlpha = 1;
            });
            
            // 绘制行为文本（悬浮在NPC上方）
            const offsetY = -40 - Math.sin(effect.progress * Math.PI) * 20;
            const alpha = effect.timeLeft > 2 ? 1 : effect.timeLeft / 2;
            
            ctx.font = '12px "Noto Serif SC", serif';
            ctx.textAlign = 'center';
            ctx.fillStyle = effect.particleColor;
            ctx.globalAlpha = alpha * 0.9;
            
            // 文本背景
            const textWidth = ctx.measureText(effect.text).width;
            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            ctx.fillRect(pos.x - textWidth / 2 - 5, pos.y + offsetY - 12, textWidth + 10, 20);
            
            // 文本内容
            ctx.fillStyle = effect.particleColor;
            ctx.fillText(effect.text, pos.x, pos.y + offsetY);
            
            ctx.globalAlpha = 1;
        });
    },
    
    // 清除所有效果
    clear() {
        this.activeEffects = [];
    }
};
