/**
 * 碰撞事件系统
 * 小镇的演化全部由物理接触触发：NPC 撞资源即采集，撞 NPC 即交往/交易，撞怪物即战斗
 */

const CollisionSystem = {
    // 同一对物体的事件节流，避免贴边反复触发
    cooldowns: new Map(),
    COOLDOWN: 6,

    init() {
        Core.on('collisionStart', (event) => this.handleCollisions(event));
        this.cooldowns.clear();
    },

    keyOf(a, b) {
        const x = a.id, y = b.id;
        return x < y ? `${x}|${y}` : `${y}|${x}`;
    },

    handleCollisions(event) {
        const pairs = event.pairs || [];
        for (const pair of pairs) {
            this.handlePair(pair.bodyA, pair.bodyB);
        }
        this.pruneCooldowns();
    },

    pruneCooldowns() {
        const now = GameState.gameTime;
        for (const [key, time] of this.cooldowns) {
            if (now - time > this.COOLDOWN * 4) this.cooldowns.delete(key);
        }
    },

    tryConsume(a, b) {
        const key = this.keyOf(a, b);
        const now = GameState.gameTime;
        const last = this.cooldowns.get(key);
        if (last !== undefined && now - last < this.COOLDOWN) return false;
        this.cooldowns.set(key, now);
        return true;
    },

    handlePair(bodyA, bodyB) {
        const entityA = bodyA.entity || bodyA.resource;
        const entityB = bodyB.entity || bodyB.resource;
        if (!entityA || !entityB) return;

        const pairs = [
            [entityA, entityB],
            [entityB, entityA]
        ];

        for (const [self, other] of pairs) {
            if (this.isActor(self) && this.isResource(other)) {
                if (this.tryConsume(self, other)) this.onActorResource(self, other);
            }
        }

        if (this.isActor(entityA) && this.isActor(entityB)) {
            if (this.tryConsume(entityA, entityB)) this.onActorActor(entityA, entityB);
        }
    },

    isActor(entity) {
        return entity && (entity.isPlayer || entity.isNPC || entity.isMonster);
    },

    isResource(entity) {
        return !!(entity && entity.body && entity.body.isSensor && typeof entity.amount === 'number');
    },

    onActorResource(actor, resource) {
        if (resource.amount <= 0) return;

        const item = ResourceSystem.getDropItem(resource.type);
        const amount = Math.min(resource.amount, 1);
        item.count = amount;

        if (GameState.addItem(actor, item)) {
            resource.amount -= amount;

            if (actor.isPlayer) {
                Game.showMessage(`获得 ${item.name} x${amount}`, 'success');
                GameState.addParticle(resource.x, resource.y, '#88ff88', 8);
            } else if (actor.isNPC) {
                actor.npcAction = 'gather';
                actor.actionTimer = 8 + RNG.range(0, 6);
                actor.cultivation = (actor.cultivation || 0) + 0.5;
                WorldLogSystem.addLog(`${actor.name} 采集了${item.name}`, 'normal');
            }

            if (resource.amount <= 0) {
                resource.respawnTime = ResourceSystem.getRespawnTime(resource.type);
                if (resource.body) {
                    Matter.Composite.remove(Core.world, resource.body);
                    resource.body = null;
                }
            }
        }
    },

    onActorActor(a, b) {
        const monsterPair = [[a, b], [b, a]].find(([x, y]) => x.isMonster && !y.isMonster);
        if (monsterPair) {
            this.onMonsterContact(monsterPair[0], monsterPair[1]);
            return;
        }

        const npcPair = [[a, b], [b, a]].find(([x, y]) => x.isNPC && y.isPlayer);
        if (npcPair) {
            this.onPlayerNPCCollision(npcPair[0], npcPair[1]);
            return;
        }

        if (a.isNPC && b.isNPC) this.onNPCSocialContact(a, b);
    },

    onMonsterContact(monster, target) {
        const dmg = CombatSystem.calculateDamage(monster.attack, target.defense || 0);
        CombatSystem.dealDamage(target, dmg, monster);
        CombatSystem.showDamage(target.x, target.y - 30, dmg, '#ff8888');
        GameState.addParticle(target.x, target.y, '#ff8888', 8);
        if (target.isPlayer) {
            Game.showMessage(`${monster.name} 扑了上来！`, 'danger');
        } else {
            WorldLogSystem.addLog(`${monster.name} 攻击了 ${target.name}`, 'danger');
            // 有战力的 NPC 会反击
            if (target.isNPC && target.npcAction === 'fight' && target.health > 0) {
                const counter = CombatSystem.calculateDamage(target.attack, monster.defense || 0);
                CombatSystem.dealDamage(monster, counter, target);
                CombatSystem.showDamage(monster.x, monster.y - 30, counter, '#ffdd44');
                WorldLogSystem.addLog(`${target.name} 反击 ${monster.name}`, 'important');
            }
        }
    },

    onPlayerNPCCollision(npc, player) {
        npc.relationship = Math.min(100, npc.relationship + 1);
        WorldLogSystem.addLog(`你与 ${npc.name} 擦肩而过`, 'normal');
    },

    onNPCSocialContact(a, b) {
        SocialSystem.socialize(a, b);
        const relation = a.socialRelations?.[b.id] ?? 0;
        if (relation >= 50) {
            WorldLogSystem.addLog(`${a.name} 与 ${b.name} 相谈甚欢`, 'normal');
        } else if (relation <= -30) {
            WorldLogSystem.addLog(`${a.name} 与 ${b.name} 起了争执`, 'important');
        } else {
            WorldLogSystem.addLog(`${a.name} 与 ${b.name} 点头致意`, 'normal');
        }
    }
};
