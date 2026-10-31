# User Instruction Memory

This file records user instructions, preferences, and teachings for reference in future interactions.

## Format

### User Instruction Entry
User instruction entries should follow this format:

[User Instruction Summary]
- Date: [YYYY-MM-DD]
- Context: [Mentioned scenario or time]
- Instructions:
  - [Content of user teaching or instruction, described line by line]

### Project Knowledge Entry
Entries discovered by the Agent during task execution should follow this format:

[Project Knowledge Summary]
- Date: [YYYY-MM-DD]
- Context: Discovered by Agent while performing [specific task description]
- Category: [Operations & Deployment|Build Methods|Testing Methods|Troubleshooting & Debugging|Workflow & Collaboration|Environment Configuration]
- Instructions:
  - [Specific knowledge points, described line by line]

## Deduplication Strategy
- Before adding a new entry, check for similar or identical instructions.
- If a duplicate is found, skip the new entry or merge it with the existing one.
- When merging, update the context or date information.
- This helps avoid redundant entries and keeps the memory file tidy.

## Entries

[Project Knowledge Summary]
- Date: 2026-10-30
- Context: 视频页搜索 CORS 修复
- Category: Operations & Deployment|Troubleshooting & Debugging
- Instructions:
  - 站点部署于 Cloudflare Pages，静态托管；bfzyapi/360zy 等上游接口无 CORS 头，浏览器直连被拦截
  - 所有公共代理（allorigins、codetabs、corsproxy.io）均已失效（超时/403）
  - 修复方案：新增 Cloudflare Pages Function functions/api/proxy.js 同源代理；_routes.json 控制路由
  - functions/ 目录同时放在仓库根目录和 free-video-streaming/ 下（兼容不同 Pages 项目根设置）
  - 本地调试：PORT=8099 python3 proxy.py；proxy.py 需捕获 BrokenPipeError 防崩溃
  - preview 端口 8080（静态 http.server pid 849，未注册为 managed terminal）
  - chromium 路径：/root/.cache/ms-playwright/chromium-1148/chrome-linux/chrome，参数 --no-sandbox --enable-unsafe-swiftshader --disable-dev-shm-usage
  - search-probe playwright 测试需等 theater 3D 场景初始化（3-5s），横屏加载时间略长
  - cors.js 通过响应头 X-Proxy 识别是否命中同源代理（值为 local/edge），避免把 fallback HTML 误判为成功

[User Instruction Summary]
- Date: 2026-10-30
- Context: 用户要求修复视频页搜索问题
- Instructions:
  - 优先使用同源代理而非第三方公共代理
  - 保留公共代理作为降级兜底（codetabs、allorigins-raw），标记为最后尝试
  - 搜索和详情拉取超时从 4s 提升至 12s

## NPC 人格系统

- Date: 2026-10-30
- Context: 修仙AI小镇 NPC 差异化人格开发
- Category: 开发方法论
- Instructions:
  - NPC 人格 Prompt 文件位于 `free-video-streaming/ai-town/npc-personas.md`
  - 8 个 NPC 已集成到 `state.js` 的 templates 数组
  - 人格字段存储在 NPC 实体的 `persona` 属性中
  - 生成原则：每个字段必须具体到"可观察、可执行"程度，避免抽象形容词堆砌
  - 约束：8 个 NPC 的欲望、恐惧、说话方式、离线事件必须互不重叠

## NPC 对话系统集成

- Date: 2026-10-30
- Context: 修仙AI小镇 NPC 人格对话系统开发
- Category: 开发方法论
- Instructions:
  - NPC 人格数据定义在 `free-video-streaming/ai-town/js/systems/dialog.js` 的 `NPCPersonaData` 常量
  - 每个 NPC 实体通过 `persona` 字段关联人格（如 `'silent_blade_smith'`）
  - DialogSystem.getPersona(npc) 返回对应人格数据
  - 问候语、任务、离线事件均基于人格数据动态生成
  - AI 对话时会将人格 Prompt 注入 system prompt

## NPC 离线行为系统

- Date: 2026-10-30
- Context: 修仙AI小镇 NPC 离线行为动画开发
- Category: 开发方法论
- Instructions:
  - 新系统文件：`free-video-streaming/ai-town/js/systems/offline-behavior.js`
  - 每个 NPC 人格数据包含 `offlineEvents` 数组（5个事件）
  - 触发概率：约每10-20秒触发一次（dt * 0.06）
  - 效果：粒子动画 + 悬浮文本 + 世界日志记录
  - 事件循环使用，每个 NPC 保留最近5个已用事件
