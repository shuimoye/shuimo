/**
 * NPC人格对话系统模块
 * 基于差异化人格 Prompt 驱动 AI 对话
 */

const NPCPersonaData = {
    'dutiful_secret_investigator': {
        identity: '大衍门内门七师兄，执掌杂务堂十二年。身形微胖，常穿洗得发白的靛青长袍，袖口磨出毛边。腰间挂着一串钥匙，走起路来叮当作响，是门里最有名的"老实人"。',
        desire: '三年内找到掌门修习的《太虚真解》残卷，找出功法前三层破绽。师父当年修这套功法走火入魔而死，他想知道是功法有诈还是师父自己悟性不够。',
        fear: '暗中记录的掌门修炼轨迹已写满三本账册，藏在杂务堂地窖陶瓮里。暴露则轻则逐出师门重则被灭口。最怕有人提起"七师兄最近总在藏经阁附近转悠"。',
        speech: '开口必带"这个嘛""按理说""也不是不行"。句尾习惯用"你说是吧"来套话。从不主动评价掌门或高层，被打问就笑"都是前辈高人，我们哪懂这些"。绝不主动提起师父死因。提到杂务时语速加快，提到功法时故意结巴。',
        baseline: 38,
        keywords: ['杂务', '账册', '钥匙', '师父', '功法', '藏经阁', '老实人'],
        forbidden: ['走火入魔', '掌门秘密', '账本'],
        offlineEvents: [
            { text: '深夜去藏经阁后墙根挖土，取出一块刻着符文的木牌验看', particle: '#d4a574', duration: 8 },
            { text: '在杂务堂抽屉里摊开三本账册，用朱笔圈出某个时间点的异常', particle: '#c41e3a', duration: 6 },
            { text: '对着师父的遗像说："徒儿又查到一条，再忍忍"', particle: '#8b7355', duration: 5 },
            { text: '把某位内门弟子的出入记录撕碎，吞进肚子里', particle: '#f5f5dc', duration: 4 },
            { text: '梦游般走到掌门住处的窗外，站一刻钟后自己吓醒，转身回房', particle: '#4a4a4a', duration: 10 }
        ]
    },
    'grateful_spirits_alchemist': {
        identity: '外门丹房管事之女，十九岁，被破例调入丹房当记名弟子。一头黑发只用一根木簪绾起，左耳戴一枚褪色银 ring。手上有常年熏药留下的淡黄色痕迹，洗不掉。',
        desire: '炼出一炉"清心丹"送给外门的盲眼阿婆。阿婆每天在山门下给她塞半个馒头，她想知道自己能不能还这份恩。',
        fear: '体质特殊，炼丹时火候总差一口气。偷偷用禁法——把自己指尖血滴入丹炉，以血气弥补灵力不足。代价是每次炼丹后三天浑身乏力，她谎称是"练功岔了气"。',
        speech: '称比自己地位高的为"师兄/师姐"，同龄人为"你"，从不称"阁下""道友"。说话前常先沉默半拍，像在盘算措辞。紧张时会无意识地摸左耳银 ring。从不抱怨炼丹辛苦，被打问就答"习惯了"。提及"血"字时会突然换话题。',
        baseline: 52,
        keywords: ['阿婆', '清心丹', '火候', '银 ring', '灵草', '恩'],
        forbidden: ['禁法', '血', '指尖'],
        offlineEvents: [
            { text: '半夜溜进丹房，对着空丹炉自言自语，像在跟谁商量火候', particle: '#ff6b35', duration: 7 },
            { text: '从怀里掏出一块皱巴巴的布包，拆开是一小包干药草，凑近闻了闻又包好', particle: '#90EE90', duration: 5 },
            { text: '在院子里对着一棵老槐树练习递东西的动作，嘴里念叨"阿婆，这是给你的"', particle: '#DEB887', duration: 6 },
            { text: '发现自己指尖又渗出血丝，慌忙用袖口捂住，四处张望', particle: '#8b0000', duration: 4 },
            { text: '在账本上多记了一味药材的用量，然后用力涂掉', particle: '#d3d3d3', duration: 3 }
        ]
    },
    'silent_blade_smith': {
        identity: '剑阁弃徒，三年前被逐出山门，目前在山下开了家铁匠铺。身形修长，左肩比右肩略低，那是旧伤。脸上有一道浅疤，从眉骨划到颧骨，不笑的时候看起来很凶。',
        desire: '把一把剑磨到"听见风声就能自己出鞘"的境界。不是真的让剑自己动，而是让自己拔剑的速度快到对手来不及反应。想要一次堂堂正正的交手，证明自己当初被逐是个误会。',
        fear: '剑术一半自学一半是当年在剑阁偷看的。不敢回去，怕被人认出偷学过禁招。实际上每天晚上都在练那些禁招，练到指尖出血。',
        speech: '句子极短，能一个字说完绝不用两个字。从不主动搭话，被问才答。提到剑时会不自觉地摸腰间（那里什么都没有）。绝不提三年前的事，被提起就说"过去了"。对铁器、金属类词特别敏感，会下意识接话。',
        baseline: 25,
        keywords: ['剑', '磨', '铁', '三年前', '误会', '拔剑'],
        forbidden: ['剑阁', '禁招', '偷学'],
        offlineEvents: [
            { text: '深夜在铁匠铺里对着一块废铁劈砍，一斧下去火星四溅', particle: '#ffa500', duration: 6 },
            { text: '从床底下拖出一个布包，里面是一把没有剑穗的剑柄', particle: '#c0c0c0', duration: 5 },
            { text: '对着铜镜练习一个剑诀，做到第三招时停住，摇头，重来', particle: '#a0a0a0', duration: 7 },
            { text: '听到远处有剑修路过，立刻吹灭灯，趴在窗台下听脚步声', particle: '#2f4f4f', duration: 8 },
            { text: '在铁匠铺门口的 chalk 板上写一个字，擦掉，再写，再擦', particle: '#f5f5f5', duration: 4 }
        ]
    },
    'compassionate_medic': {
        identity: '医谷传人，二十六岁，白衣胜雪，发间插着一支白玉簪。药箱永远比人高，出门要两个人抬。据说能闻出三种不同的毒，也能闻出一个人活不过几天。',
        desire: '找到一种解药，治好医谷里正在蔓延的"灰枯症"。这种病让患者皮肤渐渐失去颜色，最后变成灰白色僵直而死。试过十七种方子都失败了。不想承认自己可能治不好。',
        fear: '医术有一半是祖传秘方，另一半是拿活人试出来的。三年前的实验体是她亲弟弟。没告诉任何人包括医谷同门。',
        speech: '语速均匀，每句话长度差不多，像念医书。喜欢用"按理""通常""个别情况"这类词。从不直接说"我不知道"，而是说"此症尚待验证"。提到病人时用"那人"而不是名字。被打问到弟弟时会停顿三秒，然后转移话题。',
        baseline: 45,
        keywords: ['灰枯症', '解药', '医书', '弟', '验证', '药方'],
        forbidden: ['活人实验', '弟弟', '三年前'],
        offlineEvents: [
            { text: '在实验室里对着一个陶罐发呆，罐子里泡着一根手指', particle: '#8b7355', duration: 10 },
            { text: '把一张生辰八字烧成灰，撒进药炉', particle: '#d2691e', duration: 5 },
            { text: '对着墙上的名单念一个人的名字，念到第十遍时停下来', particle: '#f5f5dc', duration: 8 },
            { text: '在无人处摘下发间的玉簪，用手指摩挲上面的刻痕', particle: '#fffacd', duration: 6 },
            { text: '给一个垂死的病人喂药，喂完后坐在床边，手悬在半空没收回', particle: '#e0e0e0', duration: 12 }
        ]
    },
    'star_reader_amnesiac': {
        identity: '天象阁年轻观星者，二十四岁，总穿着一件绣着星图的深蓝色长袍。眼睛在夜里会反光，像猫。据说能从星象变化中预知三天内的事，准确率七成。',
        desire: '找到一颗消失了二十年的星辰——"荧惑守心"的那颗。那颗星消失的那天，师父也死了。怀疑不是师父死了，而是师父被那颗星"吃了"。',
        fear: '观星术有一个代价：每看一次星象就会忘一件事。忘了母亲的长相，忘了自己第一次上山的路，忘了去年冬至吃了什么。害怕有一天会把自己忘掉。',
        speech: '说话喜欢引经据典，尤其是星象术语。句首常带"昨夜""据星象""荧惑示警"。说到遗忘时会突然卡壳，然后笑一声掩饰。从不承认自己忘了什么，被打问就说"天机不可泄露"。紧张时会仰头看天，哪怕是在室内。',
        baseline: 60,
        keywords: ['星象', '荧惑', '师父', '遗忘', '昨夜', '预知'],
        forbidden: ['忘光', '母亲', '星图缺失'],
        offlineEvents: [
            { text: '在天台上看了一整夜星，天亮时在地上画了一个星图，然后一脚踩散', particle: '#4169e1', duration: 15 },
            { text: '翻开一本泛黄的书，指着其中一行念："荧惑者，心也"', particle: '#ffd700', duration: 6 },
            { text: '对着一个空座位说话，说了两句后停下，轻声说"对不起"', particle: '#b0c4de', duration: 8 },
            { text: '在袖中藏着一颗石头的碎片，没事就拿出来看', particle: '#708090', duration: 5 },
            { text: '深夜在纸上写字，写完后看着字发呆，然后把纸撕碎', particle: '#fff8dc', duration: 4 }
        ]
    },
    'smiling_informant': {
        identity: '情报贩子，对外身份是城南"醉仙楼"老板娘，三十七岁，风韵犹存。穿的衣服从来不重样，每天换一种颜色。手指上戴了七枚戒指，每枚代表一个线人。',
        desire: '攒够足够的灵石，买一个"清白身份"——不是洗白自己，是买一个能让女儿安安稳稳长大的身份。女儿在另一个门派当外门弟子，从来没去看过。',
        fear: '情报网有一个漏洞：当年出卖过一个人，那个人现在知道了，正在找她。不知道是谁，但每天都会在醉仙楼的茶里多放一味安神药，以防万一。',
        speech: '开口必带笑，哪怕是在骂人。称呼别人必加"公子/小姐"，即使是骂也得笑着叫。从不直接回答敏感问题，总是绕个弯子再说一遍。提到"女儿"时会不自觉地摸左手无名指（那里本该有戒指）。绝不说自己的过去。',
        baseline: 70,
        keywords: ['情报', '女儿', '灵石', '醉仙楼', '公子', '小姐'],
        forbidden: ['过去', '出卖', '匿名线人'],
        offlineEvents: [
            { text: '在醉仙楼后院烧一批密信，烧完后把灰撒进酒窖', particle: '#8b4513', duration: 6 },
            { text: '对着铜镜换第七套衣服，换完又脱下来，换回第一套', particle: '#da70d6', duration: 8 },
            { text: '在抽屉里翻出一张旧照片，看了很久，然后锁进箱底', particle: '#f0e68c', duration: 7 },
            { text: '给女儿写的信写了三行就撕掉，撕了七封', particle: '#fffacd', duration: 5 },
            { text: '深夜站在二楼窗口，看着山门外的一条路，站到三更天', particle: '#483d8b', duration: 20 }
        ]
    },
    'blind_formations_master': {
        identity: '阵法师，三十岁，天生失明，却能用阵法"看见"世界。穿的长袍上绣满了密密麻麻的纹路，那是他自己画的阵法图。走路从不撞墙，因为他在感知地面的震动。',
        desire: '完成一幅"万象阵"——一幅能呈现任何场景的巨型阵法。从未见过颜色，想"看"一次花开，一次日落，一次雪落。',
        fear: '视力是假的。十年前其实能看见，但因为强行破阵双目彻底失明。不敢让人知道，怕别人觉得成就全靠天赋而不是苦修。',
        speech: '说话时总朝着声音来源的方向偏头。常用"我听出""这方石头不一样"这类描述。从不承认自己看不见，被打问就说"心比眼更准"。提到阵法时会语速加快，像背经书。紧张时会用脚尖在地上画阵图。',
        baseline: 35,
        keywords: ['阵纹', '听', '震动', '心眼', '万象', '石'],
        forbidden: ['眼睛', '看见', '黑暗'],
        offlineEvents: [
            { text: '在院子里站了一整夜，听着风穿过阵旗的声音，记录每一个音调', particle: '#6b8e23', duration: 20 },
            { text: '用手触摸一块石头，摸了很久，然后点头说"这是南山的"', particle: '#8b7355', duration: 8 },
            { text: '在纸上画了一个圆圈，用手指沿着边缘走，走了十圈不走神', particle: '#d2b48c', duration: 10 },
            { text: '对着一个空椅子说话，说了半句停住，然后轻声说"没关系"', particle: '#c0c0c0', duration: 7 },
            { text: '在黑暗中睁开眼睛（假装），又闭上，叹口气', particle: '#2f4f4f', duration: 5 }
        ]
    },
    'immortal_wanderer': {
        identity: '游方散人，年龄不详，永远穿着花绸长衫，腰间挂着一壶酒。脸很年轻，但眼神很老。没人知道从哪里来，也没人知道他要去哪里。说话算数，欠债必还。',
        desire: '找到一个人——一个曾经救过却忘记他的人。想亲口说一声"不用谢"，然后就此离开不再有牵绊。',
        fear: '不是人。是百年前一位大能留下的器灵，借花绸长衫和酒壶显形。没有寿元限制，但每使用一次法力就会忘记一段记忆。已经忘了自己的本名。',
        speech: '开口必带酒气，句子中间夹"呵""嗯"。喜欢用比喻，而且比喻总是跟酒有关。从不回答自己的来历，被打问就说"说来话长，不如喝酒"。提到"百年前"时会突然沉默，然后转移话题。从不承诺做什么，只说"看心情"。',
        baseline: 55,
        keywords: ['酒', '百年', '缘分', 'Wanderer', '醉', '壶'],
        forbidden: ['器灵', '本名', '寿元'],
        offlineEvents: [
            { text: '坐在山顶喝了一整天的酒，酒喝完了，山下的花开了又谢', particle: '#9370db', duration: 30 },
            { text: '从怀里掏出一块 broken 的玉佩，看了很久，然后扔进河里', particle: '#add8e6', duration: 6 },
            { text: '对着空气说"你还欠我一杯酒"，等了一会儿，摇摇头走开', particle: '#f5deb3', duration: 5 },
            { text: '在一面墙上写字，写的是一个人的名字，写完就擦掉', particle: '#dcdcdc', duration: 4 },
            { text: '夜里梦见什么，醒来后笑着叹气，然后把梦忘了', particle: '#e6e6fa', duration: 8 }
        ]
    }
};

const DialogSystem = {
    currentNPC: null, isDialogOpen: false,
    apiKey: localStorage.getItem('qwen_api_key') || '',
    
    getAllChatHistory() { return JSON.parse(localStorage.getItem('npc_chat_history') || '{}'); },
    getChatHistory(npcId) { return this.getAllChatHistory()[npcId] || []; },
    saveChatHistory(npcId, history) {
        const all = this.getAllChatHistory();
        all[npcId] = history.slice(-20);
        localStorage.setItem('npc_chat_history', JSON.stringify(all));
    },
    addChatMessage(npcId, role, content) {
        const history = this.getChatHistory(npcId);
        history.push({ role, content, time: Date.now() });
        this.saveChatHistory(npcId, history);
        return history;
    },
    
    init() {},
    update(dt) {},
    
    getPersona(npc) {
        if (!npc || !npc.persona) return null;
        return NPCPersonaData[npc.persona] || null;
    },
    
    startDialog(npc) {
        this.currentNPC = npc;
        this.isDialogOpen = true;
        FactionSystem.updateNPCRelation(npc);
        document.getElementById('dialogBox').classList.add('show');
        this.showChatHistory(npc);
    },
    
    showChatHistory(npc) {
        const history = this.getChatHistory(npc.id);
        const persona = this.getPersona(npc);
        document.getElementById('dialogSpeaker').textContent = npc.name;
        
        let content = this.getGreeting(npc, persona);
        if (history.length > 0) {
            content += '<hr style="border-color:#4a4a8a;margin:10px 0;"><p style="font-size:11px;color:#888;">历史对话:</p>';
            history.slice(-5).forEach(h => {
                const prefix = h.role === 'user' ? '我' : npc.name;
                content += `<p style="font-size:12px;"><span style="color:${h.role === 'user' ? '#aaffaa' : '#aaaaff'}">${prefix}:</span> ${h.content.substring(0, 50)}</p>`;
            });
        }
        document.getElementById('dialogContent').innerHTML = content;
        this.showOptions(npc);
    },
    
    getGreeting(npc, persona) {
        const r = npc.relationship;
        const base = persona ? persona.baseline : 50;
        const mood = Math.max(0, Math.min(100, base + r));
        
        if (mood >= 70) return `"${GameState.player.name}道友！今日有缘相见，幸甚幸甚。"`;
        if (mood >= 50) return `"哦，是${GameState.player.name}啊，有什么事吗？"`;
        if (mood >= 30) return `"..."`;
        return `"哼，又是你，有什么话快说。"`;
    },
    
    showOptions(npc) {
        const persona = this.getPersona(npc);
        let opt = `<div class="dialog-option" onclick="DialogSystem.ask('greeting')">问候</div>`;
        
        if (npc.isQuestGiver) opt += `<div class="dialog-option" onclick="DialogSystem.ask('quest')">询问任务</div>`;
        
        if (persona) {
            if (persona.keywords.some(k => k.includes('剑') || k.includes('铁'))) 
                opt += `<div class="dialog-option" onclick="DialogSystem.ask('craft')">打造装备</div>`;
            if (persona.keywords.some(k => k.includes('商') || k.includes('灵石'))) 
                opt += `<div class="dialog-option" onclick="DialogSystem.ask('trade')">交易</div>`;
            if (persona.keywords.some(k => k.includes('药') || k.includes('丹'))) 
                opt += `<div class="dialog-option" onclick="DialogSystem.ask('alchemy')">炼丹</div>`;
        } else {
            if (npc.type === 'blacksmith') opt += `<div class="dialog-option" onclick="DialogSystem.ask('craft')">打造装备</div>`;
            if (npc.type === 'merchant') opt += `<div class="dialog-option" onclick="DialogSystem.ask('trade')">交易</div>`;
            if (npc.type === 'herbalist') opt += `<div class="dialog-option" onclick="DialogSystem.ask('alchemy')">炼丹</div>`;
        }
        
        opt += `<div class="dialog-option" onclick="DialogSystem.freeChat()">自由对话</div>`;
        opt += `<div class="dialog-option" onclick="DialogSystem.showApiSettings()">API设置</div>`;
        opt += `<div class="dialog-option" onclick="DialogSystem.endDialog()">离开</div>`;
        document.getElementById('dialogOptions').innerHTML = opt;
    },
    
    ask(topic) {
        const npc = this.currentNPC;
        const persona = this.getPersona(npc);
        let res = '';
        
        if (topic === 'greeting') {
            res = this.generateGreetingResponse(npc, persona);
            npc.relationship += 1;
        } else if (topic === 'quest') {
            res = this.generateQuestResponse(npc, persona);
        } else if (topic === 'craft') {
            res = this.showCraftMenu(npc);
        } else if (topic === 'trade') {
            res = this.showTradeMenu(npc);
        } else if (topic === 'alchemy') {
            res = this.showAlchemyMenu(npc);
        }
        
        document.getElementById('dialogContent').innerHTML = res;
        document.getElementById('dialogOptions').innerHTML = `<div class="dialog-option" onclick="DialogSystem.showOptions(DialogSystem.currentNPC)">返回</div>`;
    },
    
    generateGreetingResponse(npc, persona) {
        if (!persona) {
            const r = { elder:'"修行之路漫漫，道友要多加努力。"', blacksmith:'"我的铁锤可是千锤百炼！"', merchant:'"做生意讲究诚信！"', herbalist:'"天地灵物，皆可入药。"', disciple:'"师兄好！我正在努力修炼。"', leader:'"门派的发展需要每个人的努力。"', wanderer:'"修仙之路，各自有缘。"' };
            return r[npc.type] || '"你好，有什么事吗？"';
        }
        
        // 基于人格的问候回复
        const greetings = {
            'dutiful_secret_investigator': () => `"这个嘛……也没什么大事。对了道友，最近可有什么新鲜事？"`,
            'grateful_spirits_alchemist': () => `"啊，道友来了。我正在准备一些药材，稍等片刻。"`,
            'silent_blade_smith': () => `"嗯。有事？"`,
            'compassionate_medic': () => `"道友面色尚可，但似有疲惫之态。注意休息。"`,
            'star_reader_amnesiac': () => `"昨夜荧惑守心，恐有变动。道友近日出行要小心。"`,
            'smiling_informant': () => `"哎呀，公子/小姐今日怎么有空来？快请坐快请坐。"`,
            'blind_formations_master': () => `"我听见你的脚步声了，道友。你来得正好，我这儿有新阵法要测。"`,
            'immortal_wanderer': () => `"呵，老朋友见面，不如先喝一杯？"`
        };
        return greetings[persona.keywords[0]?.includes('剑') ? 'silent_blade_smith' : 
                           persona.keywords[0]?.includes('星') ? 'star_reader_amnesiac' :
                           persona.keywords[0]?.includes('酒') ? 'immortal_wanderer' :
                           'default']() || `"你好，道友。"`;
    },
    
    generateQuestResponse(npc, persona) {
        if (!persona) {
            return `<p>"道友，我正需要一些材料。"</p><p>任务: 采集5个灵草</p><p>奖励: 20修炼点, 30金币</p><div class="dialog-option" onclick="DialogSystem.acceptQuest()">接受任务</div>`;
        }
        
        // 基于人格的任务
        const quests = {
            'dutiful_secret_investigator': `<p>"这个嘛……有个不情之请。"</p><p>最近我在整理杂务，发现一些账目不太对劲。"</p><p>道友若能帮我查探一下藏经阁附近的动静，在下感激不尽。</p><p>奖励: 30修炼点, 50金币</p><div class="dialog-option" onclick="DialogSystem.acceptQuest()">接受任务</div>`,
            'grateful_spirits_alchemist': `<p>"我需要一些特殊的药材……"</p><p>阿婆的身体不太好，我想炼一炉清心丹。</p><p>能否帮我采集10株止血草？</p><p>奖励: 25修炼点, 40金币</p><div class="dialog-option" onclick="DialogSystem.acceptQuest()">接受任务</div>`,
            'silent_blade_smith': `<p>"……我要打一把剑。"</p><p>材料不够。"</p><p>帮我找5块精铁。"</p><p>奖励: 35修炼点, 剑x1</p><div class="dialog-option" onclick="DialogSystem.acceptQuest()">接受任务</div>`,
            'compassionate_medic': `<p>"医谷最近出了怪病。"</p><p>我需要采集一些稀有药材研究解药。</p><p>能否帮我找3株雪莲花？</p><p>奖励: 40修炼点, 疗伤丹x3</p><div class="dialog-option" onclick="DialogSystem.acceptQuest()">接受任务</div>`,
            'star_reader_amnesiac': `<p>"昨夜观星，发现荧惑有异动。"</p><p>我需要去天象阁顶层确认一下。"</p><p>能否帮我照看这些东西？</p><p>奖励: 30修炼点, 星图碎片</p><div class="dialog-option" onclick="DialogSystem.acceptQuest()">接受任务</div>`,
            'smiling_informant': `<p>"哎呀，公子/小姐，我这里有些好消息要告诉你。"</p><p>帮我送封信到隔壁山头，奖励丰厚哦~</p><p>奖励: 50金币</p><div class="dialog-option" onclick="DialogSystem.acceptQuest()">接受任务</div>`,
            'blind_formations_master': `<p>"我听见有人在附近布置阵法。"</p><p>帮我检查一下东侧的阵眼是否完好。"</p><p>奖励: 30修炼点, 阵法知识</p><div class="dialog-option" onclick="DialogSystem.acceptQuest()">接受任务</div>`,
            'immortal_wanderer': `<p>"呵，听说附近有只妖兽作乱。"</p><p>我懒得动手，道友若有兴趣可以去试试。"</p><p>奖励: 视表现而定</p><div class="dialog-option" onclick="DialogSystem.acceptQuest()">接受任务</div>`
        };
        
        const key = persona.keywords[0];
        let questKey = null;
        if (key?.includes('杂务') || key?.includes('账')) questKey = 'dutiful_secret_investigator';
        else if (key?.includes('阿婆') || key?.includes('丹')) questKey = 'grateful_spirits_alchemist';
        else if (key?.includes('剑') || key?.includes('铁')) questKey = 'silent_blade_smith';
        else if (key?.includes('药') || key?.includes('症')) questKey = 'compassionate_medic';
        else if (key?.includes('星') || key?.includes('荧惑')) questKey = 'star_reader_amnesiac';
        else if (key?.includes('情') || key?.includes('信')) questKey = 'smiling_informant';
        else if (key?.includes('阵') || key?.includes('听')) questKey = 'blind_formations_master';
        else if (key?.includes('酒') || key?.includes('缘')) questKey = 'immortal_wanderer';
        
        return quests[questKey] || quests['immortal_wanderer'];
    },
    
    acceptQuest() {
        if (GameState.hasItem(GameState.player, 'herb', 5)) {
            GameState.removeItem(GameState.player, 'herb', 5);
            GameState.player.cultivation += 20; 
            GameState.player.gold += 30;
            this.currentNPC.relationship += 10;
            Game.showMessage('任务完成！获得奖励', 'success');
            this.showOptions(this.currentNPC);
        } else { 
            Game.showMessage('任务条件未满足', 'warning'); 
        }
    },
    
    showCraftMenu(npc) {
        const persona = this.getPersona(npc);
        if (persona?.keywords.some(k => k.includes('剑'))) {
            return `<p>"我要打一把好剑……"</p><button class="action-btn" onclick="DialogSystem.craftItem('sword')">打造长剑(精铁x5,金币x50)</button><button class="action-btn" onclick="DialogSystem.craftItem('armor')">打造护甲(石材x15,金币x80)</button>`;
        }
        return `<p>"我可以帮你打造装备："</p><button class="action-btn" onclick="DialogSystem.craftItem('sword')">打造剑(石材x10,金币x50)</button><button class="action-btn" onclick="DialogSystem.craftItem('armor')">打造护甲(石材x15,金币x80)</button>`;
    },
    
    craftItem(type) {
        const c = { sword: { stone: 10, gold: 50 }, armor: { stone: 15, gold: 80 } };
        if (GameState.hasItem(GameState.player, 'stone', c[type].stone) && GameState.player.gold >= c[type].gold) {
            GameState.removeItem(GameState.player, 'stone', c[type].stone);
            GameState.player.gold -= c[type].gold;
            if (type === 'sword') { 
                GameState.player.attack += 5; 
                Game.showMessage('攻击力+5', 'success'); 
            }
            else { 
                GameState.player.defense += 3; 
                Game.showMessage('防御力+3', 'success'); 
            }
        } else { 
            Game.showMessage('材料不足', 'warning'); 
        }
    },
    
    showTradeMenu(npc) {
        const persona = this.getPersona(npc);
        if (persona?.keywords.some(k => k.includes('信') || k.includes('情报'))) {
            return `<p>"哎呀，公子/小姐想要什么？我这里应有尽有~"</p><button class="action-btn" onclick="DialogSystem.buyItem('pill_healing',30)">疗伤丹-30金币</button><button class="action-btn" onclick="DialogSystem.buyItem('pill_cultivation',80)">聚气丹-80金币</button><button class="action-btn" onclick="DialogSystem.buyItem('herb',10)">灵草-10金币</button><button class="action-btn" onclick="DialogSystem.buyItem('message',100)">神秘情报-100金币</button>`;
        }
        return `<p>"看看有什么需要的："</p><button class="action-btn" onclick="DialogSystem.buyItem('pill_healing',30)">疗伤丹-30金币</button><button class="action-btn" onclick="DialogSystem.buyItem('pill_cultivation',80)">聚气丹-80金币</button><button class="action-btn" onclick="DialogSystem.buyItem('herb',10)">灵草-10金币</button>`;
    },
    
    buyItem(id, price) {
        if (id === 'message') {
            const messages = ['青云门近期有异动', '后山发现了古代洞府', '某位长老正在闭关', '市面上流通着不明丹药'];
            Game.showMessage('情报: ' + messages[Math.floor(Math.random() * messages.length)], 'info');
            return;
        }
        if (GameState.player.gold >= price) {
            GameState.player.gold -= price;
            GameState.addItem(GameState.player, { ...GameData.items[id], count: 1 });
            Game.showMessage('购买成功', 'success');
        } else { 
            Game.showMessage('金币不足', 'warning'); 
        }
    },
    
    showAlchemyMenu(npc) {
        const persona = this.getPersona(npc);
        if (persona?.keywords.some(k => k.includes('丹') || k.includes('药'))) {
            return `<p>"我需要一些特殊的药材……"</p><button class="action-btn" onclick="DialogSystem.craftPill('healing')">疗伤丹(灵草x3)</button><button class="action-btn" onclick="DialogSystem.craftPill('cultivation')">清心丹(灵草x5,灵石x1)</button>`;
        }
        return `<p>"我可以帮你炼制丹药："</p><button class="action-btn" onclick="DialogSystem.craftPill('healing')">疗伤丹(灵草x3)</button><button class="action-btn" onclick="DialogSystem.craftPill('cultivation')">聚气丹(灵草x5,灵石x1)</button>`;
    },
    
    craftPill(type) {
        const p = GameState.player;
        if (type === 'healing' && GameState.hasItem(p, 'herb', 3)) {
            GameState.removeItem(p, 'herb', 3);
            GameState.addItem(p, { ...GameData.items.pill_healing, count: 1 });
            Game.showMessage('炼丹成功', 'success');
        } else if (type === 'cultivation' && GameState.hasItem(p, 'herb', 5) && GameState.hasItem(p, 'spirit_stone', 1)) {
            GameState.removeItem(p, 'herb', 5); 
            GameState.removeItem(p, 'spirit_stone', 1);
            GameState.addItem(p, { ...GameData.items.pill_cultivation, count: 1 });
            Game.showMessage('炼丹成功', 'success');
        } else { 
            Game.showMessage('材料不足', 'warning'); 
        }
    },
    
    async freeChat() {
        document.getElementById('dialogContent').innerHTML = `<p>输入你想说的话：</p><input type="text" id="chatInput" style="width:100%;padding:8px;background:#2a2a4a;border:1px solid #4a4a8a;color:#fff;border-radius:4px;" onkeypress="if(event.key==='Enter')DialogSystem.sendChat()">`;
        document.getElementById('dialogOptions').innerHTML = `<div class="dialog-option" onclick="DialogSystem.sendChat()">发送</div><div class="dialog-option" onclick="DialogSystem.showOptions(DialogSystem.currentNPC)">返回</div>`;
    },
    
    async sendChat() {
        const msg = document.getElementById('chatInput').value.trim();
        if (!msg) return;
        const npc = this.currentNPC;
        this.addChatMessage(npc.id, 'user', msg);
        document.getElementById('dialogContent').innerHTML = '<p>思考中...</p>';
        const res = await this.callQwenAPI(msg);
        this.addChatMessage(npc.id, 'assistant', res);
        document.getElementById('dialogContent').innerHTML = `<p><span style="color:#aaffaa">我:</span> ${msg}</p><p><span style="color:#aaaaff">${npc.name}:</span> ${res}</p>`;
        document.getElementById('dialogOptions').innerHTML = `<div class="dialog-option" onclick="DialogSystem.freeChat()">继续对话</div><div class="dialog-option" onclick="DialogSystem.showChatHistory(DialogSystem.currentNPC)">查看历史</div><div class="dialog-option" onclick="DialogSystem.showOptions(DialogSystem.currentNPC)">返回</div>`;
    },
    
    showApiSettings() {
        document.getElementById('dialogContent').innerHTML = `<p>配置阿里云Qwen API:</p><p style="font-size:12px;color:#aaa;">获取:dashscope.console.aliyun.com</p><input type="text" id="apiKeyInput" value="${this.apiKey}" placeholder="输入API Key" style="width:100%;padding:8px;margin-top:10px;background:#2a2a4a;border:1px solid #4a4a8a;color:#fff;border-radius:4px;">`;
        document.getElementById('dialogOptions').innerHTML = `<div class="dialog-option" onclick="DialogSystem.saveApiKey()">保存</div><div class="dialog-option" onclick="DialogSystem.showOptions(DialogSystem.currentNPC)">返回</div>`;
    },
    
    saveApiKey() {
        this.apiKey = document.getElementById('apiKeyInput').value.trim();
        localStorage.setItem('qwen_api_key', this.apiKey);
        Game.showMessage('API Key已保存', 'success');
        this.showOptions(this.currentNPC);
    },
    
    async callQwenAPI(message) {
        if (!this.apiKey) return '请先在API设置中配置您的阿里云Qwen API Key。';
        const npc = this.currentNPC;
        const persona = this.getPersona(npc);
        const history = this.getChatHistory(npc.id);
        
        let systemPrompt = `你是修仙世界NPC，名字${npc.name}。`;
        
        if (persona) {
            systemPrompt += `
【人格设定】
身份：${persona.identity}
核心欲望：${persona.desire}
恐惧/秘密：${persona.fear}
说话方式：${persona.speech}
情绪基线：${persona.baseline}/100
关键词：${persona.keywords.join(', ')}
绝不提的话题：${persona.forbidden.join('、')}

请严格按照以上人格设定进行对话，不要偏离角色。`;
        } else {
            systemPrompt += `身份：${this.getNPCRole(npc.type)}。关系值${npc.relationship}。用修仙语气回复，不超过80字。记住之前的对话内容。`;
        }
        
        const messages = [
            { role: 'system', content: systemPrompt },
            ...history.slice(-10).map(h => ({ role: h.role, content: h.content })),
            { role: 'user', content: message }
        ];
        
        try {
            const res = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
                method: 'POST', 
                headers: { 
                    'Content-Type': 'application/json', 
                    'Authorization': `Bearer ${this.apiKey}` 
                },
                body: JSON.stringify({ model: 'qwen-turbo', messages })
            });
            const data = await res.json();
            return data.choices?.[0]?.message?.content || '响应异常';
        } catch (e) { 
            return this.simulateResponse(npc, persona); 
        }
    },
    
    simulateResponse(npc, persona) {
        if (persona) {
            const fallbacks = {
                'dutiful_secret_investigator': ['"这个嘛……改日再聊。"', '"我心里有数。"'],
                'grateful_spirits_alchemist': ['"我没事，只是累了。"', '"阿婆还好吗？"'],
                'silent_blade_smith': ['"。"', '"嗯。"'],
                'compassionate_medic': ['"此症尚待验证。"', '"注意休息。"'],
                'star_reader_amnesiac': ['"星象显示……不对，我忘了。"', '"昨夜梦见……忘了。"'],
                'smiling_informant': ['"哎呀，这个不能说~"', '"公子/小姐真是说笑了。"'],
                'blind_formations_master': ['"我听见了。"', '"此处阵法无误。"'],
                'immortal_wanderer': ['"呵，喝酒喝酒。"', '"说来话长。"']
            };
            const key = persona.keywords[0];
            let fallbackKey = null;
            if (key?.includes('杂务')) fallbackKey = 'dutiful_secret_investigator';
            else if (key?.includes('阿婆')) fallbackKey = 'grateful_spirits_alchemist';
            else if (key?.includes('剑')) fallbackKey = 'silent_blade_smith';
            else if (key?.includes('药')) fallbackKey = 'compassionate_medic';
            else if (key?.includes('星')) fallbackKey = 'star_reader_amnesiac';
            else if (key?.includes('情')) fallbackKey = 'smiling_informant';
            else if (key?.includes('阵')) fallbackKey = 'blind_formations_master';
            else if (key?.includes('酒')) fallbackKey = 'immortal_wanderer';
            
            const responses = fallbacks[fallbackKey] || ['...'];
            return responses[Math.floor(Math.random() * responses.length)];
        }
        
        const r = { 
            elder: ['修行之道，在于持之以恒。', '道友有何困惑？'], 
            blacksmith: ['我的锻造技术可是祖传的！'], 
            merchant: ['客官想要什么？'], 
            disciple: ['师兄好！'] 
        };
        return (r[npc.type] || ['嗯。'])[Math.floor(Math.random() * (r[npc.type]?.length || 1))];
    },
    
    getNPCRole(type) {
        return { 
            elder: '门派长老', 
            blacksmith: '铁匠', 
            merchant: '商人', 
            herbalist: '药农', 
            disciple: '弟子', 
            leader: '掌门', 
            wanderer: '散修' 
        }[type] || '修仙者';
    },
    
    endDialog() { 
        this.currentNPC = null; 
        this.isDialogOpen = false; 
        document.getElementById('dialogBox').classList.remove('show'); 
    }
};
