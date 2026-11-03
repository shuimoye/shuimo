/**
 * 游戏状态管理模块 - 二级节点
 * 管理所有游戏数据和状态
 */

const GameState = {
    time: 0, gameTime: 0, dayTime: 0, day: 1,
    player: null, npcs: [], buildings: [], resources: [], droppedItems: [], particles: [], projectiles: [], decorations: [], spiritualAreas: [],
    respawnQueue: [], npcTemplates: [],
    mouseX: 0, mouseY: 0,
    
    init() {
        this.createPlayer(); this.createWorld(); this.createNPCs(); this.createResources();
        GameData.init();
    },
    
    createPlayer() {
        this.player = {
            id: 0, name: '逍遥子', x: 1500, y: 1000, size: 20, body: null,
            health: 100, maxHealth: 100, mana: 100, maxMana: 100, stamina: 100, maxStamina: 100,
            immunity: 100, maxImmunity: 100, hunger: 100, maxHunger: 100,
            spiritualPower: 50, maxSpiritualPower: 100, cultivation: 0, cultivationLevel: 1, cultivationRealm: '练气一层', cultivationSpeed: 1,
            attack: 10, defense: 5, attackSpeed: 1, attackRange: 80,
            faction: null, factionRank: 0,
            moveUp: false, moveDown: false, moveLeft: false, moveRight: false, speed: 8, baseSpeed: 8, velocityX: 0, velocityY: 0,
            inventory: new Array(20).fill(null), inventorySize: 20, gold: 100,
            skills: [], techniques: [], effects: [], isPlayer: true
        };
        this.player.body = Core.createCircle(this.player.x, this.player.y, this.player.size, { 
            label: 'player', frictionAir: 0.1, friction: 0.05, restitution: 0.1,
            collisionFilter: { category: 0x0001, mask: 0xFFFFFFFF }
        });
        this.player.body.entity = this.player;
        Core.addBody(this.player.body);
        this.addItem(this.player, { id: 'herb', name: '灵草', icon: '🌿', type: 'material', count: 5, description: '炼丹材料' });
        this.addItem(this.player, { id: 'raw_meat', name: '生肉', icon: '🍖', type: 'food', count: 3, description: '生肉，直接吃容易生病', isRaw: true });
    },
    
    createWorld() {
        this.spiritualAreas = [
            { x: 500, y: 500, radius: 300, level: 3, name: '灵泉眼' },
            { x: 2000, y: 800, radius: 250, level: 4, name: '仙山福地' },
            { x: 2500, y: 1500, radius: 200, level: 5, name: '仙灵洞天' },
            { x: 800, y: 1500, radius: 350, level: 2, name: '灵脉' },
            { x: 1800, y: 300, radius: 150, level: 2, name: '灵穴' }
        ];
        for (let i = 0; i < 200; i++) {
            const types = ['grass', 'flower', 'bush'];
            this.decorations.push({ x: RNG.random() * 3000, y: RNG.random() * 2000, type: types[Math.floor(RNG.random() * types.length)] });
        }
        [{ x: 500, y: 1800, w: 400, h: 30 }, { x: 1200, y: 1600, w: 300, h: 30 }, { x: 2000, y: 1700, w: 350, h: 30 }, { x: 2600, y: 1500, w: 250, h: 30 }]
            .forEach(p => Core.addBody(Core.createStatic(p.x, p.y, p.w, p.h, 'platform')));
    },
    
    createNPCs() {
        const templates = [
            { name: '陆沉舟', x: 600, y: 600, type: 'elder', faction: '大衍门', persona: 'dutiful_secret_investigator' },
            { name: '苏晚棠', x: 1000, y: 900, type: 'herbalist', faction: '丹房', persona: 'grateful_spirits_alchemist' },
            { name: '谢无锋', x: 1400, y: 700, type: 'blacksmith', faction: null, persona: 'silent_blade_smith' },
            { name: '白琉璃', x: 1800, y: 1000, type: 'healer', faction: '医谷', persona: 'compassionate_medic' },
            { name: '楚惊蛰', x: 2200, y: 800, type: 'disciple', faction: '天象阁', persona: 'star_reader_amnesiac' },
            { name: '柳三娘', x: 1600, y: 1200, type: 'merchant', faction: null, persona: 'smiling_informant' },
            { name: '段无尘', x: 800, y: 1400, type: 'wanderer', faction: null, persona: 'blind_formations_master' },
            { name: '花间客', x: 2000, y: 600, type: 'leader', faction: null, persona: 'immortal_wanderer' }
        ];
        this.npcTemplates = templates;
        templates.forEach((t, i) => {
            const npc = this.createEntity(t.name, t.x, t.y, t.type, t.faction, i + 1, false);
            npc.persona = t.persona;
            npc.templateId = i + 1;
            this.npcs.push(npc);
        });
        // 创建怪物
        for (let i = 0; i < 5; i++) {
            const monster = this.createEntity(`妖兽${i+1}`, 500 + RNG.random() * 2000, 500 + RNG.random() * 1000, 'monster', null, 100 + i, true);
            monster.templateId = 100 + i;
            this.npcs.push(monster);
        }
    },
    
    // 死亡后回到小镇：NPC 在出生点重聚，妖兽在边缘重生
    scheduleRespawn(entity) {
        const delay = entity.isMonster ? 25 : 60;
        this.respawnQueue.push({
            at: this.gameTime + delay,
            name: entity.name,
            type: entity.type,
            faction: entity.factionName,
            persona: entity.persona,
            templateId: entity.templateId,
            isMonster: !!entity.isMonster
        });
    },
    
    processRespawns() {
        if (!this.respawnQueue || this.respawnQueue.length === 0) return;
        const due = this.respawnQueue.filter(r => r.at <= this.gameTime);
        if (due.length === 0) return;
        this.respawnQueue = this.respawnQueue.filter(r => r.at > this.gameTime);
        
        due.forEach(r => {
            let x, y;
            if (r.isMonster) {
                x = 200 + RNG.random() * 2600;
                y = 200 + RNG.random() * 1600;
            } else {
                const template = (this.npcTemplates || []).find(t => t.name === r.name);
                x = template ? template.x : 1500;
                y = template ? template.y : 1000;
            }
            const entity = this.createEntity(r.name, x, y, r.type, r.faction, r.templateId, r.isMonster);
            entity.persona = r.persona || null;
            entity.templateId = r.templateId;
            this.npcs.push(entity);
            WorldLogSystem.addLog(r.isMonster ? `${r.name} 在荒野中重现` : `${r.name} 回到了小镇`, 'important');
        });
    },
    
    createEntity(name, x, y, type, factionName, id, isMonster) {
        const baseHealth = isMonster ? 80 : 100;
        const baseAttack = isMonster ? 15 : (type === 'leader' ? 30 : (type === 'elder' ? 25 : 15));
        const entity = {
            id, name, x, y, size: isMonster ? 22 : 18, type, isNPC: !isMonster, isMonster,
            health: baseHealth, maxHealth: baseHealth, mana: 100, maxMana: 100, stamina: 100, maxStamina: 100,
            immunity: 100, maxImmunity: 100, hunger: 100, maxHunger: 100,
            spiritualPower: 50, maxSpiritualPower: 100, cultivation: isMonster ? 50 : RNG.random() * 200,
            cultivationLevel: 1, cultivationRealm: '练气一层', cultivationSpeed: 1,
            attack: baseAttack, defense: isMonster ? 8 : 10, attackSpeed: 1, attackRange: 80,
            factionName, faction: factionName ? { name: factionName, color: this.getFactionColor(factionName) } : null,
            relationship: Math.floor(RNG.random() * 201) - 100,
            friendship: 0, dialogHistory: [], isQuestGiver: type === 'elder' || type === 'leader',
            quests: [], state: 'idle', targetX: x, targetY: y, stateTimer: 0,
            // NPC功能属性
            npcAction: null, actionTimer: 0, hasFaction: !!factionName, contribution: 0,
            inventory: new Array(20).fill(null), gold: Math.floor(RNG.random() * 50),
            skills: [], techniques: ['basic_meditation'], effects: [],
            body: null, skinColor: isMonster ? '#8b4513' : (type === 'elder' ? '#d0b090' : '#e0c0a0'),
            // 社交关系：复生实体同样需要初始化，避免运行时中断
            socialRelations: {}, socialTimer: 0,
            // 人格数据
            persona: null, emotionalBaseline: 50, speechPattern: {}, secrets: [], offlineEvents: []
        };
        entity.body = Core.createCircle(x, y, entity.size, { 
            label: `${isMonster ? 'monster' : 'npc'}_${id}`, 
            frictionAir: 0.1, friction: 0.05, restitution: 0.1,
            collisionFilter: { category: 0x0002, mask: 0xFFFFFFFF }
        });
        entity.body.entity = entity;
        Core.addBody(entity.body);
        return entity;
    },
    
    getFactionColor(name) {
        const colors = { '青云门': '#4a90d9', '药王谷': '#4aba6a', '天音宗': '#ba4ad9', '万剑宗': '#d9ba4a' };
        return colors[name] || '#8a8aaa';
    },
    
    createResources() {
        for (let i = 0; i < 30; i++) this.addResource({ id: `tree_${i}`, type: 'tree', x: 200 + RNG.random() * 2600, y: 300 + RNG.random() * 1600, size: 30 + RNG.random() * 20, amount: 5 + Math.floor(RNG.random() * 10), maxAmount: 15, respawnTime: 0 });
        for (let i = 0; i < 20; i++) this.addResource({ id: `rock_${i}`, type: 'rock', x: RNG.random() * 2900, y: RNG.random() * 1900, size: 25 + RNG.random() * 15, amount: 3 + Math.floor(RNG.random() * 7), maxAmount: 10, respawnTime: 0 });
        for (let i = 0; i < 25; i++) this.addResource({ id: `herb_${i}`, type: 'herb', x: RNG.random() * 2900, y: RNG.random() * 1900, size: 15, amount: 1 + Math.floor(RNG.random() * 3), maxAmount: 4, respawnTime: 0 });
        for (let i = 0; i < 10; i++) {
            const area = this.spiritualAreas[Math.floor(RNG.random() * this.spiritualAreas.length)];
            this.addResource({ id: `spirit_stone_${i}`, type: 'spirit_stone', x: area.x + (RNG.random() - 0.5) * area.radius, y: area.y + (RNG.random() - 0.5) * area.radius, size: 12, amount: 1 + Math.floor(RNG.random() * 2), maxAmount: 3, respawnTime: 0 });
        }
        for (let i = 0; i < 5; i++) this.addResource({ id: `water_${i}`, type: 'water', x: 300 + i * 600, y: 1700 + RNG.random() * 200, size: 50, amount: 100, maxAmount: 100, respawnTime: 0 });
    },
    
    addResource(resource) {
        const body = Matter.Bodies.circle(resource.x, resource.y, Math.max(resource.size * 0.8, 12), {
            isStatic: true,
            isSensor: true,
            label: `resource_${resource.id}`,
            collisionFilter: { category: 0x0004, mask: 0x0001 | 0x0002 }
        });
        body.resource = resource;
        resource.body = body;
        this.resources.push(resource);
        Core.addBody(body);
        return resource;
    },
    
    update(dt) {
        this.time += dt * 1000; this.gameTime += dt; this.dayTime = (this.dayTime + dt * 10) % 86400;
        if (this.dayTime < dt * 10) this.day++;
        this.updatePlayer(dt); this.updateNPCs(dt); this.updateParticles(dt); this.updateDroppedItems(dt); this.updateProjectiles(dt);
        this.processRespawns();
    },
    
    updatePlayer(dt) {
        const p = this.player;
        const MOVE_SPEED = 8;
        let vx = 0, vy = 0;
        if (p.moveUp) vy -= 1; if (p.moveDown) vy += 1; if (p.moveLeft) vx -= 1; if (p.moveRight) vx += 1;
        const len = Math.hypot(vx, vy);
        if (len > 0) { vx /= len; vy /= len; }
        // 使用物理速度移动，碰撞会被自动处理
        p.velocityX = vx * MOVE_SPEED;
        p.velocityY = vy * MOVE_SPEED;
        if (p.body) {
            Core.setVelocity(p.body, { x: p.velocityX, y: p.velocityY });
            p.x = p.body.position.x; p.y = p.body.position.y;
        }
        p.x = Math.max(50, Math.min(2950, p.x)); p.y = Math.max(50, Math.min(1950, p.y));
        if (len > 0) p.stamina = Math.max(0, p.stamina - dt); else p.stamina = Math.min(p.maxStamina, p.stamina + dt * 5);
        const spiritualBonus = SpiritualSystem.getSpiritualLevel(p.x, p.y);
        p.spiritualPower = Math.min(p.maxSpiritualPower, p.spiritualPower + dt * spiritualBonus.bonus);
        p.mana = Math.min(p.maxMana, p.mana + dt * 2);
        p.hunger = Math.max(0, p.hunger - dt * 0.5);
        if (p.hunger <= 0) p.health = Math.max(0, p.health - dt * 2);
        this.updateEffects(p, dt);
    },
    
    updateNPCs(dt) {
        this.npcs.forEach(npc => {
            if (npc.body) { npc.x = npc.body.position.x; npc.y = npc.body.position.y; }
            npc.mana = Math.min(npc.maxMana || 100, (npc.mana || 100) + dt * 1.5);
            npc.stamina = Math.min(npc.maxStamina || 100, (npc.stamina || 100) + dt * 3);
            if (!npc.isMonster) npc.hunger = Math.max(0, (npc.hunger || 100) - dt * 0.3);
            npc.stateTimer -= dt;
            // NPC行为系统：由需求驱动选目标，接触时由碰撞系统产生事件
            npc.actionTimer = (npc.actionTimer || 0) - dt;
            npc.goalTimer = (npc.goalTimer || 0) - dt;
            if (!npc.isMonster && npc.goalTimer <= 0) this.updateNPCGoal(npc);
            if (npc.state === 'walking' || npc.state === 'chasing') {
                const speed = this.getMoveSpeed(npc);
                const dx = npc.targetX - npc.x, dy = npc.targetY - npc.y, dist = Math.hypot(dx, dy);
                if (dist > 5) {
                    if (npc.body) Core.setVelocity(npc.body, { x: (dx / dist) * speed, y: (dy / dist) * speed });
                }
                else { npc.state = 'idle'; if (npc.body) Core.setVelocity(npc.body, { x: 0, y: 0 }); }
            }
            if (!npc.isMonster) SocialSystem.updateNPCSocial(npc, dt);
            if (npc.isMonster) this.updateMonsterGoal(npc);
        });
    },
    
    // 逃跑的 NPC 明显快于妖兽，追击的妖兽略快于普通 NPC，形成可持续的循环
    getMoveSpeed(npc) {
        const base = npc.isMonster ? 3.6 : 4;
        if (npc.npcAction === 'flee') return 5.2;
        if (npc.npcAction === 'fight') return base * 0.9;
        return base;
    },
    
    // 需求驱动的目标选择：按生存压力与人格偏好挑最近的合适目标
    updateNPCGoal(npc) {
        npc.goalTimer = 4 + RNG.range(0, 4);
        const goals = [];

        // 0. 威胁规避：附近有妖兽时逃跑或反击，避免小镇被逐渐清空
        const threat = this.findNearestNPC(npc, 260, n => n.isMonster);
        if (threat) {
            const dist = Math.hypot(threat.x - npc.x, threat.y - npc.y);
            if (npc.health > npc.maxHealth * 0.6 && npc.attack >= 20) {
                npc.npcAction = 'fight';
                npc.state = 'chasing';
                npc.targetX = threat.x;
                npc.targetY = threat.y;
            } else {
                const dx = npc.x - threat.x, dy = npc.y - threat.y;
                const len = Math.hypot(dx, dy) || 1;
                npc.npcAction = 'flee';
                npc.state = 'walking';
                npc.targetX = Math.max(100, Math.min(2900, npc.x + (dx / len) * 400));
                npc.targetY = Math.max(100, Math.min(1900, npc.y + (dy / len) * 400));
                npc.goalTimer = 1.5;
            }
            return;
        }

        // 1. 生存优先：饥饿或低血去采集/接近火源
        if (npc.hunger < 45) goals.push({ type: 'resource', weight: 6, filter: r => r.type === 'herb' || r.type === 'water' });
        if (npc.health < npc.maxHealth * 0.5) goals.push({ type: 'rest', weight: 8 });

        // 2. 人格偏好：关键词决定偏好的资源或对象
        const persona = DialogSystem.getPersona(npc);
        if (persona) {
            const preference = this.getPersonaResourcePreference(persona);
            if (preference) goals.push({ type: 'resource', weight: 4, filter: r => r.type === preference });
            if (persona.keywords.some(k => k.includes('情') || k.includes('商'))) {
                goals.push({ type: 'social', weight: 4 });
            }
        }

        // 3. 修炼：灵力高就往灵力区域走
        const spiritual = SpiritualSystem.getSpiritualLevel(npc.x, npc.y);
        if (spiritual.bonus < 1.5) goals.push({ type: 'spiritual', weight: 3 });

        // 4. 采资源的一般需求
        goals.push({ type: 'resource', weight: 2, filter: r => r.amount > 0 });

        // 5. 随机闲逛作为兜底
        goals.push({ type: 'wander', weight: 1 });

        const total = goals.reduce((sum, g) => sum + g.weight, 0);
        let roll = RNG.range(0, total);
        let chosen = goals[goals.length - 1];
        for (const goal of goals) {
            roll -= goal.weight;
            if (roll <= 0) { chosen = goal; break; }
        }

        switch (chosen.type) {
            case 'resource': {
                const target = this.findNearestResource(npc, chosen.filter);
                if (target) {
                    npc.npcAction = 'gather';
                    npc.state = 'walking';
                    npc.targetX = target.x;
                    npc.targetY = target.y;
                    return;
                }
                break;
            }
            case 'social': {
                const target = this.findNearestNPC(npc, 900);
                if (target) {
                    npc.npcAction = 'social';
                    npc.state = 'walking';
                    npc.targetX = target.x;
                    npc.targetY = target.y;
                    return;
                }
                break;
            }
            case 'spiritual': {
                const area = this.findBestSpiritualArea(npc);
                if (area) {
                    npc.npcAction = 'cultivate';
                    npc.state = 'walking';
                    npc.targetX = area.x + RNG.range(-area.radius * 0.4, area.radius * 0.4);
                    npc.targetY = area.y + RNG.range(-area.radius * 0.4, area.radius * 0.4);
                    return;
                }
                break;
            }
            case 'rest': {
                const fire = BuildingSystem.getNearbyFireSource(npc.x, npc.y);
                if (fire) {
                    npc.npcAction = 'rest';
                    npc.state = 'walking';
                    npc.targetX = fire.x;
                    npc.targetY = fire.y;
                    return;
                }
                npc.npcAction = 'rest';
                npc.health = Math.min(npc.maxHealth, npc.health + 6);
                return;
            }
            default: {
                npc.npcAction = 'wander';
                npc.state = 'walking';
                npc.targetX = Math.max(100, Math.min(2900, npc.x + RNG.range(-400, 400)));
                npc.targetY = Math.max(100, Math.min(1900, npc.y + RNG.range(-400, 400)));
                return;
            }
        }
    },
    
    getPersonaResourcePreference(persona) {
        const keywords = persona.keywords.join(' ');
        if (/剑|铁|石/.test(keywords)) return 'rock';
        if (/药|草|丹/.test(keywords)) return 'herb';
        if (/星|阵|灵/.test(keywords)) return 'spirit_stone';
        if (/酒|水/.test(keywords)) return 'water';
        if (/木|杂务/.test(keywords)) return 'tree';
        return null;
    },
    
    findNearestResource(npc, filter) {
        let best = null, bestDist = Infinity;
        for (const res of this.resources) {
            if (res.amount <= 0) continue;
            if (filter && !filter(res)) continue;
            const dist = Math.hypot(res.x - npc.x, res.y - npc.y);
            if (dist < bestDist) { bestDist = dist; best = res; }
        }
        return best;
    },
    
    findNearestNPC(npc, maxDist, predicate) {
        let best = null, bestDist = maxDist;
        for (const other of this.npcs) {
            if (other === npc) continue;
            if (predicate) {
                if (!predicate(other)) continue;
            } else if (!other.isNPC) continue;
            const dist = Math.hypot(other.x - npc.x, other.y - npc.y);
            if (dist < bestDist) { bestDist = dist; best = other; }
        }
        return best;
    },
    
    findBestSpiritualArea(npc) {
        let best = null, bestScore = -Infinity;
        for (const area of this.spiritualAreas) {
            const dist = Math.hypot(area.x - npc.x, area.y - npc.y);
            const score = area.level * 100 - dist * 0.05;
            if (score > bestScore) { bestScore = score; best = area; }
        }
        return best;
    },
    
    updateMonsterGoal(npc) {
        // 妖兽只在有限感知范围内追踪，超出后返回徘徊，避免全图追杀
        npc.monsterTimer = (npc.monsterTimer || 0) - 0.016;
        const nearby = this.findNearestNPC(npc, 420);
        const target = nearby || (Math.hypot(this.player.x - npc.x, this.player.y - npc.y) < 300 ? this.player : null);
        if (!target) {
            if (npc.state === 'chasing') {
                npc.state = 'walking';
                npc.targetX = Math.max(100, Math.min(2900, npc.x + RNG.range(-300, 300)));
                npc.targetY = Math.max(100, Math.min(1900, npc.y + RNG.range(-300, 300)));
            }
            return;
        }
        const dist = Math.hypot(target.x - npc.x, target.y - npc.y);
        if (dist < 420) {
            npc.state = 'chasing';
            npc.targetX = target.x;
            npc.targetY = target.y;
        }
    },
    
    updateEffects(entity, dt) {
        entity.effects = entity.effects.filter(e => {
            e.duration -= dt;
            if (e.type === 'poison') entity.health -= e.power * dt;
            if (e.type === 'heal') entity.health = Math.min(entity.maxHealth, entity.health + e.power * dt);
            // boost_speed不再修改速度，改为显示特效
            if (e.type === 'immune_boost') entity.immunity = Math.min(entity.maxImmunity, entity.immunity + e.power * dt);
            return e.duration > 0;
        });
    },
    
    updateParticles(dt) { this.particles = this.particles.filter(p => { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 0.5; return p.life > 0; }); },
    updateDroppedItems(dt) { this.droppedItems.forEach(item => item.lifetime -= dt); this.droppedItems = this.droppedItems.filter(item => item.lifetime > 0); },
    updateProjectiles(dt) {
        this.projectiles = this.projectiles.filter(proj => {
            proj.x += proj.vx; proj.y += proj.vy;
            proj.traveled += Math.hypot(proj.vx, proj.vy);
            // 检查碰撞
            for (const npc of this.npcs) {
                if (npc === proj.owner) continue;
                const dist = Math.hypot(npc.x - proj.x, npc.y - proj.y);
                if (dist < npc.size + proj.size) {
                    const dmg = CombatSystem.calculateDamage(proj.owner.attack * proj.power, npc.defense);
                    CombatSystem.dealDamage(npc, dmg, proj.owner);
                    GameState.addParticle(npc.x, npc.y, proj.color, 12);
                    CombatSystem.showDamage(npc.x, npc.y - 30, dmg, proj.color);
                    return false; // 命中后消失
                }
            }
            // 超出范围消失
            return proj.traveled < proj.range;
        });
    },
    
    addItem(entity, item) {
        const existing = entity.inventory.find(i => i && i.id === item.id);
        if (existing) { existing.count += item.count; return true; }
        const emptySlot = entity.inventory.findIndex(slot => !slot);
        if (emptySlot !== -1) { entity.inventory[emptySlot] = { ...item }; return true; }
        return false;
    },
    
    removeItem(entity, itemId, count = 1) {
        const slot = entity.inventory.findIndex(i => i && i.id === itemId);
        if (slot === -1) return false;
        entity.inventory[slot].count -= count;
        if (entity.inventory[slot].count <= 0) entity.inventory[slot] = null;
        return true;
    },
    
    hasItem(entity, itemId, count = 1) { const item = entity.inventory.find(i => i && i.id === itemId); return item && item.count >= count; },
    getItemCount(entity, itemId) { const item = entity.inventory.find(i => i && i.id === itemId); return item ? item.count : 0; },
    addParticle(x, y, color, count = 10) { for (let i = 0; i < count; i++) this.particles.push({ x, y, vx: (RNG.random() - 0.5) * 100, vy: (RNG.random() - 0.5) * 100, color, size: 2 + RNG.random() * 3, life: 0.5 + RNG.random() * 0.5 }); },
    dropItem(x, y, item) { this.droppedItems.push({ ...item, x: x + (RNG.random() - 0.5) * 20, y: y + (RNG.random() - 0.5) * 20, lifetime: 60 }); }
};

// 游戏数据定义
const GameData = {
    realms: [
        { name: '练气一层', minCultivation: 0, bonus: 1 }, { name: '练气二层', minCultivation: 100, bonus: 1.2 },
        { name: '练气三层', minCultivation: 300, bonus: 1.4 }, { name: '筑基初期', minCultivation: 600, bonus: 2 },
        { name: '筑基中期', minCultivation: 1200, bonus: 2.5 }, { name: '筑基后期', minCultivation: 2000, bonus: 3 },
        { name: '金丹初期', minCultivation: 4000, bonus: 4 }, { name: '金丹中期', minCultivation: 8000, bonus: 5 },
        { name: '金丹后期', minCultivation: 15000, bonus: 6 }, { name: '元婴初期', minCultivation: 30000, bonus: 8 }
    ],
    techniques: [
        // 基础功法
        { id: 'basic_meditation', name: '基础吐纳术', type: 'basic', power: 1, description: '最基础的修炼功法', icon: '🧘' },
        { id: 'cloud_steps', name: '云步', type: 'movement', power: 1.5, description: '轻功，提升移动速度', icon: '☁️' },
        // 青云门功法 - 雷系
        { id: 'qingyun_thunder', name: '青云雷法', type: 'combat', power: 2, manaCost: 20, range: 200, speed: 8, color: '#88aaff', faction: '青云门', description: '释放雷电攻击前方敌人', icon: '⚡', effect: 'lightning' },
        { id: 'qingyun_storm', name: '雷暴术', type: 'combat', power: 3, manaCost: 35, range: 250, speed: 10, color: '#6688ff', faction: '青云门', description: '召唤雷暴范围攻击', icon: '🌩️', effect: 'storm', unlockContribution: 100 },
        { id: 'qingyun_shield', name: '雷光护盾', type: 'defense', power: 2, manaCost: 25, duration: 5, faction: '青云门', description: '召唤雷电护盾抵挡伤害', icon: '🛡️', effect: 'shield', unlockContribution: 200 },
        { id: 'qingyun_chain', name: '连锁闪电', type: 'combat', power: 2.5, manaCost: 40, range: 180, chains: 3, color: '#aaccff', faction: '青云门', description: '闪电链弹射多个目标', icon: '⚡', effect: 'chain', unlockContribution: 350 },
        { id: 'qingyun_teleport', name: '雷遁术', type: 'movement', power: 2, manaCost: 30, range: 300, faction: '青云门', description: '瞬间瞬移到鼠标位置', icon: '💨', effect: 'teleport', unlockContribution: 500 },
        { id: 'qingyun_ultimate', name: '天雷寂灭', type: 'combat', power: 5, manaCost: 80, range: 350, speed: 15, color: '#ffffff', faction: '青云门', description: '最强雷法，毁天灭地', icon: '💥', effect: 'ultimate_lightning', unlockContribution: 800 },
        // 药王谷功法 - 治疗/毒系
        { id: 'yaowang_heal', name: '回春术', type: 'healing', power: 2, manaCost: 15, healAmount: 40, color: '#88ff88', faction: '药王谷', description: '恢复自身生命值', icon: '💚', effect: 'heal' },
        { id: 'yaowang_poison', name: '毒雾术', type: 'combat', power: 1.5, manaCost: 25, range: 150, duration: 5, color: '#aa88aa', faction: '药王谷', description: '释放毒雾持续伤害', icon: '☠️', effect: 'poison', unlockContribution: 100 },
        { id: 'yaowang_cure', name: '清心咒', type: 'buff', power: 1, manaCost: 20, faction: '药王谷', description: '清除负面状态', icon: '✨', effect: 'purify', unlockContribution: 200 },
        { id: 'yaowang_pill', name: '丹药专精', type: 'passive', power: 1.5, faction: '药王谷', description: '提升丹药效果50%', icon: '💊', unlockContribution: 350 },
        { id: 'yaowang_area_heal', name: '群体回春', type: 'healing', power: 1.5, manaCost: 50, range: 200, healAmount: 30, color: '#aaffaa', faction: '药王谷', description: '范围内友方恢复生命', icon: '💖', effect: 'area_heal', unlockContribution: 500 },
        { id: 'yaowang_immortal', name: '不死金身', type: 'defense', power: 3, manaCost: 60, duration: 8, faction: '药王谷', description: '短时间内免疫死亡', icon: '🌟', effect: 'immortal', unlockContribution: 800 },
        // 天音宗功法 - 音波/控制
        { id: 'tianyin_wave', name: '音波功', type: 'combat', power: 1.8, manaCost: 18, range: 220, speed: 6, color: '#ffaaff', faction: '天音宗', description: '释放音波穿透攻击', icon: '🎵', effect: 'wave' },
        { id: 'tianyin_stun', name: '定魂音', type: 'control', power: 1, manaCost: 30, range: 180, duration: 2, color: '#dd88ff', faction: '天音宗', description: '眩晕敌人2秒', icon: '🔔', effect: 'stun', unlockContribution: 100 },
        { id: 'tianyin_barrier', name: '音障', type: 'defense', power: 1.5, manaCost: 25, duration: 6, faction: '天音宗', description: '音波屏障吸收伤害', icon: '🛡️', effect: 'sound_barrier', unlockContribution: 200 },
        { id: 'tianyin_resonance', name: '共鸣术', type: 'combat', power: 2.5, manaCost: 45, range: 200, color: '#ffaadd', faction: '天音宗', description: '音波共振范围伤害', icon: '🎶', effect: 'resonance', unlockContribution: 350 },
        { id: 'tianyin_mana', name: '天音回灵', type: 'recovery', power: 2, manaCost: 0, manaRecover: 50, faction: '天音宗', description: '恢复法力值', icon: '💠', effect: 'mana_recover', unlockContribution: 500 },
        { id: 'tianyin_soul', name: '摄魂魔音', type: 'control', power: 3, manaCost: 70, range: 300, duration: 4, color: '#ff88ff', faction: '天音宗', description: '控制敌人4秒', icon: '👻', effect: 'dominate', unlockContribution: 800 },
        // 万剑宗功法 - 剑气
        { id: 'wanjian_blade', name: '剑气斩', type: 'combat', power: 2.2, manaCost: 20, range: 250, speed: 12, color: '#ffdd44', faction: '万剑宗', description: '发射剑气攻击', icon: '⚔️', effect: 'blade' },
        { id: 'wanjian_rain', name: '万剑归宗', type: 'combat', power: 2, manaCost: 40, range: 280, count: 8, color: '#ffcc44', faction: '万剑宗', description: '召唤剑雨范围攻击', icon: '🗡️', effect: 'blade_rain', unlockContribution: 100 },
        { id: 'wanjian_armor', name: '剑气护体', type: 'defense', power: 1.8, manaCost: 30, duration: 8, faction: '万剑宗', description: '剑气护体反弹伤害', icon: '🔰', effect: 'blade_armor', unlockContribution: 200 },
        { id: 'wanjian_dance', name: '剑舞', type: 'combat', power: 2.8, manaCost: 55, range: 150, hits: 5, color: '#ffaa44', faction: '万剑宗', description: '剑舞连续攻击', icon: '🌀', effect: 'blade_dance', unlockContribution: 350 },
        { id: 'wanjian_pierce', name: '破天一剑', type: 'combat', power: 3.5, manaCost: 60, range: 400, speed: 20, color: '#ffffff', faction: '万剑宗', description: '穿透性剑气直线攻击', icon: '➡️', effect: 'pierce', unlockContribution: 500 },
        { id: 'wanjian_god', name: '剑神降临', type: 'ultimate', power: 6, manaCost: 100, duration: 10, faction: '万剑宗', description: '化身剑神全属性翻倍', icon: '👑', effect: 'god_mode', unlockContribution: 800 },
        // 通用功法
        { id: 'healing_art', name: '基础疗伤', type: 'healing', power: 1.5, manaCost: 10, healAmount: 25, color: '#88ff88', description: '恢复少量生命', icon: '💚' },
        { id: 'spirit_gathering', name: '聚灵诀', type: 'cultivation', power: 2, description: '加速灵力吸收', icon: '🔮' }
    ],
    factions: [
        { id: 'qingyun', name: '青云门', color: '#4a90d9', bonus: { cultivation: 1.2, combat: 1.1 } },
        { id: 'yaowang', name: '药王谷', color: '#4aba6a', bonus: { healing: 1.3, crafting: 1.2 } },
        { id: 'tianyin', name: '天音宗', color: '#ba4ad9', bonus: { social: 1.3, mana: 1.2 } },
        { id: 'wanjian', name: '万剑宗', color: '#d9ba4a', bonus: { combat: 1.4, cultivation: 0.9 } }
    ],
    items: {
        herb: { id: 'herb', name: '灵草', icon: '🌿', type: 'material', description: '炼丹材料', value: 10 },
        raw_meat: { id: 'raw_meat', name: '生肉', icon: '🍖', type: 'food', description: '生肉，直接吃容易生病', value: 5, isRaw: true },
        cooked_meat: { id: 'cooked_meat', name: '熟肉', icon: '🍖', type: 'food', description: '熟肉，美味可口', value: 15, heal: 20, hunger: 30 },
        wood: { id: 'wood', name: '木材', icon: '🪵', type: 'material', description: '建造材料', value: 5 },
        stone: { id: 'stone', name: '石材', icon: '🪨', type: 'material', description: '建造材料', value: 8 },
        spirit_stone: { id: 'spirit_stone', name: '灵石', icon: '💎', type: 'currency', description: '修仙货币', value: 50 },
        pill_healing: { id: 'pill_healing', name: '疗伤丹', icon: '💊', type: 'medicine', description: '恢复50点生命', value: 30, heal: 50 },
        pill_cultivation: { id: 'pill_cultivation', name: '聚气丹', icon: '💊', type: 'medicine', description: '增加修炼点数', value: 100, cultivation: 20 }
    },
    buildings: [
        { id: 'house', name: '小屋', width: 80, height: 60, cost: { wood: 20, stone: 10 }, description: '简单的住所' },
        { id: 'campfire', name: '营火', width: 40, height: 20, cost: { wood: 5 }, description: '可以烹饪食物', isFireSource: true },
        { id: 'training_ground', name: '练功场', width: 120, height: 80, cost: { wood: 30, stone: 20 }, description: '提升修炼效率' },
        { id: 'alchemy_room', name: '炼丹房', width: 100, height: 70, cost: { wood: 25, stone: 30 }, description: '可以炼制丹药' },
        { id: 'spirit_array', name: '聚灵阵', width: 150, height: 150, cost: { spirit_stone: 10 }, description: '大幅提升灵力浓度' }
    ],
    init() {},
    getRealm(cultivation) { let realm = this.realms[0]; for (let r of this.realms) if (cultivation >= r.minCultivation) realm = r; return realm; }
};
